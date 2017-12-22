var net = require('net');


var HOST='127.0.0.1';
var PORT=1337;
var MsgTemplate='043244440100              111111111119999999999000000000000000000000000000000  13500700001    1111111111222222222233333333334444444444555555555566666666661111111111                                                                                                                                                                                                                            0|                                                  ';



var client = new net.Socket();
client.connect(PORT, HOST, function() {
	console.log('Connected');
	var phone = MsgTemplate.substring(79,15);
	console.log('phone=['+phone+']');
	client.write('Hello, server! Love, Client.');
});

client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy(); // kill client after server's response
});

client.on('close', function() {
	console.log('Connection closed');
});



