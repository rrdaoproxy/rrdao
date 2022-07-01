// JavaScript Document
MyLibrary.Swap_state = "buy";
MyLibrary.tokenAamount = 0;
MyLibrary.tokenBamount = 0;
MyLibrary.ethBalance = 0;
MyLibrary.gunBalance = 0;
MyLibrary.delegatedBal = 0;
MyLibrary.sellRate = 0;
MyLibrary.buyRate = 0;
MyLibrary.claimsource = 1;//wallet source default
MyLibrary.SL_lessor = "0x00";


//CALLS
$(document).ready(async function(){
	var unlockState = await unlockedWallet();
	if (unlockState === true){
		//repeat, with async and promise so it dont overspill
		const setIntervalAsync = (fn, ms) => {
			fn().then(() => {
				setTimeout(() => setIntervalAsync(fn, ms), ms);
			});
		};
		setIntervalAsync(async () => {
			callPageTries();
			balances();
		}, 30000);
	}else{
		reqConnect();
	}
});

$(document).on('click', '#switch', function(e){
	
	if(MyLibrary.Swap_state == "buy"){
		//RUN READIBILITY - once a switch is done run swap check by imitating keydown
		if ($('#tokenAamount').val().length > 0){	keyDownA();}
		sellInfoState();//we're now going into sell state
	}else{
		//RUN READIBILITY - once a switch is done run swap check by imitating keydown
		if ($('#tokenBamount').val().length > 0){	keyDownB();}
		buyInfoState();//we're now going into buy state
	}
	shuffleAmounts();
});

function shuffleAmounts(){
	var tokenAAamount = $("#tokenAamount").val();//eth at top default is buy
	var tokenBBamount = $("#tokenBamount").val();//token at bottom 
	
	var aaaBalance = document.getElementById("aaa_balance").innerHTML;
	var bbbBalance = document.getElementById("bbb_balance").innerHTML;
	
	var aaa_name = document.getElementById("token_aaa").innerHTML;
	var bbb_name = document.getElementById("token_bbb").innerHTML;
	
	//swap values
	document.getElementById("tokenAamount").value = tokenBBamount;//input
	document.getElementById("tokenBamount").value = tokenAAamount;
		
	document.getElementById("aaa_balance").textContent = bbbBalance;//heading-value
	document.getElementById("bbb_balance").textContent = aaaBalance;
	
	document.getElementById("token_aaa").innerHTML = bbb_name;//heading-tokenname
	document.getElementById("token_bbb").innerHTML = aaa_name;
}
async function sellInfoState(){
	MyLibrary.Swap_state = "sell";
	$("#switch").attr('class', 'switchsell');
	$('.buyNstake').css('display', 'none');

	//run tax and limits checks and warnings on what will happen / be lost
	var sellTax = await tokenInst.methods._sellRate().call();
	var winnerTax = await tokenInst.methods._rrwinnerRate().call();
	var eligibility = await tokenInst.methods.isTaxExcluded(MyLibrary.wallet).call();
	var todaytheday = await tokenInst.methods.rrday().call();

	var price = await tokenETHprice();//parsed return
	var acpt = await averageCost();//parsed return
	var todaytheday = parseInt(todaytheday);

	var acpt_gainmark = 'markgreen';
	if(price > acpt){
		acpt_gainmark = 'markred';
	}
	if(todaytheday == 1){var Tax = winnerTax; var Tax_residue = 100 - sellTax;}else{ var Tax = sellTax; var Tax_residue = 100 - sellTax;}
	//OUTPUT
	var currentACPT = '<span class="status '+acpt_gainmark+'"><p>ACPT: '+acpt+'</p></span>';
	var message = '<span class="status"><p>Consider Share Leasing, DCFs or Russian Roulette instead.<br><br>Selling at high tax is costly: You leave <span class="markred TaxInfo">'+Tax_residue+'%</span> of your Eth in the LP, lose voting rights, lose future rewards, etc..</p></span>';
	
	if(eligibility == true){
		var date = getFirstDayOfNextMonth();
		var winner = '<span class="status markgreen"><p><b>Russian Roulette Winner!!</b></p></span>';
		var winnerText = '<span class="status"><p>On '+date+', your sell tax is <b>'+winnerTax+'%</b> for <b>1 Sell Transaction</b> only</p></span>';
		var message = '<span class="status"><p>Consider Share Leasing or DCFs. By selling you leave <span class="markred TaxInfo">'+Tax_residue+'%</span> of your Eth in the LP, lose voting rights, lose future rewards, etc..</p></span>';
		var currentTax = '<span class="status markred"><p><b>Current Tax:</b> '+Tax+'%</p></span>';
		$('#swapInfo_body').empty().prepend(winner+winnerText+currentTax+currentACPT+message);
	}else{
		var currentTax = '<span class="status markred"><p><b>Current Tax:</b> '+Tax+'% incl</p></span>';
		$('#swapInfo').animate({height: "auto"}, 1000, "swing", function(){});
		$('#swapInfo_body').empty().prepend(currentACPT+message);
	}
}
async function buyInfoState(){
	MyLibrary.Swap_state = "buy";
	$("#switch").attr('class', 'switchbuy');
	$('.buyNstake').css('display', 'block');

	//run tax and limits checks and congratulations on what will be gained
	var buyTax = MyLibrary.buyRate = await tokenInst.methods._buyRate().call();
	var maxHoldings = await tokenInst.methods._maxHoldings().call();
	var maxHoldings = (maxHoldings / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	var serviceTokens = await tokenInst.methods._totalServiceFees().call();
	var totalServiceFees = (serviceTokens / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	
	var price = await tokenETHprice();//parsed return
	var acpt = await averageCost();//parsed return
	
	var acpt_gainmark = 'markgreen';
	if(price > acpt){
		acpt_gainmark = 'markred';
	}
	
	//OUTPUT
	var bonusInfor = '';
	if(totalServiceFees > 0){
		var bonusInfor = '<div id="bonusSitu" class="status markgreen"><span><b>Fee Pool Size:</b> '+totalServiceFees+'</span></div>';
		$('#shareLSitu').hide();
	}
	var maxHoldings = '<span class="status"><p><b>Max Holdings:</b> '+maxHoldings+' GUN</p></span>';
	var currentACPT = '<span class="status '+acpt_gainmark+'"><p><b>ACPT:</b> '+acpt+'</p></span>';
	var message = '<span id="shareLSitu" class="status"><p>Try Share Leasing your tokens and get more out of them.</p><p id="buynstakeSuggestion">Buy and stake for 6 months to automatically win Russian Roulettes <span class="markgreen TaxInfo">10%</span> sell tax.</p></span>';
	var currentTax = '<span class="status markgreen"><p><b>Buy Tax:</b> '+buyTax+'% incl</p></span>';
	$('#swapInfo').animate({height: "auto"}, 1000, "swing", function(){});
	$('#swapInfo_body').empty().prepend(currentTax+bonusInfor+message+maxHoldings+currentACPT);
}
async function averageCost(){
	try{
		var acpt = await tokenInst.methods.acpt(MyLibrary.wallet).call();
		var acpt = web3.utils.fromWei(acpt, "ether");
		var acpt = Number(acpt).toFixed(12); 
		return acpt;	
	}catch (e) {
		console.log(e);
		return 0;
	}
}
async function tokenETHprice(){
	try {
		var price = await tokenInst.methods.price().call();
		var pricein_eth = fromWeiToFixed10(price);
		return pricein_eth;
	}catch{
		return 0;
	}
}
async function balances(){	
	if(!unlockedWallet()){reqConnect();return false;}else{//force request
		//if we disconnected, freeze data updates
		if (MyLibrary.disconnected === 0) {
			var balance = await web3.eth.getBalance(MyLibrary.wallet);
			var displayEth = MyLibrary.ethBalance = fromWeiToFixed10(balance);
			
			var gunBalance = await tokenInst.methods.balanceOf(MyLibrary.wallet).call();
			var displayGun = MyLibrary.gunBalance = (gunBalance / Math.pow(10, MyLibrary.decimals)).toFixed(2);
			//call function to place balances
			placeBalanaces(displayEth, displayGun);
		}else{//give zero balances
			console.log("atm waiting for wallet permissions...");
		}
	}
}
function placeBalanaces(displayEth, displayGun){
	if(MyLibrary.Swap_state == "buy"){
		//set eth balances to tokenAamount
		document.getElementById("aaa_balance").innerHTML = displayEth;
		document.getElementById("bbb_balance").innerHTML = displayGun;
	}else if(MyLibrary.Swap_state == "sell"){
		//set eth balances to tokenBamount
		document.getElementById("aaa_balance").innerHTML = displayGun;
		document.getElementById("bbb_balance").innerHTML = displayEth;
	}
}
function placeDelBalanaces(delegatedBal, walletBal){
	document.getElementById("d_balance").innerHTML = delegatedBal;
	document.getElementById("dw_balance").innerHTML = walletBal;
}
function getFirstDayOfNextMonth() {
	var rawdate = new Date();
	var date = new Date(rawdate.getFullYear(), rawdate.getMonth() + 1, 1);//first of next month
	var nextrrday = date.toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"});
	return nextrrday;
}
function stakeInformer(){
	var checkbox = document.getElementById("stake180"); 
	var rawdate = new Date();
	var unstakeDate = new Date(rawdate.setMonth(rawdate.getMonth() + 6)); //6months later
	var unstakeDate = unstakeDate.toLocaleDateString('en-us', { weekday:"short", year:"numeric", month:"short", day:"numeric"}); 

	if(checkbox.checked){
		var message = '<span class="buynstakeConfirm status">Tokens will be staked 180 days, you will win Russian Roulette upon unstaking: '+unstakeDate+'.</span>';
		$('#buynstakeSuggestion').css('display', 'none');
		$('#swapInfo_body').append(message);
	}else{
		if($('.buynstakeConfirm').length >0){
			$('.buynstakeConfirm').css('display', 'none');
		}
		$('#buynstakeSuggestion').css('display', 'inline-block');
	}	
}
function keyDownA(){
	
	if(window.equateTokensFromA){clearTimeout(equateTokensFromA);}
	if ($('#tokenAamount').val().length > 0){
		$('#metrics_loader').css('display', 'block');
		window.equateTokensFromA = setTimeout(async function() {
				if(MyLibrary.Swap_state == "buy"){
					var input_eth = $('#tokenAamount').val();
					if(input_eth == 0){return;}

					var floatedInput = Number(input_eth).toFixed(18);//input_eth is string acceptible for toWei, but not for toFixed..toWei takes max 18 decimals for max accuracy
					var input_eth = web3.utils.toWei(floatedInput, "ether");
					var outputTokens = await tokenInst.methods.fetchSwapAmounts(input_eth, 1).call();
					/* - taxes excluded from Calc coz of Math Precision Issues in KeyDownB (below) - reverse amount calc
					var taxedOutput = outputTokens * ((100 - MyLibrary.buyRate)/100);
					*/
					var tokens = (outputTokens / Math.pow(10, MyLibrary.decimals));
					document.getElementById("tokenBamount").value = parseInt(tokens);//tokens equiv
					checkBuyState(tokens);//pass output tokens to be checked for swap verdict

				}else if(MyLibrary.Swap_state == "sell"){
					var input_tokens = $('#tokenAamount').val();
					if(input_tokens == 0){return;}

					var input_tokens = web3.utils.toWei(input_tokens, "ether");
					var output_eth = await tokenInst.methods.fetchSwapAmounts(input_tokens, 0).call();
					/* - taxes excluded from Calc coz of Math Precision Issues in KeyDownB (below) - reverse amount calc
					var taxedOutput = output_eth * ((100 - MyLibrary.sellRate)/100);
					*/
					var output_eth = web3.utils.fromWei(output_eth, "ether");
					document.getElementById("tokenBamount").value = parseFloat(output_eth).toFixed(8);//eth equiv
					checkSellState();
				}
				$('#metrics_loader').css('display', 'none');
		}, 2500);
	}else{
		$('#tokenBamount').val('');
		if(MyLibrary.Swap_state == "buy"){checkBuyState(); buyInfoState();}else{checkSellState(); sellInfoState();}
		$('#metrics_loader').css('display', 'none');
		$('#swapmetrics').empty().append('');
	}
}
function keyDownB(){
	
	if(window.equateTokensFromB){clearTimeout(equateTokensFromB);}//so it searches when done typing
	if ($('#tokenBamount').val().length > 0){
		$('#metrics_loader').css('display', 'block');
		window.equateTokensFromB = setTimeout(async function() {
			if(MyLibrary.Swap_state == "buy"){//How much ETH we need to buy the exact amount of tokens entered in tokenBamount
				var input_gun = $('#tokenBamount').val();
				if(input_gun == 0){return;}

				var input_gun = String(input_gun);
				var amountIn = await getAmountsIn_TOK(input_gun);
				var eth_equiv = web3.utils.fromWei(amountIn, "ether");
				/* - taxes excluded from Calc coz of Math Precision Issues
				//remember: feeding this eth into Input_A, factors buy tax. restore the tax to get to original amount b4 tax::
				//if netAmount = 85% * gross; gross = netAmount/85*100; Or simply netAmount * 100/(100-taxRate)
				var taxApply = 100 / (100 - parseInt(MyLibrary.buyRate));
				var taxedOutput = eth_equiv * taxApply * 1.001451343; //Buy rate offset by: 1.001451343  //long is 1.0014513429287474298506582849324
				//***WITHOUT TAXES - final values are accurate, add taxes and we have a 0.145% offset coz of JS  Math precision issues */

				document.getElementById("tokenAamount").value = parseFloat(eth_equiv).toFixed(8);//eth equiv
				checkBuyState(input_gun);
			}else{//How many tokens we need to sell to get this exact amount of ETH
				var input_eth = $('#tokenBamount').val();
				if(input_eth == 0){return;}

				var fixedInput = Number(input_eth).toFixed(18);//input_eth is string acceptible for toWei, but not for toFixed..toWei takes max 18 decimals
				var input_eth = String(fixedInput);//pass as string
				var amountIn = await getAmountsIn_ETH(input_eth);
				var tokens_equiv = web3.utils.fromWei(amountIn, "ether");
				/* - taxes excluded from Calc coz of Math Precision Issues
				//remember: feeding this number of Tokens into Input_A it shows a sell taxed ETH output, restore the tax to get to original amount b4 tax:
				//if netAmount = 80% * gross; gross = netAmount/80*100; Or simply netAmount * 100/(100-taxRate)
				var taxApply = 100 / (100 - parseInt(MyLibrary.sellRate));
				var taxedOutput = tokens_equiv * taxApply * 1.0021; //1.0021 is sellRate offset to counter Math precision issues in JS
				//***WITHOUT TAXES - final values are accurate, add taxes and we have a 0.1% offset */
				
				document.getElementById("tokenAamount").value = parseFloat(tokens_equiv).toFixed(2);//tokens equiv
				checkSellState();
			}
			$('#metrics_loader').css('display', 'none');			
		}, 2500);
	}else{
		$('#tokenAamount').val('');
		if(MyLibrary.Swap_state == "sell"){checkSellState(); sellInfoState();}else{checkBuyState(); buyInfoState();}
		$('#metrics_loader').css('display', 'none');
		$('#swapmetrics').empty().append('');
		
	}
}

//Takes in ETH, tells you how many tokens need to be sold to receive that ETH
async function getAmountsIn_ETH(ethIN){//receives String() input
	const input_eth = web3.utils.toWei(ethIN, "ether");
	const inputAmount = web3.utils.toBN(input_eth);
	const path = [MyLibrary.tokenAddress, MyLibrary.wethAddress];
	const contractAbi = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"WETH","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"amountADesired","type":"uint256"},{"internalType":"uint256","name":"amountBDesired","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountTokenDesired","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountIn","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountOut","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsIn","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"reserveA","type":"uint256"},{"internalType":"uint256","name":"reserveB","type":"uint256"}],"name":"quote","outputs":[{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETHSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermit","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermitSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityWithPermit","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapETHForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETHSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];
	
	const routerContract = new web3.eth.Contract(contractAbi, MyLibrary.uniswapV2router); 
	let result = await routerContract.methods.getAmountsIn(inputAmount, path).call();
	return result[0];
}
//Takes in Tokens, tells you how much ETH needed to receive those
async function getAmountsIn_TOK(tokIN){//receives String() input
	const input_eth = web3.utils.toWei(tokIN, "ether");
	const inputAmount = web3.utils.toBN(input_eth);
	const path = [MyLibrary.wethAddress, MyLibrary.tokenAddress];
	const contractAbi = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"WETH","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"amountADesired","type":"uint256"},{"internalType":"uint256","name":"amountBDesired","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountTokenDesired","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountIn","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountOut","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsIn","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"reserveA","type":"uint256"},{"internalType":"uint256","name":"reserveB","type":"uint256"}],"name":"quote","outputs":[{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETHSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermit","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermitSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityWithPermit","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapETHForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETHSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];
	
	const routerContract = new web3.eth.Contract(contractAbi, MyLibrary.uniswapV2router); 
	let result = await routerContract.methods.getAmountsIn(inputAmount, path).call();
	return result[0];
}
//checks max holdings limit
//max transfer limit
//discount tokens available to you
//this is the only checkState that updates swap infor card, checkSellState doesnt have much infor that over spill to swap infor card
async function checkBuyState(outputAmount){
	var buyRate = MyLibrary.buyRate;
	var feeTokens = await tokenInst.methods._totalServiceFees().call();
	var feeTokens = (feeTokens / Math.pow(10, MyLibrary.decimals)).toFixed(2);

	var maxHoldings = await tokenInst.methods._maxHoldings().call();
	var maxHoldings = (maxHoldings / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	
	var discountRate = await tokenInst.methods._discountRate().call();
	var requiredTokens = outputAmount * (100-buyRate)/100;//actual required after Tax
	var bonusedAmount = requiredTokens * (100 + parseInt(discountRate)) / 100;//after given bonus

	var netExpected = parseInt(outputAmount);
	var feeTokens = parseInt(feeTokens);
	var maxHoldings = parseInt(maxHoldings);
	var bonusedAmount = parseInt(bonusedAmount);

	//implement smart contract liquidation mechanism: if theres something, take it all
	//balance needed to meet net swap output is then bought off Uniswap lp
	var tokensTransfer = 0;
	var balancePending = 0;
	var bonus = 0;
	if(feeTokens > 0){
		if(feeTokens > bonusedAmount){//contract can match full ask incl bonus
			var tokensTransfer = bonusedAmount;
			var bonus = bonusedAmount - requiredTokens;
		}else if(feeTokens > requiredTokens && feeTokens < bonusedAmount){
			var tokensTransfer = requiredTokens;//100 sorry you cant 102..now give 5% discount on tokens given
			var discounted = requiredTokens * (100-discountRate)/100;
			var bonus = tokensTransfer - discounted;
			var balancePending = requiredTokens - discounted;
		}else if(feeTokens < requiredTokens){//user should check if its worth it
			var tokensTransfer = feeTokens;
			var discounted = feeTokens * (100-discountRate)/100;
			var bonus = tokensTransfer - discounted;
			var balancePending = requiredTokens - discounted;
		}
	}else{//straight LP buy, bonus not available
		var balancePending = requiredTokens;
	}
	//Output:
	//balanePending - bought on Uniswap
	//tokenTransfer - tokens liquidated
	//bonus - bonus discounted from feeTokens
	if(feeTokens > 0){
		//bonus available sign & amount
		var metric = '<span class="metric markgreen">Transaction Bonus Due: '+bonus.toFixed(2)+'</span>';
		$('#swapmetrics').empty().append(metric);
		//buy swap infor card
		$('#shareLSitu').hide();
		var feeTotalCard = '<span><b>Fee Pool Size:</b> '+feeTokens.toFixed(2)+'</span><br><br>'; //total fees available
		var feeAcquiredCard = '<span><b>Bought via Fees:</b> '+tokensTransfer.toFixed(2)+' <br>>'+bonus.toFixed(2)+' bonus</span><br><br>';//bought from fees
		var dexAcquiredCard = '<span><b>Bought via LP:</b> '+balancePending.toFixed(2)+'</span><br>';
		$('#bonusSitu').empty().prepend(feeTotalCard+feeAcquiredCard+dexAcquiredCard);
	}else{
		$('#shareLSitu').show();
		var feeTotalCard = '<span><b>Fee Pool Size:</b> '+feeTokens.toFixed(2)+'</span>';
		$('#bonusSitu').empty().prepend(feeTotalCard);
	}
	//switching from sell state & delegate button
	if($('#delButton').is(':visible')) {
		$("#delButton" ).css('display', 'none');
		$("#swapButton" ).css('display', 'block');//show swap button
		if($("#swapButton" ).hasClass( "swapDiscouraged" )){
			$("#swapButton" ).removeClass('swapDiscouraged');
		}
	}
	//max holdings check
	var netOutcome = MyLibrary.gunBalance + netExpected;
	if(netOutcome >= maxHoldings){ 
		//max limit hit disable swap
		var metric = '<span class="metric markred"><b>Max Holdings:</b> '+maxHoldings.toFixed(2)+'</span>';
		$('#swapmetrics').empty().append(metric);
		$('#swapButton').attr('class', 'swapDisabled');
	}else if(netExpected < maxHoldings){
		$('#swapButton').removeClass('swapDisabled');
	}
}
async function checkSellState(){
	var input_gun = $('#tokenAamount').val();
	var sellTax = await tokenInst.methods._sellRate().call();
	var winnerTax = await tokenInst.methods._rrwinnerRate().call();
	
	var eligibility = await tokenInst.methods.isTaxExcluded(MyLibrary.wallet).call();
	var todaytheday = await tokenInst.methods.rrday().call();
	var todaytheday = parseInt(todaytheday);
	
	//prep elements
	if($("#swapButton" ).hasClass( "swapDiscouraged" )){
		$("#swapButton" ).removeClass('swapDiscouraged');
	}
	//output
	if(eligibility == true && todaytheday == 1){
		var metric = '<span class="metric markgreen">Active RR Winner Tax ('+winnerTax+'%)</span>';
		$('#swapmetrics').empty().append(metric);
	}else if(eligibility == true && todaytheday !== 1){
		var metric = '<span class="metric markred">Pending Winner Tax on RR Day(do not sell now)</span>';
		$('#swapmetrics').empty().append(metric);
	}
	if(eligibility == false){
		var metric = '<span class="metric markred"><b>WARNING - Bandit Tax Applies:</b> '+sellTax+'%</span>';
		$('#swapmetrics').empty().append(metric);
		$('#swapButton').attr('class', 'swapDiscouraged');
	}
	//check balances
	var delegatedBal = await tokenInst.methods._sellDelegation(MyLibrary.wallet).call();
	var delegatedAmnt = (delegatedBal / Math.pow(10, MyLibrary.decimals)).toFixed(2);

	//if insufficient, add delegate
	if(input_gun > delegatedAmnt){
		$("#swapButton" ).css('display', 'none');
		$("#delButton" ).css('display', 'block');
	}else{
		$("#swapButton" ).css('display', 'block');
		$("#delButton" ).css('display', 'none');
	}
}
async function pullDelegateBalances(){
	var xxx = await unlockedWallet();//only works as await as unlockedWallet is async function
	if(xxx ==false){
		reqConnect();
		var delegatedBal = '---unlock---';
		placeDelBalanaces(delegatedBal, delegatedBal);
	}else{//if we disconnected, freeze data updates
		if (MyLibrary.disconnected === 0) {
			var delegatedBal = await tokenInst.methods._sellDelegation(MyLibrary.wallet).call();
			var delegatedBal = (delegatedBal / Math.pow(10, MyLibrary.decimals)).toFixed(2);
			var walletBal = MyLibrary.gunBalance = await tokenInst.methods.balanceOf(MyLibrary.wallet).call();
			var walletBal = (walletBal / Math.pow(10, MyLibrary.decimals)).toFixed(2); 
			//call function to place balances
			placeDelBalanaces(delegatedBal, walletBal);
		}else{//give zero balances
			var delegatedBal = '---unlock---';
			placeDelBalanaces(delegatedBal, delegatedBal);
			console.log("atm waiting for wallet permissions...");
		}
	}
}
async function delegateTokens(inputAmnt, source){
	//Source 1 - main swap page, 2 - delegate tokens page
	var delegatedBal = await tokenInst.methods._sellDelegation(MyLibrary.wallet).call();
	var delegatedBal = (delegatedBal / Math.pow(10, MyLibrary.decimals)).toFixed(2);

	//Delegate the difference not whole amount in input, user wants to swap amount entered only
	if(source == 1 && delegatedBal < inputAmnt){//amount delagated versus amount user wants to sell, delegate Button shows up if less...
		var inputAmnt = inputAmnt - delegatedBal;//...but it only delegates difference
	}
	//to Big Number inputs
	var value = web3.utils.toWei(String(inputAmnt), 'ether'); 
	var delegateAmnt = web3.utils.toBN(value);
	//Send
	tokenInst.methods._delegateSell(delegateAmnt).send({from: MyLibrary.wallet})
	.on('receipt', function(receipt){//listen
        if(receipt.status == true){//1 also matches true
            console.log('Mined', receipt);console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash);
        }
        else{
            console.log('Transaction Failed Receipt status: '+receipt.status);
            swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
        }
	})
	.on('confirmation', (confirmationNumber, receipt) => {
		 var receipt = receipt;
		 var tx_hash = receipt.transactionHash;
		 if (confirmationNumber === 2) {
			 var delegatedTokens = (delegateAmnt / Math.pow(10, MyLibrary.decimals)).toFixed(2);
			 var outputCurrency = 'GUN';//or GUN - currency focus is outcome of Tx
			 var type = 'success';//or error
			 var wallet = '';
			 //async wont wait	//format: tx_hash, title, amounts{eth}, amountsT{tokens} - human readable amounts
			 popupSuccess(type,outputCurrency,tx_hash,'Delegated tokens for sell',0,delegatedTokens,wallet);
			 pullDelegateBalances();//async always
			 checkSellState();
		}
    })
	.on('error', (error) => {//listen
		var text = error.message;
		swal({
			title: "Cancelled.",
			type: "error",
			allowOutsideClick: true,
			text: text,
			html: false,
			confirmButtonColor: "#8e523c"
		});
	});
}
//Delegate Share Lease
async function delegateShareLease(inputAmnt){
	var tokens = web3.utils.toWei(String(inputAmnt), 'ether'); 
	var delegateAmnt = web3.utils.toBN(tokens);
	
	//Send
	tokenInst.methods._delegateShares(delegateAmnt).send({from: MyLibrary.wallet})
	.on('receipt', function(receipt){//listen
        if(receipt.status == true){//1 also matches true
            console.log('Mined', receipt);console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash);
        }
        else{
            console.log('Transaction Failed Receipt status: '+receipt.status);
            swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
        }
	})
	.on('confirmation', (confirmationNumber, receipt) => {
		 var receipt = receipt;
		 var tx_hash = receipt.transactionHash;
		 if (confirmationNumber === 2) {
			 var delegateAmnt = (delegateAmnt / Math.pow(10, MyLibrary.decimals)).toFixed(2);
			 var outputCurrency = 'GUN';//or GUN - currency focus is outcome of Tx
			 var type = 'success';//or error
			 var wallet = '';
			 //async wont wait	//format: tx_hash, title, amounts{eth}, amountsT{tokens} - human readable amounts
			 popupSuccess(type,outputCurrency,tx_hash,'Delegated Share Lease',0,delegateAmnt,wallet);
			 shareleaseBal();
		}
    })
	.on('error', (error) => {//listen
		var text = error.message;
		swal({
			title: "Cancelled.",
			type: "error",
			allowOutsideClick: true,
			text: text,
			html: false,
			confirmButtonColor: "#8e523c"
		});
	});
}
async function shareleaseBal(){
	var delegatedLease = await tokenInst.methods._shareDelegation(MyLibrary.wallet).call();
	var tokens = (delegatedLease / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	$('#shlDbal').empty().append(' bal: '+tokens);
}

//Create Share Lease
async function createShareLease(inputAmnt, ethAsk, duration){
	
	var tokens = web3.utils.toWei(inputAmnt, 'ether'); 
	var leaseAmnt = web3.utils.toBN(tokens);
	var input_eth = web3.utils.toWei(ethAsk, "ether");
	var input_eth = web3.utils.toBN(input_eth);
	var duration = web3.utils.toBN(duration);
	
	//Send
	tokenInst.methods.createShareLease(leaseAmnt, input_eth, duration).send({from: MyLibrary.wallet})
	.on('receipt', function(receipt){//listen
        if(receipt.status == true){//1 also matches true
            console.log('Mined', receipt);console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash);
        }
        else{
            console.log('Transaction Failed Receipt status: '+receipt.status);
            swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
        }
	})
	.on('confirmation', (confirmationNumber, receipt) => {
		 var receipt = receipt;
		 var tx_hash = receipt.transactionHash;
		 if (confirmationNumber === 2) {
			 var leasedTokens = (leasedAmnt / Math.pow(10, MyLibrary.decimals)).toFixed(2);
			 var outputCurrency = 'GUN';//or GUN - currency focus is outcome of Tx
			 var type = 'success';//or error
			 var wallet = '';
			 //async wont wait	//format: tx_hash, title, amounts{eth}, amountsT{tokens} - human readable amounts
			 popupSuccess(type,outputCurrency,tx_hash,'Share Lease Created',0,leasedTokens,wallet);
			 port_leaseIssued();
		}
    })
	.on('error', (error) => {//listen
		var text = error.message;
		swal({
			title: "Cancelled.",
			type: "error",
			allowOutsideClick: true,
			text: text,
			html: false,
			confirmButtonColor: "#8e523c"
		});
	});
}
//conclude share lease when it expires
async function concludeShareLease(){
	var leaseTaken = await tokenInst.methods._checkOccupiedLease().call({from:MyLibrary.wallet});
	//check for taken lease and know event log to listen for
	if(leaseTaken[3] == 0){//vacant
		var notice = "Delisted Vacant Lease";
		var tokens = receipt.events.LeaseUnlist.returnValues.shares;
	}else{//taken
		var notice = "Concluded Expired Lease";
		var tokens = receipt.events.LeaseEnd.returnValues.shares;
	}
	//Send
	tokenInst.methods.concludeShareLease().send({from: MyLibrary.wallet})
	.on('receipt', function(receipt){//listen
        if(receipt.status == true){//1 also matches true
            console.log('Mined', receipt);console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash);
        }
        else{
            console.log('Transaction Failed Receipt status: '+receipt.status);
            swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
        }
	})
	.on('confirmation', (confirmationNumber, receipt) => {
		 var tx_hash = receipt.transactionHash;
		 if (confirmationNumber === 2) {
			 var leasedTokens = (tokens / Math.pow(10, MyLibrary.decimals)).toFixed(2);
			 var outputCurrency = 'GUN';//or GUN - currency focus is outcome of Tx
			 var type = 'success';//or error
			 var wallet = '';
			 //async wont wait	//format: type{success/failure}, outputCurrency{GUN/ETH} tx_hash, title, amounts{eth}, amountsT{tokens}, wallet - human readable amounts
			 popupSuccess(type,outputCurrency,tx_hash,notice,0,leasedTokens,wallet);
			 port_leaseIssued();
		}
    })
	.on('error', (error) => {//listen
		var text = error.message;
		swal({
			title: "Cancelled.",
			type: "error",
			allowOutsideClick: true,
			text: text,
			html: false,
			confirmButtonColor: "#8e523c"
		});
	});
}
//Withdraw Sell Delegated Tokens
async function withdrawTokens(amountBN){
	//WARNING: everything inside each .on() keeps firing as its an event listener.. TAKE NOTE ON USAGE.. POSSIBLE MEMORY ISSUES HERE
	tokenInst.methods._undelegateSell(amountBN).send({from: MyLibrary.wallet})
	.on('receipt', function(receipt){//listen
		if(receipt.status == true){//1 also matches true
			console.log('Mined', receipt);//console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash) ;
		}
		else{
			console.log('Transaction Failed Receipt status: '+receipt.status);
			swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
		}
	 })
	.on('confirmation', function(confirmationNumber, receipt){//listen
		var receipt = receipt;
		var tx_hash = receipt.transactionHash;
		 if (confirmationNumber === 2) {
			 var delegatedTokens = (amountBN / Math.pow(10, MyLibrary.decimals)).toFixed(2);
			 var outputCurrency = 'GUN';//or GUN - currency focus is outcome of Tx
			 var type = 'success';//or error
			 var wallet = '';
			 popupSuccess(type,outputCurrency,tx_hash,'Withdrawal Delegated Tokens',0,delegatedTokens,wallet);//async wont wait	//format: tx_hash, title, amounts{eth}, amountsT{tokens} - human readable amounts
			 pullDelegateBalances();//async 
		}
	})
	.on('error', function (error) {//listen
		var text = error.message;  
		swal({
			title: "Cancelled.",
			type: "error",
			allowOutsideClick: true,
			text: text,
			html: false,
			confirmButtonColor: "#8e523c"
		});
	});
}

function swapTokens(){
	if(MyLibrary.Swap_state == "buy"){
		swapETHforGUN();
	}else{//sell
		swapGUNforETH();
	}
}
//Buy Swap
async function swapETHforGUN(){
	if($("#swapButton" ).hasClass( "swapDisabled" )){return;}
	var frontendEth = $('#tokenAamount').val();
	var input_eth = web3.utils.toWei(frontendEth, "ether");
	var input_eth = web3.utils.toBN(input_eth);
	var deadline = web3.utils.toBN(300);
	var stakedays = web3.utils.toBN(180);
	//check stake
	var checkbox = document.getElementById("stake180");
	if(checkbox.checked){
		var Transaction = tokenInst.methods._buyAndStake(stakedays, deadline);
	}else{
		var Transaction = tokenInst.methods._buyGuns(deadline);
	}
	//estimate gasLimit
	var encodedData = tokenInst.methods._buyGuns(deadline).encodeABI();
	var estimateGas = await web3.eth.estimateGas({
		value: input_eth,
		data: encodedData,
		from: MyLibrary.wallet,
		to: MyLibrary.tokenAddress
	});
	// estimate the gasPrice
	var gasPrice = await web3.eth.getGasPrice(); 

	//transaction
	Transaction.send({
		from: MyLibrary.wallet,
		value: input_eth,
   		gasPrice: gasPrice,
		gasLimit: estimateGas * 1.5, /* actual cost est is falling short, by about 1.5....ps this is different from gasPrice above which takes what it needs only */
	})
	.on('receipt', async function(receipt){//listen
		if(receipt.status == true){//1 also matches true
			console.log('Mined', receipt);//console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash) ;

			//Part 1
			var text = tokens+" GUN staked for 180 days.<br>You will automatically qualify for 10% sell tax on unstaking after maturity.";
			swal({
				title: "Tokens Bought & Staked!",
				type: "Success",
				text: text,
				html: false,
				allowOutsideClick: true,
				confirmButtonColor: "#8e523c"
			});
			//Part 2
			var tokens = receipt.events.Transfer[1].returnValues.value;
			var tx_hash = receipt.transactionHash;
			var receivedTokens = (tokens / Math.pow(10, MyLibrary.decimals)).toFixed(2);
			var outputCurrency = 'GUN';//or GUN - currency focus is outcome of Tx
			var type = 'success';//or error
			var wallet = '';
			popupSuccess(type,outputCurrency,tx_hash,'Swapped '+frontendEth+' ETH For',0,receivedTokens,wallet);//async wont wait	//format: tx_hash, title, amounts{eth}, amountsT{tokens} - human readable amounts
			balances();
			$('#tokenAamount').val('');
			$('#tokenBamount').val('');
		}
		else{
			console.log('Transaction Failed Receipt status: '+receipt.status);
			swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
		}
	})
	.on('confirmation', (confirmationNumber, receipt) => {
		console.log('tokens bought: '+receipt.events.Transfer[1].returnValues.value);
	})
	.on('error', (error) => {//listen
		var text = error.message;
		swal({
			title: "Swap Failed.",
			type: "error",
			text: text,
			html: false,
			allowOutsideClick: true,
			confirmButtonColor: "#8e523c"
		});
	});
}

//Sell Swap
async function swapGUNforETH(){
	if($("#swapButton" ).hasClass( "swapDisabled" )){return;}
	var frontendTokens = $('#tokenBamount').val();
	var input_amnt = web3.utils.toWei(frontendTokens, "ether");
	var input_amnt = web3.utils.toBN(input_amnt);
	var deadline = web3.utils.toBN(300);
	var gasPrice = await web3.eth.getGasPrice(); // estimate the gas price 
	//transaction
	tokenInst.methods.swapForUser(deadline).send({
		from: MyLibrary.wallet,
		gasPrice: gasPrice
	})
	.on('receipt', (receipt) => {
		if(receipt.status == true){//1 also matches true
			console.log('Mined', receipt);//console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash) ;
			var tokens = receipt.events.Transfer[1].returnValues.value;
			var tx_hash = receipt.transactionHash;
			var receivedETH = (tokens / Math.pow(10, MyLibrary.decimals)).toFixed(2);
			var outputCurrency = 'GUN';//or GUN - currency focus is outcome of Tx
			var type = 'success';//or error
			var wallet = '';
			popupSuccess(type,outputCurrency,tx_hash,'Swapped '+receivedTokens+' GUN For',receivedETH,0,wallet);
			balances();
			$('#tokenAamount').val('');
			$('#tokenBamount').val('');
		}
		else{
			console.log('Transaction Failed Receipt status: '+receipt.status);
			swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
		}
	})
	.on('confirmation', (confirmationNumber, receipt) => {
		console.log('tokens sold: '+receipt.events.Transfer[1].returnValues.value);
	})
	.on('error', (error) => {//listen
		console.log(error)
		var text = error.message;
		swal({
			title: "Swap Failed.",
			type: "error",
			text: text,
			html: false,
			allowOutsideClick: true,
			confirmButtonColor: "#8e523c"
		});
	});
}

//PAGE'S CUSTOM TRIES
async function callPageTries(){

	//Update Rate First, we are in portfolio
	MyLibrary.sellRate = await tokenInst.methods._sellRate().call();
	MyLibrary.buyRate = await tokenInst.methods._buyRate().call();

	//First Call
	if(MyLibrary.Swap_state == "buy"){
		//update swap metrics & infor both
		if ($('#tokenAamount').val().length > 0){	
			var input_gun = $('#tokenBamount').val();
			var input_gun = String(input_gun);
			checkBuyState(input_gun);	

		}else{	buyInfoState();	}//update buy infor only
	}else{
		sellInfoState();
	}

	/*
	========================================================
	.THEN IS PROBLEMATIC JUST DO LINE BY LINE TRIES  
	********************************************************
	*/
	claimCardsRefresh();

	//Circulating supply, update MyLibrary
	
	//Tax Status
	try{
		tokenInst.methods.isTaxExcluded(MyLibrary.wallet).call().then(function (result,error) {
			if(result == true){
				$('#sect_tax').empty().append('true');
			}else{
				$('#sect_tax').empty().append('false');
			}
		});
	}catch(error) {
		console.log(error); 
	}
}

//Reward Claims Cards Data
async function claimCardsRefresh(){
	if(window.atmChecks){	clearInterval(window.atmChecks);	}

	if(MyLibrary.claimsource ==1){//wallet
		//Holdings
		$('#sect_claims_w').empty().append(MyLibrary.gunBalance+' $GUN');
		//Claims To Date
		try{
			tokenInst.methods._totalEthReflectedWallet(MyLibrary.wallet).call().then(function (result,error) {
				var rewarded_eth = fromWeiToFixed10(result);
				$('#sect_claimed_w').empty().append(rewarded_eth + ' ETH');
			});
		}catch(error) {
			console.log(error); 
		}
		//Rewards Due
		try{var address = MyLibrary.wallet;
			if (address.length >= 40 && web3.utils.isAddress(address) == true) {
				tokenInst.methods.currentRewardForWallet(address).call().then(function (result,error) {
					var reward_due = fromWeiToFixed10(result);
					$('#sect_due_w').empty().append(reward_due + ' ETH');
				});
			}
		}catch(error) {
			console.log(error); 
		}
	}
	if(MyLibrary.claimsource ==2){//share lease
		
		var leaseDetails = await tokenInst.methods._checkOccupiedLease().call({from: MyLibrary.wallet});
		var lessor = MyLibrary.SL_lessor = leaseDetails[0];
		//Holdings
		var leaseAmount = (leaseDetails[1] / Math.pow(10, MyLibrary.decimals)).toFixed(2);
		$('#sect_claims_w').empty().append(leaseAmount+' $GUN');
		if(leaseAmount == 0){return;}else{
			//Claims To Date
			try{
				tokenInst.methods._totalEthReflectedSL(MyLibrary.wallet).call().then(function (result,error) {
					var rewarded_eth = fromWeiToFixed10(result);
					$('#sect_claimed_w').empty().append(rewarded_eth + ' ETH');
				});
			}catch(error) {
				console.log(error); 
			}
			//Rewards Due check using Lessor address
			try{console.log(lessor)
				tokenInst.methods._checkShareReflection(lessor).call({from: MyLibrary.wallet}).then(function (result,error) {
					var reward_due = fromWeiToFixed10(result);
					$('#sect_due_w').empty().append(reward_due + ' ETH');
				});
			}catch(error) {
				console.log(error); 
			}
		}
	}
	if(MyLibrary.claimsource ==3){//staked
		
		var stakeDetails = await tokenInst.methods.getStakeData(MyLibrary.wallet).call();
		var stakedTokens = stakeDetails[0];
		
		//Holdings
		var holdings = (stakedTokens / Math.pow(10, MyLibrary.decimals)).toFixed(2);
		$('#sect_claims_w').empty().append(holdings+' $GUN');

		if(holdings == 0){return;}else{
			//Claims To Date
			try{
				tokenInst.methods._totalEthReflectedST(MyLibrary.wallet).call().then(function (result,error) {
					var rewarded_eth = fromWeiToFixed10(result);
					$('#sect_claimed_w').empty().append(rewarded_eth + ' ETH');
				});
			}catch(error) {
				console.log(error); 
			}
			//Rewards Due
			try{
				tokenInst.methods._checkStakeReflection().call({from: MyLibrary.wallet}).then(function (result,error) {
					var reward_due = fromWeiToFixed10(result);
					$('#sect_due_w').empty().append(reward_due + ' ETH');
				});
			}catch(error) {
				console.log(error); 
			}
		}
	}
}
function claimCardRefreshBE(address){
	try{//collected checked on beneficiary wallet
		tokenInst.methods._totalEthReflectedBE(MyLibrary.wallet).call().then(function (result,error) {//1 wallet, 2 beneficiary, 3 sl, 4 st
			var rewarded_eth = fromWeiToFixed10(result);
			$('#sect_claimed_l').empty().append(rewarded_eth + ' ETH');
		});
	}catch(error) {
		console.log(error); 
	}
	try{//due checked on benefactor wallet
		tokenInst.methods.currentRewardForWallet(address).call().then(function (result,error) {
			var reward_due = fromWeiToFixed10(result);
			$('#sect_due_l').empty().append(reward_due + ' ETH');
		});
	}catch(error) {
		console.log(error); 
	}
}
async function claimRewardsMultiSource(claimCallOrigin){
	var gasPrice = await web3.eth.getGasPrice(); // estimate the gas price 
	if(claimCallOrigin == 1){
		if(MyLibrary.claimsource ==1){//wallet tokens claim Tx
			//estimate gasLimit
			var encodedData = tokenInst.methods.claimReflection().encodeABI();
			var estimateGas = await web3.eth.estimateGas({data: encodedData,from: MyLibrary.wallet,to: MyLibrary.tokenAddress});
			//construct Tx
			var ClaimFunction = tokenInst.methods.claimReflection().send({from: MyLibrary.wallet,gasPrice: gasPrice,gasLimit: estimateGas,})
		}
		if(MyLibrary.claimsource ==2){//sharelease claim Tx
			var address = MyLibrary.SL_lessor;
			if (address.length >= 40 && web3.utils.isAddress(address) == true) {}else{console.log("Invalid Lessor Wallet"); swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Invalid Lessor Wallet"}); return;}
			//estimate gasLimit
			var encodedData = tokenInst.methods.claimShareReflection(MyLibrary.SL_lessor).encodeABI();
			var estimateGas = await web3.eth.estimateGas({data: encodedData,from: MyLibrary.wallet,to: MyLibrary.tokenAddress});
			//construct Tx
			var ClaimFunction = tokenInst.methods.claimShareReflection(MyLibrary.SL_lessor).send({from: MyLibrary.wallet,gasPrice: gasPrice,gasLimit: estimateGas,})
		}
		if(MyLibrary.claimsource ==3){//staked tokens claim Tx
			//estimate gasLimit
			var encodedData = tokenInst.methods.claimStakeReflection().encodeABI();
			var estimateGas = await web3.eth.estimateGas({data: encodedData,from: MyLibrary.wallet,to: MyLibrary.tokenAddress});
			//construct Tx
			var ClaimFunction = tokenInst.methods.claimStakeReflection().send({from: MyLibrary.wallet,gasPrice: gasPrice,gasLimit: estimateGas,})
		}
	}
	//Benefactor rewards claim - if you arent beneficiary it reverts
	if(claimCallOrigin == 2){
		var address = $('#claimfromwallet').val();
		//quick check
		var beneficiary = await beneficiaryCheck(address);
		if (beneficiary === false){
			swal({title: "Not Beneficiary.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "You are not a beneficiary to this wallet.."});
			return;
		}else{}
		if (address.length >= 40 && web3.utils.isAddress(address) == true) {
			//estimate gasLimit
			var encodedData = tokenInst.methods.claimReflectionBe(address).encodeABI();
			var estimateGas = await web3.eth.estimateGas({data: encodedData,from: MyLibrary.wallet,to: MyLibrary.tokenAddress});
			//construct Tx
			var ClaimFunction = tokenInst.methods.claimReflectionBe(address).send({from: MyLibrary.wallet,gasPrice: gasPrice,gasLimit: estimateGas,})
		}else{
			console.log("address not valid");
		}
	}

	//transaction package
	ClaimFunction
	.on('receipt', function(receipt){//listen
		if(receipt.status == true){//1 also matches true
			console.log('Claim Mined', receipt);//console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash);
		}else{
			console.log('Transaction Failed Receipt status: '+receipt.status);
			swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
		}
	})
	.on('confirmation', function(confirmationNumber, receipt){//listen
		if (confirmationNumber === 2) {
			if(MyLibrary.claimsource == 1 || claimCallOrigin == 2){var tokens = receipt.events.ClaimReflection.returnValues.reflection;}
			if(MyLibrary.claimsource == 2){var tokens = receipt.events.ClaimReflectionLease.returnValues.reflection;}
			if(MyLibrary.claimsource == 3){var tokens = receipt.events.ClaimReflectionStake.returnValues.reflection;}
			
			var tx_hash = receipt.transactionHash;
			var receivedETH = (tokens / Math.pow(10, MyLibrary.decimals)).toFixed(10);
			var outputCurrency = 'ETH';//or GUN - currency focus is outcome of Tx
			var type = 'success';//or error
			var wallet = '';
			popupSuccess(type,outputCurrency,tx_hash,'Rewards Claimed Successfully',receivedETH,0,wallet);//async wont wait	//format: tx_hash, title, amounts{eth}, amountsT{tokens} - human readable amounts
			//make async function calls
			if(claimCallOrigin == 2){claimCardRefreshBE(address);}else{claimCardsRefresh();}
			console.log('rewards claimed: '+tokens);
		}
	})
	.on('error', function (error) {//listen
		var text = error.message; 
		swal({
			title: "Rewards Claiming Failed.",
			type: "error",
			text: text,
			html: false,
			allowOutsideClick: true,
			confirmButtonColor: "#8e523c"
		});
		console.log(error);
	});
}
async function beneficiaryCheck(ownerAddress){
	var beneficiary = await tokenInst.methods._claimBeneficiary(ownerAddress).call();
	if(beneficiary == MyLibrary.wallet){return true;}else{return false;}
}
function setBeneficiaryWallet(wallet){
	if (wallet.length >= 40 && web3.utils.isAddress(wallet) == true) {}else{console.log("Invalid address provided"); return;}
	
	//transaction
	tokenInst.methods.addClaimBeneficiary(wallet).send({
		from: MyLibrary.wallet
	})
	.on('receipt', function(receipt){
		if(receipt.status == true){//1 also matches true
			console.log('Mined', receipt);
		}
		else{
			console.log('Transaction Failed Receipt status: '+receipt.status);
			swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
		}
	 })
	.on('confirmation', function(confirmationNumber, receipt){//listen
		var receipt = receipt;
		var tx_hash = receipt.transactionHash;
		 if (confirmationNumber === 2) {
			 var type = 'success';//or error
			 var outputCurrency = '';
			 popupSuccess(type,outputCurrency,tx_hash,'Beneficiary Wallet Set',0,0,wallet);
			 $('#beneficiaryWallet').empty().append(wallet);
			 swal.close();
		}
	})
	.on('error', function (error) {//listen
		var text = error.message;  
		swal({
			title: "Failed to add Beneficiary.",
			type: "error",
			text: text,
			html: false,
			allowOutsideClick: true,
			confirmButtonColor: "#8e523c"
		});
	});
}
function beneficiarySetting(){
	var privatize = '<div class="shl_inputshold delegate_inputshold setBeneField"><input id="submitwallet" class="shldi benown" aria-invalid="false" autocomplete="off" title="once an address is set it will be able to claim your ETH rewards. to restore your wallet as sole beneficiary, simply set your own wallet address again"><br><div class="beneCurrent"><span>Beneficiary: </span><span id="beneficiaryWallet"></span></div></div>';
	swal({
			title: "Set Reward Beneficiary Wallet",
			text: privatize,
			type: "prompt",  //var alertTypes = ['error', 'warning', 'info', 'success', 'input', 'prompt'];
			html: true,
					dangerMode: true,
					confirmButtonText: "Set Wallet",
					confirmButtonColor: "#8e523c", //cowboy brown
					cancelButtonText: "Close",
					closeOnConfirm: false,
					showLoaderOnConfirm: true,
			showConfirmButton: true,
			showCancelButton: true,
			timer: 4000,
			animation: "slide-from-top"
	},function(){//on confirm click
		var address = $('#submitwallet').val();
		setBeneficiaryWallet(address);
	});//confirm swal close

	document.getElementById("submitwallet").placeholder = "set wallet address as beneficiary..";
	atmChecks = setTimeout( function() {
		var address = MyLibrary.wallet;
		try{
			tokenInst.methods._claimBeneficiary(address).call().then(function (result,error) {
				if(web3.utils.toBN(result).isZero()){
					var result = MyLibrary.wallet;
				}
				$('#beneficiaryWallet').empty().append(result);
			});
		}catch(error) {
			console.log(error); 
		}
	}, 1000);
}
function resetClaimFields(){
	$('#sect_claims_w').empty().append('---');
	$('#sect_claimed_w').empty().append('---');
	$('#sect_due_w').empty().append('---');
}
//claims history
function rewardsClaimed(){
	return new Promise(function(resolve, reject) {// Creating a XHR object
		const xhr = new XMLHttpRequest();
		const url = MyLibrary.AlchemyURL;
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var parsed = JSON.parse(this.responseText);
				if(parsed.hasOwnProperty('error')){//click or call again after a min timeout
					//var stringified = JSON.stringify(parsed);
					console.log('retry in progress, error on last fetch: '+result.error);//if it returns objects, just log stringified
					rewardsClaimed();
				}else{
					process_claims_todate(parsed);
				}
			}
		};		
		//converting JSON data to string
		var abi = MyLibrary.contractABI;
		var fromBlockHEX = '0x'+(30111000).toString(16);//to_hex.. from_hex = parseInt(hexString, 16);
		var address_encoded = web3.eth.abi.encodeParameter('address', MyLibrary.wallet);
		//event signature
		if(MyLibrary.claimsource == 1 || MyLibrary.claimsource == 4){var eventSignature = "0xedfd1f5aaee60f4be9ef12702ca2d1016ebce9d8fd3f0e11d7080fd43d12cc84";}
		if(MyLibrary.claimsource == 2){var eventSignature = "0x10d7dba82e80cd40ab7be3edd8a086dfbd9de77bfd704b3c92fad61107984906";}
		if(MyLibrary.claimsource == 3){var eventSignature = "0xb9d645858ab727bc03340723bceed2cb8b1b6ff2cbb0045673f446905c98bddc";}
		if(MyLibrary.claimsource == 4){//just address now, signature set already
			var address = $('#claimfromwallet').val();
			if (address.length >= 40 && web3.utils.isAddress(address) == true) {
				var address_encoded = web3.eth.abi.encodeParameter('address', address);	
			}else{
				swal({title: "Invalid Address Provided.",type: "error",text: "check benefactor wallet address above..",html: false,allowOutsideClick: true,confirmButtonColor: "#8e523c"});
			}
		}
		//construct
		var data = JSON.stringify({"jsonrpc": "2.0","id": 0,"method": "eth_getLogs","params": [{
						  "fromBlock": fromBlockHEX,
						  "address": MyLibrary.tokenAddress,
						  "topics": [eventSignature,address_encoded] //use: https://emn178.github.io/online-tools/keccak_256.html
						}]
					});
		//sending data with the request
		xhr.send(data);
		xhr.onerror = reject;
	});
}

function process_claims_todate(parsed){
	//console.log(parsed);
	//console.log(parsed.id);
	//console.log(parsed.result[0].data);// value claimed
	var claims_ = parsed.result;
	var number_of_claims = MyLibrary.number_of_claims = parsed.result.length;
	var receiver = MyLibrary.wallet;
	var list_tree = '';
	window.total_claims = 0;
	if(number_of_claims > 0){
		for (var i = 0; i < number_of_claims; i++) {
			var claimerfromHex  = parseInt(claims_[i].topics[2], 16);//2nd topic is claimer
			var ethReward = fromWeiToFixed10(claims_[i].data);//pass hex			
			var ethReward = parseFloat(ethReward);//float so we can add the values not append
			if(ethReward > 0 && claimerfromHex == receiver){ 
				var tx_hash = claims_[i].transactionHash.slice(0, 12);//trim to max 10
				var transfer = '<li class="claimtx"><span class="claim_tag">Claimed: </span><span class="reward_tag">'+ ethReward + ' ETH, </span><span class="tx_tag"><a href="https://etherscan.io/tx/'+claims_[i].transactionHash+'" target="_blank">TxHash: ' + tx_hash + '...</a></span></li>';
				window.total_claims += ethReward;
				var list_tree = list_tree + transfer;
				
				if(i == number_of_claims-1){//last item, since we loop from 0 not 1
					var chd = '<div class="claimsum">'+window.total_claims+' ETH</div><div class="clms_case">'+list_tree+'</div>';
					swal({
						title: "Claims History",
						text: chd,
						html: true,
						showCancelButton: false,
						dangerMode: true,
						confirmButtonText: "Cool",
						confirmButtonColor: "#8e523c",
						closeOnConfirm: true
					});
				}
			}
		}//close for
	}else{//no claims yet popup
		console.log('No claims yet...');
		$('#sect_claimed').empty().append(number_of_claims+' claims');
		var privatize = '<div class="clms_case">No rewards claimed yet...</div>';
		swal({
			  title: "0 Claims",
			  text: privatize,
			  type: "info",  //var alertTypes = ['error', 'warning', 'info', 'success', 'input', 'prompt'];
			  html: true,
						dangerMode: true,
						confirmButtonText: "Okay",
						confirmButtonColor: "#8e523c", //cowboy brown
			  showConfirmButton: true,
			  showCancelButton: false,
			  timer: 4000,
			  animation: "slide-from-top"
		},function(){//on confirm click
		
		});//confirm swal close
	}
}

//portfolio refresh
async function portfolioRefresh(){
	//*>>>BENEFICIARY CARDS<<<*/
	port_beneficiary().then(() => {
		//*>>>SHARE LEASE ISSUED<<<*/
		port_leaseIssued();
	}).then(() => {
		//*>>>SHARE LEASE TAKEN<<<*/
		port_leaseTaken();
	}).then(() => {
		//*>>>STAKED CARDS<<<*/
		//alert('add more')
	})
}
async function port_beneficiary(){
	try{
		var beneficiary = await tokenInst.methods._claimBeneficiary(MyLibrary.wallet).call();
		if(web3.utils.toBN(beneficiary).isZero()){//not set yet, you are beneficiary
			var beneficiary = MyLibrary.wallet;
		}
	}catch(error) {
		console.log(error); 
	}
	//display beneficiary wallet
	$('#pbCard_bene').empty().append(beneficiary);

	//fetch claims total
	try{
		var rewarded_eth = await tokenInst.methods._totalEthReflectedBE('0xA31B98a94f087Cda3Ff0c72618F4dCd993FA9589').call();
		var fixedETH = fromWeiToFixed10(rewarded_eth);
		$('#pbCard_total').empty().append(fixedETH + ' ETH');
	}catch(error) {
		console.log(error); 
	}
	//convert to USD value
	var USDvalue = fixedETH * await ETHUSDprice(); 
	$('#pbCard_value').empty().append('$ '+USDvalue.toFixed(10) );
}
async function port_leaseIssued(){
	try{
		var leaseIssued = await tokenInst.methods.getShareLease(MyLibrary.wallet).call();
		var amount = (leaseIssued[0] / Math.pow(10, MyLibrary.decimals)).toFixed(2);
		var ETHasked = fromWeiToFixed10(leaseIssued[1]);
		var ETHclaimed = fromWeiToFixed10(leaseIssued[2]);
		var duration = leaseIssued[3];
		var start = new Date(leaseIssued[4]).toDateString();
		var expiry = new Date(leaseIssued[5]).toDateString();
		var subscriber = leaseIssued[6];
		if (typeof subscriber == 'undefined'){var subscriber = "0x0000000000000000000000000000000000000000";}
		//add values
		$('#_lsrD_taker').empty().append(subscriber);
		$('#_lsrD_tokens').empty().append(amount);
		$('#_lsrD_ask').empty().append(ETHasked + ' ETH');
		$('#_lsrD_claims').empty().append(ETHclaimed + ' ETH');
		$('#_lsrD_start').empty().append(start); 
		$('#_lsrD_expire').empty().append(expiry + ' (duration ' + duration + ' days)'); //add duration in brackets
		shareleaseBal();
		//check for taken lease and show correct indicators/buttons
		if(web3.utils.toBN(subscriber).isZero()){
			$("#dot_lsrD, #_portBtnConclude").hide();
		}else{
			$("#dot_lsrD").css('display', 'inline-block');
			$("#_portBtnConclude").css('display', 'inline-flex');
			$(".dot").css({'background-color': '#27AE60'});
			var timestamp = Date.now();
			if(leaseIssued[5] < timestamp){//expired
				$('#_lsrD_expire').css('color', '#ff4747');//red
			}else{
				$('#_lsrD_expire').css('color', '#04C86C');//green
			}
			
		}
	}catch(error) {
		console.log(error); 
	}
	return;
}
async function port_leaseTaken(){
	try{
		var leaseTaken = await tokenInst.methods._checkOccupiedLease().call({from:MyLibrary.wallet});
		//check for taken lease and show green dot
		if(leaseTaken[3] == 0){
			$("#dot_lsrT").hide();
			return;
		}else{
			$("#dot_lsrT").css('display', 'inline-block');
			$(".dot").css({'background-color': '#27AE60'});
			var timestamp = Date.now();
			if(leaseIssued[4] < timestamp){//expired
				$('#_lsrD_expire').css('color', '#ff4747');//red
			}else{
				$('#_lsrD_expire').css('color', '#04C86C');//green
			}
		}
		var lessor = leaseTaken[0];
		var amount = (leaseTaken[1] / Math.pow(10, MyLibrary.decimals)).toFixed(2);
		var ETHasked = fromWeiToFixed10(leaseTaken[2]);
		var ETHclaimed = await tokenInst.methods._totalEthReflectedSL(MyLibrary.wallet).call();
		var ETHclaimed = fromWeiToFixed10(ETHclaimed);
		var start = new Date(leaseTaken[3]).toDateString();
		var expiry = new Date(leaseTaken[4]).toDateString();
		//add values
		$('#_lsrT_lessor').empty().append(lessor);
		$('#_lsrT_tokens').empty().append(amount);
		$('#_lsrT_ask').empty().append(ETHasked + ' ETH');
		$('#_lsrT_claims').empty().append(ETHclaimed + ' ETH');
		$('#_lsrT_start').empty().append(start); 
		$('#_lsrT_expire').empty().append(expiry);
	}catch(error) {
		console.log(error); 
	}
	return;
}
async function ETHUSDprice(){
	//PS no Kovan ETHUSDC LP it was closed, will point to one in Mainnet
	//Manual addresses for now, using MyLibrary gives error somehow
	const UNISWAP_FACTORY_ADDR = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
	const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
	const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
	var uniswapAbi = [{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]; // get the abi from https://etherscan.io/address/0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc#code
	var factoryABI = [{"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token0","type":"address"},{"indexed":true,"internalType":"address","name":"token1","type":"address"},{"indexed":false,"internalType":"address","name":"pair","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"PairCreated","type":"event"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allPairs","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"allPairsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"}],"name":"createPair","outputs":[{"internalType":"address","name":"pair","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"feeTo","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"feeToSetter","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"getPair","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeTo","type":"address"}],"name":"setFeeTo","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"name":"setFeeToSetter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}];
	var factory = new web3.eth.Contract(factoryABI, UNISWAP_FACTORY_ADDR);
  	var pairAddress = await factory.methods.getPair(WETH, USDC).call();
	  //alert(pairAddress) //should return valid address not 0x00
	var pair = new web3.eth.Contract(uniswapAbi, pairAddress);
	var reserves = await pair.methods.getReserves().call();
	console.log(pairAddress);
	console.log(reserves);
	console.log(reserves[1] / (reserves[0] * 1e12));
	return 1100;//for now
	
}
//========================================================================
//CLICK INITIATED CALLS
//HANDLE ALL EVENTS HERE
//swaps
$(document).on('click', '#maxTokenA', function(e){
	var tokenAamount = document.getElementById("aaa_balance").innerHTML;
	var parsed = parseFloat(tokenAamount);
	//swap values
	document.getElementById("tokenAamount").value = parsed;
	keyDownA();
});
$(document).on('click', '#maxTokenB', function(e){
	var tokenBamount = document.getElementById("bbb_balance").innerHTML;
	var parsed = parseFloat(tokenBamount);
	//swap values
	document.getElementById("tokenBamount").value = parsed;
	keyDownB();
});
//token delegation scripts
$(document).on('click', '#delegate_expand', function(e){
	if($('.delegate_form').css('height')=='0px'){
		$('.swapcard').animate({height: "420px"}, 100, "swing", function(){});
		$('.delegate_form').css({'display' : 'block'});
		$('.delegate_form').animate({height: "370px"}, 600, "swing", function(){});
		//fetch delegate balances, copy wallet balance from local though
		pullDelegateBalances();
	}else{
		$('.delegate_form').animate({height: "0px"}, 300, "swing", function(){});
		$('.delegate_form').css({'display' : 'none'});
		$('.swapcard').animate({height: "370px"}, 100, "swing", function(){});
		if(window.delegateBalTimer){clearTimeout( window.delegateBalTimer); }else{}
	}
});
//delegate from toggle page 
$(document).on('click', '#submit_delegate_t', function(e){
	var raw_delegate = document.getElementById("d_delegate").value;
	//submit
	delegateTokens(raw_delegate, 2);
});
//delegate from front page
$(document).on('click', '#delButton', function(e){
	var raw_delegate = document.getElementById("tokenAamount").value;
	//submit
	delegateTokens(raw_delegate, 1);
});
$(document).on('click', '#submit_withdraw_t', function(e){
	
	var raw_delegate = document.getElementById("d_withdraw").value;
	var value = web3.utils.toWei(raw_delegate, 'ether');
	var amount = web3.utils.toBN(value);
	var truefalse = web3.utils.isBN(amount);
	//submit
	withdrawTokens(amount);
});
//swap tokens
$(document).on('click', '#swapButton', function(e){
	swapTokens();
});
//claim from other wallet
$(document).ready(function(){
	$('#claimfromwallet').on('input', async function(event) {
		var address = $('#claimfromwallet').val();
		if (address.length >= 40 && web3.utils.isAddress(address) == true) {
			var beneficiary = await beneficiaryCheck(address);
			if (beneficiary === false){
				swal({title: "Not Beneficiary.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "You are not a beneficiary to this wallet.."});
				return;
			}else{
				claimCardRefreshBE(address);
			}
		}
	});
});
//change claim source
$(document).on('click', '#cs_1', function(e){
	MyLibrary.claimsource = 1;//wallet
	document.getElementById("claimfrom").innerHTML = "from Wallet";
	resetClaimFields();
	claimCardsRefresh();
});
$(document).on('click', '#cs_2', function(e){
	MyLibrary.claimsource = 2;//share lease
	document.getElementById("claimfrom").innerHTML = "from Lease";
	resetClaimFields();
	claimCardsRefresh();
});
$(document).on('click', '#cs_3', function(e){
	MyLibrary.claimsource = 3;//staked
	document.getElementById("claimfrom").innerHTML = "from Staked";
	resetClaimFields();
	claimCardsRefresh();
});
//claim events
$(document).on('click', '#claim_fmw', function(e){
	var claimCallOrigin = 1;
	claimRewardsMultiSource(claimCallOrigin);
});
$(document).on('click', '#claim_fbe', function(e){
	//check readiness first
	var address = $('#claimfromwallet').val();
	if (address.length >= 40 && web3.utils.isAddress(address) == true) {
		var claimCallOrigin = 2;
		claimRewardsMultiSource(claimCallOrigin);
	}else{
		console.log('invalid wallet address');
	}
});
//claims history
$(document).on('click', '#show_claims_w', function(e){
	console.log('fetching claims...');	
	rewardsClaimed();
});
$(document).on('click', '#show_claims_be', async function(e){
	MyLibrary.claimsource = 4;//hack - extended 4 for event signature construct
	console.log('fetching claims...');	
	//check readiness first
	var address = $('#claimfromwallet').val();
	if (address.length >= 40 && web3.utils.isAddress(address) == true) {
		var isbeneficiary = await beneficiaryCheck(address);
		if (isbeneficiary === false){
			swal({title: "Not Beneficiary.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "You are not a beneficiary to this wallet.."});
			return;
		}else{
			rewardsClaimed();
		}
	}else{
		console.log('invalid wallet address');
	}
	
});
$(document).on('click', '#delLease', function(e){
	var tokens = $('#delegate_amnt').val();
	delegateShareLease(tokens);
});
$(document).on('click', '#shlDmax', async function(e){
	var amount = await tokenInst.methods.balanceOf(MyLibrary.wallet).call();
	var tokens = (amount / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	document.getElementById("delegate_amnt").value = parseFloat(tokens).toFixed(2);
});
$(document).on('click', '#shlCmax', async function(e){
	var amount = await tokenInst.methods._shareDelegation(MyLibrary.wallet).call();
	var tokens = (amount / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	document.getElementById("create_amnt").value = parseFloat(tokens).toFixed(2);
});
$(document).on('click', '#createLease', function(e){
	var inputAmnt = $('#create_amnt').val();
	var ethAsk = $('#create_ethamnt').val();
	var duration = $('#create_duration').val();
	createShareLease(inputAmnt, ethAsk, duration);
});
$(document).on('click', '#benef_settings', function(e){
	beneficiarySetting();
});
$(document).on('click', '#shlc_exp', function(e){
	if($('#shlcBody').css('height')=='0px'){
		$('#shlcBody').css({'display' : 'block'});
		$('#shlcBody').animate({height: "100px"}, 400, "swing", function(){});
	}else{
		$('#shlcBody').animate({height: "0px"}, 300, "swing", function(){});
	}
});
$(document).on('click', '#_portBtnConclude', function(e){
	concludeShareLease();
});
$(document).ready(function () {
	portfolioActive = false;//flag to call once
	$(window).scroll(function (event) {
		var scrollTop     = $(window).scrollTop();
		var elementOffset = $('.portfolioSect').offset().top;
		var distanceToTop      = (elementOffset - scrollTop);
		//console.log(distanceToTop);
		if (distanceToTop < 250) {
			$('.jumpTop').show();
			$('.jumpBottom').hide();
			//console.log('portfolio in view')
		} else {
			$('.jumpTop').hide();
			$('.jumpBottom').show();
			//console.log('portfolio far')
		}
		//separated to give specific range for call
		if (distanceToTop < 300 && distanceToTop > 0 && portfolioActive == false) {
			const setPortIntervalAsync = (fn, ms) => {
				fn().then(() => {
					window.portTimeout = setTimeout(() => setPortIntervalAsync(fn, ms), ms);
				});
			};
			setPortIntervalAsync(async () => {
				//alert('refreshing...')
				portfolioActive = true;
				portfolioRefresh();
			}, 60000);
		}
		//if we go to top stop refreshes at bottom
		if (distanceToTop > 570 && portfolioActive == true) {
			if(window.portTimeout){
				clearTimeout(portTimeout);
				portfolioActive = false;//flag to call once
			}
		}
	});
});



//WORKSHOP
/*
//Get transaction 
var transaction = '0x99df4297764852e555e8fbe412c8e0e4cc83774dc53c49f9e1c047f1ac8faae6';
	try{
		web3.eth.getTransaction(transaction, function(error, result) {
			let tx_data = result.input;
			let input_data = '0x' + tx_data.slice(10);  // get only data without function selector

			let params = web3.eth.abi.decodeParameters(['bytes32', 'string', 'string', 'string'], input_data);
			console.log(params);
		});
	}catch(error) {
		console.log(error); 
	}
	*/