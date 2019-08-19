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
    GetArrayType,
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


    ,GetUnity_FileSystem
    ,GetUNITY_NASSERVER
    ,GetUNITY_NFSExport
    ,getUNITY_FS_Performance

    ,GetUNITY_SPs
    ,GetUNITY_FEPort
    ,GetUNITY_FEPortPerformance
    ,GetUNITY_BlockDevices
    ,GetUNITY_BlockDevicePerformance
    ,GetUNITY_BlockStorageGroup
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
        //param['start'] = util.getConfStartTime('1d');

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
            param['filter'] = 'device=\''+arraysn+'\'&((datagrp==\'VNXBlock-Array\'&parttype=\'Memory\')|(datagrp==\'UNITY-STORAGEPROCESSOR\'&parttype==\'Controller\'))';
        } else {
            param['filter'] = '((datagrp==\'VNXBlock-Array\'&parttype=\'Memory\')|(datagrp==\'UNITY-STORAGEPROCESSOR\'&parttype==\'Controller\'))';
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
            param['filter'] = 'serialnb=\''+arraysn+'\'&(source=\'VNXBlock-Collector\'|source=\'VNXUnity-Collector\')&(parttype==\'LUN\'|parttype==\'MetaMember\')';
        } else {
            param['filter'] = '(source=\'VNXBlock-Collector\'|source=\'VNXUnity-Collector\')&(parttype==\'LUN\'|parttype==\'MetaMember\')';
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
 


    function GetArrayType(device, callback) {

        async.waterfall([
            function(callback){ 
                var param = {}; 
                param['filter'] = 'serialnb=\''+device+'\'&!parttype';
        
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','model'];  
        
                CallGet.CallGet(param, function(param) { 
                    console.log(param);
                    callback(null,param.result);
                });
                
            },
            function(arg, callback ) {
                console.log(arg);
                if ( arg.length > 0 ) {
                    callback(null,arg[0])
                } else {
                    var param = {}; 
                    param['filter'] = 'device=\''+device+'\'&!parttype';
            
                    param['keys'] = ['serialnb'];
                    param['fields'] = ['device','model'];  
            
                    CallGet.CallGet(param, function(param) { 
                        callback(null,param.result[0]);
                    });
                }

                
            } 
            ], function (err, result) { 
                if ( result === undefined ) {
                    var retItem = { serialnb: device,
                    device: device,
                    model: 'unknow' };
                    callback(retItem);
                    
                } else 
                    callback(result);
            });
    };



function GetSPs(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'serialnb=\''+arraysn+'\'&((source=\'VNXBlock-Collector\'&parttype==\'Controller\')|(datagrp=\'UNITY-STORAGEPROCESSOR-PERFORMANCE\'|datagrp==\'UNITY-STORAGEPROCESSOR\'))';
        } else {
            param['filter'] = '((source=\'VNXBlock-Collector\'&parttype==\'Controller\')|(datagrp=\'UNITY-STORAGEPROCESSOR-PERFORMANCE\'|datagrp==\'UNITY-STORAGEPROCESSOR\'))';
        } 

        param['filter_name'] = '(name=\'TotalMemory\'|name=\'TotalThroughput\'|name=\'TotalBandwidth\'|name=\'ResponseTime\'|name=\'CurrentUtilization\')';
   
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['device','ip','partvrs','devdesc']; 
        param['start'] = util.getConfStartTime('1d');
        param['period'] = 3600;

        var finalResult = [];
        var totalMemory = 0;
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result ) {
                        var item = param.result[i];
                        if ( item["partvrs"] === undefined ) {
                            item["partvrs"] = ( item.devdesc === undefined ) ? "" : item.devdesc;
                        }
                    }
                    callback(null,param.result);
                });

                

            }       
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

    };



function GetUNITY_SPs(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'serialnb=\''+arraysn+'\'&(datagrp=\'UNITY-STORAGEPROCESSOR-PERFORMANCE\'|datagrp==\'UNITY-STORAGEPROCESSOR\')';
        } else {
            param['filter'] = '(datagrp=\'UNITY-STORAGEPROCESSOR-PERFORMANCE\'|datagrp==\'UNITY-STORAGEPROCESSOR\')';
        } 

        param['filter_name'] = '(name=\'TotalMemory\'|name=\'CurrentUtilization\')';
   
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['device','ip','devdesc']; 
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
            param['filter'] = 'device=\''+arraysn+'\'&(source=\'VNXBlock-Collector\'|source=\'VNXUnity-Collector\')&parttype==\'Disk\'';
        } else {
            param['filter'] = '(source=\'VNXBlock-Collector\'|source=\'VNXUnity-Collector\')&parttype==\'Disk\'';
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

    function GetUNITY_FEPort(device, callback) { 

        var period = 3600;
        var valuetype = 'max';
 
        var finalResult = [];
        var totalMemory = 0;
        async.waterfall([
            function(callback){ 
                
                var param = {};
                
                param['filter'] = 'serialnb=\''+device+'\'&datagrp=\'UNITY-FIBRECHANNELFEPORT-PERFORMANCE\'&parttype==\'Port\''; 
                //param['device'] = device;
                param['period'] = period;
                param['start'] = util.getConfStartTime('1d'); 
                param['type'] = valuetype;
                param['keys'] = ['serialnb','feport'];
                param['filter_name'] = '(name=\'WriteThroughput\'|name=\'ReadThroughput\'|name=\'ReadBandwidth\'|name=\'WriteBandwidth\')';
                param['fields'] = ['device','portwwn','iftype','memberof','partstat']; 
 
                CallGet.CallGetPerformance(param, function(param) { 
                    callback(null, param ); 
                }); 
            },
            function ( arg, callback ) {
                for ( var i in arg ) {
                    var item = arg[i];

                    item["TotalThroughput"] = item.matricsStat.WriteThroughput.max + item.matricsStat.ReadThroughput.max;
                    item["TotalBandwidth"] = item.matricsStat.ReadBandwidth.max + item.matricsStat.WriteBandwidth.max;

                    delete item.matrics;
                    delete item.matricsStat;
                }
                callback(null,arg);
            }        
        ], function (err, result) { 
           callback(result);
        });

    };


    function GetUNITY_BlockDevices(device, callback) { 

        var period = 3600;
        var valuetype = 'max';
 
        var finalResult = [];
        var totalMemory = 0;
        async.waterfall([
            function(callback){ 
                
                var param = {};
                
                param['filter'] = 'serialnb=\''+device+'\'&datagrp=\'UNITY-LUN-PERFORMANCE\''; 
                //param['device'] = device;
                param['period'] = period;
                param['start'] = util.getConfStartTime('1w'); 
                param['type'] = valuetype;
                param['keys'] = ['serialnb','uid','part'];
                param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\'|name=\'ResponseTime\'|name=\'QueueLength\')';
                param['fields'] = ['device','memberof','partstat','csupoltp','sgname','purpose','part','dgraid','parttype','dgname','datatype','dgstype','dgtype']; 
 
                CallGet.CallGetPerformance(param, function(param) { 
                    for ( var i in param ) {
                        var item = param[i];
                        item["TotalBandwidth"] = item.matricsStat.TotalBandwidth === undefined ? 0 : item.matricsStat.TotalBandwidth.max;
                        item["TotalThroughput"] = item.matricsStat.TotalThroughput === undefined ? 0 : item.matricsStat.TotalThroughput.max;
                        item["ResponseTime"] = item.matricsStat.ResponseTime === undefined ? 0 : item.matricsStat.ResponseTime.max;
                        item["QueueLength"] = item.matricsStat.QueueLength === undefined ? 0 : item.matricsStat.QueueLength.max;
                        
                        delete item.matrics;
                        delete item.matricsStat;
                        
                    }
                    
                    callback(null, param ); 
                }); 
            },
            function ( arg, callback ) { 
                
                var param = {};
                
                param['filter'] = 'serialnb=\''+device+'\'&datagrp=\'UNITY-LUN\''; 
                //param['device'] = device;
                param['period'] = period;
                param['start'] = util.getConfStartTime('1w'); 
                param['type'] = valuetype;
                param['keys'] = ['serialnb','uid','part'];
                param['filter_name'] = '(name=\'Capacity\'|name=\'CurrentUtilization\'|name=\'UsedCapacity\'|name=\'FreeCapacity\'|name=\'AssignableCapacity\'|name=\'ConsumedCapacity\')';
                param['fields'] = ['device']; 
 
                CallGet.CallGetPerformance(param, function(param) {  
                    for ( var i in arg ) {
                        var item = arg[i];

                        for ( var j in param ) {
                            var item1 = param[j];
                            
                            if ( item.device == item1.device && item.part == item1.part ) { 
                                console.log(item.device +','+ item1.device +','+ item.part +','+ item1.part);
                                item["Capacity"] = item1.matricsStat.Capacity.max;
                                item["UsedCapacity"] = item1.matricsStat.UsedCapacity.max;
                                item["FreeCapacity"] = item1.matricsStat.FreeCapacity.max;
                                item["AssignableCapacity"] = item1.matricsStat.AssignableCapacity.max;
                                item["ConsumedCapacity"] = item1.matricsStat.ConsumedCapacity.max; 
 
                            }
                        }
                    }
                    callback(null, arg ); 
                }); 
            }        
        ], function (err, result) { 
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


    function GetUNITY_BlockStorageGroup(device, sgname,  callback) {

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
                    callback(null,arrayinfo);
                });
                
    
            }, 
            function(arrayinfo, callback) { 
                var param={};
                param['filter'] = '(datagrp=\'VNXBlock-SP\'|datagrp=\'UNITY-STORAGEPROCESSOR\')&parttype=\'Controller\'';
                param['keys'] = ['serialnb','part'];
                param['fields'] = ['ip','device']; 
    
    
                CallGet.CallGet(param, function(param) {
                    var spip = {};
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        if ( spip[item.device] === undefined ) spip[item.device] = item.ip;
                        else {
                            if ( spip[item.device].indexOf(item.ip) < 0 )
                                spip[item.device] = spip[item.device]+','+item.ip;
                        }

                    }
 

                    for ( var i in arrayinfo ) {
                        var item = arrayinfo[i];

                        if ( spip[item.device] === undefined ) item["ControllerIP"] = "";
                        else item["ControllerIP"] = spip[item.device];
                    }
                    console.log(arrayinfo);
                    callback(null,arrayinfo);
                });
                    
            },
            function(arrayinfo, callback) { 
    
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
                        //viewItem["part"] = item.MVName;

                        viewItem["part"] = item.SGName; 
                        viewItem["device"] = item.MV.split(':')[2]; 

                        viewItem["array_model"] = (arrayinfo[viewItem.device]===undefined)? "":arrayinfo[viewItem.device].model;
                        viewItem["sn"] = (arrayinfo[viewItem.device]===undefined)? "":arrayinfo[viewItem.device].serialnb;
                        viewItem["ip"] = (arrayinfo[viewItem.device]===undefined)? "":arrayinfo[viewItem.device].ControllerIP;


                        var initgrp_member = [];
                        initgrp_member.push( item.INIT.split(':')[2] );

 

                        var portgrp_member = [];
                        var portgrp_member_item={}; 
                       // portgrp_member_item["device"] = item.TARGET_ID.split(':')[2];
                        portgrp_member_item["device"] = (arrayinfo[viewItem.device]===undefined)? "":arrayinfo[viewItem.device].serialnb;
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
                    
                
                    var filterbase = '(datagrp=\'VNXBlock-LUN\'|datagrp=\'UNITY-LGLUN\')';
                    
                    if ( start === undefined ) var start = util.getConfStartTime();
                    if ( end   === undefined ) var end = util.getPerfEndTime();

                    var param = {}; 
                    param['period'] = '3600';
                    param['start'] = start;
                    param['end'] = end;
                    param['type'] = 'max';
                    param['limit'] = 10000000;
                    param['keys'] = ['serialnb,part']; 
                    param['fields'] = ['device','partdesc','partsn','partid','sgname','memberof'];   
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
                                sgItem["device"] = serialnb;
                                sgItem["serialnb"] = serialnb;
                                sgItem["part"] = vol;
                                sgItem["sgname"] = SGName;
                                sgItem["Capacity"] = item.Capacity;
                                sgItem["lunwwn"] = item.partsn;
                                sgItem["lunname"] = item.partdesc;
                                sgItem["memberof"] = item.memberof;
                
                
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
            },
            // Merge the records when sgname, initgrp is same
            function ( arg, callback ) {

                // 1. build an index structure for future search
                var recordIndex = [];
                for ( var i in arg ) {
                    var item = arg[i];

                    var isfind = false ;
                    for ( var j in recordIndex ) {
                        var indexItem = recordIndex[j];
                        if ( indexItem.sgname == item.sgname &
                             indexItem.initgrp == item.initgrp &
                             indexItem.device == item.device 
                            ) {
                                isfind = true;
                                break;
                            }
                    }

                    if  ( isfind == false ) {
                        var indexItem = {};
                        indexItem["sgname"] = item.sgname;
                        indexItem["initgrp"] = item.initgrp;
                        indexItem["device"] = item.device;
                        indexItem["ip"] = item.ip;

                        recordIndex.push(indexItem);
                    }

                }

                // 2. base the index to build a new list 
                for ( var i in recordIndex ) {
                    var indexItem = recordIndex[i];

                    for ( var j in arg ) {
                        var item = arg[j];
                        if ( indexItem.sgname == item.sgname &
                             indexItem.initgrp == item.initgrp &
                             indexItem.device == item.device 
                            ) {
                                if ( indexItem["portgrp"] === undefined ) {
                                    
                                    indexItem["Capacity"] = item.Capacity;
                                    indexItem["portgrp"] = item.portgrp;
                                    indexItem["part"] = item.part;
                                    indexItem["initgrp_member"] = item.initgrp_member;
                                    indexItem["portgrp_member"] = item.portgrp_member;
                                    indexItem["sg_member"] = item.sg_member;
                                    
                                } else { 
                                    indexItem["portgrp_member"] = indexItem.portgrp_member.concat(item.portgrp_member);  
                                    indexItem["portgrp"] = indexItem.portgrp +"|" + item.portgrp;                                   
                                }
                            }
                    }

                }


                callback(null,recordIndex);
            }, 
            function( result, callback ) {

                for ( var i in result ) {
                    var item = result[i];
                    var lunwwn = "";

                    for ( var j in item.sg_member ) {
                        var lunItem = item.sg_member[j];
                        if ( lunwwn === undefined )  lunwwn = lunItem.lunwwn;
                        else lunwwn += "," + lunItem.lunwwn;
                    }

                    item.sgname = lunwwn;

                }
                callback(null,result);
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

function GetUNITY_NASSERVER(device, callback ) {
    var param = {};
    var arraysn = device; 
    if (typeof arraysn !== 'undefined') { 
        param['filter'] = 'device=\''+arraysn+'\'&(datagrp==\'UNITY-NASSERVER\')';
    } else {
        param['filter'] = '(datagrp==\'UNITY-NASSERVER\')';
    } 
    param['keys'] = ['serialnb','part'];
    param['fields'] = ['device','ifaceip','host','moverid','partstat','parttype','poolname']; 
 
    CallGet.CallGet(param, function(param) {
        callback( param.result);
    })
};
    
function GetUNITY_NFSExport(device, callback) {
 
           
    async.waterfall([

             
         function(callback) {   
                var param = {};
                var arraysn = device; 
                if (typeof arraysn !== 'undefined') { 
                    param['filter'] = 'device=\''+arraysn+'\'&(datagrp==\'UNITY-NFSSHARE\'|datagrp==\'UNITY-CIFSSHARE\')';
                } else {
                    param['filter'] = '(datagrp==\'UNITY-NFSSHARE\'|datagrp==\'UNITY-CIFSSHARE\')';
                } 
                param['keys'] = ['serialnb','part'];
                param['fields'] = ['device','datatype','fsname','nasname','fsid','parttype','datagrp','nasname']; 

                var returnRecord = [];
                CallGet.CallGet(param, function(param) {
                    var result = param.result;   
                    for ( var i in result ) {
                        var item=result[i];  

                        var retItem = {};
                        retItem["serialnb"   ] = item.serialnb  ;
                        if ( item.datagrp == 'UNITY-NFSSHARE' )
                                retItem["protocol"   ] = "NFS" ;
                        else if ( item.datagrp =='UNITY-CIFSSHARE' )
                                retItem["protocol"   ] = "CIFS" ;
                            else 
                                retItem["protocol"   ] = "Other" ;
                        retItem["nasname"] = item.nasname; 
                        retItem["datatype"   ] = item.datatype  ;
                        retItem["part"       ] = item.part  ;
                        retItem["fsid"       ] = item.fsid  ;
                        retItem["name"       ] = "" ;
                        retItem["parttype"   ] = item.parttype  ;
                        retItem["device"     ] = item.device  ;
                        retItem["Identifier" ] = ""  ;
                        retItem["LastTS"     ] = ""  ;

                        returnRecord.push(retItem);
                        
                    } 
                        
                    callback(null,returnRecord);
                });


            } ,
            function ( arg, callback) {
                GetUNITY_NASSERVER(device,function(nasserver) {
                    for ( var i in arg ) {
                        var item = arg[i];

                        for ( var j in nasserver ) {
                            var nasItem = nasserver[j];

                            if ( item.nasname == nasItem.part && item.device == nasItem.device) {
                                if ( item["clients"] === undefined ) item["clients"] = nasItem.ifaceip;
                                else item.clients = item.clients + ',' + nasItem.ifaceip;
                            }
                        }

                    }
                    callback(null, arg);
                })
            }
        ], function (err, result) {

            // result now equals 'done'
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



    function GetUnity_FileSystem(device, callback) {


        var finalResult = {};
        var perfStat = util.getConfStartTime('1w');

        async.waterfall([

            function( callback ) { 
                var param = {}; 
                param['device'] = device;
                param['period'] = '3600';
                param['start'] = perfStat;
                param['type'] = 'max';

                param['keys'] = ['serialnb,part']; 
                param['fields'] = ['device','dgstype','fsid','format','fsname','nasname','partdesc','type'];   
                param['filter'] = 'parttype==\'FileSystem\'';
                param['filter_name'] = '(name=\'PresentedCapacity\'|name=\'Capacity\'|name=\'FreeCapacity\'|name=\'UsedCapacity\'|name=\'CurrentUtilization\'|name=\'TotalBandwidth\'|name=\'TotalThroughput\')';
                   

                var ret1 = []
                CallGet.CallGetPerformance(param, function(ret) {  
                    for ( var i in ret ) {
                        var item = ret[i];
                        
                        console.log(item);
                        var retItem = {};
                        retItem['device'] = item.device;
                        retItem['serialnb'] = item.serialnb;
                        retItem['fsid'] = item.fsid;
                        retItem['fsname'] = item.fsname;
                        retItem['format'] = item.format;
                        retItem['sharetype'] = item.type;
                        retItem['dgstype'] = item.dgstype;
                        retItem['nasname'] = item.nasname;
                        retItem['partdesc'] = item.partdesc;
                        retItem['PresentedCapacity'] = (item.matricsStat.PresentedCapacity === undefined ) ? 0 : item.matricsStat.PresentedCapacity.max;
                        retItem['Capacity'] = (item.matricsStat.Capacity === undefined ) ? 0 : item.matricsStat.Capacity.max;
                        retItem['UsedCapacity'] = (item.matricsStat.UsedCapacity === undefined ) ? 0 : item.matricsStat.UsedCapacity.max;
                        retItem['FreeCapacity'] = (item.matricsStat.FreeCapacity === undefined ) ? 0 : item.matricsStat.FreeCapacity.max;
                        retItem['CurrentUtilization'] = ( item.matricsStat.CurrentUtilization === undefined ) ? 0: item.matricsStat.CurrentUtilization.max;
                        retItem["TotalThroughput"] = (item.matricsStat.TotalThroughput === undefined ) ? 0 : item.matricsStat.TotalThroughput.max;
                        retItem["TotalBandwidth"] = (item.matricsStat.TotalBandwidth === undefined ) ? 0 : item.matricsStat.TotalBandwidth.max;
                                              
                        ret1.push(retItem);
                    }
                    finalResult["filesystem"] = ret1;
                    callback(null, finalResult ); 
                });
            },
            function( arg, callback){ 

                var param = {};
                var arraysn = device; 
                if (typeof arraysn !== 'undefined') { 
                    param['filter'] = 'device=\''+arraysn+'\'&(datagrp==\'UNITY-NFSSHARE\'|datagrp==\'UNITY-CIFSSHARE\')';
                } else {
                    param['filter'] = '(datagrp==\'UNITY-NFSSHARE\'|datagrp==\'UNITY-CIFSSHARE\')';
                } 
                param['keys'] = ['serialnb','part'];
                param['fields'] = ['device','fsname','nasname','fsid','parttype'];
        
                param['period'] = 3600;
                 
                CallGet.CallGet(param, function(param) {
                    var result = param.result; 
                   arg["share"] = param.result;

                    for ( var i in result ) {
                        var item=result[i];
                        for ( var j in arg.filesystem) {
                            var fsItem = arg.filesystem[j];

                            if ( fsItem['share'] === undefined ) fsItem["share"] = [];

                            if ( item.serialnb == fsItem.serialnb && 
                                 item.fsname == fsItem.fsname ) {
                                     
                                     fsItem["share"].push(item);
                                     break;
                                 }
                        }

                    } 
                     
                    callback(null,arg);
                });
            }  ,
            function ( arg, callback) {
                GetUNITY_NASSERVER(device,function(nasserver) {
                    for ( var i in arg.filesystem ) {
                        var item = arg.filesystem[i];

                        for ( var j in nasserver ) {
                            var nasItem = nasserver[j];

                            if ( item.nasname == nasItem.part && item.device == nasItem.device) {
                                if ( item["clients"] === undefined ) item["clients"] = nasItem.ifaceip;
                                else item.clients = item.clients + ',' + nasItem.ifaceip;
                            }
                        }

                    }
                    callback(null, arg);
                })
            },
            function ( arg, callback ) {
                var finalResult = [];
                for ( var i in arg.filesystem) {
                    var item = arg.filesystem[i];
                    var finalResultItem = {};
 
                    finalResultItem["mtperm"] = "Read-Write";
                    finalResultItem["serialnb"] = item.serialnb;
                    finalResultItem["part"] = item.fsname;
                    finalResultItem["vols"] = item.fsid;
                    finalResultItem["appname"] = item.partdesc;
                    finalResultItem["dgstype"] = item.dgstype;
                    finalResultItem["fsid"] = item.fsid;
                    finalResultItem["name"] = "CurrentUtilization",
                    finalResultItem["mtpath"] = "",
                    finalResultItem["type"] = item.format;
                    finalResultItem["device"] = item.device;
                    finalResultItem["movernam"] = item.nasname;
                    finalResultItem["fsname"] = item.fsname;
                    finalResultItem["CurrentUtilization"] = item.CurrentUtilization;
                    finalResultItem["LastTS"] = "",
                    finalResultItem["Capacity"] = item.Capacity
                    finalResultItem["FreeCapacity"] = item.FreeCapacity;
                    finalResultItem["OverheadCapacity"] = "3.11426",
                    finalResultItem["PresentedCapacity"] = item.PresentedCapacity,
                    finalResultItem["UsedCapacity"] = item.UsedCapacity;
                    finalResultItem["FilesTotal"] = "2.51904E7",
                    finalResultItem["FilesUsed"] = "55.0",
                    finalResultItem["protocol"] = item.sharetype;
                    finalResultItem["clients"] = item.clients,
                    finalResultItem["NumberOfExport"] = item.share.length;
                    finalResultItem["sharetype"] = item.share.parttype;
                    finalResultItem["datatype"] = "File"
 
                    finalResultItem['Throughput'] = item.TotalThroughput;
                    finalResultItem['Bandwidth'] = item.TotalBandwidth;
                    
                    finalResultItem['PerfStart']= perfStat;
                    finalResultItem['PerfEnd'] = "";
                    finalResult.push(finalResultItem);
                }
                callback(null,finalResult);
            }
        ], function (err, result) { 
           callback(result);
        });

    };


function GetVNX_Replication(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&source==\'VNXFile-Collector\'&parttype==\'Replication\'';
        } else {
            param['filter'] = 'datagrp&source==\'VNXFile-Collector\'&parttype==\'Replication\'';
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

    
    function GetUNITY_BlockDevicePerformance(device, part, start, end,  callback) {
 
        var period = 3600;
        var valuetype = 'max';

        async.waterfall([
            function(callback){  
                var param = {};
                
                param['filter'] = 'serialnb=\''+device+'\'&uid=\''+part+'\'&datagrp=\'UNITY-LUN-PERFORMANCE\''; 
                //param['device'] = device;
                param['period'] = period;
                param['start'] = util.getConfStartTime('1d'); 
                param['type'] = valuetype;
                param['keys'] = ['serialnb','uid'];
                param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\'|name=\'ResponseTime\'|name=\'QueueLength\')';
                param['fields'] = ['device']; 
 
                CallGet.CallGetPerformance(param, function(param) {  
                    
                    callback(null, param ); 
                }); 

     
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
                        chartDataItem['TotalBandwidth'] = item.TotalBandwidth;  

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
                        chartDataItem['TotalThroughput'] = item.TotalThroughput; 

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result); 
 
                    var result = {};
                    result['category'] = 'ResponseTime (ms)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['ResponseTime'] = item.ResponseTime;  

                        result.chartData.push(chartDataItem);
                        
                    }

                    finalResult.charts.push(result);


                    var result = {};
                    result['category'] = 'QueueLength';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['QueueLength'] = item.QueueLength;  

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


    function getUNITY_FS_Performance(device, part, start, end,  callback) {
 
  
        async.waterfall([
            function(callback){  
                var param = {};
                param['device'] = device;
                param['period'] = 3600;
                param['start'] = start;
                param['end'] = end;
                param['type'] = 'max';
                param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\')';
                param['keys'] = ['device','part'];
                param['fields'] = ['name'];  
                param['filter'] ='datagrp=\'UNITY-FILESYSTEM-PERFORMANCE\'&fsid=\''+part+'\''; 
 
                CallGet.CallGetPerformance(param, function(param) { 
                    callback(null, param ); 
                });

     
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
                        chartDataItem['TotalBandwidth'] = item.TotalBandwidth;  

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
                        chartDataItem['TotalThroughput'] = item.TotalThroughput; 

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
                            var filterbase = 'serialnb=\''+device+'\'&part=\''+part+'\'&((source=\'VNXBlock-Collector\'&parttype==\'Controller\')|(datagrp=\'UNITY-STORAGEPROCESSOR-PERFORMANCE\'|datagrp==\'UNITY-STORAGEPROCESSOR\'))';
                        else if ( device !== undefined ) 
                            var filterbase = 'serialnb=\''+device+'\'&((source=\'VNXBlock-Collector\'&parttype==\'Controller\')|(datagrp=\'UNITY-STORAGEPROCESSOR-PERFORMANCE\'|datagrp==\'UNITY-STORAGEPROCESSOR\'))';
                        else 
                            var filterbase = '((source=\'VNXBlock-Collector\'&parttype==\'Controller\')|(datagrp=\'UNITY-STORAGEPROCESSOR-PERFORMANCE\'|datagrp==\'UNITY-STORAGEPROCESSOR\'))';
                        
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


        //var filterbase = 'serialnb=\''+device+'\'&'+lunFilter+'&source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')&!vstatus==\'inactive\'';
        var filterbase = 'serialnb=\''+device+'\'&'+lunFilter+'&source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
    
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

        //var filterbase = 'serialnb=\''+device+'\'&portwwn=\''+portwwn+'\'&source=\'VNXBlock-Collector\'&parttype==\'Port\'&!vstatus==\'inactive\'';
        var filterbase = 'serialnb=\''+device+'\'&portwwn=\''+portwwn+'\'&source=\'VNXBlock-Collector\'&parttype==\'Port\'';
    
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



    
function GetUNITY_FEPortPerformance(device, portwwn, start, end,  callback) {
    var period = 3600;
    var valuetype = 'max';
    async.waterfall([
        function(callback){ 

            var param = {};
            //param['device'] = device;
            param['period'] = period;
            param['start'] = start;
            param['end'] = end;
            param['type'] = valuetype;
            param['filter_name'] = '(name=\'WriteThroughput\'|name=\'ReadThroughput\'|name=\'ReadBandwidth\'|name=\'WriteBandwidth\')';
            param['keys'] = ['device','part'];
            param['fields'] = ['name','parttype'];  
            param['filter'] = 'portwwn=\''+portwwn+'\'&serialnb=\''+device+'\'&datagrp=\'UNITY-FIBRECHANNELFEPORT-PERFORMANCE\'';
            //param['limit'] = 100000;

            CallGet.CallGetPerformance(param, function(param) { 
                callback(null, param ); 
            });
 
        },
        function(arg1,  callback){ 
            var finalRecord = {};
            var IOPS=[];
            var MBPS=[];
            for (var i in arg1) {
                var item = arg1[i];
                for ( var j in item.matrics) {
                    var matricsItem = item.matrics[j];
                    var IOPSItem = {};
                    var MBPSItem = {};
                    IOPSItem['name'] = matricsItem.timestamp;
                    IOPSItem['WriteThroughput'] = matricsItem.WriteThroughput;
                    IOPSItem['ReadThroughput'] = matricsItem.ReadThroughput;
                    IOPS.push(IOPSItem);

                    MBPSItem['name'] = matricsItem.timestamp;
                    MBPSItem['WriteThroughput'] = matricsItem.ReadBandwidth;
                    MBPSItem['ReadThroughput'] = matricsItem.WriteBandwidth;
                    MBPS.push(MBPSItem);
                    
                }
            }
            finalRecord["charts"] = [];


            var MBPSRecord = {};
            MBPSRecord["category"] = "Bandwidth (MBPS)";
            MBPSRecord["chartData"] = MBPS;
            finalRecord.charts.push(MBPSRecord);
            
            var IOPSRecord = {};
            IOPSRecord["category"] = "Throughput (IOPS)";
            IOPSRecord["chartData"] = IOPS;
            finalRecord.charts.push(IOPSRecord);

            callback(null,finalRecord);
        }
    ], function (err, result) { 
       callback(result);
    });




     
};
