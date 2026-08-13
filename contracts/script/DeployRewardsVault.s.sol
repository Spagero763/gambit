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
 *   REWARDS_TOKEN    payout ERC20 (defaults to USDT on Celo, 6 decimals)
 *   REWARDS_RELAYER  address allowed to pay rewards (defaults to the app relayer)
 *
 * The app reads decimals off the vault's token, so a 6-decimal payout token
 * needs no code change — only REWARDS_CONTRACT repointed at the new address.
 */
contract DeployRewardsVault is Script {
    function run() external {
        address token = vm.envOr("REWARDS_TOKEN", address(0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e));
        address relayer = vm.envOr("REWARDS_RELAYER", address(0xa4fB1ED5abbaFC0820e5399aE9E61C9a3B16ACbe));

        vm.startBroadcast();
        RewardsVault vault = new RewardsVault(token, relayer);
        vm.stopBroadcast();

        console.log("RewardsVault:", address(vault));
        console.log("token:", token);
        console.log("relayer:", relayer);
        console.log("owner:", vault.owner());
    }
}
