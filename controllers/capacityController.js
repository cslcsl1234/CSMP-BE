"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('capacityController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async'); 

var mongoose = require('mongoose');
var ArrayObj = mongoose.model('EquipmentInfo');
 
var CallGet = require('../lib/CallGet');  
var getTopos = require('../lib/topos.js');


var GetEvents = require('../lib/GetEvents'); 

// ----------------------------------------
// ------------ For Demo Data -------------
// ----------------------------------------
var Capacity_Overview = require('../demodata/Capacity_Overview');

var Capacity_PoolDetail = require('../demodata/Capacity_PoolDetail');
var Capacity_PoolComponentDetail = require('../demodata/Capacity_PoolComponentDetail');
var Capacity_PoolOverview = require('../demodata/Capacity_PoolOverview');


var capacityController = function (app) {

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





/*
*  Array Capacity
*/



    app.get('/api/capacity/overview', function (req, res) {
 
        if ( config.ProductType == 'demo' ) {
                res.json(200,Capacity_Overview);
                return;
        } ;

 
        async.waterfall([
            function(callback){ 
 

                var param = {};
                param['filter'] = '!parttype';
                param['filter_name'] = '(name==\'PrimaryUsedCapacity\'|name==\'LocalReplicaUsedCapacity\'|name==\'RemoteReplicaUsedCapacity\'|name==\'SystemUsedCapacity\'|name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'VirtualUsedCapacity\'|name=\'HDFSUsedCapacity\'|name=\'ObjectUsedCapacity\'|name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredRawCapacity\'|name=\'UnusableCapacity\')';
                param['keys'] = ['device'];
                param['fields'] = ['device'];
                param['limit'] = 1000000;

                CallGet.CallGet(param, function(param) { 
                

                   var data = param.result;
                   callback(null,data);
                } );
     
            },
            function(arg1,  callback){  
               callback(null,arg1);
 

            }
        ], function (err, result) {
           // result now equals 'done'
           res.json(200, result);
        });


 

         
    });


    app.get('/api/capacity/PoolOverview', function (req, res) {
 
        if ( config.ProductType == 'demo' ) {
                res.json(200,Capacity_PoolOverview);
                return;
        } ;

 
        async.waterfall([
            function(callback){ 
 

                callback(null,"neet to do");
     
            },
            function(arg1,  callback){  
               callback(null,arg1);
 

            }
        ], function (err, result) {
           // result now equals 'done'
           res.json(200, result);
        });


 

         
    });




    app.get('/api/capacity/PoolDetail', function (req, res) {
 
        if ( config.ProductType == 'demo' ) {
                res.json(200,Capacity_PoolDetail);
                return;
        } ;

 

        async.waterfall([
            function(callback){ 

            var param = {};
            param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\')';
            param['keys'] = ['device','part'];
            param['fields'] = ['diskrpm','isfast','raidtype','pooltype'];

            param['filter'] = 'parttype=\'Storage Pool\'';


            CallGet.CallGet(param, function(param) {
                   var data = param.result;
                   callback(null,data);
                } );
     
            },
            function(arg1,  callback){  
               callback(null,arg1);
 

            }
        ], function (err, result) {
           // result now equals 'done'
           res.json(200, result);
        });


 

         
    });


    app.get('/api/capacity/PoolComponentDetail', function (req, res) {
 
        if ( config.ProductType == 'demo' ) {
                res.json(200,Capacity_PoolComponentDetail);
                return;
        } ;

 
        async.waterfall([
            function(callback){ 
 

                callback(null,"neet to do");
     
            },
            function(arg1,  callback){  
               callback(null,arg1);
 

            }
        ], function (err, result) {
           // result now equals 'done'
           res.json(200, result);
        });


 

         
    });




};

module.exports = capacityController;