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

        var device;
 
        var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
        queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

        queryString = queryString + "     SELECT distinct  ?arraySN ?deviceName ?deviceWWN ?MaskingView  ?initEndPoint  ?FEName ";
        queryString = queryString + "     WHERE {    ";
        queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
        queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
        queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    ";
        queryString = queryString + "       ?device srm:displayName ?deviceName .   ";
        queryString = queryString + "       ?device srm:volumeWWN ?deviceWWN .    ";
        queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";
        queryString = queryString + "       ?MaskingView srm:maskedToInitiator ?initEndPoint .    "; 
        queryString = queryString + "       ?MaskingView srm:maskedToTarget ?FEEndPoint .    "; 
        queryString = queryString + "       ?FEEndPoint srm:Identifier ?FEName .    "; 
         if ( device !== undefined )
            queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";      
        queryString = queryString + "     }  ";

        topos.querySparql(queryString,  function (response) {
                        //var resultRecord = RecordFlat(response.raw_body, keys);
            for ( var i in response ) {
                var item = response[i]; 
                item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:"+item.arraySN+":",""); 
           }
           res.json(200 , response);
        }); 

     });                       

    app.get('/api/test', function (req, res) {
        res.setTimeout(1200*1000);
        
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
          var period = 3600;
          
          var valuetype = 'max';
          var start  = util.getPerfStartTime();
          var end;
          //VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function(rest) {        res.json(200,rest);           });
          //function GetFCSwitchPart(devtype,parttype,callback) { 
        
        //SWITCH.GetSwitchPorts(device, function(rest) {             res.json(200,rest);        });
        //SWITCH.getZone(device, function(rest) {             res.json(200,rest);        });
        //VMAX.GetStorageGroups(device, function(result) {   res.json(200,result);   }); 
        //VMAX.GetDirectorPerformance(device, period, start, valuetype, function(rest) {             res.json(200,rest);        });
        //VMAX.GetDiskPerformance(device, period, start,end,  valuetype, function(rest) {             res.json(200,rest);        });
       //VMAX.GetArrays(  function(ret) { 
        //Report.GetStoragePorts(function(ret) {
        //Report.GetArraysIncludeHisotry(device, function(ret) {  
        
        //VMAX.GetSGTop20ByCapacity(device, function(ret) {
        //Capacity.GetArrayCapacity(device, function(ret) {
         //   DeviceMgmt.GetArrayAliasName(function(ret) {           res.json(200,ret);        });
        //VNX.GetBlockDevices(device,  function(result) {   res.json(200,result);   }); 
        //VNX.GetMaskViews(function(ret) {
        VMAX.GetMaskViews(device, function(ret) {     res.json(200,ret);        });
        //Report.ArrayAccessInfos(device, function(ret) {
        //Report.E2ETopology(device, function(ret) {  
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
        async.waterfall(
            [

                function(callback){
                    var param = {};
                    //param['filter'] = '(parttype=\'MetaMember\'|parttype=\'LUN\')';
                    param['filter'] = '(parttype=\'StorageGroupToLUN\')';
                    //param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'PoolUsedCapacity\')';
                    param['keys'] = ['device','sgname','lunname'];
            
                    if (  device !==  undefined ) { 
                        param['filter'] = 'device=\''+device+'\'&' + param['filter'];
                    } 


                    CallGet.CallGet(param, function(param) {  
                        var res = param.result;

                        callback(null,res);

                    });

                }, 
                function ( arg1, callback) { 
        
                    var param = {};
                    //param['filter'] = '(parttype=\'MetaMember\'|parttype=\'LUN\')';
                    param['filter'] = '(parttype=\'LUN\')';
                    //param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'PoolUsedCapacity\')';
                    param['keys'] = ['device','part'];
                    param['fields'] = ['model','parttype','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked','vmaxtype','disktype'];
                    param['period'] = 604800;
                    param['start'] = util.getConfStartTime('1d');
            
                    if (  device !==  undefined ) { 
                        param['filter'] = 'device=\''+device+'\'&' + param['filter'];
                    } 


                    CallGet.CallGet(param, function(param) {  
                        var luns = param.result;

                        var res1 = {};
                        for ( var i in arg1 ) {
                            var item = arg1[i];
                            if ( res1[item.device] === undefined ) 
                                res1[item.device] = {};   
                                if ( res1[item.device][item.sgname] === undefined )
                                    res1[item.device][item.sgname] = []; 
                                
                                for ( var luni in luns ) {
                                    var lunItem = luns[luni];
                                    //console.log(item.device +","+lunItem.device +"\t"+ item.lunname +","+ item.part);
                                    if ( item.device == lunItem.device && item.lunname == lunItem.part )
                                        res1[item.device][item.sgname].push(lunItem); 
                                }
                                
                        }
            
                        callback(null,res1);

                    });
                } ,  
                    function(arg1, callback) {
                        callback(null,arg1);
                    } 
                ], function (err, result) { 
                    restu.json(200 , result );
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





};

module.exports = testController;
