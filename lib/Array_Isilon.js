"use strict";

var async = require('async'); 
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var util = require('./util'); 

module.exports = {
    GetArrays ,
    GetNodes,
    GetDisks,
    GetFileSystems,
    GetShares,
    GetInterfaces,
    GetQuotas,
    GetSnapshots,
    GetStoragePools
}

/*
    * Get a Arrays list.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

*/
function GetArrays(device, callback) {

 
    var param = {}; 
    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&datagrp=\'ISILON2-SAF\'&!parttype';
    } else {
        param['filter'] = 'datagrp=\'ISILON2-SAF\'&!parttype';
    }

    param['filter_name'] = '(name=\'NASFSUsedCapacity\'|name=\'NASFSFreeCapacity\'|name=\'NASFSCapacity\')';
    param['keys'] = ['device'];
    param['fields'] = ['arraytyp','device','serialnb','model','devdesc','vendor'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');
 
    async.waterfall([
        function(callback) {
            CallGet.CallGet(param, function(param) { 
                for ( var i in param.result ) {
                    var item = param.result[i]; 
                    item.NASFSUsedCapacity = parseFloat(item.NASFSUsedCapacity).toFixed(2);
                    item.NASFSCapacity = parseFloat(item.NASFSCapacity).toFixed(2);
                    item.NASFSFreeCapacity = parseFloat(item.NASFSFreeCapacity).toFixed(2);

                    item["UsedPercent"] = ((item.NASFSUsedCapacity / item.NASFSCapacity) * 100).toFixed(2); 
                }
                callback(null, param);
            }); 

        } 
    ], function(err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};
 



function GetDisks(device, callback) {

 
    var param = {}; 
    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&source=\'Isilon-Collector\'&parttype=\'Disk\'';
    } else {
        param['filter'] = 'source=\'Isilon-Collector\'&parttype=\'Disk\'';
    }

    param['filter_name'] = '(name=\'RawCapacity\'|name=\'Availability\'|name=\'Busy\'|name=\'AccessLatency\'|name=\'ReadThroughput\'|name=\'WriteThroughput\'|name=\'ReadRequests\'|name=\'WriteRequests\')';
    param['keys'] = ['device','node','part'];
    param['fields'] = ['disktype'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');
 
    async.waterfall([
        function(callback) {
            CallGet.CallGet(param, function(param) { 
                for ( var i in param.result ) {
                    var item = param.result[i]; 
                    item.RawCapacity = parseFloat(item.RawCapacity).toFixed(2);
                    item.ReadThroughput = parseFloat(item.ReadThroughput).toFixed(2);
                    item.WriteThroughput = parseFloat(item.WriteThroughput).toFixed(2);
                    item.ReadRequests = parseFloat(item.ReadRequests).toFixed(2);
                    item.WriteRequests = parseFloat(item.WriteRequests).toFixed(2);
                    item.AccessLatency = parseFloat(item.AccessLatency).toFixed(2); 
 
                }
                callback(null, param);
            }); 

        } 
    ], function(err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};
 



function GetInterfaces(device, callback) {

 
    var param = {}; 
    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&source=\'Isilon-Collector\'&parttype=\'Interface\'';
    } else {
        param['filter'] = 'source=\'Isilon-Collector\'&parttype=\'Interface\'';
    }

    // ifInOctets = Read Bandwidth (Mb/s)
    // ifOutOctets = Write Bandwidth (Mb/s)
    // ifInErrors = In Errors (Pkts/s)
    // ifOutErrors = Out Errors (Pkts/s)
    // ifInPkts = In Packets (Pkts/s)
    // ifOutPkts = Out Packets (Pkts/s)
    param['filter_name'] = '(name=\'Availability\'|name=\'ifInOctets\'|name=\'ifOutOctets\'|name=\'ifOutErrors\'|name=\'ifInErrors\'|name=\'ifInPkts\'|name=\'ifOutPkts\')';
    param['keys'] = ['device','node','part'];
    param['fields'] = ['serialnb','host','devdesc'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');
 
    async.waterfall([
        function(callback) {
            CallGet.CallGet(param, function(param) { 
                for ( var i in param.result ) {
                    var item = param.result[i]; 
                    item.Availability = parseInt(parseFloat(item.Availability)*100)/100
                    item.ifInOctets = parseInt(parseFloat(item.ifInOctets)*100)/100
                    item.ifOutOctets = parseInt(parseFloat(item.ifOutOctets)*100)/100
                    item.ifOutErrors = parseInt(parseFloat(item.ifOutErrors)*100)/100
                    item.ifInErrors = parseInt(parseFloat(item.ifInErrors)*100)/100
                    item.ifInPkts = parseInt(parseFloat(item.ifInPkts)*100)/100
                    item.ifOutPkts = parseInt(parseFloat(item.ifOutPkts)*100)/100 


                    if ( item.part.indexOf('agg') >=0 ) {
                        item['isAgg'] = true;
                    } else 
                        item['isAgg'] = false;
                }
                callback(null, param);
            }); 

        } 
    ], function(err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};
 


function GetShares(device, callback) { 
 
    var param = {}; 
    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&source=\'Isilon-Collector\'&(parttype=\'NfsExport\'|parttype=\'CifsShare\')';
        //param['filter'] = 'device=\'' + device + '\'&source=\'Isilon-Collector\'&(parttype=\'NfsExport\')';
    } else {
        param['filter'] = 'source=\'Isilon-Collector\'&(parttype=\'NfsExport\'|parttype=\'CifsShare\')';
        //param['filter'] = 'source=\'Isilon-Collector\'&(parttype=\'NfsExport\')';
    }
 
    param['keys'] = ['device','part','parttype'];
    param['fields'] = ['clients','partdesc'];
    
    async.waterfall([
        function(callback) {
            //CallGet.CallGet(param, function(param) {  
            CallGet.CallGet_SingleField(param, function(param) {  
                callback(null, param.result);
            });  
        } ,
        function(arg1, callback) {
            var newResult = [];
            for ( var i in arg1 ) {
                var item1 = arg1[i];

                for ( var j in arg1 ) {
                    if ( i == j ) continue;
                    var item2 = arg1[j];

                    if ( item1.device == item2.device && item1.part == item2.part ) {
                        delete arg1[j];
                        for ( var key in item1 ) {  
                            if ( key=='device' | key=='part' ) continue;
                            item1[key] += ','+item2[key];  
                        }
                        break;
                    } 

                }

            }
            for ( var i in arg1 ) {
                if ( arg1[i] != null ) newResult.push(arg1[i])
            }
            callback(null, newResult);
        }
    ], function(err, result) {
        // result now equals 'done'
        callback(result);
    });

};
 




function GetFileSystems(device, callback) {
 
    async.waterfall([
        
        function(callback) {

            var param = {}; 
            if (typeof device !== 'undefined') {
                param['filter'] = 'device=\'' + device + '\'&source=\'Isilon-Collector\'&parttype=\'FileSystem\'&datagrp=\'ISILON2-NODE-METRICS\'';
            } else {
                param['filter'] = 'source=\'Isilon-Collector\'&parttype=\'FileSystem\'&datagrp=\'ISILON2-NODE-METRICS\'';
            }
        
            param['filter_name'] = '(name=\'NodeCapacity\'|name=\'NodeFreeCapacity\'|name=\'NodeUsedCapacity\'|name=\'CurrentUtilization\')';
            param['keys'] = ['device','part','node'];
            param['fields'] = ['host','devdesc','nodeid'];
            param['period'] = 3600;
            param['start'] = util.getConfStartTime('1d');
            
            var fsList = {};

            CallGet.CallGet(param, function(param) { 
                for ( var i in param.result ) {
                    var item = param.result[i]; 
                    item.NodeCapacity = parseInt(parseFloat(item.NodeCapacity)*100)/100
                    item.NodeFreeCapacity = parseInt(parseFloat(item.NodeFreeCapacity)*100)/100
                    item.NodeUsedCapacity = parseInt(parseFloat(item.NodeUsedCapacity)*100)/100
                    item.CurrentUtilization = parseInt(parseFloat(item.CurrentUtilization)*100)/100

                    var key = item.device+item.part.replace(/\//g,'');
                    //logger.info("====="+key+"===="+item.node);
                    if ( fsList[key] === undefined ) {
                        var fsItem = {};
                        fsItem["device"] = item.device;
                        fsItem["part"] = item.part; 
                        fsItem['host'] = item.host;
                        fsItem['devdesc'] = item.devdesc; 
                        fsItem['Capacity'] = item.NodeCapacity;
                        fsItem['FreeCapacity'] = item.NodeFreeCapacity;
                        fsItem['UsedCapacity'] = item.NodeUsedCapacity;
                        
                        fsItem["nodes"] = [];
                        fsList[key] = fsItem;
                    } else {
                        fsList[key]['Capacity'] += item.NodeCapacity;
                        fsList[key]['FreeCapacity'] += item.NodeFreeCapacity;
                        fsList[key]['UsedCapacity'] += item.NodeUsedCapacity;
                    }
                    fsList[key].nodes.push(item);

                } 
                //logger.info(JSON.stringify(fsList,2,2)) 
                var fsResult = [];
                for ( var i in fsList ) {
                    var item = fsList[i]; 
                    fsResult.push(item); 
                }
                callback(null, fsResult);
            }); 
        }
    ], function(err, result) {
        // result now equals 'done'
        callback(result);
    });

};
 


function GetNodes(device, callback) {
 
    async.waterfall([
        
        function(callback) {

            var param = {}; 
            if (typeof device !== 'undefined') {
                param['filter'] = 'device=\'' + device + '\'&source=\'Isilon-Collector\'&parttype=\'Node\'';
            } else {
                param['filter'] = 'source=\'Isilon-Collector\'&parttype=\'Node\'';
            }
        
            param['filter_name'] = '(name=\'WriteThroughput\'|name=\'ReadThroughput\'|name=\'HDDCapacity\'|name=\'SSDCapacity\'|name=\'HDDFreeCapacity\'|name=\'HDDUsedCapacity\'|name=\'SSDFreeCapacity\'|name=\'SSDUsedCapacity\'|name=\'CurrentUtilization\')';
            param['keys'] = ['device','node'];
            param['fields'] = ['nodemdl','host','serial','serialnb','devdesc','nodeid'];
            param['period'] = 3600;
            param['start'] = util.getConfStartTime('1d');
             
            CallGet.CallGet(param, function(param) { 
                for ( var i in param.result ) {
                    var item = param.result[i]; 
                    item.WriteThroughput = parseInt(parseFloat(item.WriteThroughput)*100)/100
                    item.ReadThroughput = parseInt(parseFloat(item.ReadThroughput)*100)/100
                    item.HDDCapacity = parseInt(parseFloat(item.HDDCapacity)*100)/100
                    item.SSDCapacity = parseInt(parseFloat(item.SSDCapacity)*100)/100

                    item.HDDFreeCapacity = parseInt(parseFloat(item.HDDFreeCapacity)*100)/100
                    item.HDDUsedCapacity = parseInt(parseFloat(item.HDDUsedCapacity)*100)/100
                    item.SSDFreeCapacity = parseInt(parseFloat(item.SSDFreeCapacity)*100)/100
                    item.SSDUsedCapacity = parseInt(parseFloat(item.SSDUsedCapacity)*100)/100
                    item.CurrentUtilization = parseInt(parseFloat(item.CurrentUtilization)*100)/100
 
                }
                callback(null, param.result);
            }); 
        },
        function(nodes, callback) {
            GetDisks(device,function(disks) {
                for ( var i in disks ) {
                    var item = disks[i];
                    for ( var j in nodes ) {
                        var nodeItem = nodes[j];
                        if ( nodeItem.device == item.device & nodeItem.node == item.node ) {
                            if ( nodeItem['disks'] == undefined ) nodeItem['disks'] = [];
                            nodeItem.disks.push(item);
                        }
                    }
                }
                callback(null, nodes);
            })
        },
        function(nodes, callback) {
            GetInterfaces(device,function(interfances) {
                for ( var i in interfances ) {
                    var item = interfances[i];
                    for ( var j in nodes ) {
                        var nodeItem = nodes[j];
                        if ( nodeItem.device == item.device & nodeItem.node == item.node ) {
                            if ( nodeItem['interfances'] == undefined ) nodeItem['interfances'] = [];
                            nodeItem.interfances.push(item);
                        }
                    }
                }
                callback(null, nodes);
            })
        }
    ], function(err, result) {
        // result now equals 'done'
        callback(result);
    });




};
 



function GetQuotas(device, callback) {
 
    var param = {}; 
    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&source=\'Isilon-Collector\'&parttype=\'Quota\'';
    } else {
        param['filter'] = 'source=\'Isilon-Collector\'&parttype=\'Quota\'';
    }

    param['filter_name'] = '(name=\'LogicalCapacity\'|name=\'PhysicalCapacity\'|name=\'SoftQuotaCurrentUtilization\'|name=\'SoftThresholdCapacity\'|name=\'HardQuotaCurrentUtilization\'|name=\'HardLimitCapacity\')';
    param['keys'] = [ 'device' , 'part' ];
    param['fields'] = ['qtasnap','partdesc'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');
 
    async.waterfall([
        function(callback) {
            CallGet.CallGet(param, function(param) {  
                for ( var i in param.result ) {
                    var item = param.result[i]; 
                    item.LogicalCapacity = parseFloat(item.LogicalCapacity).toFixed(2);
                    item.PhysicalCapacity = parseFloat(item.PhysicalCapacity).toFixed(2);
                    item.SoftQuotaCurrentUtilization = parseFloat(item.SoftQuotaCurrentUtilization).toFixed(2);
                    item.SoftThresholdCapacity = parseFloat(item.SoftThresholdCapacity).toFixed(2);
                    item.HardQuotaCurrentUtilization = parseFloat(item.HardQuotaCurrentUtilization).toFixed(2);
                    item.HardLimitCapacity = parseFloat(item.HardLimitCapacity).toFixed(2); 
 
                } 
                callback(null, param);
            }); 

        } 
    ], function(err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};
 


function GetSnapshots(device, callback) {
 
    var param = {}; 
    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&source=\'Isilon-Collector\'&parttype=\'Snapshot\'';
    } else {
        param['filter'] = '!vstatus==\'inactive\'&source=\'Isilon-Collector\'&parttype=\'Snapshot\'';
    }

    param['filter_name'] = '(name=\'Capacity\')';
    param['keys'] = [ 'device' , 'part' ];
    param['fields'] = ['qtasnap','partdesc','module'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');
 
    async.waterfall([
        function(callback) {
            CallGet.CallGet(param, function(param) {  
                for ( var i in param.result ) {
                    var item = param.result[i]; 
                    item.Capacity = parseFloat(item.Capacity).toFixed(2); 
 
                } 
                callback(null, param);
            }); 

        } 
    ], function(err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};
 


function GetStoragePools(device, callback) {
 
    var param = {}; 
    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&source=\'Isilon-Collector\'&parttype=\'Storage Pool\'';
    } else {
        param['filter'] = '!vstatus==\'inactive\'&source=\'Isilon-Collector\'&parttype=\'Storage Pool\'';
    }

    param['filter_name'] = '(name=\'UsedCapacity\'|name=\'SubscribedCapacity\'|name=\'State\'|name=\'SSDFreeCapacity\'|name=\'OversubscribedCapacity\'|name=\'NPTotalSSDCapacity\'|name=\'NPFreeSSDCapacity\'|name=\'HotSpareCapacity\'|name=\'HDDFreeCapacity\'|name=\'FreeCapacity\'|name=\'FileUsedCapacity\'|name=\'CurrentUtilization\'|name=\'Capacity\')';
    param['keys'] = [ 'device' , 'part' ];
    param['fields'] = ['pooltype','manual','lnns','protect','l3','children','parent'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');
 
    async.waterfall([
        function(callback) {
            CallGet.CallGet(param, function(param) {  
                callback(null, param);
            }); 

        } 
    ], function(err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};
 