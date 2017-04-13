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
var getTopos = require('./topos'); 

var mongoose = require('mongoose');
var SwitchObj = mongoose.model('Switch');


var switchController = function (app) {

    var config = configger.load();


 
    app.get('/api/switchs', function (req, res) {
  


        var deviceid = req.query.device;

        var param = {};
        param['filter_name'] = 'name=\'Availability\'';
        param['keys'] = ['device'];
        param['fields'] = ['vendor','model','ip','devdesc'];

        if (typeof deviceid !== 'undefined') { 
            param['filter'] = 'device=\''+deviceid+'\'&devtype==\'FabricSwitch\'&!(parttype==\'Fabric\'|parttype=\'Zone%\')&!datagrp=\'%ZONE%\'';
        } else {
            param['filter'] = 'devtype==\'FabricSwitch\'&!parttype';
        } 

        CallGet(param, function(param) { 
            res.json(200, param.result);
        });

         
    });


    app.get('/api/switch/ports', function (req, res) {
  


        var deviceid = req.query.device;
        
        if ( typeof deviceid === 'undefined' ) {
            res.json(400, 'Must be special a deviceid!');
            return;
        }  

        var param = {};
        param['filter_name'] = '(name=\'InCrcs\'|name=\'LinkFailures\'|name=\'SigLosses\'|name=\'SyncLosses\'|name=\'CreditLost\'|name=\'Availability\'|name=\'ifInOctets\'|name=\'ifOutOctets\')';
        param['keys'] = ['device','partwwn'];
        param['fields'] = ['partid','slotnum','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat'];
        param['filter'] = 'device=\''+deviceid+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';


        CallGet(param, function(param) { 
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
 
    app.get('/api/fabric/zone', function (req, res) {
  
        //var fields = 'device,deviceid,vendor,model,ip,devdesc,devicesn,domainid,firmware,psname,pswwn,bootdate';
 
        var fabwwn = req.query.fabwwn;
        
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

        SwitchObj.findOne({"basicInfo.serialnb" : reqBody.basicInfo.serialnb}, function (err, doc) {
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
                console.log("App is exist!");
 
                doc.update(reqBody, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(500 , {status: "The App has exist! Update it."});
            }

        });



    });





};

module.exports = switchController;
