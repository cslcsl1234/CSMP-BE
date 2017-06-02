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

var mongoose = require('mongoose');
var SwitchObj = mongoose.model('Switch');

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

        CallGet.CallGet(param, function(param) { 
            res.json(200, param.result);
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

        CallGet.CallGet(param, function(param) { 
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
        });

         
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

        var param = {};
        param['filter_name'] = '(name=\'InCrcs\'|name=\'LinkFailures\'|name=\'SigLosses\'|name=\'SyncLosses\'|name=\'CreditLost\'|name=\'Availability\'|name=\'ifInOctets\'|name=\'ifOutOctets\')';
        param['keys'] = ['device','partwwn'];
        param['fields'] = ['partid','slotnum','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat'];
        param['filter'] = 'device=\''+deviceid+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';


        CallGet.CallGet(param, function(param) { 
            res.json(200, param.result);
        });

         
    });

 
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





};

module.exports = switchController;
