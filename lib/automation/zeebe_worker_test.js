const ZB = require('zeebe-node')
const async = require('async');
var configger = require('../../config/configger');
const VPLEX = require('../Automation_VPLEX');
const VMAX = require('../Automation_VMAX');
const UNITY = require('../Automation_UNITY');
const RPA = require('../Automation_RPA')


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

    const topology = await zbc.topology();
    logger.info(JSON.stringify(topology, 2, 2));

    /*
    zbc.createWorker('test01-worker', "Task01", (job, complete, worker) => {

        
        worker.log(JSON.stringify(job, 2, 2));
        var paramaters = job.variables;
        if (paramaters.paramater1 == "normal")
            complete.success();
        else if (paramaters.paramater1 == "failure") {
            complete.failure("Task01 is Failure!", 0);
        } else if (paramaters.paramater1 == "error") {
            paramaters["msg"] = "task01 is error (501)!"; 
            paramaters["ERRORCODE"] = "111"; 
            worker.log(JSON.stringify(job, 2, 2)); 
            complete.error(501, "task01 is error (501)!")
        } else {
            complete.forwarded();
        }

    }, {
        failWorkflowOnException: true,
    })

    zbc.createWorker('test02-worker', "Task02",async (job, complete, worker) => {
        worker.log(JSON.stringify(job, 2, 2));

        await zbc.publishMessage({  
            name: "Message_001",
            variables: { valueToAddToWorkflowVariables: "here", status: "PROCESSED" },
            timeToLive: 10000
          });

        complete.success();
    })


    zbc.createWorker('error_handle_001-worker', "error_handle_001", (job, complete, worker) => {
        var paramaters = job.variables;
        worker.log(JSON.stringify(job, 2, 2));
        paramaters["new001"] = "new paramater 001";
        job.customHeaders = { "header01": 001 };
        complete.error(501, "Execute error 501!");
    })


    zbc.createWorker('receive-message-worker', "ReceiveMessage", (job, complete, worker) => {
        
        var paramaters = job.variables;
        worker.log(paramaters);
        paramaters["new001"] = "new paramater 001";
        job.customHeaders = { "header01": 001 };
        complete.success({msg:"Receive Message is done!"});
        worker.log(JSON.stringify(job, 2, 2));
    })

    */

    zbc.createWorker('p-test01-worker', "p-test01", (job, complete, worker) => {

        var paramaters = job.variables;
        worker.log(`p-task01 begin:${JSON.stringify(paramaters, 2, 2)}`)
        paramaters["task01"] = "test01-variable";
        worker.log(`p-task01 end:${JSON.stringify(paramaters, 2, 2)}`)
        return complete.success(paramaters);
    })

    zbc.createWorker('p-test02-worker', "p-test03", (job, complete, worker) => {

        var paramaters = job.variables;
        worker.log("p-test03 is begin");
        var rpainfo = RPA.GetRPAInfo('TestCase02'); 
        if ( rpainfo == null ) worker.log("rpainfo is null");
        else worker.log(JSON.stringify(rpainfo,2,2));

        return complete.success(paramaters);
    })

    zbc.createWorker('pre-task01-worker', "pre-task01", (job, complete, worker) => {

        var paramaters = job.variables;

       // worker.log(`pre-task01 begin:${JSON.stringify(paramaters, 2, 2)}`)

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
                        "ConsistencyGroup": ["CCCQ_CG_Local","EBANKWEB_CG_DR"]
                    },
                    {
                        "UsedFor": "data",
                        "CapacityGB": 3,
                        "type": "localed",
                        "ClusterName": "cluster-1",
                        "ConsistencyGroup": ["CCCQ_CG_Prod"]
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

       // worker.log(`pre-task01 end:${JSON.stringify(paramaters, 2, 2)}`)

        return complete.success(paramaters);
    })


    zbc.createWorker('sub-task-01-worker', "sub-task-01", (job, complete, worker) => {

        var paramaters = job.variables;

        worker.log(`sub-task-01 begin:${JSON.stringify(paramaters, 2, 2)}`)
        paramaters["sub-task-01"] = "sub-task-01-variable";

        worker.log(`sub-task-01 end:${JSON.stringify(paramaters, 2, 2)}`)
        var newparamater = { "paramater2": 100, "sub-task-01-new": "new value" };
        return complete.success(newparamater);
    })






}
 