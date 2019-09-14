
var express = require('express')
, app = express()
, configger = require('./config/configger')
, mongoose = require('mongoose');
var os = require('os');
var path = require('path');
const ZB = require('zeebe-node'); 


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
configger.set('SERVER:HOST',addresses[0]);
var SERVERHOST  = configger.get('SERVER:HOST') 
if ( SERVERHOST_OLD != SERVERHOST ) 
    configger.save();


//express config.
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/apidocs'));
app.use("/api-docs", express.static(path.join(__dirname,'/api-docs')));
app.use(app.router);

require('./config/authController')(app);
require('./config/swaggerController')(app);
require('./controllers/demoController')(app);


require('./controllers/arrayController')(app);
require('./controllers/virtualArrayController')(app);

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
require('./controllers/grafanaController')(app);
require('./controllers/grafanaVPlexController')(app);
require('./controllers/grafanaVMAXController')(app);


// ---- CEB Project ------
require('./controllers/cebPerformanceProviderController')(app);
require('./controllers/cebAPIController')(app);

require('./controllers/simulateServicesController')(app);




const server = app.listen(config.SERVER.PORT, function () {
    console.log('=== The Backend server listening on [' + config.Backend.URL + '] ===');
    console.log('=== The MongoDB server listening on [' + config.MongoDBURL + '] ===')

    console.log('=== The NodeJS server ip addresses is [' + addresses + '] ===');
    console.log('=== Then App server listening on port '+config.SERVER.PORT +' ===');
  
 
});


