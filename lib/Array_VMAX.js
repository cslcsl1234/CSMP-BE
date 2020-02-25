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
var topos = require('./topos');
var MongoDBFunc = require('./MongoDBFunction');

module.exports = {
    GetArrays,
    GetArraysHistory,
    GetInitialGroups,
    GetDevices,
    GetFEPorts,
    GetFEPortsOnly,
    GetFEPortPerf,
    GetDirectorPerformance,
    GetMaskViews,
    GetAssignedHosts,
    GetAssignedHostsByDevices,
    getArrayPerformance,
    getArrayLunPerformance,
    getArrayLunGroupPerformance,
    getArrayLunPerformanceByList,
    getArrayLunPerformanceByListWithDT,
    GetAssignedVPlexByDevices,
    GetArrays_VMAX,
    convertPerformanceTemplateStruct,
    GetCapacity,
    GetDMXMasking,
    GetAssignedInitiatorByDevices,

    GetSRDFGroups,
    GetSRDFLunToReplica,
    GetStorageGroups,
    GetSGTop20ByCapacity,
    GetSGTop20ByUsedCapacityIncrease,
    GetStorageGroupsPerformance,
    GetFEPorts1,
    getArrayPerformanceV2,
    getArrayPerformanceV3,
    GetPorts,
    GetCloneLunToReplica,
    GetDiskPerformance,
    getArrayLunPerformance1

}

/*
    * Get a Arrays list.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

*/
function GetArrays_VMAX(device, callback) {


    var param = {};
    var arraysn = device;
    if (typeof arraysn !== 'undefined') {
        param['filter'] = 'device=\'' + arraysn + '\'&datatype==\'Block\'&!parttype';
    } else {
        param['filter'] = '!parttype&datatype==\'Block\'';
    }

    param['filter_name'] = '(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
    param['keys'] = ['device'];
    param['fields'] = ['sstype', 'device', 'model', 'vendor', 'devdesc'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');

    async.waterfall([
        function (callback) {
            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];

                    var ConfiguredUsableCapacity = item.ConfiguredUsableCapacity;
                    var UsedCapacity = item.UsedCapacity;
                    var UsedPercent = UsedCapacity / ConfiguredUsableCapacity * 100;
                    //console.log(item.device + '=' + UsedPercent.toFixed(0));
                    item['UsedPercent'] = UsedPercent.toFixed(2);

                    item.TotalMemory = Math.round(item.TotalMemory).toString();
                    item.TotalDisk = Math.round(item.TotalDisk).toString();
                    item.TotalLun = Math.round(item.TotalLun).toString();


                }
                callback(null, param);
            });



        },
        function (param, callback) {

            if (param.result.length > 0) {

                getArrayPerformance(function (result) {


                    for (var i in param.result) {
                        var item = param.result[i];
                        item['perf'] = [];

                        for (var j in result.values) {
                            var perfItem = result.values[j];

                            if (item.device == perfItem.properties.device) {
                                item.perf.push(perfItem);
                            }
                        }


                        //
                        // get specific a array infomation.
                        //
                        if (typeof arraysn !== 'undefined') {

                            ArrayObj.findOne({
                                "basicInfo.device": arraysn
                            }, function (err, doc) {
                                //system error.
                                if (err) {
                                    return done(err);
                                }
                                if (!doc) { //user doesn't exist.
                                    console.log("array is not exist. insert it.");

                                    param.result[0]['info'] = {};

                                } else {
                                    console.log("Array is exist!");

                                    param.result[0]['info'] = doc;

                                }
                                callback(null, param);
                            });
                        } else {
                            callback(null, param);
                        }


                    }

                });

            } else
                callback(null, param);

        },
        function (param, callback) {

            if (param.result.length > 0) {

                var eventParam = {};
                eventParam['filter'] = '!acknowledged&active=\'1\'&devtype=\'Array\'';
                GetEvents.GetEvents(eventParam, function (result) {

                    if (param.result.length > 0) {

                        for (var i in param.result) {
                            var item = param.result[i];
                            item['event'] = [];

                            for (var j in result) {
                                var eventItem = result[j];

                                if (item.device == eventItem.device) {
                                    item.event.push(eventItem);
                                }
                            }
                        }
                    } else {
                        item['event'] = [];
                    }


                    callback(null, param);
                });


            } else
                callback(null, param);


        }
    ], function (err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};

function GetArraysByDatacenter(datacenter, callback) {

    var device;
    GetArrays(device, function (result) {
        var filterResult = [];
        for (var i in result) {
            var item = result[i];
            if (item.datacenter == datacenter) {
                filterResult.push(item);
            }
        }
        callback(filterResult);
    });


}



function GetArrays(device, callback) {

    var param = {};
    var arraysn = device;
    if (typeof arraysn !== 'undefined') {
        //param['filter'] = 'device=\''+arraysn+'\'&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        param['filter'] = 'device=\'' + arraysn + '\'&source=\'VMAX-Collector\'';
    } else {
        //param['filter'] = '!parttype&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        param['filter'] = '!parttype&source=\'VMAX-Collector\'';
    }

    param['filter_name'] = '(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
    param['keys'] = ['device'];
    param['fields'] = ['sstype', 'device', 'model', 'vendor', 'devdesc'];
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');

    async.waterfall([
        function (callback) {

            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];

                    var ConfiguredUsableCapacity = item.ConfiguredUsableCapacity;
                    var UsedCapacity = item.UsedCapacity;
                    var UsedPercent = UsedCapacity / ConfiguredUsableCapacity * 100;
                    if (UsedPercent.toFixed(0) >= 99)
                        item['UsedPercent'] = UsedPercent.toFixed(2);
                    else
                        item['UsedPercent'] = UsedPercent.toFixed(0);

                    item.TotalMemory = Math.round(item.TotalMemory).toString();
                    item.TotalDisk = Math.round(item.TotalDisk).toString();
                    item.TotalLun = Math.round(item.TotalLun).toString();
                    item['sn'] = item.device;
                    var UsefulCapacity = Math.round(ConfiguredUsableCapacity) / 1024;

                    item['UsefulCapacity'] = UsefulCapacity.toFixed(1);
                }
                callback(null, param);
            });



        },
        // Get All Localtion Records
        function (param, callback) {

            util.GetLocaltion(function (locations) {
                param['Locations'] = locations;
                callback(null, param);

            });


        },
        function (param, callback) {

            // update by guozb for bypass get eventinfo;
            callback(null, param);

            /*
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
                */


        },
        function (param, callback) {

            // update by guozb for bypass get eventinfo;
            callback(null, param);

            /*
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
            */

        },
        // get customize info
        function (param, callback) {

            var locations = param.Locations;

            MongoDBFunc.GetArrayInfo(function (result) {

                for (var i in param.result) {
                    var item = param.result[i];


                    item['info'] = {};
                    var arraysn = item.device;
                    console.log("Begin get array info : " + arraysn);
                    for (var j in result) {
                        var infoItem = result[j];
                        if (infoItem.basicInfo.device == arraysn) {
                            var unitID = infoItem.basicInfo.UnitID;
                            for (var z in locations) {
                                if (unitID == locations[z].UnitID) {
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


                callback(null, param);

            });

        },
        // GET FEPort Count
        function (param, callback) {

            for (var i in param.result) {
                var item = param.result[i];
                item['TotalFEPort'] = 11;
            }
            callback(null, param);


        }
    ], function (err, result) {

        // result now equals 'done'
        callback(result.result);
    });

};




function GetArraysHistory(device, callback) {

    var param = {};
    var arraysn = device;
    if (typeof arraysn !== 'undefined') {
        //param['filter'] = 'device=\''+arraysn+'\'&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        param['filter'] = 'device=\'' + arraysn + '\'&source=\'VMAX-Collector\'';
    } else {
        //param['filter'] = '!parttype&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        param['filter'] = '!parttype&source=\'VMAX-Collector\'';
    }

    param['filter_name'] = '(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
    param['keys'] = ['device'];
    param['fields'] = ['sstype', 'device', 'model', 'vendor', 'devdesc'];
    param['period'] = 604800;
    var priodDateByMonth = util.getLastMonth();
    var PriodDateByYear = util.getLastYear();

    var finalResult = {};
    finalResult["PeriousMonth"] = [];
    finalResult["PeriousYear"] = [];

    async.waterfall([
        function (callback) {

            // Get History Data by Last Month;

            param['start'] = priodDateByMonth.firstDay;
            param['end'] = priodDateByMonth.lastDay;



            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];

                    var ConfiguredUsableCapacity = item.ConfiguredUsableCapacity;
                    var UsedCapacity = item.UsedCapacity;
                    var UsedPercent = UsedCapacity / ConfiguredUsableCapacity * 100;
                    if (UsedPercent.toFixed(0) >= 99)
                        item['UsedPercent'] = UsedPercent.toFixed(2);
                    else
                        item['UsedPercent'] = UsedPercent.toFixed(0);

                    item.TotalMemory = Math.round(item.TotalMemory).toString();
                    item.TotalDisk = Math.round(item.TotalDisk).toString();
                    item.TotalLun = Math.round(item.TotalLun).toString();
                    item['sn'] = item.device;
                    var UsefulCapacity = Math.round(ConfiguredUsableCapacity) / 1024;

                    item['UsefulCapacity'] = UsefulCapacity.toFixed(1);


                    finalResult["PeriousMonth"].push(item);
                }
                callback(null, finalResult);
            });



        },

        function (arg, callback) {

            // Get History Data by Last Year;

            param['start'] = PriodDateByYear.firstDay;
            param['end'] = PriodDateByYear.lastDay;



            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];

                    var ConfiguredUsableCapacity = item.ConfiguredUsableCapacity;
                    var UsedCapacity = item.UsedCapacity;
                    var UsedPercent = UsedCapacity / ConfiguredUsableCapacity * 100;
                    if (UsedPercent.toFixed(0) >= 99)
                        item['UsedPercent'] = UsedPercent.toFixed(2);
                    else
                        item['UsedPercent'] = UsedPercent.toFixed(0);

                    item.TotalMemory = Math.round(item.TotalMemory).toString();
                    item.TotalDisk = Math.round(item.TotalDisk).toString();
                    item.TotalLun = Math.round(item.TotalLun).toString();
                    item['sn'] = item.device;
                    var UsefulCapacity = Math.round(ConfiguredUsableCapacity) / 1024;

                    item['UsefulCapacity'] = UsefulCapacity.toFixed(1);
                    finalResult["PeriousYear"].push(item);
                }
                callback(null, arg);
            });



        }
    ], function (err, result) {

        // result now equals 'done'
        callback(result);
    });

};

/*
    * Get a host list have been assinged with the vmax.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

*/

function GetAssignedHosts(device, callback) {

    var finalResult = [];


    async.waterfall([

        // -- Get All of maskview list 
        function (callback) {
            GetMaskViews(device, function (result) {
                for (var i in result) {
                    var item = result[i];

                    for (var j in item.initgrp_member) {
                        var initItem = item.initgrp_member[j];

                        for (var z in item.portgrp_member) {
                            var feportItem = item.portgrp_member[z];

                            var finalResultItem = {};
                            finalResultItem['hba_wwn'] = initItem;
                            finalResultItem['array_port_wwn'] = feportItem.portwwn;
                            finalResultItem['array_port_name'] = feportItem.feport;
                            finalResultItem['array_port_throughput'] = feportItem.Throughput;
                            finalResultItem['array'] = feportItem.device;
                            finalResultItem['array_port_name'] = feportItem.feport;

                            finalResultItem['StorageGroup'] = item.sg_member;

                            finalResult.push(finalResultItem);
                        }
                    }

                }

                callback(null, finalResult);

            })
        },
        // -- Get all of initial group member list and rela with maskview 
        function (result, callback) {
            var hostname;
            host.GetHBAFlatRecord(hostname, function (hbalist) {


                for (var hosthba in hbalist) {
                    var hosthbaItem = hbalist[hosthba];

                    for (var i in result) {
                        var maskItem = result[i];

                        if (hosthbaItem.hba_wwn == maskItem.hba_wwn) {
                            maskItem['host'] = hosthbaItem;
                        }
                    }
                }

                callback(null, result);
            })
        }
    ], function (err, result) {
        // result now equals 'done'
        callback(result);
    });
};

/*
    * Get a masking view list info of the vmax.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

        [
          {
            "sgname": "lglov205_AIX_SG",
            "initgrp": "lglov205_AIX",
            "portgrp": "SRM_MDC_8F1",
            "masked": "true",
            "part": "SRM_MDC_lglov205_sym949_8F1",
            "mapped": "true",
            "name": "Capacity",
            "dirnport": "FA-8F:1",
            "device": "888973588727",
            "Capacity": "8.02148",
            "LastTS": "1467244800",
            "initgrp_member": [
              "10000000C979F479",
              "10000000C979F478"
            ],
            "sg_member": [
              {
                "poolname": "N/A",
                "sgname": "lglov205_AIX_SG",
                "purpose": "Primary",
                "partsn": "60000970888973588727533036323241",
                "part": "622A",
                "dgstype": "Thick",
                "name": "Availability",
                "poolemul": "FBA",
                "parttype": "LUN",
                "device": "888973588727",
                "config": "2-Way Mir",
                "Availability": "100.0",
                "LastTS": "1467244800",
                "Capacity": "0.00292969",
                "UsedCapacity": "0.00292969"
              }
            ]
        ]
*/


function GetMaskViews(device, callback) {

    if (typeof device !== 'undefined') {
        var arraysn = device;
    }

    var param = {};

    async.waterfall([

        // -- Get All of maskview list 
        function (callback) {

            param['filter_name'] = '(name=\'Capacity\')';
            param['keys'] = ['device', 'part'];
            //param['fields'] = ['device','part','initgrp','portgrp','dirnport','sgname','mapped','masked'];
            param['fields'] = ['device', 'part', 'initgrp', 'portgrp', 'dirnport', 'sgname'];

            if (typeof arraysn !== 'undefined') {
                param['filter'] = 'device=\'' + arraysn + '\'&(datagrp=\'VMAX-ACCESS\'&parttype=\'Access\')';
            } else {
                param['filter'] = '(datagrp=\'VMAX-ACCESS\'&parttype=\'Access\')';
            }
            param['period'] = 86400;
            param['valuetype'] = 'MAX';
            param['start'] = util.getConfStartTime('1w');
            param['type'] = 'last';

            CallGet.CallGet(param, function (param) {
                callback(null, param.result);
            });

        },
        // -- Get all of initial group member list and rela with maskview 
        function (result, callback) {

            GetInitialGroups(arraysn, function (initgrp_res) {

                for (var i in result) {
                    var item = result[i];
                    //item['initgrp_member'] = [];
                    for (var j in initgrp_res) {
                        var item_init = initgrp_res[j];
                        if ((item.device == item_init.device) &&
                            //( item.part == item_init.viewname ) &&
                            (item.initgrp == item_init.initgrp)
                        ) {
                            //console.log(item_init.device+'\t'+item_init.initgrp);
                            item['initgrp_member'] = item_init.initwwn;
                        }

                    }
                }

                callback(null, result);

            });

        },
        // -- Get all of FE Port list and rela with maskview's PG-Group
        function (result, callback) {

            GetFEPorts(arraysn, function (feport_res) {

                for (var i in result) {
                    var item = result[i];
                    item['portgrp_member'] = [];
                    if (item.dirnport != undefined) {
                        var feportMembers = item.dirnport.split('|');
                        for (var j in feportMembers) {
                            var fePortItem = feportMembers[j];

                            for (var z in feport_res) {
                                var fePortListItem = feport_res[z];
                                if (item.device == fePortListItem.device && fePortItem == fePortListItem.feport) {
                                    item['portgrp_member'].push(fePortListItem);
                                }
                            }

                        }
                    }

                }

                callback(null, result);

            });

        },
        // - Get All of luns in the Storage Group.
        function (result, callback) {

            GetStorageGroups(arraysn, function (sglist) {

                for (var j in sglist) {
                    var sgItem = sglist[j];

                    var isfind = false;
                    for (var i in result) {
                        var item = result[i];

                        if (item.device == sgItem.device && item.sgname == sgItem.sgname) {
                            isfind = true;
                            item['sg_member'] = sgItem.luns;
                        }

                    }
                    if (isfind == false) {
                        var newItem = {
                            "sgname": sgItem.sgname,
                            "initgrp": "NOIG",
                            "portgrp": "NOPG",
                            "part": "NOVIEW",
                            "name": "Capacity",
                            "dirnport": "",
                            "device": sgItem.device,
                            "initgrp_member": [],
                            "portgrp_member": [],
                            "sg_member": sgItem.luns
                        }
                        result.push(newItem);
                    }
                } 

                callback(null, result);

        });



}
    ],

function (err, result) {
    // result now equals 'done'
    callback(result);
});
};



function GetSRDFGroups(device, callback) {

    if (typeof device !== 'undefined') {
        var arraysn = device;
    }

    var param = {};

    async.waterfall([

        // -- Get All of maskview list 
        function (callback) {

            param['filter_name'] = '(name=\'PropertiesOnly\')';
            param['keys'] = ['device', 'part'];
            param['fields'] = ['srdfgpnm', 'srdfgpty', 'remarray', 'name', 'mtrostat', 'mtrowtns', 'mtrobias'];

            if (typeof arraysn !== 'undefined') {
                param['filter'] = 'device=\'' + arraysn + '\'&(source=\'VMAX-Collector\'&parttype=\'SRDFGroup\')';
            } else {
                param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'SRDFGroup\')';
            }


            CallGet.CallGet(param, function (param) {
                callback(null, param.result);
            });

        },
        // -- Get all of initial group member list and rela with maskview 
        function (result, callback) {



            callback(null, result);


        },
        // -- Get all of FE Port list and rela with maskview's PG-Group
        function (result, callback) {

            callback(null, result);


        }
    ],

        function (err, result) {
            // result now equals 'done'
            callback(result);
        });
};

function GetSRDFLunToReplica(device, callback) {

    if (typeof device !== undefined) {
        var arraysn = device;
    }

    var param = {};

    async.waterfall([

        // -- Get All of maskview list 
        function (callback) {

            //param['filter_name'] = '(name=\'StateOfReplica\'|name=\'StateOfSource\')';
            param['keys'] = ['device', 'part'];
            param['fields'] = ['srcarray', 'srclun', 'srdfgrpn', 'srdfrgrp', 'copytype', 'repltype', 'replloc', 'replstat', 'remarray', 'remlun', 'srdfmode', 'repltech', 'linkstct', 'linkstat', 'tgtstate'];
            //param['period'] = 3600;
            //param['start'] = util.getConfStartTime('1h');

            if (arraysn !== undefined) {
                param['filter'] = 'device=\'' + arraysn + '\'&!srdfgrpn=\'N/A\'&(source=\'VMAX-Collector\'&datagrp=\'VMAX-RDFREPLICAS\')';
            } else {
                param['filter'] = '(source=\'VMAX-Collector\'&!srdfgrpn=\'N/A\'&datagrp=\'VMAX-RDFREPLICAS\')';
            }


            CallGet.CallGet(param, function (param) {
                callback(null, param.result);
            });

        },
        // -- Get all of initial group member list and rela with maskview 
        function (result, callback) {

            var param = {};
            param['filter'] = '(parttype=\'LUN\')  ';
            //param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
            param['keys'] = ['device', 'part', 'parttype'];
            param['fields'] = ['sgname'];
            param['period'] = 3600;
            param['start'] = util.getConfStartTime('1h');

            if (device !== undefined) {
                param['filter'] = 'device=\'' + device + '\'&' + param['filter'];
            }

            CallGet.CallGet(param, function (param) {

                var res = param.result;
                var res1 = {};
                for (var i in res) {
                    var lunItem = res[i];
                    var device = lunItem.device;
                    if (res1[device] === undefined) res1[device] = [];
                    res1[device].push(lunItem);
                }

                for (var i in result) {
                    var rdfItem = result[i];
                    var Devices = res1[rdfItem.device];

                    for (var j in Devices) {
                        var lunItem = Devices[j];
                        if (rdfItem.device == lunItem.device && rdfItem.part == lunItem.part) {
                            rdfItem["sgname"] = lunItem.sgname;
                            break;
                        } else if (rdfItem.remarray == lunItem.device && rdfItem.remlun == lunItem.part) {
                            rdfItem["remsgname"] = lunItem.sgname;
                            break;
                        }
                    }

                }
                callback(null, result);


            });


        },
        // -- Get all of FE Port list and rela with maskview's PG-Group
        function (result, callback) {

            callback(null, result);


        }
    ],

        function (err, result) {
            // result now equals 'done'
            callback(result);
        });
};

function GetCloneLunToReplica(device, callback) {

    if (typeof device !== 'undefined') {
        var arraysn = device;
    }

    var param = {};

    async.waterfall([

        // -- Get All of maskview list 
        function (callback) {


            //param['filter_name'] = '(name=\'StateOfReplica\')';
            param['keys'] = ['device', 'part'];
            param['fields'] = ['srcarray', 'srclun', 'repltype', 'replstat', 'repltech'];
            param['period'] = 3600;
            param['start'] = util.getConfStartTime('1d');

            if (typeof arraysn !== 'undefined') {
                param['filter'] = 'device=\'' + arraysn + '\'&(source=\'VMAX-Collector\'&(datagrp=\'VMAX-CLONEREPLICAS\'))';
            } else {
                param['filter'] = '(source=\'VMAX-Collector\'&(datagrp=\'VMAX-CLONEREPLICAS\'))';
            }


            CallGet.CallGet(param, function (param) {
                callback(null, param.result);
            });

        },
        function (result, callback) {

            var finalResult = [];
            for (var i in result) {
                var item = result[i];

                item["remarray"] = item.device;
                item["remlun"] = item.part;
                item["remsgname"] = item.remsgname;
            }

            callback(null, result);
        }

    ],

        function (err, result) {
            // result now equals 'done'
            callback(result);
        });
};


function GetDMXMasking(device, callback) {

    if (typeof device !== 'undefined') {
        var arraysn = device;
    }

    var param = {};

    async.waterfall([

        // -- Get All of maskview list 
        function (callback) {

            param['filter_name'] = '(name=\'DMXMasking\')';
            param['keys'] = ['device', 'maskid'];
            param['fields'] = ['part', 'partsn', 'headname', 'director', 'port', 'disksize', 'diskrpm', 'hostname', 'initwwn', 'portwwn', 'config', 'dgstype'];
            param['period'] = 3600;
            param['start'] = util.getConfStartTime('1d');

            if (typeof arraysn !== 'undefined') {
                param['filter'] = 'device=\'' + arraysn + '\'&(datagrp=\'DMX-MASK\')';
            } else {
                param['filter'] = '(datagrp=\'DMX-MASK\')';
            }


            CallGet.CallGet(param, function (param) {
                callback(null, param.result);
            });

        },
        // -- Get all of initial group member list and rela with maskview 
        function (arg1, callback) {

            var hostv;
            host.GetHBAFlatRecord(hostv, function (result) {

                for (var j in arg1) {
                    var maskItem = arg1[j];
                    for (var i in result) {
                        var hbaItem = result[i];
                        if (hbaItem.hba_wwn.toUpperCase() == maskItem.initwwn.toUpperCase()) {
                            maskItem["host"] = hbaItem;
                            break;
                        }
                    }
                }

                callback(null, arg1);


            });


        },
        // -- Get all of FE Port list and rela with maskview's PG-Group
        function (result, callback) {


            callback(null, result);


        }
    ],

        function (err, result) {
            // result now equals 'done'
            callback(result);
        });
};





/*
    * Get a initial group info of the vmax.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

        [
          {
            "device": "888973588727",
            "initgrp": "lglac128_2e2b",
            "initwwn": [
              "10000000C9B82E2B",
              "10000000C9B82E2B"
            ]
          }
        ]
*/
function GetInitialGroups(arraysn, callback) {
    var initgrp_param = {};
    //initgrp_param['filter_name'] = '(name=\'PropertiesOnly\')';
    initgrp_param['keys'] = ['device', 'viewname', 'initgrp', 'initwwn'];
    //initgrp_param['fields'] = ['device'];

    initgrp_param['filter'] = '(source=\'VMAX-Collector\'&reltype=\'AccessToInitiatorPort\')';
    if (typeof arraysn !== 'undefined') {
        initgrp_param['filter'] = 'device=\'' + arraysn + '\'&' + initgrp_param.filter;
    }


    CallGet.CallGet(initgrp_param, function (initgrp_param) {
        var result = [];
        for (var i in initgrp_param.result) {
            var item = initgrp_param.result[i];
            var isFind = false;
            for (var j in result) {
                var resultItem = result[j];
                if (typeof resultItem.initwwn === 'undefined')
                    resultItem.initwwn = [];
                if (item.device == resultItem.device && item.initgrp == resultItem.initgrp) {
                    if (resultItem.initwwn.indexOf(item.initwwn) < 0) {
                        resultItem.initwwn.push(item.initwwn);

                    };
                    isFind = true;
                }
            }
            if (isFind == false) {
                var newItem = {};
                newItem['device'] = item.device;
                newItem['initgrp'] = item.initgrp;
                newItem['initwwn'] = [];
                newItem.initwwn.push(item.initwwn);
                result.push(newItem);
            }

        }
        callback(result);
    });

}

function GetSGTop20ByCapacity(callback) {
    var device;
    async.waterfall([
        function (callback) {

            GetStorageGroups(device, function (arg) {
                // sort sg by capacity
                for (var i in arg) {
                    var item = arg[i];
                    for (var j = 0; j < arg.length - 1 - i; j++) {
                        var item1 = arg[j];
                        if (arg[j].Capacity < arg[j + 1].Capacity) {
                            var temp = arg[j + 1];
                            arg[j + 1] = arg[j];
                            arg[j] = temp;
                        }
                    }

                }
                callback(null, arg);
            });
        },


        // Get Top 20 Record
        function (arg, callback) {
            var top10Result = [];
            for (var i = 0; i < 20; i++) {
                top10Result.push(arg[i]);
            }
            callback(null, top10Result);
        },
        function (arg, callback) {

            var param = {};
            param['filter_name'] = '(name=\'Capacity\'|name=\'UsedCapacity\')';
            param['keys'] = ['device', 'sgname'];
            param['fields'] = ['iolmstat', 'iolimit'];
            param['period'] = 604800;
            var priodDateByMonth = util.getLastMonth();
            var PriodDateByYear = util.getLastYear();
            param['type'] = 'last';

            param['start'] = PriodDateByYear.firstDay;
            param['end'] = PriodDateByYear.lastDay;

            param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
            if (typeof device !== 'undefined') {
                param['filter'] = 'device=\'' + device + '\'&' + param.filter;
            }

            CallGet.CallGet(param, function (param) {

                for (var i in arg) {
                    var item = arg[i];
                    delete item.luns;
                    for (var j in param.result) {
                        var hisItem = param.result[j];
                        if (item.device == hisItem.device && item.sgname == hisItem.sgname) {
                            item['CapacityLastYear'] = parseFloat(hisItem.Capacity);
                            item['UsedCapacityLastTear'] = parseFloat(hisItem.UsedCapacity);
                        }
                    }
                }
                callback(null, arg);
            });


        },
        function (arg, callback) {
            for (var i in arg) {
                delete arg[i].luns;
                delete arg[i].name;
                delete arg[i].iolmstat;
                delete arg[i].iolimit;
                delete arg[i].LastTS;
            }
            callback(null, arg);
        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        //  
        callback(result);
    });
}



function GetSGTop20ByUsedCapacityIncrease(callback) {
    var device;
    async.waterfall([
        function (callback) {

            GetStorageGroups(device, function (arg) {

                callback(null, arg);
            });
        },
        function (arg, callback) {

            var param = {};
            param['filter_name'] = '(name=\'Capacity\'|name=\'UsedCapacity\')';
            param['keys'] = ['device', 'sgname'];
            param['fields'] = ['iolmstat', 'iolimit'];
            param['period'] = 86400;
            var priodDateByMonth = util.getLastMonth();
            var PriodDateByYear = util.getLastYear();
            param['type'] = 'last';

            param['start'] = PriodDateByYear.firstDay;
            param['end'] = PriodDateByYear.lastDay;

            param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
            if (typeof device !== 'undefined') {
                param['filter'] = 'device=\'' + device + '\'&' + param.filter;
            }

            CallGet.CallGet(param, function (param) {

                for (var i in arg) {
                    var item = arg[i];
                    delete item.luns;
                    for (var j in param.result) {
                        var hisItem = param.result[j];
                        if (item.device == hisItem.device && item.sgname == hisItem.sgname) {
                            item['CapacityLastYear'] = (isNaN(parseFloat(hisItem.Capacity)) == true) ? 0 : parseFloat(hisItem.Capacity);
                            item['UsedCapacityLastTear'] = (isNaN(parseFloat(hisItem.UsedCapacity)) == true) ? 0 : parseFloat(hisItem.UsedCapacity);
                            item['IncreaseCapacity'] = item.Capacity - item.CapacityLastYear;
                        }
                    }
                }

                // sort sg by capacity
                for (var i in arg) {
                    var item = arg[i];
                    for (var j = 0; j < arg.length - 1 - i; j++) {
                        var item1 = arg[j];
                        if (arg[j].IncreaseCapacity < arg[j + 1].IncreaseCapacity) {
                            var temp = arg[j + 1];
                            arg[j + 1] = arg[j];
                            arg[j] = temp;
                        }
                    }

                }
                callback(null, arg);
            });


        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        //  


        callback(result);
    });
}


function GetStorageGroups(device, callback) {

    async.waterfall([
        function (callback) {

            var param = {};
            //param['filter'] = '(parttype=\'MetaMember\'|parttype=\'LUN\')';
            param['filter'] = '(parttype=\'LUN\')';
            //param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'PoolUsedCapacity\')';
            param['keys'] = ['device', 'part'];
            param['fields'] = ['model', 'parttype', 'config', 'poolemul', 'purpose', 'dgstype', 'poolname', 'partsn', 'sgname', 'ismasked', 'vmaxtype', 'disktype'];
            param['period'] = 604800;
            param['start'] = util.getConfStartTime('1d');

            if (device !== undefined) {
                param['filter'] = 'device=\'' + device + '\'&' + param['filter'];
            }


            CallGet.CallGet(param, function (param) {
                var luns = param.result;

                var lunRes = {};
                for (var i in luns) {
                    var item = luns[i];
                    if (lunRes[item.device] === undefined) lunRes[item.device] = [];
                    lunRes[item.device].push(item);
                }

                callback(null, lunRes);

            });
        },

        // Get Device Count each SG
        function (luns, callback) {
            var param = {};
            param['filter_name'] = '(name=\'SGLunCapacity\')';
            param['keys'] = ['device', 'sgname', 'lunname'];
            param['field'] = ['sgcount', 'iolimit'];
            param['period'] = 604800;
            param['type'] = 'last';
            param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'StorageGroupToLUN\')';
            if (typeof device !== 'undefined') {
                param['filter'] = 'device=\'' + device + '\'&' + param.filter;
            }


            CallGet.CallGet(param, function (param) {
                var SGList = [];
                for (var i in param.result) {
                    var item = param.result[i];
                    var isFind = false;
                    var lunDetailItem={};
                    for (var luni in luns[item.device]) {
                        var lunItem = luns[item.device][luni];
                        //console.log(item.device +","+lunItem.device +"\t"+ item.lunname +","+ item.part);
                        if (item.device == lunItem.device && item.lunname == lunItem.part)
                            lunDetailItem = lunItem;
                    }

                    item["SGLunCapacity"] = parseFloat(item.SGLunCapacity);


                    for (var j in SGList) {
                        var resItem = SGList[j];

                        if (item.device == resItem.device && item.sgname == resItem.sgname) {
                            resItem.SumOfLuns++;
                            lunDetailItem["lunname"] = item.lunname;
                            lunDetailItem["SGLunCapacity"] = item.SGLunCapacity;
                            resItem.luns.push(lunDetailItem);
                            //console.log(item.device + ":" + item.sgname + "\t" + item.devcount);
                            isFind = true;
                            break;
                        }
                    }

                    if (isFind == false) {
                        var result = {};
                        result['device'] = item.device;
                        result['sgname'] = item.sgname;
                        result['luns'] = [];
    
                        lunDetailItem["lunname"] = item.lunname;
                        lunDetailItem["SGLunCapacity"] = item.SGLunCapacity;
                        result.luns.push(lunDetailItem);
                        result['SumOfLuns'] = 1;
                        // console.log("AAA:"+ JSON.stringify(result));
                        SGList.push(result);
                    }
                }


                callback(null, SGList);
            });

        },
        function (sglist, callback) {
            var param = {};
            param['filter_name'] = '(name=\'Capacity\'|name=\'UsedCapacity\')';
            param['keys'] = ['device', 'sgname'];
            param['fields'] = ['iolmstat', 'iolimit'];
            param['period'] = 86400;
            param['type'] = 'last';

            param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
            if (typeof device !== 'undefined') {
                param['filter'] = 'device=\'' + device + '\'&' + param.filter;
            }

            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];
                    item['Capacity'] = parseFloat(item.Capacity);
                    item['UsedCapacity'] = parseFloat(item.UsedCapacity);
                    for (var sgi in sglist) {
                        var sgItem = sglist[sgi];
                        if (sgItem.device == item.device && sgItem.sgname == item.sgname) {
                            for (var z in sgItem) {
                                item[z] = sgItem[z];
                            }
                        }
                    }
                }
                callback(null, param.result);
            });
        },
        function (sglist, callback) {
            var param = {}; 
            param['keys'] = ['device', 'part'];
            param['fields'] = ['vxsnapid','vxgener','crttime','sgname','nmsgvol'];   
            param['filter'] = '(datagrp=\'VMAX-TIMEFINDER-SNAPVX-REPLICAS\'&parttype=\'SnapVX Snapshot\')'; 

            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i]; 
                    for ( var j in sglist ) {
                        var sgItem = sglist[j];
                        if ( sgItem.device == item.device && sgItem.sgname == item.sgname ) {
                            if ( sgItem["snap"] === undefined ) sgItem["snap"] = [];
                            sgItem.snap.push(item);
                        }
                    } 
                }
                callback(null, sglist);
            });
        }

    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        //  
        callback(result);
    });

}



function GetStorageGroupsPerformance(device, period, start, end, valuetype, callback) {

    var config = configger.load();

    async.waterfall([
        function (callback) {
            var param = {};
            param['device'] = device;
            param['period'] = period;
            param['start'] = start;
            param['end'] = end;
            param['type'] = valuetype;
            param['filter_name'] = '(name=\'IORate\'|name=\'HostIOLimitExceededPercent\'|name=\'ResponseTime\'|name=\'ReadRequests\'|name=\'WriteRequests\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
            param['keys'] = ['device', 'part'];
            param['fields'] = ['name', 'sgname', 'parttype', 'iolmstat', 'iolimit'];
            param['filter'] = '(datagrp=\'VMAX-StorageGroup\'&parttype=\'Storage Group\')';
            param['limit'] = 100000;

            CallGet.CallGetPerformance(param, function (param) {
                callback(null, param);
            });


        },

        function (arg1, callback) {

            //var result1 = util.convertSRMPerformanceStruct(arg1); 
            //var ret = arg1.values; 
            callback(null, arg1);

        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        callback(result);
    });





};

function GetDiskPerformance(device, period, start, end, valuetype, callback) {

    var config = configger.load();

    async.waterfall([
        function (callback) {
            var param = {};
            param['device'] = device;
            param['period'] = period;
            param['start'] = start;
            param['end'] = end;
            param['type'] = valuetype;
            //param['filter_name'] = '(name=\'CurrentUtilization\'|name=\'ReadResponseTime\'|name=\'WriteResponseTime\'|name=\'ReadRequests\'|name=\'WriteRequests\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
            param['filter_name'] = '(name=\'CurrentUtilization\')';
            param['keys'] = ['device', 'part'];
            //param['fields'] = ['name','disktype','diskrpm','disksize'];  
            param['fields'] = ['disktype'];
            param['filter'] = 'parttype=\'Disk\'';

            CallGet.CallGetPerformance(param, function (param) {
                callback(null, param);
            });


        },

        function (arg1, callback) {

            //var result1 = util.convertSRMPerformanceStruct(arg1); 
            //var ret = arg1.values; 
            callback(null, arg1);

        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        callback(result);
    });





};



function GetDirectorPerformance(device, period, start, valuetype, callback) {

    var config = configger.load();

    async.waterfall([
        function (callback) {

            var param = {};
            param['device'] = device;
            param['period'] = period;
            param['start'] = start;
            param['type'] = valuetype;
            param['filter_name'] =
                '(name=\'QueueDepthCountRange0\'|' +
                'name=\'QueueDepthCountRange1\'|' +
                'name=\'QueueDepthCountRange2\'|' +
                'name=\'QueueDepthCountRange3\'|' +
                'name=\'QueueDepthCountRange4\'|' +
                'name=\'QueueDepthCountRange5\'|' +
                'name=\'QueueDepthCountRange6\'|' +
                'name=\'QueueDepthCountRange7\'|' +
                'name=\'QueueDepthCountRange8\'|' +
                'name=\'QueueDepthCountRange9\'|' +
                'name=\'SysCallCount\'|' +
                'name=\'HostMBperSec\'|' +
                'name=\'CurrentUtilization\'|' +
                'name=\'ReadRequests\'|' +
                'name=\'WriteRequests\'|' +
                'name=\'ReadThroughput\'|' +
                'name=\'WriteThroughput\')';
            param['keys'] = ['device', 'part'];
            param['fields'] = ['name', 'partgrp', 'parttype', 'model'];
            //param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Controller\')';
            param['filter'] = '(parttype=\'Controller\')';


            CallGet.CallGetPerformance(param, function (param) {
                callback(null, param);
            });


        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        callback(result);
    });





};


function GetDirectorPerformanceBak(device, period, callback) {

    var config = configger.load();
    var start = util.getPerfStartTime();
    var end = util.getPerfEndTime();
    if (device === undefined)
        var filterbase = '(source=\'VMAX-Collector\'&parttype=\'Controller\')';
    else
        var filterbase = 'device==\'' + device + '\'&(source=\'VMAX-Collector\'&parttype=\'Controller\')';

    if (period === undefined) period = 3600;

    async.waterfall([
        function (callback) {
            var filter = filterbase + '&(name=\'CurrentUtilization\'|name=\'ReadRequests\'|name=\'WriteRequests\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
            var fields = 'device,name,part,partgrp,parttype,model';
            var keys = ['device,part'];


            //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400' , limit : 10000000}; 
            var queryString = {
                'properties': fields,
                'filter': filter,
                'start': start,
                'end': end,
                period: period
            };

            console.log(queryString);
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query(queryString)
                .end(function (response) {
                    if (response.error) {
                        console.log(response.error);
                        return response.error;
                    } else {
                        //console.log(response.body);   
                        var resultRecord = response.body;
                        callback(null, resultRecord);
                    }

                });


        },

        function (arg1, callback) {

            var result1 = util.convertSRMPerformanceStruct(arg1);
            //var ret = arg1.values; 
            callback(null, result1);

        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        callback(result);
    });





};


/*
    * Get device list of the vmax.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

        [
          {
            "poolname": "N/A",
            "purpose": "Primary",
            "partsn": "60000970888973588727533030453935",
            "part": "0E95",
            "dgstype": "Thick",
            "name": "Availability",
            "poolemul": "FBA",
            "parttype": "LUN",
            "device": "888973588727",
            "config": "2-Way Mir",
            "Availability": "100.0",
            "LastTS": "1467244800",
            "Capacity": "0.00292969",
            "UsedCapacity": "0.00292969"
          }
        ]
*/



function GetDevices(device, callback) {


    var deviceType = "";

    async.waterfall([
        function (callback) {


            var param = {};
            //param['filter'] = '(parttype=\'MetaMember\'|parttype=\'LUN\')';
            param['filter'] = '(parttype=\'LUN\')';
            param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'PoolUsedCapacity\')';
            param['keys'] = ['device', 'part'];
            param['fields'] = ['model', 'parttype', 'config', 'poolemul', 'purpose', 'dgstype', 'poolname', 'partsn', 'sgname', 'ismasked', 'vmaxtype', 'disktype'];
            param['period'] = 86400;
            param['start'] = util.getConfStartTime('1w');

            if (device !== undefined) {
                param['filter'] = 'device=\'' + device + '\'&' + param['filter'];
            }


            CallGet.CallGet(param, function (param) {
                var data = param.result;
                callback(null, data);

            });

        },
        // -------------------------------------------------
        // Relation with VPLEX Virutal Volume and Maskview
        // -------------------------------------------------
        function (arg1, callback) {

            console.log("Begin execute : GetAssignedVPlexByDevices ... ...");
            GetAssignedVPlexByDevices(device, function (result) {

                for (var i in arg1) {
                    var item = arg1[i];
                    item['ConnectedDevice'] = '';
                    item['ConnectedDeviceType'] = '';
                    item['ConnectedObject'] = '';
                    item['ConnectedHost'] = '';

                    for (var j in result) {
                        var vplexItem = result[j];
                        if (item.partsn == vplexItem.deviceWWN) {
                            item['ConnectedDevice'] = vplexItem.vplexName;
                            item['ConnectedDeviceType'] = 'VPlex';
                            item['ConnectedObject'] = vplexItem.vplexVVolName;
                            item['ConnectedHost'] = vplexItem.vplexMaskviewName;
                        }
                    }




                }
                callback(null, arg1);

            })

        },
        // -------------------------------------------------
        // 1. Relation with  Maskview and Initiator/Host for VMAX
        // 2. Mapping FE Director for DMX
        // -------------------------------------------------
        function (arg1, callback) {

            console.log("Begin execute : GetAssignedInitiatorByDevices ... ...111");
            GetAssignedInitiatorByDevices(device, function (result) {

                console.log("                 #Result = " + result.length);

                var hostv;

                host.GetHBAFlatRecord(hostv, function (hbaresult) {
                    console.log("              GetHBAFlatRecord->#Result=" + hbaresult.length);
                    console.log("              #1-For: #Result=" + arg1.length);

                    for (var i in arg1) {
                        var item = arg1[i];
                        item["hosts"] = [];
                        item["ConnectedHostCount"] = 0;
                        item['ConnectedInitiators'] = [];

                        var maskingviews = result.maskingview;

                        for (var j in result.devices) {
                            var deviceItem = result.devices[j];
                            if (item.partsn == deviceItem.deviceWWN) {

                                var maskingview = maskingviews[deviceItem.MaskingView];
                                if (maskingview === undefined) continue;

                                item["MappedFEPort"] = maskingview.FEName.toString();
                                item["ConnectedInitiators"] = maskingview.initEndPoint;
                                /*
                                if ( item.MappedFEPort === undefined ) 
                                    item["MappedFEPort"] = deviceItem.FEName;
                                else 
                                    if ( item.MappedFEPort.indexOf(deviceItem.FEName) < 0 )
                                        item.MappedFEPort += "," + deviceItem.FEName;



                                var isfind = false;
                                for ( var z in  item.ConnectedInitiators ) {
                                    if ( item.ConnectedInitiators[z] == deviceItem.initEndPoint ) {
                                        isfind = true;
                                        break;
                                    }
                                }
                                if ( isfind == false )
                                    item.ConnectedInitiators.push(deviceItem.initEndPoint);
                                */

                                // Search belong to which host
                                for (var k in hbaresult) {
                                    var hbaItem = hbaresult[k];
                                    for (var x in item.ConnectedInitiators) {
                                        var initEndPoint = item.ConnectedInitiators[x];
                                        if (hbaItem.hba_wwn == initEndPoint) {

                                            var isfind = false;
                                            for (var h in item.hosts) {
                                                if (hbaItem.hostname == item.hosts[h].hostname) {
                                                    isfind = true;
                                                    break;
                                                }
                                            }
                                            if (isfind == false) {
                                                item.hosts.push(hbaItem);
                                                item.ConnectedHostCount++;
                                            }
                                        }
                                    }

                                }

                            }
                        }
                    }
                    callback(null, arg1);

                });


            })


        },
        // -------------------------------------------------
        // 2. Mapping FE Director for DMX
        // -------------------------------------------------
        function (arg1, callback) {


            if (arg1.length > 0 && arg1[0].vmaxtype == 'DMX') {
                deviceType = 'DMX';
                console.log("---------------------------\nBegin get mapping fe Director for DMX...\n--------------------------\n");

                var param = {};
                param['filter'] = '(parttype=\'LUNtoDirectorPort\')';
                param['keys'] = ['device', 'part'];
                param['fields'] = ['director'];

                if (device !== undefined) {
                    param['filter'] = 'device=\'' + device + '\'&' + param['filter'];
                }


                CallGet.CallGet(param, function (param) {
                    var dirs = param.result;
                    for (var i in arg1) {
                        var lunItem = arg1[i];
                        for (var j in dirs) {
                            var dirItem = dirs[j];



                            if (lunItem.part == dirItem.part) {
                                if (lunItem.director === undefined)
                                    lunItem["director"] = dirItem.director;
                                else if (lunItem.director.indexOf(dirItem.director) < 0)
                                    lunItem.director = lunItem.director + ',' + dirItem.director
                            }
                        }
                    }
                    callback(null, arg1);

                });

            } else
                callback(null, arg1);
        },
        // -------------------------------------------------
        // Releaship with SRDF 
        // -------------------------------------------------
        function (arg1, callback) {

            console.log("Begin execute : GetSRDFLunToReplica ... ...");
            GetSRDFLunToReplica(device, function (ret) {
                console.log("                #Result = " + ret.length + "\t" + arg1.length);

                var ret1 = {};
                ret1['device'] = {};
                ret1['rem_device'] = {};
                ret1['src_device'] = {};

                for (var i in ret) {
                    var item = ret[i];
                    var retDevice = item.device;
                    if (ret1['device'][retDevice] === undefined) {
                        ret1['device'][retDevice] = {}
                    }
                    ret1['device'][retDevice][item.part] = item;

                    var remDevice = item.remarray;
                    if (ret1['rem_device'][remDevice] === undefined)
                        ret1['rem_device'][remDevice] = {}

                    ret1['rem_device'][remDevice][item.remlun] = item;

                    var srcDevice = item.srcarray;
                    if (ret1['src_device'][srcDevice] === undefined)
                        ret1['src_device'][srcDevice] = {};
                    else
                        ret1['src_device'][srcDevice][item.srclun] = item;

                }

                for (var i in arg1) {
                    var item = arg1[i];
                    if (i % 1000 == 0) console.log(i);

                    if ((item.device in ret1.device) && (item.part in ret1.device[item.device])) {
                        var rdfItem = ret1.device[item.device][item.part];

                        if (item.replication === undefined) {
                            item["replication"] = [];
                        }
                        item.replication.push(rdfItem);
                        item.remarray === undefined ? item["remarray"] = rdfItem.remarray : item["remarray"] = item.remarray + ',' + rdfItem.remarray;
                        item.remlun === undefined ? item["remlun"] = rdfItem.remlun : item["remlun"] = item.remlun + ',' + rdfItem.remlun;
                        item.replstat === undefined ? item["replstat"] = rdfItem.replstat : item["replstat"] = item.replstat + ',' + rdfItem.replstat;
                    } else if ((item.device in ret1.rem_device) && (item.part in ret1.rem_device[item.device])) {
                        var rdfItem = ret1.rem_device[item.device][item.part];
                        if (item.replication === undefined) {
                            item["replication"] = [];
                        }
                        item.replication.push(rdfItem);
                        item.remarray === undefined ? item["remarray"] = rdfItem.remarray : item["remarray"] = item.remarray + ',' + rdfItem.remarray;
                        item.remlun === undefined ? item["remlun"] = rdfItem.remlun : item["remlun"] = item.remlun + ',' + rdfItem.remlun;
                        item.replstat === undefined ? item["replstat"] = rdfItem.replstat : item["replstat"] = item.replstat + ',' + rdfItem.replstat;
                    } else if ((item.device in ret1.src_device) && (item.part in ret1.src_device[item.device])) {
                        var rdfItem = ret1.src_device[item.device][item.part];

                        if (item.replication === undefined) {
                            item["replication"] = [];
                        }
                        item.replication.push(rdfItem);
                        if (item.remarray === undefined)
                            item["remarray"] = rdfItem.srcarray;
                        else if (item.remarray != rdfItem.srcarray)
                            item["remarray"] = item.remarray + ' / ' + rdfItem.srcarray;

                        if (item.remlun !== undefined)
                            item["remlun"] = item.remlun + ' / ' + rdfItem.part;
                        else
                            item["remlun"] = rdfItem.part;

                        if (item.replstat === undefined)
                            item["replstat"] = rdfItem.replstat;
                        else if (item.replstat != rdfItem.replstat)
                            item["replstat"] = item.replstat + ' / ' + rdfItem.replstat;

                    }

                }
                console.log("End execute : GetSRDFLunToReplica ... ...");

                callback(null, arg1);
            })

        },

        // -------------------------------------------------
        // Releaship with Local Clone 
        // -------------------------------------------------
        function (arg1, callback) {

            console.log("Begin execute: GetCloneLunToReplica ... ...")
            GetCloneLunToReplica(device, function (ret) {
                console.log("                #Result = " + ret.length);

                for (var i in arg1) {
                    var item = arg1[i];

                    for (var j in ret) {
                        var cloneItem = ret[j];

                        if (item.device == cloneItem.srcarray && item.part == cloneItem.srclun) {
                            if (item.replication === undefined) {
                                item["replication"] = [];
                            }
                            item.replication.push(cloneItem);
                            item.remarray === undefined ? item["remarray"] = cloneItem.remarray : item["remarray"] = item.remarray + ',' + cloneItem.remarray;
                            item.remlun === undefined ? item["remlun"] = cloneItem.remlun : item["remlun"] = item.remlun + ',' + cloneItem.remlun;
                            item.replstat === undefined ? item["replstat"] = cloneItem.replstat : item["replstat"] = item.replstat + ',' + cloneItem.replstat;
                        }

                    }
                    // }




                }

                callback(null, arg1);
            })

        }

    ], function (err, result) {
        // result now equals 'done' 
        callback(result);
    });



}

/*
    * Get device list of the vmax and the assigned hosts in each device
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:
 
*/
function GetAssignedHostsByDevices(device, callback) {

    var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
    queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
    queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";
    queryString = queryString + " SELECT distinct ?arraySN ?deviceName ?deviceWWN ?endpoint  ";
    queryString = queryString + " WHERE {  ";
    queryString = queryString + "     ?arrayEntity rdf:type srm:StorageEntity .   ";
    queryString = queryString + "     ?arrayEntity srm:serialNumber ?arraySN .  ";
    queryString = queryString + "     ?arrayEntity srm:containsStorageVolume ?device .  ";
    queryString = queryString + "     ?device srm:displayName ?deviceName . ";
    queryString = queryString + "     ?device srm:volumeWWN ?deviceWWN . ";
    queryString = queryString + "     ?device srm:maskedTo ?maskview .  ";
    queryString = queryString + "     ?maskview srm:maskedToInitiator ?endpoint .   ";
    queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";
    queryString = queryString + "  } ";

    topos.querySparql(queryString, function (response) {
        //var resultRecord = RecordFlat(response.body, keys);
        var resultJson = [];
        for (var i in response) {
            var item = response[i];
            if (item.endpoint != undefined) {
                item.endpoint = item.endpoint.replace('topo:srm.ProtocolEndpoint:', '');
            }

            var isFind = false;
            for (var j in resultJson) {
                var resultItem = resultJson[j];
                if (item.deviceWWN == resultItem.deviceWWN) {
                    resultItem.initiator.push(item.endpoint);
                    isFind = true;
                    break;
                }
            }
            if (!isFind) {
                var resultItem = {};
                resultItem['arraySN'] = item.arraySN;
                resultItem['deviceName'] = item.deviceName;
                resultItem['deviceWWN'] = item.deviceWWN;
                resultItem['initiator'] = [];
                resultItem.initiator.push(item.endpoint);

                resultJson.push(resultItem);

            }
        }

        callback(resultJson);
    });



}





function GetAssignedVPlexByDevices(device, callback) {


    var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
    queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
    queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";

    queryString = queryString + " SELECT distinct ?arraySN ?deviceName ?deviceWWN ?vplexName ?vplexVVolName ?vplexMaskviewName ";
    queryString = queryString + " WHERE {  ";
    queryString = queryString + "     ?arrayEntity rdf:type srm:StorageEntity .   ";
    queryString = queryString + "     ?arrayEntity srm:serialNumber ?arraySN .  ";
    queryString = queryString + "     ?arrayEntity srm:containsStorageVolume ?device .  ";
    queryString = queryString + "     ?device srm:displayName ?deviceName . ";
    queryString = queryString + "     ?device srm:volumeWWN ?deviceWWN .  ";
    queryString = queryString + "     ?device srm:associatedToStorageVolume ?deviceAssoc . ";
    queryString = queryString + "     ?deviceAssoc srm:associatedToVPlexStorageVolume ?vplexVol . ";
    queryString = queryString + "     ?vplexVol srm:residesOnDevice ?vplexDevice . ";
    queryString = queryString + "     ?vplexDevice srm:residesOnVirtualVolume ?vplexVVol . ";
    queryString = queryString + "     ?vplexVVol srm:displayName ?vplexVVolName . ";
    queryString = queryString + "     ?vplexVVol srm:residesOnVPlexCluster ?vplex . ";
    queryString = queryString + "     ?vplex srm:displayName ?vplexName . ";
    queryString = queryString + "     ?vplexVVol srm:maskedTo ?maskview . ";
    queryString = queryString + "     ?maskview srm:displayName ?vplexMaskviewName . ";

    if (device !== undefined)
        queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";

    queryString = queryString + "    } ";

    topos.querySparql(queryString, function (response) {
        //var resultRecord = RecordFlat(response.body, keys);

        callback(response);
    });

}


function GetAssignedInitiatorByDevices(device, callback) {

    async.waterfall([
        function (callback) {

            var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
            queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
            queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

            queryString = queryString + "     SELECT distinct  ?arraySN ?deviceName ?deviceWWN ?MaskingView  ";
            queryString = queryString + "     WHERE {    ";
            queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
            queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
            queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    ";
            queryString = queryString + "       ?device srm:displayName ?deviceName .   ";
            queryString = queryString + "       ?device srm:volumeWWN ?deviceWWN .    ";
            queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";
            if (device !== undefined)
                queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";
            queryString = queryString + "     }  ";

            topos.querySparql(queryString, function (response) {
                for (var i in response) {
                    var item = response[i];
                    if (item.MaskingView !== undefined)
                        item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:" + item.arraySN + ":", "");
                }
                var result = {};
                result["devices"] = response;
                callback(null, result);
            });
        },
        function (arg1, callback) {
            var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
            queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
            queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

            queryString = queryString + "     SELECT distinct  ?arraySN ?MaskingView ?initEndPoint ";
            queryString = queryString + "     WHERE {    ";
            queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
            queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
            queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    ";
            queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";
            queryString = queryString + "       ?MaskingView srm:maskedToInitiator ?initEndPoint .    ";

            if (device !== undefined)
                queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";
            queryString = queryString + "     }  ";

            var maskingviews = {};
            topos.querySparql(queryString, function (response) {
                for (var i in response) {
                    var item = response[i];
                    if (item.MaskingView !== undefined)
                        item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:" + item.arraySN + ":", "");
                    if (item.initEndPoint !== undefined)
                        item["initEndPoint"] = item.initEndPoint.replace("topo:srm.ProtocolEndpoint:", "");
                    if (maskingviews[item.MaskingView] !== undefined) {
                        maskingviews[item.MaskingView]["initEndPoint"].push(item.initEndPoint);
                    } else {
                        maskingviews[item.MaskingView] = {}
                        maskingviews[item.MaskingView]["arraySN"] = item.arraySN;
                        maskingviews[item.MaskingView]["initEndPoint"] = [];
                        maskingviews[item.MaskingView]["initEndPoint"].push(item.initEndPoint);
                    };
                }



                arg1["maskingview"] = maskingviews;
                callback(null, arg1);
            });
        },
        function (arg1, callback) {
            var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
            queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
            queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

            queryString = queryString + "     SELECT distinct  ?arraySN ?MaskingView ?FEName ";
            queryString = queryString + "     WHERE {    ";
            queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
            queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
            queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    ";
            queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";
            queryString = queryString + "       ?MaskingView srm:maskedToTarget ?FEEndPoint .    ";
            queryString = queryString + "       ?FEEndPoint srm:Identifier ?FEName .    ";

            if (device !== undefined)
                queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";
            queryString = queryString + "     }  ";

            var maskingviews = arg1.maskingview;
            topos.querySparql(queryString, function (response) {
                for (var i in response) {
                    var item = response[i];
                    if (item.MaskingView !== undefined)
                        item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:" + item.arraySN + ":", "");
                    if (item.FEName !== undefined)
                        item["FEName"] = item.FEName.replace("topo:srm.StorageFrontEndPort:" + item.arraySN + ":", "");

                    if (maskingviews[item.MaskingView] !== undefined) {
                        if (maskingviews[item.MaskingView]["FEName"] === undefined)
                            maskingviews[item.MaskingView]["FEName"] = [];
                        maskingviews[item.MaskingView]["FEName"].push(item.FEName);
                    } else {
                        maskingviews[item.MaskingView] = {}
                        maskingviews[item.MaskingView]["arraySN"] = item.arraySN;
                        maskingviews[item.MaskingView]["FEName"] = [];
                        maskingviews[item.MaskingView]["FEName"].push(item.FEName);
                    };

                }

                callback(null, arg1);
            });
        }
    ], function (err, result) {

        callback(result);
    });

}



/*
    * Get device list of the vmax.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

        [
          {
            "poolname": "N/A",
            "purpose": "Primary",
            "partsn": "60000970888973588727533030453935",
            "part": "0E95",
            "dgstype": "Thick",
            "name": "Availability",
            "poolemul": "FBA",
            "parttype": "LUN",
            "device": "888973588727",
            "config": "2-Way Mir",
            "Availability": "100.0",
            "LastTS": "1467244800",
            "Capacity": "0.00292969",
            "UsedCapacity": "0.00292969"
          }
        ]
*/

function GetFEPortsOnly(device, callback) {

    var param = {};
    //param['filter_name'] = '(name=\'IORate\'|name=\'Throughput\')';
    param['keys'] = ['device', 'feport'];
    param['fields'] = ['maxspeed', 'negspeed', 'nodewwn', 'portwwn', 'partstat', 'vmaxtype'];
    param['period'] = 604800;
    param['valuetype'] = 'MAX';

    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
    } else {
        param['filter'] = 'datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
    }

    CallGet.CallGet(param, function (param) {
        callback(param.result);
    });

}

function GetFEPorts(device, callback) {


    async.waterfall([
        function (callback) {

            var param = {};
            //param['filter_name'] = '(name=\'IORate\'|name=\'Throughput\')';
            param['keys'] = ['device', 'feport'];
            param['fields'] = ['maxspeed', 'negspeed', 'nodewwn', 'portwwn', 'partstat', 'vmaxtype'];
            param['period'] = 3600;
            param['valuetype'] = 'MAX';

            if (typeof device !== 'undefined') {
                param['filter'] = 'device=\'' + device + '\'&datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
            } else {
                param['filter'] = 'datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
            }

            CallGet.CallGet(param, function (param) {
                callback(null, param.result);
            });


        },

        /*
            the Volume count of mapping to the faport
         */
        function (arg1, callback) {
            var deviceList = [];
            var queryString1 = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
            queryString1 = queryString1 + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>     ";
            queryString1 = queryString1 + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>  ";
            queryString1 = queryString1 + " SELECT distinct ?arraySN ";
            queryString1 = queryString1 + " WHERE {   ";
            queryString1 = queryString1 + "     ?arrayEntity rdf:type srm:StorageEntity .    ";
            queryString1 = queryString1 + "     ?arrayEntity srm:serialNumber ?arraySN .   ";
            if (typeof device !== 'undefined')
                queryString1 = queryString1 + "     FILTER  (?arraySN = '" + device + "' ) .    ";
            queryString1 = queryString1 + "  }   ";

            topos.querySparql(queryString1, function (response) {
                for (var i in response) { 
                    deviceList.push(response[i].arraySN);
                }
 
                async.mapSeries(deviceList, function (device, subcallback) {

                    var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
                    queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>     ";
                    queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>  ";
                    queryString = queryString + " SELECT distinct ?arraySN ?FAName ?FAPortWWN ?volumeID  ";
                    queryString = queryString + " WHERE {   ";
                    queryString = queryString + "     ?arrayEntity rdf:type srm:StorageEntity .    ";
                    queryString = queryString + "     ?arrayEntity srm:serialNumber ?arraySN .   ";
                    queryString = queryString + "     ?arrayEntity srm:containsStorageFrontEndAdapter ?StorageFrontEndAdapter . ";
                    queryString = queryString + "     ?StorageFrontEndAdapter srm:containsStorageFrontEndPort ?StorageFrontEndPort . ";
                    queryString = queryString + "     ?StorageFrontEndPort srm:Identifier ?FAName . ";
                    queryString = queryString + "     ?StorageFrontEndPort srm:containsProtocolEndpoint ?FAEndpoint . ";
                    queryString = queryString + "     ?FAEndpoint srm:wwn ?FAPortWWN . ";
                    queryString = queryString + "     OPTIONAL { ";
                    queryString = queryString + "     ?StorageFrontEndPort srm:maskedTo ?maskview . ";
                    queryString = queryString + "     ?maskview srm:maskedToDisk ?masktodisk .                              ";
                    queryString = queryString + "     ?masktodisk srm:volumeID ?volumeID .                              ";
                    queryString = queryString + "     } "; 
                    queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .    ";
                    queryString = queryString + "  }   ";


                    topos.querySparql(queryString, function (response) {
                        subcallback(null, response);
                    });


                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    };
                    var result1 = [];
                    for (var i in result) {
                        result1 = result1.concat(result[i]);
                    }

                    for (var i in result1) {
                        var item = result1[i];
                        if (item.FAName !== undefined)
                            item.FAName = item.FAName.replace("topo:srm.StorageFrontEndPort:" + item.arraySN + ":", "");
                        var mappingvol = {};

                        for (var j in arg1) {
                            var mappingvolItem = arg1[j];
                            if (mappingvolItem.device == item.arraySN && mappingvolItem.feport == item.FAName) {

                                if (mappingvolItem.MappingVolCount !== undefined)
                                    mappingvolItem.MappingVolCount++;
                                else
                                    mappingvolItem["MappingVolCount"] = 1;
                            }
                        }

                    }
                    callback(null, arg1);
                })

            });


        },
        /*
            the connected switch port of faport
         */
        function (arg1, callback) {

            var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
            queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
            queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";
            queryString = queryString + " SELECT distinct  ?ArrayDisplayName ?FEPortDisplayName ?SwitchPortDisplayName ?SwitchDisplayName ?SwitchVendor ?SwitchModel  ";
            queryString = queryString + " WHERE {  ";
            queryString = queryString + "       ?array rdf:type srm:StorageEntity .    ";
            queryString = queryString + "       ?array srm:displayName ?ArrayDisplayName .    ";
            queryString = queryString + "       ?array srm:containsStorageFrontEndAdapter ?FEAdapter .    ";
            queryString = queryString + "      ?FEAdapter srm:containsStorageFrontEndPort ?FEPort .     ";
            queryString = queryString + "      ?FEPort srm:containsProtocolEndpoint ?FEPortEndpoint .     ";
            queryString = queryString + "      ?FEPortEndpoint srm:connectedTo ?SwitchPortEndpoint .     ";
            queryString = queryString + "      ?SwitchPortEndpoint srm:residesOnSwitchPort ?SwitchPort .     ";

            queryString = queryString + "      ?SwitchPort srm:displayName ?SwitchPortDisplayName .     ";
            queryString = queryString + "      ?FEPort srm:Identifier ?FEPortDisplayNameOrigin .     ";
            queryString = queryString + "      BIND(REPLACE(?FEPortDisplayNameOrigin, \"topo:srm.StorageFrontEndPort:\", \"\", \"i\") AS ?FEPortDisplayName) . ";
            queryString = queryString + "      ?SwitchPortEndpoint srm:residesOnLogicalSwitch ?LogicalSwitch .     ";
            queryString = queryString + "      ?LogicalSwitch srm:residesOnPhysicalSwitch ?PhysicalSwitch .     ";
            queryString = queryString + "      ?LogicalSwitch srm:displayName ?SwitchDisplayName .     ";
            queryString = queryString + "      ?LogicalSwitch srm:vendor ?SwitchVendor .     ";
            queryString = queryString + "      ?PhysicalSwitch srm:model ?SwitchModel .     ";
            if (typeof device !== 'undefined')
                queryString = queryString + "     FILTER  (?ArrayDisplayName = '" + device + "' ) .    ";

            queryString = queryString + "  } ";


            topos.querySparql(queryString, function (response) {
                //var resultRecord = RecordFlat(response.body, keys); 
                for (var i in response) {
                    var item = response[i];
                    if (item.FEPortDisplayName !== undefined)
                        item.FEPortDisplayName = item.FEPortDisplayName.replace(item.ArrayDisplayName + ":", "");

                    for (var j in arg1) {
                        var itemFA = arg1[j];
                        if (itemFA.device == item.ArrayDisplayName && itemFA.feport == item.FEPortDisplayName) {
                            itemFA["ConnectedToPort"] = item.SwitchPortDisplayName;
                            itemFA["ConnectedToSwitch"] = item.SwitchDisplayName;
                        }
                    }
                }
                callback(null, arg1);
            });


        }
    ], function (err, result) {

        callback(result);
    });


}


function GetFEPorts1(device, callback) {


    async.waterfall([
        function (callback) {

            var param = {};
            param['filter_name'] = '(name=\'IORate\'|name=\'Throughput\')';
            param['keys'] = ['device', 'feport'];
            param['fields'] = ['maxspeed', 'negspeed', 'nodewwn', 'portwwn', 'partstat', 'vmaxtype'];
            param['period'] = 3600;
            param['valuetype'] = 'MAX';

            if (typeof device !== 'undefined') {
                param['filter'] = 'device=\'' + device + '\'&datagrp=\'VMAX-FEDirectorByPort\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
            } else {
                param['filter'] = 'datagrp=\'VMAX-FEDirectorByPort\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
            }

            CallGet.CallGet(param, function (param) {
                callback(null, param.result);
            });


        }
    ], function (err, result) {

        callback(result);
    });


}


function GetFEPortPerf(device, feport, start, end, callback) {

    var config = configger.load();
    //var start = '2016-06-20T18:30:00+08:00'
    //var end = '2016-07-01T18:30:00+08:00'
    if (start === undefined)
        var start = util.getPerfStartTime();

    if (end === undefined)
        var end = util.getPerfEndTime();

    async.waterfall([
        function (callback) {

            var filterbase = 'device==\'' + device + '\'&feport=\'' + feport + '\'&datagrp=\'VMAX-FEDirectorByPort\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';

            var filter = filterbase + '&(name==\'IORate\'|name==\'Throughput\')';
            var fields = 'device,feport,name';
            var keys = ['device', 'feport'];

            //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
            var queryString = {
                'properties': fields,
                'filter': filter,
                'start': start,
                'end': end,
                period: '3600'
            };

            console.log(queryString);
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query(queryString)
                .end(function (response) {
                    if (response.error) {
                        console.log(response.error);
                        return response.error;
                    } else {
                        //console.log(response.body);   
                        var resultRecord = response.body;
                        callback(null, resultRecord);
                    }
                });

        },

        function (arg1, callback) {
            var result = [];
            var oriArray = JSON.parse(arg1).values;
            for (var i in oriArray) {
                var item = oriArray[i].properties;
                console.log(item.feport + '\t' + item.name);
                item['matrics'] = [];
                var matrics = oriArray[i].points;
                var matrics_max = util.GetMaxValue(matrics);
                var matrics_avg = util.GetAvgValue(matrics);


                var matricsItem = {};
                matricsItem[item.name] = matrics;
                matricsItem['max'] = matrics_max;
                matricsItem['avg'] = matrics_avg;


                var isFind = false;
                for (var j in result) {
                    var resItem = result[j];
                    if (resItem.device == item.device && resItem.feport == item.feport) {

                        resItem.matrics.push(matricsItem)
                        isFind = true;
                    }
                }
                if (!isFind) {
                    item['matrics'].push(matricsItem);
                    delete item['name'];

                    result.push(item);

                }


            }
            if (result.length == 0) {
                callback(null, result);
            } else {
                var result1 = CallGet.convertPerformanceStruct(result);
                //var ret = arg1.values; 
                callback(null, result1);
            }




        },

        function (data, callback) {

            console.log(data.length);
            if (data.length == 0) {
                callback(null, data);
            } else {
                var finalResult = {};
                // ----- the part of perf datetime --------------
                finalResult["startDate"] = start;
                finalResult["endDate"] = end;
                finalResult['charts'] = [];


                var matrics = data[0].matrics;

                // ------------------------- Catagory --------------------------
                var result = {};
                result['category'] = 'Throughput ( MB/s )';
                result['chartData'] = [];
                for (var i in matrics) {
                    var item = matrics[i];
                    var chartDataItem = {};
                    chartDataItem['name'] = item.timestamp;
                    chartDataItem['Throughput'] = item.Throughput;

                    result.chartData.push(chartDataItem);

                }
                finalResult.charts.push(result);
                // ------------------------- Catagory --------------------------
                var result = {};
                result['category'] = 'IOPS';
                result['chartData'] = [];
                for (var i in matrics) {
                    var item = matrics[i];
                    var chartDataItem = {};
                    chartDataItem['name'] = item.timestamp;
                    chartDataItem['IORate'] = item.IORate;

                    result.chartData.push(chartDataItem);

                }
                finalResult.charts.push(result);





                callback(null, finalResult);
            }

        }
    ], function (err, result) {

        callback(result);
    });


}


function GetPorts(device, callback) {


    async.waterfall([
        function (callback) {

            var param = {};
            //param['filter_name'] = '(name=\'IORate\'|name=\'Throughput\')';
            param['keys'] = ['device', 'feport'];
            param['fields'] = ['director', 'dirslot', 'porttype', 'part'];
            param['period'] = 3600;
            param['valuetype'] = 'MAX';

            if (typeof device !== 'undefined') {
                param['filter'] = 'device=\'' + device + '\'&source=\'VMAX-Collector\'&parttype=\'Port\'';
            } else {
                param['filter'] = 'source=\'VMAX-Collector\'&parttype=\'Port\'';
            }

            CallGet.CallGet(param, function (param) {
                callback(null, param.result);
            });


        }
    ], function (err, result) {

        callback(result);
    });


}


function getArrayPerformance(callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var config = configger.load();
    //var start = '2016-06-20T18:30:00+08:00'
    //var end = '2016-07-01T18:30:00+08:00'
    var start = util.getPerfStartTime();
    var end = util.getPerfEndTime();
    var filterbase = '!parttype';

    async.waterfall([
        function (callback) {
            var filter = filterbase + '&(name==\'ReadRequests\'|name==\'WriteRequests\')';
            var fields = 'device,name';
            var keys = ['device'];



            var queryString = {
                'properties': fields,
                'filter': filter,
                'start': start,
                'end': end,
                period: '3600'
            };
            //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

            console.log(queryString);
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query(queryString)
                .end(function (response) {
                    if (response.error) {
                        console.log(response.error);
                        return response.error;
                    } else {
                        //console.log(response.body);   
                        var resultRecord = response.body;
                        callback(null, resultRecord);
                    }

                });


        },
        function (arg1, callback) {
            callback(null, arg1);


        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        //var r = JSON.parse(result); 
        callback(result);
    });

};



function getArrayPerformanceV2( device, part, start, end , period, valuetype, callback) {

    var config = configger.load();

    if ( start === undefined ) var start = util.getPerfStartTime();
    if ( end   === undefined ) var end = util.getPerfEndTime();
    if ( period   === undefined ) var period = 3600 ;
    if ( valuetype   === undefined ) var valuetype = 'last' ; 


    async.waterfall([
        function (callback) {
            var param = {};
            param['keys'] = ['device'];
            param['fields'] = ['name'];
            param['period'] = period;
            param['start'] = start;
            param['end'] = end;
            param['type'] = valuetype;
            param['filter'] = '!parttype&source=\'VMAX-Collector\'';
            param['filter_name'] = '(name==\'IORate\'|name==\'HitPercent\'|name==\'ReadRequests\'|name==\'WriteRequests\'|name==\'ReadThroughput\'|name==\'WriteThroughput\')';


            CallGet.CallGetPerformance(param, function (param) {
                callback(null, param);
            });

        },
        function (arg1, callback) {
            callback(null, arg1);


        }
    ], function (err, result) {
        callback(result);
    });
};


function getArrayPerformanceV3(device, start, end, type, period, callback) {

    var config = configger.load();

    async.waterfall([
        function (callback) {
            var param = {};
            param['keys'] = ['device'];
            param['fields'] = ['name'];
            param['period'] = period;
            param['start'] = start;
            param['end'] = end;
            param['type'] = type;
            if (device === undefined)
                param['filter'] = '!parttype&source=\'VMAX-Collector\'';
            else
                param['filter'] = '!parttype&source=\'VMAX-Collector\'&device=\'' + device + '\'';

            param['filter_name'] = '(name==\'IORate\'|name==\'HitPercent\'|name==\'ReadRequests\'|name==\'WriteRequests\'|name==\'ReadThroughput\'|name==\'WriteThroughput\')';


            CallGet.CallGetPerformance(param, function (param) {
                callback(null, param);
            });

        },
        function (arg1, callback) {
            callback(null, arg1);


        }
    ], function (err, result) {
        callback(result);
    });
};

function getArrayLunPerformance1(device, callback) {
    var param = {};
    param['keys'] = ['device', 'part'];
    param['fields'] = ['name'];
    param['period'] = 604800;
    param['start'] = util.getPerfStartTime();
    //param['filter'] =  'device==\''+device+'\'&(' + lunlist + ')&(parttype==\'LUN\'|parttype==\'MetaMember\')';
    //param['filter'] =  'device==\''+device+'&part==\'' + lun + '\'&(parttype==\'LUN\'|parttype==\'MetaMember\')&(part==\'245B\'|part==\'1AF3\')';
    param['filter'] = 'device==\'' + device + '\'&(parttype==\'LUN\')';
    param['filter_name'] = '(name==\'ReadRequests\'|name==\'WriteRequests\')';
    param['type'] = 'max';
    param['limit'] = 1000000;

    CallGet.CallGetPerformance(param, function (lunperf) {
        callback(lunperf);

    });
}

function getArrayLunPerformance(device, part, callback) {

    var config = configger.load();
    //var start = '2016-06-20T18:30:00+08:00'
    //var end = '2016-07-01T18:30:00+08:00'
    var start = util.getPerfStartTime();
    var end = util.getPerfEndTime();
    if (device === undefined && part === undefined)
        var filterbase = '(parttype==\'LUN\'|parttype==\'MetaMember\')';
    else if (part === undefined)
        var filterbase = 'device==\'' + device + '\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
    else
        var filterbase = 'device==\'' + device + '\'&part==\'' + part + '\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';

    async.waterfall([
        function (callback) {
            var filter = filterbase + '&(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            var fields = 'device,name,part,parttype';
            var keys = ['device,part'];



            //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400' , limit : 10000000}; 
            var queryString = {
                'properties': fields,
                'filter': filter,
                'start': start,
                'end': end,
                period: '3600'
            };

            console.log(queryString);
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query(queryString)
                .end(function (response) {
                    if (response.error) {
                        console.log(response.error);
                        return response.error;
                    } else {
                        //console.log(response.body);   
                        var resultRecord = response.body;
                        callback(null, resultRecord);
                    }

                });


        },

        function (arg1, callback) {
            var result = [];
            var oriArray = JSON.parse(arg1).values;
            for (var i in oriArray) {
                var item = oriArray[i].properties;
                item['matrics'] = [];
                var matrics = oriArray[i].points;
                var matrics_max = util.GetMaxValue(matrics);
                var matrics_avg = util.GetAvgValue(matrics);


                var matricsItem = {};
                matricsItem[item.name] = matrics;
                matricsItem['max'] = matrics_max;
                matricsItem['avg'] = matrics_avg;


                var isFind = false;
                for (var j in result) {
                    var resItem = result[j];
                    if (resItem.device == item.device && resItem.feport == item.feport) {

                        resItem.matrics.push(matricsItem)
                        isFind = true;
                    }
                }
                if (!isFind) {
                    item['matrics'].push(matricsItem);
                    delete item['name'];

                    result.push(item);

                }


            }
            if (result.length == 0) {
                callback(null, result);
            } else {
                var result1 = CallGet.convertPerformanceStruct(result);
                //var ret = arg1.values; 
                callback(null, result1);
            }




        },

        function (data, callback) {

            console.log(data.length);
            if (data.length == 0) {
                callback(null, data);
            } else {
                var finalResult = {};
                // ----- the part of perf datetime --------------
                finalResult["startDate"] = start;
                finalResult["endDate"] = end;
                finalResult['charts'] = [];


                var matrics = data[0].matrics;
                // ------------------------- Catagory --------------------------
                var result = {};
                result['category'] = 'ResponseTime (ms)';
                result['chartData'] = [];
                for (var i in matrics) {
                    var item = matrics[i];
                    var chartDataItem = {};
                    chartDataItem['name'] = item.timestamp;
                    chartDataItem['ReadResponseTime'] = item.ReadResponseTime;
                    chartDataItem['WriteResponseTime'] = item.WriteResponseTime;

                    result.chartData.push(chartDataItem);

                }
                finalResult.charts.push(result);


                // ------------------------- Catagory --------------------------
                var result = {};
                result['category'] = 'IOPS';
                result['chartData'] = [];
                for (var i in matrics) {
                    var item = matrics[i];
                    var chartDataItem = {};
                    chartDataItem['name'] = item.timestamp;
                    chartDataItem['WriteRequests'] = item.WriteRequests;
                    chartDataItem['ReadRequests'] = item.ReadRequests;

                    result.chartData.push(chartDataItem);

                }
                finalResult.charts.push(result);
                // ------------------------- Catagory --------------------------
                var result = {};
                result['category'] = 'Throughput ( MB/s )';
                result['chartData'] = [];
                for (var i in matrics) {
                    var item = matrics[i];
                    var chartDataItem = {};
                    chartDataItem['name'] = item.timestamp;
                    chartDataItem['ReadThroughput'] = item.ReadThroughput;
                    chartDataItem['WriteThroughput'] = item.WriteThroughput;

                    result.chartData.push(chartDataItem);

                }
                finalResult.charts.push(result);





                callback(null, finalResult);
            }

        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        callback(result);
    });





};


function convertPerformanceTemplateStruct(perf) {
    var chartsResult = [];

    for (var i in perf) {

        var lunItem = perf[i];
        var lunName = lunItem.part;
        var device = lunItem.device;
        var matrics = lunItem.matrics;
        for (var ts in matrics) {
            var tsItem = matrics[ts];
            var tsItemKeys = Object.keys(tsItem);
            for (var keyi in tsItemKeys) {
                var keyName = tsItemKeys[keyi];
                // Search category in charts data struct
                var chartItem_isfind = false;
                for (var chartItem_i in chartsResult) {
                    var chartItem = chartsResult[chartItem_i];
                    if (keyName == chartItem.category) {
                        var chartData = chartItem.chartData;
                        var chartData_isfind = false;
                        for (var chartDataItem_i in chartData) {
                            if (chartData[chartDataItem_i].name == tsItem.timestamp) {
                                chartData[chartDataItem_i][keyName] = tsItem[keyName];
                                chartData_isfind = true;
                                break;
                            }
                        }
                        if (!chartData_isfind) {
                            var newChartDataItem = {};
                            newChartDataItem['name'] = tsItem.timestamp;
                            newChartDataItem[keyName] = tsItem[keyName];
                            chartData.push(newChartDataItem);
                        }
                        chartItem_isfind = true;
                    }
                }
                if (!chartItem_isfind) {
                    var newChartItem = {};
                    newChartItem['category'] = keyName;
                    var newChartData = [];
                    var newChartDataItem = {};
                    newChartDataItem['name'] = tsItem.timestamp;
                    newChartDataItem[lunName] = tsItem.keyName;
                    newChartData.push(newChartDataItem);
                    newChartItem['chartData'] = newChartData;
                    chartsResult.push(newChartItem);
                }
            }
        }


    }
    return chartsResult;
}



function getArrayLunGroupPerformance(device, lunStr, start, end, interval, callback) {

    async.waterfall([
        function (callback) {

            console.log("getArrayLunPerformanceByList=" + device + "|" + lunStr + "|");


            getArrayLunPerformanceByListWithDT(device, lunStr, start, end, interval, function (perfresult) {
                callback(null, perfresult);
            });

        },
        function (arg1, callback) {

            //console.log(arg1)
            //console.log("---------------------------------");

            var perfdata = CallGet.convertPerformanceStruct(arg1);


            var charts = [];

            for (var i in perfdata) {
                var item = perfdata[i];

                for (var matricsi in item.matrics) {

                    var matrics = item.matrics[matricsi];
                    //console.log("--------matrics begin ------------");
                    //console.log(matrics);
                    //console.log("--------matrics end------------");
                    var keys = Object.keys(matrics);
                    var lunname = item.part; //lunname;
                    var arrayname = item.device; //array

                    for (var keyi in keys) {
                        var keyname = keys[keyi];

                        if (keyname == 'timestamp') {
                            var timestamp = matrics[keyname]; //ts
                            continue;
                        } else {
                            var categoryname = keyname; //perf-matrics-name
                            var value = matrics[keyname]; //perf-matrics-value
                        }
                        //console.log("array="+arrayname);
                        //console.log("lunname="+lunname);
                        //console.log("ts="+timestamp);
                        //console.log("categoryname="+categoryname);
                        //console.log("value="+value);
                        //console.log("---------");

                        // Search in result struct 
                        var isFind_chart = false;
                        for (var charti in charts) {
                            var chartItem = charts[charti];
                            if (chartItem.category == categoryname) {
                                isFind_chart = true;

                                var isFind_chartData = false;
                                for (var chartDatai in chartItem.chartData) {
                                    var chartDataItem = chartItem.chartData[chartDatai];
                                    if (chartDataItem.name == timestamp) {
                                        isFind_chartData = true;
                                        chartDataItem[lunname] = value;
                                    }

                                } // for 

                                if (!isFind_chartData) {
                                    var chartDataItem = {};
                                    chartDataItem['name'] = timestamp;
                                    chartDataItem[lunname] = value;
                                    chartItem.chartData.push(chartDataItem);
                                }

                            }
                        } // for ( charts ) 

                        if (!isFind_chart) {
                            var chartItem = {};
                            chartItem['category'] = categoryname;
                            chartItem['chartData'] = [];

                            var chartDataItem = {};
                            chartDataItem['name'] = timestamp;
                            chartDataItem[lunname] = value;
                            chartItem.chartData.push(chartDataItem);

                            charts.push(chartItem);
                        }


                    } // for ( keys )
                } // for ( matrics )

            } // for ( arg1 )


            callback(null, charts);
        }
    ], function (err, result) {
        var finalResult = {};

        // ----- the part of perf datetime --------------
        finalResult["startDate"] = start;
        finalResult["endDate"] = end;

        finalResult["charts"] = result;


        callback(finalResult);

    });

}

function getArrayLunPerformanceByList(device, lunStr, callback) {



}

function getArrayLunPerformanceByListWithDT(device, lunStr, start, end, interval, callback) {

    var config = configger.load();
    //var start = '2016-06-20T18:30:00+08:00'
    //var end = '2016-07-01T18:30:00+08:00'

    var lun = lunStr.toString();

    if (lun.indexOf(",") > -1) {
        var lunArray = lun.split(',');
    } else {
        var lunArray = [];
        lunArray.push(lun);
    }

    var lunFilter = '';
    for (var i in lunArray) {
        var item = lunArray[i];
        if (lunFilter == '') {
            lunFilter = 'partid==\'' + item + '\'';
        } else {
            lunFilter = lunFilter + '|partid==\'' + item + '\'';
        }
    }
    lunFilter = '(' + lunFilter + ')';

    var filterbase = lunFilter + '&device==\'' + device + '\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';

    async.waterfall([
        function (callback) {
            var filter = filterbase + '&(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
            var fields = 'device,name,part,parttype,partid';
            var keys = ['device,part'];


            if (interval == 'hours')
                var queryString = {
                    'properties': fields,
                    'filter': filter,
                    'start': start,
                    'end': end,
                    period: '3600'
                };
            else
                var queryString = {
                    'properties': fields,
                    'filter': filter,
                    'start': start,
                    'end': end,
                    period: '86400'
                };
            //

            console.log(queryString);
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query(queryString)
                .end(function (response) {
                    if (response.error) {
                        console.log(response.error);
                        return response.error;
                    } else {
                        //console.log(response.body);   
                        var resultRecord = response.body;
                        callback(null, resultRecord);
                    }

                });


        },
        function (arg1, callback) {

            var result = [];
            //var oriArray = JSON.parse(arg1).values;
            var oriArray = arg1.values;
            for (var i in oriArray) {
                var item = oriArray[i].properties;
                item['matrics'] = [];
                var matrics = oriArray[i].points;
                var matrics_max = util.GetMaxValue(matrics);
                var matrics_avg = util.GetAvgValue(matrics);


                var matricsItem = {};
                matricsItem[item.name] = matrics;
                matricsItem['max'] = matrics_max;
                matricsItem['avg'] = matrics_avg;


                var isFind = false;
                for (var j in result) {
                    var resItem = result[j];
                    if (resItem.device == item.device && resItem.part == item.part) {


                        resItem.matrics.push(matricsItem)
                        isFind = true;
                    }
                }
                if (!isFind) {
                    item['matrics'].push(matricsItem);
                    delete item['name'];

                    result.push(item);

                }


            }


            //var ret = arg1.values; 
            callback(null, result);


        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        callback(result);
    });





};


function GetCapacity(device, callback) {
    var param = {};


    if (typeof device !== 'undefined') {
        var filterbase = 'device=\'' + arraysn + '\'&!parttype';
    } else {
        var filterbase = '!parttype';
    }

    async.waterfall([
        function (callback) {
            var filter = filterbase + '&(name==\'PrimaryUsedCapacity\'|name==\'LocalReplicaUsedCapacity\'|name==\'RemoteReplicaUsedCapacity\'|name==\'SystemUsedCapacity\'|name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'VirtualUsedCapacity\'|name=\'HDFSUsedCapacity\'|name=\'ObjectUsedCapacity\'|name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredRawCapacity\'|name=\'UnusableCapacity\')';
            var fields = 'device,name';
            var keys = ['device'];

            //var queryString =  {"filter":filter,"fields":fields}; 
            var queryString = util.CombineQueryString(filter, fields);
            console.log(queryString);
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query(queryString)
                .end(function (response) {
                    if (response.error) {
                        console.log(response.error);
                        return response.error;
                    } else {
                        var arrayCapacitys = RecordFlat.RecordFlat(response.body, keys);
                        var resultRecord = [];
                        for (var i in arrayCapacitys) {
                            var item = arrayCapacitys[i];

                            var result = {};
                            result['device'] = item.device;
                            result['LastTS'] = item.LastTS;

                            var rawCapacity = {};
                            rawCapacity['ConfiguredRawCapacity'] = item.ConfiguredRawCapacity;
                            rawCapacity['ConfiguredUsableCapacity'] = item.ConfiguredUsableCapacity;
                            rawCapacity['HotSpareCapacity'] = item.HotSpareCapacity;
                            rawCapacity['RAIDOverheadCapacity'] = item.RAIDOverheadCapacity;
                            rawCapacity['UnconfiguredCapacity'] = item.UnconfiguredCapacity;
                            rawCapacity['UnusableCapacity'] = item.UnusableCapacity;


                            var usableCapacity = {};
                            usableCapacity['FreeCapacity'] = item.FreeCapacity;
                            usableCapacity['PoolFreeCapacity'] = item.PoolFreeCapacity;
                            usableCapacity['UsedCapacity'] = item.UsedCapacity;
                            rawCapacity['ConfiguredUsableCapacityDetail'] = usableCapacity;


                            var usedByType = {};
                            usedByType['BlockUsedCapacity'] = item.BlockUsedCapacity;
                            usedByType['FileUsedCapacity'] = item.FileUsedCapacity;
                            usedByType['VirtualUsedCapacity'] = item.VirtualUsedCapacity;
                            usedByType['HDFSUsedCapacity'] = item.HDFSUsedCapacity;
                            usedByType['ObjectUsedCapacity'] = item.ObjectUsedCapacity;
                            usableCapacity['UsedCapacityByType'] = usedByType;

                            var usedByPurpose = {};
                            usedByPurpose['PrimaryUsedCapacity'] = item.PrimaryUsedCapacity;
                            usedByPurpose['LocalReplicaUsedCapacity'] = item.LocalReplicaUsedCapacity;
                            usedByPurpose['RemoteReplicaUsedCapacity'] = item.RemoteReplicaUsedCapacity;
                            usedByPurpose['SystemUsedCapacity'] = item.SystemUsedCapacity;
                            usableCapacity['UsedCapacityByPurpose'] = usedByPurpose;

                            result['Raw'] = rawCapacity;

                            resultRecord.push(result);

                        }

                        callback(null, resultRecord);
                    }

                });


        },
        function (arg1, callback) {
            callback(null, arg1);


        }
    ], function (err, result) {
        // result now equals 'done'
        res.json(200, result);
    });






}