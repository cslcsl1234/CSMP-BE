"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('switchController')  
const name = 'switch'  
var unirest = require('unirest');
var configger = require('../config/configger');
var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');
var CallGet = require('../lib/CallGet'); 
var async = require('async');
 
var SWITCH = require('../lib/Switch');
var Host = require('../lib/Host');


exports.getToposViews = function (callback ) {

    var finalResult = [];
    var processDatas = {};

    async.waterfall([

        /*
           Get the all of fc port list from switchs
         */
        function(callback){ 
            var device;
            SWITCH.GetSwitchPorts(device,function(result) {

                var switchPortList = [];
                for ( var i in result ) {
                    var portItem = result[i];
                    //if ( portItem.partstat.indexOf("Offline") < 0 ) { 
                        portItem["connectedToType"] = "";
                        portItem["connectedToDevice"] = "";
                        portItem["connectedToPart"] = "";
                        portItem["connectedToPartType"] = "";
                        switchPortList.push(portItem);
                    //}
                }
                processDatas["swports"] = switchPortList;
                callback(null, processDatas);
            });


        }, 

        /*
            Get the all of Front-End port from arrays
         */
        function(arg1,  callback){ 


                var param = {};
                //param['filter_name'] = '(name=\'Availability\')';
                param['keys'] = ['serialnb','feport'];
                param['fields'] = ['portwwn','porttype'];
                //param['period'] = 3600;
                //param['valuetype'] = 'MAX';

                if (typeof device !== 'undefined') { 
                    param['filter'] = 'device=\''+device+'\'&datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\'';
                } else {
                    param['filter'] = '(datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\')|(source=\'VNXBlock-Collector\'&parttype==\'Port\')';
                } 
 

                CallGet.CallGet(param, function(param) {

                    var feports = [];
                    for ( var i in arg1 ) {
                        var item1 = arg1[i]; 

                        for ( var j in param.result ) {
                            var FEPortItem = param.result[j];
                            feports.push(FEPortItem);

                        }
                    }
                    arg1["FEPorts"] = feports;

                    callback( null, arg1 ); 
                }); 
        }, 

        /*
            Get the all of hba wwn from hosts
         */
        function(arg1,  callback){ 
            var device;
           Host.GetHBAFlatRecord(device, function(result) {
                arg1["HBAs"] = result;
                callback(null,arg1);
           })
        },  
        // get with zone info 
        function ( arg1, callback ) {
            var device;
           SWITCH.getFabric(device, function(zoneresult) {
               var zoneResult = [];

               for ( var i in zoneresult ) {
                  var zoneItem = zoneresult[i];
                  var zoneMemberItem = {};
                  zoneMemberItem["zmemid"] = zoneItem.zmemid;
                  zoneMemberItem["zmemtype"] = zoneItem.zmemtype;


                    var isFind = false;
                    for ( var j in zoneResult ) {
                        var zoneResultItem = zoneResult[j];
                        if ( zoneResultItem.pswwn == zoneItem.pswwn && 
                             zoneResultItem.zsetname == zoneItem.zsetname && 
                             zoneResultItem.zname == zoneItem.zname ) {

                            zoneResultItem.members.push(zoneMemberItem);
                            isFind = true;
                            break;
                        
                        }
                    }

                    if ( isFind == false ){
                        var zoneResultItem = {};
                        zoneResultItem["pswwn"] = zoneItem.pswwn;
                        zoneResultItem["zname"] = zoneItem.zname;
                        zoneResultItem["zsetname"] = zoneItem.zsetname;
                        zoneResultItem["members"] = [];

                        zoneResultItem.members.push(zoneMemberItem);
                        zoneResult.push(zoneResultItem);
                    }

               }

               arg1["zone"] = zoneResult;
               callback(null,arg1);

            })            
        },
        /*
            releaship with connect to ;
         */
        function(arg1,  callback){ 


            var ConnectHosts = [];
            var ConnectArrays = [];
            var ConnectUnknow = [];
            var ConnectSwitch = [];

            for ( var i in arg1.swports ) {
                var portItem = arg1.swports[i];
                var isFind = false ; 

                if ( portItem.partstat.indexOf("Offline") >= 0 ) continue;

                // Array
                for ( var j in arg1.FEPorts ) {
                    var fePortItem = arg1.FEPorts[j];
                    if ( fePortItem.portwwn == portItem.connectedToWWN ) {
                        portItem.connectedToType = "Array";
                        portItem.connectedToDevice = fePortItem.serialnb;
                        portItem.connectedToPart = fePortItem.feport;
                        portItem.connectedToPartType = fePortItem.porttype;
                        portItem["connectedTo"] = fePortItem;

                        ConnectArrays.push(portItem);

                        isFind = true;
                        break;
                    }
                }

                // Hosts
                if ( isFind  == false ) {
                    for ( var j in arg1.HBAs ) {
                        var hbaPortItem = arg1.HBAs[j];
                        if ( hbaPortItem.hba_wwn == portItem.connectedToWWN ) {
                            portItem.connectedToType = "Host";
                            portItem.connectedToDevice = hbaPortItem.hostname;
                            portItem.connectedToPart = hbaPortItem.hba_name;
                            portItem.connectedToPartType = "hba";
                            portItem["connectedTo"] = hbaPortItem;
                            ConnectHosts.push(portItem);

                            isFind = true;
                            break;
                        }
                    }                    
                }


                // Switch
                if ( isFind  == false ) {
                    for ( var j in arg1.swports ) {
                        var swPortItem = arg1.swports[j];
                        if ( swPortItem.partwwn == portItem.connectedToWWN ) {
                            portItem.connectedToType = "Switch";
                            portItem.connectedToDevice = swPortItem.device;
                            portItem.connectedToPart = swPortItem.part;
                            portItem.connectedToPartType = swPortItem.porttype;
                            //portItem["connectedTo"] = swPortItem;
                            ConnectSwitch.push(portItem);

                            isFind = true;
                            break;
                        }
                    }                    
                }
                

                // Customer Filter base on the port alias name;
                if ( isFind == false ) {

                    var regExpList = [/fcs/,/HBA/,/hba/,/sp[ab]/,/robot/];

                    for ( var i in regExpList ) {
                        var regExpObj = regExpList[i];
                        var regExpStr = regExpObj.exec(portItem.connectedToAlias);
                        if (  regExpStr  != null  ) {


                            var alias = portItem.connectedToAlias;
 
                            switch ( String(regExpStr) ) {
                                case "fcs":
                                case "HBA": 
                                case "hba": 
                                    portItem.connectedToPart = alias.substring(alias.indexOf(regExpStr),alias.length);
                                    portItem.connectedToDevice = alias.substring(0,alias.indexOf(regExpStr)-1);
                                    portItem.connectedToPartType = "hba-customerfind";
 
                                    break;
                                case "spb": 
                                case "spa": 
                                case "robot": 
                                    portItem.connectedToPart = alias.substring(alias.indexOf(regExpStr),alias.length);
                                    portItem.connectedToDevice = alias.substring(0,alias.indexOf(regExpStr)-1);
                                    portItem.connectedToPartType = "FE-customerfind";
 
                                    break;
                                default :
                                    console.log("BBBB "); 
                            }
                            portItem.connectedToType = "Host";
                            //portItem["connectedTo"] = swPortItem;
                            ConnectHosts.push(portItem);

                            isFind = true;                           
                        }
                    }
               

                }

                if ( isFind == false) {
                    ConnectUnknow.push(portItem);
                }


            }


            arg1["portsByConnectTo"] = {};
            arg1.portsByConnectTo["ConnectToUnknow"] = ConnectUnknow;
            arg1.portsByConnectTo["ConnectToArray"] = ConnectArrays;
            arg1.portsByConnectTo["ConnectToSwitch"] = ConnectSwitch;
            arg1.portsByConnectTo["ConnectToHost"] = ConnectHosts;

            callback(null,arg1);
        } ,
        /*
            releaship with zone ;
         */
        function(arg1,  callback){ 

            var finalTopoResult = [];
            for ( var i in arg1.zone ) {
                var zoneItem = arg1.zone[i];

                var topoRecord = {};
                topoRecord["fabricwwn"] = zoneItem.pswwn;
                topoRecord["zsetname"] = zoneItem.zsetname;
                topoRecord["zname"] = zoneItem.zname;
                var isActive = 0;

                for ( var z in zoneItem.members ) {
                    var zoneMemberItem = zoneItem.members[z];

                     for ( var j in arg1.swports ) {
                        var portItem = arg1.swports[j];



                        if ( ( zoneMemberItem.zmemtype == "Permanent Address" && 
                             zoneMemberItem.zmemid == portItem.connectedToWWN ) || 
                            ( zoneMemberItem.zmemtype == "Switch Port ID" && 
                              zoneItem.pswwn == portItem.lswwn &&
                              zoneMemberItem.zmemid.replace(":","/") == ( portItem.part.indexOf("/") < 0 ? '1/'+portItem.part : portItem.part )   ) )
                        {

                                    if ( portItem.partstat.indexOf("Offline") < 0 ) 
                                        isActive++;

                                    if ( portItem.connectedToType == 'Host' ) {
                                        if ( portItem.connectedTo !== undefined ) {
                                            topoRecord["appname"] = portItem.connectedTo.app_name;
                                        } else 
                                            topoRecord["appname"] = "";

                                        topoRecord["hostname"] = portItem.connectedToDevice;
                                        topoRecord["hbawwn"] = portItem.connectedToWWN;
                                        topoRecord["hbaname"] = portItem.connectedToPart;
                                        topoRecord["hbaAlias"] = portItem.connectedToAlias;

                                        topoRecord["connectHostSwitchName"] = portItem.lsname+"("+portItem.ip+")";
                                        topoRecord["connectHostSwitchPort"] = portItem.part;
                                        topoRecord["connectHostSwitchPortWWN"] = portItem.partwwn;
                                        topoRecord["connectHostSwitchPortID"] = portItem.partid;
                                    } else 
                                    if ( portItem.connectedToType == 'Array' ) {

                                        topoRecord["arrayname"] = portItem.connectedToDevice;
                                        topoRecord["arrayFEPortWWN"] = portItem.connectedToWWN;
                                        topoRecord["arrayFEPortName"] = portItem.connectedToPart;
                                        topoRecord["arrayFEPortAlias"] = portItem.connectedToAlias;

                                        topoRecord["connectArraySwitchName"] = portItem.lsname+"("+portItem.ip+")";
                                        topoRecord["connectArraySwitchPort"] = portItem.part;
                                        topoRecord["connectArraySwitchPortWWN"] = portItem.partwwn;
                                        topoRecord["connectArraySwitchPortID"] = portItem.partid;
                                    } else {
                                        topoRecord["connectUnknowSwitchName"] = portItem.device;
                                        topoRecord["connectUnknowSwitchPort"] = portItem.part;
                                        topoRecord["connectUnknowSwitchPortWWN"] = portItem.partwwn;
                                        topoRecord["connectUnknowSwitchPortID"] = portItem.partid;
                                    }
                         }
                      

                    }

                }

                if ( isActive >= 2 ) { 
                    topoRecord["vstatus"] = 'active';
                } else {
                    topoRecord["vstatus"] = 'inactive';               
                }



                finalTopoResult.push(topoRecord);

            }

            arg1["finalTopoResult"] = finalTopoResult;

            callback(null,arg1);

        }


    ], function (err, result) {
       callback(result);
    });

};

exports.getTopos = function (callback ) {

   
/*
    async.waterfall(books, function (err, result) {
        console.log(result);
    })
*/

 
    var config = configger.load();
    var toposResult = {};

    var config = configger.load();
    async.waterfall([
        function(callback){ 
            var f = new getSwitchPorts(callback);
 
        },        
        function(arg1,  callback){ 
            var f = new getArrayPorts(arg1 , callback);

        },
        function(arg1,  callback){ 
            var f = new getZoning(arg1 , callback);

        },
        function(arg1,  callback){ 
            var f = new matchArrayPorts(arg1 , callback);

        }
    ], function (err, result) {
       // result now equals 'done'
       //console.log(result); 
       callback(result);
    });

};

// Drop entity that have not include submember.
exports.cleanEntityFilter = function (entitys) { 

    // get all of group endity
    var groupEntitys = [];
    var resultEntitys = [];
    for ( var e in entitys ) {
        var entityItem = entitys[e];
        if ( entityItem.isGroup ) {
            groupEntitys.push(entityItem);
        } else 
            resultEntitys.push(entityItem);

    }

    for ( var g in groupEntitys ) {
        var groupItem = groupEntitys[g]; 
        for ( var e in entitys ) {
            var entityItem = entitys[e];
            if ( groupItem.key == entityItem.group ) {
                resultEntitys.push(groupItem);
                break;
            }
        }  
    }

    return resultEntitys;

}

// short the group that is very long
exports.shortGroupNameFilter = function (entitys) { 

    // get all of group endity 
    for ( var e in entitys ) {
        var entityItem = entitys[e];

        if ( entityItem.isGroup ) {
            if ( entityItem.key == "Cisco Systems" ) { entityItem.text = "Cisco"; };
            if ( entityItem.key == "EMC Corporation" ) { entityItem.text = "EMC"; };           
        } 



    }
 

    return entitys;

}

// Add a "description" propertite in each entity 
exports.addDescriptionFilter = function (entitys) { 

    // get all of group endity 
    for ( var e in entitys ) {
        var entityItem = entitys[e];

        var desc = "storageSystemType:" + entityItem.storageSystemType + "\n";
        desc = desc + "th:ss";
        entityItem["description"] = desc;

    }
 

    return entitys;

}

            
            

exports.getEntitys = function (callback) { 

        var config = configger.load(); 
        var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
        queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";
        queryString = queryString + " SELECT distinct ?object ?s ?o  ";
        queryString = queryString + " WHERE {  ";
        queryString = queryString + "     { ?object1 rdf:type srm:LogicalSwitch .    ";
        queryString = queryString + "     ?object1 srm:residesOnPhysicalSwitch ?object .  }  ";
        queryString = queryString + "     union   ";
        queryString = queryString + "     { ?object rdf:type srm:StorageEntity .  }  ";
        queryString = queryString + "     ?object ?s ?o . "; 
        queryString = queryString + "  } "; 


        this.querySparql(queryString, function(result) { 
            var resJson = combineEntity(result);
            callback(resJson);
        })


};

exports.getLinks = function (callback) { 

        var config = configger.load(); 
        var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
        queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";
        queryString = queryString + " SELECT distinct ?from ?to ";
        queryString = queryString + " WHERE {  ";
        queryString = queryString + "     ?from rdf:type srm:PhysicalSwitch .   ";
        queryString = queryString + "     ?from srm:containsLogicalSwitch ?logicalSwitch .  ";
        queryString = queryString + "     ?logicalSwitch srm:containsProtocolEndpoint ?swep . ";
        queryString = queryString + "     ?swep srm:connectedTo ?swConnected . ";
        queryString = queryString + "     ?swConnected srm:residesOnStorageFrontEndPort ?arrayFEPort .  ";
        queryString = queryString + "     ?arrayFEPort srm:residesOnStorageFrontEndAdapter ?arrayFEAdapter . "; 
        queryString = queryString + "     ?arrayFEAdapter srm:residesOnStorageEntity ?to . "; 
        queryString = queryString + "  } "; 



        this.querySparql(queryString, function(result) {
            callback(result);
        })

};

exports.getZoneMemberRelation = function (callback) { 

        var config = configger.load(); 
        var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
        queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";
        queryString = queryString + " select ?fabricName ?zoneSetName ?zoneName ?zoneMemberName ?zmemtype ?connSWPortName ?connSWName  ";
        queryString = queryString + " where { ";
        queryString = queryString + "    ?fabric rdf:type srm:Fabric . ";
        queryString = queryString + "    ?fabric srm:displayName ?fabricName . ";
        queryString = queryString + "    ?fabric srm:containsZoneSet ?zoneSet . ";
        queryString = queryString + "    ?zoneSet srm:displayName ?zoneSetName . ";
        queryString = queryString + "    ?zoneSet srm:containsZone ?zone . ";
        queryString = queryString + "    ?zone srm:displayName ?zoneName . ";
        queryString = queryString + "    ?zone srm:containsZoneMember ?zoneMember . ";
        queryString = queryString + "    ?zoneMember srm:displayName ?zoneMemberName . ";
        queryString = queryString + "    ?zoneMember srm:zmemtype ?zmemtype . ";
        queryString = queryString + "    ?zoneMember srm:containsProtocolEndpoint ?connPE . ";
        queryString = queryString + "    ?connPE srm:connectedTo ?connToPE . ";
        queryString = queryString + "    ?connToPE srm:residesOnSwitchPort ?connSWPort . ";
        queryString = queryString + "    ?connSWPort srm:displayName ?connSWPortName . ";
        queryString = queryString + "    ?connToPE srm:residesOnLogicalSwitch ?connSW . ";
        queryString = queryString + "    ?connSW srm:displayName ?connSWName . ";
        queryString = queryString + " } ";

        this.querySparql(queryString, function(result) {
            callback(result);
        })

};


exports.querySparql = function(queryString , callback ) {

        console.log(queryString);
        var config = configger.load(); 

        var req = unirest("POST", config.Backend.TopoServURL );
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        req.headers({ 
          "cache-control": "no-cache",
          "accept": "application/sparql-results+json, application/json",
          "content-type": "application/x-www-form-urlencoded",
          "authorization": "Basic YWRtaW46Y2hhbmdlbWU="
        });

        req.form({
          "query": queryString
        });

        req.end(function (res) {
          if (res.error) callback(res.error);

          var result = convertSparqlResult(res.body);
 

          callback(result);
        });
}


function convertSparqlResult(oriResult) {
    var resultDataSet = [];
    
    if ( oriResult == undefined ) return resultDataSet;
    var heads = oriResult.head.vars;
    var dataset = oriResult.results.bindings;

   for ( var i in dataset) {
        var dataItem = dataset[i];
 
        var resultItem = {};
        heads.forEach(function (head) {   
            if ( dataItem[head] == undefined ) {
                resultItem[head] = '';
            } else {
                resultItem[head] = dataItem[head].value;
            }
            
        })

        resultDataSet.push(resultItem);
    }

    return resultDataSet;
}




function combineEntity( entitysJson ) {

    var  resultJson = [];

     // add a topology group into the entities json.
     resultJson.push({ key: "DC1", text: "数据中心", isGroup: true, category: "datacenter" , color: "lightblue"});
     resultJson.push({ key: "Host1", text: "主机", isGroup: true, group: "DC1", color: "lightblue" });
     resultJson.push({ key: "SwitchGroup", text: "交换机", isGroup: true, group: "DC1", color: "lightgreen" });
     resultJson.push({ key: "VirtualArray1", text: "虚拟存储", isGroup: true, group: "DC1", color: "lightyellow" });
     resultJson.push({ key: "ArrayGroup", text: "物理存储", isGroup: true, group: "DC1", color: "orange" });
 
    for ( var i in entitysJson ) {
        var item = entitysJson[i];
        var key = item.object;  
        var key1 = item.s.replace("http://ontologies.emc.com/2013/08/srm#",'')
                .replace("http://ontologies.emc.com/2015/mnr/topology#",'')
                .replace("http://www.w3.org/1999/02/22-rdf-syntax-ns#",'');
        var value1 = item.o.replace("http://ontologies.emc.com/2013/08/srm#",'');

        if ( key1.indexOf("contains") > -1 ) continue;
        else if ( key1.indexOf("resides") > -1 ) continue;
        else if ( key1 == 'type' ) key1 = 'category';
        else if ( key1 == 'Identifier' ) continue;

        var isFind = false;
        for ( var j in resultJson ) {
            var resItem = resultJson[j];
            if ( resItem.key == item.object ) {
                isFind = true;
                resItem[key1] =  value1;
                break;
            }
        }
        if ( ! isFind ) {
            var itema = {} ;
            itema["key"] = key;
            itema[key1] = value1;
            resultJson.push(itema)
        }

    }


    // addition propertities into the entities json.

    var itemGroups = {};
    for ( var i in resultJson ) {

        var item = resultJson[i]; 

        if ( item.category == "StorageEntity" || item.category == "PhysicalSwitch"  ) { 
            // Device Group By
            var objGroupItem = {isGroup: true, color: "lightgreen" };

            if ( item.category == "StorageEntity" ) {
                item["color"] = "lightyellow"; 
                objGroupItem["group"] = "ArrayGroup";
            } else if ( item.category == "PhysicalSwitch" ) {
                item["color"] = "lightyellow"; 
                objGroupItem["group"] = "SwitchGroup";
            }


            var groupBy = item.vendor;
            if ( groupBy !== undefined  ) { 
                item["group"] = groupBy; 
                objGroupItem["key"] = groupBy;
                objGroupItem["text"] = groupBy;
                itemGroups[groupBy] = objGroupItem;  
            } else {
                groupBy = 'Unknow';
                item["group"] = groupBy; 
                objGroupItem["key"] = groupBy;
                objGroupItem["text"] = groupBy;
                itemGroups[groupBy] = objGroupItem;  
            }

        } 


    }
 

    // Add Item Groups
    for ( var key in itemGroups ) {
        resultJson.push(itemGroups[key]);

    }
              

    return resultJson;

}


exports.combineLinks_level1 = function (toporesult) { 
    var links = toporesult.link;
    var entities = toporesult.entity;

    var linkByGroup = [];
    for ( var i in links ) {
        var item = links[i];

        var itemByGroup = {};
        for ( var j in entities) {
            if ( item.from == entities[j].key ) itemByGroup["from"] = entities[j].group;
            if ( item.to == entities[j].key ) itemByGroup["to"] = entities[j].group;
        }
        linkByGroup.push(itemByGroup);
    }

    // Duplicate item;
    var result = [];
    for ( var i in linkByGroup) {
        var item = linkByGroup[i];
        var isFind = false;

        for ( var j in result ) {
            var resultItem = result[j];

            if ( item.from == resultItem.from && item.to == resultItem.to ) {
                isFind = true;
                break;
            }
        }

        if ( ! isFind ) result.push(item);

    } 
    return result;
}

function getSwitchPorts( callback) { 

    var config = configger.load();
        var keys = ['device','partwwn'];
        var fieldsArray = ['device','model','firmware','partwwn','partid','slotnum','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat'];
        var filter = 'parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
        var fields = fieldsArray.toString(); 
        var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE
        var queryString =  {"filter":filter,"fields":fields};  

            unirest.get(config.Backend.URL + getMethod )
                    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                    .headers({'Content-Type': 'multipart/form-data'}) 
                    .query(queryString) 
                    .end(function (response) { 
                        if ( response.error ) {
                            console.log(response.error);
                            return response.error;
                        } else {  
                            //var resultRecord = RecordFlat(response.body, keys);
                            var swports = JSON.parse(response.body).values; 
                            var toposResult = {};
                            toposResult["swports"]=swports;  
                            callback(null,toposResult);
                        }

               
     
            }); 
 

         
};
  
 
function getArrayPorts(arg1, callback) {
    var config = configger.load();
        var keys = ['device','feport'];
        var fieldsArray = ['device','feport','portwwn','partstat'];
        var filter = 'parttype=\'Port\'';
        var fields = fieldsArray.toString(); 
        var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE
        var queryString =  {"filter":filter,"fields":fields};  
 

            unirest.get(config.Backend.URL + getMethod )
                    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                    .headers({'Content-Type': 'multipart/form-data'}) 
                    .query(queryString) 
                    .end(function (response) { 
                        if ( response.error ) {
                            console.log(response.error);
                            return response.error;
                        } else {  
                            //var resultRecord = RecordFlat(response.body, keys);
                            var arrayports = JSON.parse(response.body).values;  
                            arg1["arrayports"]=arrayports;  
                            console.log(arrayports.length);
                            callback(null,arg1);
                        }

               
     
            }); 
 

};

function getZoning(arg1, callback) {

    var config = configger.load(); 
        var filter = 'parttype=\'ZoneMember\'';
        var fields = 'device,pswwn,zsetname,zname,zmemid,zmemtype';
        var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE
        var queryString =  {"filter":filter,"fields":fields};  
 
 

        var zoneResult = [];
        unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({'Content-Type': 'multipart/form-data'}) 
                .query({'fields': fields , 'filter':  filter }) 
                .end(function (response) {

                    var resultJson = JSON.parse(response.body).values; 
                    for ( var i in resultJson ) {
                        var item = resultJson[i];
                        var zoneItem = {};
                        var zoneMemberItem = {};
                        zoneMemberItem['zmemid'] = item.zmemid;
                        zoneMemberItem['zmemtype'] = item.zmemtype; 


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
                    arg1["Zoning"] = zoneResult;
                    callback(null,arg1);
                
                });

 

};



function matchTopos(arg1, callback ) {
    var swports = arg1.swports;
    var arrayports = arg1.arrayports;
    var Zonings = arg1.Zoning;

    var resultArrayDetail = [];
    var resultZoneDetail = [];
    for ( var i_sw in swports ) {
        var swportItem = swports[i_sw];

        swportItem['Zoning'] = [];
        swportItem['Connecting'] = [];

        if ( swportItem.portwwn.trim() != '' ) {
            var swConnPortWWN = swportItem.portwwn.trim();

            // Relationship with Zoning
                // for new, support "WWN ZONE" only

            for ( var i_zoning in Zonings ) {
                var zoneItem = Zonings[i_zoning]; 

                for ( var i_zonemember in zoneItem.zonemembers) {
                    var zonememberItem = zoneItem.zonemembers[i_zonemember];
                    if ( swConnPortWWN == zonememberItem.zmemid ) {
                        //zonememberItem['swDevice'] = swportItem.device;
                        //zonememberItem['swPortWWN'] = swportItem.partwwn;
                        //console.log(zonememberItem);
                        swportItem.Zoning.push(zoneItem);

                    }
                } 
            }



        }
    }
 
    callback(null,arg1);

}


function matchArrayPorts(arg1, callback ) {
    var swports = arg1.swports;
    var arrayports = arg1.arrayports;
    var Zonings = arg1.Zoning;

    var resultArrayDetail = [];


        // Relationship with Array Port
        for ( var i_array in arrayports ) {

            var arrayportItem = arrayports[i_array];
            var arrayPortWWN = arrayportItem.portwwn.trim();

            
            var resultDetailItem = {};
            resultDetailItem["array_portwwn"] =  arrayPortWWN ;
            resultDetailItem["array_port"] =  arrayportItem.feport ;
            resultDetailItem["array"] =  arrayportItem.device ;


            var arrayPortFind = false;

            for ( var i_sw in swports ) {
                var swportItem = swports[i_sw];
                var swConnPortWWN = swportItem.portwwn.trim(); 

                    if ( swConnPortWWN == arrayPortWWN ) {
                        arrayPortFind = true;
                        resultDetailItem["switch"] =  swportItem.device ;
                        resultDetailItem["switch_model"] =  swportItem.model ;
                        resultDetailItem["switch_firmware"] =  swportItem.firmware ;
                        resultDetailItem["switch_portwwn"] =  swportItem.partwwn ;
                        resultDetailItem["switch_port"] =  swportItem.part ;
                        resultDetailItem["switch_porttype"] =  swportItem.porttype ;
                        resultDetailItem["switch_maxspeed"] =  swportItem.maxspeed ;
                        resultDetailItem["switch_portstat"] =  swportItem.partstat ;

                        //console.log(swportItem.device + '\t|' + swportItem.part + '\t|' +swportItem.partwwn + '\t|' + swportItem.portwwn+ '\t|' + arrayportItem.device + '\t|' + arrayportItem.feport + '\t|' + arrayPortWWN);
                        resultArrayDetail.push(resultDetailItem);

                    }
            };
            if ( ! arrayPortFind ) {
                resultArrayDetail.push(resultDetailItem);
            }

        }

    arg1["resultArrayDetail"] = resultArrayDetail; 
    callback(null,arg1);

  
}
  
