"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var host = require('./Host');
var GetEvents = require('./GetEvents');
var util = require('./util');
var ArrayObj = mongoose.model('Array');
var jp = require('jsonpath');
var topos= require('./topos');
var MongoDBFunc=require('./MongoDBFunction');
var moment = require('moment');

module.exports = {
    GetArrays,
    GetArraysHistory,
    GetSPs,
    getSPPerformance,
    GetBlockDevices,
    GetBlockDevicePerformance,
    GetDisks,
    GetFEPort,
    GetFEPortPerformance,
    GetBlockStorageGroup, 

    GetArraysByDatacenter,
    GetVNX_FileSystem,
    GetVNX_NFSExport,
    GetVNX_Vols,
    getNFSPerformance, 
    GetVNX_Shares,
    GetVNX_Replication,
    getReplicationPerformance
    ,GetMaskViews
    ,GetArrayTotalMemory

    ,GetBlockDevicePerformance1 
}



function GetArraysByDatacenter(datacenter, callback) {

    var device;
    GetArrays(device,function(result) {
        var filterResult = [];
        for ( var i in result ) {
            var item = result[i];
            if ( item.datacenter == datacenter ) {
                filterResult.push(item);
            }
        }
        callback(filterResult);
    });


}

/*
    Get VNX base info and capacity.

    ------------------------------------------------------
    the capacity relationship :
    "NASCapacity": "61545.0",
        "NASUsedCapacity": "61440.0",
                "NASFSPresentedCapacity": "57222.2",
                        "NASFSUsedCapacity": "33691.1",
                        "NASFSFreeCapacity": "23531.1",
                "NASPoolFreeCapacity": "3151.98",
                "NASFSOverheadCapacity": "889.997",
                "NASSnapshotCapacity": "175.781",
        "NASSystemUsedCapacity": "95.0733",
        "NASFreeCapacity": "9.91503",
        "NASUnusedCapacity": "0.0",
     ------------------------------------------------------
*/

function GetArrays(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&(source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
        } else {
            param['filter'] = '!parttype&(source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
        } 

        param['filter_name'] = '(name=\'RawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'PoolFreeCapacity\'|name=\'PoolUsableCapacity\'|name=\'PoolUsedCapacity\'|name=\'PoolOverheadCapacity\'|name=\'SystemUsedCapacity\'|name=\'UsedCapacity\'|name=\'BlockUsedCapacity\'|name=\'PrimaryUsedCapacity\'|name=\'LocalReplicaUsedCapacity\'|name=\'RemoteReplicaUsedCapacity\'|name=\'FreeCapacity\'|name=\'VirtualUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'PoolSubscribedCapacity\'|name=\'ConfiguredRawCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\')';
        param['keys'] = ['serialnb'];
        param['fields'] = ['device','devdesc','sstype','vendor','model'];
        param['period'] = 3600;
        param['start'] = util.getConfStartTime('1d');
 
 
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result) {
                        var item = param.result[i];

                        // Initialtor all of value
                        item["TotalMemory"] = 'n/a';
                        item["TotalLun"] = 0;
                        item['TotalDisk'] = 0;
                        item['TotalFEPort'] = 0; 


                        var NASCapacity = item.NASCapacity;
                        var NASUsedCapacity = Math.round(item.NASUnusedCapacity) + 
                                              Math.round(item.NASFreeCapacity) +
                                              Math.round(item.NASPoolFreeCapacity) + 
                                              Math.round(item.NASFSFreeCapacity);
                        var NASUsedPercent = NASUsedCapacity / NASCapacity * 100;  
                        if ( NASUsedPercent >= 99 ) 
                            item['UsedPercent'] = NASUsedPercent.toFixed(2);
                        else 
                            item['UsedPercent'] = NASUsedPercent.toFixed(0);


                        item.TotalMemory = Math.round(item.TotalMemory).toString();
                        item.TotalDisk = Math.round(item.TotalDisk).toString();
                        item.TotalLun = Math.round(item.TotalLun).toString();

                        item['sn'] = item.serialnb;
                        var UsefulCapacity = Math.round(NASCapacity) / 1024;

                        //item['UsefulCapacity'] = UsefulCapacity.toFixed(1);
                        item['UsefulCapacity'] = Math.round(item.ConfiguredUsableCapacity / 1024) ;
                        item['UsedPercent'] = Math.round(item.UsedCapacity / item.ConfiguredUsableCapacity * 100 );


                    } 
                    callback(null,param);
                });

                

            }, 
            // Get All Localtion Records
            function(param,  callback){  

                util.GetLocaltion(function(locations) { 
                    param['Locations']= locations;
                    callback(null,param);
                                                                 
                }); 
                    

            },
            function(param,  callback){  

                if ( param.result.length > 0 ) {

                    callback(null,param);
                } else 
                    callback(null,param);

            }, 
            function(param,  callback){ 



                // update by guozb for bypass get eventinfo;
                callback(null,param);



            },
            // get customize info
            function(param,  callback){ 

                var locations = param.Locations;
                
                MongoDBFunc.GetArrayInfo(function(result) {

                   for ( var i in param.result ) {      
                        var item = param.result[i];


                        item['info'] = {}; 
                        var arraysn = item.device;
                        console.log("Begin get array info : " + arraysn);
                        for ( var j in result ) {
                            var infoItem = result[j]; 
                            if ( infoItem.basicInfo.device == arraysn ) { 
                                var unitID = infoItem.basicInfo.UnitID; 
                                for ( var z in locations ) { 
                                    if ( unitID == locations[z].UnitID ) {
                                        console.log(locations[z].Location);
                                        item['localtion'] = locations[z].Location;
                                        item['datacenter'] = locations[z].datacenter;
                                        break;
                                    }
                                }
                                item['info'] = infoItem; 
                            }
                        } 
                    }


                 callback(null,param);
    
             });

            } ,
            // GET Total Memory
            function(param,  callback){ 

                GetArrayTotalMemory(device,function(result) {
                       for ( var i in param.result ) {      
                            var item = param.result[i]; 
                            item['TotalMemory'] = 'n/a';
                            for ( var j in result ) {
                                var memItem = result[j];
                                if ( memItem.serialnb == item.serialnb ) {
                                    item["TotalMemory"] = memItem.TotalMemory;
                                }
                            }
                             
                        }
                     callback(null,param);


                })


            }  ,

            // Get Total number of devices(lun)
            function(param,  callback){ 

                GetBlockDevices(device,function(result) {
                   for ( var i in result ) {      
                        var item = result[i]; 
                        for ( var j in param.result ) {
                            var subItem = param.result[j];
                            if ( subItem.serialnb == item.serialnb ) {
                                subItem["TotalLun"]++;
                            }
                        }
                         
                    }
                     callback(null,param);


                })


            }  ,

            // Get Total number of Front-End Ports
            function(param,  callback){ 

                GetDisks(device,function(result) {
                   for ( var i in result ) {      
                        var item = result[i]; 
                        for ( var j in param.result ) {
                            var subItem = param.result[j];
                            if ( subItem.serialnb == item.serialnb ) {
                                subItem["TotalDisk"]++;
                            }
                        }
                         
                    }
                     callback(null,param);


                })


            }   ,
            function(param,  callback){ 

                GetFEPort(device,function(result) {
                   for ( var i in result ) {      
                        var item = result[i]; 
                        for ( var j in param.result ) {
                            var subItem = param.result[j];
                            if ( subItem.serialnb == item.serialnb ) {
                                subItem["TotalFEPort"]++;
                            }
                        }
                         
                    }
                     callback(null,param);


                })


            }          
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result.result);
        });

    };


    
    function GetArraysHistory(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&sstype==\'Unified\'';
        } else {
            param['filter'] = '!parttype&sstype==\'Unified\'';
        } 

        param['filter_name'] = '(name=\'RawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'PoolFreeCapacity\'|name=\'PoolUsableCapacity\'|name=\'PoolUsedCapacity\'|name=\'PoolOverheadCapacity\'|name=\'SystemUsedCapacity\'|name=\'UsedCapacity\'|name=\'BlockUsedCapacity\'|name=\'PrimaryUsedCapacity\'|name=\'LocalReplicaUsedCapacity\'|name=\'RemoteReplicaUsedCapacity\'|name=\'FreeCapacity\'|name=\'VirtualUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'PoolSubscribedCapacity\'|name=\'ConfiguredRawCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\')';
        param['keys'] = ['serialnb'];
        param['fields'] = ['device','devdesc','sstype','vendor','model'];

        param['period'] = 604800;
        var priodDateByMonth = util.getLastMonth();
        var PriodDateByYear = util.getLastYear();
    
        var finalResult = {};
        finalResult["PeriousMonth"] = [];
        finalResult["PeriousYear"] = [];
        
        async.waterfall([
            function(callback) { 
    
                // Get History Data by Last Month;
                
                param['start'] = priodDateByMonth.firstDay;
                param['end'] = priodDateByMonth.lastDay;
    
    
    
                CallGet.CallGet(param, function(param) {

                    for ( var i in param.result) {
                        var item = param.result[i];

                        // Initialtor all of value
                        item["TotalMemory"] = 'n/a';
                        item["TotalLun"] = 0;
                        item['TotalDisk'] = 0;
                        item['TotalFEPort'] = 0; 


                        var NASCapacity = item.NASCapacity;
                        var NASUsedCapacity = Math.round(item.NASUnusedCapacity) + 
                                              Math.round(item.NASFreeCapacity) +
                                              Math.round(item.NASPoolFreeCapacity) + 
                                              Math.round(item.NASFSFreeCapacity);
                        var NASUsedPercent = NASUsedCapacity / NASCapacity * 100;  
                        if ( NASUsedPercent >= 99 ) 
                            item['UsedPercent'] = NASUsedPercent.toFixed(2);
                        else 
                            item['UsedPercent'] = NASUsedPercent.toFixed(0);


                        item.TotalMemory = Math.round(item.TotalMemory).toString();
                        item.TotalDisk = Math.round(item.TotalDisk).toString();
                        item.TotalLun = Math.round(item.TotalLun).toString();

                        item['sn'] = item.serialnb;
                        var UsefulCapacity = Math.round(NASCapacity) / 1024;

                        //item['UsefulCapacity'] = UsefulCapacity.toFixed(1);
                        item['UsefulCapacity'] = Math.round(item.ConfiguredUsableCapacity / 1024) ;
                        item['UsedPercent'] = Math.round(item.UsedCapacity / item.ConfiguredUsableCapacity * 100 );

                        finalResult["PeriousMonth"].push(item);
                    } 

                    callback(null,finalResult);
                });
    
                
    
            },
    
            function(arg, callback) { 
    
                // Get History Data by Last Year;
                
                param['start'] = PriodDateByYear.firstDay;
                param['end'] = PriodDateByYear.lastDay;
    
    
    
                CallGet.CallGet(param, function(param) {

                    for ( var i in param.result) {
                        var item = param.result[i];

                        // Initialtor all of value
                        item["TotalMemory"] = 'n/a';
                        item["TotalLun"] = 0;
                        item['TotalDisk'] = 0;
                        item['TotalFEPort'] = 0; 


                        var NASCapacity = item.NASCapacity;
                        var NASUsedCapacity = Math.round(item.NASUnusedCapacity) + 
                                              Math.round(item.NASFreeCapacity) +
                                              Math.round(item.NASPoolFreeCapacity) + 
                                              Math.round(item.NASFSFreeCapacity);
                        var NASUsedPercent = NASUsedCapacity / NASCapacity * 100;  
                        if ( NASUsedPercent >= 99 ) 
                            item['UsedPercent'] = NASUsedPercent.toFixed(2);
                        else 
                            item['UsedPercent'] = NASUsedPercent.toFixed(0);


                        item.TotalMemory = Math.round(item.TotalMemory).toString();
                        item.TotalDisk = Math.round(item.TotalDisk).toString();
                        item.TotalLun = Math.round(item.TotalLun).toString();

                        item['sn'] = item.serialnb;
                        var UsefulCapacity = Math.round(NASCapacity) / 1024;

                        //item['UsefulCapacity'] = UsefulCapacity.toFixed(1);
                        item['UsefulCapacity'] = Math.round(item.ConfiguredUsableCapacity / 1024) ;
                        item['UsedPercent'] = Math.round(item.UsedCapacity / item.ConfiguredUsableCapacity * 100 );
 
                        arg["PeriousYear"].push(item);
                    } 

 
                    callback(null,arg);
                });
    
                
    
            }
        ], function (err, result) {
    
           // result now equals 'done'
           callback(result);
        });
    
    };

function GetArrayTotalMemory(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&datagrp==\'VNXBlock-Array\'&parttype=\'Memory\'';
        } else {
            param['filter'] = 'datagrp==\'VNXBlock-Array\'&parttype=\'Memory\'';
        } 

        param['filter_name'] = '(name=\'TotalMemory\')';
   
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['device','devdesc','sstype','vendor','model'];
        param['period'] = 3600;
        param['type'] = 'last';
 
        var finalResult = [];
        var totalMemory = 0;
        async.waterfall([
            function(callback){ 
                
                CallGet.CallGetPerformance(param, function(param) {
                    var ret = [];
                    for ( var i in param ) {
                        var item = param[i];

                        var isfind = false;
                        for ( var j in ret ) {
                            var retItem = ret[j];
                            if ( retItem.serialnb == item.serialnb ) {
                                retItem.TotalMemory += item.matricsStat.TotalMemory.max;
                                isfind = true;
                            }
                        }
                        if ( isfind == false) {
                            var retItem = {};
                            retItem["serialnb"] = item.serialnb;
                            retItem["TotalMemory"] = item.matricsStat.TotalMemory.max;
                            ret.push(retItem);
                        }

                        

                    }
                    callback(null,ret);
                }); 
                /*
                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result) {
                        var item = param.result[i];
                        var isFind = false;
                        for ( var j in finalResult ) {
                            var resItem = finalResult[j];
                            if ( resItem.serialnb = item.serialnb ) {
                                resItem["TotalMemory"] += parseInt(item.TotalMemory);
                                isFind = true;
                            }
                        }

                        if ( isFind == false ) {
                            var resItem = {};
                            resItem["serialnb"] = item.serialnb;
                            resItem["TotalMemory"] = parseInt(item.TotalMemory);
                            finalResult.push(resItem);
                        }

                    } 
 
                    callback(null,finalResult);
                });
                */
                

            }       
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

    };


function GetBlockDevices(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'serialnb=\''+arraysn+'\'&source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
        } else {
            param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
        } 

        param['filter_name'] = '(name=\'CurrentUtilization\'|name=\'ServiceTime\'|name=\'ResponseTime\'|name=\'TotalThroughput\'|name=\'Capacity\'|name=\'TotalBandwidth\'|name=\'UsedCapacity\')';
   
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['device','uid','partdesc','parttype','dgraid','purpose','dgstype','dgname','dgtype','sgname', 'disktype','capval','csupoltp','datatype'];
        param['period'] = 86400;
        //param['type'] = 'max';
        param['valuetype'] = 'MAX';
 
        var finalResult = []; 
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    callback(null,param.result);
                });

                

            }       
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

    };



function GetSPs(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'serialnb=\''+arraysn+'\'&source=\'VNXBlock-Collector\'&parttype==\'Controller\'&!vstatus==\'inactive\'';
        } else {
            param['filter'] = 'source=\'VNXBlock-Collector\'&parttype==\'Controller\'&!vstatus==\'inactive\'';
        } 

        param['filter_name'] = '(name=\'TotalMemory\'|name=\'TotalThroughput\'|name=\'TotalBandwidth\'|name=\'ResponseTime\'|name=\'CurrentUtilization\')';
   
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['device','ip','partvrs']; 
        param['start'] = util.getConfStartTime('1d');
        param['period'] = 3600;

        var finalResult = [];
        var totalMemory = 0;
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    callback(null,param.result);
                });

                

            }       
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

    };

 
function GetDisks(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&source=\'VNXBlock-Collector\'&parttype==\'Disk\'';
        } else {
            param['filter'] = 'source=\'VNXBlock-Collector\'&parttype==\'Disk\'';
        } 

        param['filter_name'] = '(name=\'Capacity\'|name=\'UsedCapacity\')';
   
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['device','disktype','diskrpm','disksize','model'];
        param['period'] = 86400;
 
        var finalResult = [];
        var totalMemory = 0;
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    callback(null,param.result);
                });

                

            }       
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

    };


function GetFEPort(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'serialnb=\''+arraysn+'\'&source=\'VNXBlock-Collector\'&parttype==\'Port\'';
        } else {
            param['filter'] = 'source=\'VNXBlock-Collector\'&parttype==\'Port\'';
        } 

        param['filter_name'] = '(name=\'LinkStatus\'|name=\'LoggedInInitiators\'|name=\'RegisteredInitiators\'|name=\'TotalBandwidth\'|name=\'TotalThroughput\')';
   
        param['keys'] = ['serialnb','feport'];
        param['fields'] = ['device','porttype','conntype','portwwn','memberof','partdesc','partsn'];
        param['period'] = 86400;
         param['valuetype'] = 'MAX';
 
        var finalResult = [];
        var totalMemory = 0;
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    callback(null,param.result);
                });

                

            }              
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

    };

function GetBlockStorageGroup(device, sgname,  callback) {
 
 
        var finalResult = []; 
        async.waterfall([
            function(callback){ 
                GetBlockDevices(device, function(result) {
                    callback(null,result);
                });

            }, 
             function(arg1, callback){ 
                 if ( sgname === undefined ) {
                    callback(null,arg1);
                 } else {
                    var subResult = []
                    for ( var i in arg1) {
                        var lunItem = arg1[i];

                        if ( lunItem.sgname == sgname ) 
                            subResult.push(lunItem);
                    }

                    callback(null,subResult);
                 }
             },

            function(arg1, callback){ 

                for ( var i in arg1 ) {
                    var lunItem = arg1[i];

                    var isfind = false;
                    for ( var j in finalResult ) {
                        var sgItem = finalResult[j];

                        if ( lunItem.sgname == sgItem.sgname ) {
                            isfind = true;
                            sgItem.devices.push(lunItem);
                            sgItem["disktype"] = lunItem.disktype;
                            sgItem["NumOfLuns"]++;
                            sgItem["Capacity"] += lunItem.Capacity;
                            sgItem["UsedCapacity"] += lunItem.UsedCapacity;
                            sgItem["TotalThroughput"] += lunItem.TotalThroughput;
                            sgItem["TotalBandwidth"] += lunItem.TotalBandwidth;

                            if ( sgItem.MaxResponseTime < lunItem.ResponseTime )
                                sgItem["MaxResponseTime"] += lunItem.ResponseTime;

                            if ( sgItem.MaxServiceTime < lunItem.ServiceTime )
                                sgItem["MaxServiceTime"] += lunItem.ServiceTime;

                            if ( sgItem.MaxUtilization < lunItem.Utilization )
                                sgItem["MaxUtilization"] += lunItem.Utilization;

                            break;
                        }



                    }

                     if ( isfind == false ) {
                        var sgItem = {};
                        sgItem["sgname"] = lunItem.sgname;
                        sgItem["disktype"] = lunItem.disktype;
                        sgItem["NumOfLuns"] = 1;
                        sgItem["Capacity"] = lunItem.Capacity;
                        sgItem["UsedCapacity"] = lunItem.UsedCapacity;
                        sgItem["TotalThroughput"] = lunItem.TotalThroughput;
                        sgItem["TotalBandwidth"] = lunItem.TotalBandwidth;
 
                        sgItem["MaxResponseTime"] = lunItem.ResponseTime; 
                        sgItem["MaxServiceTime"] = lunItem.ServiceTime;
                        sgItem["MaxUnilization"] = lunItem.CurrentUtilization;

                        sgItem["devices"] = [];
                        sgItem.devices.push(lunItem);
                        finalResult.push(sgItem);
                    }     
                    

                }
                
                callback(null,finalResult);

            }         
       

        ], function (err, result) {

           callback(result);
        });

    };

 

function GetMaskViews(callback) { 

        var config = configger.load(); 


           
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
                        viewItem["portgrp"] = item.TARGET.split(':')[3];
                        viewItem["part"] = item.MVName;
                        viewItem["device"] = item.MV.split(':')[2];
                        var initgrp_member = [];
                        initgrp_member.push( item.INIT.split(':')[2] );

 

                        var portgrp_member = [];
                        var portgrp_member_item={}; 
                        portgrp_member_item["device"] = item.TARGET_ID.split(':')[2];
                        portgrp_member_item["feport"] = (item.TARGET_ID.split(':')[3]).replace("~20"," ")+":"+item.TARGET_ID.split(':')[4];
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

    
                var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#> ";
                queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
                queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";
                queryString = queryString + " SELECT distinct ?SGID ?SGName ?VOL ";
                queryString = queryString + " WHERE {  ";
                queryString = queryString + "     ?SG rdf:type srm:StorageVolumeGroup .   "; 
                queryString = queryString + "     ?SG srm:displayName ?SGName  .  ";            
                queryString = queryString + "     ?SG srm:containsStorageVolume ?VOL  .  "; 
                queryString = queryString + "     ?SG srm:Identifier ?SGID  .  "; 
             
                queryString = queryString + "  }  ";
     
                topos.querySparql(queryString, function(result) {
                    
                    var result1 = {};
                    for ( var i in result ) {
                        var item = result[i];
                        var device = item.SGID.split(':')[2];
                        var vol = item.VOL.split(':')[3];
                        var SGName = item.SGName;
 
                        if ( result1[device] === undefined ) result1[device] = {};
                        if ( result1[device][SGName] === undefined ) result1[device][SGName] = [];

                        var sgItem = {};
                        sgItem["device"] = device;
                        sgItem["part"] = vol;
                        sgItem["sgname"] = SGName;

                        result1[device][SGName].push(sgItem);

                    }
                    for ( var i in arg ) {
                        var item = arg[i];

                        if ( result1[item.device][item.sgname] !== undefined ) 
                            item["sg_member"] = result1[item.device][item.sgname];
                        else 
                            item["sg_member"] = [];
                        
                        //console.log(viewItem);
                    }
                    callback(null,arg);
                })
    
            }, 
            // Merge the records when sgname, initgrp is same
            function(arg, callback) {

                var finalRecord=[];
                var searchIndex=[];
                for ( var i in arg ) {
                    var item = arg[i];
                    var haveSearched = false
                    for ( var sd in searchIndex ) {
                        if ( i== searchIndex[sd] ) {
                            haveSearched = true;
                            break;
                        }
                    }
                    if ( haveSearched == true ) continue;
 
                    for ( var j in arg ) {
                        if ( i== j ) continue;
                        var searchItem = arg[j];
                        var isFind1 = false;
                        if (( item.sgname == searchItem.sgname ) && 
                            ( item.initgrp == searchItem.initgrp ) && 
                            ( item.device == searchItem.device ) ) {
                                
                                isFind1 = true;
                                searchIndex.push(j);
                                var resultItem = {};
                                var isFind = false;
                                for ( var z in finalRecord ) {
                                    var resultItem1 = finalRecord[z];
                                    if (( item.sgname == resultItem1.sgname ) && 
                                        ( item.initgrp == resultItem1.initgrp ) && 
                                        ( item.device == resultItem1.device ) ) {
                                            resultItem = resultItem1
                                            isFind = true;
                                            break;
                                        }
                                }

                                if ( isFind == false ) resultItem = {};
 
                                resultItem["sgname"] = item.sgname;
                                resultItem["initgrp"] = item.initgrp;
                                resultItem["portgrp"] = item.portgrp+"|"+searchItem.portgrp;

                                resultItem["part"] = item.part;
                                resultItem["device"] = item.device;
                                resultItem["initgrp_member"] = item.initgrp_member;
                                resultItem["portgrp_member"] = [] 
                                resultItem.portgrp_member = resultItem.portgrp_member.concat(item.portgrp_member);
                                resultItem.portgrp_member = resultItem.portgrp_member.concat(searchItem.portgrp_member);
                                resultItem["sg_member"] = item.sg_member;
 
                                
                                if ( isFind == false ) finalRecord.push(resultItem);

                            } 
                    }
                    if ( isFind1 == false ) finalRecord.push(item);
                }
                callback(null,finalRecord);
            }
        ], function (err, result) {
        
            // result now equals 'done'
            callback(result);
         });
    


};

function GetVNX_NFSExport(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&datagrp==\'VNXFile-NfsExport\'';
        } else {
            param['filter'] = 'datagrp==\'VNXFile-NfsExport\'';
        } 

        param['filter_name'] = 'name=\'Identifier\'';
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['device','datatype','clients','fsid','parttype','protocol','vols'];
        param['start'] = util.getConfStartTime('1d');
        param['period'] = 3600;

       CallGet.CallGet(param, function(param) { 
            var result = param.result;

            callback(result);
       });

 

    };

function GetVNX_Shares(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&source==\'VNXFile-Collector\'&(parttype==\'NfsExport\'|parttype==\'CifsShare\')';
        } else {
            param['filter'] = 'source==\'VNXFile-Collector\'&(parttype==\'NfsExport\'|parttype==\'CifsShare\')';
        } 

        param['filter_name'] = 'name=\'Identifier\'';
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['device','datatype','clients','cifsserv','fsid','parttype','protocol'];
        param['period'] = 3600;
        param['start'] = util.getConfStartTime('1d');

       CallGet.CallGet(param, function(param) { 
            var result = param.result;

            callback(result);
       });


}


function GetVNX_Vols(device, callback) {

        var config = configger.load();
        //var start = '2016-06-20T18:30:00+08:00'
        //var end = '2016-07-01T18:30:00+08:00'
        var start = util.getPerfStartTime();
        var end = util.getPerfEndTime();
        if  ( typeof device === 'undefined') 
            var filterbase = 'source=\'VNXFile-Collector\'&parttype=\'Volume\'';
        else 
            var filterbase = 'device=\''+device+'\'&source==\'VNXFile-Collector\'&parttype=\'Volume\'';

        var param = {};

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name=\'ReadBandwidth\'|name=\'WriteBandwidth\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
                var fields = 'device,name,part';
                var keys = ['serialnb,part'];

                param['filter'] = filterbase + '&(name=\'ReadBandwidth\'|name=\'WriteBandwidth\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')'; 
                param['keys'] = ['serialnb','part'];
                param['fields'] = ['device','name','part'];
        
                CallGet.CallGet(param, function(param) { 
                    var result = param.result;
        
                    callback(result);
               });
 
     
            },
            function(arg1,  callback){ 
                
                var result = [];
                var oriArray = JSON.parse(arg1).values;
                for ( var i in oriArray) {
                    var item = oriArray[i].properties;
                    item['matrics'] = [];
                    var matrics = oriArray[i].points;
                    var matrics_max = util.GetMaxValue(matrics);
                    var matrics_avg = util.GetAvgValue(matrics);


                    var matricsItem = {};
                    matricsItem[item.name] = matrics;
                    matricsItem['max']= matrics_max;
                    matricsItem['avg'] = matrics_avg;
 

                    item['start'] = start;
                    item['end'] = end;
                    var isFind = false;
                    for ( var j in result ) {
                        var resItem = result[j];
                        if ( resItem.device == item.device && resItem.part == item.part ) {
                     

                            resItem[item.name] = matrics_max;
                            
                            isFind = true;
                        } 
                    }
                    if ( !isFind ) {   
                        item[item.name] = matrics_max;
                        delete item['name'];

                        result.push(item);                  

                    }


                } 
                //var ret = arg1.values; 
               callback(null,result);


            }

        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           // var r = JSON.parse(result);
           callback(result);
        });


 

         
    };
 


function GetVNX_FileSystem(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&source==\'VNXFile-Collector\'&parttype==\'FileSystem\'&internal==\'false\'';
        } else {
            param['filter'] = 'source==\'VNXFile-Collector\'&parttype==\'FileSystem\'&internal==\'false\'';
        } 

        param['filter_name'] = '(name=\'FilesTotal\'|name=\'FilesUsed\'|name=\'Capacity\'|name=\'UsedCapacity\'|name=\'PresentedCapacity\'|name=\'OverheadCapacity\'|name=\'FreeCapacity\'|name=\'CurrentUtilization\')';
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['device','type','vols','mtperm','mtpath','fsname','dgstype','movernam','fsid'];

        param['period'] = 3600;
        param['start'] = util.getConfStartTime('1d');

        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    var result = param.result;
                    callback(null,result);
                });
            }, 
            // Get Share Info
            function(param,  callback){  
                    GetVNX_Shares(device, function( result ) {

                        for ( var i in param) {
                            var item = param[i];
                            for ( var j in result ) {
                                var shareItem = result[j];
                                if ( shareItem.device == item.device && shareItem.fsid == item.fsid ) {
                                    item["protocol"] = shareItem.protocol;
                                    item["clients"] = shareItem.clients;
                                    if ( shareItem.clients !== undefined ) {
                                        item["NumberOfExport"] = (shareItem.clients.match(/,/g) ||[]).length + 1;
                                    } else {
                                        item["NumberOfExport"] = "N/A";
                                    }
                                    item["sharetype"] = shareItem.parttype;
                                    item["datatype"] = shareItem.datatype;
                                    item["cifsserv"] = shareItem.cifsserv;
                                }
                            }
                        }

                        callback(null,param);

                    });
            },
            // Get FileSystem Performance Data
            function(param,  callback){  
                    GetVNX_Vols(device, function( result ) {

                         for ( var i in param ) {
                            var item = param[i];

                            for ( var j in result ) {
                                var perfItem = result[j];

                                if ( item.device == perfItem.device && item.vols == perfItem.part ) {
 
                                    item['Throughput'] = Math.round(perfItem.ReadThroughput) + Math.round(perfItem.WriteThroughput);
                                    item['Bandwidth'] = Math.round(perfItem.ReadBandwidth) + Math.round(perfItem.WriteBandwidth);
                                    
                                    item['PerfStart']= perfItem.start;
                                    item['PerfEnd'] = perfItem.end;
                                }
                            }
                         }

                         callback(null,param);
                    })
                   
                                               

            }    
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

    };


function GetVNX_Replication(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&source==\'VNXFile-Collector\'&parttype==\'Replication\'&!vstatus==\'inactive\'';
        } else {
            param['filter'] = 'datagrp&source==\'VNXFile-Collector\'&parttype==\'Replication\'&!vstatus==\'inactive\'';
        } 

        param['filter_name'] = '(name=\'LastSyncTime\'|name=\'ReadThroughput\'|name=\'SourceStatus\'|name=\'SyncLag\'|name=\'Throughput\'|name=\'OverheadCapacity\'|name=\'WriteThroughput\'|name=\'Availability\'|name=\'DestinationStatus\')';
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['serialnb','part','dstintfc','srcmover','srcintfc','dstmover','pdevice','partid'];
        param['period'] = 3600;

        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    
                    var result = param.result;
                    callback(null,result);
                });

                

            } ,
            function(arg1, callback){ 

                for ( var i in arg1 ) {
                    var item = arg1[i];
                    //var LastSyncTimeDT = CallGet.formatDate(new Date(item.LastSyncTime * 1000));
                    //var LastSyncTimeDT = new Date(item.LastSyncTime * 1000);
                    var LastSyncTimeDT = moment.unix(item.LastSyncTime).format("MM/DD/YYYY HH:mm:ss");
                    item.LastSyncTime = LastSyncTimeDT;
                }
                callback(null,arg1);
            }

        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

    };

function getReplicationPerformance(device, part, start, end,  callback) {
 
 
        var config = configger.load();
 
        if ( part !== undefined )
            var filterbase = 'device==\''+device+'\'&parttype==\'Replication\'&source=\'VNXFile-Collector\'&part=\''+part+'\'';
        else 
            var filterbase = 'device==\''+device+'\'&parttype==\'Replication\'&source=\'VNXFile-Collector\'';

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name=\'LastSyncTime\'|name=\'ReadThroughput\'|name=\'SourceStatus\'|name=\'SyncLag\'|name=\'Throughput\'|name=\'OverheadCapacity\'|name=\'WriteThroughput\'|name=\'Availability\'|name=\'DestinationStatus\')';

                var fields = 'device,name,part';
                var keys = ['device,part'];
 
                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

console.log(queryString);

                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query(queryString) 
                        .end(function (response) { 
                            if ( response.error ) {
                                console.log(response.error);
                                return response.error;
                            } else {  
                                //console.log(response.raw_body);   
                                var resultRecord = response.raw_body;
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(arg1,  callback){ 
                var result = [];
                var oriArray = JSON.parse(arg1).values;
                for ( var i in oriArray) {
                    var item = oriArray[i].properties;
                    item['matrics'] = [];
                    var matrics = oriArray[i].points;
                    var matrics_max = util.GetMaxValue(matrics);
                    var matrics_avg = util.GetAvgValue(matrics);


                    var matricsItem = {};
                    matricsItem[item.name] = matrics;
                    matricsItem['max']= matrics_max;
                    matricsItem['avg'] = matrics_avg;


                    var isFind = false;
                    for ( var j in result ) {
                        var resItem = result[j];
                        if ( resItem.device == item.device && resItem.part == item.part ) {
 

                            resItem.matrics.push(matricsItem)
                            isFind = true;
                        } 
                    }
                    if ( !isFind ) {  
                        item['matrics'].push(matricsItem);
                        delete item['name'];

                        result.push(item);                  

                    }


                }

                var result1 = util.convertPerformanceStruct(result); 

               callback(null,result1);


            },
            function(data,  callback){  
                
                var finalResult = {};
                finalResult['charts'] = [];
 
                if ( data.length > 0 ) {

                     var matrics = data[0].matrics;
                    var result = {};
                    result['category'] = 'SyncLag';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['SyncLag'] = item.SyncLag;  

                        result.chartData.push(chartDataItem);
                        
                    }

                    finalResult.charts.push(result);

                    var result = {};
                    result['category'] = 'Throughput (IOPS)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['ReadThroughput'] = item.ReadThroughput;
                        chartDataItem['WriteThroughput'] = item.WriteThroughput;

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result); 

                    callback(null,finalResult);
               }

               else callback(null,{});
            }
        ], function (err, result) { 
           callback(result);
        });


 

         
    };


function getNFSPerformance(device, part, start, end,  callback) {
 
 
        var config = configger.load();
 

        var filterbase = 'device==\''+device+'\'&parttype==\'Volume\'&source=\'VNXFile-Collector\'&part=\''+part+'\'';

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name=\'ReadThroughput\'|name=\'WriteThroughput\'|name=\'ReadBandwidth\'|name=\'WriteBandwidth\')';

                var fields = 'device,name,part';
                var keys = ['device,part'];



                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

console.log(queryString);

                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query(queryString) 
                        .end(function (response) { 
                            if ( response.error ) {
                                console.log(response.error);
                                return response.error;
                            } else {  
                                //console.log(response.raw_body);   
                                var resultRecord = response.raw_body;
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(arg1,  callback){ 

                var result = [];
                var oriArray = JSON.parse(arg1).values;
                for ( var i in oriArray) { 
                    var item = oriArray[i].properties; 
                    item['matrics'] = [];
                    var matrics = oriArray[i].points;
                    var matrics_max = util.GetMaxValue(matrics);
                    var matrics_avg = util.GetAvgValue(matrics);


                    var matricsItem = {};
                    matricsItem[item.name] = matrics;
                    matricsItem['max']= matrics_max;
                    matricsItem['avg'] = matrics_avg;


                    var isFind = false;
                    for ( var j in result ) {
                        var resItem = result[j];
                        if ( resItem.device == item.device && resItem.part == item.part ) {
 

                            resItem.matrics.push(matricsItem)
                            isFind = true;
                        } 
                    }
                    if ( !isFind ) {  
                        item['matrics'].push(matricsItem);
                        delete item['name'];

                        result.push(item);                  

                    }


                }

                var result1 = util.convertPerformanceStruct(result); 
                //var ret = arg1.values; 
               callback(null,result1);


            },
            function(data,  callback){ 

                var finalResult = {};
                finalResult['charts'] = [];
 
                if ( data.length > 0 ) {

                     var matrics = data[0].matrics;
                    var result = {};
                    result['category'] = 'Bandwidth (MBPS)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['ReadBandwidth'] = item.ReadBandwidth; 
                        chartDataItem['WriteBandwidth'] = item.WriteBandwidth; 

                        result.chartData.push(chartDataItem);
                        
                    }

                    finalResult.charts.push(result);

                    var result = {};
                    result['category'] = 'Throughput (IOPS)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['ReadThroughput'] = item.ReadThroughput;
                        chartDataItem['WriteThroughput'] = item.WriteThroughput;

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result); 

                    callback(null,finalResult);
               }

               else callback(null,{});
            }
        ], function (err, result) { 
           callback(result);
        });


 

         
    };


function getSPPerformance(device, part, start, end,  callback) {
 
        
 
        var config = configger.load();
 

    
        async.waterfall([
            function(callback){ 

                        if ( part !== undefined )
                            var filterbase = 'serialnb=\''+device+'\'&part=\''+part+'\'&source=\'VNXBlock-Collector\'&parttype==\'Controller\'&!vstatus==\'inactive\'';
                        else if ( device !== undefined ) 
                            var filterbase = 'serialnb=\''+device+'\'&source=\'VNXBlock-Collector\'&parttype==\'Controller\'&!vstatus==\'inactive\'';
                        else 
                            var filterbase = 'source=\'VNXBlock-Collector\'&parttype==\'Controller\'&!vstatus==\'inactive\'';
                        
                        if ( start === undefined ) var start = util.getPerfStartTime();
                        if ( end   === undefined ) var end = util.getPerfEndTime();


                        var param = {};
                        //param['device'] = device;
                        param['period'] = '3600';
                        param['start'] = start;
                        param['type'] = 'max';

                        param['keys'] = ['serialnb,part']; 
                        param['fields'] = ['serialnb','device','part','name'];   
                        param['filter'] = filterbase;
                        param['filter_name'] = '(name=\'WriteThroughput\'|name=\'ReadThroughput\'|name=\'TotalThroughput\'|name=\'TotalBandwidth\'|name=\'ResponseTime\'|name=\'CurrentUtilization\')';
                           
        
                        CallGet.CallGetPerformance(param, function(param) {  
                            callback(null, param ); 
                        });
     
            }
            
        ], function (err, result) { 
           callback(result);
        });


 

         
    };

function GetBlockDevicePerformance(device, uid, start, end,  callback) {


        var config = configger.load();


        var lun = uid.toString(); 
 
        if ( lun.indexOf(",") > -1 ) {
            var lunArray = lun.split(',');
        } else {
             var lunArray = [];
             lunArray.push(lun);
        }
 
        var lunFilter = '';
        for ( var i in lunArray ) {
            var item = lunArray[i];
            if ( lunFilter == '' ) {
                lunFilter = 'uid==\''+item+'\'';
            } else {
                lunFilter = lunFilter +'|uid==\''+item+'\'';
            }
        }
        lunFilter = '(' + lunFilter + ')';


        var filterbase = 'serialnb=\''+device+'\'&'+lunFilter+'&source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')&!vstatus==\'inactive\'';
    
        async.waterfall([
            function(callback){ 

                var filter = filterbase + '&(name=\'CurrentUtilization\'|name=\'ServiceTime\'|name=\'ResponseTime\'|name=\'TotalThroughput\'|name=\'ReadThroughput\'|name=\'WriteThroughput\'|name=\'TotalBandwidth\')';
   
                var fields = 'serialnb,part,name';
                var keys = ['serialnb,part'];
 
                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

console.log(queryString);

                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query(queryString) 
                        .end(function (response) { 
                            if ( response.error ) {
                                console.log(response.error);
                                return response.error;
                            } else {  
                                //console.log(response.raw_body);   
                                var resultRecord = response.raw_body;
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(data,  callback){  
                
                var finalResult = {};
                finalResult['charts'] = util.convertPerfFormat(data);
                callback(null,finalResult);

            }
        ], function (err, result) { 
           callback(result);
        });


 

         
    };

function GetBlockDevicePerformance1(device, uid, start, end,  callback) {


        var config = configger.load(); 

        var lun = uid.toString(); 
 
        if ( lun.indexOf(",") > -1 ) {
            var lunArray = lun.split(',');
        } else {
             var lunArray = [];
             lunArray.push(lun);
        }
 
        var lunFilter = '';
        for ( var i in lunArray ) {
            var item = lunArray[i];
            if ( lunFilter == '' ) {
                lunFilter = 'uid==\''+item+'\'';
            } else {
                lunFilter = lunFilter +'|uid==\''+item+'\'';
            }
        }
        lunFilter = '(' + lunFilter + ')';


        var filterbase = 'serialnb=\''+device+'\'&'+lunFilter+'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
    
        async.waterfall([
            function(callback){ 

                var filter = filterbase + '&(name=\'CurrentUtilization\'|name=\'ServiceTime\'|name=\'ResponseTime\'|name=\'TotalThroughput\'|name=\'ReadThroughput\'|name=\'WriteThroughput\'|name=\'TotalBandwidth\')';
   
                var fields = 'serialnb,part,name';
                var keys = ['serialnb,part'];
 
                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

console.log(queryString);

                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query(queryString) 
                        .end(function (response) { 
                            if ( response.error ) {
                                console.log(response.error);
                                return response.error;
                            } else {  
                                //console.log(response.raw_body);   
                                var resultRecord = response.raw_body;
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(arg1, callback) {
                var result = util.convertPerfFormat(arg1);
                callback(null,result);
            } 
        ], function (err, result) { 
           callback(result);
        });


 

         
    };


function GetFEPortPerformance(device, portwwn, start, end,  callback) {


        var config = configger.load();

        var filterbase = 'serialnb=\''+device+'\'&portwwn=\''+portwwn+'\'&source=\'VNXBlock-Collector\'&parttype==\'Port\'&!vstatus==\'inactive\'';
    
        async.waterfall([
            function(callback){ 

                var filter = filterbase + '&(name=\'TotalBandwidth\'|name=\'TotalThroughput\')';
   
                var fields = 'serialnb,part,name';
                var keys = ['serialnb,part'];
 
                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

console.log(queryString);

                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query(queryString) 
                        .end(function (response) { 
                            if ( response.error ) {
                                console.log(response.error);
                                return response.error;
                            } else {  
                                //console.log(response.raw_body);   
                                var resultRecord = response.raw_body;
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(arg1,  callback){ 
                var result = [];
                var oriArray = JSON.parse(arg1).values;
                for ( var i in oriArray) {
                    var item = oriArray[i].properties;
                    item['matrics'] = [];
                    var matrics = oriArray[i].points;
                    var matrics_max = util.GetMaxValue(matrics);
                    var matrics_avg = util.GetAvgValue(matrics);


                    var matricsItem = {};
                    matricsItem[item.name] = matrics;
                    matricsItem['max']= matrics_max;
                    matricsItem['avg'] = matrics_avg;


                    var isFind = false;
                    for ( var j in result ) {
                        var resItem = result[j];
                        if ( resItem.device == item.device && resItem.part == item.part ) {
 

                            resItem.matrics.push(matricsItem)
                            isFind = true;
                        } 
                    }
                    if ( !isFind ) {  
                        item['matrics'].push(matricsItem);
                        delete item['name'];

                        result.push(item);                  

                    }


                }

                var result1 = util.convertPerformanceStruct(result); 

               callback(null,result1);


            },
            function(data,  callback){  
                
                var finalResult = {};
                finalResult['charts'] = [];
 
                if ( data.length > 0 ) {

                     var matrics = data[0].matrics;


                                                
                    // -------------------------------------------------------------------- 
                    var result = {};
                    result['category'] = 'Bandwidth (MBPS)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        if ( item.TotalBandwidth === undefined )
                            chartDataItem['TotalBandwidth'] = 0;
                        else 
                            chartDataItem['TotalBandwidth'] = item.TotalBandwidth;  

                        result.chartData.push(chartDataItem);
                        
                    }

                    finalResult.charts.push(result); 
 


                    // -------------------------------------------------------------------- 
                    var result = {};
                    result['category'] = 'Throughput (IOPS)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        if ( item.TotalThroughput === undefined )
                            chartDataItem['TotalThroughput'] = 0;
                        else {
                            chartDataItem['TotalThroughput'] = item.TotalThroughput;
                            chartDataItem['ReadThroughput'] = item.ReadThroughput;
                            chartDataItem['WriteThroughput'] = item.WriteThroughput;

                        }

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result); 

                    callback(null,finalResult);
               }

               else callback(null,{});
            }
        ], function (err, result) { 
           callback(result);
        });


 

         
    };
