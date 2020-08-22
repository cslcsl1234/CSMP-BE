"use strict";
const logger = require("../lib/logger")(__filename); 

var async = require('async'); 
var unirest = require('unirest');
var configger = require('../config/configger');
var net = require('net');
var iconv = require('iconv-lite');
var util = require('../lib/util');
var DeviceMgmt = require('../lib/DeviceManagement');
var SWITCH = require('../lib/Switch');


module.exports = {
    GetEvents,
    SendSMS2Phone
}


function GetEvents(param, callback) {

    var config = configger.load();

    var processData = {};

    async.waterfall([
        function(callback){ 

            var filter = param.filter;

            var fields = 'id,category,severity,sourceip,device,devtype,part,eventname,eventstate,eventtype,severity,timestamp,active,fullmsg,eventdisplayname,parttype';

            var queryString =  {'properties': fields, 'filter': filter };  

            logger.info(config.Backend);
            logger.info(queryString);
            unirest.get(config.Backend.URL + '/events/occurrences/values' )
                    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                    .headers({'Content-Type': 'multipart/form-data'}) 
                    .query(queryString) 
                    .end(function (response) { 
                        if ( response.error ) {
                            logger.error(response.error);
                            callback(response.error);
                        } else { 
                            var res = JSON.parse(response.raw_body);

                            var events = res.occurrences;
                            var eventArray = [];

                            for ( var i in events ) {
                               // SendSMS2Phone("testmsg",function(res1) {
                               //     logger.info("Execute SendSMS to phons");
                               // });

                                eventArray.push( events[i].properties );
                            }

                            callback(null,eventArray);   
                        }

                    }); 

        },
        function(arg1,  callback){ 

            //
            DeviceMgmt.GetDevices(function(devices) {
                for ( var i in arg1 ) {
                    var item = arg1[i];

                    for ( var j in devices ) {
                        var devItem = devices[j];
                        if ( item.device == devItem.device ) {
                            item["devtype"] = devItem.devtype;
                            item["devdesc"] = devItem.devdesc;
                        }
                    } 
                }

                processData["events"] = arg1;
                callback(null,processData);
            });
        },
        function(arg1, callback) {
            var device;
            SWITCH.GetSwitchPorts(device,function(ports) {
                arg1["SWPorts"] = ports;
                callback(null,arg1);
            })

        },
        function(arg1, callback) {
            var swports = arg1.SWPorts;
            var eventlist = arg1.events;

            for ( var i in eventlist ) {
                var eventItem = eventlist[i];

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
                            logger.info("Not Support Device Part type ["+eventItem.devtype+"], partype=["+eventItem.parttype+"]")
                        }
                        break;

                    default:

                        break;
                }
            }
            callback(null,arg1.events); 
        }
    ], function (err, result) {
       callback(result);
    });
};

function relationWithPort(event, callback ) {
    var config = configger.load();

    var processData = {};

    async.waterfall([
        function(callback){ 
            var device;
            SWITCH.GetSwitchPorts(device,function(ports) {
                arg1["SWPorts"] = ports;
                callback(null,arg1);
            })

        },
        function(arg1, callback) {
            var swports = arg1.SWPorts;

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
                        logger.info("Not Support Device Part type ["+eventItem.devtype+"], partype=["+eventItem.parttype+"]")
                    }
                    break;

                default:

                    break;
            } 

            callback(null,event); 
        }
    ], function (err, result) {
       callback(result);
    });    
}

function SendSMS2Phone(SendMsg, callback) {
    var config = configger.load();
    //var SendPhone='13910084247';
    //var SendMsg = 'this is a test message.';

    var phones = config.SMS.Phones; 
    for ( var i in phones ) {
        var phone = phones[i];  
        SendSMS(phone,SendMsg,function(response) {
            logger.info(phone+":"+response);
        });

    }

    callback("ret");


};



function SendSMS(SendPhone, SendMsg, callback) {
    var config = configger.load();
    //var SendPhone='13910084247';
    //var SendMsg = 'this is a test message.';
    var response = "";

    var HOST=config.SMS.ServiceIP;
    var PORT=config.SMS.ServicePort;
    
    var MsgTemplate="043244440100              111111111119999999999000000000000000000000000000000  13500700001    1111111111222222222233333333334444444444555555555566666666661111111111                                                                                                                                                                                                                            0|                                                  ";
    var MsgTemplate1="043244440100              111111111119999999999000000000000000000000000000000  "
    var MsgTemplate2="                                                  0|                                                  ";

    var client = new net.Socket();
    client.connect(PORT, HOST, function() {
            logger.info("Send Msg to ["+SendPhone+"] Msg [" + SendMsg +"]. Connect SMS Service: "+HOST+':'+PORT+' Connected ... ');
            var phone = MsgTemplate.substr(79,15);

            var SendPackage = MsgTemplate1+padRight(SendPhone,15)+ padRight(SendMsg,240) + MsgTemplate2;

            //logger.info(MsgTemplate);
            //logger.info(SendPackage);
            //logger.info('TemplateMsgLength=['+MsgTemplate.length +']\tSendMsgLength=['+SendPackage.length+']');

            //logger.info('------------ Send Data Begin -----------------');
            //logger.info('['+SendPackage+']');
            client.write(SendPackage);
            //logger.info('------------ Send Data End   ----------------- [length='+SendPackage.length+']');
    });

    client.on('data', function(resp) {
            //logger.info(resp);
            var data = iconv.decode(resp,'GBK').toString();


            //logger.info();
            //logger.info();
            //logger.info();
            //logger.info(' --------------- Received Data Begin -----------------');
            //logger.info(data);
            //logger.info(' --------------- Received Data End   -----------------');

            var packcodelen = data.substr(0,4);
            var respcode    = data.substr(4,7);
            var retmsg      = data.substr(11,50);
            //logger.info("packcodeleng=["+packcodelen+']');
            //logger.info("respcode    =["+respcode+']');
            //logger.info("respmsg     =["+retmsg+']');
            //logger.info(' --------------- Received Fields  -----------------');
            response = data;

            client.destroy(); // kill client after server's response 
    });



    client.on('close', function() {
            //logger.info('Connection closed');
            callback(SendPhone+":"+response);
    });




};


function padRight(str,lenght){
        if(str.length >= lenght)
        return str;
        else
        return padRight(str+" ",lenght);
}


