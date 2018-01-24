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
var util = require('../lib/util');
var CallGet = require('../lib/CallGet'); 
var getTopos = require('../lib/topos'); 
var async = require('async'); 

var mongoose = require('mongoose');
var SwitchObj = mongoose.model('Switch');
var SWITCH = require('../lib/Switch');
var VMAX=require('../lib/Array_VMAX');
var HOST=require('../lib/Host');

// -----------------------------------
// For demo data
// ----------------------------------
var demo_switchs = require('../demodata/switchs');
var demo_switch_ports = require('../demodata/switch_ports');
var demo_fabrics = require('../demodata/fabrics');
var demo_fabric_zone = require('../demodata/fabric_zone');


var switchController = function (app) {

    var config = configger.load();


 
    app.get('/api/switchs', function (req, res) {
  
        var datacenter = req.query.datacenter;
        var deviceid = req.query.device;
 
        var param = {};
        param['filter_name'] = 'name=\'Availability\'';
        param['keys'] = ['device'];
        param['fields'] = ['devicesn','vendor','model','ip','devdesc'];

        if (typeof deviceid !== 'undefined') { 
            param['filter'] = 'device=\''+deviceid+'\'&devtype==\'FabricSwitch\'&!(parttype==\'Fabric\'|parttype=\'Zone%\')&!datagrp=\'%ZONE%\'';
        } else {
            param['filter'] = 'devtype==\'FabricSwitch\'&!parttype';
        } 


        async.waterfall([
            function(callback){  
                    CallGet.CallGet(param, function(param) { 
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
            // get customize info
            function(param,  callback){ 

                var locations = param.Locations;
                GetSwitchInfo(function(result) {

                   for ( var i in param.result ) {      
                        var item = param.result[i];
                        item['info'] = {}; 
                        item['localtion'] = "";
                        item['datacenter'] = "undefine";                        
                        var switchsn = item.device;
                        //console.log("Begin get switch info : " + switchsn);
                        for ( var j in result ) {
                            var infoItem = result[j]; 
                            if ( infoItem.basicInfo.device == switchsn ) { 
                                var unitID = infoItem.basicInfo.UnitID; 
                                for ( var z in locations ) { 
                                    if ( unitID == locations[z].UnitID ) {
                                        //console.log(locations[z].Location);
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

            // get customize info
            function(param,  callback){ 

                var fields = 'part,psname,pswwn,device,deviceid,fabwwn,lswwn,lsname';
                var filter = 'parttype==\'Fabric\'|parttype==\'VSAN\'';

                var fabricResult = [];
                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query({'fields': fields , 'filter':  filter }) 
                        .end(function (response) {

                            //console.log(response.body);
                            var resultJson = JSON.parse(response.body).values; 
                            for ( var i in param.result ) {
                                var swItem = param.result[i];
                                //console.log(swItem);
                                var isfind = false;
                                for ( var j in resultJson ) {
                                    var item = resultJson[j];
                                    if ( swItem.device == item.device ) {
                                        swItem['lsname'] = item.lsname;
                                        isfind = true;
                                    }
                                }
                                if ( !isfind ) {
                                    swItem['lsname'] = swItem.device;
                                }
                            }

                            callback(null,param);

                        });


            }              

         ], function (err, result) {
           // result now equals 'done'
            
            if (typeof deviceid !== 'undefined') { 
                res.json(200, result.result[0]); 
            } else {
                var ret = [];
                if ( datacenter !== undefined ) {
                    for ( var i in result.result) {
                        var item = result.result[i];
                        if ( item.datacenter == datacenter ) {
                            ret.push(item);
                        }
                    }
                } else {
                    ret = result.result;
                }
                res.json(200, ret ); 
            } 

        });

         
    });



    app.get('/api/switch', function (req, res) {
  


        var deviceid = req.query.device;



        var param = {};
        //param['filter_name'] = 'name=\'Availability\'';
        param['keys'] = ['device'];
        param['fields'] = ['devicesn','vendor','model','ip','devdesc'];

        if (typeof deviceid !== 'undefined') { 
            param['filter'] = 'device=\''+deviceid+'\'&devtype==\'FabricSwitch\'&!(parttype==\'Fabric\'|parttype=\'Zone%\')&!datagrp=\'%ZONE%\'';
        } else {
            res.json(400, 'Must be special a device!');
        } 



        async.waterfall([
            function(callback){ 


                    CallGet.CallGet(param, function(param) { 

                        callback(null,param);
                        /*
                        console.log(deviceid);
                		SwitchObj.findOne({"basicInfo.device" : deviceid}, function (err, doc) {
                		    //system error.
                		    if (err) {
                			return   done(err);
                		    }

                		    if ( param.result.length > 0 ) {
                			    if (!doc) { //user doesn't exist.
                    				console.log("app is not exist. insert it."); 
                    				var initRecord = {
                                            "ability": {
                                                "maxSlot": "",
                                                "maxPorts": ""
                                            },
                                            "assets": {
                                                "no": "",
                                                "department": "",
                                                "purpose": "",
                                                "manager": ""
                                            },
                                            "maintenance": {
                                                "purchaseDate": "",
                                                "contact": "",
                                                "period": "",
                                                "vendor": ""
                                            },
                                            "basicInfo": {
                                                "device": "",
                                                "alias": "",
                                                "UnitID": ""
                                            }
                                        }; 

                                    initRecord.basicInfo.device = deviceid;

                                    var newswitch = new SwitchObj(initRecord);
                                    newswitch.save(function(err, thor) {
                                      if (err)  {

                                        console.dir(thor);
                                        return res.json(400 , err);
                                      } else 
                                        return res.json(200, {status: "The Switch insert is succeeds!"});
                                    });                        

                                    param.result[0]['info'] = initRecord;

                                }
                			    else {
                				console.log("App is exist!");
                				console.log(doc);
                		 
                				param.result[0]['info'] = doc;

                			    }
                            		res.json(200, param.result[0]);
                		    }
                		    else 
                			res.json(200, {} );

                		});
                        */
                    });
            }, 
            // Get All Localtion Records
            function(param,  callback){  

                util.GetLocaltion(function(locations) { 
                    param['Locations']= locations;
                    callback(null,param);
                                                                 
                }); 
                    

            },
            // get customize info
            function(param,  callback){ 

                var locations = param.Locations;
                GetSwitchInfo(function(result) {

                   for ( var i in param.result ) {      
                        var item = param.result[i];
                        item['info'] = {}; 
                        var switchsn = item.device;
                        //console.log("Begin get switch info : " + switchsn);
                        for ( var j in result ) {
                            var infoItem = result[j]; 
                            if ( infoItem.basicInfo.device == switchsn ) { 
                                var unitID = infoItem.basicInfo.UnitID; 
                                for ( var z in locations ) { 
                                    if ( unitID == locations[z].UnitID ) {
                                        //console.log(locations[z].Location);
                                        item['localtion'] = locations[z].Location;
                                        break;
                                    }
                                }
                                item['info'] = infoItem; 
                            }
                        } 
                    }


                 callback(null,param);
    
             });

            } 

         ], function (err, result) {
           // result now equals 'done'
           res.json(200, result.result); 
        });


    });

function GetSwitchInfo(callback) {

        SwitchObj.find({}, { "__v": 0, "_id": 0 },  function (err, doc) {
        //system error.
        if (err) {
            return   done(err);
        }
        if (!doc) { //user doesn't exist.
            console.log("switch info record is not exist."); 

            callback(null,[]); 
        
        }
        else {
            console.log("Switch is exist!");
            callback(doc); 

        }
        
    });
}



 
    app.get('/api/topos', function (req, res) {
  
 

        getTopos(function(result) { 
            res.json(200, result);
        });

         
    });
 
 
    app.get('/api/fabrics', function (req, res) {
  
        //var fields = 'device,deviceid,vendor,model,ip,devdesc,devicesn,domainid,firmware,psname,pswwn,bootdate';
 
        var deviceid = req.query.deviceid;

	
        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_fabrics);
                return;
        } ;


        
        if ( typeof deviceid === 'undefined' ) {
            var fields = 'part,psname,pswwn,device,deviceid,fabwwn,lswwn,lsname';
            var filter = 'parttype==\'Fabric\'|parttype==\'VSAN\'';
           
        } else {
            var fields = 'device,deviceid,vendor,model,ip,devdesc,devicesn,firmware,psname,pswwn';
            var filter = 'deviceid=\''+deviceid+'\'&devtype=\'FabricSwitch\'';

        }
   

        var fabricResult = [];
        unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({'Content-Type': 'multipart/form-data'}) 
                .query({'fields': fields , 'filter':  filter }) 
                .end(function (response) {

                    //console.log(response.body);
                    var resultJson = JSON.parse(response.body).values; 

                    for ( var i in resultJson ) {
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

                        if ( fabricResult.length == 0 ) {
                            fabricResult.push(fabricItem);
                        } else {
                            var isFind = false;
                            for ( var j in fabricResult) {
                                var item1 = fabricResult[j];
                                if ( item1.fabwwn == item.fabwwn ) {
                                    item1.switchs.push(switchItem);
                                    isFind = true;
                                }
                            }
                            if ( ! isFind ) {
                                fabricResult.push(fabricItem);
                            }
                        }

                    }
                     
                    console.log('The number of Fabrics = ' + fabricResult.length);
                    res.json(200, fabricResult);
                
                });


         
    });

    app.get('/api/fabric/zone1', function (req, res) {
  
        var fabwwn = req.query.fabwwn;

        getTopos.getZoneMemberRelation(function(result) {
            res.json(200,result);
        })
         

    });


    app.get('/api/fabric/zone', function (req, res) {
  
        //var fields = 'device,deviceid,vendor,model,ip,devdesc,devicesn,domainid,firmware,psname,pswwn,bootdate';
 
        var fabwwn = req.query.fabwwn;

        async.waterfall(
        [
    
            function(callback){
                var deviceid;
                SWITCH.GetSwitchPorts(deviceid, function(result) {  
                    callback(null,result); 
                });
                  
            },

            // Get All Localtion Records
            function(param,  callback){ 
                var zoneResult = [];
                SWITCH.getFabric(fabwwn,function(resultJson) {
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
                            if ( swport.connectedToWWN == item.zmemid ) {
                                zoneMemberItem['switch'] = swport.device;
                                zoneMemberItem['switchport'] = swport.part; 
                                break;  
                            }
                        }


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
                var fields = 'part,psname,device,lsname';
                if ( fabwwn !== undefined )
                    var filter = 'pswwn=\''+fabwwn+'\'&parttype==\'Fabric\'|parttype==\'VSAN\'';
                else 
                    var filter = 'parttype==\'Fabric\'|parttype==\'VSAN\'';
                
                
                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query({'fields': fields , 'filter':  filter }) 
                        .end(function (response) {

                            var resultJson = JSON.parse(response.body).values; 
 
                            for ( var i in zoneResult ) {
                                var item = zoneResult[i];
                                item["fabricname"] = resultJson[0].psname;

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

                                    if ( item.zmemid == aliasItem.zmemid ) {
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
            }
        ], function (err, result) {
              // result now equals 'done'
              res.json(200, result);
        });
         
    });



/* 
*  Create a Switch record 
*/
    app.post('/api/switch', function (req, res) {
 
        var reqBody = req.body;

        SwitchObj.findOne({"basicInfo.device" : reqBody.basicInfo.device}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("app is not exist. insert it."); 

                var newapp = new SwitchObj(reqBody);
                console.log('Test1');
                newapp.save(function(err, thor) {
                 console.log('Test2');
                 if (err)  {
                    console.dir(thor);
                    return res.json(400 , err);
                  } else 
                    return res.json(200, reqBody);
                });
            }
            else { 
 
                doc.update(reqBody, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(200 , {status: "The Switch has exist! Update it."});
            }

        });


    });


   app.get('/api/switchinfo', function (req, res) { 
    var device = req.query.device;
 
        if ( device === undefined ) {
            res.json(401, 'Must be special a device!')
            return;
        }

        var param = {};
        //param['filter_name'] = 'name=\'Availability\'';
        param['keys'] = ['device'];
        param['fields'] = ['devicesn','vendor','model','ip','devdesc']; 
        param['filter'] = 'device=\''+device+'\'&devtype==\'FabricSwitch\'&!(parttype==\'Fabric\'|parttype=\'Zone%\')&!datagrp=\'%ZONE%\'';



        async.waterfall([
            function(callback){ 
                CallGet.CallGet(param, function(param) { 

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
            // get customize info
            function(param,  callback){ 

                var locations = param.Locations;
                GetSwitchInfo(function(result) {

                   for ( var i in param.result ) {      
                        var item = param.result[i];
                        item['info'] = {}; 
                        var switchsn = item.device;
                        //console.log("Begin get switch info : " + switchsn);
                        for ( var j in result ) {
                            var infoItem = result[j]; 
                            if ( infoItem.basicInfo.device == switchsn ) { 
                                var unitID = infoItem.basicInfo.UnitID; 
                                for ( var z in locations ) { 
                                    if ( unitID == locations[z].UnitID ) {
                                        //console.log(locations[z].Location);
                                        item['localtion'] = locations[z].Location;
                                        break;
                                    }
                                }
                                item['info'] = infoItem; 
                            }
                        } 
                    }


                 callback(null,param);
    
             });

            } 

         ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result.result); 
            var returnData = result.result[0] ;
            //console.log(returnData);
            var finalResult = []; 
            var item = {};
            // Combine the UI element for VMAX Basic Info page.

            // -------------- Block1 ---------------------------
            var UI_Block1 = {} ;
            UI_Block1['title'] = "交换机管理信息";
            UI_Block1['detail'] = [];

            item={};
            item["name"] = "交换机名称"; 
            item["value"] = returnData.device;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "交换机序列号"; 
            item["value"] = returnData.devicesn;
            UI_Block1.detail.push(item);
 
            item={};
            item["name"] = "厂商"; 
            item["value"] = returnData.vendor;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "型号"; 
            item["value"] = returnData.model;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "管理IP"; 
            item["value"] = returnData.ip;
            UI_Block1.detail.push(item);



            // -------------- Block1 ---------------------------
 
            var UI_Block2 = {} ;
            UI_Block2['title'] = "资产信息";
            UI_Block2['detail'] = [];

            if ( returnData.info !== undefined  ) {
 
                if ( returnData.info.asset !== undefined ) {
 
                    item={};
                    item["name"] = "资产编号"; 
                    item["value"] = returnData.info.assets.no;
                    UI_Block2.detail.push(item);

                    item={};
                    item["name"] = "用途"; 
                    item["value"] = returnData.info.assets.purpose;
                    UI_Block2.detail.push(item);

                    item={};
                    item["name"] = "管理员"; 
                    item["value"] = returnData.info.assets.manager;
                    UI_Block2.detail.push(item);


                    // -------------- Block3 ---------------------------
         
                    var UI_Block3 = {} ;
                    UI_Block3['title'] = "维保信息";
                    UI_Block3['detail'] = [];

                    item={};
                    item["name"] = "上线时间"; 
                    item["value"] = returnData.info.maintenance.purchaseDate;
                    UI_Block3.detail.push(item);

                    item={};
                    item["name"] = "维保厂商"; 
                    item["value"] = returnData.info.maintenance.vendor;
                    UI_Block3.detail.push(item);

                    item={};
                    item["name"] = "维保年限"; 
                    item["value"] = returnData.info.maintenance.period;
                    UI_Block3.detail.push(item);

                    item={};
                    item["name"] = "维保联系人"; 
                    item["value"] = returnData.info.maintenance.contact;
                    UI_Block3.detail.push(item);

                    // -------------- Finally combine the final result record -----------------
                    finalResult.push(UI_Block2);
                    finalResult.push(UI_Block3);
                }
            }


            finalResult.push(UI_Block1);

            res.json(200,finalResult);
        }) 
    });


    app.get('/api/switch/ports', function (req, res) {

        var device = req.query.device;
        var isPortStatics = req.query.isPortStatics;

        async.waterfall([
            function(callback){ 

            SWITCH.GetSwitchPorts(device, function(result) { 
                callback(null,result);
            }); 
        }, 
        function(arg1, callback){ 

            if ( isPortStatics === undefined ) 
                callback(null,arg1);
            else if ( isPortStatics != 'true' ) 
                callback(null,arg1);
            else {
                                 
                SWITCH.GetSwitchPortsStatics(device, function(result) {  

                        for ( var i in arg1 ) {
                            var portItem = arg1[i];  

                            for ( var j in result ) {
                                var item = result[j];
                                if ( item.device == portItem.device && item.partwwn == portItem.partwwn ) {
                                    for ( var key in item ) {

                                        switch ( key ) {
                                            case 'device' :
                                            case 'name' :
                                            case 'partwwn' :
                                            case 'porttype' :
                                                break;
                                            default : 
                                                portItem[key] = item[key];
                                                break;
                                        }

                                    }
                                }
                            }

                        }            
                        callback(null,arg1);
                });
            }
 
            
        },
        function(arg1, callback){ 
            var host;
            HOST.GetHBAFlatRecord(host, function(hosts) {
                for ( var i in arg1 ) {
                    var portItem = arg1[i];
                    portItem["hostname"] = portItem.connectedToAlias;  // default equal the port alias name;

                    for ( var j in hosts ) {
                        var hostItem = hosts[j];
                        if ( portItem.portwwn == hostItem.hba_wwn ) {
                            portItem["hostname"] = hostItem.hostname;
                            portItem["hostip"] = hostItem.managementip;
                            portItem["connectedToDeviceType"] = 'Host';
                            portItem["connectedToDevice"] = hostItem.hostname;
                            portItem["connectedToPart"] = hostItem.hba_name; 
                           break;
                        }
                    }
                }
                callback(null,arg1); 
            })  
        }, 

        function(arg1, callback){ 
                var param = {};
                //param['filter_name'] = '(name=\'Availability\')';
                param['keys'] = ['serialnb','feport'];
                param['fields'] = ['portwwn','porttype'];
                //param['period'] = 3600;
                //param['valuetype'] = 'MAX'; 
                param['filter'] = '(datagrp=\'VMAX-PORTS\'&source=\'VMAX-Collector\'&partgrp=\'Front-End\')|(source=\'VNXBlock-Collector\'&parttype==\'Port\')';

                CallGet.CallGet(param, function(param) {
 
                    for ( var i in arg1 ) {
                        var item1 = arg1[i]; 

                        for ( var j in param.result ) {
                            var FEPortItem = param.result[j];
                            
                            if ( item1.connectedToWWN == FEPortItem.portwwn ) {
                                item1["connectedToDeviceType"] = 'Array';
                                item1["connectedToDevice"] = FEPortItem.serialnb;
                                item1["connectedToPart"] = FEPortItem.feport;
                                break;
                            }
                        }
                    } 
                    callback( null, arg1 ); 
                }); 

                
        }
            ], function (err, result) {
                   // result now equals 'done'  
                  res.json(200, result);
            });
 
         
    });

   app.get('/api/switch/port_detail', function (req, res) { 
        var device = req.query.device;

        if ( device === undefined ) {
            res.json(400, 'Must be special a device!')
            return;
        }

        async.waterfall([
            function(callback){ 

                SWITCH.GetSwitchPorts(device, function(result) { 
                    callback(null,result);
                }); 


            }, 

            function(arg1, callback){ 
                var host;
                HOST.GetHBAFlatRecord(host, function(hosts) {
                    for ( var i in arg1 ) {
                        var portItem = arg1[i];
                        portItem["hostname"] = portItem.connectedToAlias;  // default equal the port alias name;

                        for ( var j in hosts ) {
                            var hostItem = hosts[j];
                            if ( portItem.portwwn == hostItem.hba_wwn ) {
                                portItem["hostname"] = hostItem.hostname;
                                break;
                            }
                        }

                    }

                    callback(null,arg1); 
                })

                    
            },         
            function(arg1,  callback){  


                    var data = arg1;


                    var finalResult = {};

                    // ----- the part of perf datetime --------------
                    finalResult["startDate"] = util.getPerfStartTime();
                    finalResult["endDate"] = util.getPerfEndTime();          



                    

                    // ----- the part of chart --------------

                    var groupby = "partstat"; 
                    var chartData = [];
                    for ( var i in data ) {
                        var item = data[i];

                        var groupbyValue = item[groupby];  

                        var isFind = false;
                        for ( var j in chartData ) {
                            var charItem = chartData[j];
                            if ( charItem.name == groupbyValue ) {
                                charItem.value = charItem.value + 1;
                                isFind = true;
                            }
                        }
                        if ( !isFind ) {
                            var charItem = {};
                            charItem["name"] = groupbyValue;
                            charItem["value"] = 1;
                            chartData.push(charItem);
                        }



                    }


                    finalResult["chartType"] = "pie";
                    finalResult["chartData"] = chartData;          

                    // ---------- the part of table ---------------
                    var tableHeader = [];
                    var tableHeaderItem = {};
                    tableHeaderItem["name"] = "端口序号";
                    tableHeaderItem["value"] = "partid";
                    tableHeaderItem["sort"] = true;
                    tableHeader.push(tableHeaderItem);

                    var tableHeaderItem = {};
                    tableHeaderItem["name"] = "端口名称";
                    tableHeaderItem["value"] = "part";
                    tableHeaderItem["sort"] = true;
                    tableHeader.push(tableHeaderItem);

                    var tableHeaderItem = {};
                    tableHeaderItem["name"] = "类型";
                    tableHeaderItem["value"] = "porttype";
                    tableHeaderItem["sort"] = true;
                    tableHeader.push(tableHeaderItem);

                    var tableHeaderItem = {};
                    tableHeaderItem["name"] = "最大速度";
                    tableHeaderItem["value"] = "maxspeed";
                    tableHeaderItem["sort"] = true;
                    tableHeader.push(tableHeaderItem);
     
                    var tableHeaderItem = {};
                    tableHeaderItem["name"] = "状态";
                    tableHeaderItem["value"] = "partstat";
                    tableHeaderItem["sort"] = true;
                    tableHeader.push(tableHeaderItem);

      
                    var tableHeaderItem = {};
                    tableHeaderItem["name"] = "连接WWN";
                    tableHeaderItem["value"] = "connectedToWWN";
                    tableHeaderItem["sort"] = true;
                    tableHeader.push(tableHeaderItem);

      
                    var tableHeaderItem = {};
                    tableHeaderItem["name"] = "连接设备名称";
                    tableHeaderItem["value"] = "hostname";
                    tableHeaderItem["sort"] = true;
                    tableHeader.push(tableHeaderItem);

                    

                    // ---------- the part of table event ---------------
                    var tableEvent = {}; 
                    var tableEventParam = [];
                    var tableEventParamItem = {};
                    tableEventParamItem["findName"] = 'partwwn';
                    tableEventParamItem["postName"] = 'portwwn';
                    tableEventParam.push(tableEventParamItem);


                    var tableEventParamItem = {};
                    tableEventParamItem["findName"] = 'device';
                    tableEventParamItem["postName"] = 'device';
                    tableEventParam.push(tableEventParamItem);


                    tableEvent["event"] = "appendArea";
                    tableEvent["param"] = tableEventParam;
                    tableEvent["url"] = "/switch/port_detail/perf";  


                    finalResult["tableHead"] = tableHeader;
                    finalResult["tableEvent"] = tableEvent;
                    finalResult["tableBody"] = data;

                    callback(null,finalResult); 

                }
            ], function (err, result) {
                   // result now equals 'done'  
                  res.json(200, result);
            });
 
    });



 

     app.get('/api/switch/port_detail/perf', function ( req, res )  {
        var device = req.query.device;  
        var portwwn = req.query.portwwn;  
        var start = req.query.startDate;
        var end = req.query.endDate;
        SWITCH.getSwitchPortPerformance1(device,portwwn,start, end , function(result) {   
         
            //var result1 = VMAX.convertPerformanceStruct(result);
            res.json(200,result);
          });
        

    } ) ;



    app.get('/api/switch/alias', function (req, res) {
 

         async.waterfall(
        [
            function(callback){
                var wwnlist1 ;       
                SWITCH.getAlias(wwnlist1,function(result) {

                    var wwnlist = []; 
                    for ( var i in result ) {
                        var item = result[i];

                        var isfind = false;
                        for ( var j in wwnlist ) {
                            var wwnitem = wwnlist[j];

                            if ( item.zmemid == wwnitem.HBAWWN ) {
                                isfind = true;
                                if ( wwnitem.ALIAS.indexOf(item.alias) < 0 )
                                    wwnitem['ALIAS'] = wwnitem.ALIAS + ',' + item.alias;
                            }
                        }

                        if ( !isfind ) {
                            var wwnitem = {};
                            wwnitem['HBAWWN'] = item.zmemid;
                            wwnitem['ALIAS'] = item.alias;
                            wwnlist.push(wwnitem);
                        }
                    }
                    callback(null,wwnlist);
                });
            },
            // Get All Localtion Records
            function(wwnlist,  callback){ 

                var param = {};
                if (typeof device !== 'undefined') {  
                    param['filter'] = 'device=\''+device+'\'&!vstatus==\'inactive\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
                } else {
                    param['filter'] = '!vstatus==\'inactive\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
                }

                //param['filter_name'] = '(name=\'InCrcs\'|name=\'LinkFailures\'|name=\'SigLosses\'|name=\'SyncLosses\'|name=\'CreditLost\'|name=\'Availability\'|name=\'ifInOctets\'|name=\'ifOutOctets\')';
                param['keys'] = ['device','partwwn'];
                //param['fields'] = ['partid','slotnum','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat'];
                param['fields'] = ['partid','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat','lswwn'];
                
                CallGet.CallGet(param, function(param) { 
                    var noFindPort = [];
                    for ( var i in wwnlist ) {
                         var aliasItem = wwnlist[i];
                         aliasItem["connectTo"] = [];

                         var isfind = false;
                         for ( var j in param.result ) {
                             var portItem = param.result[j];
                             if ( aliasItem.HBAWWN == portItem.portwwn ) {
                                aliasItem.connectTo.push(portItem);   
                                isfind = true;

                             }

                         }

                    }

 
                     for ( var j in param.result ) {
                         var portItem = param.result[j];
                         var isfind = false;
                         for ( var i in wwnlist ) {
                             var aliasItem = wwnlist[i];                        
                             if ( aliasItem.HBAWWN == portItem.portwwn ) {
                                isfind = true;
                                break;
                             }
                        }
                        if ( isfind == false ) {
                            if (   ( portItem.partstat.indexOf("Offline") <0 ) &&
                                   ( portItem.porttype != 'E-Port')
                                ) {
                                    var item = {};
                                    item["HBAWWN"] = portItem.portwwn;
                                    item["ALIAS"] = "n/a";
                                    item["connectTo"] = [];
                                    item.connectTo.push(portItem);
                                    wwnlist.push(item);
                                }
                        }
                     }


                    //callback(null, param.result ); 
                    callback(null,wwnlist);
                });

                 
            },
            function(param,  callback){ 
                  callback(null,param);
            }
        ], function (err, result) {
              res.json(200, result);
        }
        );

    });



     app.get('/api/switch/test', function ( req, res )  {
        var device = req.query.device; 
        var portwwn = '20D60027F871F600';
        //SWITCH.getSwitchPortPerformance1(device,portwwn,function(result) {   
        //SWITCH.getFabric(device,function(result) {   
        SWITCH.GetSwitchPorts(device,function(result) {
            //var result1 = VMAX.convertPerformanceStruct(result);
            res.json(200,result);
          });
        

    } ) ;




};

module.exports = switchController;
