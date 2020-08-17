"use strict";

var configger = require('../config/configger');
var CallGet = require('./CallGet');
var util = require('./util');


module.exports = {
    HealthCheck
}


function HealthCheck(arrayInfo, begindatetime, enddatetime, callback) {

    var response = { code: 200, message: "success", data: null };
    var config = configger.load();
    switch (config.ProductType) {
        case 'Dev':
        case 'Test':
            util.sleep(5000);
            var result = `health-check for XtreamIO execute finished in ${config.ProductType} model.`;
            response.data = result;
            callback(response);
            break;
        case 'Prod':
            var param = {};
            param.array = arrayInfo;
            param.url = '/events';
            param.query = { "from-date-time": begindatetime, "to-date-time": enddatetime }


            CallGet.CallAutoGet(param, function (result) {
                //logger.info("*****\n" + JSON.stringify(result, null, 2));
                if (result.code == 200) {
                    response.data = result.response.body.events
                } else {
                    response.code = result.code;
                    response.message = result.message;
                    response.data = null
                }
                callback(response);
            })
            break;

    }
}


