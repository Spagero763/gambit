// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RewardsVault} from "../src/RewardsVault.sol";

/**
 * Deploys the RewardsVault (referral bonuses and future incentive payouts).
 *
 * Signing: pass --account <keystore> so Foundry signs with your encrypted
 * keystore (no private key on the command line).
 *
 * Env vars:
 *   REWARDS_TOKEN    payout ERC20 (defaults to USDm/cUSD on Celo)
 *   REWARDS_RELAYER  address allowed to pay rewards (defaults to the app relayer)
 */
contract DeployRewardsVault is Script {
    function run() external {
        address token = vm.envOr("REWARDS_TOKEN", address(0x765DE816845861e75A25fCA122bb6898B8B1282a));
        address relayer = vm.envOr("REWARDS_RELAYER", address(0x2b0755026F8312D0c600229774999F7EBC1f70f9));

        vm.startBroadcast();
        RewardsVault vault = new RewardsVault(token, relayer);
        vm.stopBroadcast();

        console.log("RewardsVault:", address(vault));
        console.log("token:", token);
        console.log("relayer:", relayer);
        console.log("owner:", vault.owner());
    }
}
