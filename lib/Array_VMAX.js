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
    GetArraysByDatacenter,
    GetInitialGroups,
    GetDevices,
    GetFEPorts,
    GetMaskViews,
    GetAssignedHosts,
    GetAssignedHostsByDevices,
    getArrayPerformance,
    getArrayLunPerformance,
    getArrayLunGroupPerformance,
    getArrayLunPerformanceByList,
    getArrayLunPerformanceByListWithDT,
    convertPerformanceStruct,
    GetAssignedVPlexByDevices,
    GetArrays_VMAX
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
            param['filter'] = 'device=\''+arraysn+'\'&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        } else {
            param['filter'] = '!parttype&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        } 

        param['filter_name'] = '(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
        param['keys'] = ['device'];
        param['fields'] = ['sstype','device','model','vendor','devdesc'];
 
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result) {
                        var item = param.result[i];

                        var ConfiguredUsableCapacity = item.ConfiguredUsableCapacity;
                        var UsedCapacity = item.UsedCapacity;
                        var UsedPercent = UsedCapacity / ConfiguredUsableCapacity * 100;
                        //console.log(item.device + '=' + UsedPercent.toFixed(0));
                        item['UsedPercent'] = UsedPercent.toFixed(0);

                        item.TotalMemory = Math.round(item.TotalMemory).toString();
                        item.TotalDisk = Math.round(item.TotalDisk).toString();
                        item.TotalLun = Math.round(item.TotalLun).toString();

                    } 
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

                                    ArrayObj.findOne({"basicInfo.device" : arraysn}, function (err, doc) {
                                        //system error.
                                        if (err) {
                                            return   done(err);
                                        }
                                        if (!doc) { //user doesn't exist.
                                            console.log("array is not exist. insert it."); 

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


            }
        ], function (err, result) {
           // result now equals 'done'
           callback(result.result);
        });

    };

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


function GetArrays(device, callback) {


        var param = {};
        var arraysn = device; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        } else {
            param['filter'] = '!parttype&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        } 

        param['filter_name'] = '(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
        param['keys'] = ['device'];
        param['fields'] = ['sstype','device','model','vendor','devdesc'];
 
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
                    }
                 callback(null,param);
 

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
            function(callback){ 
                GetMaskViews(device, function(result) {
                    for ( var i in result ) {
                        var item = result[i];

                        for ( var j in item.initgrp_member) {
                            var initItem = item.initgrp_member[j];

                            for ( var z in item.portgrp_member) {
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

                    callback(null,finalResult);

                })
           },
            // -- Get all of initial group member list and rela with maskview 
            function(result,  callback){   
                var hostname;
                host.GetHBAFlatRecord(hostname,function(hbalist) {


                    for ( var hosthba in hbalist ) {
                        var hosthbaItem = hbalist[hosthba];
                        
                        for ( var i in result ) {
                            var maskItem = result[i];

                            if ( hosthbaItem.hba_wwn == maskItem.hba_wwn ) { 
                                maskItem['host'] = hosthbaItem;
                            } 
                        }
                    } 
  
                    callback(null,result);
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

        if ( typeof device !== 'undefined') {
            var arraysn = device;
        }
        
        var param = {};

        async.waterfall([
            
            // -- Get All of maskview list 
            function(callback){ 

                param['filter_name'] = '(name=\'Capacity\')';
                param['keys'] = ['device','part'];
                param['fields'] = ['device','part','initgrp','portgrp','dirnport','sgname','mapped','masked'];

                if (typeof arraysn !== 'undefined') { 
                    param['filter'] = 'device=\''+arraysn+'\'&(datagrp=\'VMAX-ACCESS\'&parttype=\'Access\')';
                } else {
                    param['filter'] = '(datagrp=\'VMAX-ACCESS\'&parttype=\'Access\')';
                } 

                
                CallGet.CallGet(param, function(param) {
                    callback(null, param.result);
                });

           },
            // -- Get all of initial group member list and rela with maskview 
            function(result,  callback){  

                GetInitialGroups(arraysn, function(initgrp_res) {

                    for ( var i in result) {
                        var item = result[i];
                        //item['initgrp_member'] = [];
                        for ( var j in initgrp_res ) { 
                            var item_init = initgrp_res[j]; 

                            if ( ( item.device == item_init.device ) &&
                                 //( item.part == item_init.viewname ) &&
                                 ( item.initgrp == item_init.initgrp)
                                ) {
                                item['initgrp_member'] = item_init.initwwn; 
                            }

                        }
                    }

                    callback(null, result);

                });

            },
            // -- Get all of FE Port list and rela with maskview's PG-Group
            function(result,  callback){  

                GetFEPorts(arraysn, function(feport_res) {

                    for ( var i in result) {
                        var item = result[i];
                        item['portgrp_member'] = [];
                        if ( item.dirnport != undefined ) {
                            var feportMembers = item.dirnport.split('|');
                            for ( var j in feportMembers ) { 
                                var fePortItem = feportMembers[j]; 

                                for (var z in feport_res ) {
                                    var fePortListItem = feport_res[z];
                                    if ( item.device == fePortListItem.device && fePortItem == fePortListItem.feport )  {
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
            function(result,  callback){ 
 
                GetDevices(arraysn, function(res) {
                   for ( var i in result) {
                        var item = result[i];
                        item['sg_member'] = [];
                        for ( var j in res ) { 
                            var item_sg = res[j];   

                             if ( typeof item_sg.sgname !== 'undefined' )
                                if ( ( item.device == item_sg.device ) &&
                                     item_sg.sgname.indexOf(item.sgname) >= 0
                                    ) {   
                                    item.sg_member.push(item_sg); 
                                }

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
function GetInitialGroups(device, callback) {
    var initgrp_param = {};
    //initgrp_param['filter_name'] = '(name=\'PropertiesOnly\')';
    initgrp_param['keys'] = ['device','viewname','initgrp','initwwn'];
    initgrp_param['fields'] = ['device','viewname','initgrp','initwwn'];

    initgrp_param['filter'] = '(source=\'VMAX-Collector\'&reltype=\'AccessToInitiatorPort\')';
    if (typeof arraysn !== 'undefined') { 
        initgrp_param['filter'] = 'device=\''+arraysn+'\'&'+initgrp_param.filter;
    } 


    CallGet.CallGet(initgrp_param, function(initgrp_param) { 
        var result = [];
        for ( var i in initgrp_param.result ) {
            var item = initgrp_param.result[i];
            var isFind = false;
            for ( var j in result ) {
                var resultItem = result[j];
                if ( typeof resultItem.initwwn === 'undefined') 
                    resultItem.initwwn = [];
                if ( item.device == resultItem.device && item.initgrp == resultItem.initgrp ) {
                    if ( resultItem.initwwn.indexOf(item.initwwn) < 0 ) {
                        resultItem.initwwn.push(item.initwwn);
                        
                    };
                    isFind = true;
                }
            }
            if ( isFind == false ) {
                var newItem = {};
                newItem['device'] = item.device;
                newItem['initgrp'] = item.initgrp;
                newItem['initwwn'] = [];
                newItem.initwwn.push(item.initwwn);
                result.push(newItem);
            }

        }
        callback( result ); 
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

function GetDevices(device, callback) {
    var param = {}; 
    param['filter'] = '(parttype=\'MetaMember\'|parttype=\'LUN\')';
    param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
    param['keys'] = ['device','part','parttype'];
    param['fields'] = ['alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked'];
    param['limit'] = 1000000;

    if (typeof device !== 'undefined') { 
        param['filter'] = 'device=\''+device+'\'&' + param['filter'];
    } 


    async.waterfall([
        function(callback){ 
            CallGet.CallGet(param, function(param) { 
            var result = [];
     
            callback(null, param.result ); 
            });
        },
        function(arg1,  callback){ 
            getArrayLunPerformance(device,function(result) {

                for ( var i in arg1 ) {
                    var deviceItem = arg1[i];

                    for ( var j in result ) {
                        var devicePerfItem = result[j];

                        if ( deviceItem.device == devicePerfItem.device && deviceItem.part == devicePerfItem.part ) {
                            deviceItem['perf'] = devicePerfItem.matrics;
                        }
                    }
                }
                callback(null,arg1);
            })
        },
        function(arg1,  callback){ 
            GetAssignedHostsByDevices(device, function(result1) {

                for ( var i in arg1 ) {
                    var deviceItem = arg1[i];

                    for ( var j in result1 ) {
                        var devInitiatorItem = result1[j];

                        if ( deviceItem.device == devInitiatorItem.arraySN && deviceItem.partsn == devInitiatorItem.deviceWWN ) {
                            deviceItem['initiators'] = devInitiatorItem.initiator; 
                        }
                    }
                }
                callback(null,arg1);

            }) 
        },
        // -- Get all of initial group member list and rela with maskview 
        function(arg1,  callback){   
            var hostname;
            host.GetHBAFlatRecord(hostname,function(hbalist) {

                for ( var i in arg1 ) {
                    var deviceItem = arg1[i];
                    var initList = deviceItem.initiators;

                    var hostinfo = [];
                    for ( var j in initList ) {
                        var initItem = initList[j];

                        var newInitItem = {};
                        newInitItem.hbawwn = initItem;
                        newInitItem.hostname = 'unknow';

                        var isFind = false;
                        for ( var hosthba in hbalist ) {
                            var hosthbaItem = hbalist[hosthba]; 

                            if ( hosthbaItem.hba_wwn == initItem ) { 
                                isFind = true;
                                hostinfo.push(hosthbaItem);
                            }  
                        } 
                        if ( !isFind ) hostinfo.push(newInitItem);
               
                    }
                    deviceItem['hostinfo'] = hostinfo;

                }
                callback(null,arg1);
            })
        }
    ], function (err, result) {
       // result now equals 'done'
       //res.json(200, result);
       // var r = JSON.parse(result);
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

	topos.querySparql(queryString,  function (response) {
                        //var resultRecord = RecordFlat(response.body, keys);
                        var resultJson = []; 
                        for ( var i in response) {
                            var item = response[i];
                            if ( item.endpoint != undefined ) {
                                item.endpoint = item.endpoint.replace('topo:srm.ProtocolEndpoint:','');
                            }
                            
                            var isFind = false;
                            for ( var j in resultJson ) {
                                var resultItem = resultJson[j];
                                if ( item.deviceWWN == resultItem.deviceWWN ) {
                                    resultItem.initiator.push(item.endpoint);
                                    isFind = true;
                                    break;
                                }
                            }
                            if ( !isFind ) {
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
        queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  "; 
        queryString = queryString + "    } ";

        topos.querySparql(queryString,  function (response) {
                        //var resultRecord = RecordFlat(response.body, keys);

                        callback(response);
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

function GetFEPorts(device, callback) {

    var param = {};
    param['filter_name'] = '(name=\'IORate\'|name=\'Throughput\'|name=\'Availability\')';
    param['keys'] = ['device','feport'];
    param['fields'] = ['nodewwn','portwwn','partstat'];

    if (typeof device !== 'undefined') { 
        param['filter'] = 'device=\''+device+'\'&parttype=\'Port\'';
    } else {
        param['filter'] = 'parttype=\'Port\'';
    } 

    CallGet.CallGet(param, function(param) {
        callback( param.result ); 
    });
 

}




 function getArrayPerformance(callback) {
 
        var config = configger.load();
        //var start = '2016-06-20T18:30:00+08:00'
        //var end = '2016-07-01T18:30:00+08:00'
        var start = util.getPerfStartTime();
        var end = util.getPerfEndTime();
        var filterbase = '!parttype'; 

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name==\'ReadRequests\'|name==\'WriteRequests\')';
                var fields = 'device,name';
                var keys = ['device'];



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



 function getArrayLunPerformance(device, callback) {
 
        var config = configger.load();
        //var start = '2016-06-20T18:30:00+08:00'
        //var end = '2016-07-01T18:30:00+08:00'
        var start = util.getPerfStartTime();
        var end = util.getPerfEndTime();
        if  ( typeof device === 'undefined') 
            var filterbase = '(parttype==\'LUN\'|parttype==\'MetaMember\')';
        else 
            var filterbase = 'device==\''+device+'\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
                var fields = 'device,name,part,parttype';
                var keys = ['device,part'];



                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
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


function convertPerformanceTemplateStruct(perf) {
    var chartsResult = [];

    for ( var i in perf ) {

        var lunItem = perf[i];
        var lunName = lunItem.part;
        var device = lunItem.device;
        var matrics = lunItem.matrics;
        for ( var ts in matrics ) {
            var tsItem = matrics[ts];
            var tsItemKeys = Object.keys(tsItem);
            for ( var keyi in tsItemKeys ) {
                var keyName = tsItemKeys[keyi];
                // Search category in charts data struct
                var chartItem_isfind = false ;
                for ( var chartItem_i in chartsResult ) {
                    var chartItem = chartsResult[chartItem_i];
                    if ( keyName == chartItem.category ) {
                        var chartData = chartItem.chartData;
                        var chartData_isfind = false;
                        for ( var chartDataItem_i in chartData ) {
                            if ( chartData[chartDataItem_i].name == tsItem.timestamp ) {
                                chartData[chartDataItem_i][keyName] = tsItem[keyName];
                                chartData_isfind = true;
                                break;                            }
                        }
                        if ( !chartData_isfind ) {
                            var newChartDataItem = {};
                            newChartDataItem['name'] = tsItem.timestamp;
                            newChartDataItem[keyName] = tsItem[keyName];
                            chartData.push(newChartDataItem);
                        }
                        chartItem_isfind = true;
                    }
                }
                if ( !chartItem_isfind) {
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

function convertPerformanceStruct(perf) {

    var finalResult = [];
    for ( var i in perf ) {
        var lunItem = perf[i];

        var lunItemResult = {};
        lunItemResult['part'] = lunItem.part;
        lunItemResult['parttype'] = lunItem.parttype;
        lunItemResult['device'] = lunItem.device;
        lunItemResult['matrics'] = [];
        var lunMatricsArray = [];

        for ( var j in lunItem.matrics ) {
            var lunMatrics = lunItem.matrics[j];
            var keys = Object.keys(lunMatrics)
            for ( var z in keys ) {
                if ( keys[z] != 'max' && keys[z] != 'avg') {
                    var matricsName = keys[z];

                    for ( var aa in lunMatrics[matricsName] ) {
                        var lunMatricsItem = {};
                        var item1 = lunMatrics[matricsName][aa];
                        lunMatricsItem['timestamp'] = item1[0];
                        lunMatricsItem[matricsName] = item1[1];

                        var isfind = false;
                        for ( var tt in lunMatricsArray ) {
                            //console.log(lunMatricsArray[tt].timestamp + '\t' + lunMatricsItem.timestamp);
                            if ( lunMatricsArray[tt].timestamp == lunMatricsItem.timestamp ) {
                                //console.log("isfind="+matricsName + '=' + lunMatricsItem[matricsName] );
                                lunMatricsArray[tt][matricsName] = lunMatricsItem[matricsName];
                                isfind = true;
                                break;
                            }
                        }
                        if ( !isfind ) {
                            lunMatricsArray.push(lunMatricsItem);
                        }

                    }
                    
                }
            } 

        } // end for ( var j in lunItem.matrics )

        lunItemResult['matrics'] = lunMatricsArray;
        finalResult.push(lunItemResult);
    }

    return finalResult;

}


function getArrayLunGroupPerformance(device, lunStr, start, end, callback ) {

    async.waterfall([
            function(callback){ 
 
               console.log("getArrayLunPerformanceByList="+ device + "|" + lunStr + "|");

 
                getArrayLunPerformanceByListWithDT(device, lunStr , start, end , function(perfresult) {
                    callback(null,perfresult);
                });
                        
            },
            function(arg1,callback){ 

                //console.log(arg1)
                //console.log("---------------------------------");
                
                var perfdata = convertPerformanceStruct(arg1);


                var charts = [];

                for ( var i in perfdata ) {
                    var item = perfdata[i];

                    for ( var matricsi in item.matrics ) {

                        var matrics = item.matrics[matricsi];
                        //console.log("--------matrics begin ------------");
                        //console.log(matrics);
                        //console.log("--------matrics end------------");
                        var keys = Object.keys(matrics);
                        var lunname = item.part;                //lunname;
                        var arrayname  = item.device;           //array

                        for ( var keyi in keys ) {
                            var keyname = keys[keyi];

                            if ( keyname == 'timestamp' ) {
                                var timestamp = matrics[keyname];   //ts
                                continue;
                            } else {
                                var categoryname = keyname;         //perf-matrics-name
                                var value = matrics[keyname];       //perf-matrics-value
                            }
                            //console.log("array="+arrayname);
                            //console.log("lunname="+lunname);
                            //console.log("ts="+timestamp);
                            //console.log("categoryname="+categoryname);
                            //console.log("value="+value);
                            //console.log("---------");

                            // Search in result struct 
                            var isFind_chart = false;
                            for ( var charti in charts ) {
                                var chartItem = charts[charti];
                                if ( chartItem.category == categoryname ) {
                                    isFind_chart = true;

                                    var isFind_chartData = false;
                                    for ( var chartDatai in chartItem.chartData ) {
                                        var chartDataItem = chartItem.chartData[chartDatai] ;
                                        if ( chartDataItem.name == timestamp ) {
                                            isFind_chartData = true;
                                            chartDataItem[lunname] = value;
                                        }

                                    } // for 

                                    if ( !isFind_chartData ) {
                                        var chartDataItem = {};
                                        chartDataItem['name'] = timestamp;
                                        chartDataItem[lunname] = value;
                                        chartItem.chartData.push(chartDataItem);
                                    }

                                }
                            } // for ( charts ) 

                            if ( !isFind_chart ) {
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


                callback(null,charts);
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

function getArrayLunPerformanceByList(device, lunStr , callback) {

        var start = util.getPerfStartTime();
        var end = util.getPerfEndTime();  

 
        getArrayLunGroupPerformance(device, lunStr , start, end , function(result) {
            callback(result);
        });

}
function getArrayLunPerformanceByListWithDT(device, lunStr , start, end , callback) {
  
        var config = configger.load();
        //var start = '2016-06-20T18:30:00+08:00'
        //var end = '2016-07-01T18:30:00+08:00'

        var lun = lunStr.toString(); 
 
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
                lunFilter = 'part==\''+item+'\'';
            } else {
                lunFilter = lunFilter +'|part==\''+item+'\'';
            }
        }
        lunFilter = '(' + lunFilter + ')';

        var filterbase = lunFilter + '&device==\''+device+'\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
                var fields = 'device,name,part,parttype';
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


function GetCapacity(device, callback) {
    var param = {}; 


    if (typeof device !== 'undefined') { 
        var filterbase = 'device=\''+arraysn+'\'&!parttype';
    } else {
        var filterbase = '!parttype';
    } 

    async.waterfall([
        function(callback){ 
            var filter = filterbase + '&(name==\'PrimaryUsedCapacity\'|name==\'LocalReplicaUsedCapacity\'|name==\'RemoteReplicaUsedCapacity\'|name==\'SystemUsedCapacity\'|name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'VirtualUsedCapacity\'|name=\'HDFSUsedCapacity\'|name=\'ObjectUsedCapacity\'|name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredRawCapacity\'|name=\'UnusableCapacity\')';
            var fields = 'device,name';
            var keys = ['device'];

            //var queryString =  {"filter":filter,"fields":fields}; 
            var queryString =  util.CombineQueryString(filter,fields); 
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
                                var arrayCapacitys = RecordFlat.RecordFlat(response.body, keys);   
                                var resultRecord =[];
                                for ( var i in arrayCapacitys ) {
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


                                    var usedByType ={};
                                    usedByType['BlockUsedCapacity'] = item.BlockUsedCapacity;
                                    usedByType['FileUsedCapacity'] = item.FileUsedCapacity;
                                    usedByType['VirtualUsedCapacity'] = item.VirtualUsedCapacity;
                                    usedByType['HDFSUsedCapacity'] = item.HDFSUsedCapacity;
                                    usedByType['ObjectUsedCapacity'] = item.ObjectUsedCapacity;
                                    usableCapacity['UsedCapacityByType'] = usedByType;

                                    var usedByPurpose ={};
                                    usedByPurpose['PrimaryUsedCapacity'] = item.PrimaryUsedCapacity;
                                    usedByPurpose['LocalReplicaUsedCapacity'] = item.LocalReplicaUsedCapacity;
                                    usedByPurpose['RemoteReplicaUsedCapacity'] = item.RemoteReplicaUsedCapacity;
                                    usedByPurpose['SystemUsedCapacity'] = item.SystemUsedCapacity; 
                                    usableCapacity['UsedCapacityByPurpose'] = usedByPurpose;

                                    result['Raw'] = rawCapacity;

                                    resultRecord.push(result);

                                }

                            callback(null,resultRecord);
                        }
     
                    }); 

 
        },
        function(arg1,  callback){  
           callback(null,arg1);


        }
    ], function (err, result) {
       // result now equals 'done'
       res.json(200, result);
    });






}
