# Deploying ArcadeEscrow

Foundry script: `script/Deploy.s.sol`. It deploys the contract and allowlists the
stake token in one transaction. You run it with your own key, nothing here ever
sees your private key.

## 1. Set env vars

```bash
export PRIVATE_KEY=0x<your deployer key>
export RELAYER=0x2b0755026F8312D0c600229774999F7EBC1f70f9
export FEE_RECIPIENT=0x32a3596C25A98950E850E3531a0aA87f1506e5d7
# STAKE_TOKEN defaults to cUSD (same address on Sepolia and mainnet)
```

## 2. Deploy to Celo Sepolia (testnet first)

Get test funds from the faucet (https://faucet.celo.org), then:

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org \
  --broadcast --legacy
```

The console prints the deployed `ArcadeEscrow` address. Verify it on
https://sepolia.celoscan.io and run a full stake -> play -> payout test.

## 3. Promote to Celo mainnet (after testnet passes)

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://forno.celo.org \
  --broadcast --legacy
```

## Notes

- `--legacy` is required: Celo / MiniPay use legacy-type transactions.
- The deployer becomes `owner`. Use owner setters to add tokens, change the fee,
  pot split, relayer or windows later.
- Recommended: make `RELAYER` a multisig before mainnet (per the security review).
- Default fee 5%, join window 10 min, settle window 1 hour.
