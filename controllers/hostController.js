"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('hostController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
  
var util = require('../lib/util');

var host = require('../lib/Host');

var mongoose = require('mongoose');
var HostObj = mongoose.model('Host');
 
var HBALIST = require('../demodata/host_hba_list');

var hostController = function (app) {

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



    app.get('/api/hosts', function (req, res) {
        var hostname = req.query.device; 
        host.GetHosts(hostname, function(code,result) {
            res.json(200 , result);
        });

    });


    app.get('/api/host/list', function (req, res) {

        var query = HostObj.find({}).select({ "baseinfo.name": 1, "_id": 0});
        query.exec(function (err, doc) {
            //system error.
            if (err) { 
                res.json(500 , {status: err})
            }
            if (!doc) { //user doesn't exist.
                res.json(200 , []); 
            }
            else {

                var result = [];
                for ( var i in doc ) {
                    var item = doc[i].baseinfo.name;
                    result.push(item);
                }
                res.json(200 , result);
            }

        });

    });

    app.get('/api/hba/nohostname', function (req, res) {

        res.json(200,HBALIST);

    });

   app.get('/api/host/baseinfo', function (req, res) { 
    var device = req.query.device;

    if ( config.ProductType == 'demo' ) {
             res.json(200,VMAX_ListJSON);

    } else {

        if ( device === undefined ) {
            res.json(401, 'Must be special a device!')
            return;
        } 
        host.GetHosts(device, function(code,result) {
            res.json(200 , result);


            var finalResult = [];
            var returnData = ret[0];
            var item = {};
            // Combine the UI element for VMAX Basic Info page.

            // -------------- Block1 ---------------------------
            var UI_Block1 = {} ;
            UI_Block1['title'] = "存储管理信息";
            UI_Block1['detail'] = [];

            item={};
            item["name"] = "存储序列号"; 
            item["value"] = returnData.device;
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
            item["name"] = "存储类型"; 
            item["value"] = returnData.sstype;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "微码版本"; 
            item["value"] = returnData.devdesc;
            UI_Block1.detail.push(item);


            // -------------- Block1 ---------------------------
 
            var UI_Block2 = {} ;
            UI_Block2['title'] = "存储硬件配置信息";
            UI_Block2['detail'] = [];

            item={};
            item["name"] = "缓存大小(Gb)"; 
            item["value"] = returnData.TotalMemory;
            UI_Block2.detail.push(item);

            item={};
            item["name"] = "磁盘数量"; 
            item["value"] = returnData.TotalDisk;
            UI_Block2.detail.push(item);

            item={};
            item["name"] = "LUN数量"; 
            item["value"] = returnData.TotalLun;
            UI_Block2.detail.push(item);


            // -------------- Finally combine the final result record -----------------
            finalResult.push(UI_Block1);
            finalResult.push(UI_Block2);

            res.json(200,finalResult);
        })
    }
    });

/* 
*  Create a app record 
*/
    app.post('/api/host', function (req, res) {
        console.log(req.body);

        var host = req.body;

        HostObj.findOne({"baseinfo.name" : host.baseinfo.name}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("host is not exist. insert it."); 

                var newhost = new HostObj(host);
                console.log('Test1');
                newhost.save(function(err, thor) {
                 console.log('Test2');
                 if (err)  {
                    console.dir(thor);
                    return res.json(400 , err);
                  } else 
                    return res.json(200, {status: "The Host has inserted."});
                });
            }
            else { 
                doc.update(host, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(200 , {status: "The Host has exist! Update it."});
            }

        });

    });


/* 
*  Delete a app record 
*/
    app.delete('/api/host', function (req, res) { 
        var device = req.query.device; 

        HostObj.findOne({"baseinfo.name" : device}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("host is not exist. do nothing."); 
                return  res.json(200 , {status: "host is not exist. do nothing."});
            }
            else { 
                doc.remove(host, function(error, course) {
                    if(error) return next(error);
                });

                return  res.json(200 , {status: "The Host has deleted!"});
            }

        });




    });


    // Save the hba with hostname records
    app.post('/api/hba', function (req, res) {

        var hbalist = req.body;
        console.log(hbalist);

    });



};

module.exports = hostController;
