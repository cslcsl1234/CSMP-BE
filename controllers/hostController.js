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


/* 
*  Create a app record 
*/
    app.post('/api/host', function (req, res) {
        console.log(req.body);

        var host = req.body;

        HostObj.findOne({"name" : host.baseinfo.name}, function (err, doc) {
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









};

module.exports = hostController;
