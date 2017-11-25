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
    GetArraysByDatacenter

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
            param['filter'] = 'device=\''+arraysn+'\'&datatype==\'File\'';
        } else {
            param['filter'] = '!parttype&datatype==\'File\'';
        } 

        param['filter_name'] = '(name=\'FilesTotal\'|name=\'NASCapacity\'|name=\'NASFreeCapacity\'|name=\'NASUsedCapacity\'|name=\'NASUnusedCapacity\'|name=\'MetaVolumeCapacity\'|name=\'NASCapacity\'|name=\'NASFreeCapacity\'|name=\'NASFSCapacity\'|name=\'NASFSFreeCapacity\'|name=\'NASFSOverheadCapacity\'|name=\'NASFSPresentedCapacity\'|name=\'NASFSUsedCapacity\'|name=\'NASLocalReplicaUsedCapacity\'|name=\'NASPoolCapacity\'|name=\'NASPoolFreeCapacity\'|name=\'NASPoolUsedCapacity\'|name=\'NASPrimaryUsedCapacity\'|name=\'NASRemoteReplicaUsedCapacity\'|name=\'NASSnapshotCapacity\'|name=\'NASSystemUsedCapacity\'|name=\'NASUnusedCapacity\'|name=\'NASUsedCapacity\'|name=\'OverheadCapacity\')';
        param['keys'] = ['serialnb'];
        param['fields'] = ['device','devdesc','sstype','vendor','model'];
 
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result) {
                        var item = param.result[i];

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
            // GET FEPort Count
            function(param,  callback){ 

                   for ( var i in param.result ) {      
                        var item = param.result[i];
                        item['TotalFEPort'] = 11; 
                        item['TotalMemory'] = 32768;
                        item['TotalLun'] = 100;
                        item['TotalDisk'] = 200;
                    }
                 callback(null,param);
 

            }          
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result.result);
        });

    };



