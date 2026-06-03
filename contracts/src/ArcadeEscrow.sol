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
 *         The escrow does not know or care whether a player is a human or a
 *         funded bot wallet; it only moves ERC20 stake between funded addresses.
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
        uint128 stake;
        uint8 gameType;
        uint8 capacity;
        uint8 joined;
        Status status;
        uint64 createdAt;
        address creator;
    }

    address public owner;
    address public relayer;
    address public feeRecipient;
    uint16 public feeBps; // 500 = 5%
    uint16 public constant MAX_FEE_BPS = 1000; // 10% ceiling
    uint64 public joinWindow; // seconds before an unfilled match can be refunded

    uint16[3] public potSplitBps = [5000, 3000, 2000]; // 50 / 30 / 20

    uint256 public nextMatchId = 1;
    mapping(uint256 => Match) public matches;
    mapping(uint256 => address[]) private _players;
    mapping(uint256 => mapping(address => bool)) public seated;

    event MatchCreated(uint256 indexed id, address indexed creator, address token, uint256 stake, uint8 gameType, uint8 capacity);
    event MatchJoined(uint256 indexed id, address indexed player, uint8 joined);
    event MatchSettled(uint256 indexed id, address[] winners, uint256[] payouts, uint256 fee);
    event MatchCancelled(uint256 indexed id);
    event RelayerUpdated(address relayer);
    event FeeRecipientUpdated(address feeRecipient);
    event FeeBpsUpdated(uint16 feeBps);
    event PotSplitUpdated(uint16 first, uint16 second, uint16 third);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }
    modifier onlyRelayer() {
        require(msg.sender == relayer, "NOT_RELAYER");
        _;
    }

    constructor(address _relayer, address _feeRecipient, uint16 _feeBps, uint64 _joinWindow) {
        require(_relayer != address(0) && _feeRecipient != address(0), "ZERO_ADDR");
        require(_feeBps <= MAX_FEE_BPS, "FEE_TOO_HIGH");
        owner = msg.sender;
        relayer = _relayer;
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
        joinWindow = _joinWindow;
    }

    // ---------------------------------------------------------------- play

    function createMatch(address token, uint128 stake, uint8 gameType, uint8 capacity)
        external
        nonReentrant
        returns (uint256 id)
    {
        require(stake > 0, "ZERO_STAKE");
        require(capacity >= 2 && capacity <= 8, "BAD_CAPACITY");
        id = nextMatchId++;
        matches[id] = Match({
            token: token,
            stake: stake,
            gameType: gameType,
            capacity: capacity,
            joined: 1,
            status: Status.Open,
            createdAt: uint64(block.timestamp),
            creator: msg.sender
        });
        _players[id].push(msg.sender);
        seated[id][msg.sender] = true;
        _pull(token, msg.sender, stake);
        emit MatchCreated(id, msg.sender, token, stake, gameType, capacity);
    }

    function joinMatch(uint256 id) external nonReentrant {
        Match storage m = matches[id];
        require(m.status == Status.Open, "NOT_OPEN");
        require(block.timestamp <= m.createdAt + joinWindow, "EXPIRED");
        require(!seated[id][msg.sender], "ALREADY_IN");
        m.joined += 1;
        _players[id].push(msg.sender);
        seated[id][msg.sender] = true;
        _pull(m.token, msg.sender, m.stake);
        if (m.joined == m.capacity) m.status = Status.Active;
        emit MatchJoined(id, msg.sender, m.joined);
    }

    /// @notice Relayer reports the outcome. `ranking` is top finisher first.
    ///         For a 1v1 draw pass a single entry of address(0).
    function declareResult(uint256 id, address[] calldata ranking) external onlyRelayer nonReentrant {
        Match storage m = matches[id];
        require(m.status == Status.Active, "NOT_ACTIVE");

        uint256 pool = uint256(m.stake) * m.joined;

        // 1v1 draw -> refund both, no fee
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
            uint256 k = ranking.length;
            require(k >= 1 && k <= 3, "BAD_RANKING");
            winners = new address[](k);
            payouts = new uint256[](k);
            uint256 paid;
            for (uint256 i = 0; i < k; i++) {
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

    /// @notice Refund an unfilled match. Creator may cancel anytime while Open;
    ///         anyone may trigger a refund once the join window has passed.
    function cancelMatch(uint256 id) external nonReentrant {
        Match storage m = matches[id];
        require(m.status == Status.Open, "NOT_OPEN");
        require(msg.sender == m.creator || block.timestamp > m.createdAt + joinWindow, "NOT_ALLOWED");
        _refundAll(id, m);
        m.status = Status.Cancelled;
        emit MatchCancelled(id);
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
        require(IERC20(token).transferFrom(from, address(this), amount), "PULL_FAIL");
    }

    function _push(address token, address to, uint256 amount) internal {
        require(IERC20(token).transfer(to, amount), "PUSH_FAIL");
    }

    // ----------------------------------------------------------------- admin

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

    function transferOwnership(address n) external onlyOwner {
        require(n != address(0), "ZERO_ADDR");
        owner = n;
    }
}
