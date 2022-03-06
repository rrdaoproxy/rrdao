// JavaScript Document
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//IMPORTED BY BANK
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
	var limit = '0x'+(10).toString(16);
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
window.sellKey = 0;
window.buyKey = 0;
window.TotalSells = 0;//first time
window.TotalBuys = 0;
window.countMe = 0;	
window.MyTradesLibrary = []; // global trades array, we will feed objects into it

function fetchSells(){
	var key = window.sellKey;
	var src = 'sell';
	sendTxJSON(key, src).then(function (TradesArray, error) {//then fetch buys
		//then fetch buys, set correct vars
		var parsed = JSON.stringify(TradesArray);
		//console.log('sells array:'+parsed);
		fetchBuys(TradesArray);
	});
}
function fetchBuys(TradesArray){
	var key = window.buyKey;
	var src = 'buy';
	sendTxJSON(key, src).then(function (TradesArray, error) {//then process the whole array
		var parsed = JSON.stringify(TradesArray);
		//console.log('buys array:'+parsed);
		txsOutput(TradesArray);
	});
}

async function txsOutput(TradesArray){
	
	if(window.retry_fetching){clearTimeout( window.retry_fetching); console.log('retrying....'); }else{}
	var eth_usd = 0;
	await process_ethprice_().then(function(result,error) {//get eth price once not for every tx
		var eth_usd = result; 
		//'process_txs_todate' knows it has to pass final result to sendJSONtx
		//alternatively we could process trades list by accessing global array
		TradesArray.sort((a, b) => a.blockNum.localeCompare(b.blockNum)).reverse();//https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
		var trades = TradesArray;
		var number_of_txs = parseInt(trades.length);
		
		if(number_of_txs > 0){//alert('trades reached. tx count: '+number_of_txs);
			//fetch more button
			$('#fetching_trades').delay(5000).hide();
			$('#more_trades').delay(5000).show();
		
			for (var i = 0; i < number_of_txs; i++) {
				var toAddress = trades[i].to;
				var fromAddress = trades[i].from;
				var lc_toAddress = toAddress.toLowerCase();
				var lc_fromAddress = fromAddress.toLowerCase();
				var _lc_LP = MyLibrary.liquidity_pool_addy.toLowerCase();
				var _lc_TA = MyLibrary.tokenAddress.toLowerCase();
				
				if(lc_toAddress == _lc_LP){ //if its a buy
					var tradeObj = trades[i];
					var eth_value = parseFloat((tradeObj.value).toFixed(12));//max 11 digits after dot
					var tx_hash = trades[i].hash.slice(0, 12);//trim to max 10
					window.TotalBuys += eth_value;
					window.countMe += i;
					var usd_value = (eth_value * eth_usd);
					var pool_trade = '<li class="buytx"><span class="buy_tag">Buy: </span><span class="traded_in">'+ eth_value + ' ETH, </span><span class="traded_for">$' + usd_value + ' </span><span class="trade_tx"><a href="https://etherscan.io/tx/'+tradeObj.hash+'" target="_blank">TxHash: ' + tx_hash + '...</a></span></li>';
					$("#trade_list").prepend(pool_trade);//show everything				
				}
				if(lc_fromAddress == _lc_LP && lc_toAddress !== _lc_TA){ //if its a sell
					var tradeObj = trades[i];
					var eth_value = parseFloat((tradeObj.value).toFixed(12));//max 11 digits after dot
					window.TotalSells += eth_value;
					window.countMe += i;
					var usd_value = (eth_value * eth_usd);
					var pool_trade = '<li class="selltx"><span class="sell_tag">Sell: </span><span class="traded_in">'+ eth_value + ' ETH, </span><span class="traded_for">$' + usd_value + ' </span><span class="trade_tx"><a href="https://etherscan.io/tx/'+tradeObj.hash+'" target="_blank">TxHash: ' + tx_hash + '...</a></span></li>';
					$("#trade_list").prepend(pool_trade);//show everything		
				}
				//Once last item is processed, check for more
				//Call sendJson: if pagination key | if number_of_transfers = limit (1000)
				if(i == number_of_txs-1){//since we loop from 0 not 1
				var end_trades = '<li class="selltx">------------------------------------------------------------------------------------</li>';
					
					$("#trade_list").prepend(end_trades);//show everything	
					console.log('total buys: '+window.TotalBuys);
					console.log('total sells: '+window.TotalSells);
					console.log('count me A:'+window.MyTradesLibrary.length);//pass to 
					console.log('count me B:'+countMe);
					
				}//close if				
			}//close for
		}
	});//close await
}

function process_txs_todate(output,src){
	window.total_ethflow = 0; //clear sum for the txtype
	parsed = JSON.parse(output);
	//console.log(parsed.result.transfers);//at this point each array has object
	
	if(parsed.error){//error
		console.log('API error: '+parsed.error.code+', message: '+parsed.error.message);
		//wait 10 sseconds and retry, show message "taking longer than it should, 1 moment..."
		console.log('taking longer than it should, 1 moment as we retry...');
		//show retry bar
	}else if(parsed.result){
		//console.log('Result length ~ '+src+' trades: '+parsed.result.transfers.length);
		
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
						console.log('we found, current total '+src+' WETH: '+window.total_ethflow);
						console.log('last '+src+' swapTx processed, but key exists...');
						var pageKey = parsed.result.pageKey;
						if(src == 'sell'){
							//console.log('old sell key: '+window.sellKey);
							window.sellKey = pageKey;//update to continue where we left of
							//console.log('new sell key: '+window.sellKey);
						}
						if(src == 'buy'){
							//console.log('old buy key: '+window.buyKey);
							window.buyKey = pageKey;//update to continue where we left of
							//console.log('new buy key: '+window.buyKey);
						}						
					}else{//there isnt more
						console.log('we found, final '+src+' swapTx processed, end.');
						console.log('we found, total '+src+' WETH: '+window.total_ethflow);
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