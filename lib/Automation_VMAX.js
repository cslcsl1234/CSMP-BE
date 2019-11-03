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

function executeAWXService(serviceName, callback) {
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
                        if (response.body.count != 1) {
                            callback(404, null);
                        } else {
                            var templateId = response.body.results[0].id; 
                            console.log(`-- Query Template is finished , templateid is ${templateId} -----`);
                            callback(null, templateId);
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
                    .headers({ 'Content-Type': 'multipart/form-data' })
                    .end(function (response) {
                        var jobId = response.body.job;
                        console.log(`-- execute post template ${templateId} task ${jobId} is finished -----`);
                        callback(null, jobId)
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
                                if (response.body.status == 'successful') { 
                                    clearInterval(timerId);
                                    callback(null, jobId);
                                }
                            });
                    }
                    , 5000)
            },
            function (jobId, callback) {
                console.log("Begin get Job Event!");
                var getMethod = `/jobs/${jobId}/job_events/`;
                console.log("URL=" + AWX_URL + getMethod);
                unirest.get(AWX_URL + getMethod)
                    .auth(config.AWX.USER, config.AWX.PASSWORD, true)
                    .headers({ 'Content-Type': 'multipart/form-data' })
                    .end(function (response) {
                        //console.log(response); 
                        callback(null,  response.body);
                    });

            }
        ], function (err, result) {
            if (err) {
                console.log("ERROR:" + err);
                callback(err);
            } else
                callback(result);
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