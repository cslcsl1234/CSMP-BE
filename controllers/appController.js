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
var App = require('../lib/App');

var mongoose = require('mongoose');
var AppObj = mongoose.model('Application');
 
var getTopos = require('../lib/topos.js');

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


        App.GetApps(function(code, result) {
            res.json(code , result);

        })


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
                console.log(app);
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
                doc.update(app, function(error, course) {
                    if(error) res.json(200 , {status: error});
                    else
                    return  res.json(200 , {status: "The App has exist! Update it."});
                });


                
            }

        });



    });


/*
    Load a batch records for applications
 */

    app.post('/api/applications', function (req, res) {
 
        var apps = req.body;
        var appArray = [];
        for ( var i in apps ) {
 
            var newapp = {};

            var lineString = apps[i];
            var fields = lineString.split(",");
            if ( fields.length < 2 ) continue;
            // get all of fields to newhost structure;
            var j=0;
            newapp["id"]           = fields[0]; j++;
            newapp["name"]         = fields[1]; j++;
            newapp["alias"] = '';
            newapp["status"]       = fields[2]; j++;
            newapp["busi_type"]    = fields[4]; j++;
            newapp["product_type"] = fields[3]; j++;
            newapp["oper_depart"]  = fields[5]; j++;
            newapp["oper_owner"]   = fields[6]; j++;
            newapp["app_depart"]   = fields[7]; j++;
            newapp["app_level"]    = fields[9]; j++;
            newapp["others"]       = fields[8]; j++;
            newapp["description"]  = fields[10]; j++;

            appArray.push(newapp); 

        }
            //
            // Insert a new host record into MongoDB
            //  
        async.eachSeries(appArray, function(newapp, asyncdone) {

            console.log(newapp.name);

           AppObj.findOne({"id" : newapp.id}, function (err, doc) {
                //system error.
                if (err) {
                    return   done(err);
                }
                if (!doc) { //user doesn't exist.
                    console.log("app is not exist. insert it."); 
 
                    var newappR = new AppObj(newapp);
                    console.log(newappR);
                    newappR.save(asyncdone);
                }
                else { 
                    doc.update(newapp, function(error, course) {
                        if(error) res.json(200 , {status: error});
                        console.log("The App has exist! Update it.");
                        asyncdone();
                    });

                }

            });  

 
        }, function(err) {
            if ( err ) return console.log(err);
        });


        res.json(200, "OK");

    });

/* 
*  Delete a app record 
*/
    app.delete('/api/application', function (req, res) { 
        var device = req.query.device; 

        AppObj.findOne({"name" : device}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) {  
                console.log("application is not exist. do nothing."); 
                return  res.json(200 , {status: "application is not exist. do nothing."});
            }
            else { 
                doc.remove(App, function(error, course) {
                    if(error) return next(error);
                });

                return  res.json(200 , {status: "The application has deleted!"});
            }

        });

    });







};

module.exports = appController;
