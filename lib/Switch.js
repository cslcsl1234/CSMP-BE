"use strict";
const logger = require("../lib/logger")(__filename); 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var topos = require('../lib/topos.js');
var util = require('./util');
var xml2json = require('xml2json');

var Analysis = require('../lib/analysis');
var DeviceMgmt = require("../lib/DeviceManagement");
var sortBy = require("sort-by");

module.exports = {
    GetSwitchPorts,
    GetSwitchPortsDetail, 
    GetSwitchPortsStatics,
    getSwitchPortPerformance,
    getSwitchPortPerformance1,
    getAlias , 
    getFabric ,
    getSwitchsByFabric, 
    getZone,
    getZone1,GetSwitchPorts1
}

function getZone(fabwwn, callback) { 
    var config = configger.load();

    async.waterfall(
    [

        function(callback){
            var deviceid;
            logger.info(Date() + '------ GetSwitchPorts is begin ------');
            GetSwitchPorts(deviceid, function(result) {  
                callback(null,result); 
            });
              
        },

        // Get All Localtion Records
        function(param,  callback){ 
            var zoneResult = [];
            logger.info(Date() + '------ getFabric is begin ------');
            getFabric(fabwwn,function(resultJson) {

                logger.info('#ZoneMember='+resultJson.length + '; #SwitchPort=' + param.length);
                var fabricResult= {} ;
                for ( var i in param) {
                    var swport = param[i]; 
                    var keyPortZone = swport.fabwwn + '_' +  (swport.domainid+':'+swport.partid) ;  
                    var keyWWNZone = swport.connectedToWWN ;    

                   // if ( fabricResult[keyPortZone] !== undefined ) logger.info("PortZone:"  + keyPortZone);
                   // if ( fabricResult[keyWWNZone] !== undefined ) logger.info("WWNZone:"  + keyWWNZone);
                    if ( fabricResult[keyPortZone] === undefined ) fabricResult[keyPortZone] = [];
                    fabricResult[keyPortZone].push(swport);
                    fabricResult[keyWWNZone]=swport;
                                        
                }

                for ( var i in resultJson ) {
                    var item = resultJson[i];
                    var zoneItem = {};

                    zoneItem["fabricwwn"] = item.pswwn;
                    zoneItem['device'] = item.device;
                    zoneItem['zsetname'] = item.zsetname;
                    zoneItem['zname'] = item.zname;
                    zoneItem['zonemembers'] = [];
                    

  
                    var keyPortZone = item.pswwn + '_' +  item.zmemid ;  
                    var keyWWNZone = item.zmemid ;    
                    switch (item.zmemtype) {
                        case "Switch Port ID": 
                                    var swports = fabricResult[keyPortZone];
                                    if ( swports === undefined ) continue; 

                                    for ( var z in swports ) {
                                        var swport = swports[z];

                                        var zoneMemberItem = {};
                                        zoneMemberItem['zmemid'] = item.zmemid;
                                        zoneMemberItem['zmemtype'] = item.zmemtype; 

                                        zoneMemberItem['switch'] = swport.device;
                                        zoneMemberItem['switchsn'] = swport.devicesn;
                                        zoneMemberItem['switchid'] = swport.deviceid;
                                        
                                        zoneMemberItem['switchip'] = swport.ip;
                                        zoneMemberItem['switchport'] = swport.part; 
                                        zoneMemberItem['switchportwwn'] = swport.partwwn; 
                                        zoneMemberItem['switchportstate'] = swport.partstat; 
                                        zoneMemberItem['switchportConnectedWWN'] = swport.portwwn;   

                                        zoneItem.zonemembers.push(zoneMemberItem);
                                    }



                            break;
                        case "Permanent Address":

                            var swport = fabricResult[keyWWNZone];
                            if ( swport === undefined ) continue; 

                            var zoneMemberItem = {};
                            zoneMemberItem['zmemid'] = item.zmemid;
                            zoneMemberItem['zmemtype'] = item.zmemtype; 

                            zoneMemberItem['switch'] = swport.device;
                            zoneMemberItem['switchsn'] = swport.devicesn;
                            zoneMemberItem['switchid'] = swport.deviceid;
                            zoneMemberItem['switchip'] = swport.ip;
                            zoneMemberItem['switchport'] = swport.part; 
                            zoneMemberItem['switchportwwn'] = swport.partwwn; 
                            zoneMemberItem['switchportstate'] = swport.partstat; 
                            zoneMemberItem['switchportConnectedWWN'] = swport.portwwn; 

                            zoneItem.zonemembers.push(zoneMemberItem);
                            break;

                    }  
                    if ( i % 1000 == 0  ) logger.info(Date() + " finished " + i + ', total ' + resultJson.length);
 
                    if ( zoneResult.length == 0 ) {
                        zoneResult.push(zoneItem);
                    } else {
                        var isFind = false;
                        for ( var j in zoneResult) {
                            var item1 = zoneResult[j];
                            if ( item1.device == zoneItem.device &&  
                                item1.zsetname == zoneItem.zsetname && 
                                item1.zname == zoneItem.zname 
                                ) {
                                    for ( var t in zoneItem.zonemembers ) {
                                        var mItem = zoneItem.zonemembers[t];
                                        item1.zonemembers.push(mItem);
                                    }
                                
                                isFind = true;
                            }
                        }
                        if ( ! isFind ) {
                            zoneResult.push(zoneItem);
                        }
                    }

                }

               logger.info('The number of Zones = ' + zoneResult.length);
               callback(null,zoneResult);

            })

        },
        function(zoneResult, callback){
            var fields = 'part,psname,device,lsname,pswwn';
            if ( fabwwn !== undefined )
                var filter = 'pswwn=\''+fabwwn+'\'&parttype==\'Fabric\'|parttype==\'VSAN\'';
            else 
                var filter = 'parttype==\'Fabric\'|parttype==\'VSAN\'';
            
            
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                    .headers({'Content-Type': 'multipart/form-data'}) 
                    .query({'fields': fields , 'filter':  filter }) 
                    .end(function (response) {

                        var resultJson = JSON.parse(response.raw_body).values; 

                        for ( var i in zoneResult ) {
                            var item = zoneResult[i];
                            for ( var j in resultJson) {
                                var fabricItem = resultJson[j];
                                if ( fabricItem.pswwn == item.fabricwwn ) {
                                    item["fabricname"] = fabricItem.psname;
                                    break;
                                }
                            }
                            

                            var zonemembers = item.zonemembers;
                            for ( var j in zonemembers ) {
                                var zoneitem = zonemembers[j];
                                for ( var z in resultJson ) {
                                    var switem = resultJson[z];
                                    if ( zoneitem.switch == switem.device ) {
                                        var switchid = zoneitem.switch;
                                        zoneitem["switch"] = switem.lsname;
                                        zoneitem["switch_oriname"] = switchid;
                                    }
                                }
                                
                            }

                        } 
                        callback(null,zoneResult);
                    });
              
        },               
        function(arg1,  callback){ 

            var param = {}; 
            param['filter'] = 'parttype==\'ZoneAlias\'';
            param['fields'] = ['pswwn','alias','zmemid'];
            param['keys'] = ['pswwn','alias','zmemid'];

            CallGet.CallGet(param, function(param) { 
                for ( var i in arg1 ) {
                    var zoneitem = arg1[i];
                    

                    for ( var z in zoneitem.zonemembers ) {
                        var item = zoneitem.zonemembers[z];
                        item['alias'] = '';
                        if ( item.zmemid != '' ) {

                            for ( var j in param.result ) {
                                var aliasItem = param.result[j];

                                if ( zoneitem.fabricwwn == aliasItem.pswwn & item.zmemid == aliasItem.zmemid ) {
                                    if ( item.alias == '' )
                                        item['alias'] = aliasItem.alias;
                                    else 
                                        item['alias'] = item.alias + ',' + aliasItem.alias;
                                }
                            }

                        }
                    }
                }
                callback(null,arg1);
            });                 
        },
        function ( arg, callback ) {
            topos.GetStoragePorts(function(initRes ) {
                for ( var i in arg ) {
                    var item = arg[i];
                    for (var j in item.zonemembers ){
                        var zmemItem = item.zonemembers[j];
                        var zmemWWN ;
                        if ( zmemItem.switchportConnectedWWN !== undefined ) 
                            zmemWWN = zmemItem.switchportConnectedWWN;
                        else 
                            if ( zmemItem.zmemtype == 'Permanent Address') {
                                zmemWWN = zmemItem.zmemid;
                                zmemItem["switchportConnectedWWN"] = zmemItem.zmemid;
                            }
                               

                        for ( var z in initRes ) {
                            if ( zmemItem.switchportConnectedWWN == initRes[z].portwwn ) {
                                zmemItem["switchportConnectedType"] = "Array";
                                zmemItem["switchportConnectedDevice"] = initRes[z].device; 
                                break;
                            }
                        }
                
                    }
                }
                callback(null,arg);
            })
        }
    ], function (err, result) {
          // result now equals 'done'
          callback(result);
    });
}

function getZone1(fabwwn, callback) {  
      

    var config = configger.load();

    async.waterfall(
    [

        function(callback){
            var deviceid;
            GetSwitchPorts(deviceid, function(result) {  
                callback(null,result); 
            });
              
        },

        // Get All Localtion Records
        function(param,  callback){ 
            var zoneResult = [];
            getFabric(fabwwn,function(resultJson) {
                for ( var i in resultJson ) {
                    var item = resultJson[i];
                    var zoneItem = {};
                    var zoneMemberItem = {};
                    zoneMemberItem['zmemid'] = item.zmemid;
                    zoneMemberItem['zmemtype'] = item.zmemtype; 

                    // Search connected to the switch and switch port 
                    for ( var j in param ) {
                        var swport = param[j];
                        //logger.info(swport.connectedToWWN +'\t' + item.zmemid);
                        switch (item.zmemtype) {
                            case "Switch Port ID":
                                if ( swport.fabwwn == item.pswwn && (swport.domainid+':'+swport.partid) == item.zmemid ) {
                                    zoneMemberItem['switch'] = swport.device;
                                    zoneMemberItem['switchport'] = swport.part; 
                                    zoneMemberItem['switchportwwn'] = swport.partwwn; 
                                    zoneMemberItem['switchportstate'] = swport.partstat; 
                                    zoneMemberItem['switchportConnectedWWN'] = swport.portwwn; 
                                      
                                    break;  
                                }
                                break;
                            case "Permanent Address":
                                if ( swport.connectedToWWN == item.zmemid ) {
                                    zoneMemberItem['switch'] = swport.device;
                                    zoneMemberItem['switchport'] = swport.part; 
                                    zoneMemberItem['switchportwwn'] = swport.partwwn; 
                                    zoneMemberItem['switchportstate'] = swport.partstat; 
                                    zoneMemberItem['switchportConnectedWWN'] = swport.portwwn; 
  
                                    break;  
                                }                            
                                break;
                        }

                    }

                    zoneItem["fabricwwn"] = item.pswwn;
                    zoneItem['device'] = item.device;
                    zoneItem['zsetname'] = item.zsetname;
                    zoneItem['zname'] = item.zname;
                    zoneItem['zonemembers'] = [];
                    zoneItem.zonemembers.push(zoneMemberItem);

                    if ( zoneResult.length == 0 ) {
                        zoneResult.push(zoneItem);
                    } else {
                        var isFind = false;
                        for ( var j in zoneResult) {
                            var item1 = zoneResult[j];
                            if ( item1.device == item.device &&  
                                item1.zsetname == item.zsetname && 
                                item1.zname == item.zname 
                                ) {
                                item1.zonemembers.push(zoneMemberItem);
                                isFind = true;
                            }
                        }
                        if ( ! isFind ) {
                            zoneResult.push(zoneItem);
                        }
                    }

                }

               logger.info('The number of Zones = ' + zoneResult.length);
               callback(null,zoneResult);

            })
        } 
    ], function (err, result) {
          callback(result);
    });

        
};

function GetPortConnectedTo(device, callback) { 


        var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>                               ";
        queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>                       ";
        queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>                           ";
        queryString = queryString + "                                                                                     ";
        queryString = queryString + " select distinct ?switchPortName ?switchPortNumber ?switchPortWWN  ?switchPortType   ";
        queryString = queryString + "  ?switchPortStatus ?switchPortSpeed ?connectedToEndpoint                  ";
        queryString = queryString + " where {                                                                             ";
        queryString = queryString + "    ?switchport rdf:type srm:SwitchPort .                                            ";
        queryString = queryString + "       ?switchport srm:residesOnPhysicalSwitch ?phySwitch .                          ";
        queryString = queryString + "       ?phySwitch srm:displayName ?phySwitchName .                                   ";
        queryString = queryString + "    ?switchport srm:displayName ?switchPortName .                                    ";
        queryString = queryString + "    ?switchport srm:Identifier ?switchPortID .                                       ";
        queryString = queryString + "    ?switchport srm:status ?switchPortStatus .                                       ";
        queryString = queryString + "    ?switchport srm:type ?switchPortType .                                           ";
        queryString = queryString + "    ?switchport srm:PortNumber ?switchPortNumber .                                   ";
        queryString = queryString + "    ?switchport srm:portSpeed ?switchPortSpeed .                                     ";
        queryString = queryString + "    ?switchport srm:containsProtocolEndpoint ?switchPortEndpoint .                   ";
        queryString = queryString + "    ?switchPortEndpoint srm:wwn ?switchPortWWN .                                     ";
        queryString = queryString + "    OPTIONAL {                                                                       ";
        queryString = queryString + "      ?switchPortEndpoint srm:connectedTo ?connectedToEndpoint .                     ";
        queryString = queryString + "    }                                                                                "; 

        if ( device !== undefined ) {
            queryString = queryString + "     FILTER  (?phySwitchName = '" + device + "' ) .  "; 
        }
        
        queryString = queryString + "    } ";

        topos.querySparql(queryString,  function (response) {
                        //var resultRecord = RecordFlat(response.body, keys); 
                        callback(response);
        }); 



}
function GetSwitchPorts1(device, callback) {
    var config = configger.load();

   async.waterfall([
       function(callback){ 

           var param = {};
           if (typeof device !== 'undefined') {  
               //param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
               param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&datagrp=\'BROCADE_FCSWITCH_PORT\'';
           } else {
               param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'datagrp=\'BROCADE_FCSWITCH_PORT\'';
           }

           param['keys'] = ['device','partwwn']; 
           //param['fields'] = ['partid','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat','lswwn','ip','lsname','fabwwn','domainid'];
           //param['fields'] = ['partid','part','porttype','partwwn','ifname','portwwn','maxspeed'];

           CallGet.CallGet(param, function(param) { 
           var result = [];
           for ( var i in param.result ) {
               var portItem = param.result[i]; 
               portItem["connectedToWWN"] = ( portItem.portwwn !== undefined ) ? portItem.portwwn :  "";
           }
           callback(null, param.result ); 
           });
       },
       function(arg1,  callback){    // Add ConnectTo Alias
            var param = {};
                    param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'datagrp=\'BROCADE_FCSWITCH_PORT\''; 

                param['keys'] = ['device','partwwn']; 
                param['fields'] = ['partid','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat','lswwn','ip','lsname','domainid'];
                //param['fields'] = ['partid','part','porttype','partwwn','ifname','portwwn','maxspeed'];

                CallGet.CallGet(param, function(param) { 
                    var result = [];
                    for ( var i in arg1 ) {
                        var portItem = arg1[i];
                        var isfind = false ;;
                        for ( var j in param.result) {
                            var item1 = param.result[j];
                            if ( portItem.device == item1.device && portItem.partwwn == item1.partwwn ) {
                                portItem = item1;
                                isfind = true;
                                break;
                            }
                        }
                        if ( isfind == false ) result.push(portItem);
                    }
                    
                    
                    callback(null, result ); 
                }); 
       }
   ], function (err, result) {
       logger.info("Return Result Count = [" + result.length + "]");
      callback(result);
   });

}


function GetSwitchPorts(device, callback) {
     var config = configger.load();
 
    async.waterfall([
        function(callback){ 

            var param = {};
            if (typeof device !== 'undefined') {  
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
            } else {
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
            }

            param['keys'] = ['device','partwwn']; 
            param['fields'] = ['part','partid','vendor','porttype','partwwn','partstat','partphys','ip','portwwn'];

            
            CallGet.CallGet(param, function(param) {  
                var a = [];
                for ( var i in param.result ) {
                    var item = param.result[i]; 
                    item["connectedToWWN"] = item.portwwn;
                    //if ( item.partwwn == '20880027F81E388C') a.push(item);
                }
                callback(null, param.result ); 
                //callback(null, a );
            });
        },
        // 20190818 update connected wwn collecter.
        function( arg1, callback ) {

            var param = {};
            if (typeof device !== 'undefined') {  
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
            } else {
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
            }

            param['keys'] = ['device','partwwn']; 
            param['fields'] = ['connwwn','portwwn','porttype'];

            CallGet.CallGet(param, function(param) { 
                var result = [];
                for ( var i in arg1 ) {
                    var portItem = arg1[i];  

                    if ( portItem.portwwn != '' ) {
                        result.push(portItem);
                        continue; 
  
                    } else {
                        var isfind = false;
                        for ( var j in param.result ) {
                            var connItem = param.result[j]; 
                            
                            if ( portItem.device == connItem.device && portItem.partwwn == connItem.partwwn ) {
                                isfind = true; 
                                var options = {
                                    object: true,
                                    arrayNotation: true 
                                };  
                                var json = xml2json.toJson(connItem.connwwn, options); 
                                var nodeinfos = json.nodeinfo[0].node ; 
                                    for ( var j in nodeinfos ) { 
                                        var nodeItem = nodeinfos[j] ;
            
                                        //logger.info("nodeItem="+JSON.stringify(nodeItem));
                                        if ( nodeItem.portname !== undefined ) 
                                            var connwwn = nodeItem.portname[0];
                                        else 
                                            if ( nodeItem.nodename !== undefined ) {
                                                var connwwn = nodeItem.nodename[0];
                                            }
                                            else 
                                                var connwwn = "";
            
                                        var newItem = {};
                                        for ( var field in portItem ) {
                                            newItem[field] = portItem[field];
                                        }
    
                                        newItem["portwwn"] = connwwn;
                                        newItem["connectedToWWN"] = connwwn;
                                        
                                        result.push(newItem);
                                    }
    
                                    break;
                                }
    
      
                            }
    
                            if ( isfind == false ) { 
                                var newItem = {};
                                for ( var field in portItem ) {
                                    newItem[field] = portItem[field];
                                } 
                                result.push(newItem);
                            }                        
                        }
                    }


                    callback(null, result );  
                } );
                
                

        },
        function(arg1, callback){ 
            // ---- Brocade Additional Fields
            var param = {};
            if (typeof device !== 'undefined') {  
                //param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&datagrp=\'BROCADE_FCSWITCH_PORT\'';
            } else {
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'datagrp=\'BROCADE_FCSWITCH_PORT\'';
            }

            param['keys'] = ['device','partwwn']; 
            param['fields'] = ['devicesn','deviceid','partid','ifname','maxspeed','gbicstat','lswwn','lsname','fabwwn','domainid'];

            CallGet.CallGet(param, function(param) { 
                var result = [];
                for ( var i in arg1 ) {
                    var item = arg1[i];
                    for ( var j in param.result ) {
                        var portItem = param.result[j];
                        if ( item.partwwn == portItem.partwwn ) {
                            
                            for ( var field in portItem ) {
                                item[field] = portItem[field]
                            }
                            break;
                        }
                    }
                }

                callback(null, arg1 ); 
            });
        },        
        function(arg1, callback){ 
            // ---- CISCO Additional Fields (Part1)
            var param = {};
            if (typeof device !== 'undefined') {   
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&datagrp=\'CISCO-FCS-VSAN\'&parttype=\'VSAN\'';
            } else {
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'datagrp=\'CISCO-FCS-VSAN\'&parttype=\'VSAN\'';
            }

            param['keys'] = ['device','lspwwn']; 
            param['fields'] = ['devicesn','deviceid','partid','lswwn','part','fabwwn'];

            CallGet.CallGet(param, function(param) { 
                var result = [];
                for ( var i in arg1 ) {
                    var item = arg1[i];
                    for ( var j in param.result ) {
                        var portItem = param.result[j]; 
                        if ( item.partwwn == portItem.lspwwn ) { 
                            for ( var field in portItem ) {
                                switch ( field ) {
                                    case 'partid':
                                        item['domainid'] = portItem[field];
                                        break;
                                    case 'part' :
                                        item['lsname'] = portItem[field];
                                        break;
                                    case 'lspwwn' : 
                                        break;
                                    default : 
                                        item[field] = portItem[field];
                                        break;
                                };
                            }
                            break;
                        }
                    }
                }

                callback(null, arg1 ); 
            });
        },     
        function(arg1, callback){ 
            // ---- CISCO Additional Fields (Part2)
            var param = {};
            if (typeof device !== 'undefined') {   
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&datagrp=\'GENERIC-INTERFACES\'&parttype=\'Port\'';
            } else {
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'datagrp=\'GENERIC-INTERFACES\'&parttype=\'Port\'';
            }

            param['keys'] = ['device','partwwn']; 
            param['fields'] = ['ifname','maxspeed','ifindex'];

            CallGet.CallGet(param, function(param) { 
                var result = [];
                for ( var i in arg1 ) {
                    var item = arg1[i];
                    for ( var j in param.result ) {
                        var portItem = param.result[j]; 
                        if ( item.partwwn == portItem.partwwn ) { 
                            for ( var field in portItem ) {
                                switch ( field ) {
                                    case 'ifindex':
                                        item['partid'] = portItem[field];
                                        break; 
                                    case 'partwwn' : 
                                        break;
                                    default : 
                                        item[field] = portItem[field];
                                        break;
                                };
                            }
                            break;
                        }
                    }
                }

                callback(null, arg1 ); 
            });
        },     
        function(arg1,  callback){    // Add ConnectTo Alias
                var param = {}; 
                param['filter'] = 'parttype==\'ZoneAlias\'';
                param['fields'] = ['pswwn','alias','zmemid'];
                param['keys'] = ['pswwn','alias','zmemid']; 

                CallGet.CallGet(param, function(param) { 
                    for ( var i in arg1 ) {
                        var item = arg1[i];

                        item["partid"] = parseInt(item.partid);
                        item['connectedToAlias'] = '';

                        if ( item.connectedToWWN != '' ) {

                            for ( var j in param.result ) {
                                var aliasItem = param.result[j];

                                if ( item.connectedToWWN == aliasItem.zmemid ) {
                                    if ( item.connectedToAlias == '' )
                                        item['connectedToAlias'] = aliasItem.alias;
                                    else 
                                        if ( item.connectedToAlias.indexOf(aliasItem.alias) < 0 )
                                            item['connectedToAlias'] = item.connectedToAlias + ',' + aliasItem.alias;
                                }
                            }

                        }  
                    }
                    callback(null,arg1);
                });
        },
        // -- Get all of initial group member list and rela with maskview 
        function(arg1,  callback){   

                // update by guozb for port link stat 
                for ( var i in arg1 ) {
                    var item = arg1[i];
 
                    if ( item.partphys == 'Other' ) {
                        if ( item.gbicstat == 'Not Licensed') 
                            item.partphys = item.gbicstat;
                        else if ( item.partstat.indexOf('Offline') >= 0 )  { 
                            item.partphys = 'Offline'; 
                        }
                        else if ( item.connectedToWWN.length > 0 ) 
                            item.partphys = 'Online'; 
                        else if ( item.partstat == 'Enabled' && item.connectedToWWN.length == 0 ) 
                            item.partphys = 'Offline';
                   } else {
                       item.partstat = item.partstat +',' + item.partphys;
                   } 

                }
                callback(null,arg1);
        }
    ], function (err, result) {
        logger.info("Return Result Count = [" + result.length + "]");
       callback(result);
    });

}

function GetSwitchPortsDetail ( device, isPortStatics, callback ) {

    
    async.waterfall([
        function (callback) {

            SWITCH.GetSwitchPorts(device, function (result) {
                callback(null, result);
            });
        },
        function (arg1, callback) {
            // 20181108 add "ZoneName" field for SMS alert at Dalian bank;
            var fabric;
            SWITCH.getFabric(fabric, function (result) {
                for (var i in arg1) {
                    var item = arg1[i];
                    for (var j in result) {
                        var FabricItem = result[j];
                        if (FabricItem.pswwn == item.fabwwn & FabricItem.zmemid == item.connectedToWWN) {
                            if (item.ZoneName === undefined)
                                item["ZoneName"] = FabricItem.zname;
                            else
                                item["ZoneName"] = item.ZoneName + ',' + FabricItem.zname;
                        }
                    }
                }

                callback(null, arg1);
            })
        },
        function (arg1, callback) {

            if (isPortStatics === undefined)
                callback(null, arg1);
            else if (isPortStatics != 'true')
                callback(null, arg1);
            else {

                SWITCH.GetSwitchPortsStatics(device, function (result) {

                    for (var i in arg1) {
                        var portItem = arg1[i];

                        for (var j in result) {
                            var item = result[j];
                            if (item.device == portItem.device && item.partwwn == portItem.partwwn) {
                                for (var key in item) {

                                    switch (key) {
                                        case 'device':
                                        case 'name':
                                        case 'partwwn':
                                        case 'porttype':
                                            break;
                                        default:
                                            portItem[key] = item[key];
                                            break;
                                    }

                                }
                            }
                        }

                    }
                    callback(null, arg1);
                });
            }


        },
        function (arg1, callback) {
            var host;
            HOST.GetHBAFlatRecord(host, function (hosts) {
                for (var i in arg1) {
                    var portItem = arg1[i];
                    portItem["hostname"] = portItem.connectedToAlias; // default equal the port alias name;

                    for (var j in hosts) {
                        var hostItem = hosts[j];
                        if (portItem.portwwn == hostItem.hba_wwn) {
                            portItem["hostname"] = hostItem.hostname;
                            portItem["hostip"] = hostItem.managementip;
                            portItem["connectedToDeviceType"] = 'Host';
                            portItem["connectedToDevice"] = hostItem.hostname;
                            portItem["connectedToPart"] = hostItem.hba_name;
                            break;
                        }
                    }
                }
                callback(null, arg1);
            })
        },

        function (arg1, callback) {
            var param = {};
            //param['filter_name'] = '(name=\'Availability\')';
            param['keys'] = ['serialnb', 'feport'];
            param['fields'] = ['portwwn', 'porttype'];
            //param['period'] = 3600;
            //param['valuetype'] = 'MAX'; 
            param['filter'] = '(datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\')|(source=\'VNXBlock-Collector\'&parttype==\'Port\')';

            CallGet.CallGet(param, function (param) {

                for (var i in arg1) {
                    var item1 = arg1[i];

                    for (var j in param.result) {
                        var FEPortItem = param.result[j];

                        if (item1.connectedToWWN == FEPortItem.portwwn) {
                            item1["connectedToDeviceType"] = 'Array';
                            item1["connectedToDevice"] = FEPortItem.serialnb;
                            item1["connectedToPart"] = FEPortItem.feport;
                            break;
                        }
                    }
                }
                var data = { arg1: arg1 };
                callback(null, data);
            });


        },
        function (data, callback) {
            var filter;
            DeviceMgmt.getMgmtObjectInfo(filter, function (arrayinfo) {
                data["arrayinfo"] = arrayinfo;
                // storagesn, name

                callback(null, data);
            });
        },
        function (data, callback) {
            var arg1 = data.arg1;
            Analysis.getAppTopology(function (apptopo) {

                for (var i in arg1) {
                    var portItem = arg1[i];

                    var portwwn = portItem.partwwn;
                    var connectPortWWN = portItem.connectedToWWN;
                    portItem["connectedDevType"] = '';
                    portItem["connectedDevName"] = '';
                    portItem["connectedDevPortName"] = '';
                    portItem["zoneinfo"] = [];

                    var portIsFind = false;
                    for (var j in apptopo) {
                        var item = apptopo[j];

                        if (portwwn == item.connect_hba_swport_wwn) {
                            portIsFind = true;
                            portItem["connectedDevType"] = 'host';
                            if (portItem.connectedDevName === '') portItem["connectedDevName"] = item.host;
                            else if (portItem.connectedDevName.indexOf(item.host) < 0)
                                portItem["connectedDevName"] = portItem.connectedDevName + ',' + item.host;

                            if (portItem.connectedDevPortName === '') portItem["connectedDevPortName"] = item.connect_hba_swport_alias;
                            else if (portItem.connectedDevPortName.indexOf(item.connect_hba_swport_alias) < 0)
                                portItem["connectedDevPortName"] = portItem.connectedDevPortName + ',' + item.connect_hba_swport_alias;


                            var isfind = false;
                            for (var z in portItem.zoneinfo) {
                                var zoneItem = portItem.zoneinfo[z];
                                if (item.zname == zoneItem.zonename) {
                                    isfind = true;
                                    break;
                                }
                            }
                            if (isfind == false) {
                                portItem.zoneinfo.push({ "zonename": item.zname })
                                var hbaname = item.zname.match(/[A-Za-z0-9)_]+(HBA[0-9])_[A-Za-z0-9)_]+/);
                                if (hbaname !== undefined && hbaname != null) {
                                    portItem["connectedDevPortName"] = hbaname[1];
                                }
                            }

                        } else if ((portwwn == item.connect_arrayport_swport_wwn) || (connectPortWWN == item.arrayport_wwn)) {
                            portIsFind = true;
                            portItem["connectedDevType"] = 'array';
                            portItem["connectedDevName"] = item.arrayname;
                            portItem["connectedDevPortName"] = item.arrayport;
                            var isfind = false;
                            for (var z in portItem.zoneinfo) {
                                var zoneItem = portItem.zoneinfo[z];
                                if (item.zname == zoneItem.zonename) {
                                    isfind = true;
                                    break;
                                }
                            }
                            if (isfind == false)
                                portItem.zoneinfo.push({ "zonename": item.zname })
                        }

                    }

                    if (portIsFind == false && portItem["connectedToDeviceType"] == 'Array') {
                        portItem["connectedDevType"] = 'array';
                        portItem["connectedDevPortName"] = portItem["connectedToPart"];

                        var arraysn = portItem["connectedToDevice"];
                        var isfind = false;
                        for (var i in data.arrayinfo) {
                            var arrayinfoItem = data.arrayinfo[i];
                            if (arrayinfoItem.storagesn == arraysn) {
                                isfind = true;
                                portItem["connectedDevName"] = arrayinfoItem.name;
                                break;
                            }
                        }
                        if (isfind == false)
                            portItem["connectedDevName"] = portItem["connectedToDevice"];

                    }


                }

                callback(null, arg1);

            })
        },
        function (arg1, callback) {
            for (var i in arg1) {
                var item = arg1[i];
                if (item.zoneinfo.length == 0) {
                    if (item.connectedToWWN != " ") {
                        var zoneinfoItem = { zonename: "connectedWWN:" + item.connectedToWWN }
                        item.zoneinfo.push(zoneinfoItem);
                    }

                }
            }
            callback(null, arg1);
        }
    ], function (err, result) {
        // result now equals 'done'  
        result.sort(sortBy('partid'));
        callback(result);
    });

}


function GetSwitchPortsStatics(device, callback) {
    var config = configger.load();

   async.waterfall([
       function(callback){ 
 
           var param = {};
           if (typeof device !== 'undefined') {  
               param['filter'] = 'device=\''+device+'\'&!vstatus==\'inactive\'&datagrp=\'BROCADE_SWITCHFCPORTSTATS\'';
           } else {
               param['filter'] = '!vstatus==\'inactive\'&datagrp=\'BROCADE_SWITCHFCPORTSTATS\'';
           }

           param['filter_name'] = '(name=\'InFramesEncodingErrors\'|name=\'InCrcs\'|name=\'OutFramesEncodingErrors\'|name=\'C3Discards\'|name=\'LinkFailures\')';
           param['keys'] = ['device','partwwn'];
           //param['fields'] = ['partid','slotnum','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat'];
           param['fields'] = ['porttype'];
           param['period'] = 3600;  
           param['valuetype'] = 'last';
           param['start'] = util.getConfStartTime('1d');  


           CallGet.CallGet(param, function(param) { 
               var result = param.result ; 
 
                // For Dalian Bank issue workground. all set to 0;
                for ( var i in result ) {
                    var item = result[i];
                    item["InFramesEncodingErrors"] = 0;
                    item["InCrcs"] = 0;
                    item["OutFramesEncodingErrors"] = 0;
                    item["C3Discards"] = 0;
                    item["LinkFailures"] = 0; 
                }

               callback(null,result);     
           });
       }
   ], function (err, result) {
      callback(result);
   });

}


function getFabric(fabwwn, callback) {
     var config = configger.load();

    if ( fabwwn === undefined ) { 
        var filter = '(parttype=\'ZoneMember\'&datagrp=\'BROCADE_ZONEMEMBER\')|(parttype=\'Zone\'&datagrp=\'CISCO-ACTIVE-ZONE\')';

    } else { 
        var filter = 'pswwn=\''+fabwwn+'\'&(parttype=\'ZoneMember\'&datagrp=\'BROCADE_ZONEMEMBER\')|(parttype=\'Zone\'&datagrp=\'CISCO-ACTIVE-ZONE\')';
    }
    var param = {};
    param['fields'] = ['zmemtype'];
    param['keys'] = ['device','pswwn','zsetname','zname','zmemid'];
    param['filter'] = filter;

    async.waterfall([
        function(callback){ 
                var zoneResult = []; 
                CallGet.CallGet(param, function(param) { 
                    var result = param.result ; 
                    for ( var i in result ) {
                        var item = result[i];
                        if ( item.zmemtype == 'wwn' ) item.zmemtype = 'Permanent Address';
                    }
          
                    callback(null,result);     
                });

        },
        function(arg1,  callback){   

                callback(null,arg1);
        }
    ], function (err, result) { 
       callback(result);
    }); 

}


function getSwitchsByFabric(fabwwn, device, callback) {
    var config = configger.load(); 

    if (fabwwn === undefined && device === undefined) {
        var fields = 'part,psname,pswwn,device,deviceid,fabwwn,lswwn,lsname';
        var filter = 'parttype==\'Fabric\'|parttype==\'VSAN\'';

    } else if (fabwwn !== undefined) {
        var fields = 'part,psname,pswwn,device,deviceid,fabwwn,lswwn,lsname';
        var filter = 'fabwwn=\'' + fabwwn + '\'&devtype=\'FabricSwitch\'';

    } else if (device !== undefined) {
        var fields = 'part,psname,pswwn,device,deviceid,fabwwn,lswwn,lsname';
        var filter = 'device=\'' + device + '\'&devtype=\'FabricSwitch\'';
    }


    var fabricResult = [];
    async.waterfall([
        function (callback) {

            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({ 'Content-Type': 'multipart/form-data' })
                .query({ 'fields': fields, 'filter': filter })
                .end(function (response) {

                    var resultJson = JSON.parse(response.raw_body).values;

                    for (var i in resultJson) {
                        var item = resultJson[i];
                        var fabricItem = {};
                        var switchItem = {};
                        switchItem['deviceid'] = item.deviceid;
                        switchItem['device'] = item.device;
                        switchItem['lsname'] = item.lsname;
                        switchItem['lswwn'] = item.lswwn;


                        fabricItem['fabwwn'] = item.fabwwn;
                        fabricItem['psname'] = item.psname;
                        fabricItem['switchs'] = [];
                        fabricItem.switchs.push(switchItem);

                        if (fabricResult.length == 0) {
                            fabricResult.push(fabricItem);
                        } else {
                            var isFind = false;
                            for (var j in fabricResult) {
                                var item1 = fabricResult[j];
                                if (item1.fabwwn == item.fabwwn) {
                                    item1.switchs.push(switchItem);
                                    isFind = true;
                                }
                            }
                            if (!isFind) {
                                fabricResult.push(fabricItem);
                            }
                        }
                    }
                    callback(null, fabricResult)
                })
        },
        function (arg1, callback) {

            if ( device === undefined ) {
                callback( null , arg1) ;
            } else {
                var fabwwn = arg1[0].fabwwn;

                var fabricResult1 = [];

                var fields1 = 'part,psname,pswwn,device,deviceid,fabwwn,lswwn,lsname';
                var filter1 = 'fabwwn=\'' + fabwwn + '\'&devtype=\'FabricSwitch\'';

                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({ 'Content-Type': 'multipart/form-data' })
                .query({ 'fields': fields1, 'filter': filter1 })
                .end(function (response1) {

                    var resultJson1 = JSON.parse(response1.raw_body).values;

                    for (var i in resultJson1) {
                        var item = resultJson1[i];
                        var fabricItem = {};
                        var switchItem = {};
                        switchItem['deviceid'] = item.deviceid;
                        switchItem['device'] = item.device;
                        switchItem['lsname'] = item.lsname;
                        switchItem['lswwn'] = item.lswwn;


                        fabricItem['fabwwn'] = item.fabwwn;
                        fabricItem['psname'] = item.psname;
                        fabricItem['switchs'] = [];
                        fabricItem.switchs.push(switchItem);

                        if (fabricResult1.length == 0) {
                            fabricResult1.push(fabricItem);
                        } else {
                            var isFind = false;
                            for (var j in fabricResult1) {
                                var item1 = fabricResult1[j];
                                if (item1.fabwwn == item.fabwwn) {
                                    item1.switchs.push(switchItem);
                                    isFind = true;
                                }
                            }
                            if (!isFind) {
                                fabricResult1.push(fabricItem);
                            }
                        }
                    }
                    callback(null, fabricResult1)
                })
            }
            
        }
    ], function (err, fabricResult) {
 
        callback(fabricResult);

    });

}


function getSwitchPortPerformance(device, callback) {
 
        var config = configger.load();

        var data = {};

        async.waterfall([
            function(callback){ 

                var start = '2017-06-17T00:30:00+08:00'
                var end = '2017-06-17T02:30:00+08:00'
                //var start = util.getPerfStartTime();
                //var end = util.getPerfEndTime();
                if  ( typeof device === 'undefined') 
                    var filterbase = '(parttype==\'Port\')';
                else 
                    var filterbase = 'device==\''+device+'\'&(parttype==\'Port\')';
                //var filter = filterbase + '&(name=\'InCrcs\'|name=\'LinkFailures\'|name=\'SigLosses\'|name=\'SyncLosses\'|name=\'CreditLost\'|name=\'Availability\'|name=\'ifInOctets\'|name=\'ifOutOctets\')';
                var filter = filterbase + '&(name=\'ifInOctets\'|name=\'ifOutOctets\')';

                var fields = 'device,name,part';
                var keys = ['device,part'];

                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

                logger.info(queryString);
                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query(queryString) 
                        .end(function (response) { 
                            if ( response.error ) {
                                logger.error(response.error);
                                return response.error;
                            } else {  
                                //logger.info(response.body);   
                                var resultRecord = response.raw_body; 
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(arg1,  callback){ 
                
                var result = [];
                var oriArray = JSON.parse(arg1).values;
                for ( var i in oriArray) { 
                    var item = oriArray[i].properties;
                    logger.info(item.part + '\t' + item.name);
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

                var result1 = CallGet.convertPerformanceStruct(result);
                data['perf'] = result1;
                //var ret = arg1.values; 
               callback(null,data);


            },
            function(data,  callback){ 
                     var param = {};
                    if (typeof device !== 'undefined') { 
                        param['filter'] = 'device=\''+device+'\'&' + param['filter'];
                    } 

                    param['filter_name'] = 'name=\'LinkFailures\'';
                    param['keys'] = ['device','partwwn'];
                    param['fields'] = ['partid','part','partwwn','portwwn','partstat'];
                    param['filter'] = 'device=\''+device+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
                    CallGet.CallGet(param, function(param) { 
                    var result = [];
                        data['port'] = param.result;
                        callback(null, data ); 
                    });

            },
            function(data,  callback){ 
                var perf = data.perf;

                for ( var i in perf ) {
                    var item = perf[i];

                    for ( var j in data.port ) {
                        var portitem = data.port[j];

                        if ( item.part == portitem.part ) {
                            portitem['perf'] = item.matrics;
                        }
                    }
                }

                callback(null,data.port);

            }
 
        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           // var r = JSON.parse(result);
           callback(result);
        });


 

         
    };



function getSwitchPortPerformance1(device, portwwn, start, end,  callback) {
 
        var config = configger.load();
        //var start = '2017-06-10T18:30:00+08:00'
        //var end = '2017-06-10T19:30:00+08:00'
        //var start = util.getPerfStartTime();
        //var end = util.getPerfEndTime();

        var filterbase = 'device==\''+device+'\'&parttype==\'Port\'&partwwn=\''+portwwn+'\'';

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name=\'ifInOctets\'|name=\'ifOutOctets\')';

                var fields = 'device,name,part';
                var keys = ['device,part'];



                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

logger.info(queryString);

                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query(queryString) 
                        .end(function (response) { 
                            if ( response.error ) {
                                logger.error(response.error);
                                return response.error;
                            } else {  
                                //logger.info(response.body);   
                                var resultRecord = response.raw_body;
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(arg1,  callback){ 

                var result = [];
                var oriArray = JSON.parse(arg1).values;
                for ( var i in oriArray) { 
                    var item = oriArray[i].properties;
                    logger.info(item.part + '\t' + item.name);
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
                if ( result.length == 0 ) {
                    callback(null,result);
                } else {
                    var result1 = CallGet.convertPerformanceStruct(result); 
                    //var ret = arg1.values; 
                    callback(null,result1);                    
                }



            },
            function(data,  callback){ 
                logger.info(data.length);
                if ( data.length == 0 ) {
                    callback(null,data);
                } else {

                    var matrics = data[0].matrics;
                    var result = {};
                    result['category'] = 'Throughput ( MB/s )';
                    result['chartData'] = [];
                    for ( var i in matrics ) {
                        var item = matrics[i];
                        var chartDataItem = {};
                        chartDataItem['name'] = item.timestamp;
                        chartDataItem['ifInOctets'] = item.ifInOctets / 1024 / 1024 ;
                        chartDataItem['ifOutOctets'] = item.ifOutOctets / 1024 / 1024 ;

                        result.chartData.push(chartDataItem);
                        
                    }

                    var finalResult = {};
                    finalResult['charts'] = [];
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


function getAlias(wwnlist, callback) {
 
        var config = configger.load();
        var data = {};

        var filter1 = '';
        if ( wwnlist !== undefined) {
            if ( Array.isArray(wwnlist ) ) 
                for ( var i in wwnlist ) {
                    var wwnitem = wwnlist[i];
                    if ( filter1 == '' ) {
                        filter1 = 'zmemid==\'' + wwnitem + '\'';
                    } else {
                        filter1 = filter1 + '|zmemid==\'' + wwnitem + '\'';
                    }
                }
            else 
                filter1 = 'zmemid==\'' + wwnlist + '\'';
        }
        if ( filter1 != '' ) filter1 = '&(' + filter1 + ')';

        
        async.waterfall([
            function(callback){ 
 
                var filter = '(parttype==\'ZoneAlias\')' + filter1; 
                var fields = 'pswwn,alias,zmemid';

logger.info(filter);
                var fabricResult = [];
                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query({'fields': fields , 'filter':  filter }) 
                        .end(function (response) {
                            
                            if ( response.error ) {
                                logger.error(response.error);
                                return response.error;
                            } else {  
                                //logger.info(response.body);   
                                var resultJson = JSON.parse(response.raw_body).values; 
                                callback(null,resultJson);
                            }
         
                        }); 

     
            },
            function(arg1,  callback){ 
                

               callback(null,arg1);


            },
            function(data,  callback){ 
 
               callback(null, data );  

            } 
 
        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           // var r = JSON.parse(result);
           callback(result);
        });


 

         
    };

