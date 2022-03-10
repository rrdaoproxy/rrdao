//UNIQUE TO BANK ONLY, home has its own separate file
async function nvlSellTxsJSON(key, src){
	return new Promise(function(resolve, reject) {
	// Creating a XHR object
	const xhr = new XMLHttpRequest();
	const url = "https://eth-mainnet.alchemyapi.io/v2/1W9ERTKJSE7IB6ydFCa3DVRgq20qCm2I";
	// open a connection
	xhr.open("POST", url, true);
	// Set the request header i.e. which type of content you are sending
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	// Create a state change callback
	xhr.onreadystatechange = async function () {
		if (xhr.readyState === 4 && xhr.status === 200) {
			//console.log(this.responseText);
			result = this.responseText;
			await process_txs_returned(result, src);
			resolve(SellTxsLibrary);//resolve - passback result, accessing this global array directly from dom gives us array whos index cant be accessed i.e. non numerical even though it is numerical, i dont know but just pass the array here
		}
	};	
	// Converting JSON data to string
	var fromBlock = '0x'+(14047841).toString(16);//to_hex.. from_hex = parseInt(hexString, 16);
	var limit = '0x'+(1000).toString(16);
	var wethContractAdd = MyLibrary.wethContractAdd;
	var to_wallet = MyLibrary.uniswapV2router//to V2 Router, from being LP addy
	var fromAddy = toAddy = MyLibrary.liquidity_pool_addy;//LP addy - eth is from LP in a sell, to in a buy tx
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

	// Sending data with the request
	xhr.send(data);
	xhr.onerror = reject;
	});//close new promise
}	

//Now Call The Transactions Fetching Function
window.paginationKey = 0;
window.TotalSold = 0;//first time
window.countTxs = 0;	
window.total_sells_outflow = 0; //clear sum for the txtype only on page load
window.SellTxsLibrary = []; // global trades array, we will feed objects into it

fetch_SellTxs();
function fetch_SellTxs(){
	var key = window.paginationKey;
	var src = 'sell';
	nvlSellTxsJSON(key, src).then(function (Sell_Txs_Array, error) {
		if(window.SellTxsError_nvl === false){//sell txs fetch was succesful - proceed to process
			//then fetch buys, set correct vars
			var parsed = JSON.stringify(Sell_Txs_Array);
			//console.log('sells array:'+parsed);
			TxsOutput(Sell_Txs_Array);
		}else{//sell txs fetch was unsuccesful, retry
			console.log('error fetching sell txs, retrying');
			window.SellTxsLibrary = [];
			fetch_SellTxs();//trades array is still empty
		}
	});
}
async function TxsOutput(Sell_Txs_Array){
	//This function repeats together wth the call to fetch more if paginationKey exists in "process_txs_returned" function..hence updates the NVL on the website during each fetch cycle
	if(window.paginationKey !== 0){//still fetching, wait....
	
	}else{
	await getBuyBacks().then(function(result) {//get buy backs infor
		console.log('Buy backs sum: '+result);
		var buybacks = result; 
		var totalBuyBacks = Number(buybacks.toFixed(3));
		//POST RESULT ON PAGE HERE
		var total_WETH_out = Number(window.total_sells_outflow.toFixed(3));
		var NVL_raw = total_WETH_out - totalBuyBacks; //total sells ever less the buy backs shows the gap in value							
		var NVL = NVL_raw.toFixed(2);	
		//PART 2 - NVL Ratio or Rebalance Bias. We want to cover all buy positions, even one bought at the top, 
		//to do this we assume the new buys are there for their own good not to replace the sellers lost liquidity. So we Buy every dip
		var rbb_ratio = 0;
		if(totalBuyBacks <= 0){
			var rbb_ratio = 0;
		}else{
			var rbb_ratio = (total_WETH_out / totalBuyBacks).toFixed(2); 
		}
		//'process_txs_returned' knows it has to pass final result to sendJSONtx
		var trades = Sell_Txs_Array;
		var number_of_txs = parseInt(trades.length);
		
		console.log('Final result ~ txs count: '+ number_of_txs);
		console.log('Gross sell weth outflow: '+ window.total_sells_outflow);
		
		//calculate rebalancing bias
		//max allowed is 2, minimum is 1. Below 1 means too much bias towards liq pool => channel funds to treasury
		//Above 2 means, too much bias to Treasury => channel funds to Liq pool
		//Calibration: Set to be as near to 1 as possible, or stay at 1.
		// If value = 1 ~ meter 100%, if value = 1.1 ~ meter 90%
		// 100 - (value * 100 - 100) %
		var blabla = 100 - (rbb_ratio * 100 - 100);

		if(blabla < 0){ //we are too far behind, but fix guage at red max only otherwise it disappears behind our card
			var blabla = 0;
		}else if(blabla > 100){
			var blabla = 100;
		}
		//Print results
		//document.getElementById("mbcard_nvl").innerHTML = NVL + " WETH";
		$("#mbcard_nvl").empty().append(NVL + " WETH");
		$('#meter_bar').css({'display': 'block', 'right' : blabla+'%'});//set style
		//document.getElementById("rbbias").innerHTML = NVL_ratio;
		$("#rbbias").empty().append(rbb_ratio);
		//Update BuyBacks Card
		$("#mbcard_bbs").empty().append(totalBuyBacks + " WETH");
	});
	}//close else paginationKey == 0 i.e. done fetching
}

function process_txs_returned(output,src){
	
	parsed = JSON.parse(output);
	//console.log(parsed.result.transfers);//at this point each array has object
	
	if(parsed.error){//error
		console.log('API error: '+parsed.error.code+', message: '+parsed.error.message);
		//wait 10 sseconds and retry, show message "taking longer than it should, 1 moment..."
		console.log('taking longer than it should, retrying in 5 sec...');
		//set error global
		window.SellTxsError_nvl = true;
		
	}else if(parsed.result){
		window.SellTxsError_nvl = false;
		
		var transfers_ = parsed.result.transfers;
		var number_of_transfers = parseInt(transfers_.length);
		if(number_of_transfers > 0){
			for (var i = 0; i < number_of_transfers; i++) {
				//console.log(transfers_[i].asset);console.log(transfers_[i].from);console.log(transfers_[i].value);
				var toAddress = transfers_[i].to;
				var fromAddress = transfers_[i].from;
				var lc_toAddress = toAddress.toLowerCase();
				var lc_fromAddress = fromAddress.toLowerCase();
				var _lc_LP = MyLibrary.liquidity_pool_addy.toLowerCase();
				var _lc_TA = MyLibrary.tokenAddress.toLowerCase();
			
				if(lc_fromAddress == _lc_LP && lc_toAddress !== _lc_TA){ //if its a sell
					var eth_paid = parseFloat((transfers_[i].value).toFixed(12));//max 11 digits after dot
					window.total_sells_outflow += eth_paid;//if sell keep total of sells, if buy keep total of buys
					window.SellTxsLibrary.push(transfers_[i]);//add objects into array
				}else{
					//skip it
				}
				//Once last item is processed, check for more
				//Call sendJson: if pagination key | if number_of_transfers = limit (1000)
				if(i == number_of_transfers-1){//since we loop from 0 not 1
					if(parsed.result.pageKey){//key exists so theres more
						console.log('last sell swapTx processed, but key exists...');
						console.log('current total sell WETH: '+window.total_sells_outflow);
						$("#NVLprocessing").show();
						var pageKey = parsed.result.pageKey;
						if(src == 'sell'){
							console.log('old sell key: '+window.paginationKey);
							window.paginationKey = pageKey;//update to continue where we left of
							console.log('new sell key: '+window.paginationKey);
						}
						//fetch more until no pagination key exists
						fetch_SellTxs();
						
					}else{//last item of batch and no pagenation key exists, final final output
						console.log('final '+src+' swapTx processed, end.');
						console.log('total '+src+' WETH: '+window.total_sells_outflow);
						window.paginationKey = 0;//reset pagination so "TxsOutput" function processes buybacks and output to page..works even with few Txs < 1000
						$("#NVLprocessing").hide();
						return SellTxsLibrary;//pass back array to calling function fetch_SellTxs()
					}
				}//close if	last item of batch		
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

//Buy Backs fetch
async function getBuyBacks(){
	return new Promise(function(resolve, reject) {
		var requesting = new XMLHttpRequest();
		var params = "nbb="+0;
		requesting.open('POST', 'bank_draft.php', true);
		//let server know the encoding we used for the request body
		requesting.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		requesting.setRequestHeader("Content-length", params.length);
		requesting.setRequestHeader("Connection", "close");
		//Call a function when the state changes.
		requesting.onreadystatechange = function() {
			
			if(requesting.readyState == 4 && requesting.status == 200) {
				//alert(requesting.responseText);
				var data = Number(requesting.responseText);
				var totalBuyBacks = Number(data.toFixed(10));
				
				if(data <= 0){
					var buybacks = 0;
				}else{
					var buybacks = totalBuyBacks; 
				}
				//Print results
				if(data >= 0){
					resolve(buybacks);
				}else{
					resolve(0);
				}
			}
		}	
		requesting.send(params);
		requesting.onerror = reject;
	});//close new promise
};// close processTrades function	

//Trades
// - Historical: alchemy_getAssetTransfers to fetch all trades from / to, separately, then reorder results by time in Javascript somehow. Limit to 50
// - Current trades: Notify api ADDRESS_ACTIVITY allows us to track erc2o transfers for as many addresses as we want
// {"app_id":"your-app_id","webhook_type":1,"webhook_url":"https://webhook.site/7bf2c41e-846e-45a7-8c17-556dd7f5103c"} webhook api request body