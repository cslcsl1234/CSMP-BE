"use strict";

var async = require('async');
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');
var util = require('./util');
var fs = require('fs');
var moment = require('moment');

var autologger = require('../lib/logger');
var WebSocket = require('ws');
var Naming = require('../config/SDCityBank-Naming.json');
var StorageCapability = require('../config/StorageCapability');

const ZB = require('zeebe-node');
var VMAX = require('../lib/Automation_VMAX');
var UNITY = require('../lib/Automation_UNITY');
var RPA = require('../lib/Automation_RPA');

const Response = require("../lib/Response");

module.exports = {
    VPlexProvising,

    CapacityProvisingServiceTEST,
    GenerateCreatePhysicalVolumeParamater,

    CreateVirtualVolumeService,
    //CreateDistributedVirtualVolumeService,


    UnitTest,
    CapacityProvisingService,
    CapacityProvisingServiceV3,


    ExecuteActions,
    ExecuteActionsBPMN,
    DeployVPLEXBPMN,

    CreateStorageDevice,
    CreateExtents,
    ClaimAllStorageVolume,
    ClaimStorageVolume,


    // --- function
    GetArrayInfoObject,
    ConvertStorageVolumeName,
    ExtentsSortByCapacity,
    GenerateDeviceName,
    GenerateStorateViewName,
    GenerateConsistencyGroupName,

    // --- base funtion

    GetClusters,
    GetStorageArray,
    GetExtents,
    GetClaimedExtentsByArray,
    GetStorageVolumes,
    GetConsistencyGroups,
    GetConsistencyGroup,
    GetStorageViews,
    GetStorageView,
    GetStorageViewsV1,
    GetStorageViewsDemoVersion,
    HealthCheck,

    StorageRediscover,
    DiscoverStorageArray,
    StorageVolumeClaim,
    CreateExtent,
    CreateLocalDevice,
    CreateDistributedDevice,
    CreateVirtualVolume,

    AssignConsistencyGroup,
    AssignStorageView,

}

/*
arrayinfo: { 
          "arrayname": "EMCCTEST1",
          "arraytype": "VPLEX",  
          "info": {
            "name": "EMCCTEST",
            "array_type": "VPLEX",
            "version": "5.5",
            "endpoint": "https://10.32.32.100/vplex",
            "auth": {
              "username": "service",
              "password": "password"
            }
          }, 
          "backend_array": [
            {
              "array_type": "VMAX",
              "serial_no": "000297800193",
              "password": "smc",
              "unispherehost": "10.121.0.204",
              "universion": "90",
              "user": "smc",
              "verifycert": false,
              "sgname": "MSCS_SG" 
            },
            {
              "array_type": "Unity", 
              "unity_sn": "CKM00163300785",
              "unity_password": "P@ssw0rd",
              "unity_hostname": "10.32.32.64",
              "unity_pool_name": "jxl_vplex101_pool",
              "unity_username": "admin", 
              "sgname": "VPLEX_101_BE" 
            } 
          ] 
    }


    Request:
        {
        "client":"1573791760263",
        "appname":"ebankwebesxi",
        "appname_ext":"VW",
        "opsType":"review",
        "requests":[
            {
                "usedfor":"data",
                "capacity":7,
                "count":1,
                "StorageResourcePool":{
                    "name":"VPLEX-高端",
                    "resourceLevel":"Gold",
                    "resourceType":"VPLEX",
                    "TotalCapacity":100,
                    "UsedCapacity":30,
                    "members":[
                        {
                            "arrayname":"EMCCTEST1",
                            "arraytype":"VPLEX",
                            "capacity":1000,
                            "info":{
                                "name":"EMCCTEST",
                                "array_type":"VPLEX",
                                "endpoint":"https://10.32.32.100/vplex",
                                "auth":{
                                    "username":"service",
                                    "password":"password"
                                }
                            },
                            "backend_array":[
                                {
                                    "array_type":"VMAX",
                                    "serial_no":"000297800192",
                                    "password":"smc",
                                    "unispherehost":"10.121.0.204",
                                    "universion":"90",
                                    "user":"smc",
                                    "verifycert":false,
                                    "sgname":"ansible_test_sg"
                                },
                                {
                                    "array_type":"Unity",
                                    "unity_sn":"67890",
                                    "unity_password":"P@ssw0rd",
                                    "unity_hostname":"10.32.32.64",
                                    "unity_pool_name":"jxl_vplex101_pool",
                                    "unity_username":"admin",
                                    "sgname":"VPLEX_101_BE"
                                }
                            ]
                        }
                    ],
                    "index":"0"
                },
                "ProtectLevel":{
                    "DR_SameCity":"disable",
                    "Backup":false,
                    "AppVerification_SameCity":false,
                    "AppVerification_DiffCity":false,
                    "hostDeplpy":"SC"
                }
            }
        ]
    }

*/

/* 

   the E2E service for create vplex virtual volume (not discuribute virtual volume) :
   in physical array:
   1. create a physical volume from a backend pyhical array and mapping it the vplex backend;
   in VPLEX:
   2. rediscover physical volume;
   3. claim the pyhsical volume;
   4. create extend
   5. create device
   6. create virtual volume
   7. mapping storage groups
   8. assing consistincy groups

   RETURN: actionParamaterArray[];

*/
function CreateVirtualVolumeService(stepgroupname, vplexinfo, backend_array, volname, capacityGB, clustername, StorageView, CGName) {
 
    switch (backend_array.array_type) {
        case "VMAX":
            var BACKENDARRAY = VMAX;
            break;
        case "Unity":
            var BACKENDARRAY = UNITY;
            break;
        default:
            console.log("not support array type " + backend_array.array_type);
            break;
    }

    var ActionParamaters = [];
    var sgname = backend_array.sgname;

    var CreateArrayDeviceParamater = BACKENDARRAY.GenerateCreateDeviceParamater(stepgroupname, backend_array, volname, sgname, capacityGB)
    ActionParamaters.push(CreateArrayDeviceParamater);



    var paramater = {
        "StepGroupName": stepgroupname,
        "Step": "rediscover physical volume",
        "method": "ReDiscoverPhysicalArray",
        "arrayinfo": vplexinfo
    }
    ActionParamaters.push(paramater);

    var paramater = {
        "StepGroupName": stepgroupname,
        "Step": "claim the pyhsical volume",
        "method": "ClaimPhysicalVolume",
        "arrayinfo": vplexinfo
    }
    ActionParamaters.push(paramater);

    var PhysicalVolumeName = volname;
    var CreateExtentParamater = {
        "StepGroupName": stepgroupname,
        "Step": '创建Extent',
        "method": 'CreateExtent',
        "DependOnAction": "CreatePhysicalDevice",
        "arrayinfo": vplexinfo,
        "StorageVolumeName": PhysicalVolumeName
    }
    ActionParamaters.push(CreateExtentParamater);


    var createLocalDeviceParamater = {
        "StepGroupName": stepgroupname,
        Step: '创建本地存储卷(Local Device)',
        method: 'CreateLocalDevice',
        DependOnAction: "CreateExtent",
        devicename: "device_" + PhysicalVolumeName,    // Need matche "Device Naming Rule"
        geometry: "raid-0",      // "raid-0",
        //stripe-depth: Number,  // Default "1"
        extents: "extent_" + PhysicalVolumeName + '_1', // extents list
        "arrayinfo": vplexinfo
    }
    ActionParamaters.push(createLocalDeviceParamater);

    var virtualVolName = "device_" + volname + "_vol";
    var CreateVirtualVolumeParamater = {
        "StepGroupName": stepgroupname,
        Step: '创建本地虚拟存储卷(Virtual Volume)',
        method: 'CreateVirtualVolume',
        DependOnAction: "CreateLocalDevice",
        virtualvolumename: virtualVolName,
        devicename: "device_" + PhysicalVolumeName,
        arrayinfo: vplexinfo
    }
    ActionParamaters.push(CreateVirtualVolumeParamater);

    if (clustername != 'cluster-1' && clustername != 'cluster-2') {
        console.log(`DataError: ${clustername} is not 'cluster-1' or 'cluster-2'.`);
        return [];
    }
    if (StorageView !== undefined && clustername !== undefined) {
        var AssignStorageViewParamater = {
            "StepGroupName": stepgroupname,
            Step: '分配虚拟化存储卷至存储视图（Storage View）:' + StorageView,
            method: 'AssignStorageView',
            DependOnAction: "CreateVirtualVolume",
            clustername: clustername,
            viewname: StorageView,
            virtualvolumes: virtualVolName,
            arrayinfo: vplexinfo
        }
        ActionParamaters.push(AssignStorageViewParamater);
    }


    if (CGName !== undefined) {
        var AssignConsistencyGroupParamater = {
            "StepGroupName": stepgroupname,
            Step: '分配虚拟存储卷到一致性组(Consistency Group): ' + CGName,
            method: 'AssignConsistencyGroup',
            DependOnAction: "CreateVirtualVolume",
            virtual_volume: virtualVolName,
            consistency_group: CGName,
            arrayinfo: vplexinfo
        }
        ActionParamaters.push(AssignConsistencyGroupParamater);
    }



    return ActionParamaters;
}


function GenerateCreatePhysicalVolumeParamaterV1(stopgroupname, arrayinfo, appname, usedfor, sgname, capacity, sequenceNumber, timestamp, maincallback) {

    var ActionParamaters = [];
    var physicalArrayInfos = arrayinfo["backend_array"];
    var capacityBYTE = capacity * 1024 * 1024 * 1024;

    var volno = "";
    if (sequenceNumber < 10)
        volno = '0' + sequenceNumber;
    else
        volno = j;

    async.waterfall(
        [

            // STEP 1: Create Prod physical device in 2 backend physical array behind VPLEX Metro.
            // 1.1 Combind the create paramater.
            function (callback) {

                for (var i in physicalArrayInfos) {
                    var item = physicalArrayInfos[i];

                    var arrayType = item.array_type;
                    switch (arrayType) {
                        case 'VMAX':


                            var volName = VMAX.GenerateVolNameV2(item, appname, usedfor, timestamp) + volno;
                            var CreateArrayDeviceParamater = VMAX.GenerateCreateDeviceParamater(stopgroupname, item, volName, sgname, capacity)

                            // 第一台存储作为主存储
                            CreateArrayDeviceParamater.position = (i == 0) ? 'primary' : 'second';
                            ActionParamaters.push(CreateArrayDeviceParamater);
                            break;

                        case 'Unity':

                            var capacityBYTEUnity = capacityBYTE + 100 * 1024 * 1024;

                            var volName = UNITY.GenerateVolNameV2(item, appname, usedfor, timestamp) + volno;
                            var CreateArrayDeviceParamater = {
                                StepGroupName: stopgroupname,
                                Step: `Create device and assign to sg [ ${item.sgname} ] in pyhsical array [ ${item.unity_sn} ] , arraytype= [ ${arrayType} ]`,
                                method: 'CreatePhysicalDevice',
                                arrayinfo: item,
                                DependOnAction: "N/A",
                                AsignSGName: sgname,
                                StorageVolumeName: volName,
                                capacityByte: capacityBYTEUnity,
                                position: (i == 0) ? 'primary' : 'second',
                                execute: true
                            }

                            ActionParamaters.push(CreateArrayDeviceParamater);
                            break;

                        default:
                            //autologger.logs(504, `Not support array type [${arrayType}]`, AutoObject);
                            var message = `Not support array type [${arrayType}]`;
                            callback(504, message);
                            break;
                    }
                }
                callback(null, ActionParamaters);
            }
        ], function (err, result) {
            // result now equals 'done'  
            if (err) {
                var response = new Response(err, result, null)
                maincallback(err, response);
            } else
                maincallback(200, result);
        });
}


function GenerateCreatePhysicalVolumeParamater(stopgroupname, arrayinfo, request, timestamp, maincallback) {

    var ActionParamaters = [];
    var physicalArrayInfos = arrayinfo["backend_array"];
    var capacityBYTE = request.capacity * 1024 * 1024 * 1024;

    async.waterfall(
        [

            // STEP 1: Create Prod physical device in 2 backend physical array behind VPLEX Metro.
            // 1.1 Combind the create paramater.
            function (callback) {

                for (var i in physicalArrayInfos) {
                    var item = physicalArrayInfos[i];

                    console.log(item);
                    var arrayType = item.array_type;
                    switch (arrayType) {
                        case 'VMAX':

                            for (var j = 1; j <= request.count; j++) {
                                if (request.count < 10) var volno = '0' + j;
                                else volno = j;

                                var volName = VMAX.GenerateVolName(item, request, timestamp) + volno;
                                var CreateArrayDeviceParamater = VMAX.GenerateCreateDeviceParamater(stopgroupname, item, volName, item.sgname, request.capacity)

                                // 第一台存储作为主存储
                                CreateArrayDeviceParamater.position = (i == 0) ? 'primary' : 'second';
                                ActionParamaters.push(CreateArrayDeviceParamater);
                            }
                            break;

                        case 'Unity':

                            var capacityBYTEUnity = capacityBYTE + 100 * 1024 * 1024;
                            for (var j = 1; j <= request.count; j++) {
                                if (request.count < 10) var volno = '0' + j;
                                else volno = j;

                                var volName = UNITY.GenerateVolName(item, request, timestamp) + volno;
                                var CreateArrayDeviceParamater = {
                                    StepGroupName: stopgroupname,
                                    Step: `Create device and assign to sg [ ${item.sgname} ] in pyhsical array [ ${item.unity_sn} ] , arraytype= [ ${arrayType} ]`,
                                    method: 'CreatePhysicalDevice',
                                    arrayinfo: item,
                                    DependOnAction: "N/A",
                                    AsignSGName: item.sgname,
                                    StorageVolumeName: volName,
                                    capacityByte: capacityBYTEUnity,
                                    position: (i == 0) ? 'primary' : 'second',
                                    execute: true
                                }

                                ActionParamaters.push(CreateArrayDeviceParamater);
                            }
                            break;

                        default:
                            //autologger.logs(504, `Not support array type [${arrayType}]`, AutoObject);
                            var message = `Not support array type [${arrayType}]`;
                            callback(504, message);
                            break;
                    }
                }
                callback(null, ActionParamaters);
            }
        ], function (err, result) {
            // result now equals 'done'  
            if (err) {
                var response = new Response(err, result, null)
                maincallback(err, response);
            } else
                maincallback(200, result);
        });
}


function UnitTest(arrayinfo, functionname, clustername, callback) {
    switch (functionname) {
        case 'GetStorageVolumes':
            GetStorageVolumes(arrayinfo, clustername, function (result) {
                callback(result);
            })
            break;

        case 'ClaimAllStorageVolume':
            var ActionParamaters = [
                {
                    "Step": "Create device and assign to sg [ MSCS_SG ] in pyhsical array [ 000297800193 ], arraytype= [ VMAX ]",
                    "method": "CreatePhysicalDevice_VMAX",
                    "arrayinfo": {
                        "array_type": "VMAX",
                        "serial_no": "000297800193",
                        "password": "smc",
                        "unispherehost": "10.121.0.204",
                        "universion": "90",
                        "user": "smc",
                        "verifycert": false,
                        "sgname": "MSCS_SG"
                    },
                    "DependOnAction": "N/A",
                    "AsignSGName": "MSCS_SG",
                    "StorageVolumeName": "ebankwebesxi_VMAX_193_data_1117144643_01",
                    "capacityByte": 5368709120,
                    "show": "false",
                    "execute": true,
                    "response": {
                        "name": "ebankwebesxi_VMAX_193_data_1117145701_TEST01",
                        "lunwwn": "60000970000297800193533030304234"
                    }
                },
                {
                    "Step": "Create device and assign to sg [ VPLEX_101_BE ] in pyhsical array [ CKM00163300785 ] , arraytype= [ Unity ]",
                    "method": "CreatePhysicalDevice_UNITY",
                    "arrayinfo": {
                        "array_type": "Unity",
                        "unity_sn": "CKM00163300785",
                        "unity_password": "P@ssw0rd",
                        "unity_hostname": "10.32.32.64",
                        "unity_pool_name": "jxl_vplex101_pool",
                        "unity_username": "admin",
                        "sgname": "VPLEX_101_BE"
                    },
                    "DependOnAction": "N/A",
                    "AsignSGName": "VPLEX_101_BE",
                    "StorageVolumeName": "ebankwebesxi_unity_785_data_1117144643_01",
                    "capacityByte": 5368709120,
                    "show": "false",
                    "execute": true,
                    "response": {
                        "name": "ebankwebesxi_unity_785_data_1117144643_01",
                        "lunwwn": "600601602f204100bdd9d05d373d235b"
                    }
                }
            ]
            ClaimAllStorageVolume(arrayinfo, ActionParamaters, function (result) {
                callback(null, result);
            })
            break;
        default:
            var res = `functionname [${functionname}] is not defined unit test.`;
            callback(res)
    }
}


function CapacityProvisingService(AutoObject, maincallback) {

    AutoObject.resMsg.code = 200;
    AutoObject.resMsg.message.push("Begin execute service [ CapacityProvisingService ] !");
    autologger.logger.info("Begin execute service [ CapacityProvisingService ] !");
    autologger.logs(200, "TEST", AutoObject);
    AutoObject.AutoInfo["ActionParamaters"] = [];

    var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo.info;
    var ws = AutoObject.request.ws;

    async.waterfall(
        [
            // 1. Claim all storage volume has been find in all cluster in VPLEX
            function (callback) {
                autologger.logger.info("Begin execute step [ ClaimAllStorageVolume ] !");
                ClaimAllStorageVolume(arrayInfo, function (result) {
                    callback(null, result);
                })

            },
            // 获取生产StorageView及相关信息 
            function (arg, callback) {
                autologger.logger.info("Begin execute step [ ComponeAutoInfo ] !");
                ComponeAutoInfo(AutoObject, function (result) {
                    if (result.resMsg.code != 200) {
                        result.resMsg.message.push("execute step [ ComponeAutoInfo ] is FAIL!");
                        maincallback(result);
                    } else {
                        var DataFilename = '/tmp/AutoObject.json';
                        fs.writeFile(DataFilename, JSON.stringify(result), function (err) {
                            if (err) throw err;
                            callback(null, result);
                        });

                        //var aaa = require(DataFilename);
                        //callback(null, aaa);
                    }
                })
            },
            // 检查当前配置数据的合规性.
            function (AutoObject, callback) {
                AutoObjectCheckVaild(AutoObject, function (retAutoObject) {
                    if (retAutoObject.resMsg.code != 200) {
                        autologger.logs(500, "execute step [ AutoObjectCheckVaild ] is FAIL!", retAutoObject);

                        maincallback(retAutoObject);
                    } else {
                        // 全部检查合规，继续执行下一步。
                        callback(null, AutoObject);
                    }
                })
            },
            function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ ChooseVirtualVolumes ] !");
                // 扫描所有已经Claim的Storage Volume, 选择满足容量与需求容量相等的volume
                ChooseVirtualVolumes(AutoObject, function (result) {
                    if (result.resMsg.code != 200) {
                        autologger.logs(result.resMsg.code, "execute step [ ChooseVirtualVolumes ] is FAIL!", result);
                        maincallback(result);


                    } else
                        callback(null, result);
                })
            }
            , function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ GenerateActionParamaters ] !");
                // Generate action paramaters
                var AutoObjectResult = GenerateActionParamaters(AutoObject);
                if (AutoObjectResult.resMsg.code != 200) {
                    autologger.logs(AutoObject.resMsg.code, "execute step [ GenerateActionParamaters ] is FAIL!", AutoObject);
                    maincallback(AutoObjectResult);
                } else
                    callback(null, AutoObjectResult);
            }
            , function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ Execute Automateion function for each action ] !");
                // -----------------------------------------------------------
                // Execute Automateion function for each action
                // ----------------------------------------------------------
                var opsType = AutoObject.request.opsType;
                if (opsType !== undefined && opsType == "review") {
                    autologger.logs(200, "Operation is  [ " + opsType + " ]. Only review execute paramaters.", AutoObject);
                    callback(null, AutoObject);
                } else {
                    autologger.logs(200, "Operation is  [ " + opsType + " ]. Begin execute each action.", AutoObject);

                    var executeParamaters = AutoObject.AutoInfo.ActionParamaters;
                    var ws = AutoObject.request.ws;



                    async.mapSeries(executeParamaters, function (executeParamater, subcallback) {
                        autologger.logs(200, "Execute action: [ " + executeParamater.method + " ]. depend on action: [" + executeParamater.DependOnAction + "].", AutoObject);

                        executeParamater["array"] = arrayInfo;

                        switch (executeParamater.method) {
                            case 'CreateExtent':
                                CreateExtent(executeParamater, function (result) {
                                    console.log("%%%%%\n" + result + "%%%%%\n");
                                    executeParamater.show = "true";
                                    executeParamater.response = result;
                                    ws.send(JSON.stringify(executeParamaters));

                                    subcallback(null, result);
                                })
                                break;
                            case 'CreateLocalDevice':
                                CreateLocalDevice(executeParamater, function (result) {

                                    executeParamater.show = "true";
                                    executeParamater.response = result;
                                    ws.send(JSON.stringify(executeParamaters));



                                    subcallback(null, result);
                                })
                                break;
                            case 'CreateDistributedDevice':
                                CreateDistributedDevice(executeParamater, function (result) {

                                    executeParamater.show = "true";
                                    executeParamater.response = result;
                                    ws.send(JSON.stringify(executeParamaters));

                                    subcallback(null, result);
                                })
                                break;

                            case 'CreateDistributedVirtualVolume':
                                CreateVirtualVolume(executeParamater, function (result) {

                                    executeParamater.show = "true";
                                    executeParamater.response = result;
                                    ws.send(JSON.stringify(executeParamaters));

                                    subcallback(null, result);
                                })
                                break;

                            case 'AssignConsistencyGroup':
                                AssignConsistencyGroup(executeParamater, function (result) {

                                    executeParamater.show = "true";
                                    executeParamater.response = result;
                                    ws.send(JSON.stringify(executeParamaters));

                                    subcallback(null, result);
                                })
                                break;

                            case 'AssignStorageView':
                                AssignStorageView(executeParamater, function (result) {

                                    executeParamater.show = "true";
                                    executeParamater.response = result;
                                    ws.send(JSON.stringify(executeParamaters));

                                    subcallback(null, result);
                                })
                                break;
                            default:
                                autologger.logs(404, "action [ " + executeParamater.method + " ] has not defined!", AutoObject);
                                subcallback("error", executeParamater.method);
                                break;
                        }

                    },
                        function (err, result) {
                            AutoObject.ActionResponses = result;

                            callback(null, AutoObject);
                        }
                    )
                }
            }
        ], function (err, result) {
            // result now equals 'done' 


            maincallback(result);
        });
}

function CapacityProvisingServiceTEST(AutoObject, maincallback) {

    AutoObject.resMsg.code = 200;
    AutoObject.resMsg.message.push("Begin execute service [ CapacityProvisingService ] !");
    autologger.logger.info("Begin execute service [ CapacityProvisingService ] !");

    console.log("CapacityProvisingServiceTEST begin")

    AutoObject.AutoInfo["ActionParamaters"] = [];

    /*
    Get VPlex Acces info (AutoObject.AutoInfo.RuleResults.ArrayInfo.info)
        {
        "name":"EMCCTEST",
        "array_type":"VPLEX",
        "version":"5.5",
        "endpoint":"https://10.32.32.100/vplex",
        "auth":{
            "username":"service",
            "password":"password"
        } 
    */
    var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
    var request = AutoObject.request;



    var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
    AutoObject.AutoInfo["ActionResult"] = { "PhysicalVolumes": [], "StorageView": [] };
    var ActionResult = AutoObject.AutoInfo.ActionResult;

    var physicalArrayInfos = [];
    for (var i in AutoObject.AutoInfo.RuleResults.ArrayInfo["backend_array"]) {
        var item = AutoObject.AutoInfo.RuleResults.ArrayInfo["backend_array"][i];
        physicalArrayInfos.push(item);
    }
    var stopgroupname = "Providing Product Volume";
    async.waterfall(
        [
            /* -----------------------------------------------------------------------------
                PART ONE:  Create Product virtual volumes in VPLEX
            -   --------------------------------------------------------------------------------------*/
            // STEP 1: Create Prod physical device in 2 backend physical array behind VPLEX Metro.
            // 1.1 Combind the create paramater.
            function (callback) {
                var request = AutoObject.request;


                var capacityBYTE = request.capacity * 1024 * 1024 * 1024;
                var timestamp = request.timestamp;


                GenerateCreatePhysicalVolumeParamater(stopgroupname, arrayInfo, request, timestamp, function (code, result) {
                    for (var i in result) {
                        var resultItem = {};
                        resultItem["physicalVolumeName"] = result[i].StorageVolumeName;
                        resultItem["position"] = result[i].position;
                        resultItem["arrayinfo"] = result[i].arrayinfo;
                        resultItem["response"] = result[i].response;


                        ActionResult.PhysicalVolumes.push(resultItem);
                        ActionParamaters.push(result[i])
                    }
                    callback(null, AutoObject);
                })

            },
            function (arg1, callback) {
                var paramater = {
                    "StepGroupName": stopgroupname,
                    "Step": "re-discovery physical array in vplex",
                    "method": "ReDiscoverPhysicalArray",
                    "arrayinfo": arrayInfo.info
                }
                ActionParamaters.push(paramater);
                callback(null, AutoObject);
            },
            function (arg1, callback) {
                var paramater = {
                    "StepGroupName": stopgroupname,
                    "Step": "claim physical in vplex",
                    "method": "ClaimPhysicalVolume",
                    "arrayinfo": arrayInfo.info
                }
                ActionParamaters.push(paramater);
                callback(null, AutoObject);
            },
            function (arg1, callback) {
                var storageVolumes = [];
                for (var i in ActionResult.PhysicalVolumes) {
                    var item = ActionResult.PhysicalVolumes[i];
                    storageVolumes.push(item.physicalVolumeName);
                }
                var CreateExtentParamater = {
                    "StepGroupName": stopgroupname,
                    "Step": '创建Extent',
                    "method": 'CreateExtent',
                    "DependOnAction": "CreatePhysicalDevice",
                    "arrayinfo": arrayInfo.info,
                    "StorageVolumeName": storageVolumes.toString()
                }
                ActionParamaters.push(CreateExtentParamater);
                callback(null, AutoObject);
            },
            function (arg1, callback) {
                for (var i in ActionResult.PhysicalVolumes) {
                    var item = ActionResult.PhysicalVolumes[i];
                    var createLocalDeviceParamater = {
                        "StepGroupName": stopgroupname,
                        Step: '创建本地存储卷',
                        method: 'CreateLocalDevice',
                        DependOnAction: "CreateExtent",
                        devicename: "device_" + item.physicalVolumeName,    // Need matche "Device Naming Rule"
                        geometry: "raid-0",      // "raid-0",
                        //stripe-depth: Number,  // Default "1"
                        extents: "extent_" + item.physicalVolumeName + "_1", // extents list
                        "arrayinfo": arrayInfo.info
                    }
                    ActionParamaters.push(createLocalDeviceParamater);

                }
                callback(null, AutoObject);
            },
            function (arg1, callback) {
                /*
                    "ActionResult.PhysicalVolumes": [
                        {
                            "physicalVolumeName": "ebankwebesxi-VMAX193_1228204330back01",
                            "position": "primary"
                        },
                        {
                            "physicalVolumeName": "ebankwebesxi-VMAX193_1228204330back02",
                            "position": "primary"
                        },
                        {
                            "physicalVolumeName": "ebankwebesxi-unity785_1228204330back01",
                            "position": "second"
                        },
                        {
                            "physicalVolumeName": "ebankwebesxi-unity785_1228204330back02",
                            "position": "second"
                        }
                    ]  
                */
                var ddResult = [];
                for (var i in ActionResult.PhysicalVolumes) {
                    var item = ActionResult.PhysicalVolumes[i];
                    if (item.position == 'primary') {
                        var volname = item.physicalVolumeName
                        var appname = volname.split('_')[0];
                        var primaryArrayName = volname.split('_')[1];
                        var volumeID1 = volname.split('_')[2];
                        for (var j in ActionResult.PhysicalVolumes) {
                            var item2 = ActionResult.PhysicalVolumes[j];

                            if (item2.position == 'second') {
                                var volname2 = item2.physicalVolumeName
                                var secondArrayName = volname2.split('_')[1];
                                var volumeID2 = volname2.split('_')[2];
                                if (volumeID1 == volumeID2) {

                                    var ddDeviceName = `dd_${appname}_${primaryArrayName}_${secondArrayName}_${volumeID1}`;
                                    var devices = [];
                                    devices.push("device_" + volname)
                                    devices.push("device_" + volname2);
                                    var ddResultItem = { "sourcedevice": "device_" + volname, "ddDeviceName": ddDeviceName, "devices": devices }

                                    ddResult.push(ddResultItem);
                                }
                            }

                        }
                    }

                }
                for (var i in ddResult) {
                    var item = ddResult[i];

                    var CreateDistributedDeviceParamater = {
                        "StepGroupName": stopgroupname,
                        Step: '创建分布式存储卷: ' + ddDeviceName,
                        method: 'CreateDistributedDevice',
                        DependOnAction: "CreateLocalDevice",
                        devicename: item.ddDeviceName,
                        devices: item.devices,
                        sourcedevice: item.sourcedevice,
                        arrayinfo: arrayInfo.info
                    }
                    ActionParamaters.push(CreateDistributedDeviceParamater);

                }

                callback(null, ddResult);
            },
            function (ddResult, callback) {
                for (var i in ddResult) {
                    var item = ddResult[i];

                    var CreateDistributedVirtualVolumeParamater = {
                        "StepGroupName": stopgroupname,
                        Step: '创建分布式虚拟存储卷',
                        method: 'CreateDistributedVirtualVolume',
                        DependOnAction: "CreateDistributedDevice",
                        devicename: item.ddDeviceName,
                        arrayinfo: arrayInfo.info
                    }
                    ActionParamaters.push(CreateDistributedVirtualVolumeParamater);


                }
                callback(null, ddResult);
            },
            function (ddResult, callback) {
                var ConsistencyGroupName = GenerateConsistencyGroupName(request);

                for (var i in ddResult) {
                    var item = ddResult[i];
                    var DistributedVirtualVolumeName = item.ddDeviceName + "_vol"
                    item["DistributedVirtualVolumeName"] = DistributedVirtualVolumeName;

                    var AssignConsistencyGroupParamater = {
                        "StepGroupName": stopgroupname,
                        Step: '分配虚拟存储卷到一致性组(Consistency Group): ' + ConsistencyGroupName,
                        method: 'AssignConsistencyGroup',
                        DependOnAction: "CreateDistributedDevice",
                        virtual_volume: DistributedVirtualVolumeName,
                        consistency_group: ConsistencyGroupName,
                        arrayinfo: arrayInfo.info
                    }
                    ActionParamaters.push(AssignConsistencyGroupParamater);
                }
                callback(null, ddResult);
            },
            function (ddResult, callback) {

                var vvols = [];

                for (var i in ddResult) {
                    var item = ddResult[i];
                    var DistributedVirtualVolumeName = item.DistributedVirtualVolumeName;

                    vvols.push(DistributedVirtualVolumeName);
                }

                var clusters = ['cluster-1', 'cluster-2']
                async.mapSeries(clusters, function (clustername, callback) {
                    GetStorageViews(arrayInfo.info, clustername, function (result) {
                        var res = { "clustername": clustername, "viewname": result.response }
                        callback(null, res);

                    })
                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    };

                    var finalResult = {};
                    for (var i in result) {
                        var item = result[i];
                        finalResult[item.clustername] = item.viewname;
                    }
                    ActionResult.StorageView = finalResult;

                    var views = [];
                    var ViewName = GenerateStorateViewName(request, "prod");
                    views.push(ViewName);
                    if (request.ProtectLevel.AppVerification_SameCity == true) {
                        var ViewName_AppVerification_SameCity = GenerateStorateViewName(request, "AppVerification_SameCity");
                        views.push(ViewName_AppVerification_SameCity);
                    }
                    if (request.ProtectLevel.AppVerification_DiffCity == true) {
                        var ViewName_AppVerification_DiffCity = GenerateStorateViewName(request, "AppVerification_DiffCity");
                        views.push(ViewName_AppVerification_DiffCity);
                    }
                    if (request.ProtectLevel.Backup == true) {
                        var ViewName_Backup = GenerateStorateViewName(request, "Backup");
                        views.push(ViewName_Backup);
                    }
                    // remove duplicate view name
                    var views = Array.from(new Set(views));


                    for (var i in views) {
                        var viewItem = views[i];
                        for (var clustername in finalResult) {
                            var viewnames = finalResult[clustername];

                            if (viewnames.indexOf(viewItem) >= 0) {
                                var AssignStorageViewParamater = {
                                    "StepGroupName": stopgroupname,
                                    Step: '分配虚拟化存储卷至存储视图（Storage View）:' + viewItem,
                                    method: 'AssignStorageView',
                                    DependOnAction: "CreateDistributedDevice",
                                    clustername: clustername,
                                    viewname: viewItem,
                                    virtualvolumes: vvols,
                                    arrayinfo: arrayInfo.info
                                }
                                ActionParamaters.push(AssignStorageViewParamater);
                            }

                        }
                    }
                    if (ActionResult["ProvisedVolumes"] === undefined) ActionResult["ProvisedVolumes"] = { "Prod": [], "Local": [], "Remote": [] }
                    ActionResult.ProvisedVolumes.Prod = vvols;
                    callback(null, ddResult);


                }
                )


            },

            /* -----------------------------------------------------------------------------
                PART TWO:  Create Local Protect Volumes for RPA in Local Protect Array
            -   --------------------------------------------------------------------------------------*/
            function (arg1, callback) {
                if (
                    request.ProtectLevel.AppVerification_SameCity == true
                    ||
                    request.ProtectLevel.AppVerification_DiffCity == true
                ) {
                    // Need to protect using RPA
                    if (arrayInfo.capability.CDP !== undefined) {
                        var resourceCDPInfo = arrayInfo.capability.CDP;
                        var catalog = resourceCDPInfo.catalog;
                        var cdpname = resourceCDPInfo.name;

                        var isfind = false;
                        for (var i in StorageCapability.CDP.RPA) {
                            var item = StorageCapability.CDP.RPA[i];
                            if (item.name == cdpname) {
                                isfind = true;
                                AutoObject.AutoInfo.ResourceInfo["CDP"] = item;
                                CDPProvider(AutoObject, function (result) {

                                    callback(null, AutoObject);
                                });
                                break;
                            }
                        }
                        if (isfind == false) {
                            autologger.logs(500, `Not defined CDP Info in configure file [ StorageCapability.json ], CDP Name is [${cdpname}] `, AutoObject);
                            callback(500, AutoObject);
                        }

                    } else {
                        autologger.logs(500, "Not defined CDP Info in configure file [ StorageCapability.json ] ", AutoObject);
                        callback(500, AutoObject);
                    }


                }  // if ( need to rpa protect )
                else
                    callback(null, AutoObject);
            }
        ], function (err, result) {

            maincallback(AutoObject);
        });
}

function CDPProvider(AutoObject, maincallback) {

    var request = AutoObject.request;
    var timestamp = request.timestamp;
    var RPAInfo = AutoObject.AutoInfo.ResourceInfo.CDP.info;
    var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
    var ActionResult = AutoObject.AutoInfo.ActionResult;
    ActionResult["CDPLocalVolumes"] = [];
    ActionResult["CDPRemoteVolumes"] = [];

    async.waterfall(
        [
            function (callback) {
                var cdpinfo = AutoObject.AutoInfo.ResourceInfo["CDP"];
                var info = { "cdpinfo": cdpinfo }


                RPA.GetConsistencyGroups(RPAInfo, function (result) {
                    info["RPA_CG"] = result;
                    callback(null, info);
                });

            },
            // CDP Replicate Prod Volume : Mapping to RPA Storage Group Only
            function (info, callback) {
                var cdpinfo = info.cdpinfo;
                var prodCDPInfo = cdpinfo["backend_array"].Prod;
                var sgname = prodCDPInfo.sgname;
                var clustername = prodCDPInfo.clustername;
                var vplexinfo = prodCDPInfo.info;

                var stepgroupname = "Providing RPA replicate Prod volume";



                var isfind = false;
                for (var i in ActionParamaters) {
                    var item = ActionParamaters[i];
                    if ((item.StepGroupName == "Providing Product Volume") && (item.method == "AssignStorageView")) {
                        isfind = true;
                        var newItem = {};
                        for (var fieldname in item) {
                            switch (fieldname) {
                                case "StepGroupName":
                                    newItem[fieldname] = stepgroupname;
                                    break;
                                case "Step":
                                    newItem[fieldname] = `分配虚拟化存储卷至存储视图（Storage View）: ${sgname}`;
                                    break;
                                case "viewname":
                                    newItem[fieldname] = sgname;
                                    break;
                                case "clustername":
                                    newItem[fieldname] = clustername;
                                    break;
                                case "virtualvolumes":
                                    var VirtualVolumes = item[fieldname];
                                    newItem[fieldname] = item[fieldname];
                                    break;
                                default:
                                    newItem[fieldname] = item[fieldname];
                                    break;
                            }
                        }
                        ActionParamaters.push(newItem);
                    }
                }
                if (isfind == false) {
                    console.log("Warnning: Prod volume not find assignStorageView Operstion!");
                }
                if (VirtualVolumes == undefined) {
                    console.log("Warning: not find virtual volume in assignStorageView Operstion!")
                }


                callback(null, info);
            },
            // CDP Replicate Local Volume
            function (info, callback) {
                var cdpinfo = info.cdpinfo;

                var stepgroupname = "Providing RPA replicate local volume";

                var LocalCDPInfo = cdpinfo["backend_array"].Local;
                switch (LocalCDPInfo.arraytype) {
                    case "VPLEX":
                        for (var j = 1; j <= request.count; j++) {
                            if (request.count < 10) var volno = '0' + j;
                            else volno = j;

                            // Assign local virutal volume to consistency group for CDP 
                            var CDPConsistencyGroupName = LocalCDPInfo.consistencygroup;


                            if (LocalCDPInfo["backend_array"].length == 1) {
                                var arrayinfo = LocalCDPInfo["backend_array"][0];
                                if (arrayinfo.array_type == 'VMAX') {
                                    var arraysn = arrayinfo.serial_no;
                                    var capacityBYTE = request.capacity * 1024 * 1024 * 1024;
                                    var volName = VMAX.GenerateVolName(arrayinfo, request, timestamp) + volno;
                                } else if (arrayinfo.array_type == 'Unity') {
                                    var arraysn = arrayinfo.unity_sn;
                                    var capacityBYTE = (request.capacity * 1024 * 1024 * 1024) + 100 * 1024 * 1024;
                                    var volName = UNITY.GenerateVolName(arrayinfo, request, timestamp) + volno;
                                }
                                volName = volName + "_local";

                                var CreateArrayDeviceParamater = {
                                    "StepGroupName": stepgroupname,
                                    "Step": `RPA-Local: Create device and assign to sg [${arrayinfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ]`,
                                    "method": "CreatePhysicalDevice",
                                    "arrayinfo": arrayinfo,
                                    "DependOnAction": "N/A",
                                    "AsignSGName": arrayinfo.sgname,
                                    "StorageVolumeName": volName,
                                    "capacityByte": capacityBYTE
                                }
                                ActionParamaters.push(CreateArrayDeviceParamater);
                                ActionResult.CDPLocalVolumes.push(volName);

                            } else {
                                autologger.logs(500, "Not support mutil backend array for CDP Local Protect.", AutoObject);
                                callback(500, AutoObject);
                            }

                        }

                        var vplexinfo = LocalCDPInfo.info;
                        var paramater = {
                            "StepGroupName": stepgroupname,
                            "Step": "RPA-Local: re-discovery physical array in vplex",
                            "method": "ReDiscoverPhysicalArray",
                            "arrayinfo": vplexinfo
                        }
                        ActionParamaters.push(paramater);

                        var paramater = {
                            "StepGroupName": stepgroupname,
                            "Step": "RPA-Local: claim physical in vplex",
                            "method": "ClaimPhysicalVolume",
                            "arrayinfo": vplexinfo
                        }
                        ActionParamaters.push(paramater);

                        var CreateExtentParamater = {
                            "StepGroupName": stepgroupname,
                            "Step": 'RPA-Local: 创建Extent',
                            "method": 'CreateExtent',
                            "DependOnAction": "CreatePhysicalDevice",
                            "arrayinfo": vplexinfo,
                            "StorageVolumeName": ActionResult.CDPLocalVolumes.toString()
                        }
                        ActionParamaters.push(CreateExtentParamater);

                        var VirtualVolumes = [];
                        for (var i in ActionResult.CDPLocalVolumes) {
                            var volname = ActionResult.CDPLocalVolumes[i];

                            var createLocalDeviceParamater = {
                                "StepGroupName": stepgroupname,
                                Step: 'RPA-Local: 创建本地存储卷',
                                method: 'CreateLocalDevice',
                                DependOnAction: "CreateExtent",
                                devicename: "device_" + volname,    // Need matche "Device Naming Rule"
                                geometry: "raid-0",      // "raid-0",
                                //stripe-depth: Number,  // Default "1"
                                extents: "extent_" + volname + '_1', // extents list
                                "arrayinfo": vplexinfo
                            }
                            ActionParamaters.push(createLocalDeviceParamater);

                            var CreateVirtualVolumeParamater = {
                                "StepGroupName": stepgroupname,
                                Step: 'RPA-Local: 创建本地虚拟存储卷',
                                method: 'CreateVirtualVolume',
                                DependOnAction: "CreateLocalDevice",
                                devicename: "device_" + volname,
                                arrayinfo: vplexinfo
                            }
                            ActionParamaters.push(CreateVirtualVolumeParamater);

                            VirtualVolumes.push("device_" + volname + "_vol");
                        }
                        ActionResult.ProvisedVolumes.Local = VirtualVolumes;

                        // Assign local virutal volume to consistency group for CDP 
                        var CDPConsistencyGroupName = LocalCDPInfo.consistencygroup;
                        var AssignConsistencyGroupParamater = {
                            "StepGroupName": stepgroupname,
                            Step: 'RPA-Local: 分配虚拟存储卷到一致性组(Consistency Group): ' + CDPConsistencyGroupName,
                            method: 'AssignConsistencyGroup',
                            DependOnAction: "CreateVirtualVolume",
                            virtual_volume: VirtualVolumes,
                            consistency_group: CDPConsistencyGroupName,
                            arrayinfo: vplexinfo
                        }
                        ActionParamaters.push(AssignConsistencyGroupParamater);


                        // Assign virtual volume to storage view
                        var RPStorageView = LocalCDPInfo.sgname;
                        var storageviews = ActionResult.StorageView;

                        var isfind = false;
                        for (var clustername in storageviews) {
                            var viewnames = storageviews[clustername];

                            viewnames.forEach(function (value, index) {
                                if (value == RPStorageView) {
                                    isfind = true;
                                    var AssignStorageViewParamater = {
                                        "StepGroupName": stepgroupname,
                                        Step: 'RPA-Local: 分配虚拟化存储卷至存储视图（Storage View）:' + RPStorageView,
                                        method: 'AssignStorageView',
                                        DependOnAction: "CreateDistributedDevice",
                                        clustername: clustername,
                                        viewname: RPStorageView,
                                        virtualvolumes: VirtualVolumes,
                                        arrayinfo: vplexinfo
                                    }
                                    ActionParamaters.push(AssignStorageViewParamater);
                                }
                            })
                        }
                        if (isfind == false) {
                            autologger.logs(500, `Not found storageview [${RPStorageView}] in VPLEX`, AutoObject);
                            callback(500, AutoObject);
                        }


                        break;
                    case "VMAX":

                        break;

                    case "Unity":

                        break;
                    default:
                        autologger.logs(500, `Not support cdp backend array type [${LocalCDPInfo.arraytype}]`, AutoObject);
                        callback(500, AutoObject);
                        break;
                }

                callback(null, info);
            },
            // CDP Replicate Remote Volume
            function (info, callback) {
                var cdpinfo = info.cdpinfo;
                var stepgroupname = "Providing RPA replicate remote volume";
                var remoteCDPInfo = cdpinfo["backend_array"].Remote;
                switch (remoteCDPInfo.arraytype) {
                    case "VPLEX":


                        break;
                    case "Unity":

                        for (var j = 1; j <= request.count; j++) {
                            if (request.count < 10) var volno = '0' + j;
                            else volno = j;

                            var arrayinfo = remoteCDPInfo.info;
                            var arraysn = arrayinfo.unity_sn;
                            var capacityBYTE = (request.capacity * 1024 * 1024 * 1024) + 100 * 1024 * 1024;
                            var volName = UNITY.GenerateVolName(arrayinfo, request, timestamp) + volno;
                            volName = volName + "_remote";


                            var CreateArrayDeviceParamater = {
                                "StepGroupName": stepgroupname,
                                "Step": `RPA-Remote: Create device and assign to sg [${remoteCDPInfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ]`,
                                "method": "CreatePhysicalDevice",
                                "arrayinfo": arrayinfo,
                                "DependOnAction": "N/A",
                                "AsignSGName": remoteCDPInfo.sgname,
                                "StorageVolumeName": volName,
                                "capacityByte": capacityBYTE
                            }
                            ActionParamaters.push(CreateArrayDeviceParamater);
                            ActionResult.CDPRemoteVolumes.push(volName);


                        }

                        ActionResult.ProvisedVolumes.Remote = ActionResult.CDPRemoteVolumes;



                        break;
                    case "VMAX":

                        break;
                    default:
                        autologger.logs(500, `Not support cdp backend array type [${remoteCDPInfo.arraytype}]`, AutoObject);
                        callback(500, AutoObject);
                        break;
                }


                callback(null, info);
            },
            // CDP CG journal volumes
            function (info, callback) {

                /* ------------------------------------------
                    RPA Operation
                ----------------------------------------------------*/
                var cdpinfo = info.cdpinfo;
                var RPA_CG = info.RPA_CG;
                console.log(RPA_CG);
                var journalBackendArray = AutoObject.AutoInfo.ResourceInfo.CDP["journal_backend_array"];

                if (ActionResult.ProvisedVolumes.Prod !== undefined) {
                    for (var i in ActionResult.ProvisedVolumes.Prod) {
                        var prodVolname = ActionResult.ProvisedVolumes.Prod[i];
                        var localVolname = ActionResult.ProvisedVolumes.Local[i];
                        var RemoteVolname = ActionResult.ProvisedVolumes.Remote[i];

                        var ReplicationsetName = "rs_" + prodVolname.split('_')[4];


                        // for TEST at 20200103 at ShandongCity Bank , Test CG name = Test_CG
                        var CGName = prodVolname.split('_')[1] + "_CG";
                        //var CGName = "Test_CG"

                        //1. verify consistency group exist.  
                        var isfind = false;
                        for (var i in RPA_CG) {
                            var cgItem = RPA_CG[i];
                            if (cgItem.name == CGName) {
                                isfind = true;

                                var createReplicationSetParamater = {
                                    "StepGroupName": "RPA Replicate Configuration",
                                    "Step": "RPA-Local: 在RPA中创建Replication Set: " + ReplicationsetName,
                                    "method": "RAPCreateReplicationSet",
                                    "DependOnAction": "CreateDistributedDevice",
                                    "CGName": CGName,
                                    "ReplicationsetName": ReplicationsetName,
                                    "prod": prodVolname,
                                    "local": localVolname,
                                    "remote": RemoteVolname,
                                    "arrayinfo": RPAInfo
                                }


                                ActionParamaters.push(createReplicationSetParamater);
                            }
                        }

                        //
                        // RPA Consistency Group is not exist!, need to create it.
                        //
                        if (isfind == false) {

                            // -------------------------
                            // Create Journal volume;
                            // ---------------------
                            var journaltypes = ['Prod', 'Local', 'Remote'];
                            var JournalCapacityGB = 10;

                            for (var i in journaltypes) {
                                var journaltype = journaltypes[i];

                                var stepgroupname = `RPA Consistoncy Group ${journaltype} journal volume`
                                //var volName = `${CGName}_Prod_Log_01_${timestamp}`;
                                var volName = `${CGName}_${journaltype}_Log_01_${timestamp}`;
                                var capacityBYTE = JournalCapacityGB * 1024 * 1024 * 1024;

                                // create CG journal volume 
                                var arrayinfo = journalBackendArray[journaltype].arrayinfo;
                                switch (arrayinfo.array_type) {
                                    case 'VPLEX':
                                        var arraysn = arrayinfo.arrayname;
                                        var backend_array = arrayinfo["backend_array"][0];
                                        console.log(arrayinfo);
                                        // 如果RPA的Journal Volume是从VPLEX分配出来，则指定该卷是从哪个cluster中映射到RPA中
                                        var clustername = arrayinfo.clustername;
                                        var sgname = arrayinfo.sgname;
                                        var cgname = arrayinfo.consistencygroup;
                                        var result = CreateVirtualVolumeService(stepgroupname, arrayinfo.info, backend_array, volName, JournalCapacityGB, clustername, sgname, cgname);
                                        for (var z in result) {
                                            var item = result[z];
                                            ActionParamaters.push(item);
                                        }

                                        console.log("TEST");
                                        break;
                                    case 'VMAX':
                                    case 'Unity':
                                        var arraysn = (arrayinfo.array_type == "VMAX") ? arrayinfo.serial_no : arrayinfo.unity_sn;

                                        var CreateArrayDeviceParamater = {
                                            "StepGroupName": stepgroupname,
                                            "Step": `Create device and assign to sg [${arrayinfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ] for RPA ${journaltype} Journal volume.`,
                                            "method": "CreatePhysicalDevice",
                                            "arrayinfo": arrayinfo,
                                            "DependOnAction": "N/A",
                                            "AsignSGName": arrayinfo.sgname,
                                            "StorageVolumeName": volName,
                                            "capacityByte": capacityBYTE
                                        }
                                        ActionParamaters.push(CreateArrayDeviceParamater);

                                        break;
                                    default:

                                        break;
                                }

                                if (ActionResult.CDPJournal === undefined) ActionResult["CDPJournal"] = { "Prod": "", "Local": "", "Remote": "" };
                                ActionResult.CDPJournal[journaltype] = volName;




                            }

                            //var ClusterName = 'cluster1';
                            var ClusterName = cdpinfo.info.cluster1;
                            var createCGParamater = {
                                "StepGroupName": "RPA Replicate Configuration",
                                "Step": "RPA-Local: 在RPA中创建Consistency Group: " + CGName,
                                "method": "RAPCreateConsistencyGroup",
                                "DependOnAction": "CreateDistributedDevice",
                                "ClusterName": ClusterName,
                                "CGName": CGName,
                                "ProdJournalVolume": ActionResult.CDPJournal.Prod,
                                "LocalJournalVolume": ActionResult.CDPJournal.Local,
                                "RemoteJournalVolume": ActionResult.CDPJournal.Remote,
                                "arrayinfo": RPAInfo
                            }
                            ActionParamaters.push(createCGParamater);

                            var createReplicationSetParamater = {
                                "StepGroupName": "RPA Replicate Configuration",
                                "Step": "RPA-Local: 在RPA中创建Replication Set: " + ReplicationsetName,
                                "method": "RAPCreateReplicationSet",
                                "DependOnAction": "CreateDistributedDevice",
                                "CGName": CGName,
                                "ReplicationsetName": ReplicationsetName,
                                "prod": prodVolname,
                                "local": localVolname,
                                "remote": RemoteVolname,
                                "arrayinfo": RPAInfo
                            }
                            ActionParamaters.push(createReplicationSetParamater);


                        }

                    }

                }

                callback(null, info);
            }
        ], function (err, result) {

            maincallback(AutoObject);
        });
}

function CDPProvider1(AutoObject, maincallback) {

    var request = AutoObject.request;
    var timestamp = request.timestamp;
    var RPAInfo = AutoObject.AutoInfo.ResourceInfo.CDP.info;
    var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
    var ActionResult = AutoObject.AutoInfo.ActionResult;
    ActionResult["CDPLocalVolumes"] = [];
    ActionResult["CDPRemoteVolumes"] = [];

    async.waterfall(
        [
            function (callback) {
                var cdpinfo = AutoObject.AutoInfo.ResourceInfo["CDP"];
                var info = { "cdpinfo": cdpinfo }


                RPA.GetConsistencyGroups(RPAInfo, function (result) {
                    info["RPA_CG"] = result;
                    callback(null, info);
                });

            },
            function (info, callback) {
                var cdpinfo = info.cdpinfo;

                var LocalCDPInfo = cdpinfo["backend_array"].Local;
                switch (LocalCDPInfo.arraytype) {
                    case "VPLEX":
                        for (var j = 1; j <= request.count; j++) {
                            if (request.count < 10) var volno = '0' + j;
                            else volno = j;

                            // Assign local virutal volume to consistency group for CDP 
                            var CDPConsistencyGroupName = LocalCDPInfo.consistencygroup;


                            if (LocalCDPInfo["backend_array"].length == 1) {
                                var arrayinfo = LocalCDPInfo["backend_array"][0];
                                if (arrayinfo.array_type == 'VMAX') {
                                    var arraysn = arrayinfo.serial_no;
                                    var capacityBYTE = request.capacity * 1024 * 1024 * 1024;
                                    var volName = VMAX.GenerateVolName(arrayinfo, request, timestamp) + volno;
                                } else if (arrayinfo.array_type == 'Unity') {
                                    var arraysn = arrayinfo.unity_sn;
                                    var capacityBYTE = (request.capacity * 1024 * 1024 * 1024) + 100 * 1024 * 1024;
                                    var volName = UNITY.GenerateVolName(arrayinfo, request, timestamp) + volno;
                                }
                                volName = volName + "_local";

                                var CreateArrayDeviceParamater = {
                                    "Step": `RPA-Local: Create device and assign to sg [${arrayinfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ]`,
                                    "method": "CreatePhysicalDevice",
                                    "arrayinfo": arrayinfo,
                                    "DependOnAction": "N/A",
                                    "AsignSGName": arrayinfo.sgname,
                                    "StorageVolumeName": volName,
                                    "capacityByte": capacityBYTE
                                }
                                ActionParamaters.push(CreateArrayDeviceParamater);
                                ActionResult.CDPLocalVolumes.push(volName);

                            } else {
                                autologger.logs(500, "Not support mutil backend array for CDP Local Protect.", AutoObject);
                                callback(500, AutoObject);
                            }

                        }

                        var vplexinfo = LocalCDPInfo.info;
                        var paramater = {
                            "Step": "RPA-Local: re-discovery physical array in vplex",
                            "method": "ReDiscoverPhysicalArray",
                            "arrayinfo": vplexinfo
                        }
                        ActionParamaters.push(paramater);

                        var paramater = {
                            "Step": "RPA-Local: claim physical in vplex",
                            "method": "ClaimPhysicalVolume",
                            "arrayinfo": vplexinfo
                        }
                        ActionParamaters.push(paramater);

                        var CreateExtentParamater = {
                            "Step": 'RPA-Local: 创建Extent',
                            "method": 'CreateExtent',
                            "DependOnAction": "CreatePhysicalDevice",
                            "arrayinfo": vplexinfo,
                            "StorageVolumeName": ActionResult.CDPLocalVolumes.toString()
                        }
                        ActionParamaters.push(CreateExtentParamater);

                        var VirtualVolumes = [];
                        for (var i in ActionResult.CDPLocalVolumes) {
                            var volname = ActionResult.CDPLocalVolumes[i];

                            var createLocalDeviceParamater = {
                                Step: 'RPA-Local: 创建本地存储卷',
                                method: 'CreateLocalDevice',
                                DependOnAction: "CreateExtent",
                                devicename: "device_" + volname,    // Need matche "Device Naming Rule"
                                geometry: "raid-0",      // "raid-0",
                                //stripe-depth: Number,  // Default "1"
                                extents: "extent_" + volname + '_1', // extents list
                                "arrayinfo": vplexinfo
                            }
                            ActionParamaters.push(createLocalDeviceParamater);

                            var CreateVirtualVolumeParamater = {
                                Step: 'RPA-Local: 创建本地虚拟存储卷',
                                method: 'CreateVirtualVolume',
                                DependOnAction: "CreateLocalDevice",
                                devicename: "device_" + volname,
                                arrayinfo: vplexinfo
                            }
                            ActionParamaters.push(CreateVirtualVolumeParamater);

                            VirtualVolumes.push("device_" + volname + "_vol");
                        }
                        ActionResult.ProvisedVolumes.Local = VirtualVolumes;

                        // Assign local virutal volume to consistency group for CDP 
                        var CDPConsistencyGroupName = LocalCDPInfo.consistencygroup;
                        var AssignConsistencyGroupParamater = {
                            Step: 'RPA-Local: 分配虚拟存储卷到一致性组(Consistency Group): ' + CDPConsistencyGroupName,
                            method: 'AssignConsistencyGroup',
                            DependOnAction: "CreateVirtualVolume",
                            virtual_volume: VirtualVolumes,
                            consistency_group: CDPConsistencyGroupName,
                            arrayinfo: vplexinfo
                        }
                        ActionParamaters.push(AssignConsistencyGroupParamater);


                        // Assign virtual volume to storage view
                        var RPStorageView = LocalCDPInfo.sgname;
                        var storageviews = ActionResult.StorageView;

                        var isfind = false;
                        for (var clustername in storageviews) {
                            var viewnames = storageviews[clustername];

                            if (viewnames.indexOf(RPStorageView) >= 0) {
                                isfind = true;
                                var AssignStorageViewParamater = {
                                    Step: 'RPA-Local: 分配虚拟化存储卷至存储视图（Storage View）:' + RPStorageView,
                                    method: 'AssignStorageView',
                                    DependOnAction: "CreateDistributedDevice",
                                    clustername: clustername,
                                    viewname: RPStorageView,
                                    virtualvolumes: VirtualVolumes,
                                    arrayinfo: vplexinfo
                                }
                                ActionParamaters.push(AssignStorageViewParamater);
                            }
                        }
                        if (isfind == false) {
                            autologger.logs(500, `Not found storageview [${RPStorageView}] in VPLEX`, AutoObject);
                            callback(500, AutoObject);
                        }


                        break;
                    case "VMAX":

                        break;

                    case "Unity":

                        break;
                    default:
                        autologger.logs(500, `Not support cdp backend array type [${LocalCDPInfo.arraytype}]`, AutoObject);
                        callback(500, AutoObject);
                        break;
                }

                callback(null, info);
            },
            function (info, callback) {
                var cdpinfo = info.cdpinfo;
                var remoteCDPInfo = cdpinfo["backend_array"].Remote;
                switch (remoteCDPInfo.arraytype) {
                    case "VPLEX":


                        break;
                    case "Unity":

                        for (var j = 1; j <= request.count; j++) {
                            if (request.count < 10) var volno = '0' + j;
                            else volno = j;

                            var arrayinfo = remoteCDPInfo.info;
                            var arraysn = arrayinfo.unity_sn;
                            var capacityBYTE = (request.capacity * 1024 * 1024 * 1024) + 100 * 1024 * 1024;
                            var volName = UNITY.GenerateVolName(arrayinfo, request, timestamp) + volno;
                            volName = volName + "_remote";


                            var CreateArrayDeviceParamater = {
                                "Step": `RPA-Remote: Create device and assign to sg [${remoteCDPInfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ]`,
                                "method": "CreatePhysicalDevice",
                                "arrayinfo": arrayinfo,
                                "DependOnAction": "N/A",
                                "AsignSGName": remoteCDPInfo.sgname,
                                "StorageVolumeName": volName,
                                "capacityByte": capacityBYTE
                            }
                            ActionParamaters.push(CreateArrayDeviceParamater);
                            ActionResult.CDPRemoteVolumes.push(volName);


                        }

                        ActionResult.ProvisedVolumes.Remote = ActionResult.CDPRemoteVolumes;



                        break;
                    case "VMAX":

                        break;
                    default:
                        autologger.logs(500, `Not support cdp backend array type [${remoteCDPInfo.arraytype}]`, AutoObject);
                        callback(500, AutoObject);
                        break;
                }


                callback(null, info);
            },

            function (info, callback) {

                /* ------------------------------------------
                    RPA Operation
                ----------------------------------------------------*/
                var cdpinfo = info.cdpinfo;
                var RPA_CG = info.RPA_CG;
                console.log(RPA_CG);
                var journalBackendArray = AutoObject.AutoInfo.ResourceInfo.CDP["journal_backend_array"];

                if (ActionResult.ProvisedVolumes.Prod !== undefined) {
                    for (var i in ActionResult.ProvisedVolumes.Prod) {
                        var prodVolname = ActionResult.ProvisedVolumes.Prod[i];
                        var localVolname = ActionResult.ProvisedVolumes.Local[i];
                        var RemoteVolname = ActionResult.ProvisedVolumes.Remote[i];

                        var ReplicationsetName = "rs_" + prodVolname.split('_')[4];


                        // for TEST at 20200103 at ShandongCity Bank , Test CG name = Test_CG
                        var CGName = prodVolname.split('_')[1] + "_CG";
                        //var CGName = "Test_CG"

                        //1. verify consistency group exist.  
                        var isfind = false;
                        for (var i in RPA_CG) {
                            var cgItem = RPA_CG[i];
                            if (cgItem.name == CGName) {
                                isfind = true;

                                var createReplicationSetParamater = {
                                    "Step": "RPA-Local: 在RPA中创建Replication Set: " + ReplicationsetName,
                                    "method": "RAPCreateReplicationSet",
                                    "DependOnAction": "CreateDistributedDevice",
                                    "CGName": CGName,
                                    "ReplicationsetName": ReplicationsetName,
                                    "prod": prodVolname,
                                    "local": localVolname,
                                    "remote": RemoteVolname,
                                    "arrayinfo": RPAInfo
                                }


                                ActionParamaters.push(createReplicationSetParamater);
                            }
                        }

                        //
                        // RPA Consistency Group is not exist!, need to create it.
                        //
                        if (isfind == false) {

                            var JournalCapacityGB = 10

                            // create CG journal volume for Prod
                            var arrayinfo = journalBackendArray.Prod.arrayinfo;
                            var arraysn = (arrayinfo.array_type == "VMAX") ? arrayinfo.serial_no : (arrayinfo.array_type == "VMAX") ? arrayinfo.unity_sn : "unknow";
                            //var volName = `${CGName}_Prod_Log_01_${timestamp}`;
                            var volName = `${CGName}_Prod_Log_01`;
                            var capacityBYTE = JournalCapacityGB * 1024 * 1024 * 1024;
                            var CreateArrayDeviceParamater = {
                                "Step": `RPA: Create device and assign to sg [${arrayinfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ] for RPA Prod Journal volume.`,
                                "method": "CreatePhysicalDevice",
                                "arrayinfo": arrayinfo,
                                "DependOnAction": "N/A",
                                "AsignSGName": arrayinfo.sgname,
                                "StorageVolumeName": volName,
                                "capacityByte": capacityBYTE
                            }
                            //ActionParamaters.push(CreateArrayDeviceParamater);
                            if (ActionResult.CDPJournal === undefined) ActionResult["CDPJournal"] = { "Prod": "", "Local": "", "Remote": "" };

                            ActionResult.CDPJournal.Prod = volName;



                            // create CG journal volume for Local
                            var arrayinfo = journalBackendArray.Local.arrayinfo;
                            var arraysn = (arrayinfo.array_type == "VMAX") ? arrayinfo.serial_no : (arrayinfo.array_type == "VMAX") ? arrayinfo.unity_sn : "unknow";
                            //var volName = `${CGName}_Local_Log_01_${timestamp}`;
                            var volName = `${CGName}_Local_Log_01`;
                            var capacityBYTE = JournalCapacityGB * 1024 * 1024 * 1024;
                            var CreateArrayDeviceParamater = {
                                "Step": `RPA: Create device and assign to sg [${arrayinfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ] for RPA Prod Journal volume.`,
                                "method": "CreatePhysicalDevice",
                                "arrayinfo": arrayinfo,
                                "DependOnAction": "N/A",
                                "AsignSGName": arrayinfo.sgname,
                                "StorageVolumeName": volName,
                                "capacityByte": capacityBYTE
                            }
                            //ActionParamaters.push(CreateArrayDeviceParamater);
                            ActionResult.CDPJournal.Local = volName;



                            // create CG journal volume for Remote
                            var arrayinfo = journalBackendArray.Remote.arrayinfo;
                            var arraysn = (arrayinfo.array_type == "VMAX") ? arrayinfo.serial_no : (arrayinfo.array_type == "VMAX") ? arrayinfo.unity_sn : "unknow";
                            var volName = `${CGName}_Remote_Log_01_${timestamp}`;
                            var capacityBYTE = JournalCapacityGB * 1024 * 1024 * 1024;
                            var CreateArrayDeviceParamater = {
                                "Step": `RPA: Create device and assign to sg [${arrayinfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ] for RPA Prod Journal volume.`,
                                "method": "CreatePhysicalDevice",
                                "arrayinfo": arrayinfo,
                                "DependOnAction": "N/A",
                                "AsignSGName": arrayinfo.sgname,
                                "StorageVolumeName": volName,
                                "capacityByte": capacityBYTE
                            }
                            ActionParamaters.push(CreateArrayDeviceParamater);
                            ActionResult.CDPJournal.Remote = volName;

                            //var ClusterName = 'cluster1';
                            var ClusterName = cdpinfo.info.cluster1;
                            var createCGParamater = {
                                "Step": "RPA-Local: 在RPA中创建Consistency Group: " + CGName,
                                "method": "RAPCreateConsistencyGroup",
                                "DependOnAction": "CreateDistributedDevice",
                                "ClusterName": ClusterName,
                                "CGName": CGName,
                                "ProdJournalVolume": ActionResult.CDPJournal.Prod,
                                "LocalJournalVolume": ActionResult.CDPJournal.Local,
                                "RemoteJournalVolume": ActionResult.CDPJournal.Remote,
                                "arrayinfo": RPAInfo
                            }
                            ActionParamaters.push(createCGParamater);

                            var createReplicationSetParamater = {
                                "Step": "RPA-Local: 在RPA中创建Replication Set: " + ReplicationsetName,
                                "method": "RAPCreateReplicationSet",
                                "DependOnAction": "CreateDistributedDevice",
                                "CGName": CGName,
                                "ReplicationsetName": ReplicationsetName,
                                "prod": prodVolname,
                                "local": localVolname,
                                "remote": RemoteVolname,
                                "arrayinfo": RPAInfo
                            }
                            ActionParamaters.push(createReplicationSetParamater);


                        }

                    }

                }

                callback(null, info);
            }
        ], function (err, result) {

            maincallback(AutoObject);
        });
}

/*
paramaters: {
    "arrayinfo": {

    },
    basevolname: 'voltest',
    usedfor: 'data',
    count: 2,
    capacityGB: 2,
    storageviews: ['sv1','sv2']
}

response: {
    "code": 200,
    "msg": "succeed",
    "request": paramaters;
    "ActionParamaters": [
        {},
        {}
    ]
}
*/
function VPlexProvising(paramaters, maincallback) {

    console.log("VPlexProvising begin")

    var arrayInfo = paramaters.arrayinfo;
    var request = paramaters;
    var response = {
        "code": 200,
        "msg": "succeed",
        "request": paramaters,
        "ActionParamaters": [
        ],
        "ActionResult": { "PhysicalVolumes": [] }
    }
    var ActionParamaters = response.ActionParamaters;
    var ActionResult = response.ActionResult;

    var physicalArrayInfos = [];
    for (var i in arrayInfo["backend_array"]) {
        var item = arrayInfo["backend_array"][i];
        physicalArrayInfos.push(item);
    }

    console.log(physicalArrayInfos);
    async.waterfall(
        [
            // STEP 1: Create Prod physical device in 2 backend physical array behind VPLEX Metro.
            // 1.1 Combind the create paramater.
            function (callback) {

                var capacityBYTE = request.capacityGB * 1024 * 1024 * 1024;
                var timestamp = moment().format('MMDDHHmmss');

                for (var i in physicalArrayInfos) {
                    var item = physicalArrayInfos[i];
                    var arrayType = item.array_type;
                    switch (arrayType) {
                        case 'VMAX':

                            for (var j = 1; j <= request.count; j++) {
                                if (request.count < 10) var volno = '0' + j;
                                else volno = j;

                                //var volName = VMAX.GenerateVolName(item, request, timestamp) + volno;

                                var volName = `${request.basevolname}`;

                                var CreateArrayDeviceParamater = {
                                    Step: `Create device and assign to sg [ ${item.sgname} ] in pyhsical array [ ${item.serial_no} ], arraytype= [ ${arrayType} ]`,
                                    method: 'CreatePhysicalDevice',
                                    arrayinfo: item,
                                    DependOnAction: "N/A",
                                    AsignSGName: item.sgname,
                                    StorageVolumeName: volName,
                                    capacityByte: capacityBYTE,
                                    position: 'primary'
                                }
                                var resultItem = {};
                                resultItem["physicalVolumeName"] = CreateArrayDeviceParamater.StorageVolumeName;
                                resultItem["position"] = CreateArrayDeviceParamater.position;
                                ActionResult.PhysicalVolumes.push(resultItem);


                                ActionParamaters.push(CreateArrayDeviceParamater);

                            }

                            var paramater = {
                                "Step": "re-discovery physical array in vplex",
                                "method": "ReDiscoverPhysicalArray",
                                "arrayinfo": arrayInfo.info
                            }
                            ActionParamaters.push(paramater);

                            var paramater = {
                                "Step": "claim physical in vplex",
                                "method": "ClaimPhysicalVolume",
                                "arrayinfo": arrayInfo.info
                            }
                            ActionParamaters.push(paramater);



                            break;

                        case 'Unity':

                            var capacityBYTEUnity = capacityBYTE + 100 * 1024 * 1024;
                            for (var j = 1; j <= request.count; j++) {
                                if (request.count < 10) var volno = '0' + j;
                                else volno = j;

                                //var volName = UNITY.GenerateVolName(item, request, timestamp) + volno;
                                console.log(request.basevolname)
                                console.log(eval(" `${request.appname}`"));

                                var CreateArrayDeviceParamater = {
                                    Step: `Create device and assign to sg [ ${item.sgname} ] in pyhsical array [ ${item.unity_sn} ] , arraytype= [ ${arrayType} ]`,
                                    method: 'CreatePhysicalDevice',
                                    arrayinfo: item,
                                    DependOnAction: "N/A",
                                    AsignSGName: item.sgname,
                                    StorageVolumeName: volName,
                                    capacityByte: capacityBYTEUnity,
                                    position: 'second'
                                }
                                var resultItem = {};
                                resultItem["physicalVolumeName"] = CreateArrayDeviceParamater.StorageVolumeName;
                                resultItem["position"] = CreateArrayDeviceParamater.position;

                                ActionResult.PhysicalVolumes.push(resultItem);
                                ActionParamaters.push(CreateArrayDeviceParamater);
                            }
                            break;

                        default:
                            autologger.logs(504, `Not support array type [${physicalArrayInfos[0].array_type}]`, AutoObject);
                            callback(504, AutoObject);
                            break;
                    }



                }
                callback(null, response)
            }
        ], function (err, result) {
            maincallback(result);
        });
}

function CapacityProvisingServiceV3(AutoObject, maincallback) {

    async.waterfall(
        [
            function (callback) {
                callback(null, AutoObject);
            },
            function (AutoObject, callback) {
                CreateProdVolume(AutoObject, function (result) {
                    callback(null, result);
                })

                CreateAndExportVolume(arrayinfo, baseVolumeName, capacityBYTE, function (result) {
                    callback(result);
                })
            },
            // Deploy capability
            // 1. CDP capability
            function (AutoObject, callback) {
                var arrayinfo = AutoObject.AutoInfo.RuleResult.ArrayInfo;
                if (arrayinfo.capability.CDP !== undefined) {
                    var CDPinfo = arrayinfo.capability.CDP;
                    switch (CDPinfo.catalog) {
                        case "RPA":
                            var rpaname = CDPinfo.name;
                            var type = "RPA";
                            var catalog = "CDP";
                            var rpainfo = GetCapabilityInfo(catalog, type, rpaname);

                            CreateProdVolume(AutoObject, function (result) {
                                callback(null, result);
                            })
                            break;
                        default:
                            autologger.logs(505, `Unsupport CDP type [${CDPinfo.catalog}].`, AutoObject);
                            callback(505, AutoObject);
                    }

                }
            }
        ],
        function (err, result) {
            maincallback(result);
        });


}



// 支持多组卷（按照每个卷的容量大小分组）的批量创建
function CreateProdVolume(AutoObject, maincallback) {

    AutoObject.resMsg.code = 200;
    AutoObject.resMsg.message.push("Begin execute service [ CapacityProvisingService ] !");
    autologger.logger.info("Begin execute service [ CapacityProvisingService ] !");


    AutoObject.AutoInfo["ActionParamaters"] = [];

    /*
    Get VPlex Acces info (AutoObject.AutoInfo.RuleResults.ArrayInfo.info)
        {
        "name":"EMCCTEST",
        "array_type":"VPLEX",
        "version":"5.5",
        "endpoint":"https://10.32.32.100/vplex",
        "auth":{
            "username":"service",
            "password":"password"
        } 
    */
    var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo.info;
    var request = AutoObject.request;

    // get the two physical array info (AutoObject.AutoInfo.RuleResults.ArrayInfo["backend_array"])
    /*
        [
            {
                "array_type":"VMAX",
                "serial_no":"000297800193",
                "password":"smc",
                "unispherehost":"10.121.0.204",
                "universion":"90",
                "user":"smc",
                "verifycert":false,
                "sgname":"MSCS_SG"
            },
            {
                "array_type":"Unity",
                "unity_sn":"CKM00163300785",
                "unity_password":"P@ssw0rd",
                "unity_hostname":"10.32.32.64",
                "unity_pool_name":"jxl_vplex101_pool",
                "unity_username":"admin",
                "sgname":"VPLEX_101_BE"
            }
        ]
    */
    var physicalArrayInfos = AutoObject.AutoInfo.RuleResults.ArrayInfo["backend_array"];
    var arrayType = "Other";
    if (physicalArrayInfos[0].array_type == "VMAX") arrayType = 'VMAX';
    if (physicalArrayInfos[0].array_type == "Unity") arrayType = 'Unity';

    async.waterfall(
        [
            // STEP 1: Create Prod physical device in 2 backend physical array behind VPLEX Metro.

            // 1.1 Combind the create paramater.
            function (callback) {
                var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
                var physicalArrayInfos = [];
                for (var i in AutoObject.AutoInfo.RuleResults.ArrayInfo["backend_array"]) {
                    var item = AutoObject.AutoInfo.RuleResults.ArrayInfo["backend_array"][i];
                    if (item.purpose == "Prod") {
                        physicalArrayInfos.push(item);
                    }
                }
                var request = AutoObject.request;

                var capacityBYTE = request.capacity * 1024 * 1024 * 1024;
                var timestamp = moment().format('MMDDHHmmss');

                for (var i in physicalArrayInfos) {
                    var item = physicalArrayInfos[i];
                    var arrayType = item.array_type;
                    switch (arrayType) {
                        case 'VMAX':

                            for (var j = 1; j <= request.count; j++) {
                                if (request.count < 10) var volno = '0' + j;
                                else volno = j;

                                var volName = VMAX.GenerateVolName(item, request, timestamp) + volno;
                                var CreateArrayDeviceParamater = {
                                    Step: `Create device and assign to sg [ ${item.sgname} ] in pyhsical array [ ${item.serial_no} ], arraytype= [ ${arrayType} ]`,
                                    method: 'CreatePhysicalDevice_VMAX',
                                    arrayinfo: item,
                                    DependOnAction: "N/A",
                                    AsignSGName: item.sgname,
                                    StorageVolumeName: volName,
                                    capacityByte: capacityBYTE,
                                    show: 'false',
                                    execute: true
                                }

                                ActionParamaters.push(CreateArrayDeviceParamater);

                            }
                            break;

                        case 'Unity':

                            var capacityBYTEUnity = capacityBYTE + 100 * 1024 * 1024;
                            for (var j = 1; j <= request.count; j++) {
                                if (request.count < 10) var volno = '0' + j;
                                else volno = j;

                                var volName = UNITY.GenerateVolName(item, request, timestamp) + volno;
                                var CreateArrayDeviceParamater = {
                                    Step: `Create device and assign to sg [ ${item.sgname} ] in pyhsical array [ ${item.unity_sn} ] , arraytype= [ ${arrayType} ]`,
                                    method: 'CreatePhysicalDevice_UNITY',
                                    arrayinfo: item,
                                    DependOnAction: "N/A",
                                    AsignSGName: item.sgname,
                                    StorageVolumeName: volName,
                                    capacityByte: capacityBYTEUnity,
                                    show: 'false',
                                    execute: true
                                }

                                ActionParamaters.push(CreateArrayDeviceParamater);
                            }
                            break;

                        default:
                            autologger.logs(504, `Not support array type [${physicalArrayInfos[0].array_type}]`, AutoObject);
                            callback(504, AutoObject);
                            break;
                    }
                }
                callback(null, AutoObject);
            },
            // 1.2 Execute the create action in physical array base on 1.1 paramaters
            function (arg1, callback) {
                var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
                async.mapSeries(ActionParamaters, function (item, subcallback) {
                    console.log(`**************** begin ${item.Step} ***************`);
                    if (item.execute == true) {
                        var arrayType = item.arrayinfo.array_type;
                        if (arrayType == 'VMAX') {
                            var capacity = item.capacityByte / 1024 / 1024 / 1024;

                            VMAX.CreateDevice(item.arrayinfo, item.AsignSGName, capacity, item.StorageVolumeName, function (result) {
                                if (result.code != 200) {
                                    autologger.logs(result.code, `VMAX.CreateDevice is Fail!  array=[${item.arrayinfo.serial_no}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)] msg=[${result.msg}]`, AutoObject);
                                    subcallback(result.code, AutoObject);
                                } else {
                                    autologger.logs(result.code, `VMAX.CreateDevice is succeedful. array=[${item.arrayinfo.serial_no}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)]`, AutoObject);
                                    item["response"] = result.data;
                                    subcallback(null, AutoObject);
                                }
                            })

                        } else
                            if (arrayType == 'Unity') {
                                var capacity = item.capacityByte / 1024 / 1024 / 1024;
                                var capacityBYTE = item.capacityByte;

                                UNITY.CreateDevice(item.arrayinfo, item.AsignSGName, capacityBYTE, item.StorageVolumeName, function (result) {
                                    if (result.code != 200) {
                                        autologger.logs(result.code, `UNITY.CreateDevice is Fail! array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)] msg=[${result.msg}]`, AutoObject);
                                        subcallback(result.code, AutoObject);
                                    } else {
                                        autologger.logs(result.code, `UNITY.CreateDevice is succeedful. array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)]`, AutoObject);
                                        item["response"] = result.data;
                                        subcallback(null, AutoObject);
                                    }

                                })
                            } else {
                                autologger.logs(505, `Unsupport array type [${arrayType}].`, AutoObject);
                                subcallback(505, AutoObject);
                            }

                    } else {
                        subcallback(121, AutoObject);
                    }


                }, function (err, result) {
                    if (err)
                        callback(err, AutoObject);
                    else
                        callback(null, AutoObject);
                }


                );

            }, function (arg1, callback) {
                var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
                console.log(ActionParamaters);
                callback(null, AutoObject);
            },
            // STEP 2: Create some object in VPLEX Metro.
            // 2.1. re-discover physical device in 2 clusters in VPLEX
            function (arg1, callback) {
                autologger.logger.info("Begin execute step [ Re-discover physcial device ] !");

                StorageRediscover(arrayInfo, function (result) {
                    callback(null, result);
                })
            },
            // 2.2. Claim all storage volume has been finded in all cluster in VPLEX
            function (arg1, callback) {
                autologger.logger.info("Begin execute step [ ClaimAllStorageVolume ] !");
                var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
                ClaimAllStorageVolume(arrayInfo, ActionParamaters, function (result) {
                    callback(null, result);
                })

            },
            // 2.3 获取生产StorageView及相关信息 
            function (arg, callback) {
                autologger.logger.info("Begin execute step [ ComponeAutoInfo ] !");
                ComponeAutoInfo(AutoObject, function (result) {
                    if (result.resMsg.code != 200) {
                        result.resMsg.message.push("execute step [ ComponeAutoInfo ] is FAIL!");
                        maincallback(result);
                    } else
                        callback(null, result);
                })
            },
            // 2.4 检查当前配置数据的合规性.
            function (AutoObject, callback) {
                AutoObjectCheckVaild(AutoObject, function (retAutoObject) {
                    if (retAutoObject.resMsg.code != 200) {
                        autologger.logs(500, "execute step [ AutoObjectCheckVaildV2 ] is FAIL!", retAutoObject);
                        maincallback(retAutoObject);
                    } else {
                        // 全部检查合规，继续执行下一步。
                        callback(null, AutoObject);
                    }
                })
            },
            // 2.5 扫描所有已经Claim的Storage Volume, 选择满足容量与需求容量相等的volume
            function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ ChooseVirtualVolumesV2 ] !");

                ChooseVirtualVolumesV2(AutoObject, function (result) {
                    if (result.resMsg.code != 200) {
                        autologger.logs(result.resMsg.code, "execute step [ ChooseVirtualVolumes ] is FAIL!", result);
                        maincallback(result);
                    } else
                        callback(null, result);
                })
            },
            // 2.6 Generate action paramaters
            function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ GenerateActionParamatersV2 ] !");

                var AutoObjectResult = GenerateActionParamatersV2(AutoObject);
                if (AutoObjectResult.resMsg.code != 200) {
                    autologger.logs(AutoObject.resMsg.code, "execute step [ GenerateActionParamatersV2 ] is FAIL!", AutoObject);
                    maincallback(AutoObjectResult);
                } else
                    callback(null, AutoObjectResult);
            }
        ], function (err, result) {
            // result now equals 'done'  
            maincallback(result);
        });
}

function DeployVPLEXBPMN() {
    ; (async () => {
        const ZEEBE_BROKER_URL = config.ZEEBE.BROKER;
        const zbc = new ZB.ZBClient(ZEEBE_BROKER_URL)
        const topology = await zbc.topology()
        console.log(JSON.stringify(topology, null, 2))


        await zbc.deployWorkflow('./bpmn/test2.bpmn')

        const zbWorker1 = zbc.createWorker('create-extent-worker', 'create-extent', CreateExtentHandle)
        const zbWorker2 = zbc.createWorker('create-local-device-worker', 'create-local-device', CreateLocalDeviceHandle)
        const zbWorker3 = zbc.createWorker('create-distributed-device-worker', 'create-distributed-device', handler)
        setTimeout(() => {
            console.log('Closing client...')
            zbc.close().then(() => console.log('All workers closed'))
            callback("aa");
        }, 10000)
    })()
}

function ExecuteActionsBPMN(executeParamaters, arrayInfo, ws, callback) {
    const ZEEBE_BROKER_URL = config.ZEEBE.BROKER;
    const jobs =
        (async () => {
            const zbc = new ZB.ZBClient(ZEEBE_BROKER_URL);
            console.log(ws);
            const result = await zbc.createWorkflowInstance("test2-process", { arrayInfo: arrayInfo, ws: ws, uniqueId: 0, actionparamater: executeParamaters });
            console.log("AAAA" + result);
        })();
}

function CreateExtentHandle(payload, complete) {

    var executeParamater = payload.variables.actionparamater;
    var ws = payload.variables.ws;
    var arrayInfo = payload.variables.arrayInfo;

    executeParamater["array"] = arrayInfo;
    console.log("Begin Extent Handle ----");
    CreateExtent(executeParamater, function (result) {
        console.log("-------------- Create Extent execute finished -----------------\n");
        executeParamater.response = result;
        executeParamater.show = 'true';
        ws.send(JSON.stringify(executeParamaters));
        complete(executeParamater)
    })

}

function CreateLocalDeviceHandle(payload, complete) {

    var executeParamater = payload.variables.actionparamater;
    var ws = payload.variables.ws;

    CreateLocalDevice(executeParamater, function (result) {
        console.log("-------------- Create  LocalDevice  execute finished -----------------\n");
        executeParamater.response = result;
        executeParamater.show = 'true';
        ws.send(JSON.stringify(executeParamaters));
        complete(executeParamater)
    })

}

function handler(payload, complete) {

    var actionparamater = payload.variables.actionparamater;
    actionparamater.response = "response";
    actionparamater.show = 'true';
    var res = {
        code: 200,
        message: "succeed"
    }
    console.log('ZB payload', payload)
    complete(res)
}


function sleep(sleepTime) {
    for (var start = +new Date; +new Date - start <= sleepTime;) { };
}

function ExecuteActions(executeParamaters, arrayInfo, ws, callback) {
    async.mapSeries(executeParamaters, function (executeParamater, subcallback) {
        console.log("Execute action: [ " + executeParamater.method + " ]. depend on action: [" + executeParamater.DependOnAction + "].");

        executeParamater["array"] = arrayInfo;

        if (executeParamater.execute == true) {
            executeParamater.show = 'true';
            executeParamater.status = 'success';
            executeParamater.response = "Suceess";
            console.log(JSON.stringify(executeParamater));
            ws.send(JSON.stringify(executeParamater));
            subcallback(null, "not execute this step.");

        } else {
            switch (executeParamater.method) {
                case 'CreateExtent':
                    CreateExtent(executeParamater, function (result) {
                        console.log("-------------- Create Extent execute finished -----------------\n");
                        console.log(result);
                        if (result.code == 200) {
                            executeParamater.show = 'true';
                            executeParamater.status = 'success';
                            executeParamater.response = result.response;
                        } else {
                            executeParamater.show = 'true';
                            executeParamater.status = 'fail';
                            executeParamater.response = result.response;
                        }

                        console.log(JSON.stringify(executeParamater));
                        ws.send(JSON.stringify(executeParamater));
                        sleep(5000);
                        if (executeParamater.status == 'fail')
                            subcallback(result.code, result);
                        else
                            subcallback(null, result);
                    })
                    break;
                case 'CreateLocalDevice':
                    CreateLocalDevice(executeParamater, function (result) {
                        console.log("-------------- Create LocalDevice execute finished -----------------\n");
                        console.log(result);
                        if (result.code == 200) {
                            executeParamater.show = 'true';
                            executeParamater.status = 'success';
                            executeParamater.response = result.response;
                        } else {
                            executeParamater.show = 'true';
                            executeParamater.status = 'fail';
                            executeParamater.response = result.response;
                        }
                        console.log(JSON.stringify(executeParamater));
                        ws.send(JSON.stringify(executeParamater));
                        sleep(5000);
                        if (executeParamater.status == 'fail')
                            subcallback(result.code, result);
                        else
                            subcallback(null, result);
                    })
                    break;
                case 'CreateDistributedDevice':
                    CreateDistributedDevice(executeParamater, function (result) {
                        console.log("-------------- Create Distributed Device execute finished -----------------\n");
                        console.log(result);
                        if (result.code == 200) {
                            executeParamater.show = 'true';
                            executeParamater.status = 'success';
                            executeParamater.response = result.response;
                        } else {
                            executeParamater.show = 'true';
                            executeParamater.status = 'fail';
                            executeParamater.response = result.response;
                        }
                        console.log(JSON.stringify(executeParamater));
                        ws.send(JSON.stringify(executeParamater));
                        sleep(5000);
                        if (executeParamater.status == 'fail')
                            subcallback(result.code, result);
                        else
                            subcallback(null, result);
                    })
                    break;

                case 'CreateDistributedVirtualVolume':
                case 'CreateVirtualVolume':
                    CreateVirtualVolume(executeParamater, function (result) {
                        console.log("-------------- Create Distributed Virtual Volume execute finished -----------------\n");
                        console.log(result);
                        if (result.code == 200) {
                            executeParamater.show = 'true';
                            executeParamater.status = 'success';
                            executeParamater.response = result.response;
                        } else {
                            executeParamater.show = 'true';
                            executeParamater.status = 'fail';
                            executeParamater.response = result.response;
                        }
                        console.log(JSON.stringify(executeParamater));
                        ws.send(JSON.stringify(executeParamater));
                        sleep(5000);
                        if (executeParamater.status == 'fail')
                            subcallback(result.code, result);
                        else
                            subcallback(null, result);
                    })
                    break;

                case 'AssignConsistencyGroup':
                    AssignConsistencyGroup(executeParamater, function (result) {
                        console.log("-------------- Assign Consistency Group execute finished -----------------\n");
                        console.log(result);
                        if (result.code == 200) {
                            executeParamater.show = 'true';
                            executeParamater.status = 'success';
                            executeParamater.response = result.response;
                        } else {
                            executeParamater.show = 'true';
                            executeParamater.status = 'fail';
                            executeParamater.response = result.response;
                        }
                        console.log(JSON.stringify(executeParamater));
                        ws.send(JSON.stringify(executeParamater));
                        sleep(5000);
                        if (executeParamater.status == 'fail')
                            subcallback(result.code, result);
                        else
                            subcallback(null, result);
                    })
                    break;

                case 'AssignStorageView':
                    AssignStorageView(executeParamater, function (result) {
                        console.log("-------------- Assign Storage View execute finished -----------------\n");
                        console.log(result);
                        if (result.code == 200) {
                            executeParamater.show = 'true';
                            executeParamater.status = 'success';
                            executeParamater.response = result.response;
                        } else {
                            executeParamater.show = 'true';
                            executeParamater.status = 'fail';
                            executeParamater.response = result.response;
                        }
                        console.log(JSON.stringify(executeParamater));
                        ws.send(JSON.stringify(executeParamater));
                        sleep(5000);
                        if (executeParamater.status == 'fail')
                            subcallback(result.code, result);
                        else
                            subcallback(null, result);
                    })
                    break;
                default:
                    autologger.logs(505, "action [ " + executeParamater.method + " ] has not defined!", AutoObject);
                    subcallback("error", executeParamater.method);
                    break;
            }
        }


    },
        function (err, result) {
            callback(result);
        }
    )
}

function ComponeAutoInfo(AutoObject, maincallback) {
    var request = AutoObject.request;
    var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo.info;
    var AutoInfo = AutoObject.AutoInfo;
    var clusters = ['cluster-1', 'cluster-2'];

    if (AutoInfo["ResourceInfo"] === undefined)
        AutoInfo["ResourceInfo"] = {};
    var ResourceInfo = AutoInfo.ResourceInfo;

    ResourceInfo["StorageView"] = {};

    async.waterfall(
        [

            function (callback) {
                autologger.logger.info("Begin execute step [ ComponeAutoInfo.GetStorageViewByProtectLevel for prod ] !");
                // ----------------------------
                // 获取生产StorageView及相关信息 
                // ----------------------------
                GetStorageViewByProtectLevel(AutoObject, "prod", function (resAutoObject) {

                    if (resAutoObject.resMsg.code != 200) {
                        autologger.logs(resAutoObject.resMsg.code, "execute [GetStorageViewByProtectLevel] for [prod] is FAIL!", resAutoObject);

                        maincallback(resAutoObject);
                    } else
                        callback(null, resAutoObject);
                })
            }
            , function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ ComponeAutoInfo.GetStorageViewByProtectLevel for TC ] !");
                // ----------------------------
                // 获取 Same City StorageView及相关信息 
                // ---------------------------- 
                if (request.ProtectLevel.hostDeplpy == "TC") {
                    GetStorageViewByProtectLevel(AutoObject, "TC", function (resAutoObject) {
                        if (resAutoObject.resMsg.code != 200) {
                            autologger.logs(resAutoObject.resMsg.code, "execute [GetStorageViewByProtectLevel] for [TC] is FAIL!", resAutoObject);
                            maincallback(resAutoObject);
                        } else
                            callback(null, resAutoObject);
                    })
                } else
                    callback(null, AutoObject);

            }
            , function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ ComponeAutoInfo.GetStorageViewByProtectLevel for Backup ] !");
                // ----------------------------
                // 获取 Backup(NBU) StorageView及相关信息 
                // ----------------------------
                if (request.ProtectLevel.Backup == true) {
                    GetStorageViewByProtectLevel(AutoObject, "Backup", function (resAutoObject) {
                        if (resAutoObject.resMsg.code != 200) {
                            autologger.logs(resAutoObject.resMsg.code, "execute [GetStorageViewByProtectLevel] for [Backup] is FAIL!", resAutoObject);
                            maincallback(resAutoObject);
                        } else
                            callback(null, resAutoObject);
                    })
                } else
                    callback(null, AutoObject);

            },
            function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ ComponeAutoInfo.GetStorageViewByProtectLevel for Same City DC Protect ] !");
                // ----------------------------
                // 获取同城数据保护（RPA） StorageView及相关信息 
                // ----------------------------
                if (request.ProtectLevel.AppVerification_SameCity == true) {
                    GetStorageViewByProtectLevel(AutoObject, "AppVerification_SameCity", function (resAutoObject) {
                        if (resAutoObject.resMsg.code != 200) {
                            autologger.logs(resAutoObject.resMsg.code, "execute [GetStorageViewByProtectLevel] for [AppVerification_SameCity] is FAIL!", resAutoObject);
                            maincallback(resAutoObject);
                        } else
                            callback(null, resAutoObject);
                    })
                } else
                    callback(null, AutoObject);

            }
            , function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ ComponeAutoInfo.GetConsistencyGroup ] !");

                // 获取Consistency Group信息
                //AutoObject.AutoInfo["ConsistencyGroup"] = {};
                ResourceInfo["ConsistencyGroup"] = {};

                var ConsistencyGroupName = GenerateConsistencyGroupName(request);
                GetConsistencyGroup(arrayInfo, 'cluster-1', ConsistencyGroupName, function (cg_result) {
                    if (cg_result.code == 404) {
                        autologger.logs(AutoObject.resMsg.code, "Can't find the consistency group [" + ConsistencyGroupName + "]", AutoObject);
                        maincallback(AutoObject);
                    } else {
                        //AutoObject.AutoInfo["ConsistencyGroup"] = cg_result.response;
                        ResourceInfo.ConsistencyGroup = cg_result.response;
                        callback(null, AutoObject);
                    }
                })
            }
            , function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ ComponeAutoInfo.ParserMasterArray&SecondaryArray ] !");
                // ---------------------------------------------------------------------
                // 根据存在的StorageView中的vvol的名称, 解析出作为主存储的名称和备存储的名称;
                // ---------------------------------------------------------------------
                // vvolname = dd_Symm0192_00FF_Symm0706_0261_vol

                // 找到生产StorageView所对应的对象(即StorageView中包含应用名称) 
                /*
                var appname = request.appname;
                var svinfo;
                for (var i in ResourceInfo.StorageView.prod) {
                    var item = ResourceInfo.StorageView.prod[i];
                    if (item.storageview.indexOf(appname) >= 0) {
                        svinfo = item;
                        break;
                    }
                }
                if (svinfo == undefined) {
                    resMsg.code = 700;
                    resMsg.message.push("Can't find a vaild storage view for producte(include app name [" + appname + "].");
                    maincallback(null, AutoObject);
                } else {
                    if (svinfo.virtualvolumes.length > 0) {
                        var vvol_name = svinfo.virtualvolumes[0].name;
                        var PrimaryArrayName = vvol_name.split('_')[1];
                        var SecondArrayName = vvol_name.split('_')[3];
                        AutoObject.AutoInfo.RuleResults["PrimaryArrayName"] = PrimaryArrayName;
                        AutoObject.AutoInfo.RuleResults["SecondArrayName"] = SecondArrayName;
                        callback(null, AutoObject);
                    } else {
                        AutoObject.resMsg.code = 500;
                        AutoObject.resMsg.message.push("Have not any virtual volume in storage view [" + svinfo.storageview + "]");
                        maincallback(AutoObject);
                    }
                }*/

                callback(null, AutoObject);
            }
            , function (AutoObject, callback) {

                // -----------------------------------------------
                // 分别获取所有Cluster中已经claimed的Storage Volumes
                // -----------------------------------------------

                async.mapSeries(clusters, function (clustername, subcallback) {
                    autologger.logger.info("Begin execute step [ ComponeAutoInfo.GetStorageVolumes for " + clustername + " ] !");
                    GetStorageVolumes(arrayInfo, clustername, function (response) {
                        var res1 = {};
                        if (response.code == 200) {
                            var result = response.response;
                            res1[clustername] = result.claimed;
                        }


                        subcallback(null, res1);
                    })
                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    };



                    var claimedList = {};
                    for (var i in result) {
                        var item = result[i];
                        for (var fieldname in item) {
                            claimedList[fieldname] = [];
                            for (var z in item[fieldname]) {
                                var devItem = item[fieldname][z];
                                var devOutItem = {};
                                devOutItem["cluster"] = fieldname;
                                devOutItem["name"] = devItem.name;
                                devOutItem["storage-array-name"] = devItem["storage-array-name"];
                                devOutItem["capacity"] = devItem.capacity;
                                devOutItem["health-state"] = devItem["health-state"];
                                claimedList[fieldname].push(devOutItem);
                            }
                        }
                    }
                    ResourceInfo["ClaimedStorageVolumes"] = claimedList;
                    callback(null, AutoObject);

                }
                )

            }
        ], function (err, result) {
            // result now equals 'done' 
            maincallback(result);
        });
};


function ChooseVirtualVolumes(AutoObject, maincallback) {
    var request = AutoObject.request;
    var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
    var claimedStorageVolumes = ResourceInfo.ClaimedStorageVolumes;
    //console.log(claimedStorageVolumes);

    var PrimaryArrayName = AutoObject.AutoInfo.RuleResults.PrimaryArrayName;
    var SecondArrayName = AutoObject.AutoInfo.RuleResults.SecondArrayName;

    // 根据请求容量查找每个cluster中符合容量条件的Storage Volume.
    var claimedStorageVolumeList = {};
    claimedStorageVolumeList["cluster-1"] = [];
    claimedStorageVolumeList["cluster-2"] = [];
    for (var i in claimedStorageVolumes['cluster-1']) {
        var item = claimedStorageVolumes['cluster-1'][i];
        if (request.capacity == item.capacity) {
            claimedStorageVolumeList["cluster-1"].push(item);
        }
    }


    for (var i in claimedStorageVolumes['cluster-2']) {
        var item = claimedStorageVolumes['cluster-2'][i];
        if (request.capacity == item.capacity) {
            claimedStorageVolumeList["cluster-2"].push(item);
        }
    }


    if (claimedStorageVolumeList["cluster-1"].length > 0 && claimedStorageVolumeList["cluster-2"].length > 0) {
        //在查找结果中继续根据名称查找设备名称相同的一对Storage Volume
        var chooseVolumes = [];
        for (var i in claimedStorageVolumeList["cluster-1"]) {
            var volume1 = claimedStorageVolumeList["cluster-1"][i];
            var volumename1 = volume1.name;
            var volname1 = volumename1.split('_')[1];
            if (volname1 === undefined || volname1 == null || volname1 == "") {
                continue;
            }

            var isfind = false;
            for (var j in claimedStorageVolumeList['cluster-2']) {
                var volume2 = claimedStorageVolumeList["cluster-2"][j];
                var volumename2 = volume2.name;
                var volname2 = volumename2.split('_')[1];
                if (volname1 == volname2) {
                    isfind = true;
                    chooseVolumes.push(volume1);
                    chooseVolumes.push(volume2);
                    break;
                }
            }
            if (isfind == true) break;

        }
        /*
        //如果没有相同的Volume, 则取出各自Cluster中的第1个成员作为选择结果
        if (chooseVolumes.length == 0) {
            chooseVolumes.push(claimedStorageVolumeList["cluster-1"][0]);
            chooseVolumes.push(claimedStorageVolumeList["cluster-2"][0]);
        } 
        */

        // 确定哪个作为主卷,哪个作为从卷;
        for (var i in chooseVolumes) {
            var item = chooseVolumes[i];
            //console.log(item);
            var volname = item.name;
            /*
            if (volname.indexOf(PrimaryArrayName) >= 0)
                item["position"] = 'primary';
            else if (volname.indexOf(SecondArrayName) >= 0)
                item["position"] = 'second';
            else {
                var msg = "Choosed Volumes is " + JSON.stringify(chooseVolumes);
                msg += "\n" + "PrimaryArrayName is " + PrimaryArrayName;
                msg += "\n" + "SecondArrayName is " + SecondArrayName;
                autologger.logs(600, msg, AutoObject);
                autologger.logs(600, "Rule Vaild: Same Pyhsical Array. Choosed Volumes not MARCH the exists Primary/Second Physical Array. ", AutoObject);

                item["position"] = 'unknow';
            }
            */
            if (item.cluster == 'cluster-1') item["position"] = 'primary';
            else item["position"] = 'second';

        }

        AutoObject.resMsg.code = 200;
        AutoObject.resMsg.message.push("find match storage volume for request capacity [" + request.capacity + "]. " + JSON.stringify(chooseVolumes));

        if (AutoObject.AutoInfo["RuleResults"] === undefined)
            AutoObject.AutoInfo["RuleResults"] = {};

        AutoObject.AutoInfo["RuleResults"]["StorageDevices"] = chooseVolumes;


    } else {
        autologger.logs(500, "Can't find match storage volume for request capacity [" + request.capacity + "]", AutoObject);
    }
    maincallback(AutoObject);
}


// 支持多组卷（按照每个卷的容量大小分组）的批量创建
function ChooseVirtualVolumesV2(AutoObject, maincallback) {
    var request = AutoObject.request;
    var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
    var claimedStorageVolumes = ResourceInfo.ClaimedStorageVolumes;
    //console.log(claimedStorageVolumes);

    var PrimaryArrayName = AutoObject.AutoInfo.RuleResults.PrimaryArrayName;
    var SecondArrayName = AutoObject.AutoInfo.RuleResults.SecondArrayName;

    ;
    // 根据请求容量查找每个cluster中符合容量条件的Storage Volume.
    var claimedStorageVolumeList = {};
    claimedStorageVolumeList["cluster-1"] = [];
    claimedStorageVolumeList["cluster-2"] = [];
    for (var i in claimedStorageVolumes['cluster-1']) {
        var item = claimedStorageVolumes['cluster-1'][i];
        if (request.capacity == item.capacity) {
            claimedStorageVolumeList["cluster-1"].push(item);
        }
    }

    for (var i in claimedStorageVolumes['cluster-2']) {
        var item = claimedStorageVolumes['cluster-2'][i];
        if (request.capacity == item.capacity) {
            claimedStorageVolumeList["cluster-2"].push(item);
        }
    }

    console.log("claimedStorageVolumeList=" + JSON.stringify(claimedStorageVolumeList));

    if (claimedStorageVolumeList["cluster-1"].length >= request.count && claimedStorageVolumeList["cluster-2"].length >= request.count) {
        var countVols = 1;
        var chooseVolumesList = [];
        //在查找结果中继续根据名称查找设备名称相同的一对Storage Volume 
        for (var i in claimedStorageVolumeList["cluster-1"]) {

            var chooseVolumes = [];
            var volume1 = claimedStorageVolumeList["cluster-1"][i];
            var volumename1 = volume1.name;
            var volname1 = volumename1.split('_')[1];
            if (volname1 === undefined || volname1 == null || volname1 == "") {
                continue;
            }

            var isfind = false;
            for (var j in claimedStorageVolumeList['cluster-2']) {
                var volume2 = claimedStorageVolumeList["cluster-2"][j];
                var volumename2 = volume2.name;
                var volname2 = volumename2.split('_')[1];
                if (volname1 == volname2) {
                    isfind = true;
                    chooseVolumes.push(volume1);
                    chooseVolumes.push(volume2);
                    break;
                }
            }

            // 确定哪个作为主卷,哪个作为从卷;
            for (var i in chooseVolumes) {
                var item = chooseVolumes[i];
                var volname = item.name;
                if (item.cluster == 'cluster-1') item["position"] = 'primary';
                else item["position"] = 'second';

            }


            if (isfind == true) {
                chooseVolumesList.push(chooseVolumes);
            }

        }


        if (chooseVolumesList.length >= request.count) {

            if (AutoObject.AutoInfo["RuleResults"] === undefined)
                AutoObject.AutoInfo["RuleResults"] = {};

            var chooseVolumesListNew = [];
            for (var j in chooseVolumesList) {
                if (j >= request.count) break;
                chooseVolumesListNew.push(chooseVolumesList[j]);
            }
            AutoObject.AutoInfo["RuleResults"]["StorageDevicesList"] = chooseVolumesListNew;

            AutoObject.resMsg.code = 200;
            AutoObject.resMsg.message.push("Find enouch match storage volumes[" + request.count + "] for request capacity [" + request.capacity + "]. Current find match volumes [" + chooseVolumesList.length + "].");

        } else {
            AutoObject.AutoInfo["RuleResults"]["StorageDevicesList"] = chooseVolumesList;
            AutoObject.resMsg.code = 510;
            AutoObject.resMsg.message.push("Can't find enouch match storage volumes[" + request.count + "] for request capacity [" + request.capacity + "]. Current find match volumes [" + chooseVolumesList.length + "].");
        }

    } else {
        autologger.logs(500, "Can't find match storage volume for request capacity [" + request.capacity + "]", AutoObject);
    }
    maincallback(AutoObject);
}


function GenerateActionParamaters(AutoObject) {
    // -----------------------------------------------------------
    // Generate the paramater structures for the execute methods
    // ----------------------------------------------------------

    var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
    var RuleResults = AutoObject.AutoInfo.RuleResults;
    var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
    var resMsg = AutoObject.resMsg;
    // -- Create Extent paramaters
    var storageVolumes = [];
    for (var i in RuleResults.StorageDevicesList[0]) {
        var item = RuleResults.StorageDevicesList[0][i];
        storageVolumes.push(item.name);
    }

    var CreateExtentParamater = {
        Step: '创建Extent',
        method: 'CreateExtent',
        DependOnAction: "N/A",
        StorageVolumeName: storageVolumes.toString(),
        show: 'false'

    }
    ActionParamaters.push(CreateExtentParamater);

    // -- Create Local Device Paramater

    for (var i in RuleResults.StorageDevices) {
        var item = RuleResults.StorageDevices[i];

        var createLocalDeviceParamater = {
            Step: '创建本地存储卷',
            method: 'CreateLocalDevice',
            DependOnAction: "CreateExtent",
            devicename: "device_" + item.name,    // Need matche "Device Naming Rule"
            geometry: "raid-0",      // "raid-0",
            //stripe-depth: Number,  // Default "1"
            extents: "extent_" + item.name + "_1", // extents list
            show: 'false'
        }
        ActionParamaters.push(createLocalDeviceParamater);

    }

    autologger.logger.info("Create Distributed Device Paramater");
    //   -- Create Distributed Device Paramater
    var storagevols = [];
    var devices = [];
    var ddDeviceName = "dd_PPPP_SSSS";
    var sourcedevice;

    var tailName;
    var headName1;
    var headName2;
    for (var i in RuleResults.StorageDevices) {
        var item = RuleResults.StorageDevices[i];
        switch (item.position) {
            case 'primary':
                var name = item.name;
                tailName = name.split('_')[1];
                var headName1 = name.split('_')[0];
                //ddDeviceName = ddDeviceName.replace('PPPP', item.name);
                sourcedevice = 'device_' + item.name;
                break;
            case 'second':
                var name = item.name;
                var headName2 = name.split('_')[0];
                //ddDeviceName = ddDeviceName.replace('SSSS', item.name);
                break;
            default:
                resMsg.code = 600;
                resMsg.message.push("Position is UNKNOW. Cann't confirm the primary/second device! [" + JSON.stringify(item) + "]");
                return AutoObject;
        }
        storagevols.push(item.name);
        devices.push('device_' + item.name);
    }
    var ddDeviceName = `dd_${headName1}_${headName2}_${tailName}`;

    var CreateDistributedDeviceParamater = {
        Step: '创建分布式存储卷: ' + ddDeviceName,
        method: 'CreateDistributedDevice',
        DependOnAction: "CreateLocalDevice",
        devicename: ddDeviceName,
        devices: devices,
        sourcedevice: sourcedevice,
        show: 'false'
    }
    ActionParamaters.push(CreateDistributedDeviceParamater);


    autologger.logger.info("Create Distributed virtual volumes from Distributed Device created ");
    //   -- Create Distributed virtual volumes from Distributed Device created 
    var CreateDistributedVirtualVolumeParamater = {
        Step: '创建分布式虚拟存储卷',
        method: 'CreateDistributedVirtualVolume',
        DependOnAction: "CreateDistributedDevice",
        devicename: ddDeviceName,
        show: 'false'
    }
    ActionParamaters.push(CreateDistributedVirtualVolumeParamater);


    var DistributedVirtualVolumeName = ddDeviceName + "_vol";

    //   -- Assign Distributed Device to Consistency Group Paramater 
    if (ResourceInfo.ConsistencyGroup !== undefined) {
        var ConsistnecyGroupName = ResourceInfo.ConsistencyGroup.name;
    } else {
        resMsg.code = 600;
        resMsg.message.push("Cann't confirm the primary/second device! [" + JSON.stringify(item) + "]");
        return AutoObject;
    }
    var AssignConsistencyGroupParamater = {
        Step: '分配虚拟存储卷到一致性组(Consistency Group): ' + DistributedVirtualVolumeName,
        method: 'AssignConsistencyGroup',
        DependOnAction: "CreateDistributedDevice",
        virtual_volume: DistributedVirtualVolumeName,
        consistency_group: ConsistnecyGroupName,
        show: 'false'
    }
    ActionParamaters.push(AssignConsistencyGroupParamater);


    // -- Assign Distributed Device to all of storage view. 
    for (var protectLevel in ResourceInfo.StorageView) {
        var PL_Views = ResourceInfo.StorageView[protectLevel];
        for (var i in PL_Views) {
            var item = PL_Views[i];

            var vvols = [];
            vvols.push(DistributedVirtualVolumeName);
            var AssignStorageViewParamater = {
                Step: '分配虚拟化存储卷至存储视图（Storage View）:' + item.storageview,
                method: 'AssignStorageView',
                DependOnAction: "CreateDistributedDevice",
                clustername: item.cluster,
                viewname: item.storageview,
                virtualvolumes: vvols,
                show: 'false'
            }
            ActionParamaters.push(AssignStorageViewParamater);
        }
    }


    return AutoObject;

}

// 支持多组卷（按照每个卷的容量大小分组）的批量创建
function GenerateActionParamatersV2(AutoObject) {
    // -----------------------------------------------------------
    // Generate the paramater structures for the execute methods
    // ----------------------------------------------------------

    var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
    var Request = AutoObject.request;
    var RuleResults = AutoObject.AutoInfo.RuleResults;
    var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
    var resMsg = AutoObject.resMsg;

    for (var vols in RuleResults.StorageDevicesList) {

        var StorageDevices = RuleResults.StorageDevicesList[vols];

        // -- Create Extent paramaters
        var storageVolumes = [];
        for (var i in StorageDevices) {
            var item = StorageDevices[i];
            storageVolumes.push(item.name);
        }

        var CreateExtentParamater = {
            method: 'CreateExtent',
            DependOnAction: "N/A",
            StorageVolumeName: storageVolumes.toString(),
            show: 'false'

        }
        ActionParamaters.push(CreateExtentParamater);

        // -- Create Local Device Paramater

        for (var i in StorageDevices) {
            var item = StorageDevices[i];

            var createLocalDeviceParamater = {
                method: 'CreateLocalDevice',
                DependOnAction: "CreateExtent",
                devicename: "device_" + item.name,    // Need matche "Device Naming Rule"
                geometry: "raid-0",      // "raid-0",
                //stripe-depth: Number,  // Default "1"
                extents: "extent_" + item.name + "_1", // extents list
                show: 'false'
            }
            ActionParamaters.push(createLocalDeviceParamater);

        }

        autologger.logger.info("Create Distributed Device Paramater");
        //   -- Create Distributed Device Paramater
        var storagevols = [];
        var devices = [];
        var ddDeviceName = "dd_PPPP_SSSS";
        var sourcedevice;
        var tailName;
        var appname;
        var headName1;
        var headName2;
        var arrayName1, arrayName2;
        for (var i in StorageDevices) {
            var item = StorageDevices[i];
            switch (item.position) {
                case 'primary':

                    var name = item.name;
                    tailName = name.split('_')[1];
                    headName1 = name.split('_')[0];
                    appname = headName1.split('-')[0];
                    arrayName1 = headName1.split('-')[1];

                    console.log("Primary------------------" + item.name + ',' + tailName + ',' + headName1);
                    //ddDeviceName = ddDeviceName.replace('PPPP', item.name);
                    sourcedevice = 'device_' + item.name;
                    break;
                case 'second':
                    console.log("Second------------------" + item.name);
                    var name = item.name;
                    headName2 = name.split('_')[0];
                    arrayName2 = headName2.split('-')[1];
                    //ddDeviceName = ddDeviceName.replace('SSSS', item.name);
                    break;
                default:
                    resMsg.code = 600;
                    resMsg.message.push("Position is UNKNOW. Cann't confirm the primary/second device! [" + JSON.stringify(item) + "]");
                    return AutoObject;
            }
            storagevols.push(item.name);
            devices.push('device_' + item.name);
        }
        var ddDeviceName = `dd_${appname}_${arrayName1}_${arrayName2}_${tailName}`;


        var CreateDistributedDeviceParamater = {
            Step: '创建分布式存储卷: ' + ddDeviceName,
            method: 'CreateDistributedDevice',
            DependOnAction: "CreateLocalDevice",
            devicename: ddDeviceName,
            devices: devices,
            sourcedevice: sourcedevice,
            show: 'false'
        }
        ActionParamaters.push(CreateDistributedDeviceParamater);


        autologger.logger.info("Create Distributed virtual volumes from Distributed Device created ");
        //   -- Create Distributed virtual volumes from Distributed Device created 
        var CreateDistributedVirtualVolumeParamater = {
            method: 'CreateDistributedVirtualVolume',
            DependOnAction: "CreateDistributedDevice",
            devicename: ddDeviceName,
            show: 'false'
        }
        ActionParamaters.push(CreateDistributedVirtualVolumeParamater);


        var DistributedVirtualVolumeName = ddDeviceName + "_vol";

        //   -- Assign Distributed Device to Consistency Group Paramater 
        if (ResourceInfo.ConsistencyGroup !== undefined) {
            var ConsistnecyGroupName = ResourceInfo.ConsistencyGroup.name;
        } else {
            resMsg.code = 600;
            resMsg.message.push("Cann't confirm the primary/second device! [" + JSON.stringify(item) + "]");
            return AutoObject;
        }
        var AssignConsistencyGroupParamater = {
            method: 'AssignConsistencyGroup',
            DependOnAction: "CreateDistributedDevice",
            virtual_volume: DistributedVirtualVolumeName,
            consistency_group: ConsistnecyGroupName,
            show: 'false'
        }
        ActionParamaters.push(AssignConsistencyGroupParamater);


        // -- Assign Distributed Device to all of storage view. 
        for (var protectLevel in ResourceInfo.StorageView) {
            var PL_Views = ResourceInfo.StorageView[protectLevel];
            for (var i in PL_Views) {
                var item = PL_Views[i];

                var vvols = [];
                vvols.push(DistributedVirtualVolumeName);
                var AssignStorageViewParamater = {
                    method: 'AssignStorageView',
                    DependOnAction: "CreateDistributedDevice",
                    clustername: item.cluster,
                    viewname: item.storageview,
                    virtualvolumes: vvols,
                    show: 'false'
                }
                ActionParamaters.push(AssignStorageViewParamater);
            }
        }




    }

    return AutoObject;

}

function GetStorageViewByProtectLevel(AutoObject, ProtectLevel, maincallback) {
    var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
    var Request = AutoObject.request;
    var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo.info;


    var svString = GenerateStorateViewName(Request, ProtectLevel);
    console.log("---\n" + svString + "-----\n" + ProtectLevel);
    var StorageViewNames = svString.split(',');

    async.mapSeries(StorageViewNames, function (StorageViewName, callback) {

        GetStorageView(arrayInfo, 'cluster-1', StorageViewName, function (svview_result) {
            console.log("====\n" + JSON.stringify(svview_result) + "\n=====");
            if (svview_result.code == 404) {
                GetStorageView(arrayInfo, 'cluster-2', StorageViewName, function (svview_result) {
                    if (svview_result.code == 404) {
                        AutoObject.resMsg.code = 404;
                        AutoObject.resMsg.message.push("Can't find the storage view [" + StorageViewName + "]");
                        maincallback(AutoObject);
                    }
                    callback(null, svview_result.response);
                });
            } else if (svview_result.code != 200) {
                callback("svview_result.code != " + svview_result.code);
            } else {
                callback(null, svview_result.response);
            }
        })
    }, function (err, result) {
        if (err) {
            console.log(err);
            AutoObject.resMsg.code = (result.code === undefined) ? 501 : result.code;

        };
        ResourceInfo.StorageView[ProtectLevel] = result;
        //console.log("*******************\n"+JSON.stringify(ResourceInfo.StorageView) + "\n*********************\n");
        maincallback(AutoObject);
    }
    )

}


/*
Paramater: 
    {
        appname: String,
        usedfor: String,
        capacity: number,
        resourceLevel: String
        array: JSONObject
    }

*/
function CreateStorageDevice(paramStru, callback) {

    var request = paramStru.request;
    var arrayname = request.array.arrayname;

    var raidtype = "raid-1";
    var clustername = 'cluster-1';
    var providType = "local";

    var arrayInfo = GetArrayInfoObject(arrayname);



    async.waterfall(
        [
            // 1. Claim all storage volume has been find in all cluster in VPLEX
            function (callback) {
                ClaimAllStorageVolume(arrayInfo, function (result) {
                    callback(null, result);
                })

            }
            , function (arg, callback) {
                // 扫描所有已经Claim的Storage Volume, 选择满足容量与需求容量相等的volume然后创建Extend
                var clusters = [];
                clusters.push('cluster-1');
                clusters.push('cluster-2');
                async.mapSeries(clusters, function (clustername, callback) {

                    GetStorageVolumes(arrayInfo, clustername, function (response) {
                        if (response.code == 200) {
                            var result = response.response;
                            var res1 = {};
                            res1[clustername] = result.claimed;
                        }
                        subcallback(null, res1);
                    })

                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    };
                    var claimedStorageVolumes = {};
                    for (var i in result) {
                        if (result[i]['cluster-1'] != undefined) {
                            claimedStorageVolumes['cluster-1'] = result[i]['cluster-1'];
                        } else if (result[i]['cluster-2'] != undefined) {
                            claimedStorageVolumes['cluster-2'] = result[i]['cluster-2'];
                        }
                    }

                    // 根据请求容量查找每个cluster中符合容量条件的Storage Volume.
                    var claimedStorageVolumeList = {};
                    claimedStorageVolumeList["cluster-1"] = [];
                    claimedStorageVolumeList["cluster-2"] = [];
                    for (var i in claimedStorageVolumes['cluster-1']) {
                        var item = claimedStorageVolumes['cluster-1'][i];
                        if (request.capacity == item.capacity) {
                            claimedStorageVolumeList["cluster-1"].push(item.name);
                        }
                    }

                    for (var i in claimedStorageVolumes['cluster-2']) {
                        var item = claimedStorageVolumes['cluster-2'][i];
                        if (request.capacity == item.capacity) {
                            claimedStorageVolumeList["cluster-2"].push(item.name);
                        }
                    }

                    if (claimedStorageVolumeList["cluster-1"].length > 0 && claimedStorageVolumeList["cluster-1"].length > 0) {
                        //在查找结果中继续根据名称查找设备名称相同的一对Storage Volume, 如果没有相同的Volume, 则取出各自Cluster中的第1个成员作为选择结果
                        var chooseVolumes = [];
                        for (var i in claimedStorageVolumeList["cluster-1"]) {
                            var volumename1 = claimedStorageVolumeList["cluster-1"][i];
                            var volname1 = volumename1.split('_')[1];
                            if (volname1 === undefined || volname1 == null || volname1 == "") {
                                continue;
                            }

                            var isfind = false;
                            for (var j in claimedStorageVolumeList['cluster-2']) {
                                var volumename2 = claimedStorageVolumeList["cluster-2"][j];
                                var volname2 = volumename2.split('_')[1];
                                if (volname1 == volname2) {
                                    isfind = true;
                                    chooseVolumes.push(volumename1);
                                    chooseVolumes.push(volumename2);
                                    break;
                                }
                            }
                            if (isfind == true) break;

                        }
                        if (chooseVolumes.length == 0) {
                            chooseVolumes.push(claimedStorageVolumeList["cluster-1"][0]);
                            chooseVolumes.push(claimedStorageVolumeList["cluster-2"][0]);
                        }

                        paramStru.resMsg.code = 200;
                        paramStru.resMsg.message.push("find match storage volume for request capacity [" + request.capacity + "]. " + chooseVolumes.toString());

                        callback(null, chooseVolumes);

                    } else {
                        paramStru.resMsg.code = 500;
                        paramStru.resMsg.message.push("Can't find match storage volume for request capacity [" + request.capacity + "]");

                        callback(null, []);
                    }
                }
                )

            }
        ], function (err, result) {
            // result now equals 'done' 
            paramStru.response = result;
            callback(paramStru);
        });

}

/*
Function: CreateExtents;
Description: create extents for all of storage volumes that use is claimed; 
Paramater: 
    storagevolumes : Array [],
          {
              array: JSONObject, 
              clustername: String,
              StorageVolumeName: JSONObject 
          }
Response:
    {
    "code": 200,
    "message": "success",
    "response": [
        storagevolume
    ]
    }
*/
function CreateExtents(arrayInfo, callback) {


    async.waterfall(
        [
            // Get All Cluster
            function (callback) {
                GetClusters(arrayInfo, function (clusters) {
                    callback(null, clusters.response);
                })
            },

            function (clusters, callback) {

                async.mapSeries(clusters, function (clustername, callback) {
                    GetStorageVolumes(arrayInfo, clustername, function (result) {


                        var claimedStorageVolumes = [];
                        if (response.code == 200) {
                            var result = response.response;

                            if (result.claimed !== undefined)
                                for (var i in result.claimed) {
                                    var item = result.claimed[i];
                                    var paramater = {
                                        array: arrayInfo,
                                        clustername: clustername,
                                        StorageVolumeName: item.name
                                    }
                                    claimedStorageVolumes.push(paramater);
                                }
                        }

                        callback(null, claimedStorageVolumes);
                    })



                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    };
                    var claimedStorageVolumeList = [];
                    for (var i in result) {
                        claimedStorageVolumeList = claimedStorageVolumeList.concat(result[i])
                    }
                    callback(null, claimedStorageVolumeList);
                }
                )

            },
            function (claimedStorageVolumeList, callback) {

                async.mapSeries(claimedStorageVolumeList, function (claimedStorageVolume, callback) {

                    CreateExtent(claimedStorageVolume, function (result) { callback(null, result); })


                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    };
                    callback(null, result);
                }
                )

            }
        ], function (err, result) {
            // result now equals 'done'
            callback(result);
        });
}


/*
Function: ClaimAllStorageVolume;
Description: claim all of storage volumes in the VPLEX array; 
Paramater:
    arrayInfo: JSONObject
Response:
    {
    "code": 200,
    "message": "success",
    "response": [
        "cluster-1",
        "cluster-2"
    ]
    }
*/
function ClaimAllStorageVolume(arrayInfo, ActionParamaters, callback) {


    async.waterfall(
        [
            // Get All Cluster
            function (callback) {
                GetClusters(arrayInfo, function (clusters) {
                    callback(null, clusters.response);
                })
            },

            function (clusters, callback) {

                async.mapSeries(clusters, function (clustername, callback) {
                    GetStorageVolumes(arrayInfo, clustername, function (response) {
                        var unclaimed = [];

                        if (response.code == 200) {
                            var result = response.response;

                            for (var j in ActionParamaters) {
                                var actionItem = ActionParamaters[j];
                                if (actionItem.method.indexOf("CreatePhysicalDevice") < 0) continue;

                                if (result.unclaimed !== undefined) {

                                    var storage_vol_id = actionItem.response.lunwwn;
                                    var storage_vol_name = actionItem.response.name;
                                    var isfind = false;


                                    for (var i in result.unclaimed) {
                                        var item = result.unclaimed[i];
                                        if (item["system-id"].indexOf(storage_vol_id) >= 0) {
                                            console.log(item);
                                            isfind = true;
                                            var StorageVolumeClaimParamater = {
                                                array: arrayInfo,
                                                clustername: clustername,
                                                storagevolume: {
                                                    "capacity": item.capacity,
                                                    "health-state": item["health-state"],
                                                    "io-status": item["io-status"],
                                                    "operational-status": item["operational-status"],
                                                    "storage-array-name": item["storage-array-name"],
                                                    "system-id": item["system-id"],
                                                    "use": item["use"],
                                                    "StorageVolumeName": storage_vol_name
                                                }
                                            }
                                            unclaimed.push(StorageVolumeClaimParamater);
                                            break;
                                        }
                                    }
                                }
                            }


                        }
                        callback(null, unclaimed);
                    })



                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    };
                    var unclaimedList = [];
                    for (var i in result) {
                        unclaimedList = unclaimedList.concat(result[i])
                    }
                    callback(null, unclaimedList);
                }
                )

            },
            function (unclaimedList, callback) {
                var storagevolumes = [];
                for (var i in unclaimedList) {
                    var StorageVolumeClaimParamater = unclaimedList[i];
                    if (StorageVolumeClaimParamater.storagevolume.StorageVolumeName == "") {
                        console.log("Not Support claim: " + StorageVolumeClaimParamater.storagevolume["storage-array-name"])
                    } else if (StorageVolumeClaimParamater.storagevolume["health-state"] != "ok") {
                        console.log("Can not claim: " + StorageVolumeClaimParamater.storagevolume["storage-array-name"]);
                    } else {
                        storagevolumes.push(StorageVolumeClaimParamater);
                    }
                }

                var config = configger.load();

                switch (config.ProductType) {
                    case 'Dev':
                    case 'Test':
                        var result = {
                            "code": 200,
                            "message": "success",
                            "response": [
                                "cluster-1",
                                "cluster-2"
                            ]
                        };
                        callback(null, result);
                        break;
                    case 'Prod':
                        async.mapSeries(storagevolumes, function (StorageVolumeClaimParamater, callback) {

                            StorageVolumeClaim(StorageVolumeClaimParamater, function (result) { callback(null, result) })

                        }, function (err, result) {
                            var claimResult = [];
                            if (err) {
                                console.log(err);
                            };
                            callback(null, result);
                        }
                        )
                        break;
                }
            }
        ], function (err, result) {
            // result now equals 'done'
            console.log(result);
            callback(result);
        });



}


function ClaimStorageVolume(arrayInfo, physicalVolumeList, callback) {

    //console.log("TEST111" + JSON.stringify(physicalVolumeList, null, 2));
    async.waterfall(
        [
            // Get All Cluster
            function (callback) {
                GetClusters(arrayInfo, function (clusters) {
                    callback(null, clusters.response);
                })
            },

            function (clusters, callback) {

                async.mapSeries(clusters, function (clustername, callback) {
                    GetStorageVolumes(arrayInfo, clustername, function (response) {
                        if (response.code == 200) {
                            callback(null, response.response.unclaimed);
                        }
                    })
                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    };
                    var resultRecord = [];
                    for (var i in result) {
                        var item = result[i];
                        for (var j in item) {
                            var item1 = item[j];
                            for (var z in physicalVolumeList) {
                                var vol = physicalVolumeList[z];
                                if (item1.name.indexOf(vol.lunwwn) >= 0) {
                                    item1["pyhsicalVolumeName"] = vol.name;
                                    resultRecord.push(item1);
                                }

                            }

                        }
                    }
                    callback(null, resultRecord);
                }
                )

            },
            function (unclaimedList, callback) {

                console.log(unclaimedList);
                var config = configger.load();

                switch (config.ProductType) {
                    case 'Dev':
                    case 'Test':
                        var result = {
                            "code": 200,
                            "message": "success",
                            "response": [
                                "cluster-1",
                                "cluster-2"
                            ]
                        };
                        callback(null, result);
                        break;
                    case 'Prod':
                        async.mapSeries(unclaimedList, function (paramater, subcallback) {

                            var StorageVolumeName = paramater.pyhsicalVolumeName;
                            var systemid = paramater["system-id"];

                            var param = {};
                            param.array = arrayInfo;
                            param.url = '/storage-volume claim';
                            var bodyValue = "{ \"args\" : \"-f --name " + StorageVolumeName + " --storage-volumes " + systemid + "\"}";
                            param.body = bodyValue

                            CallGet.CallAutoPost(param, function (result) {
                                if (result.request !== undefined) {
                                    result.request.paramater = paramater;
                                }
                                subcallback(null, result);
                            })

                        }, function (err, result) {
                            var claimResult = [];
                            if (err) {
                                console.log(err);
                            };
                            callback(null, result);
                        }
                        )
                        break;
                }
            }
        ], function (err, result) {

            var retMsg = {
                code: 200,
                msg: "",
                data: null,
                response: null
            }
            if (err) {
                retMsg.code = err;
                retMsg.response = result;
            }
            console.log("*****Claim---\n" + JSON.stringify(retMsg, null, 2));
            // result now equals 'done' 
            callback(retMsg);
        });

}



/*
Function: GetClusters;
Description: Get a cluster list in the VPLEX array.
Paramater:
    arrayInfo: JSONObject
Response:
    {
    "code": 200,
    "message": "success",
    "response": [
        "cluster-1",
        "cluster-2"
    ]
    }
*/
function GetClusters(arrayInfo, callback) {
    var clusters = [];

    var config = configger.load();

    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            clusters.push('cluster-1');
            clusters.push('cluster-2');
            var response = { code: 200, message: "success", response: clusters };
            callback(response);
            break;
        case 'Prod':
            var param = {};
            param.array = arrayInfo;
            param.url = '/clusters';

            var response = { code: 200, message: "success", response: null };

            CallGet.CallAutoGet(param, function (result) {
                if (result.code == 200) {
                    response.code = 200;
                    response.message = "success";
                    for (var i in result.response.context[0].children) {
                        var item = result.response.context[0].children[i];
                        clusters.push(item.name);
                    }

                    response.response = clusters;
                } else {
                    response.code = result.code;
                    response.message = result.message;
                    response.response = null;
                }
                callback(response);
            });

            break;
    }

}



function HealthCheck(arrayInfo, callback) {
    var retMsg = {
        code: 200,
        msg: "",
        data: null,
        response: null
    }

    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "health-check execute finished.";
            retMsg.msg = result;
            callback(retMsg);
            break;
        case 'Prod': 
            var param = {};
            param.array = arrayInfo;
            param.url = '/health-check';
            var bodyValue = "{ \"args\" : \" -f \"}";
            param.body = bodyValue

            CallGet.CallAutoPost(param, function (result) {
                console.log("*****\n" + JSON.stringify(result,null,2) );
                if ( result.code == 202 ) {
                    //EXCEPTION: Command execution taking longer than 60 seconds. Command will be executed Asynchronously. Check command status at URL specified in Location
                    var location = result.headers.location;   

                   var VPLEXURL_USERNAME = arrayInfo.auth.username;
                   var VPLEXURL_PASSWORD = arrayInfo.auth.password;
                   var timerId = setInterval(
                    function () {
                        unirest.get(location)
                            .headers({ username: VPLEXURL_USERNAME, password: VPLEXURL_PASSWORD, 'Content-Type': 'multipart/form-data'  }) 
                            .end(function (response) {
                                //console.log(`-- job ${jobId} current status is ${response.body.status} -----`);
                                console.log("check task status ...");
                                if ( response.code == 200 ) {
                                //if ( response.body.response["custom-data"] != null && response.body.response["custom-data"] !== undefined  ) {
                                    clearInterval(timerId); 
                                    var result1 = {
                                        code: 200,
                                        msg: ` task execute is succeed! `,
                                        data: response.body.response["custom-data"]
                                    } 
                                    callback(result1);
                                } 
                            });
                    }
                    , 5000) 
                    
                } else 
                    callback(result);
            })
            break;

    } 
}




/*
Function: GetStorageArray;
Description: Get a physical array list in the VPLEX array cluster.
Paramater:
    arrayInfo: JSONObject
Response:
{
    "code": 200,
    "message": "success",
    "response": [
        "Dell-Compellent-497ac00",
        "EMC-CLARiiON-CKM00140400531",
        "EMC-SYMMETRIX-296800706",
        "EMC-SYMMETRIX-297800193"
    ]
} 
*/
function GetStorageArray(arrayInfo, clustername, callback) {
    var clusters = [];

    var config = configger.load();

    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            clusters.push('cluster-1');
            clusters.push('cluster-2');
            var response = { code: 200, message: "success", response: clusters };
            callback(response);
            break;
        case 'Prod':
            var param = {};
            param.array = arrayInfo;
            param.url = `/clusters/${clustername}/storage-elements/storage-arrays`;

            var response = { code: 200, message: "success", response: null };

            CallGet.CallAutoGet(param, function (result) {
                if (result.code == 200) {
                    response.code = 200;
                    response.message = "success";
                    for (var i in result.response.context[0].children) {
                        var item = result.response.context[0].children[i];
                        clusters.push(item.name);
                    }

                    response.response = clusters;
                } else {
                    response.code = result.code;
                    response.message = result.message;
                    response.response = null;
                }
                callback(response);
            });

            break;
    }

}


/*
Function: GetConsistencyGroups;
Description:  
Paramater:
    arrayInfo: JSONObject
Response:
    {
    "code": 200,
    "message": "success",
    "response": [
            "CG_CDP",
            "CG_SC",
            "RAC",
            "RAC_SC",
            "cg_test1"
        ]
    }
*/
function GetConsistencyGroups(arrayInfo, callback) {
    var clusters = [];
    var param = {};
    param.array = arrayInfo;
    param.url = '/clusters/cluster-1/consistency-groups';
    var config = configger.load();

    var response = { code: 200, message: "success", response: null };

    if (config.ProductType == 'Test') {
        var filename = '../demodata/VPLEX/cluster-1_consistency-groups';
        var result = require(filename);
        for (var i in result.response.context) {
            var item = result.response.context[i];
            for (var j in item.attributes) {
                var item1 = item.attributes[j];
                if (item1.name == "name") clusters.push(item1.value);
            }
        }
        response.response = clusters;
        callback(response)

    } else {

        CallGet.CallAutoGet(param, function (result) {
            if (result.code == 200) {
                response.code = 200;
                response.message = "success";
                for (var i in result.response.context[0].children) {
                    var item = result.response.context[0].children[i];
                    clusters.push(item.name);
                }

                response.response = clusters;
            } else {
                response.code = result.code;
                response.message = result.message;
                response.response = null;
            }
            callback(response);
        });
    }
}




/*
Function: GetStorageView
Description:  获取指定Storage View关联的Virtual Volume列表信息, 包括"名称","容量"
Paramater:
    arrayInfo: JSONObject
    cluster: String,
    viewname: String
Response:
{
  "code": 200,
  "message": "success",
  "response": [
    {
      "name": "dd_Symm0192_00FF_Symm0706_0261_vol",
      "capacity": "201G)"
    }
  ]
}
*/
function GetConsistencyGroup(arrayInfo, cluster, cgname, callback) {
    var clusters = [];
    var response = { code: 200, message: "success", response: null };

    var config = configger.load();

    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            var filename = '../demodata/VPLEX/' + cluster + '_consistency-groups';
            var svResult = require(filename);
            var result = {
                "response": {
                    "context": []
                }
            };

            for (var i in svResult.response.context) {
                var item = svResult.response.context[i];
                var isfind = false;
                for (var j in item.attributes) {
                    var attributesItem = item.attributes[j];
                    if (attributesItem.name == 'name' && attributesItem.value == cgname) {
                        result.response.context.push(item);
                        isfind = true;
                        break;
                    }
                }
                if (isfind == true) {
                    break;
                }
            }
            var cgitem = {};
            console.log('cluster=' + cluster + ',cgname=' + cgname);
            for (var i in result.response.context[0].attributes) {
                var item = result.response.context[0].attributes[i];
                cgitem[item.name] = item.value;
            }
            response.response = cgitem;
            callback(response);
            break;
        case 'Prod':
            var param = {};
            param.array = arrayInfo;
            param.url = '/clusters/' + cluster + '/consistency-groups/' + cgname;



            CallGet.CallAutoGet(param, function (result) {
                if (result.code == 200) {
                    response.code = 200;
                    response.message = "success";
                    //console.log(result.response.context[0].attributes);
                    var cgitem = {};
                    for (var i in result.response.context[0].attributes) {
                        var item = result.response.context[0].attributes[i];
                        cgitem[item.name] = item.value;
                    }

                    response.response = cgitem;
                } else {
                    response.code = result.code;
                    response.message = result.message;
                    response.response = null;
                }
                callback(response);
            });
            break;
    }



}



/*
Function: GetStorageViews
Description:  
Paramater:
    arrayInfo: JSONObject
Response:
    {
    "code": 200,
    "message": "success",
    "response": [
        "ESX151",
        "RP",
        "esx90",
        "esxi18"
    ]
    }
*/
function GetStorageViews(arrayInfo, cluster, callback) {

    var config = configger.load();

    var clusters = [];
    var param = {};
    param.array = arrayInfo;
    param.url = '/clusters/' + cluster + '/exports/storage-views';

    var response = { code: 200, message: "success", response: null };

    if (config.ProductType == 'Test') {
        var filename = '../demodata/VPLEX/cluster-1_storage-views';
        var result = require(filename);
        for (var i in result.response.context) {
            var item = result.response.context[i];
            for (var j in item.attributes) {
                var item1 = item.attributes[j];
                if (item1.name == "name") clusters.push(item1.value);
            }
        }
        response.response = clusters;
        callback(response)

    } else {
        CallGet.CallAutoGet(param, function (result) {
            if (result.code == 200) {
                response.code = 200;
                response.message = "success";
                for (var i in result.response.context[0].children) {
                    var item = result.response.context[0].children[i];
                    clusters.push(item.name);
                }

                response.response = clusters;
            } else {
                response.code = result.code;
                response.message = result.message;
                response.response = null;
            }
            callback(response);
        });
    }


}

function GetStorageViewsV1(arrayInfo, cluster, callback) {
    var clusters = [];
    var param = {};
    param.array = arrayInfo;

    switch (arrayInfo.version) {
        case "5.5":
            param.url = '/clusters/' + cluster + '/exports/storage-views/*';
            break;
        case "6.1":
            param.url = '/clusters/' + cluster + '/exports/storage-views';
            break;
        default:
            param.url = '/clusters/' + cluster + '/exports/storage-views/*';
    }

    var response = { code: 200, message: "success", response: null };

    CallGet.CallAutoGet(param, function (result) {

        //console.log("========================\n"+ JSON.stringify(result));

        if (result.code == 200) {

            var finalResult = [];
            var res1 = result.response.context;
            for (var i in res1) {
                var item = res1[i];
                var newItem = {};
                for (var j in item.attributes) {
                    var item1 = item.attributes[j];
                    if ((item1.name == 'name')) {
                        newItem['name'] = item1.value;
                    }
                    if ((item1.name == 'virtual-volumes')) {
                        var vvols = [];
                        var ps = [];
                        for (var z in item1.value) {
                            var vvol = item1.value[z].split(',')[1];
                            if (vvol.indexOf('dd_') == 0) {
                                vvols.push(vvol);
                                var pname = vvol.split('_')[1];
                                var sname = vvol.split('_')[3];
                                var psname = pname + '_' + sname;
                                var isfind = false;
                                for (var jj in ps) {
                                    var psItem = ps[jj];
                                    if (psItem == psname) {
                                        isfind = true;
                                        break;;
                                    }
                                }
                                if (isfind == false)
                                    ps.push(pname + '_' + sname);
                            }

                        }

                        //newItem['virtualvolumes'] = vvols;
                        newItem['ps'] = ps;
                    }
                }


                finalResult.push(newItem);


            }
            response.code = 200;
            response.message = "success";
            response.response = finalResult;
        } else {
            response.code = result.code;
            response.message = result.message;
            response.response = {};
        }

        callback(response);
    });
}

function GetStorageViewsDemoVersion(arrayInfo, cluster, callback) {
    var clusters = [];

    var response = { code: 200, message: "success", response: null };

    var filename = '../demodata/VPLEX/cluster-1_storage-views';
    var result = require(filename);

    var finalResult = [];
    var res1 = result.response.context;
    for (var i in res1) {
        var item = res1[i];
        var newItem = {};
        for (var j in item.attributes) {
            var item1 = item.attributes[j];
            if ((item1.name == 'name')) {
                newItem['name'] = item1.value;
            }
            if ((item1.name == 'virtual-volumes')) {
                var vvols = [];
                var ps = [];
                for (var z in item1.value) {
                    var vvol = item1.value[z].split(',')[1];
                    if (vvol.indexOf('dd_') == 0) {
                        vvols.push(vvol);
                        var pname = vvol.split('_')[1];
                        var sname = vvol.split('_')[3];
                        var psname = pname + '_' + sname;
                        var isfind = false;
                        for (var jj in ps) {
                            var psItem = ps[jj];
                            if (psItem == psname) {
                                isfind = true;
                                break;;
                            }
                        }
                        if (isfind == false)
                            ps.push(pname + '_' + sname);
                    }

                }

                //newItem['virtualvolumes'] = vvols;
                newItem['ps'] = ps;
            }
        }


        finalResult.push(newItem);


    }
    response.code = 200;
    response.message = "success";
    response.response = finalResult;

    callback(response);
}

/*
Function: GetStorageView
Description:  获取指定Storage View关联的Virtual Volume列表信息, 包括"名称","容量"
Paramater:
    arrayInfo: JSONObject
    cluster: String,
    viewname: String
Response:
{
  "code": 200,
  "message": "success",
  "response": [
    {
      "name": "dd_Symm0192_00FF_Symm0706_0261_vol",
      "capacity": "201G)"
    }
  ]
}
*/
function GetStorageView(arrayInfo, cluster, viewname, callback) {
    var clusters = [];
    var response = { code: 200, message: "success", response: null };

    var config = configger.load();

    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            var filename = '../demodata/VPLEX/' + cluster + '_storage-views';
            var svResult = require(filename);
            var result = {
                "response": {
                    "context": []
                }
            };

            for (var i in svResult.response.context) {
                var item = svResult.response.context[i];
                var isfind = false;
                for (var j in item.attributes) {
                    var attributesItem = item.attributes[j];
                    if (attributesItem.name == 'name' && attributesItem.value == viewname) {
                        result.response.context.push(item);
                        isfind = true;
                        break;
                    }
                }
                if (isfind == true) {
                    break;
                }
            }
            console.log('cluster=' + cluster + ',viewname=' + viewname);

            if (result.response.context.length == 0) {
                response.code = 404;
                response.message = 'not find view [ ' + viewname + ' ] in cluster [ ' + cluster + ' ].';
                response.response = null;
            }
            else {
                var virtualvolumes = [];
                for (var i in result.response.context[0].attributes) {
                    var item = result.response.context[0].attributes[i];
                    if (item.name == 'virtual-volumes') {
                        var vols = item.value;
                        if (vols !== undefined) {
                            for (var j in vols) {
                                var volsitem = vols[j];
                                var volname = volsitem.split(',')[1];
                                var volcapacity = volsitem.split(',')[3];
                                var volitem = {};
                                volitem["name"] = volname;
                                volitem["capacity"] = volcapacity;
                                virtualvolumes.push(volitem);
                            }

                        }
                    }
                }

                response.response = {};
                response.response["cluster"] = cluster;
                response.response["storageview"] = viewname;
                response.response["virtualvolumes"] = virtualvolumes;
            }

            callback(response);

            break;
        case 'Prod':
            var param = {};
            param.array = arrayInfo;
            param.url = '/clusters/' + cluster + '/exports/storage-views/' + viewname;
            CallGet.CallAutoGet(param, function (result) {
                if (result.code == 200) {
                    response.code = 200;
                    response.message = "success";
                    //console.log(result.response.context[0].attributes);
                    var virtualvolumes = [];
                    for (var i in result.response.context[0].attributes) {
                        var item = result.response.context[0].attributes[i];
                        if (item.name == 'virtual-volumes') {
                            var vols = item.value;
                            if (vols !== undefined) {
                                for (var j in vols) {
                                    var volsitem = vols[j];
                                    var volname = volsitem.split(',')[1];
                                    var volcapacity = volsitem.split(',')[3];
                                    var volitem = {};
                                    volitem["name"] = volname;
                                    volitem["capacity"] = volcapacity;
                                    virtualvolumes.push(volitem);
                                }

                            }
                        }
                    }

                    response.response = {};
                    response.response["cluster"] = cluster;
                    response.response["storageview"] = viewname;
                    response.response["virtualvolumes"] = virtualvolumes;
                } else {
                    response.code = result.code;
                    response.message = result.message;
                    response.response = null;
                }
                callback(response);
            });
            break;
    }



}


function GetStorageVolumes(arrayInfo, clustername, callback) {
    autologger.logger.info('debug', "Begin function [ GetStorageVolumes ], paramater [" + clustername + "]");
    console.log("Begin function [ GetStorageVolumes ], paramater [" + clustername + "]");

    var finalResult = {};
    var extentNameList = [];
    var config = configger.load();
    var response = { code: 200, message: "success", response: null };

    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            var filename = '../demodata/VPLEX/' + clustername + '_storage-volumes'
            var extentResult = require(filename);
            for (var i in extentResult.response.context) {
                var extentAttr = extentResult.response.context[i].attributes;
                var extentItem = {};
                for (var j in extentAttr) {
                    var fieldname = extentAttr[j].name;
                    var value = extentAttr[j].value;
                    switch (fieldname) {
                        case 'capacity':
                            value = value.replace('B', '');
                            value = Math.round(value / 1024 / 1024 / 1024);
                            break;

                    }
                    extentItem[fieldname] = value;
                }
                if (extentItem.use == 'unclaimed') {
                    var StorageVolumeName = ConvertStorageVolumeName(extentItem["storage-array-name"], extentItem["system-id"]);
                    extentItem["StorageVolumeName"] = StorageVolumeName;
                }

                if (finalResult[extentItem.use] === undefined) finalResult[extentItem.use] = [];
                finalResult[extentItem.use].push(extentItem);

            }
            response.code = 200;
            response.message = "success";
            response.response = finalResult;

            callback(response);
            break;
        case 'Prod':
            var param = {};
            param.array = arrayInfo;
            param.url = '/clusters/' + clustername + '/storage-elements/storage-volumes/*';


            CallGet.CallAutoGet(param, function (extentResult) {

                //console.log("=============\n"+JSON.stringify(extentResult)); 
                if (extentResult.code == 200) {

                    for (var i in extentResult.response.context) {
                        var extentAttr = extentResult.response.context[i].attributes;
                        var extentItem = {};
                        for (var j in extentAttr) {
                            var fieldname = extentAttr[j].name;
                            var value = extentAttr[j].value;
                            switch (fieldname) {
                                case 'capacity':
                                    value = value.replace('B', '');
                                    value = Math.round(value / 1024 / 1024 / 1024);
                                    break;

                            }
                            extentItem[fieldname] = value;
                        }
                        if (extentItem.use == 'unclaimed') {
                            var StorageVolumeName = ConvertStorageVolumeName(extentItem["storage-array-name"], extentItem["system-id"]);
                            extentItem["StorageVolumeName"] = StorageVolumeName;
                        }

                        if (finalResult[extentItem.use] === undefined) finalResult[extentItem.use] = [];
                        finalResult[extentItem.use].push(extentItem);

                    }

                    response.code = 200;
                    response.message = "success";
                    response.response = finalResult;
                } else {
                    response.code = extentResult.code;
                    response.message = extentResult.message;
                    response.response = {};
                }

                var DataFilename = '/tmp/volumes-' + clustername + '.json';
                fs.writeFile(DataFilename, JSON.stringify(response), function (err) {
                    callback(response);
                });
            })
            break;
    }




}


function GetExtents(arrayInfo, clustername, callback) {
    var finalResult = {};
    var extentNameList = [];
    var param = {};
    param.array = arrayInfo;
    param.url = '/clusters/' + clustername + '/storage-elements/extents';

    CallGet.CallAutoGet(param, function (result) {
        var extents = result.response.context[0].children;
        if (extents === undefined) {
            finalResult = {};
        } else {
            for (var i in extents) {
                var item = extents[i];
                extentNameList.push(item.name);
            }
        }
        async.mapSeries(extentNameList, function (extentname, callback) {
            var itemParam = {};
            itemParam.array = param.array;
            itemParam.url = param.url + "/" + extentname;
            CallGet.CallAutoGet(itemParam, function (extentResult) {
                var extentAttr = extentResult.response.context[0].attributes;
                var extentItem = {};
                for (var j in extentAttr) {
                    var fieldname = extentAttr[j].name;
                    var value = extentAttr[j].value;
                    switch (fieldname) {
                        case 'capacity':
                            value = value.replace('B', '');
                            value = Math.round(value / 1024 / 1024 / 1024);
                            break;

                    }
                    extentItem[fieldname] = value;
                }
                if (extentItem.use == 'unclaimed') {
                    var StorageVolumeName = ConvertStorageVolumeName(extentItem["storage-array-name"], extentItem["system-id"]);
                    extentItem["StorageVolumeName"] = StorageVolumeName;
                }

                callback(null, extentItem);
            })
        }, function (err, result) {
            if (err) {
                callback(err);
            };
            for (var i in result) {
                var extentItem = result[i];
                if (finalResult[extentItem.use] === undefined) finalResult[extentItem.use] = [];
                finalResult[extentItem.use].push(extentItem);
            }

            callback(finalResult);
        })


    })
}



function GetClaimedExtentsByArray(arrayInfo, clustername, callback) {
    var finalResult = {};
    GetExtents(arrayInfo, clustername, function (extents) {
        var claimedExtents = extents.claimed;
        if (claimedExtents !== undefined) {
            for (var i in claimedExtents) {
                var item = claimedExtents[i];
                var arrayname = item.name.split('_')[1];
                if (arrayname !== undefined) {
                    if (finalResult[arrayname] === undefined) finalResult[arrayname] = { TotalCapacity: 0, count: 0, extents: [] };
                    finalResult[arrayname].TotalCapacity += item.capacity;
                    finalResult[arrayname].count++;
                    finalResult[arrayname].extents.push(item);
                }
            }
        }

        callback(finalResult);
    })
}


/*
    Name: StorageVolumeClaim
    Description: Claims the specified storage volumes.
    Paramater: 
          {
              array: JSONObject, 
              clustername: String,
              storagevolume: JSONObject
                {
                    StorageVolumeName: String,
                    use: String,  // [ unclaimed ]
                    storage-array-name: String,  // EMC-SYMMETRIX-297800193
                    system-id: String,  // VPD83T3:60000970000297800193533030313631
                    operational-status: String,  [ ok ]
                    health-state: String, [ ok ] 
                }
          }
*/
function StorageVolumeClaim(paramater, callback) {

    var arrayInfo = paramater.array;
    var clustername = paramater.clustername;
    var StorageVolumeName = paramater.storagevolume.StorageVolumeName;
    var systemid = paramater.storagevolume["system-id"];

    var param = {};
    param.array = arrayInfo;
    param.url = '/storage-volume claim';
    var bodyValue = "{ \"args\" : \"-f --name " + StorageVolumeName + " --storage-volumes " + systemid + "\"}";
    param.body = bodyValue

    CallGet.CallAutoPost(param, function (result) {
        if (result.code == 200) {
            if (result.request !== undefined) {
                result.request.paramater = paramater;
            }
        }
        callback(result);
    })
}



/*
Function: StorageRediscover;
Description: array re-discover
Paramater: 
    storagevolumes : Array [],
          {
              array: JSONObject, 
              clustername: String,
              StorageVolumeName: JSONObject 
          }
Response:
    {
    "code": 200,
    "message": "success",
    "response": [
        storagevolume
    ]
    }
*/
function StorageRediscover(arrayInfo, callback) {

    async.waterfall(
        [
            // Get All Cluster
            function (callback) {
                GetClusters(arrayInfo, function (clusters) {
                    if (clusters.code == 200)
                        callback(null, clusters.response);
                    else {
                        callback(clusters.code, clusters.message);
                    }
                })
            },

            function (clusters, callback) {

                async.mapSeries(clusters, function (clustername, callback) {

                    GetStorageArray(arrayInfo, clustername, function (result) {
                        if (result.code == 200) {
                            var storage_array_list = result.response;
                            async.mapSeries(storage_array_list, function (arrayItem, subcallback) {
                                console.log(`### Begin discover the storage array [${arrayItem}] in cluster [${clustername}]`);
                                DiscoverStorageArray(arrayInfo, clustername, arrayItem, function (disresult) {
                                    subcallback(null, disresult)
                                })


                            }, function (err, arrayresult) {
                                if (err) {
                                    console.log(err);
                                };
                                callback(null, arrayresult);
                            }

                            )

                        } else {
                            callback(result.code, result.message);
                        }
                    })


                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    };
                    callback(null, result);
                }
                )

            }
        ], function (err, result) {
            var retMsg = {
                code: 200,
                msg: "",
                data: null,
                response: null
            }

            // result now equals 'done'
            if (err) {
                retMsg.code = err;
                retMsg.response = result;
            }
            callback(retMsg);
        });
}




/*
    Name: CreateExtent
    Description: Creates one or more storage-volume extents.
    Paramater: 
          {
              array: JSONObject,  
              StorageVolumeName: JSONObject 
          }
*/
function CreateExtent(paramater, callback) {
    var retMsg = {
        code: 200,
        msg: "",
        data: null,
        response: null
    }

    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "CreateExtent execute finished.";
            retMsg.msg = result;
            callback(retMsg);
            break;
        case 'Prod':
            var arrayInfo = paramater.array;
            var StorageVolumeName = paramater.StorageVolumeName;

            var param = {};
            param.array = arrayInfo;
            param.url = '/extent+create';
            var bodyValue = "{ \"args\" : \" " + " -d " + StorageVolumeName + " \"}";
            param.body = bodyValue

            CallGet.CallAutoPost(param, function (result) {
                //console.log("*****\n" + JSON.stringify(result,null,2) );
                callback(result);
            })
            break;

    }

}

/*
    Name: DiscoverStorageArray
    Description: discover a physical storage array in a cluster.
    Paramater: 
          {
              array: JSONObject,  
              StorageVolumeName: JSONObject 
          }
*/
function DiscoverStorageArray(arrayInfo, clustername, storagename, callback) {
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "DiscoverStorageArray execute finished.";
            callback(result);
            break;
        case 'Prod':
            var param = {};
            param.array = arrayInfo;
            param.url = '/array+re-discover';
            var bodyValue = `{ "args": "--array /clusters/${clustername}/storage-elements/storage-arrays/${storagename}  -f --cluster ${clustername} " }`;
            param.body = bodyValue

            CallGet.CallAutoPost(param, function (result) {
                callback(result);
            })
            break;

    }

}



/*
    Name: CreateLocalDevice
    Description: Stripes data across two or more storage volumes. 
                 Use RAID-0 for non-critical data that requires high speed and low cost of implementation.
    Paramater: 
          {
              array: JSONObject, 
              clustername: String,
              devicename: String,    // Need matche "Device Naming Rule"
              geometry: String,      // "raid-0",
              stripe-depth: Number,  // Default "1"
              extents: Array[String]   // extents list
          }
*/
function CreateLocalDevice1(paramater, callback) {
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "CreateLocalDevice execute finished.";
            callback(result);
            break;
        case 'Prod':
            var arrayInfo = paramater.array;
            var devicename = paramater.devicename;
            var geometry = paramater.geometry == undefined ? 1 : paramater.geometry;
            var extents = paramater.extents;

            var param = {};
            param.array = arrayInfo;
            param.url = '/local-device+create';
            var bodyValue = "{ \"args\" : \"-f --name " + devicename + " --geometry " + geometry + " --stripe-depth 1 --extents " + extents + "\"}";
            param.body = bodyValue

            CallGet.CallAutoPost(param, function (result) {
                callback(result);
            })
            break;
    }
}




/*
    Name: CreateDistributedDevice
    Description: Creates a new distributed-device
    Paramater: 
          {
              array: JSONObject,  
              devicename: String,      // NamingRule: dd_<sourcedevice>_<targetdevice>
              devices: Array[String],  // The list of supporting cluster-local-devices that will be legs in the new distributed-device.
              sourcedevice: String     // Picks one of the '--devices' to be used as the source data image for the new device. The command will copy data from the '--source-leg' to the other legs of the new device.
          }
*/
function CreateDistributedDevice(paramater, callback) {
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "CreateDistributedDevice execute finished.";
            callback(result);
            break;
        case 'Prod':
            var arrayInfo = paramater.array;
            var devicename = paramater.devicename;
            var devices = paramater.devices;
            var source_device = paramater.sourcedevice;

            var param = {};
            param.array = arrayInfo;
            param.url = '/ds+dd+create';
            var bodyValue = "{ \"args\" : \"-f --name " + devicename + " --devices " + devices + " --source-leg " + source_device + "\"}";
            param.body = bodyValue

            CallGet.CallAutoPost(param, function (result) {
                callback(result);
            })
            break;
    }
}


/*
    Name: CreateLocalDevice
    Description: Stripes data across two or more storage volumes. 
                 Use RAID-0 for non-critical data that requires high speed and low cost of implementation.
    Paramater: 
          {
              array: JSONObject, 
              clustername: String,
              devicename: String,    // Need matche "Device Naming Rule"
              geometry: String,      // Defaut "raid-0",
              stripe-depth: Number,  // Default "1"
              extents: Array[String]   // extents list
          }
*/
function CreateLocalDevice(paramater, callback) {
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "CreateDistributedDevice execute finished.";
            callback(result);
            break;
        case 'Prod':
            var arrayInfo = paramater.array;
            var clustername = paramater.clustername;
            var devicename = paramater.devicename;
            var geometry = paramater.geometry == undefined ? 'raid-0' : paramater.geometry;
            var stripedepth = paramater['stripe-depth'] == undefined ? 1 : paramater['stripe-depth'];
            var extents = paramater.extents;

            var param = {};
            param.array = arrayInfo;
            param.url = '/local-device+create';


            // Defined return object 
            var retObj = {
                "code": 200,
                "message": "succeed",
                "request": paramater,
                "response": ""
            };


            switch (geometry) {
                case 'raid-0':
                    if (extents.length < 1) {
                        retObj.code = 501;
                        retObj.message = "fail";
                        retObj.response = "the number of extends is less 1.";
                        callback(retObj);
                    }
                    break;
                case 'raid-1':
                    if (extents.length < 2) {
                        retObj.code = 501;
                        retObj.message = "fail";
                        retObj.response = "the number of extends is less 2.";
                        callback(retObj);
                    }
                    break;
                case 'raid-c':
                default:
                    retObj.code = 500;
                    retObj.message = "fail";
                    retObj.response = "geometry [" + geometry + "] is not support right now ( support 'raid-0','raid-1' only )!"
                    callback(retObj);
            }
            var bodyValue = "{ \"args\" : \"-f --name " + devicename + " --geometry " + geometry + " --stripe-depth " + stripedepth + " --extents " + extents + "\"}";
            param.body = bodyValue


            CallGet.CallAutoPost(param, function (result) {
                callback(result);
            })
            break;
    }
}


/*
    Name: CreateLocalVVol
    Description: Creates a virtual volume on a host device.
    Paramater: 
          {
              array: JSONObject, 
              devicename: String   // The device to host the virtual volume on.
          }
*/
function CreateVirtualVolume(paramater, callback) {
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "CreateVirtualVolume execute finished.";
            callback(result);
            break;
        case 'Prod':
            var arrayInfo = paramater.array;
            var devicename = paramater.devicename;

            var param = {};
            param.array = arrayInfo;
            param.url = '/virtual-volume+create';


            // Defined return object 
            var retObj = {
                "code": 200,
                "message": "succeed",
                "request": paramater,
                "response": ""
            };


            var bodyValue = "{ \"args\" : \" --device=" + devicename + "\"}";
            param.body = bodyValue

            CallGet.CallAutoPost(param, function (result) {
                callback(result);
            })
            break;
    }
}



/*
    Name: AssignConsistencyGroup
    Description: Adds virtual volumes to a consistency group.
    Paramater: 
          {
              array: JSONObject, 
              virtual_volume: String,   // A glob pattern, or a comma-separated list of glob patterns, for the virtual volumes to add.
              consistency_group: String  // The consistency group to add virtual volumes to.
          }
*/
function AssignConsistencyGroup(paramater, callback) {
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "AssignConsistencyGroup execute finished.";
            callback(result);
            break;
        case 'Prod':
            var arrayInfo = paramater.array;
            var vvolname = paramater.virtual_volume;
            var CGName = paramater.consistency_group;

            var param = {};
            param.array = arrayInfo;
            param.url = '/consistency-group+add-virtual-volumes';


            // Defined return object 
            var retObj = {
                "code": 200,
                "message": "succeed",
                "request": paramater,
                "response": ""
            };


            var bodyValue = "{ \"args\" : \" --virtual-volumes " + vvolname + " --consistency-group " + CGName + "\"}";
            param.body = bodyValue

            CallGet.CallAutoPost(param, function (result) {
                callback(result);
            })
            break;
    }
}



/*
    Name: AssignStorageView
    Paramater: 
          {
              array: JSONObject, 
              clustername: String,
              viewname: String,   // The view to add the virtual-volumes to.
              virtualvolumes: Array[String] // Comma-separated list of virtual-volumes or (lun, virtual-volume) pairs.
          }
*/
function AssignStorageView(paramater, callback) {
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "AssignConsistencyGroup execute finished.";
            callback(result);
            break;
        case 'Prod':
            var arrayInfo = paramater.array;
            var clustername = paramater.clustername;
            var viewname = paramater.viewname;
            var vvols = paramater.virtualvolumes;

            var param = {};
            param.array = arrayInfo;
            param.url = '/export+storage-view+addvirtualvolume';


            // Defined return object 
            var retObj = {
                "code": 200,
                "message": "succeed",
                "request": paramater,
                "response": ""
            };

            var v = '/clusters/' + clustername + '/exports/storage-views/' + viewname;

            var bodyValue = "{ \"args\" : \" -f --view " + v + " --virtual-volumes " + vvols + "\"}";
            param.body = bodyValue

            CallGet.CallAutoPost(param, function (result) {
                callback(result);
            })
            break;
    }
}



/*   FUNCTION 
     get the one of vplex array info from configure files "./config/arrays.json"
*/
function GetArrayInfoObject(arrayname) {
    var arrayinfo_filename = ".//config//arrays.json";
    var ret = fs.readFileSync(arrayinfo_filename);
    var arrayJson = JSON.parse(ret);
    for (var i in arrayJson) {
        var item = arrayJson[i];
        //console.log(item);
        if (item.name == arrayname)
            return item;
    }
    return {};
}

/*
*   Convert LUN WWN for EMC Symmetrix from LUN WWN to LUN ID
     VPD83T3:60000970000296800706533030323533 -> Symm0706_XXXX
*/
function ConvertStorageVolumeName(arrayname, lunwwn) {

    /*
        Symmetrix: Symm[sid<last4>]_[LunID<last4>]
    */
    var StorageVolumeName;   // 

    if (arrayname.indexOf("EMC-SYMMETRIX") >= 0) {
        //arrayname = EMC-SYMMETRIX-296800706

        var sn = arrayname.replace("EMC-SYMMETRIX-", "");
        var pos = lunwwn.indexOf(sn);
        var LUNID_HEX = lunwwn.substr(pos + sn.length + 4);
        var LUNID = new Buffer(LUNID_HEX, "utf-8").toString();
        var LUNID_ASCII = util.hex_to_ascii(LUNID);

        var subSN = sn.substr(-4);

        // NAME: VPD83T3:60000970000296800706533030323533 -> Symm0706_XXXX
        StorageVolumeName = "Symm" + subSN + "_" + LUNID_ASCII;

    } else if (arrayname.indexOf("EMC-CLARiiON") >= 0) {
        // arrayname = 'EMC-CLARiiON-CKM00163300785'

        var sn = arrayname.replace("EMC-CLARiiON", "");
        var pos = lunwwn.indexOf(":");
        var LUNID_HEX = lunwwn.substr(8);
        var LUNID = new Buffer(LUNID_HEX, "utf-8").toString();
        var LUNID_ASCII = util.hex_to_ascii(LUNID);
        //NAME: VPD83T3:6006016009204100012b995aa384cc7c ->VNX0785_XXX
        StorageVolumeName = "";

    }


    return StorageVolumeName;
}


/*

Response: 
{
    
    catacity: {
        count: number,
        total: number,
        extents: []
    }

}
*/
function ExtentsSortByCapacity(extents) {
    var extentsByCapacity = {};

    for (var i in extents) {
        var item = extents[i];

        var capacityStr = item.capacity.toString();

        if (extentsByCapacity[capacityStr] === undefined) extentsByCapacity[capacityStr] = { count: 0, total: 0, extents: [] };

        extentsByCapacity[capacityStr].count++;
        extentsByCapacity[capacityStr].total += item.capacity;
        extentsByCapacity[capacityStr].extents.push(item);

    }

    return extentsByCapacity;
}

/*

[appname]+[usedfor]+[local|distribute]+[arrayname]+[totalcapacity]+[createdate]
{
    appname: String,
    usedfor: String,
    provideType: String,
    arrayname: String,
    totalcapacity: number
}
*/

function GenerateDeviceName(paramater) {
    var DeviceName;

    var totalcapacity = paramater.totalcapacity.toString();

    var createdate = moment().format("YYYYMMDD");
    DeviceName = paramater.appname + "_" + paramater.usedfor + "_" + paramater.provideType + "_" + paramater.arrayname + "_" + totalcapacity + "_" + createdate;


    return DeviceName;
}

/*
    type: 
      - prod : 生产中心
      - DR : 同城中心
      - NBU : NBU
      - prodCheck: 生产验证
      - prodRPA : 本地RPA
      - remoteRPA  : 异地RPA
      - remoteCheck : 异地备份服务器与异地验证机
*/
function GenerateStorateViewName(request, type) {

    var appname = request.appname;
    var appname_ext = request.appname_ext;
    var SC_VIEW_NAME = appname + '_' + appname_ext;

    var naming;
    var isfind = false;
    for (var i in Naming) {
        var item = Naming[i];
        var searchName = appname + "_";

        if (item.SC == SC_VIEW_NAME) {
            //console.log(item.SC + ' | ' + SC_VIEW_NAME);
            isfind = true;
            naming = item;
            break;
        }
    }


    switch (type) {
        case 'prod':
            return SC_VIEW_NAME;
            break;
        case 'TC':
            //var ret = 'TC_' + appname + '_VW';
            var ret =  `TC_${appname}_${appname_ext}`;
            if (isfind == false)
                return ret;
            else
                return naming.TC == 'N/A' ? ret : naming.TC;

            break;
        case 'SH':
            //var ret = 'SH_' + appname + '_VW';
            var ret =  appname + '_' + appname_ext;
            if (isfind == false)
                return ret;
            else 
                return naming.SH == 'N/A' ? ret : naming.SH;

            break;
        case 'Backup':
            var ret = 'osback1_VW';
            if (isfind == false)
                return ret;
            else
                return naming.BACKUP == 'N/A' ? ret : naming.BACKUP;

            break;
        case 'AppVerification_SameCity':
            var ret = 'cdpyz3_VW';
            if (isfind == false)
                return ret;
            else
                return naming.CDP == 'N/A' ? ret : naming.CDP;

            break;
        case 'AppVerification_DiffCity':
            var ret = 'RP_C1_VW';
            if (isfind == false)
                return ret;
            else
                return naming.RP == 'N/A' ? ret : naming.RP;

            break;
    }

}


function GenerateConsistencyGroupName(request) {

    var appname = request.appname;
    var appname_ext = request.appname_ext;
    var SC_VIEW_NAME = appname + '_' + appname_ext;

    var naming;
    var isfind = false;
    for (var i in Naming) {
        var item = Naming[i];

        if (item.SC == SC_VIEW_NAME) {
            console.log(item.SC + ' | ' + SC_VIEW_NAME);
            isfind = true;
            naming = item;
            break;
        }
    }


    var ret = appname + "_CG_Prod";
    if (isfind == false)
        return ret;
    else
        return naming.CG == 'N/A' ? ret : naming.CG;

}
/*
根据分布式卷的名称解析出主存储的名称
dd_Symm0192_00FF_Symm0706_0261_vol
   ********
*/
function ParsePrimaryArrayName(ddVolName) {
    if (ddVolName.indexOf('dd_') != 0) {
        return null;
    } else {
        var PrimaryArrayName = ddVolName.split('_')[1];
        return PrimaryArrayName;
    }
}


function AutoObjectCheckVaild(AutoObject, callback) {

    // 1. 检查两个Cluster中Claimed的Storage Volume是否都存在, 以确保满足创建分布式虚拟卷的需求。
    //    如果一边或两边没有发现Claimed Storage Volumes，则不继续执行
    var claimedList = AutoObject.AutoInfo.ResourceInfo.ClaimedStorageVolumes;
    //console.log(JSON.stringify(claimedList));
    if ((claimedList["cluster-1"] === undefined)) {
        claimedList["cluster-1"] = {};
    };
    if ((claimedList["cluster-2"] === undefined)) {
        claimedList["cluster-2"] = {};
    }
    if ((claimedList["cluster-1"].length == 0) || (claimedList["cluster-2"].length == 0)) {

        AutoObject.resMsg.code = 500;
        AutoObject.resMsg.message.push("the number of claimed storage volume in cluster is ZERO  [ cluster-1=" + claimedList["cluster-1"].length + ", cluster-2=" + claimedList["cluster-2"].length + "] ! Please assign storage volumes from physical array. ");
        callback(AutoObject);
    } else {
        callback(AutoObject);
    }


}
