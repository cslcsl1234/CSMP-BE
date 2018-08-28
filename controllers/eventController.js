"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('eventController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');
var mongoose = require('mongoose');  
var EventObj = mongoose.model('Event');
var CallGet = require('../lib/CallGet'); 
var demo_events = require('../demodata/events');
var GetEvents = require('../lib/GetEvents');
var moment = require('moment');
var DeviceMgmt = require('../lib/DeviceManagement');
var Report = require('../lib/Reporting');

var IOLimitEventObj = mongoose.model('IOLimitEvent');

var eventController = function (app) {

    var config = configger.load();

    app.get('/api/events', function (req, res) {
 
        var device = req.query.device; 
        var state = req.query.state; 

        var startdt = req.query.startdt;
        var enddt = req.query.enddt;

        console.log("device=" + device+"\n"+"state=" + state+"\n"+"startdt=" + startdt+"\n"+"enddt=" + enddt);
        var eventParam = {};
        if (typeof device !== 'undefined') { 
            eventParam['filter'] = 'device=\''+device + '\'&!acknowledged&active=\'1\'';
            var filter = 'device=\''+device + '\'&!acknowledged&active=\'1\'';
        } else {
            eventParam['filter'] = '!acknowledged&active=\'1\'';
        } 
 
        //console.log(eventParam);
        GetEvents.GetEvents(eventParam, function(result1) {   

            var result = [];

            // Filter event records for between start and end.
            for ( var i in result1 ) {
                var eventitem = result1[i];

                switch ( eventitem.severity ) {
                    case "3":
                        eventitem["severity"] = "warning";
                        break;
                    case "2":
                        eventitem["severity"] = "error";
                        break;
                    case "1":
                        eventitem["severity"] = "critical";
                        break; 
                    default:
                        eventitem["severity"] = "info";
                        break;                                                                             
                }

                switch ( eventitem.devtype ) {
                    case "FabricSwitch":
                        eventitem["devtype"] = "switch";
                        break; 
                    default:
                        eventitem["devtype"] = "storage";
                        break;                                                                             
                }


                if ( ( startdt !== undefined ) && ( enddt !== undefined )) {
                    if ( eventitem.timestamp >= startdt && eventitem.timestamp <= enddt ) {
                        

                        result.push(eventitem);
                    }
                    else { 
                        continue;
                    }
                } else {
                    result.push(eventitem);
                }
            }
 

             EventObj.find({}, function (err, doc) {

                for ( var i in result ) {
                    var eventitem = result[i];

                    eventitem["customerSeverity"] = -1;
                    eventitem["state"] = '未处理';
                    eventitem["ProcessMethod"] = '';
                    for ( var j in doc ) {
                        var eventInfoItem = doc[j];
                        if ( eventitem.id == eventInfoItem.id ) {
                            eventitem["customerSeverity"] = eventInfoItem.customerSeverity;
                            eventitem["state"] = eventInfoItem.state;
                            eventitem["ProcessMethod"] = eventInfoItem.ProcessMethod;
                            eventitem["sendSMS"] = eventInfoItem.sendSMS;
                            break;
                        }
                    }
                                             
                }
                if ( state !== undefined ) {
                    var result1 = [];
                    for ( var i in result ) {
                        var eventitem = result[i]; 
                        if  ( state.indexOf(eventitem.state) > -1 )  result1.push(eventitem);
                    }
                    return  res.json(200 , result1);
                } else 
                    return  res.json(200 , result);

            });


        });


    });


/*
*  Create a Event record 
*/
    app.post('/api/events', function (req, res) { 
        var event = req.body;

        event.forEach(function(item) {


             EventObj.findOne({"id" : item.id}, function (err, doc) {
                //system error.
                if (err) {
                    return   done(err);
                }
                if (!doc) { //user doesn't exist.
                    console.log("Event Record is not exist. insert it."); 

                    var newevent = new EventObj(item);
                    newevent.save(function(err, thor) {
                      if (err)  {

                        console.dir(thor);
                        return res.json(400 , err);
                      } else 

                        return res.json(200, {status: "The Event Record insert is succeeds!"});
                    });
                }
                else { 

                    doc.update(item, function(error, course) {
                        if(error) return next(error);
                    });


                    return  res.json(200 , {status: "The Event Record has exist! Update it."});
                }

                });

       });


    });

    //
    // Monitor SG IOLimit exceed issue 
    //

    app.get('/api/event/performance/sg/iolimit', function (req, res) {  
        var device;
        var start = moment(req.query.from).toISOString(); 
        var end = moment(req.query.to).toISOString();  
        async.waterfall(
            [
                function(callback){
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function(arrayInfo) {
                        callback(null,arrayInfo);
                    })
                },
                // Get All Localtion Records
                function(param,  callback){ 
                    //var ret = require("../demodata/sg_top10_iops");
                    var device;
                    var period = 3600;
                    var valuetype = 'max'; 
 
                    
                    var param = {};
                    param['device'] = device;
                    param['period'] = period;
                    param['start'] = start;
                    param['end'] = end;
                    param['type'] = valuetype;
                    param['filter_name'] = '(name=\'HostIOLimitExceededPercent\')';
                    param['keys'] = ['device','part'];
                    param['fields'] = ['name','sgname','parttype','iolmstat','iolimit'];  
                    param['filter'] = '(datagrp=\'VMAX-StorageGroup\'&parttype=\'Storage Group\'&iolmstat=\'Defined\')';
                    param['limit'] = 100000;
     
                    CallGet.CallGetPerformance(param, function(rest) { 

                        callback(null, rest ); 
                    });
    
                },
                function (arg, callback) {

                    Report.getAppStorageRelation( function (result )  {  
                       
                        for (var i in arg ) {
                            var item = arg[i];
                            for ( var j in result ) {
                                var appItem = result[j];
                                if (  appItem.array == item.device )
                                    item["arrayname"] = appItem.array_name;
                                if ( appItem.array == item.device && appItem.SG == item.sgname ) {
                                    if ( item["appname"] === undefined  ) 
                                        item.appname = appItem.app;
                                    else 
                                        item.appname = item.appname +"," + appItem.app
                                }
                            }
                        }
                        callback(null,arg);
    
    
                    });  
    
                }, function ( arg, callback ) {

                    var results = [];
                    for ( var i in arg ) {
                        var item = arg[i];

                        for ( var j in item.matrics ) {
                            var ioItem = item.matrics[j];
                            if ( ioItem.HostIOLimitExceededPercent > 0 ) {
                                var resItem = {};
                                resItem["id"] = item.device+":"+item.sgname+":"+ioItem.timestamp;
                                resItem["array"] = item.device;
                                resItem["arrayname"] = item.arrayname;
                                resItem["sgname"] = item.sgname;
                                resItem["iolimit"] = item.iolimit;
                                resItem["appname"] = item.appname;
                                resItem["timestamp"] = ioItem.timestamp;
                                resItem["HostIOLimitExceededPercent"] = ioItem.HostIOLimitExceededPercent;
                                resItem["acknowlaged"] = false;
                                resItem["commons"] = "";
 
                                var newRecord = new IOLimitEventObj(resItem);
                
                                newRecord.save(function(err, thor) {  
                                    if (err == 400 )  { 
                                        console.log("Duplicate Record : ", thor , " ; ignore insert." ); 
                                    }  else {
                                        //console.log('insert record :', resItem.id);
                                        results.push(resItem);
                                    }
                                }); 
                    
                            }
                        }
                    }

                    //console.log(results.length);
                    callback (null, results);
                }
            ], function (err, result) { 
                var output = {};
                output.begintime = start;
                output.endtime = end;
                output.InsertedRecords = result.length;
                res.json(200 ,output);
            });
    }); 


/**
 * @swagger
 * /api/event/performance/sg/iolimit/query:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 获取IOLimit超限的事件列表
 *     description: 只返回那些未"acknowlaged=false"的记录, 数据来源为后台每天定时任务的结果, 数据库表:mongodb:csmp:iolimitevents 
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json 
 *     responses:
 *       200:
 *         description: return an array of application list
 *         schema:
 *            type: array 
 */ 
    app.get('/api/event/performance/sg/iolimit/query', function (req, res) {   
        var acknowlaged_param = req.query.acknowlaged;
        if ( acknowlaged_param !== undefined ) {
            if ( acknowlaged_param == 'false' ) 
                var acknowlaged = false;
            else 
                var acknowlaged = true;
            var filter = { acknowlaged : acknowlaged };
        }
        else {
            var filter = {};
        } 

        var retData = {};

        async.waterfall(
            [
                function(callback){ 
                    console.log(filter);
                    IOLimitEventObj.find(filter).select({ "__v": 0, "_id": 0}).exec(  function (err, doc) {
                        //system error. 
                        if (err) {
                            return   done(err);
                        }
                        if (!doc) { //user doesn't exist. 
                            res.json(200,[]);
                        }
                        else {    
                            var resResult = [];
                            for ( var i in doc ) {
                                var item = doc[i];
                                var resItem={}
                                resItem["id"] = item.id;
                                resItem["eventCatalog"] = "性能";
                                resItem["eventName"] = "IOLimit Exceeded";
                                resItem["timestamp"] = item.timestamp;
                                resItem["eventDescription"] = "应用:[" + (item.appname===undefined?"unknow":item.appname) + "], 存储:["+(item.arrayname===undefined?item.array:item.arrayname)+"]; SG: [" + item.sgname + "] 超出IOLimit设定 ["+item.iolimit+"] " + item.HostIOLimitExceededPercent + "%";
                                resItem["acknowlaged"] = item.acknowlaged;
                                resItem["detailinfo"] = item;

                                resResult.push(resItem);
                                    
                            }

                            retData.detail = resResult;
                            res.json(200 ,retData); 
                        }
                    });   
                } ,
                function ( arg, callback ) {
                    callback (null, arg);

                }  
            ], function (err, result) {  

                res.json(200 ,result);
            });
                
    }); 


/**
 * @swagger
 * /api/event/performance/sg/iolimit/update:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 修改IOLimit事件数据中的acknowlaged字段内容
 *     description: 
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json 
 *     responses:
 *       200:
 *         description: return an array of application list
 *         schema:
 *            type: array 
 */ 
app.post('/api/event/performance/sg/iolimit/update', function (req, res) {   
        var reqBody = req.body;

        console.log(reqBody);

        IOLimitEventObj.findOne({"id" : reqBody.id}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("app is not exist. insert it."); 

                var newapp = new IOLimitEventObj(reqBody);
                console.log('Test1');
                newapp.save(function(err, thor) {
                console.log('Test2');
                if (err)  {
                    console.dir(thor);
                    return res.json(400 , err);
                } else 
                    return res.json(200, reqBody);
                });
            }
            else { 

                doc.update(reqBody, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(200 , {status: "The IOLimitEvent has exist! Update it."});
            }

        });     
            
}); 



/**
 * @swagger
 * /api/event/performance/sg/iolimit/statistics:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 统计IOLimit的总体情况
 *     description: 
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json 
 *     parameters:
 *       - in: query
 *         name: from
 *         description: 起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z 
 *     responses:
 *       200:
 *         description: return an array of application list
 *         schema:
 *            type: array 
 */ 
app.get('/api/event/performance/sg/iolimit/statistics', function (req, res) {   
    var filter; 
                //if ( filter === undefined ) filter = {acknowlaged: false};
    filter = {}; 
    IOLimitEventObj.find({}).select({ "__v": 0, "_id": 0}).exec(  function (err, doc) {
        //system error.
        console.log(err);
        if (err) {
            return   done(err);
        }
        if (!doc) { //user doesn't exist. 
            res.json(200,[]);
        }
        else {    
            var resResult = [];
            for ( var i in doc ) {
                var item = doc[i];
                var resItem={}
                resItem["id"] = item.id;
                resItem["eventCatalog"] = "性能";
                resItem["eventName"] = "IOLimit Exceeded";
                resItem["timestamp"] = item.timestamp;
                resItem["eventDescription"] = "应用[" + item.appname + "] 存储["+item.arrayname+"]-SG[" + item.sgname + "]超出设定["+item.iolimit+"] " + item.HostIOLimitExceededPercent + "%";
                resItem["acknowlaged"] = item.acknowlaged;
                resItem["detailinfo"] = item;

                resResult.push(resItem);
                    
            }
            res.json(200 ,resResult); 
        }
    });   
    
            
}); 


};

module.exports = eventController;
