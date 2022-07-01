// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./UniswapV2Library.sol";

contract RussianRoulette is ERC20, Ownable {
    modifier lockSwap {
        _inSwap = true;
        _;
        _inSwap = false;
    }

    modifier liquidityAdd {
        _inLiquidityAdd = true;
        _;
        _inLiquidityAdd = false;
    }
    uint internal datefrom_lastcheck = 0;
    uint public _monthPlayers = 0;
    uint public backEndOdds = 3; //3 here, 2 front end
    uint public frontEndOdds = 2;
    uint256 public rrday = 26;
    uint256 public _maxHoldings = 7500000 * 1e18; //2500000 final 0.5% as we will start with 1k liquidity
    uint256 public _buyRate = 15;
    uint256 public _sellRate = 20;
    uint256 public _rrwinnerRate = 10;
    uint256 public _reflectRate = 5;
    uint256 public _discountRate = 5;//discount for helping us liquidate fee tokens when you buy from our website/proxy dex
    uint256 public _serviceFee = 5;
    uint256 public _holders;
    uint256 public _ethReflectionBasis;
    uint256 public _totalServiceFees;
    uint256 public _totalStaked;//2of8 total types of tokens on contract at each given time
    uint256 public _totalDeleSell;//5of8
    uint256 public _totalDeleLease;//6of8
    uint256 public _totalEthRebalanced;
    uint256 public _totalReflectClaims;
    uint256 public _tradingStartBlock = 3041510;//mainnet 14400000
    uint256 internal _totalSupply = 0;
    uint256 public _totalBuyBackETH = 0;
    uint256 public _totalNVL_proxysell = 0;
    uint256 public _totalNVL_dexsell = 0;

    address payable public _rebalanceWallet;
    address payable public _treasuryWallet;
    address public _pairAddress;
    address internal _burnAddress = 0x000000000000000000000000000000000000dEaD;
    address internal _bokkyPooBahAddr = 0x093A2489f18C342193D010b2A7771A8158A0d93B;
    IUniswapV2Router02 internal _router = IUniswapV2Router02(address(0));

    bool internal _swapFees = true;
    bool internal _teamMint = false;
    bool internal _inSwap = false;
    bool internal _inLiquidityAdd = false;
    bool public _tradingActive = false;
    bool public _useWinnerFees = false;
    
    mapping(address => bool) private _reflectionExcluded;
    mapping(address => bool) private _taxExcluded;
    mapping(address => bool) private _bot;
    mapping(address => bool) private _feeCollector;
    mapping(address => bool) private _buyerStaker;
    mapping(address => bool) private _feeLiquifier;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _lastBuy;
    mapping(address => uint256) private _lastPlay;
    mapping(address => uint256) private _daysLeftToCool;
    mapping(address => uint256) private _lastReflectionBasisShares;
    mapping(address => uint256) private _lastReflectionBasisStaked;
    mapping(address => uint256) private _sharesLeaseAmnt;
    mapping(address => uint256) public _sellDelegation;
    mapping(address => uint256) public _shareDelegation;
    mapping(address => uint256) public _totalEthReflectedBE;//*
    mapping(address => uint256) public _totalEthReflectedSL;//*
    mapping(address => uint256) public _totalEthReflectedST;//*
    mapping(address => uint256) public _totalEthReflectedWallet;
    mapping(address => uint256) public _lastReflectionBasis;//*
    mapping(address => address) public _claimBeneficiary;//*
    mapping(address => myloansStruct) private _shareClaimsMapping;
    mapping(address => mysharesStruct) private _shareMapping;//store stracts
    mapping(address => mystakesStruct) private _stakeMapping;
    mapping(address => acptStruct) private _acptMapping;
    mapping(address => winningStruct) private _winnerMapping;	
    
    address[] internal _rrWinnersArray; //lifetime winners
    address[] internal _lessorsArray;
    
    event Burn(uint256 indexed amount); //b90306ad06b2a6ff86ddc9327db583062895ef6540e62dc50add009db5b356eb
    event BUYft(address indexed buyer, uint256 amount);
    event BuyBack(address indexed torcher, uint256 ethbuy, uint256 amount); //0x515a362443b428d4aab92057f742255c765d68033ba3f00847b57e323d0468d4
    event BanditSell(address indexed seller, uint256 tokens, uint256 ethreceive); //d1de9ccce7967ac4516e408ac589d0e9629e23e32e32673da31505df30770739
    event BANG(address indexed player, uint256 indexed date);
    event Staked(address indexed staker, uint256 indexed expiry, uint256 tokens);
    event Unstaked(address indexed staker, uint256 tokens);
    event LeaseList(address indexed lessor, uint256 ethask, uint256 shares);
    event LeaseStart(address indexed lessor, address indexed lessee, uint256 shares);
    event LeaseUnlist(address indexed lessor, uint256 shares, uint256 indexed time);
    event LeaseEnd(address indexed lessor, uint256 shares, uint256 indexed time);
    event DelegateSell(address indexed investor, address indexed proxy, uint256 amount);
    event unDelegateSell(address indexed proxy, address indexed investor, uint256 amount);
    event DelegateLease(address indexed investor, address indexed proxy, uint256 amount);
    event unDelegateLease(address indexed proxy, address indexed investor, uint256 amount);
    event ClaimReflectionLease(address indexed claimer, address indexed lessor, uint256 reflection);
    event ClaimReflectionStake(address indexed claimer, address indexed proxy, uint256 reflection);
    event ClaimReflection(address indexed claimer, address indexed beneficiary, uint256 reflection);

    constructor(
        address payable treasuryWallet
    ) ERC20("Wutang Clan", "WUMO") Ownable() {
        addTaxExcluded(owner());
        addTaxExcluded(treasuryWallet);
        addTaxExcluded(_burnAddress);
        addTaxExcluded(address(this));

        _rebalanceWallet = payable(owner());
        _treasuryWallet = treasuryWallet;

        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D); // 0x10ED43C718714eb63d5aA57B78B54704E256024E pancake test, 0xa6AD18C2aC47803E193F75c3677b14BF19B94883 SpookySwap test
        // Create a uniswap pair for this new token
        _pairAddress = IUniswapV2Factory(_uniswapV2Router.factory()).createPair(address(this),_uniswapV2Router.WETH());
        // set the rest of the contract variables
        _router = _uniswapV2Router;
    }

    function addLiquidity(uint256 tokens) public payable onlyOwner() liquidityAdd {
        uint256 lptokens = (tokens * 90) / 100;
        _mint(address(this), lptokens);
        _mint(owner(), tokens-lptokens);
        _approve(address(this), address(_router), lptokens);
        _router.addLiquidityETH{value: msg.value}(
            address(this),
            lptokens,
            0,
            0,
            owner(),
            //consider not relying on blocktime
            block.timestamp
        );
        if (!_tradingActive) {
            _tradingActive = true;//once we add liquidity we activate trading
            _holders += 1;
        }
    }
    function acpt(address account) public view returns (uint256) {
        uint256 acpt_value = _acptMapping[account].tokenscost / _acptMapping[account].tokens;
        return acpt_value;
    }
    function addReflectionETH() public payable {//donations welcome. on holidays. etc
        require(msg.value > 0,"not zero");
        _ethReflectionBasis += msg.value;
    }
    function circulatingSupply() public view returns (uint256) {
        uint256 _circSupply = _totalSupply - balanceOf(_burnAddress);
        return _circSupply;
    }
    function currentRewardForWallet(address addr) public view returns(uint256) {//even if you dont claim your eth will be there on contract waiting
        uint256 ethChange = _ethReflectionBasis - _lastReflectionBasis[addr];
        uint256 owed = (ethChange * balanceOf(addr)) / _totalSupply;
        return owed;
    }
    function price() public view returns (uint256) {//ETH PER TOKEN NOT price0CumulativeLast APPROACH
        IUniswapV2Pair pair = IUniswapV2Pair(_pairAddress);
        (uint reserveA, uint reserveB,) = pair.getReserves();
        uint256 tokenprice = (reserveB * (10 ** uint256(18))) / reserveA;
        return tokenprice;
    }
    function RussianRouletteWinners() public view returns(address[] memory) {
        return _rrWinnersArray;
    }
    function fetchSwapAmounts(uint256 amountIn, uint swap) public view returns(uint256){
        address[] memory path = new address[](2);
        if(swap == 1){//buy
            path[0] = _router.WETH();
            path[1] = address(this);
        }else if(swap == 0){//sell
            path[0] = address(this);
            path[1] = _router.WETH();
        }
		uint[] memory  amountsOut = _router.getAmountsOut(amountIn, path);
        return amountsOut[amountsOut.length - 1];
    }
    //taxes
    function isTaxExcluded(address account) public view returns (bool) {
        return _taxExcluded[account];
    }
    function addTaxExcluded(address account) public {
        _taxExcluded[account] = true;
    }
    struct winningStruct {
        uint arrayKey;
        uint256 time;
    }
    function addRRwinners(address account) public{
        require(!isTaxExcluded(account), "Account must not be excluded");//tax excluded accounts cant be winners
        _taxExcluded[account] = true;
        _rrWinnersArray.push(account);
        uint indexw = _rrWinnersArray.length - 1;
        //store key in struct... current winners who havent sold yet should stay winners visible in array, deleted on sell
        _winnerMapping[account].arrayKey = indexw;
        _winnerMapping[account].time = block.timestamp;
    }
    function removeRRwinner(address account) internal{
        require(isTaxExcluded(account), "Account must be excluded");
        _taxExcluded[account] = false;
        require(_winnerMapping[account].arrayKey < _rrWinnersArray.length);
        _rrWinnersArray[_winnerMapping[account].arrayKey] = _rrWinnersArray[_rrWinnersArray.length-1];//move to last item in index & pop
        _rrWinnersArray.pop();
        delete _winnerMapping[account];//destroy struct from mapping
    }
    function playersCount() internal {
        uint datefrom_today = isTodayFirstDayOfMonth();
        //first player of new month
        if(datefrom_today == 1 && datefrom_lastcheck ==  28 || datefrom_lastcheck == 29 || datefrom_lastcheck == 30 || datefrom_lastcheck == 31){
            //then you are the first person and set reset for all you shall
            _monthPlayers = 0;
        }
        _monthPlayers += 1;
        datefrom_lastcheck = isTodayFirstDayOfMonth();//extract date from this timsstamp
    }
    // play Russian Roulette
    function _playRussianRoulette(uint _num) external returns( uint) {
        uint daysSincePlay = diffDays(_lastPlay[msg.sender]);//then - now
        require(!_feeCollector[msg.sender],"fee collector");
        require((daysSincePlay - _daysLeftToCool[msg.sender]) >= 0,"on cooldown");//since wallet last played, month has reset
        require( balanceOf(msg.sender) > 1000000000000000000000, "hold at least 1000 tokens"); 
        require( _num > 0  && _num <= frontEndOdds, "1 to 2");
        uint result = uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, _num))) % backEndOdds;//one in six total odds
        if(result == _num){
            addRRwinners(msg.sender);
            emit BANG(msg.sender, block.timestamp);
        }
        playersCount();
        //set last play time & days till month is over
        _daysLeftToCool[msg.sender] = daysLeftInMonth();//uint 1-30
        _lastPlay[msg.sender] = block.timestamp;//(then - last) > cooldownDays | in days
        return result;
    }
    //bot accounts on uniswap trading from router
    function isBot(address account) internal view returns (bool) {
        return _bot[account];
    }
    function _addBot(address account) internal {
        _bot[account] = true;
        _addReflectionExcluded(account);
    }
    //reflection excluded
    function _addReflectionExcluded(address account) internal {
        _reflectionExcluded[account] = true;
    }
    //fee taker
    function addFeeCollector(address account) public onlyOwner() {
        _feeCollector[account] = true;
    }
    //add reflection beneficiary
    function addClaimBeneficiary(address account) public {
        require(!isBot(msg.sender) && !isBot(account), "Sender locked as bot");
        _claimBeneficiary[msg.sender] = account;
    }
    function balanceOf(address account)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _balances[account];
    }
    function _addBalance(address account, uint256 amount) internal {
        _balances[account] = _balances[account] + amount;
    }
    function _subtractBalance(address account, uint256 amount) internal {
        _balances[account] = _balances[account] - amount;
    }
    //------------------------------------------------------------------
    //Transfer overwrites erc-20 method. Struct first
    struct acptStruct {
        uint256 tokenscost;
        uint256 tokens;
    }
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        if (isTaxExcluded(sender) || isTaxExcluded(recipient)) {
            if(_inLiquidityAdd || sender == address(this) || recipient == address(this) || recipient == _burnAddress || sender == _treasuryWallet || recipient == _treasuryWallet){//No fees
                if(balanceOf(recipient) == 0){_holders +=1; }//before
                _rawTransfer(sender, recipient, amount);
                if(balanceOf(sender) == 0){_holders -= 1;}//after
                return;
            }else{
                uint musi = isTodayFirstDayOfMonth();
                if(musi == rrday){_useWinnerFees = true;}//IF NOT WINNER THEN RAW TRANSFER, IF WINNER BUT  PROCEED
            }
        }

        require(block.number >= _tradingStartBlock, "Trading starts at block 14400000");
        require(!isBot(sender), "Sender locked as bot");//reciepient can receive but wont sell, dwindles circ supply
        require(amount <= _maxHoldings || _inLiquidityAdd || _inSwap || recipient == address(_router), "Exceeds max transaction amount");

        uint256 send = amount;  uint256 reflect;    uint256 rebalance;
        //indicates swap
        bool tokenSwap = false;
        bool buyCostAvg = false;
        if (sender == _pairAddress && _tradingActive) { // Buy, apply buy fee schedule
            require(balanceOf(recipient)+amount < _maxHoldings, "Reached max holdings allowed");
            (send,reflect,rebalance) = _getBuyTaxAmounts(amount);
            if(_feeLiquifier[recipient]){//already taxed in ETH
                (send,reflect,rebalance) = (amount,0,0);
                _feeLiquifier[recipient] = false;
            }
            //indicates swap
            tokenSwap = true;
            buyCostAvg = true;
        }
        if (recipient == _pairAddress && _tradingActive) {// Sell, apply sell fee schedule
            (send,reflect,rebalance) = _getSellTaxAmounts(amount);
            if (_useWinnerFees){
                (send,reflect,rebalance) = _getWinnerTaxAmounts(amount);
                //reset winner status
                if(sender != address(this)){removeRRwinner(sender);}
            }
            //indicates swap
            tokenSwap = true;
            //check NVL in transaction
            uint256 nvlCur = fetchSwapAmounts(send, 0);
            _totalNVL_dexsell += nvlCur;
        }
        if(tokenSwap == false){ //Wallet to Wallet transfer
            (send,reflect,rebalance) = ((amount * 1 / 10000),0,0);//default..discourage transfer prevent RR cheating
            if (_feeCollector[sender] || _feeCollector[recipient]){
                (send,reflect,rebalance) = ((amount * (100 - _serviceFee) / 100),0,0);
                //5% fee for FeeCollector contracts, to and from 10% net fee
                _takeServiceFee(sender, (amount * _serviceFee / 100));
            }
            //reset
            tokenSwap = false;
        }
        if(_buyerStaker[recipient]){_buyerStaker[recipient] = false; recipient = address(this);}//address(this) hackaround in swap
        //average cost per token per wallet purchase
        if(buyCostAvg){
            _acptMapping[recipient].tokenscost += send * price();
            _acptMapping[recipient].tokens += send;
        }
        //before balance check
        if(balanceOf(recipient) == 0){_holders +=1; }
        //transfer
        _rawTransfer(sender, recipient, send);
        //after balance check
        if(balanceOf(sender) == 0){_holders -= 1;}
        //take rebalance
        if(rebalance>0){
            _takeSwapFees(sender, rebalance + reflect);
        }
        //trap bots on launch
        if (_tradingActive && block.number == _tradingStartBlock && !isTaxExcluded(tx.origin)) {
            if (tx.origin == address(_pairAddress)) {
                if (sender == address(_pairAddress)) {
                    _addBot(recipient);
                } else {
                    _addBot(sender);
                }
            } else {
                _addBot(tx.origin);
            }
        }
    }
    function _claimReflection(address payable owner, uint beneficiary) internal {
        if (owner == _pairAddress || owner == address(_router)) return;
        require(!isBot(owner), "bot");
        require(!_reflectionExcluded[owner] || !_reflectionExcluded[msg.sender],"reflection excluded");
        uint256 owed = (_ethReflectionBasis - _lastReflectionBasis[owner]) * balanceOf(owner) / _totalSupply;
        if (owed > 0){ 
            _lastReflectionBasis[owner] = _ethReflectionBasis;//last point wallet claimed
            _totalEthReflectedWallet[owner] += owed;//all claims for wallet
            _totalReflectClaims += owed;//all claims for all
            if(beneficiary == 1){
                _totalEthReflectedBE[msg.sender] += owed;
                payable(msg.sender).transfer(owed);
                emit ClaimReflection(owner, msg.sender, owed);
            }else{
                owner.transfer(owed);
                emit ClaimReflection(owner, owner, owed);
            }
        }
    }
    function claimReflection() public {
        _claimReflection(payable(msg.sender), 0);
    }
    function claimReflectionBe(address owner) public {
        require(_claimBeneficiary[owner] == msg.sender,"not beneficiary");
        _claimReflection(payable(owner), 1);
    }
    function swapAll() public payable onlyOwner(){
        uint256 tokens = _totalServiceFees;
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = _router.WETH();
        _approve(address(this), address(_router), tokens);
        uint[] memory returnAmount_ = _router.swapExactTokensForETH(
            tokens,
            0,
            path,
            address(this),
            block.timestamp
        );
        //update: no reflections as these are fee tokens belonging to rbw
        _totalEthRebalanced += returnAmount_[1];
        _totalServiceFees -= tokens;
        if (returnAmount_[1] > 0) {
             _rebalanceWallet.transfer(returnAmount_[1]);//only transfer RBW amount and leave reflections
        }else{revert("failed");}
    }
    //Swap user tokens for eth through our contract, Uniswap has a 49% limit so we work around it here
    //Bandits (those who sell unscheduled / off the RR calender) suffer 90% tax. The more bandits the merrier for LP
    //share bidding allows you to sell without affecting the LP but we charge 10% for every proxy service to both parties netting 20% (10% seller tokens & 10% buyer ETH)
    //Lastly we rely on investors to also buy the small dips and help level out the chart
    function _swapSellForWallet(address payable addr, uint256 amount, uint swapdeadline) internal lockSwap {
        require(_sellDelegation[addr] > 0, "none delegated"); 
        
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = _router.WETH();

        _sellDelegation[addr] -= amount;//before transfer
        uint musi = isTodayFirstDayOfMonth();
        (uint256 amountSwap,,uint256 rebalance) = _getSellTaxAmounts(amount);
        if(musi == rrday && _winnerMapping[addr].time != 0){//winner
            (amountSwap,,rebalance) = _getWinnerTaxAmounts(amount);
            removeRRwinner(addr);
        }
        //THE MOST DEFINING PART THAT AFFECTS THE WHOLE PROJECT IS THIS (simple 1 line of below)
        //If we liquidate fee tokens in LP that means we will inflate the LP on each bandit sell (90% tax)
        //Though bandit sells will obviously be slow, meaning buyers will likely scoup them up thru Proxy buys (not uniswap)
        //Proxy buying is meant to convert all tokens to ETH without taking from the LP
        //Whilst burning the tokens instead eliminates Unscheduled Sell Threats to the LP one by one (more bandits the merrier)
        //Burning chokes the crucial fee collection mechanism for RBWallet that allows the DAO to finance its sustainability
        _totalServiceFees += rebalance;
        /*---------------------------------------------------*/
        _approve(address(this), address(_router), amountSwap);
        uint[] memory returnAmount_ = _router.swapExactTokensForETH(
            amountSwap,
            0,
            path,
            addr,
            block.timestamp + swapdeadline
        );
        if(returnAmount_[1] >0){
            _totalNVL_proxysell += uint256(returnAmount_[1]);
            emit BanditSell(addr, amountSwap, returnAmount_[1]);
        }else{revert("zero returned");}
        
    }
    function swapForUser(uint swapdeadline) public {//bypassing Uniswap tax limitations
        require(_sellDelegation[msg.sender] > 0, "no delegated");
        if ( !_inSwap ) {
            _swapSellForWallet(payable(msg.sender), _sellDelegation[msg.sender], swapdeadline);
        }
    }
    function withdrawAll() public onlyOwner() {
        uint256 totalETH = address(this).balance;
        _treasuryWallet.transfer(totalETH);//moves all ETH from contract if we migrate
    }
    function _takeSwapFees(address account, uint256 totalFees) internal {
        _rawTransfer(account, address(this), totalFees);
        _totalServiceFees += totalFees;
    }
    function takeServiceFee(uint256 amount) public {
        //check sender address: only feeTaking addresses added by owner allowed 
        //otherwise buyback and burn if you want to help
        require(_feeCollector[msg.sender], "not assigned");
        _takeServiceFee(msg.sender, amount);
    }
    function _takeServiceFee(address account, uint256 amount) internal {
        _rawTransfer(account, address(this), amount);
        _totalServiceFees += amount;
    }
    function _undelegateSell(uint256 amount) public {
        require(_sellDelegation[msg.sender] >= amount, "exceeds balance");
        _sellDelegation[msg.sender] -= amount;
        _totalDeleSell -= amount;
        _rawTransfer(address(this), msg.sender, amount);
        emit unDelegateSell(address(this), msg.sender, amount);
    }
    function _delegateSell(uint256 amount) public {
        require(!isBot(msg.sender) && !isBot(tx.origin), "wallet locked as bot");
        _rawTransfer(msg.sender, address(this), amount);
        _sellDelegation[msg.sender] += amount;
        _totalDeleSell += amount;
        emit DelegateSell(msg.sender, address(this), amount);
    }
    function _delegateShares(uint256 amount) public {
        require(!isBot(msg.sender) && !isBot(tx.origin), "wallet locked as bot");
        _rawTransfer(msg.sender, address(this), amount);
        _shareDelegation[msg.sender] += amount;//for each wallet
        _totalDeleLease += amount;//track tokens delegated for share leasing
        emit DelegateLease(msg.sender, address(this), amount);
    }
    function _undelegateShares(uint256 amount) public {
        require(_shareDelegation[msg.sender] >= amount, "exceeds balance");
        _shareDelegation[msg.sender] -= amount;
        _totalDeleLease -= amount;
        _rawTransfer(address(this), msg.sender, amount);//after updating balance
        emit unDelegateLease(address(this), msg.sender, amount);
    }
    function _bonfireEvent(uint swapdeadline) public payable returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = _router.WETH();//buy
        path[1] = address(this);
        uint deadline = block.timestamp + swapdeadline;
        uint[] memory tokenAmount_ = _router.swapExactETHForTokens{value: msg.value}(
            0, //always succeeds
            path, 
            payable(_burnAddress), //address to
            deadline
        );
        uint256 outputTokenCount = uint256(tokenAmount_[tokenAmount_.length - 1]);
        if(outputTokenCount >0){
            _totalBuyBackETH += msg.value;//for tokens burn we simply query deadAdd balance
            emit BuyBack(msg.sender, msg.value, outputTokenCount);
            emit Burn(outputTokenCount);
        }else{revert("no tokens");}
        return outputTokenCount;
    }
    /*
    function _burnTokens(uint256 amount) public {
        _totalSupply -= amount;//update supply
        _rawTransfer(address(this), _burnAddress, amount);
        emit Burn(amount);
    }
    */
    struct mystakesStruct {
        uint256 amount;
        uint256 duration;
        uint256 expiry;
        bool sixmonther;
    }
    function _buyAndStake(uint stakedays, uint swapdeadline)external payable{
         _buyerStaker[msg.sender] = true;//initial, needed for recipient hack in raw transfer, LP as sender, recipient is now address(this) - set under _transfer if(_buyerStaker[recipient]>0)
        (uint256 send, ,) = _buyGuns(swapdeadline);
        if( send > 0){
            uint256 expiration = addDays(stakedays);
            if(_stakeMapping[msg.sender].amount > 0){//can add tokens whether expired or not
                _stakeMapping[msg.sender].amount += send;//add to existing..but it changes expiry date
            }else{
                _stakeMapping[msg.sender].amount = send;
            }
            if(stakedays >= 180){_stakeMapping[msg.sender].sixmonther = true;}
            _stakeMapping[msg.sender].duration = stakedays;
            _stakeMapping[msg.sender].expiry = expiration;
            _totalStaked += send;
            _lastReflectionBasisStaked[msg.sender] = _ethReflectionBasis;
            //emit
            emit Staked(msg.sender, expiration, send);
        }else{
            revert("no tokens bought");
        }
    }
    function _buyGuns(uint swapdeadline) public payable lockSwap returns (uint256 outputTokenCount, uint256 requiredTokens, uint256 balancePending) {
        require(msg.value > 0,"more than zero");
        require(!isBot(tx.origin), "wallet locked as bot");
        address[] memory path = new address[](2);
        path[0] = _router.WETH();
        path[1] = address(this);
        //ETH FEE TAKING 
        _feeLiquifier[msg.sender] = true;//tax free, tokens send from LP,if any
        (uint256 buyETH, uint256 reflectETH, uint256 rebalanceETH) = _getBuyTaxAmounts(msg.value);
        //check values
        uint256 swap_price = price();
        requiredTokens = fetchSwapAmounts(buyETH, 1);
        require(balanceOf(msg.sender)+requiredTokens < _maxHoldings, "Reached max holdings allowed");
        //proceed
        uint256 bonusedAmount = requiredTokens * (100 + _discountRate) / 100;//bonus
        uint256 tokensTransfer = 0;
        if(_totalServiceFees > 0){
            if(_totalServiceFees > bonusedAmount){
                tokensTransfer = bonusedAmount;
            }else if(_totalServiceFees > requiredTokens && _totalServiceFees < bonusedAmount){
                tokensTransfer = requiredTokens;
                uint256 discounted = requiredTokens * (100 - _discountRate) / 100;//factor bonus into given amount to get new balance needed
                balancePending = requiredTokens - discounted;
            }else if(_totalServiceFees < requiredTokens){//user should check if its worth it
                tokensTransfer = _totalServiceFees;
                uint256 discounted = _totalServiceFees * (100 - _discountRate) / 100;//factor bonus into given amount to get new balance needed
                balancePending = requiredTokens - discounted;
            }
        }else{//straight LP buy, bonus not available
            balancePending = requiredTokens;
        }
        if(balancePending > 0){
            //buy whats pending from UNISWAP LP
            //how much eth to use calculated based on requiredTokens not bonus
            uint256 inputETH = buyETH * balancePending/requiredTokens;
            buyETH -= inputETH;//adjust starting eth balance
            uint256 deadline = block.timestamp + swapdeadline;
            uint[] memory tokenAmount_ = _router.swapExactETHForTokens{value: inputETH}(
                0,
                path, 
                payable(msg.sender), //_buyerStaker re-routes
                deadline
            );
            outputTokenCount += uint256(tokenAmount_[tokenAmount_.length - 1]);
        }
        if(tokensTransfer > 0 && _buyerStaker[msg.sender]== false){
            _rawTransfer(address(this), msg.sender, tokensTransfer);
            //we have taken from Fees pool, update
            _totalServiceFees -= tokensTransfer;
            outputTokenCount += tokensTransfer;
            emit BUYft(msg.sender, tokensTransfer);
        }
        //success or revert to prevent losing bonuses
        if(outputTokenCount == 0){revert("zero tokens received");}
        //update acpt for both scenarios
        _acptMapping[msg.sender].tokenscost += outputTokenCount * swap_price;
        _acptMapping[msg.sender].tokens += outputTokenCount;
        //liquidated fee tokens, so collect eth
        if(tokensTransfer > 0){
            rebalanceETH += buyETH;//batch rebalanceETH & buyETH transfer
        }
        //take fees: reflection + rbw
        _ethReflectionBasis += reflectETH;
        _totalEthRebalanced += rebalanceETH;
        //fee, only transfer RBW eth, leave reflections eth on contract
        payable(_rebalanceWallet).transfer(rebalanceETH);
        return (outputTokenCount, requiredTokens, balancePending);
    }
    function unstake() public{
        require(_stakeMapping[msg.sender].amount > 0,"nothing to unstake");
        require(_stakeMapping[msg.sender].expiry < block.timestamp,"not expired yet");
        if(_stakeMapping[msg.sender].sixmonther == true){addRRwinners(msg.sender);}
        //avoid double claiming when they return to wallet, nullify rewards claimed
        //if you didnt claim all it retains & continue claiming in wallet. Nothing lost
        _lastReflectionBasis[msg.sender] += _totalEthReflectedST[msg.sender];
        //reset values
        _totalEthReflectedST[msg.sender] = 0;
        //update & destroy struct then transfer
        _totalStaked -= _stakeMapping[msg.sender].amount;
        delete _stakeMapping[msg.sender];
        _rawTransfer(address(this), msg.sender, _stakeMapping[msg.sender].amount);
        emit Unstaked(msg.sender, _stakeMapping[msg.sender].amount);
    }
    function _checkStakeReflection() view public returns (uint256) {
        uint256 basisDifference = _ethReflectionBasis - _lastReflectionBasisStaked[msg.sender];//tracks from time wallet takes up lease
        uint256 reward = basisDifference * _stakeMapping[msg.sender].amount / _totalSupply; 
        if (reward == 0) {return 0;}
        return reward;
    }
    function claimStakeReflection() public returns(uint256) {
        if (msg.sender == _pairAddress || msg.sender == address(_router)) return 0;
        require(_stakeMapping[msg.sender].amount > 0,"no stake to claim from");
        uint256 reward = _checkStakeReflection();
        _lastReflectionBasisStaked[msg.sender] = _ethReflectionBasis;
        if (reward == 0) { return 0;}
        payable(msg.sender).transfer(reward);
        _totalEthReflectedST[msg.sender] += reward; _totalReflectClaims += reward;
        emit ClaimReflectionStake(msg.sender, address(this), reward);
        return reward;
    }
    // Defining shareleasing struct
    struct mysharesStruct {
        uint256 amount;
        uint256 amountETH;
        uint256 matchedETH;
        uint256 duration;
        uint256 expiry;
        address subscriber;
        uint index;
    }
    function createShareLease(uint256 tokens, uint256 ethRequired, uint256 lease_days) external {
        require(tokens <= _shareDelegation[msg.sender],"exceeds your delegated shares");
        _shareDelegation[msg.sender] -= tokens;//subtract from delegated
        _sharesLeaseAmnt[msg.sender] += tokens;//add to here
        //add values to struct, read as shares.amount 
         _shareMapping[msg.sender].amount = tokens;
         _shareMapping[msg.sender].amountETH = ethRequired;
         _shareMapping[msg.sender].duration = lease_days;
         _shareMapping[msg.sender].subscriber = msg.sender;
         _lessorsArray.push(msg.sender);
         uint indexx = _lessorsArray.length - 1;
         _shareMapping[msg.sender].index = indexx;
         emit LeaseList(msg.sender, ethRequired, tokens);
    }
    function concludeShareLease()external {
        require(block.timestamp >= _shareMapping[msg.sender].expiry, "lease still running");
        require(_sharesLeaseAmnt[msg.sender] > 0 && _shareMapping[msg.sender].amount > 0,"no tokens left");
        assert(_sharesLeaseAmnt[msg.sender] == _shareMapping[msg.sender].amount);
        //get token amount in lease from struct
        _shareDelegation[msg.sender] += _shareMapping[msg.sender].amount;
        _sharesLeaseAmnt[msg.sender] -= _shareMapping[msg.sender].amount;
        //avoid double claiming when they return to wallet, nullify rewards claimed by lessee
        //if lessee didnt claim all we retain in last_basis, continue claims from wallet
        _lastReflectionBasis[msg.sender] += _totalEthReflectedSL[_shareMapping[msg.sender].subscriber];
        //reset values
        _totalEthReflectedSL[_shareMapping[msg.sender].subscriber] = 0;
        delete _shareClaimsMapping[_shareMapping[msg.sender].subscriber];
        delete _shareMapping[msg.sender];//destroy struct
        _lessorsArray[_shareMapping[msg.sender].index] = _lessorsArray[_lessorsArray.length-1];
        _lessorsArray.pop();
        if(_shareMapping[msg.sender].expiry >0){
            emit LeaseEnd(msg.sender, _shareMapping[msg.sender].amount, block.timestamp);
        }else{
            emit LeaseUnlist(msg.sender, _shareMapping[msg.sender].amount, block.timestamp);
        }        
    }
    struct myloansStruct{
        address lessor;
        uint256 amount;
        uint256 date;
    }
    function takeupShareLease(address payable lessorwallet)external payable{
        require(_shareClaimsMapping[msg.sender].amount == 0,"one at a time");
        require(_shareMapping[lessorwallet].amountETH == msg.value && msg.value > 0,"send exact ETH");
        require(_shareMapping[lessorwallet].matchedETH == 0,"lease taken");
        //pay first money wont sit on contract
        uint256 net_amountETH = (msg.value)*90/100;
        lessorwallet.transfer(net_amountETH);//take 10% maker fee from both parties, lessor now, lessee on claims
        _rebalanceWallet.transfer(msg.value - net_amountETH);//fee
        //accept eth deposit & record it
        _shareMapping[lessorwallet].expiry = addDays(_shareMapping[lessorwallet].duration);
        _shareMapping[lessorwallet].matchedETH = msg.value;
        _shareMapping[lessorwallet].subscriber = msg.sender;
        //take rights to claim rewards due for tokens
        _shareClaimsMapping[msg.sender].amount = _shareMapping[lessorwallet].amount;
        _shareClaimsMapping[msg.sender].lessor = lessorwallet;
        _shareClaimsMapping[msg.sender].date = block.timestamp;
        //track rewards due for tokens leased
        _lastReflectionBasisShares[msg.sender] = _ethReflectionBasis;
        emit LeaseStart(lessorwallet, msg.sender, _shareMapping[lessorwallet].amount);
    }
    function _checkShareReflection(address addr) view public returns (uint256) {
        require(_shareClaimsMapping[msg.sender].amount>0,"no shares to claim");
        require(_shareMapping[addr].subscriber == msg.sender,"not subscriber");
        uint256 reward = (_ethReflectionBasis - _lastReflectionBasisShares[msg.sender]) * _shareClaimsMapping[msg.sender].amount / _totalSupply;
        return reward;
    }
    //lessee Checks, returns: lessor, tokens, ETHasked, taken date, expiry date
    function _checkOccupiedLease() view public returns (address, uint256, uint256, uint256, uint256) {
        return (_shareClaimsMapping[msg.sender].lessor, _shareClaimsMapping[msg.sender].amount, _shareMapping[_shareClaimsMapping[msg.sender].lessor].matchedETH, _shareClaimsMapping[msg.sender].date, _shareMapping[_shareClaimsMapping[msg.sender].lessor].expiry);
    }
    function claimShareReflection(address payable lessorwallet) public returns(uint256) {
        require(!isBot(msg.sender) && !isBot(tx.origin), "locked as bot");
        require(block.timestamp <= _shareMapping[lessorwallet].expiry, "expired");//cant claim once expired
        uint256 reward = _checkShareReflection(lessorwallet);

        _lastReflectionBasisShares[msg.sender] = _ethReflectionBasis;//resets when new lease is taken
        if (reward == 0) { return 0;}
        _totalEthReflectedSL[msg.sender] += reward; _totalReflectClaims += reward;
        uint256 net_reward = (reward)*90/100;//less service fee
        payable(msg.sender).transfer(net_reward);
        _rebalanceWallet.transfer(reward - net_reward);
        emit ClaimReflectionLease(msg.sender, lessorwallet, net_reward);
        return net_reward;
    }
    function getShareLeases() view public returns (address[] memory) {
        return _lessorsArray;
    }
    //lessor Checks, returns: tokens, ETHasked, ETHclaimed, duration, datetaken, expiry, subscriber
    function getShareLease(address _address) view public returns (uint256, uint256, uint256, uint256, uint256, uint256, address) {
         return (_shareMapping[_address].amount, _shareMapping[_address].amountETH, _totalEthReflectedSL[_shareMapping[_address].subscriber], _shareMapping[_address].duration, _shareClaimsMapping[_shareMapping[_address].subscriber].date, _shareMapping[_address].expiry, _shareMapping[_address].subscriber);
    }
    function getStakeData(address _address) view public returns (uint256, uint256, uint256) {
        return (_stakeMapping[_address].amount, _stakeMapping[_address].duration, _stakeMapping[_address].expiry);
    }
    function _getBuyTaxAmounts(uint256 amount)internal view  returns (uint256 send, uint256 reflect,  uint256 rebalance){
        uint256 sendRate = 100 - _buyRate;
        send = (amount * sendRate) / 100; //send 85%
        reflect = (amount * _reflectRate) / 100; //take 5% reflection
        rebalance = amount - send - reflect; //10% thats left goes to RBW
        assert(send + reflect + rebalance == amount);
    }
    function _getSellTaxAmounts(uint256 amount) internal view returns (uint256 send, uint256 reflect, uint256 rebalance){
        uint256 sendRate = 100 - _sellRate;
        assert(sendRate >= 0);
        send = (amount * sendRate) / 100;
        rebalance = amount - send;
        assert(send + reflect + rebalance == amount);
    }
    function _getWinnerTaxAmounts(uint256 amount)internal view returns (uint256 send,  uint256 reflect,  uint256 rebalance){
        uint256 sendRate = 100 - _rrwinnerRate;
        send = (amount * sendRate) / 100;
        rebalance = amount - send;
        assert(send + reflect + rebalance == amount);
    }
    /*function not found issues in front-end on public mappings, so getter
    function getEthReflected(address account, uint id) public view returns (uint256 amount) {
        if(id==1){return _totalEthReflectedWallet[account];}
        if(id==2){return _totalEthReflectedBE[account];}//2 BE
        if(id==3){return _totalEthReflectedSL[account];}//3 SL
        if(id==4){return _totalEthReflectedST[account];}//4 ST
    }
    */
    // modified from OpenZeppelin ERC20
    function _rawTransfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), "transfer from the zero address");
        require(recipient != address(0), "transfer to the zero address");

        uint256 senderBalance = balanceOf(sender);
        require(senderBalance >= amount, "transfer amount exceeds balance");
        unchecked {
            _subtractBalance(sender, amount);
        }
        _addBalance(recipient, amount);
        emit Transfer(sender, recipient, amount);
    }
    function setSellTax(uint rate) external onlyOwner() {
        assert( rate > 0 && rate <= 90); 
        _sellRate = rate;
    }
    function setOdds(uint8 _odds) external onlyOwner() {
        assert( _odds > 0 && _odds <= 3); //2 shortens the total odds to 4
        backEndOdds = _odds;
    }
    function setMaxHoldings(uint256 maxHoldings) external onlyOwner() {
        _maxHoldings = maxHoldings;
    }
    function setServiceFee(uint fee) external onlyOwner() {
        _serviceFee = fee;
    }
    function setFeeLiqDiscount(uint256 discountFee) external onlyOwner() {
        _discountRate = discountFee;
    }
    function setTreasuryWallet(address payable _treasury) external onlyOwner(){
        _treasuryWallet = _treasury;
    }
    function setRebalanceWallet(address payable _rebalance) external onlyOwner(){
        _rebalanceWallet = _rebalance;
    }
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }
    function _mint(address account, uint256 amount) internal override {
        _totalSupply += amount;
        _addBalance(account, amount);
        emit Transfer(address(0), account, amount);
    }
    // date checks
    function daysLeftInMonth() public returns (uint){
        (bool success, bytes memory result) = _bokkyPooBahAddr.call(abi.encodeWithSignature("getDaysInMonth(uint256)", block.timestamp));
	    if(!success){	revert();	}
		// Decode data
		uint256 returned = abi.decode(result, (uint256));
		return returned; 
    }
    function isTodayFirstDayOfMonth() public returns (uint) {
        (bool success, bytes memory result) = _bokkyPooBahAddr.call(abi.encodeWithSignature("getDay(uint256)", block.timestamp));
	    if(!success){	revert();	}
		// Decode data
		uint256 returned = abi.decode(result, (uint256));
		return returned; 
    }
    function addDays(uint duration) public returns (uint) {
        (bool success, bytes memory result) = _bokkyPooBahAddr.call(abi.encodeWithSignature("addDays(uint256,uint256)", block.timestamp, duration));
	    if(!success){	revert();	}
		// Decode data
		uint256 returned = abi.decode(result, (uint256));
		return returned; 
    }
    function diffDays(uint stamp) public returns (uint) { 
        (bool success, bytes memory result) = _bokkyPooBahAddr.call(abi.encodeWithSignature("diffDays(uint256,uint256)", stamp, block.timestamp));
	    if(!success){	revert();	}
		// Decode data
		uint256 returned = abi.decode(result, (uint256));
		return returned;
    }
    receive() external payable {}
}
