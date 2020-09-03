const ZB = require('zeebe-node')
var configger = require('../../config/configger');
const { Duration } = require('zeebe-node');
const AutoService = require('../Automation');
const WORKER_TEST = require('./zeebe_worker_test');
const WORKER_VPLEX = require('./zeebe_worker_vplex');
const WORKER_RPA = require('./zeebe_worker_rpa');
const WORKER_VMAX = require('./zeebe_worker_vmax');
const WORKER_UNITY = require('./zeebe_worker_unity');
const logger = require("../../lib/logger")(__filename);

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
        //logger.info(JSON.stringify(topology, null, 2))
        return zbc;
    } catch (error) {
        throw new Error(error);
    }
};

async function deployWorkflow() {
    const zbc = await connect();
    const res = await zbc.deployWorkflow('./bpmn/csmp-automation-main.bpmn');

    logger.info(res)
}


async function createProcessWorker() {

    var config = configger.load();

    const zbc = await connect();
    const zbWorker = zbc.createWorker({
        taskType: 'demo-server',
        maxJobsToActivate: 32,
        loglevel: 'NONE',
        timeout: Duration.seconds.of(301), // 30s timeout
        onConnectionError: () => zbWorker.log('Disconnected'),
        onReady: () => zbWorker.log('Connected.'),
        taskHandler: function (job, complete) {
            worker.log('Task variables', job.variables)

            // Task worker business logic goes here
            const updateToBrokerVariables = {
                updatedProperty: 'newValue',
            }

            complete.success(updateToBrokerVariables)
        }
    })

    zbc.createWorker({
        taskType: 'demo-service-11111111111111111111',
        taskHandler: function (job, complete) {
            worker.log('Task variables', job.variables)

            // Task worker business logic goes here
            const updateToBrokerVariables = {
                updatedProperty: 'newValue',
            }

            complete.success(updateToBrokerVariables)
        },
        // the number of simultaneous tasks this worker can handle
        maxJobsToActivate: 32,
        // the amount of time the broker should allow this worker to complete a task 
        // One of 'DEBUG', 'INFO', 'NONE'
        loglevel: 'NONE',
        // Called when the connection to the broker cannot be established, or fails
        onConnectionError: () => zbWorker.log('Disconnected'),
        // Called when the connection to the broker is (re-)established
        onReady: () => zbWorker.log('Connected.')
    })

    zbc.createWorker({
        taskType: 'ChooseArray',
        maxJobsToActivate: 32,
        loglevel: 'NONE',
        timeout: Duration.seconds.of(301), // 30s timeout
        onConnectionError: () => zbWorker.log('Disconnected'),
        onReady: () => zbWorker.log('Connected.'),
        taskHandler: (job, complete, worker) => {
            var paramater = job.variables;
            //logger.info(`====ChooseArray======\n${JSON.stringify(paramater,null,2)}`);  
            worker.log("Begin");
            var arrayInfo = AutoService.ChooseStorage(paramater);
            paramater.AutoInfo.RuleResults["ArrayInfo"] = arrayInfo;
            complete.success(paramater);
        }
    })

    zbc.createWorker({
        taskType: 'TestTask',
        maxJobsToActivate: 32,
        loglevel: 'NONE',
        timeout: Duration.seconds.of(301), // 30s timeout
        onConnectionError: () => zbWorker.log('Disconnected'),
        onReady: () => zbWorker.log('Connected.'),
        taskHandler: (job, complete) => {
            var paramater = job.variables;
            logger.info(`\n====TestTask======\n${JSON.stringify(paramater, null, 2)}`);
            complete.success(paramater);
        }
    })


    zbc.createWorker({
        taskType: 'exception-handler-service',
        maxJobsToActivate: 32,
        loglevel: 'NONE',
        timeout: Duration.seconds.of(301), // 30s timeout
        onConnectionError: () => zbWorker.log('Disconnected'),
        onReady: () => zbWorker.log('Connected.'),
        taskHandler: (job, complete, worker) => {
            var paramater = job.variables;
            //logger.info(`\n====exception-handler-service Task======\n${JSON.stringify(paramater,null,2)}`);  
            complete.success(paramater);
        }
    })

    zbc.createWorker({
        taskType: 'send-back-exception-message',
        maxJobsToActivate: 32,
        loglevel: 'NONE',
        timeout: Duration.seconds.of(301), // 30s timeout
        onConnectionError: () => zbWorker.log('Disconnected'),
        onReady: () => zbWorker.log('Connected.'),
        taskHandler: async (job, complete, worker) => {
            var paramater = job.variables;
            //logger.info(`\n====exception-handler-service Task======\n${JSON.stringify(paramater,null,2)}`); 


            var requestId = paramater.requestId;
            var exceptionMsg = { "resMsg": paramater.resMsg };

            worker.log(`publish message (name=Message_Exception), correlationKey=[${requestId}], timeToLive=10000`)

            await zbc.publishMessage({
                correlationKey: requestId,
                name: "Message_Exception",
                variables: exceptionMsg,
                timeToLive: 10000
            });

            complete.success(paramater);
        }
    })

    WORKER_TEST.createProcessWorker();

    WORKER_VPLEX.createProcessWorker();
    WORKER_RPA.createProcessWorker();
    WORKER_VMAX.createProcessWorker();
    WORKER_UNITY.createProcessWorker();
}



