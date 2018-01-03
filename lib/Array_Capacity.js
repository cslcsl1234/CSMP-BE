"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');  
var util = require('./util');   

module.exports = {
    GetArrayCapacity,
    GetArrayTotalCapacity,
    getArrayCapacityTrend
}

function GetArrayTotalCapacity(callback) {
            //var baseFilter = '!vstatus==\'inactive\'&((source==\'VNXBlock-Collector\'|source==\'VNXFile-Collector\'|source==\'VNXUnity-Collector\')|(datatype==\'Block\'&!(devtype==\'VirtualStorage\'&source==\'VMAX-Collector\')))'
            var baseFilter = '!devtype==\'VirtualStorage\''

        async.waterfall([
            // Raw Capacity
            function(callback){ 
                var resultRecord = [];

                var param = {};
                param['filter'] = baseFilter + '&datatype=\'Block\'&!parttype';
 

                param['filter_name'] = '(name=\'RawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnusableCapacity\')';
                param['keys'] = ['serialnb','sstype'];
                //param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = '3600';

                CallGet.CallGet(param, function(param) {       
                    console.log(param);                 
                    var rawCapacityItem = {};
                    rawCapacityItem["RawCapacity"] = 0;
                    rawCapacityItem["UnconfiguredCapacity"] = 0;
                    rawCapacityItem["ConfiguredUsableCapacity"] = 0;
                    rawCapacityItem["HotSpareCapacity"] = 0;
                    rawCapacityItem["RAIDOverheadCapacity"] = 0;
                    rawCapacityItem["UnusableCapacity"] = 0;




                    for ( var i in param.result ) {
                        var item = param.result[i];

                        var outputItem = {}; 
                        rawCapacityItem["RawCapacity"] += Math.round( item.RawCapacity );
                        rawCapacityItem["UnconfiguredCapacity"] += Math.round( item.UnconfiguredCapacity );
                        rawCapacityItem["ConfiguredUsableCapacity"] += Math.round( item.ConfiguredUsableCapacity );
                        rawCapacityItem["HotSpareCapacity"] += Math.round( item.HotSpareCapacity );
                        rawCapacityItem["RAIDOverheadCapacity"] += Math.round( item.RAIDOverheadCapacity );
                        rawCapacityItem["UnusableCapacity"] += Math.round( item.UnusableCapacity );
                        outputItem["LastTS"] = item.LastTS;
                        outputItem["RawCapacity"] = rawCapacityItem;

                    } 
                    callback(null,outputItem);
                });
            }, 
            // Usable Capacity
            function(arg1,  callback){  

                var param = {};
                param['filter'] = baseFilter + '&datatype=\'Block\'&((name==\'FreeCapacity\'&!parttype)|(name==\'PoolFreeCapacity\'&!parttype)|(name==\'UsedCapacity\'&(!parttype|parttype==\'Thick Lun\')))';

                param['filter_name'] = '(name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\')';
                param['keys'] = ['serialnb','sstype'];
                //param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = '3600';

                CallGet.CallGet(param, function(param) {
                    var UsableCapacityItem = {};
                    UsableCapacityItem["UsedCapacity"] = 0;
                    UsableCapacityItem["PoolFreeCapacity"] = 0;
                    UsableCapacityItem["FreeCapacity"] = 0;

                    for ( var i in param.result ) {
                        var item = param.result[i];

                        UsableCapacityItem["UsedCapacity"] += Math.round( item.UsedCapacity );
                        UsableCapacityItem["PoolFreeCapacity"] += Math.round( item.PoolFreeCapacity );
                        UsableCapacityItem["FreeCapacity"] += Math.round( item.FreeCapacity ); 
                        arg1["ConfiguredUsableCapacity"] = UsableCapacityItem; 


                    }
                    callback(null,arg1);
                });

            },
            // Used Capacity by Type ( File / Block / Virtual / HDFS / Object )
            function(arg1,  callback){  

                var param = {};
                param['filter'] = baseFilter + '&!parttype';

                param['filter_name'] = '(name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'VirtualUsedCapacity\')';
                param['keys'] = ['serialnb','sstype'];
                //param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = '3600';

                CallGet.CallGet(param, function(param) {
                    var UsableCapacityItem = {};
                    UsableCapacityItem["BlockUsedCapacity"] = 0;
                    UsableCapacityItem["FileUsedCapacity"] = 0;
                    UsableCapacityItem["VirtualUsedCapacity"] = 0;
                    UsableCapacityItem["HDFSUsedCapacity"] = 0;
                    UsableCapacityItem["ObjectUsedCapacity"] = 0;
                    for ( var i in param.result ) {
                        var item = param.result[i]; 
                        item.BlockUsedCapacity = (item.BlockUsedCapacity === undefined ? 0 : item.BlockUsedCapacity );
                        item.FileUsedCapacity = (item.FileUsedCapacity === undefined ? 0 : item.FileUsedCapacity );
                        item.HDFSUsedCapacity = (item.HDFSUsedCapacity === undefined ? 0 : item.HDFSUsedCapacity );
                        item.ObjectUsedCapacity = (item.ObjectUsedCapacity === undefined ? 0 : item.ObjectUsedCapacity );
                        item.VirtualUsedCapacity = (item.VirtualUsedCapacity === undefined ? 0 : item.VirtualUsedCapacity );

                        UsableCapacityItem["BlockUsedCapacity"] += Math.round( item.BlockUsedCapacity );
                        UsableCapacityItem["FileUsedCapacity"] += Math.round( item.FileUsedCapacity );
                        UsableCapacityItem["VirtualUsedCapacity"] += Math.round( item.VirtualUsedCapacity ); 
                        UsableCapacityItem["HDFSUsedCapacity"] += Math.round( item.HDFSUsedCapacity );
                        UsableCapacityItem["ObjectUsedCapacity"] += Math.round( item.ObjectUsedCapacity ); 
                        arg1["UsedCapacityByType"] = UsableCapacityItem; 
  
                    }
                    callback(null,arg1);
                });

            },
            // Used Capacity by Type ( File / Block / Virtual / HDFS / Object )
            function(arg1,  callback){  

                var param = {};
                param['filter'] = baseFilter + '&datatype=\'File\'&!parttype';

                param['filter_name'] = '(name=\'NASFSOverheadCapacity\'|name=\'NASPoolFreeCapacity\'|name=\'NASSnapshotCapacity\'|name=\'NASFSCapacity\'|name=\'NASFSUsedCapacity\'|name=\'NASFSFreeCapacity\')';
                param['keys'] = ['serialnb','sstype'];
                //param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = '3600';

                CallGet.CallGet(param, function(param) {
                    var NASCapacityItem = {};
                    NASCapacityItem["NASFSOverheadCapacity"] = 0;
                    NASCapacityItem["NASPoolFreeCapacity"] = 0;
                    NASCapacityItem["NASSnapshotCapacity"] = 0;
                    NASCapacityItem["NASFSCapacity"] = 0;


                    var NASFSCapacityItem = {};
                    NASFSCapacityItem["NASFSUsedCapacity"] = 0;
                    NASFSCapacityItem["NASFSFreeCapacity"] = 0;  


                    for ( var i in param.result ) {
                        var item = param.result[i];

                        item.NASFSOverheadCapacity = (item.NASFSOverheadCapacity === undefined ? 0 : item.NASFSOverheadCapacity );
                        item.NASPoolFreeCapacity = (item.NASPoolFreeCapacity === undefined ? 0 : item.NASPoolFreeCapacity );
                        item.NASSnapshotCapacity = (item.NASSnapshotCapacity === undefined ? 0 : item.NASSnapshotCapacity );
                        item.NASFSCapacity = (item.NASFSCapacity === undefined ? 0 : item.NASFSCapacity );

                        NASCapacityItem["NASFSOverheadCapacity"] += Math.round( item.NASFSOverheadCapacity );
                        NASCapacityItem["NASPoolFreeCapacity"] += Math.round( item.NASPoolFreeCapacity );
                        NASCapacityItem["NASSnapshotCapacity"] += Math.round( item.NASSnapshotCapacity ); 
                        NASCapacityItem["NASFSCapacity"] += Math.round( item.NASFSCapacity ); 
                        arg1["FileUsedCapacity"] = NASCapacityItem; 
 
                        NASFSCapacityItem["NASFSUsedCapacity"] += Math.round( item.NASFSUsedCapacity );
                        NASFSCapacityItem["NASFSFreeCapacity"] += Math.round( item.NASFSFreeCapacity ); 
                        arg1["NASFSCapacity"] = NASFSCapacityItem; 
 
                    }
                    callback(null,arg1);
                });

            }
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

}


function GetArrayCapacity(device , callback) {
 
            //var baseFilter = '!vstatus==\'inactive\'&((source==\'VNXBlock-Collector\'|source==\'VNXFile-Collector\'|source==\'VNXUnity-Collector\')|(datatype==\'Block\'&!(devtype==\'VirtualStorage\'&source==\'VMAX-Collector\')))'
            var baseFilter = '!devtype==\'VirtualStorage\''
                if ( device !== undefined )
            baseFilter = 'serialnb=\'' + device  + '\'&(' + baseFilter + ')';

        async.waterfall([
            // Raw Capacity
            function(callback){ 
                var resultRecord = [];

                var param = {};
                param['filter'] = baseFilter + '&datatype=\'Block\'&!parttype';
 

                param['filter_name'] = '(name=\'RawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnusableCapacity\')';
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = '3600';

                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        var outputItem = {};
                        outputItem["serialnb"] = item.serialnb;
                        outputItem["sstype"] = item.sstype;
                        var rawCapacityItem = {};
                        rawCapacityItem["RawCapacity"] = Math.round( item.RawCapacity );
                        rawCapacityItem["UnconfiguredCapacity"] = Math.round( item.UnconfiguredCapacity );
                        rawCapacityItem["ConfiguredUsableCapacity"] = Math.round( item.ConfiguredUsableCapacity );
                        rawCapacityItem["HotSpareCapacity"] = Math.round( item.HotSpareCapacity );
                        rawCapacityItem["RAIDOverheadCapacity"] = Math.round( item.RAIDOverheadCapacity );
                        rawCapacityItem["UnusableCapacity"] = Math.round( item.UnusableCapacity );
                        outputItem["RawCapacity"] = rawCapacityItem;
                        resultRecord.push(outputItem);

                    } 
                    callback(null,resultRecord);
                });
            }, 
            // Usable Capacity
            function(arg1,  callback){  

                var param = {};
                param['filter'] = baseFilter + '&datatype=\'Block\'&((name==\'FreeCapacity\'&!parttype)|(name==\'PoolFreeCapacity\'&!parttype)|(name==\'UsedCapacity\'&(!parttype|parttype==\'Thick Lun\')))';

                param['filter_name'] = '(name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\')';
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = '3600';

                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        for ( var j in arg1 ) {
                            var outputItem = arg1[j];
                            if ( outputItem.serialnb == item.serialnb ) {
                                var UsableCapacityItem = {};
                                UsableCapacityItem["UsedCapacity"] = Math.round( item.UsedCapacity );
                                UsableCapacityItem["PoolFreeCapacity"] = Math.round( item.PoolFreeCapacity );
                                UsableCapacityItem["FreeCapacity"] = Math.round( item.FreeCapacity ); 
                                outputItem["ConfiguredUsableCapacity"] = UsableCapacityItem; 
                            }
                        }

                    }
                    callback(null,arg1);
                });

            },
            // Used Capacity by Type ( File / Block / Virtual / HDFS / Object )
            function(arg1,  callback){  

                var param = {};
                param['filter'] = baseFilter + '&!parttype';

                param['filter_name'] = '(name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'VirtualUsedCapacity\')';
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = '3600';

                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        for ( var j in arg1 ) {
                            var outputItem = arg1[j];
                            if ( outputItem.serialnb == item.serialnb ) {
                                var UsableCapacityItem = {};
                                UsableCapacityItem["BlockUsedCapacity"] = Math.round( item.BlockUsedCapacity );
                                UsableCapacityItem["FileUsedCapacity"] = Math.round( item.FileUsedCapacity );
                                UsableCapacityItem["VirtualUsedCapacity"] = Math.round( item.VirtualUsedCapacity ); 
                                UsableCapacityItem["HDFSUsedCapacity"] = Math.round( item.HDFSUsedCapacity );
                                UsableCapacityItem["ObjectUsedCapacity"] = Math.round( item.ObjectUsedCapacity ); 
                                outputItem["UsedCapacityByType"] = UsableCapacityItem; 

                            }
                        }
                    }
                    callback(null,arg1);
                });

            },
            // Used Capacity by Type ( File / Block / Virtual / HDFS / Object )
            function(arg1,  callback){  

                var param = {};
                param['filter'] = baseFilter + '&datatype=\'File\'&!parttype';

                param['filter_name'] = '(name=\'NASFSOverheadCapacity\'|name=\'NASPoolFreeCapacity\'|name=\'NASSnapshotCapacity\'|name=\'NASFSCapacity\'|name=\'NASFSUsedCapacity\'|name=\'NASFSFreeCapacity\')';
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = '3600';

                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        for ( var j in arg1 ) {
                            var outputItem = arg1[j];
                            if ( outputItem.serialnb == item.serialnb ) { 

                                var NASCapacityItem = {};
                                NASCapacityItem["NASFSOverheadCapacity"] = Math.round( item.NASFSOverheadCapacity );
                                NASCapacityItem["NASPoolFreeCapacity"] = Math.round( item.NASPoolFreeCapacity );
                                NASCapacityItem["NASSnapshotCapacity"] = Math.round( item.NASSnapshotCapacity ); 
                                NASCapacityItem["NASFSCapacity"] = Math.round( item.NASFSCapacity ); 
                                outputItem["FileUsedCapacity"] = NASCapacityItem; 


                                var NASFSCapacityItem = {};
                                NASFSCapacityItem["NASFSUsedCapacity"] = Math.round( item.NASFSUsedCapacity );
                                NASFSCapacityItem["NASFSFreeCapacity"] = Math.round( item.NASFSFreeCapacity ); 
                                outputItem["NASFSCapacity"] = NASFSCapacityItem; 



                            }
                        }
                    }
                    callback(null,arg1);
                });

            }
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

}

 function getArrayCapacityTrend(device, startDate , endDate, callback) {
 
        var config = configger.load();
        //var start = '2016-06-20T18:30:00+08:00'
        //var end = '2016-07-01T18:30:00+08:00'
        var start = ( startDate === undefined ? util.getPerfStartTime() : startDate);
        var end = ( endDate === undefined ? util.getPerfEndTime() : endDate);

        var filterbase = '!parttype'; 


        //var baseFilter = '!vstatus==\'inactive\'&((source==\'VNXBlock-Collector\'|source==\'VNXFile-Collector\'|source==\'VNXUnity-Collector\')|(datatype==\'Block\'&!(devtype==\'VirtualStorage\'&source==\'VMAX-Collector\')))'
        var baseFilter = '!devtype==\'VirtualStorage\''
        if ( device !== undefined )
            baseFilter = 'serialnb=\'' + device  + '\'&(' + baseFilter + ')';




        async.waterfall([
            function(callback){ 

                var param = {};
                param['filter_name'] = '(name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\'|name=\'RawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnusableCapacity\')';
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','devdesc','sstype','vendor','model','name'];
                param['period'] = '86400';
                param['filter'] = baseFilter + '&datatype=\'Block\'&!parttype' + '&'+ param.filter_name;


                var queryString =  {'properties': param.fields, 'filter': param.filter, 'start': start , 'end': end , period:  param.period}; 
 

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
                                for ( var i in resultRecord.values ) {
                                    var item = resultRecord.values[i];

                                    item.properties["part"] = item.properties.device;
                                }
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(arg1,  callback){  
               var result = util.convertSRMPerformanceStruct(arg1);

               callback(null,result);

            },
            function(arg1, callback) {

                // Calculate the capacity allocation growth rate
                for ( var i in arg1 ) {
                    var arrayItem = arg1[i];

                    var matrics = arrayItem.matrics;
                    var T1allocateCapacity = 0;
                    var T1Item ;

                    for ( var j in matrics ) {
                        var matricsItem = matrics[j];
                        matricsItem["AllocateGrowthRate"] = 0;
                        var T2allocateCapacity = parseFloat(matricsItem.BlockUsedCapacity) + parseFloat(matricsItem.FileUsedCapacity);
 
                        if ( j==0 ) {
                            T1Item = matricsItem;
                            T1allocateCapacity = parseFloat(T1Item.BlockUsedCapacity) + parseFloat(T1Item.FileUsedCapacity);
                            matricsItem.AllocateGrowthRate = 0;
                        } else {
                            console.log(T2allocateCapacity+"\t"+T1allocateCapacity);
                            matricsItem.AllocateGrowthRate = Math.round(( ( T2allocateCapacity - T1allocateCapacity ) / T1allocateCapacity * 100 ) *100 ) /100;
                        }
                    }



                }
                callback(null,arg1);                
                                    
            }
        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           //var r = JSON.parse(result);
           callback(result);
        });


 

         
    };
