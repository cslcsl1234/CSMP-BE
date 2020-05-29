const ZB = require('zeebe-node')
var configger = require('../../config/configger');
const AutoService = require('../Automation');
const WORKER_VPLEX = require('./zeebe_worker_vplex');
const WORKER_RPA = require('./zeebe_worker_rpa');


module.exports = {
    connect,
    deployWorkflow,
    createProcessWorker
}



async function connect() {
    var config = configger.load();
    try {
        const zbc = new ZB.ZBClient(config.ZEEBE.BROKER);
        const topology = await zbc.topology()
        //console.log(JSON.stringify(topology, null, 2))
        return zbc;
    } catch (error) {
        throw new Error(error);
    }
}; 

async function deployWorkflow() {
    const zbc = await connect(); 
    const res = await zbc.deployWorkflow('./bpmn/csmp-automation-main.bpmn');

    console.log(res)
}


async function createProcessWorker() {

    var config = configger.load();

    const zbc = await connect();
    const zbWorker = zbc.createWorker('demo-service', 'demo-server', function (job, complete) {
        worker.log('Task variables', job.variables)

        // Task worker business logic goes here
        const updateToBrokerVariables = {
            updatedProperty: 'newValue',
        }

        complete.success(updateToBrokerVariables)
    })

    zbc.createWorker('ChooseArray-worker', "ChooseArray", (job, complete) => {
        var paramater = job.variables;
        //console.log(`====ChooseArray======\n${JSON.stringify(paramater,null,2)}`);  
        var arrayInfo = AutoService.ChooseStorage(paramater);
        paramater.AutoInfo.RuleResults["ArrayInfo"] = arrayInfo;
        complete.success(paramater);
    })

    zbc.createWorker('TestTask-worker', "TestTask", (job, complete) => {
        var paramater = job.variables;
        console.log(`\n====TestTask======\n${JSON.stringify(paramater, null, 2)}`);
        complete.success(paramater);
    })

    zbc.createWorker('VMAX-worker', "VMAX", (job, complete) => {
        var paramater = job.variables;
        console.log(`\n====VMAX Task======\n${JSON.stringify(paramater, null, 2)}`);
        complete.success(paramater);
    })

    zbc.createWorker('Unity-worker', "Unity", (job, complete) => {
        var paramater = job.variables;
        console.log(`\n====Unity Task======\n${JSON.stringify(paramater, null, 2)}`);
        complete.success(paramater);
    })



    zbc.createWorker('exception-handler-service-worker', "exception-handler-service", (job, complete) => {
        var paramater = job.variables;
        //console.log(`\n====exception-handler-service Task======\n${JSON.stringify(paramater,null,2)}`); 
        complete.success(paramater);
    })

    zbc.createWorker('exception-handler-service-worker', "send-back-exception-message", async (job, complete) => {
        var paramater = job.variables;
        //console.log(`\n====exception-handler-service Task======\n${JSON.stringify(paramater,null,2)}`); 
        var requestId = paramater.requestId;
        var exceptionMsg = { "resMsg": paramater.resMsg };

        await zbc.publishMessage({
            correlationKey: requestId,
            name: "Message_Exception",
            variables: exceptionMsg
        });

        complete.success(paramater);
    })

    WORKER_VPLEX.createProcessWorker();
    WORKER_RPA.createProcessWorker();

}



