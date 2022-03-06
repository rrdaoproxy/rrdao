// JavaScript Document
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//INITIALIZE
window.MyLibrary = {"wallet":"0x19849a002f826c7d492d35f41b4d748a2883b4a0"}; // global Object container; don't use var
MyLibrary.balance = 0;
MyLibrary.circ_supply  = 900000000000;
MyLibrary.wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';//WETH contract address
MyLibrary.liquidity_pool_addy = '0x045803b337e55B3a377dB7b3523f21c334a8285b';//pool for token we want to query GUN token balance
MyLibrary.tokenAddress = '0x5b4e9a810321e168989802474f689269ec442681';//GUN contract address	
MyLibrary.UniswapUSDCETH_LP = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";//for calc eth prices: UniswapUSDCETH_LP address
MyLibrary.usdcContractAdd = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";//for calc usd prices
MyLibrary.wethContractAdd = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";//weth contract address for alchemy getassetprices
MyLibrary.uniswapV2router = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";//alchemy's 'to' address, uniswap V2 Router


/////// FETCH TOKEN INFO using API, consider using Covalent api
TokenInfo_Erc20();

async function TokenInfo_Erc20(){	
		
	console.log("fetching information....");
	var request = new XMLHttpRequest()
	request.open('GET', 'https://api.bloxy.info/token/token_stat?token='+MyLibrary.tokenAddress+'&key=ACCsivR8oDy4x&format=structure', true)
	request.onload = function () {
	  // Begin accessing JSON data here
	  var data = JSON.parse(this.response);//create Json Obj

	  if(typeof data[0].first_transfer == "undefined"){// check for error property in response //if(typeof Obj.error == "undefined"){   //if(Obj.hasOwnProperty('error')){		//if(typeof data[0].error){
		  console.log(data[0]);
		  console.log('Issue with remote API server. Contact team!');
		  	//do a text input swal
			
			swal({
				title: "Metrics fetch error",
				text: "Issue with remote API server. Contact team!",
				html: true,
				showCancelButton: true,
				dangerMode: true,
				confirmButtonText: "try again",
				cancelButtonText: "cancel",
				confirmButtonColor: "#F27474",
				closeOnConfirm: true
				},function () {//on confirm click
						console.log('fetch retry...');
						TokenInfo_Erc20();
				});//outer swal close
							
	  }else{// no error property in response
	  console.log(data[0]);
	  		$('.loadstatTD').hide(); //now hide
			
		  if (request.status >= 200 && request.status < 400) {//only fails if there is no connection, hence error check of responce message above us
			  //update contract addy
				document.getElementById("contr_addy").innerHTML = data[0].address;
				
			  //update table
				var maprowN = document.getElementById("mapN").insertCell(1);
				maprowN.innerHTML = '<td class="mapvalue">'+data[0].name+' ('+data[0].symbol+')</td>';
				
				var supply_raw = data[0].circulating_supply;
				var supply_raw = supply_raw.toFixed(3).slice(0,-1); //num.slice(0, (num.indexOf("."))+3); //trim to 2 decimals
				var total_supply = parseFloat(supply_raw).toLocaleString();// add commas
				var maprowTS = document.getElementById("mapTS").insertCell(1);
				maprowTS.innerHTML = '<td class="mapvalue">'+total_supply+'</td>';
				
				var circ_supply = supply_raw;
				var circulating_supply = parseFloat(circ_supply).toLocaleString();// add commas
				var maprowTS = document.getElementById("mapCS").insertCell(1);
				maprowTS.innerHTML = '<td class="mapvalue">'+circulating_supply+'</td>';
				
				var holders = data[0].holders_count;
				var holders = parseFloat(holders).toLocaleString();//add commas
				var maprowH = document.getElementById("mapH").insertCell(1);
				maprowH.innerHTML = '<td class="mapvalue">'+holders+'</td>';//holders maintain array, check acc balance after each sell, to update
				
				var reflections = 0;//reflections maintain sum
				var maprowR = document.getElementById("mapR").insertCell(1);
				maprowR.innerHTML = '<td class="mapvalue">'+reflections+'</td>';
				
				var treasury = 0;//treasury maintain sum
				var maprowTW = document.getElementById("mapTW").insertCell(1);
				maprowTW.innerHTML = '<td class="mapvalue">'+treasury+'</td>';
		  } else {
			console.log('error')
		  }
	  }
	}//close request
	request.send();
}//close async function

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
			  
			  if (accounts.length === 0) {
				// MetaMask is locked or the user has not connected any accounts
				console.log('Please connect to MetaMask.');
			  } else if (accounts[0] !== currentAccount) {
				window.currentAccount = accounts[0];
				// Do any other work!
				alert(currentAccount);
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
				if(networkId !== "0x1"){
					console.log('reading other chain: '+networkId);
					//if locked then hide the details bar and show connect button
					$('.wallet_connect').css('display', 'none');
					$('.walletpur').css('display', 'none');
					$('.network_switch').css('display', 'inline-block');
				}else if(networkId == "0x1"){
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
}, 30000);
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
		document.getElementById("blocknumber").innerHTML = '<a href="https://etherscan.io/block/'+block+'" target="_blank">'+block+'</a>';
		});
	} catch (error) {//close try/catch
		console.error(error);
		swal({title: "Offline",type: "error",confirmButtonColor: "#F27474",text: error});
		//change dot color
		$(".dot").css({'background-color': '#ec0624'});
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
	if(chainID == "0x1"){//eth chain
		console.log(chainID);
		//Correct chain then hide & show buttons in anticipation
		$('.network_switch').css('display', 'none');//hide if succesful
					
		//REDUNDANT to check again but be thorough
		if (typeof ethereum !== 'undefined' || (typeof window.web3 !== 'undefined')) {
			
			var tokenAddress = MyLibrary.tokenAddress;//USDT contract address			
			var erc20Abi = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"type":"function"}];
			var tokenInst = new window.web3.eth.Contract(erc20Abi, tokenAddress);
			
			// ||||| GET TOKEN DECIMALS
			try{
				await tokenInst.methods.decimals().call().then(function (decimals,error) {
					window.decimals = decimals;//ABI utilising calls need window. to globalise vars						
				});//CLOSE TOKENINST					
			} catch (error) {//close try/catch
				console.log(error); 
			}			
			
			// ||||  GET ACCOUNTS, IF LOCKED THEN SKIP
			try{		
				await window.web3.eth.getAccounts().then(it=>{
					account = it[0]; 
					accounts = it;//result is all account addresses
					console.log(accounts); 
					
					//---------------------------------------------------//
					//**IF WALLET CONNECTED SHOW WALLET BALANCE
					if (accounts.length !== 0) {
						//if locked then hide the details bar and show connect button
						$('.network_switch').css('display', 'none');
						$('.wallet_connect').css('display', 'none');
						$('.waiting_init').css('display', 'none');
						$('.walletpur').css('display', 'inline-block');
						
						//in web3 You cannot get ERC20 token balance without using ABI & Contract address, unless its Ether balance
						tokenInst.methods.balanceOf(account).call().then(function (result,error) {
							var decimals = window.decimals; //USDT decimal is 6
							var balance = result / Math.pow(10, decimals);  
							
							if (!error && result) {
								 //update account balance
								 document.getElementById("wallet_balance").innerHTML = balance+' USD';
								 //change dot color
								 $(".dot").css({'background-color': 'rgb(39, 174, 96)'});
								 //update wallet address, privatize it first
								 var first = account.substring(0, 6);//get first chars
								 var last = account.slice(account.length - 3);//get last chars
								 var privatize = first+'....'+last;
								 document.getElementById("wallet_id").innerHTML = privatize;
							  }
							  else {
								console.error(error);
								swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "Issue: "+error.message});
							  }//CLOSE IF NO ERROR
							  return false;
						});//CLOSE TOKENINST
					
					}else {
						//if locked then hide the details bar and show connect button
						$('.waiting_init').css('display', 'none');
						$('.walletpur').css('display', 'none');
						$('.wallet_connect').css('display', 'inline-block');
						
					}
				});//close try
			}catch(error){//close try/catch
				console.log("Metamask Locked");
			
			}//close catch
		}else{//close type of
			console.log('Install Metamask');
		}
	}else if(chainID !== "0x1"){//wrong network
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
//connect wallet click
$(document).on('click','.wallet_connect',function(){
	// get permission to access accounts |
	//window.ethereum.enable(); | deprecated, https://eips.ethereum.org/EIPS/eip-1102
	//ethereum.enable under the hood, is just like wallet_requestPermissions. https://docs.metamask.io/guide/rpc-api.html#permissions
	
	reqConnect(); //request to connect wallet
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
	
/*	async function reqAccounts(){
		try {
			// Request account access if needed
			const accounts = await ethereum.send('eth_requestAccounts');
			// Accounts now exposed, use them
			ethereum.send('eth_sendTransaction', { from: accounts[0], })
		} catch (error) {
			// User denied account access
			alert('Consider granting access for full use of Dapp');
			
			//show connect button
		}
	}*/
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


//#############################################
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

//Copy Contract Addy
function CopyToClipboard(id){
    var r = document.createRange();
    r.selectNode(document.getElementById(id));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(r);
    try {
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        console.log('Address copied! ' + r);
    } catch (err) {
        console.log('Unable to copy!');
    }
}
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
	$('#sal_main').css('box-shadow', 'inset 0 0.4px 3px 0 #FFF');
	$('#sal_deriv').css('box-shadow', 'none');
	//toggle contract navs
	$('#sal_ul_main').slideDown(300);
	$('#sal_ul_sal').slideUp(150);
	$('#rrofficial').click();
});
// TOGGLE SALOON WINDOWS
$(document).on('click','#sal_deriv',function(){
	$('#main_win').css('display', 'none');
	$('#saloon_win').css('display', 'block');
	$('#sal_deriv').css('box-shadow', 'inset 0 0.4px 3px 0 #FFF');
	$('#sal_main').css('box-shadow', 'none');
	//toggle contract navs
	$('#sal_ul_main').slideUp(150);
	$('#sal_ul_sal').slideDown(300)
	$('#suddendeath').click();
});
// TOGGLE SALOON CONTRACTS
$(document).on('click','#rrofficial',function(){
	$('#rrofficial').css('border-left-color', '#683c2c');
	$('#suddendeath').css('border-left-color', '#363636');
	$('#chainreaction').css('border-left-color', '#363636');
	$('#topholder').css('border-left-color', '#363636');
});
$(document).on('click','#suddendeath',function(){
	$('#screvealer1').css('display', 'block');
	$('#screvealer2').css('display', 'none');
	$('#screvealer3').css('display', 'none');
	$('#suddendeath').css('border-left-color', '#683c2c');
	$('#chainreaction').css('border-left-color', '#363636');
	$('#topholder').css('border-left-color', '#363636');
});
$(document).on('click','#topholder',function(){
	$('#screvealer1').css('display', 'none');
	$('#screvealer2').css('display', 'block');
	$('#screvealer3').css('display', 'none');
	$('#topholder').css('border-left-color', '#683c2c');
	$('#suddendeath').css('border-left-color', '#363636');
	$('#chainreaction').css('border-left-color', '#363636');
});
$(document).on('click','#chainreaction',function(){
	$('#screvealer1').css('display', 'none');
	$('#screvealer2').css('display', 'none');
	$('#screvealer3').css('display', 'block');
	$('#chainreaction').css('border-left-color', '#683c2c');
	$('#topholder').css('border-left-color', '#363636');
	$('#suddendeath').css('border-left-color', '#363636');
});

//	SALOON MENU FUNCTIONS
//	LETS USE SIMPLER STYLING METHOD FOR THE SALOON FUNCTIONS
$(document).on('click', '.sn_contracts', function(e){
	$('.windows_shift').css('display', 'none'); //reset window
	$('#saloon_win').css('display', 'block');//show saloon window
	
	$('#sal_ul_main').slideUp(150);$('#sal_main').css('box-shadow', 'none');//reset
	$('#sal_ul_sal').slideUp(150);$('#sal_deriv').css('box-shadow', 'none');
	
	$('.sn_contracts').removeAttr('style'); //reset styles, TRY $(this).
	$(this).css({'box-shadow' : 'inset 0 0.3px 2.3px 0 #FFF'});//set stylebox-shadow: 
});

$(document).on('click', '#sn_c_rr', function(e){//click on first menu
	$('.windows_shift').css('display', 'none'); 
	$('#ruro_win').css('display', 'block');
});
$(document).on('click', '#sn_c_sb', function(e){	
	$('.windows_shift').css('display', 'none');
	$('#sharebid_win').css('display', 'block');
});
// RUSSIAN ROULETTE PAGE EXPAND
$(document).on('click', '#read_instructions', function(e){	
	$('.rr_instructions').slideDown(300);
});

// FUCK BITCOIN AND ITS MARKET INFLUENCE. TO FREEDOM!
