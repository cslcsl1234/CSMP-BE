"use strict";
 
var configger = require('../config/configger');
var CallGet = require('./CallGet');
var util = require('./util');  


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


