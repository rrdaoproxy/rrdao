// JavaScript Document
$(document).ready(function() {
	$(document).on('click','.reset',function(){
		var privatize = '<div class="spin">Spin</div><div class="reset">Reset</div><div class="gun_holder"><div class="cylinder_cont"><div id="cylinder_outer" class="loader_wait"><div id="cylinder_inner" class="inner_wait"></div></div></div><div class="revolver"></div></div><div class="rr_result"></div>';
		$('#hodl_game').empty().append(privatize);
	});
	
	PlayCount = 0;
	$(document).on('click','.spin',function(){
		$(".cylinder_cont").css({'right' : '-270px'});
		
		if($("#cylinder_inner" ).hasClass( "inner_final" )){
			$("#cylinder_outer" ).removeAttr("style"); $("#cylinder_inner" ).removeAttr("style");
			$("#cylinder_inner" ).removeClass('inner_final');	$("#cylinder_inner").addClass('inner'); 
			$("#cylinder_outer").removeClass('loader'); 	$("#cylinder_outer").addClass('loader'); 
		}else{
			//Change class on elements to Spin
			$(".loader_wait").attr('class', 'loader'); 
			$(".inner_wait").attr('class', 'inner'); 
		}
		
		/* 
		function randomIntFromInterval(min, max) { // min and max included 
		  return Math.floor(Math.random() * (max - min + 1) + min)
		}
		const rndInt = randomIntFromInterval(1, 6)
		console.log(rndInt)
		*/
		PlayCount ++;
		var chamberNumber = Math.floor(Math.random() * 2) + 1; //client side 1-2
		var firedbyTaxman = Math.floor(Math.random() * 4 + 1); //contract side 1-3 [ 6 odds ], 1-4 [ 8 odds]
		if(chamberNumber == firedbyTaxman){
			var status = 'Bang! Won!';
			//alert('Bang! Taxman Dead');
			//alert('You picked: '+chamberNumber+' Tax man picked: '+firedbyTaxman);
		}else{
			var status = 'Cluck, Lost!';
			//alert('Lost! loaded: '+chamberNumber+', Tax man: '+firedbyTaxman);
		}
		
		$(".rr_result").prepend('<span>'+status+' ~ loaded: '+chamberNumber+' ~ Tax man pulled trigger on cylinder '+firedbyTaxman+'</span></br>');
		
		if(PlayCount == 8){//one in 8 chance
			PlayCount = 0;
			$(".rr_result").prepend('<span>---------------------------------------------</span></br>');
		}
		
		//Change class on elements to stop
		$("#cylinder_outer").css({'animation-iteration-count' : '3'});
		$("#cylinder_inner").css({'animation-iteration-count' : '2'});
	
		
		final_set = setInterval( function() {
				//alert('final running');
				$(".inner").attr('class', 'inner_final'); 
				//clearTimeout(window.final_set);
			}, 3100);//wait
			
		move_cylinder = setInterval( function() {
				$(".cylinder_cont").css({'right' : '15px'});
			}, 12000);//wait
			
	});
	
//ALT APPROACH
//- Just load your cyclinder and leave it, pick any cylinder between 1 and 6 
//- You are then saved in array with wallet & cylinder_number
//- On R.R Day, we execute call to pick random number between 1 and 6
//- When you pll trigger on RR day or check manually thru a function call, it checks: rrday_cyclinder picked by team, and cylinder picked by wallet
//- if they match then it tells you you Killed the tax man. Swap function now simply checks the rrday_cylinder VS my array cylinder, if they match it executes 10% sell tax.
	
	
	
//TESTING ALCHEMY	
sendJSON();
function sendJSON(){
			
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
			// Print received data from server
			//console.log(this.responseText);
			result = this.responseText;
			process_reflections_todate(result);
		}
	};	
	// Converting JSON data to string
	//var data = JSON.stringify({"jsonrpc":"2.0","method":"alchemy_getTokenMetadata","params": ["0x1985365e9f78359a9B6AD760e32412f4a445E862"], "id": 1});
	var fromBlock = '0x'+(13761192).toString(16);//to_hex, from_hex = parseInt(hexString, 16);
	var wethContractAdd = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
	var to_wallet = "0x19849a002f826c7d492d35f41b4d748a2883b4a1";
	var data = JSON.stringify({"jsonrpc": "2.0", "id": 0, "method": "alchemy_getAssetTransfers", "params": [ { "fromBlock": fromBlock, "toBlock": "latest", "fromAddress": "0x5B4e9a810321E168989802474f689269EC442681", "toAddress": to_wallet, "contractAddresses": [ wethContractAdd ],
"maxCount": "0x3e8", "excludeZeroValue": true, "category": [ "internal" ] } ] });
	// Sending data with the request
	xhr.send(data);
}

function process_reflections_todate(output){
	parsed = JSON.parse(output);
	console.log(parsed);
	//console.log(parsed.id);
	//console.log(parsed.result.transfers);//at this point each array has object
	var transfers_ = parsed.result.transfers;
	var number_of_transfers = parseInt(transfers_.length);
	var receiver = "0x19849a002f826c7d492d35f41b4d748a2883b4a0";
	window.total_claims = 0;
	if(number_of_transfers > 0){
		for (var i = 0; i < number_of_transfers; i++) {
			if(transfers_[i].asset == "ETH" && transfers_[i].category == "internal" && transfers_[i].to == receiver){ 
				var eth_paid = parseFloat((transfers_[i].value).toFixed(12));//max 11 digits after dot
				var tx_hash = transfers_[i].hash.slice(0, 12);//trim to max 10
				var transfer = '<li class="buytx"><span class="buy_tag">Claimed: </span><span class="traded_in">'+ eth_paid + ' ETH, </span><span class="trade_tx"><a href="https://etherscan.io/tx/'+transfers_[i].hash+'" target="_blank">TxHash: ' + tx_hash + '...</a></span></li>';
				console.log(transfer);
				$(".rr_result").prepend(transfer);
				window.total_claims += eth_paid;
				console.log(window.total_claims);
			}else{
				//skip it
			}
		}//close for
	}else{
		//no claims yet
	}
}

	
	
});

//Trades
// - Historical: alchemy_getAssetTransfers to fetch all trades from / to, separately, then reorder results by time in Javascript somehow. Limit to 50
// - Current trades: Notify api ADDRESS_ACTIVITY allows us to track erc2o transfers for as many addresses as we want
// {"app_id":"your-app_id","webhook_type":1,"webhook_url":"https://webhook.site/7bf2c41e-846e-45a7-8c17-556dd7f5103c"} webhook api request body