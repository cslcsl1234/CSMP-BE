"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('eventController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
 
var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');

var mongoose = require('mongoose'); 
 
var CallGet = require('../lib/CallGet'); 
 


var GetEvents = require('../lib/GetEvents');  

var eventController = function (app) {

    var config = configger.load();


    app.get('/api/events', function (req, res) {
 
 
        var device = req.query.device; 
        var eventParam = {};
        if (typeof device !== 'undefined') { 
            eventParam['filter'] = 'device=\''+device + '\'&!acknowledged&active=\'1\'';
            var filterbase = 'device=\''+device+'\'&!parttype';
        } else {
            eventParam['filter'] = '!acknowledged&active=\'1\'';
        } 

        //console.log(eventParam);
        GetEvents.GetEvents(eventParam, function(result) {   

            res.json(200,result);
        });


    });





};

module.exports = eventController;
