"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('appController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
 
var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');

var mongoose = require('mongoose');
var AppObj = mongoose.model('Application');

var CallGet = require('../lib/CallGet'); 
var getTopos = require('./topos.js');

var appController = function (app) {

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


    app.get('/api/application', function (req, res) {

        AppObj.find({}, function (err, doc) {
            //system error.
            if (err) { 
                res.json(500 , {status: err})
            }
            if (!doc) { //user doesn't exist.
                res.json(200 , []); 
            }
            else {
                res.json(500 , doc);
            }

        });

    });

    app.get('/api/application/list', function (req, res) {

        var query = AppObj.find({}).select({ "name": 1, "_id": 0});
        query.exec(function (err, doc) {
            //system error.
            if (err) { 
                res.json(500 , {status: err})
            }
            if (!doc) { //user doesn't exist.
                res.json(200 , []); 
            }
            else {
                res.json(500 , doc);
            }

        });

    });


/* 
*  Create a app record 
*/
    app.post('/api/application', function (req, res) {
        console.log(req.body);

        var app = req.body;

        AppObj.findOne({"name" : app.name}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("app is not exist. insert it."); 

                var newapp = new AppObj(app);
                console.log('Test1');
                newapp.save(function(err, thor) {
                 console.log('Test2');
                 if (err)  {
                    console.dir(thor);
                    return res.json(400 , err);
                  } else 
                    return res.json(200, app);
                });
            }
            else {
                console.log("App is exist!");
 

                doc.update(app, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(500 , {status: "The App has exist! Update it."});
            }

        });



    });









};

module.exports = appController;
