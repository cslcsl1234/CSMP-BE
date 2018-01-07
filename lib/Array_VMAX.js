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
    GetArraysByDatacenter,
    GetInitialGroups,
    GetDevices,
    GetFEPorts,
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

    GetDMXMasking,
    GetAssignedInitiatorByDevices,

    GetSRDFGroups,
    GetSRDFLunToReplica, 
    GetStorageGroups,
    GetStorageGroupsPerformance,
    GetFEPorts1,

    GetPorts,
    GetCloneLunToReplica

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
            param['filter'] = 'device=\''+arraysn+'\'&datatype==\'Block\'&!parttype';
        } else {
            param['filter'] = '!parttype&datatype==\'Block\'';
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
                        item['UsedPercent'] = UsedPercent.toFixed(2);

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
            //param['filter'] = 'device=\''+arraysn+'\'&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
            param['filter'] = 'device=\''+arraysn+'\'&source=\'VMAX-Collector\'';
        } else {
            //param['filter'] = '!parttype&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
            param['filter'] = '!parttype&source=\'VMAX-Collector\'';
        } 

        param['filter_name'] = '(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
        param['keys'] = ['device'];
        param['fields'] = ['sstype','device','model','vendor','devdesc'];
        param['period'] = 0;
 
        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) {
                    for ( var i in param.result) {
                        var item = param.result[i];

                        var ConfiguredUsableCapacity = item.ConfiguredUsableCapacity;
                        var UsedCapacity = item.UsedCapacity;
                        var UsedPercent = UsedCapacity / ConfiguredUsableCapacity * 100; 
                        if ( UsedPercent.toFixed(0) >= 99 ) 
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
                    }
                 callback(null,param);
 

            }
        ], function (err, result) {
           // result now equals 'done'
           callback(result.result);
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



function GetSRDFGroups(device, callback) {

        if ( typeof device !== 'undefined') {
            var arraysn = device;
        }
        
        var param = {};

        async.waterfall([
            
            // -- Get All of maskview list 
            function(callback){ 

                param['filter_name'] = '(name=\'PropertiesOnly\')';
                param['keys'] = ['device','part'];
                param['fields'] = ['srdfgpnm','srdfgpty','remarray','name','mtrostat','mtrowtns','mtrobias'];

                if (typeof arraysn !== 'undefined') { 
                    param['filter'] = 'device=\''+arraysn+'\'&(source=\'VMAX-Collector\'&parttype=\'SRDFGroup\')';
                } else {
                    param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'SRDFGroup\')';
                } 

                
                CallGet.CallGet(param, function(param) {
                    callback(null, param.result);
                });

           },
            // -- Get all of initial group member list and rela with maskview 
            function(result,  callback){  

 

                    callback(null, result);


            },
            // -- Get all of FE Port list and rela with maskview's PG-Group
            function(result,  callback){  

                    callback(null, result);


            }
        ], 

        function (err, result) {
           // result now equals 'done'
           callback(result);
        });
};

function GetSRDFLunToReplica(device, callback) {

        if ( typeof device !== 'undefined') {
            var arraysn = device;
        }
        
        var param = {};

        async.waterfall([
            
            // -- Get All of maskview list 
            function(callback){ 

                param['filter_name'] = '(name=\'StateOfReplica\'|name=\'StateOfSource\')';
                param['keys'] = ['device','part'];
                param['fields'] = ['srcarray','srclun','srdfgrpn','srdfrgrp','copytype','repltype','replloc','replstat','remarray','remlun','srdfmode','repltech','linkstct','linkstat','tgtstate'];

                if (typeof arraysn !== 'undefined') { 
                    param['filter'] = 'device=\''+arraysn+'\'&!srdfgrpn=\'N/A\'&(source=\'VMAX-Collector\'&datagrp=\'VMAX-RDFREPLICAS\')';
                } else {
                    param['filter'] = '(source=\'VMAX-Collector\'&!srdfgrpn=\'N/A\'&datagrp=\'VMAX-RDFREPLICAS\')';
                } 

                
                CallGet.CallGet(param, function(param) {
                    callback(null, param.result);
                });

           },
            // -- Get all of initial group member list and rela with maskview 
            function(result,  callback){  
                var param = {}; 
                param['filter'] = '(parttype=\'LUN\')';
                //param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
                param['keys'] = ['device','part','parttype'];
                param['fields'] = ['sgname'];
                param['limit'] = 1000000;

                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&' + param['filter'];
                } 
 
                CallGet.CallGet(param, function(param) { 
     
                    var res = param.result;
                    for (var i in result ) {
                        var rdfItem = result[i];

                        for ( var j in res ) {
                            var lunItem = res[j];
                            if ( rdfItem.device == lunItem.device && rdfItem.part == lunItem.part ) {
                                rdfItem["sgname"] = lunItem.sgname;
                                break;
                            } else if ( rdfItem.remarray == lunItem.device && rdfItem.remlun == lunItem.part ) {
                                rdfItem["remsgname"] = lunItem.sgname;
                                break;
                            }
                        }
                        
                    }
                    callback(null,result);
                                      
                }); 


            },
            // -- Get all of FE Port list and rela with maskview's PG-Group
            function(result,  callback){  

                    callback(null, result);


            }
        ], 

        function (err, result) {
           // result now equals 'done'
           callback(result);
        });
};

function GetCloneLunToReplica(device, callback) {

        if ( typeof device !== 'undefined') {
            var arraysn = device;
        }
        
        var param = {};

        async.waterfall([
            
            // -- Get All of maskview list 
            function(callback){ 

                param['filter_name'] = '(name=\'StateOfReplica\')';
                param['keys'] = ['device','part'];
                param['fields'] = ['srcarray','srclun', 'repltype','replstat','repltech'];

                if (typeof arraysn !== 'undefined') { 
                    param['filter'] = 'device=\''+arraysn+'\'&(source=\'VMAX-Collector\'&(datagrp=\'VMAX-CLONEREPLICAS\'))';
                } else {
                    param['filter'] = '(source=\'VMAX-Collector\'&(datagrp=\'VMAX-CLONEREPLICAS\'))';
                } 

                
                CallGet.CallGet(param, function(param) {
                    callback(null, param.result);
                });

           },
             function(result,  callback){  

                var finalResult = [];
                for ( var i in result ) {
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

        if ( typeof device !== 'undefined') {
            var arraysn = device;
        }
        
        var param = {};

        async.waterfall([
            
            // -- Get All of maskview list 
            function(callback){ 

                param['filter_name'] = '(name=\'DMXMasking\')';
                param['keys'] = ['device','maskid'];
                param['fields'] = ['part','partsn','headname','director','port','disksize','diskrpm','hostname','initwwn','portwwn','config','dgstype'];

                if (typeof arraysn !== 'undefined') { 
                    param['filter'] = 'device=\''+arraysn+'\'&(datagrp=\'DMX-MASK\')';
                } else {
                    param['filter'] = '(datagrp=\'DMX-MASK\')';
                } 

                
                CallGet.CallGet(param, function(param) {
                    callback(null, param.result);
                });

           },
            // -- Get all of initial group member list and rela with maskview 
            function(arg1,  callback){  

                var hostv ;
                 host.GetHBAFlatRecord(hostv, function(result) { 

                    for ( var j in arg1 ) {
                        var maskItem = arg1[j];
                        for ( var i in result ) {
                            var hbaItem = result[i];
                            if ( hbaItem.hba_wwn.toUpperCase() == maskItem.initwwn.toUpperCase() ) {
                                maskItem["host"] = hbaItem; 
                                break;
                            }
                        }                        
                    }

                    callback(null, arg1);

                                      
                }); 
                

            },
            // -- Get all of FE Port list and rela with maskview's PG-Group
            function(result,  callback){  


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



function GetStorageGroups(device, callback) {
 
    async.waterfall([
        function(callback){ 
            var param = {};
            //param['filter_name'] = '(name=\'CompressionRatio\')';
            param['keys'] = ['device','sgname'];
            param['fields'] = ['sgcount','iolimit'];
            param['period'] = 3600;
            param['valuetype'] = 'MAX';

            param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
            if (typeof device !== 'undefined') { 
                param['filter'] = 'device=\''+device+'\'&'+param.filter;
            } 

            CallGet.CallGet(param, function(param) { 
                callback(null, param.result ); 
            });
        },        

        // Convert Capacity field from String to Number
        function(arg1,  callback){   
            var param = {};
            param['filter_name'] = '(name=\'SGLunCapacity\')';
            param['keys'] = ['device','sgname','lunname'];
            param['fields'] = ['dgstype'];
            param['period'] = 86400;
            param['valuetype'] = 'MAX';

            param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'StorageGroupToLUN\')';
            if (typeof device !== 'undefined') { 
                param['filter'] = 'device=\''+device+'\'&'+param.filter;
            }  

            CallGet.CallGet(param, function(param) { 
 
                for ( var j in arg1 ) {
                    var sgItem = arg1[j];
                    for ( var i in param.result ) {
                        var lunItem = param.result[i];

                         //console.log(sgItem.device + '|' + lunItem.device +" , "+ sgItem.sgname +"|"+lunItem.sgname);
                         if ( sgItem.device == lunItem.device && sgItem.sgname == lunItem.sgname ) {
                          var lun = {};
                            lun["lunname"] = lunItem.lunname;
                            lun["Capacity"] = lunItem.SGLunCapacity;
                            if ( sgItem.luns === undefined ) {
 
                                sgItem["luns"] = [];
                                sgItem["Capacity"] = 0;
                                sgItem["SumOfLuns"] = 0;
                            }
                            sgItem.luns.push(lun);
                            sgItem["Capacity"] += lunItem.SGLunCapacity;
                            sgItem["SumOfLuns"] ++;
                        }
                    }
                }

                callback(null, arg1 ); 
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


 function GetStorageGroupsPerformance(device, period, callback) {
 
        var config = configger.load();
        var start = util.getPerfStartTime();
        var end = util.getPerfEndTime();
        if  ( device === undefined ) 
            var filterbase = '(vmaxtype=\'VMAX2\'&datagrp=\'VMAX-StorageGroup\'&parttype=\'Storage Group\')';
        else  
            var filterbase = 'device==\''+device+'\'&(vmaxtype=\'VMAX2\'&datagrp=\'VMAX-StorageGroup\'&parttype=\'Storage Group\')';

        if ( period === undefined ) period = 3600;

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name=\'ResponseTime\'|name=\'ReadRequests\'|name=\'WriteRequests\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
                var fields = 'device,name,part,sgname,parttype';
                var keys = ['device,part']; 
  

                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400' , limit : 10000000}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: period}; 

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
          
                    var result1 = util.convertSRMPerformanceStruct(arg1); 
                    //var ret = arg1.values; 
                    callback(null,result1);                    
 
            }
        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           // var r = JSON.parse(result);
           callback(result);
        });


 

         
    };

 function GetDirectorPerformance(device, period, callback) {
 
        var config = configger.load();
        var start = util.getPerfStartTime();
        var end = util.getPerfEndTime();
        if  ( device === undefined ) 
            var filterbase = '(source=\'VMAX-Collector\'&parttype=\'Controller\')';
        else  
            var filterbase = 'device==\''+device+'\'&(source=\'VMAX-Collector\'&parttype=\'Controller\')';

        if ( period === undefined ) period = 3600;

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name=\'CurrentUtilization\'|name=\'ReadRequests\'|name=\'WriteRequests\'|name=\'ReadThroughput\'|name=\'WriteThroughput\')';
                var fields = 'device,name,part,partgrp,parttype,model';
                var keys = ['device,part']; 
  

                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400' , limit : 10000000}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: period}; 

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
          
                    var result1 = util.convertSRMPerformanceStruct(arg1); 
                    //var ret = arg1.values; 
                    callback(null,result1);                    
 
            }
        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           // var r = JSON.parse(result);
           callback(result);
        });


 

         
    };

function GetStorageGroupsPerformance1(device, callback) {
 
    async.waterfall([
        function(callback){ 
            var param = {};
            param['filter_name'] = '(name=\'ResponseTime\'|name=\'ReadRequests\'|name=\'WriteRequests\'|name=\'ReadThroughput\'|name=\'WriteRequests\')';
            param['keys'] = ['device','sgname'];
            param['fields'] = ['iolimit'];
            param['period'] = 86400;
            param['valuetype'] = 'MAX';

            param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
            if (typeof device !== 'undefined') { 
                param['filter'] = 'device=\''+device+'\'&'+param.filter;
            } 

            CallGet.CallGet(param, function(param) { 
                callback(null, param.result ); 
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


function GetDevices_bak(device, callback) {
    var param = {}; 
    param['filter'] = '(parttype=\'LUN\')';
    param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
    param['keys'] = ['device','part','parttype'];
    param['fields'] = ['alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked','disktype'];
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

        // Convert Capacity field from String to Number
        function(arg1,  callback){  
            for ( var i in arg1 ) {
                var deviceItem = arg1[i]; 
                deviceItem['Capacity'] = parseFloat(deviceItem.Capacity);
                deviceItem['UsedCapacity'] = parseFloat(deviceItem.UsedCapacity); 
            }
            callback(null,arg1);
 
        },

        function(arg1,  callback){ 
            var part;       
            getArrayLunPerformance(device,part,function(result) {

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


function GetDevices(device, callback) {
 
 
        var deviceType ="";

        async.waterfall([
            function(callback){ 
 

            var param = {};
            //param['filter'] = '(parttype=\'MetaMember\'|parttype=\'LUN\')';
            param['filter'] = '(parttype=\'LUN\')';
            param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
            param['keys'] = ['device','part','parttype'];
            param['fields'] = ['model','alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked','vmaxtype'];
            param['limit'] = 1000000;

            if (typeof device !== 'undefined') { 
                param['filter'] = 'device=\''+device+'\'&' + param['filter'];
            } 


            CallGet.CallGet(param, function(param) {  
                var data = param.result;
                callback(null,data);

            });

        },
        // -------------------------------------------------
        // Relation with VPLEX Virutal Volume and Maskview
        // -------------------------------------------------
        function(arg1,  callback) {  
 
            GetAssignedVPlexByDevices(device,function(result) {

                for ( var i in arg1 ) {
                    var item = arg1[i];
                    item['ConnectedDevice'] = '';
                    item['ConnectedDeviceType'] = '';
                    item['ConnectedObject'] = '';
                    item['ConnectedHost'] = '';

                    for ( var j in result ) {
                        var vplexItem = result[j];
                        if ( item.partsn == vplexItem.deviceWWN ) {
                            item['ConnectedDevice'] = vplexItem.vplexName;
                            item['ConnectedDeviceType'] = 'VPlex';
                            item['ConnectedObject'] = vplexItem.vplexVVolName;
                            item['ConnectedHost'] = vplexItem.vplexMaskviewName;
                        }
                    }




                 }
                callback(null,arg1);

            })
           
        },
        // -------------------------------------------------
        // 1. Relation with  Maskview and Initiator/Host for VMAX
        // 2. Mapping FE Director for DMX
        // -------------------------------------------------
        function(arg1,  callback) {  
 
            GetAssignedInitiatorByDevices(device,function(result) {

                var hostv ;

                host.GetHBAFlatRecord(hostv,function(hbaresult) {

                    for ( var i in arg1 ) {
                        var item = arg1[i];  
                        item["hosts"] = [];
                        item["ConnectedHostCount"] = 0;
                        item['ConnectedInitiators']  = [];

                        for ( var j in result ) {
                            var deviceItem = result[j];
                            if ( item.partsn == deviceItem.deviceWWN ) { 
                                    
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

                                // Search belong to which host
                                for ( var k in hbaresult ) {
                                    var hbaItem = hbaresult[k];
                                    if ( hbaItem.hba_wwn == deviceItem.initEndPoint ) {

                                        var isfind = false ;
                                        for ( var h in item.hosts ) {
                                            if ( hbaItem.hostname == item.hosts[h].hostname ) {
                                                isfind = true;
                                                break;
                                            }    
                                        }
                                        if ( isfind == false ) {
                                            item.hosts.push(hbaItem);
                                            item.ConnectedHostCount++;
                                        }
                                    }
                                }

                            }
                        }
                     }
                    callback(null,arg1); 

                });


            })  

        
        },      
        // -------------------------------------------------
          // 2. Mapping FE Director for DMX
        // -------------------------------------------------
        function(arg1,  callback) {  
 

            if ( arg1.length > 0 && arg1[0].vmaxtype == 'DMX' ) {
                deviceType = 'DMX';
                console.log("---------------------------\nBegin get mapping fe Director for DMX...\n--------------------------\n");

               var param = {};
                param['filter'] = '(parttype=\'LUNtoDirectorPort\')'; 
                param['keys'] = ['device','part'];
                param['fields'] = ['director' ];
                param['limit'] = 1000000;

                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&' + param['filter'];
                } 


                CallGet.CallGet(param, function(param) { 
                    var dirs = param.result;
                    for ( var i in arg1 ) {
                        var lunItem = arg1[i];
                        for ( var j in dirs ) {
                            var dirItem = dirs[j];



                            if ( lunItem.part == dirItem.part ) {
                                if ( lunItem.director === undefined ) 
                                    lunItem["director"] = dirItem.director;
                                else if ( lunItem.director.indexOf(dirItem.director) < 0 )
                                    lunItem.director = lunItem.director + ',' + dirItem.director
                            }
                        }
                    }                    
                    callback(null,arg1);

                });

            }
            else 
                callback(null,arg1);
        }  ,
        // -------------------------------------------------
          // Releaship with SRDF 
        // -------------------------------------------------
        function(arg1,  callback) {  
  
            GetSRDFLunToReplica(device,function(ret) {
                for ( var i in arg1 ) {
                    var item = arg1[i];
                    //if ( item.config.indexOf("RDF") >= 0 ) {
                        for ( var j in ret ) {
                            var rdfItem = ret[j];

                            var isfind = false;
                            if ( item.replication !== undefined ) {
                                for ( var z in item.replication ) {
                                    if ( rdfItem.device == item.replication[z].device &&
                                         rdfItem.part == item.replication[z].part ) {
                                        isfind = true;
                                        break;
                                    }
                                }
                                if ( isfind == true ) continue;
                            }
                            // For RDF1 , Target For Local Clone 
                            if ( item.device == rdfItem.device && item.part == rdfItem.part ) {
                                if ( item.replication === undefined ) {
                                    item["replication"] = [];
                                } 
                                item.replication.push(rdfItem);
                                item.remarray === undefined ? item["remarray"] = rdfItem.remarray : item["remarray"] = item.remarray + ',' + rdfItem.remarray;
                                item.remlun === undefined ? item["remlun"] = rdfItem.remlun : item["remlun"] = item.remlun + ',' + rdfItem.remlun;
                                item.replstat === undefined ? item["replstat"] = rdfItem.replstat : item["replstat"] = item.replstat + ',' + rdfItem.replstat;
                            } else 
                            // FOR RDF2 
                            if ( item.device == rdfItem.remarray  && item.part == rdfItem.remlun ) {
                                 if ( item.replication === undefined ) {
                                    item["replication"] = [];
                                } 
                                item.replication.push(rdfItem);
                                item.remarray === undefined ? item["remarray"] = rdfItem.remarray : item["remarray"] = item.remarray + ',' + rdfItem.remarray;                       
                                item.remlun === undefined ? item["remlun"] = rdfItem.remlun : item["remlun"] = item.remlun + ',' + rdfItem.remlun;
                                item.replstat === undefined ? item["replstat"] = rdfItem.replstat : item["replstat"] = item.replstat + ',' + rdfItem.replstat;
                            } else 
                            // source for local clone 
                            if ( item.device == rdfItem.srcarray  && item.part == rdfItem.srclun ) {
                                 if ( item.replication === undefined ) {
                                    item["replication"] = [];
                                } 
                                item.replication.push(rdfItem);
                                if ( item.remarray === undefined ) 
                                    item["remarray"] = rdfItem.srcarray;
                                else if ( item.remarray != rdfItem.srcarray ) 
                                    item["remarray"] = item.remarray+' / '+rdfItem.srcarray; 

                                if ( item.remlun !== undefined )
                                    item["remlun"] = item.remlun+' / '+rdfItem.part;
                                else 
                                    item["remlun"] = rdfItem.part;

                                if ( item.replstat === undefined ) 
                                    item["replstat"] = rdfItem.replstat; 
                                else if ( item.replstat != rdfItem.replstat ) 
                                    item["replstat"] = item.replstat+' / '+rdfItem.replstat;                                              
                                                              
                            }  


                        }
                   // }




                }

                callback(null,arg1);
           }) 

        }  ,

       // -------------------------------------------------
          // Releaship with Local Clone 
        // -------------------------------------------------
        function(arg1,  callback) {  
  
            GetCloneLunToReplica(device,function(ret) {

                for ( var i in arg1 ) {
                    var item = arg1[i]; 

                        for ( var j in ret ) {
                            var cloneItem = ret[j];

                            if ( item.device == cloneItem.srcarray && item.part == cloneItem.srclun ) {
                                if ( item.replication === undefined ) {
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

                callback(null,arg1);
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
        queryString = queryString + "     ?device srm:displayN/ame ?deviceName . ";
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

function GetAssignedInitiatorByDevices(device, callback) { 


        var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
        queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

        queryString = queryString + "     SELECT distinct  ?arraySN ?deviceName ?deviceWWN ?MaskingView  ?initEndPoint  ?FEName ";
        queryString = queryString + "     WHERE {    ";
        queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
        queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
        queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    ";
        queryString = queryString + "       ?device srm:displayName ?deviceName .   ";
        queryString = queryString + "       ?device srm:volumeWWN ?deviceWWN .    ";
        queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";
        queryString = queryString + "       ?MaskingView srm:maskedToInitiator ?initEndPoint .    "; 
        queryString = queryString + "       ?MaskingView srm:maskedToTarget ?FEEndPoint .    "; 
        queryString = queryString + "       ?FEEndPoint srm:Identifier ?FEName .    "; 
         if ( device !== undefined )
            queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";      
        queryString = queryString + "     }  ";

        topos.querySparql(queryString,  function (response) {
                        //var resultRecord = RecordFlat(response.body, keys);
            for ( var i in response ) {
                var item = response[i]; 
                item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:"+item.arraySN+":","");
                item["initEndPoint"] = item.initEndPoint.replace("topo:srm.ProtocolEndpoint:","");
                 item["FEName"] = item.FEName.replace("topo:srm.StorageFrontEndPort:"+item.arraySN+":","");
           }
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


        async.waterfall([
            function(callback){ 

                var param = {};
                param['filter_name'] = '(name=\'IORate\'|name=\'Throughput\')';
                param['keys'] = ['device','feport'];
                param['fields'] = ['maxspeed','negspeed','nodewwn','portwwn','partstat','vmaxtype'];
                param['period'] = 3600;
                param['valuetype'] = 'MAX';

                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&datagrp=\'VMAX-FEDirectorByPort\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
                } else {
                    param['filter'] = 'datagrp=\'VMAX-FEDirectorByPort\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
                } 

                CallGet.CallGet(param, function(param) {
                    callback( null, param.result ); 
                });
 
     
            },
            /*
                get detail for fe port from "VMAX-PORTS"
             */
            function(arg1,  callback){  

                var param = {};
                param['filter_name'] = '(name=\'Availability\')';
                param['keys'] = ['device','feport'];
                param['fields'] = ['maxspeed','negspeed','nodewwn','portwwn','partstat','vmaxtype'];
                param['period'] = 3600;
                param['valuetype'] = 'MAX';

                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
                } else {
                    param['filter'] = 'datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
                } 

                CallGet.CallGet(param, function(param) {

                    for ( var i in arg1 ) {
                        var item1 = arg1[i]; 

                        for ( var j in param.result ) {
                            var item2 = param.result[j];
                            if ( item1.device == item2.device && item1.feport == item2.feport ) {
                                item1["portwwn"] =  item2.portwwn;
                                if ( item2.maxspeed != 'N/A' ) {
                                    item1["maxspeed"] = Number(item2.maxspeed);
                                    item1["negspeed"] = Number(item2.negspeed);
                                } else {
                                    item1["maxspeed"] = item2.maxspeed;
                                    item1["negspeed"] = item2.negspeed;

                                }

                                break;
                            }
                        }
                    }

                    callback( null, arg1 ); 
                });
                  
            },            

            /*
                the Volume count of mapping to the faport
             */
            function(arg1,  callback){  

                var queryString =  " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
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

                if ( typeof device !== 'undefined')  
                    queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .    ";
                 

                queryString = queryString + "  }   ";


                 topos.querySparql(queryString,  function (response) {
                                //var resultRecord = RecordFlat(response.body, keys); 
                      for ( var i in response ) {
                          var item = response[i];
                          item.FAName = item.FAName.replace("topo:srm.StorageFrontEndPort:"+item.arraySN+":","");
                          var mappingvol = {};
                          var isFind = false ;

                          for ( var j in arg1 ) {
                              var mappingvolItem = arg1[j];
                              if ( mappingvolItem.device == item.arraySN && mappingvolItem.feport == item.FAName )  {
                                 isFind = true;


                                 if ( mappingvolItem.MappingVolCount !== undefined)
                                    mappingvolItem.MappingVolCount++;
                                 else 
                                    mappingvolItem["MappingVolCount"] = 1;
                              }
                          }
                          if ( isFind == false ) {
                              var mappingvolItem = {}; 
                              mappingvolItem["MappingVolCount"] = 1;
                              arg1.push(mappingvolItem);
                          }
                      }
                      callback( null, arg1 ); 
                }); 
 

            },
            /*
                the connected switch port of faport
             */
            function(arg1,  callback){  

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
                if ( typeof device !== 'undefined')  
                    queryString = queryString + "     FILTER  (?ArrayDisplayName = '" + device + "' ) .    ";
                 
               queryString = queryString + "  } "; 

 
                 topos.querySparql(queryString,  function (response) {
                                //var resultRecord = RecordFlat(response.body, keys); 
                      for ( var i in response ) {
                          var item = response[i];
                          item.FEPortDisplayName = item.FEPortDisplayName.replace(item.ArrayDisplayName+":","");
 
                          for ( var j in arg1 ) {
                              var itemFA = arg1[j];
                              if ( itemFA.device == item.ArrayDisplayName && itemFA.feport == item.FEPortDisplayName )  {
                                    itemFA["ConnectedToPort"] = item.SwitchPortDisplayName;
                                    itemFA["ConnectedToSwitch"] = item.SwitchDisplayName;
                              }
                          } 
                      }
                      callback( null, arg1 ); 
                }); 
 

            }
        ], function (err, result) { 

           callback( result ); 
        });


}


function GetFEPorts1(device, callback) {


        async.waterfall([
            function(callback){ 

                var param = {};
                param['filter_name'] = '(name=\'IORate\'|name=\'Throughput\')';
                param['keys'] = ['device','feport'];
                param['fields'] = ['maxspeed','negspeed','nodewwn','portwwn','partstat','vmaxtype'];
                param['period'] = 3600;
                param['valuetype'] = 'MAX';

                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&datagrp=\'VMAX-FEDirectorByPort\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
                } else {
                    param['filter'] = 'datagrp=\'VMAX-FEDirectorByPort\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
                } 

                CallGet.CallGet(param, function(param) {
                    callback( null, param.result ); 
                });
 
     
            }
        ], function (err, result) { 

           callback( result ); 
        });


}


function GetFEPortPerf(device, feport, start, end, callback) {

        var config = configger.load();
        //var start = '2016-06-20T18:30:00+08:00'
        //var end = '2016-07-01T18:30:00+08:00'
        if ( start === undefined )
            var start = util.getPerfStartTime();

        if ( end === undefined)
            var end = util.getPerfEndTime();
   
        async.waterfall([
            function(callback){ 

                var filterbase = 'device==\''+device+'\'&feport=\''+feport+'\'&datagrp=\'VMAX-FEDirectorByPort\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';

                var filter = filterbase + '&(name==\'IORate\'|name==\'Throughput\')';
                var fields = 'device,feport,name';
                var keys = ['device','feport'];

                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 
   
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
                    console.log(item.feport + '\t' + item.name);
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
                        if ( resItem.device == item.device && resItem.feport == item.feport ) {
 
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
                if ( result.length == 0 ) {
                    callback(null,result);
                } else {
                    var result1 = CallGet.convertPerformanceStruct(result); 
                    //var ret = arg1.values; 
                    callback(null,result1);                    
                }


 

            },

            function(data,  callback){  

                console.log(data.length);
                if ( data.length == 0 ) {
                    callback(null,data);
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
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['Throughput'] = item.Throughput ;

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result);
                    // ------------------------- Catagory --------------------------
                    var result = {};
                    result['category'] = 'IOPS';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['IORate'] = item.IORate ;

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result);





                    callback(null,finalResult);
                }
 
            }
        ], function (err, result) { 

           callback( result ); 
        });


}


function GetPorts(device, callback) {


        async.waterfall([
            function(callback){ 

                var param = {};
                //param['filter_name'] = '(name=\'IORate\'|name=\'Throughput\')';
                param['keys'] = ['device','feport'];
                param['fields'] = ['director','dirslot','porttype','part'];
                param['period'] = 3600;
                param['valuetype'] = 'MAX';

                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&source=\'VMAX-Collector\'&parttype=\'Port\'';
                } else {
                    param['filter'] = 'source=\'VMAX-Collector\'&parttype=\'Port\'';
                } 

                CallGet.CallGet(param, function(param) {
                    callback( null, param.result ); 
                });
 
     
            }
        ], function (err, result) { 

           callback( result ); 
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



                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 
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
               callback(null,arg1);


            }
        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           var r = JSON.parse(result);
           callback(r);
        });


 

         
    };



 function getArrayLunPerformance(device, part, callback) {
 
        var config = configger.load();
        //var start = '2016-06-20T18:30:00+08:00'
        //var end = '2016-07-01T18:30:00+08:00'
        var start = util.getPerfStartTime();
        var end = util.getPerfEndTime();
        if  ( device === undefined && part === undefined) 
            var filterbase = '(parttype==\'LUN\'|parttype==\'MetaMember\')';
        else if ( part === undefined )
            var filterbase = 'device==\''+device+'\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
        else 
            var filterbase = 'device==\''+device+'\'&part==\''+part+'\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name==\'ReadRequests\'|name==\'ReadResponseTime\'|name==\'ReadThroughput\'|name==\'WriteRequests\'|name==\'WriteResponseTime\'|name==\'WriteThroughput\')';
                var fields = 'device,name,part,parttype';
                var keys = ['device,part'];



                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400' , limit : 10000000}; 
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
                        if ( resItem.device == item.device && resItem.feport == item.feport ) {
 
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
                if ( result.length == 0 ) {
                    callback(null,result);
                } else {
                    var result1 = CallGet.convertPerformanceStruct(result); 
                    //var ret = arg1.values; 
                    callback(null,result1);                    
                }


 

            },

            function(data,  callback){  

                console.log(data.length);
                if ( data.length == 0 ) {
                    callback(null,data);
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
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['ReadResponseTime'] = item.ReadResponseTime ;
                        chartDataItem['WriteResponseTime'] = item.WriteResponseTime ;

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result);


                    // ------------------------- Catagory --------------------------
                    var result = {};
                    result['category'] = 'IOPS';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['WriteRequests'] = item.WriteRequests ;
                        chartDataItem['ReadRequests'] = item.ReadRequests ;

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result);
                    // ------------------------- Catagory --------------------------
                    var result = {};
                    result['category'] = 'Throughput ( MB/s )';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['ReadThroughput'] = item.ReadThroughput ;
                        chartDataItem['WriteThroughput'] = item.WriteThroughput ;

                        result.chartData.push(chartDataItem);
                        
                    }
                    finalResult.charts.push(result);





                    callback(null,finalResult);
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



function getArrayLunGroupPerformance(device, lunStr, start, end, interval , callback ) {

    async.waterfall([
            function(callback){ 
 
               console.log("getArrayLunPerformanceByList="+ device + "|" + lunStr + "|");

 
                getArrayLunPerformanceByListWithDT(device, lunStr , start, end , interval,  function(perfresult) {
                    callback(null,perfresult);
                });
                        
            },
            function(arg1,callback){ 

                //console.log(arg1)
                //console.log("---------------------------------");
                
                var perfdata = CallGet.convertPerformanceStruct(arg1);


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



}
function getArrayLunPerformanceByListWithDT(device, lunStr , start, end , interval,  callback) {
  
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


                if ( interval == 'hours' ) 
                    var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 
                else
                    var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                //

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
