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
var sortBy = require('sort-by');


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
var Analysis = require('../lib/analysis');

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
 *     summary: 应用系统及资源列表
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
   
    app.get('/api/analysis/app/info_old', function (req, res) {
        res.setTimeout(3600*1000);
        var device;
        var config = configger.load();  
        async.waterfall(
            [
                function(callback){
                    console.log(moment.utc(Date.now()).format() + " Begin Query mongodb ...");
                    var query = AppTopologyObj.find({}).sort({"metadata.generateDatetime":-1}).limit(1).select({ "metadata": 1, "data": 1,  "_id": 0});
                    query.exec(function (err, doc) {
                        //system error.
                        if (err) { 
                            res.json(500 , {status: err})
                        }
                        if (!doc) { //user doesn't exist.
                            res.json(200 , []); 
                        }
                        else {
                            console.log(moment.utc(Date.now()).format() + " mongodb has return. ");
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
                            console.log(moment.utc(Date.now()).format() + " It has got the last record.");

                            //console.log(lastRecord.data); 
                            callback(null,lastRecord.data); 
                        } 
                    }); 
                },  
                function( param, callback ) {  
                    console.log(moment.utc(Date.now()).format() + " Begin Query REDO volumes in Mongodb ...");
 
                    ArraySGRedoVolumeObj.find( {} , {"appname":1, "device":1, "devicesn":1, "sgname":1, "redovol":1, "_id": 0 },  function (err, doc) {
                        //system error.
                        if (err) {
                            return   done(err);
                        }
                        if (!doc) { //user doesn't exist. 
                            console.log("is not exits!");
                        }
                        else {   
                            var results = [];
                            for ( var i in param ) {
                                var item = param[i];
                                if ( item.array === undefined ) continue;
                                for ( var j in doc ) {
                                    var redoItem = doc[j];
                                    if ( item.array == redoItem.devicesn && item.SG == redoItem.sgname ) {
                                        
                                   // console.log(item.array +"|"+ redoItem.devicesn +"|"+ item.SG +"|"+ redoItem.sgname+"\t" +redoItem.redovol);
                                        item.redovol = redoItem.redovol;
                                    }
                                }

                                var resItem = {}; 
                                resItem.app = item.app;
                                resItem.array = item.array;
                                resItem.SG = item.SG;
                                resItem.volumes = item.devices;
                                resItem.array_name = ""; 
                                resItem.array_level = "";
                                resItem.redovol = (item.redovol===undefined?[]:item.redovol);
                                
                                results.push(resItem);

                            }
                            

                            callback(null, results); 
                        }
                    });   
                }, 
                function(param,  callback) {  
                    console.log(moment.utc(Date.now()).format() + " Begin get array alias name ...");

                    var res = [];
 
                    DeviceMgmt.GetArrayAliasName(function(arrayinfo) {  
                         
                        //console.log(arrayinfo);
                        for ( var i in param ) {
                            var resItem = param[i]; 
                            
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
                                            sgItemNew.volumes = item.volumes;
                                            sgItemNew.redovol = item.redovol;
                                            sgItemNew.FEDirector = item.FEDirector;
                                            arrayItem.sg.push(sgItemNew);
                                        }
                                    }
                                }
                                if ( arrayIsFind == false ) {
                                    var arrayItemNew = {};
                                    arrayItemNew.name = item.array_name;
                                    arrayItemNew.sn = item.array;
                                    arrayItemNew.model = item.model;
                                    arrayItemNew.sg = [];

                                    var sgItemNew = {};
                                    sgItemNew.name = item.SG;
                                    sgItemNew.volumes = item.volumes;
                                    sgItemNew.redovol = item.redovol;
                                    sgItemNew.FEDirector = item.FEDirector;
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
                            arrayItemNew.model = item.model;
                            arrayItemNew.sg = [];

                            var sgItemNew = {};
                            sgItemNew.name = item.SG;
                            sgItemNew.volumes = item.volumes;
                            sgItemNew.redovol = item.redovol;
                            sgItemNew.FEDirector = item.FEDirector;
                            arrayItemNew.sg.push(sgItemNew);

                            appItemNew.device.push(arrayItemNew);  
                            
                            res.push(appItemNew);
                        } 
                    }
                    callback(null,res); 
                },  
                function(arg1, callback) { 

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
                                resultItem["model"] = item2.model;
                                resultItem["sgname"] = item3.name;
                                resultItem["volumes"] = item3.volumes;
                                resultItem["redovol"] = item3.redovol;
                                resultItem["FEDirector"] = item3.FEDirector;

                                result.push(resultItem);
                                
                            }
                        }

                    }

                    var finalResult = [];

                    for ( var i in result ) {
                        var item = result[i];
                        var isfind = false;
                        for ( var j in finalResult ) {
                            var item1 = finalResult[j];
                            if ( item.devicesn == item1.devicesn && item.sgname == item1.sgname ) {
                                isfind = true;
                                break;
                            } 
                        }
                        if ( isfind == false ) {
                            finalResult.push(item);
                        }
                    }

                    callback(null,finalResult);
                }, 
                function( arg , callback ) {
                    var param = {};  
                    param['keys'] = ['device','model']; 
                    param['field'] = ['model']; 
                    param['filter'] = '!parttype&devtype=\'Array\'';
                    
                    CallGet.CallGet(param, function(arrays) { 

                        for ( var j in arg ) {
                            var arrayItem = arg[j];

                            for ( var i in arrays.result ) {
                                var item = arrays.result[i];

                                
                                if ( item.device == arrayItem.devicesn ) {
                                    //console.log(item.device+"\t"+arrayItem.devicesn);
                                    arrayItem["model"] = item.model;
                                    break;
                                }
                            }
                        }
                       // console.log(arg);
                        callback(null,arg);
                    } );
                }, 
                function ( arg , callback ) {
                    var query = AppTopologyObj.find({}).sort({"metadata.generateDatetime":-1}).limit(1).select({ "metadata": 1, "data": 1,  "_id": 0});
                    query.exec(function (err, doc) {
                        //system error.
                        if (err) { 
                            res.json(500 , {status: err})
                        }
                        if (!doc) { //user doesn't exist.
                            res.json(200 , []); 
                        }
                        else {
                            console.log(moment.utc(Date.now()).format() + " mongodb has return. ");
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
                            console.log(moment.utc(Date.now()).format() + " It has got the last record.");

                            //console.log(lastRecord.data);
                            var relaFE = {};

                            for ( var i in lastRecord.data ) {
                                var item = lastRecord.data[i];
                                if ( item.arraytype != 'high') continue;

                                var director = item.arrayport.split(':')[0];

                                if ( relaFE[item.array] === undefined ) relaFE[item.array] = {};
                                if ( relaFE[item.array][item.SG] === undefined ) relaFE[item.array][item.SG] = director;
                                else {
                                    if ( relaFE[item.array][item.SG].indexOf(director) < 0 ) 
                                        relaFE[item.array][item.SG] += ',' + director;
                                }

                            } 
                            for ( var i in arg ) {
                                var item = arg[i];
                                item["FEDirector"] = relaFE[item.devicesn][item.sgname];
                            }
                            callback(null,arg); 
                        } 
                    }); 
                }
            ], function (err, result) { 
                res.json(200 , result );
            });

        
    });
            
 

   
    app.get('/api/analysis/app/info', function (req, res) {
        res.setTimeout(3600*1000);
        var device;
        var config = configger.load();  
        async.waterfall(
            [

                function(callback){
                    console.log(moment.utc(Date.now()).format() + " Begin Query mongodb ...");
                    var query = AppTopologyObj.find({}).sort({"metadata.generateDatetime":-1}).limit(1).select({ "metadata": 1, "data": 1,  "_id": 0});
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
                                console.log(moment.utc(Date.now()).format() + " mongodb has return. ");
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
                            console.log(moment.utc(Date.now()).format() + " It has got the last record.");

                            console.log(lastRecord.metadata); 
                            console.log(lastRecord.data.length);
                            callback(null,lastRecord.data); 
                        } 
                    }); 
                },
                function( arg, callback ) {
 
                    var ret = [];
                    for ( var i in arg ) {
                        var item = arg[i];  
                        //if ( item.arraytype != 'high' ) continue;
                        if ( item.array === undefined ) continue;
                        if ( item.array.indexOf("VNX") >= 0 ) continue;
                        var isfind = false;
                        for ( var j in ret ) {
                            var retItem = ret[j];
                            if ( 
                                retItem.appname == item.app &&
                                retItem.device == item.arrayname &&
                                retItem.devicesn == item.array &&
                                retItem.sgname == item.SG
                            ) {
                                var director = item.arrayport===undefined ? "": item.arrayport.split(':')[0];
                                if ( retItem.FEDirector.indexOf(director) < 0 ) 
                                    retItem.FEDirector += ',' + director;
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var retItem = {};
                            retItem["appname"] = item.app;
                            retItem["device"] = item.arrayname===undefined ? item.array : item.arrayname ;
                            retItem["devicesn"] = item.array ;
                            retItem["model"] = "";
                            retItem["sgname"] =  item.SG; 
                            retItem["volumes"] = item.devices;
                            retItem["redovol"] = [];
                            var director = item.arrayport===undefined? "":item.arrayport.split(':')[0];
                            retItem["FEDirector"] = director;
                            retItem["Capacity"] = item.Capacity;
                            ret.push(retItem);
                        }
                    }
                    console.log("Step 3: " , ret.length);
                    callback(null,ret); 
                } ,
                function( arg , callback ) {
                    var param = {};  
                    param['keys'] = ['device','model']; 
                    param['field'] = ['model']; 
                    param['filter'] = '!parttype&devtype=\'Array\'';
                    
                    CallGet.CallGet(param, function(arrays) { 

                        for ( var j in arg ) {
                            var arrayItem = arg[j];

                            for ( var i in arrays.result ) {
                                var item = arrays.result[i];

                                if ( item.device == arrayItem.devicesn ) {
                                    //console.log(item.device+"\t"+arrayItem.devicesn);
                                    arrayItem["model"] = item.model;
                                    break;
                                }
                            }
                        }
                       // console.log(arg);
                        callback(null,arg);
                    } );
                },
                function( param, callback ) {  
                    console.log(moment.utc(Date.now()).format() + " Begin Query REDO volumes in Mongodb ...");
 
                    ArraySGRedoVolumeObj.find( {} , {"appname":1, "device":1, "devicesn":1, "sgname":1, "redovol":1, "_id": 0 },  function (err, doc) {
                        //system error.
                        if (err) {
                            return   done(err);
                        }
                        if (!doc) { //user doesn't exist. 
                            console.log("is not exits!");
                        }
                        else {   
                            var results = [];
                            for ( var i in param ) {
                                var item = param[i];
                                if ( item.array === undefined ) continue;
                                for ( var j in doc ) {
                                    var redoItem = doc[j];
                                    if ( item.array == redoItem.devicesn && 
                                         item.SG == redoItem.sgname  
                                        ) {
                                        
                                   // console.log(item.array +"|"+ redoItem.devicesn +"|"+ item.SG +"|"+ redoItem.sgname+"\t" +redoItem.redovol);
                                        item.redovol = redoItem.redovol;
                                    }
                                }
                            }  
                        }
                        callback(null, param); 
                    });   
                }
            ], function (err, result) { 
                res.json(200 , result );
            });

        
    });
         

/**
 * @swagger
 * /api/analysis/app/workload:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 应用负载
 *     description: 返回应用性能负载相关性能指标数据.包括该应用所属Storage Group的"读/写响应时间", "读/写IOPS","读/写MBPS", "Redo卷的IOPS与MBPS"
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: sg
 *         description: Storage Group名称
 *         required: true
 *         type: string 
 *         example: AWPDB_NEW_SG
 *       - in: query
 *         name: volumes
 *         description: Volume列表
 *         required: true
 *         type: string 
 *         example: 1E8B,1E93,1E8F,1E9B,1E97,1EA3,1E9F,1EAB,1EA7,1EB3,1EAF,1EBB,1EB7,1EC3,1EBF,1ECB,1EC7,1ED3,1ECF,1EDB,1ED7,1EE3,1EDF,1EEB,1EE7,1EF3,1EEF,1EFB,1EF7,1F03,1EFF,1F0B,1F07,1F13,1F0F,1F1B,1F17,1F23,1F1F,1F2B,1F27,1F33,1F2F,1F3B,1F37,1F43,1F3F,1F4B,1F47,1F53,1F4F,1F5B,1F57,1F63,1F5F,1F6B,1F67,1F73,1F6F,1F7B,1F77,1F83,1F7F,1F8B,1F87,1F93,1F8F,1F9B,1F97,1FA3,1F9F,1FAB,1FA7,1FB3,1FAF,1FBB,1FB7,1FC3,1FBF,1FCB,1FC7,1FD3,1FCF,1FDB,1FD7,1FE3,1FDF,1FEB,1FE7,1FF3,1FEF,1FFB,1FF7,2003,1FFF,200B,2007,2013,200F,201B,2017,2023,201F,202B,2027,2033,202F,203B,2037,2043,203F,204B,2047,2053,204F,205B,2057,2063,205F,206B,2067,2073,206F,207B,2077,2083,207F,208B,2087,2093,208F,209B,2097,21E3,21DF,21EB,21E7,21F3,21EF,21FB,21F7,2203,21FF,220B,2207,2213,220F,221B,2217,2223,221F,222B,2227,2233,222F,223B,2237,2243,223F,2507,2247,250F,250B,2517,2513,251F,251B,2527,2523,252F,252B,2537,2533,253F,253B,2547,2543,254F,254B,2557,2553,255F,255B,2567,2563,256F,256B,2577,2573,257F,257B,2587,2583,258F,258B,2597,2593,259F,259B,25A7,25A3,25AF,25AB,25B7,25B3,25BF,25BB,25C7,25C3,25CF,25CB,25D7,25D3,25DF,25DB,25E7,25E3,25EF,25EB,25F7,25F3,25FF,25FB,2607,2603,260F,260B,2617,2613,261F,261B,2627,2623,262F,262B,2637,2633,263F,263B,2647,2643,264F,264B,2657,2653,265F,265B,2667,2663,266F,266B,2677,2673,267F,267B,2687,2683,268F,268B,2697,2693,269F,269B,26A7,26A3,26AF,26AB,26B7,26B3,26BF,26BB,26C7,26C3,26CF,26CB,26D7,26D3,26DF,26DB,26E7,26E3,26EF,26EB,26F7,26F3,26FF,26FB,2707,2703,270F,270B,2717,2713,271F,271B,2727,2723,272F,272B,2737,2733,273F,273B,2747,2743,274F,274B,2757,2753,275F,275B,2767,2763,276F,276B,2777,2773,277F,277B,2787,2783,278F,278B,2797,2793,279F,279B,27A7,27A3,27AF,27AB,27B7,27B3,27BF,27BB,27C7,27C3,27CF,27CB,27D7,27D3,27DF,27DB,27E7,27E3,27EF,27EB,27F7,27F3,27FF,27FB,2807,2803,280F,280B,2817,2813,281F,281B,2827,2823,282F,282B,2837,2833,283F,283B,2847,2843,284F,284B,2857,2853,285F,285B,2867,2863,286F,286B,2877,2873,287F,287B,2887,2883,288F,288B,2897,2893,289F,289B,28A7,28A3,28AF,28AB,28B7,28B3,28BF,28BB,28C7,28C3,28CF,28CB,28D7,28D3,28DF,28DB,28E7,28E3,28EF,28EB,28F7,28F3,28FF,28FB,2907,2903,290F,290B,2917,2913,291F,291B,2927,2923,292F,292B,2937,2933,293F,293B,2947,2943,294F,294B,2957,2953,295F,295B,2967,2963,296F,296B,2977,2973,297F,297B,2987,2983,298F,298B,2997,2993,299F,299B,29A7,29A3,29AF,29AB,29B7,29B3,29BF,29BB,29C7,29C3,29CF,29CB,29D7,29D3,29DF,29DB,29E7,29E3,2B6B,2B67,2B73,2B6F,2B7B,2B77,2B83,2B7F,2B8B,2B87,2B93,2B8F,2B9B,2B97,2BA3,2B9F,2BAB,2BA7,2BB3,2BAF,2BBB,2BB7,2BC3,2BBF,2BCB,2BC7,2BD3,2BCF,2BDB,2BD7,2BE3,2BDF,2BEB,2BE7,2BF3,2BEF,2BFB,2BF7,2C03,2BFF,2C0B,2C07,2C13,2C0F,2C1B,2C17,2C23,2C1F,2C2B,2C27,2C33,2C2F,2C3B,2C37,2C43,2C3F,2C4B,2C47,2C53,2C4F,2C5B,2C57,2C63,2C5F,2C6B,2C67,2C73,2C6F,2C7B,2C77,2C83,2C7F,2C8B,2C87,2C93,2C8F,2C9B,2C97,2CA3,2C9F,2CAB,2CA7,2CB3,2CAF,2CBB,2CB7,2CC3,2CBF,2CCB,2CC7,2CD3,2CCF,2CDB,2CD7,2CE3,2CDF,2CEB,2CE7,2CF3,2CEF,2CFB,2CF7,2D03,2CFF,2D0B,2D07,2D13,2D0F,2D1B,2D17,2D23,2D1F,2D2B,2D27,2FE3,2FDF,2FEB,2FE7,2FF3,2FEF,2FFB,2FF7,3003,2FFF,300B,3007,3013,300F,301B,3017,3023,301F,302B,3027,3033,302F,303B,3037,3043,303F,304B,3047,3053,304F,305B,3057,3063,305F,306B,3067,3073,306F,307B,3077
 *       - in: query
 *         name: redovol
 *         description: Redo卷列表
 *         required: true
 *         type: array 
 *         items:
 *             type: string
 *         example: [1E8B,1E8F,1E9B,1EA3]
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z
 *     responses:
 *       200:
 *         description: return the workload of specical array and storage group
 */ 

    app.get('/api/analysis/app/workload', function (req, res) { 
        res.setTimeout(300*1000); 
        var appname = req.query.appname;
        var device = req.query.devicesn;
        var sgname = req.query.sg;
        var redovols = req.query.redovol.split(',');

        if ( appname === undefined || appname == '' ) {
            res.json(400, 'Must be special a appname!');
            return;
        };
        if ( device === undefined || device == '' ) {
            res.json(400, 'Must be special a storage!');
            return;
        };

        if ( sgname === undefined || sgname == '' ) {
            res.json(400, 'Must be special a storage group!');
            return;
        }; 

        if ( redovols === undefined || redovols == '' ) {
            res.json(400, 'Must be special a redo volumes!');
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
                var period = util.getPeriod(start,end);
                var valuetype = 'max'; 
                VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function(rest) { 
                    
                    for ( var i in rest)   {
                        var item = rest[i];
                        if ( item.device == device && item.sgname == sgname ) {

                            var matrics = item.matrics;

                            var finalResult = {};
                            var ResponseTime = [];
                            var IOPS = [];
                            var MBPS = [];
                        
                            for ( var i in matrics ) {
                                var matricsItem = matrics[i];

                                var timestamp = matricsItem.timestamp;

                                // --- ResponseTime ---
                                var ResponseTimeItem = {};
                                ResponseTimeItem["timestamp"] = timestamp;
                                ResponseTimeItem["ResponseTime"] = matricsItem.ResponseTime;
                                ResponseTime.push(ResponseTimeItem);

                                // --- IOPS ----
                                var IOPSItem = {};
                                IOPSItem["timestamp"] = timestamp;
                                IOPSItem["ReadRequests"] = matricsItem.ReadRequests;
                                IOPSItem["WriteRequests"] = matricsItem.WriteRequests;
                                IOPS.push(IOPSItem);

                                // --- MBPS ----
                                var MBPSItem = {};
                                MBPSItem["timestamp"] = timestamp;
                                MBPSItem["ReadThroughput"] = matricsItem.ReadThroughput;
                                MBPSItem["WriteThroughput"] = matricsItem.WriteThroughput;
                                MBPS.push(MBPSItem);
                                

                            }
                                
                            var ResponseTimeResult = {};
                            ResponseTimeResult["Title"] = "ResponseTime";
                            ResponseTimeResult["dataset"] = ResponseTime;

                            var IOPSResult = {};
                            IOPSResult["Title"] = "IOPS";
                            IOPSResult["dataset"] = IOPS;

                            var MBPSResult = {};
                            MBPSResult["Title"] = "MBPS";
                            MBPSResult["dataset"] = MBPS;

                            finalResult["ResponseTime"] = ResponseTimeResult;
                            finalResult["MBPS"] = MBPSResult;
                            finalResult["IOPS"] = IOPSResult;

                            callback(null,finalResult);
                        }
                            
                    }     
                       
                });    
            } ,
            function(arg1,  callback){ 
                // Get Redo Volumes Performance 
                var part; 
                for ( var i in redovols ) {
                    var item = redovols[i];
                    if ( part === undefined ) part = "part=\'"+item+"\'"
                    else part = part + "|" + "part=\'"+item+"\'"
                }
                if ( part !== undefined ) part = "(" + part +")";

                var param = {};
                param['device'] = device;
                param['period'] = util.getPeriod(start,end);
                param['start'] = start;
                param['end'] = end;
                param['type'] = 'max';
                param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
                param['keys'] = ['device','part']; 
                param['fields'] = ['disktype'];  
                param['filter'] = (part===undefined?"":part+"&") + 'parttype=\'LUN\'';
 
                CallGet.CallGetPerformance(param, function(param) {  

                    var REDO = [];
                    for ( var i in param ) {
                        var item = param[i];
                        var redovolname = item.part;

                        for ( var j in item.matrics ) {
                            var matricsItem = item.matrics[j];
                            var isfind = false;

                            for ( var z in REDO ) {
                                var redoItem = REDO[z];
                                if ( redoItem.timestamp == matricsItem.timestamp ) {
                                    redoItem[redovolname+"_WriteResponseTime"]  = matricsItem.WriteResponseTime;
                                    redoItem[redovolname+"_WriteRequests"]  = matricsItem.WriteRequests;
                                    redoItem[redovolname+"_WriteThroughput"]  =  matricsItem.WriteThroughput;
                                    isfind = true;
                                }
                            }

                            if ( isfind == false ) {
                                var redoItem = {};
                                redoItem["timestamp"] = matricsItem.timestamp;
                                redoItem[redovolname+"_WriteResponseTime"]  = matricsItem.WriteResponseTime;
                                redoItem[redovolname+"_WriteRequests"]  = matricsItem.WriteRequests;
                                redoItem[redovolname+"_WriteThroughput"]  =  matricsItem.WriteThroughput;
                                REDO.push(redoItem);
                            }
                        
                        }
                    }
                    var REDOResult = {};
                    REDOResult["Title"] = "REDO volume performance";
                    REDOResult["charttype"] = "MultipleValue";
                    REDOResult["dataset"] = REDO;
                    arg1["REDO"] = REDOResult;

                    callback(null, arg1 ); 
                });

            }
            , function ( arg, callback ) {
                for ( var fieldname in arg ) {
                    for ( var i in arg[fieldname].dataset ) {
                        var item = arg[fieldname].dataset[i];
                        item['timestamp'] = moment.unix(item.timestamp).format('YYYY-MM-DD HH')
                    }
                }
                callback(null,arg);
            }
        ], function (err, result) { 

            res.json(200, result );
        }); 

    });



/**
 * @swagger
 * /api/analysis/part/workload:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 存储构件状态
 *     description: 返回应用性能负载相关的存储端口控制器(前,后,RDF)的相关性能状态
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000497000437
 *       - in: query
 *         name: sgname
 *         description: Storage name
 *         required: true
 *         type: string
 *         example: ECM_DB_SG
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z
 *     responses:
 *       200:
 *         description: return the workload of specical array and storage group
 */ 

    app.get('/api/analysis/part/workload', function (req, res) {  
        var device = req.query.devicesn;  
        var sgname = req.query.sgname;

        if ( device === undefined | device == null ) {
            res.json(400, 'Must be special a storage!');
            return;
        }; 

        if ( sgname === undefined | sgname == null ) {
            res.json(400, 'Must be special a sgname!');
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

        var period = util.getPeriod(start,end);
        var valuetype = 'max'; 

        async.waterfall([
            function(callback) {
                var param = {};  
                param['keys'] = ['device','sgname','srdfrgrp'];  
                param['filter'] = '(datagrp=\'VMAX-RDFREPLICAS\'&parttype=\'LUN\')';
                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&sgname==\''+sgname+'\'&'+param.filter;
                }  
  
                var result = {};
                CallGet.CallGet(param, function(param) {

                    if ( param.result.length > 0 ) 
                        result["relaObj"] = param.result[0]; 
                    else {
                        result["relaObj"] = {};
                        result.relaObj["device"] = device;
                        result.relaObj["sgname"] = sgname;
                    }
                        
                    callback(null,result);
                } );

            },
            function(arg, callback) {
                var param = {};  
                param['keys'] = ['device','sgname','initgrp'];  
                param['filter'] = '(datagrp=\'VMAX-ACCESS\')';
                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&sgname==\''+sgname+'\'&'+param.filter;
                }  
   
                CallGet.CallGet(param, function(param) {
                    var initgrp;
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        if ( initgrp === undefined ) initgrp = item.initgrp;
                        else initgrp += ',' + item.initgrp;

                    }

                    arg.relaObj["initgrp"] = initgrp;
                        
                    callback(null,arg);
                } );

            },
            function(arg, callback) {

                var initgrps = arg.relaObj.initgrp;
                var initgrp = initgrps.split(',');
                var initgrp_filter;
                for ( var i in initgrp ) {
                    var initgrpname = initgrp[i];
                    if ( initgrp_filter === undefined ) {
                        initgrp_filter = 'initgrp=\'' + initgrpname + '\'';
                    } else {
                        initgrp_filter += '|initgrp=\'' + initgrpname + '\'';
                    }
                }
                initgrp_filter =  '(' + initgrp_filter + ')' ;

                var param = {};  
                param['keys'] = ['device','initwwn','initgrp'];  
                param['filter'] = '(datagrp=\'VMAX-ACCESS-INITIATOR-PORT\'&parttype=\'AccessToInitiatorPort\')';
                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&'+param.filter + '&' + initgrp_filter;
                }  
   
                CallGet.CallGet(param, function(param) {
                    var initwwn;
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        if ( initwwn === undefined ) initwwn = item.initwwn;
                        else initwwn += ',' + item.initwwn;

                    }

                    arg.relaObj["initwwn"] = initwwn;
                        
                    callback(null,arg);
                } );

            },
            function(finalResult, callback){  
                var param = {}; 
                param['device'] = device;
                param['keys'] = ['device'];
                param['fields'] = ['name'];
                param['period'] = period;
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '!parttype&source=\'VMAX-Collector\'';
                param['filter_name'] = '(name==\'HitPercent\')';
 
                CallGet.CallGetPerformance(param, function(result) {   
 
                    var HIT = [];
                    for ( var i in result)   {
                        var item = result[i];
                        if ( item.device == device ) { 
                            for ( var j in item.matrics ) {
                                var matricsItem = item.matrics[j];
                                var HITItem = {};
                                HITItem["timestamp"] = matricsItem.timestamp;
                                HITItem[device] = matricsItem.HitPercent;
                                HIT.push(HITItem);
                            }
                            
                            var HITResult = {};
                            HITResult["Title"] = "存储Cache命中率(%)";
                            HITResult["dataset"] = HIT;

                            finalResult["CacheHit"] = HITResult;
                            callback(null,finalResult);
                        }
                            
                    }     
                       
                }); 
            },  
            function(arg1, callback ) { 
                VMAX.GetDirectorPerformance(device, period, start, valuetype, function(result) { 
                     

                    var IOPS = [];
                    var MBPS = [];
                    var SYSCALL=[];
                    var QUEUE = [];
                    for ( var i in result) {
                        var item = result[i];

                        for ( var j in item.matrics ) {
                            var matricsItem = item.matrics[j];

                            // --- Front End Controller IOPS (Read/Write) ---
                            var isfind  = false;
                            for ( var z in IOPS ) {
                                var IOPSItem = IOPS[z];
                                if ( IOPSItem.timestamp == matricsItem.timestamp ) {
                                    IOPSItem[item.part +"_ReadRequests"] = matricsItem.ReadRequests;
                                    IOPSItem[item.part +"_WriteRequests"] = matricsItem.WriteRequests;
                                    isfind = true;
                                }
                            }
                            if ( isfind == false ) {
                                var IOPSItem = {};
                                IOPSItem["timestamp"] = matricsItem.timestamp;
                                IOPSItem[item.part +"_ReadRequests"] = matricsItem.ReadRequests;
                                IOPSItem[item.part +"_WriteRequests"] = matricsItem.WriteRequests;
                                IOPS.push(IOPSItem);
                            }


                            // --- Front End Controller MBPS ---
                            var isfind  = false;
                            for ( var z in MBPS ) {
                                var MBPSItem = MBPS[z];
                                if ( MBPSItem.timestamp == matricsItem.timestamp ) {
                                    MBPSItem[item.part +"_HostMBperSec"] = matricsItem.HostMBperSec; 
                                    isfind = true;
                                }
                            }
                            if ( isfind == false ) {
                                var MBPSItem = {};
                                MBPSItem["timestamp"] = matricsItem.timestamp;
                                MBPSItem[item.part +"_HostMBperSec"] = matricsItem.HostMBperSec; 
                                MBPS.push(MBPSItem);
                            }

                            // --- Front End Controller SysCall ---
                            var isfind  = false;
                            for ( var z in SYSCALL ) {
                                var SYSCALLItem = SYSCALL[z];
                                if ( SYSCALLItem.timestamp == matricsItem.timestamp ) {
                                    SYSCALLItem[item.part] = matricsItem.SysCallCount; 
                                    isfind = true;
                                }
                            }
                            if ( isfind == false ) {
                                var SYSCALLItem = {};
                                SYSCALLItem["timestamp"] = matricsItem.timestamp;
                                SYSCALLItem[item.part] = matricsItem.SysCallCount; 
                                SYSCALL.push(SYSCALLItem);
                            }



                        }

                    }
                    var IOPSResult = {};
                    IOPSResult["Title"] = "前端控制器IOPS";
                    IOPSResult["dataset"] = IOPS;
                    arg1["FEController_IOPS"] = IOPSResult;

                    var MBPSResult = {};
                    MBPSResult["Title"] = "前端控制器MBPS";
                    MBPSResult["dataset"] = MBPS;
                    arg1["FEController_MBPS"] = MBPSResult;

                    
                    var SYSCALLResult = {};
                    SYSCALLResult["Title"] = "前端控制器SysCall";
                    SYSCALLResult["dataset"] = SYSCALL;
                    arg1["FEController_SysCall"] = SYSCALLResult;

                    callback(null,arg1);
                });
            },
            function(arg1, callback ) { 

                var param = {};
                param['device'] = device;
                param['period'] = period;
                param['start'] = start; 
                param['filter_name'] = '(name=\'CurrentUtilization\'|name=\'ReadRequests\'|name=\'WriteRequests\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
                param['keys'] = ['device','part'];
                param['fields'] = ['name','partgrp','parttype','model'];  
                //param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Controller\')';
                param['filter'] = '(parttype=\'Controller\'&partgrp=\'RDF\')';


                CallGet.CallGetPerformance(param, function(result) {  
 
                    var MBPS = [];
                    var UTIL=[]; 
                    for ( var i in result) {
                        var item = result[i];

                        for ( var j in item.matrics ) {
                            var matricsItem = item.matrics[j]; 

                            // --- RDF Controller MBPS ---
                            var isfind  = false;
                            for ( var z in MBPS ) {
                                var MBPSItem = MBPS[z];
                                if ( MBPSItem.timestamp == matricsItem.timestamp ) {
                                    MBPSItem[item.part +"_WriteThroughput"] = matricsItem.WriteThroughput; 
                                    MBPSItem[item.part +"_ReadThroughput"] = matricsItem.ReadThroughput; 
                                    isfind = true;
                                }
                            }
                            if ( isfind == false ) {
                                var MBPSItem = {};
                                MBPSItem["timestamp"] = matricsItem.timestamp;
                                MBPSItem[item.part +"_WriteThroughput"] = matricsItem.WriteThroughput; 
                                MBPSItem[item.part +"_ReadThroughput"] = matricsItem.ReadThroughput; 

                                MBPS.push(MBPSItem);
                            }

                            // --- RDF Controller Untilization ---
                            var isfind  = false;
                            for ( var z in UTIL ) {
                                var UTILItem = UTIL[z];
                                if ( UTILItem.timestamp == matricsItem.timestamp ) {
                                    UTILItem[item.part] = matricsItem.CurrentUtilization; 
                                    isfind = true;
                                }
                            }
                            if ( isfind == false ) {
                                var UTILItem = {};
                                UTILItem["timestamp"] = matricsItem.timestamp;
                                UTILItem[item.part] = matricsItem.CurrentUtilization; 
                                UTIL.push(UTILItem);
                            }



                        }

                    } 
                    var RDFResult = {};
                    RDFResult["Title"] = "RDF控制器MBPS";
                    RDFResult["dataset"] = MBPS;
                    arg1["RDFController_MBPS"] = RDFResult;

                    
                    var UTILResult = {};
                    UTILResult["Title"] = "RDF控制器利用率";
                    UTILResult["dataset"] = UTIL;
                    arg1["RDFController_Utilization"] = UTILResult;

                    callback(null,arg1);
                });
            },
            function ( arg1, callback ) {

                var initwwn_filter;

                var initwwns = arg1.relaObj.initwwn.split(',');
                for ( var i in initwwns ) {
                    var initwwnItem = initwwns[i];
                    if ( initwwn_filter === undefined ) {
                        initwwn_filter = 'part=\'' + initwwnItem.toLowerCase() + '\'';
                    } else {
                        initwwn_filter += '|part=\'' + initwwnItem.toLowerCase() + '\'';
                    }
                }
                initwwn_filter = '(' + initwwn_filter + ')';
                
                // VMAX3's Initiator HostIOs
                var param = {};
                param['device'] = device;
                param['period'] = period;
                param['start'] = start;
                param['end'] = end;
                param['type'] = valuetype;
                param['filter_name'] = '(name=\'HostIOs\')';
                param['keys'] = ['device','part'];
                param['fields'] = ['name'];  
                if ( initwwn_filter === undefined )
                    param['filter'] = 'datagrp=\'VMAX-Initiator\'';
                else 
                    param['filter'] = 'datagrp=\'VMAX-Initiator\'' + '&' + initwwn_filter;
        
                CallGet.CallGetPerformance(param, function(result) {    

                    var MBPS = []; 
                    for ( var i in result) {
                        var item = result[i];

                        for ( var j in item.matrics ) {
                            var matricsItem = item.matrics[j]; 

                            // ---  ---
                            var isfind  = false;
                            for ( var z in MBPS ) {
                                var MBPSItem = MBPS[z];
                                if ( MBPSItem.timestamp == matricsItem.timestamp ) {
                                    MBPSItem[item.part ] = matricsItem.HostIOs; 
                                    isfind = true;
                                }
                            }
                            if ( isfind == false ) {
                                var MBPSItem = {};
                                MBPSItem["timestamp"] = matricsItem.timestamp;
                                MBPSItem[item.part ] = matricsItem.HostIOs;  

                                MBPS.push(MBPSItem);
                            } 


                        }

                    }  
                    var UTILResult = {};
                    UTILResult["Title"] = "Initiator Host IOs/sec";
                    UTILResult["dataset"] = MBPS;
                    arg1["Initiator"] = UTILResult;
 
                    callback(null, arg1 ); 
                });
            },
            function ( arg, callback  ) {
                // ---------------------------
                // Get Disk performance
                // ----------------------

                var param = {};
                param['device'] = device;
                param['period'] = period;
                param['start'] = start;
                param['end'] = end;
                param['type'] = valuetype;
                param['limit'] = 1000000;
                //param['filter_name'] = '(name=\'CurrentUtilization\'|name=\'ReadResponseTime\'|name=\'WriteResponseTime\'|name=\'ReadRequests\'|name=\'WriteRequests\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
                param['filter_name'] = '(name=\'CurrentUtilization\')';
                param['keys'] = ['device','part'];
                param['fields'] = ['name','disktype'];  
                param['filter'] = 'parttype=\'Disk\'';


                CallGet.CallGetPerformance(param, function(result) { 
                    var resultDisk = {};
                    var top10Disk=[];
                    for ( var j in result){ 
                        var item = result[j];
                        var itemNew = {};
                        itemNew.device = item.device;
                        itemNew.part = item.part;
                        itemNew.MaxUtil = item.matricsStat.CurrentUtilization.max;

                        delete item.matricsStat; 
                        delete item.model;
                        delete item.device;

                        itemNew.matrics = item;

                        if ( item.disktype == 'Enterprise Flash Drive' ) {
                            var disktype = 'EFD'; 
                        } else {
                            var disktype = 'SAS'; 
                        }
                        if ( resultDisk[disktype] === undefined  ) resultDisk[disktype] = [];
                        resultDisk[disktype].push(itemNew);
                        
                    }
                    for ( var disktype in resultDisk ) {
                        resultDisk[disktype].sort(sortBy("-MaxUtil"));
                    } 
    
                    var count = 0;
                    for ( var i=0; i< 10; i++ ){


                        if ( resultDisk === undefined ) break;
                        if ( resultDisk.EFD === undefined ) continue;
                        if ( resultDisk.SAS === undefined ) {
                            resultDisk.EFD[i].matrics.part = resultDisk.EFD[i].matrics.part + "(EFD)";
                            top10Disk.push(resultDisk.EFD[i].matrics); 
                        } else {
                            if ( i<5 ) {
                            resultDisk.EFD[i].matrics.part = resultDisk.EFD[i].matrics.part + "(EFD)";
                            top10Disk.push(resultDisk.EFD[i].matrics); 
                            }
                            else top10Disk.push(resultDisk.SAS[i].matrics);
                        }
                    }

                    var DISK=[];
                    for ( var i in top10Disk ) {
                        var item = top10Disk[i];

                        for ( var j in item.matrics) {
                            var matricsItem = item.matrics[j];

                            var isfind = false;
                            for ( var z in DISK ) {
                                var DISKItem = DISK[z];
                                if ( DISKItem.timestamp == matricsItem.timestamp ) {
                                    DISKItem[item.part] = matricsItem.CurrentUtilization;
                                    isfind = true;
                                }
                            }
                            if ( isfind ==false ) {
                                var DISKItem = {};
                                DISKItem["timestamp"] = matricsItem.timestamp;
                                DISKItem[item.part] = matricsItem.CurrentUtilization;
                                DISK.push(DISKItem);
                            }
                        }
                    }
                    var DiskResult = {};
                    DiskResult["Title"] = "Top10磁盘利用率"
                    DiskResult["dataset"] = DISK;
                    arg["DISK_TOP10"] = DiskResult; 
                    callback(null,arg);
                });
                //callback(null,arg);
            },
            function ( arg1, callback ){ 
                var param = {};
                param['device'] = device;
                param['period'] = period;
                param['start'] = start;
                param['end'] = end;
                param['type'] = valuetype;
                param['filter_name'] = '(name=\'RdfWritesPerSec\'|name=\'WPCount\')';
                param['keys'] = ['device','part','srdfgpnm'];
                param['fields'] = ['name'];  

                if ( arg1.relaObj.srdfrgrp === undefined  ) 
                    param['filter'] = 'datagrp=\'VMAX-RDFGROUPS\'';
                else {
                    var rdfg = arg1.relaObj.srdfrgrp;
                    param['filter'] = 'datagrp=\'VMAX-RDFGROUPS\'' + '&part=\''+rdfg+'\'';
                }

        
                CallGet.CallGetPerformance(param, function(result) {    

                    var RDFG_MBPS = []; 
                    for ( var i in result) {
                        var item = result[i];

                        for ( var j in item.matrics ) {
                            var matricsItem = item.matrics[j]; 

                            // ---  ---
                            var isfind  = false;
                            for ( var z in RDFG_MBPS ) {
                                var MBPSItem = RDFG_MBPS[z];
                                if ( MBPSItem.timestamp == matricsItem.timestamp ) {
                                    MBPSItem[item.part ] = matricsItem.RdfWritesPerSec; 
                                    isfind = true;
                                }
                            }
                            if ( isfind == false ) {
                                var MBPSItem = {};
                                MBPSItem["timestamp"] = matricsItem.timestamp;
                                MBPSItem[item.part ] = matricsItem.RdfWritesPerSec;  

                                RDFG_MBPS.push(MBPSItem);
                            } 


                        }

                    }  
                    var RDFG_GBPS_Result = {};
                    RDFG_GBPS_Result["Title"] = "RDFS Group BE RDF Copy (IOPS)";
                    RDFG_GBPS_Result["dataset"] = RDFG_MBPS;
                    arg1["RDFSGroup_MBPS"] = RDFG_GBPS_Result;
 

                    
                    var RDFG_WPCount = []; 
                    for ( var i in result) {
                        var item = result[i];

                        for ( var j in item.matrics ) {
                            var matricsItem = item.matrics[j]; 

                            // ---  ---
                            var isfind  = false;
                            for ( var z in RDFG_WPCount ) {
                                var MBPSItem = RDFG_WPCount[z];
                                if ( MBPSItem.timestamp == matricsItem.timestamp ) {
                                    MBPSItem[item.part ] = matricsItem.WPCount; 
                                    isfind = true;
                                }
                            }
                            if ( isfind == false ) {
                                var MBPSItem = {};
                                MBPSItem["timestamp"] = matricsItem.timestamp;
                                MBPSItem[item.part ] = matricsItem.WPCount;  

                                RDFG_WPCount.push(MBPSItem);
                            } 


                        }

                    }  
                    var RDFG_WPCount_Result = {};
                    RDFG_WPCount_Result["Title"] = "RDFS Group WP Count";
                    RDFG_WPCount_Result["dataset"] = RDFG_WPCount;
                    arg1["RDFSGroup_WPCount"] = RDFG_WPCount_Result;
 

                    callback(null, arg1 ); 
                });
            }
            , function ( arg, callback ) {
                for ( var fieldname in arg ) {
                    for ( var i in arg[fieldname].dataset ) {
                        var item = arg[fieldname].dataset[i];
                        item['timestamp'] = moment.unix(item.timestamp).format('YYYY-MM-DD HH')
                    }
                }
                callback(null,arg);
            }
        ], function (err, result) {  

            res.json(200, result );


        }); 

    });




/**
 * @swagger
 * /api/analysis/part/deepwater:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 存储资源深水线控制
 *     description: 返回应用性能负载相关的存储端口控制器(前,后,RDF)的利用率性能状态
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z
 *     responses:
 *       200:
 *         description: return the workload of specical array and storage group
 */ 

    app.get('/api/analysis/part/deepwater', function (req, res) {  
        var device = req.query.devicesn; 
        var start = req.query.from;
        var end = req.query.to;

        if ( device === undefined | device == null ) {
            res.json(400, 'Must be special a storage!');
            return;
        }; 

        
        if ( start === undefined  | start == null ) {
            res.json(400, 'Must be special a from ( begintime )!');
            return;
        }; 

        if ( end === undefined  | end == null) {
            res.json(400, 'Must be special a to ( endtime ) !' + end);
            return;
        }; 
        var period = util.getPeriod(start,end);
        var valuetype = 'max'; 

        async.waterfall([
            
            function( callback ) { 

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
            } , 
            function( arg , callback ) {
                var result = {};

                // ---- Front End Controller Utilization -------
                var FrontEnd = [];
                for ( var i in arg["Front-End"] ) {
                    var item = arg["Front-End"][i];
                    
                    for ( var j in item.matrics) {
                        var matricsItem = item.matrics[j];

                        var isfind = false;
                        for ( var z in FrontEnd ) {
                            var FrontEndItem = FrontEnd[z];
                            if ( FrontEndItem.timestamp == matricsItem.timestamp ) {
                                FrontEndItem[item.part] = matricsItem.CurrentUtilization;
                                isfind = true;
                            }
                        }
                        if ( isfind == false ) {
                            var FrontEndItem = {};
                            FrontEndItem["timestamp"] = matricsItem.timestamp;
                            FrontEndItem[item.part] = matricsItem.CurrentUtilization;
                            FrontEnd.push(FrontEndItem);
                        }
                    }
                }
                var FrontEndResult = {};
                FrontEndResult["Title"] = "前端控制器利用率(%)";
                FrontEndResult["dataset"] = FrontEnd;


                // ---- RDF Controller Utilization -------
                var RDF = [];
                for ( var i in arg["RDF"] ) {
                    var item = arg["RDF"][i];
                    
                    for ( var j in item.matrics) {
                        var matricsItem = item.matrics[j];

                        var isfind = false;
                        for ( var z in RDF ) {
                            var RDFItem = RDF[z];
                            if ( RDFItem.timestamp == matricsItem.timestamp ) {
                                RDFItem[item.part] = matricsItem.CurrentUtilization;
                                isfind = true;
                            }
                        }
                        if ( isfind == false ) {
                            var RDFItem = {};
                            RDFItem["timestamp"] = matricsItem.timestamp;
                            RDFItem[item.part] = matricsItem.CurrentUtilization;
                            RDF.push(RDFItem);
                        }
                    }
                }
                var RDFResult = {};
                RDFResult["Title"] = "RDF控制器利用率(%)";
                RDFResult["dataset"] = RDF;


                // ---- Back End Controller Utilization -------
                var BackEnd = [];
                for ( var i in arg["Back-End"] ) {
                    var item = arg["Back-End"][i];
                    
                    for ( var j in item.matrics) {
                        var matricsItem = item.matrics[j];

                        var isfind = false;
                        for ( var z in BackEnd ) {
                            var BackEndItem = BackEnd[z];
                            if ( BackEndItem.timestamp == matricsItem.timestamp ) {
                                BackEndItem[item.part] = matricsItem.CurrentUtilization;
                                isfind = true;
                            }
                        }
                        if ( isfind == false ) {
                            var BackEndItem = {};
                            BackEndItem["timestamp"] = matricsItem.timestamp;
                            BackEndItem[item.part] = matricsItem.CurrentUtilization;
                            BackEnd.push(BackEndItem);
                        }
                    }
                }
                var BackEndResult = {};
                BackEndResult["Title"] = "后端控制器控制器利用率(%)";
                BackEndResult["dataset"] = BackEnd;



                // ---- Enginuity Data Services Utilization (VMAX3 only)-------
                var EDS = [];
                for ( var i in arg["Enginuity Data Services"] ) {
                    var item = arg["Enginuity Data Services"][i];
                    
                    for ( var j in item.matrics) {
                        var matricsItem = item.matrics[j];

                        var isfind = false;
                        for ( var z in EDS ) {
                            var EDSItem = EDS[z];
                            if ( EDSItem.timestamp == matricsItem.timestamp ) {
                                EDSItem[item.part] = matricsItem.CurrentUtilization;
                                isfind = true;
                            }
                        }
                        if ( isfind == false ) {
                            var EDSItem = {};
                            EDSItem["timestamp"] = matricsItem.timestamp;
                            EDSItem[item.part] = matricsItem.CurrentUtilization;
                            EDS.push(EDSItem);
                        }
                    }
                }
                var EDSResult = {};
                EDSResult["Title"] = "Enginuity Data Services利用率(%)";
                EDSResult["dataset"] = EDS;






                result["Front-End"] = FrontEndResult;
                result["RDF"] = RDFResult;
                result["Back-End"] = BackEndResult;
                result["EDS"] = EDSResult;


                callback(null, result);
            },
            function ( arg1, callback ) {
                // ---------------------------
                // Get Disk performance
                // ---------------------- 
                var param = {};
                param['device'] = device;
                param['period'] = period;
                param['start'] = start;
                param['end'] = end;
                param['type'] = valuetype;
                param['limit'] = 1000000;
                //param['filter_name'] = '(name=\'CurrentUtilization\'|name=\'ReadResponseTime\'|name=\'WriteResponseTime\'|name=\'ReadRequests\'|name=\'WriteRequests\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
                param['filter_name'] = '(name=\'CurrentUtilization\')';
                param['keys'] = ['device','part'];
                param['fields'] = ['name','disktype'];  
                param['filter'] = 'parttype=\'Disk\'';


                CallGet.CallGetPerformance(param, function(result) { 
                    var resultDisk = {}; 
                    for ( var j in result){ 
                        var item = result[j]; 

                        delete item.matricsStat; 
                        delete item.model;
                        delete item.device;
 

                        if ( item.disktype == 'Enterprise Flash Drive' ) {
                            var disktype = 'EFD'; 
                        } else {
                            var disktype = 'Other'; 
                        }
                        if ( resultDisk[disktype] === undefined  ) resultDisk[disktype] = [];
                        resultDisk[disktype].push(item);
                        
                    }

                    var DiskResult = [];
                    var DiskSASResultTmp = {}
                    var DiskEFDResultTmp = {}
                    for ( var i in resultDisk.Other ) {
                        var item = resultDisk.Other[i];
                        var itemMatrics = item.matrics;

                        for ( var j in itemMatrics ) {
                            var matricsItem = itemMatrics[j];
                            if ( DiskSASResultTmp[matricsItem.timestamp] === undefined ) DiskSASResultTmp[matricsItem.timestamp] = [];
                            DiskSASResultTmp[matricsItem.timestamp].push(matricsItem.CurrentUtilization);
                        }

                    }
                    for ( var i in resultDisk.EFD ) {
                        var item = resultDisk.EFD[i];
                        var itemMatrics = item.matrics;

                        for ( var j in itemMatrics ) {
                            var matricsItem = itemMatrics[j];
                            if ( DiskEFDResultTmp[matricsItem.timestamp] === undefined ) DiskEFDResultTmp[matricsItem.timestamp] = [];
                            DiskEFDResultTmp[matricsItem.timestamp].push(matricsItem.CurrentUtilization);
                        }

                    } 
                    
                    if ( JSON.stringify(DiskEFDResultTmp) == "{}"   ) { 
                        var DiskResultTmp = DiskSASResultTmp;
                    }
                    else  { 
                        var DiskResultTmp = DiskEFDResultTmp;
                    }
 

                    for ( var ts in DiskResultTmp ) {
                        var sumNumber = 0;
                        for ( var i in DiskSASResultTmp[ts] ) {
                            var item = DiskSASResultTmp[ts][i];
                            sumNumber += item;
                        }

                        var sumNumberEFD = 0;
                        for ( var i in DiskEFDResultTmp[ts] ) {
                            var item = DiskEFDResultTmp[ts][i];
                            sumNumberEFD += item;
                        }


                        var resItem = {};
                        resItem["timestamp"] = ts;


                        
                        if ( DiskSASResultTmp[ts] === undefined ) 
                            resItem["Other"] = 0 ;
                        else 
                            resItem["Other"] = sumNumber / DiskSASResultTmp[ts].length;
                        
                        if ( DiskEFDResultTmp[ts] === undefined ) 
                            resItem["EFD"] = 0 ;
                        else 
                            resItem["EFD"] = sumNumberEFD / DiskEFDResultTmp[ts].length;

                        DiskResult.push(resItem);
                    } 

                    var result1 = {};
                    result1["Title"] = "磁盘利用率(按类型)(%)";
                    result1["dataset"] = DiskResult;

                    arg1["DiskUtilization"] = result1;

                    callback(null,arg1);
                });
            }
            , function ( arg, callback ) {
                for ( var fieldname in arg ) {
                    for ( var i in arg[fieldname].dataset ) {
                        var item = arg[fieldname].dataset[i];
                        item['timestamp'] = moment.unix(item.timestamp).format('YYYY-MM-DD HH')
                    }
                }
                callback(null,arg);
            }

        ], function (err, result) { 

            res.json(200, result );
        }); 

    });


    
/**
 * @swagger
 * /api/analysis/storage/volume/top10:
 *   get:
 *     tags:
 *       - analysis
 *     summary: Top 10 Performance (IOPS) of Volume
 *     description: 返回应用性能负载相关的卷IOPS最多的前10个卷性能信息
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: sg
 *         description: Storage Group名称
 *         required: true
 *         type: string 
 *         example: AWPDB_NEW_SG
 *       - in: query
 *         name: volumes
 *         description: Volume列表
 *         required: true
 *         type: string 
 *         example: 1E8B,1E93,1E8F,1E9B,1E97,1EA3,1E9F,1EAB,1EA7,1EB3,1EAF,1EBB,1EB7,1EC3,1EBF,1ECB,1EC7,1ED3,1ECF,1EDB,1ED7,1EE3,1EDF,1EEB,1EE7,1EF3,1EEF,1EFB,1EF7,1F03,1EFF,1F0B,1F07,1F13,1F0F,1F1B,1F17,1F23,1F1F,1F2B,1F27,1F33,1F2F,1F3B,1F37,1F43,1F3F,1F4B,1F47,1F53,1F4F,1F5B,1F57,1F63,1F5F,1F6B,1F67,1F73,1F6F,1F7B,1F77,1F83,1F7F,1F8B,1F87,1F93,1F8F,1F9B,1F97,1FA3,1F9F,1FAB,1FA7,1FB3,1FAF,1FBB,1FB7,1FC3,1FBF,1FCB,1FC7,1FD3,1FCF,1FDB,1FD7,1FE3,1FDF,1FEB,1FE7,1FF3,1FEF,1FFB,1FF7,2003,1FFF,200B,2007,2013,200F,201B,2017,2023,201F,202B,2027,2033,202F,203B,2037,2043,203F,204B,2047,2053,204F,205B,2057,2063,205F,206B,2067,2073,206F,207B,2077,2083,207F,208B,2087,2093,208F,209B,2097,21E3,21DF,21EB,21E7,21F3,21EF,21FB,21F7,2203,21FF,220B,2207,2213,220F,221B,2217,2223,221F,222B,2227,2233,222F,223B,2237,2243,223F,2507,2247,250F,250B,2517,2513,251F,251B,2527,2523,252F,252B,2537,2533,253F,253B,2547,2543,254F,254B,2557,2553,255F,255B,2567,2563,256F,256B,2577,2573,257F,257B,2587,2583,258F,258B,2597,2593,259F,259B,25A7,25A3,25AF,25AB,25B7,25B3,25BF,25BB,25C7,25C3,25CF,25CB,25D7,25D3,25DF,25DB,25E7,25E3,25EF,25EB,25F7,25F3,25FF,25FB,2607,2603,260F,260B,2617,2613,261F,261B,2627,2623,262F,262B,2637,2633,263F,263B,2647,2643,264F,264B,2657,2653,265F,265B,2667,2663,266F,266B,2677,2673,267F,267B,2687,2683,268F,268B,2697,2693,269F,269B,26A7,26A3,26AF,26AB,26B7,26B3,26BF,26BB,26C7,26C3,26CF,26CB,26D7,26D3,26DF,26DB,26E7,26E3,26EF,26EB,26F7,26F3,26FF,26FB,2707,2703,270F,270B,2717,2713,271F,271B,2727,2723,272F,272B,2737,2733,273F,273B,2747,2743,274F,274B,2757,2753,275F,275B,2767,2763,276F,276B,2777,2773,277F,277B,2787,2783,278F,278B,2797,2793,279F,279B,27A7,27A3,27AF,27AB,27B7,27B3,27BF,27BB,27C7,27C3,27CF,27CB,27D7,27D3,27DF,27DB,27E7,27E3,27EF,27EB,27F7,27F3,27FF,27FB,2807,2803,280F,280B,2817,2813,281F,281B,2827,2823,282F,282B,2837,2833,283F,283B,2847,2843,284F,284B,2857,2853,285F,285B,2867,2863,286F,286B,2877,2873,287F,287B,2887,2883,288F,288B,2897,2893,289F,289B,28A7,28A3,28AF,28AB,28B7,28B3,28BF,28BB,28C7,28C3,28CF,28CB,28D7,28D3,28DF,28DB,28E7,28E3,28EF,28EB,28F7,28F3,28FF,28FB,2907,2903,290F,290B,2917,2913,291F,291B,2927,2923,292F,292B,2937,2933,293F,293B,2947,2943,294F,294B,2957,2953,295F,295B,2967,2963,296F,296B,2977,2973,297F,297B,2987,2983,298F,298B,2997,2993,299F,299B,29A7,29A3,29AF,29AB,29B7,29B3,29BF,29BB,29C7,29C3,29CF,29CB,29D7,29D3,29DF,29DB,29E7,29E3,2B6B,2B67,2B73,2B6F,2B7B,2B77,2B83,2B7F,2B8B,2B87,2B93,2B8F,2B9B,2B97,2BA3,2B9F,2BAB,2BA7,2BB3,2BAF,2BBB,2BB7,2BC3,2BBF,2BCB,2BC7,2BD3,2BCF,2BDB,2BD7,2BE3,2BDF,2BEB,2BE7,2BF3,2BEF,2BFB,2BF7,2C03,2BFF,2C0B,2C07,2C13,2C0F,2C1B,2C17,2C23,2C1F,2C2B,2C27,2C33,2C2F,2C3B,2C37,2C43,2C3F,2C4B,2C47,2C53,2C4F,2C5B,2C57,2C63,2C5F,2C6B,2C67,2C73,2C6F,2C7B,2C77,2C83,2C7F,2C8B,2C87,2C93,2C8F,2C9B,2C97,2CA3,2C9F,2CAB,2CA7,2CB3,2CAF,2CBB,2CB7,2CC3,2CBF,2CCB,2CC7,2CD3,2CCF,2CDB,2CD7,2CE3,2CDF,2CEB,2CE7,2CF3,2CEF,2CFB,2CF7,2D03,2CFF,2D0B,2D07,2D13,2D0F,2D1B,2D17,2D23,2D1F,2D2B,2D27,2FE3,2FDF,2FEB,2FE7,2FF3,2FEF,2FFB,2FF7,3003,2FFF,300B,3007,3013,300F,301B,3017,3023,301F,302B,3027,3033,302F,303B,3037,3043,303F,304B,3047,3053,304F,305B,3057,3063,305F,306B,3067,3073,306F,307B,3077
 *       - in: query
 *         name: redovol
 *         description: Redo卷列表
 *         required: true
 *         type: array 
 *         items:
 *             type: string
 *         example: [1E8B,1E8F,1E9B,1EA3]
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z
 *     responses:
 *       200:
 *         description: return the list of volume's top 10
 */ 

    app.get('/api/analysis/storage/volume/top10', function (req, res) {  
        var device = req.query.devicesn; 
        var sgname = req.query.sg;
        var start = moment(req.query.from).toISOString(); 
        var end = moment(req.query.to).toISOString(); 
        if ( req.query.redovols !== undefined )
            var redovols = req.query.redovol.toString();
        else 
            var redovols = "";
 

        if ( device === undefined  | device == null) {
            res.json(400, 'Must be special a storage!');
            return;
        };

        if ( sgname === undefined  | sgname == null) {
            res.json(400, 'Must be special a storage group!');
            return;
        }; 

        if ( start === undefined  | start == null ) {
            res.json(400, 'Must be special a from ( begintime )!');
            return;
        }; 

        if ( end === undefined  | end == null) {
            res.json(400, 'Must be special a to ( endtime ) !');
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
                var lunResult = {}; 
                lunResult["redovols"] = [];
                lunResult["volumes"] = [];
                var count = 0;
                async.whilst (
                    function() {
                        return count < arg1.length;
                    },
                    function(interCallback) {
                        console.log("==== Count = " + count);
                        var i = count;
                        var lunlist=""; 
                        var interCount = 0;
                        for ( var i=count; i<arg1.length; i++  ) {
                            interCount++;
                            if ( interCount > 150  ) break;
                            
                            count++;
                            
                            var item = arg1[i];
                            if (lunlist == "" ) lunlist = 'part==\''+item+'\'';
                            lunlist = lunlist + "|" + 'part==\''+item+'\'';
                        }
        

                        var param = {}; 
                        param['keys'] = ['device','part'];
                        param['fields'] = ['name'];
                        param['period'] = util.getPeriod(start,end);
                        param['start'] = start;
                        param['end'] = end;
                        param['filter'] =  'device==\''+device+'\'&(parttype==\'LUN\')&('+lunlist+')';
                        param['filter_name'] = '(name==\'ReadRequests\'|name==\'WriteRequests\')';
                        param['type'] = 'max';
                        param['limit'] = 1000000;
                
                        CallGet.CallGetPerformance(param, function(lunperf) {   
                            for ( var i in lunperf ) {
                                var item = lunperf[i];
                                
                                if ( redovols.indexOf(item.part) >= 0 ) {
                                    var lunResultItem = {};
                                    lunResultItem["device"] = item.device;
                                    lunResultItem["part"] =  item.part;
                                    lunResultItem["IOPS"] = item.matricsStat.WriteRequests.max +  item.matricsStat.ReadRequests.max;
        
                                    lunResult.redovols.push(lunResultItem);                            
                                } else if ( lunlist.indexOf(item.part) >= 0 ) {
                                    var lunResultItem = {};
                                    lunResultItem["device"] = item.device;
                                    lunResultItem["part"] =  item.part;
                                    lunResultItem["IOPS"] = item.matricsStat.WriteRequests.max +  item.matricsStat.ReadRequests.max;
        
                                    lunResult.volumes.push(lunResultItem);
                                }
        
                            } 
                            interCallback();
                
                        }); 


                    },
                    function(err) {
                        if ( err !== null ) 
                            console.log(err);
                        else {
                            console.log("====DONE===" + lunResult.volumes.length);
                            callback(null, lunResult);
                        }
                       
                        

                    }
                )

                
                     



            },
            function(arg,  callback) {  
                for ( var i in arg.volumes ) {
 
                    for ( var j=0; j<arg.volumes.length-1-i;j++) {
                        var item1 = arg.volumes[j];
                        if ( ( arg.volumes[j].IOPS )  < ( arg.volumes[j+1].IOPS ) ) {
                            var temp = arg.volumes[j+1];
                            arg.volumes[j+1] = arg.volumes[j];
                            arg.volumes[j] = temp;
                        }
                    }
    
                } 

                for ( var i in arg.redovols ) {
 
                    for ( var j=0; j<arg.redovols.length-1-i;j++) {
                        var item1 = arg.redovols[j];
                        if ( ( arg.redovols[j].IOPS )  < ( arg.redovols[j+1].IOPS ) ) {
                            var temp = arg.redovols[j+1];
                            arg.redovols[j+1] = arg.redovols[j];
                            arg.redovols[j] = temp;
                        }
                    }
    
                } 

                callback(null,arg);
    
            } ,
            function(arg, callback ) { 
                var lunResult = [];
                var count = 0;
                for ( var i in arg.redovols ) {

                    if ( i>=3 ) break;
                    count++;
                    var TopN = parseInt(i)+1;
                    var item =  arg.redovols[i];
                    item.volume = item.part+" Redo Top"+TopN;
                    lunResult.push(item);
                       
                }

                for ( var i in arg.volumes ) {

                    if ( count >= 10 ) break;

                    count++;
                    var TopN = parseInt(i)+1;
                    var item =  arg.volumes[i];
                    item.volume = item.part;
                    lunResult.push(item);
                       
                }
                callback(null,lunResult);
            }
        ], function (err, result) {  
            res.json(200, result );
        }); 

    }); 




    
/**
 * @swagger
 * /api/analysis/storage/volume:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 获取指定卷的详细性能数据
 *     description: 返回指定卷详细性能性能信息
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: volume
 *         description: 卷名称
 *         required: true
 *         type: string 
 *         example: 1BAF
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z
 *     responses:
 *       200:
 *         description: return the detail performance info of volume
 */ 

app.get('/api/analysis/storage/volume', function (req, res) {  
    var device = req.query.devicesn;  
    var volume = req.query.volume;
    var start = moment(req.query.from).toISOString(); 
    var end = moment(req.query.to).toISOString(); 


    if ( device === undefined | device == null) {
        res.json(400, 'Must be special a storage!');
        return;
    };

    if ( volume === undefined | volume == null ) {
        res.json(400, 'Must be special a volume!');
        return;
    }; 

    if ( start === undefined | start == null ) {
        res.json(400, 'Must be special a from ( begintime )!');
        return;
    }; 

    if ( end === undefined | end == null ) {
        res.json(400, 'Must be special a to ( endtime ) !');
        return;
    }; 

    async.waterfall([
        
        function( callback ) {  
            var param = {}; 
            param['keys'] = ['device','part'];
            param['fields'] = ['name'];
            param['period'] = util.getPeriod(start,end);
            param['start'] = start;
            param['end'] = end;
            param['filter'] =  'device==\''+device+'\'&part==\''+volume+'\'&(parttype==\'LUN\')';
            param['filter_name'] = '(name==\'ReadThroughput\'|'+
                                    'name==\'WriteThroughput\'|'+
                                    'name==\'ReadResponseTime\'|'+
                                    'name==\'WriteResponseTime\'|'+
                                    'name==\'SequentialReadRequestsPercent\'|'+
                                    'name==\'RandomReadHitRequestsPercent\'|'+
                                    'name==\'RandomReadMissRequestsPercent\'|'+
                                    'name==\'ReadHitIOsRate\'|'+
                                                                        
                                    'name==\'ReadRequests\'|'+
                                    'name==\'WriteRequests\')';
            param['type'] = 'max'; 
    

            CallGet.CallGetPerformance(param, function(lunperf) { 
                
                var IOPS = [];
                var RT = [];
                var IOSIZE = [];
                var IOPercent = [];

                for ( var i in lunperf ) {
                    var item = lunperf[i];

                    for ( var j in item.matrics ) {
                        var matricsItem = item.matrics[j];

                            
                        matricsItem["ReadIOSize"]  = matricsItem.ReadRequests == 0 ? 0 : (matricsItem.ReadThroughput / matricsItem.ReadRequests).toFixed(2);
                        matricsItem["WriteIOSize"]  = matricsItem.WriteRequests == 0 ? 0 : (matricsItem.WriteThroughput / matricsItem.WriteRequests).toFixed(2);
                        matricsItem["WriteIOPercent"] = (matricsItem.WriteRequests + matricsItem.ReadRequests) == 0 ? 0 : ( matricsItem.WriteRequests / (matricsItem.WriteRequests + matricsItem.ReadRequests) * 100 );


                        var isfind = false;
                        for ( var z in IOPS ) {
                            var IOPSItem = IOPS[z];
                            if ( IOPSItem.timestamp == matricsItem.timestamp ) {
                                IOPSItem["ReadRequest"] = matricsItem.ReadRequests;
                                IOPSItem["WriteRequests"] = matricsItem.WriteRequests;
                                isfind = true;
                            }
                        }
                        if ( isfind == false ) {
                            var IOPSItem = {};
                            IOPSItem["timestamp"] = matricsItem.timestamp;
                            IOPSItem["ReadRequest"] = matricsItem.ReadRequests;
                            IOPSItem["WriteRequests"] = matricsItem.WriteRequests;
                            IOPS.push(IOPSItem);
                        }

                        // --- Response Time --- 
                        var isfind = false;
                        for ( var z in RT ) {
                            var RTItem = RT[z];
                            if ( RTItem.timestamp == matricsItem.timestamp ) {
                                RTItem["ReadResponseTime"] = matricsItem.ReadResponseTime;
                                RTItem["WriteResponseTime"] = matricsItem.WriteResponseTime;
                                isfind = true;
                            }
                        }
                        if ( isfind == false ) {
                            var RTItem = {};
                            RTItem["timestamp"] = matricsItem.timestamp;
                            RTItem["ReadResponseTime"] = matricsItem.ReadResponseTime;
                            RTItem["WriteResponseTime"] = matricsItem.WriteResponseTime;
                            RT.push(RTItem);
                        }

                        // --- IO Size ---
                        var IOSizeItem = {};
                        IOSizeItem["timestamp"] = matricsItem.timestamp;
                        IOSizeItem["ReadIOSize"] = matricsItem.ReadIOSize;
                        IOSizeItem["WriteIOSize"] = matricsItem.WriteIOSize;
                        IOSIZE.push(IOSizeItem);
                        
                        // --- IO Percent ---
                        var IOPercentItem = {};
                        IOPercentItem["timestamp"] = matricsItem.timestamp;
                        IOPercentItem["SequentialRead"] = matricsItem.SequentialReadRequestsPercent;
                        IOPercentItem["RandomReadMiss"] = matricsItem.RandomReadMissRequestsPercent;
                        IOPercentItem["RandomReadHit"] = matricsItem.SequentialReadRequestsPercent;
                        IOPercent.push(IOPercentItem);
                        


                    }
 
                }

                var IOPSResult = {"Title": "Volume (" + volume + ") IOPS"};
                IOPSResult["dataset"] = IOPS;

                var RTResult = {"Title": "Volume (" + volume + ") Response Time(ms)"};
                RTResult["dataset"] = RT;

                
                var IOSIZEResult = {"Title": "Volume (" + volume + ") : IO Size"};
                IOSIZEResult["dataset"] = IOSIZE;

                var IOPercentResult = {"Title": "Volume (" + volume + ") : IO Percent (%)"};
                IOPercentResult["dataset"] = IOPercent;

                var result={};
                result["IOPS"] = IOPSResult;
                result["ResponseTime"] = RTResult;
                result["IOSize"] = IOSIZEResult;
                result["IOPercent"] = IOPercentResult;
                callback(null, result);
    
            }); 

        }
        , function ( arg, callback ) {
            for ( var fieldname in arg ) {
                for ( var i in arg[fieldname].dataset ) {
                    var item = arg[fieldname].dataset[i];
                    item['timestamp'] = moment.unix(item.timestamp).format('YYYY-MM-DD HH')
                }
            }
            callback(null,arg);
        }
    ], function (err, result) { 

        res.json(200, result );
    }); 

}); 





/**
 * @swagger
 * /api/analysis/app/workload/relateDistribution:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 关联应用总体负载分布
 *     description: 获取与指定Storage Group相关联(PortGroup)的其他Storage Group的性能负载指标叠加，观察其相互影响程度。指标包括每个SG的IOPS和MBPS
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: sg
 *         description: Storage Group名称
 *         required: true
 *         type: string 
 *         example: AWPDB_NEW_SG
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z
 *     responses:
 *       200:
 *         description: return the workload of specical array and storage group
 */ 

app.get('/api/analysis/app/workload/relateDistribution', function (req, res) { 
    res.setTimeout(300*1000); 
    var appname = req.query.appname;
    var device = req.query.devicesn;
    var sgname = req.query.sg; 

    if ( appname === undefined || appname == '' ) {
        res.json(400, 'Must be special a appname!');
        return;
    };
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
    var period = util.getPeriod(start,end);
    switch (period) {
        case 0 :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
        case 3600 :
            var dateFormat = "YYYYMMDD HH";
            break;
        case 86400 :
        case 604800 :
            var dateFormat = "YYYYMMDD";
            break;
        default :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
    }

    var data = {};
    var relateSG = [];
    async.waterfall([
        function(  callback){ 
            var param = {};  
            param['keys'] = ['device','viewname','sgname','portgrp']; 
            param['fields'] = ['director']; 
            param['filter'] = 'device=\''+device + '\'&datagrp=\'VMAX-ACCESS\'';
            
            CallGet.CallGet(param, function(result) { 
 
                data.accessinfo = result.result;
                callback(null,data);
            } );

        } , function ( data , callback ) {

                var director ; 
                var relaSGName = [];
                for ( var i in data.accessinfo ) {
                    var item = data.accessinfo[i];
                    if ( item.sgname == sgname ) { 
                        director = item.director.split('|');
                        break;
                    }
                }
                for ( var i in data.accessinfo ) {
                    var item = data.accessinfo[i];
                    for ( var j in director ) {
                        var dirItem = director[j];
                        if ( item.director.indexOf(dirItem) >= 0 ) {
                            var isFind = false;
                            for ( var z in relaSGName ) {
                                if ( relaSGName[z] == item.sgname ) 
                                    isFind = true;
                            }
                            if ( isFind == false )
                                relaSGName.push(item.sgname);
                        } 
                    }
                }

                data.relaSGName = relaSGName;
 
            callback(null, data);
        } , function ( data, callback ) {

            var filter_sgname = 'sgname=\''+sgname + '\'';
            for ( var i in data.relaSGName ) {
                var sgItem = data.relaSGName[i];
                filter_sgname += '|sgname=\'' + sgItem +'\'';
            }
            filter_sgname = '(' + filter_sgname +')';

            var param = {};
            param['device'] = device;
            param['period'] = util.getPeriod(start,end);
            param['start'] = start;
            param['end'] = end;
            param['type'] = 'max';
            param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            param['keys'] = ['device','part']; 
            param['fields'] = ['disktype'];  
            param['filter'] = 'parttype=\'Storage Group\'&datagrp=\'VMAX-StorageGroup\'&' + filter_sgname;

            CallGet.CallGetPerformance(param, function(sgperf) { 
                data.sgPerf = sgperf;
                callback(null, data);
            });

        } , function( data, callback ) {
            var dataset = {};
            dataset["appname"] = appname;
            dataset["array"] = device;
            dataset["sgname"] = sgname;
            dataset["associateSgName"] = data.relaSGName; 

            var IOPS = [];
            var MBPS = [];
            for ( var i in data.sgPerf ) {
                var sgItem = data.sgPerf[i];
                for ( var j in sgItem.matrics ) { 
                    var item1 = sgItem.matrics[j];

                    var isfind = false;
                    for ( var z in IOPS ) {
                        if ( IOPS[z].timestamp == item1.timestamp ) {
                            isfind = true;
                            IOPS[z][sgItem.part] = item1.WriteRequests + item1.ReadRequests;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var IOPSItem = {};
                        IOPSItem["timestamp"] = item1.timestamp;
                        IOPSItem[sgItem.part] = item1.WriteRequests + item1.ReadRequests;
                        IOPS.push(IOPSItem);
                    }

                    
                    isfind = false;
                    for ( var z in MBPS ) {
                        if ( MBPS[z].timestamp == item1.timestamp ) {
                            isfind = true;
                            MBPS[z][sgItem.part] = item1.ReadThroughput + item1.ReadThroughput;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var MBPSItem = {};
                        MBPSItem["timestamp"] = item1.timestamp;
                        MBPSItem[sgItem.part] = item1.ReadThroughput + item1.WriteThroughput;
                        MBPS.push(MBPSItem);
                    }


                }
            }
            var datasetChart = {};
            datasetChart["IOPS"] = {};
            datasetChart["IOPS"]["Title"] = "关联SG IOPS";
            datasetChart["IOPS"]["dataset"] = IOPS;
            
            datasetChart["MBPS"] = {};
            datasetChart["MBPS"]["Title"] = "关联SG MBPS";
            datasetChart["MBPS"]["dataset"] = MBPS;
            
            dataset["chart"] = datasetChart; 
            callback(null, dataset );

        }        
        , function ( arg1, callback ) {
            var arg = arg1.chart;
            for ( var fieldname in arg ) { 
                if ( arg[fieldname].dataset === undefined ) continue;
                for ( var i in arg[fieldname].dataset ) {
                    var item = arg[fieldname].dataset[i];
                    item['timestamp'] = moment.unix(item.timestamp).format(dateFormat)
                }
            }
            callback(null,arg1);
        }
    ], function (err, result) { 

        res.json(200, result );
    }); 

});




/**
 * @swagger
 * /api/analysis/app/workload/compareDistribution:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 关联应用负载对比分析情况分布
 *     description: 应用相关SG与选择的其他关联SG, 两个SG的负载性能指标的对比情况.
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: sg
 *         description: Storage Group名称
 *         required: true
 *         type: string 
 *         example: AWPDB_NEW_SG
 *       - in: query
 *         name: relevant_sg
 *         description: 相关联的需要比对的Storage Group名称
 *         required: true
 *         type: string 
 *         example: edw-etl_SG
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z
 *     responses:
 *       200:
 *         description: return the workload of specical array and storage group
 */ 

app.get('/api/analysis/app/workload/compareDistribution', function (req, res) { 
    res.setTimeout(300*1000); 
    var appname = req.query.appname;
    var device = req.query.devicesn;
    var sgname = req.query.sg; 
    var relevant_sgname = req.query.relevant_sg; 

    if ( appname === undefined || appname == '' ) {
        res.json(400, 'Must be special a appname!');
        return;
    };
    if ( device === undefined || device == '' ) {
        res.json(400, 'Must be special a storage!');
        return;
    };

    if ( sgname === undefined || sgname == '' ) {
        res.json(400, 'Must be special a storage group!');
        return;
    }; 

    if ( relevant_sgname === undefined || relevant_sgname == '' ) {
        res.json(400, 'Must be special a relevant storage group!');
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
    var period = util.getPeriod(start,end);
    switch (period) {
        case 0 :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
        case 3600 :
            var dateFormat = "YYYYMMDD HH";
            break;
        case 86400 :
        case 604800 :
            var dateFormat = "YYYYMMDD";
            break;
        default :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
    }


    var data = {};
    async.waterfall([
        function(  callback){ 
            var param = {};  
            param['keys'] = ['device','viewname','sgname','portgrp']; 
            param['fields'] = ['director']; 
            param['filter'] = 'device=\''+device + '\'&datagrp=\'VMAX-ACCESS\'';
            
            CallGet.CallGet(param, function(result) { 
 
                data.accessinfo = result.result;
                callback(null,data);
            } );

        } , function ( data , callback ) {

                var director ; 
                var relaSGName = [];
                for ( var i in data.accessinfo ) {
                    var item = data.accessinfo[i];
                    if ( item.sgname == sgname ) { 
                        director = item.director.split('|');
                        break;
                    }
                }
                for ( var i in data.accessinfo ) {
                    var item = data.accessinfo[i];
                    for ( var j in director ) {
                        var dirItem = director[j];
                        if ( item.director.indexOf(dirItem) >= 0 ) {
                            var isFind = false;
                            for ( var z in relaSGName ) {
                                if ( relaSGName[z] == item.sgname ) 
                                    isFind = true;
                            }
                            if ( isFind == false )
                                relaSGName.push(item.sgname);
                        } 
                    }
                }

                data.relaSGName = relaSGName;
 
            callback(null, data);
        } , function ( data, callback ) {

            var filter_sgname = 'sgname=\''+sgname + '\'';
            for ( var i in data.relaSGName ) {
                var sgItem = data.relaSGName[i];
                filter_sgname += '|sgname=\'' + sgItem +'\'';
            }
            filter_sgname = '(' + filter_sgname +')';

            var param = {};
            param['device'] = device;
            param['period'] = util.getPeriod(start,end);
            param['start'] = start;
            param['end'] = end;
            param['type'] = 'max';
            param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            param['keys'] = ['device','part']; 
            param['fields'] = ['disktype'];  
            param['filter'] = 'parttype=\'Storage Group\'&datagrp=\'VMAX-StorageGroup\'&' + filter_sgname;

            CallGet.CallGetPerformance(param, function(sgperf) { 
                data.sgPerf = sgperf;
                callback(null, data);
            });

        } , function( data, callback ) {
            var dataset = {};
            dataset["appname"] = appname;
            dataset["array"] = device;
            dataset["sgname"] = sgname; 
            var IOPS = [];
            
            var MBPS = [];
            for ( var i in data.sgPerf ) {
                var sgItem = data.sgPerf[i];
                for ( var j in sgItem.matrics ) { 
                    var item1 = sgItem.matrics[j];

                    var isfind = false;
                    for ( var z in IOPS ) {
                        if ( IOPS[z].timestamp == item1.timestamp ) {
                            isfind = true;
                            IOPS[z][sgItem.part] = Math.round(item1.WriteRequests + item1.ReadRequests);
                            IOPS[z]["Total"] += item1.WriteRequests + item1.ReadRequests; 
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var IOPSItem = {};
                        IOPSItem["timestamp"] = item1.timestamp;
                        IOPSItem[sgItem.part] = Math.round(item1.WriteRequests + item1.ReadRequests);
                        IOPSItem["Total"] = item1.WriteRequests + item1.ReadRequests; 
                        IOPS.push(IOPSItem);
                    }

                    
                    isfind = false;
                    for ( var z in MBPS ) {
                        if ( MBPS[z].timestamp == item1.timestamp ) {
                            isfind = true;
                            MBPS[z][sgItem.part] = Math.round(item1.ReadThroughput + item1.ReadThroughput);
                            MBPS[z]["Total"] += item1.ReadThroughput + item1.ReadThroughput;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var MBPSItem = {};
                        MBPSItem["timestamp"] = item1.timestamp;
                        MBPSItem[sgItem.part] = Math.round(item1.ReadThroughput + item1.WriteThroughput);
                        MBPSItem["Total"] = item1.ReadThroughput + item1.WriteThroughput;
                        MBPS.push(MBPSItem);
                    }


                }
            }
 
            for ( var i in IOPS ) {
                var IOPSItem = IOPS[i];

                for ( var fieldname in IOPSItem ) {
                    switch (fieldname) {
                        case "timestamp" :
                        case sgname :
                        case relevant_sgname :
                            break;
                        case "Total" : 
                            IOPSItem[fieldname] = Math.round(IOPSItem[fieldname] - IOPSItem[sgname] - IOPSItem[relevant_sgname]);
                            break;
                        default :
                            delete IOPSItem[fieldname];
                            break;
                    }
                }
            }
 

            for ( var i in MBPS ) {
                var item = MBPS[i];

                for ( var fieldname in item ) {
                    switch (fieldname) {
                        case "timestamp" :
                        case sgname :
                        case relevant_sgname :
                            break;
                        case "Total" :
                            item[fieldname] = Math.round(item[fieldname] - item[sgname] - item[relevant_sgname]);
                            break;
                        default :
                            delete item[fieldname];
                            break;
                    }
                }
            }
            var datasetChart = {};
            datasetChart["IOPS"] = {};
            datasetChart["IOPS"]["Title"] = "关联SG IOPS";
            datasetChart["IOPS"]["dataset"] = IOPS;
            
            datasetChart["MBPS"] = {};
            datasetChart["MBPS"]["Title"] = "关联SG MBPS";
            datasetChart["MBPS"]["dataset"] = MBPS;
            
            dataset["chart"] = datasetChart;
            callback(null, dataset );

        }
        , function ( arg, callback ) { 
            var origData = arg.chart;

            
            for ( var fieldname in origData ) { 
                if ( origData[fieldname].dataset === undefined ) continue;

                for ( var i in origData[fieldname].dataset ) {
                    var item = origData[fieldname].dataset[i];
                    item['timestamp'] = moment.unix(item.timestamp).format(dateFormat)
                }

            }
            callback(null,arg);
        }
    ], function (err, result) { 

        res.json(200, result );
    }); 


});






/**
 * @swagger
 * /api/analysis/app/workload/distribution:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 应用负载分布
 *     description: 获取指定Storage Group性能负载指标。指标包括每个SG的IOPS，MBPS，ReadResponseTime, WriteResponseTime
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: sg
 *         description: Storage Group名称
 *         required: true
 *         type: string 
 *         example: AWPDB_NEW_SG
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z 
 *     responses:
 *       200:
 *         description: return the workload of specical array and storage group
 */ 
app.get('/api/analysis/app/workload/distribution', function (req, res) { 
    res.setTimeout(300*1000); 
    var appname = req.query.appname;
    var device = req.query.devicesn;
    var sgname = req.query.sg;  
 
    if ( appname === undefined || appname == '' ) {
        res.json(400, 'Must be special a appname!');
        return;
    };
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
    var period = util.getPeriod(start,end);
    switch (period) {
        case 0 :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
        case 3600 :
            var dateFormat = "YYYYMMDD HH";
            break;
        case 86400 :
        case 604800 :
            var dateFormat = "YYYYMMDD";
            break;
        default :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
    }

    var data = {};
    async.waterfall([
        function(  callback){ 
          
            var filter_sgname = 'sgname=\''+sgname + '\''; 

            var param = {};
            param['device'] = device;
            param['period'] = util.getPeriod(start,end);
            param['start'] = start;
            param['end'] = end;
            param['type'] = 'max';
            param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            param['keys'] = ['device','part']; 
            param['fields'] = ['sgname'];  
            param['filter'] = 'parttype=\'Storage Group\'&datagrp=\'VMAX-StorageGroup\'&' + filter_sgname;

            CallGet.CallGetPerformance(param, function(sgperf) {  

                var matrics = [];
                for ( var i in sgperf[0].matrics ) {
                    var item = sgperf[0].matrics[i];
                    var matricsItem = {};
                    matricsItem["timestamp"] = item.timestamp;
                    matricsItem["Throughput"] = Math.round(item.ReadThroughput + item.WriteThroughput);
                    matricsItem["Requests"] = Math.round(item.ReadRequests + item.WriteRequests);
                    matricsItem["ReadResponseTime"] = Math.round(item.ReadResponseTime );
                    matricsItem["WriteResponseTime"] = Math.round(item.WriteResponseTime) ;
                        
                    matrics.push(matricsItem);
                }

                var data = {};
                data["orgiData"] = matrics;

                callback(null, data);
            });

        } ,
        function ( data , callback ) { 

            var filter_sgname = 'sgname=\''+sgname + '\''; 

            var param = {};
            param['device'] = device;
            param['period'] = util.getPeriod(start,end);
            param['type'] = 'max';
            param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            param['keys'] = ['device','part']; 
            param['fields'] = ['sgname'];  
            param['filter'] = 'parttype=\'Storage Group\'&datagrp=\'VMAX-StorageGroup\'&' + filter_sgname;

            param['start'] = moment.unix(moment(start,moment.ISO_8601).unix() - 2419200).toISOString();
            //param['start'] = moment.unix(moment(start,moment.ISO_8601).unix() - 3600*24).toISOString();
            param['end'] = start;
            

            CallGet.CallGetPerformance(param, function(sgperf) {  
  
                var matrics = [];
                for ( var i in sgperf[0].matrics ) {
                    var item = sgperf[0].matrics[i];
                    var matricsItem = {};
                    matricsItem["timestamp"] = item.timestamp;
                    matricsItem["Throughput"] = Math.round(item.ReadThroughput + item.WriteThroughput);
                    matricsItem["Requests"] = Math.round(item.ReadRequests + item.WriteRequests);
                    matricsItem["ReadResponseTime"] = Math.round(item.ReadResponseTime );
                    matricsItem["WriteResponseTime"] = Math.round(item.WriteResponseTime) ;
                        
                    matrics.push(matricsItem);
                }
     
                data["baselineData"] = matrics;
                
                callback(null, data);
            });


        },
        
        function( data, callback ) {    
            Analysis.GenerateBaseLine(data, function(result) {
                callback(null, result);
            }) 

        }
        , function ( arg, callback ) { 
            for ( var fieldname in arg ) { 
                if ( arg[fieldname].dataset === undefined ) continue;
                for ( var i in arg[fieldname].dataset ) {
                    var item = arg[fieldname].dataset[i];
                    item['timestamp'] = moment.unix(item.timestamp).format(dateFormat); 
                    if ( item[fieldname] < item.BL_BOTTOM | item[fieldname] > item.BL_TOP ) {
                        item["customBullet"] = "../assets_ssm/images/analyse/redstar.png";
                    }

                }
            }
            callback(null,arg); 
        }
    ], function (err, result) { 

        res.json(200, result );
    }); 

});




/**
 * @swagger
 * /api/analysis/app/workload/overall:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 应用负载分布
 *     description: 获取指定Storage Group性能负载指标。指标包括每个SG的IOPS，MBPS，ReadResponseTime, WriteResponseTime
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z 
 *     responses:
 *       200:
 *         description: return the workload of specical array and storage group
 */ 
app.get('/api/analysis/app/workload/overall', function (req, res) { 
    res.setTimeout(300*1000); 
    var appname = req.query.appname;
    var device = req.query.devicesn; 
 
    if ( appname === undefined || appname == '' ) {
        res.json(400, 'Must be special a appname!');
        return;
    };
    if ( device === undefined || device == '' ) {
        res.json(400, 'Must be special a storage!');
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
    var period = util.getPeriod(start,end);
    switch (period) {
        case 0 :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
        case 3600 :
            var dateFormat = "YYYYMMDD HH";
            break;
        case 86400 :
        case 604800 :
            var dateFormat = "YYYYMMDD";
            break;
        default :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
    }

    var data = {};
    async.waterfall([
        function(  callback){ 
           
            var param = {};
            param['device'] = device;
            param['period'] = util.getPeriod(start,end);
            param['start'] = start;
            param['end'] = end;
            param['type'] = 'max';
            param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            param['keys'] = ['device','part']; 
            param['fields'] = ['sgname'];  
            param['filter'] = 'parttype=\'Storage Group\'&datagrp=\'VMAX-StorageGroup\'';

            CallGet.CallGetPerformance(param, function(sgperf) {   
                var matrics = [];

                var resData = {};
                for ( var i in sgperf ) {
                    var item = sgperf[i];
                    
                    for ( var j in item.matrics ) {
                        var matricsItem = item.matrics[j];

                        var timestamp ;
                        for ( var fieldname in matricsItem ) {
                            if ( fieldname == 'timestamp' ) {
                                timestamp = matricsItem[fieldname];
                                continue;
                            }

                            if ( resData[fieldname] === undefined ) resData[fieldname] = [];

                            var isfind = false;
                            for ( var z in resData[fieldname] ) {
                                var resItem = resData[fieldname][z];
                                if ( resItem.timestamp == timestamp ) {
                                    resItem[item.sgname] = matricsItem[fieldname];
                                    isfind = true;
                                    break;
                                }
                            }
                            if ( isfind == false ) {
                                var resItem = {};
                                resItem['timestamp'] = timestamp;
                                resItem[item.sgname] = matricsItem[fieldname];
                                resData[fieldname].push(resItem);
                            }

                        }
                    }
                }

                callback(null, resData); 
            }); 
        } , function ( arg , callback ) {
            callback(null, arg);
        }
    ], function (err, result) { 

        res.json(200, result );
    }); 

});





/**
 * @swagger
 * /api/analysis/app/workload/historypeak:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 应用负载峰值积累
 *     description: 获取指定Storage Group性能负载峰值积累. 在一定时间同期内(1-12月), 一天24小时内的每个小时的历史峰值
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: sg
 *         description: Storage Group名称
 *         required: true
 *         type: string 
 *         example: AWPDB_NEW_SG
 *       - in: query
 *         name: period
 *         description: 性能指标采样周期(1-12 Month)
 *         required: true
 *         type: integer 
 *         example: 1 
 *     responses:
 *       200:
 *         description: return the workload peak of specical array and storage group
 */ 
app.get('/api/analysis/app/workload/historypeak', function (req, res) { 
    res.setTimeout(300*1000); 
    var appname = req.query.appname;
    var device = req.query.devicesn;
    var sgname = req.query.sg; 
    var period = req.query.period;

    if ( appname === undefined || appname == '' ) {
        res.json(400, 'Must be special a appname!');
        return;
    };
    if ( device === undefined || device == '' ) {
        res.json(400, 'Must be special a storage!');
        return;
    };

    if ( sgname === undefined || sgname == '' ) {
        res.json(400, 'Must be special a storage group!');
        return;
    }; 

    if ( period === undefined || period == '' ) {
        res.json(400, 'Must be special a valid period value!');
        return;            
    } 
    if ( period <=0 || period >12 ) {
        res.json(400, 'Must be special a valid period value! (1-12)');
        return;   
    }
    
    var end = moment(moment().format("YYYY-MM-01")).toISOString();
    var start = moment(end).add(0-period,'month').toISOString();
 

    var queryPeriod = 3600;
    var data = {};
    async.waterfall([
        function(  callback){ 
          
            var filter_sgname = 'sgname=\''+sgname + '\''; 

            var param = {};
            param['device'] = device;
            param['period'] = queryPeriod;
            param['start'] = start;
            param['end'] = end;
            param['type'] = 'max';
            param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            param['keys'] = ['device','part']; 
            param['fields'] = ['sgname'];  
            param['filter'] = 'parttype=\'Storage Group\'&datagrp=\'VMAX-StorageGroup\'&' + filter_sgname;

            CallGet.CallGetPerformance(param, function(sgperf) {  

                var matrics = [];
                for ( var i in sgperf[0].matrics ) {
                    var item = sgperf[0].matrics[i];
                    var matricsItem = {};
                    matricsItem["timestamp"] = item.timestamp;
                    matricsItem["Throughput"] = Math.round(item.ReadThroughput + item.WriteThroughput);
                    matricsItem["Requests"] = Math.round(item.ReadRequests + item.WriteRequests);
                    matricsItem["ReadResponseTime"] = Math.round(item.ReadResponseTime) ;
                    matricsItem["WriteResponseTime"] = Math.round(item.WriteResponseTime) ;
                        
                    matrics.push(matricsItem);
                } 
                callback(null, matrics);
            });

        } , function ( arg, callback ) {
            var resRecord = {};
            for ( var i in arg ) {
                var item = arg[i];
                var timestamp; 
                for ( var fieldname in item ) {
                    if ( fieldname == 'timestamp' ) {
                        timestamp = item[fieldname];
                        continue;
                    };

                    if ( resRecord[fieldname] === undefined ) {
                        resRecord[fieldname] = {};
                        resRecord[fieldname]['Title'] = fieldname;
                        resRecord[fieldname]['dataset'] = [];
                    }

                    var resItem = {};
                    resItem['timestamp'] = timestamp;
                    resItem['hour'] = moment.unix(timestamp).format('HH');
                    resItem[fieldname] = item[fieldname];

                    resRecord[fieldname]['dataset'].push(resItem);


                }
            }
            callback(null, resRecord);
        } 
        , function ( arg, callback ) { 
            for ( var fieldname in arg ) { 
                if ( arg[fieldname].dataset === undefined ) continue;
                for ( var i in arg[fieldname].dataset ) {
                    var item = arg[fieldname].dataset[i];
                    item['timestamp'] = moment.unix(item.timestamp).format('YYYY-MM-DD');
                }
            }
            callback(null,arg);
        }, function ( arg, callback ) {
            for ( var fieldname in arg ) { 
                if ( arg[fieldname].dataset === undefined ) continue;
                var resRecord = [];
                for ( var i in arg[fieldname].dataset ) {
                    var item = arg[fieldname].dataset[i];
                    var isfind = false;
                    for ( var j in resRecord ) {
                        var resItem = resRecord[j];
                        if ( resItem.hour == item.hour )  {
                            if ( resItem[fieldname] < item[fieldname] )  { 
                                resRecord[j] = item;
                            } 
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        resRecord.push(item);
                    }
                }
 

                resRecord.sort(sortBy("hour"));
                arg[fieldname].dataset = resRecord;
            }
            callback(null,arg);           
        }
    ], function (err, result) { 

        res.json(200, result );
    }); 

});






/**
 * @swagger
 * /api/analysis/app/workload/historypeak:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 应用负载峰值积累
 *     description: 获取指定Storage Group性能负载峰值积累. 在一定时间同期内(1-12月), 一天24小时内的每个小时的历史峰值
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: sg
 *         description: Storage Group名称
 *         required: true
 *         type: string 
 *         example: AWPDB_NEW_SG
 *       - in: query
 *         name: period
 *         description: 性能指标采样周期(1-12 Month)
 *         required: true
 *         type: integer 
 *         example: 1 
 *     responses:
 *       200:
 *         description: return the workload peak of specical array and storage group
 */ 
app.get('/api/analysis/app/workload/historypeak', function (req, res) { 
    res.setTimeout(300*1000); 
    var appname = req.query.appname;
    var device = req.query.devicesn;
    var sgname = req.query.sg; 
    var period = req.query.period;

    if ( appname === undefined || appname == '' ) {
        res.json(400, 'Must be special a appname!');
        return;
    };
    if ( device === undefined || device == '' ) {
        res.json(400, 'Must be special a storage!');
        return;
    };

    if ( sgname === undefined || sgname == '' ) {
        res.json(400, 'Must be special a storage group!');
        return;
    }; 

    if ( period === undefined || period == '' ) {
        res.json(400, 'Must be special a valid period value!');
        return;            
    } 
    if ( period <=0 || period >12 ) {
        res.json(400, 'Must be special a valid period value! (1-12)');
        return;   
    }
    
    var end = moment(moment().format("YYYY-MM-01")).toISOString();
    var start = moment(end).add(0-period,'month').toISOString();
 

    var queryPeriod = 3600;
    var data = {};
    async.waterfall([
        function(  callback){ 
          
            var filter_sgname = 'sgname=\''+sgname + '\''; 

            var param = {};
            param['device'] = device;
            param['period'] = queryPeriod;
            param['start'] = start;
            param['end'] = end;
            param['type'] = 'max';
            param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            param['keys'] = ['device','part']; 
            param['fields'] = ['sgname'];  
            param['filter'] = 'parttype=\'Storage Group\'&datagrp=\'VMAX-StorageGroup\'&' + filter_sgname;

            CallGet.CallGetPerformance(param, function(sgperf) {  

                var matrics = [];
                for ( var i in sgperf[0].matrics ) {
                    var item = sgperf[0].matrics[i];
                    var matricsItem = {};
                    matricsItem["timestamp"] = item.timestamp;
                    matricsItem["Throughput"] = Math.round(item.ReadThroughput + item.WriteThroughput);
                    matricsItem["Requests"] = Math.round(item.ReadRequests + item.WriteRequests);
                    matricsItem["ReadResponseTime"] = Math.round(item.ReadResponseTime) ;
                    matricsItem["WriteResponseTime"] = Math.round(item.WriteResponseTime) ;
                        
                    matrics.push(matricsItem);
                } 
                callback(null, matrics);
            });

        } , function ( arg, callback ) {
            var resRecord = {};
            for ( var i in arg ) {
                var item = arg[i];
                var timestamp; 
                for ( var fieldname in item ) {
                    if ( fieldname == 'timestamp' ) {
                        timestamp = item[fieldname];
                        continue;
                    };

                    if ( resRecord[fieldname] === undefined ) {
                        resRecord[fieldname] = {};
                        resRecord[fieldname]['Title'] = fieldname;
                        resRecord[fieldname]['dataset'] = [];
                    }

                    var resItem = {};
                    resItem['timestamp'] = timestamp;
                    resItem['hour'] = moment.unix(timestamp).format('HH');
                    resItem[fieldname] = item[fieldname];

                    resRecord[fieldname]['dataset'].push(resItem);


                }
            }
            callback(null, resRecord);
        } 
        , function ( arg, callback ) { 
            for ( var fieldname in arg ) { 
                if ( arg[fieldname].dataset === undefined ) continue;
                for ( var i in arg[fieldname].dataset ) {
                    var item = arg[fieldname].dataset[i];
                    item['timestamp'] = moment.unix(item.timestamp).format('YYYY-MM-DD');
                }
            }
            callback(null,arg);
        }, function ( arg, callback ) {
            for ( var fieldname in arg ) { 
                if ( arg[fieldname].dataset === undefined ) continue;
                var resRecord = [];
                for ( var i in arg[fieldname].dataset ) {
                    var item = arg[fieldname].dataset[i];
                    var isfind = false;
                    for ( var j in resRecord ) {
                        var resItem = resRecord[j];
                        if ( resItem.hour == item.hour )  {
                            if ( resItem[fieldname] < item[fieldname] )  { 
                                resRecord[j] = item;
                            } 
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        resRecord.push(item);
                    }
                }
                arg[fieldname].dataset = resRecord;
            }
            callback(null,arg);           
        }
    ], function (err, result) { 

        res.json(200, result );
    }); 

});



app.get('/api/analysis/app/workload/distribution1', function (req, res) { 
    res.setTimeout(300*1000); 
    var appname = req.query.appname;
    var device = req.query.devicesn;
    var sgname = req.query.sg; 

    if ( appname === undefined || appname == '' ) {
        res.json(400, 'Must be special a appname!');
        return;
    };
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
    var period = util.getPeriod(start,end);
    switch (period) {
        case 0 :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
        case 3600 :
            var dateFormat = "YYYYMMDD HH";
            break;
        case 86400 :
        case 604800 :
            var dateFormat = "YYYYMMDD";
            break;
        default :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
    }

    var data = {};
    async.waterfall([
        function(  callback){ 
          
            var filter_sgname = 'sgname=\''+sgname + '\''; 

            var param = {};
            param['device'] = device;
            param['period'] = util.getPeriod(start,end);
            param['start'] = start;
            param['end'] = end;
            param['type'] = 'max';
            param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            param['keys'] = ['device','part']; 
            param['fields'] = ['sgname'];  
            param['filter'] = 'parttype=\'Storage Group\'&datagrp=\'VMAX-StorageGroup\'&' + filter_sgname;

            CallGet.CallGetPerformance(param, function(sgperf) {  
                callback(null, sgperf);
            });

        } , function( data, callback ) {  
            var IOPS = [];
            var MBPS = [];
            var ResponseTime = [];
            for ( var i in data ) {
                var sgItem = data[i];
                for ( var j in sgItem.matrics ) { 
                    var item1 = sgItem.matrics[j];

                    var isfind = false;
                    for ( var z in IOPS ) {
                        if ( IOPS[z].timestamp == item1.timestamp ) {
                            isfind = true;
                            IOPS[z][sgItem.part] = Math.round(item1.WriteRequests + item1.ReadRequests);
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var IOPSItem = {};
                        IOPSItem["timestamp"] = item1.timestamp;
                        IOPSItem[sgItem.part] =Math.round( item1.WriteRequests + item1.ReadRequests);
                        IOPS.push(IOPSItem);
                    }

                    
                    isfind = false;
                    for ( var z in MBPS ) {
                        if ( MBPS[z].timestamp == item1.timestamp ) {
                            isfind = true;
                            MBPS[z][sgItem.part] = Math.round(item1.ReadThroughput + item1.ReadThroughput);
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var MBPSItem = {};
                        MBPSItem["timestamp"] = item1.timestamp;
                        MBPSItem[sgItem.part] = Math.round(item1.ReadThroughput + item1.WriteThroughput);
                        MBPS.push(MBPSItem);
                    }

                    
                    isfind = false;
                    for ( var z in ResponseTime ) {
                        if ( ResponseTime[z].timestamp == item1.timestamp ) {
                            isfind = true;
                            ResponseTime[z]["ReadResponseTime"] = item1.ReadResponseTime ;
                            ResponseTime[z]["WriteResponseTime"] = item1.WriteResponseTime ;
                            
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var ResponseTimeItem = {};
                        ResponseTimeItem["timestamp"] = item1.timestamp;
                        ResponseTimeItem["ReadResponseTime"] = item1.ReadResponseTime ;
                        ResponseTimeItem["WriteResponseTime"] = item1.WriteResponseTime ;
                        
                        ResponseTime.push(ResponseTimeItem);
                    }

                }
            }
            var dataset = {};
            dataset["IOPS"] = {};
            dataset["IOPS"]["Title"] = "IOPS";
            dataset["IOPS"]["dataset"] = IOPS;

            dataset["MBPS"] = {};
            dataset["MBPS"]["Title"] = "MBPS";
            dataset["MBPS"]["dataset"] = MBPS;


            dataset["ResponseTime"] = {};
            dataset["ResponseTime"]["Title"] = "Response Time(ms)";
            dataset["ResponseTime"]["dataset"] = ResponseTime;

            callback(null,dataset);

        }
    ], function (err, result) { 

        res.json(200, result );
    }); 

});




/**
 * @swagger
 * /api/analysis/array/frontend/historypeak:
 *   get:
 *     tags:
 *       - analysis
 *     summary: FE负载峰值积累
 *     description: 获取FE性能负载峰值积累. 在一定时间同期内(1-12月), 一天24小时内的每个小时的历史峰值
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: appname
 *         description: 应用名称 
 *         type: string
 *         example: 监督管理平台（AWP） 
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255 
 *       - in: query
 *         name: period
 *         description: 性能指标采样周期(1-12 Month)
 *         required: true
 *         type: integer 
 *         example: 1 
 *     responses:
 *       200:
 *         description: return the workload peak of specical array and storage group
 */ 
app.get('/api/analysis/array/frontend/historypeak', function (req, res) { 
    res.setTimeout(300*1000); 
    var appname = req.query.appname;
    var device = req.query.devicesn; 
    var period = req.query.period;

    if ( appname === undefined || appname == '' ) {
        res.json(400, 'Must be special a appname!');
        return;
    };
    if ( device === undefined || device == '' ) {
        res.json(400, 'Must be special a storage!');
        return;
    }; 
    if ( period === undefined || period == '' ) {
        res.json(400, 'Must be special a valid period value!');
        return;            
    } 
    if ( period <=0 || period >12 ) {
        res.json(400, 'Must be special a valid period value! (1-12)');
        return;   
    }
    
    //var end = moment(moment().format("YYYY-MM-01")).toISOString();
    //var start = moment(end).add(0-period,'month').toISOString();
    var end = moment().toISOString();
    var start = moment(end).add(0-period,'month').toISOString();

    var queryPeriod = 3600; 
            
        var param = {};
        param['device'] = '000297000161';
        param['period'] = queryPeriod;
        param['start'] = start;
        param['end'] = end;
        param['type'] = 'max';
        param['filter_name'] = '(name==\'Requests\'|name==\'CurrentUtilization\'|name==\'HostMBperSec\')';
        //param['filter_name'] = '(name==\'Requests\')';
        param['keys'] = ['device','part']; 
        param['fields'] = ['model'];
            
        param['filter'] = 'datagrp=\'VMAX-FEDirector\'' ; 
        
        CallGet.CallGetPerformance(param, function(feperf) {
            
            var resData = {};  
            for ( var i in feperf ) {
                var item = feperf[i];
                var fename = item.part;
                var device = item.device;


                for ( var j in item.matrics ) {
                    var matricsItem = item.matrics[j];

                    var timestamp ;
                    for ( var fieldname in matricsItem ) {
                        if ( fieldname == 'timestamp' ) {
                            timestamp = matricsItem[fieldname];
                            continue;
                        }

                        var hour = moment.unix(timestamp).format('HH');
                        var ts = moment.unix(timestamp).format('YYYY-MM-DD');

                        if ( resData[fieldname] === undefined ) {
                            resData[fieldname] = {};
                            resData[fieldname]['Title'] = fieldname;
                            resData[fieldname]['dataset'] = [];
                        }

                        var isfind = false;
                        for ( var z in resData[fieldname].dataset ) {
                            var resItem = resData[fieldname].dataset[z];
                            if ( resItem.hour == hour ) {
                                if ( resItem[fename] === undefined ) {
                                    resItem[fename] = matricsItem[fieldname];
                                    resItem[fename+"_label"] = ts + '<br>' + fename + ': ' + matricsItem[fieldname];
                                } else if ( resItem[fename] < matricsItem[fieldname] ) {
                                    resItem[fename] = matricsItem[fieldname];
                                    resItem[fename+"_label"] = ts + '<br>' + fename + ': ' + matricsItem[fieldname];                                    
                                }
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var resItem  = {};
                            resItem['hour'] = hour;
                            resItem[fename] = matricsItem[fieldname];
                            resItem[fename+"_label"] = ts + '<br>' + fename + ': ' + matricsItem[fieldname];
                            resData[fieldname].dataset.push(resItem);
                    
                        }
                    }
                }
                
            }

            // Sort dataset by hour
            for ( var fieldname in resData ) {
                var item = resData[fieldname];
                item["dataset"].sort(sortBy("hour"));
            }

            res.json(200, resData ); 
        }); 
});


/**
 * @swagger
 * /api/analysis/array/frontend/AbnormalBehavior:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 前端控制器异常行为记录
 *     description: 获取前端控制器异常行为记录
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: fename
 *         description: 前端控制器名称
 *         required: false
 *         type: string
 *         example: FA-7F
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z
 *     responses:
 *       200:
 *         description: return the workload peak of specical array and storage group
 */ 
app.get('/api/analysis/array/frontend/AbnormalBehavior', function (req, res) { 
    res.setTimeout(300*1000);  
    var device = req.query.devicesn;
    var fename = req.query.fename; 
 
    if ( device === undefined || device == '' ) {
        res.json(400, 'Must be special a storage!');
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
    var start = moment(req.query.from).toISOString(true); 
    var end = moment(req.query.to).toISOString(true);


    // for test
    var resData = '[                                         \
        {                                 \
            "devicesn":"000492600256",    \
            "director":"FA-11E",          \
            "timestamp":"1532145600",     \
            "AbnormalMatricsName":[       \
                "IOPS",                   \
                "MBPS"                    \
            ],                            \
            "IOPS":1,                     \
            "MBPS":1,                     \
            "RW":1,                       \
            "BlockSize":1,                \
            "Utilization":1,              \
            "ResponeTime":1               \
        },                                \
        {                                 \
            "devicesn":"000297000161",    \
            "director":"FA-1D",           \
            "timestamp":"1532145600",     \
            "AbnormalMatricsName":[       \
                "Utilization",            \
                "ResponeTime"             \
            ],                            \
            "IOPS":1,                     \
            "MBPS":1,                     \
            "RW":1,                       \
            "BlockSize":1,                \
            "Utilization":1,              \
            "ResponeTime":1               \
        }                                 \
    ]                                     ' ;
    async.waterfall([
        function( callback ) {
            var s = JSON.parse(resData);
            callback(null, s);

        }
    ], function (err, result) { 

        res.json(200, result );
    }); 

     
});



/**
 * @swagger
 * /api/analysis/array/frontend/workload:
 *   get:
 *     tags:
 *       - analysis
 *     summary: 存储前端口负载分布
 *     description: 获取指定存储的前端控制器性能负载指标。指标包括每个前端控制器的IOPS，MBPS，Utilization.
 *     security:
 *       - Bearer: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: devicesn
 *         description: 存储序列号
 *         required: true
 *         type: string
 *         example: 000492600255
 *       - in: query
 *         name: fename
 *         description: 前端控制器名称
 *         required: false
 *         type: string
 *         example: FA-7F
 *       - in: query
 *         name: from
 *         description: 性能指标采样起始时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-05-01T00:00:00Z
 *       - in: query
 *         name: to
 *         description: 性能指标采样结束时间(格式:ISO 8601)
 *         required: true
 *         type: string 
 *         example: 2018-06-10T00:00:00Z
 *     responses:
 *       200:
 *         description: return the workload of specical array and storage group
 */ 

app.get('/api/analysis/array/frontend/workload', function (req, res) { 
    res.setTimeout(300*1000);  
    var device = req.query.devicesn;
    var fename = req.query.fename; 
 
    if ( device === undefined || device == '' ) {
        res.json(400, 'Must be special a storage!');
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
    var start = moment(req.query.from).toISOString(true); 
    var end = moment(req.query.to).toISOString(true);
    var period = util.getPeriod(start,end);
    switch (period) {
        case 0 :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
        case 3600 :
            var dateFormat = "YYYYMMDD HH";
            break;
        case 86400 :
        case 604800 :
            var dateFormat = "YYYYMMDD";
            break;
        default :
            var dateFormat = "YYYYMMDD HH:mm:ss";
            break;
    }

    var isNeedBaseLine = false;

    var data = {};
    var arrayname = "";
     
    async.waterfall([
        function( callback ) {
            var filter = {"sn":device};
            DeviceMgmt.getMgmtObjectInfo(filter, function(arrayInfo) {
                if ( arrayInfo.length > 0 ) {
                    arrayname = arrayInfo[0].name;
                } 
                callback(null,arrayname);
            })

        },
        function( arrayname, callback){ 
           

            var param = {};
            param['device'] = device;
            param['period'] = util.getPeriod(start,end);
            param['start'] = start;
            param['end'] = end;
            param['type'] = 'max';
            param['filter_name'] = '(name==\'Requests\'|name==\'CurrentUtilization\'|name==\'HostMBperSec\')';
            param['keys'] = ['device','part']; 
            param['fields'] = ['model'];
            
            if ( fename === undefined ) 
                param['filter'] = 'datagrp=\'VMAX-FEDirector\'' ;
            else {
                param['filter'] = 'datagrp=\'VMAX-FEDirector\'&part=\'' + fename +'\'' ;
                isNeedBaseLine = true;
            }
                
            

            CallGet.CallGetPerformance(param, function(feperf) {  
                var resData = {};  
                for ( var i in feperf ) {
                    var item = feperf[i];
                    var itemFename = item.part;
                    var itemDevice = item.device; 
    
                    for ( var j in item.matrics ) {
                        var matricsItem = item.matrics[j];
                        var timestamp ;
                        for ( var fieldname in matricsItem ) { 
                            if ( fieldname == 'timestamp' )  timestamp = matricsItem[fieldname];
                            else  {
                                if ( resData[fieldname] === undefined ) {
                                    resData[fieldname] = {};
                                    resData[fieldname]["Title"] = fieldname;
                                    resData[fieldname]["dataset"] = [];
                                }
                                var isfind = false;
                                for ( var ii in resData[fieldname]["dataset"] ) {
                                    var item1 =  resData[fieldname]["dataset"][ii];
                                    if ( item1.timestamp == timestamp ) {
                                        item1[itemFename] = matricsItem[fieldname];
                                        isfind = true;
                                        break;
                                    }
                                }
                                if ( isfind == false  ) {
                                    var item1 = {};
                                    item1["timestamp"] = timestamp;
                                    item1[itemFename] = matricsItem[fieldname];
                                    resData[fieldname]["dataset"].push(item1); 
                                }
                               
                            }
    
                        }
                    }
                }
                data["orgiData"] = { "Array": {} , "matrics" : {}};
                data.orgiData.Array["sn"] = device;
                data.orgiData.Array["name"] = arrayname;
                data.orgiData.Array["haveBaseLine"] = isNeedBaseLine;
                data.orgiData.Array["FEName"] = fename;
                                
                if ( feperf[0] === undefined ) 
                    data.orgiData.matrics = {};
                else 
                    data.orgiData.matrics = resData;

                callback(null, data);
            });
        } , function( data, callback ) {  
            if ( isNeedBaseLine == false ) {
                callback(null,data);
            } else {
                var param = {};
                param['device'] = device;
                param['period'] = util.getPeriod(start,end);
                param['type'] = 'max';
                param['filter_name'] = '(name==\'Requests\'|name==\'CurrentUtilization\'|name==\'HostMBperSec\')';
                param['keys'] = ['device','part']; 
                param['fields'] = ['model'];   

                param['start'] = moment.unix(moment(start,moment.ISO_8601).unix() - 2419200).toISOString(true);
                param['end'] = start;
                
                if ( fename === undefined ) 
                    param['filter'] = 'datagrp=\'VMAX-FEDirector\'' ;
                else {
                    param['filter'] = 'datagrp=\'VMAX-FEDirector\'&part=\'' + fename +'\'' ; 
                }

                CallGet.CallGetPerformance(param, function(feperf) {  
  
                    if ( feperf[0] === undefined ) data["baselineData"] = [];
                    else 
                        data["baselineData"] = feperf[0].matrics;
                        
                    callback(null, data);
                });

            }
        
        } , 
        function( data, callback ) {
            if ( isNeedBaseLine == false ) { 
                callback(null, data); 
            } else {
                callback(null, data);  
            }
        } 
        , function ( arg, callback ) {
            var origData= arg.orgiData.matrics;
            for ( var fieldname in origData ) {
                // fix issue for sort by the timestamp 
                origData[fieldname].dataset.sort(sortBy("timestamp"));
                for ( var i in origData[fieldname].dataset ) {
                    var item = origData[fieldname].dataset[i];
                    item['timestamp'] = moment.unix(item.timestamp).format(dateFormat)
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
