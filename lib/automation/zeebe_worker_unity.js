const ZB = require('zeebe-node')
const async = require('async');
var configger = require('../../config/configger');
const VPLEX = require('../Automation_VPLEX');
const Unity = require('../Automation_Unity');
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
                            "array_type": "Unity",
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


    zbc.createWorker('Unity-Provider-Service-worker', "Unity-Provider-Service", (job, complete, worker) => {

        var paramaters = job.variables;
        var AutoInfo = paramaters.AutoInfo;
        var request = paramaters.request;
        var ActionParamaters = AutoInfo.ActionParamaters;
        var ArrayInfo = AutoInfo.RuleResults.ArrayInfo;



        var stepgroupname = "Providing Product Volume using Unity";
        var sgname = VPLEX.GenerateStorateViewName(request, "prod");
        var capacityBYTE = request.capacity * 1024 * 1024 * 1024;
        var capacityBYTEUnity = capacityBYTE + 100 * 1024 * 1024;

        var arrayType = ArrayInfo.info.array_type;

        for ( var i = 0 ; i< request.count; i++ ) {
            var no = i+1;
            var volno = ""
            if ( no < 10 ) volno = "0" + no;
            else volno = no 

            
            var volName = Unity.GenerateVolNameV2(ArrayInfo.info, request.appname, request.usedfor, request.timestamp) + volno;
    
            var CreateArrayDeviceParamater = {
                StepGroupName: stepgroupname,
                Step: `Create device and assign to sg [ ${sgname} ] in pyhsical array [ ${ArrayInfo.info.unity_sn} ] , arraytype= [ ${arrayType} ]`,
                method: 'CreatePhysicalDevice',
                arrayinfo: ArrayInfo.info,
                DependOnAction: "N/A",
                AsignSGName: sgname,
                StorageVolumeName: volName,
                capacityByte: capacityBYTEUnity,
                execute: true
            } 
            ActionParamaters.push(CreateArrayDeviceParamater);
        }

        return complete.success(paramaters);
    })




}


