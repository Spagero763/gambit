// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WeeklyCup} from "../src/WeeklyCup.sol";

interface Vm {
    function prank(address) external;
    function warp(uint256) external;
    function expectRevert() external;
}

contract MockERC20 {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        require(balanceOf[msg.sender] >= amt, "BAL");
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        return true;
    }
}

contract WeeklyCupTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    WeeklyCup cup;
    MockERC20 token;

    address relayer = address(0x1001);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCa401);

    uint256 constant WEEK = 7 days;
    uint256 constant EPOCH_MONDAY = 4 days;

    function setUp() public {
        token = new MockERC20();
        cup = new WeeklyCup(address(token), relayer);
        token.mint(address(cup), 100e18); // funded prize vault
        // land in the middle of a known week so week-1 is safely over
        vm.warp(EPOCH_MONDAY + 100 * WEEK + 3 days);
    }

    function _podium() internal view returns (address[] memory w, uint256[] memory a) {
        w = new address[](3);
        w[0] = alice;
        w[1] = bob;
        w[2] = carol;
        a = new uint256[](3);
        a[0] = 2.5e18;
        a[1] = 1.5e18;
        a[2] = 1e18;
    }

    function test_currentWeekMatchesCalendar() public view {
        require(cup.currentWeek() == 100, "week calc");
    }

    function test_settlePaysPodiumOnce() public {
        (address[] memory w, uint256[] memory a) = _podium();
        vm.prank(relayer);
        cup.settleWeek(99, w, a);
        require(token.balanceOf(alice) == 2.5e18, "alice paid");
        require(token.balanceOf(bob) == 1.5e18, "bob paid");
        require(token.balanceOf(carol) == 1e18, "carol paid");
        require(cup.settled(99), "flagged settled");

        vm.prank(relayer);
        vm.expectRevert();
        cup.settleWeek(99, w, a); // never twice
    }

    function test_partialPodium() public {
        address[] memory w = new address[](1);
        w[0] = alice;
        uint256[] memory a = new uint256[](1);
        a[0] = 2.5e18;
        vm.prank(relayer);
        cup.settleWeek(99, w, a);
        require(token.balanceOf(alice) == 2.5e18, "sole winner paid");
    }

    function test_onlyRelayerSettles() public {
        (address[] memory w, uint256[] memory a) = _podium();
        vm.prank(alice);
        vm.expectRevert();
        cup.settleWeek(99, w, a);
    }

    function test_cannotSettleRunningOrFutureWeek() public {
        (address[] memory w, uint256[] memory a) = _podium();
        vm.prank(relayer);
        vm.expectRevert();
        cup.settleWeek(100, w, a); // current week still running
        vm.prank(relayer);
        vm.expectRevert();
        cup.settleWeek(101, w, a); // future
    }

    function test_rejectsBadArrays() public {
        (address[] memory w,) = _podium();
        uint256[] memory tooFew = new uint256[](2);
        vm.prank(relayer);
        vm.expectRevert();
        cup.settleWeek(99, w, tooFew); // length mismatch

        address[] memory four = new address[](4);
        uint256[] memory fourAmt = new uint256[](4);
        vm.prank(relayer);
        vm.expectRevert();
        cup.settleWeek(99, four, fourAmt); // more than a podium

        address[] memory zeroW = new address[](1);
        uint256[] memory oneAmt = new uint256[](1);
        oneAmt[0] = 1e18;
        vm.prank(relayer);
        vm.expectRevert();
        cup.settleWeek(99, zeroW, oneAmt); // zero-address winner
    }

    function test_insufficientVaultReverts() public {
        address[] memory w = new address[](1);
        w[0] = alice;
        uint256[] memory a = new uint256[](1);
        a[0] = 1000e18; // more than the vault holds
        vm.prank(relayer);
        vm.expectRevert();
        cup.settleWeek(99, w, a);
        require(!cup.settled(99), "not marked settled on failure");
    }

    function test_ownerControls() public {
        cup.setRelayer(bob);
        require(cup.relayer() == bob, "relayer changed");

        vm.prank(alice);
        vm.expectRevert();
        cup.setRelayer(alice); // non-owner

        cup.sweep(address(token), address(this), 100e18);
        require(token.balanceOf(address(this)) == 100e18, "swept");

        vm.prank(alice);
        vm.expectRevert();
        cup.sweep(address(token), alice, 1); // non-owner sweep
    }
}
