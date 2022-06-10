pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./finswapOG.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract CustomOwnable
{
	address public owner;

	event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

	constructor(address _owner) public
	{
		require (_owner != address(0));
		owner = _owner;
	}

	modifier onlyOwner()
	{
		require(msg.sender == owner);
		_;
	}

	function transferOwnership(address newOwner) public onlyOwner
	{
		require(newOwner != address(0));
		emit OwnershipTransferred(owner, newOwner);
		owner = newOwner;
	}
}

contract RBwallet is CustomOwnable
{
	RussianRoulette public token;

	constructor(address payable _token) CustomOwnable(msg.sender) {//pass main contract add
		require(_token != address(0) );
		//tokenise main contract
		token = RussianRoulette(_token);
		tokenAddress = _token;
	}
	bool public _curActivePoll = false;
	bool public _firstPoll = true;
	uint public _pollCount;
	uint public _lastPollTime;
	uint public _RBfrequency = 1;
	uint256 public _ethVotedOn;
	uint256 public _totalRBW_buybacks;//add this to RussianRoulette buyback tally to get NetBuyBacks;
	uint256 public _totalRBW_treasury;
	uint256 internal _buyback_amnt;
	uint256 internal _cooldown = 60 minutes;
	address public tokenAddress;
	mapping(uint256 => Poll) public polls;
	mapping(address => uint []) pastpolls;
	mapping(address => uint256) private lastCheck;
	string public myVoteString = 'idle';

	//events
	event rbCHECK(address checker, uint rbb, uint256 returned);
	event rbTREASURY(uint256 amount);
	event rbBURN(uint256 amount); //b90306ad06b2a6ff86ddc9327db583062895ef6540e62dc50add009db5b356eb
	event outofPollRange(uint currentRBB, uint256 action);
    event rbBUYBACK(address indexed torcher, uint256 ethbuy, uint256 amount); //0x515a362443b428d4aab92057f742255c765d68033ba3f00847b57e323d0468d4
	event voteCasted(address indexed voter, uint indexed pollID, string vote);
	event pollCreated(address indexed creator, uint indexed pollID, uint256 indexed expires);
	event pollEnded(uint indexed pollID, uint treasuryVotes, uint buybackVotes, PollStatus status);
	event passedBuyBack(uint indexed pollID, uint256  amount, uint treasuryVotes, uint buybackVotes);
	event passedTreasury(uint indexed pollID, uint256 amount, uint treasuryVotes, uint buybackVotes);
	enum PollStatus { IN_PROGRESS, TREASURY, BUYBACK }

	struct Poll{
		uint treasuryVotes;
		uint buybackVotes;
		uint rbb;
		uint256 ethVotedOn;
		uint256 expiration;//1 hour min, 6hours max
		PollStatus status;
		address creator;
		address[] voters;
		mapping(address => Voter) voterInfo;
	}

	struct Voter
	{
		bool hasVoted;
		bool vote;
		uint256 time;
	}

	struct myvotehistory
	{
		uint256 poll;
		bool vote;
	}

	//set frequency
	function setFrequency(uint frequency) internal onlyOwner returns(uint){
		require(frequency >= 1 && frequency <= 6,"min 1 hour , max 6hours");
		_RBfrequency = frequency;
		return _RBfrequency;
	}

	//create
	function newPoll() external returns (uint, uint256){
		if(!_firstPoll){
			uint gap = hoursDifference(_lastPollTime-600);//10mins wait
			require(gap >= _RBfrequency, "too soon for a new poll.");
			require(!_curActivePoll, "end last poll first.");
		}

		(bool continuePoll, uint cur_rbb, uint rb_result, uint256 diffTObuy) = autoRebalancingCheck();//returns: bool(true or false continue to poll), uint rbb, uint autorebalance action(0 wait on Vote, 1 LP buyback, 2 Treasury)
		_pollCount++;
		//poll has an open cheque from autoRebalancing result, the only one to get one as we are in safe range
		if(continuePoll && rb_result == 0){
			Poll storage curPoll = polls[_pollCount];
			curPoll.rbb = cur_rbb;
			curPoll.ethVotedOn = diffTObuy;
			curPoll.expiration = hoursAdd(_RBfrequency);
			curPoll.creator = msg.sender;
			_lastPollTime = block.timestamp;
			_curActivePoll = true;
			if(_firstPoll){_firstPoll = false;}
		}else{
			emit outofPollRange(cur_rbb, rb_result);
			return (0, rb_result);
		}
		emit pollCreated(msg.sender, _pollCount, hoursAdd(_RBfrequency));
		return (_pollCount, rb_result);
	}

	//this concludes and deploys funds based on outcome
	function endPoll(uint _pollID) external validPoll(_pollID){
		require(polls[_pollID].status == PollStatus.IN_PROGRESS, "Poll has already ended.");
		require(block.timestamp >= getPollExpirationTime(_pollID), "Voting ongoing not expired");
		//since polls are locked and autoRebalancingCheck only works if previous poll has ended, 
		//all funds from when poll started are there
		if (polls[_pollID].treasuryVotes > polls[_pollID].buybackVotes){
			polls[_pollID].status = PollStatus.TREASURY;
			//our argument is all balance on contract at time of vote start
			rebalanceTreasury(polls[_pollID].ethVotedOn);
			//wont reserve money for a buyback to 1.5 because we are already under 1.5 if this poll started
		}
		else{//ideal would be to buyback to 1 not below
			//if we buyback to below 1, we will just autoRebalance & foregore to treasury & recoup the excess used as we level out	
			polls[_pollID].status = PollStatus.BUYBACK;
			rebalanceLP(polls[_pollID].ethVotedOn);
		}
		emit pollEnded(_pollID, polls[_pollID].treasuryVotes, polls[_pollID].buybackVotes, polls[_pollID].status);
	}

	function rebalanceLP(uint256 eth_toDeploy) internal returns(uint256){
		//On autorebalance checks: AMOUNT fed is already optimised to get us to 1.25 rbb median
		//On poll outcome: the whole eth balance on contract is used on poll creation & passed on verdict rebalancing.
		//But to cover all other scenarios, we check if we have enough to buyback as asked (to rbb_min, rbb_median, rbb_max)
		uint256 eth_avail = address(this).balance;
		if(eth_avail < eth_toDeploy){
			eth_toDeploy = eth_avail;
		}
		//bonfire event
		uint256 returnedAmnt = token._bonfireEvent{value: eth_toDeploy}(300);
		_totalRBW_buybacks += eth_toDeploy;

		emit rbBUYBACK(address(this), eth_toDeploy, returnedAmnt);
        emit rbBURN(returnedAmnt);
		return returnedAmnt;
	}
	function rebalanceTreasury(uint256 amount) internal{
		address treasuryWallet = token._treasuryWallet();
		payable(treasuryWallet).transfer(amount);
        emit rbTREASURY(amount);
	}

	//get poll status
	function getPollStatus(uint _pollID) public view validPoll(_pollID) returns (PollStatus){
		return polls[_pollID].status;
	}

	//get expiration
	function getPollExpirationTime(uint _pollID) public view validPoll(_pollID) returns (uint256){
		return polls[_pollID].expiration;
	}

	//get wallet's past voting history
	function getPollHistory(address _voter) public view returns(uint256[] memory){
		return pastpolls[_voter];
	}

	//gets a voter's vote for a given expired poll
	function getPollInfoForVoter(uint _pollID, address _voter) public view validPoll(_pollID) returns (bool, bool, uint256){
		require(getIfUserHasVoted(_pollID, _voter));
		Poll storage curPoll = polls[_pollID];//get struct for _pollID
		bool _vote = curPoll.voterInfo[_voter].vote;
		bool _hasVoted = curPoll.voterInfo[_voter].hasVoted;
		uint256 _votetime = curPoll.voterInfo[_voter].time;
		return (_vote, _hasVoted, _votetime);
	}

	//gets all the voters of a poll
	function getVotersForPoll(uint _pollID) public view validPoll(_pollID) returns (address[] memory){
		require(getPollStatus(_pollID) != PollStatus.IN_PROGRESS);
		return polls[_pollID].voters;
	}

	//checks if a user has voted for a specific poll
	function getIfUserHasVoted(uint _pollID, address _user) public view validPoll(_pollID) returns (bool){
		return (polls[_pollID].voterInfo[_user].hasVoted);
	}

	//checks for a valid poll ID.
	modifier validPoll(uint _pollID){
		require(_pollID > 0 && _pollID <= _pollCount, "Not a valid poll Id.");
		_;
	}

	/* VOTE OPERATIONS */

	// Cast a vote, weight is not used, everyone can vote.
	function castVote(uint _pollID, bool _vote) external validPoll(_pollID){
		require(getPollStatus(_pollID) == PollStatus.IN_PROGRESS, "Poll has expired.");
		require(!getIfUserHasVoted(_pollID, msg.sender), "User has already voted.");
		require(getPollExpirationTime(_pollID) > block.timestamp);
		require(token.balanceOf(msg.sender) >= 10000 * (1 ** uint256(token.decimals())), "insufficient tokens.");

		// update array
		pastpolls[msg.sender].push(_pollID);

		Poll storage curPoll = polls[_pollID];

		curPoll.voterInfo[msg.sender] = Voter({
				hasVoted: true,
				vote: _vote,
				time: block.timestamp
		});
		
		if(_vote){//true is Treasury
			curPoll.treasuryVotes += 1; myVoteString = "Treasury";
		}
		else{//false is LP
			curPoll.buybackVotes += 1; myVoteString = "BuyBack";
		}

		curPoll.voters.push(msg.sender);
		emit voteCasted(msg.sender, _pollID, myVoteString);
	}

	//Implements straight through processing
	//called before Vote creation or manually
	//checks if a vote is needed
	//check rbb and nvl then auto rebalance if needed to gurantee a max rbb level at 1.5, min level 1
	//checks rbb levels and calculates how much is needed to rebalance to:
	//-1. median rbb 1.25 - if cur_rbb >= 1.5 (buyback is needed)
	//-2. if rbb <= 1 (no more buy backs) funds go to treasury
	//--on (2) we also need to avoid sending too much to treasury & have none left if the next sell triggers a rbb > 1.5
	//--on (1) each buy back checks how much is needed to get to 1.25, thus protects from going below 1.25 in each buyback
	//--thus (2) is not to protect against over buying but to know how far off we are from 1.25 in current_NVL value
	//--the amount of ETH needed in sells (NVL increase) to take us from <1 & back to 1.25 is what we foregore to the treasury
	//treasury_foregore function reserves funds needed to buyback to median rbb, sends excess to treasury, which can also come back if needed
	//POLLs only allow for unchecked buyback or treasury rebalancing, sending the whole balance. VOTE WISELY!
	//Once that happens we either: stay in range, go below 1, go above 1.5 rbb
	//at that point auto rebalancing is designed to self regulate rbb to within acceptable range
	//AutoRebalance returns: bool(true or false continue to poll), uint rbb, uint autorebalance action(0 wait on Vote, 1 LP buyback, 2 Treasury)
	//CHECK THERES NO CURRENT POLL ACTIVE TO AVOID PEOPLE OVERIDING POLLS
	//Polls should have ended by at least 10mins to create a new one, this shifts polling times to have a random sample of holders participate
	function autoRebalancingCheck() public returns(bool voteProceed, uint rbb, uint action, uint256 eth_toDeploy){
		require(!_curActivePoll, "end current poll first.");
		require(block.timestamp - lastCheck[tx.origin] > _cooldown, "hit address cooldown");
        lastCheck[tx.origin] = block.timestamp;
		//eth in question
		uint256 eth_avail = address(this).balance;
		require(eth_avail > 0, "no funds in RBW.");
		//nvl and buyback sums
		uint256 proxysellNVL = token._totalNVL_proxysell();// NVL / buybacks = rbb
		uint256 uniswapsellNVL = token._totalNVL_dexsell(); 
		uint256 totalNVL = uniswapsellNVL + proxysellNVL;
		uint256 currentBBTotal = token._totalBuyBackETH();
		//rbb levels
		uint call = 0;
		uint256 rbb_max = (3 * 1e18)/2; //1.5
		uint256 rbb_median = rbb_max*6/5;// 1.25 ideal landing zone
		uint256 rbb_min = (1 * 1e18);//1
		uint256 returnedAmnt = 0;

		//ZERO RBB LEVEL CHECKS
		if(totalNVL > 0 && currentBBTotal > 0){//none zero
			rbb = 1e18 * (totalNVL / currentBBTotal);
		}
		if(totalNVL > 0 && currentBBTotal == 0){//money un-replaced
			rbb = 0;//buyback zero division
			call = 1;//liquidity pool rebalance
			// desiredBBTotal = totalNVL / 1.5 
			// p.s: in reality 1.5 is not our target, ideal is 1.25 (rbb_median) then leave community to tilt itself
			eth_toDeploy = _buybackTOMEDIANrbb(totalNVL, currentBBTotal);
		}
		if(totalNVL == 0){//no sells yet
			rbb = 0;//totalNVL zero division
			call = 2;//treasury rebalance
			eth_toDeploy = eth_avail;//send all to treasury for good use as no buybacks needed now
		}

		//NON ZERO RBB LEVEL CHECKS
		if(rbb > 0 && rbb <= rbb_min){//buybacks limit reached,send to treasury
			call = 2;//treasury rebalance
			// find how much we allow to be lost in NVL before we reach 1.25 rbb starting from <1 rbb
			// desiredNVL = rbb_median * currentBBTotal;
			// diffTOlose = desiredNVL - totalNVL;
			// p.s 1.25 still ideal middle ground
			eth_toDeploy = _foregoreTOMEDIANrbb(totalNVL, currentBBTotal);
		}
		if(rbb >= rbb_max){//beyond allowed (1.5) limit, perfom buyback
			call = 1;//liquidity pool rebalance
			//we dont want to buy back the whole difference each time, that would exert a bias of excessive buybacks taking us below rbb of 1
			//we want the DAO to give the treasury a chance, self regulating based on seasons
			//rbb must not be less than 1.5 after the buyback, we want to buyback with just enough.
			//how much do we spend in current buyback in order to not go below 1.5 rbb_max (1.25 rbb_median in practice)
			//logic approach: not to cross 1.5 fix on basis of current rbb & currentBBTotal
			//rbb = totalNVL / totalBuybacks
			// p.s 1.25 still ideal middle ground
			eth_toDeploy = _buybackTOMEDIANrbb(totalNVL, currentBBTotal);
		}
		if(rbb > rbb_min && rbb < rbb_max){//within allowed range 1 -- 1.5
			call = 0;//poll decides
			//community should decide what to do with all the balance we are in a safe range
			//if we over buy, auto checks will correct us from 1 back to median
			//if we send too much to treasury, auto checks take us from 1.5 to median
			eth_toDeploy = eth_avail;
		}
		//calls
		if(call == 1){//perfom buyback
			returnedAmnt = rebalanceLP(eth_toDeploy);//returns tokens bought
			emit rbCHECK(msg.sender, rbb, returnedAmnt);
			return (false,rbb,1,eth_toDeploy);//0 is community vote, 1 LP buyback, 2 Treasury rebalance
		}
		if(call == 2){//send to treasury
			rebalanceTreasury(eth_toDeploy);
			emit rbCHECK(msg.sender, rbb, eth_toDeploy);
			return (false,rbb,2,eth_toDeploy);
		}
		if(call == 0){//community poll decides
			emit rbCHECK(msg.sender, rbb, returnedAmnt);
			return (true,rbb,0,eth_toDeploy);
		}
	}
	/*	HELPER FUNCTIONS	*/
	// Pure functions first
	function _buybackTOMAXrbb(uint256 totalNVL, uint256 currentBBTotal) public pure returns(uint256){
		uint256 rbb_max = 150; //1.5
		//NVL / BUYBACKS = rbb
		//knownAmnt = 1.5 * unknownBuyBackAmnt
		uint256 desiredBBTotal = (totalNVL / rbb_max) *100; 
		uint256 diffTObuy = desiredBBTotal - currentBBTotal;
		return diffTObuy;
	}
	function _buybackTOMEDIANrbb(uint256 totalNVL, uint256 currentBBTotal) public pure returns(uint256){
		uint256 rbb_median = 125;// 1.25 ideal landing zone
		// NVL / BUYBACKS = rbb
		// rbb_median of 1.25: rbb_median = totalNVL/ desiredBBTotal; gives us desired & we know current.
		uint256 desiredBBTotal = (totalNVL / rbb_median) *100; 
		uint256 diffTObuy = desiredBBTotal - currentBBTotal;
		return diffTObuy;
	}
	function _buybackTOMiNrbb(uint256 totalNVL, uint256 currentBBTotal) public pure returns(uint256){
		uint256 rbb_min = 100; //1
		// NVL / BUYBACKS = rbb
		// rbb_min of 1: rbb_min = totalNVL/ desiredBBTotal; gives us desired & we know current.
		uint256 desiredBBTotal = (totalNVL / rbb_min) *100; 
		uint256 diffTObuy = desiredBBTotal - currentBBTotal;//should be equal to NVL
		return diffTObuy;
	}
	//p.s ONLY works when rbb is below median, if current rbb is > median rbb: ERROR
	function _foregoreTOMEDIANrbb(uint256 totalNVL, uint256 currentBBTotal) public view returns(uint256){
		uint256 eth_avail = address(this).balance;//eth in question

		uint256 rbb_median = 125;// 1.25 ideal landing zone
		//NVL = rbb * BUYBACKS
		//rbb is low - below peg, meaning NVL needs to increase, whilst buybacks are constant, to raise rbb to target
		//NVL_needed = Totalbuybacks * rbb_toIncrease_to;
		//p.s ONLY works when rbb is below median, if current rbb is > median rbb: ERROR
		uint256 desiredNVL = (currentBBTotal * rbb_median)/100;
		uint256 nvl_equivalent = 0;
		//THE CONCEPT HERE IS: we are not buying back anything, but we want to know how much we need in sells in order to raise rbb
		//rbb below 1 means we bought back excessively, hence we assign it to treasury instead to balance the over buying
		//the sells that follow will be bought back at community's preference
		if(desiredNVL > totalNVL){
			nvl_equivalent = desiredNVL - totalNVL;
		}else{
		//we may need to buy back soon. rbb is high, reserve whats needed to buyback to median..send away excess
			uint256 reserveForBB = _buybackTOMEDIANrbb(totalNVL, currentBBTotal);
			nvl_equivalent = eth_avail - reserveForBB;
		}		
		return nvl_equivalent;
	}
	function rbbLevels() public view returns(uint256, uint256){
		uint256 proxysellNVL = token._totalNVL_proxysell();// NVL / buybacks = rbb
		uint256 uniswapsellNVL = token._totalNVL_dexsell(); 
		uint256 buybacks = token._totalBuyBackETH();
		uint256 rbb = (1e18* (uniswapsellNVL + proxysellNVL))/buybacks;
		require(rbb > 0,"no buybacks yet");
		uint256 rbb_max = (3 * 1e18)/2;
		return (rbb,rbb_max);
	}
	function hoursDifference(uint timeA) public returns (uint){
        uint difhours = _BokkyPooBahDateMixer(timeA, 1);//then - now
		return difhours;
    }
    function hoursAdd(uint timeA) public returns (uint){
        uint sumhours = _BokkyPooBahDateMixer(timeA, 2);//then - now
		return sumhours;
    }
	function _BokkyPooBahDateMixer(uint inputUINT, uint funcNo) public returns(uint){
        //inputUINT is timestamp input, block.timestamp isnt fed
        //reqType is indicator of which function is being called
       
        address _BokkyPooBahAddr = (0x093A2489f18C342193D010b2A7771A8158A0d93B);
        bytes memory payload;
        if(funcNo == 1){//hoursDiff
            payload = abi.encodeWithSignature("diffHours(uint256,uint256)", inputUINT, block.timestamp);//then - now
        }
        if(funcNo == 2){//hoursAdd
            payload = abi.encodeWithSignature("addHours(uint256,uint256)", block.timestamp, inputUINT);//then - now
        }
	    (bool success, bytes memory result) = _BokkyPooBahAddr.call(payload);
	    if(!success){	revert();	}
		// Decode data
		uint256 outputstamp = abi.decode(result, (uint256));
		return outputstamp;        
    }


	/* START WORKSHOP - TO BE SHIPPED OUT TO WORKSHOP CONTRACT */
	function checkPrice() public view returns(uint256){
        uint256 returnedAmnt = token.price();
		return returnedAmnt;
	}
    function circulatingGUNS() public returns (uint256) {
		address _rrdaoAddress = (0x10DC78d57B670B2d4b899206CBcC8739590eFFD0);
		(bool success, bytes memory result) = _rrdaoAddress.call(abi.encodeWithSignature("circulatingSupply()"));
		if(!success){	revert();	}
			// Decode data
			uint256 output = abi.decode(result, (uint256));	
			return output;
	}
	//more workshop shit
	IUniswapV2Router02 internal _router = IUniswapV2Router02(address(0));
	function UniswapNVLETH(uint256 amountIn) public returns(uint256){
		
		IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
		_router = _uniswapV2Router;
        address[] memory path = new address[](2);
        path[0] = tokenAddress;
        path[1] = _router.WETH();
		uint[] memory  amountsOut = _router.getAmountsOut(amountIn, path);
        uint256 _totalNVL_dexsell = amountsOut[amountsOut.length - 1];
        return _totalNVL_dexsell;
    }
	function priceB() public returns (uint256 [] memory) {
		IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
		_router = _uniswapV2Router;
		address[] memory path = new address[](2);
        path[0] = tokenAddress;
        path[1] = _router.WETH();
		uint256 amountFeed = 1000000 * 10**18;
		IERC20 dai = IERC20(token);
        dai.approve(address(_router), amountFeed);
        uint[] memory returnAmount_ = _router.getAmountsOut(
            amountFeed,
            path
        );
        return returnAmount_;
    }
	/* TOKEN OPERATIONS */
	/*
	 * Stakes tokens for a given voter in return for voting credits.
	 * NOTE:
	 *  User must approve transfer of tokens.
	 *  _numTokens is denominated in *wei*.
	 *
	function stakeVotingTokens(uint256 _numTokens) external
	{
		require(token.balanceOf(msg.sender) >= _numTokens, "User does not have enough tokens");
		require(token.transferFrom(msg.sender, this, _numTokens), "User did not approve token transfer.");
		bank[msg.sender].tokenBalance += _numTokens;
	}

	
	function withdrawTokens(uint256 _numTokens) external
	{
		uint256 largest = getLockedAmount(msg.sender);
		require(getTokenStake(msg.sender) - largest >= _numTokens, "User is trying to withdraw too many tokens.");
		bank[msg.sender].tokenBalance -= _numTokens;
		require(token.transfer(msg.sender, _numTokens));
	}

	/Helper function that updates active token balances after a poll has ended.
	 
	function updateTokenBank(uint256 _pollID) internal{
		Poll memory curPoll = polls[_pollID];
		for (uint256 i = 0; i < curPoll.voters.length; i++)
		{
			address voter = curPoll.voters[i];
			bank[voter].lockedTokens[_pollID] = 0;
		}
	}
	*/

	receive() external payable {//fallback function have restricted allowance of 2300 gas for security reasons. Unfortunately 2300 gas is not enough to do many calls
		//_ETHbalance += msg.value;
	}
}
