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


module.exports = {
    HealthCheck
}


function HealthCheck(arrayInfo, begindatetime, enddatetime, callback) {
 
    var response = { code: 200, message: "success", response: null };
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = `health-check for XtreamIO execute finished in ${config.ProductType} model.`;
            response.response = result;
            callback(response);
            break;
        case 'Prod':
            var param = {};
            param.array = arrayInfo;
            param.url = '/events';


            CallGet.CallAutoGet(param, function (result) {
                console.log("*****\n" + JSON.stringify(result, null, 2));
                var result = `health-check for XtreamIO execute finished in ${config.ProductType} model.`;
                response.response = result;
                callback(response);
            })
            break;

    }
}


