"use strict";

var async = require('async');
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');
var util = require('./util');
var fs = require('fs');
var moment = require('moment');
var arrayInfo = require('../config/arrays');


module.exports = {
    CapacityProvisingService,

    BuildParamaterStrucut,
    CreateStorageDevice

}


function GetResourcePool(callback) {
    var resourcePool = [];
    var resourcePoolGoldItem = {
        "name": "Gold-VPLEX",
        "level": "Gold",
        "Capacity": 1000,
        "members": [{
            "arrayname": "EMCCTEST",
            "arraytype": "VPLEX",
            "capacity": 1000
        }
        ]
    }

    resourcePool.push(resourcePoolGoldItem);

    var resourcePoolSilverItem = {
        "name": "Silver-VPLEX",
        "level": "Silver",
        "Capacity": 2000,
        "members": [{
            "arrayname": "01101",
            "arraytype": "VNX",
            "capacity": 2000
        }
        ]
    }

    resourcePool.push(resourcePoolSilverItem);


    for (var i in resourcePool) {
        var item = resourcePool[i];
        for (var j in item.members) {
            var memberItem = item.members[j];

            for (var z in arrayInfo) {
                var arrayInfoItem = arrayInfo[z];
                if (arrayInfoItem.name == memberItem.arrayname) {
                    memberItem["info"] = arrayInfoItem;
                    break;
                }
            }
        }
    }

    callback(resourcePool);

}

/*
Function: CreateStorageDevice
Description: create a storage device for export a host.
Paramater: 
    {
        appname: String,
        usedfor: String,
        capacity: number,
        resourceLevel: String
    }

Response:
    {
    "code": 200,
    "message": "success",
    "response": {
        StorageDeviceName
    }
    }
*/
function CreateStorageDevice(paramater, callback) {


    async.waterfall(
        [
            // Get All Cluster
            function (callback) {

            },
            function (paramStru, callback) {
                if (paramStru.resMsg.code != 200) {
                    callback(null, paramStru);
                } else {
                    var storage = paramStru.autoinfo.storage;



                }
            }
        ], function (err, result) {
            // result now equals 'done'
            callback(result);
        });

}




/*
Function: BuildParamaterStrucut
Description: create a storage device for export a host.
Paramater: 
    {
        appname: String,
        usedfor: String,
        capacity: number,
        resourceLevel: String
    }

Response:
    {
    "code": 200,
    "message": "success",
    "response": {
        StorageDeviceName
    }
    }
*/
function BuildParamaterStrucut(paramater, callback) {

    var ret = {
        "code": 200,
        "message": []
    }

    var resourcePoolLevel = paramater.resourceLevel;

    var paramStru = {
        "resMsg": ret,
        "request": paramater,
        "ResourcePools": {},
        "AutoInfo": { 
            "RuleResults": {} ,
            "ResourceInfo" : {} ,
            "ActionParamaters" : {}  
        },
        "ActionResponses": []

    }



    async.waterfall(
        [
            // Get All Cluster
            function (callback) {
                GetResourcePool(function (resourcePools) {
                    var storage;
                    paramStru.ResourcePools = resourcePools;
                    callback(null, paramStru);
                })
            }
        ], function (err, result) {
            // result now equals 'done'
            callback(result);
        });
};


function ChooseStorage(AutoObject) {

    var resourcePools = AutoObject.ResourcePools;
    var require = AutoObject.request;
 
    var storage;
    for (var i in resourcePools) {
        var item = resourcePools[i];
        if (item.level == require.resourceLevel) {
            console.log(item.level , require.resourceLevel);
            storage = item.members[0];
            return storage;
        }
    }
}

function CapacityProvisingService(AutoObject, maincallback) {

    console.log(AutoObject);

    async.waterfall(
        [
            // Get All Cluster
            function (callback) {
                var arrayInfo = ChooseStorage(AutoObject);

                if (arrayInfo === undefined) {
                    AutoObject.resMsg.code = 500;
                    AutoObject.resMsg.message.push("Can not find a match ResourcePool! request.resourceLevel=[" + AutoObject.request.resourceLevel + "].");
                    maincallback(AutoObject);
                } else {
                    AutoObject.resMsg.code = 200;
                    AutoObject.resMsg.message.push("find a match ResourcePool!");
                    AutoObject.AutoInfo.RuleResults["ArrayInfo"] = arrayInfo;
                    callback(null, AutoObject);
                }
            }
            , function (AutoObject, callback) {
                // Array Impl route choose 
                var arrayType = AutoObject.AutoInfo.RuleResults.ArrayInfo.arraytype;
                switch (arrayType) {
                    case "VPLEX":
                        var AutoAPI = require('../lib/Automation_VPLEX');
                        break;
                    default:
                        AutoObject.resMsg.code = 500;
                        AutoObject.resMsg.message.push("Not support the array type [" + storage.arraytype + "]");
                        maincallback(AutoObject);
                        break;
                }

                if (AutoAPI !== undefined) { 
                    AutoAPI.CapacityProvisingService(AutoObject, function (result) {
                        callback(null, result);
                    });
                } else {
                    AutoObject.resMsg.code = 500;
                    AutoObject.resMsg.message.push("Can't find the implentence for array type [" + arrayType + "] !");
                    maincallback(AutoObject);
                }
            }
        ], function (err, result) {
            // result now equals 'done'
            maincallback(result);
        });

}