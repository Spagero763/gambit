# Gambit contracts

`ArcadeEscrow.sol` is the stake escrow for Gambit matches. It is player-agnostic:
two or more funded addresses lock an equal stake, a trusted relayer reports the
result after the game ends, and the contract pays out.

## Behaviour

- **createMatch(token, stake, gameType, capacity)** locks the creator's stake and
  opens a match. `capacity` is the number of seats (2 for 1v1, up to 8 for pots).
- **joinMatch(id)** locks an equal stake and seats a player. The match goes
  `Active` once every seat is filled.
- **declareResult(id, ranking)** is relayer-only and pays out:
  - capacity 2: `ranking = [winner]` pays the winner the pool minus the protocol
    fee. `ranking = [address(0)]` is a draw and refunds both stakes with no fee.
  - capacity 3–8: the pool minus fee is split among the top three by
    `potSplitBps` (default 50 / 30 / 20).
- **cancelMatch(id)** refunds an unfilled match. The creator may cancel while it
  is still open; anyone may trigger the refund once `joinWindow` has elapsed.

## Notes

- The escrow does not distinguish humans from funded bot wallets; it only moves
  ERC20 stake between funded addresses.
- Non-reentrant on every fund-moving entry point. Only the relayer can settle.
- Stake token is any ERC20 (cUSD or USDC on Celo). Gas can be paid in cUSD via
  the wallet's fee-currency support; that is a transaction concern, not a
  contract one.

## Develop

```bash
cd contracts
forge test -vv     # 8 passing tests
```

Constructor: `ArcadeEscrow(relayer, feeRecipient, feeBps, joinWindow)`.
Owner-only setters exist for the relayer, fee recipient, fee (capped at 10%),
pot split, and join window.
