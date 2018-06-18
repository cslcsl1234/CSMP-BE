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
   
    app.get('/api/analysis/app/info', function (req, res) {
        res.setTimeout(3600*1000);
        var device;
        var config = configger.load();  
        async.waterfall(
            [

                function(callback){
                    console.log(moment.utc(Date.now()).format() + " Begin Query mongodb ...");
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
                                        
                                    console.log(item.array +"|"+ redoItem.devicesn +"|"+ item.SG +"|"+ redoItem.sgname+"\t" +redoItem.redovol);
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
                    
                    var res = [];
 
                    DeviceMgmt.GetArrayAliasName(function(arrayinfo) {  
                         

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
                                    sgItemNew.volumes = item.volumes;
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
                            sgItemNew.volumes = item.volumes;
                            sgItemNew.redovol = item.redovol;
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
                                resultItem["sgname"] = item3.name;
                                resultItem["volumes"] = item3.volumes;
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
            function ( arg1, callback) {

                var SG_ResponseTime = {}; 
                var SG_IOPS = {}; 
                var SG_MBPS = {};
                var SG_REDO = {};

                var MatricsData = arg1.matrics;

                for ( var i in MatricsData ) {
                    var item = MatricsData[i]; 

                    //ResponseTime
                    for ( var fieldName in item ) { 
                        if ( fieldName.indexOf("ResponseTime") < 0  && fieldName.indexOf("timestamp") ) continue; 
    
                        var isfind = false ;
                        for ( var fieldName1 in SG_ResponseTime ) { 
                            if ( fieldName1 == fieldName ) {
                                SG_ResponseTime[fieldName1].push(item[fieldName]);
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var SG_ResponseTimeItem = [];  
                            SG_ResponseTimeItem.push(item[fieldName]);
                            SG_ResponseTime[fieldName] = SG_ResponseTimeItem; 
                        }
                    }

                    //IOPS
                    for ( var fieldName in item ) { 
                        if ( fieldName.indexOf("Requests") < 0  && fieldName.indexOf("timestamp") ) continue; 
    
                        var isfind = false ;
                        for ( var fieldName1 in SG_IOPS ) { 
                            if ( fieldName1 == fieldName ) {
                                SG_IOPS[fieldName1].push(item[fieldName]);
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var SG_IOPSItem = [];  
                            SG_IOPSItem.push(item[fieldName]);
                            SG_IOPS[fieldName] = SG_IOPSItem; 
                        }
                    }

                    
                    //MBPS
                    for ( var fieldName in item ) { 
                        if ( fieldName.indexOf("Throughput") < 0  && fieldName.indexOf("timestamp") ) continue; 
    
                        var isfind = false ;
                        for ( var fieldName1 in SG_MBPS ) { 
                            if ( fieldName1 == fieldName ) {
                                SG_MBPS[fieldName1].push(item[fieldName]);
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var resItem = [];  
                            resItem.push(item[fieldName]);
                            SG_MBPS[fieldName] = resItem; 
                        }
                    }
                }

                var ret = {};
                ret.dataset = {};
                ret.dataset["ResponseTime"] = SG_ResponseTime; 
                ret.dataset["IOPS"] = SG_IOPS; 
                ret.dataset["MBPS"] = SG_MBPS; 
                callback(null,ret);
            },
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
                param['period'] = 3600;
                param['start'] = start;
                param['end'] = end;
                param['type'] = 'max';
                param['filter_name'] = '(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
                param['keys'] = ['device','part']; 
                param['fields'] = ['disktype'];  
                param['filter'] = (part===undefined?"":part+"&") + 'parttype=\'LUN\'';
 
                CallGet.CallGetPerformance(param, function(param) { 

                    var VolumePerfOrg = param;
                    var VolumePerf = [];
                    for ( var i in VolumePerfOrg ) {
                        var item = VolumePerfOrg[i]; 
        
                        for ( var j in item.matrics ) {
                            var item1 = item.matrics[j];
        
                            var isfind = false;
                            for ( var z in VolumePerf ) {
                                var itemResult = VolumePerf[z];
                                if ( itemResult.timestamp == item1.timestamp ) {
                                    isfind = true;
                                    itemResult[item.part+"_ReadRequests"] = item1.ReadRequests;
                                    itemResult[item.part+"_WriteRequests"] = item1.WriteRequests; 
                                    itemResult[item.part+"_ReadThroughput"] = item1.ReadThroughput;
                                    itemResult[item.part+"_WriteThroughput"] = item1.WriteThroughput; 
                                                                        
                                    break;
                                }
                            }
                            if ( isfind == false ) {
                                var itemResult = {};
                                itemResult["timestamp"] = item1.timestamp;
                                itemResult[item.part+"_ReadRequests"] = item1.ReadRequests;
                                itemResult[item.part+"_WriteRequests"] = item1.WriteRequests; 
                                itemResult[item.part+"_ReadThroughput"] = item1.ReadThroughput;
                                itemResult[item.part+"_WriteThroughput"] = item1.WriteThroughput; 
                                                               
                                VolumePerf.push(itemResult);
                            }
                        }
                    }
                    
                    var SG_REDO = {};
                    for ( var i in VolumePerf ) {
                        var item = VolumePerf[i];
 
                        for ( var fieldName in item ) { 
                            //if ( fieldName.indexOf("Throughput") < 0  && fieldName.indexOf("timestamp") ) continue; 
        
                            var isfind = false ;
                            for ( var fieldName1 in SG_REDO ) { 
                                if ( fieldName1 == fieldName ) {
                                    SG_REDO[fieldName1].push(item[fieldName]);
                                    isfind = true;
                                    break;
                                }
                            }
                            if ( isfind == false ) {
                                var resItem = [];  
                                resItem.push(item[fieldName]);
                                SG_REDO[fieldName] = resItem; 
                            }
                        }
                    }

                    
                    arg1.dataset["REDO"] = SG_REDO; 
                    callback(null, arg1 ); 
                });

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

    app.get('/api/analysis/part/workload', function (req, res) {  
        var device = req.query.devicesn;  

        if ( device === undefined ) {
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

        var period = 86400;
        var valuetype = 'max'; 

        async.waterfall([
            function(callback){  
                var param = {}; 
                param['keys'] = ['device'];
                param['fields'] = ['name'];
                param['period'] = period;
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
                        //delete item.parttype;
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
                    var resultRDF = [];
                    for ( var j in result){ 
                        if ( result[j].partgrp== 'RDF') 
                            resultRDF.push(result[j])                    
                        } 

                    for ( var i in resultRDF ) {
                        var item = resultRDF[i];
                        delete item.matricsStat;
                        delete item.partgrp;
                        //delete item.parttype;
                        delete item.model;
                        delete item.device;
 
                    }; 
                    arg1["RDF"] = resultRDF;
                    //res.json(200, arg1 );

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
                        if ( i<5 ) {
                            resultDisk.EFD[i].matrics.part = resultDisk.EFD[i].matrics.part + "(EFD)";
                            top10Disk.push(resultDisk.EFD[i].matrics); 
                        }
                        else top10Disk.push(resultDisk.SAS[i].matrics);
                    }

                    arg["DISK_TOP10"] = top10Disk;
                    callback(null,arg);
                });
                //callback(null,arg);
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
                            itemResult[item.part+"_SysCallCount"] = item1.SysCallCount;                            
                            itemResult[item.part+"_QueueDepthCountRange0"] = item1.QueueDepthCountRange0;                            
                            itemResult[item.part+"_QueueDepthCountRange1"] = item1.QueueDepthCountRange1;                            
                            itemResult[item.part+"_QueueDepthCountRange2"] = item1.QueueDepthCountRange2;                            
                            itemResult[item.part+"_QueueDepthCountRange3"] = item1.QueueDepthCountRange3;                            
                            itemResult[item.part+"_QueueDepthCountRange4"] = item1.QueueDepthCountRange4;                            
                            itemResult[item.part+"_QueueDepthCountRange5"] = item1.QueueDepthCountRange5;                            
                            itemResult[item.part+"_QueueDepthCountRange6"] = item1.QueueDepthCountRange6;                            
                            itemResult[item.part+"_QueueDepthCountRange7"] = item1.QueueDepthCountRange7;                            
                            itemResult[item.part+"_QueueDepthCountRange8"] = item1.QueueDepthCountRange8;                            
                            itemResult[item.part+"_QueueDepthCountRange9"] = item1.QueueDepthCountRange9;                            

                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var itemResult = {};
                        itemResult["timestamp"] = item1.timestamp;
                        itemResult[item.part+"_ReadRequests"] = item1.ReadRequests;
                        itemResult[item.part+"_WriteRequests"] = item1.WriteRequests;
                        itemResult[item.part+"_MBTransferred"] = item1.MBTransferred;
                        itemResult[item.part+"_SysCallCount"] = item1.SysCallCount;
                        itemResult[item.part+"_QueueDepthCountRange0"] = item1.QueueDepthCountRange0;                            
                        itemResult[item.part+"_QueueDepthCountRange1"] = item1.QueueDepthCountRange1;                            
                        itemResult[item.part+"_QueueDepthCountRange2"] = item1.QueueDepthCountRange2;                            
                        itemResult[item.part+"_QueueDepthCountRange3"] = item1.QueueDepthCountRange3;                            
                        itemResult[item.part+"_QueueDepthCountRange4"] = item1.QueueDepthCountRange4;                            
                        itemResult[item.part+"_QueueDepthCountRange5"] = item1.QueueDepthCountRange5;                            
                        itemResult[item.part+"_QueueDepthCountRange6"] = item1.QueueDepthCountRange6;                            
                        itemResult[item.part+"_QueueDepthCountRange7"] = item1.QueueDepthCountRange7;                            
                        itemResult[item.part+"_QueueDepthCountRange8"] = item1.QueueDepthCountRange8;                            
                        itemResult[item.part+"_QueueDepthCountRange9"] = item1.QueueDepthCountRange9;                            

                        DirectorIOPS1.push(itemResult);
                    }
                }
            }


            var RDF = result.data["RDF"];

            var RDF_MBPS = [];
            for ( var i in RDF ) {
                var item = RDF[i]; 

                for ( var j in item.matrics ) {
                    var item1 = item.matrics[j];

                    var isfind = false;
                    for ( var z in RDF_MBPS ) {
                        var itemResult = RDF_MBPS[z];
                        if ( itemResult.timestamp == item1.timestamp ) {
                            isfind = true;
                            itemResult[item.part+"_MBPS"] = item1.ReadThroughput + item1.WriteThroughput;
                            itemResult[item.part+"_CurrentUtilization"] = item1.CurrentUtilization;                           

                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var itemResult = {};
                        itemResult["timestamp"] = item1.timestamp; 
                        
                        itemResult[item.part+"_MBPS"] = item1.ReadThroughput + item1.WriteThroughput;
                        itemResult[item.part+"_CurrentUtilization"] = item1.CurrentUtilization;                               

                        RDF_MBPS.push(itemResult);
                    }
                }
            }

            
            var RDF = result.data["DISK_TOP10"];

            var RDF_MBPS = [];
            for ( var i in RDF ) {
                var item = RDF[i]; 

                for ( var j in item.matrics ) {
                    var item1 = item.matrics[j];

                    var isfind = false;
                    for ( var z in RDF_MBPS ) {
                        var itemResult = RDF_MBPS[z];
                        if ( itemResult.timestamp == item1.timestamp ) {
                            isfind = true;
                            itemResult[item.part+"_MBPS"] = item1.ReadThroughput + item1.WriteThroughput;
                            itemResult[item.part+"_CurrentUtilization"] = item1.CurrentUtilization;                           

                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var itemResult = {};
                        itemResult["timestamp"] = item1.timestamp; 
                        
                        itemResult[item.part+"_MBPS"] = item1.ReadThroughput + item1.WriteThroughput;
                        itemResult[item.part+"_CurrentUtilization"] = item1.CurrentUtilization;                               

                        RDF_MBPS.push(itemResult);
                    }
                }
            }

            // -------------------------------------
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
 
            var QueueDepthCountResult = {};
            for ( var i in DirectorIOPS1 ) {
                var item = DirectorIOPS1[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("QueueDepthCountRange") < 0  && fieldName.indexOf("timestamp") ) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in QueueDepthCountResult ) { 
                        if ( fieldName1 == fieldName ) {
                            QueueDepthCountResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var DirectorSysCallResultItem = [];  
                        DirectorSysCallResultItem.push(item[fieldName]);
                        QueueDepthCountResult[fieldName] = DirectorSysCallResultItem; 
                    }
                }
            }
 

            // =========================================
            var RDFMBPSResult = {};  

            
            for ( var i in RDF_MBPS ) {
                var item = RDF_MBPS[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("MBPS") < 0 && fieldName.indexOf("timestamp")) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in RDFMBPSResult ) { 
                        if ( fieldName1 == fieldName ) {
                            RDFMBPSResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var DirectorIOPSResultItem = [];  
                        DirectorIOPSResultItem.push(item[fieldName]);
                        RDFMBPSResult[fieldName] = DirectorIOPSResultItem; 
                    }
                }
            }


            var RDFUTILResult = {};  

            
            for ( var i in RDF_MBPS ) {
                var item = RDF_MBPS[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("CurrentUtilization") < 0 && fieldName.indexOf("timestamp")) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in RDFUTILResult ) { 
                        if ( fieldName1 == fieldName ) {
                            RDFUTILResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var ResultItem = [];  
                        ResultItem.push(item[fieldName]);
                        RDFUTILResult[fieldName] = ResultItem; 
                    }
                }
            }

            var ret = {};
            ret.dataset = {};
            ret.dataset["ARRAY_CacheHit"] = CacheHitResult;
            ret.dataset["FA_IOPS"] = DirectorIOPSResult;
            ret.dataset["FA_MBPS"] = DirectorMBPSResult;
            ret.dataset["FA_SysCall"] = DirectorSysCallResult;
            ret.dataset["FA_QueueDepth"] = QueueDepthCountResult;
            ret.dataset["RDF_MBPS"] = RDFMBPSResult;
            ret.dataset["RDF_Utilization"] = RDFUTILResult;
            res.json(200, ret );


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
                       // res.json(200, resultNew );
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


                                
                var EDUtilSource = arg1["Enginuity Data Services"]; 
                var EDUtils = [];
                for ( var i in EDUtilSource ) {
                    var item = EDUtilSource[i]; 
    
                    for ( var j in item.matrics ) {
                        var item1 = item.matrics[j];
    
                        var isfind = false;
                        for ( var z in EDUtils ) {
                            var itemResult = EDUtils[z];
                            if ( itemResult.timestamp == item1.timestamp ) {
                                isfind = true;  
                                itemResult[item.part+"_CurrentUtilization"] = item1.CurrentUtilization;
                                
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var DirectorIOPSItem = {};
                            DirectorIOPSItem["timestamp"] = item1.timestamp;
        
                            EDUtils.push(DirectorIOPSItem);
                        }
                    }
                } 

                var IMUtilSource = arg1["Infrastructure Manager"]; 
                var IMUtils = [];
                for ( var i in IMUtilSource ) {
                    var item = IMUtilSource[i]; 
    
                    for ( var j in item.matrics ) {
                        var item1 = item.matrics[j];
    
                        var isfind = false;
                        for ( var z in IMUtils ) {
                            var itemResult = IMUtils[z];
                            if ( itemResult.timestamp == item1.timestamp ) {
                                isfind = true;  
                                itemResult[item.part+"_CurrentUtilization"] = item1.CurrentUtilization;
                                
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var DirectorIOPSItem = {};
                            DirectorIOPSItem["timestamp"] = item1.timestamp;
        
                            IMUtils.push(DirectorIOPSItem);
                        }
                    }
                } 

                var result = {};
                result["FA"] = FAUtils;
                result["RDF"] = RDFUtils;
                result["BE"] = BEUtils;
                result["ED"] = EDUtils;
                result["IM"] = IMUtils;
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

                
                var EDUtilResult = {}; 
                for ( var i in arg1.ED ) {
                    var item = arg1.ED[i]; 
                    for ( var fieldName in item ) { 
                        if ( fieldName.indexOf("CurrentUtilization") < 0 && fieldName.indexOf("timestamp")) continue; 
    
                        var isfind = false ;
                        for ( var fieldName1 in EDUtilResult ) { 
                            if ( fieldName1 == fieldName ) {
                                EDUtilResult[fieldName1].push(item[fieldName]);
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var FAUtilResultItem = [];  
                            FAUtilResultItem.push(item[fieldName]);
                            EDUtilResult[fieldName] = FAUtilResultItem; 
                        }
                    }
                }


                var IMUtilResult = {}; 
                for ( var i in arg1.IM ) {
                    var item = arg1.IM[i]; 
                    for ( var fieldName in item ) { 
                        if ( fieldName.indexOf("CurrentUtilization") < 0 && fieldName.indexOf("timestamp")) continue; 
    
                        var isfind = false ;
                        for ( var fieldName1 in IMUtilResult ) { 
                            if ( fieldName1 == fieldName ) {
                                IMUtilResult[fieldName1].push(item[fieldName]);
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var FAUtilResultItem = [];  
                            FAUtilResultItem.push(item[fieldName]);
                            IMUtilResult[fieldName] = FAUtilResultItem; 
                        }
                    }
                }


                var result = {};
                result.dataset = {};
                result.dataset["Front-End"] = FAUtilResult;
                result.dataset["RDF"] = RDFUtilResult;
                result.dataset["Back-End"] = BEUtilResult;
                result.dataset["ED"] = EDUtilResult;
                result.dataset["IM"] = IMUtilResult;

                callback(null,result);
    
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
 

        if ( device === undefined ) {
            res.json(400, 'Must be special a storage!');
            return;
        };

        if ( sgname === undefined ) {
            res.json(400, 'Must be special a storage group!');
            return;
        }; 

        if ( start === undefined ) {
            res.json(400, 'Must be special a from ( begintime )!');
            return;
        }; 

        if ( end === undefined ) {
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
                        param['period'] = 604800;
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


    if ( device === undefined ) {
        res.json(400, 'Must be special a storage!');
        return;
    };

    if ( volume === undefined ) {
        res.json(400, 'Must be special a volume!');
        return;
    }; 

    if ( start === undefined ) {
        res.json(400, 'Must be special a from ( begintime )!');
        return;
    }; 

    if ( end === undefined ) {
        res.json(400, 'Must be special a to ( endtime ) !');
        return;
    }; 

    async.waterfall([
        
        function( callback ) {  
            var param = {}; 
            param['keys'] = ['device','part'];
            param['fields'] = ['name'];
            param['period'] = 3600;
            param['start'] = start;
            param['end'] = end;
            param['filter'] =  'device==\''+device+'\'&part==\''+volume+'\'&(parttype==\'LUN\')';
            param['filter_name'] = '(name==\'ReadThroughput\'|name==\'WriteThroughput\'|name==\'ReadResponseTime\'|name==\'WriteResponseTime\'|name==\'ReadRequests\'|name==\'WriteRequests\')';
            param['type'] = 'max'; 
    
            CallGet.CallGetPerformance(param, function(lunperf) {  

                var VolMatrics = lunperf[0].matrics;
                for ( var i in VolMatrics ) {
                    var item = VolMatrics[i];
                    item["ReadIOSize"]  = (item.ReadThroughput / item.ReadRequests).toFixed(2);
                    item["WriteIOSize"]  = (item.WriteThroughput / item.WriteRequests).toFixed(2);

                    item["WriteIOPercent"] = ( item.WriteRequests / (item.WriteRequests + item.ReadRequests) ).toFixed(2);
                }
                
                callback(null, lunperf);
    
            }); 

        },
        function(arg,  callback) { 

            var IOPSResult = {}; 
            for ( var i in arg[0].matrics ) {
                var item = arg[0].matrics[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("Requests") < 0 && fieldName.indexOf("timestamp")) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in IOPSResult ) { 
                        if ( fieldName1 == fieldName ) {
                            IOPSResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var ResultItem = [];  
                        ResultItem.push(item[fieldName]);
                        IOPSResult[fieldName] = ResultItem; 
                    }
                }
            }

            var RTResult = {}; 
            for ( var i in arg[0].matrics ) {
                var item = arg[0].matrics[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("ResponseTime") < 0 && fieldName.indexOf("timestamp")) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in RTResult ) { 
                        if ( fieldName1 == fieldName ) {
                            RTResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var ResultItem = [];  
                        ResultItem.push(item[fieldName]);
                        RTResult[fieldName] = ResultItem; 
                    }
                }
            }

            var IOSizeResult = {}; 
            for ( var i in arg[0].matrics ) {
                var item = arg[0].matrics[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("IOSize") < 0 && fieldName.indexOf("timestamp")) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in IOSizeResult ) { 
                        if ( fieldName1 == fieldName ) {
                            IOSizeResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var ResultItem = [];  
                        ResultItem.push(item[fieldName]);
                        IOSizeResult[fieldName] = ResultItem; 
                    }
                }
            }


            var IOPercentResult = {}; 
            for ( var i in arg[0].matrics ) {
                var item = arg[0].matrics[i]; 
                for ( var fieldName in item ) { 
                    if ( fieldName.indexOf("Percent") < 0 && fieldName.indexOf("timestamp")) continue; 

                    var isfind = false ;
                    for ( var fieldName1 in IOPercentResult ) { 
                        if ( fieldName1 == fieldName ) {
                            IOPercentResult[fieldName1].push(item[fieldName]);
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var ResultItem = [];  
                        ResultItem.push(item[fieldName]);
                        IOPercentResult[fieldName] = ResultItem; 
                    }
                }
            }

            var finalResult = {};
            finalResult.dataset = {};
            finalResult.dataset["IOPS"] = IOPSResult;
            finalResult.dataset["ResponseTime"] = RTResult;
            finalResult.dataset["IOSize"] = IOSizeResult;
            finalResult.dataset["IOPercent"] = IOPercentResult;
                        
            callback(null,finalResult);

        } ,
        function(arg, callback ) {

            callback(null,arg);
        }
    ], function (err, result) { 

        res.json(200, result );
    }); 

}); 




};


module.exports = analysisController;
