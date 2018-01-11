var os = require('os');
var snmp = require('snmpjs');
var http = require('http');
var util = require('util');
var MIB = require('../lib/mib');

var trapd = snmp.createTrapListener();
var mib = new MIB();
mib.LoadMIBs();

trapd.on('trap', function(msg){
   var now = new Date();
   console.log("Trap Received " + now);
   //console.log(util.inspect(snmp.message.serializer(msg)['pdu'], false, null));


   var varbinds_tmp = snmp.message.serializer(msg)['pdu'].varbinds;
   var varbinds = [];
   for ( i=1; i<varbinds_tmp.length; i++ ) {
	varbinds.push(varbinds_tmp[i]);
   }
   mib.DecodeVarBinds(varbinds, function(res) {
	//console.log(res);

	for ( var i in res ) {
	    var item = res[i];
	    switch ( item.ObjectName ) {
		case "severity":
		     var severity = item.Value;
		     break;
		case "eventdisplayname":
		     var eventdisplayname= item.Value;
		     break;
		case "openedat":
		     var openedat= item.Value;
		     break;
		case "devtype":
		     var devtype= item.Value;
		     break;
		case "device":
		     var device= item.Value;
		     break;
		case "sourceip":
		     var sourceip= item.Value;
		     break;
		case "parttype":
		     var parttype= item.Value;
		     break;
		case "part":
		     var part= item.Value;
		     break;
		case "fullmsg":
		     var fullmsg= item.Value;
		     break;
            }

	}


	var sendMsg = "["+openedat+"]:["+severity+"]:["+eventdisplayname+"] - ["+devtype+"("+device+") " + parttype + " " +part+"] - ["+fullmsg+"]";

	console.log(sendMsg);
	
   });


});

trapd.bind({family: 'udp4', port: 1622});

