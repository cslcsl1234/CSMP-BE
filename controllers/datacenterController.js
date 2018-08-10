"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('datacenterController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger'); 
var mongoose = require('mongoose');
var DatacenterObj = mongoose.model('Datacenter');
var deviceMgmt = require('../lib/DeviceManagement');
var MgmtObjectInfoObject = mongoose.model('MgmtObjectInfo');


var datacenterController = function (app) {

    var config = configger.load();

    app.all('*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
        res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
        res.header('Access-Control-Expose-Headers', '*');

        debug('req.method = %s', req.method);     
        debug('req.url = %s', req.url); 

        if(req.method=="OPTIONS") res.send(200);  /*让options请求快速返回*/
        else  next();
    });



    app.get('/api/matadata/datacenter', function (req, res) {

        var datacenter_name = req.query.datacenter; 
        if ( datacenter_name === undefined ) {
            var query = DatacenterObj.find({}).select({ "__v": 0, "_id": 0});
        } else {
           var query = DatacenterObj.find({Name: datacenter_name}).select({ "__v": 0, "_id": 0}); 
        }

        query.exec(function (err, doc) {
            //system error.
            if (err) { 
                res.json(500 , {status: err})
            }
            if (!doc) { //user doesn't exist.
                res.json(500 , []); 
            }
            else {
 
                res.json(200 , doc);
            }

        });

    });


/* 
*  Create a datacenter record 
*/
    app.post('/api/matadata/datacenter', function (req, res) { 

        var datacenter = req.body; 
        console.log(datacenter);
        var DCName = datacenter.Name; 

        DatacenterObj.findOne({"Name" : DCName}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("datacenter item is not exist. insert it."); 

                var newDC = new DatacenterObj(datacenter); 
                newDC.save(function(err, thor) { 
                 if (err)  {
                    console.dir(thor);
                    return res.json(400 , err);
                  } else 
                    return res.json(200, {status: "The datacenter has inserted."});
                });
            }
            else {
                console.log("the datacenter is exist!");
 

                doc.update(datacenter, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(200 , {status: "The datacenter has exist! Update it."});
            }

        });



    });



/* 
*  Delete a menu record 
*/
    app.post('/api/menu1/del', function (req, res) {
        console.log(req.body);

        var menu = req.body;
        var conditions = {menuId: menu.menuId};
        MenuObj.remove(conditions, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            else {
                console.log("the menu is remove !"); 
                return  res.json(200 , {status: "The menu has removed!"});
            }

        });



    });



    app.post('/api/mgmtObject/info', function (req, res) { 
        var mgmtobj = req.body;
    
        console.log("|"+ mgmtobj.toString() + "|");
        MgmtObjectInfoObject.findOne({"sn" : mgmtobj.sn }, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("Management Object  is not exist. insert it."); 
    
                var newmgmtobj = new MgmtObjectInfoObject(mgmtobj);
                newmgmtobj.save(function(err, thor) {
                  if (err)  {
                    console.dir(thor);
                    return res.json(400 , err);
                  } else 
                    return res.json(200, {status:"SUCCESS", info: "The management object insert is succeeds!"});
                });
            }
            else {  
                doc.update(mgmtobj, function(error, course) {
                    if(error) return next(error);
                });
                return  res.json(200 , {status:"SUCCESS", info: "The management object has exist! Update it."});
            }
        });
    });
    
    app.get('/ceb/storageSet/addOrUpdate', function (req, res) {  
        var data ={};
        data["sn"] = req.query.storageSN;
        data["name"] = req.query.name;
        data["datacenter"] = req.query.datacenter;
        data["level"] = req.query.type;
        data["type"] = "array";
        data["createdData"] = "";
        data["updatedData"] = "";
        data["specialInfo"] = "";

        var specialInfo = {};
        specialInfo["used"] = req.query.used;
        specialInfo["maxCache"] = req.query.maxCache;
        specialInfo["maxDisks"] = req.query.maxDisks
        specialInfo["maxPorts"] = req.query.maxPorts;
        specialInfo["lifeCycle"] = req.query.lifeCycle;
        specialInfo["maintenanceInfo"] = req.query.maintenanceInfo;
        data["specialInfo"] = JSON.stringify(specialInfo);


        console.log("|"+ data.toString() + "|");
        MgmtObjectInfoObject.findOne({"sn" : data.sn }, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("Management Object  is not exist. insert it."); 
    
                var newmgmtobj = new MgmtObjectInfoObject(data);
                newmgmtobj.save(function(err, thor) {
                  if (err)  {
                    console.dir(thor);
                    return res.json(400 , err);
                  } else 
                    return res.json(200, {status:"SUCCESS", info: "The management object insert is succeeds!"});
                });
            }
            else {  
                doc.update(data, function(error, course) {
                    if(error) return next(error);
                });
                return  res.json(200 , {status:"SUCCESS", info: "The management object has exist! Update it."});
            }
        });
    });
    

    app.get('/ceb/storageSet/list', function (req, res) {   
        var filter = {};
        deviceMgmt.getMgmtObjectInfo(filter, function(devInfo) {
            res.json(200,devInfo);
        })
    });
    
};

module.exports = datacenterController;
