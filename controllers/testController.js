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
var xml2json = require('xml2json');
var sortBy = require('sort-by');

 
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
var backendMgmt = require('../lib/BackendMgmt');
var Analysis = require('../lib/analysis');

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
        var start = moment('2018-07-26').toISOString(true); 
        var end = moment('2018-07-27').toISOString(true);
    
        var param = {};
        param['device'] = '000297000161';
        param['period'] = 3600;
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
                            resData[fieldname]['title'] = fieldname;
                            resData[fieldname]['dataset'] = [];
                        }

                        var isfind = false;
                        for ( var z in resData[fieldname].dataset ) {
                            var resItem = resData[fieldname].dataset[z];
                            if ( resItem.hour == hour ) {
                                if ( resItem[fename] === undefined ) {
                                    resItem[fename] = matricsItem[fieldname];
                                    resItem[fename+"_label"] = ts + ' ' + fename + ' ' + matricsItem[fieldname];
                                } else if ( resItem[fename] < matricsItem[fieldname] ) {
                                    resItem[fename] = matricsItem[fieldname];
                                    resItem[fename+"_label"] = ts + ' ' + fename + ' ' + matricsItem[fieldname];                                    
                                }
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) {
                            var resItem  = {};
                            resItem['hour'] = hour;
                            resItem[fename] = matricsItem[fieldname];
                            resItem[fename+"_label"] = ts + ' ' + fename + ' ' + matricsItem[fieldname];
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

            res.json(200,resData);
        });

     });     
     
     app.get('/test2',function(req, res) {
        var masking = require('C:\\CSMP\\reporting\\tmp\\masking.json');
        var apptopo = require('C:\\CSMP\\CSMP-BE\\data\\topology.json');
        var lunview = topos.CombineLunTopoViews(masking, apptopo );   

        
                
        var fs = require('fs');
        var wstream = fs.createWriteStream("./data/lunview.json");  
                 
        wstream.write('[');
        for ( var i in lunview ) {
            var item = lunview[i];
            if ( i == 0 ) wstream.write(JSON.stringify(item) +'\n');
            else wstream.write(', ' + JSON.stringify(item) +'\n');
        }
        wstream.write(']\n');
        wstream.end();    


        res.json(200,"succeeds");        
     })


     
     
     app.get('/test3',function(req, res) {
        var device;
        var perfStat = util.getConfStartTime('1w');  
                var param = {}; 
                param['device'] = device;
                param['period'] = '3600';
                param['start'] = perfStat;
                param['type'] = 'max';

                param['keys'] = ['serialnb,part']; 
                param['fields'] = ['device','dgstype','fsid','format','fsname','nasname','partdesc','type'];   
                param['filter'] = 'parttype==\'FileSystem\'';
                param['filter_name'] = '(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'UsedCapacity\'|name=\'CurrentUtilization\'|name=\'TotalBandwidth\'|name=\'TotalThroughput\')';
                   

                var ret1 = []
                CallGet.CallGetPerformance(param, function(ret) {  
                    res.json(200,ret);
                });
    });
    
    app.get('/test4',function(req, res) {
        
        var start = '2018-05-01T00:00:00.000Z';
        var end = '2018-05-30T00:00:00.000Z';
        var period = util.getPeriod(start, end);

        var r = {"period": period};
        res.json(200,r);

    });
    
    app.get('/api/test', function (req, res) {
        res.setTimeout(1200*1000);
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        
        var from = req.query.from;
        var to = req.query.to;
        
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

       // Switch.GetSwitchPorts(device, function(result) {            res.json(200,result);       });

          //VMAX.getArrayPerformance1( function(result) {            res.json(200,result);       }); 
          // VMAX.GetCapacity(device, function(result) {            res.json(200,result);       });  
          var sgname;
          var period = 86400;
          
          var valuetype = 'average';
          //var start  = util.getPerfStartTime(); 
          var start = '2018-05-30T16:00:00.000Z';
          var end = '2018-06-29T16:00:00.000Z';;
          var part;

         // VMAX.GetFEPortsOnly(device,function(rest) {             res.json(200,rest);        });
         //VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function(rest) {        res.json(200,rest);           });
          //function GetFCSwitchPart(devtype,parttype,callback) { 
          //  Report.getAppStorageRelation( function (result )  {  res.json(200,result) });

          Report.getArrayResourceLimits(from,to, function (result )  {  res.json(200,result) });

            //CAPACITY.GetArrayTotalCapacity('lastMonth', function(result) {   res.json(200,result);   }); 
       // Report.GetArraysIncludeHisotry(device, start, end, function(result) {    res.json(200,result);   }); 

        //VMAX.getArrayLunPerformance1(device, function(ret) {           res.json(200,ret);        });

        //SWITCH.GetSwitchPorts(device, function(rest) {             res.json(200,rest);        });
       // SWITCH.getZone(device, function(rest) {             res.json(200,rest);        });
       // VMAX.GetStorageGroups(device, function(result) {   res.json(200,result);   }); 
        //VMAX.GetDirectorPerformance(device, period, start, valuetype, function(rest) {             res.json(200,rest);        });
        //VMAX.GetDiskPerformance(device, period, start,end,  valuetype, function(rest) {             res.json(200,rest);        });
        //VMAX.GetArrays(  function(ret) {  res.json(200,ret);   }); 
        //Report.GetStoragePorts(function(ret) {
        //Report.GetArraysIncludeHisotry(device, function(ret) {  
        
        //VMAX.GetSGTop20ByCapacity(device, function(ret) {
        //Capacity.GetArrayCapacity(device, function(ret) {     res.json(200,ret);        });
         //   DeviceMgmt.GetArrayAliasName(function(ret) {           res.json(200,ret);        });
        //VNX.GetBlockDevices(device,  function(result) {   res.json(200,result);   }); 
        //VNX.getSPPerformance(device, part, start, end ,function(result) {  res.json(200,result);   });

        //VNX.GetUNITY_NASSERVER(device,  function(result) {   res.json(200,result);   }); 
        //VNX.GetVNX_NFSExport(device,  function(result) {   res.json(200,result);   }); 
        //VNX.GetUNITY_NFSExport(device,  function(result) {   res.json(200,result);   }); 
        //var device  = 'Unity-022';
        var vols = 'jytjsxt';
        var start = '2018-01-01T01:01:01+08:00';
        var end = '2018-08-29T16:00:00.000Z';
       // VNX.getNFSPerformance(device, vols, start, end,function(result) {  res.json(200,result);   }); 
        //VNX.getUNITY_FS_Performance(device, vols, start, end,function(result) {  res.json(200,result);   }); 

        //VNX.GetArrayType(device,  function(result) {   res.json(200,result);   }); 

  
        //VNX.GetMaskViews(function(ret) {  res.json(200,ret);   }); 
        //VMAX.GetMaskViews(device, function(ret) {     res.json(200,ret);        });
       // Report.ArrayAccessInfos(device, function(ret) {  res.json(200,ret);        });
        //VMAX.GetAssignedHosts(device, function(rest) {             res.json(200,rest);        });

        //Report.E2ETopology(device, function(ret) {   res.json(200,ret);        });
       // Report.GetApplicationInfo( function (ret) {  res.json(200,ret);        });
        //Analysis.getAppTopology(function(apptopo) {            res.json(200,apptopo);        })
       // DeviceMgmt.getMgmtObjectInfo(device, function(ret) {     res.json(200,ret);        });
        //var apps = Report.ApplicationCapacityAnalysis("","");
        //res.json(200,apps);
        //VNX.GetSPs(device, function(ret) {     res.json(200,ret);        });
        var sgname; 
        //VNX.GetUnity_FileSystem(device, function(ret) {     res.json(200,ret);        });
        
        //var finalResult={};
        //VNX.GetUnity_FileSystem(device,function(result) {  res.json(200,result); });

    });


    app.get('/test_backmgmt', function (req, res1) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        var config = configger.load();
        var url = '/overview/physical';
        //var url = "/polling/server?server=s3";
        var REQUIRE_URL = config.BackendMgmt.URL+url;

        async.waterfall(
            [
                function(callback){
                    backendMgmt.BackEndLogin(function(sso_token) { 
            
                        var req = unirest("GET", REQUIRE_URL );
                        
                        req.headers({ 
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO="+sso_token
                        });
                        
                        req.end(function (res) {
                            if (res.error) console.log(res.error);


                            var xmlstr = "<div>" + res.body + "</div>";
                            var options = {
                                object: true 
                            };
                            var json = xml2json.toJson(xmlstr,options);    
                            
                            var serverList = [];
                            for ( var i in json.div.div.div ) {
                                var item = json.div.div.div[i];
                                if ( item.id === undefined ) continue;

                                var serverItem = {};
                                serverItem["id"] = item.id;
                                serverItem["name"] = item.h2.a['$t'];
                                serverItem["type"] = item.h2.a["title"];
                                serverList.push(serverItem);
                            }
                             
                            callback(null,serverList);
                        });
                    });
                    
                }

            ], function (err, result) {
                  // result now equals 'done'
 
                  res1.json(200 ,result);
            });
        });



    app.get('/api/test2', function (req, res) {

        var device = '000492600255';
        var start = '2018-06-01T08:00:00.000+08:00';
        var end = '2018-06-10T08:00:00.000+08:00';
        var fename = 'FA-8F';

       // var baselinePeriod = 4;
       // var PeriodNumber = 604800 ;   // One Week;
       // var baselinePercent = 30;     // BaseLine up/down percent ; %

        var isNeedBaseLine = false ;
        async.waterfall([
            function(  callback){ 
               
    
                var param = {};
                param['device'] = device;
                param['period'] = 3600;
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
                    var restData = {};
                    restData["orgiData"] = feperf[0].matrics;
                    
                    callback(null, restData);
                });
            } , function( restData, callback ) {   
                if ( isNeedBaseLine == false ) {
                    callback(null,restData);
                } else {
                    var param = {};
                    param['device'] = device;
                    param['period'] = 3600;
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
                        restData["baselineData"]= feperf[0].matrics;
                        callback(null, restData);
                    }); 
                }
            
            } , 
            function ( data, callback ) {

                Analysis.GenerateBaseLine(data, function(result) {
                    callback(null, result);
                })
            }
        ], function (err, result) { 
    
            res.json(200, result );
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
