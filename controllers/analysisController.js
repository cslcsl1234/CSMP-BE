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
var moment = require('moment');

var async = require('async');
var CallGet = require('../lib/CallGet');
var App = require('../lib/App'); 
var topos = require('../lib/topos.js');
var Report = require('../lib/Reporting');
var CAPACITY = require('../lib/Array_Capacity');
var DeviceMgmt = require('../lib/DeviceManagement');
var VMAX = require('../lib/Array_VMAX');

var AppTopologyObj = mongoose.model('AppTopology');
var ArraySGRedoVolumeObj = mongoose.model('ArraySGRedoVolume');

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


 
/**
 * @swagger
 * /api/analysis/app/info:
 *   get:
 *     tags:
 *       - analysis
 *     description: 返回应用系统及其相关的存储相关资源信息 
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json 
 *     responses:
 *       200:
 *         description: return an array of application list
 *         schema:
 *            type: array
 *            items:
 *                $ref: '#/definitions/ApplicationInfoItem'
 */ 
   
    app.get('/api/analysis/app/info', function (req, res) {
        res.setTimeout(3600*1000);
        var device;
        var config = configger.load();  
        async.waterfall(
            [

                function(callback){
                    console.log(moment.utc(Date.now()).format() + "TEST1");
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

                            //console.log(lastRecord.data);

                            callback(null,lastRecord.data); 
                        } 
                    }); 
                },  
                function( param, callback ) {  
 
                    ArraySGRedoVolumeObj.find( {} , {"appname":1, "device":1, "devicesn":1, "sgname":1, "redovol":1, "_id": 0 },  function (err, doc) {
                        //system error.
                        if (err) {
                            return   done(err);
                        }
                        if (!doc) { //user doesn't exist. 
                            console.log("is not exits!");
                        }
                        else {   
                            for ( var i in param ) {
                                var item = param[i];
                                if ( item.array === undefined ) continue;
                                for ( var j in doc ) {
                                    var redoItem = doc[j];
                                    if ( item.array == redoItem.devicesn && item.SG == redoItem.sgname ) {
                                        
                                    console.log(item.array +"|"+ redoItem.devicesn +"|"+ item.SG +"|"+ redoItem.sgname+"\t" +redoItem.redovol);
                                    item.redovol = redoItem.redovol;
                                    }
                                }
                            }  
                            callback(null, param); 
                        }
                    });   
                }, 
                function(param,  callback) { 
                    console.log(moment.utc(Date.now()).format() + "TEST1");
                    var res = [];
 
                    DeviceMgmt.GetArrayAliasName(function(arrayinfo) {      
                        for ( var i in param ) {
                            var item = param[i];
                            if ( item.array === undefined ) continue; 
 
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
                                resItem.redovol = (item.redovol===undefined?[]:item.redovol);
                                
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
                        console.log(moment.utc(Date.now()).format() + "TEST1.2");

                        for ( var i in res ) {
                            if ( res[i].app == "" ) res[i].app = res[i].SG ;
                        }
                        console.log(moment.utc(Date.now()).format() + "TEST1.4");
 
                        callback(null,res);
                                   
                    });
                },
                function(param,  callback){ 
                    console.log(moment.utc(Date.now()).format() + "TEST1");
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
                                            sgItemNew.redovol = item.redovol;
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
                                    sgItemNew.redovol = item.redovol;
                                    arrayItemNew.sg.push(sgItemNew);

                                    resItem.device.push(arrayItemNew);
                                }
                            }
                        }
                        if ( appIsFind == false  ) {
                            var appItemNew = {};
                            appItemNew.name = item.app;
                            appItemNew.device = [];

                            var arrayItemNew = {};
                            arrayItemNew.name = item.array_name;
                            arrayItemNew.sn = item.array;
                            arrayItemNew.sg = [];

                            var sgItemNew = {};
                            sgItemNew.name = item.SG;
                            sgItemNew.redovol = item.redovol;
                            arrayItemNew.sg.push(sgItemNew);

                            appItemNew.device.push(arrayItemNew);  
                            
                            res.push(appItemNew);
                        } 
                    }
                    callback(null,res); 
                },  
                function(arg1, callback) {
                    console.log(moment.utc(Date.now()).format() + "TEST1");

                    var result = [];
                    for ( var i in arg1 ) {
                        var item1 = arg1[i]; 
                        
                        for ( var j in item1.device ) {
                            var item2 = item1.device[j]; 

                            for ( var z in item2.sg ) {
                                var item3 = item2.sg[z];
 
                                var resultItem = {};
                                resultItem["appname"] = item1.name;
                                resultItem["device"] = item2.name;
                                resultItem["devicesn"] = item2.sn;
                                resultItem["sgname"] = item3.name;
                                resultItem["redovol"] = item3.redovol;

                                result.push(resultItem);
                                
                            }
                        }

                    }

                    callback(null,result);
                } 
            ], function (err, result) { 
                res.json(200 , result );
            });

        
    });
            
 

    app.get('/api/analysis/app/workload', function (req, res) { 
        res.setTimeout(3600*1000); 
        var device = req.query.storage_sn;
        var sgname = req.query.sg;


        if ( device === undefined || device == '' ) {
            res.json(400, 'Must be special a storage!');
            return;
        };

        if ( sgname === undefined || sgname == '' ) {
            res.json(400, 'Must be special a storage group!');
            return;
        }; 

        if ( req.query.from === undefined ||  !moment(req.query.from).isValid() ) {
            res.json(400, 'Must be special a valid start time!');
            return;            
        }

        if ( req.query.to === undefined ||  !moment(req.query.to).isValid() ) {
            res.json(400, 'Must be special a valid end time!');
            return;            
        }
        var start = moment(req.query.from).toISOString(); 
        var end = moment(req.query.to).toISOString();


        async.waterfall([
            function(callback){ 
                var period = 86400;
                var valuetype = 'max'; 
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
        var start = moment(req.query.from).toISOString(); 
        var end = moment(req.query.to).toISOString(); 

        if ( device === undefined ) {
            res.json(400, 'Must be special a storage!');
            return;
        }; 

        async.waterfall([
            function(callback){  
                var param = {}; 
                param['keys'] = ['device'];
                param['fields'] = ['name'];
                param['period'] = 86400;
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '!parttype&source=\'VMAX-Collector\'';
                param['filter_name'] = '(name==\'HitPercent\'|name==\'ReadRequests\'|name==\'WriteRequests\'|name==\'ReadThroughput\'|name==\'WriteThroughput\')';

        
                CallGet.CallGetPerformance(param, function(result) {   

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


            var CacheHit = result.data.CacheHit;
            var CacheHitResult = {};            

            for ( var i in CacheHit ) {
                var item = CacheHit[i]; 
                for ( var fieldName in item ) {  
                    var isfind = false ;
                    for ( var fieldName1 in CacheHitResult ) { 
                        if ( fieldName1 == fieldName ) {
                            CacheHitResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var CacheHitResultItem = [];  
                        CacheHitResultItem.push(item[fieldName]);
                        CacheHitResult[fieldName] = CacheHitResultItem; 

                    }
                }
            }

            var DirectorIOPS = result.data["FA-Director"];

            var DirectorIOPS1 = [];
            for ( var i in DirectorIOPS ) {
                var item = DirectorIOPS[i]; 

                for ( var j in item.matrics ) {
                    var item1 = item.matrics[j];

                    var isfind = false;
                    for ( var z in DirectorIOPS1 ) {
                        var itemResult = DirectorIOPS1[z];
                        if ( itemResult.timestamp == item1.timestamp ) {
                            isfind = true;
                            itemResult[item.part+"_ReadRequests"] = item1.ReadRequests;
                            itemResult[item.part+"_WriteRequests"] = item1.WriteRequests;
                            itemResult[item.part+"_MBTransferred"] = item1.MBTransferred;
                            
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var DirectorIOPSItem = {};
                        DirectorIOPSItem["timestamp"] = item1.timestamp;
    
                        DirectorIOPS1.push(DirectorIOPSItem);
                    }
                }
            }
            var DirectorIOPSResult = {}; 
            var DirectorMBPSResult = {}; 
  
            var DirectorSysCallResult = {}; 

            
            for ( var i in DirectorIOPS1 ) {
                var item = DirectorIOPS1[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("Requests") < 0 && fieldName.indexOf("timestamp")) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in DirectorIOPSResult ) { 
                        if ( fieldName1 == fieldName ) {
                            DirectorIOPSResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var DirectorIOPSResultItem = [];  
                        DirectorIOPSResultItem.push(item[fieldName]);
                        DirectorIOPSResult[fieldName] = DirectorIOPSResultItem; 
                    }
                }
            }
 
            for ( var i in DirectorIOPS1 ) {
                var item = DirectorIOPS1[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("MBTransferred") < 0  && fieldName.indexOf("timestamp") ) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in DirectorMBPSResult ) { 
                        if ( fieldName1 == fieldName ) {
                            DirectorMBPSResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var DirectorMBPSResultItem = [];  
                        DirectorMBPSResultItem.push(item[fieldName]);
                        DirectorMBPSResult[fieldName] = DirectorMBPSResultItem; 
                    }
                }
            }
 
 
            for ( var i in DirectorIOPS1 ) {
                var item = DirectorIOPS1[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("SysCallCount") < 0  && fieldName.indexOf("timestamp") ) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in DirectorSysCallResult ) { 
                        if ( fieldName1 == fieldName ) {
                            DirectorSysCallResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var DirectorSysCallResultItem = [];  
                        DirectorSysCallResultItem.push(item[fieldName]);
                        DirectorSysCallResult[fieldName] = DirectorSysCallResultItem; 
                    }
                }
            }
 
            var ret = {};
            ret.dataset = {};
            ret.dataset["CacheHit"] = CacheHitResult;
            ret.dataset["DirectorIOPS"] = DirectorIOPSResult;
            ret.dataset["DirectorMBPS"] = DirectorMBPSResult;
            ret.dataset["SysCall"] = DirectorSysCallResult;
            res.json(200, ret );


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
                        //res.json(200, resultNew );
                    callback(null,resultNew);
                });
            },
            function(arg1,callback) {
                var FAUtilSource = arg1["Front-End"];

                var FAUtils = [];
                for ( var i in FAUtilSource ) {
                    var item = FAUtilSource[i]; 
    
                    for ( var j in item.matrics ) {
                        var item1 = item.matrics[j];
    
                        var isfind = false;
                        for ( var z in FAUtils ) {
                            var itemResult = FAUtils[z];
                            if ( itemResult.timestamp == item1.timestamp ) {
                                isfind = true;
                                itemResult[item.part+"_ReadRequests"] = item1.CurrentUtilization;
                                itemResult[item.part+"_WriteRequests"] = item1.WriteRequests;
                                itemResult[item.part+"_CurrentUtilization"] = item1.CurrentUtilization;
                                
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var DirectorIOPSItem = {};
                            DirectorIOPSItem["timestamp"] = item1.timestamp;
        
                            FAUtils.push(DirectorIOPSItem);
                        }
                    }
                } 

                var RDFUtilSource = arg1["RDF"];

                var RDFUtils = [];
                for ( var i in RDFUtilSource ) {
                    var item = RDFUtilSource[i]; 
    
                    for ( var j in item.matrics ) {
                        var item1 = item.matrics[j];
    
                        var isfind = false;
                        for ( var z in RDFUtils ) {
                            var itemResult = RDFUtils[z];
                            if ( itemResult.timestamp == item1.timestamp ) {
                                isfind = true;
                                itemResult[item.part+"_ReadRequests"] = item1.CurrentUtilization;
                                itemResult[item.part+"_WriteRequests"] = item1.WriteRequests;
                                itemResult[item.part+"_CurrentUtilization"] = item1.CurrentUtilization;
                                
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var DirectorIOPSItem = {};
                            DirectorIOPSItem["timestamp"] = item1.timestamp;
        
                            RDFUtils.push(DirectorIOPSItem);
                        }
                    }
                } 

                
                var BEUtilSource = arg1["Back-End"]; 
                var BEUtils = [];
                for ( var i in BEUtilSource ) {
                    var item = BEUtilSource[i]; 
    
                    for ( var j in item.matrics ) {
                        var item1 = item.matrics[j];
    
                        var isfind = false;
                        for ( var z in BEUtils ) {
                            var itemResult = BEUtils[z];
                            if ( itemResult.timestamp == item1.timestamp ) {
                                isfind = true;  
                                itemResult[item.part+"_CurrentUtilization"] = item1.CurrentUtilization;
                                
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var DirectorIOPSItem = {};
                            DirectorIOPSItem["timestamp"] = item1.timestamp;
        
                            BEUtils.push(DirectorIOPSItem);
                        }
                    }
                } 

                var result = {};
                result["FA"] = FAUtils;
                result["RDF"] = RDFUtils;
                result["BE"] = BEUtils;
                callback(null,result);
            },
            function(arg1,  callback){ 

                var FAUtilResult = {}; 

                for ( var i in arg1.FA ) {
                    var item = arg1.FA[i]; 
                    for ( var fieldName in item ) { 
                        if ( fieldName.indexOf("CurrentUtilization") < 0 && fieldName.indexOf("timestamp")) continue; 
    
                        var isfind = false ;
                        for ( var fieldName1 in FAUtilResult ) { 
                            if ( fieldName1 == fieldName ) {
                                FAUtilResult[fieldName1].push(item[fieldName]);
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var FAUtilResultItem = [];  
                            FAUtilResultItem.push(item[fieldName]);
                            FAUtilResult[fieldName] = FAUtilResultItem; 
                        }
                    }
                }

                var RDFUtilResult = {}; 
                for ( var i in arg1.RDF ) {
                    var item = arg1.RDF[i]; 
                    for ( var fieldName in item ) { 
                        if ( fieldName.indexOf("CurrentUtilization") < 0 && fieldName.indexOf("timestamp")) continue; 
    
                        var isfind = false ;
                        for ( var fieldName1 in RDFUtilResult ) { 
                            if ( fieldName1 == fieldName ) {
                                RDFUtilResult[fieldName1].push(item[fieldName]);
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var FAUtilResultItem = [];  
                            FAUtilResultItem.push(item[fieldName]);
                            RDFUtilResult[fieldName] = FAUtilResultItem; 
                        }
                    }
                }

                var BEUtilResult = {}; 
                for ( var i in arg1.RDF ) {
                    var item = arg1.RDF[i]; 
                    for ( var fieldName in item ) { 
                        if ( fieldName.indexOf("CurrentUtilization") < 0 && fieldName.indexOf("timestamp")) continue; 
    
                        var isfind = false ;
                        for ( var fieldName1 in BEUtilResult ) { 
                            if ( fieldName1 == fieldName ) {
                                BEUtilResult[fieldName1].push(item[fieldName]);
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var FAUtilResultItem = [];  
                            FAUtilResultItem.push(item[fieldName]);
                            BEUtilResult[fieldName] = FAUtilResultItem; 
                        }
                    }
                }
                var result = {};
                result["Front-End"] = FAUtilResult;
                result["RDF"] = RDFUtilResult;
                result["Back-End"] = BEUtilResult;

                callback(null,result);
    
            }
        ], function (err, result) { 

            res.json(200, result );
        }); 

    });

    app.get('/api/analysis/storage/volume/top10', function (req, res) {  
        var device = req.query.storage_sn; 
        var sgname = req.query.sg;
        var start = moment(req.query.from).toISOString(); 
        var end = moment(req.query.to).toISOString(); 

        if ( device === undefined ) {
            res.json(400, 'Must be special a storage!');
            return;
        };

        if ( sgname === undefined ) {
            res.json(400, 'Must be special a storage group!');
            return;
        }; 

        async.waterfall([
            
            function( callback ) { 
                var param = {};  
                param['keys'] = ['device','sgname','lunname']; 
                param['field'] = ['sgcount','iolimit']; 
                param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'StorageGroupToLUN\')';
                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&sgname==\''+sgname+'\'&'+param.filter;
                }  
                
                CallGet.CallGet(param, function(param) {
                    var luns = [];
                    for ( var i in param.result ) {
                        var item = param.result[i];
                        luns.push(item.lunname);
                    }
                    callback(null,luns);
                } );

            },
            function(arg1,callback) {
                var lunlist;
                for ( var i in arg1 ) { 
                    var lun = arg1[i];
                    if ( lunlist === undefined ) 
                        lunlist = 'part==\''+lun + '\'';
                    else 
                        lunlist = lunlist + '|part==\''+lun + '\'';
                }
                var param = {}; 
                param['keys'] = ['device','part'];
                param['fields'] = ['name'];
                param['period'] = 86400;
                param['start'] = start;
                param['end'] = end;
                param['filter'] =  'device==\''+device+'\'&(' + lunlist + ')&(parttype==\'LUN\'|parttype==\'MetaMember\')';
                param['filter_name'] = '(name==\'HitPercent\'|name==\'ReadRequests\'|name==\'WriteRequests\'|name==\'ReadThroughput\'|name==\'WriteThroughput\')';

                CallGet.CallGetPerformance(param, function(param) {  
                    callback(null, param ); 
                }); 
            },
            function(arg,  callback){ 
                for ( var i in arg ) {
                    var item = arg[i];
                    for ( var j=0; j<arg.length-1-i;j++) {
                        var item1 = arg[j];
                        if ( ( arg[j].matricsStat.ReadRequests.max + arg[j].matricsStat.WriteRequests.max )  < ( arg[j+1].matricsStat.ReadRequests.max + arg[j+1].matricsStat.WriteRequests.max ) ) {
                            var temp = arg[j+1];
                            arg[j+1] = arg[j];
                            arg[j] = temp;
                        }
                    }
    
                }

                callback(null,arg);
    
            } 
        ], function (err, result) { 

            res.json(200, result );
        }); 

    });

};


module.exports = analysisController;
