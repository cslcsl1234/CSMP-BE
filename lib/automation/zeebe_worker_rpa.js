const ZB = require('zeebe-node')
const UTIL = require('../util');
const ZBUTIL = require('./zeebe_util');
var configger = require('../../config/configger');
const RPA = require('../Automation_RPA');
var VMAX = require('../Automation_VMAX');
var UNITY = require('../Automation_UNITY');
const VPLEX = require('../Automation_VPLEX');
const async = require('async')
const logger = require("../../lib/logger")(__filename);

module.exports = {
    createProcessWorker
}


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
    const timeout = 600000;
    const zbc = await connect();

    zbc.createWorker('RPA-GetRPAConfiguration-worker', "RPA-GetRPAConfiguration", async (job, complete, worker) => {
        var AutoObject = job.variables;

        var arrayinfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var cdpname = arrayinfo.capability.CDP.name;
 
        var RPAInfo = RPA.GetRPAInfo(cdpname);
        if (RPAInfo == null) {
            var msg = `Not defined CDP Info in configure file [ StorageCapability.json ], CDP Name is [${cdpname}]`;
            var code = 501;
            await ZBUTIL.exceptionProcess(zbc, AutoObject, code, msg);

            worker.log(msg);
            return complete.error(501, msg);
        } else {
            ResourceInfo["CDP"] = RPAInfo;
        }


        ActionResult["RPAReplicateInfo"] = {
            "ClusterName": "",
            "ReplicationsetName": "",
            "CGName": "",
            "isCGExist": false,
            "ProdVolume": "",
            "LocalVolumeVPLEXDevice": [],
            "LocalVolume": "",
            "RemoteVolume": "",
            "ProdJournalVolume": "",
            "LocalJournalVolume": "",
            "RemoteJournalVolume": ""
        }


        return complete.success(AutoObject);

    }, timeout);




    zbc.createWorker('RPA-GetConsistencyGroups-worker', "RPA-GetConsistencyGroups", async (job, complete, worker) => {
        var AutoObject = job.variables;

        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
        var RPAInfo = ResourceInfo.CDP.info;
        RPA.GetConsistencyGroups(RPAInfo, function (result) {
            ResourceInfo.CDP["ConsistencyGroups"] = result;
            return complete.success(AutoObject);
        });

    }, timeout);




    zbc.createWorker('RPA-MappingProdVolume-worker', "RPA-MappingProdVolume", async (job, complete, worker) => {
        var AutoObject = job.variables;


        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var subProcessResult = AutoObject.subProcessResult;


        var cdpinfo = ResourceInfo.CDP;
        var prodCDPInfo = cdpinfo["backend_array"].Prod;
        var sgname = prodCDPInfo.sgname;
        var clustername = prodCDPInfo.clustername;

        var stepgroupname = "Providing RPA replicate Prod volume";

        var isfind = false;
        var ProdVolumes = subProcessResult.ProdVolumeByVPLEX.ResultResourceInfo.VirtualVolumes;
        var arrayinfo = subProcessResult.ProdVolumeByVPLEX.ResourceInfo.ArrayInfo;

        var VirtualVolumes = [];
        for (var i in ProdVolumes) {
            var item = ProdVolumes[i];
            VirtualVolumes.push(item.VirtualVolumeName);
        }

        var newItem = {
            "StepGroupName": stepgroupname,
            "Step": `分配虚拟化存储卷至存储视图（Storage View）: ${sgname}`,
            "method": "AssignStorageView",
            "DependOnAction": "CreateDistributedDevice",
            "clustername": clustername,
            "viewname": sgname,
            "virtualvolumes": VirtualVolumes,
            "arrayinfo": arrayinfo.info
        }

        ActionParamaters.push(newItem);
        ActionResult.RPAReplicateInfo.ProdVolume = VirtualVolumes;

        return complete.success(AutoObject);

    }, timeout);



    /**
     * RPA Local replicate operate
     */
    zbc.createWorker('RPA-Local-InitPRAInformation-worker', "RPA-Local-InitPRAInformation", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
        // if backend array is vplex, then query those vplex array's storage view
        var sitetype = ["Prod", "Local", "Remote"]

        async.mapSeries(sitetype, function (sitetypeItem, maincallback) {
            var arrayInfo = ResourceInfo.CDP["backend_array"][sitetypeItem];

            if (arrayInfo.arraytype != "VPLEX") {
                worker.log(`backend array type is ${arrayInfo.arraytype}, Do nothing.`);
                maincallback(null, {});  // Do only arraytype is vplex.
            } else {
                var arrayname = arrayInfo.arrayname;

                if (ResourceInfo.Array.VPLEX[arrayname] === undefined) {
                    worker.log(`ResourceInfo.Array.VPLEX[${arrayname}] === undefined, Begin get information.`);
                    var clusters = ['cluster-1', 'cluster-2']
                    async.mapSeries(clusters, function (clustername, callback) {
                        //worker.log(sitetypeItem + ',' + clustername);
                        VPLEX.GetStorageViews(arrayInfo.info, clustername, function (result) {
                            var res = { "clustername": clustername, "viewname": result.response }
                            //worker.log(res);
                            callback(null, res);

                        })
                    }, function (err, result) {
                        if (err) {
                            logger.error(err);
                        };

                        var finalResult = {};
                        for (var i in result) {
                            var item = result[i];
                            finalResult[item.clustername] = item.viewname;
                        }
                        ResourceInfo.Array.VPLEX[arrayname] = { "StorageView": finalResult };
                        maincallback(null, finalResult)
                    });

                } else {
                    worker.log(`ResourceInfo.Array.VPLEX[${arrayname}] !== undefined, Do nothing.`);
                    maincallback(null, {});
                }
            }


        }, function (err, result) {
            if (err) {
                logger.error(err);
            };

            //worker.log(JSON.stringify(ResourceInfo.Array, 2, 2))

            return complete.success(AutoObject);
        })

    }, timeout);




    zbc.createWorker('RPA-Local-Pre-VPLEX-Provider-Service-worker', "RPA-Local-Pre-VPLEX-Provider-Service", (job, complete, worker) => {

        var paramaters = job.variables;

        var request = paramaters.request;
        var AutoInfo = paramaters.AutoInfo;


        var request = paramaters.request;
        var timestamp = request.timestamp;
        var cdpinfo = AutoInfo.ResourceInfo["CDP"];
        var LocalCDPInfo = cdpinfo["backend_array"].Local;

        var Volumes = [];
        var LocalConsistencyGroup = LocalCDPInfo.consistencygroup;
        var VirtualVolumes = [];
        for (var i = 0; i < request.count; i++) {
            var volumeItem = {
                "UsedFor": request.usedfor,
                "CapacityGB": request.capacity,
                "type": "localed",
                "ClusterName": LocalCDPInfo.clustername,
                "ConsistencyGroup": [LocalConsistencyGroup],
                "PhysicalVolumeNames": []
            }

            if (request.count < 10) var volno = '0' + i;
            else volno = i;

            if (LocalCDPInfo["backend_array"].length == 1) {
                var arrayinfo = LocalCDPInfo["backend_array"][0];
                if (arrayinfo.array_type == 'VMAX') {
                    var volName = VMAX.GenerateVolName(arrayinfo, request, timestamp) + volno;
                } else if (arrayinfo.array_type == 'Unity') {
                    var volName = UNITY.GenerateVolName(arrayinfo, request, timestamp) + volno;
                }
                volName = volName + "_local";

                volumeItem.PhysicalVolumeNames.push(volName);


            } else {
                var msg = "Not support mutil backend array for CDP Local Protect."
                var code = 501;
                worker.log(msg);

                return complete.error(code, msg);
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

        var AssignStorageViews = [{ cluster: LocalCDPInfo.clustername, viewname: LocalCDPInfo.sgname } ]
        paramaters["subParamater"] = {
            "Paramaters": {
                "ApplicationCode": request.appname,
                "StepGroupName": "Providing RPA Local Volume using VPLEX",
                "Volumes": Volumes,
                "AssignStorageViews": AssignStorageViews,
                "timestamp": request.timestamp
            },
            "ResourceInfo": {
                "ArrayInfo": LocalCDPInfo,
                "StorageView": {},
                "ConsistencyGroup": []
            },
            "ResultResourceInfo": {
                "VirtualVolumes": VirtualVolumes
            },
            "ActionParamaters": []
        }
        return complete.success(paramaters);
    })



    zbc.createWorker('RPA-Local-Post-VPLEX-Provider-Service-worker', "RPA-Local-Post-VPLEX-Provider-Service", (job, complete, worker) => {

        var paramaters = job.variables;
        var ActionResult = paramaters.AutoInfo.ActionResult;

        var ActionParamaters = paramaters.AutoInfo.ActionParamaters;

        var VPLEXProviderParamater = paramaters.subParamater;
        var SubActionParamaters = VPLEXProviderParamater.ActionParamaters;

        for (var i in SubActionParamaters) {
            var item = SubActionParamaters[i];
            ActionParamaters.push(item);
        }

        var volumes = [];
        for (var i in VPLEXProviderParamater.ResultResourceInfo.VirtualVolumes) {
            var item = VPLEXProviderParamater.ResultResourceInfo.VirtualVolumes[i];
            volumes.push(item.VirtualVolumeName);
        }
        ActionResult.RPAReplicateInfo.LocalVolume = volumes;

        paramaters.subProcessResult["LocalVolumeByVPLEX"] = paramaters.subParamater;
        paramaters.subParamater = {};
        return complete.success(paramaters);
    })





    zbc.createWorker('RPA-Remote-Pre-VPLEX-Provider-Service-worker', "RPA-Remote-Pre-VPLEX-Provider-Service", (job, complete, worker) => {

        var paramaters = job.variables;

        var request = paramaters.request;
        var AutoInfo = paramaters.AutoInfo;


        var request = paramaters.request;
        var timestamp = request.timestamp;
        var cdpinfo = AutoInfo.ResourceInfo["CDP"];
        var RemoteCDPInfo = cdpinfo["backend_array"].Remote;

        var Volumes = [];
        var RemoteConsistencyGroup = RemoteCDPInfo.consistencygroup;
        var VirtualVolumes = [];
        for (var i = 0; i < request.count; i++) {
            var volumeItem = {
                "UsedFor": request.usedfor,
                "CapacityGB": request.capacity,
                "type": "localed",
                "ClusterName": RemoteCDPInfo.clustername,
                "ConsistencyGroup": [RemoteConsistencyGroup],
                "PhysicalVolumeNames": []
            }

            if (request.count < 10) var volno = '0' + i;
            else volno = i;

            if (RemoteCDPInfo["backend_array"].length == 1) {
                var arrayinfo = RemoteCDPInfo["backend_array"][0];
                if (arrayinfo.array_type == 'VMAX') {
                    var volName = VMAX.GenerateVolName(arrayinfo, request, timestamp) + volno;
                } else if (arrayinfo.array_type == 'Unity') {
                    var volName = UNITY.GenerateVolName(arrayinfo, request, timestamp) + volno;
                }
                volName = volName + "_remote";

                volumeItem.PhysicalVolumeNames.push(volName);


            } else {
                var msg = "Not support mutil backend array for CDP Local Protect."
                var code = 501;
                worker.log(msg);

                return complete.error(code, msg);
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

 
        var AssignStorageViews = [ { cluster: RemoteCDPInfo.clustername, viewname: RemoteCDPInfo.sgname } ];
        paramaters["subParamater"] = {
            "Paramaters": {
                "ApplicationCode": request.appname,
                "StepGroupName": "Providing RPA Remote Volume using VPLEX",
                "Volumes": Volumes,
                "AssignStorageViews": AssignStorageViews,
                "timestamp": request.timestamp
            },
            "ResourceInfo": {
                "ArrayInfo": RemoteCDPInfo,
                "StorageView": {},
                "ConsistencyGroup": []
            },
            "ResultResourceInfo": {
                "VirtualVolumes": VirtualVolumes
            },
            "ActionParamaters": []
        }
        return complete.success(paramaters);
    })




    zbc.createWorker('RPA-Remote-Post-VPLEX-Provider-Service-worker', "RPA-Remote-Post-VPLEX-Provider-Service", (job, complete, worker) => {

        var paramaters = job.variables;
        var ActionResult = paramaters.AutoInfo.ActionResult;

        var ActionParamaters = paramaters.AutoInfo.ActionParamaters;

        var VPLEXProviderParamater = paramaters.subParamater;
        var SubActionParamaters = VPLEXProviderParamater.ActionParamaters;

        for (var i in SubActionParamaters) {
            var item = SubActionParamaters[i];
            ActionParamaters.push(item);
        }

        var volumes = [];
        for (var i in VPLEXProviderParamater.ResultResourceInfo.VirtualVolumes) {
            var item = VPLEXProviderParamater.ResultResourceInfo.VirtualVolumes[i];
            volumes.push(item.VirtualVolumeName);
        }
        ActionResult.RPAReplicateInfo.RemoteVolume = volumes;

        paramaters.subProcessResult["RemoteVolumeByVPLEX"] = paramaters.subParamater;
        paramaters.subParamater = {};
        return complete.success(paramaters);
    })




    zbc.createWorker('vplex-rpa-loacl-create-physical-volume-worker', "vplex-rpa-loacl-create-physical-volume", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;

        var request = AutoObject.request;
        var timestamp = request.timestamp;
        var cdpinfo = AutoObject.AutoInfo.ResourceInfo["CDP"];
        var LocalCDPInfo = cdpinfo["backend_array"].Local;


        var stepgroupname = "Providing RPA replicate local volume";

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
                    "DependOnAction": "N/A",
                    "AsignSGName": arrayinfo.sgname,
                    "StorageVolumeName": volName,
                    "capacityByte": capacityBYTE,
                    "arrayinfo": arrayinfo
                }
                ActionParamaters.push(CreateArrayDeviceParamater);
                ActionResult.RPAReplicateInfo.LocalVolumeVPLEXDevice.push(volName);


            } else {
                var msg = "Not support mutil backend array for CDP Local Protect."
                var code = 501;
                worker.log(msg);
                await ZBUTIL.exceptionProcess(zbc, AutoObject, code, msg);
                return complete.error(code, msg);
            }

        }
        return complete.success(AutoObject);

    }, timeout);

    zbc.createWorker('vplex-rpa-loacl-rediscovery-physical-array-worker', "vplex-rpa-loacl-rediscovery-physical-array", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var cdpinfo = AutoObject.AutoInfo.ResourceInfo["CDP"];
        var LocalCDPInfo = cdpinfo["backend_array"].Local;

        var stepgroupname = "Providing RPA replicate local volume";

        var vplexinfo = LocalCDPInfo.info;
        var paramater = {
            "StepGroupName": stepgroupname,
            "Step": "RPA-Local: re-discovery physical array in vplex",
            "method": "ReDiscoverPhysicalArray",
            "arrayinfo": vplexinfo
        }
        ActionParamaters.push(paramater);
        complete.success(AutoObject);
    })

    zbc.createWorker('vplex-rpa-loacl-claim-physical-device-worker', "vplex-rpa-loacl-claim-physical-device", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var cdpinfo = AutoObject.AutoInfo.ResourceInfo["CDP"];
        var LocalCDPInfo = cdpinfo["backend_array"].Local;

        var stepgroupname = "Providing RPA replicate local volume";

        var vplexinfo = LocalCDPInfo.info;

        var paramater = {
            "StepGroupName": stepgroupname,
            "Step": "RPA-Local: claim physical in vplex",
            "method": "ClaimPhysicalVolume",
            "arrayinfo": vplexinfo
        }
        ActionParamaters.push(paramater);
        complete.success(AutoObject);
    })

    zbc.createWorker('vplex-rpa-loacl-create-extent-worker', "vplex-rpa-loacl-create-extent", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var cdpinfo = AutoObject.AutoInfo.ResourceInfo["CDP"];
        var LocalCDPInfo = cdpinfo["backend_array"].Local;

        var ActionResult = AutoObject.AutoInfo.ActionResult;

        var stepgroupname = "Providing RPA replicate local volume";

        var vplexinfo = LocalCDPInfo.info;
        var CreateExtentParamater = {
            "StepGroupName": stepgroupname,
            "Step": 'RPA-Local: 创建Extent',
            "method": 'CreateExtent',
            "DependOnAction": "CreatePhysicalDevice",
            "arrayinfo": vplexinfo,
            "StorageVolumeName": ActionResult.RPAReplicateInfo.LocalVolumeVPLEXDevice.toString()
        }
        ActionParamaters.push(CreateExtentParamater);
        complete.success(AutoObject);
    })

    zbc.createWorker('vplex-rpa-loacl-create-device-worker', "vplex-rpa-loacl-create-device", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var cdpinfo = AutoObject.AutoInfo.ResourceInfo["CDP"];
        var LocalCDPInfo = cdpinfo["backend_array"].Local;

        var ActionResult = AutoObject.AutoInfo.ActionResult;

        var stepgroupname = "Providing RPA replicate local volume";

        var vplexinfo = LocalCDPInfo.info;

        for (var i in ActionResult.RPAReplicateInfo.LocalVolumeVPLEXDevice) {
            var volname = ActionResult.RPAReplicateInfo.LocalVolumeVPLEXDevice[i];

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
        }
        complete.success(AutoObject);
    })


    zbc.createWorker('vplex-rpa-loacl-create-virtual-volume-worker', "vplex-rpa-loacl-create-virtual-volume", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var cdpinfo = AutoObject.AutoInfo.ResourceInfo["CDP"];
        var LocalCDPInfo = cdpinfo["backend_array"].Local;

        var ActionResult = AutoObject.AutoInfo.ActionResult;

        var stepgroupname = "Providing RPA replicate local volume";

        var vplexinfo = LocalCDPInfo.info;

        var VirtualVolumes = [];
        for (var i in ActionResult.RPAReplicateInfo.LocalVolumeVPLEXDevice) {
            var volname = ActionResult.RPAReplicateInfo.LocalVolumeVPLEXDevice[i];

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
        //ActionResult.RPAProvisedVolumes.Local = VirtualVolumes;
        ActionResult.RPAReplicateInfo.LocalVolume = VirtualVolumes;

        complete.success(AutoObject);
    })


    zbc.createWorker('vplex-rpa-loacl-assign-consistency-group-worker', "vplex-rpa-loacl-assign-consistency-group", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var cdpinfo = AutoObject.AutoInfo.ResourceInfo["CDP"];
        var LocalCDPInfo = cdpinfo["backend_array"].Local;

        var ActionResult = AutoObject.AutoInfo.ActionResult;

        var stepgroupname = "Providing RPA replicate local volume";

        var vplexinfo = LocalCDPInfo.info;

        var CDPConsistencyGroupName = LocalCDPInfo.consistencygroup;
        var AssignConsistencyGroupParamater = {
            "StepGroupName": stepgroupname,
            Step: 'RPA-Local: 分配虚拟存储卷到一致性组(Consistency Group): ' + CDPConsistencyGroupName,
            method: 'AssignConsistencyGroup',
            DependOnAction: "CreateVirtualVolume",
            virtual_volume: ActionResult.RPAReplicateInfo.LocalVolume,
            consistency_group: CDPConsistencyGroupName,
            arrayinfo: vplexinfo
        }
        ActionParamaters.push(AssignConsistencyGroupParamater);

        complete.success(AutoObject);
    })


    zbc.createWorker('vplex-rpa-loacl-assign-storage-view-worker', "vplex-rpa-loacl-assign-storage-view", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;

        var LocalCDPInfo = ResourceInfo.CDP["backend_array"].Local;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var stepgroupname = "Providing RPA replicate local volume";

        var vplexinfo = LocalCDPInfo.info;

        // Assign virtual volume to storage view
        var RPStorageView = LocalCDPInfo.sgname;

        var arrayname = LocalCDPInfo.arrayname;
        //var storageviews = ActionResult.StorageView;
        //worker.log(JSON.stringify(ResourceInfo.Array, 2, 2))
        var storageviews = ResourceInfo.Array.VPLEX[arrayname].StorageView;

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
                        virtualvolumes: ActionResult.RPAReplicateInfo.LocalVolume.toString(),
                        arrayinfo: vplexinfo
                    }
                    ActionParamaters.push(AssignStorageViewParamater);
                }
            })
        }

        if (isfind == false) {
            var msg = `Not found storageview [${RPStorageView}] in VPLEX`
            var code = 501;
            worker.log(msg);
            await ZBUTIL.exceptionProcess(zbc, AutoObject, code, msg);
            return complete.error(code, msg);
        } else
            complete.success(AutoObject);


    })


    /**
     * RPA Remote replicate operate
     */
    zbc.createWorker('RPA-Remote-InitPRAInformation-worker', "RPA-Remote-InitPRAInformation", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var RuleResults = AutoObject.AutoInfo.RuleResults;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;

        //logger.info(JSON.stringify(AutoObject, 2, 2));
        return complete.success(AutoObject);

    }, timeout);


    zbc.createWorker('vplex-rpa-local-unity-create-physical-volume-worker', "vplex-rpa-local-unity-create-physical-volume", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var request = AutoObject.request;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;

        var localCDPInfo = ResourceInfo.CDP["backend_array"].Local;
        var timestamp = request.timestamp;

        var stepgroupname = "Providing RPA replicate local volume";
        var volumes = [];
        for (var j = 1; j <= request.count; j++) {
            if (request.count < 10) var volno = '0' + j;
            else volno = j;

            var arrayinfo = localCDPInfo.info;
            var arraysn = arrayinfo.unity_sn;
            var capacityBYTE = (request.capacity * 1024 * 1024 * 1024) + 100 * 1024 * 1024;
            var volName = UNITY.GenerateVolName(arrayinfo, request, timestamp) + volno;
            volName = volName + "_local";


            var CreateArrayDeviceParamater = {
                "StepGroupName": stepgroupname,
                "Step": `Create device and assign to sg [${localCDPInfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ]`,
                "method": "CreatePhysicalDevice",
                "DependOnAction": "N/A",
                "AsignSGName": localCDPInfo.sgname,
                "StorageVolumeName": volName,
                "capacityByte": capacityBYTE,
                "arrayinfo": arrayinfo
            }
            ActionParamaters.push(CreateArrayDeviceParamater);
            volumes.push(volName);


        }

        //ActionResult.RPAProvisedVolumes.Remote = volumes;
        ActionResult.RPAReplicateInfo.LocalVolume = volumes;

        return complete.success(AutoObject);

    }, timeout);


    zbc.createWorker('vplex-rpa-local-vmax-create-physical-volume-worker', "vplex-rpa-local-vmax-create-physical-volume", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var request = AutoObject.request;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;

        var localCDPInfo = ResourceInfo.CDP["backend_array"].Local;
        var timestamp = request.timestamp;

        var stepgroupname = "Providing RPA replicate local volume";
        var volumes = [];
        for (var j = 1; j <= request.count; j++) {
            if (request.count < 10) var volno = '0' + j;
            else volno = j;

            var arrayinfo = localCDPInfo.info;
            var arraysn = arrayinfo.serial_no;
            var capacityBYTE = (request.capacity * 1024 * 1024 * 1024);
            var volName = VMAX.GenerateVolName(arrayinfo, request, timestamp) + volno;
            volName = volName + "_local";


            var CreateArrayDeviceParamater = {
                "StepGroupName": stepgroupname,
                "Step": `Create device and assign to sg [${localCDPInfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ]`,
                "method": "CreatePhysicalDevice",
                "DependOnAction": "N/A",
                "AsignSGName": localCDPInfo.sgname,
                "StorageVolumeName": volName,
                "capacityByte": capacityBYTE,
                "arrayinfo": arrayinfo
            }
            ActionParamaters.push(CreateArrayDeviceParamater);
            volumes.push(volName);


        }

        //ActionResult.RPAProvisedVolumes.Remote = volumes;
        ActionResult.RPAReplicateInfo.LocalVolume = volumes;

        return complete.success(AutoObject);

    }, timeout);



    zbc.createWorker('vplex-rpa-remote-unity-create-physical-volume-worker', "vplex-rpa-remote-unity-create-physical-volume", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var request = AutoObject.request;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;

        var remoteCDPInfo = ResourceInfo.CDP["backend_array"].Remote;
        var timestamp = request.timestamp;

        var stepgroupname = "Providing RPA replicate remote volume";
        var volumes = [];
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
                "DependOnAction": "N/A",
                "AsignSGName": remoteCDPInfo.sgname,
                "StorageVolumeName": volName,
                "capacityByte": capacityBYTE,
                "arrayinfo": arrayinfo
            }
            ActionParamaters.push(CreateArrayDeviceParamater);
            volumes.push(volName);


        }

        //ActionResult.RPAProvisedVolumes.Remote = volumes;
        ActionResult.RPAReplicateInfo.RemoteVolume = volumes;

        return complete.success(AutoObject);

    }, timeout);



    zbc.createWorker('vplex-rpa-remote-vmax-create-physical-volume-worker', "vplex-rpa-remote-vmax-create-physical-volume", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var request = AutoObject.request;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;

        var remoteCDPInfo = ResourceInfo.CDP["backend_array"].Remote;
        var timestamp = request.timestamp;

        var stepgroupname = "Providing RPA replicate remote volume";
        var volumes = [];
        for (var j = 1; j <= request.count; j++) {
            if (request.count < 10) var volno = '0' + j;
            else volno = j;

            var arrayinfo = remoteCDPInfo.info;
            var arraysn = arrayinfo.serial_no;
            var capacityBYTE = (request.capacity * 1024 * 1024 * 1024);
            var volName = VMAX.GenerateVolName(arrayinfo, request, timestamp) + volno;
            volName = volName + "_remote";


            var CreateArrayDeviceParamater = {
                "StepGroupName": stepgroupname,
                "Step": `RPA-Remote: Create device and assign to sg [${remoteCDPInfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ]`,
                "method": "CreatePhysicalDevice",
                "DependOnAction": "N/A",
                "AsignSGName": remoteCDPInfo.sgname,
                "StorageVolumeName": volName,
                "capacityByte": capacityBYTE,
                "arrayinfo": arrayinfo
            }
            ActionParamaters.push(CreateArrayDeviceParamater);
            volumes.push(volName);


        }

        //ActionResult.RPAProvisedVolumes.Remote = volumes;
        ActionResult.RPAReplicateInfo.RemoteVolume = volumes;

        return complete.success(AutoObject);

    }, timeout);

    /**
     * RPA replicate configuration operate
     */
    zbc.createWorker('RPA-Configure-InitPRAInformation-worker', "RPA-Configure-InitPRAInformation", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var request = AutoObject.request;

        var RPA_CG = ResourceInfo.CDP.ConsistencyGroups;

        var ReplicationsetName ;
        for (var i in ActionResult.RPAReplicateInfo.ProdVolume) {
            var prodVolname = ActionResult.RPAReplicateInfo.ProdVolume[i];
            prodVolname = prodVolname.replace("_vol", "");

            if ( ReplicationsetName === undefined ) 
                ReplicationsetName = "rs_" + prodVolname.split('_').slice(-1)[0];
            else 
                ReplicationsetName += ',' + "rs_" + prodVolname.split('_').slice(-1)[0];

            // for TEST at 20200103 at ShandongCity Bank , Test CG name = Test_CG
            var CGName = request.appname + "_CG";
            worker.log(`prodVolname=[${prodVolname}], ReplicationsetName=[${ReplicationsetName}], CGName=[${CGName}]`)
        }

        var isfind = false;
        for (var i in RPA_CG) {
            var item = RPA_CG[i];
            if (item.name == CGName) {
                isfind = true;
                break;
            }
        }

        ActionResult.RPAReplicateInfo.ClusterName = ResourceInfo.CDP.info.cluster1;
        ActionResult.RPAReplicateInfo.ReplicationsetName = ReplicationsetName;
        ActionResult.RPAReplicateInfo.CGName = CGName;
        ActionResult.RPAReplicateInfo.isCGExist = isfind;

        return complete.success(AutoObject);

    }, timeout);


    zbc.createWorker('RPA-Configure-create-replicate-set-worker', "RPA-Configure-create-replicate-set", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;

        var ReplicationsetName = ActionResult.RPAReplicateInfo.ReplicationsetName;
        var CGName = ActionResult.RPAReplicateInfo.CGName;
        var prodVolname = ActionResult.RPAReplicateInfo.ProdVolume;
        var localVolname = ActionResult.RPAReplicateInfo.LocalVolume;
        var RemoteVolname = ActionResult.RPAReplicateInfo.RemoteVolume;
        var RPAInfo = ResourceInfo.CDP.info;

        var ReplicationsetNames = ReplicationsetName.split(','); 

        for ( var i in ReplicationsetNames) {
            var ReplicationsetNameItem = ReplicationsetNames[i];
            var prodVolnameItem = prodVolname[i];
            var localVolnameItem = localVolname[i];
            var RemoteVolnameItem = RemoteVolname[i];

            var createReplicationSetParamater = {
                "StepGroupName": "RPA Replicate Configuration",
                "Step": "RPA-Local: 在RPA中创建Replication Set: " + ReplicationsetNameItem,
                "method": "RAPCreateReplicationSet",
                "DependOnAction": "CreateDistributedDevice",
                "CGName": CGName,
                "ReplicationsetName": ReplicationsetNameItem,
                "prod": prodVolnameItem,
                "local": localVolnameItem,
                "remote": RemoteVolnameItem,
                "arrayinfo": RPAInfo
            }
            ActionParamaters.push(createReplicationSetParamater);

        } 
        return complete.success(AutoObject);

    }, timeout);



    zbc.createWorker('RPA-Configure-create-jounery-volumes-worker', "RPA-Configure-create-jounery-volumes", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var timestamp = AutoObject.request.timestamp;

        var journalBackendArray = ResourceInfo.CDP["journal_backend_array"];

        var CGName = ActionResult.RPAReplicateInfo.CGName;

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
                    // 如果RPA的Journal Volume是从VPLEX分配出来，则指定该卷是从哪个cluster中映射到RPA中
                    var clustername = arrayinfo.clustername;
                    var sgname = arrayinfo.sgname;
                    var cgname = arrayinfo.consistencygroup;
                    var result = VPLEX.CreateVirtualVolumeService(stepgroupname, arrayinfo.info, backend_array, volName, JournalCapacityGB, clustername, sgname, cgname);
                    for (var z in result) {
                        var item = result[z];
                        ActionParamaters.push(item);
                    }

                    volName = "device_" + volName + "_vol";

                    break;
                case 'VMAX':
                case 'Unity':
                    var arraysn = (arrayinfo.array_type == "VMAX") ? arrayinfo.serial_no : arrayinfo.unity_sn;

                    var CreateArrayDeviceParamater = {
                        "StepGroupName": stepgroupname,
                        "Step": `Create device and assign to sg [${arrayinfo.sgname}] in pyhsical array [ ${arraysn} ], arraytype= [ ${arrayinfo.array_type} ] for RPA ${journaltype} Journal volume.`,
                        "method": "CreatePhysicalDevice",
                        "DependOnAction": "N/A",
                        "AsignSGName": arrayinfo.sgname,
                        "StorageVolumeName": volName,
                        "capacityByte": capacityBYTE,
                        "arrayinfo": arrayinfo
                    }
                    ActionParamaters.push(CreateArrayDeviceParamater);

                    break;
                default:

                    break;
            }
            ActionResult["RPAReplicateInfo"][`${journaltype}JournalVolume`] = volName;

        }

        return complete.success(AutoObject);

    }, timeout);




    zbc.createWorker('RPA-Configure-create-consistency-group-worker', "RPA-Configure-create-consistency-group", async (job, complete, worker) => {
        var AutoObject = job.variables;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var RPAInfo = ResourceInfo.CDP.info;

        var RPAReqplicateInfo = ActionResult.RPAReplicateInfo;

        var createCGParamater = {
            "StepGroupName": "RPA Replicate Configuration",
            "Step": "RPA-Local: 在RPA中创建Consistency Group: " + RPAReqplicateInfo.CGName,
            "method": "RAPCreateConsistencyGroup",
            "DependOnAction": "CreateDistributedDevice",
            "ClusterName": RPAReqplicateInfo.ClusterName,
            "CGName": RPAReqplicateInfo.CGName,
            "ProdJournalVolume": RPAReqplicateInfo.ProdJournalVolume,
            "LocalJournalVolume": RPAReqplicateInfo.LocalJournalVolume,
            "RemoteJournalVolume": RPAReqplicateInfo.RemoteJournalVolume,
            "arrayinfo": RPAInfo
        }
        ActionParamaters.push(createCGParamater);
        return complete.success(AutoObject);

    }, timeout);


}


