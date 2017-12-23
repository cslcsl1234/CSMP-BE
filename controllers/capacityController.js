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
var ArrayObj = mongoose.model('Array');
 
var CallGet = require('../lib/CallGet');  
var getTopos = require('../lib/topos.js');
var CAPACITY = require('../lib/Array_Capacity');


var GetEvents = require('../lib/GetEvents'); 

// ----------------------------------------
// ------------ For Demo Data -------------
// ----------------------------------------
var Capacity_Overview = require('../demodata/Capacity_Overview');
var Capacity_DistributeMap = require('../demodata/Capacity_DistributeMap');

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

     app.get('/api/capacity/distributemap', function (req, res) {

         async.waterfall(
        [
 
            function(callback){ 
                CAPACITY.GetArrayTotalCapacity(function(ret) { 
                    callback(null,ret);
                })     
            }, 
            function(arg1,  callback){  
                var result = {};
                var RawCapacity = {};
                RawCapacity["RawCapacityTB"] = Math.round(arg1.RawCapacity.RawCapacity/1024*100)/100;
                RawCapacity["ConfiguredRawCapacityTB"] = Math.round((arg1.RawCapacity.ConfiguredUsableCapacity + arg1.RawCapacity.RAIDOverheadCapacity)/1024*100)/100;
                RawCapacity["UnconfiguredRawCapacityTB"] = Math.round(arg1.RawCapacity.UnconfiguredCapacity/1024*100)/100;
                RawCapacity["HotSpareCapacityTB"] = Math.round(arg1.RawCapacity.HotSpareCapacity/1024*100)/100;
                RawCapacity["UnusableCapacityTB"] = Math.round(arg1.RawCapacity.UnusableCapacity/1024*100)/100;

                RawCapacity["RawCapacityGB"] = Math.round(arg1.RawCapacity.RawCapacity*100)/100;
                RawCapacity["ConfiguredRawCapacityGB"] = Math.round((arg1.RawCapacity.ConfiguredUsableCapacity + arg1.RawCapacity.RAIDOverheadCapacity)*100)/100;
                RawCapacity["UnconfiguredRawCapacityGB"] = Math.round(arg1.RawCapacity.UnconfiguredCapacity*100)/100;
                RawCapacity["HotSpareCapacityGB"] = Math.round(arg1.RawCapacity.HotSpareCapacity*100)/100;
                RawCapacity["UnusableCapacityBB"] = Math.round(arg1.RawCapacity.UnusableCapacity*100)/100;

                result["RawCapacity"] = RawCapacity;

                //
                // ConfiguredRawCapacity
                // 
                var ConfiguredRawCapacity = {};
                ConfiguredRawCapacity["ConfiguredUsable"] = arg1.RawCapacity.ConfiguredUsableCapacity;
                ConfiguredRawCapacity["RAIDOverhead"] = arg1.RawCapacity.RAIDOverheadCapacity;
                
                result["ConfiguredRawCapacity"] = ConfiguredRawCapacity;


                //
                // ConfiguredUsableCapacity
                // 
                var ConfiguredUsableCapacity = {};
                ConfiguredUsableCapacity["Used"] = arg1.ConfiguredUsableCapacity.UsedCapacity;
                ConfiguredUsableCapacity["PoolFree"] = arg1.ConfiguredUsableCapacity.PoolFreeCapacity;
                ConfiguredUsableCapacity["Free"] = arg1.ConfiguredUsableCapacity.FreeCapacity;
                                
                result["ConfiguredUsable"] = ConfiguredUsableCapacity;



                //
                // UsedCapacity
                // 
                var UsedCapacity = {};
                UsedCapacity["BlockUsed"] = !arg1.UsedCapacityByType.BlockUsedCapacity ? 0 : arg1.UsedCapacityByType.BlockUsedCapacity;
                UsedCapacity["FileUsed"] = !arg1.UsedCapacityByType.FileUsedCapacity ? 0 : arg1.UsedCapacityByType.FileUsedCapacity;
                UsedCapacity["VirtualUsed"] = !arg1.UsedCapacityByType.VirtualUsedCapacity ? 0 : arg1.UsedCapacityByType.VirtualUsedCapacity;
                UsedCapacity["HDFSUsed"] = !arg1.UsedCapacityByType.HDFSUsedCapacity ? 0 : arg1.UsedCapacityByType.HDFSUsedCapacity;
                UsedCapacity["ObjectUsed"] = !arg1.UsedCapacityByType.ObjectUsedCapacity  ? 0 : arg1.UsedCapacityByType.ObjectUsedCapacity;
                                                      
                result["UsedCapacity"] = UsedCapacity;




                callback(null,result);
             },
            function(arg1,  callback){ 
                  callback(null,arg1);
            }
        ], function (err, ret) {
              // result now equals 'done'
              res.json(200,ret);
        });


   });
     app.get('/api/capacity/overview', function (req, res) {
                res.json(200,Capacity_Overview);

   });
    app.get('/api/capacity/PoolOverview', function (req, res) {
                res.json(200,Capacity_PoolOverview);
   });
    app.get('/api/capacity/PoolDetail', function (req, res) {
                res.json(200,Capacity_PoolDetail);
   });
    app.get('/api/capacity/PoolComponentDetail', function (req, res) {
                res.json(200,Capacity_PoolComponentDetail);
   });



/*
*  Array Capacity
*/



    app.get('/api/capacity/overview1', function (req, res) {
 
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


    app.get('/api/capacity/PoolOverview1', function (req, res) {
 
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




    app.get('/api/capacity/PoolDetail1', function (req, res) {
 
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


    app.get('/api/capacity/PoolComponentDetail1', function (req, res) {
 
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
