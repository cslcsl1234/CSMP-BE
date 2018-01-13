var os = require('os');
var snmp = require('snmpjs');
var http = require('http');
var moment = require('moment');
var async = require('async'); 
var util = require('util');
var MIB = require('../lib/mib');

var SMS = require('./SendSMS');

var func = require('./function');
var logger = require('./log');


var trapd = snmp.createTrapListener();
var mib = new MIB();
mib.LoadMIBs();

var phones = [];

GetSendPhones(
        function(res) {
                logger.info("flush send phone list: "+ res);
                phones = res;
        });

//var flushSendPhones=setInterval(GetSendPhones,60000*60*24,
var flushSendPhones=setInterval(GetSendPhones,10000,
	function(res) { 
                logger.info("flush send phone list: "+ res);
		phones = res;
	});

trapd.on('trap', function(msg){
   var now = new Date();
   logger.info("===========================================================================");
   logger.info("Trap Received " + moment(now).format("YYYY-MM-DD hh:mm:ss"));
   logger.info("===========================================================================");
   //console.log(util.inspect(snmp.message.serializer(msg)['pdu'], false, null));

	var varbinds_tmp = snmp.message.serializer(msg)['pdu'].varbinds;
	var varbinds = [];
	for ( i=1; i<varbinds_tmp.length; i++ ) {
		varbinds.push(varbinds_tmp[i]);
	}
   	mib.DecodeVarBinds(varbinds, function(res) {
	//console.log(res);

	parseSRMEvent(res, function(srmevent) {
		//	
		//console.log(srmevent);
		//
		var sendMsg = "["+srmevent.openedat+"]发生["+srmevent.severity+"]级别事件:["+srmevent.eventdisplayname+"],事件信息:["+srmevent.fullmsg+"].产生事件的设备:[" + srmevent.partinfo.lsname+ ", IP: "+srmevent.partinfo.ip+" ],部件:["+srmevent.partinfo.part+"]. 关联对象类型:[" + srmevent.partinfo.connectedToDeviceType +"], 关联对象:[" + srmevent.partinfo.connectedToDevice +"]. <End>"

		logger.info(sendMsg);
		if ( phones.length > 0 )
			SMS.SendSMS(sendMsg,phones,function(res) {
				console.log(res);
				logger.info("--------------------------------------------");
			});


	});
   });

});

trapd.bind({family: 'udp4', port: 1622});



function parseSRMEvent(trapinfo,callback) {
	var srmevent = {};

	for ( var i in trapinfo ) {
	    var item = trapinfo[i];
	    srmevent[item.ObjectName] = item.Value.toString();
	}

	srmevent["openedat"] = moment(parseInt(srmevent.openedat)*1000).format("YYYY-MM-DD hh:mm:ss");
	switch ( srmevent.severity ) {
	    case "3":
		srmevent["severity"] = "warning";
		break;
	    case "2":
		srmevent["severity"] = "error";
		break;
	    case "1":
		srmevent["severity"] = "critical";
		break; 
	    default:
		srmevent["severity"] = "info";
		break;                                                                             
	}

	var fullmsg = srmevent.fullmsg;
	if (
		fullmsg.indexOf('not ready') >= 0 
		|
		fullmsg.indexOf('to down') >= 0 
		|
		fullmsg.indexOf('not available') >= 0 
		|
		fullmsg.indexOf('to offline') >= 0 
		|
		fullmsg.indexOf('no longer have an active connection') >= 0 
		|
		fullmsg.indexOf('not able to access LUNs') >= 0 
		|
		fullmsg.indexOf('error') >= 0 
		|
		fullmsg.indexOf('unplugged') >= 0 
		|
		fullmsg.indexOf('now offline') >= 0 
		|
		fullmsg.indexOf('to failed') >= 0 
	   )  
	{
		srmevent["severity"] = "critical";
	}

	relationWithPort(srmevent,function(result) {
		callback(result);
	});
};





function relationWithPort(event, callback1 ) {


    async.waterfall([
        function(callback){ 
            var device;
            func.GetSwitchPorts(function(ports) {
                callback(null,ports);
            })

        },
        function(arg1, callback) {
            var swports = arg1;

            var eventItem = event;

            switch ( eventItem.devtype ) {
                case 'FabricSwitch':
                    if ( eventItem.parttype == 'Port') {
                        
                        for ( var j in swports ) {
                            var portItem = swports[j];
         
                            if ( eventItem.device == portItem.device && eventItem.part == portItem.partid ) {
                                eventItem["partinfo"] = portItem;
                                break;
                            }
                        }
                    } else {
                        console.log("Not Support Device Part type ["+eventItem.devtype+"], partype=["+eventItem.parttype+"]")
                    }
                    break;

                default:

                    break;
            } 

            callback(null,event); 
        }
    ], function (err, result) {
       callback1(result);
    });    
}


function GetSendPhones(callback) {

	func.GetUsers(function(users) {

		var sendphones = [];
		for ( var i in users ) {
			var item = users[i];
			if ( item.sendsms == true ) 
				sendphones.push(item.phone);
		}

		callback(sendphones);
	});
}
