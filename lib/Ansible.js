"use strict";

var async = require('async'); 
var configger = require('../config/configger'); 
const unirest = require('unirest');

module.exports = { 
    executeAWXService


}

function executeAWXService(serviceName, paramater, callback) {
    var config = configger.load();
    var AWX_URL = config.AWX.URL;

    async.waterfall(
        [
            function (callback) {

                var getMethod = "/job_templates/";
                var queryString = "name=" + serviceName;
                logger.info("URL=" + AWX_URL + getMethod + ', query = [' + queryString + ']');
                unirest.get(AWX_URL + getMethod)
                    .auth(config.AWX.USER, config.AWX.PASSWORD, true)
                    .headers({ 'Content-Type': 'multipart/form-data' })
                    .query(queryString)
                    .end(function (response) {
                        logger.error(response.error + ',' + response.code);

                        if (response.error === undefined || response.error == false) {
                            if (response.body.count != 1) {
                                callback(404, `Can not found AWX service [ ${serviceName} ].`);
                            } else {
                                var templateId = response.body.results[0].id;
                                logger.info(`-- Query Template is finished , templateid is ${templateId} -----`);
                                callback(null, templateId);
                            }
                        } else {
                            response = {
                                code: 500,
                                msg: `task execute is error.`,
                                data: response.error
                            }
                            callback(520, response);
                        }

                    });

            },
            /*
            *  Launch a template in AWX
            */
            function (templateId, callback) {
                var getMethod = `/job_templates/${templateId}/launch/`;

                logger.info("URL=" + AWX_URL + getMethod);
                unirest.post(AWX_URL + getMethod)
                    .auth(config.AWX.USER, config.AWX.PASSWORD, true)
                    .headers({ 'Content-Type': 'application/json' })
                    .send(JSON.stringify(paramater))
                    .end(function (response) {
                        if (response.error === undefined || response.error == false) {
                            var jobId = response.body.job;
                            logger.info(`-- execute post template ${templateId} task ${jobId} is finished -----`);
                            callback(null, jobId)
                        } else {
                            response = {
                                code: 500,
                                msg: `task execute is error.`,
                                data: response.error
                            }
                            callback(520, response);
                        }

                    });

            },
            /*
            *  Check the status of the job until finished
            */
            function (jobId, callback) {

                var getMethod = `/jobs/${jobId}`;

                logger.info("URL=" + AWX_URL + getMethod);
                var timerId = setInterval(
                    function () {
                        unirest.get(AWX_URL + getMethod)
                            .auth(config.AWX.USER, config.AWX.PASSWORD, true)
                            .headers({ 'Content-Type': 'multipart/form-data' })
                            .end(function (response) {
                                logger.info(`-- job ${jobId} current status is ${response.body.status} -----`);

                                switch (response.body.status) {
                                    case 'running':
                                    case 'pending':
                                        
                                        break;
                                    case 'failed': 
                                        clearInterval(timerId); 
                                        response = {
                                            code: 500,
                                            msg: ` task execute is failed! `,
                                            data: response.body
                                        }
                                        callback(null,jobId);
                                        break;
                                    case 'successful':
                                        clearInterval(timerId); 
                                        response = {
                                            code: 500,
                                            msg: ` task execute is succeed! `,
                                            data: response.body
                                        }
                                        callback(null, jobId);
                                        break;
                                    default:
                                        response = {
                                            code: 555,
                                            msg: `task status is not in [ running, pending, failed , successful ], it is ${response.body.status} `,
                                            data: response.body
                                        }
                                        callback(520, response);
                                        break;
                                }

                            });
                    }
                    , 5000)
            },
            function (jobId, callback) {
                logger.info("Begin get Job Event!");
                var getMethod = `/jobs/${jobId}/job_events/?page_size=10000`;
                logger.info("URL=" + AWX_URL + getMethod);
                unirest.get(AWX_URL + getMethod)
                    .auth(config.AWX.USER, config.AWX.PASSWORD, true)
                    .headers({ 'Content-Type': 'multipart/form-data' })
                    .end(function (response) {
                        //logger.info(response); 
                        callback(null, response.body);
                    });

            },
            //Parse the job event result, get the result for response
            function (result, callback) {
                // callback(null, result); 
                //var response = [];
                var response;
                var isfind = false;
                for (var i in result.results) {
                    var item = result.results[i];
                    //logger.info("TASK==== "+ item.task + ' | ' + item.event );
                    if (item.event == 'runner_on_failed') {
                        isfind = true;
                        response = {
                            code: 510,
                            msg: `task is failed for template ${result.results[0].playbook}`,
                            data: item.event_data.res
                        }
                        logger.info(JSON.stringify(response,null, 2));
                        callback(520, response);
                        break;
                    }
                    else
                        if ((item.task == "RESPONSE") && ( (item.event == "runner_on_ok") || ( item.event == 'runner_on_failed' )) ) {
                            isfind = true;
                            response = item.event_data;
                            callback(null, response)
                            break;
                        }
                }

                if ( isfind == false ) {
                    // not found RESPONSE task
                    response = {
                        code: 520,
                        msg: `Not found RESPONSE task in template ${result.results[0].playbook}`,
                        data: result.results
                    }
                    callback(520, response);
                }


            }
        ], function (err, result) {
            var response = {};

            //logger.info("*****2222222\n" ); 
            //logger.info(result);
            if (err ) {
                response["code"] = 500;
                response["data"] = result;

                if ( result.data.exception !== undefined ) {
                    response["msg"] = result.data.exception; 
                }
 
            } else {
                response["code"] = 200;
                response["msg"] = "successful";
                response["data"] = result;
            }
            logger.info(response);
            callback(response);
        });
}
