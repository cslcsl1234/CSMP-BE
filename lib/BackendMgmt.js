"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');   
var jp = require('jsonpath'); 

module.exports = {
    BackEndLogin,
    BackEndLogout



}



function BackEndLogin(callback) {
    var config = configger.load();


    // Step 1: begin the first call for get a sessionid-A.
    unirest.get(config.BackendMgmt.URL)
            .end(function (response) { 
                if ( response.error ) {
                    console.log(response.error);
                    return response.error;
                } else {  
                    //console.log(response);   
                    var sessionid = response.headers['set-cookie'][0];
                    var session=sessionid.match(/JSESSIONID=([A-Z0-9]*);[ a-zA-Z0-9=;/]*/i);
                    console.log(session[1]);

                    // Step 2: call the login api to auth
                    // 
                    var queryString =  {"j_username": config.BackendMgmt.USER, "j_password": config.BackendMgmt.PASSWORD }; 

                    console.log(queryString);
                    unirest.post(config.BackendMgmt.URL + "/j_security_check")
                            .headers({'Cookie':'JSESSIONID='+session[1]}) 
                            .query('j_username=admin&j_password=changeme')
                            .end(function (login_response) { 
                                if ( login_response.error ) {
                                    console.log(login_response.error);
                                    return login_response.error;
                                } else {  
                                    //console.log(login_response);   
                                    var login_sessionid = login_response.headers['set-cookie'][0];
                                    var login_session=login_sessionid.match(/JSESSIONID=([A-Z0-9]*);[ a-zA-Z0-9=;/]*/i);
                                    console.log(login_session[1]);                                     


                                    // Step 1: begin the first call for get a sessionid-A.
                                    unirest.get(config.BackendMgmt.URL)
                                            .headers({'Cookie':'JSESSIONID='+login_session[1]}) 
                                            .end(function (response1) { 
                                                if ( response1.error ) {
                                                    console.log(response1.error);
                                                    return response1.error;
                                                } else {  
                                                    //console.log(response);    
                                                    callback(response1);
                                                }
                                            });

                                    
                                }
                    }); 

 
                }

            }); 

}


function BackEndLogout(device, callback) {

    var filter = filterbase + '&(name==\'ReadRequests\'|name==\'WriteRequests\')';
    var fields = 'device,name';
    var keys = ['device'];



    var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
    //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 


    unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
            .auth(config.Backend.USER, config.Backend.PASSWORD, true)
            .headers({'Content-Type': 'multipart/form-data'}) 
            .query(queryString) 
            .end(function (response) { 
                if ( response.error ) {
                    console.log(response.error);
                    return response.error;
                } else {  
                    //console.log(response.body);   
                    var resultRecord = response.body;
                    callback(null,resultRecord);
                }

            }); 
};




