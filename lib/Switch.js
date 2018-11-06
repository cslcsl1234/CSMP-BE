"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var topos = require('../lib/topos.js');
var util = require('./util');


module.exports = {
    GetSwitchPorts,
    GetSwitchPortsStatics,
    getSwitchPortPerformance,
    getSwitchPortPerformance1,
    getAlias , 
    getFabric ,
    getZone,
    getZone1,GetSwitchPorts1
}

function getZone(fabwwn, callback) { 
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
                        //console.log(swport.connectedToWWN +'\t' + item.zmemid);
                        switch (item.zmemtype) {
                            case "Switch Port ID":
                                if ( swport.fabwwn == item.pswwn && (swport.domainid+':'+swport.partid) == item.zmemid ) {
                                    zoneMemberItem['switch'] = swport.device;
                                    zoneMemberItem['switchsn'] = swport.devicesn;
                                    zoneMemberItem['switchid'] = swport.deviceid;
                                    
                                    zoneMemberItem['switchip'] = swport.ip;
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
                                    zoneMemberItem['switchsn'] = swport.devicesn;
                                    zoneMemberItem['switchid'] = swport.deviceid;
                                    zoneMemberItem['switchip'] = swport.ip;
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

               console.log('The number of Zones = ' + zoneResult.length);
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
                        //console.log(swport.connectedToWWN +'\t' + item.zmemid);
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

               console.log('The number of Zones = ' + zoneResult.length);
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
       console.log("Return Result Count = [" + result.length + "]");
      callback(result);
   });

}


function GetSwitchPorts(device, callback) {
     var config = configger.load();
 
    async.waterfall([
        function(callback){ 

            var param = {};
            if (typeof device !== 'undefined') {  
                //param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'device=\''+device+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
            } else {
                param['filter'] = config.SRM_RESTAPI.BASE_FILTER+'parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
            }

            param['keys'] = ['device','partwwn']; 
            //param['fields'] = ['devicesn','deviceid','partid','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat','lswwn','ip','lsname','fabwwn','domainid'];
            param['fields'] = ['part','porttype','partwwn','portwwn','partstat','partphys','ip'];

            CallGet.CallGet(param, function(param) { 
                var result = [];
                for ( var i in param.result ) {
                    var portItem = param.result[i]; 
                    portItem["connectedToWWN"] = ( portItem.portwwn !== undefined ) ? portItem.portwwn :  "";
                } 
                
                callback(null, param.result ); 
            });
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
                   }
                }
                callback(null,arg1);
        }
    ], function (err, result) {
        console.log("Return Result Count = [" + result.length + "]");
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
                    console.log(item.part + '\t' + item.name);
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
                    console.log(item.part + '\t' + item.name);
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
                console.log(data.length);
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

console.log(filter);
                var fabricResult = [];
                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query({'fields': fields , 'filter':  filter }) 
                        .end(function (response) {
                            
                            if ( response.error ) {
                                console.log(response.error);
                                return response.error;
                            } else {  
                                //console.log(response.body);   
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

