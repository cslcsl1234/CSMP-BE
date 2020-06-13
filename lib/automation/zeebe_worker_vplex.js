const ZB = require('zeebe-node')
const async = require('async');
var configger = require('../../config/configger');
const ZBUTIL = require('../automation/zeebe_util')
const VPLEX = require('../Automation_VPLEX');
const VMAX = require('../Automation_VMAX');
const UNITY = require('../Automation_UNITY');


module.exports = {
    createProcessWorker
}


/** Input Paramaters
       paramaters["subParamater"] = {
            "Paramaters": {
                "ApplicationCode": "ABC",
                "StepGroupName": "VPLEX  Provider TEST",
                "Volumes": [
                    {
                        "UsedFor": "os",
                        "CapacityGB": 2,
                        "type": "distributed",
                        "ClusterName": "cluster-1,cluster-2",
                        "ConsistencyGroup": ["CG_CDP","EMC-TC1005_CG_Prod"]
                    },
                    {
                        "UsedFor": "data",
                        "CapacityGB": 3,
                        "type": "localed",
                        "ClusterName": "cluster-1",
                        "ConsistencyGroup": ["CG_CDP"]
                    }
                ],
                "AssignStorageViews": [
                    "CC3_Prod_View",
                    "RP_C1_VW"
                ],
                "timestamp": "20200531165601"
            },
            "ResourceInfo": {
                "ArrayInfo": {
                    "arrayname": "EMCCTEST1",
                    "arraytype": "VPLEX",
                    "capacity": 1000,
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
                    "capability": {
                        "CDP": {
                            "catalog": "CDP.RPA",
                            "name": "RPA-1"
                        }
                    },
                    "backend_array": [
                        {
                            "clustername": "cluster-1",
                            "array_type": "VMAX",
                            "serial_no": "000297800193",
                            "password": "smc",
                            "unispherehost": "10.121.0.204",
                            "universion": "90",
                            "user": "smc",
                            "verifycert": false,
                            "sgname": "MSCS_SG",
                            "purpose": "Prod"
                        },
                        {
                            "clustername": "cluster-2",
                            "array_type": "Unity",
                            "unity_sn": "CKM00163300785",
                            "unity_password": "P@ssw0rd",
                            "unity_hostname": "10.32.32.64",
                            "unity_pool_name": "jxl_vplex101_pool",
                            "unity_username": "admin",
                            "sgname": "VPLEX_101_BE",
                            "purpose": "Prod"
                        }
                    ]
                },
                "StorageView": {
                },
                "ConsistencyGroup": []
            },
            "ResultResourceInfo": {
                "VirtualVolumes": [
                    {
                        "type": "distributed | localed",
                        "ClusterName": "cluster-1，cluster-2"
                        "UsedFor": "os",
                        "CapacityGB": 2,
                        "PhysicalVolumes": [
                        ],
                        "sourcedevice": "",
                        "devices": [
                        ],
                        "DeviceName": "",
                        "VirtualVolumeName": ""
                    }
                ]
            },
            "ActionParamaters": []
        }

*/

async function connect() {
    var config = configger.load();
    try {
        const zbc = new ZB.ZBClient(config.ZEEBE.BROKER);
        return zbc;
    } catch (error) {
        throw new Error(error);
    }
};

async function createProcessWorker() {
    const zbc = await connect();

    zbc.createWorker('Pre-VPLEX-Provider-Service-worker', "Pre-VPLEX-Provider-Service", (job, complete, worker) => {

        var paramaters = job.variables;

        var request = paramaters.request;
        var AutoInfo = paramaters.AutoInfo;
        var ArrayInfo = AutoInfo.RuleResults.ArrayInfo

        var AssignStorageViews = [];
        var clusterNamesString = "cluster-1,cluster-2";
        switch (request.ProtectLevel.hostDeplpy) {
            case "SC":
                var ViewName = VPLEX.GenerateStorateViewName(request, "prod");
                var clusterNamesString = "cluster-1";
                AssignStorageViews.push(ViewName);
                break;

            case "TC":
                var ViewName = VPLEX.GenerateStorateViewName(request, "TC");
                var clusterNamesString = "cluster-2";
                AssignStorageViews.push(ViewName);
                break;

            case "SC+TC":
                var ViewName = VPLEX.GenerateStorateViewName(request, "SH");
                var clusterNamesString = "cluster-1,cluster-2";
                AssignStorageViews.push(ViewName);
                break;
        }
        if (request.ProtectLevel.Backup == true) {
            var ViewName = VPLEX.GenerateStorateViewName(request, "Backup");
            AssignStorageViews.push(ViewName);
        }

        var Volumes = [];
        var VirtualVolumes = [];
        var ProdConsistencyGroup = VPLEX.GenerateConsistencyGroupName(request);
        for (var i = 0; i < request.count; i++) {
             
            var physicalArrayInfos = ArrayInfo["backend_array"];
            var sequenceNumber = i + 1;
            var volno = "";
            if (sequenceNumber < 10) volno = "0" + sequenceNumber;
            volno = sequenceNumber;

            var volumeItem = {
                "UsedFor": request.usedfor,
                "CapacityGB": request.capacity,
                "type": "distributed",
                "ClusterName": clusterNamesString,
                "ConsistencyGroup": [ProdConsistencyGroup],
                "PhysicalVolumeNames": []
            }

            var clusterNames = clusterNamesString.split(',');
            if (volumeItem.type == "distributed" ) {
                clusterNames = [ 'cluster-1', 'cluster-2']
            }

            for (var z in clusterNames) {
                var clustername = clusterNames[z];
                for (var z1 in physicalArrayInfos) {
                    var item = physicalArrayInfos[z1];
                    if (item.clustername != clustername) continue;

                    var arrayType = item.array_type;
                    switch (arrayType) {
                        case 'VMAX':
                            var volName = VMAX.GenerateVolNameV2(item, request.appname, request.usedfor, request.timestamp) + volno;
                            volumeItem.PhysicalVolumeNames.push(volName);
                            break;
                        case 'Unity':
                            var volName = UNITY.GenerateVolNameV2(item, request.appname, request.usedfor, request.timestamp) + volno;
                            volumeItem.PhysicalVolumeNames.push(volName);
                            break;
                        default:
                            var msg = `Not support array type [${arrayType}]`;
                            var code = 501;
                            worker.log(msg);  
                            ZBUTIL.exceptionProcess(zbc, paramaters, code, msg); 
                            return complete.error(code,msg); 

                    }
                    break;
                }

            }

            
            var VirtualVolumeItem = {
                "type": volumeItem.type,
                "ClusterName": volumeItem.ClusterName,
                "UsedFor": volumeItem.UsedFor,
                "CapacityGB": volumeItem.CapacityGB,
                "PhysicalVolumes": volumeItem.PhysicalVolumeNames,
                "sourcedevice": "",
                "devices": [
                ],
                "DeviceName": "",
                "VirtualVolumeName": ""
            }

            VirtualVolumes.push(VirtualVolumeItem);
            Volumes.push(volumeItem);
        }

        paramaters["subParamater"] = {
            "Paramaters": {
                "ApplicationCode": request.appname,
                "StepGroupName": "Providing Product Volume using VPLEX",
                "Volumes": Volumes,
                "AssignStorageViews": AssignStorageViews,
                "timestamp": request.timestamp
            },
            "ResourceInfo": {
                "ArrayInfo": AutoInfo.RuleResults.ArrayInfo,
                "StorageView": {},
                "ConsistencyGroup": []
            },
            "ResultResourceInfo": {
                "VirtualVolumes": VirtualVolumes
            },
            "ActionParamaters": []
        }
        //worker.log(paramaters.subParamater)
        return complete.success(paramaters);
    })



    zbc.createWorker('Post-VPLEX-Provider-Service-worker', "Post-VPLEX-Provider-Service", (job, complete, worker) => {

        var paramaters = job.variables;

        var ActionParamaters = paramaters.AutoInfo.ActionParamaters;

        var VPLEXProviderParamater = paramaters.subParamater;
        var SubActionParamaters = VPLEXProviderParamater.ActionParamaters;

        for (var i in SubActionParamaters) {
            var item = SubActionParamaters[i];
            ActionParamaters.push(item);
        }

        paramaters.subProcessResult["ProdVolumeByVPLEX"] = paramaters.subParamater;
        paramaters.subParamater = {};
        return complete.success(paramaters);
    })


    // 原子服务

    zbc.createWorker('VPLEX-Initial-Configure-Info-worker', "VPLEX-Initial-Configure-Info", (job, complete, worker) => {
        var paramaters = job.variables;
        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;

        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var arrayInfo = ResourceInfo.ArrayInfo;
        var clusters = ['cluster-1', 'cluster-2'];

        async.waterfall([
            function (callback) {
                //
                // Get VPLEX Storage View List
                // 

                async.mapSeries(clusters, function (clustername, callback) {
                    VPLEX.GetStorageViews(arrayInfo.info, clustername, function (result) {
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
                    //ResourceInfo.StorageView = finalResult;

                    ResourceInfo.StorageView = finalResult;

                    callback(null, ResourceInfo);

                });

            },
            function (arg1, callback) {
                VPLEX.GetConsistencyGroups(arrayInfo.info, function (result) {
                    ResourceInfo.ConsistencyGroup = result.response;
                    callback(null, arg1);
                })
            }
        ], function (err, result) {

            //worker.log(finalResult);
            return complete.success(paramaters);
        });



    });


    zbc.createWorker('VPLEX-verification-configuration-worker', "VPLEX-verification-configuration" , async (job, complete, worker) => {
        var paramaters = job.variables;
        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;

        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;

        /**
         * 根据主机部署模式（SC、TC、SC+TC）来确定在哪个Cluster中搜索View名称。
            （SC：Cluster-1, TC: Cluster-2, SC+TC: Cluster-1,Cluster-2)
         */
        var request = paramaters.request; 
        var clusters = [];
        switch (request.ProtectLevel.hostDeplpy) {
            case "SC":
                clusters = ['cluster-1'];
                break;

            case "TC":
                clusters = ['cluster-2'];
                break;

            case "SC+TC":
                clusters = ['cluster-1', 'cluster-2'];
                break; 
        } 

        async.waterfall([
            function (callback) {
                // Search assign storage view in Storage View in VPLEX
                var StorageViews = ResourceInfo.StorageView;
                var AssignStorageViews = inputParamaters.AssignStorageViews;
                //worker.log(JSON.stringify(AssignStorageViews,2,2))
                for (var j in clusters) {
                    var clustername = clusters[j];
                    for (var z in AssignStorageViews) {
                        var assignSVItem = AssignStorageViews[z];

                        //worker.log(`this is storage view ${assignSVItem}`)
                        var isfind = false;
                        for (var i in StorageViews[clustername]) {
                            var svItem = StorageViews[clustername][i];
                            if (svItem == assignSVItem) {
                                isfind = true;
                                break;
                            }
                        }
                        if (isfind == false) {
                            var msg = `the assign storage view [${assignSVItem}] not exist in cluster [${clustername}] in VPLEX!`;
                            worker.log(msg);
                            callback(501, msg);
                        }
                    }

                }

                callback(null, StorageViews)
            },
            function (arg1, callback) {

                // Search assign storage view in Storage View in VPLEX
                var ConsistencyGroup = ResourceInfo.ConsistencyGroup
                var volumes = inputParamaters.Volumes;
                var cg = {};
                for (var i in volumes) {
                    var item = volumes[i];
                    for (var j in item.ConsistencyGroup) {
                        var cgItem = item.ConsistencyGroup[j];
                        cg[cgItem] = {};
                    }
                }



                //worker.log(JSON.stringify(AssignStorageViews,2,2))
                for (var cgname in cg) {
                    var isfind = false;
                    for (var z in ConsistencyGroup) {
                        var CGItem = ConsistencyGroup[z];

                        if (cgname == CGItem) {
                            isfind = true;
                            break;
                        }

                    }
                    if (isfind == false) {
                        var msg = `the assign consistency group [${cgname}] not exist in VPLEX!`;
                        worker.log(msg);
                        callback(501, msg);
                    }

                }

                callback(null, ConsistencyGroup)
            }
        ], function (err, result) {
            if ( err ) {
                console.log("ERROR:" + err+ 　','+result)
                var code = err;
                var msg = result;
                ZBUTIL.exceptionProcess(zbc, paramaters, code, msg); 
                return complete.error(err,msg);
            } else  
                return complete.success(paramaters);
        }); 

    });



    zbc.createWorker('VPLEX-CreatePhysicalVolume-worker', "VPLEX-CreatePhysicalVolume", (job, complete, worker) => {

        var paramaters = job.variables;

        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;
        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var ResultResourceInfo = VPLEXProviderParamater.ResultResourceInfo;
        var ActionParamaters = VPLEXProviderParamater.ActionParamaters;
        var stepgroupname = inputParamaters.StepGroupName;
        worker.log(`${stepgroupname} : VPLEX-CreatePhysicalVolume begin `)

        for (var i in inputParamaters.Volumes) {
            var volumeItem = inputParamaters.Volumes[i];

            var clusterNames = volumeItem.ClusterName.split(',');

            if (volumeItem.type == "localed" && clusterNames.length != 1) {
                var msg = "The virtual volume type is localed, but #cluster is not 1!";
                var code = 501;
                worker.log(msg);
                ZBUTIL.exceptionProcess(zbc, paramaters, code, msg); 
                return complete.error(code,msg);
            }
            if (volumeItem.type == "distributed" ) {
                clusterNames = [ 'cluster-1', 'cluster-2']
            }

            var physicalArrayInfos = ResourceInfo.ArrayInfo["backend_array"];



            for (var z in clusterNames) {
                var clustername = clusterNames[z];
                for (var z1 in physicalArrayInfos) {
                    var item = physicalArrayInfos[z1];
                    if (item.clustername != clustername) continue;

                    var sgname = item.sgname;   // the storage group for backend array assign to vplex
                    var arrayType = item.array_type;
                    var volName = volumeItem.PhysicalVolumeNames[z];

                    switch (arrayType) {
                        case 'VMAX':
                            var CreateArrayDeviceParamater = VMAX.GenerateCreateDeviceParamater(stepgroupname, item, volName, sgname, volumeItem.CapacityGB)

                            // 第一台存储作为主存储
                            CreateArrayDeviceParamater.position = (z == 0) ? 'primary' : 'second';
                            ActionParamaters.push(CreateArrayDeviceParamater);
                            break;

                        case 'Unity':
                            var capacityBYTE = volumeItem.CapacityGB * 1024 * 1024 * 1024;
                            var capacityBYTEUnity = capacityBYTE + 100 * 1024 * 1024;

                            var CreateArrayDeviceParamater = {
                                StepGroupName: stepgroupname,
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
                            var msg = `Not support array type [${arrayType}]`;
                            var code = 501;
                            ZBUTIL.exceptionProcess(zbc, paramaters, code, msg); 
                            return complete.error(code,msg); 
                    }
                    break;
                }
            }
        }

        complete.success(paramaters);
    })



    zbc.createWorker('VPLEX-REDiscovery-worker', "VPLEX-REDiscoveryPhysicalArray", (job, complete, worker) => {
        var paramaters = job.variables;

        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;
        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var arrayInfo = ResourceInfo.ArrayInfo;
        var ActionParamaters = VPLEXProviderParamater.ActionParamaters;
        var stepgroupname = inputParamaters.StepGroupName;
        worker.log(`${stepgroupname} : VPLEX-REDiscoveryPhysicalArray begin `)

        var paramater = {
            "StepGroupName": stepgroupname,
            "Step": "re-discovery physical array in vplex",
            "method": "ReDiscoverPhysicalArray",
            "arrayinfo": arrayInfo.info
        }
        ActionParamaters.push(paramater);
        complete.success(paramaters);
    })



    zbc.createWorker('VPLEX-ClaimPhysicalVolumes-worker', "VPLEX-ClaimPhysicalVolumes", (job, complete, worker) => {
        var paramaters = job.variables;

        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;
        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var arrayInfo = ResourceInfo.ArrayInfo;
        var ActionParamaters = VPLEXProviderParamater.ActionParamaters;
        var stepgroupname = inputParamaters.StepGroupName;
        worker.log(`${stepgroupname} : VPLEX-ClaimPhysicalVolumes begin `)

        var paramater = {
            "StepGroupName": stepgroupname,
            "Step": "claim physical volume in vplex",
            "method": "ClaimPhysicalVolume",
            "arrayinfo": arrayInfo.info
        }
        ActionParamaters.push(paramater);
        complete.success(paramaters);
    })


    zbc.createWorker('VPLEX-CreateExtent-worker', "VPLEX-CreateExtent", (job, complete, worker) => {
        var paramaters = job.variables;

        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;
        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var ResultResourceInfo = VPLEXProviderParamater.ResultResourceInfo;

        var arrayInfo = ResourceInfo.ArrayInfo;
        var ActionParamaters = VPLEXProviderParamater.ActionParamaters;
        var stepgroupname = inputParamaters.StepGroupName;
        worker.log(`${stepgroupname} : VPLEX-CreateExtent begin `)

        var VirtualVolumes = ResultResourceInfo.VirtualVolumes;
        var storageVolumes = [];
        for (var i in VirtualVolumes) {
            var item = VirtualVolumes[i];

            var PhysicalVolumes = item.PhysicalVolumes;
            for (var j in PhysicalVolumes) {
                var item = PhysicalVolumes[j];
                storageVolumes.push(item);
            }
        }

        var CreateExtentParamater = {
            "StepGroupName": stepgroupname,
            "Step": '创建Extent',
            "method": 'CreateExtent',
            "DependOnAction": "CreatePhysicalDevice",
            "arrayinfo": arrayInfo.info,
            "StorageVolumeName": storageVolumes.toString()
        }
        ActionParamaters.push(CreateExtentParamater);

        complete.success(paramaters);
    })


    zbc.createWorker('VPLEX-CreateLocalDevice-worker', "VPLEX-CreateLocalDevice", (job, complete, worker) => {
        var paramaters = job.variables;

        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;
        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var ResultResourceInfo = VPLEXProviderParamater.ResultResourceInfo;

        var arrayInfo = ResourceInfo.ArrayInfo;
        var ActionParamaters = VPLEXProviderParamater.ActionParamaters;
        var stepgroupname = inputParamaters.StepGroupName;
        worker.log(`${stepgroupname} : VPLEX-CreateLocalDevice begin `)

        var VirtualVolumes = ResultResourceInfo.VirtualVolumes;
        for (var i in VirtualVolumes) {
            var item = VirtualVolumes[i];

            for (var j in item.PhysicalVolumes) {
                var physicalVolumeName = item.PhysicalVolumes[j];
                var devicename = "device_" + physicalVolumeName;
                item.devices.push(devicename);

                item.DeviceName = item.devices[0];
                var createLocalDeviceParamater = {
                    StepGroupName: stepgroupname,
                    Step: '创建本地存储卷',
                    method: 'CreateLocalDevice',
                    DependOnAction: "CreateExtent",
                    devicename: devicename,    // Need matche "Device Naming Rule"
                    geometry: "raid-0",      // "raid-0",
                    //stripe-depth: Number,  // Default "1"
                    extents: "extent_" + physicalVolumeName + "_1", // extents list
                    arrayinfo: arrayInfo.info
                }
                ActionParamaters.push(createLocalDeviceParamater);

            }

        }
        complete.success(paramaters);
    })






    zbc.createWorker('VPLEX-CreateDistributDevice-worker', "VPLEX-CreateDistributDevice", (job, complete, worker) => {
        var paramaters = job.variables;

        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;
        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var ResultResourceInfo = VPLEXProviderParamater.ResultResourceInfo;

        var arrayInfo = ResourceInfo.ArrayInfo;
        var ActionParamaters = VPLEXProviderParamater.ActionParamaters;
        var stepgroupname = inputParamaters.StepGroupName;
        worker.log(`${stepgroupname} : VPLEX-CreateDistributDevice begin `)

        var appname = inputParamaters.ApplicationCode;

        var VirtualVolumes = ResultResourceInfo.VirtualVolumes;
        for (var i in VirtualVolumes) {
            var item = VirtualVolumes[i];

            var PhysicalVolumes = item.PhysicalVolumes;

            if (item.type == "distributed") {
                var PhysicalVolumes = item.PhysicalVolumes;

                var primaryArrayName = PhysicalVolumes[0].replace(appname + "_", "").split("_")[0];
                var secondArrayName = PhysicalVolumes[1].replace(appname + "_", "").split("_")[0];
                var volumeID = PhysicalVolumes[0].replace(appname + "_", "").split("_")[1];


                item.sourcedevice = item.devices[0];
                item.DeviceName = `dd_${appname}_${primaryArrayName}_${secondArrayName}_${volumeID}`;

                var CreateDistributedDeviceParamater = {
                    StepGroupName: stepgroupname,
                    Step: '创建分布式存储卷: ' + item.DeviceName,
                    method: 'CreateDistributedDevice',
                    DependOnAction: "CreateLocalDevice",
                    devicename: item.DeviceName,
                    devices: item.devices,
                    sourcedevice: item.sourcedevice,
                    arrayinfo: arrayInfo.info
                }
                ActionParamaters.push(CreateDistributedDeviceParamater);
            }

        }
        complete.success(paramaters);
    })




    zbc.createWorker('VPLEX-CreateVirtualVolume-worker', "VPLEX-CreateVirtualVolume", (job, complete, worker) => {
        var paramaters = job.variables;

        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;
        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var ResultResourceInfo = VPLEXProviderParamater.ResultResourceInfo;

        var arrayInfo = ResourceInfo.ArrayInfo;
        var ActionParamaters = VPLEXProviderParamater.ActionParamaters;
        var stepgroupname = inputParamaters.StepGroupName;
        worker.log(`${stepgroupname} : VPLEX-CreateVirtualVolume begin `)

        var VirtualVolumes = ResultResourceInfo.VirtualVolumes;

        for (var i in VirtualVolumes) {
            var item = VirtualVolumes[i];
            if (item.type == "distributed") {
                var CreateDistributedVirtualVolumeParamater = {
                    StepGroupName: stepgroupname,
                    Step: '创建分布式虚拟存储卷',
                    method: 'CreateDistributedVirtualVolume',
                    DependOnAction: "CreateDistributedDevice",
                    devicename: item.DeviceName,
                    arrayinfo: arrayInfo.info
                }
                ActionParamaters.push(CreateDistributedVirtualVolumeParamater);
            } else if (item.type == "localed") {
                var CreateVirtualVolumeParamater = {
                    StepGroupName: stepgroupname,
                    Step: '创建本地虚拟存储卷',
                    method: 'CreateVirtualVolume',
                    DependOnAction: "CreateLocalDevice",
                    devicename: item.DeviceName,
                    arrayinfo: arrayInfo.info
                }
                ActionParamaters.push(CreateVirtualVolumeParamater);


            }
            item.VirtualVolumeName = item.DeviceName + "_vol";

        }

        complete.success(paramaters);
    })



    zbc.createWorker('VPLEX-AssignStorageView-worker', "VPLEX-AssignStorageView", (job, complete, worker) => {
        var paramaters = job.variables;

        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;
        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var ResultResourceInfo = VPLEXProviderParamater.ResultResourceInfo;

        var arrayInfo = ResourceInfo.ArrayInfo;
        var ActionParamaters = VPLEXProviderParamater.ActionParamaters;
        var stepgroupname = inputParamaters.StepGroupName;
        worker.log(`${stepgroupname} : VPLEX-AssignStorageView begin `)

        var VirtualVolumes = ResultResourceInfo.VirtualVolumes;

        var vvols = {};
        for (var i in VirtualVolumes) {
            var item = VirtualVolumes[i];
            var VirtualVolumeName = item.VirtualVolumeName;
            var clusters = item.ClusterName.split(',');
            for (var j in clusters) {
                var clustername = clusters[j];
                if (vvols[clustername] === undefined) vvols[clustername] = [];
                vvols[clustername].push(VirtualVolumeName);
            }
        }

        var AssignStorageViews = inputParamaters.AssignStorageViews;
        for (var clustername in vvols) {
            for (var z in AssignStorageViews) {
                var assignSVItem = AssignStorageViews[z];

                var AssignStorageViewParamater = {
                    StepGroupName: stepgroupname,
                    Step: '分配虚拟化存储卷至存储视图（Storage View）:' + assignSVItem,
                    method: 'AssignStorageView',
                    DependOnAction: "CreateDistributedDevice",
                    clustername: clustername,
                    viewname: assignSVItem,
                    virtualvolumes: vvols[clustername],
                    arrayinfo: arrayInfo.info
                }
                ActionParamaters.push(AssignStorageViewParamater);

            }

        }

        complete.success(paramaters);
    })



    zbc.createWorker('VPLEX-AssignConsistencyGroup-worker', "VPLEX-AssignConsistencyGroup", (job, complete, worker) => {
        var paramaters = job.variables;

        var VPLEXProviderParamater = paramaters.subParamater;
        var inputParamaters = VPLEXProviderParamater.Paramaters;
        var ResourceInfo = VPLEXProviderParamater.ResourceInfo;
        var ResultResourceInfo = VPLEXProviderParamater.ResultResourceInfo;

        var arrayInfo = ResourceInfo.ArrayInfo;
        var ActionParamaters = VPLEXProviderParamater.ActionParamaters;
        var stepgroupname = inputParamaters.StepGroupName;
        worker.log(`${stepgroupname} : VPLEX-AssignConsistencyGroup begin `)


        var VirtualVolumes = ResultResourceInfo.VirtualVolumes;
        var RequestVirtualVolumes = inputParamaters.Volumes;

        for (var i in VirtualVolumes) {
            var VirtualVolumeName = VirtualVolumes[i].VirtualVolumeName;
            var ConsistencyGroup = RequestVirtualVolumes[i].ConsistencyGroup;

            for (var j in ConsistencyGroup) {
                var ConsistencyGroupName = ConsistencyGroup[j];
                var AssignConsistencyGroupParamater = {
                    StepGroupName: stepgroupname,
                    Step: '分配虚拟存储卷到一致性组(Consistency Group): ' + ConsistencyGroupName,
                    method: 'AssignConsistencyGroup',
                    DependOnAction: "CreateDistributedDevice",
                    virtual_volume: VirtualVolumeName,
                    consistency_group: ConsistencyGroupName,
                    arrayinfo: arrayInfo.info
                }
                ActionParamaters.push(AssignConsistencyGroupParamater);
            }

        }
        complete.success(paramaters);
    })

    // -----------------------------------------------------
    // AssignStorageView
    // -------------------------------------------------------

    //生产 Storage View in Cluster1
    zbc.createWorker('VPLEX-AssignStorageView-Prod-SC-worker', "VPLEX-AssignStorageView-Prod-SC", (job, complete, worker) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
        var request = AutoObject.request;
        var DistributedVirtauVolumes = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume;


        var stepgroupname = "Providing Product Volume";
        worker.log(`${stepgroupname} : VPLEX-AssignStorageView-Prod-SC begin `)


        var clusters = ['cluster-1'];
        var ViewName = VPLEX.GenerateStorateViewName(request, "prod");

        var vvols = [];
        for (var i in DistributedVirtauVolumes) {
            var item = DistributedVirtauVolumes[i];
            var DistributedVirtualVolumeName = item.DistributedVirtualVolumeName;
            vvols.push(DistributedVirtualVolumeName);
        }

        for (var i in clusters) {
            var clustername = clusters[i];
            var AssignStorageViewParamater = {
                StepGroupName: stepgroupname,
                Step: '分配虚拟化存储卷至存储视图（Storage View）:' + ViewName,
                method: 'AssignStorageView',
                DependOnAction: "CreateDistributedDevice",
                clustername: clustername,
                viewname: ViewName,
                virtualvolumes: vvols,
                arrayinfo: arrayInfo.info
            }
            ActionParamaters.push(AssignStorageViewParamater);
        }

        complete.success(AutoObject);
    })

    // 同城 Storage View in Cluster-2
    zbc.createWorker('VPLEX-AssignStorageView-Prod-TC-worker', "VPLEX-AssignStorageView-Prod-TC", (job, complete, worker) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
        var request = AutoObject.request;
        var DistributedVirtauVolumes = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume;


        var stepgroupname = "Providing Product Volume";
        worker.log(`${stepgroupname} : VPLEX-AssignStorageView-Prod-TC begin `)

        var clusters = ['cluster-2'];
        var ViewName = VPLEX.GenerateStorateViewName(request, "prod");

        var vvols = [];
        for (var i in DistributedVirtauVolumes) {
            var item = DistributedVirtauVolumes[i];
            var DistributedVirtualVolumeName = item.DistributedVirtualVolumeName;
            vvols.push(DistributedVirtualVolumeName);
        }

        for (var i in clusters) {
            var clustername = clusters[i];
            var AssignStorageViewParamater = {
                StepGroupName: stepgroupname,
                Step: '分配虚拟化存储卷至存储视图（Storage View）:' + ViewName,
                method: 'AssignStorageView',
                DependOnAction: "CreateDistributedDevice",
                clustername: clustername,
                viewname: ViewName,
                virtualvolumes: vvols,
                arrayinfo: arrayInfo.info
            }
            ActionParamaters.push(AssignStorageViewParamater);
        }

        complete.success(AutoObject);
    })




    zbc.createWorker('VPLEX-AssignStorageView-Backup-worker', "VPLEX-AssignStorageView-Backup", (job, complete, worker) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
        var request = AutoObject.request;
        var DistributedVirtauVolumes = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume;

        var stepgroupname = "Providing Product Volume";
        worker.log(`${stepgroupname} : VPLEX-AssignStorageView-Backup begin `)

        var clusters = ['cluster-1', 'cluster-2'];
        var ViewName_Backup = GenerateStorateViewName(request, "Backup");

        var vvols = [];
        for (var i in DistributedVirtauVolumes) {
            var item = DistributedVirtauVolumes[i];
            var DistributedVirtualVolumeName = item.DistributedVirtualVolumeName;
            vvols.push(DistributedVirtualVolumeName);
        }

        for (var i in clusters) {
            var clustername = clusters[i];
            var AssignStorageViewParamater = {
                StepGroupName: stepgroupname,
                Step: '分配虚拟化存储卷至存储视图（Storage View）:' + ViewName_Backup,
                method: 'AssignStorageView',
                DependOnAction: "CreateDistributedDevice",
                clustername: clustername,
                viewname: ViewName_Backup,
                virtualvolumes: vvols,
                arrayinfo: arrayInfo.info
            }
            ActionParamaters.push(AssignStorageViewParamater);
        }

        complete.success(AutoObject);
    })


}


