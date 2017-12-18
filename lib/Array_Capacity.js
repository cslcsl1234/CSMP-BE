"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');  
var util = require('./util');   

module.exports = {
    GetArrayCapacity
}



function GetArrayCapacity(device, callback) {

        var baseFilter = '!vstatus==\'inactive\'&((source==\'VNXBlock-Collector\'|source==\'VNXFile-Collector\'|source==\'VNXUnity-Collector\')|(datatype==\'Block\'&!devtype==\'VirtualStorage\'&source==\'VMAX-Collector\'))'
        if ( device !== undefined )
            baseFilter = 'serialnb=\'' + device  + '\'&(' + baseFilter + ')';

        async.waterfall([
            // Raw Capacity
            function(callback){ 
                var resultRecord = [];

                var param = {};
                param['filter'] = baseFilter + '&!parttype';
 

                param['filter_name'] = '(name=\'RawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnusableCapacity\')';
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','devdesc','sstype','vendor','model'];

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
                param['filter'] = baseFilter + '&(name==\'FreeCapacity\'&!parttype|name==\'PoolFreeCapacity\'&!parttype|name==\'UsedCapacity\'&(!parttype|parttype==\'Thick Lun\'))';
 

                param['filter_name'] = '(name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\')';
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','devdesc','sstype','vendor','model'];

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

                param['filter_name'] = '(name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'VirtualUsedCapacity\'|name=\'HDFSUsedCapacity\'|name=\'ObjectUsedCapacity\'|name=\'NASFSOverheadCapacity\'|name=\'NASPoolFreeCapacity\'|name=\'NASSnapshotCapacity\'|name=\'NASFSCapacity\'|name=\'NASFSUsedCapacity\'|name=\'NASFSFreeCapacity\')';
                param['keys'] = ['serialnb'];
                param['fields'] = ['device','devdesc','sstype','vendor','model'];

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

            },
        ], function (err, result) {
           // result now equals 'done'
           //  

           callback(result);
        });

}

