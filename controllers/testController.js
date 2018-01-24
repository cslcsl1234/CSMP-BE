"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('testController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
 
var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');
var App = require('../lib/App');
var GETCALL = require('../lib/CallGet');

var mongoose = require('mongoose');
var AppObj = mongoose.model('Application');
 
var getTopos = require('../lib/topos.js');
var Host = require('../lib/Host');
var VMAX = require('../lib/Array_VMAX');
var VPLEX = require('../lib/Array_VPLEX');
var Switch = require('../lib/Switch');
var VNX = require('../lib/Array_VNX');
var Capacity = require('../lib/Array_Capacity');
var GetEvents = require('../lib/GetEvents');
var DeviceMgmt = require('../lib/DeviceManagement');
var SWITCH = require('../lib/Switch');
var CallGet = require('../lib/CallGet');  
var util = require('../lib/util');   
var topos= require('../lib/topos');
var DeviceMgmt = require('../lib/DeviceManagement');

var testController = function (app) {

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



    app.get('/api/test1', function (req, res) {
        async.waterfall([
            function(callback){ 
    
                var param = {};
                if (typeof device !== 'undefined') {  
                    param['filter'] = 'device=\''+device+'\'&!vstatus==\'inactive\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
                } else {
                    param['filter'] = '!vstatus==\'inactive\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
                }
     
                param['keys'] = ['device','partwwn']; 
                param['fields'] = ['partid','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat','lswwn','ip','lsname'];
    
                CallGet.CallGet(param, function(param) { 
                var result = [];
         
                callback(null, param.result ); 
                });
            },
            function(arg1,  callback){ 
    
                var param = {};
                if (typeof device !== 'undefined') {  
                    param['filter'] = 'device=\''+device+'\'&!vstatus==\'inactive\'&datagrp=\'BROCADE_SWITCHFCPORTSTATS\'';
                } else {
                    param['filter'] = '!vstatus==\'inactive\'&datagrp=\'BROCADE_SWITCHFCPORTSTATS\'';
                }
    
                //param['filter_name'] = '(name=\'InFramesEncodingErrors\'|name=\'InCrcs\'|name=\'OutFramesEncodingErrors\'|name=\'C3Discards\'|name=\'LinkFailures\')';
                param['filter_name'] = '(name=\'InFramesEncodingErrors\')';
                param['keys'] = ['device','partwwn'];
                //param['fields'] = ['partid','slotnum','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat'];
                param['fields'] = ['porttype'];
                param['period'] = 3600;   
                param['start'] = util.getConfStartTime('1d');  
    
    
                CallGet.CallGet(param, function(param) { 
                    var result = param.result ;

                    callback(null,arg1);     
                });
    
            }
        ], function (err, result) {
            res.json(200 , result);
        });
    

     });                       

    app.get('/api/test', function (req, res) {
        var device = req.query.device; 
        var period = 0; 
        var eventParam = {};
        if (typeof device !== 'undefined') { 
            eventParam['filter'] = 'device=\''+device + '\'&!acknowledged&active=\'1\'';
            var filter = 'device=\''+device + '\'&!acknowledged&active=\'1\'';
        } else {
            eventParam['filter'] = '!acknowledged&active=\'1\'';
        } 
 
        //console.log(eventParam);
        //GetEvents.GetEvents(eventParam, function(result1) {   
 
            Host.GetHosts( device, function(retcode, result) {  
                console.log(result.length);
                 res.json(200 , result);
            });

    });

    app.get('/api/test2', function (req, res) {
        var device = req.query.device; 
        var period = 0;
        var arg1={};
                var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
                queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>      ";
                queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>  ";
                queryString = queryString + " SELECT distinct ?init_wwn ?arrayName ?poolName ?lunName ?lunRaid ?volumeWWN  ";
                queryString = queryString + " WHERE {   ";
             
                queryString = queryString + "        ?initiator rdf:type srm:ProtocolEndpoint .      ";
                queryString = queryString + "        ?initiator  srm:Identifier ?www .        ";
                queryString = queryString + "        BIND(replace(?www , 'topo:srm.ProtocolEndpoint:', '', 'i') as ?init_wwn) .    ";
                queryString = queryString + "        ?initiator srm:maskedTo ?mv .";
                queryString = queryString + "         ?mv srm:maskedToDisk ?disk .    ";          

                 queryString = queryString + "        ?disk srm:displayName ?lunName .    ";               

                queryString = queryString + "       ?disk srm:isUsed ?lunisused .  ";
                queryString = queryString + "       ?disk srm:raid ?lunRaid .  ";
                queryString = queryString + "       ?disk srm:lunTagId ?lunTagId .  ";
                queryString = queryString + "       ?disk srm:volumeWWN ?volumeWWN .  ";
                queryString = queryString + "       ?disk srm:residesOnStoragePool ?pool .  ";
                queryString = queryString + "       ?disk srm:residesOnStorageEntity ?array .  ";
                queryString = queryString + "       ?pool srm:displayName ?poolName .  ";
                queryString = queryString + "       ?array srm:displayName ?arrayName .  ";
                queryString = queryString + " }  ";


                  topos.querySparql(queryString,  function (response) {
                                  //var resultRecord = RecordFlat(response.body, keys);
                                    
                      arg1["lun"] = response;
                      res.json(200 , arg1);
                  }); 
});

    app.get('/api/test/list', function (req, res) {

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





};

module.exports = testController;
