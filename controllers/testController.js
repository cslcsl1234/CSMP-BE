"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('testController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
var moment = require('moment');

 
var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');
var App = require('../lib/App');
var GETCALL = require('../lib/CallGet');

var mongoose = require('mongoose');
var AppObj = mongoose.model('Application');
 
var getTopos = require('../lib/topos.js');
var Host = require('../lib/Host');
var VMAX = require('../lib/Array_VMAX');
var VPLEX = require('../lib/Array_VPLEX');
var Switch = require('../lib/Switch');
var VNX = require('../lib/Array_VNX');
var Capacity = require('../lib/Array_Capacity');
var GetEvents = require('../lib/GetEvents');
var DeviceMgmt = require('../lib/DeviceManagement');
var SWITCH = require('../lib/Switch');
var CallGet = require('../lib/CallGet');  
var util = require('../lib/util');   
var topos= require('../lib/topos');
var DeviceMgmt = require('../lib/DeviceManagement');
var Report = require('../lib/Reporting');
var CAPACITY = require('../lib/Array_Capacity');


var testController = function (app) {

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


    function GetAssignedInitiatorByDevices(device, callback) { 

        async.waterfall([
            function(callback){ 

                var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
                queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
                queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

                queryString = queryString + "     SELECT distinct  ?arraySN ?deviceName ?deviceWWN ?MaskingView  ";
                queryString = queryString + "     WHERE {    ";
                queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
                queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
                queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    ";
                queryString = queryString + "       ?device srm:displayName ?deviceName .   ";
                queryString = queryString + "       ?device srm:volumeWWN ?deviceWWN .    ";
                queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   "; 
                if ( device !== undefined )
                    queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";      
                queryString = queryString + "     }  ";

                topos.querySparql(queryString,  function (response) { 
                    for ( var i in response ) {
                        var item = response[i]; 
                        item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:"+item.arraySN+":",""); 
                    }
                    var result = {};
                    result["devices"] = response;
                    callback(null,result);
                }); 
            }, 
            function(arg1,  callback){   
                var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
                queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
                queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

                queryString = queryString + "     SELECT distinct  ?arraySN ?MaskingView ?initEndPoint ";
                queryString = queryString + "     WHERE {    ";
                queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
                queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
                queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    "; 
                queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";  
                queryString = queryString + "       ?MaskingView srm:maskedToInitiator ?initEndPoint .    "; 
                
                if ( device !== undefined )
                    queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";      
                queryString = queryString + "     }  ";

                var maskingviews = {};
                topos.querySparql(queryString,  function (response) { 
                    for ( var i in response ) {
                        var item = response[i]; 
                        item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:"+item.arraySN+":",""); 
                        item["initEndPoint"] = item.initEndPoint.replace("topo:srm.ProtocolEndpoint:","");
                       if ( maskingviews[item.MaskingView] !== undefined ) {
                            maskingviews[item.MaskingView]["initEndPoint"].push(item.initEndPoint);
                        } else {
                            maskingviews[item.MaskingView] = {}
                            maskingviews[item.MaskingView]["arraySN"] = item.arraySN;
                            maskingviews[item.MaskingView]["initEndPoint"] = [];
                            maskingviews[item.MaskingView]["initEndPoint"].push(item.initEndPoint);
                        };
                    } 
 


                    arg1["maskingview"] = maskingviews;
                    callback(null,arg1);
                });                 
            }, 
            function(arg1,  callback){   
                var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
                queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
                queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

                queryString = queryString + "     SELECT distinct  ?arraySN ?MaskingView ?FEName ";
                queryString = queryString + "     WHERE {    ";
                queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
                queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
                queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    "; 
                queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";  
                queryString = queryString + "       ?MaskingView srm:maskedToTarget ?FEEndPoint .    "; 
                queryString = queryString + "       ?FEEndPoint srm:Identifier ?FEName .    "; 
                
                if ( device !== undefined )
                    queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";      
                queryString = queryString + "     }  ";

                var maskingviews = arg1.maskingview;
                topos.querySparql(queryString,  function (response) { 
                    for ( var i in response ) {
                        var item = response[i]; 
                        item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:"+item.arraySN+":",""); 
                        item["FEName"] = item.FEName.replace("topo:srm.StorageFrontEndPort:"+item.arraySN+":","");

                        if ( maskingviews[item.MaskingView] !== undefined ) {
                            if ( maskingviews[item.MaskingView]["FEName"] === undefined )
                                 maskingviews[item.MaskingView]["FEName"] = [];
                             maskingviews[item.MaskingView]["FEName"].push(item.FEName);
                        } else {
                            maskingviews[item.MaskingView] = {}
                            maskingviews[item.MaskingView]["arraySN"] = item.arraySN;
                            maskingviews[item.MaskingView]["FEName"] = [];
                            maskingviews[item.MaskingView]["FEName"].push(item.FEName);
                        };

                    } 
                    
                    callback(null,arg1);
                });                 
            }
        ], function (err, result) { 

           callback( result ); 
        });
 
}


    app.get('/api/test1', function (req, res) {

 

           
        async.waterfall([
            function(callback) { 
    
                var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#> ";
                queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
                queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";
                queryString = queryString + " SELECT distinct ?MV ?MVName ?TARGET ?TARGET_ID ?TARGET_WWN ?INIT ?SGName ";
                queryString = queryString + " WHERE {  ";
                queryString = queryString + "     ?MV rdf:type srm:MaskingView .   "; 
                queryString = queryString + "     ?MV srm:Identifier ?MVID  .  ";
            
                queryString = queryString + "     ?MV srm:maskedToStorageVolumeGroup ?SG  .  "; 
                queryString = queryString + "     ?SG srm:displayName ?SGName  .  "; 

                
                queryString = queryString + "     ?MV srm:maskedToInitiator ?INIT  .  ";
                queryString = queryString + "     ?MV srm:maskedToTarget ?TARGET  .  ";
                queryString = queryString + "     ?TARGET srm:Identifier ?TARGET_ID  .  ";
                queryString = queryString + "     ?TARGET srm:containsProtocolEndpoint ?TARGET_WWN  .  ";
                queryString = queryString + "     ?MV srm:viewName ?MVName  .  "; 
             
                queryString = queryString + "  }  ";
    

                var viewResult = [];
                topos.querySparql(queryString, function(result) {
                    
                    for ( var i in result ) {
                        var item = result[i]; 
                        var viewItem = {};

                        viewItem["sgname"] = item.SGName; 
                        viewItem["initgrp"] = item.INIT.split(':')[2];
                        viewItem["portgrp"] = (item.TARGET.split(':')[3]).replace("~20","");
                        viewItem["part"] = item.MVName;
                        viewItem["device"] = item.MV.split(':')[2];
                        var initgrp_member = [];
                        initgrp_member.push( item.INIT.split(':')[2] );

 

                        var portgrp_member = [];
                        var portgrp_member_item={}; 
                        portgrp_member_item["device"] = item.TARGET_ID.split(':')[2];
                        portgrp_member_item["feport"] = (item.TARGET_ID.split(':')[3]).replace("~20","")+":"+item.TARGET_ID.split(':')[4];
                        portgrp_member_item["portwwn"] = item.TARGET_WWN.split(':')[2];
                        portgrp_member.push(portgrp_member_item);

                        viewItem["initgrp_member"] = initgrp_member;
                        viewItem["portgrp_member"] = portgrp_member;
                        
                        viewResult.push(viewItem);
                        //console.log(viewItem);
                    } 
                    callback(null,viewResult);
                })
        
            },
 
            function(arg, callback) {  
 
                var param={};
                param['filter'] = '!parttype&(source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
                param['filter_name'] = '(name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','devdesc','model']; 
    
    
                CallGet.CallGet(param, function(param) {
                    var arrayinfo = {};
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        if ( arrayinfo[item.device] === undefined ) arrayinfo[item.device] = item;

                    }
                    for ( var j in arg ) {
                        var item = arg[j];
                        item["array_model"] = arrayinfo[item.device].model;
                        item["sn"] = arrayinfo[item.device].serialnb;
                    }
                    callback(null,arg);
                });
                
    
            }, 

            function(arg, callback) { 
                    
                
                    var filterbase = 'datagrp=\'VNXBlock-LUN\'&!vstatus==\'inactive\'';
                    
                    if ( start === undefined ) var start = util.getConfStartTime();
                    if ( end   === undefined ) var end = util.getPerfEndTime();
            
            
                    var param = {}; 
                    param['period'] = '3600';
                    param['start'] = start;
                    param['end'] = end;
                    param['type'] = 'max';
                    param['limit'] = 10000000;
                    param['keys'] = ['serialnb,part']; 
                    param['fields'] = ['device','partdesc','partsn','partid','sgname'];   
                    param['filter'] = filterbase;
                    param['filter_name'] = '(name=\'AssignableCapacity\')';
                    
            
                    CallGet.CallGetPerformance(param, function(ret) {  
                        var result1 = {};
                        var resultCapacity = {};
                        for ( var i in ret ) { 
                            var item = ret[i];
                            delete item.matrics;
                            item["Capacity"] = item.matricsStat.AssignableCapacity.max;
                            delete item.matricsStat;
            
                            // ------------
                            var device = item.device;
                            var serialnb = item.serialnb;
                            var vol = item.partid; 
            
                            if ( result1[device] === undefined ) result1[device] = {};
                            if ( resultCapacity[device] === undefined ) resultCapacity[device] = {};
                        
                            var SGNames = item.sgname.split('|'); 
                            
                            for ( var j in SGNames ) {
                                var SGName = SGNames[j];
                                if ( result1[device][SGName] === undefined ) 
                                    result1[device][SGName] = [];


                                if ( resultCapacity[device][SGName] === undefined ) 
                                    resultCapacity[device][SGName] = item.Capacity;
                                else 
                                    resultCapacity[device][SGName] += item.Capacity;



                                var sgItem = {};
                                sgItem["device"] = device;
                                sgItem["serialnb"] = serialnb;
                                sgItem["part"] = vol;
                                sgItem["sgname"] = SGName;
                                sgItem["Capacity"] = item.Capacity;
                                sgItem["lunwwn"] = item.partsn;
                                sgItem["lunname"] = item.partdesc;
                
                
                                result1[device][SGName].push(sgItem);

                            }

                        }

                        for ( var j in arg ) {
                            var item = arg[j];

                            if ( result1[item.device] !== undefined )
                                if ( result1[item.device][item.sgname] !== undefined ) { 
                                     
                                     item["sg_member"] = result1[item.device][item.sgname];
                                     item["Capacity"] = resultCapacity[item.device][item.sgname];

                                }
                                else {
                                    item["sg_member"] = [];
                                    item["Capacity"] = 0;
                                } 
                        }
                        callback(null,arg); 
                    });
            }
            
        ], function (err, result) {

            res.json(200,result);
         });

     });                       

    app.get('/api/test', function (req, res) {
        res.setTimeout(1200*1000);
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        
        var device = req.query.device; 
        var period = 86400; 
        var eventParam = {};
        if (typeof device !== 'undefined') { 
            eventParam['filter'] = 'device=\''+device + '\'&!acknowledged&active=\'1\'';
            var filter = 'device=\''+device + '\'&!acknowledged&active=\'1\'';
        } else {
            eventParam['filter'] = '!acknowledged&active=\'1\'';
        } 
 
        //console.log(eventParam);
        //GetEvents.GetEvents(eventParam, function(result1) {   
            var fabwwn;
            
            var config = configger.load(); 
            var ReportTmpDataPath = config.Reporting.TmpDataPath;
        //GetAssignedInitiatorByDevices1(device,function(result) {
            
           // SWITCH.getZone1(device, function(zonelist) { res.json(200 , zonelist); });

           //Switch.getFabric(fabwwn,function(resultJson) {    res.json(200,resultJson);       });

           //Switch.GetSwitchPorts(device, function(result) {            res.json(200,result);       });

          //VMAX.getArrayPerformance1( function(result) {            res.json(200,result);       }); 
          // VMAX.GetCapacity(device, function(result) {            res.json(200,result);       });  
          var sgname;
          var period = 86400;
          
          var valuetype = 'max';
          //var start  = util.getPerfStartTime(); 
          var start = '2018-05-30T16:00:00.000Z';
          var end = '2018-06-29T16:00:00.000Z';;
          var part;
         // VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function(rest) {        res.json(200,rest);           });
          //function GetFCSwitchPart(devtype,parttype,callback) { 
            Report.getAppStorageRelation( function (result )  {  res.json(200,result) });
            //CAPACITY.GetArrayTotalCapacity('lastMonth', function(result) {   res.json(200,result);   }); 
        //Report.GetArraysIncludeHisotry(device, start, end, function(result) {    res.json(200,result);   }); 

        //VMAX.getArrayLunPerformance1(device, function(ret) {           res.json(200,ret);        });

        //SWITCH.GetSwitchPorts(device, function(rest) {             res.json(200,rest);        });
        //SWITCH.getZone(device, function(rest) {             res.json(200,rest);        });
       // VMAX.GetStorageGroups(device, function(result) {   res.json(200,result);   }); 
        //VMAX.GetDirectorPerformance(device, period, start, valuetype, function(rest) {             res.json(200,rest);        });
        //VMAX.GetDiskPerformance(device, period, start,end,  valuetype, function(rest) {             res.json(200,rest);        });
        //VMAX.GetArrays(  function(ret) {  res.json(200,ret);   }); 
        //Report.GetStoragePorts(function(ret) {
        //Report.GetArraysIncludeHisotry(device, function(ret) {  
        
        //VMAX.GetSGTop20ByCapacity(device, function(ret) {
        //Capacity.GetArrayCapacity(device, function(ret) {
         //   DeviceMgmt.GetArrayAliasName(function(ret) {           res.json(200,ret);        });
        //VNX.GetBlockDevices(device,  function(result) {   res.json(200,result);   }); 
        //VNX.GetMaskViews(function(ret) {  res.json(200,ret);   }); 
        //VMAX.GetMaskViews(device, function(ret) {     res.json(200,ret);        });
        //Report.ArrayAccessInfos(device, function(ret) {  res.json(200,ret);        });
        //Report.E2ETopology(device, function(ret) {   res.json(200,ret);        });
        //    Report.GetApplicationInfo( function (ret) {
 
            //var device = 'CETV2172300002';

            /*
            var part = 'SP A';
            var start = '2018-04-07T08:36:10.984Z';
            var end = '2018-05-07T08:36:10.986Z';
            Report.GetApplicationInfo( function (apps) { 
 
                //finalResult = finalResult.concat(ret);
                res.json(200 , apps);
           })        
           */
    });



    app.get('/api/test2', function (req, restu) {
        
        var device = req.query.device;
        if ( device !== undefined ) 
            var filterbase = 'serialnb=\''+device+'\'&datagrp=\'VNXBlock-LUN\'&!vstatus==\'inactive\'';
        else 
            var filterbase = 'datagrp=\'VNXBlock-LUN\'&!vstatus==\'inactive\'';
        
        if ( start === undefined ) var start = util.getConfStartTime();
        if ( end   === undefined ) var end = util.getPerfEndTime();


        var param = {}; 
        param['period'] = '3600';
        param['start'] = start;
        param['end'] = end;
        param['type'] = 'max';

        param['keys'] = ['serialnb,part']; 
        param['fields'] = ['device','partdesc','partsn','partid','sgname'];   
        param['filter'] = filterbase;
        param['limit'] = 10000000;
        param['filter_name'] = '(name=\'AssignableCapacity\')';
        

        CallGet.CallGetPerformance(param, function(ret) {  
            var result1 = {};
            for ( var i in ret ) {
                var item = ret[i];
                delete item.matrics;
                item["Capacity"] = item.matricsStat.AssignableCapacity.max;
                delete item.matricsStat;

                // ------------
                var device = item.device;
                var serialnb = item.serialnb;
                var vol = item.partid; 

                if ( result1[device] === undefined ) result1[device] = {};

                var SGNames = item.sgname.split('|');
                for ( var j in SGNames ) {
                    var SGName = SGNames[j];
                    if ( result1[device][SGName] === undefined ) result1[device][SGName] = [];
                    var sgItem = {};
                    sgItem["device"] = device;
                    sgItem["serialnb"] = serialnb;
                    sgItem["part"] = vol;
                    sgItem["sgname"] = SGName;
                    sgItem["Capacity"] = item.Capacity;
                    sgItem["lunwwn"] = item.partsn;
                    sgItem["lunname"] = item.partdesc;
    
    
                    result1[device][SGName].push(sgItem);
                }

            }
            restu.json(200,result1); 
        });

    

});

    app.get('/api/test/list', function (req, res) {

        var query = AppObj.find({}).select({ "name": 1, "_id": 0});
        query.exec(function (err, doc) {
            //system error.
            if (err) { 
                res.json(500 , {status: err})
            }
            if (!doc) { //user doesn't exist.
                res.json(200 , []); 
            }
            else {
                res.json(500 , doc);
            }

        });

    });


    app.get('/api/test12', function (req, res) {

        var fs = require('fs');
        var parser = require('xml2json');

        async.waterfall(
            [
                function(callback){       
                fs.readFile( './demodata/backmgmt-get.xml', 'utf-8', function(err, data) {
                    if ( err ) res.json(500,err);
                    else {
                        console.log("----"); 
                        var options = {
                            object: true 
                        }; 
                        var newdata = data.replace(/(<input[ a-zA-Z{}0-9.=\"]*)(">)/g,'$1"\/>');
                    
                        var json = parser.toJson(newdata,options);
                        callback(null,json);
                    }

                });
                        
            },
            function(arg, callback) {
                var headerdata = arg.div.div.table.thead.tr.th
                var tbody = arg.div.div.table.tbody.tr;

                var tab = [];
                var header = {};
                for ( var i in headerdata  ) {
                    var item = headerdata[i];

                    if ( i >= 0 & i <= 3 ) 
                        header[i] = item;
                    else 
                        header[i] = item.input.value;
                }

                for ( var i in tbody) {
                    var tbodyItem = tbody[i].td;

                    var recordItem = {}; 
                    for ( var j in tbodyItem ) {
                        var itemvalue = tbodyItem[j]; 

                        if ( j >= 1 & j <= 3 ) { 
                            switch ( j ) {
                                case '3' :  
                                    recordItem[header[j]] = itemvalue;
                                    break;
                                case '1' : 
                                    recordItem[header[j]] = itemvalue.span;
                                    break;
                                case '2' : 
                                    recordItem[header[j]] = itemvalue.input.value
                                    break;                               
                            } 
                                
                        } else {
                            recordItem[header[j]] = itemvalue.input.value
                        }
                    }
                    tab.push(recordItem);
                }
 
                callback(null,tab);
            } 
        ], function (err, result) {
            // result now equals 'done'

            res.json(200 ,result);
        });
    }); 



};

module.exports = testController;
