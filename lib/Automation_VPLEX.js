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
var Naming = require('../data/SDCityBank-Naming.json');


module.exports = {
    CapacityProvisingService,
    CapacityProvisingServiceV2,

    CreateStorageDevice,
    CreateExtents,
    ClaimAllStorageVolume,


    // --- function
    GetArrayInfoObject,
    ConvertStorageVolumeName,
    ExtentsSortByCapacity,
    GenerateDeviceName,
    GenerateStorateViewName,
    GenerateConsistencyGroupName,

    // --- base funtion

    GetClusters,
    GetExtents,
    GetClaimedExtentsByArray,
    GetStorageVolumes,
    GetConsistencyGroups,
    GetConsistencyGroup,
    GetStorageViews,
    GetStorageView,
    GetStorageViewsV1,
    GetStorageViewsDemoVersion,

    StorageVolumeClaim,
    CreateExtent,
    CreateLocalDevice,
    CreateDistributedDevice,
    CreateVirtualVolume,

    AssignConsistencyGroup,
    AssignStorageView,

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

// 支持多组卷（按照每个卷的容量大小分组）的批量创建
function CapacityProvisingServiceV2(AutoObject, maincallback) {

    AutoObject.resMsg.code = 200;
    AutoObject.resMsg.message.push("Begin execute service [ CapacityProvisingService ] !");
    autologger.logger.info("Begin execute service [ CapacityProvisingService ] !");

    var ws = AutoObject.request.ws;
    AutoObject.AutoInfo["ActionParamaters"] = [];

    var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo.info;

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
                    } else
                        callback(null, result);
                })
            },
            // 检查当前配置数据的合规性.
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
            function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ ChooseVirtualVolumesV2 ] !");
                // 扫描所有已经Claim的Storage Volume, 选择满足容量与需求容量相等的volume
                ChooseVirtualVolumesV2(AutoObject, function (result) {
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
                    async.mapSeries(executeParamaters, function (executeParamater, subcallback) {
                        autologger.logs(200, "Execute action: [ " + executeParamater.method + " ]. depend on action: [" + executeParamater.DependOnAction + "].", AutoObject);

                        executeParamater["array"] = arrayInfo;

                        switch (executeParamater.method) {
                            case 'CreateExtent':
                                CreateExtent(executeParamater, function (result) {
                                    console.log("-------------- Create Extent execute finished -----------------\n");
                                    executeParamater.response = result;
                                    executeParamater.show = 'true';
                                    ws.send(JSON.stringify(executeParamaters));
                                    subcallback(null, result);
                                })
                                break;
                            case 'CreateLocalDevice':
                                CreateLocalDevice(executeParamater, function (result) {
                                    console.log("-------------- Create LocalDevice execute finished -----------------\n");
                                    executeParamater.response = result;
                                    executeParamater.show = 'true';
                                    ws.send(JSON.stringify(executeParamaters));
                                    subcallback(null, result);
                                })
                                break;
                            case 'CreateDistributedDevice':
                                CreateDistributedDevice(executeParamater, function (result) {
                                    console.log("-------------- Create Distributed Device execute finished -----------------\n");
                                    executeParamater.response = result;
                                    executeParamater.show = 'true';
                                    ws.send(JSON.stringify(executeParamaters));
                                    subcallback(null, result);
                                })
                                break;

                            case 'CreateDistributedVirtualVolume':
                                CreateVirtualVolume(executeParamater, function (result) {
                                    console.log("-------------- Create Distributed Virtual Volume execute finished -----------------\n");
                                    executeParamater.response = result;
                                    executeParamater.show = 'true';
                                    ws.send(JSON.stringify(executeParamaters));
                                    subcallback(null, result);
                                })
                                break;

                            case 'AssignConsistencyGroup':
                                AssignConsistencyGroup(executeParamater, function (result) {
                                    console.log("-------------- Assign Consistency Group execute finished -----------------\n");
                                    executeParamater.response = result;
                                    executeParamater.show = 'true';
                                    ws.send(JSON.stringify(executeParamaters));
                                    subcallback(null, result);
                                })
                                break;

                            case 'AssignStorageView':
                                AssignStorageView(executeParamater, function (result) {
                                    console.log("-------------- Assign Storage View execute finished -----------------\n");
                                    executeParamater.response = result;
                                    executeParamater.show = 'true';
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
            var opsType = AutoObject.request.opsType;
            if (opsType !== undefined && opsType == "review") {
            } else {
                var finishMsg = {};
                var executeParamaters = AutoObject.AutoInfo.ActionParamaters;
                var newexecuteParamaters = [];
                for ( var i in executeParamaters) {
                    newexecuteParamaters.push(executeParamaters[i]);
                }
                var ws = AutoObject.request.ws;
    
                finishMsg["Step"] = "自动化服务执行完成！";
                finishMsg["show"] = "true";
                finishMsg["response"] = "";
                newexecuteParamaters.push(finishMsg);
                console.log("----------------- Service is finish -------------------");
                console.log(JSON.stringify(newexecuteParamaters));
                ws.send(JSON.stringify(newexecuteParamaters));
            }


            maincallback(result);
        });
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

            }
            , function (AutoObject, callback) {
                autologger.logger.info("Begin execute step [ ComponeAutoInfo.GetConsistencyGroup ] !");

                // 获取Consistency Group信息
                //AutoObject.AutoInfo["ConsistencyGroup"] = {};
                ResourceInfo["ConsistencyGroup"] = {};

                var ConsistencyGroupName = GenerateConsistencyGroupName(request.appname);
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
                }


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
    for (var i in RuleResults.StorageDevices) {
        var item = RuleResults.StorageDevices[i];
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
    for (var i in RuleResults.StorageDevices) {
        var item = RuleResults.StorageDevices[i];

        switch (item.position) {
            case 'primary':
                ddDeviceName = ddDeviceName.replace('PPPP', item.name);
                sourcedevice = 'device_' + item.name;
                break;
            case 'second':
                ddDeviceName = ddDeviceName.replace('SSSS', item.name);
                break;
            default:
                resMsg.code = 600;
                resMsg.message.push("Position is UNKNOW. Cann't confirm the primary/second device! [" + JSON.stringify(item) + "]");
                return AutoObject;
        }
        storagevols.push(item.name);
        devices.push('device_' + item.name);
    }

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
    var AssignStorageViews = [];
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
        for (var i in StorageDevices) {
            var item = StorageDevices[i];

            switch (item.position) {
                case 'primary':
                    ddDeviceName = ddDeviceName.replace('PPPP', item.name);
                    sourcedevice = 'device_' + item.name;
                    break;
                case 'second':
                    ddDeviceName = ddDeviceName.replace('SSSS', item.name);
                    break;
                default:
                    resMsg.code = 600;
                    resMsg.message.push("Position is UNKNOW. Cann't confirm the primary/second device! [" + JSON.stringify(item) + "]");
                    return AutoObject;
            }
            storagevols.push(item.name);
            devices.push('device_' + item.name);
        }

        var CreateDistributedDeviceParamater = {
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
        var AssignStorageViews = [];
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
                callback("svview_result.code != " + svview_result.code );
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
function ClaimAllStorageVolume(arrayInfo, callback) {


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

                            if (result.unclaimed !== undefined)
                                for (var i in result.unclaimed) {
                                    var item = result.unclaimed[i];
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
                                            "StorageVolumeName": item["StorageVolumeName"]
                                        }
                                    }
                                    unclaimed.push(StorageVolumeClaimParamater);
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
            callback(result);
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
    var clusters = [];
    var param = {};
    param.array = arrayInfo;
    param.url = '/clusters/' + cluster + '/exports/storage-views';

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
}

function GetStorageViewsV1(arrayInfo, cluster, callback) {
    var clusters = [];
    var param = {};
    param.array = arrayInfo;
    param.url = '/clusters/' + cluster + '/exports/storage-views/*';

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
                response.message = 'not find view [ '+viewname + ' ] in cluster [ ' + cluster + ' ].';
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
                    if (err) throw err;
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
    Name: CreateExtent
    Description: Creates one or more storage-volume extents.
    Paramater: 
          {
              array: JSONObject,  
              StorageVolumeName: JSONObject 
          }
*/
function CreateExtent(paramater, callback) {
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = "CreateExtent execute finished.";
            callback(result);
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
                callback(result);
                break;
            })

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
function CreateLocalDevice(paramater, callback) {
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
                break;
            })
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
                break;
            })
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
                break;
            })
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
                break;
            })
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
                break;
            })
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
                break;
            })
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
        var pos = lunwwn.indexOf(sn);
        var LUNID_HEX = lunwwn.substr(pos + sn.length);
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
    var SC_VIEW_NAME=appname + '_' + appname_ext;

    var naming;
    var isfind = false;
    for ( var i in Naming ) {
        var item = Naming[i];
        var searchName = appname+"_";
        if ( item.SC == SC_VIEW_NAME ) {
            isfind = true;
            naming = item;
            break;
        }
    }


    switch (type) {
        case 'prod':
            return SC_VIEW_NAME ;
            break;
        case 'TC':
            var ret = 'TC_' + appname + '_VW';
            if ( isfind == false )
                return  ret;
            else 
                return naming.TC=='N/A'? ret: naming.TC;
                
            break;
        case 'SH':  
            var ret = 'SH_' + appname + '_VW';
            if ( isfind == false )
                return  ret;
            else 
                return naming.SH=='N/A'? ret: naming.SH;
                    
            break;
        case 'Backup':
            var ret = 'osback1_VW';
            if ( isfind == false )
                return ret;
            else 
                return naming.BACKUP=='N/A'? ret: naming.BACKUP; 
                
            break;
        case 'AppVerification_SameCity': 
            var ret = 'cdpyz3_VW';
            if ( isfind == false )
                return ret;
            else 
                return naming.CDP=='N/A'? ret: naming.CDP; 
                                
            break;
        case 'AppVerification_DiffCity':
            var ret = 'RP_C1_VW';
            if ( isfind == false )
                return ret;
            else 
                return naming.RP=='N/A'? ret: naming.RP;  
                
            break;
    }

}


function GenerateConsistencyGroupName(appname) {

    var SC_VIEW_NAME=appname + '_' ;

    var naming;
    var isfind = false;
    for ( var i in Naming ) {
        var item = Naming[i];
        var searchName = appname+"_";
        if ( item.SC.indexOf(SC_VIEW_NAME) >= 0  ) {
            isfind = true;
            naming = item;
            break;
        }
    }

    var ret = appname + "_CG_Prod";
    if ( isfind == false )
        return ret;
    else 
        return naming.CG=='N/A'? ret: naming.CG;  
          
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
