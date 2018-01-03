"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var topos = require('../lib/topos.js');
var util = require('./util');


module.exports = {
    GetDevices ,
    GetFCSwitchPart
}


function GetDevices(callback) { 

    async.waterfall([
        function(callback){ 

            var param = {}; 
            param['filter'] = '!vstatus==\'inactive\'&!parttype';  
            param['keys'] = ['device','devtype'];
            param['fields'] = ['devdesc'];
            param['period'] = 0; 
 
            CallGet.CallGet(param, function(param) { 
                var result = [];
         
                callback(null, param.result ); 
            });
        },
        function(arg1,  callback){ 
            callback(null,arg1);
        }
    ], function (err, result) {
       callback(result);
    });

};


function GetFCSwitchPart(devtype,parttype,callback) { 

    async.waterfall([
        function(callback){ 

            var param = {}; 
            param['filter'] = '!vstatus==\'inactive\'&devtype=\''+devtype+'\'&parttype=\''+parttype+'\'';  
            param['keys'] = ['device','part'];
            param['fields'] = ['ip','devtype','devicesn','parttype','ifname','partwwn','portnum','porttype','portwwn','partstat','partphys','maxspeed'];
            //param['fields'] = ['ip','devtype','devtype'];
            param['period'] = 0; 
 
            CallGet.CallGet(param, function(param) { 
                var result = [];
         
                callback(null, param.result ); 
            });
        },
        function(arg1,  callback){ 
            callback(null,arg1);
        }
    ], function (err, result) {
       callback(result);
    });

};

