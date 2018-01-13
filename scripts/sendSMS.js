var net = require('net');
var iconv = require('iconv-lite');
var logger = require('./log');

var encode="utf-8";

//var HOST='10.188.97.241';
//var PORT=6821;
var HOST='127.0.0.1'
var PORT=1337;


var MsgTemplate="043244440100              111111111119999999999000000000000000000000000000000  13500700001    1111111111222222222233333333334444444444555555555566666666661111111111                                                                                                                                                                                                                            0|                                                  ";

var MsgTemplate1="043244440100              111111111119999999999000000000000000000000000000000  "
var MsgTemplate2="                                                  0|                                                  ";


module.exports = {
	SendSMS
}

/*** For Test
var phonetest=[];
phonetest.push("13910084247");
phonetest.push("13011112222");

SendSMS("test",phonetest,function(res) {
	console.log(res);
});
**/

function SendSMS(SendMsg, Phones, callback) {

	var client = new net.Socket();
	client.connect(PORT, HOST, function() {
		logger.info(HOST+':'+PORT+' Connected ... ');
		var phone = MsgTemplate.substr(79,15);

		for ( var i in Phones){
			var SendPhone= Phones[i];
			
			var SendPackage = MsgTemplate1+padRight(SendPhone,15)+ padRight(SendMsg,240) + MsgTemplate2;
			logger.info("send:["+SendPackage+"]");
			client.write(SendPackage);
			
		}

	});

	client.on('data', function(resp) {
		//console.log(resp);
		var data = iconv.decode(resp,'GBK').toString();

		var packcodelen = data.substr(0,4);
		var respcode    = data.substr(4,7);
		var retmsg      = data.substr(11,50);
		logger.info("respcode    =["+respcode+']');
		logger.info("respmsg     =["+retmsg+']');
		logger.info(' --------------- Received Fields  -----------------');

		client.destroy(); // kill client after server's response
	});

	client.on('close', function() {
		logger.info('Connection closed');
	});

};

function padRight(str,lenght){ 
	if(str.length >= lenght) 
		return str; 
	else
		return padRight(str+" ",lenght); 
}


