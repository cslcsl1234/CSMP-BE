"use strict";

var async = require('async');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');
var util = require('./util');

module.exports = {
    GetArrays,
    GetPools,
    GetNodes,
    GetDisks,
    GetNamespaces,
    GetReplicateGroups
}

/*
    * Get a Arrays list.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

*/
function GetArrays(vdcname, callback) {

    var param = {};
    if (typeof vdcname !== 'undefined') {
        param['filter'] = 'device=\'' + vdcname + '\'&datagrp=\'ECS_OBJECT_VDC_CAPACITY\'&!parttype';
    } else {
        param['filter'] = 'datagrp=\'ECS_OBJECT_VDC_CAPACITY\'&!parttype';
    }

    param['filter_name'] = '(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'UsedCapacity\')';
    param['keys'] = ['device'];
    param['fields'] = ['sstype', 'arraytyp', 'device', 'serialnb', 'model', 'devdesc', 'vendor'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');

    console.log(param);
    async.waterfall([
        function (callback) {
            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];
                    item["UsedPercent"] = (item.UsedCapacity / item.Capacity).toFixed(2) * 100;

                    item.UsedCapacity = parseFloat(item.UsedCapacity).toFixed(2);
                    item.Capacity = parseFloat(item.Capacity).toFixed(2);
                    item.FreeCapacity = parseFloat(item.FreeCapacity).toFixed(2);
                }
                callback(null, param);
            });

        }
    ], function (err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};

function GetPools(vdcname, callback) {

    var param = {};
    if (typeof vdcname !== 'undefined') {
        param['filter'] = 'systemid=\'' + vdcname + '\'&parttype=\'Storage Pool\'&source=\'ECS\'';
    } else {
        param['filter'] = 'parttype=\'Storage Pool\'&source=\'ECS\'';
    }

    param['filter_name'] = '(name=\'DiskReadBandwidth\'|name=\'DiskWriteBandwidth\'|name=\'GeoReadBandwidth\'|name=\'GeoWriteBandwidth\'|name=\'Capacity\'|name=\'FreeCapacity\'|name=\'UsedCapacity\'|name=\'GeoCache\'|name=\'GeoCopy\'|name=\'SystemMetadata\'|name=\'LocalProtection\'|name=\'UserData\')';
    param['keys'] = ['systemid', 'poolid'];
    param['fields'] = ['systemid', 'poolid', 'poolname', 'coldsto', 'name'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');

    async.waterfall([
        function (callback) {
            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];
                    item["UsedPercent"] = (item.UsedCapacity / item.Capacity).toFixed(2) * 100;

                    item.UsedCapacity = parseFloat(item.UsedCapacity).toFixed(2);
                    item.Capacity = parseFloat(item.Capacity).toFixed(2);
                    item.FreeCapacity = parseFloat(item.FreeCapacity).toFixed(2);
                    item.GeoCache = parseFloat(item.GeoCache).toFixed(2);
                    item.GeoCopy = parseFloat(item.GeoCopy).toFixed(2);
                    item.SystemMetadata = parseFloat(item.SystemMetadata).toFixed(2);
                    item.LocalProtection = parseFloat(item.LocalProtection).toFixed(2);
                    item.UserData = parseFloat(item.UserData).toFixed(2);
                }
                callback(null, param.result);
            });

        },
        function (pools, callback) {
            var poolid;
            GetNodes(vdcname, poolid, function (nodes) {
                for (var i in nodes) {
                    var nodeItem = nodes[i];

                    for (var j in pools) {
                        var poolItem = pools[j];
                        //console.log(`${poolItem.systemid} == ${nodeItem.systemid} && ${poolItem.poolid} == ${nodeItem.poolid}`)
                        if (poolItem.systemid == nodeItem.systemid && poolItem.poolid == nodeItem.poolid) {
                            if (poolItem.nodes === undefined) poolItem.nodes = [];
                            poolItem.nodes.push(nodeItem);
                            break;
                        }
                    }
                }

                callback(null, pools);
            })
        }
    ], function (err, result) {
        // result now equals 'done'
        callback(result);
    });

};





function GetNodes(vdcname, poolid, callback) {

    var param = {};
    if (typeof vdcname !== 'undefined') {
        if (poolid === undefined)
            param['filter'] = 'systemid=\'' + vdcname + '\'&parttype=\'Node\'&source=\'ECS\'';
        else
            param['filter'] = 'systemid=\'' + vdcname + '\'&poolid=\'' + poolid + '\'&parttype=\'Node\'&source=\'ECS\'';
    } else {
        param['filter'] = 'parttype=\'Node\'&source=\'ECS\'';
    }

    param['filter_name'] = '(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'UsedCapacity\')';
    param['keys'] = ['systemid', 'nodeid'];
    param['fields'] = ['systemid', 'nodeid', 'nodename', 'poolname', 'poolid', 'rackid', 'devdesc', 'ip', 'name'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');

    async.waterfall([
        function (callback) {
            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];
                    item["UsedPercent"] = (item.UsedCapacity / item.Capacity).toFixed(2) * 100;

                    item.UsedCapacity = parseFloat(item.UsedCapacity).toFixed(2);
                    item.Capacity = parseFloat(item.Capacity).toFixed(2);
                    item.FreeCapacity = parseFloat(item.FreeCapacity).toFixed(2);
                }
                callback(null, param.result);
            });

        },
        function (nodes, callback) {
            var poolid;
            GetDisks(vdcname, poolid, function (disks) {
                for (var i in disks) {
                    var diskItem = disks[i];

                    for (var j in nodes) {
                        var nodeItem = nodes[j];
                        if (nodeItem.systemid == diskItem.systemid && nodeItem.nodeid == diskItem.nodeid) {
                            if (nodeItem.disks === undefined) {
                                nodeItem["diskcount"] = 0;
                                nodeItem.disks = [];
                            }
                            nodeItem.disks.push(diskItem);
                            nodeItem.diskcount++;
                            break;
                        }
                    }
                }

                callback(null, nodes);
            })
        }
    ], function (err, result) {
        // result now equals 'done'
        callback(result);
    });

};


function GetDisks(vdcname, nodeid, callback) {

    var param = {};
    if (typeof vdcname !== 'undefined') {
        if (nodeid === undefined)
            param['filter'] = 'systemid=\'' + vdcname + '\'&parttype=\'Disk\'&source=\'ECS\'';
        else
            param['filter'] = 'systemid=\'' + vdcname + '\'&nodeid=\'' + nodeid + '\'&parttype=\'Disk\'&source=\'ECS\'';
    } else {
        param['filter'] = 'parttype=\'Disk\'&source=\'ECS\'';
    }
    param['filter_name'] = '(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'UsedCapacity\'|name=\'health\')';
    param['keys'] = ['systemid', 'part'];
    param['fields'] = ['nodeid', 'nodename', 'poolname', 'poolid', 'status', 'ip', 'name'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');

    async.waterfall([
        function (callback) {
            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];
                    item["UsedPercent"] = ((item.UsedCapacity / item.Capacity) * 100).toFixed(2);

                    item.UsedCapacity = parseFloat(item.UsedCapacity).toFixed(2);
                    item.Capacity = parseFloat(item.Capacity).toFixed(2);
                    item.FreeCapacity = parseFloat(item.FreeCapacity).toFixed(2);
                }
                callback(null, param);
            });

        }
    ], function (err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};




function GetNamespaces(vdcname, callback) {

    var param = {};
    if (typeof vdcname !== 'undefined') {
        param['filter'] = 'systemid=\'' + vdcname + '\'&parttype=\'Namespace\'&source=\'ECS\'';
    } else {
        param['filter'] = 'parttype=\'Namespace\'&source=\'ECS\'';
    }

    param['filter_name'] = '(name=\'BucketCount\'|name=\'UsedObjectCount\'|name=\'UsedCapacity\'|name=\'UsedObjectCount\'|name=\'Quota\')';
    param['keys'] = ['systemid', 'ns'];
    param['fields'] = ['datagrp'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');

    async.waterfall([
        function (callback) {
            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];
                    if　( item.Quota !== undefined )
                        item["QuotaUsagePercent"] = ((item.UsedCapacity / item.Quota) * 100).toFixed(2); 
                    
                    item.UsedCapacity = parseFloat(item.UsedCapacity).toFixed(2);
                }
                callback(null, param);
            });

        }
    ], function (err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};




function GetReplicateGroups(vdcname, callback) {
 
    async.waterfall([
        function (callback) {
            var param = {};
            if (typeof vdcname !== 'undefined') {
                param['filter'] = 'device=\'' + vdcname + '\'&parttype=\'Replication Group\'&source=\'ECS\'';
            } else {
                param['filter'] = 'parttype=\'Replication Group\'&source=\'ECS\'';
            }
         
            param['keys'] = ['device', 'rgname'];
            param['fields'] = ['numsites']; 
            param['filter_name'] = '(name=\'BucketCount\'|name=\'IngressBandwidth\'|name=\'UsedCapacity\'|name=\'EgressBandwidth\'|name=\'RgRpo\')'; 
            param['period'] = 3600;
            param['start'] = util.getConfStartTime('1d');
        
 
            CallGet.CallGet(param, function (param) {  
                callback(null, param.result);
            });

        },
        function (rgs, callback) {
            var param = {};
            if (typeof vdcname !== 'undefined') {
                param['filter'] = 'systemid=\'' + vdcname + '\'&parttype=\'RG VDC Mapping\'&source=\'ECS\'';
            } else {
                param['filter'] = 'parttype=\'RG VDC Mapping\'&source=\'ECS\'';
            }
         
            param['keys'] = ['device', 'rgname','remzone'];
            param['fields'] = ['numsites']; 
            param['filter_name'] = '(name=\'zoneRPO\'|name=\'IngressBandwidth\'|name=\'BootstrapProgress\'|name=\'EgressBandwidth\'|name=\'Availability\')'; 
            param['period'] = 3600;
            param['start'] = util.getConfStartTime('1d');
        
 
            CallGet.CallGet(param, function (param) {  
                for ( var i in param.result　)　{
                    var item = param.result[i];  
                    for ( var j in rgs ) {
                        var rgItem = rgs[j];
                        if ( rgItem.device == item.device && rgItem.rgname == item.rgname ) {
                            if ( rgItem.remzone === undefined ) rgItem.remzone = item.remzone;
                            else rgItem.remzone += ','+item.remzone;

                            
                            if ( rgItem.remzones === undefined ) rgItem.remzones = [];
                            rgItem.remzones.push(item);

                        }
                    }


                }
  
                callback(null, rgs);
            });

        } ,
        function( rgs, callback ) {
            var param = {};
            if (typeof vdcname !== 'undefined') {
                param['filter'] = 'systemid=\'' + vdcname + '\'&parttype=\'RG SP Mapping\'&source=\'ECS\'';
            } else {
                param['filter'] = 'parttype=\'RG SP Mapping\'&source=\'ECS\'';
            }
         
            param['keys'] = ['device', 'rgname' ];
            param['fields'] = ['poolid','poolname']; 
             
            CallGet.CallGet(param, function (param) {  
                for ( var i in param.result　)　{
                    var item = param.result[i]; 
 
                    for ( var j in rgs ) {
                        var rgItem = rgs[j];
                        if ( rgItem.device == item.device && rgItem.rgname == item.rgname ) { 
                            if ( rgItem.poolname === undefined ) {
                                rgItem.poolname = item.poolname;
                            } else {
                                rgItem.poolname += ','+item.poolname;
                            }  

                            if ( rgItem.storagepool === undefined ) rgItem.storagepool = [];
                            rgItem.storagepool.push(item);
                        }
                    } 
                }

                callback(null, rgs);
            });
        } 
    ], function (err, result) {
        // result now equals 'done'
        callback(result);
    });


}; 