// JavaScript Document
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
/*INITIALIZE
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
MyLibrary.buyKey = 0;
MyLibrary.sellKey = 0;
*/
//Metamask ~ SET WEB3 PROVIDER
if (typeof window.ethereum !== 'undefined') {
	window.web3 = new Web3(window.ethereum);//this is correct standard from Metamask docs. Creates Object from Metamasks Ethereum proxy
}else if (typeof window.web3 !== 'undefined') { // for old DApps browser
	window.web3 = new Web3(window.web3.currentProvider);
	window.ethereum = window.web3.currentProvider;
} else if (typeof window.web3 == 'undefined' && typeof window.ethereum == 'undefined'){
	console.log('Metamask missing, update to Web3 capable browser');
	//swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "metamask missing, so is the full experience now..."});
}

//TESTING ALCHEMY	

async function sendTxJSON(key, src){
	return new Promise(function(resolve, reject) {
	// Creating a XHR object
	const xhr = new XMLHttpRequest();
	const url = "https://eth-mainnet.alchemyapi.io/v2/1W9ERTKJSE7IB6ydFCa3DVRgq20qCm2I";
	// open a connection
	xhr.open("POST", url, true);
	// Set the request header i.e. which type of content you are sending
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	// Create a state change callback
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4 && xhr.status === 200) {
			//console.log(this.responseText);
			result = this.responseText;
			process_txs_todate(result, src);
			resolve(MyTradesLibrary);//resolve - passback result, accessing this global array directly from dom gives us array whos index cant be accessed i.e. non numerical even though it is numerical, i dont know but just pass the array here
		}
	};	
	// Converting JSON data to string
	var fromBlock = '0x'+(14047841).toString(16);//to_hex.. from_hex = parseInt(hexString, 16);
	var limit = '0x'+(100).toString(16);
	var wethContractAdd = MyLibrary.wethContractAdd;
	var to_wallet = MyLibrary.uniswapV2router//to V2 Router, from being LP addy
	var fromAddy = toAddy = MyLibrary.liquidity_pool_addy;//LP addy - eth is from LP in a sell, to in a buy tx
	if(src == 'sell'){//sell
		var addy = fromAddy;
		//check key
		if(key == 0){
			var data = JSON.stringify({"jsonrpc": "2.0", "id": 0, "method": "alchemy_getAssetTransfers", "params": [ { "fromBlock": fromBlock, "toBlock": "latest", "fromAddress": addy, "contractAddresses": [ wethContractAdd ],
	"maxCount": limit, "excludeZeroValue": true, "category": [ "internal", "external", "token"] } ] });
		}else{//actual key
			var data = JSON.stringify({"jsonrpc": "2.0", "id": 0, "method": "alchemy_getAssetTransfers", "params": [ { "fromBlock": fromBlock, "toBlock": "latest", "fromAddress": addy, "contractAddresses": [ wethContractAdd ],
	"maxCount": limit, "pageKey": key, "excludeZeroValue": true, "category": [ "internal", "external", "token"] } ] });
			console.log('key continued fetch');
		}
	}else if(src == 'buy'){//buy
		var addy = toAddy;//doesnt really change but we've changed addDirection
		//check key
		if(key == 0){
			var data = JSON.stringify({"jsonrpc": "2.0", "id": 0, "method": "alchemy_getAssetTransfers", "params": [ { "fromBlock": fromBlock, "toBlock": "latest", "toAddress": addy, "contractAddresses": [ wethContractAdd ],
	"maxCount": limit, "excludeZeroValue": true, "category": [ "internal", "external", "token"] } ] });
		}else{//actual key
			var data = JSON.stringify({"jsonrpc": "2.0", "id": 0, "method": "alchemy_getAssetTransfers", "params": [ { "fromBlock": fromBlock, "toBlock": "latest", "toAddress": addy, "contractAddresses": [ wethContractAdd ],
	"maxCount": limit, "pageKey": key, "excludeZeroValue": true, "category": [ "internal", "external", "token"] } ] });
			console.log('key continued fetch');
		}
	}
	// Sending data with the request
	xhr.send(data);
	xhr.onerror = reject;
	});//close new promise
}	

//Now Call The Transactions Fetching Function
window.TotalSells = 0;//first time
window.TotalBuys = 0;
window.countMe = 0;	
window.MyTradesLibrary = []; // global trades array, we will feed objects into it

function fetchSells(){
	window.MyTradesLibrary = [];//prep for next round
	console.log('scrubbing..');
	if(window.sellsRetry){clearTimeout( window.sellsRetry); console.log('retrying sells....'); }else{}
	var key = MyLibrary.sellKey;
	var src = 'sell';
	sendTxJSON(key, src).then(function (TradesArray, error) {//then fetch buys
		if(window.SellTxsError){//error
			window.sellsRetry = setInterval( function() {
				fetchSells();		
			}, 5000);
			alert('error with sells');
		}else{
			//then fetch buys, set correct vars
			var parsed = JSON.stringify(TradesArray);
			//console.log('sells array:'+parsed);
			fetchBuys();
		}
	});
}
function fetchBuys(){
	if(window.buysRetry){clearTimeout( window.buysRetry); console.log('retrying buys....'); }else{}
	var key = MyLibrary.buyKey;
	var src = 'buy';
	sendTxJSON(key, src).then(function (TradesArray, error) {//then process the whole array
		var arrayNow = window.MyTradesLibrary;
		console.log('array integrity: '+arrayNow.length+' vs '+TradesArray.length);
		if(window.BuyTxsError){//error
			window.buysRetry = setInterval( function(arrayNow) {
				fetchBuys(arrayNow);
			}, 5000);
			alert('error with buys');
		}else{
			var parsed = JSON.stringify(TradesArray);
			//console.log('buys array:'+parsed);
			txsOutput(TradesArray);
		}
	});
}

async function txsOutput(TradesArray){
	
	if(window.retry_fetching){clearTimeout( window.retry_fetching); console.log('retrying....'); }else{}
	var eth_usd = 0;
	await process_ethprice_().then(function(result,error) {//get eth price once not for every tx
		var eth_usd = result; 
		//'process_txs_todate' knows it has to pass final result to sendJSONtx
		//alternatively we could process trades list by accessing global array
		TradesArray.sort((a, b) => a.blockNum.localeCompare(b.blockNum));//.reverse();//https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
		var trades = TradesArray;
		var number_of_txs = parseInt(trades.length);
		
		if(number_of_txs > 0){//alert('trades reached. tx count: '+number_of_txs);
			//fetch more button
			$('#fetching_trades').delay(1000).hide();
			$('#more_trades').delay(2000).show();
		
			for (var i = 0; i < number_of_txs; i++) {
				var toAddress = trades[i].to;
				var fromAddress = trades[i].from;
				var lc_toAddress = toAddress.toLowerCase();
				var lc_fromAddress = fromAddress.toLowerCase();
				var _lc_LP = MyLibrary.liquidity_pool_addy.toLowerCase();
				var _lc_TA = MyLibrary.tokenAddress.toLowerCase();
				
				//trade figures
				var tx_hash = trades[i].hash.slice(0, 12);//trim to max 10
				var tradeObj = trades[i];
				var eth_value = parseFloat((tradeObj.value).toFixed(8));//max 11 digits after dot
				var usd_value = (eth_value * eth_usd).toFixed(2);
				
				if(lc_toAddress == _lc_LP){ //if its a buy
					window.TotalBuys += eth_value;
					window.countMe += i;
					var pool_trade = '<li class="buytx"><div class="tdetails"><span class="buy_tag">Buy: </span><span class="traded_in">'+ eth_value + ' ETH, </span><span class="traded_for">$' + usd_value + ' </span></div><span class="trade_tx"><a href="https://etherscan.io/tx/'+tradeObj.hash+'" target="_blank">TxHash: ' + tx_hash + '...</a></span></li>';
					$("#trade_list").append(pool_trade);//show everything				
				}
				if(lc_fromAddress == _lc_LP && lc_toAddress !== _lc_TA){ //if its a sell
					window.TotalSells += eth_value;
					window.countMe += i;
					var pool_trade = '<li class="selltx"><div class="tdetails"><span class="sell_tag">Sell: </span><span class="traded_in">'+ eth_value + ' ETH, </span><span class="traded_for">$' + usd_value + ' </span></div><span class="trade_tx"><a href="https://etherscan.io/tx/'+tradeObj.hash+'" target="_blank">TxHash: ' + tx_hash + '...</a></span></li>';
					$("#trade_list").append(pool_trade);//show everything		
				}
				//Once last item is processed, check for more
				//Call sendJson: if pagination key | if number_of_transfers = limit (1000)
				if(i == number_of_txs-1){//since we loop from 0 not 1
					console.log('total buys: '+window.TotalBuys);
					console.log('total sells: '+window.TotalSells);
					console.log('count array length ~ A:'+window.MyTradesLibrary.length);//pass to 
					console.log('count txs in array ~ B:'+countMe);
					
					var end_trades = '<li style="text-align:center;justify-content: space-evenly; overflow:hidden;">----------------------------------------</li>';
					$("#trade_list").append(end_trades);//show everything
					
				}//close if				
			}//close for
		}
	});//close await
}

function process_txs_todate(output,src){
	
	window.total_ethflow = 0; //clear sum for the txtype
	var parsed = JSON.parse(output);
	
	if(parsed.error){//error
		console.log('API error: '+parsed.error.code+', message: '+parsed.error.message);
		//wait 10 sseconds and retry, show message "taking longer than it should, 1 moment..."
		console.log('taking longer than it should, 1 moment as we retry...');
		//reset buttons for a refetch
		$("#more_trades,#fetching_trades").hide();
		$("#fetch_trades").show();
		if(src == 'sell'){
			window.SellTxsError = true;
		}else{
			window.BuyTxsError = true;
		}
		return MyTradesLibrary;//pass back array to calling function sendTxJSON() as it is now
		
	}else if(parsed.result){
		var trans_array = parsed.result.transfers;
		console.log(trans_array);//at this point each array has object
		var source = src;
		console.log('Result length ~ '+source+' trades: '+parsed.result.transfers.length);
		if(source == 'sell'){
			window.SellTxsError = false;//clear error boolean so sendTxJSON.then() knows to proceed or not
		}else{
			window.BuyTxsError = false;
		}
		var transfers_ = parsed.result.transfers;
		var number_of_transfers = parseInt(transfers_.length);
		if(number_of_transfers > 0){
			for (var i = 0; i < number_of_transfers; i++) {
				//console.log(transfers_[i].asset);console.log(transfers_[i].from);console.log(transfers_[i].value);
				if(transfers_[i].asset == "WETH"){ 
					var eth_paid = parseFloat((transfers_[i].value).toFixed(12));//max 11 digits after dot
					window.total_ethflow += eth_paid;//if sell keep total of sells, if buy keep total of buys
					window.MyTradesLibrary.push(transfers_[i]);//add objects into array
				}else{
					//skip it
				}
				//Once last item is processed, check for more
				//Call sendJson: if pagination key | if number_of_transfers = limit (1000)
				if(i == number_of_transfers-1){//since we loop from 0 not 1
					if(parsed.result.pageKey){//key exists so theres more
						console.log(''+source+'s found, current total WETH: '+window.total_ethflow);
						console.log('Batch complete ('+source+'), more exists...');
						$("#fetch_trades,#fetching_trades").hide();
						$("#more_trades").show();
						var pageKey = parsed.result.pageKey;
						if(source == 'sell'){
							console.log('old sell key: '+MyLibrary.sellKey);
							MyLibrary.sellKey = pageKey;//update to continue where we left of
							console.log('new sell key: '+MyLibrary.sellKey);
						}
						if(source == 'buy'){
							console.log('old buy key: '+MyLibrary.buyKey);
							MyLibrary.buyKey = pageKey;//update to continue where we left of
							console.log('new buy key: '+MyLibrary.buyKey);
						}						
					}else{//there isnt more
						console.log('======>End. Total '+source+' WETH: '+window.total_ethflow);
						$('#more_trades, #fetching_trades, #fetch_trades').hide();//hide everything
						return MyTradesLibrary;//pass back array to calling function sendTxJSON()
					}
				}//close if				
			}//close for
		}else{
			//no claims yet
			console.log('Empty result, length: '+parsed.result.transfers.length);
		}
	}//close no error else
}

//=== RESERVES BASED PRICE CHECK 
async function process_ethprice_(){
	return new Promise(function(resolve, reject) {
		// A) ETHUSD PRICE
		var UniswapUSDCETH_LP = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";//for calc eth prices: UniswapUSDCETH_LP address
		var uniswapAbi = [{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]; // get the abi from https://etherscan.io/address/0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc#code
		
		if (UniswapUSDCETH_LP) {
			var pair = new window.web3.eth.Contract(uniswapAbi, UniswapUSDCETH_LP);
			pair.methods.getReserves().call(function( err,reserves) {
				if (err) { 
					console.log(error);
				  } else {
					console.log("Pair Reserves: ", reserves);
					var ETHUSDprice = Number(reserves._reserve0) / Number(reserves._reserve1) * 1e12;
					resolve(ETHUSDprice);
				  }
			})
		}//close if
	});//close new promise
}

$(document).on('click', '#fetch_trades', function(e){
	fetchSells();//fetch again
	
	$('#more_trades, #fetch_trades').hide();
	$('#fetching_trades').show();
});
$(document).on('click', '#more_trades', function(e){
	window.MyTradesLibrary = []; // clear global trades array
	fetchSells();//fetch again
	
	$('#more_trades').hide();
	$('#fetching_trades').show();
});

//Trades
// - Historical: alchemy_getAssetTransfers to fetch all trades from / to, separately, then reorder results by time in Javascript somehow. Limit to 50
// - Current trades: Notify api ADDRESS_ACTIVITY allows us to track erc2o transfers for as many addresses as we want
// {"app_id":"your-app_id","webhook_type":1,"webhook_url":"https://webhook.site/7bf2c41e-846e-45a7-8c17-556dd7f5103c"} webhook api request body