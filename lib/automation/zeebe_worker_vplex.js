const ZB = require('zeebe-node')
const async = require('async');
var configger = require('../../config/configger');
const VPLEX = require('../Automation_VPLEX');


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
    const zbc = await connect();


    zbc.createWorker('VPLEX-Initial-Configure-Info-worker', "VPLEX-Initial-Configure-Info", (job, complete, worker) => {
        var AutoObject = job.variables;
        var ResourceInfo = AutoObject.AutoInfo.ResourceInfo;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;

        // Initial ActionResoult struct about VPLEX prod source
        /**
         * DistributedVirtauVolumeItem : {
                    "PhysicalVolumes" : [],
                    "sourcedevice": "",
                    "devices": [],
                    "ddDeviceName": "",
                    "DistributedVirtualVolumeName" :""
                }
         */
        ActionResult["VPlexInfo"] = {
            "ProdVolumeResourceInfo": {
                "DistributedVirtauVolume": []
            }
        }


        //
        // Get VPLEX Storage View List
        // 
        var clusters = ['cluster-1', 'cluster-2']
        async.mapSeries(clusters, function (clustername, callback) {
            VPLEX.GetStorageViews(arrayInfo.info, clustername, function (result) {
                var res = { "clustername": clustername, "viewname": result.response }
                //worker.log(res);
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

            ResourceInfo.Array.VPLEX[arrayInfo.arrayname] = { "StorageView": finalResult };


            //worker.log(finalResult);
            complete.success(AutoObject);

        });

    });


    zbc.createWorker('VPLEX-CreatePhysicalVolume-worker', "VPLEX-CreatePhysicalVolume", (job, complete) => {
        var AutoObject = job.variables;

        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;

        var stepgroupname = "Providing Product Volume";
        var request = AutoObject.request;
        var timestamp = request.timestamp;

        VPLEX.GenerateCreatePhysicalVolumeParamater(stepgroupname, arrayInfo, request, timestamp, function (code, result) {

            var item = {
                "PhysicalVolumes": [],
                "sourcedevice": "",
                "devices": [],
                "ddDeviceName": "",
                "DistributedVirtualVolumeName": ""
            }

            for (var i in result) {
                var resultItem = {};
                resultItem["physicalVolumeName"] = result[i].StorageVolumeName;
                resultItem["position"] = result[i].position;
                resultItem["arrayinfo"] = result[i].arrayinfo;
                resultItem["response"] = result[i].response;


                ActionParamaters.push(result[i])
                item.PhysicalVolumes.push(resultItem);

            }
            ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume.push(item);


            //console.log(`====VPLEX-CreatePhysicalVolume-worker======\n${JSON.stringify(AutoObject, null, 2)}`);

            complete.success(AutoObject);
        })


    });


    zbc.createWorker('VPLEX-REDiscovery-worker', "VPLEX-REDiscoveryPhysicalArray", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;


        var stepgroupname = "Providing Product Volume";
        var paramater = {
            "StepGroupName": stepgroupname,
            "Step": "re-discovery physical array in vplex",
            "method": "ReDiscoverPhysicalArray",
            "arrayinfo": arrayInfo.info
        }
        ActionParamaters.push(paramater);
        complete.success(AutoObject);
    })


    
    zbc.createWorker('VPLEX-ClaimPhysicalVolumes-worker', "VPLEX-ClaimPhysicalVolumes", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters; 
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;

        var stepgroupname = "Providing Product Volume";
        var paramater = {
            "StepGroupName": stepgroupname,
            "Step": "claim physical volume in vplex",
            "method": "ClaimPhysicalVolume",
            "arrayinfo": arrayInfo.info
        }
        ActionParamaters.push(paramater); 
        complete.success(AutoObject);
    })


    zbc.createWorker('VPLEX-CreateExtent-worker', "VPLEX-CreateExtent", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;

        for (var i in ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume) {
            var item = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume[i];

            var PhysicalVolumes = item.PhysicalVolumes;

            var stepgroupname = "Providing Product Volume";

            var storageVolumes = [];
            for (var i in PhysicalVolumes) {
                var item = PhysicalVolumes[i];
                storageVolumes.push(item.physicalVolumeName);
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
        }

        complete.success(AutoObject);
    })





    zbc.createWorker('VPLEX-CreateLocalDevice-worker', "VPLEX-CreateLocalDevice", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;

        for (var i in ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume) {
            var DistributedVirtauVolumeItem = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume[i];

            var PhysicalVolumes = DistributedVirtauVolumeItem.PhysicalVolumes;
            var stepgroupname = "Providing Product Volume";

            for (var i in PhysicalVolumes) {
                var item = PhysicalVolumes[i];

                var createLocalDeviceParamater = {
                    StepGroupName: stepgroupname,
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
        }
        complete.success(AutoObject);
    })





    zbc.createWorker('VPLEX-DistributedDevice-worker', "VPLEX-CreateDistributedDevice", (job, complete,worker) => {
        var AutoObject = job.variables;
        var request = AutoObject.request;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
        var stepgroupname = "Providing Product Volume";

        var DistributedVirtauVolumes = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume;

        for (var i in DistributedVirtauVolumes ) {
            var DistributedVirtauVolumeItem = DistributedVirtauVolumes[i]; 
            var PhysicalVolumes = DistributedVirtauVolumeItem.PhysicalVolumes;
 
            for (var i in PhysicalVolumes) {
                var item = PhysicalVolumes[i];
                if (item.position == 'primary') {
                    var volname = item.physicalVolumeName
                    var appname = request.appname;
                    var volname_tail = volname.replace(appname+"_","");
                    var primaryArrayName = volname_tail.split('_')[0];
                    var volumeID1 = volname_tail.split('_')[1];

                    //worker.log(`volname=[${volname}], appname=[${appname}]， volname_tail=${volname_tail}, primaryArrayName=[${primaryArrayName}], volumeID1=[${volumeID1}]`)


                    for (var j in PhysicalVolumes) {
                        var item2 = PhysicalVolumes[j];

                        if (item2.position == 'second') {
                            var volname2 = item2.physicalVolumeName
                            var volname2_tail = volname2.replace(appname+"_","");
                            var secondArrayName = volname2_tail.split('_')[0];
                            var volumeID2 = volname2_tail.split('_')[1];
                            if (volumeID1 == volumeID2) {

                                var ddDeviceName = `dd_${appname}_${primaryArrayName}_${secondArrayName}_${volumeID1}`;
                                var devices = [];
                                devices.push("device_" + volname)
                                devices.push("device_" + volname2); 

                                DistributedVirtauVolumeItem["sourcedevice"] = "device_" + volname;
                                DistributedVirtauVolumeItem["devices"] = devices;
                                DistributedVirtauVolumeItem["ddDeviceName"] = ddDeviceName;  
 
                            }
                        }

                    }
                }

            }
        } 

        for (var i in DistributedVirtauVolumes) {
            var item = DistributedVirtauVolumes[i];

            var CreateDistributedDeviceParamater = {
                "StepGroupName": stepgroupname,
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
        complete.success(AutoObject);
    })


    zbc.createWorker('VPLEX-CreateDistributedVirtualVolume-worker', "VPLEX-CreateDistributedVirtualVolume", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;

        var DistributedVirtauVolumes = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume;
 

        var stepgroupname = "Providing Product Volume"; 

        for (var i in DistributedVirtauVolumes) {
            var item = DistributedVirtauVolumes[i];

            var CreateDistributedVirtualVolumeParamater = {
                "StepGroupName": stepgroupname,
                Step: '创建分布式虚拟存储卷',
                method: 'CreateDistributedVirtualVolume',
                DependOnAction: "CreateDistributedDevice",
                devicename: item.ddDeviceName,
                arrayinfo: arrayInfo.info
            }
            ActionParamaters.push(CreateDistributedVirtualVolumeParamater);

        }

        complete.success(AutoObject);
    })



    zbc.createWorker('VPLEX-AssignConsistencyGroup-worker', "VPLEX-AssignConsistencyGroup", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
        var request = AutoObject.request;

        var DistributedVirtauVolumes = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume;

        var stepgroupname = "Providing Product Volume"; 
        var ConsistencyGroupName = VPLEX.GenerateConsistencyGroupName(request);
        for (var i in DistributedVirtauVolumes) {
            var item = DistributedVirtauVolumes[i];
            var DistributedVirtualVolumeName = item.ddDeviceName + "_vol"
            item["DistributedVirtualVolumeName"] = DistributedVirtualVolumeName;

            var AssignConsistencyGroupParamater = {
                "StepGroupName": stepgroupname,
                Step: '分配虚拟存储卷到一致性组(Consistency Group): ' + ConsistencyGroupName,
                method: 'AssignConsistencyGroup',
                DependOnAction: "CreateDistributedDevice",
                virtual_volume: DistributedVirtualVolumeName,
                consistency_group: ConsistencyGroupName,
                arrayinfo: arrayInfo.info
            }
            ActionParamaters.push(AssignConsistencyGroupParamater);
        }
        complete.success(AutoObject);
    })

    // -----------------------------------------------------
    // AssignStorageView
    // -------------------------------------------------------

    //生产 Storage View in Cluster1
    zbc.createWorker('VPLEX-AssignStorageView-Prod-SC-worker', "VPLEX-AssignStorageView-Prod-SC", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
        var request = AutoObject.request;
        var DistributedVirtauVolumes = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume;


        var stepgroupname = "Providing Product Volume";


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
    zbc.createWorker('VPLEX-AssignStorageView-Prod-TC-worker', "VPLEX-AssignStorageView-Prod-TC", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
        var request = AutoObject.request;
        var DistributedVirtauVolumes = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume;


        var stepgroupname = "Providing Product Volume";


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




    zbc.createWorker('VPLEX-AssignStorageView-Backup-worker', "VPLEX-AssignStorageView-Backup", (job, complete) => {
        var AutoObject = job.variables;
        var ActionParamaters = AutoObject.AutoInfo.ActionParamaters;
        var ActionResult = AutoObject.AutoInfo.ActionResult;
        var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo;
        var request = AutoObject.request;
        var DistributedVirtauVolumes = ActionResult.VPlexInfo.ProdVolumeResourceInfo.DistributedVirtauVolume;

        var stepgroupname = "Providing Product Volume";

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


