"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var HostObj = mongoose.model('Host');
var App = require('./App'); 
var CallGet = require('../lib/CallGet');  


var topos= require('./topos');

module.exports = { 
    GetHosts,
    GetHBAFlatRecord,
    GetHBAs,
    GetAssignedLUNByInitiator,
    GetAssignedLUNByHosts
}



/*
    * Get a masking view list info of the vmax.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

        [
          {
            "APPs": [
              "SAP",
              "NetBank"
            ],
            "HBAs": [
              {
                "name": "fcs0",
                "wwn": "C001448782B78A00",
                "AB": "A",
                "_id": "58f1946fc93bfd2e7b000007"
              },
              {
                "name": "fcs1",
                "wwn": "C001448782678200",
                "AB": "B",
                "_id": "58f1946fc93bfd2e7b000006"
              }
            ],
            "configuration": {
              "OS": "AIX",
              "OSVersion": "RHEL6.8",
              "memory": "32",
              "other": "about configuration other things."
            },
            "assets": {
              "no": "BC1-121212",
              "purpose": "SAP System",
              "department": "Marketing",
              "manager": "zhangsan"
            },
            "maintenance": {
              "vendor": "Dell",
              "contact": "az@emc.com",
              "maintenance_department": "Marketing",
              "maintenance_owner": "John"
            },
            "baseinfo": {
              "name": "testhost1",
              "type": "Physical",
              "catalog": "R&D",
              "status": "Test",
              "management_ip": "192.168.1.1",
              "service_ip": "10.1.1.1,11.2.2.2,12.3.3.3",
              "dcname": "BJDC2",
              "area": "1Level-A",
              "description": "this is a description about testhost1."
            }
          }
        ]
*/

function GetHBAFlatRecord(device, callback) { 
      GetHosts(device, function(code,res) {

          App.GetApps( function( app_code, app_result ) {
             var result = []; 
              for ( var i in res) {
                var item = res[i]; 

                var apps = [];
                var apps_name = '';
                // Apps
                for ( var appi in item.APPs) {
                  var appName = item.APPs[appi]; 
                  for ( var j in app_result ) {
                     var appItem = app_result[j];
                     if ( appName == appItem.name ) {
                        apps.push(appItem);
                        if ( apps_name == '' )
                            apps_name = appItem.alias;
                        else 
                            apps_name = apps_name + ',' + appItem.alias;
                     }
                  }
                }
                item.APPs = apps;
 

                // HBAs 
                for ( var hbaj =0 ; hbaj < item.HBAs.length; hbaj++) {
                  var hba_item = item.HBAs[hbaj];
     



                  var newRecord = {};
                  newRecord['dcname'] = item.baseinfo.dcname;
                  newRecord['area'] = item.baseinfo.area;
                  newRecord['app_name'] = apps_name;
                  newRecord['hostname'] = item.baseinfo.name;
                  newRecord['hba_wwn'] = hba_item.wwn;
                  newRecord['hba_name'] = hba_item.name;
                  newRecord['hba_AB'] = hba_item.AB;

                  newRecord['host_type'] = item.baseinfo.type;
                  newRecord['host_status'] = item.baseinfo.status;
                  newRecord['ip'] = item.baseinfo.management_ip + '(M);' + item.baseinfo.service_ip;

                  newRecord['OS'] = item.configuration.OS;
                  newRecord['OSVersion'] = item.configuration.OSVersion;
                  newRecord['memory'] = item.configuration.memory;
                  newRecord['other'] = item.configuration.other;

                  result.push(newRecord);
                }


              }  
              callback(result);

          })

 

      })
}


function GetHBAs(device, callback) { 
      GetHosts(device, function(code,res) {
 

             var result = []; 
              for ( var i in res) {
                var item = res[i]; 
 

                 console.log(item.HBAs);
                // HBAs 

                /*
                for ( var hbaj =0 ; hbaj < item.HBAs.length; hbaj++) {
                  var hba_item = item.HBAs[hbaj];
     



                  var newRecord = {};
                  newRecord['dcname'] = item.baseinfo.dcname;
                  newRecord['area'] = item.baseinfo.area; 
                  newRecord['hostname'] = item.baseinfo.name;
                  newRecord['hba_wwn'] = hba_item.wwn;
                  newRecord['hba_name'] = hba_item.name;
                  newRecord['hba_AB'] = hba_item.AB;

                  newRecord['host_type'] = item.baseinfo.type;
                  newRecord['host_status'] = item.baseinfo.status;
                  newRecord['ip'] = item.baseinfo.management_ip + '(M);' + item.baseinfo.service_ip;

                  newRecord['OS'] = item.configuration.OS;
                  newRecord['OSVersion'] = item.configuration.OSVersion;
                  newRecord['memory'] = item.configuration.memory;
                  newRecord['other'] = item.configuration.other;

                  result.push(newRecord);
                }

                */
              }  
              callback(result); 

      })
}



/*
    * Get a masking view list info of the vmax.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

        [
          {
            "APPs": [
              "SAP",
              "NetBank"
            ],
            "HBAs": [
              {
                "name": "fcs0",
                "wwn": "C001448782B78A00",
                "AB": "A",
                "_id": "58f1946fc93bfd2e7b000007"
              },
              {
                "name": "fcs1",
                "wwn": "C001448782678200",
                "AB": "B",
                "_id": "58f1946fc93bfd2e7b000006"
              }
            ],
            "configuration": {
              "OS": "AIX",
              "OSVersion": "RHEL6.8",
              "memory": "32",
              "other": "about configuration other things."
            },
            "assets": {
              "no": "BC1-121212",
              "purpose": "SAP System",
              "department": "Marketing",
              "manager": "zhangsan"
            },
            "maintenance": {
              "vendor": "Dell",
              "contact": "az@emc.com",
              "maintenance_department": "Marketing",
              "maintenance_owner": "John"
            },
            "baseinfo": {
              "name": "testhost1",
              "type": "Physical",
              "catalog": "R&D",
              "status": "Test",
              "management_ip": "192.168.1.1",
              "service_ip": "10.1.1.1,11.2.2.2,12.3.3.3",
              "dcname": "BJDC2",
              "area": "1Level-A",
              "description": "this is a description about testhost1."
            }
          }
        ]
*/

function GetHosts(device, callback) {

        if ( typeof device !== 'undefined') {
            var hostname = device;
            HostObj.findOne({"baseinfo.name" : hostname },{"_id":0, "__v":0}, function (err, doc) {
                //system error.
                if (err) { 
                    callback(500 , {status: err})
                }
                if (!doc) { //user doesn't exist.
                    callback(500 , {status: "The host not find!"}); 
                }
                else {
                    callback(200 , doc);
                }

            });
        } else {
            HostObj.find({},{"_id":0, "__v":0}, function (err, doc) {
                //system error.
                if (err) { 
                    callback(500 , {status: err})
                }
                if (!doc) { //user doesn't exist.
                    callback(200 , []); 
                }
                else { 
                    callback(500 , doc);
                }

            }).select({ "baseinfo.name": 1, "_id": 0});

        }


}


function GetAssignedLUNByInitiator(initiators, callback) { 

    var filter = "";
    if ( initiators !== undefined ) {
        for ( var i in initiators ) {
            var initItem = initiators[i];
            if ( filter == "") {
                filter = "?init_wwn = \'" + initItem + "\'";
            } else {
                filter = filter + "|| ?init_wwn = \'" + initItem + "\'";
            }           
        }

    }

        async.waterfall(
        [
            function(callback){

                var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
                queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>      ";
                queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>  ";
                queryString = queryString + " SELECT distinct ?arrayName ?poolName ?lunName ?lunRaid ?volumeWWN  ";
                queryString = queryString + " WHERE {   ";
             
                queryString = queryString + "        ?initiator rdf:type srm:ProtocolEndpoint .      ";
                queryString = queryString + "        ?initiator  srm:Identifier ?www .        ";
                queryString = queryString + "        BIND(replace(?www , 'topo:srm.ProtocolEndpoint:', '', 'i') as ?init_wwn) .    ";
                queryString = queryString + "        ?initiator srm:maskedTo ?mv .";
                queryString = queryString + "         ?mv srm:maskedToDisk ?disk .    ";          

                 queryString = queryString + "        ?disk srm:displayName ?lunName .    ";               

                queryString = queryString + "       ?disk srm:isUsed ?lunisused .  ";
                queryString = queryString + "       ?disk srm:raid ?lunRaid .  ";
                queryString = queryString + "       ?disk srm:lunTagId ?lunTagId .  ";
                queryString = queryString + "       ?disk srm:volumeWWN ?volumeWWN .  ";
                queryString = queryString + "       ?disk srm:residesOnStoragePool ?pool .  ";
                queryString = queryString + "       ?disk srm:residesOnStorageEntity ?array .  ";
                queryString = queryString + "       ?pool srm:displayName ?poolName .  ";
                queryString = queryString + "       ?array srm:displayName ?arrayName .  ";
                if ( initiators !== undefined ) {
                    queryString = queryString + "       FILTER ( " + filter + " ) ";       
                }
                queryString = queryString + " }  ";


                  topos.querySparql(queryString,  function (response) {
                                  //var resultRecord = RecordFlat(response.body, keys);
                                    console.log(response);
                      callback(null, response);
                  }); 
            },
            // Get All Array devices Records
            function(luns,  callback){ 
                var param = {}; 
                param['filter'] = '(parttype=\'LUN\')';
                param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
                param['keys'] = ['device','part','parttype'];
                param['fields'] = ['model','alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked','disktype'];
                param['limit'] = 1000000;
 
                CallGet.CallGet(param, function(param) { 
                    var result = param.result;
         
                    for ( var i in luns ) {
                        var lunItem = luns[i];

                        for ( var j in result ) {
                            var lunDetailItem = result[j];
                            if ( lunItem.volumeWWN == lunDetailItem.partsn ) {
                                lunItem["model"] = lunDetailItem.model;
                                lunItem["sgname"] = lunDetailItem.sgname;
                                lunItem["disktype"] = lunDetailItem.disktype;
                                 lunItem["dgstype"] = lunDetailItem.dgstype;
                                 lunItem["Capacity"] = lunDetailItem.Capacity;
                                 lunItem["UsedCapacity"] = lunDetailItem.UsedCapacity; 
                                 break;
                            }
                        }
                    }
                    callback(null, luns ); 
                });
                    
            }
        ], function (err, result) {
              callback(result);
        }
        );






}


function GetAssignedLUNByHosts( callback) { 

        var datas = {};
        var device;
        async.waterfall(
        [
            function(callback){
                GetHosts(device, function(code,result) {

                    var hostResult = [];
                    for ( var h in result ) {
                         var hostItem = result[h];

                         var hostname = hostItem.baseinfo.name;
                          for ( var hbaj =0 ; hbaj < hostItem.HBAs.length; hbaj++) {
                            var hbaItem = hostItem.HBAs[hbaj]; 
console.log(hbaItem);
                             var hostRet = {};
                             hostRet["hostname"] = hostname;
                             hostRet["hbawwn"] = hbaItem.wwn;
                             hostRet["Capacity"] = 0;
                             hostRet["NumOfLuns"] = 0;
                             hostRet["luns"] = [];
                             hostResult.push(hostRet);
                         }
                    }

                    datas["host"] = hostResult;
                    callback(null,datas);
              });
            },
            // Get All Localtio
            function(arg1,callback){

                var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
                queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>      ";
                queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>  ";
                queryString = queryString + " SELECT distinct ?init_wwn ?arrayName ?poolName ?lunName ?lunRaid ?volumeWWN  ";
                queryString = queryString + " WHERE {   ";
             
                queryString = queryString + "        ?initiator rdf:type srm:ProtocolEndpoint .      ";
                queryString = queryString + "        ?initiator  srm:Identifier ?www .        ";
                queryString = queryString + "        BIND(replace(?www , 'topo:srm.ProtocolEndpoint:', '', 'i') as ?init_wwn) .    ";
                queryString = queryString + "        ?initiator srm:maskedTo ?mv .";
                queryString = queryString + "         ?mv srm:maskedToDisk ?disk .    ";          

                 queryString = queryString + "        ?disk srm:displayName ?lunName .    ";               

                queryString = queryString + "       ?disk srm:isUsed ?lunisused .  ";
                queryString = queryString + "       ?disk srm:raid ?lunRaid .  ";
                queryString = queryString + "       ?disk srm:lunTagId ?lunTagId .  ";
                queryString = queryString + "       ?disk srm:volumeWWN ?volumeWWN .  ";
                queryString = queryString + "       ?disk srm:residesOnStoragePool ?pool .  ";
                queryString = queryString + "       ?disk srm:residesOnStorageEntity ?array .  ";
                queryString = queryString + "       ?pool srm:displayName ?poolName .  ";
                queryString = queryString + "       ?array srm:displayName ?arrayName .  ";
                queryString = queryString + " }  ";


                  topos.querySparql(queryString,  function (response) {
                                  //var resultRecord = RecordFlat(response.body, keys);
                                    
                      arg1["lun"] = response;
                      callback(null, arg1);
                  }); 

            },
            // Get All Array devices Records
            function(arg1,  callback){ 

                var luns = arg1.lun;
                var hosts = arg1.host;
                var param = {}; 
                param['filter'] = '(parttype=\'LUN\')';
                param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
                param['keys'] = ['device','part','parttype'];
                param['fields'] = ['model','alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked','disktype'];
                param['limit'] = 1000000;
 
                CallGet.CallGet(param, function(param) { 
                    var result = param.result;
         
                    var hostResult = [];
                    for ( var i in luns ) {
                        var lunItem = luns[i];

                        for ( var j in result ) {
                            var lunDetailItem = result[j];
                            if ( lunItem.volumeWWN == lunDetailItem.partsn ) {
                                lunItem["model"] = lunDetailItem.model;
                                lunItem["sgname"] = lunDetailItem.sgname;
                                lunItem["disktype"] = lunDetailItem.disktype;
                                 lunItem["dgstype"] = lunDetailItem.dgstype;
                                 lunItem["Capacity"] = lunDetailItem.Capacity;
                                 lunItem["UsedCapacity"] = lunDetailItem.UsedCapacity; 
                                 break;
                            }
                        }

                        for ( var j in hosts ) {

                            if ( hosts[j].hbawwn == lunItem.init_wwn ) {

                              var isFindHost = false;
                              for ( var h in hostResult ) {
                                  if ( hostResult[h].hostname == hosts[j].hostname   ) {
                                      var isfindlun = false;
                                      for ( var z in hostResult[h].luns ) {
                                           if ( hostResult[h].luns[z].volumeWWN == lunItem.volumeWWN ) {
                                                isfindlun = true;
                                           }
                                      }
                                      if ( isfindlun == false ) {
                                          hostResult[h].Capacity += parseInt(lunItem.Capacity);
                                          hostResult[h].NumOfLuns++;
                                          hostResult[h].luns.push(lunItem);
                                      }
                                 isFindHost = true;
                                  }
   
                              }
                              if ( isFindHost == false ) {
                                  var newHost = {};
                                  newHost["hostname"] = hosts[j].hostname;
                                  newHost["Capacity"] = parseInt(lunItem.Capacity);
                                  newHost["NumOfLuns"] = 1;
                                  newHost["luns"] = [];
                                  newHost.luns.push(lunItem);

                                  hostResult.push(newHost);
                              }
                            }

                        }

                    }
                    callback(null, hostResult ); 
                });
                    
            } 
        ], function (err, result) {
              callback(result);
        }
        );






}

