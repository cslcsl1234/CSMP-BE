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

module.exports = {
    GetArrays,
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
            param['filter'] = 'device=\''+arraysn+'\'&sstype==\'Unified\'';
        } else {
            param['filter'] = '!parttype&sstype==\'Unified\'';
        } 

        param['filter_name'] = '(name=\'RawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'PoolFreeCapacity\'|name=\'PoolUsableCapacity\'|name=\'PoolUsedCapacity\'|name=\'PoolOverheadCapacity\'|name=\'SystemUsedCapacity\'|name=\'UsedCapacity\'|name=\'BlockUsedCapacity\'|name=\'PrimaryUsedCapacity\'|name=\'LocalReplicaUsedCapacity\'|name=\'RemoteReplicaUsedCapacity\'|name=\'FreeCapacity\'|name=\'VirtualUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'PoolSubscribedCapacity\'|name=\'ConfiguredRawCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\')';
        param['keys'] = ['serialnb'];
        param['fields'] = ['device','devdesc','sstype','vendor','model'];
 
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
/*
                    getArrayPerformance(function(result) { 
                        
                        
                           for ( var i in param.result ) {
                                var item = param.result[i];
                                item['perf'] = [];

                                for ( var j in result.values ) {
                                    var perfItem = result.values[j]; 
                                    
                                    if ( item.device == perfItem.properties.device ) {
                                        item.perf.push(perfItem);  
                                    }
                                }


                                //
                                // get specific a array infomation.
                                //
                                if (typeof arraysn !== 'undefined') { 

                                    ArrayObj.findOne({"basicInfo.device" : arraysn}, { "__v": 0, "_id": 0 },  function (err, doc) {
                                        //system error.
                                        if (err) {
                                            return   done(err);
                                        }
                                        if (!doc) { //user doesn't exist.
                                            console.log("array info record is not exist."); 

                                            param.result[0]['info'] = {};
                                        
                                        }
                                        else {
                                            console.log("Array is exist!");
                             
                                            param.result[0]['info'] = doc;
                 
                                        }
                                        callback(null,param);
                                    });
                                } else {
                                    callback(null,param);
                                } 


                            } 
     
                    });
*/
                    callback(null,param);
                } else 
                    callback(null,param);

            }, 
            function(param,  callback){ 

                if ( param.result.length > 0 ) {

                    var eventParam = {};
                    eventParam['filter'] = '!acknowledged&active=\'1\'&devtype=\'Array\'';
                    GetEvents.GetEvents(eventParam, function(result) {   

                        if ( param.result.length > 0 ) {

                           for ( var i in param.result ) {
                                var item = param.result[i];
                                item['event'] = [];

                                for ( var j in result ) {
                                    var eventItem = result[j]; 
                                    
                                    if ( item.device == eventItem.device ) {
                                        item.event.push(eventItem);  
                                    }
                                }
                            }
                        } else {
                            item['event'] = [];
                        }


                        callback(null,param);
                    });

                
                } else 
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
        param['period'] = 86400;
 
        var finalResult = [];
        var totalMemory = 0;
        async.waterfall([
            function(callback){ 
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

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name=\'ReadBandwidth\'|name=\'WriteBandwidth\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
                var fields = 'device,name,part';
                var keys = ['serialnb,part'];



                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600' , limit : 10000000}; 
                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

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
                                //console.log(response.body);   
                                var resultRecord = response.body;
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
                    var LastSyncTimeDT = CallGet.formatDate(new Date(item.LastSyncTime * 1000));
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
                                //console.log(response.body);   
                                var resultRecord = response.body;
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
                                //console.log(response.body);   
                                var resultRecord = response.body;
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
 
        if ( part !== undefined )
            var filterbase = 'serialnb=\''+device+'\'&part=\''+part+'\'&source=\'VNXBlock-Collector\'&parttype==\'Controller\'&!vstatus==\'inactive\'';
        else 
            var filterbase = 'serialnb=\''+device+'\'&source=\'VNXBlock-Collector\'&parttype==\'Controller\'&!vstatus==\'inactive\'';
    
        async.waterfall([
            function(callback){ 

                var filter = filterbase + '&(name=\'WriteThroughput\'|name=\'ReadThroughput\'|name=\'TotalThroughput\'|name=\'TotalBandwidth\'|name=\'ResponseTime\'|name=\'CurrentUtilization\')';
   
                var fields = 'serialnb,part,ip,name';
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
                                //console.log(response.body);   
                                var resultRecord = response.body;
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
                    result['category'] = 'Utilization (%)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['CurrentUtilization'] = item.CurrentUtilization;  

                        result.chartData.push(chartDataItem);
                        
                    }

                    finalResult.charts.push(result); 


                     // -------------------------------------------------------------------- 
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

                        
                    // -------------------------------------------------------------------- 
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
 


                    // -------------------------------------------------------------------- 
                    var result = {};
                    result['category'] = 'Throughput (IOPS)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['TotalThroughput'] = item.TotalThroughput;
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
                                //console.log(response.body);   
                                var resultRecord = response.body;
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(data,  callback){  
                
                var finalResult = {};
                finalResult['charts'] = util.convertPerfFormat(data);
                callback(null,finalResult);
 /*
                if ( data.length > 0 ) {

                     var lunItem = data[0];
                     var matrics = data[0].matrics;

console.log(data);                                             
                    // -------------------------------------------------------------------- 
                    var result = {};
                    result['category'] = 'Utilization (%)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem[lunItem.part] = item.CurrentUtilization;  

                        result.chartData.push(chartDataItem);
                        
                    }

                    finalResult.charts.push(result); 


                     // -------------------------------------------------------------------- 
                    var result = {};
                    result['category'] = 'ResponseTime (ms)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem[lunItem.part] = item.ResponseTime;  

                        result.chartData.push(chartDataItem);
                        
                    }

                    finalResult.charts.push(result); 


                     // -------------------------------------------------------------------- 
                    var result = {};
                    result['category'] = 'ServiceTime (ms)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem[lunItem.part] = item.ServiceTime;  

                        result.chartData.push(chartDataItem);
                        
                    }

                    finalResult.charts.push(result); 

                                                
                    // -------------------------------------------------------------------- 
                    var result = {};
                    result['category'] = 'TotalBandwidth (MBPS)';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem[lunItem.part] = item.TotalBandwidth;  

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
                        chartDataItem[lunItem.part] = item.TotalThroughput;
                        //chartDataItem['ReadThroughput'] = item.ReadThroughput;
                        //chartDataItem['WriteThroughput'] = item.WriteThroughput;

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result); 

                    callback(null,finalResult);
               }

               else callback(null,{});
    */
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
                                //console.log(response.body);   
                                var resultRecord = response.body;
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
                                //console.log(response.body);   
                                var resultRecord = response.body;
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
