// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WeeklyCup} from "../src/WeeklyCup.sol";

/**
 * Deploys the WeeklyCup prize vault.
 *
 * Signing: pass --account <keystore> so Foundry signs with your encrypted
 * keystore (no private key on the command line).
 *
 * Env vars:
 *   CUP_TOKEN    prize ERC20 (defaults to USDm/cUSD on Celo)
 *   CUP_RELAYER  address allowed to settle weeks (defaults to the app relayer)
 */
contract DeployWeeklyCup is Script {
    function run() external {
        address token = vm.envOr("CUP_TOKEN", address(0x765DE816845861e75A25fCA122bb6898B8B1282a));
        address relayer = vm.envOr("CUP_RELAYER", address(0x2b0755026F8312D0c600229774999F7EBC1f70f9));

        vm.startBroadcast();
        WeeklyCup cup = new WeeklyCup(token, relayer);
        vm.stopBroadcast();

        console.log("WeeklyCup:", address(cup));
        console.log("token:", token);
        console.log("relayer:", relayer);
        console.log("owner:", cup.owner());
    }
}
