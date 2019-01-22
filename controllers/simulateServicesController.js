"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('simulateServicesController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');   

var simulateServicesController = function (app) {

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

 
    app.get('/vplex/clusters/:clustername/storage-elements/storage-volumes/*', function (req, res) { 
        
        var clustername = req.params.clustername; 

        var data = require('../demodata/VPLEX/'+clustername+'_storage-volumes'); 
        res.json(200,data); 
    });

    app.get('/vplex/clusters/cluster-2/storage-elements/storage-volumes/*', function (req, res) { 
        var data = require('../demodata/VPLEX/cluster-2_storage-volumes'); 
        res.json(200,data); 
    });

    app.get('/vplex/clusters/:clustername/consistency-groups/:CGName', function (req, res) {
        var clustername = req.params.clustername;
        var cgname = req.params.CGName;
        var filename = "../demodata/VPLEX/"+clustername+"_consistency-groups";
        var data = require(filename);

        var result = {
            "response": {
              "context": null,
              "message": null,
              "exception": null,
              "custom-data": null
            }
          }
        for ( var i in data.response.context ) {
            var item = data.response.context[i];
            for ( var j in  item.attributes ) {
                var attrItem = item.attributes[j];
                if ( attrItem.name == "name" ) {
                    if ( attrItem.value == cgname ) {
                        result.response.context = [];
                        result.response.context.push(item); 
                        res.json(200,result); 
                    }
                }
            }
        }
        res.json(404,result); 
    });




    app.get('/vplex/clusters/:clustername/exports/storage-views/*', function (req, res) { 
        
        var clustername = req.params.clustername; 

        var data = require('../demodata/VPLEX/'+clustername+'_storage-views'); 
        res.json(200,data); 
    });


    app.get('/vplex/clusters/:clustername/exports/storage-views/:svname', function (req, res) {
        var clustername = req.params.clustername;
        var svname = req.params.svname;
        var filename = "../demodata/VPLEX/"+clustername+"_storage-views";
        var data = require(filename); 

        var result = {"response": { "context" : []}};

        var result = {
            "response": {
              "context": null,
              "message": null,
              "exception": null,
              "custom-data": null
            }
          }

        for ( var i in data.response.context ) {
            var item = data.response.context[i];
            for ( var j in  item.attributes ) {
                var attrItem = item.attributes[j];  
                if ( attrItem.name == "name" ) {
                    if ( attrItem.value == svname ) { 
                        result.response.context = [];
                        result.response.context.push(item); 
                        res.json(200,result); 
                    }
                }
            }
        }
        result.response.exception = "Invalid URI in GET request. Not one among context,command or attribute.";
        res.json(404,result); 
    });


};

module.exports = simulateServicesController;
