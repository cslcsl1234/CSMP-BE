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
    getMgmtObjectInfo,
    putMgmtObjectInfo,
    deleteMgmtObjectInfo,
    getPartnerArrayInfo
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

function getPartnerArrayInfo(device, callback ) {
    var filter = {};
    var partnerArrayInfo;
    getMgmtObjectInfo(filter ,function(arrayInfo) {

        for ( var i in arrayInfo ) {
            var item = arrayInfo[i];
            if ( item.sn == device ) {
                var name = item.name;
                var headName = name.split('-')[0];
                
                var isfind = false;
                for ( var j in arrayInfo ) {
                    var partnerItem = arrayInfo[j];
                    if ( partnerItem.sn == device ) continue;

                    var partnerHeadName = partnerItem.name.split('-')[0];
                    if ( headName == partnerHeadName ) {
                        partnerArrayInfo = partnerItem;
                        isfind = true;
                    }

                }
                if ( isfind == false ) {
                    callback({});
                }
                else {
                    callback(partnerArrayInfo)
                }

            }
        }
        
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



function putMgmtObjectInfo(data, callback) {  

    console.log("putMgmtObjectInfo: |"+ data.toString() + "|");
    MgmtObjectInfoObject.findOne({"sn" : data.sn }, function (err, doc) {
        //system error.
        if (err) {
            callback( { status:"FAIL",info: err }); 
        }
        if (!doc) { //user doesn't exist.
            console.log("Management Object  is not exist. insert it."); 

            var newmgmtobj = new MgmtObjectInfoObject(data);
            newmgmtobj.save(function(err, thor) {
              if (err)  {
                console.dir(thor);
                callback( { status:"FAIL",info: err }); 
              } else 
              callback( {status:"SUCCESS", info: "The management object insert is succeeds!"});
            });
        }
        else {   
            doc.update(data, function(error, course) {
                if(error) return next(error);
            });
            callback(  {status:"SUCCESS", info: "The management object has exist! Update it."});
        }
    });
};



function deleteMgmtObjectInfo(data, callback) {

    console.log("deleteMgmtObjectInfo: |"+ data + "|");
    MgmtObjectInfoObject.deleteMany({ sn: data }, function (err , doc) {
        console.log(doc);
        if (err) {
            callback(  {status:"FAIL", info: "The management object deleted has fail! " + err} );
        } else
            callback(  {status:"SUCCESS", info: "The management object has deleted! "} );
      });

};
