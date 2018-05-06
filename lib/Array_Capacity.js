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
    getArrayCapacityTrend,
    CombineCapacity
}

function GetArrayTotalCapacity(periodType, callback) {
        
        if ( periodType !== undefined ) {
            switch ( periodType ) {
                case "lastyear":
                    var period = 604800; 
                    var d = new Date();
                    d.setFullYear(d.getFullYear() - 1);
                    var lastYearDay =  util.getFirstDayofMonth(d);
                    var start = lastYearDay.firstDay;
                    var end =  lastYearDay.lastDay;
                    break;
                case "lastmonth":
                    var period = 86400; 

                    var d = new Date() - 3600*24*30;
                    var lastYearDay =  util.getFirstDayofMonth(d);
                    var start = lastYearDay.firstDay; 
                    var end =  lastYearDay.lastDay;
                    break;                   

                default :
                    var period = 3600; 
                    var start = util.getPerfStartTime();
                    var end =  util.getPerfEndTime();
                    break;                   
            }
        } else {
            var period = 3600; 
            var start = util.getPerfStartTime();
            var end =  util.getPerfEndTime();            
        }
 
        var baseFilter = '!devtype==\'VirtualStorage\''

        var finalResult={};
        finalResult["Detail"] = [];

        async.waterfall([
            // Raw Capacity
            function(callback){ 
                var resultRecord = [];

                var param = {};
                param['filter'] = baseFilter + '&datatype=\'Block\'&!parttype';

                param['filter_name'] = '(name=\'RawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnusableCapacity\')';
                param['keys'] = ['serialnb','sstype'];
                //param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = period;
                param['start'] = start;
                param['end'] = end; 

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

                        item.RawCapacity = ( (item.RawCapacity === undefined | item.RawCapacity == 'n/a') ? 0 : item.RawCapacity );
                        item.UnconfiguredCapacity = ((item.UnconfiguredCapacity === undefined  | item.UnconfiguredCapacity == 'n/a') ? 0 : item.UnconfiguredCapacity );
                        item.ConfiguredUsableCapacity = ((item.ConfiguredUsableCapacity === undefined  | item.ConfiguredUsableCapacity == 'n/a') ? 0 : item.ConfiguredUsableCapacity );
                        item.HotSpareCapacity = ((item.HotSpareCapacity === undefined  | item.HotSpareCapacity == 'n/a') ? 0 : item.HotSpareCapacity );
                        item.RAIDOverheadCapacity = ((item.RAIDOverheadCapacity === undefined  | item.RAIDOverheadCapacity == 'n/a') ? 0 : item.RAIDOverheadCapacity );
                        item.UnusableCapacity = ((item.UnusableCapacity === undefined  | item.UnusableCapacity == 'n/a') ? 0 : item.UnusableCapacity );

 
                        var outputItem = {}; 
                        rawCapacityItem["RawCapacity"] += Math.round( item.RawCapacity );
                        rawCapacityItem["UnconfiguredCapacity"] += Math.round( item.UnconfiguredCapacity );
                        rawCapacityItem["ConfiguredUsableCapacity"] += Math.round( item.ConfiguredUsableCapacity );
                        rawCapacityItem["HotSpareCapacity"] += Math.round( item.HotSpareCapacity );
                        rawCapacityItem["RAIDOverheadCapacity"] += Math.round( item.RAIDOverheadCapacity );
                        rawCapacityItem["UnusableCapacity"] += Math.round( item.UnusableCapacity );
                        outputItem["LastTS"] = item.LastTS;
                        outputItem["RawCapacity"] = rawCapacityItem;


                        var outputItem1 = {}; 
                        outputItem1["device"] = item.serialnb;
                        outputItem1["sstype"] = item.sstype;
                        var rawCapacityItem1 = {};
                        rawCapacityItem1["RawCapacity"] = Math.round( item.RawCapacity );
                        rawCapacityItem1["UnconfiguredCapacity"] = Math.round( item.UnconfiguredCapacity );
                        rawCapacityItem1["ConfiguredUsableCapacity"] = Math.round( item.ConfiguredUsableCapacity );
                        rawCapacityItem1["HotSpareCapacity"] = Math.round( item.HotSpareCapacity );
                        rawCapacityItem1["RAIDOverheadCapacity"] = Math.round( item.RAIDOverheadCapacity );
                        rawCapacityItem1["UnusableCapacity"] = Math.round( item.UnusableCapacity );
                        outputItem1["LastTS"] = item.LastTS;
                        outputItem1["RawCapacity"] = rawCapacityItem1;

                        finalResult.Detail.push(outputItem1);

                    } 

                    finalResult["Total"] = outputItem; 
                    callback(null,finalResult);
                });
            }, 
            // Usable Capacity
            function(result,  callback){  

                var arg1 = result.Total;

                var param = {};
                param['filter'] = baseFilter + '&datatype=\'Block\'&((name==\'FreeCapacity\'&!parttype)|(name==\'PoolFreeCapacity\'&!parttype)|(name==\'UsedCapacity\'&(!parttype|parttype==\'Thick Lun\')))';

                param['filter_name'] = '(name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\')';
                param['keys'] = ['serialnb','sstype'];
                //param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = period;
                param['start'] = start;
                param['end'] = end; 

                CallGet.CallGet(param, function(param) {
                    var UsableCapacityItem = {};
                    UsableCapacityItem["UsedCapacity"] = 0;
                    UsableCapacityItem["PoolFreeCapacity"] = 0;
                    UsableCapacityItem["FreeCapacity"] = 0;

                    for ( var i in param.result ) {
                        var item = param.result[i];

                        item.UsedCapacity = ((item.UsedCapacity === undefined   | item.UsedCapacity == 'n/a') ? 0 : item.UsedCapacity );
                        item.PoolFreeCapacity = ((item.PoolFreeCapacity === undefined   | item.PoolFreeCapacity == 'n/a') ? 0 : item.PoolFreeCapacity );
                        item.FreeCapacity = ((item.FreeCapacity === undefined   | item.FreeCapacity == 'n/a') ? 0 : item.FreeCapacity );

                        UsableCapacityItem["UsedCapacity"] += Math.round( item.UsedCapacity );
                        UsableCapacityItem["PoolFreeCapacity"] += Math.round( item.PoolFreeCapacity );
                        UsableCapacityItem["FreeCapacity"] += Math.round( item.FreeCapacity ); 
                        arg1["ConfiguredUsableCapacity"] = UsableCapacityItem; 

                        var UsableCapacityItem1 = {};
                        UsableCapacityItem1["UsedCapacity"] = Math.round( item.UsedCapacity );
                        UsableCapacityItem1["PoolFreeCapacity"] = Math.round( item.PoolFreeCapacity );
                        UsableCapacityItem1["FreeCapacity"] = Math.round( item.FreeCapacity ); 
                        for ( var j in result.Detail ) {
                            var itemRes = result.Detail[j];
                            if ( itemRes.device == item.serialnb ) {
                                itemRes["ConfiguredUsableCapacity"] = UsableCapacityItem1;
                                break;
                            }
                        }


                    } 
                    callback(null,finalResult);
                });

            },
            // Used Capacity by Type ( File / Block / Virtual / HDFS / Object )
            function(result,  callback){  

                var arg1 = result.Total;

                var param = {};
                param['filter'] = baseFilter + '&!parttype';

                param['filter_name'] = '(name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'VirtualUsedCapacity\')';
                param['keys'] = ['serialnb','sstype'];
                //param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = period;
                param['start'] = start;
                param['end'] = end; 

                CallGet.CallGet(param, function(param) {
                    var UsableCapacityItem = {};
                    UsableCapacityItem["BlockUsedCapacity"] = 0;
                    UsableCapacityItem["FileUsedCapacity"] = 0;
                    UsableCapacityItem["VirtualUsedCapacity"] = 0;
                    UsableCapacityItem["HDFSUsedCapacity"] = 0;
                    UsableCapacityItem["ObjectUsedCapacity"] = 0;
                    for ( var i in param.result ) {
                        var item = param.result[i]; 
                        item.BlockUsedCapacity = ((item.BlockUsedCapacity === undefined   | item.BlockUsedCapacity == 'n/a') ? 0 : item.BlockUsedCapacity );
                        item.FileUsedCapacity = ((item.FileUsedCapacity === undefined  | item.FileUsedCapacity == 'n/a') ? 0 : item.FileUsedCapacity );
                        item.HDFSUsedCapacity = ((item.HDFSUsedCapacity === undefined  | item.HDFSUsedCapacity == 'n/a') ? 0 : item.HDFSUsedCapacity );
                        item.ObjectUsedCapacity = ((item.ObjectUsedCapacity === undefined  | item.ObjectUsedCapacity == 'n/a') ? 0 : item.ObjectUsedCapacity );
                        item.VirtualUsedCapacity = ((item.VirtualUsedCapacity === undefined  | item.VirtualUsedCapacity == 'n/a') ? 0 : item.VirtualUsedCapacity );

                        UsableCapacityItem["BlockUsedCapacity"] += Math.round( item.BlockUsedCapacity );
                        UsableCapacityItem["FileUsedCapacity"] += Math.round( item.FileUsedCapacity );
                        UsableCapacityItem["VirtualUsedCapacity"] += Math.round( item.VirtualUsedCapacity ); 
                        UsableCapacityItem["HDFSUsedCapacity"] += Math.round( item.HDFSUsedCapacity );
                        UsableCapacityItem["ObjectUsedCapacity"] += Math.round( item.ObjectUsedCapacity ); 
                        arg1["UsedCapacityByType"] = UsableCapacityItem; 
  

                        var UsableCapacityItem1 = {};
                        UsableCapacityItem1["BlockUsedCapacity"] = Math.round( item.BlockUsedCapacity );
                        UsableCapacityItem1["FileUsedCapacity"] = Math.round( item.FileUsedCapacity );
                        UsableCapacityItem1["VirtualUsedCapacity"] = Math.round( item.VirtualUsedCapacity ); 
                        UsableCapacityItem1["HDFSUsedCapacity"] = Math.round( item.HDFSUsedCapacity );
                        UsableCapacityItem1["ObjectUsedCapacity"] = Math.round( item.ObjectUsedCapacity ); 
                        arg1["UsedCapacityByType"] = UsableCapacityItem; 
  
                        for ( var j in result.Detail ) {
                            var itemRes = result.Detail[j];
                            if ( itemRes.device == item.serialnb ) {
                                itemRes["UsedCapacityByType"] = UsableCapacityItem1;
                                break;
                            }
                        }




                    } 
                    callback(null,finalResult);
                });

            },
            // Used Capacity by Type ( File / Block / Virtual / HDFS / Object )
            function(result,  callback){  

                var arg1 = result.Total;
                var param = {};
                param['filter'] = baseFilter + '&datatype=\'File\'&!parttype';

                param['filter_name'] = '(name=\'NASFSOverheadCapacity\'|name=\'NASPoolFreeCapacity\'|name=\'NASSnapshotCapacity\'|name=\'NASFSCapacity\'|name=\'NASFSUsedCapacity\'|name=\'NASFSFreeCapacity\')';
                param['keys'] = ['serialnb','sstype'];
                //param['fields'] = ['device','devdesc','sstype','vendor','model'];
                param['period'] = period;
                param['start'] = start;
                param['end'] = end; 

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

                        item.NASFSOverheadCapacity = ((item.NASFSOverheadCapacity === undefined  | item.NASFSOverheadCapacity == 'n/a') ? 0 : item.NASFSOverheadCapacity );
                        item.NASPoolFreeCapacity = ((item.NASPoolFreeCapacity === undefined  | item.NASPoolFreeCapacity == 'n/a') ? 0 : item.NASPoolFreeCapacity );
                        item.NASSnapshotCapacity = ((item.NASSnapshotCapacity === undefined  | item.NASSnapshotCapacity == 'n/a') ? 0 : item.NASSnapshotCapacity );
                        item.NASFSCapacity = ((item.NASFSCapacity === undefined  | item.NASFSCapacity == 'n/a') ? 0 : item.NASFSCapacity );

                        NASCapacityItem["NASFSOverheadCapacity"] += Math.round( item.NASFSOverheadCapacity );
                        NASCapacityItem["NASPoolFreeCapacity"] += Math.round( item.NASPoolFreeCapacity );
                        NASCapacityItem["NASSnapshotCapacity"] += Math.round( item.NASSnapshotCapacity ); 
                        NASCapacityItem["NASFSCapacity"] += Math.round( item.NASFSCapacity ); 
                        arg1["FileUsedCapacity"] = NASCapacityItem; 
 
                        NASFSCapacityItem["NASFSUsedCapacity"] += Math.round( item.NASFSUsedCapacity );
                        NASFSCapacityItem["NASFSFreeCapacity"] += Math.round( item.NASFSFreeCapacity ); 
                        arg1["NASFSCapacity"] = NASFSCapacityItem; 

                        var NASCapacityItem1 = {};
                        NASCapacityItem1["NASFSOverheadCapacity"] = Math.round( item.NASFSOverheadCapacity );
                        NASCapacityItem1["NASPoolFreeCapacity"] = Math.round( item.NASPoolFreeCapacity );
                        NASCapacityItem1["NASSnapshotCapacity"] = Math.round( item.NASSnapshotCapacity ); 
                        NASCapacityItem1["NASFSCapacity"] = Math.round( item.NASFSCapacity ); 
                        arg1["FileUsedCapacity"] = NASCapacityItem1; 
 
                        var NASFSCapacityItem1 = {};
                        NASFSCapacityItem1["NASFSUsedCapacity"] = Math.round( item.NASFSUsedCapacity );
                        NASFSCapacityItem1["NASFSFreeCapacity"] = Math.round( item.NASFSFreeCapacity ); 
                        arg1["NASFSCapacity"] = NASFSCapacityItem1; 
                        for ( var j in result.Detail ) {
                            var itemRes = result.Detail[j];
                            if ( itemRes.device == item.serialnb ) {
                                itemRes["FileUsedCapacity"] = NASCapacityItem1;
                                itemRes["NASFSCapacity"] = NASFSCapacityItem1;
                                break;
                            }
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

}



function CombineCapacity(capacity) {

        var arg1 = capacity;

        var result = {};
        var RawCapacity = {};

        if ( arg1 === undefined ) return result;

        if ( arg1.FileUsedCapacity!==undefined ) {
            var NASPoolFreeCapacity   = arg1.FileUsedCapacity.NASPoolFreeCapacity;
            var NASFSOverheadCapacity = arg1.FileUsedCapacity.NASFSOverheadCapacity;
            var NASSnapshotCapacity   = arg1.FileUsedCapacity.NASSnapshotCapacity;
            var NASFSCapacity         = arg1.FileUsedCapacity.NASFSCapacity;
        } else {
            var NASPoolFreeCapacity = 0;
            var NASFSOverheadCapacity = 0;
            var NASSnapshotCapacity = 0;
            var NASFSCapacity = 0;

        }

        RawCapacity["RawCapacityTB"] = Math.round((arg1.RawCapacity.RawCapacity- NASPoolFreeCapacity)/1024*100)/100;
        RawCapacity["ConfiguredRawCapacityTB"] = Math.round((arg1.RawCapacity.ConfiguredUsableCapacity + arg1.RawCapacity.RAIDOverheadCapacity)/1024*100)/100;
        RawCapacity["UnconfiguredRawCapacityTB"] = Math.round(arg1.RawCapacity.UnconfiguredCapacity/1024*100)/100;
        RawCapacity["HotSpareCapacityTB"] = Math.round(arg1.RawCapacity.HotSpareCapacity/1024*100)/100;
        RawCapacity["UnusableCapacityTB"] = Math.round(arg1.RawCapacity.UnusableCapacity/1024*100)/100;

        RawCapacity["RawCapacityGB"] = Math.round(arg1.RawCapacity.RawCapacity*100)/100 - NASPoolFreeCapacity ;
        RawCapacity["ConfiguredRawCapacityGB"] = {};
        RawCapacity["UnconfiguredRawCapacityGB"] = Math.round(arg1.RawCapacity.UnconfiguredCapacity*100)/100;
        RawCapacity["HotSpareCapacityGB"] = Math.round(arg1.RawCapacity.HotSpareCapacity*100)/100;
        RawCapacity["UnusableCapacityGB"] = Math.round(arg1.RawCapacity.UnusableCapacity*100)/100;

        result["LastTS"] = arg1.LastTS;
        if ( arg1.device !== undefined ) 
            result["device"] = arg1.device;
        if ( arg1.sstype !== undefined ) 
            result["sstype"] = arg1.sstype;

        result["RawCapacity"] = RawCapacity;

        //
        // ConfiguredRawCapacity
        //  
        RawCapacity.ConfiguredRawCapacityGB["ConfiguredUsable"] = {};
        RawCapacity.ConfiguredRawCapacityGB["RAIDOverhead"] = arg1.RawCapacity.RAIDOverheadCapacity;
        RawCapacity.ConfiguredRawCapacityGB["Total"] = Math.round((arg1.RawCapacity.ConfiguredUsableCapacity + arg1.RawCapacity.RAIDOverheadCapacity)*100)/100 - NASPoolFreeCapacity ;
         
        //
        // ConfiguredUsableCapacity
        //  
        RawCapacity.ConfiguredRawCapacityGB.ConfiguredUsable["Allocated"] = {};
        RawCapacity.ConfiguredRawCapacityGB.ConfiguredUsable["AllocateUsable"] = {};
        RawCapacity.ConfiguredRawCapacityGB.ConfiguredUsable["Total"] = arg1.RawCapacity.ConfiguredUsableCapacity - NASPoolFreeCapacity ;
                         
        //
        // UsedCapacity
        // 
        var UsedCapacity = {};
        if ( arg1.UsedCapacityByType !== undefined ) {


            UsedCapacity["BlockUsed"] = (arg1.UsedCapacityByType.BlockUsedCapacity === undefined ? 0 : arg1.UsedCapacityByType.BlockUsedCapacity);
            UsedCapacity["FileUsed"] = {};
            UsedCapacity["VirtualUsed"] = !arg1.UsedCapacityByType.VirtualUsedCapacity ? 0 : arg1.UsedCapacityByType.VirtualUsedCapacity;
            UsedCapacity["HDFSUsed"] = !arg1.UsedCapacityByType.HDFSUsedCapacity ? 0 : arg1.UsedCapacityByType.HDFSUsedCapacity;
            UsedCapacity["ObjectUsed"] = !arg1.UsedCapacityByType.ObjectUsedCapacity  ? 0 : arg1.UsedCapacityByType.ObjectUsedCapacity;
            UsedCapacity["Total"] = arg1.ConfiguredUsableCapacity.UsedCapacity - NASPoolFreeCapacity ;                                      
            RawCapacity.ConfiguredRawCapacityGB.ConfiguredUsable.Allocated = UsedCapacity;

            // FileUsed
            var FileUsed = {};
            FileUsed["NASFSOverheadCapacity"] = NASFSOverheadCapacity;
            //FileUsed["NASPoolFreeCapacity"] = NASPoolFreeCapacity;
            FileUsed["NASSnapshotCapacity"] = NASSnapshotCapacity;
            FileUsed["NASFSCapacity"] = {};
            FileUsed["Total"] = (!arg1.UsedCapacityByType.FileUsedCapacity ? 0 : arg1.UsedCapacityByType.FileUsedCapacity) - NASPoolFreeCapacity;
            UsedCapacity.FileUsed = FileUsed;
 
            // NASFSCapacity
            
            var FileCapacity = (arg1.NASFSCapacity===undefined?{}:arg1.NASFSCapacity);
            FileCapacity["Total"] = NASFSCapacity;
            FileUsed.NASFSCapacity = FileCapacity;
        }
       
        // AllocateUsable = BlockPoolFree + FileUsedCapacity.NASPoolFreeCapacity + ConfiguredUsableCapacity.FreeCapacity
        var AllocateUsable = {};
        //AllocateUsable["BlockPoolFree"] = arg1.ConfiguredUsableCapacity.PoolFreeCapacity - NASPoolFreeCapacity;
        AllocateUsable["BlockPoolFree"] = arg1.ConfiguredUsableCapacity.PoolFreeCapacity;
        AllocateUsable["NASPoolFree"] = NASPoolFreeCapacity;
        AllocateUsable["ConfiguredUsableFree"] = arg1.ConfiguredUsableCapacity.FreeCapacity;
        AllocateUsable["Total"] = AllocateUsable.BlockPoolFree  + AllocateUsable.NASPoolFree + AllocateUsable.ConfiguredUsableFree;
        RawCapacity.ConfiguredRawCapacityGB.ConfiguredUsable.AllocateUsable = AllocateUsable;

        return result;

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
                                //console.log(response.raw_body);   
                                var resultRecord = response.raw_body;
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
                            //console.log(T2allocateCapacity+"\t"+T1allocateCapacity);
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
