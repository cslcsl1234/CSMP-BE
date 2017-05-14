
var express = require('express')
    , app = express()
    , configger = require('./config/configger')
    , mongoose = require('mongoose');
var os = require('os');

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

//express config.
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));
app.use(app.router);

require('./config/authController')(app);
require('./controllers/demoController')(app);

require('./controllers/topologyController')(app);

require('./controllers/arrayController')(app);

require('./controllers/switchController')(app);
require('./controllers/appController')(app);
require('./controllers/hostController')(app);

require('./controllers/eventController')(app);


app.listen(config.SERVER.PORT, function () {
	console.log('=== The Backend server listening on [' + config.Backend.URL + '] ===');
	console.log('=== The MongoDB server listening on [' + config.MongoDBURL + '] ===')
    
	console.log('=== The NodeJS server ip addresses is [' + addresses + '] ===');
    console.log('=== Then App server listening on port '+config.SERVER.PORT +' ===');
});


