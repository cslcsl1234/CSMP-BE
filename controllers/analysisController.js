"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('analysisController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');  
var util = require('../lib/util');
var mongoose = require('mongoose');

var async = require('async');
var App = require('../lib/App'); 
var topos = require('../lib/topos.js');
var Report = require('../lib/Reporting');
var CAPACITY = require('../lib/Array_Capacity');
var DeviceMgmt = require('../lib/DeviceManagement');
var VMAX = require('../lib/Array_VMAX');

var AppTopologyObj = mongoose.model('AppTopology');
 

var analysisController = function (app) {

    var config = configger.load();

    app.all('*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
        res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
        res.header('Access-Control-Expose-Headers', '*');

        debug('req.method = %s', req.method);     
        debug('req.url = %s', req.url); 

        if(req.method=="OPTIONS") res.send(200);  /*让options请求快速返回*/
        else  next();
    });

 


    app.get('/api/analysis/app/info', function (req, res) {
        res.setTimeout(3600*1000);
        var device;
        var config = configger.load();  
        async.waterfall(
            [

                function(callback){
                
                    var query = AppTopologyObj.find({}).select({ "metadata": 1, "data": 1,  "_id": 0});
                    query.exec(function (err, doc) {
                        //system error.
                        if (err) { 
                            res.json(500 , {status: err})
                        }
                        if (!doc) { //user doesn't exist.
                            res.json(200 , []); 
                        }
                        else {
                            var lastRecord ;
                            for ( var i in doc ) {
                                var item = doc[i];
                                var generateDT = new Date(item.metadata.generateDatetime);
                                if ( lastRecord === undefined ) {
                                    var lastRecord = item;
                                } else {
                                    var lastRecordgenerateDT = new Date(lastRecord.metadata.generateDatetime);
                                    if ( generateDT > lastRecordgenerateDT ) 
                                        lastRecord = item;
                                }

                            }

                            callback(null,lastRecord.data);
                            
                        }

                    });

                },  
                function(param,  callback){ 
                    var res = [];
                    DeviceMgmt.GetArrayAliasName(function(arrayinfo) {     
                        for ( var i in param ) {
                            var item = param[i];

                            var isfind = false;
                            for ( var j in res ) {
                                var resItem = res[j];
                                if ( resItem.app == item.app && resItem.array == item.array && resItem.SG == item.SG ) {
                                    isfind = true;
                                    break;
                                }
                            }

                            if ( isfind == false ) {
                                var resItem = {}; 
                                resItem.app = item.app;
                                resItem.array = item.array;
                                resItem.SG = item.SG;
                                resItem.array_name = "";

                                for ( var z in arrayinfo ) {
                                    if ( resItem.array == arrayinfo[z].storagesn ) {
                                        resItem.array_name = arrayinfo[z].name;
                                        resItem.array_level = arrayinfo[z].type;
                                        break;
                                    }
                                }
                                if ( resItem.array_level == 'high')
                                    res.push(resItem);
                            }
                        }

                        for ( var i in res ) {
                            if ( res[i].app == "" ) res[i].app = res[i].SG ;
                        }
                        callback(null,res);
                                   
                    });
                },
                function(param,  callback){ 
                    var res = [];
                     
                    for ( var i in  param ) {
                        var item = param[i];

                        var appIsFind = false ;
                        for ( var j in res ) {
                            var resItem = res[j];

                            // Applicate
                            if ( item.app == resItem.name ) {

                                appIsFind = true;
                                
                                var arrayIsFind = false ;
                                for ( var array_i in resItem.device ) {
                                    var arrayItem = resItem.device[array_i];

                                    // Array
                                    if ( arrayItem.sn == item.array ) {
                                        arrayIsFind = true;
                                        var sgIsFind = false ;
                                        for ( var sg_i in arrayItem.sg ) {
                                            var sgItem = arrayItem.sg[sg_i];
                                            if ( sgItem.name == item.SG ) {
                                                sgIsFind = true;
                                            }
                                        }
                                        if ( sgIsFind == true ) {
                                            var sgItemNew = {};
                                            sgItemNew.name = item.SG;
                                            sgItemNew.redo = "";
                                            arrayItem.sg.push(sgItemNew);
                                        }
                                    }
                                }
                                if ( arrayIsFind == false ) {
                                    var arrayItemNew = {};
                                    arrayItemNew.name = item.array_name;
                                    arrayItemNew.sn = item.array;
                                    arrayItemNew.sg = [];

                                    var sgItemNew = {};
                                    sgItemNew.name = item.SG;
                                    sgItemNew.redo = "";
                                    arrayItemNew.sg.push(sgItemNew);

                                    resItem.device.push(arrayItemNew);
                                }
                            }
                        }
                        if ( appIsFind == false  ){
                            var appItemNew = {};
                            appItemNew.name = item.app;
                            appItemNew.device = [];

                            var arrayItemNew = {};
                            arrayItemNew.name = item.array_name;
                            arrayItemNew.sn = item.array;
                            arrayItemNew.sg = [];

                            var sgItemNew = {};
                            sgItemNew.name = item.SG;
                            sgItemNew.redo = "";
                            arrayItemNew.sg.push(sgItemNew);

                            appItemNew.device.push(arrayItemNew);  
                            
                            res.push(appItemNew);
                        } 

                    }

                    callback(null,res);
                    //callback(null,param);
                },  
                function(arg1, callback) {
                    callback(null,arg1);
                } 
            ], function (err, result) {
                // result now equals 'done'
                var finalReturn = {};
                finalReturn.data = result
                res.json(200 , finalReturn );
            });

        
    });
            
 

    app.get('/api/analysis/app/workload', function (req, res) {  
        var device = req.query.storage_sn;
        var sgname = req.query.sg;

        if ( device === undefined ) {
            res.json(400, 'Must be special a storage!');
            return;
        };

        if ( sgname === undefined ) {
            res.json(400, 'Must be special a storage group!');
            return;
        }; 

        async.waterfall([
            function(callback){ 
                var period = 86400;
                var valuetype = 'max';
                var start  = util.getPerfStartTime();
                var end;
                VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function(rest) { 
                    
                    for ( var i in rest)   {
                        var item = rest[i];
                        if ( item.device == device && item.sgname == sgname ) 
                            callback(null,item);
                    }     
                      
                   
               // callback(null,rest);
                });
                //res.json(500 , {} );    
                
            }, 
            function(arg1,  callback){   
                    delete arg1.parttype;
                    delete arg1.matricsStat;
                    delete arg1.part;

                    callback(null,arg1);
            }, 
            function(arg1,  callback){
                var ret = {};
                ret.data = arg1; 
                callback(null,ret);
    
            }
        ], function (err, result) { 

            res.json(200, result );
        }); 

    });



    app.get('/api/analysis/part/workload', function (req, res) {  
        var device = req.query.storage_sn; 
        var start = req.query.from;
        var end = req.query.end;

        if ( device === undefined ) {
            res.json(400, 'Must be special a storage!');
            return;
        }; 

        async.waterfall([
            function(callback){  
                VMAX.getArrayPerformance1( function(result) {

                    for ( var i in result)   {
                        var item = result[i];
                        if ( item.device == device ) {
                            delete item.matricsStat;
                            item.CacheHit = item.matrics;
                            delete item.matrics;
                            for ( var i in item.CacheHit ) {
                                var item1 = item.CacheHit[i];
                                delete item1.WriteRequests ;
                                delete item1.WriteThroughput ;
                                delete item1.ReadRequests ;
                                delete item1.ReadThroughput ;
                            }
                            callback(null,item);
                        }
                            
                    }     
                       
                });
                //res.json(500 , {} );    
                
            },  
            function(arg1, callback ) { 
                var period = 86400;
                var valuetype = 'max';
                var start  = util.getPerfStartTime();
                var end;
                VMAX.GetDirectorPerformance(device, period, start, valuetype, function(result) { 
                    var resultFA = [];
                    for ( var j in result){
                        if ( result[j].partgrp== 'Front-End') 
                            resultFA.push(result[j])
                    }
                    for ( var i in resultFA ) {
                        var item = resultFA[i];
                        delete item.matricsStat;
                        delete item.partgrp;
                        delete item.parttype;
                        delete item.model;
                        delete item.device;

                        // Front-End Syscall
                        for ( var z in item.matrics ) {
                            item.matrics[z]["MBTransferred"] = ( item.matrics[z]["KBytesTransferred"] !== undefined ? item.matrics[z].KBytesTransferred / 1024 : 0 );
                            if (item.matrics[z].KBytesTransferred !== undefined )
                                delete item.matrics[z].KBytesTransferred;
                            item.matrics[z]["Syscall"] = 30;
                        }
                    };
                    arg1["FA-Director"] = resultFA;
                    callback(null,arg1);
                });
            },
            function(arg1,callback) {
                var qdepth = [];
                var qdepthItem = {};
                qdepthItem["timestamp"] = "1521676800";
                qdepthItem["Rang0"]  = 20;
                qdepthItem["Rang1"]  = 30;
                qdepthItem["Rang2"]  = 40;
                qdepthItem["Rang3"]  = 50; 
                
                qdepth.push(qdepthItem);

                var qdepthItem={};
                qdepthItem["timestamp"] = "1521763200";
                qdepthItem["Rang0"]  = 20;
                qdepthItem["Rang1"]  = 30;
                qdepthItem["Rang2"]  = 40;
                qdepthItem["Rang3"]  = 50; 
                
                qdepth.push(qdepthItem);


                arg1["QDepth"] = qdepth;
                callback(null,arg1);
            },
            function(arg1,  callback){
                var ret = {};
                ret.data = arg1; 
                callback(null,ret);
    
            }
        ], function (err, result) { 

            res.json(200, result );
        }); 

    });



    app.get('/api/analysis/part/deepwater', function (req, res) {  
        var device = req.query.storage_sn; 
        var start = req.query.from;
        var end = req.query.end;

        if ( device === undefined ) {
            res.json(400, 'Must be special a storage!');
            return;
        }; 

        async.waterfall([
            
            function( callback ) { 
                var period = 86400;
                var valuetype = 'max';
                var start  = util.getPerfStartTime();
                var end;
                VMAX.GetDirectorPerformance(device, period, start, valuetype, function(result) { 
                        // Group by partgrp
                        var resultNew = {};
                        for ( var i in result ) {
                            var item = result[i];
                            delete item.matricsStat;

                            if ( resultNew[item.partgrp] === undefined ) {
                                resultNew[item.partgrp] = [];
                            }
                            resultNew[item.partgrp].push(item);
                        }
                    callback(null,resultNew);
                });
            },
            function(arg1,callback) {

                callback(null,arg1);
            },
            function(arg1,  callback){
                var ret = {};
                ret.data = arg1; 
                callback(null,ret);
    
            }
        ], function (err, result) { 

            res.json(200, result );
        }); 

    });


};


module.exports = analysisController;
