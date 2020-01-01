"use strict";

var async = require('async');
var mongoose = require('mongoose');
var unirest = require('unirest');
var Kafka = require("node-rdkafka");
var configger = require('../config/configger');
var CallGet = require('./CallGet');
var util = require('./util');
var fs = require('fs');
var moment = require('moment');


module.exports = {
    createTopics,
    kafkaSendMsg,
    kafkaReceiveMsg,
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
                console.log("URL=" + AWX_URL + getMethod + ', query = [' + queryString + ']');
                unirest.get(AWX_URL + getMethod)
                    .auth(config.AWX.USER, config.AWX.PASSWORD, true)
                    .headers({ 'Content-Type': 'multipart/form-data' })
                    .query(queryString)
                    .end(function (response) {
                        console.log(response.error + ',' + response.code);

                        if (response.error === undefined || response.error == false) {
                            if (response.body.count != 1) {
                                callback(404, `Can not found AWX service [ ${serviceName} ].`);
                            } else {
                                var templateId = response.body.results[0].id;
                                console.log(`-- Query Template is finished , templateid is ${templateId} -----`);
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

                console.log("URL=" + AWX_URL + getMethod);
                unirest.post(AWX_URL + getMethod)
                    .auth(config.AWX.USER, config.AWX.PASSWORD, true)
                    .headers({ 'Content-Type': 'application/json' })
                    .send(JSON.stringify(paramater))
                    .end(function (response) {
                        if (response.error === undefined || response.error == false) {
                            var jobId = response.body.job;
                            console.log(`-- execute post template ${templateId} task ${jobId} is finished -----`);
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

                console.log("URL=" + AWX_URL + getMethod);
                var timerId = setInterval(
                    function () {
                        unirest.get(AWX_URL + getMethod)
                            .auth(config.AWX.USER, config.AWX.PASSWORD, true)
                            .headers({ 'Content-Type': 'multipart/form-data' })
                            .end(function (response) {
                                console.log(`-- job ${jobId} current status is ${response.body.status} -----`);

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
                console.log("Begin get Job Event!");
                var getMethod = `/jobs/${jobId}/job_events/?page_size=10000`;
                console.log("URL=" + AWX_URL + getMethod);
                unirest.get(AWX_URL + getMethod)
                    .auth(config.AWX.USER, config.AWX.PASSWORD, true)
                    .headers({ 'Content-Type': 'multipart/form-data' })
                    .end(function (response) {
                        //console.log(response); 
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
                    //console.log("TASK==== "+ item.task + ' | ' + item.event );
                    if (item.event == 'runner_on_failed') {
                        isfind = true;
                        response = {
                            code: 510,
                            msg: `task is failed for template ${result.results[0].playbook}`,
                            data: item.event_data.res
                        }
                        console.log(JSON.stringify(response,null, 2));
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
            if (err) {
                callback(result);

            } else {
                response["code"] = 200;
                response["msg"] = "successful";
                response["data"] = result;
                callback(response);
            }
        });
}


function kafkaSendMsg(topicname, key, message) {

    console.log("kafka send msg is begin");
    var config = configger.load();
    const kafkaConf = config.kafkaConf;
    const topics = config.kafakTopics;

    var topicName = topicname;
    if (key === undefined) key = Buffer.from((Math.ceil(Math.random() * 1000)).toString());
    console.log('Topic Name = ' + topicName);
    console.log('key Name = ' + key);

    const producer = new Kafka.Producer(kafkaConf);
    producer.connect();
    producer.on("ready", function (arg) {
        // if partition is set to -1, librdkafka will use the default partitioner
        var partition = -1;
        producer.produce(topicName, partition, message, key);
        console.log("send finished");
    });

    producer.on("disconnected", function (arg) {
        process.exit();
    });

    producer.on('event.error', function (err) {
        console.error(err);
        process.exit(1);
    });
    producer.on('event.log', function (log) {
        console.log(log);
    });



}



function kafkaReceiveMsg(topicname, key, callback) {

    console.log("kafka receive msg is begin");
    var config = configger.load();
    const kafkaConf = config.kafkaConf;

    var topicName = [];
    topicName.push(topicname);
    const consumer = new Kafka.KafkaConsumer(kafkaConf);
    consumer.connect();
    consumer.on("error", function (err) {
        console.log("kafka receive msg :" + err);
        console.error(err);
    });

    consumer.on("ready", function (arg) {
        console.log("receive ready event:: subscribe()");
        consumer.subscribe(topicName);
        console.log("receive ready event: consume()");
        consumer.consume();
        console.log("receive ready event: consume() is finished");
    });

    consumer.on("data", function (m) {
        console.log("receive data event");
        console.log(m);
        console.log(m.key.toString() + '=' + m.value.toString());
        var msg = "receive msg:" + m.value.toString();
        callback(msg)
    });

    console.log("receive is over");
}


function createTopics() {
    /*
    *   Kafka  
    */
    var config = configger.load();
    const kafkaConf = config.kafkaConf;
    const topics = config.kafakTopics;

    console.log(kafkaConf);

    const client = Kafka.AdminClient.create({
        'client.id': 'kafka-admin',
        'metadata.broker.list': kafkaConf["metadata.broker.list"]
    });

    console.log(topics);
    for (var fieldname in topics) {
        var topicName = topics[fieldname];
        console.log(topicName);
        client.createTopic({
            topic: topicName,
            num_partitions: 1,
            replication_factor: 1
        }, function (err) {
            console.log("create topic " + topicName);
            // Done!
        });
    }

}