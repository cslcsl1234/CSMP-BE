process.on('uncaughtException', function (error) {
    logger.info(error.stack);
});


var express = require('express')
    , app = express()
    , configger = require('./config/configger')
    , mongoose = require('mongoose');
var os = require('os');
var path = require('path');
var moment = require('moment');
const logger = require('./lib/logger')(__filename);
const ZeeBeLib = require('./lib/automation/zeebe'); 

var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}

//Initial mongoDB related settings.
require('./config/db');

var config = configger.load();
var SERVERHOST_OLD = configger.get('SERVER:HOST')
configger.set('SERVER:HOST', addresses[0]);
var SERVERHOST = configger.get('SERVER:HOST')
if (SERVERHOST_OLD != SERVERHOST)
    configger.save();
 

// overwrite  logger.info
var fs = require('fs');
// Override the base console log with winston
//logger.info = function (arguments) {     return logger.info(arguments) } 
//console.debug = function (arguments) {     return logger.debug(arguments) } 

/*
var trueLog = logger.info;
logger.info = function(msg) {
    var ds = moment().format('YYYY-MM-DD HH:mm:ss.SSS')
    
    var newMsg = `[${ds}] ${msg}`;
    fs.appendFile("./logs/logger.info", newMsg + '\n', function(err) {
        trueLog(newMsg);
        if(err) {
            return trueLog(err);
        }
    });
    //trueLog(msg); //uncomment if you want logs
}
*/

//express config.
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/apidocs'));
app.use("/api-docs", express.static(path.join(__dirname, '/api-docs')));
app.use(app.router);

require('./config/authController')(app);
require('./config/swaggerController')(app);
require('./controllers/demoController')(app);


require('./controllers/arrayController')(app);
require('./controllers/virtualArrayController')(app);
require('./controllers/objectArrayController')(app);
require('./controllers/fileArrayController')(app);

require('./controllers/switchController')(app);
require('./controllers/appController')(app);
require('./controllers/hostController')(app);
require('./controllers/menuController')(app);

require('./controllers/eventController')(app);
require('./controllers/datacenterController')(app);
require('./controllers/DashboardController')(app);

require('./controllers/topologyController')(app);
require('./controllers/capacityController')(app);

require('./controllers/reportingController')(app);

require('./controllers/externalController')(app);

require('./controllers/BackendMgmtController')(app);
require('./controllers/testController')(app);
require('./controllers/analysisController')(app);

require('./controllers/automationController')(app);
require('./controllers/healthcheckController')(app);
require('./controllers/grafanaController')(app);
require('./controllers/grafanaVPlexController')(app);
require('./controllers/grafanaVMAXController')(app);


// ---- CEB Project ------
require('./controllers/cebPerformanceProviderController')(app);
require('./controllers/cebAPIController')(app);

require('./controllers/simulateServicesController')(app);
require('./controllers/autoScriptsController')(app);


/**
 * Starting Zeebe bpmn process service 
 */
//ZeeBeLib.deployWorkflow();
logger.info("---- === ---- === ---- === ---- === ---- ===")
if (config.FunctionConfigure.automation == true) {
    logger.info("config.FunctionConfigure.automation is true, Enable the automation module... ...")
    ZeeBeLib.createProcessWorker();
} else {
    logger.info("config.FunctionConfigure.automation is false, Disable the automation module... ...")
}
logger.info("---- === ---- === ---- === ---- === ---- ===")



/**
 * Starting API listener service
 */
const server = app.listen(config.SERVER.PORT, function () {
    logger.info('=== The MongoDB server listening on [' + config.MongoDBURL + '] ===')
    logger.info('=== The NodeJS server ip addresses is [' + addresses + '] ===');
    logger.info('=== Then App server listening on port ' + config.SERVER.PORT + ' ===');

    logger.info(' ---- === ---- === ---- === ---- === ---- ===')
    logger.info('         Begin check depends files ...       ');
    logger.info(' ---- === ---- === ---- === ---- === ---- ===')
    var ReportOutputPath = config.Reporting.OutputPath;
    var appTopoFile = path.join(ReportOutputPath, 'topology.json');
    fs.exists(appTopoFile, function (exists) {
        if ( exists ) 
            logger.info(`File [ ${appTopoFile} ] : is exist.`);
        else
            logger.warn(`File [ ${appTopoFile}] : !!! is not exits. Please generate it!`);
    })
});


