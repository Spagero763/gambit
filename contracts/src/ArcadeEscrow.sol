// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC20 surface used by the escrow.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Simple non-reentrancy guard (no external dependency).
abstract contract ReentrancyGuard {
    uint256 private _entered = 1;
    modifier nonReentrant() {
        require(_entered == 1, "REENTRANCY");
        _entered = 2;
        _;
        _entered = 1;
    }
}

/**
 * @title ArcadeEscrow
 * @notice Player-agnostic stake escrow for Gambit matches. Two or more funded
 *         addresses lock an equal stake; a trusted relayer reports the result
 *         after the game ends and the contract pays out.
 *
 *         - capacity 2  -> winner takes the pool minus the protocol fee
 *                          (a draw, ranking == [address(0)], refunds both).
 *         - capacity 3-8 -> the pool minus fee is split among the top three
 *                          finishers by `potSplitBps` (default 50/30/20).
 *
 *         Liveness: if the relayer never settles, anyone can reclaim every
 *         player's stake once `settleWindow` has elapsed since the match filled,
 *         so funds can never be permanently frozen. The relayer can also abort
 *         an Active match (refund all) for contested or indeterminate results.
 *
 *         The escrow does not know whether a player is a human or a funded bot
 *         wallet; it only moves whitelisted ERC20 stake between funded addresses.
 */
contract ArcadeEscrow is ReentrancyGuard {
    enum Status {
        None,
        Open,
        Active,
        Settled,
        Cancelled
    }

    struct Match {
        address token;
        address creator;
        uint128 stake;
        uint64 createdAt;
        uint64 joinDeadline; // frozen at creation
        uint64 activatedAt; // set when the match fills
        uint8 gameType;
        uint8 capacity;
        uint8 joined;
        Status status;
    }

    address public owner;
    address public relayer;
    address public feeRecipient;
    uint16 public feeBps; // 500 = 5%
    uint16 public constant MAX_FEE_BPS = 1000; // 10% ceiling
    uint64 public joinWindow; // seconds to fill an Open match
    uint64 public settleWindow; // seconds the relayer has to settle a filled match

    uint16[3] public potSplitBps = [5000, 3000, 2000]; // 50 / 30 / 20

    uint256 public nextMatchId = 1;
    mapping(uint256 => Match) public matches;
    mapping(uint256 => address[]) private _players;
    mapping(uint256 => mapping(address => bool)) public seated;
    mapping(address => bool) public allowedTokens;

    event MatchCreated(uint256 indexed id, address indexed creator, address token, uint256 stake, uint8 gameType, uint8 capacity);
    event MatchJoined(uint256 indexed id, address indexed player, uint8 joined);
    event MatchActivated(uint256 indexed id, uint64 activatedAt);
    event MatchSettled(uint256 indexed id, address[] winners, uint256[] payouts, uint256 fee);
    event MatchCancelled(uint256 indexed id, string reason);
    event RelayerUpdated(address relayer);
    event FeeRecipientUpdated(address feeRecipient);
    event FeeBpsUpdated(uint16 feeBps);
    event PotSplitUpdated(uint16 first, uint16 second, uint16 third);
    event TokenAllowed(address token, bool allowed);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }
    modifier onlyRelayer() {
        require(msg.sender == relayer, "NOT_RELAYER");
        _;
    }

    constructor(address _relayer, address _feeRecipient, uint16 _feeBps, uint64 _joinWindow, uint64 _settleWindow) {
        require(_relayer != address(0) && _feeRecipient != address(0), "ZERO_ADDR");
        require(_feeBps <= MAX_FEE_BPS, "FEE_TOO_HIGH");
        owner = msg.sender;
        relayer = _relayer;
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
        joinWindow = _joinWindow;
        settleWindow = _settleWindow;
    }

    // ---------------------------------------------------------------- play

    function createMatch(address token, uint128 stake, uint8 gameType, uint8 capacity)
        external
        nonReentrant
        returns (uint256 id)
    {
        require(allowedTokens[token], "TOKEN_NOT_ALLOWED");
        require(stake > 0, "ZERO_STAKE");
        require(capacity >= 2 && capacity <= 8, "BAD_CAPACITY");
        id = nextMatchId++;
        Match storage m = matches[id];
        m.token = token;
        m.creator = msg.sender;
        m.stake = stake;
        m.createdAt = uint64(block.timestamp);
        m.joinDeadline = uint64(block.timestamp) + joinWindow;
        m.gameType = gameType;
        m.capacity = capacity;
        m.joined = 1;
        m.status = Status.Open;
        _players[id].push(msg.sender);
        seated[id][msg.sender] = true;
        _pull(token, msg.sender, stake);
        emit MatchCreated(id, msg.sender, token, stake, gameType, capacity);
    }

    function joinMatch(uint256 id) external nonReentrant {
        Match storage m = matches[id];
        require(m.status == Status.Open, "NOT_OPEN");
        require(block.timestamp <= m.joinDeadline, "EXPIRED");
        require(!seated[id][msg.sender], "ALREADY_IN");
        m.joined += 1;
        _players[id].push(msg.sender);
        seated[id][msg.sender] = true;
        _pull(m.token, msg.sender, m.stake);
        if (m.joined == m.capacity) {
            m.status = Status.Active;
            m.activatedAt = uint64(block.timestamp);
            emit MatchActivated(id, m.activatedAt);
        }
        emit MatchJoined(id, msg.sender, m.joined);
    }

    /// @notice Relayer reports the outcome. `ranking` is top finisher first.
    ///         1v1: pass [winner], or [address(0)] for a draw (refund both).
    ///         pots: pass exactly the top three.
    function declareResult(uint256 id, address[] calldata ranking) external onlyRelayer nonReentrant {
        Match storage m = matches[id];
        require(m.status == Status.Active, "NOT_ACTIVE");

        uint256 pool = uint256(m.stake) * m.joined;

        if (m.capacity == 2 && ranking.length == 1 && ranking[0] == address(0)) {
            _refundAll(id, m);
            m.status = Status.Settled;
            emit MatchSettled(id, new address[](0), new uint256[](0), 0);
            return;
        }

        uint256 fee = (pool * feeBps) / 10000;
        uint256 distributable = pool - fee;

        address[] memory winners;
        uint256[] memory payouts;

        if (m.capacity == 2) {
            require(ranking.length == 1 && seated[id][ranking[0]], "BAD_WINNER");
            winners = new address[](1);
            payouts = new uint256[](1);
            winners[0] = ranking[0];
            payouts[0] = distributable;
        } else {
            require(ranking.length == 3, "BAD_RANKING"); // pots always pay exactly top three
            winners = new address[](3);
            payouts = new uint256[](3);
            uint256 paid;
            for (uint256 i = 0; i < 3; i++) {
                require(seated[id][ranking[i]], "BAD_WINNER");
                for (uint256 j = 0; j < i; j++) require(ranking[j] != ranking[i], "DUP_WINNER");
                winners[i] = ranking[i];
                uint256 amt = (distributable * potSplitBps[i]) / 10000;
                payouts[i] = amt;
                paid += amt;
            }
            if (paid < distributable) payouts[0] += (distributable - paid); // rounding dust to 1st
        }

        m.status = Status.Settled;
        if (fee > 0) _push(m.token, feeRecipient, fee);
        for (uint256 i = 0; i < winners.length; i++) {
            if (payouts[i] > 0) _push(m.token, winners[i], payouts[i]);
        }
        emit MatchSettled(id, winners, payouts, fee);
    }

    /// @notice Relayer aborts a filled match (contested/indeterminate), refunding all stakes.
    function abortMatch(uint256 id) external onlyRelayer nonReentrant {
        Match storage m = matches[id];
        require(m.status == Status.Active, "NOT_ACTIVE");
        _refundAll(id, m);
        m.status = Status.Cancelled;
        emit MatchCancelled(id, "aborted");
    }

    /// @notice Permissionless rescue: if a filled match is never settled within
    ///         `settleWindow`, anyone can refund every player's stake.
    function reclaimStalled(uint256 id) external nonReentrant {
        Match storage m = matches[id];
        require(m.status == Status.Active, "NOT_ACTIVE");
        require(block.timestamp > uint256(m.activatedAt) + settleWindow, "TOO_EARLY");
        _refundAll(id, m);
        m.status = Status.Cancelled;
        emit MatchCancelled(id, "stalled");
    }

    /// @notice Refund an unfilled match. Creator may cancel anytime while Open;
    ///         anyone may trigger a refund once the join deadline has passed.
    function cancelMatch(uint256 id) external nonReentrant {
        Match storage m = matches[id];
        require(m.status == Status.Open, "NOT_OPEN");
        require(msg.sender == m.creator || block.timestamp > m.joinDeadline, "NOT_ALLOWED");
        _refundAll(id, m);
        m.status = Status.Cancelled;
        emit MatchCancelled(id, "cancelled");
    }

    function players(uint256 id) external view returns (address[] memory) {
        return _players[id];
    }

    // -------------------------------------------------------------- internal

    function _refundAll(uint256 id, Match storage m) internal {
        address[] storage ps = _players[id];
        for (uint256 i = 0; i < ps.length; i++) {
            _push(m.token, ps[i], m.stake);
        }
    }

    function _pull(address token, address from, uint256 amount) internal {
        uint256 balBefore = IERC20(token).balanceOf(address(this));
        _safeCall(token, abi.encodeWithSelector(IERC20.transferFrom.selector, from, address(this), amount));
        require(IERC20(token).balanceOf(address(this)) - balBefore == amount, "PULL_AMOUNT");
    }

    function _push(address token, address to, uint256 amount) internal {
        _safeCall(token, abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
    }

    /// @dev Tolerates no-return ERC20s (USDT-style) and requires true when a bool is returned.
    function _safeCall(address token, bytes memory data) internal {
        (bool ok, bytes memory ret) = token.call(data);
        require(ok && (ret.length == 0 || abi.decode(ret, (bool))), "TRANSFER_FAIL");
    }

    // ----------------------------------------------------------------- admin

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    function setRelayer(address r) external onlyOwner {
        require(r != address(0), "ZERO_ADDR");
        relayer = r;
        emit RelayerUpdated(r);
    }

    function setFeeRecipient(address f) external onlyOwner {
        require(f != address(0), "ZERO_ADDR");
        feeRecipient = f;
        emit FeeRecipientUpdated(f);
    }

    function setFeeBps(uint16 b) external onlyOwner {
        require(b <= MAX_FEE_BPS, "FEE_TOO_HIGH");
        feeBps = b;
        emit FeeBpsUpdated(b);
    }

    function setPotSplit(uint16 a, uint16 b, uint16 c) external onlyOwner {
        require(uint256(a) + b + c == 10000, "BAD_SPLIT");
        potSplitBps = [a, b, c];
        emit PotSplitUpdated(a, b, c);
    }

    function setJoinWindow(uint64 w) external onlyOwner {
        joinWindow = w;
    }

    function setSettleWindow(uint64 w) external onlyOwner {
        settleWindow = w;
    }

    function transferOwnership(address n) external onlyOwner {
        require(n != address(0), "ZERO_ADDR");
        owner = n;
    }
}
