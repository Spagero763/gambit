// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC20 surface used by the vault.
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
 * @title RewardsVault
 * @notice On-chain registry + vault for Gambit's incentive payouts (referral
 *         bonuses first; streaks and badges can reuse it). Each reward is
 *         identified by a KEY the server derives deterministically (e.g.
 *         keccak256("referral", inviteeWallet)) and the contract guarantees a
 *         key can only ever be paid ONCE — so no bug, retry or compromised
 *         server can double-pay a reward. `RewardPaid` events are the public,
 *         auditable record of every incentive ever paid.
 *
 *         Fund it by transferring the token straight to the contract.
 */
contract RewardsVault is ReentrancyGuard {
    IERC20 public immutable token; // payout token (USDm on Celo)
    address public owner;
    address public relayer;

    /// @notice reward key -> paid flag (a key can never be paid twice).
    mapping(bytes32 => bool) public paid;

    event RelayerChanged(address indexed relayer);
    event RewardPaid(bytes32 indexed key, string tag, address[] recipients, uint256[] amounts);
    event Swept(address indexed token, address indexed to, uint256 amount);

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

    /// @notice Pay one reward (up to 8 recipients in one transaction), exactly
    ///         once per key. `tag` labels the reward type in the event log
    ///         (e.g. "referral") so indexers can slice spending by programme.
    function payReward(bytes32 key, string calldata tag, address[] calldata recipients, uint256[] calldata amounts)
        external
        nonReentrant
    {
        require(msg.sender == relayer, "NOT_RELAYER");
        require(!paid[key], "ALREADY_PAID");
        require(recipients.length > 0 && recipients.length <= 8, "BAD_RECIPIENTS");
        require(recipients.length == amounts.length, "LENGTH_MISMATCH");

        paid[key] = true; // effects before interactions

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "ZERO_RECIPIENT");
            require(token.transfer(recipients[i], amounts[i]), "TRANSFER_FAILED");
        }
        emit RewardPaid(key, tag, recipients, amounts);
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

    /// @notice Recover any token from the vault (owner escape hatch).
    function sweep(address token_, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "ZERO_ADDR");
        require(IERC20(token_).transfer(to, amount), "TRANSFER_FAILED");
        emit Swept(token_, to, amount);
    }
}
