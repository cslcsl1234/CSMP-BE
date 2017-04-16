"use strict"; 

var async = require('async'); 

var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var host = require('./Host');


module.exports = {
    GetInitialGroups,
    GetDevices,
    GetFEPorts,
    GetMaskViews,
    GetAssignedHosts
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
    param['fields'] = ['alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname'];
    param['limit'] = 1000000;

    if (typeof device !== 'undefined') { 
        param['filter'] = 'device=\''+device+'\'&' + param['filter'];
    } 

    CallGet.CallGet(param, function(param) { 
        var result = [];
 
        callback( param.result ); 
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

