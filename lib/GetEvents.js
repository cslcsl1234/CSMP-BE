"use strict"; 

var async = require('async'); 

var unirest = require('unirest');
var configger = require('../config/configger');

exports.GetEvents = function(param, callback) {

    var config = configger.load();



    var filter = param.filter;

    var fields = 'id,category,severity,sourceip,device,devtype,part,eventname,eventstate,eventtype,severity,timestamp,active,fullmsg,eventdisplayname,parttype';

    var queryString =  {'properties': fields, 'filter': filter }; 

    unirest.get(config.Backend.URL + '/events/occurrences/values' )
            .auth(config.Backend.USER, config.Backend.PASSWORD, true)
            .headers({'Content-Type': 'multipart/form-data'}) 
            .query(queryString) 
            .end(function (response) { 
                if ( response.error ) {
                    console.log(response.error);
                    callback(response.error);
                } else { 
                    var res = JSON.parse(response.body);

                    var events = res.occurrences;
                    var eventArray = [];

                    for ( var i in events ) {
                        eventArray.push( events[i].properties );
                    }

                    callback(eventArray);   
                }

            }); 

};

