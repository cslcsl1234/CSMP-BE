"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var topos = require('../lib/topos.js');
var util = require('./util');
var MgmtObjectInfoObject = mongoose.model('MgmtObjectInfo');



module.exports = {
    GetDevices ,
    GetFCSwitchPart,
    GetArrayAliasName,
    getMgmtObjectInfo
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

function GetArrayAliasName(callback) { 
    var filter = {};
    getMgmtObjectInfo(filter ,function(arrayInfo) {

        callback(arrayInfo); 
    });

}


function getMgmtObjectInfo(filter, callback) { 

    if ( filter === undefined ) filter = {};
    MgmtObjectInfoObject.find( filter , { "_id": 0 , "__v": 0 } ).lean().exec(  function (err, doc) {
        //system error.
        if (err) {
            return   done(err);
        }
        if (!doc) { //user doesn't exist. 
            console.log("is not exits!");
        }
        else {    
            for ( var i in doc ) {
                var item = doc[i];
                var specialInfo = JSON.parse(item.specialInfo);
                item.specialInfo = specialInfo;  
                switch ( item.type ) {
                    case 'array' :
                        if ( item.datacenter == 1 ) item["cabinet"] = "JXQ";
                        else item["cabinet"] = "SD";

                        item.type = item.level;
                        item["storagesn"] = item.sn; 
                        break;
                    case 'switch' :
                    default:
                        break;
                }
            }
            callback(doc);
        }
    });   

}