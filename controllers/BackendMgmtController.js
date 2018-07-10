"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('BackendMgmtController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger'); 
var mongoose = require('mongoose'); 
var backendMgmt = require('../lib/BackendMgmt');
var xml2json = require('xml2json');
var async = require('async'); 
var moment = require('moment');
var urlencode = require('urlencode');

/**
 * @swagger
 * definitions:
 *   collecter:
 *     properties:
 *       export-id:
 *         type: string
 *         example: vmax
 *       device-name:
 *         type: string
 *         example: EMC VMAX
 *         description: A name of collecter. it is an unique name of the list.
 *       sp-id:
 *         type: string
 *         example: emc-vmax-4.1.1
 *       spb-id:        
 *         type: string
 *         example: emc-vmax-collect
 *       spb-version:
 *         type: string
 *         example: 4.1.1
 *       collecter-name:
 *         type: string
 *         example: EMC VMAX 采集器 (DMX/VMAX/VMAX2) 
 *       DevCount:
 *         type: integer
 *         description: the number of devices managered by collecter. 
 */


/**
 * @swagger
 * definitions:
 *   DeviceInfoItem:
 *     properties:
 *       export-id:
 *         type: string
 *         example: vmax
 *       device-name:
 *         type: string
 *         example: EMC VMAX
 *         description: A name of collecter. it is an unique name of the list.
 *       sp-id:
 *         type: string
 *         example: emc-vmax-4.1.1
 *       spb-id:        
 *         type: string
 *         example: emc-vmax-collect
 *       spb-version:
 *         type: string
 *         example: 4.1.1 
 *       detailinfo:
 *         type: string
 *         
 */


var BackendMgmtController = function (app) {

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



    app.get('/api/backendmgmt/test', function (req, res) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        backendMgmt.BackEndLogin(function(ret) {
            res.json(200 , ret);
        });

 

    });


 
/**
 * @swagger
 * /api/backendmgmt/discocenter/devicemgmt/list:
 *   get:
 *     tags:
 *       - Backendmgmt
 *     description: Returns collecter list 
 *     produces:
 *       - application/json 
 *     responses:
 *       200:
 *         description: An array of collecter list
 *         schema:
 *            $ref: '#/definitions/collecter'
 */ 
   
    app.get('/api/backendmgmt/discocenter/devicemgmt/list', function (req, res1) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        backendMgmt.getCollectCatalogs( function (result ) {
            res1.json(200,result);
        })
    });


/**
 * @swagger
 * /api/backendmgmt/discocenter/devicemgmt/get:
 *   get:
 *     tags:
 *       - Backendmgmt
 *     description: Returns collecter list 
  *     security:
 *       - Bearer: []
*     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: sp-id
 *         description: sp-id
 *         required: true
 *         type: string
 *       - in: query
 *         name: spb-id
 *         description: spb-id
 *         required: true
 *         type: string
 *       - in: query
 *         name: spb-version
 *         description: spb-version
 *         required: true
 *         type: string
 *       - in: query
 *         name:  export-id
 *         description:  export-id
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: 返回所有该采集类型管理下的设备信息列表 
 */ 
         
        app.get('/api/backendmgmt/discocenter/devicemgmt/get', function (req, res1) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            var query = {};
            if ( req.query["sp-id"] === undefined ) {
                res1.json(400, 'Must be have sp-id!')
                return;
            }
            if (  req.query["spb-id"] === undefined ) {
                res1.json(400, 'Must be have spb-id!')
                return;
            }
            if ( req.query["spb-version"] === undefined ) {
                res1.json(400, 'Must be have spb-version!')
                return;
            }
            if ( req.query["export-id"] === undefined ) {
                res1.json(400, 'Must be have export-id!')
                return;
            }
            query.spId = req.query["sp-id"];
            query.spbId = req.query["spb-id"];
            query.spbVersion = req.query["spb-version"];
            query.exportId = req.query["export-id"];
 
            backendMgmt.getCollectObjects(query,function(result ) {
                res1.json(200,result);
            })
        });


/**
 * @swagger
 * /api/backendmgmt/discocenter/devicemgmt/add:
 *   get:
 *     tags:
 *       - Backendmgmt
 *     description: Returns Device Location info
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: sp-id
 *         description: sp-id
 *         required: true
 *         type: string
 *       - in: query
 *         name: spb-id
 *         description: spb-id
 *         required: true
 *         type: string
 *       - in: query
 *         name: spb-version
 *         description: spb-version
 *         required: true
 *         type: string
 *       - in: query
 *         name:  export-id
 *         description:  export-id
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: 返回所有该采集类型采集器信息 
 */ 
         
app.get('/api/backendmgmt/discocenter/devicemgmt/add', function (req, res1) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var query = {};
    if ( req.query["sp-id"] === undefined ) {
        res1.json(400, 'Must be have sp-id!')
        return;
    }
    if (  req.query["spb-id"] === undefined ) {
        res1.json(400, 'Must be have spb-id!')
        return;
    }
    if ( req.query["spb-version"] === undefined ) {
        res1.json(400, 'Must be have spb-version!')
        return;
    }
    if ( req.query["export-id"] === undefined ) {
        res1.json(400, 'Must be have export-id!')
        return;
    }
    query.spId = req.query["sp-id"];
    query.spbId = req.query["spb-id"];
    query.spbVersion = req.query["spb-version"];
    query.exportId = req.query["export-id"];


    var config = configger.load();

    var REQUIRE_URL = config.BackendMgmt.URL+"/discocenter/devicemgmt/edit";

    async.waterfall(
        [
            function(callback){
                backendMgmt.BackEndLogin(function(sso_token) { 
        
                    var req = unirest( "GET", REQUIRE_URL );

                    req.query(query);

                    req.headers({ 
                    "content-type": "application/x-www-form-urlencoded",
                    "referer": config.BackendMgmt.URL,
                    "cookie": "JSESSIONIDSSO="+sso_token
                    });
                    
                    req.end(function (res) {
                        if (res.error) console.log(res.error);
                        var xmlstr = "<div>" + res.body + "</div>";
                        var newdata = xmlstr.replace(/(<input[ a-zA-Z{}0-9.\-=\"]*)(">)/g,'$1"\/>').replace("\"data-default=\"","\" data-default=\"");
                        
                        var options = {
                            object: true 
                        }; 
                        var json = xml2json.toJson(newdata,options);  
                        callback(null,json);

                        //res1.json(200 ,newdata);
                    });
                });
                
            },
            function(arg, callback) {
                var tbody = arg.div.div.form.div.div.div.div.div;
                var device_localtion = {};
                for ( var i in tbody ) {
                    var item = tbody[i];
                    if ( item.class == "device-location") {
                        for ( var j in item.div ) {
                            var itemLocaltion = item.div[j];
                            device_localtion[itemLocaltion.input.name] = itemLocaltion.input.value;
                        } 
                    }
                }
 
                callback(null,device_localtion);
            } 
        ], function (err, result) {
              // result now equals 'done'

              res1.json(200 ,result);
        });
    });



/**
 * @swagger
 * /api/backendmgmt/discocenter/devicemgmt/test:
 *   post:
 *     tags:
 *       - Backendmgmt
 *     description: 测试设备采集有效性. 
 *     operationId: devicemgmt_test
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: deviceinfoItem
 *         description: 需要测试的设备信息.
 *         schema:
 *            $ref: '#/definitions/DeviceInfoItem'
 *     responses:
 *       200:
 *         description: 设备测试成功通过. 
 */ 

  
            app.post('/api/backendmgmt/discocenter/devicemgmt/test', function (req, res1) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
                var config = configger.load();

                var testBody = req.body; 
                var query = testBody.collecter; 
                var exeType = testBody.exe_type;

               switch ( query["export-id"] ) {
                   case "vmax" :
                        var jsonAnswersStr = combineRequestAnswer_vmax(testBody.deviceinfo);
                        break;
                    case "unisphere" :
                        var jsonAnswersStr = combineRequestAnswer_unisphere(testBody.deviceinfo);
                        break;
                    case "vnx" :

                        var jsonAnswersStr = combineRequestAnswer_vnx(testBody.deviceinfo);

                        break;
                    case "emcxtremio" :
                        var jsonAnswersStr = combineRequestAnswer_xtremio(testBody.deviceinfo);
                        break;

                    case "smiprovider" :
                        var jsonAnswersStr = combineRequestAnswer_brocade(testBody.deviceinfo);
                        break;
                   
                    
                }
                 

                backendMgmt.BackEndLogin(function(sso_token) { 
         
                    var req = unirest("POST", config.BackendMgmt.URL+"/discocenter/devicemgmt/test");
                    
                    req.headers({ 
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO="+sso_token
                    });

                    if ( exeType == 'delete' ) {
                        var isSave = false;
                        devicemgmt_modify(testBody, isSave, function(save_response) {
        
                            var saveJson = JSON.parse(save_response);

                            res1.json(200, saveJson); 
                        })
                    } else {
                        var requreDataItem = {};
                        requreDataItem.server = testBody.deviceinfo["Server"];
                        requreDataItem.inEdit = true;
                        requreDataItem.instance = testBody.deviceinfo["Instance"];
                        requreDataItem.jsonAnswers = jsonAnswersStr;
                        
                        var requreData = [];
                        requreData.push(requreDataItem);
                         
                        var requreDataStr = JSON.stringify(requreData);
                      
    
                        var requireForm = {}
                        requireForm.id = query['sp-id'];
                        requireForm.block = query['spb-id'];
                        requireForm.version = query['spb-version'];
                        requireForm.spId = query['sp-id'];
                        requireForm.spbId = query['spb-id'];
                        requireForm.exportId = query['export-id'];
                        requireForm.spbVersion = query['spb-version'];
                        requireForm.jsonRows = requreDataStr ; 
    
                        console.log(requireForm); 
    
                        req.form(requireForm);
    
                        req.end(function (res) {
                        if (res.error) console.log(res.error);  
                            var resbody = res.raw_body;
                            var resbodyJson = JSON.parse(resbody);
                            console.log(resbodyJson.testResult.status);
                            if ( exeType == "testonly" ) {
                                res1.json(200,resbodyJson);
                            } else  { 
                                var isSave = true; 
                                if  ( resbodyJson.testResult.status == 'SUCCESS' ) {
                                    devicemgmt_modify(testBody, isSave, function(save_response) {
        
                                        var saveJson = JSON.parse(save_response);
                                        var errCount = saveJson.saveErrors.length;
                                        var warnCount = saveJson.saveWarnings.length;
        
                                        if ( errCount == 0 && warnCount == 0 ) {
                                            res1.json(200, resbodyJson);
                                        } else 
                                            res1.json(200 , resbodyJson);
                                    })
                                }
                            }
    
                            
                        });
                        
                    }


                });
        
         
        
            });

            




        /**
         * @swagger
         * /api/backendmgmt/monitoring/serverstatus:
         *   get:
         *     tags:
         *       - Backendmgmt
         *     description: 获取Backend后台服务器信息列表
         *     produces:
         *       - application/json 
         *     responses:
         *       200:
         *         description: 返回Backend后台服务器信息列表
         */ 
                
        app.get('/api/backendmgmt/monitoring/serverstatus', function (req, res1) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        
            var config = configger.load();
            async.waterfall(
                [
                    function(callback){
                        backendMgmt.getBackendServerList (function ( serverList ) {
                                callback(null,serverList); 
                        }) 
                    },
                    function( serverList , callback ) { 
                        
                        var statusResult = [];
                            
                        async.mapSeries( serverList, function(serverItem , callback ) {
                                console.log(serverItem.id);


                                backendMgmt.getBackendServerStatus(serverItem.id, function ( status ) {
                                    
                                    if ( status.body.series.status === undefined ) {
                                        serverItem["timestamp"] = "";
                                        serverItem["status"] = 0;
                                    } else {
                                        serverItem["timestamp"] = status.body.series.status[0][0];
                                        serverItem["available"] = status.body.series.status[0][1];
                                        
                                    }
                                    
                                    callback(null, serverItem );

                                })


                                
                            }, function( err, result ) {
                                if ( err ) {
                                    console.log(err);
                                };
                                for ( var i in result ) {
                                    var item = result[i];
                                    if ( item.available >= 80 ) item['status'] = "OK";
                                    else item["status"] = "FAILED";
                                }
                                callback(null, result);
                            }
                        )
                    }
            ], function (err, result) {
                // result now equals 'done'

                res1.json(200 ,result);
            });
        });





        /**
         * @swagger
         * /api/backendmgmt/monitoring/mgmtobjects:
         *   get:
         *     tags:
         *       - Backendmgmt
         *     description: 获取纳管对象的数据采集状态
         *     produces:
         *       - application/json 
         *     responses:
         *       200:
         *         description: 返回Backend后台服务器信息列表 
         *                     { 
         *                        "timestamp":1111111111,
         *                               "statistics":{
         *                                   "storage":{
         *                                       "OK":20,
         *                                       "FAILED":0
         *                                   },
         *                                   "switch":{
         *                                       "OK":10,
        *                                        "FAILED":1
        *                                    },
         *                                   "host":{
        *                                        "DISABLED":2232
        *                                    }
        *                                },
        *                                "storage":[
        *                                    {
        *                                        "status":"FAILED", 
        *                                            "sn":"111111",
        *                                            "name":"aaaaaa" ,
        *                                        "testResult":"res"
        *                                    }
        *                                ],
         *                               "switch":[
        *                                    {
        *                                        "status":"FAILED", 
        *                                            "sn":"111111",
        *                                            "name":"aaaaaa" ,
        *                                        "testResult":"res"
        *                                    }
        *                                ]
        *                            }
         */ 
                
        app.get('/api/backendmgmt/monitoring/mgmtobjects', function (req, res1) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        
            var resultTmp =  ' {                      \
                       "timestamp":1111111111,               \
                       "statistics":{                 \
                           "storage":{                \
                               "OK":20,               \
                               "FAILED":0             \
                           },                         \
                           "switch":{                 \
                               "OK":10,               \
                               "FAILED":1             \
                           },                         \
                           "host":{                   \
                               "DISABLED":2232        \
                           }                          \
                       },                             \
                       "storage":[                    \
                           {                          \
                               "status":"FAILED",     \
                                   "sn":"111111",     \
                                   "name":"aaaaaa" ,  \
                               "testResult":"res"     \
                           },                          \
                           {                          \
                            "status":"OK",          \
                                "sn":"2222222",     \
                                "name":"bbbbbbb" ,  \
                            "testResult":"res"      \
                            },                        \
                           {                          \
                               "status":"OK",           \
                                   "sn":"3333333",     \
                                   "name":"bbbbbbb" ,  \
                               "testResult":"res"     \
                           }                          \
                        ],                                  \
                       "switch":[                     \
                           {                          \
                               "status":"FAILED",     \
                                   "sn":"111111",     \
                                   "name":"aaaaaa" ,  \
                               "testResult":"res"     \
                           }                          \
                       ]                              \
                   } ';
            var resultTmpJson = JSON.parse(resultTmp);

            var config = configger.load();
            async.waterfall(
                [
                    function(callback){
                        backendMgmt.getCollectCatalogs(function(objCatalogs) {
                            callback(null,objCatalogs);

                        });

                    },
                    function( catalog, callback ) { 
                        async.mapSeries( catalog, function ( catalogItem, callback ) { 
                                var query = {};
                                query.spId = catalogItem["sp-id"];
                                query.spbId = catalogItem["spb-id"];
                                query.spbVersion = catalogItem["spb-version"];
                                query.exportId = catalogItem["export-id"];
                                var deviceList = {};
                                deviceList["query"] = query;
                                
                                backendMgmt.getCollectObjects(query,function(result ) {
                                    deviceList["devices"] = result;
                                    callback(null,deviceList);
                                })
                            }, function( err, result ) {
                                if ( err ) {
                                    console.log(err);
                                }; 
                                callback(null, result);
                            }
                    
                    
                        ); 
 

                    },
                    function( devices , callback ) {
                        var result = {};
                        result["timestamp"] = 0;
                        result["statistics"] = {};
                        result["storage"] = [];
                        result["switch"] = [];

                        for ( var i in devices  ) {
                            var deviceItem = devices[i];
                            switch ( deviceItem.query.exportId ) {
                                //case "emcxtremio" :
                                case "vnx" :
                                    for ( var j in deviceItem.devices ) {
                                        var objItem = deviceItem.devices[j];
                                        var storageItem = {};

                                        storageItem["testDateTime"] = objItem.Status["data-test-result-date"];
                                        storageItem["status"] = objItem.Status["data-test-result-status"];
                                        storageItem["sn"] = "";
                                        storageItem["name"] = objItem["vnx.friendlyname"];
                                        storageItem["testResult"] = objItem.Status["data-test-result-output"];

                                        result.storage.push(storageItem);
                                    };
                                    break;
                                case "vmax" :
                                    for ( var j in deviceItem.devices ) {
                                        var objItem = deviceItem.devices[j];
                                        var storageItem = {};

                                        storageItem["testDateTime"] = objItem.Status["data-test-result-date"];
                                        storageItem["status"] = objItem.Status["data-test-result-status"];
                                        storageItem["sn"] = objItem["vmax.serialnb"];
                                        storageItem["name"] = "";
                                        storageItem["testResult"] = objItem.Status["data-test-result-output"];

                                        result.storage.push(storageItem);
                                    };
                                    break;
                                case "smiprovider" :
                                    for ( var j in deviceItem.devices ) {
                                        var objItem = deviceItem.devices[j];
                                        var storageItem = {};

                                        storageItem["testDateTime"] = objItem.Status["data-test-result-date"];
                                        storageItem["status"] = objItem.Status["data-test-result-status"];
                                        storageItem["sn"] = "";
                                        storageItem["name"] = objItem["smiprovider.host"];
                                        storageItem["testResult"] = objItem.Status["data-test-result-output"];

                                        result.switch.push(storageItem);
                                    };
                                    break;
                                default :

                            }
                        }

                        callback(null,result);

                    }, 
                    function ( objStatus, callback ) {
                        var testtimestamp = 0;
                        var storageStatistics = {};
                        storageStatistics["storage"] = {};
                        storageStatistics.storage["OK"] = 0;
                        storageStatistics.storage["FAILED"] = 0;
                        
                        storageStatistics["switch"] = {};
                        storageStatistics.switch["OK"] = 0;
                        storageStatistics.switch["FAILED"] = 0;
                        
                        storageStatistics["host"] = {};
                        storageStatistics.host["DISABLED"] = 0;
                                                
                        for ( var i in objStatus.storage ) {
                            var storageItem = objStatus.storage[i];
                            if ( storageItem.status == "SUCCESS")  storageStatistics.storage.OK++;
                            else storageStatistics.storage.FAILED++; 
                            var dt = moment(storageItem.testDateTime,'MMM DD, YYYY hh:mm:ss A'); 
                            if ( dt > testtimestamp ) testtimestamp = dt;
                            //console.log(dt+'\t' + dt.format() + '\t' +testtimestamp.format() );
                        }
                        for ( var i in objStatus.switch ) {
                            var switchItem = objStatus.switch[i];
                            if ( switchItem.status == "SUCCESS")  storageStatistics.switch.OK++;
                            else storageStatistics.switch.FAILED++;

                            var dt = moment(storageItem.testDateTime,'MMM DD, YYYY hh:mm:ss A');  
                            if ( dt > testtimestamp ) testtimestamp = dt;
                            //console.log(dt+'\t' + dt.format() + '\t' +testtimestamp.format() );

                        }
                       // var dtStr = moment(testtimestamp).format("YYYY-MM-DD hh:mm:ss");
                        objStatus.timestamp = testtimestamp;
                        objStatus.statistics = storageStatistics;
                        callback(null, objStatus);
                    }
            ], function (err, result) {
                // result now equals 'done'

                res1.json(200 ,result);
            });
        });





        /**
         * @swagger
         * /api/backendmgmt/monitoring/taskstatus:
         *   get:
         *     tags:
         *       - Backendmgmt
         *     description: 获取获取定时任务的执行状态
         *     produces:
         *       - application/json 
         *     responses:
         *       200:
         *         description: 返回获取定时任务的执行状态 
         *                     [
         *                       { "taskname":"task1",
         *                         "task_desc":"task1 is ...",
         *                         "status":"FINISHED",
         *                         "status_timestamp":111111
         *                       } 
         *                     ]
         */ 
                
        app.get('/api/backendmgmt/monitoring/taskstatus', function (req, res1) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        
            var resStr = '[  \
                { \
                    "taskname":"存储综合月报", \
                    "task_desc":"201807月份的存储综合月份生成的任务.", \
                    "status":"FINISHED", \
                    "status_msg":"2018-07-09 13:10:00 [XXXXXX]文件存在!", \
                    "status_timestamp":1531104908 \
                }, \
                { \
                    "taskname":"每天应用拓扑数据文件上报", \
                    "task_desc":"每天自动生成应用拓扑文件(excel文件格式)并上传至共享文件服务器(ftp://10.1.41.60)中.", \
                    "status":"FAILED", \
                    "status_msg":"2018-07-09 13:10:00 [XXXXXX]上传数据文件没有在上传服务器中发现,请联系系统管理员处理!", \
                    "status_timestamp":1531104908 \
                } \
            ]';

            var res = JSON.parse(resStr);
            var config = configger.load();
            async.waterfall(
                [
                    function(callback){
                        callback(null,res);
                    }
            ], function (err, result) {
                // result now equals 'done'

                res1.json(200 ,result);
            });
        });








































};




/*
*   Functions 
*/
function devicemgmt_modify ( testBody , isSave ,  callback ) {
    var config = configger.load();

    var query = testBody.collecter; 


   switch ( query["export-id"] ) {
       case "vmax" :
            var jsonAnswersStr = combineRequestAnswer_vmax(testBody.deviceinfo);
            break;
        case "unisphere" :
            var jsonAnswersStr = combineRequestAnswer_unisphere(testBody.deviceinfo);
            break;
        case "vnx" :

            var jsonAnswersStr = combineRequestAnswer_vnx(testBody.deviceinfo);

            break;
        case "emcxtremio" :
            var jsonAnswersStr = combineRequestAnswer_xtremio(testBody.deviceinfo);
            break;

        case "smiprovider" :
            var jsonAnswersStr = combineRequestAnswer_brocade(testBody.deviceinfo);
            break;
       
        
    }
     

    backendMgmt.BackEndLogin(function(sso_token) { 

        var req = unirest("POST", config.BackendMgmt.URL+"/discocenter/devicemgmt/save");
        
        req.headers({ 
            "content-type": "application/x-www-form-urlencoded",
            "referer": config.BackendMgmt.URL,
            "cookie": "JSESSIONIDSSO="+sso_token
        });



        var requreDataItem = {};
        requreDataItem.server = testBody.deviceinfo["Server"];
        requreDataItem.instance = testBody.deviceinfo["Instance"];
        
        if ( isSave == true ) {
            requreDataItem.isDeleted = false;
            requreDataItem.isModified = true;
        } else {
            requreDataItem.isDeleted = true;
            requreDataItem.isModified = false;
        }

        requreDataItem.jsonAnswers = jsonAnswersStr;
        
        var requreData = [];
        requreData.push(requreDataItem);
         
        var requreDataStr = JSON.stringify(requreData);
      

        var requireForm = {}   
        requireForm.spId = query['sp-id'];
        requireForm.spbId = query['spb-id'];
        requireForm.exportId = query['export-id'];
        requireForm.spbVersion = query['spb-version'];
        requireForm.jsonRows = requreDataStr ; 

        console.log(requireForm); 

        req.form(requireForm);

        req.end(function (res) {
        if (res.error) console.log(res.error);  
            var resbody = res.raw_body;
            console.log(resbody);
            //var resbodyJson = JSON.parse(resbody); 
            callback(resbody);
        });
        
    });

};
 


function combineRequestAnswer_vmax( deviceinfo ) {

    
    var smiinfo = {};
    smiinfo.host = deviceinfo["vmax.smi.host"] ;
    smiinfo.username = deviceinfo["vmax.smi.username"] ;
    smiinfo.password = deviceinfo["vmax.smi.password"] ;
    smiinfo.useAdvancedSettings = "false" ;

    var unisphereInfo = {};
    unisphereInfo.host = deviceinfo["vmax.unisphere.host"] ;
    unisphereInfo.username = deviceinfo["vmax.unisphere.username"] ;
    unisphereInfo.password = deviceinfo["vmax.unisphere.password"] ;
    unisphereInfo.useAdvancedSettings = "false" ;

    var jsonAnswers = {};
    jsonAnswers.smi = smiinfo;
    jsonAnswers.unisphere = unisphereInfo;
    jsonAnswers.vmax_device_type = deviceinfo["vmax.vmax_device_type"] ;
    jsonAnswers.serialnb = deviceinfo["vmax.serialnb"] ;
    jsonAnswers.collect_other_perf = "3" ;
    jsonAnswers.collect_lun_perf = "2" ;
    jsonAnswers.srdfCollection = "true" ;

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}


function combineRequestAnswer_vnx( deviceinfo ) {

    var block = {};
    block.spa = deviceinfo["vnx.block.spa"];
    block.spb = deviceinfo["vnx.block.spb"];
    block.use_secfile = deviceinfo["vnx.block.use_secfile"]; 
    block.userscope = deviceinfo["vnx.block.userscope"];
    block.username = deviceinfo["vnx.block.username"];
    block.password = deviceinfo["vnx.block.password"];

    var file = {};
    file.csprimary = deviceinfo["vnx.file.csprimary"];
    file.userscope = deviceinfo["vnx.file.userscope"];
    file.username = deviceinfo["vnx.file.username"];
    file.password = deviceinfo["vnx.file.password"];

    var jsonAnswers = {};
    jsonAnswers.block = block;
    jsonAnswers.file = file;
    jsonAnswers.type = deviceinfo["vnx.type"];
    jsonAnswers.friendlyname = deviceinfo["vnx.friendlyname"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}



function combineRequestAnswer_unisphere( deviceinfo ) {

    var jsonAnswers = {};
    jsonAnswers.host = deviceinfo["unisphere.host"]; 
    jsonAnswers.port = deviceinfo["unisphere.port"];
    jsonAnswers.username = deviceinfo["unisphere.username"];
    jsonAnswers.password = deviceinfo["unisphere.password"];
    jsonAnswers.serialnbIncludeList = deviceinfo["unisphere.serialnbIncludeList"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}



function combineRequestAnswer_xtremio( deviceinfo ) {

    var jsonAnswers = {};
    jsonAnswers.host = deviceinfo["emcxtremio.host"];  
    jsonAnswers.username = deviceinfo["emcxtremio.username"];
    jsonAnswers.password = deviceinfo["emcxtremio.password"];
    jsonAnswers.timezone = deviceinfo["emcxtremio.timezone"];
    jsonAnswers.version = deviceinfo["emcxtremio.version"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}


function combineRequestAnswer_brocade( deviceinfo ) {

    var jsonAnswers = {};
    jsonAnswers.host = deviceinfo["smiprovider.host"];  
    jsonAnswers.username = deviceinfo["smiprovider.username"];
    jsonAnswers.password = deviceinfo["smiprovider.password"];
    jsonAnswers.usesecure = deviceinfo["smiprovider.usesecure"];
    jsonAnswers.port = deviceinfo["smiprovider.port"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
 

    return jsonAnswersStr;
}



module.exports = BackendMgmtController;
