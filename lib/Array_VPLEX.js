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

module.exports = {
    GetArrays,
    getVplexDisks,
    GetStorageVolumeByDevices,
    getVplexVirtualVolume,
    GetVirtualVolumeRelationByDevices,
    getVplexStorageViews,
    getVplexFEPort,
    getVplexDirectors,
    getDirectorPerformance,
    GetFEPortRelationByDevices
}


function GetArrays1(device, callback) {


    var param = {};
    var arraysn = device;
    if (typeof arraysn !== 'undefined') {
        param['filter'] = 'device=\'' + arraysn + '\'&datatype==\'Virtual\'';
    } else {
        param['filter'] = '!parttype&datatype==\'Virtual\'';
    }

    param['filter_name'] = '(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
    param['keys'] = ['device'];
    param['fields'] = ['cluster', 'vstgtype', 'model', 'vendor', 'devdesc', 'vplexid'];

    async.waterfall([
        function (callback) {
            CallGet.CallGet(param, function (param) {
                for (var i in param.result) {
                    var item = param.result[i];

                    var ConfiguredUsableCapacity = item.ConfiguredUsableCapacity;
                    var UsedCapacity = item.UsedCapacity;
                    var UsedPercent = UsedCapacity / ConfiguredUsableCapacity * 100;
                    item['UsedPercent'] = UsedPercent.toFixed(0);

                    item.TotalMemory = Math.round(item.TotalMemory).toString();
                    item.TotalDisk = Math.round(item.TotalDisk).toString();
                    item.TotalLun = Math.round(item.TotalLun).toString();

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

                            ArrayObj.findOne({ "basicInfo.device": arraysn }, { "__v": 0, "_id": 0 }, function (err, doc) {
                                //system error.
                                if (err) {
                                    return done(err);
                                }
                                if (!doc) { //user doesn't exist.
                                    console.log("array info record is not exist.");

                                    param.result[0]['info'] = {};

                                }
                                else {
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


        },
        // get customize info
        function (param, callback) {

            var locations = param.Locations;
            GetArrayInfo(function (result) {

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
                                    break;
                                }
                            }
                            item['info'] = infoItem;
                        }
                    }
                }


                callback(null, param);

            });

        }
    ], function (err, result) {
        // result now equals 'done'
        callback(result.result);
    });

};

function GetArrayInfo(callback) {

    ArrayObj.find({}, { "__v": 0, "_id": 0 }, function (err, doc) {
        //system error.
        if (err) {
            return done(err);
        }
        if (!doc) { //user doesn't exist.
            console.log("array info record is not exist.");

            callback(null, []);

        }
        else {
            console.log("Array is exist!");
            callback(doc);

        }

    });
}


function GetArrays(device, callback) {


    var param = {};
    var arraysn = device;
    if (typeof arraysn !== 'undefined') {
        param['filter'] = 'device=\'' + arraysn + '\'&!parttype&datatype==\'Virtual\'';
    } else {
        param['filter'] = '!parttype&datatype==\'Virtual\'';
    }

    param['filter_name'] = '(name=\'HealthState\'|name=\'Connectivity\'|name=\'Availability\')';
    param['keys'] = ['device'];
    param['fields'] = ['cluster', 'vstgtype', 'model', 'vendor', 'devdesc', 'vplexid', 'memberof'];

    async.waterfall([
        function (callback) {
            CallGet.CallGet(param, function (param) {
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
            callback(null, param);
        },
        function (param, callback) {


            var locations = param.Locations;
            GetArrayInfo(function (result) {

                for (var i in param.result) {
                    var item = param.result[i];
                    item['info'] = {};
                    item['localtion'] = "";
                    item['datacenter'] = "undefine";

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
        // get Event
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


function getVplexPerformance(callback) {

    var config = configger.load();
    var start = util.getPerfStartTime();
    var end = util.getPerfEndTime();
    var filterbase = 'parttype==\'Processor\'';

    async.waterfall([
        function (callback) {
            var filter = filterbase + '&(name==\'CurrentUtilization\')';
            var fields = 'device,name,part';
            var keys = ['device', 'part'];



            var queryString = { 'properties': fields, 'filter': filter, 'start': start, 'end': end, period: '86400' };
            //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 


            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({ 'Content-Type': 'multipart/form-data' })
                .query(queryString)
                .end(function (response) {
                    if (response.error) {
                        console.log(response.error);
                        return response.error;
                    } else {
                        //console.log(response.raw_body);   
                        var resultRecord = response.raw_body;
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
        var r = JSON.parse(result);
        callback(r);
    });





};



function getVplexDisks(device, callback) {

    if (device === undefined) {
        callback('Must be special a device!');
        return;
    }

    var param = {};
    param['filter_name'] = '(name=\'Capacity\'|name=\'HealthState\'|name=\'VirtualDiskBackendPath\')';
    param['keys'] = ['device', 'partsn'];
    param['fields'] = ['part', 'partvend', 'extent', 'array', 'dev', 'isused', 'view', 'vvol'];

    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&parttype==\'VirtualDisk\'&source=\'VPLEX-Collector\'';
    } else {
        param['filter'] = 'parttype==\'VirtualDisk\'&source=\'VPLEX-Collector\'';
    }
    param['period'] = 3600;
    param['start'] = util.getConfStartTime('1d');

    CallGet.CallGet(param, function (param) {

        var data = param.result;

        var finalResult = {};

        // ----- the part of chart --------------

        callback(data);

    });

};





function GetStorageVolumeByDevices(device, callback) {

    /*
        if ( device === undefined ) {
            callback('Must be special a device!');
            return;
        }
        */

    var queryString = "     PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
    queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>  ";
    queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>  ";

    queryString = queryString + "     SELECT distinct ?storageName ?storageModel  ?storageVolName ?vplexStorageVolumeName ?vplexStorageVolumeSN ?vplexVVolName ?maskviewName  ";
    queryString = queryString + "     WHERE {   ";
    queryString = queryString + "         ?vplexStorageVolume rdf:type srm:VPlexStorageVolume .  ";
    queryString = queryString + "         ?vplexStorageVolume srm:Identifier ?vplexStorageVolID . ";
    queryString = queryString + "         ?vplexStorageVolume srm:residesOnVPlexCluster ?vplex . ";
    queryString = queryString + "         ?vplexStorageVolume srm:volumeWWN ?vplexStorageVolumeSN . ";
    queryString = queryString + "         ?vplex srm:displayName ?vplexName . ";
    queryString = queryString + "         ?vplexStorageVolume srm:displayName ?vplexStorageVolumeName . ";
    queryString = queryString + "         ?vplexStorageVolume srm:associatedToStorageVolume ?storageVolAssoc .   ";
    queryString = queryString + "         ?storageVolAssoc srm:associatedToStorageVolume ?storageVol . ";
    queryString = queryString + "         ?storageVol srm:displayName ?storageVolName . ";
    queryString = queryString + "         ?storageVol srm:residesOnStorageEntity ?storage . ";
    queryString = queryString + "         ?storage srm:displayName ?storageName . ";
    queryString = queryString + "         ?storage srm:arrayModel  ?storageModel  . ";


    queryString = queryString + "         OPTIONAL {  ";
    queryString = queryString + "         ?vplexStorageVolume  srm:residesOnDevice ?vplexDevice . ";
    queryString = queryString + "         ?vplexDevice srm:residesOnVirtualVolume ?vplexVVol . ";
    queryString = queryString + "         ?vplexVVol srm:displayName ?vplexVVolName . ";
    queryString = queryString + "         ?vplexVVol srm:maskedTo ?maskview . ";
    queryString = queryString + "         ?maskview srm:displayName ?maskviewName .  ";
    queryString = queryString + "         }  ";

    if (device !== undefined) {
        queryString = queryString + "         FILTER  (?vplexName = '" + device + "' ) .  ";
    }


    queryString = queryString + "     }   ";

    topos.querySparql(queryString, function (response) {
        //var resultRecord = RecordFlat(response.raw_body, keys);

        callback(response);
    });



}


function getVplexVirtualVolume(device, callback) {

    var param = {};
    param['filter_name'] = '(name=\'Capacity\'|name=\'UsableCapacity\'|name=\'UsedCapacity\'|name=\'PresentedCapacity\'|name=\'HealthState\')';
    param['keys'] = ['device', 'part'];
    param['fields'] = ['dgraid', 'ismapped', 'ismasked', 'isused', 'lunwwn', 'partsn', 'vdisk', 'view', 'vstatus', 'array', 'name'];
    param['period'] = 3600;

    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&devtype==\'VirtualStorage\'&parttype=\'VirtualVolume\'';
    } else {
        param['filter'] = 'devtype==\'VirtualStorage\'&parttype=\'VirtualVolume\'';
    }

    CallGet.CallGet(param, function (param) {

        var data = param.result;

        var finalResult = {};

        // ---- Checker for matrics is null or 'n/a'
        for (var i in data) {
            var item = data[i];
            item.Capacity = item.Capacity == 'n/a' ? '0' : item.Capacity;
            item.UsableCapacity = item.UsableCapacity == 'n/a' ? '0' : item.UsableCapacity;
            item.UsedCapacity = item.UsedCapacity == 'n/a' ? '0' : item.UsedCapacity;
            item.PresentedCapacity = item.PresentedCapacity == 'n/a' ? '0' : item.PresentedCapacity;

        }

        callback(data);

    });

};

function GetVirtualVolumeRelationByDevices(device, callback) {


    var queryString = "     PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>        ";
    queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
    queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";
    queryString = queryString + " SELECT distinct ?vplexName ?VPlexVirtualVolumeName  ?vplexDeviceName  ?vplexStorageVolumeName ?storageVolumeName  ?storageName  ?storageModel ?maskviewName   ";
    queryString = queryString + " WHERE {    ";
    queryString = queryString + "     ?vplexVirtualVolume rdf:type srm:VPlexVirtualVolume .   ";
    queryString = queryString + "     ?vplexVirtualVolume srm:displayName ?VPlexVirtualVolumeName .  ";
    queryString = queryString + "     ?vplexVirtualVolume srm:Identifier ?VPlexVirtualVolumeID .  ";
    queryString = queryString + "     ?vplexVirtualVolume srm:residesOnVPlexCluster ?vplex .  ";
    queryString = queryString + "     ?vplex srm:displayName ?vplexName .  ";
    queryString = queryString + "     ?vplexVirtualVolume srm:containsDevice ?vplexDevice .  ";
    queryString = queryString + "     ?vplexDevice srm:displayName ?vplexDeviceName .  ";
    queryString = queryString + "     ?vplexDevice srm:containsStorageVolume ?vplexStorageVolume .  ";
    queryString = queryString + "     ?vplexStorageVolume srm:displayName ?vplexStorageVolumeName .  ";
    queryString = queryString + "     ?vplexStorageVolume srm:associatedToStorageVolume ?storageVolAssoc .  ";
    queryString = queryString + "     ?storageVolAssoc srm:associatedToStorageVolume ?storageVolume .  ";
    queryString = queryString + "     ?storageVolume srm:displayName ?storageVolumeName .   ";
    queryString = queryString + "     ?storageVolume srm:residesOnStorageEntity ?storage .   ";
    queryString = queryString + "     ?storage srm:displayName ?storageName .  ";
    queryString = queryString + "     ?storage srm:arrayModel  ?storageModel  . ";

    queryString = queryString + "     ?vplexVirtualVolume srm:maskedTo ?maskview .  ";
    queryString = queryString + "     ?maskview srm:displayName ?maskviewName .  ";

    //queryString = queryString + "     FILTER ( ?VPlexVirtualVolumeID = 'topo:srm.VPlexVirtualVolume:CKM00133904692:device_Symm0703_0746_1_vol' )   ";

    queryString = queryString + " }    ";


    topos.querySparql(queryString, function (response) {
        //var resultRecord = RecordFlat(response.raw_body, keys);

        callback(response);
    });



}

function getVplexStorageViews(device, callback) {


    async.waterfall(
        [
            function (callback) {

                var param = {};
                //param['filter_name'] = '(name=\'Availability\')';
                param['keys'] = ['device', 'part'];
                //param['fields'] = ['ports','portwwns','inits','initwwns','cluster','array','vplexid','opstatus'];
                param['fields'] = ['ports', 'portwwns', 'inits', 'initwwns', 'cluster', 'vplexid', 'opstatus'];

                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&parttype==\'StorageView\'&source=\'VPLEX-Collector\'';
                } else {
                    param['filter'] = 'parttype==\'StorageView\'&source=\'VPLEX-Collector\'';
                }
                param['period'] = 3600;

                CallGet.CallGet(param, function (param) {

                    var data = param.result;

                    var result = [];
                    // Convert inits and ports to Array List.
                    for (var i in data) {
                        var item = data[i];
                        var inits = item.initwwns;
                        var ports = item.portwwns;
                        item['ports'] = [];
                        item['inits'] = [];
                        if (inits !== undefined) {
                            item.inits = inits.split('|').sort();
                        }
                        if (ports !== undefined) {
                            item.ports = ports.split('|').sort();
                        }

                        var newItem = {
                            "device": item.device,
                            "part": item.part,
                            "ports": item.ports,
                            "inits": item.inits,
                            "cluster": item.cluster,
                            "array": "",
                            "vplexid": item.vplexid,
                            "opstatus": item.opstatus
                        }
                        var isfind = false;
                        for ( var j in result ) {
                            var resultItem = result[j];
                            if ( 
                                newItem.device == resultItem.device && 
                                newItem.part == resultItem.part && 
                                newItem.cluster == resultItem.cluster &&  
                                newItem.vplexid == resultItem.vplexid && 
                                newItem.opstatus == resultItem.opstatus
                                ) { 
                                    if ( 
                                        newItem.ports.toString() == resultItem.ports.toString() && 
                                        newItem.inits.toString() == resultItem.inits.toString() 
                                        ) {

                                            isfind = true;
                                            break;
                                        }
                                }
                                
                        }
                        if ( isfind == false )
                            result.push(newItem);
                    }


                    var finalResult = {};

                    // ----- the part of chart -------------- 
                    callback(null, result);

                });


            },
            function (arg1, callback) {

                var param = {};
                //param['filter_name'] = '(name=\'Availability\')';
                param['keys'] = ['device', 'part'];
                param['fields'] = ['device', 'part', 'maxspeed', 'ifspeed', 'nodewwn', 'portwwn', 'portstat', 'model','director'];

                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&datagrp==\'VPLEX-Port\'';
                } else {
                    param['filter'] = 'datagrp==\'VPLEX-Port\'';
                }
                param['period'] = 3600;

                CallGet.CallGet(param, function (param) {

                    var data = param.result;
                    for (var z in data) {
                        var dataItem = data[z];
                        dataItem.part = dataItem.director + ':' + dataItem.part;
                    }


                    for (var i in arg1) {
                        var item = arg1[i];
                        if (item["portinfo"] === undefined) item["portinfo"] = [];
                        for (var j in item.ports) {
                            var portwwn = item.ports[j];

                            for (var z in data) {
                                var dataItem = data[z];
                                if (portwwn == dataItem.portwwn) {
                                    item.portinfo.push(dataItem);
                                    break;
                                }
                            }

                        }

                    }
                    callback(null, arg1);

                });
            },
            // Get All Localtion Records
            function (param, callback) {

                // Get the Virtual Volume of each view .
                getVplexVirtualVolume(device, function (vvols) {
                    for (var i in param) {
                        var item = param[i];
                        if (item.vvol === undefined) {
                            item['vvol'] = [];
                        }
                        if (item.Capacity === undefined) {
                            item['Capacity'] = 0;
                        }

                        for (var j in vvols) {
                            var vvolItem = vvols[j];
                            if (vvolItem.view !== undefined) {
                                if (vvolItem.view == item.part) {
                                    item.vvol.push(vvolItem);
                                    item.Capacity += parseFloat(vvolItem.Capacity);
                                }
                            }
                        }

                        // Get some Count.
                        item['vvolCount'] = item.vvol.length;
                        item['portCount'] = item.ports.length;
                        item['initCount'] = item.inits.length;
                        item.Capacity = Math.round(item.Capacity);
                    }

                    callback(null, param);
                })

            },
            function (param, callback) {
                callback(null, param);
            }
        ], function (err, result) {
            // result now equals 'done'
            callback(result);
        });



};



function getVplexStorageViews_V1(device, callback) {

    /*
        if ( device === undefined ) {
            callback('Must be special a device!');
            return;
        }
*/

    async.waterfall(
        [
            function (callback) {

                var param = {};
                param['filter_name'] = '(name=\'Availability\')';
                param['keys'] = ['device', 'part'];
                param['fields'] = ['ports', 'inits', 'cluster', 'array', 'vplexid', 'opstatus'];

                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&parttype==\'StorageView\'&source=\'VPLEX-Collector\'';
                } else {
                    param['filter'] = 'parttype==\'StorageView\'&source=\'VPLEX-Collector\'';
                }
                param['period'] = 3600;

                CallGet.CallGet(param, function (param) {

                    var data = param.result;

                    // Convert inits and ports to Array List.
                    for (var i in data) {
                        var item = data[i];
                        var inits = item.inits;
                        var ports = item.ports;
                        item['ports'] = [];
                        item['inits'] = [];
                        if (inits !== undefined) {
                            item.inits = inits.split('|');
                        }
                        if (ports !== undefined) {
                            item.ports = ports.split('|');
                        }
                    }


                    var finalResult = {};

                    // ----- the part of chart --------------

                    callback(null, data);

                });


            },
            // Get All Localtion Records
            function (param, callback) {

                // Get the Virtual Volume of each view .
                getVplexVirtualVolume(device, function (vvols) {
                    for (var i in param) {
                        var item = param[i];
                        if (item.vvol === undefined) {
                            item['vvol'] = [];
                        }
                        if (item.Capacity === undefined) {
                            item['Capacity'] = 0;
                        }

                        for (var j in vvols) {
                            var vvolItem = vvols[j];
                            if (vvolItem.view !== undefined) {
                                if (vvolItem.view == item.part) {
                                    item.vvol.push(vvolItem);
                                    item.Capacity += parseFloat(vvolItem.Capacity);
                                }
                            }
                        }

                        // Get some Count.
                        item['vvolCount'] = item.vvol.length;
                        item['portCount'] = item.ports.length;
                        item['initCount'] = item.inits.length;
                        item.Capacity = Math.round(item.Capacity);
                    }

                    callback(null, param);
                })

            },
            function (param, callback) {
                callback(null, param);
            }
        ], function (err, result) {
            // result now equals 'done'
            callback(result);
        });



};

function getVplexFEPort(device, callback) {

    if (device === undefined) {
        callback('Must be special a device!');
        return;
    }

    var param = {};
    param['filter_name'] = '(name=\'Speed\'|name=\'Ifspeed\'|name=\'Availability\')';
    param['keys'] = ['device', 'director', 'part'];
    param['fields'] = ['portstat', 'tgtwwn', 'opstatus', 'proto', 'portwwn', 'nodewwn', 'ifspeed', 'maxspeed', 'iftype'];

    var baseFilter = 'parttype==\'Port\'&source=\'VPLEX-Collector\'';
    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&' + baseFilter;
    } else {
        param['filter'] = baseFilter;
    }

    CallGet.CallGet(param, function (param) {

        var data = param.result;

        var finalResult = {};

        // ----- the part of chart --------------

        callback(data);

    });

};

function getVplexDirectors(device, callback) {

    if (device === undefined) {
        callback('Must be special a device!');
        return;
    }

    var param = {};
    param['filter_name'] = '(name=\'Availability\'|name=\'HealthState\')';
    param['keys'] = ['device', 'part'];
    param['fields'] = ['health', 'dirmodel', 'engineid'];

    var baseFilter = 'parttype=\'Director\'&source=\'VPLEX-Collector\'';
    if (typeof device !== 'undefined') {
        param['filter'] = 'device=\'' + device + '\'&' + baseFilter;
    } else {
        param['filter'] = baseFilter;
    }
    param['period'] = '3600';


    CallGet.CallGet(param, function (param) {

        var data = param.result;

        var finalResult = {};

        // ----- the part of chart --------------

        callback(data);

    });

};



function getDirectorPerformance(device, part, start, end, callback) {


    if (device == 'CKM00133904693') device = 'CMB00133904693';
    if (device == 'CKM00133904692') device = 'CMB001339004692';

    var config = configger.load();
    //var start = '2017-06-10T18:30:00+08:00'
    //var end = '2017-06-10T19:30:00+08:00'
    //var start = util.getPerfStartTime();
    //var end = util.getPerfEndTime();

    var filterbase = 'device==\'' + device + '\'&parttype==\'Director\'&part=\'' + part + '\'';

    async.waterfall([
        function (callback) {
            var filter = filterbase + '&(name=\'CurrentUtilization\'|name=\'FeOps\'|name=\'BeOps\'|name=\'ReadLatency\'|name=\'WriteLatency\')';

            var fields = 'device,name,part';
            var keys = ['device,part'];



            //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
            var queryString = { 'properties': fields, 'filter': filter, 'start': start, 'end': end, period: '3600' };

            console.log(queryString);

            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({ 'Content-Type': 'multipart/form-data' })
                .query(queryString)
                .end(function (response) {
                    if (response.error) {
                        console.log(response.error);
                        return response.error;
                    } else {
                        //console.log(response.raw_body);   
                        var resultRecord = response.raw_body;
                        callback(null, resultRecord);
                    }

                });


        },
        function (arg1, callback) {

            var result = [];
            var oriArray = JSON.parse(arg1).values;
            for (var i in oriArray) {
                var item = oriArray[i].properties;
                console.log(item.part + '\t' + item.name);
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

            var result1 = util.convertPerformanceStruct(result);
            //var ret = arg1.values; 
            callback(null, result1);


        },
        function (data, callback) {

            var finalResult = {};
            finalResult['charts'] = [];


            var matrics = data[0].matrics;
            var result = {};
            result['category'] = 'CurrentUtilization';
            result['chartData'] = [];
            for (var i in matrics) {
                var item = matrics[i];
                var chartDataItem = {};
                chartDataItem['name'] = item.timestamp;
                chartDataItem['CurrentUtilization'] = item.CurrentUtilization;

                result.chartData.push(chartDataItem);

            }

            finalResult.charts.push(result);

            var result = {};
            result['category'] = 'Throughput';
            result['chartData'] = [];
            for (var i in matrics) {
                var item = matrics[i];
                var chartDataItem = {};
                chartDataItem['name'] = item.timestamp;
                chartDataItem['FeOps'] = item.FeOps;
                chartDataItem['BeOps'] = item.BeOps;

                result.chartData.push(chartDataItem);

            }


            var result1 = {};
            result1['category'] = 'Latency(ms)';
            result1['chartData'] = [];
            for (var i in matrics) {
                var item = matrics[i];
                var chartDataItem = {};
                chartDataItem['name'] = item.timestamp;
                chartDataItem['ReadLatency'] = item.ReadLatency / 1000;
                chartDataItem['WriteLatency'] = item.WriteLatency / 1000;

                result1.chartData.push(chartDataItem);

            }


            finalResult.charts.push(result);
            finalResult.charts.push(result1);

            callback(null, finalResult);
        }
    ], function (err, result) {
        // result now equals 'done'
        //res.json(200, result);
        // var r = JSON.parse(result);
        callback(result);
    });





};

function GetFEPortRelationByDevices(device, callback) {

    if (device === undefined) {
        callback('Must be special a device!');
        return;
    }

    var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
    queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
    queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";
    queryString = queryString + "   ";
    queryString = queryString + " SELECT distinct ?vplexName ?vplexPortName ?vplexPortWWN ?vplexPortID ?vplexPortType  ?vplexDirectorName   ?switchPortName ?switchName  ";
    queryString = queryString + " WHERE {    ";
    queryString = queryString + "     ?vplexPort rdf:type srm:VPlexPort .   ";
    queryString = queryString + "     ?vplexPort srm:displayName ?vplexPortName .  ";
    queryString = queryString + "     ?vplexPort srm:Identifier ?vplexPortID .  ";
    queryString = queryString + "     ?vplexPort srm:type ?vplexPortType .  ";
    queryString = queryString + "   ";
    queryString = queryString + "     ?vplexPort srm:residesOnVPlexDirector ?vplexDirector .  ";
    queryString = queryString + "     ?vplexDirector srm:displayName ?vplexDirectorName .  ";
    queryString = queryString + "     ?vplexDirector srm:residesOnVPlexCluster ?vplex .  ";
    queryString = queryString + "     ?vplex srm:displayName?vplexName .  ";
    queryString = queryString + "   ";
    queryString = queryString + "     ?vplexPort  srm:containsProtocolEndpoint ?vplexPortPE .  ";
    queryString = queryString + "     ?vplexPortPE srm:connectedTo ?vplexPortConnectTo .  ";
    queryString = queryString + "     ?vplexPortConnectTo srm:residesOnSwitchPort ?switchPort .  ";
    queryString = queryString + "     ?switchPort srm:displayName ?switchPortName .  ";
    queryString = queryString + "     ?switchPort srm:residesOnPhysicalSwitch ?switch .  ";
    queryString = queryString + "     ?switch srm:displayName ?switchName .  ";
    queryString = queryString + "        ";
    queryString = queryString + " }    ";



    topos.querySparql(queryString, function (response) {
        //var resultRecord = RecordFlat(response.raw_body, keys);

        callback(response);
    });



}
