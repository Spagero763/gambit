// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ArcadeEscrow} from "../src/ArcadeEscrow.sol";

interface Vm {
    function prank(address) external;
    function warp(uint256) external;
    function expectRevert() external;
}

contract NoReturnToken {
    // USDT-style: transfer/transferFrom return nothing
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function approve(address spender, uint256 amt) external {
        allowance[msg.sender][spender] = amt;
    }

    function transfer(address to, uint256 amt) external {
        _xfer(msg.sender, to, amt);
    }

    function transferFrom(address from, address to, uint256 amt) external {
        uint256 al = allowance[from][msg.sender];
        require(al >= amt, "ALLOWANCE");
        if (al != type(uint256).max) allowance[from][msg.sender] = al - amt;
        _xfer(from, to, amt);
    }

    function _xfer(address from, address to, uint256 amt) internal {
        require(balanceOf[from] >= amt, "BAL");
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
    }
}

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function approve(address spender, uint256 amt) external returns (bool) {
        allowance[msg.sender][spender] = amt;
        return true;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        _xfer(msg.sender, to, amt);
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        uint256 al = allowance[from][msg.sender];
        require(al >= amt, "ALLOWANCE");
        if (al != type(uint256).max) allowance[from][msg.sender] = al - amt;
        _xfer(from, to, amt);
        return true;
    }

    function _xfer(address from, address to, uint256 amt) internal {
        require(balanceOf[from] >= amt, "BAL");
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
    }
}

contract ArcadeEscrowTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    ArcadeEscrow escrow;
    MockERC20 token;

    address relayer = address(0x1001);
    address feeWallet = address(0xFEE5);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCa401);
    address dave = address(0xDa4e);

    uint128 constant STAKE = 1e18;

    function setUp() public {
        token = new MockERC20();
        escrow = new ArcadeEscrow(relayer, feeWallet, 500, 600, 3600); // 5% fee, 10 min join, 1h settle
        escrow.setTokenAllowed(address(token), true);
        _fund(alice);
        _fund(bob);
        _fund(carol);
        _fund(dave);
    }

    function _fund(address p) internal {
        token.mint(p, 10e18);
        vm.prank(p);
        token.approve(address(escrow), type(uint256).max);
    }

    function _one(address a) internal pure returns (address[] memory r) {
        r = new address[](1);
        r[0] = a;
    }

    function _assert(bool cond, string memory what) internal pure {
        require(cond, what);
    }

    // 1v1: winner takes pool minus 5% fee
    function test1v1WinnerTakesPot() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.prank(bob);
        escrow.joinMatch(id);

        vm.prank(relayer);
        escrow.declareResult(id, _one(alice));

        _assert(token.balanceOf(alice) == 10e18 - STAKE + 19e17, "alice payout"); // -1 +1.9
        _assert(token.balanceOf(bob) == 10e18 - STAKE, "bob lost stake");
        _assert(token.balanceOf(feeWallet) == 1e17, "fee 5%");
    }

    // 1v1 draw refunds both, no fee
    function test1v1DrawRefunds() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.prank(bob);
        escrow.joinMatch(id);

        vm.prank(relayer);
        escrow.declareResult(id, _one(address(0)));

        _assert(token.balanceOf(alice) == 10e18, "alice refunded");
        _assert(token.balanceOf(bob) == 10e18, "bob refunded");
        _assert(token.balanceOf(feeWallet) == 0, "no fee on draw");
    }

    // creator can cancel an open, unjoined match
    function testCreatorCancelsOpen() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.prank(alice);
        escrow.cancelMatch(id);
        _assert(token.balanceOf(alice) == 10e18, "alice refunded on cancel");
    }

    // anyone can refund after the join window passes
    function testRefundAfterWindow() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.warp(block.timestamp + 601);
        vm.prank(bob);
        escrow.cancelMatch(id);
        _assert(token.balanceOf(alice) == 10e18, "alice refunded after window");
    }

    // only the relayer can settle
    function testOnlyRelayerSettles() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.prank(bob);
        escrow.joinMatch(id);
        vm.prank(alice);
        vm.expectRevert();
        escrow.declareResult(id, _one(alice));
    }

    // cannot join twice
    function testCannotJoinTwice() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.prank(alice);
        vm.expectRevert();
        escrow.joinMatch(id);
    }

    // cannot join after window
    function testCannotJoinExpired() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.warp(block.timestamp + 601);
        vm.prank(bob);
        vm.expectRevert();
        escrow.joinMatch(id);
    }

    // 4-player pot splits 50/30/20 among top three
    function testPotTopThreeSplit() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 1, 4);
        vm.prank(bob);
        escrow.joinMatch(id);
        vm.prank(carol);
        escrow.joinMatch(id);
        vm.prank(dave);
        escrow.joinMatch(id);

        address[] memory ranking = new address[](3);
        ranking[0] = alice;
        ranking[1] = bob;
        ranking[2] = carol;
        vm.prank(relayer);
        escrow.declareResult(id, ranking);

        // pool 4e18, fee 0.2e18, distributable 3.8e18 -> 1.9 / 1.14 / 0.76
        _assert(token.balanceOf(alice) == 10e18 - STAKE + 19e17, "1st 50%");
        _assert(token.balanceOf(bob) == 10e18 - STAKE + 114e16, "2nd 30%");
        _assert(token.balanceOf(carol) == 10e18 - STAKE + 76e16, "3rd 20%");
        _assert(token.balanceOf(dave) == 10e18 - STAKE, "4th nothing");
        _assert(token.balanceOf(feeWallet) == 2e17, "fee 5%");
    }

    // pots require exactly three ranked winners
    function testPotRejectsShortRanking() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 1, 4);
        vm.prank(bob);
        escrow.joinMatch(id);
        vm.prank(carol);
        escrow.joinMatch(id);
        vm.prank(dave);
        escrow.joinMatch(id);

        address[] memory ranking = new address[](2);
        ranking[0] = alice;
        ranking[1] = bob;
        vm.prank(relayer);
        vm.expectRevert();
        escrow.declareResult(id, ranking);
    }

    // stale filled match can be rescued by anyone after the settle window
    function testReclaimStalledRefundsAll() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.prank(bob);
        escrow.joinMatch(id);

        vm.warp(block.timestamp + 3601);
        vm.prank(carol); // any third party
        escrow.reclaimStalled(id);

        _assert(token.balanceOf(alice) == 10e18, "alice refunded");
        _assert(token.balanceOf(bob) == 10e18, "bob refunded");
        _assert(token.balanceOf(feeWallet) == 0, "no fee");
    }

    // cannot rescue before the settle window elapses
    function testCannotReclaimEarly() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.prank(bob);
        escrow.joinMatch(id);
        vm.prank(carol);
        vm.expectRevert();
        escrow.reclaimStalled(id);
    }

    // relayer can abort a filled match and refund everyone
    function testRelayerAbortRefunds() public {
        vm.prank(alice);
        uint256 id = escrow.createMatch(address(token), STAKE, 0, 2);
        vm.prank(bob);
        escrow.joinMatch(id);
        vm.prank(relayer);
        escrow.abortMatch(id);
        _assert(token.balanceOf(alice) == 10e18, "alice refunded");
        _assert(token.balanceOf(bob) == 10e18, "bob refunded");
    }

    // a non-allowlisted token is rejected
    function testDisallowedTokenReverts() public {
        MockERC20 other = new MockERC20();
        other.mint(alice, 10e18);
        vm.prank(alice);
        other.approve(address(escrow), type(uint256).max);
        vm.prank(alice);
        vm.expectRevert();
        escrow.createMatch(address(other), STAKE, 0, 2);
    }

    // no-return ERC20 (USDT-style) works once allowlisted
    function testNoReturnTokenWorks() public {
        NoReturnToken usdt = new NoReturnToken();
        escrow.setTokenAllowed(address(usdt), true);
        usdt.mint(alice, 10e18);
        usdt.mint(bob, 10e18);
        vm.prank(alice);
        usdt.approve(address(escrow), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(escrow), type(uint256).max);

        vm.prank(alice);
        uint256 id = escrow.createMatch(address(usdt), STAKE, 0, 2);
        vm.prank(bob);
        escrow.joinMatch(id);
        vm.prank(relayer);
        escrow.declareResult(id, _one(alice));

        _assert(usdt.balanceOf(alice) == 10e18 - STAKE + 19e17, "alice payout");
        _assert(usdt.balanceOf(feeWallet) == 1e17, "fee");
    }
}
