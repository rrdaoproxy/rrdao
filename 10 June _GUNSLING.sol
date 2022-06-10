pragma solidity ^0.8.0;

import "./wutang.sol";

contract gunsling {

    RussianRoulette public token;
    constructor(address payable _token) {//ask admin
		require(_token != address(0) );
		token = RussianRoulette(_token);
	}

    //variables
    uint256 public _gunslingBetPool;//1of8
    uint256 _totalFeesCollectedG; //gunsling
    mapping(address => uint256) private _betAmountMapping;
    mapping(address => gunslingStruct) private _gunslingMapping;

    //events
    event DelegateGunsling(address indexed owner, uint256 indexed amount);
    event unDelegateGunsling(address indexed owner, uint256 indexed amount);
    event GunSling(address indexed slinger, address indexed challenger, uint256 indexed amount);
    event GunSlingWinner(address indexed winner, uint256 indexed slingerspeed, uint256 indexed challengerspeed);

    //Gunsling
    struct gunslingStruct{
        address slinger;
        address challenger;
        address winner;
        uint challengerSpeed;
        uint slingerSpeed;
        uint256 betAmount;
    }
    function gunSling(address slinger) external {//challenger plays    
        require(msg.sender != _gunslingMapping[slinger].slinger, "delegating from zero address");
        uint256 amount = _gunslingMapping[slinger].betAmount;
        token.transferFrom(msg.sender, address(this), amount);//not _totalFeesCollectedG worthy as its in transit

        uint whipspeed = slingPistol();
        _gunslingMapping[slinger].challengerSpeed= whipspeed;
        _gunslingMapping[slinger].challenger = msg.sender;
        address winner;
        if(whipspeed > _gunslingMapping[slinger].slingerSpeed){
            winner = payable(msg.sender);
            _gunslingMapping[slinger].winner = msg.sender;
        }else{
            _gunslingMapping[slinger].winner = slinger;
        }
        payoutGunsling(slinger, msg.sender, _gunslingMapping[slinger].slingerSpeed, _gunslingMapping[slinger].challengerSpeed, _gunslingMapping[slinger].betAmount);
        emit GunSling(slinger, msg.sender, _gunslingMapping[slinger].betAmount);
        emit GunSlingWinner(winner, _gunslingMapping[slinger].slingerSpeed, whipspeed);
    }

    function payoutGunsling(address challenger, address slinger, uint slingerSpeed, uint challengerSpeed, uint256 betAmount) internal {
    //scale is 1 - 10, if slinger gets 1 it means he will lose 9/10 to challenger if challengerSpeed > slingerSpeed
    //basically whoever loses loses in proportion to speed..number you pick is share/10 you will keep
        uint256 fee = (betAmount  * 10) / 100;
        uint256 settlement = betAmount - fee;
        assert(settlement + fee == betAmount);
        uint256 settle_s = 0;
        uint256 settle_c = 0;
        if(slingerSpeed == challengerSpeed){//draw sends back tokens to both
            settle_s = settlement / 2;
            settle_c = settlement / 2;
        }
        if(slingerSpeed > challengerSpeed){//slinger won
            uint256 sendRate = 10 - challengerSpeed;
            assert(sendRate > 0);
            uint256 winnings = (betAmount * sendRate) / 10;
            uint256 consolation = betAmount  - winnings;
            settle_s = winnings;
            settle_c = consolation;

        }
        if(slingerSpeed < challengerSpeed){//challenger won
            uint256 sendRate = 10 - slingerSpeed;
            assert(sendRate > 0);
            uint256 winnings = (betAmount * sendRate) / 10;
            uint256 consolation = betAmount  - winnings;
            settle_c = winnings;
            settle_s = consolation;
        }

        token.transfer(slinger, settle_s);//slinger - alt for transfering from contract dont use transferFrom>> token.transferFrom(address(this), slinger, settle_s);
        token.transfer(challenger, settle_c);//challenger

        _totalFeesCollectedG += fee;
        _betAmountMapping[slinger] -= betAmount; //creator only uses this, drain all coz totalFeesC...G will be used to liquify
        _gunslingBetPool -= betAmount;
    }
    function _approveDelegate(uint256 amount) public returns(bool){
        require(msg.sender != address(0), "zero addr");
        return(token.approve(address(this), amount));
    }
    function _delegateGunsling(uint256 amount) public {//used on creating challenge by host/slinger..challenger sends as he plays to reduce gunsling steps
        require(msg.sender != address(0), "delegating from zero address");
        uint256 allowance = token.allowance(msg.sender, address(this));
        if(allowance >= 0 && allowance < amount){
            bool increasedAllowance = token.increaseAllowance(address(this), amount);
            require(increasedAllowance, "no_allowance");
        } else if (allowance == 0) {
            _approveDelegate(amount);
            allowance = amount;
        }
        require(allowance >= amount, "Check the token allowance");
        token.transferFrom(msg.sender, address(this), amount);
        emit DelegateGunsling(msg.sender, amount);

        _betAmountMapping[msg.sender] += amount;//for each wallet..balanced on payout
        _gunslingBetPool += amount;//keep track of all tokens delegated to contract for betting
    }//no undelegate, play to exit position

    function createSlingChallenge() public {
        require(msg.sender != address(0), "creating from zero address");
        require(_betAmountMapping[msg.sender] > 0, "no tokens delegated");
        require(_gunslingMapping[msg.sender].betAmount == 0,"already hosting a battle");
        uint whipspeed = slingPistol();
        _gunslingMapping[msg.sender].slinger = msg.sender;
        _gunslingMapping[msg.sender].slingerSpeed = whipspeed;
        _gunslingMapping[msg.sender].betAmount = _betAmountMapping[msg.sender];
    }
    function deleteSlingChallenge() public {
        require(msg.sender != address(0), "deleting from zero address");
        require(_betAmountMapping[msg.sender] > 0, "settled already");
        require(_gunslingMapping[msg.sender].challengerSpeed > 0, "too late to cancel");
        delete _gunslingMapping[msg.sender];//destroy struct from mapping
    }
    function slingPistol() view public returns(uint) {
        uint result = random(1) % 10;//speed
        return result;
    }
    function random(uint _rollsize) internal view returns(uint) {
       return uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, _rollsize)));
    }

    //END GAMEFI

    /* CONSTRUCT VARIANTS:
    //Type / visibility / variable name
    Contract_B public contractB_ref;
    // receive address during deployment script
    constructor(Contract_B _addrContractB) {
        contractB_ref = _addrContractB;
    }

    IERC20 public someToken = IERC20("0x..") // another way to do it Token contract address
    */
    
    /* -- alt https://ethereum.stackexchange.com/questions/92265/solidity-proper-way-to-import-contracts
    constructor() {
       // you can use it to deploy like this
       token = new RussianRoulette();
    }

    // Or you can make call the function on a known address (the contract should be already deployed at the address else it would revert)
    function checkValueFromCustomer(address tokenAddr) public returns (uint256) {
        uint256 balance = token(tokenAddr).balanceOf(msg.sender); // this makes an internal transaction (message call)
        return balance;
    }
    */
    
}