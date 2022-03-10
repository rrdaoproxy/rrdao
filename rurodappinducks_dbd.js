// JavaScript Document
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//INITIALIZE https://stackoverflow.com/questions/12393303/storing-a-variable-in-the-javascript-window-object-is-a-proper-way-to-use-that
window.MyLibrary = {"wallet":"0x19849a002f826c7d492d35f41b4d748a2883b4a0"}; // global Object container; don't use var
MyLibrary.network = "0x2a";
MyLibrary.balance = 0;
MyLibrary.circ_supply  = 900000000000;
MyLibrary.wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';//WETH contract address
MyLibrary.liquidity_pool_addy = '0x9c2B19dbDFad3f283C0B96C5546d91a275778D91';//pool for token we want to query GUN token balance ~ abc 0x045803b337e55B3a377dB7b3523f21c334a8285b
MyLibrary.tokenAddress = '0xC146B7CdBaff065090077151d391f4c96Aa09e0C';//GUN contract address ~ ABC 0x5b4e9a810321e168989802474f689269ec442681	
MyLibrary.UniswapUSDCETH_LP = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";//for calc eth prices: UniswapUSDCETH_LP address
MyLibrary.usdcContractAdd = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";//for calc usd prices
MyLibrary.wethContractAdd = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";//weth contract address for alchemy getassetprices
MyLibrary.uniswapV2router = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";//alchemy's 'to' address, uniswap V2 Router
MyLibrary.buyKey = 0;
MyLibrary.sellKey = 0;

//alert(MyLibrary.wallet);
MyLibrary.block = '1340056';
//alert(MyLibrary.block);
MyLibrary.block = '1400000';
//alert(MyLibrary.block);


window.addEventListener("load", function() {
	
if (typeof window.ethereum == 'undefined' || (typeof window.web3 == 'undefined')) {
	
			swal({title: "Hold on!",type: "error",confirmButtonColor: "#F27474",text: "metamask missing, so is the full experience now..."});

		}else if (typeof window.ethereum !== 'undefined' || (typeof window.web3 !== 'undefined')) {
			//Metamask on BROWSER, NOW SET WEB3 PROVIDER
			if (window.ethereum) { // for modern DApps browser
				window.web3 = new Web3(window.ethereum);
			}else if (web3) { // for old DApps browser
				window.web3 = new Web3(web3.currentProvider);
			} else {
				console.log('Metamask missing, update to Web3 capable browser');
				swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "metamask missing, so is the full experience now..."});
			}//close else
		
			//###
			//READ PLEASE>> https://docs.metamask.io/guide/ethereum-provider.html#events
			
			//## ONE - check only. Do something about loading page under wrong network
			window.ethereum.on('connect', function (chainID) {//emitted when Metamask first connects to node, check which node
				
				window.chainID = chainID.chainId; //pull from array
				var chainID = window.chainID;
				console.log('current chain:',chainID);
				
			});
		
			//## THREE - check  + update | detect Metamask account change
			window.currentAccount = null;
			window.ethereum.on('accountsChanged', function (accounts) {
			  console.log('account changed:',accounts);
			  MyLibrary.wallet = accounts[0];
			  
			  if (accounts.length === 0) {
				// MetaMask is locked or the user has not connected any accounts
				console.log('Please connect to MetaMask.');
			  } else if (accounts[0] !== currentAccount) {
				window.currentAccount = accounts[0];
				// Do any other work!
				//1. show account name
				//2. query account balance
				AccountBalance(currentAccount);
				var disconnected = window.disconnected;
				walletCheck(disconnected);
			  }
		
			});
		
			 //## FOUR - check + reload | detect Network account change
			window.ethereum.on('chainChanged', function(networkId){
				console.log('networkChanged:',networkId);
				window.chainID = networkId;
			  	//alt method> async function chainCheck() {	const chainId = await ethereum.request({ method: 'eth_chainId' });	}
				//if wrong chain hex i.e. not 0x1 then display button that requests network change to eth main
				if(networkId !== MyLibrary.network){//0x2a for Kovan testnet
					console.log('reading other chain: '+networkId);
					//if locked then hide the details bar and show connect button
					$('.wallet_connect').css('display', 'none');
					$('.walletpur').css('display', 'none');
					$('.network_switch').css('display', 'inline-block');
				}else if(networkId == MyLibrary.network){//0x2a for Kovan testnet
					//correct network proceed to check if wallet unlocked
					var disconnected = window.disconnected;
					walletCheck(disconnected);
					console.log('reading eth mainnet');
				}
				
			   // We recommend reloading the page, unless you must do otherwise
			   window.location.reload();
			   
			});
			
		} else {
			console.warn("No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live");
			// fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
			App.web3 = new Web3( new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
		}
});

//initialise
window.disconnected = 0;

//TIMED CHECKS
blockTimer = setInterval( function() {
	currentBlock();		
}, 31000);
currentBlock(); //Fetch current block

//Wallet Unlock Check / Balance Check [so we know what buttons to display] called on page load too above
walletCheckTimer = setInterval( function() {
	var disconnected = window.disconnected;
	walletCheck(disconnected);		
	console.log('is disconnected: '+disconnected);
}, 60000);
walletCheck(disconnected);

//run button check once on page load
buttonCheck();
function buttonCheck(){
	//since its on page load, we just show waiting button and hide everything else
	//walletcheck will correct this button alignment
	$('.waiting_init').css('display', 'inline-block');
}

function AccountBalance(currentAccount){
	//query to fetch balance of erc20 token
}

function handleConnectApprove(){
	//handle what happens when connections is approved
}

function chainCheck(){
	//check chainID and request switch to ETH if its not 0x1
	//Switch only on button click
	//not used as we do this check on page load and network change
}

async function currentBlock(){

	//Metamask on BROWSER, NOW SET WEB3 PROVIDER
	if (typeof window.ethereum !== 'undefined') {
		window.web3 = new Web3(window.ethereum);//this is correct standard from Metamask docs. Creates Object from Metamasks Ethereum proxy
		const ethereum = window.ethereum;// this is a Proxy
	}else if (typeof window.web3 !== 'undefined') { // for old DApps browser
		window.web3 = new Web3(window.web3.currentProvider);
		window.ethereum = window.web3.currentProvider;
		const ethereum = window.ethereum;
	} else if (typeof window.web3 == 'undefined' && typeof window.ethereum == 'undefined'){
		console.log('Metamask missing, update to Web3 capable browser');
		//swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "metamask missing, so is the full experience now..."});
	}//close else


	//Wait for nothing
	try{			
		//get blocknumber regardless if logged in or not, unlocked or not
		await window.web3.eth.getBlockNumber().then(block => {
			//document.getElementById("blocknumber").innerHTML = '<a href="https://etherscan.io/block/'+block+'" target="_blank">'+block+'</a>';
			//document.getElementById("usdprice").innerHTML = "$" + tokenprice + " USD";
			$("#blocknumber").empty().append('<a href="https://etherscan.io/block/'+block+'" target="_blank">'+block+'</a>');
		});
	} catch (error) {//close try/catch
		console.error(error);
		swal({title: "Offline",type: "error",confirmButtonColor: "#F27474",text: error});
		//change dot color
		$(".dot").css({'background-color': '#ec0624'});
	}	
}
unlockedtoClaim();
async function unlockedtoClaim(){
	await window.web3.eth.getAccounts().then(it=>{
		var accounts = it;
		var account = it[0]; 
		MyLibrary.wallet = account;
		//alert('unlockedtoClaim: '+accounts.length);
		if (accounts.length > 0) {
			rewardsClaimed();
		}
	});
}
function rewardsClaimed(){
	// Creating a XHR object
	const xhr = new XMLHttpRequest();
	const url = "https://eth-mainnet.alchemyapi.io/v2/1W9ERTKJSE7IB6ydFCa3DVRgq20qCm2I";
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4 && xhr.status === 200) {
			result = this.responseText;									
			MyLibrary.claims_result = result;
			var called_from = 'alch_getAsset';
			var parsed_1 = JSON.parse(result);
			//console.log(parsed_1);
			if(parsed_1.hasOwnProperty('error')){//click or call again after a min timeout
				var stringified = JSON.stringify(parsed_1);
				console.log('error fetching claims: '+result.error);//if it returns objects, just log stringified
				rewardsClaimed();		
				
			}else{
				//clear timeout if it exists
				process_claims_todate(called_from,result);//pass result unparsed
			}
		}
	};	
	
	var fromBlock = '0x'+(13761192).toString(16);//to_hex, from_hex = parseInt(hexString, 16);
	var wethContractAdd = MyLibrary.wethContractAdd;//weth contract
	var to_wallet = MyLibrary.wallet;//my wallet, should be specified specifically causes inflation problems if not
	var fromContract = MyLibrary.tokenAddress;//Token contract addy
	var data = JSON.stringify({"jsonrpc": "2.0", "id": 0, "method": "alchemy_getAssetTransfers", "params": [ { "fromBlock": fromBlock, "toBlock": "latest", "fromAddress": fromContract, "toAddress": to_wallet, "contractAddresses": [ wethContractAdd ],"maxCount": "0x3e8", "excludeZeroValue": true, "category": [ "internal" ] } ] });
	// Sending data with the request
	xhr.send(data);
}

function process_claims_todate(called_from, output){//output is definitely not error object, we dont pass that here we keep querying
	parsed = JSON.parse(output);//parse here so we can debug easily
	//console.log(parsed);
	//console.log(parsed.id);
	//console.log(parsed.result.transfers);//at this point each array has object
		
	var transfers_ = parsed.result.transfers;
	var number_of_transfers = parseInt(transfers_.length);
	var receiver = MyLibrary.wallet;
	var list_tree = '';
	window.total_claims = 0;
	if(number_of_transfers > 0){
		for (var i = 0; i < number_of_transfers; i++) {
			if(transfers_[i].asset == "ETH" && transfers_[i].category == "internal" && transfers_[i].to == receiver){ 
				var eth_paid = parseFloat((transfers_[i].value).toFixed(11));//max 11 digits after dot
				var tx_hash = transfers_[i].hash.slice(0, 12);//trim to max 10
				var transfer = '<li class="claimtx"><span class="claim_tag">Claimed: </span><span class="reward_tag">'+ eth_paid + ' ETH, </span><span class="tx_tag"><a href="https://etherscan.io/tx/'+transfers_[i].hash+'" target="_blank">TxHash: ' + tx_hash + '...</a></span></li>';
				//console.log(transfer);
				window.total_claims += eth_paid;
				//console.log(window.total_claims);
				if(called_from == 'alch_getAsset'){
					if(i == number_of_transfers-1){//since we loop from 0 not 1
						$("#sect_claimed").empty().prepend(window.total_claims); 
					}
				}else if(called_from == 'claim_hist_click'){
					//do swal
					var list_tree = list_tree + transfer;
					//on last loop, pass out the totals
					if(i == number_of_transfers-1){//since we loop from 0 not 1
						var net_rewards = window.total_claims.toFixed(5) + ' ETH';
						var chd = '<div class="claimsum">'+net_rewards+'</div><div class="clms_case">'+list_tree+'</div>';
						swal({
							title: "Claims History",
							text: chd,
							html: true,
							showCancelButton: false,
							dangerMode: true,
							confirmButtonText: "Cool",
							cancelButtonText: "Close",
							confirmButtonColor: "#683c2c",
							closeOnConfirm: true
							},function () {//on confirm click
									//open full page in new tab
						});//outer swal close
					}
				}
			}else{
				//no claims made yet
				$("#sect_claimed").empty().prepend(0); 
			}
		}//close for
	}else{
		//no claims yet popup
		console.log('No claims yet...');
		$('#sect_claimed').empty().append(number_of_transfers+' claims');
		var privatize = '<div class="clms_case">No rewards claimed yet...</div>';
		swal({
			  title: "0 Claims",
			  text: privatize,
			  type: "info",  //var alertTypes = ['error', 'warning', 'info', 'success', 'input', 'prompt'];
			  html: true,
						dangerMode: true,
						confirmButtonText: "Okay",
						confirmButtonColor: "#683c2c", //cowboy brown
			  showConfirmButton: true,
			  showCancelButton: false,
			  timer: 4000,
			  animation: "slide-from-top"
		},function(){//on confirm click
		
		});//inner swal close
	}
}


function walletCheck(disconnected){
	//if we disconnected
	if (disconnected === 0) { 
		//alert('proceed');
		walletCheckProceed();
	}else if(disconnected === 1){
		console.log('reconnection needed');
		$('.waiting_init').css('display', 'none');
		$('.walletpur').css('display', 'none');
		$('.wallet_connect').css('display', 'inline-block');
	}
}
/////// CHECK IF WALLET UNLOCKED
async function walletCheckProceed() {
	
	//stop queries
	//clearTimeout(window.walletCheckTimer);
	var account = 0;
	var accounts = 0;
	
	//chain ID - connect & chainChanged are the only 2 instances where chainID is set, but problem is when i relaod whilst connected to ETH mainnet already, there is no trigger to get the chainID hence we have to do it manually here to cover where its lacking

	await ethereum.request({method: 'eth_chainId' }).then((result) => {chainID = result;})
	
	//check if we are querying the correct chain first
	if(chainID == MyLibrary.network){//0x2a for Kovan testnet
		console.log(chainID);
		//Correct chain then hide & show buttons in anticipation
		$('.network_switch').css('display', 'none');//hide if succesful
					
		//REDUNDANT to check again but be thorough
		if (typeof ethereum !== 'undefined' || (typeof window.web3 !== 'undefined')) {
			
			var tokenAddress = MyLibrary.tokenAddress;//GUN contract address	
			var erc20Abi = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"type":"function"}];
			var tokenInst = new window.web3.eth.Contract(erc20Abi, tokenAddress);		
			
			//# 1  GET ACCOUNTS, IF LOCKED THEN SKIP
			try{
				var accounts = [];	
				var balance = 0	
				MyLibrary.shareholding = 0;
				//TOKEN DECIMALS
				await tokenInst.methods.decimals().call().then(function (decimals,error) {window.decimals = decimals;	});	
				await window.web3.eth.getAccounts().then(it=>{
					accounts = it;//array all account addresses
					account = it[0]; 
					MyLibrary.wallet = account;
					
					account = MyLibrary.wallet //"0x19849a002f826c7d492d35f41b4d748a2883b4a0";//delete this in prod
					console.log(accounts);
					
					//---------------------------------------------------//
					//**IF WALLET CONNECTED SHOW WALLET BALANCE
					if (accounts.length !== 0) {
						//if locked then hide the details bar and show connect button
						$('.network_switch').css('display', 'none');
						$('.wallet_connect').css('display', 'none');
						$('.waiting_init').css('display', 'none');
						$('.walletpur').css('display', 'inline-block');
						
						//You cannot get ERC20 token balance without using ABI & Contract address, unless its Ether balance
						tokenInst.methods.balanceOf(account).call().then(function (result,error) {
							var decimals = window.decimals;
							var balance = (result / Math.pow(10, decimals)).toFixed(2);
							MyLibrary.balance = balance;
							
							if (!error && result) {
								 var first = account.substring(0, 6);//get first chars
								 var last = account.slice(account.length - 3);//get last chars
								 var privatize = first+'..'+last;
								 //document.getElementById("wallet_id").innerHTML = privatize;
								 $('#wallet_id').empty().append(privatize);
								 //document.getElementById("wallet_balance").innerHTML = balance+' GUNS';
								 $('#wallet_balance').empty().append(balance+' $GUN');
								// document.getElementById("sect_holdings").innerHTML = balance+' GUNS';
								 $('#sect_holdings').empty().append(balance+' $GUN');
								 $(".dot").css({'background-color': 'rgb(39, 174, 96)'});
							 }
							  else {
								console.error(error);
								swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "Issue: "+error.message});
							  }//CLOSE IF NO ERROR
						});//CLOSE TOKENINST
						
						//SHARE HOLDING : using total supply coz all our tokens will circulate
						tokenInst.methods.totalSupply().call().then(function (result,error) { //CIRCULATING SUPPLY IF WE LOCK TOKENS
							if (error) {
							  console.log(error)
							} else {
								var decimals = window.decimals;
								var totalsupply = result / Math.pow(10, decimals);
								var balance = MyLibrary.balance;
								var shareholding = balance / totalsupply;     
								MyLibrary.shareholding = shareholding;
								var popthis = MyLibrary.shareholding;
								//alert(popthis);
								console.log('totalsupply:'+totalsupply);console.log('share of T.supply:'+popthis);
								currentShare(shareholding);
							}
						});
						
						//CALCULATE REWARDS DUE(to wallet) IN ETH
						async function currentShare(shareholding){
							if (accounts.length !== 0) {
								// A- REWARDS DUE
								var tokenAddress = MyLibrary.tokenAddress;
								//alert(tokenAddress);
								await web3.eth.getBalance(tokenAddress, function(error, result) {//not token balance, ETH balance on wallet
								  if (error) {
									  console.log(error)
								  } else {
									  var contractEthBalance = web3.utils.fromWei(result, "ether");
									  var reward_due = parseFloat(shareholding * 105);
									 // document.getElementById("sect_due").innerHTML = reward_due.toFixed(10) + " ETH";
									  $('#sect_due').empty().append(reward_due.toFixed(10) + ' ETH');
								  }
								});
							}else{//if unlocked
								//document.getElementById("sect_due").innerHTML = "*enable permissions";
								$('#sect_due').empty().append('*enable permissions');
							}
						}
					
					}else {//ACCOUNTS = ZERO
						//Get permissions
						//reqConnect();
						//document.getElementById("sect_holdings").innerHTML = '*enable permissions'; // holdings should say unlock wallet
						$('#sect_holdings').empty().append('*enable permissions');
						//if locked then hide the details bar and show connect button
						$('.waiting_init').css('display', 'none'); 
						$('.walletpur').css('display', 'none');
						$('.wallet_connect').css('display', 'inline-block');
					}
				});//close await
				
				
			}catch(error){//close try/catch
				console.log("Error: "+error);
			}//close catch
			
			//#2 SHOULD FETCH EVEN WITH LOCKED WALLET
			try{
				/*=== BACK UP API BASED PRICE CHECK 
				async function backupprice(){
					//Get token price on PancakeSwap v2 BSC
					const options = {
					  address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",//WETH Addy
					  chain: "eth",
					  exchange: "sushiswap"
					};
					const priceObj = await Moralis.Web3API.token.getTokenPrice(options);
					const priceraw = priceObj.usdPrice;
					const price = Number(priceraw.toFixed(2))
					window.ETHUSDprice = price;
					//console.log(price);
				}*/
				// A) ETHUSD PRICE
				var UniswapUSDCETH_LP = MyLibrary.UniswapUSDCETH_LP//for calc eth prices: UniswapUSDCETH_LP address
				var uniswapAbi = [{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]; // get the abi from https://etherscan.io/address/0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc#code
				
				if (UniswapUSDCETH_LP) {
					var pair = new window.web3.eth.Contract(uniswapAbi, UniswapUSDCETH_LP);
					pair.methods.getReserves().call(function( err,reserves) {
						if (err) {  
							console.log(error);
							//backupprice();//run Moralis Backup - API based check
						  } else {
							console.log("Pair Reserves: ", reserves);
							window.ETHUSDprice = Number(reserves._reserve0) / Number(reserves._reserve1) * 1e12;
						  }
					})
				}//close if

				// B) TOKEN BALANCE LIQUIDITY POOL
				const liquidity_pool_addy = MyLibrary.liquidity_pool_addy;//pool for token we want to query GUN token balance
				await tokenInst.methods.balanceOf(liquidity_pool_addy).call().then(function (result,error) {//GUN BALANCE
				  if (error) {
					  console.log(error)
				  } else {
					  var decimals = window.decimals;
					  window.poolToken_bal = result / Math.pow(10, decimals);
					  console.log("LP token balance: "+window.poolToken_bal);
				  }
				});

				// C) WETH BALANCE LIQUIDITY POOL 
				window.poolWeth_bal = 0;
				var contractAddress = MyLibrary.wethAddress//WETH contract address			
				var ABI = [{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"type":"function"}];
				var wethInst = new window.web3.eth.Contract(ABI, contractAddress);
				await wethInst.methods.balanceOf(liquidity_pool_addy).call().then(function (result,error) {//WETH BALANCE
				  if (error) { 
					console.log(error)
				  } else {
					  var poolWeth_bal = web3.utils.fromWei(result, "ether");
					  var poolWeth_bal = parseFloat(poolWeth_bal);
					  window.poolWeth_bal = poolWeth_bal.toFixed(10);
					  console.log("LP WETH balance: "+window.poolWeth_bal);
				  }
				});//close await

				 // D) FETCH UNISWAP TRADES FOR CONTRACT - FROM A CERTAIN DATE
				 // - MOVED FROM HERE - import pastTxHistory.js file to click and load transactions on demand 
				
			}catch(error){//close try/catch
				console.log("Metamask Locked");
			}//close catch
				
			// F) CALCULATE PRICES
			//PERFOMED HERE IN AWAIT
			var circ_supply = MyLibrary.circ_supply; //Or more prudently: totalSupply - locked | zero addy  
			var poolWeth_bal = window.poolWeth_bal;
			var poolToken_bal = window.poolToken_bal;
			var token_wethv = poolWeth_bal / poolToken_bal;
				var token_wethvalue = token_wethv.toFixed(10); //fix to decimal number not scientific - directly
			var token_usdvalue = token_wethvalue * window.ETHUSDprice;
				var str_price = token_usdvalue.toString();
				var tokenprice = Number(str_price.slice(0, 10));//trim to max 10 digits
			var mcap = token_usdvalue * circ_supply;
				var marketcap = Number(mcap.toFixed(2));//fix to decimal number not scientific
			var liq = poolWeth_bal * window.ETHUSDprice * 2; //TOTAL LIQUIDITY x2 WETH
				var liquidity = parseInt(liq.toFixed(2));
			
			console.log("Token Price weth: "+token_wethvalue);
			console.log("Token Price USD: "+token_usdvalue);
			//=================================================================================================================
			// WE START ASSIGNING, THE FIRST ARE DEPENDED ON HAVING ETH PRICE, SO ON ERROR THEY DONT SHOW. THELATER SHOULD DISPLAY REGARDLESS
			if (liquidity === parseInt(liquidity, 10)){//since liquidity uses both 2 points of possible failure: ETHprice & WETH balance
				//ASSIGN MCAP
				//document.getElementById("mbcard_cap").innerHTML = "$" + marketcap.toLocaleString();//toLocaleString adds commas
				$("#mbcard_cap").empty().append('$'+marketcap.toLocaleString());
				//ASSIGN LIQ
				//document.getElementById("mbcard_liq").innerHTML = "$" + liquidity.toLocaleString();
				$("#mbcard_liq").empty().append('$'+liquidity.toLocaleString());
				//ASSIGN USD PRICE
				//document.getElementById("usdprice").innerHTML = "$" + tokenprice + " USD";
				$("#usdprice").empty().append('$'+tokenprice+' USD');
				
			}else{
				//no updates its not a number
			}
			//===============
			//ASSIGN NVL - nvl - net value lost, is total sells - net buy backs its a number in WETH +ive or -ve
			
		}else{//close type of ethereum
			console.log('Install Metamask');
		}
	}else if(chainID !== MyLibrary.network){//0x2a for Kovan testnet
		console.log('wrong chain');
		//hide wallet connect button parent
		$('.walletpur').css('display', 'none');
		$('.wallet_connect').css('display', 'none');
		$('.waiting_init').css('display', 'none');
		//show "switch network" button
		$('.network_switch').css('display', 'inline-block');
	}
	
	//#######################################################################
	
}// close async function

// BUTTON INITIATED PROMPTS
// CONNECT WALLET
function reqConnect() {
  ethereum
	.request({
	  method: 'wallet_requestPermissions',
	  params: [{ eth_accounts: {} }],
	})
	.then((permissions) => {
	  const accountsPermission = permissions.find(
		(permission) => permission.parentCapability === 'eth_accounts'
	  );
	  if (accountsPermission) {
		  window.disconnected = 0;//1 is true, 0 is false
		  console.log('eth_accounts permission successfully requested!  set: '+disconnected);
		  var disconnected = window.disconnected;
		  walletCheck(disconnected);//swicth buttons and fecth balances
	  }
	})
	.catch((error) => {
	  if (error.code === 4001) {
		// EIP-1193 userRejectedRequest error
		console.log('Permissions needed to continue.');
		swal({
			  title: "",
			  text: "Permissions needed on dashboard..",
			  type: "info",  //var alertTypes = ['error', 'warning', 'info', 'success', 'input', 'prompt'];
			  html: false,
						dangerMode: false,
						confirmButtonText: "try again",
						cancelButtonText: "cancel",
			  showConfirmButton: true,
			  showCancelButton: true,
			  timer: 4000,
			  animation: "slide-from-top"
			  
		},function(){//on confirm click
			console.log('fetch retry...');
			reqConnect();
		});//inner swal close
	  } else {
		console.error(error);
	  }
	});
}

//Pop up claims history
$(document).on('click', '#show_claims', function(e){
	console.log('fetching claims...');	
	var called_from = 'claim_hist_click';
	var output = MyLibrary.claims_result;
	var parsed_2 = JSON.parse(output);
	if(parsed_2.hasOwnProperty('error')){//click or call again after a min timeout
		console.log('error with result, retrying....');
		rewardsClaimed();	//get Alchemyto give us result so we update global obj MyLibrary with real values	
		
	}else{
		process_claims_todate(called_from,output);//process only from the global object value entered on the first query of rewardsClaimed()
	}
});

//Pop up buybacks history
$(document).on('click', '#show_buybacks', function(e){
		
	var bbs = 0;

	$.post('bank_draft.php',{'bbs': bbs}, function(data) {
		
		var bbs = '<div class="bbs_case">'+data+'</div>';
		swal({
			title: "Buy Back History",
			text: bbs,
			html: true,
			showCancelButton: true,
			dangerMode: true,
			confirmButtonText: "Full",
			cancelButtonText: "Close",
			confirmButtonColor: "#683c2c",
			closeOnConfirm: true
			},function () {//on confirm click
					
					//open full page in new tab
	
		});//outer swal close
	}).fail(function(xhr, ajaxOptions, thrownError) { 
		 //alert any HTTP error
	});
	
});

//Claim Reflections
$(document).on('click', '#call_reflections', function(e){
	//double check if wallet unlocked
	if (accounts.length !== 0) {//check wallet from my Mylibrary.wallet as alternative
		//locked
		
	}else{
		//unlocked
		//if(window.shareholding >0){
			alert('passed');
			//call method using our token ABI..use method id hex instead for now, google how to
			var ABI = [{"inputs":[{"internalType":"address","name":"uniswapFactory","type":"address"},{"internalType":"address","name":"uniswapRouter","type":"address"},{"internalType":"address payable","name":"treasuryWallet","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"uint256","name":"tokens","type":"uint256"}],"name":"addLiquidity","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"addReflection","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addReflectionExcluded","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addTaxExcluded","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"accounts","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"name":"airdrop","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"claimDividend","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isBot","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isReflectionExcluded","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isTaxExcluded","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"removeBot","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"removeReflectionExcluded","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"removeTaxExcluded","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"maxTransfer","type":"uint256"}],"name":"setMaxTransfer","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"swapFees","type":"bool"}],"name":"setSwapFees","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"useSecondFees","type":"bool"}],"name":"setUseSecondFees","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"swapAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdrawAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];
			var tokenAddress = '0x167842ec4e42401a35d1445cf85E5AabfA845ef1';//GUN contract address	
			var tokenInst = new window.web3.eth.Contract(ABI, tokenAddress);
			var account = '0x9EbB4C9e810CEb88422303c96541a04117262235';
			tokenInst.methods.claimDividend(account).send().then(function (result,error) {
				if (!error && result) {
					 console.log(result);
				}else {
					console.log(error);
					swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "Issue: "+error.message});
				}//CLOSE IF NO ERROR
			});//CLOSE then
			
			
		//} //close shareholding check
	}
	
});
	
$(document).on('click','.wallet_connect',function(){
	// get permission to access accounts |
	//window.ethereum.enable(); | deprecated, https://eips.ethereum.org/EIPS/eip-1102
	//ethereum.enable under the hood, is just like wallet_requestPermissions. https://docs.metamask.io/guide/rpc-api.html#permissions
	reqConnect(); //request to connect wallet

});
//network switch
$(document).on('click','.network_switch',function(){ //switching to ETH mainnet
		
		switchNetwork();
		
		//CHECK FOR DAPP SUPPORT & PROMPT WALLET UNLOCK WINDOW
		async function switchNetwork() {
			// Check if MetaMask is installed
			 // MetaMask injects the global API into window.ethereum
			 if (window.ethereum) {
				  try {
					// check if the chain to connect to is installed
					await window.ethereum.request({
					  method: 'wallet_switchEthereumChain',
					  params: [{ chainId: '0x1' }], // chainId must be in hexadecimal numbers
					});
									
					//page reloads when network changes > loads waiting_init button > calls wallet check to know whc button to show
					
				  } catch (error) {
					// This error code indicates that the chain has not been added to MetaMask
					// if it is not, then install it into the user MetaMask
					if (error.code === 4902) {
					  try {
						await window.ethereum.request({
						  method: 'wallet_addEthereumChain',
						  params: [
							{
							  chainId: '0x1',
							  chainName: 'Ethereum Mainnet',
							  nativeCurrency: {
								  name: 'Ethereum',
								  symbol: 'ETH', // 2-6 characters long
								  decimals: 18
							},
								blockExplorerUrls: ['https://etherscan.io'],
								rpcUrls: ['https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
							},
						  ],
						});
						
						//added, now show connect button parent cont
						$('.network_switch').css('display', 'none');
						//show wallet connect button parent
						$('.walletpur').css('display', 'inline-block');
		
					  } catch (addError) {
						console.error(addError);
						$('.network_switch').css('display', 'inline-block');//show if unsuccesful
					  }
					}
					console.error(error);
					$('.network_switch').css('display', 'inline-block');//show if unsuccesful
				  }
				} else {
				  // if no window.ethereum then MetaMask is not installed
				  swal({title: "Hold on!",type: "error",confirmButtonColor: "#F27474",text: "MetaMask is not installed. Please consider installing it: https://metamask.io/download.html"});
				}
		}
});


//disconnect wallet click
$(document).on('click','#wallet_id',function(){
	
	if (window.ethereum) { // for modern DApps browser
		window.web3 = new Web3(window.ethereum);
	}else if (web3) { // for old DApps browser
		window.web3 = new Web3(web3.currentProvider);
	}
	
	if(window.web3!== 'undefined'){
		console.log('MetaMask is installed') ;   
		try {
			
			disconnectwallet();
			
		} catch (error) {//close try/catch
			console.error(error);
			swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "Issue: "+error.message});
		}
	}else{//close if (web3 defined
		console.log('Install metamask');
		swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "Install Metamask"});
	}
	
	async function disconnectwallet(){
		
		await window.web3.eth.getAccounts().then(it => {
				account = it[0]; 
				accounts = it;
			}); //our default account inside metamask
			
			if (accounts.length === 0) {
				console.log('MetaMask is locked');
				swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "Error: Metamask is locked"});
			}else {
				console.log('MetaMask is unlocked');
				
				//privatize it first
				var first = account.substring(0, 8);//get first 5 chars
				var last = account.slice(account.length - 5);//get last 5
				var privatize = first+'...'+last;
				 
				var disconnect = '<div class="stakesuccess"><span class="stakesuccessnotice"><p>Currently connected</p></span><span class="stakesuccessduration">'+privatize+'</span><span class="stakesuccessetherscan"><img src="img/external-link-symbol.svg" /><a target="_blank" href="https://etherscan.io/address/'+account+'">View on Etherscan</a></span></div><span id="discon"></span>';
				swal({
						title: "ERC20 Wallet:",
						text: disconnect,
						html: true,
						showCancelButton: true,
						dangerMode: true,
						confirmButtonText: "disconnect",
						cancelButtonText: "cancel",
						confirmButtonColor: "#F27474",
						closeOnConfirm: false
						},function () {//on confirm click
								
								document.getElementById('discon').click();
								
								//do a text input swal
								swal({
									  title: "wallet disconnected!",
									  text: privatize,
									  type: "success",
									  html: false,
									  showConfirmButton: true,
									  showCancelButton: false,
									  timer: 4000,
									  animation: "slide-from-top"
									  
								},function(){
									
								});//inner swal close
								
								
								
						});//outer swal close
				
			}//close account.length else
	
	}//close disconnectwallet
});//doc.onclick

//DISCONNECT : ACTUAL SESSION ENDING
$(document).on('click','#discon',function(){
	LockUp();
});

//ON LOCK ACCOUNT CLICK
async function LockUp(){
	console.log(accounts.length);
	accounts = [];//remove all accounts from dom. wait for reinitialise
	console.log(accounts.length);
	window.disconnected = 1;
	
	//fire wallet check to flash out address in elements
	var disconnected = window.disconnected;
	walletCheck(disconnected);
}//async function close

async function isMetaMaskConnected() {
	const {ethereum} = window;
	const accounts = await ethereum.request({method: 'eth_accounts'});
	return accounts && accounts.length > 0;
}


// TOGGLE MAIN WINDOWS
$(document).on('click','#sal_main',function(){
	$('#saloon_win').css('display', 'none');
	$('#main_win').css('display', 'block');
	$('#sal_main').css('border-color', '#FFF');
	$('#sal_deriv').css('border-color', '#363636');
	//toggle navs
	$('#sal_ul_main').css('display','block');
	$('#sal_ul_sal').css('display','none');
	$('#rrofficial').click();
});
// TOGGLE SALOON WINDOWS
$(document).on('click','#sal_deriv',function(){
	$('#main_win').css('display', 'none');
	$('#saloon_win').css('display', 'block');
	$('#sal_deriv').css('border-color', '#FFF');
	$('#sal_main').css('border-color', '#363636');
	//toggle navs
	$('#sal_ul_main').css('display','none');
	$('#sal_ul_sal').css('display','block');
	$('#suddendeath').click();
});
// TOGGLE SALOON CONTRACTS
$(document).on('click','#rrofficial',function(){
	$('#rrofficial').css('border-left-color', '#781310');
	$('#suddendeath').css('border-left-color', '#363636');
	$('#chainreaction').css('border-left-color', '#363636');
	$('#topholder').css('border-left-color', '#363636');
});
$(document).on('click','#suddendeath',function(){
	$('#screvealer1').css('display', 'block');
	$('#screvealer2').css('display', 'none');
	$('#screvealer3').css('display', 'none');
	$('#suddendeath').css('border-left-color', '#781310');
	$('#chainreaction').css('border-left-color', '#363636');
	$('#topholder').css('border-left-color', '#363636');
});
$(document).on('click','#topholder',function(){
	$('#screvealer1').css('display', 'none');
	$('#screvealer2').css('display', 'block');
	$('#screvealer3').css('display', 'none');
	$('#topholder').css('border-left-color', '#781310');
	$('#suddendeath').css('border-left-color', '#363636');
	$('#chainreaction').css('border-left-color', '#363636');
});
$(document).on('click','#chainreaction',function(){
	$('#screvealer1').css('display', 'none');
	$('#screvealer2').css('display', 'none');
	$('#screvealer3').css('display', 'block');
	$('#chainreaction').css('border-left-color', '#781310');
	$('#topholder').css('border-left-color', '#363636');
	$('#suddendeath').css('border-left-color', '#363636');
});

// FUCK BITCOIN AND ITS MARKET INFLUENCE. TO FREEDOM!