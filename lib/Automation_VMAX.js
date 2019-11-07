"use strict";

var async = require('async');
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');
var util = require('./util');
var fs = require('fs');
var moment = require('moment');

var autologger = require('./logger');
var WebSocket = require('ws');
var Naming = require('../config/SDCityBank-Naming.json');

const ZB = require('zeebe-node');


module.exports = {
    SyncDeviceID,


}




function SyncDeviceID(arrayinfos, callback) {
 
    async.mapSeries(arrayinfos, function (arrayinfoItem, subcallback) {
        console.log(`Begin SyncDeviceID for array ${arrayinfoItem}.`);

        subcallback(null, "result");

    },
        function (err, result) { 
            callback(null, result);
        }
    )
}

