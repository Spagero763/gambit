// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {RewardsVault} from "../src/RewardsVault.sol";

interface Vm {
    function prank(address) external;
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

contract RewardsVaultTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    RewardsVault vault;
    MockERC20 token;

    address relayer = address(0x1001);
    address inviter = address(0xA11CE);
    address invitee = address(0xB0B);

    function setUp() public {
        token = new MockERC20();
        vault = new RewardsVault(address(token), relayer);
        token.mint(address(vault), 100e18);
    }

    function _pair() internal view returns (address[] memory r, uint256[] memory a) {
        r = new address[](2);
        r[0] = inviter;
        r[1] = invitee;
        a = new uint256[](2);
        a[0] = 0.1e18;
        a[1] = 0.1e18;
    }

    function test_paysOncePerKey() public {
        bytes32 key = keccak256(abi.encodePacked("referral", invitee));
        (address[] memory r, uint256[] memory a) = _pair();
        vm.prank(relayer);
        vault.payReward(key, "referral", r, a);
        require(token.balanceOf(inviter) == 0.1e18, "inviter paid");
        require(token.balanceOf(invitee) == 0.1e18, "invitee paid");
        require(vault.paid(key), "flagged");

        vm.prank(relayer);
        vm.expectRevert();
        vault.payReward(key, "referral", r, a); // never twice
    }

    function test_differentKeysBothPay() public {
        (address[] memory r, uint256[] memory a) = _pair();
        vm.prank(relayer);
        vault.payReward(keccak256("k1"), "referral", r, a);
        vm.prank(relayer);
        vault.payReward(keccak256("k2"), "streak", r, a);
        require(token.balanceOf(inviter) == 0.2e18, "paid twice across keys");
    }

    function test_onlyRelayer() public {
        (address[] memory r, uint256[] memory a) = _pair();
        vm.prank(inviter);
        vm.expectRevert();
        vault.payReward(keccak256("k"), "referral", r, a);
    }

    function test_rejectsBadInput() public {
        (address[] memory r, uint256[] memory a) = _pair();
        uint256[] memory one = new uint256[](1);
        vm.prank(relayer);
        vm.expectRevert();
        vault.payReward(keccak256("k"), "referral", r, one); // length mismatch

        address[] memory none = new address[](0);
        uint256[] memory zero = new uint256[](0);
        vm.prank(relayer);
        vm.expectRevert();
        vault.payReward(keccak256("k"), "referral", none, zero); // empty

        address[] memory nine = new address[](9);
        uint256[] memory nineA = new uint256[](9);
        vm.prank(relayer);
        vm.expectRevert();
        vault.payReward(keccak256("k"), "referral", nine, nineA); // too many

        address[] memory zw = new address[](1);
        uint256[] memory za = new uint256[](1);
        za[0] = 1;
        vm.prank(relayer);
        vm.expectRevert();
        vault.payReward(keccak256("k"), "referral", zw, za); // zero recipient
    }

    function test_insufficientVaultRevertsAndUnpaid() public {
        address[] memory r = new address[](1);
        r[0] = inviter;
        uint256[] memory a = new uint256[](1);
        a[0] = 1000e18;
        vm.prank(relayer);
        vm.expectRevert();
        vault.payReward(keccak256("big"), "referral", r, a);
        require(!vault.paid(keccak256("big")), "not flagged on failure");
    }

    function test_ownerControls() public {
        vault.setRelayer(invitee);
        require(vault.relayer() == invitee, "relayer changed");
        vm.prank(inviter);
        vm.expectRevert();
        vault.setRelayer(inviter);

        vault.sweep(address(token), address(this), 100e18);
        require(token.balanceOf(address(this)) == 100e18, "swept");
        vm.prank(inviter);
        vm.expectRevert();
        vault.sweep(address(token), inviter, 1);
    }
}
