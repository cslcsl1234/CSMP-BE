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
var EventObj = mongoose.model('Event');
 
var CallGet = require('../lib/CallGet'); 
 
var demo_events = require('../demodata/events');

var GetEvents = require('../lib/GetEvents');  

var eventController = function (app) {

    var config = configger.load();


    app.get('/api/events', function (req, res) {
 
        if ( config.ProductType == 'demo' ) {
            res.json(200,demo_events);
            return;
        } ;

        var device = req.query.device; 
        var state = req.query.state; 
        console.log(device+"/"+state);
        var eventParam = {};
        if (typeof device !== 'undefined') { 
            eventParam['filter'] = 'device=\''+device + '\'&!acknowledged&active=\'1\'';
            var filterbase = 'device=\''+device+'\'&!parttype';
        } else {
            eventParam['filter'] = '!acknowledged&active=\'1\'';
        } 

        //console.log(eventParam);
        GetEvents.GetEvents(eventParam, function(result) {   


                 EventObj.find({}, function (err, doc) {

                    for ( var i in result ) {
                        var eventitem = result[i];
                        eventitem["customerSeverity"] = -1;
                        eventitem["state"] = '未处理';
                        eventitem["ProcessMethod"] = '';
                        for ( var j in doc ) {
                            var eventInfoItem = doc[j];
                            if ( eventitem.id == eventInfoItem.id ) {
                                eventitem["customerSeverity"] = eventInfoItem.customerSeverity;
                                eventitem["state"] = eventInfoItem.state;
                                eventitem["ProcessMethod"] = eventInfoItem.ProcessMethod;
                                break;
                            }
                        }
                                                 
                    }
                    if ( state !== undefined ) {
                        var result1 = [];
                        for ( var i in result ) {
                            var eventitem = result[i]; 
                            if  ( state.indexOf(eventitem.state) > -1 )  result1.push(eventitem);
                        }
                        return  res.json(200 , result1);
                    } else 
                        return  res.json(200 , result);

                });
 
            

        });


    });


/* 
*  Create a Event record 
*/
    app.post('/api/events', function (req, res) { 
        var event = req.body;

        event.forEach(function(item) {


             EventObj.findOne({"id" : item.id}, function (err, doc) {
                //system error.
                if (err) {
                    return   done(err);
                }
                if (!doc) { //user doesn't exist.
                    console.log("Event Record is not exist. insert it."); 

                    var newevent = new EventObj(item);
                    newevent.save(function(err, thor) {
                      if (err)  {

                        console.dir(thor);
                        return res.json(400 , err);
                      } else 

                        return res.json(200, {status: "The Event Record insert is succeeds!"});
                    });
                }
                else {
                    console.log("Event is exist!");
     

                    doc.update(item, function(error, course) {
                        if(error) return next(error);
                    });


                    return  res.json(500 , {status: "The Event Record has exist! Update it."});
                }

                });

       });


    });



};

module.exports = eventController;
