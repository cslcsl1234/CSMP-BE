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
        var device = req.query.device;  
        var start = req.query.start; 
        var end = req.query.end; 

        var filterbase = 'device=\''+device + '\'' ;
                var filter = filterbase + '&datagrp=\'VMAX-BEDirector\'&partgrp=\'Back-End\'&name=\'CurrentUtilization\'';
                var fields = 'device,part,name';
                var keys = ['device,part'];

                //var queryString =  {"filter":filter,"fields":fields}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 



                console.log(queryString);
                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query(queryString) 
                        .end(function (response) { 
                            if ( response.error ) {
                                console.log(response.error);
                                return response.error;
                            } else {  
                                var result = JSON.parse(response.body).values;    

                                for ( var i in result ) {
                                    var item = result[i];
                                    var matrics = item.points;
                                    var resultItem = {};
                                    resultItem["type"] = "DF";
                                    resultItem["component"] = item.properties.part.replace(":","-");
                                    resultItem["busy"] = util.GetMaxValue(matrics);
                                    finalResult.push(resultItem);
                                }
                                callback(null,finalResult);
                            }

                        });

     });                       

    app.get('/api/test', function (req, res) {
        var device = req.query.device; 

       // App.GetApps(function(code, result) {
        //c.GetAssignedInitiatorByDevices(device,function(result) {
        //Switch.GetSwitchPorts(device,function(result) {

       //Capacity.getArrayCapacityTrend(device,function(result) {
        var msg = "this is test msg!";
       // GetEvents.SendSMS2Phone(msg,function(result) {

        //Host.GetAssignedLUNByHosts(function(result) {
       // Host.GetAssignedLUNByInitiator(device, function(result) {
       //Switch.getFabric(device, function(result) {
       //
       //Host.GetHosts(device, function(code,result) {


       //Switch.GetSwitchPorts(device, function(result) {
       //Host.GetHBAFlatRecord(device, function(result) {
       //VPLEX.GetVirtualVolumeRelationByDevices(device,function(result) {
       
        //VPLEX.getVplexStorageViews(device, function(result) {  
       // GETCALL.centralizedManage( function(result) {
       //DeviceMgmt.GetFCSwitchPart('FabricSwitch','Port',function(result) {
       //Capacity.GetArrayTotalCapacity(function(result) {  
/*
        var period;
        VMAX.GetDirectorPerformance(device, period,  function(rest) { 
       
                    res.json(200, rest);
               }) 


            var device = '000495700228';
            var part = '1382';
        VMAX.getArrayLunPerformance(device, part, function(rest) { 
                res.json(200, rest);
            
        });

       
        var periodType;
        Capacity.GetArrayTotalCapacity(periodType, function(ret) { 
            res.json(200, ret);
        }) 
        */ 
                VNX.GetVNX_FileSystem(device,function(result) {  
                    res.json(200, result);
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
