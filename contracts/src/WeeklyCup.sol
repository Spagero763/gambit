// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC20 surface used by the cup.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
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
 * @title WeeklyCup
 * @notice On-chain prize vault + settlement record for Gambit's free Weekly
 *         Cup. The cup itself is free to enter (entries are gated off-chain to
 *         one per GoodID-verified human, so players pay no gas); this contract
 *         makes the PAYOUT side trustless and auditable:
 *
 *         - the prize pool is held here, not in a hot wallet;
 *         - a trusted relayer settles each week exactly once, paying up to
 *           three winners in a single transaction;
 *         - `WeekSettled` events are a permanent, indexable record that the
 *           prizes were actually paid.
 *
 *         Weeks are numbered as sequential Mondays since the Unix epoch
 *         (floor((timestamp - 4 days) / 7 days)) — the same numbering the app
 *         uses. A week can only be settled after it has ended.
 */
contract WeeklyCup is ReentrancyGuard {
    IERC20 public immutable token; // prize token (USDm on Celo)
    address public owner;
    address public relayer;

    /// @notice week number -> settled flag (a week can never be paid twice).
    mapping(uint256 => bool) public settled;

    event RelayerChanged(address indexed relayer);
    event WeekSettled(uint256 indexed week, address[] winners, uint256[] amounts);
    event Swept(address indexed token, address indexed to, uint256 amount);

    uint256 private constant WEEK = 7 days;
    uint256 private constant EPOCH_MONDAY = 4 days; // Mon 1970-01-05

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address token_, address relayer_) {
        require(token_ != address(0) && relayer_ != address(0), "ZERO_ADDR");
        token = IERC20(token_);
        owner = msg.sender;
        relayer = relayer_;
    }

    /// @notice Current week number (matches the app's calendar).
    function currentWeek() public view returns (uint256) {
        return (block.timestamp - EPOCH_MONDAY) / WEEK;
    }

    /// @notice Pay a finished week's podium in one transaction. Relayer-only,
    ///         once per week, only after the week has ended. Winners/amounts
    ///         are parallel arrays (1..3 entries — fewer players, fewer paid).
    function settleWeek(uint256 week, address[] calldata winners, uint256[] calldata amounts)
        external
        nonReentrant
    {
        require(msg.sender == relayer, "NOT_RELAYER");
        require(week < currentWeek(), "WEEK_NOT_OVER");
        require(!settled[week], "ALREADY_SETTLED");
        require(winners.length > 0 && winners.length <= 3, "BAD_WINNERS");
        require(winners.length == amounts.length, "LENGTH_MISMATCH");

        settled[week] = true; // effects before interactions

        for (uint256 i = 0; i < winners.length; i++) {
            require(winners[i] != address(0), "ZERO_WINNER");
            require(token.transfer(winners[i], amounts[i]), "TRANSFER_FAILED");
        }
        emit WeekSettled(week, winners, amounts);
    }

    function setRelayer(address relayer_) external onlyOwner {
        require(relayer_ != address(0), "ZERO_ADDR");
        relayer = relayer_;
        emit RelayerChanged(relayer_);
    }

    function setOwner(address owner_) external onlyOwner {
        require(owner_ != address(0), "ZERO_ADDR");
        owner = owner_;
    }

    /// @notice Recover any token from the vault (owner escape hatch — e.g. to
    ///         retire the cup or rescue a wrong-token deposit).
    function sweep(address token_, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "ZERO_ADDR");
        require(IERC20(token_).transfer(to, amount), "TRANSFER_FAILED");
        emit Swept(token_, to, amount);
    }
}
