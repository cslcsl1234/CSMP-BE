"use strict";

var async = require('async');
var fs = require('fs');
var moment = require('moment');
const uuid = require('uuid');
const ResourcePools = require('../lib/automation/resourcepools')
const RPA=require('../lib/Automation_RPA')


module.exports = {
    CapacityProvisingService,
    ChooseStorage,

    BuildParamaterStrucut,
    CreateStorageDevice,

    GetCapabilityInfo,

    ExecuteActions,
    ExecuteActions_TEST
}

function ExecuteActions_TEST(callback) {
    var timestamp = moment().format('MMDDHHmmss');
    var volname = 'VOLTEST_' + timestamp;
    var executeParamaters = [
        {
            "Step": "Create device and assign to sg [ MSCS_SG ] in pyhsical array [ 000297800193 ], arraytype= [ VMAX ]",
            "method": "CreatePhysicalDevice",
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
            "StorageVolumeName": volname,
            "capacityByte": 1073741824
        },
        {
            "Step": "Create device and assign to sg [ VPLEX_101_BE ] in pyhsical array [ CKM00163300785 ] , arraytype= [ Unity ]",
            "method": "CreatePhysicalDevice",
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
            "StorageVolumeName": volname,
            "capacityByte": 1178599424
        },
        {
            "Step": "re-discover physical array in vplex [ EMCCTEST ] ",
            "method": "ReDiscoverPhysicalArray",
            "arrayinfo": {
                "name": "EMCCTEST",
                "array_type": "VPLEX",
                "version": "5.5",
                "endpoint": "https://10.32.32.100/vplex",
                "auth": {
                    "username": "service",
                    "password": "password"
                }
            }
        },
        {
            "Step": "claim physical volume in vplex [ EMCCTEST ] ",
            "method": "ClaimPhysicalVolume",
            "arrayinfo": {
                "name": "EMCCTEST",
                "array_type": "VPLEX",
                "version": "5.5",
                "endpoint": "https://10.32.32.100/vplex",
                "auth": {
                    "username": "service",
                    "password": "password"
                }
            }
        }
    ]
    ExecuteActions(executeParamaters, null, function (result) {
        callback(result);
    })

}

function sleep(sleepTime) {
    for (var start = +new Date; +new Date - start <= sleepTime;) { };
}



function ExecuteActions(executeParamaters, ws, callback) {
    async.mapSeries(executeParamaters, function (executeParamater, subcallback) {
        console.log("*************************************************************");
        console.log("Execute Step Group: [" + executeParamater.StepGroupName + "]")
        console.log("Execute action: [ " + executeParamater.method + " ]. depend on action: [" + executeParamater.DependOnAction + "]. step name : [" + executeParamater.Step + "].");

        var retMsg = {
            code: 0,
            msg: ""
        }

        executeParamater["array"] = executeParamater.arrayinfo;
        var array_type = executeParamater.arrayinfo.array_type;
        var ArrayAPI;
        switch (array_type) {
            case "VMAX":
                ArrayAPI = require('../lib/Automation_VMAX');
                break;
            case "Unity":
                ArrayAPI = require('../lib/Automation_UNITY');
                break;
            case "VPLEX":
                ArrayAPI = require('../lib/Automation_VPLEX');
                break;
            case "RPA":
                ArrayAPI = require('../lib/Automation_RPA');
                break;

            default:
                retMsg.msg = `not support array type [${array_type}]`;
                retMsg.code = 404
                callback(retMsg);
                break;
        }
        switch (executeParamater.method) {
            case 'CreatePhysicalDevice':
                ArrayAPI.ExecuteAction(executeParamater, function (result) {

                    console.log("----------------------");
                    console.log(result);
                    executeParamater["response"] = result;
                    if (result.code != 200) {
                        executeParamater.show = 'true';
                        executeParamater.status = 'fail';
                        executeParamater.response = result;
                        if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                        sleep(5000);
                        subcallback(result.code, executeParamater)
                    } else {
                        executeParamater.status = 'success';
                        executeParamater.response = result;
                        if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                        sleep(5000);
                        subcallback(null, executeParamater);
                    }

                })

                break;


            case 'ReDiscoverPhysicalArray':
                var arrayInfo = executeParamater.arrayinfo;
                ArrayAPI.StorageRediscover(arrayInfo, function (result) {
                    executeParamater["response"] = result;
                    executeParamater.status = 'success';
                    executeParamater.response = result;

                    console.log(JSON.stringify(executeParamater));
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);

                    subcallback(null, executeParamater);
                })
                break;
            case 'ClaimPhysicalVolume':
                var arrayInfo = executeParamater.arrayinfo;

                var physicalVolumeList = [];
                for (var i in executeParamaters) {
                    var item = executeParamaters[i];

                    if (item.method == "CreatePhysicalDevice") {
                        if (item.response !== undefined)
                            physicalVolumeList.push(item.response.data)
                    }

                }
                ArrayAPI.ClaimStorageVolume(arrayInfo, physicalVolumeList, function (result) {
                    executeParamater["response"] = result;
                    executeParamater.status = 'success';
                    executeParamater.response = result;

                    console.log(JSON.stringify(executeParamater));
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);

                    subcallback(null, executeParamater);
                })
                break;
            case 'CreateExtent':
                ArrayAPI.CreateExtent(executeParamater, function (result) {
                    console.log("-------------- Create Extent execute finished -----------------\n");
                    //console.log(result);
                    if (result.code == 200) {
                        executeParamater.show = 'true';
                        executeParamater.status = 'success';
                        executeParamater.response = result;
                    } else {
                        executeParamater.show = 'true';
                        executeParamater.status = 'fail';
                        executeParamater.response = result;
                    }

                    //console.log(JSON.stringify(executeParamater,null,2));
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);
                    if (executeParamater.status == 'fail')
                        subcallback(result.code, executeParamater);
                    else
                        subcallback(null, executeParamater);
                })
                break;
            case 'CreateLocalDevice':
                ArrayAPI.CreateLocalDevice(executeParamater, function (result) {
                    console.log("-------------- Create LocalDevice execute finished -----------------\n");
                    //console.log(result);
                    if (result.code == 200) {
                        executeParamater.show = 'true';
                        executeParamater.status = 'success';
                        executeParamater.response = result;
                    } else {
                        executeParamater.show = 'true';
                        executeParamater.status = 'fail';
                        executeParamater.response = result;
                    }
                    console.log(JSON.stringify(executeParamater, null, 2));
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);
                    if (executeParamater.status == 'fail')
                        subcallback(result.code, executeParamater);
                    else
                        subcallback(null, executeParamater);
                })
                break;
            case 'CreateDistributedDevice':
                ArrayAPI.CreateDistributedDevice(executeParamater, function (result) {
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
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);
                    if (executeParamater.status == 'fail')
                        subcallback(result.code, result);
                    else
                        subcallback(null, result);
                })
                break;

            case 'CreateDistributedVirtualVolume':
            case 'CreateVirtualVolume':
                ArrayAPI.CreateVirtualVolume(executeParamater, function (result) {
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
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);
                    if (executeParamater.status == 'fail')
                        subcallback(result.code, result);
                    else
                        subcallback(null, result);
                })
                break;

            case 'AssignConsistencyGroup':
                ArrayAPI.AssignConsistencyGroup(executeParamater, function (result) {
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
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);
                    if (executeParamater.status == 'fail')
                        subcallback(result.code, result);
                    else
                        subcallback(null, result);
                })
                break;

            case 'AssignStorageView':
                ArrayAPI.AssignStorageView(executeParamater, function (result) {
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
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);
                    if (executeParamater.status == 'fail')
                        subcallback(result.code, result);
                    else
                        subcallback(null, result);
                })
                break;


            case 'RAPCreateConsistencyGroup':


                var createCGParamater = {
                    "ClusterName": executeParamater.ClusterName,
                    "CGName": executeParamater.CGName,
                    "Copys": {
                        "Prod": {
                            journalVolumeName: executeParamater.ProdJournalVolume
                        },
                        "Local": {
                            journalVolumeName: executeParamater.LocalJournalVolume
                        },
                        "Remote": {
                            journalVolumeName: executeParamater.RemoteJournalVolume
                        }
                    }
                }

                console.log(JSON.stringify(createCGParamater));

                ArrayAPI.CreateConsistencyGroup(executeParamater.arrayinfo, createCGParamater, function (result) {
                    console.log(`-------------- ${executeParamater.Step} execute finished -----------------\n`);
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
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);
                    if (executeParamater.status == 'fail')
                        subcallback(result.code, result);
                    else
                        subcallback(null, result);
                });



                break;

            case 'RAPCreateReplicationSet':

                var createReplicationSetParamater = {
                    "CGName": executeParamater.CGName,
                    "ReplicationsetName": executeParamater.ReplicationsetName,
                    "volume": {
                        "prod": executeParamater.prod,
                        "local": executeParamater.local,
                        "remote": executeParamater.remote
                    }
                }

                //console.log(JSON.stringify(JSON.stringify(createReplicationSetParamater)));

                ArrayAPI.CreateReplicationSet(executeParamater.arrayinfo, createReplicationSetParamater, function (result) {
                    console.log(`-------------- ${executeParamater.Step} execute finished -----------------\n`);
                    //console.log(result);
                    if (result.code == 200) {
                        executeParamater.show = 'true';
                        executeParamater.status = 'success';
                        executeParamater.response = result;
                    } else {
                        executeParamater.show = 'true';
                        executeParamater.status = 'fail';
                        executeParamater.response = result.msg;
                    }
                    console.log(JSON.stringify(executeParamater));
                    if (ws !== undefined) ws.send(JSON.stringify(executeParamater));
                    sleep(5000);
                    if (executeParamater.status == 'fail')
                        subcallback(result.code, result);
                    else
                        subcallback(null, result);
                });


                break;



            default:
                subcallback(504, "action [ " + executeParamater.method + " ] has not defined!");
                break;
        }


    },
        function (err, result) {
            /*
            [ { Step:
                 'RPA: Create device and assign to sg [RecoverPoint] in pyhsical array [ unknow ], arraytype= [ Unity ] for RPA Prod Journal volume.',
                method: 'CreatePhysicalDevice',
                arrayinfo:
                 { array_type: 'Unity',
                   unity_sn: 'CKM00163300785',
                   unity_password: 'P@ssw0rd',
                   unity_hostname: '10.32.32.64',
                   unity_pool_name: 'sxpool',
                   unity_username: 'admin',
                   sgname: 'RecoverPoint' },
                DependOnAction: 'N/A',
                AsignSGName: 'RecoverPoint',
                StorageVolumeName: 'ebankwebesxi_CG_Remote_Log_01',
                capacityByte: 10737418240,
                progress: 1,
                array:
                 { array_type: 'Unity',
                   unity_sn: 'CKM00163300785',
                   unity_password: 'P@ssw0rd',
                   unity_hostname: '10.32.32.64',
                   unity_pool_name: 'sxpool',
                   unity_username: 'admin',
                   sgname: 'RecoverPoint' },
                response: { code: 510, msg: [Object], data: [Circular] },
                show: 'true',
                status: 'fail' } ]
            
            */
            var retMsg = {
                code: 200,
                msg: "",
                data: null
            }
            if (err) {
                retMsg.code = err;

                console.log("++++++++++++++ 1111")
                console.log(JSON.stringify(result, null, 2));
                console.log("+++++++++++++++ 2222")

                for (var i in result) {
                    var item = result[i];
                    if (item.response.code == 200) continue;
                    if (item.response.code !== undefined) {
                        retMsg.msg = item.response.msg;
                        retMsg.data = item;
                        break;
                    } else {
                        retMsg.msg = item.msg;
                        retMsg.data = item;
                        break;
                    }
                }

                console.log(retMsg);
                console.log("+++++++++++++++ 3333")

                callback(retMsg)
            }
            else {
                retMsg.data = result;
                callback(retMsg);
            }

        }
    )
}


function GetCapabilityInfo(catalog, type, name) {
    var Filename = "./config/StorageCapability.json";
    var re1 = fs.readFileSync(Filename, "UTF-8");
    var result = JSON.parse(re1);
    if (result === undefined) {
        return null
    }
    if (result[catalog] !== undefined) {
        if (result[catalog][type] !== undefined) {
            var isfind = false;
            for (var i in result[catalog][type]) {
                var item = result[catalog][type][i];
                console.log(item.name + ',' + name);
                if (item.name == name) {
                    return item;
                }
            }
            if (isfind == false) return null
        } else return null
    } else
        return null

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
 
    // ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'

    var resourcePoolLevel = paramater.resourceLevel;
    var requestId = uuid.v4();
    //console.log("\n============[Request ID]===========\n" + requestId.toString());

    var paramStru = {
        "requestId": uuid.v4().toString(),
        "resMsg": ret,
        "request": paramater,
        "ResourcePools": {},
        "AutoInfo": {
            "RuleResults": {},
            "ActionResult": {},
            "ResourceInfo": {
                "Array": {
                    "VPLEX": {
                    }
                }
            },
            "ActionParamaters": []
        },
        "ActionResponses": [],
        "subProcessResult": {}
    }


    
    async.waterfall(
        [
            function (callback) {
                var resourcePools = ResourcePools.GetResourcePool()
                paramStru.ResourcePools = resourcePools;
                callback(null, paramStru);
            }
        ], function (err, result) {
            // result now equals 'done'
            //console.log(JSON.stringify(result, 2, 2));
            callback(result);
        });
};


function ChooseStorage(AutoObject) {

    var resourcePools = AutoObject.ResourcePools;
    var require = AutoObject.request;

    var storage;
    for (var i in resourcePools) {
        var item = resourcePools[i];
        if (item.name == require.resourcePoolName) {
            for (var j in item.members) {
                var arrayItem = item.members[j];
                if (j == 0) storage = arrayItem;
                if (arrayItem.capacity > storage.capacity) storage = arrayItem;
            }
            return storage;
        }
        var msg = `Function:ChooseStorage: Can not found ${require.resourcePoolName} in ResourcePools, Please check config/ResourcePool.json.`;
        AutoObject.resMsg.code = 500;
        AutoObject.resMsg.message.push(msg);
        return null;
    }
}



function CapacityProvisingService(AutoObject, maincallback) {

    //console.log(AutoObject);

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
                        AutoObject.resMsg.message.push("Not support the array type [" + arrayType + "]");
                        maincallback(AutoObject);
                        break;
                }

                if (AutoAPI !== undefined) {
                    //AutoAPI.CapacityProvisingServiceV3(AutoObject, function (result) {
                    AutoAPI.CapacityProvisingServiceTEST(AutoObject, function (result) {
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