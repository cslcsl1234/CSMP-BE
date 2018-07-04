"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('cebPerformanceProviderController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
  
var util = require('../lib/util');
var CallGet = require('../lib/CallGet'); 
var cache = require('memory-cache');

var host = require('../lib/Host');

var mongoose = require('mongoose');
var HostObj = mongoose.model('Host');
var HBAObj = mongoose.model('HBA');
  
var HBALIST = require('../demodata/host_hba_list');
var VMAX = require('../lib/Array_VMAX');
var SWITCH = require('../lib/Switch');
var CAPACITY = require('../lib/Array_Capacity');
var mysql = require('../lib/MySQLDBFunction');
var AppTopologyObj = mongoose.model('AppTopology');

var Report = require('../lib/Reporting');


 
var cebPerformanceProviderController = function (app) {

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


    /*
            {
            "vnxIOPS":[
                {
                    "data":[
                        {
                            "x":1512191040000,
                            "y":6337.654351
                        },
                        {
                            "x":1512191400000,
                            "y":677.16263
                        }
                    ],
                    "name":"AAAAA"
                }
                ]
            }

    */
    app.get('/storage-performance-provider/vmax/getAllPerfArrayIOPS', function (req, res) {
 
        //var result = {"vmaxIOPS":[{"data":[{"x":1512191040000,"y":6337.654351},{"x":1512191400000,"y":677.16263}],"name":"AAAAA"}]};

        var finalResult = {};
        finalResult["vmaxIOPS"] = [];

        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;

        var config = configger.load(); 

        async.waterfall([
            function(callback){ 
                var param = {}; 
                param['keys'] = ['device'];
                param['fields'] = ['name'];
                param['period'] = 0;
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '!parttype&source=\'VMAX-Collector\'';
                param['filter_name'] = '(name==\'ReadRequests\'|name==\'WriteRequests\')';

        
                CallGet.CallGetPerformance(param, function(param) {  
                    for ( var i in param ) {
                        var item = param[i];

                        var resultItem = {};
                        resultItem["data"] = [];
                        resultItem["name"] = item.device;

                        for ( var j in item.matrics ) {
                            var perfItem = item.matrics[j];
                            var resultItemData = {};
                            resultItemData['x'] = perfItem.timestamp * 1000;
                            resultItemData['y'] = perfItem.ReadRequests = perfItem.WriteRequests;
                            resultItem.data.push(resultItemData);
                        }

                        finalResult.vmaxIOPS.push(resultItem);

                    }
                    callback(null, finalResult ); 
                });
 
            },
            function(arg1,  callback){  
               callback(null,arg1);


            }
        ], function (err, result) { 
           
            res.json(200,result);
        });


    });

    

    /*
            {
            "vnxIOPS":[
                {
                    "data":[
                        {
                            "x":1512191040000,
                            "y":6337.654351
                        },
                        {
                            "x":1512191400000,
                            "y":677.16263
                        }
                    ],
                    "name":"AAAAA"
                }
                ]
            }

    */
   app.get('/storage-performance-provider/vnx/array/getAllIOPS', function (req, res) {
 
        var config = configger.load(); 
        var finalResult = {};
        finalResult["vnxIOPS"] = [];

        var start = '2018-06-17T00:00:00.000Z';
        var end = '2018-06-17T23:59:59.999Z';


        async.waterfall([ 
 
            function ( callback ) {
                var param = {}; 
                param['period'] = 0;
                param['start'] = start;
                param['end'] = end; 

                param['keys'] = ['serialnb,part']; 
                param['fields'] = ['serialnb','device','part','name'];   
                param['filter'] = 'source=\'VNXBlock-Collector\'&parttype==\'Controller\'';
                param['filter_name'] = '(name=\'WriteThroughput\'|name=\'ReadThroughput\'|name=\'TotalThroughput\')';
        
        
                CallGet.CallGetPerformance(param, function(param) {  
                    for ( var i in param ) {
                        var item = param[i];

                        var resultItem = {};
                        resultItem["data"] = [];
                        resultItem["name"] = item.device + '_' + item.part.replace(" ","");;

                        for ( var j in item.matrics ) {
                            var perfItem = item.matrics[j];
                            var resultItemData = {};
                            resultItemData['x'] = perfItem.timestamp * 1000;
                            resultItemData['y'] = perfItem.ReadThroughput = perfItem.WriteThroughput;
                            resultItem.data.push(resultItemData);
                        }

                        finalResult.vnxIOPS.push(resultItem);

                    }
                    callback(null, finalResult ); 
                });

            } 
        ], function (err, result) { 
            res.json(200,result);
        });


    });


    
    /*
        {
            "iopsSum":"3461808.09",
            "iopsRead":"2661762.07",
            "iopsWrite":"800046.02",
            "mbpsSum":"271387.15",
            "mbpsRead":"249271.59",
            "mbpsWrite":"22115.57"
        }

    */
   app.get('/storage-performance-provider/vmax/getAllArrayIOPSSum', function (req, res) {
    
    var config = configger.load(); 
    var finalResult = {}; 

    var start = '2018-06-17T00:00:00.000Z';
    var end = '2018-06-17T23:59:59.999Z';

    async.waterfall([ 

        function ( callback ) {
            var param = {}; 
            param['keys'] = ['device'];
            param['fields'] = ['name'];
            param['period'] = 0;
            param['start'] = start;
            param['end'] = end;
            param['filter'] = '!parttype&source=\'VMAX-Collector\'';
            param['filter_name'] = '(name==\'ReadRequests\'|name==\'WriteRequests\'|name==\'ReadThroughput\'|name==\'WriteThroughput\')';

            CallGet.CallGetPerformance(param, function(param) {  
                for ( var i in param ) {
                    var item = param[i]; 

                    for ( var j in item.matrics ) {
                        var perfItem = item.matrics[j];

                        perfItem.WriteThroughput = ( perfItem.WriteThroughput == null ) ? 0 : perfItem.WriteThroughput;
                        perfItem.ReadThroughput = ( perfItem.ReadThroughput == null ) ? 0 : perfItem.ReadThroughput;
                        perfItem.WriteRequests = ( perfItem.WriteRequests == null ) ? 0 : perfItem.WriteRequests;
                        perfItem.ReadRequests = ( perfItem.ReadRequests == null ) ? 0 : perfItem.ReadRequests;
                        


                        finalResult["mbpsSum"] = finalResult["mbpsSum"] === undefined ? perfItem.WriteThroughput + perfItem.ReadThroughput : finalResult["mbpsSum"] + perfItem.WriteThroughput + perfItem.ReadThroughput;
                        finalResult["mbpsRead"] = finalResult["mbpsRead"] === undefined ? perfItem.ReadThroughput : finalResult["mbpsRead"] + perfItem.ReadThroughput;
                        finalResult["mbpsWrite"] = finalResult["mbpsWrite"] === undefined ? perfItem.WriteThroughput : finalResult["mbpsWrite"] + perfItem.WriteThroughput;

                        finalResult["iopsSum"] = finalResult["iopsSum"] === undefined ? perfItem.ReadRequests + perfItem.WriteRequests : finalResult["iopsSum"] + perfItem.ReadRequests + perfItem.WriteRequests;
                        finalResult["iopsRead"] = finalResult["iopsRead"] === undefined ? perfItem.ReadRequests : finalResult["iopsRead"] + perfItem.ReadRequests;
                        finalResult["iopsWrite"] = finalResult["iopsWrite"] === undefined ? perfItem.WriteRequests : finalResult["iopsWrite"] + perfItem.WriteRequests;


                    } 

                }
                callback(null, finalResult ); 
            });

            } 
        ], function (err, result) { 
            res.json(200,result);
        });


});

    
    /*

    CEB-API: /storage-performance-provider/vnx/array/getAllIOPSSum
        {
            "iopsSum":"3461808.09",
            "iopsRead":"2661762.07",
            "iopsWrite":"800046.02",
            "mbpsSum":"271387.15",
            "mbpsRead":"249271.59",
            "mbpsWrite":"22115.57"
        }

    */
   app.get('/storage-performance-provider/vnx/array/getAllIOPSSum', function (req, res) {
    
        var config = configger.load(); 
        var finalResult = {}; 

        var start = '2018-06-17T00:00:00.000Z';
        var end = '2018-06-17T23:59:59.999Z';

        async.waterfall([ 

            function ( callback ) {
                var param = {}; 
                param['period'] = 0;
                param['start'] = start;
                param['end'] = end; 

                param['keys'] = ['serialnb,part']; 
                param['fields'] = ['serialnb','device','part','name'];   
                param['filter'] = 'source=\'VNXBlock-Collector\'&parttype==\'Controller\'';
                param['filter_name'] = '(name=\'WriteThroughput\'|name=\'ReadThroughput\'|name=\'TotalThroughput\'|name=\'ReadBandwidth\'|name=\'WriteBandwidth\'|name=\'TotalBandwidth\')';
        
                CallGet.CallGetPerformance(param, function(param) {  
                    for ( var i in param ) {
                        var item = param[i]; 

                        for ( var j in item.matrics ) {
                            var perfItem = item.matrics[j];

                            perfItem.WriteThroughput = ( perfItem.WriteThroughput == null ) ? 0 : perfItem.WriteThroughput;
                            perfItem.ReadThroughput = ( perfItem.ReadThroughput == null ) ? 0 : perfItem.ReadThroughput;
                            perfItem.ReadBandwidth = ( perfItem.ReadBandwidth == null ) ? 0 : perfItem.ReadBandwidth;
                            perfItem.WriteBandwidth = ( perfItem.WriteBandwidth == null ) ? 0 : perfItem.WriteBandwidth;
                            


                            finalResult["iopsSum"] = finalResult["iopsSum"] === undefined ? perfItem.WriteThroughput + perfItem.ReadThroughput : finalResult["iopsSum"] + perfItem.WriteThroughput + perfItem.ReadThroughput;
                            finalResult["iopsRead"] = finalResult["iopsRead"] === undefined ? perfItem.ReadThroughput : finalResult["iopsRead"] + perfItem.ReadThroughput;
                            finalResult["iopsWrite"] = finalResult["iopsWrite"] === undefined ? perfItem.WriteThroughput : finalResult["iopsWrite"] + perfItem.WriteThroughput;
                            finalResult["mbpsSum"] = finalResult["mbpsSum"] === undefined ? perfItem.ReadBandwidth + perfItem.WriteBandwidth : finalResult["mbpsSum"] +  perfItem.ReadBandwidth + perfItem.WriteBandwidth;
                            finalResult["mbpsRead"] = finalResult["mbpsRead"] === undefined ? perfItem.ReadBandwidth : finalResult["mbpsRead"] + perfItem.ReadBandwidth; 
                            finalResult["mbpsWrite"] = finalResult["mbpsWrite"] === undefined ? perfItem.WriteBandwidth : finalResult["mbpsWrite"] + perfItem.WriteBandwidth; 
                        } 

                    }
                    callback(null, finalResult ); 
                });

                } 
            ], function (err, result) { 
                res.json(200,result);
            });


    });



    
    /*

    CEB-API: /ceb/dashboard/getEquipmentCount
       {
            "appCount":458,
            "fabrics":74,
            "hostCount":3204,
            "storageCount":38,
            "switchsCount":92
        }

    */
   app.get('/ceb/dashboard/getEquipmentCount', function (req, res) {
    

        var param = {}; 
        param['keys'] = ['device'];
        param['fields'] = ['devtype'];
        param['filter'] = '!parttype';  
 
        CallGet.CallGet(param, function(param) {
            var resTmp = {};
            for ( var i in param.result ) {
                var item = param.result[i];

                if ( resTmp[item.devtype] === undefined  ) {
                    resTmp[item.devtype] = 0;
                }

                resTmp[item.devtype] ++;
            }
            var result = {"appCount":458,"fabrics":74,"hostCount":3204,"storageCount":38,"switchsCount":92};
            result.storageCount = resTmp.Array;
            result.switchsCount = resTmp.FabricSwitch;


            res.json(200,result);
        });


    });


 
    /*

    CEB-API: /ceb/dashboard/getStorageCapacity
        {
            "vnxCap":{
                "sum":3782676.16,
                "allot":2142185.5100000002
            },
            "vmaxCap":{
                "sum":3376127.1999999997,
                "allot":2042201.5
            }
        }

    */
   app.get('/ceb/dashboard/getStorageCapacity', function (req, res) {
    
        CAPACITY.GetArrayTotalCapacity('lastMonth', function(result) {   
            var resItem = {};
            for ( var i in result.Detail ) {
                var item = result.Detail[i];  
                if ( resItem[item.arraytyp] === undefined ) {
                    
                    resItem[item.arraytyp] = {};
                    resItem[item.arraytyp]["sum"] = 0;
                    resItem[item.arraytyp]["allot"] = 0; 
                } 
                resItem[item.arraytyp]["sum"] += item.RawCapacity.ConfiguredUsableCapacity;
                resItem[item.arraytyp]["allot"] += item.ConfiguredUsableCapacity.UsedCapacity;

            }

            var finalResult = {};
            finalResult.vnxCap = {};
            finalResult.vnxCap.sum = resItem.VNX.sum   ;
            finalResult.vnxCap.allot = resItem.VNX.allot   ;

            finalResult.vmaxCap = {};
            finalResult.vmaxCap.sum = resItem.Symmetrix.sum  ;
            finalResult.vmaxCap.allot = resItem.Symmetrix.allot   ;
            
            res.json(200,finalResult);   
        
        });  


   });

 
    /*

    CEB-API: /ceb/thresholdEvent/count 
        return: 0

    */
   app.get('/ceb/thresholdEvent/count', function (req, res) { 
    var thresholdType = req.query.thresholdType;
        var result = {};
        result.data = 0;
        mysql.yesterdayEventCount(function(count) { 
            for ( var i in count ) {
                if ( count[i].type == thresholdType )  {
                    result.data = count[i].eventCount;
                    res.json(200,result);
                }
                   
            } 
            res.json(200,result);
            
        }); 

    });



    /*
        Page: 容量信息:存储容量

    */ 
    app.get('/rest/capacity/array', function (req, res) {
    

        async.waterfall([
            function(callback){
                var arrayInfo = require("../config/StorageInfo");
                callback(null,arrayInfo);
            }, 
            function ( arrayInfo, callback ) {
                var finalResult = {};
                CAPACITY.GetArrayTotalCapacity('lastMonth', function(result) {   
                    var resItem = {};
                    for ( var i in result.Detail ) {
                        var item = result.Detail[i];  
                        var resultItem = {};
                        resultItem["viewCapacity"] = item.ConfiguredUsableCapacity.UsedCapacity; 
                        resultItem["rawCapacity"] = item.RawCapacity.RawCapacity;
                        resultItem["maxCapacity"] = 0;
                        resultItem["viewCapacityPercent"] = item.RawCapacity.ConfiguredUsableCapacity == 0 ? 0 : ((item.ConfiguredUsableCapacity.UsedCapacity/item.RawCapacity.ConfiguredUsableCapacity) * 100).toFixed(2) + "%";
                        resultItem["plannedCapacity"] = 0
                        resultItem["storageSn"] = item.device;
 
                        resultItem["storageName"] = "";
                        for ( var j in arrayInfo ) {
                            var arrItem = arrayInfo[j];
                            if ( arrItem.storagesn == item.device ) {
                                resultItem["storageName"] = arrItem.name; 
                                break;
                            }
                        }  
                        resultItem["logicCapacity"] =  item.RawCapacity.ConfiguredUsableCapacity;
        
                        switch ( item.arraytyp ) {
                            case "Symmetrix" :
                                if ( finalResult["VMAX"] === undefined ) finalResult["VMAX"] = [];
                                finalResult["VMAX"].push(resultItem);
                                break;
                            case "VNX" :
                                if ( finalResult["VNX"] === undefined ) finalResult["VNX"] = [];
                                finalResult["VNX"].push(resultItem);
                                break;
        
                            case "XtremIO" :
                                if ( finalResult["XtremIO"] === undefined ) finalResult["XtremIO"] = [];
                                finalResult["XtremIO"].push(resultItem);
                                break;
        
                            case "Unity/VNXe2" :
                                if ( finalResult["Unity"] === undefined ) finalResult["Unity"] = [];
                                finalResult["Unity"].push(resultItem);
                                break;
        
                            default : 
        
                        }
                        
                    }
        
                    /*
                    {
                        "viewCapacity":"1756.0",
                        "rawCapacity":"117576.4",
                        "maxCapacity":"0",
                        "viewCapacityPercent":"2.99%",
                        "plannedCapacity":"0",
                        "storageSn":"000292600901",
                        "storageName":"VMAX-JXQ",
                        "logicCapacity":"58709.5"
                    }
                    */
                    
                    res.json(200,finalResult);   
                
                });  
            }
        ], function (err, result) {  
            res.json(200 ,result);
        });
    
    
    });
    

    
    /*
        Page: 容量信息:主机容量

    */ 
   app.get('/rest/capacity/host', function (req, res) {
        
        async.waterfall([
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
            function ( appinfo , callback) {
                var res = [];
                for ( var i in appinfo ) {
                    var item = appinfo[i];
                    if ( item.array === undefined ) continue; 

                    var isfind = false;
                    for ( var j in res ) {
                        var resItem = res[j];
                        if ( resItem.host == item.host && resItem.array == item.array && resItem.SG == item.SG ) {
                            isfind = true;
                            break;
                        }
                    }

                    if ( isfind == false ) {
                        var resItem = {}; 
                        resItem.host = item.host == "" ? "(SG)"+item.SG : item.host;
                        resItem.array = item.array;
                        resItem.SG = item.SG;
                        resItem.Capacity = item.Capacity;  
                        res.push(resItem);
                    }
                }
                
                var hostCapacity = [];
                for ( var i in res ) {
                    var item = res[i];

                    var isfind = false;
                    for ( var j in hostCapacity ) {
                        hostItem = hostCapacity[j];
                        if ( item.host == hostItem.hostName ) {
                            hostItem.totalSize += item.Capacity;
                            isfind = true;
                            break;
                        }
                    }
                    if ( isfind == false ) {
                        var hostItem = {};
                        hostItem.hostName = item.host;
                        hostItem.totalSize = item.Capacity; 
                        hostItem.useSize = 0;
                        hostItem.plannedSize = 0;
                        hostCapacity.push(hostItem);
                    }
                }
                //var result = [{"hostName":"##BL685-631","totalSize":"0","useSize":"0","plannedSize":"0.0"}];
                callback(null,hostCapacity);
            }
        ], function (err, result) {  
            for ( var i in result ) {
                var item = result[i];
                item.totalSize = Math.round(item.totalSize*100)/100;
            }
            res.json(200 ,result);
        });


    });


        
    /*
        Page: 容量信息:应用容量分析
    */ 
   app.get('/ceb/rest/capacity/app', function (req, res) {

        var retData = require("../data/ApplicationCapacityAnalysis")
        res.json(200,retData);


    });

 
};

module.exports = cebPerformanceProviderController;
