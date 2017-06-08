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

module.exports = {
    GetArrays,
    GetArrays1
}


function GetArrays(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&datatype==\'Virtual\'';
        } else {
            param['filter'] = '!parttype&datatype==\'Virtual\'';
        } 

        param['filter_name'] = '(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
        param['keys'] = ['device'];
        param['fields'] = ['cluster','vstgtype','model','vendor','devdesc','vplexid'];
 
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result) {
                        var item = param.result[i];

                        var ConfiguredUsableCapacity = item.ConfiguredUsableCapacity;
                        var UsedCapacity = item.UsedCapacity;
                        var UsedPercent = UsedCapacity / ConfiguredUsableCapacity * 100; 
                        item['UsedPercent'] = UsedPercent.toFixed(0);
                        
                        item.TotalMemory = Math.round(item.TotalMemory).toString();
                        item.TotalDisk = Math.round(item.TotalDisk).toString();
                        item.TotalLun = Math.round(item.TotalLun).toString();

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
                GetArrayInfo(function(result) {

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
                                        break;
                                    }
                                }
                                item['info'] = infoItem; 
                            }
                        } 
                    }


                 callback(null,param);
    
             });

            } 
        ], function (err, result) {
           // result now equals 'done'
           callback(result.result);
        });

    };

function GetArrayInfo(callback) {

        ArrayObj.find({}, { "__v": 0, "_id": 0 },  function (err, doc) {
        //system error.
        if (err) {
            return   done(err);
        }
        if (!doc) { //user doesn't exist.
            console.log("array info record is not exist."); 

            callback(null,[]); 
        
        }
        else {
            console.log("Array is exist!");
            callback(doc); 

        }
        
    });
}


function GetArrays1(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&!parttype&datatype==\'Virtual\'';
        } else {
            param['filter'] = '!parttype&datatype==\'Virtual\'';
        } 

        param['filter_name'] = '(name=\'HealthState\'|name=\'Connectivity\'|name=\'Availability\')';
        param['keys'] = ['device'];
        param['fields'] = ['cluster','vstgtype','model','vendor','devdesc','vplexid','memberof'];

        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) { 
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
                /*
                    getVplexPerformance(function(result) {
                           param['perf1'] = result;
                           for ( var i in param.result ) {
                                var item = param.result[i];
                                item['perf'] = [];

                                console.log(item);
                                for ( var j in result.values ) {
                                    var perfItem = result.values[j]; 
                                    console.log(perfItem);
                                    
                                    if ( item.device == perfItem.properties.device ) {
                                        item.perf.push(perfItem);  
                                    }
                                }


                              }

                            callback(null,param);
                              
                    });
 
                */
                callback(null,param);
            }, 
            function(param,  callback){ 


                var locations = param.Locations;
                GetArrayInfo(function(result) {

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
                                        break;
                                    }
                                }
                                item['info'] = infoItem; 
                            }
                        } 
                    }


                 callback(null,param);
    
             });


            },
            // get Event
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

            } 
        ], function (err, result) {
           // result now equals 'done' 
           callback(result.result);
        });

    };


 function getVplexPerformance(callback) {
 
        var config = configger.load(); 
        var start = util.getPerfStartTime();
        var end = util.getPerfEndTime();
        var filterbase = 'parttype==\'Processor\''; 

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name==\'CurrentUtilization\')';
                var fields = 'device,name,part';
                var keys = ['device','part'];



                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

   
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
               callback(null,arg1);


            }
        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           var r = JSON.parse(result);
           callback(r);
        });


 

         
    };
