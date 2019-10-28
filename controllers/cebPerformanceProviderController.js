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
var VNX = require('../lib/Array_VNX');
var SWITCH = require('../lib/Switch');
var CAPACITY = require('../lib/Array_Capacity');
var mysql = require('../lib/MySQLDBFunction');
var AppTopologyObj = mongoose.model('AppTopology');
var DeviceMgmt = require('../lib/DeviceManagement');
var Report = require('../lib/Reporting');
var Analysis = require('../lib/analysis'); 
var sortBy = require('sort-by');
 

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
                param['period'] = util.getPeriod(start,end);
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

        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;

        async.waterfall([ 
 
            function ( callback ) {
                var param = {}; 
                param['period'] = util.getPeriod(start,end);
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

    var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
    var start = realtimeDatetime.begin;
    var end = realtimeDatetime.end;

    async.waterfall([ 

        function ( callback ) {
            var param = {}; 
            param['keys'] = ['device'];
            param['fields'] = ['name'];
            param['period'] = util.getPeriod(start,end);
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

        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;

        async.waterfall([ 

            function ( callback ) {
                var param = {}; 
                param['period'] = util.getPeriod(start,end);
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
            finalResult.vnxCap.sum = resItem.VNX === undefined ? 0 : resItem.VNX.sum   ;
            finalResult.vnxCap.allot = resItem.VNX === undefined ? 0 : resItem.VNX.allot   ;

            finalResult.vmaxCap = {};
            finalResult.vmaxCap.sum = resItem.Symmetrix === undefined ? 0 : resItem.Symmetrix.sum  ;
            finalResult.vmaxCap.allot = resItem.Symmetrix === undefined ? 0 : resItem.Symmetrix.allot   ;
            
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
                var filter = {};
                DeviceMgmt.getMgmtObjectInfo(filter, function(arrayInfo) {
                    callback(null,arrayInfo);
                })
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
                        // Update by guozb at 20181111 for the issue that ConfiguredUsableCapacity less then UsedCapacity.
                       // resultItem["logicCapacity"] =  item.RawCapacity.ConfiguredUsableCapacity;
                        resultItem["logicCapacity"] = item.ConfiguredUsableCapacity.UsedCapacity + 
                                                      item.ConfiguredUsableCapacity.PoolFreeCapacity + 
                                                      item.ConfiguredUsableCapacity.FreeCapacity;
                        resultItem["viewCapacityPercent"] = resultItem["logicCapacity"] == 0 ? 0 : ((item.ConfiguredUsableCapacity.UsedCapacity/resultItem["logicCapacity"]) * 100).toFixed(2) + "%";


			if ( resultItem.logicCapacity >= resultItem.rawCapacity ) 
				resultItem.logicCapacity = resultItem.logicCapacity + '  (!! > RawCapacity)'; 

			if ( resultItem.viewCapacity >= resultItem.logicCapacity ) 
				resultItem.viewCapacity = resultItem.viewCapacity + '  (!! > LogicalCapacity)'; 

                        
        
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
		    var vmaxCapacity = require('../data/VMAXCapacity');

		    
		    for ( var i in finalResult.VMAX ) {
			var item = finalResult.VMAX[i];

			for ( var j in vmaxCapacity ) {
				var newItem = vmaxCapacity[j];

				if ( item.storageSn == newItem.storageSn ) {
					item.rawCapacity = newItem.rawCapacity.toFixed(2);
					item.logicCapacity = newItem.logicCapacity.toFixed(2);
                        		item.viewCapacityPercent = item.logicCapacity == 0 ? 0 : ((item.viewCapacity / item.logicCapacity) * 100).toFixed(2) + "%";
				}


			} 


		    }

		    finalResult.VMAX.sort(sortBy("storageName"));
		
                    
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

         
    /*
        Page: 容量信息:应用容量分析 - 新增：应用使用了哪台存储的哪些容量, 按容量从大到小排列.
    */ 
   app.get('/ceb/rest/capacity/app/summary', function (req, res) {

        var retData = require("../data/ApplicationCapacityAnalysis");
        
        var result = [];
        for ( var i in retData ) {
            var item = retData[i] ;
            var resItem = {};
            resItem["appName"] = item.appName;
            resItem["logicUnitCount"] = item.logicUnitCount;
            resItem["capacitySize"] = item.capacitySize;

            result.push(resItem);

        }

        result.sort(sortBy("-capacitySize"));
        res.json(200,result);


    });

        
    /*
        Page: 性能信息:实时性能
    */ 
    app.get('/rest/vmaxHistoryPerf/storages', function (req, res) {

        var filter = {};
        DeviceMgmt.getMgmtObjectInfo(filter, function(retData) {
            var finalReturnData = [];
            for ( var i in retData ) {
                var item = retData[i];
                var retItem = {};
                retItem["name"] = item.name;
                retItem["location"] = item.cabinet;
                retItem["sn"] =  item.storagesn;
                retItem["version"] = "";
    
                finalReturnData.push(retItem);
            }
            res.json(200,finalReturnData);
        })

        
    });
 
    app.get('/rest/vmaxHistoryPerf/getPortList', function (req, res) {
        var sn = req.query.storageSN;
        if ( sn===undefined | sn == null | sn == "" ) res.json(200,[]);

        var param = {};
        param['filter'] = 'device=\''+sn+'\'&partgrp=\'Front-End\'&parttype=\'Port\'';
        param['keys'] = ['device','feport']; 

        var finalResult = [];
        CallGet.CallGet(param, function(param) {   
            for ( var i in param.result ) {
                var item = param.result[i];
                finalResult.push(item.feport);
            }
            res.json(200,finalResult);
        });
    }); 

    app.get('/rest/vmaxHistoryPerf/getRdfPortList', function (req, res) {
        var sn = req.query.storageSN;
        if ( sn===undefined | sn == null | sn == "" ) res.json(200,[]);

        var param = {};
        param['filter'] = 'device=\''+sn+'\'&partgrp=\'RDF\'&parttype=\'Port\'';
        param['keys'] = ['device','feport']; 

        var finalResult = [];
        CallGet.CallGet(param, function(param) {   
            for ( var i in param.result ) {
                var item = param.result[i];
                finalResult.push(item.feport);
            }
            res.json(200,finalResult);
        });
    }); 

    app.get('/rest/vmaxHistoryPerf/getSGList', function (req, res) {
        var sn = req.query.storageSN;
        if ( sn===undefined | sn == null | sn == "" ) res.json(200,[]);

        var param = {};
        param['filter'] = 'device=\''+sn+'\'&datagrp=\'VMAX-StorageGroup\'&parttype=\'Storage Group\'';
        param['keys'] = ['device','part']; 

        var finalResult = [];
        CallGet.CallGet(param, function(param) {   
            for ( var i in param.result ) {
                var item = param.result[i];
                finalResult.push(item.part);
            }
            res.json(200,finalResult);
        });
    }); 

    app.get('/rest/vmaxHistoryPerf/getDiskList', function (req, res) {
        var sn = req.query.storageSN;
        if ( sn===undefined | sn == null | sn == "" ) res.json(200,[]);

        var param = {};
        param['filter'] = 'device=\''+sn+'\'&datagrp=\'VMAX-Disk\'&parttype=\'Disk\'';
        param['keys'] = ['device','part']; 

        var finalResult = [];
        CallGet.CallGet(param, function(param) {   
            for ( var i in param.result ) {
                var item = param.result[i];
                finalResult.push(item.part);
            }
            res.json(200,finalResult);
        });
    }); 


    // http://10.62.38.246:8080/ssmp-frontend/rest/config/queryCondition/?_=1533896160715
    // 配置信息->关联关系查询-1 : (存储前端口->服务器)条件选择数据

    app.get('/rest/config/queryCondition', function (req, res) { 
        res.setTimeout(1200*1000);

        var config = configger.load(); 
        var ReportTmpDataPath = config.Reporting.TmpDataPath;
        var ReportOutputPath = config.Reporting.OutputPath;
                        
        var device; 
 
        async.auto(
            {
                vnxinfo: function( callback, result ) {
                    VNX.GetFEPort(device, function(ret) {
                        var vnxout = {};
                        vnxout["storageType"] = 'VNX';
                        vnxout["storageList"] = [];
                        for ( var i in ret ) {
                            var item = ret[i];
                            var director = item.feport.split(":");
                            var directorname = director[0];
                            var directorport = director[1];

                            var isfind = false;
                            for ( var j in vnxout.storageList ) {
                                var vnxoutItem = vnxout.storageList[j];
                                if ( vnxoutItem.storageSn == item.serialnb ) {
                                    isfind = true;
                                    var isfinddir = false;
                                    for ( var z in vnxoutItem.directorList ) {
                                        var dirItem = vnxoutItem.directorList[z];
                                        if ( dirItem.directorName == directorname ) {
                                            isfinddir = true;
                                            dirItem.portList.push(directorport) ;
                                            break;
                                        }
                                    }
                                    if ( isfinddir == false  ){
                                        var dirItem = {};
                                        dirItem["directorName"] = directorname;
                                        dirItem["portList"] = [];
                                        dirItem.portList.push(directorport);
        
                                        vnxoutItem.directorList.push(dirItem);
                                    }
                                }
                            }
                            if ( isfind == false ) {
                                var vnxoutItem = {};
                                vnxoutItem["storageName"] = item.device;
                                vnxoutItem["storageSn"] = item.serialnb;
                                vnxoutItem["directorList"] = [];
                                var dirItem = {};
                                dirItem["directorName"] = directorname;
                                dirItem["portList"] = [];
                                dirItem.portList.push(directorport);

                                vnxoutItem.directorList.push(dirItem);
                                vnxout.storageList.push(vnxoutItem);
                            }

                        }
                        callback(null,vnxout);
                   })                        
                },
                vmaxinfo: function(callback, result ) {
                    VMAX.GetFEPortsOnly(device, function(ret) {
                        var directorList = {};
                        var vnxout = {};
                        vnxout["storageType"] = 'VMAX';
                        vnxout["storageList"] = [];
                        for ( var i in ret ) {
                            var item = ret[i];
                            var director = item.feport.split(":");
                            var directorname = director[0];
                            var directorport = director[1];
 
                            var isfind = false; 
                            var directorname1 = directorname.substring(0,directorname.length-1); 
                            if ( directorList[item.device] === undefined ) directorList[item.device] = [];
                            for ( var z in directorList[item.device] ) 
                                if ( directorList[item.device][z] == directorname1 ) {
                                    isfind = true;
                                    break;
                                }
                            if ( isfind == false ) 
                                directorList[item.device].push(directorname1);
                            

                            var isfind = false;
                            for ( var j in vnxout.storageList ) { 
                                var vnxoutItem = vnxout.storageList[j]; 
                                if ( vnxoutItem.storageSn == item.device ) {
                                    isfind = true;
                                    var isfinddir = false;
                                    for ( var z in vnxoutItem.directorList ) {
                                        var dirItem = vnxoutItem.directorList[z];
                                        if ( dirItem.directorName == directorname ) {
                                            isfinddir = true;
                                            dirItem.portList.push(directorport) ;
                                            break;
                                        }
                                    }
                                    if ( isfinddir == false  ){
                                        var dirItem = {};
                                        dirItem["directorName"] = directorname;
                                        dirItem["portList"] = [];
                                        dirItem.portList.push(directorport);
        
                                        vnxoutItem.directorList.push(dirItem);
                                    }
                                }
                            }
                            if ( isfind == false ) {
                                var vnxoutItem = {};
                                vnxoutItem["storageName"] = "";
                                vnxoutItem["storageSn"] = item.device;
                                vnxoutItem["directorList"] = [];
                                var dirItem = {};
                                dirItem["directorName"] = directorname;
                                dirItem["portList"] = [];
                                dirItem.portList.push(directorport);

                                vnxoutItem.directorList.push(dirItem);
                                vnxout.storageList.push(vnxoutItem);
                            }

                        }
                        console.log(directorList);
                        console.log(vnxout);
                        for ( var i in vnxout.storageList ) {
                            var storageItem = vnxout.storageList[i];

                            if ( directorList[storageItem.storageSn] === undefined ) continue ;

                            for ( var j in directorList[storageItem.storageSn] ) {
                                var directorItem = directorList[storageItem.storageSn][j];
                                var dirItem = {};
                                dirItem["directorName"] = directorItem;
                                dirItem["portList"] = [];
                                storageItem.directorList.push(dirItem);
                            }
                        }
                        callback(null,vnxout);
                   })                     
                },
                arrayinfo: function( callback, result ) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function(arrayInfo) {
                        callback(null,arrayInfo);
                    })
                },
                mergeResult: ["vnxinfo","vmaxinfo","arrayinfo", function(callback, result ) {

                    for ( var i in result.vmaxinfo.storageList ) {
                        var item = result.vmaxinfo.storageList[i];
                        for ( var j in result.arrayinfo ) {
                            var infoItem = result.arrayinfo[j];
                            if ( item.storageSn == infoItem.sn ) {
                                item.storageName = infoItem.name;
                            }
                        }
                    }
                    var finalResult = [];
                    finalResult = finalResult.concat(result.vnxinfo);
                    finalResult = finalResult.concat(result.vmaxinfo);
             
                    callback(null,finalResult);

                }]
            }, function(err, result ) {


                res.json(200,result.mergeResult);
            }
            
        );
    });


    
    //http://10.62.38.246:8080/ceb/config/multiQuery/getQueryCondition?_=1533912943234
    // 配置信息->关联关系查询-2: (交换机端口->服务器,服务器->交换机、存储)条件选择数据

     app.get('/rest/multiQuery/getQueryConditio', function (req, res) {   
        var config = configger.load();
        res.setTimeout(1200*1000);

        var config = configger.load(); 
        var ReportTmpDataPath = config.Reporting.TmpDataPath;
        var ReportOutputPath = config.Reporting.OutputPath;
                        
        var device; 
 
        async.auto(
            {

                appinfo: function(callback, result ) { 
                    Analysis.getAppTopology(function(apptopo) { 
                        var hosts = [];
                        for ( var i in apptopo ) {
                            var item = apptopo[i];
                            if ( item.host == "" ) continue;
                            var isfind = false;
                            for ( var j in hosts ) {
                                var hostItem = hosts[j];
                                if ( item.host == hostItem ) {
                                    isfind = true;
                                    break;
                                }
                            }
                            if ( isfind == false ) hosts.push(item.host);
                        }
                        callback(null,hosts);
                    })                   
                },
                arrayinfo: function( callback, result ) {
                    var param = {};
                    param['filter'] = 'datagrp=\'BROCADE_FCSWITCH_PORT\''; 
            
                    param['keys'] = ['deviceid','partwwn']; 
                    param['fields'] = ['partid','lsname'];
            
                    CallGet.CallGet(param, function(param) {  
                        var swportinfo = [];
                        for ( var i in param.result ) {
                            var item = param.result[i];

                            var isfind = false;
                            for ( var j in swportinfo ) {
                                var switem = swportinfo[j];

                                if ( item.lsname == switem.name ) {
                                    isfind = true;
                                    switem.wwpn.push(item.partid+'(' + item.partwwn + ')');
                                    break;
                                }
                            }
                            if ( isfind == false ) {
                                var switem = {};
                                switem["name"] = item.lsname;
                                switem["wwpn"] = [];
                                switem.wwpn.push(item.partid+'(' + item.partwwn + ')');
                                switem["sn"] = item.deviceid;
                                swportinfo.push(switem);
                            }
                        } 

                        callback(null, swportinfo ); 
                    }); 
                },
                mergeResult: ["appinfo","arrayinfo", function(callback, result ) {
 
                    var finalResult = {};
                    finalResult["hosts"] = result.appinfo;
                    finalResult["switchPorts"]= result.arrayinfo; 
             
                    callback(null,finalResult);

                }]
            }, function(err, result ) {


                res.json(200,result.mergeResult);
            }
            
        );
    });




    //7555http://10.62.38.246:8080/ssmp-frontend/rest/config/configQuery/?storage=VNX+_+CKM00114601261&director=all&port=all&_=1533896160718
     // 配置信息->关联关系查询-2: (存储前端口->服务器 )

    app.get('/rest/config/configQuery', function (req, res) { 
        res.setTimeout(1200*1000);

        var fs = require('fs');
                     
        var storageTmp = req.query.storage.replace(" _ ",',');

        var storageType = storageTmp.split(",")[0];
        var storageSn = storageTmp.split(",")[1];

        var director = req.query.director.replace(' ','');
        var port = req.query.port;
        var ReportOutputPath = config.Reporting.OutputPath;

        console.log(Date() + '\t' + storageTmp+"\t"+storageSn+"\t"+storageType+"\t"+director);
 
        var device;
        async.auto(
            {
                apptopo: function( callback, result ) {

                    Analysis.getAppTopology(function(apptopo) {
                        
                        var appTopo1 = []; 
                        console.log(Date() + '\t' + "apptopo="+apptopo.length);
                        for ( var i in apptopo) {
                            var item = apptopo[i];
                            item["TEST"] = director;
                            if ( director != 'all' && port != 'all') {
                                var feport = director+':'+port;
                                if ( item.array == storageSn && item.arrayport == feport ) 
                                    appTopo1.push(item);
                            } else if ( director != 'all' && port == 'all') {
                                console.log(item.array + ',' + item.arrayport);
                                if ( item.array == storageSn && item.arrayport.indexOf(director) >=0  ) 
                                    appTopo1.push(item);

                            } else 
                                if ( item.array == storageSn ) appTopo1.push(item);
                        }
                        callback(null,appTopo1);
                    })
                } ,
                appinfo: function ( callback, result ) {  
                    Report.GetApplicationInfo( function (ret) {
                        console.log(Date() + '\t' + "GetApplicationInfo="+ret.length); 
                        //var appJson = JSON.parse(ret); 
                        callback(null,(ret));
                    });    
                },
                mergeResult: ["apptopo","appinfo",  function(callback, result ) {

                    if ( storageType == 'VNX' ) {
                        console.log('storage is vnx');
                        var finalResult = [];
                        for ( var i in result.apptopo ) {
                            var item = result.apptopo[i];
    
                            var app = {} ;
                            for ( var z in result.appinfo ) {
                                var appitem = result.appinfo[z];
                                //if ( appitem.WWN === undefined ) console.log(appitem);
                                if ( appitem.WWN == item.hbawwn ) 
                                    app = appitem;
                            }
    
                            var isfind = false ;
                            for ( var j in finalResult ) {
                                var resultItem = finalResult[j];
                                if ( resultItem.SGName == item.maskingview && resultItem.appName == item.app )  {
                                    isfind = true;
                                    break;
                                }
                            }
                            if ( isfind == false ) {
                                var resultItem = {};

                                resultItem["Type"] = []; 
                                if ( app.appLevel !== undefined ) resultItem.Type.push(app.appLevel);


                                resultItem["SGName"] = item.maskingview;
                                resultItem["SGHost"] = [];
                                resultItem.SGHost.push("");
                                resultItem["MirrorViewNum"] = 0;
                                
                                
                                resultItem["LunNameNum"] = item.devices === undefined ? 0 : item.devices.split(',').length;
                                resultItem["mirrorViewToLuns"] = [];
        
                                resultItem["hostName"] = item.host;
                                resultItem["appAdmin"] = item.appManagerA;
                                resultItem["hostIP"] = app.hostIP;
                                resultItem["appName"] = item.app;
                                resultItem["hostID"] = "";
                                resultItem["masterSlave"] = app.hostRunType == 'PRIMARY' ? '主机' : '备机';
                                resultItem["admin"] =  app.admin;
                                resultItem["searchCode"] = app.searchCode;
                                resultItem["appShortName"] = item.appShortName;
                                resultItem["usePurpose"] = item.hostStatus;
                                finalResult.push(resultItem);
    
                            }
    
    
                        } 
                 
                        callback(null,finalResult);





                    } else if ( storageType == 'VMAX' ) {



                        console.log('storage is vmax');
                        var finalResult = [];
                        for ( var i in result.apptopo ) {
                            var item = result.apptopo[i];
    
                            var app = {} ;
                            for ( var z in result.appinfo ) {
                                var appitem = result.appinfo[z];
                                if ( appitem.WWN == item.hbawwn ) 
                                    app = appitem;
                            }
    
                            var isfind = false ;
                            for ( var j in finalResult ) {
                                var resultItem = finalResult[j];
                                if ( resultItem.viewName == item.maskingview && resultItem.appName == item.app && resultItem.hostName == item.host)  {
                                    isfind = true;
                                    break;
                                }
                            }
                            if ( isfind == false ) {
                                var resultItem = {};
                                resultItem["TEST"] = director;
                                resultItem["Type"] = []; 
                                if ( app.appLevel !== undefined ) resultItem.Type.push(app.appLevel);


                                resultItem["viewName"] = item.maskingview;
                                resultItem["IGNum"] = 1 ;
                                resultItem["PGNum"] = 1 ;
                                resultItem["SGNum"] =  1;
                                resultItem["DeviceNum"] = item.devices.split(',').length;
                                resultItem["maskViewInfos"] = [];
                                var maskviewinfoItem = {};
                                maskviewinfoItem["SG"] = item.SG;
                                maskviewinfoItem["PG"] = item.PG;
                                maskviewinfoItem["IG"] = item.IG; 
                                resultItem["maskViewInfos"].push(maskviewinfoItem);

                                resultItem["maskviewToDevices"] = [];
                                var devs = item.devices.split(',');
                                for ( var z in devs ) {
                                    var devItem = {};
                                    devItem["deviceType"] = "";
                                    devItem["SG"] = item.SG;
                                    devItem["deviceName"] = devs[z];
                                    devItem["IG"] = item.IG;
                                    devItem["PG"] = item.PG;

                                    resultItem.maskviewToDevices.push(devItem);

                                }
        
                                resultItem["hostName"] = item.host;
                                resultItem["appAdmin"] = item.appManagerA;
                                resultItem["hostIP"] = app.hostIP;
                                resultItem["appName"] = item.app;
                                resultItem["hostID"] = "";
                                resultItem["masterSlave"] = app.hostRunType == 'PRIMARY' ? '主机' : '备机';
                                resultItem["admin"] =  app.admin;
                                resultItem["searchCode"] = app.searchCode;
                                resultItem["appShortName"] = item.appShortName;
                                resultItem["usePurpose"] = item.hostStatus;
                                finalResult.push(resultItem);
    
                            }
    
    
                        } 
                 
                        callback(null,finalResult);

                    }


                }]
            }, function(err, result ) {

                console.log(Date() + '\t' + "Finished");
                res.json(200,result.mergeResult);
            }
            
        );
    });




 
    // http://10.62.38.246:8080/ceb/config/multiQuery/getHostToSwitchInfo?sn=100000051E365840&wwpn=11(200B00051E365840)&_=1533949591187
    // 配置信息->关联关系查询-4: (交换机端口->服务器   )

     app.get('/rest/config/multiQuery/getHostToSwitchInfo', function (req, res) { 
        res.setTimeout(1200*1000);

        var switemsn = req.query.sn;
        var wwpn = req.query.wwpn;
        var portid = wwpn.split('(')[0];
        var portwwn = wwpn.split('(')[1].replace(')','');

        console.log(switemsn+"\t"+wwpn+"\t"+portid+"\t"+portwwn);
 
        var device;
        async.auto(
            {
                apptopo: function( callback, result ) {
                    Analysis.getAppTopology(function(apptopo) {
                        console.log(Date() + "TEST0");
                        var appTopo1 = [];
                        for ( var i in apptopo) {
                            var item = apptopo[i];
                            if ( item.connect_hba_swport_wwn == portwwn ) {
                                var retItem = {};
                                retItem["hostName"] = item.host;
                                retItem["appAdmin"] = item.appManagerA;
                                retItem["hostip"] = "";
                                retItem["appName"] = item.app;
                                retItem["masterSlave"] = "";
                                retItem["admin"] = "";
                                retItem["wwpn"] = portwwn;
                                retItem["searchCode"] = 
                                retItem["sppShortName"] =  item.appShortName;
                                retItem["hbaWwn"] = item.hbawwn;
                                retItem["usePurpose"] = "";
                                retItem["switchName"] = item.connect_hba_sw;
                                retItem["sn"] = item.connect_hba_sw_id;
                                
                                appTopo1.push(retItem);
                            }
                        }

                        var returnData=[];
                        for ( var i in appTopo1 ) {
                            var item = appTopo1[i];
                            var isfind = false;
                            for ( var j in returnData ) {
                                var retItem = returnData[j]; 
                                if (    item.hostName == retItem.hostName && 
                                        item.appName == retItem.appName && 
                                        item.hbawwn == retItem.hbawwn  
                                    ) {
                                        isfind = true;
                                        break;
                                    }
                            }
                            if ( isfind == false ) returnData.push(item);

                        }
                        console.log(Date() + "TEST2");
                        callback(null,returnData);
                    })
                } ,
                appinfo: function ( callback, result ) {
                    Report.GetApplicationInfo( function (ret) {
                        console.log(Date() + "TEST3");
                        callback(null,(ret));
                    });   
                },
                mergeResult: ["apptopo","appinfo",  function(callback, result ) {
                    console.log(Date() + "TEST4");
                 
                    for ( var i in result.apptopo ) {
                        var item = result.apptopo[i];

                        var app = {} ;
                        for ( var z in result.appinfo ) {
                            var appitem = result.appinfo[z];
                            if ( appitem.app == item.appName )  {
                                app= appitem;
                                break;
                            }
                                app = appitem;
                        }

                        item["hostip"] = app.hostIP; 
                        item["masterSlave"] = app.hostRuntype;
                        item["admin"] = app.admin; 
                        item["searchCode"] = app.searchCode;  
                        item["usePurpose"] = app.appLevel; 
                    } 
                    console.log(Date() + "TEST6");
                    callback(null,result.apptopo);

                }]
            }, function(err, result ) {

                console.log(Date() + "TEST7");
                res.json(200,result.mergeResult);
            }
            
        );
    });


    //http://10.62.38.246:8080/ssmp-frontend/rest/config/getConfigViewsByHost/ECFB-QZ-APP-P01
    // 配置信息->关联关系查询-4: ( 服务器->交换机、存储  )

     app.get('/rest/config/getConfigViewsByHost/:hostname', function (req, res) { 
        res.setTimeout(1200*1000);

        var hostname = req.params.hostname;
        console.log("HOSTNAME="+hostname);
        var device;
        async.auto(
            {
                apptopo: function( callback, result ) {
                    Analysis.getAppTopology(function(apptopo) {
                        var appTopo1 = [];
                        for ( var i in apptopo) {
                            var item = apptopo[i];
                            if ( item.host == hostname ) {
                                var retItem = {};
                                retItem["hostName"] = item.host;
                                retItem["storage_SwitchName"] = item.connect_hba_sw;
                                retItem["VPLEX"] = "";
                                retItem["fabricId"] = item.fabricname ;
                                retItem["appName"] = item.app;
                                retItem["hostSN"] = "" ;
                                retItem["masterSlave"] = item.hostStatus ;
                                retItem["host_SwitchSN"] = item.connect_hba_sw_id ;
                                retItem["admin"] = ""; 
                                retItem["type"] = "" ;
                                retItem["url"] = "" ;
                                retItem["storageName"] = item.arrayname ;
                                retItem["hostConnWwpn"] = item.hbawwn;
                                retItem["host_SwitchName"] = item.connect_hba_sw;
                                retItem["appId"] = "";
                                retItem["location"] = "" ;
                                retItem["storageConnWwpn"] = item.connect_arrayport_swport_wwn ;
                                retItem["shortName"] = item.appShortName ;
                                retItem["storage_SwitchSN"] = item.connect_arrayport_sw_id ;
                                retItem["storageSN"] = item.array ;
                                       
                                                                
                                appTopo1.push(retItem);
                            }
                        }

                        var returnData=[];
                        for ( var i in appTopo1 ) {
                            var item = appTopo1[i];
                            var isfind = false;
                            for ( var j in returnData ) {
                                var retItem = returnData[j]; 
                                if (    item.host_SwitchSN == retItem.host_SwitchSN && 
                                        item.storage_SwitchSN == retItem.storage_SwitchSN && 
                                        item.appName == retItem.appName && 
                                        item.storageSN == retItem.storageSN  
                                    ) {
                                        isfind = true;
                                        break;
                                    }
                            }
                            if ( isfind == false ) returnData.push(item);

                        }
                        callback(null,returnData);
                    })
                } ,
                appinfo: function ( callback, result ) {
                    Report.GetApplicationInfo( function (ret) {
                        callback(null,(ret));
                    });   
                },
                arrayinfo: function ( callback, result ) {
                    DeviceMgmt.getMgmtObjectInfo(device, function(ret) {     
                        callback(null,(ret));     
                    });
                },
                mergeResult: ["apptopo","appinfo", "arrayinfo", function(callback, result ) {

                 
                    for ( var i in result.apptopo ) {
                        var item = result.apptopo[i];

                        var app = {} ;
                        for ( var z in result.appinfo ) {
                            var appitem = result.appinfo[z];
                            if ( appitem.app == item.appName )  {
                                app= appitem;
                                break;
                            }
                                app = appitem;
                        } 

                        var array = {};
                        for ( var j in result.arrayinfo ) {
                            var arrayitem = result.arrayinfo[j];
                            if ( arrayitem.sn == item.storageSN )  {
                                array = arrayitem;
                                break;
                            }
                                array = arrayitem;
                        } 

                                                

                        item["VPLEX"] = "";
                        item["hostSN"] = "" ; 
                        item["appId"] = "";
                        item["admin"] = app.admin; 
                        item["type"] = array.name.indexOf("VMAX") ? 'vmax' : 'vnx' ;
                        item["url"] = item.type=='vmax' ? '../vmax/summary.html' : '../vnx/summary.html';
                        item["location"] = array.cabinet ;

                    } 
             
                    callback(null,result.apptopo);

                }]
            }, function(err, result ) {


                res.json(200,result.mergeResult);
            }
            
        );
    });




};

module.exports = cebPerformanceProviderController;
