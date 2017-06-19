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
var getTopos = require('../lib/topos'); 
var async = require('async'); 

var mongoose = require('mongoose');
var SwitchObj = mongoose.model('Switch');
var SWITCH = require('../lib/Switch');
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
  


        var deviceid = req.query.device;



	if ( config.ProductType == 'demo' ) {
                res.json(200,demo_switchs);
                return;
        } ;


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
                        var switchsn = item.device;
                        console.log("Begin get switch info : " + switchsn);
                        for ( var j in result ) {
                            var infoItem = result[j]; 
                            if ( infoItem.basicInfo.device == switchsn ) { 
                                var unitID = infoItem.basicInfo.UnitID; 
                                for ( var z in locations ) { 
                                    if ( unitID == locations[z].UnitID ) {
                                        console.log(locations[z].Location);
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
            
            if (typeof deviceid !== 'undefined') { 
                res.json(200, result.result[0]); 
            } else {
                res.json(200, result.result); 
            } 

        });

         
    });



    app.get('/api/switch', function (req, res) {
  


        var deviceid = req.query.device;

        console.log(config.ProductType);
        if ( config.ProductType == 'demo' ) {
            console.log("aaaaaaaaaaa");
            if ( deviceid === undefined ) {
                res.json(400, 'Must be special a device!');
                return;
            } else { 
                 console.log("ssssssssssssssssss");
                for ( var i in demo_switchs ) {
                    var item = demo_switchs[i];
                    if ( item.device ==  deviceid  )  {
                        res.json(200,item); 
                        return;

                    }
                }
                res.json(200,{});
                return;           
            } 
        }  


        var param = {};
        param['filter_name'] = 'name=\'Availability\'';
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
                        console.log("Begin get switch info : " + switchsn);
                        for ( var j in result ) {
                            var infoItem = result[j]; 
                            if ( infoItem.basicInfo.device == switchsn ) { 
                                var unitID = infoItem.basicInfo.UnitID; 
                                for ( var z in locations ) { 
                                    if ( unitID == locations[z].UnitID ) {
                                        console.log(locations[z].Location);
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

                    console.log(response.body);
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

	
        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_fabric_zone);
                return;
        } ;


        
        if ( typeof fabwwn === 'undefined' ) {
            res.json(200, 'Must be special fabwwn!');
            return;
        } else {
            var fields = 'device,zsetname,zname,zmemid,zmemtype';
            var filter = 'pswwn=\''+fabwwn+'\'&parttype=\'ZoneMember\'';

        }
   

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

                    console.log('The number of Zones = ' + zoneResult.length);
                    res.json(200, zoneResult);
                
                });


         
    });



/* 
*  Create a Switch record 
*/
    app.post('/api/switch', function (req, res) {
        console.log(req.body);

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
        param['filter_name'] = 'name=\'Availability\'';
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
                        console.log("Begin get switch info : " + switchsn);
                        for ( var j in result ) {
                            var infoItem = result[j]; 
                            if ( infoItem.basicInfo.device == switchsn ) { 
                                var unitID = infoItem.basicInfo.UnitID; 
                                for ( var z in locations ) { 
                                    if ( unitID == locations[z].UnitID ) {
                                        console.log(locations[z].Location);
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
            console.log(returnData);
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
  


        var deviceid = req.query.device;
        
    
        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_switch_ports);
                return;
        } ;



        if ( typeof deviceid === 'undefined' ) {
            res.json(400, 'Must be special a deviceid!');
            return;
        }  
 
        SWITCH.GetSwitchPorts(deviceid, function(result) { 
            res.json( 200 , result );
        });

         
    });



};

module.exports = switchController;
