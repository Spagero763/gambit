// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ArcadeEscrow} from "../src/ArcadeEscrow.sol";

/**
 * Deploys ArcadeEscrow and allowlists the stake token.
 *
 * Signing: pass --account <keystore> so Foundry signs with your encrypted
 * keystore (no private key on the command line).
 *
 * Env vars:
 *   RELAYER        address allowed to settle results
 *   FEE_RECIPIENT  address that receives the protocol fee
 *   STAKE_TOKEN    ERC20 to allowlist (cUSD)
 *
 * Defaults target Celo cUSD (same address on Sepolia and mainnet).
 */
contract Deploy is Script {
    function run() external {
        address relayer = vm.envOr("RELAYER", address(0x2b0755026F8312D0c600229774999F7EBC1f70f9));
        address feeRecipient = vm.envOr("FEE_RECIPIENT", address(0x32a3596C25A98950E850E3531a0aA87f1506e5d7));
        address stakeToken = vm.envOr("STAKE_TOKEN", address(0x765DE816845861e75A25fCA122bb6898B8B1282a));

        uint16 feeBps = 500; // 5%
        uint64 joinWindow = 600; // 10 minutes to fill
        uint64 settleWindow = 3600; // 1 hour for the relayer to settle, else reclaim

        vm.startBroadcast();
        ArcadeEscrow escrow = new ArcadeEscrow(relayer, feeRecipient, feeBps, joinWindow, settleWindow);
        escrow.setTokenAllowed(stakeToken, true);
        vm.stopBroadcast();

        console.log("ArcadeEscrow:", address(escrow));
        console.log("relayer:", relayer);
        console.log("feeRecipient:", feeRecipient);
        console.log("allowed token:", stakeToken);
    }
}
