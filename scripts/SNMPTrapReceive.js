var os = require('os');
var snmp = require('snmpjs');
var http = require('http');
var moment = require('moment');
var async = require('async'); 
var util = require('util');
var MIB = require('../lib/mib');
var Config= require('../config/config.json');

var SMS = require('./SendSMS');

var func = require('./function');
var logger = require('./log');


var trapd = snmp.createTrapListener();
var mib = new MIB();
mib.LoadMIBs();

var phones = [];

trapd.on('trap', function(msg){
   var now = new Date();
   logger.info("===========================================================================");
   logger.info("Trap Received " + moment(now).format("YYYY-MM-DD hh:mm:ss"));
   logger.info("===========================================================================");
   console.log(util.inspect(snmp.message.serializer(msg)['pdu'], false, null));

	var varbinds_tmp = snmp.message.serializer(msg)['pdu'].varbinds;
	var varbinds = [];
	for ( i=1; i<varbinds_tmp.length; i++ ) {
		varbinds.push(varbinds_tmp[i]);
	}
   	mib.DecodeVarBinds(varbinds, function(res) {
	//console.log(res);

   });

});

trapd.bind({family: 'udp4', port: 162});

