"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');   
var jp = require('jsonpath'); 
var xml2json = require('xml2json');
var fs= require('fs');

 
module.exports = {
    BackEndLogin,
    BackEndLogout,
    getBackendServerList,
    getBackendServerStatus,


    getCollectCatalogs,
    getCollectObjects


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
                                    console.log(login_response.cookies);
                                    var login_sso_token = login_response.cookies.JSESSIONIDSSO;
                                    callback(login_sso_token);

                                    /*
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

                                    */
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
                    //console.log(response.raw_body);   
                    var resultRecord = response.raw_body;
                    callback(null,resultRecord);
                }

            }); 
};

function getBackendServerList( callback) {            
    var config = configger.load();

    var REQUIRE_URL = config.BackendMgmt.URL+"/discocenter/devicemgmt/edit";

    var serverListFile = "BackendServerList";
    fs.exists("./data/"+ serverListFile + ".json" , function(exists) {
        if ( exists ) {
            console.log("server list file is exists! " + serverListFile + ".json");
            var serverList = require("../data/" + serverListFile);
            callback(serverList);
        } else {
            console.log("server list file is NOT exists! Create it...  ..." );
            executeGetBackendServerList(function(serverList) { 

                var serverListJson = JSON.stringify(serverList);
                fs.writeFile("./data/" + serverListFile+".json", serverListJson, function(err){ 
                    if(err){
                        console.log(err);
                    };
                    callback(serverList);
                }) 

                
            })
        }
    })

};

function executeGetBackendServerList( callback) {  
    var config = configger.load();
    var url = '/overview/physical'; 
    var REQUIRE_URL = config.BackendMgmt.URL+url;

    async.waterfall(
        [
            function(callback){
                BackEndLogin(function(sso_token) { 
        
                    var req = unirest("GET", REQUIRE_URL );
                    
                    req.headers({ 
                    "content-type": "application/x-www-form-urlencoded",
                    "referer": config.BackendMgmt.URL,
                    "cookie": "JSESSIONIDSSO="+sso_token
                    });
                    
                    req.end(function (res) {
                        if (res.error) console.log(res.error);


                        var xmlstr = "<div>" + res.body + "</div>";
                        var options = {
                            object: true 
                        };
                        var json = xml2json.toJson(xmlstr,options);    
                        
                        var serverList = [];
                        for ( var i in json.div.div.div ) {
                            var item = json.div.div.div[i];
                            if ( item.id === undefined ) continue;

                            var serverItem = {};
                            serverItem["id"] = item.id;
                            serverItem["name"] = item.h2.a['$t'];
                            serverItem["type"] = item.h2.a["title"];
                            serverList.push(serverItem);
                        }
                         
                        callback(null,serverList);
                    });
                });
                
            }

        ], function (err, result) { 
              callback(result);
        });
    };


    function getBackendServerStatus(serverid, callback) {  
        var config = configger.load();
        var url = '/polling/server?server='+serverid; 
        var REQUIRE_URL = config.BackendMgmt.URL+url;
    
        async.waterfall(
            [
                function(callback){
                    BackEndLogin(function(sso_token) { 
            
                        var req = unirest("GET", REQUIRE_URL );
                        
                        req.headers({ 
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO="+sso_token
                        });
                        
                        req.end(function (res) {
                            if (res.error) console.log(res.error);

                             
                            callback(null,res);
                        });
                    });
                    
                }
    
            ], function (err, result) { 
                  callback(result);
            });
        };



function getCollectCatalogs( callback) {  
    var config = configger.load();

    var REQUIRE_URL = config.BackendMgmt.URL+"/discocenter/devicemgmt/list";

    async.waterfall(
        [
            function(callback){
                BackEndLogin(function(sso_token) { 
        
                    var req = unirest("GET", REQUIRE_URL );
                    
                    req.headers({ 
                    "content-type": "application/x-www-form-urlencoded",
                    "referer": config.BackendMgmt.URL,
                    "cookie": "JSESSIONIDSSO="+sso_token
                    });
                    
                    req.end(function (res) {
                    if (res.error) console.log(res.error);
                    
                    console.log(res.body);
                        var xmlstr = "<div>" + res.body + "</div>";
                        var options = {
                            object: true 
                        };
                        var json = xml2json.toJson(xmlstr,options);
                        
                        //res1.json(200 , jsontab);
                        callback(null,json);
                    });
                });
                
            },
            function(json, callback) {

                var arg = json.div.div.table.tbody.tr;
                var tabResult = [];
                for ( var i in arg ) {
                    var item = arg[i];
                    var input = item.td[0].input;
                    var tabResultItem = {};
                    for ( var j in input ) {
                        var inputItem = input[j];
                        tabResultItem[inputItem.name] = inputItem.value;
                    }
                    tabResultItem['DevCount'] = item.td[3];
                    tabResult.push(tabResultItem);


                }
                callback(null,tabResult);
            } ,
            function(arg, callback) {

                var filtered = [];
                for ( var i in arg ) {
                    var item = arg[i];
                    switch ( item["device-name"] ) {
                        case 'Host configuration' :

                            break;
                        case 'EMC VMAX':
                            item["collecter-name"] = 'EMC VMAX 采集器 (DMX/VMAX/VMAX2)';
                            filtered.push(item);
                            break;
                        case 'EMC VMAX HYPERMAX' :
                            item["collecter-name"] = 'EMC VMAX3 采集器 (VMAX3)';
                            filtered.push(item);
                            
                            break;
                        case 'EMC XtremIO' :
                            item["collecter-name"] = "EMC XtremIO 采集器";
                            filtered.push(item);
                        
                            break;
                        case 'EMC Unity/VNX/VNXe' :
                            item["collecter-name"] = "EMC Unity/VNX/VNXe 采集器";
                            filtered.push(item);

                            break;
                        
                        case 'Brocade SMI Provider': 
                            item["collecter-name"] = "Brocade SMI Provider 采集器";
                            filtered.push(item);

                            break;
                        
                        default :

                            break;
                    }
                }
                callback(null,filtered);
            }

    ], function (err, result) {
            // result now equals 'done'

            callback(result);
    });

};




function getCollectObjects(query, callback) {  

    var config = configger.load();
        
    var REQUIRE_URL = config.BackendMgmt.URL+"/discocenter/devicemgmt/get";

    async.waterfall(
        [
        function(callback){
            BackEndLogin(function(sso_token) { 
    
                var req = unirest( "GET", REQUIRE_URL );

                req.query(query);

                req.headers({ 
                "content-type": "application/x-www-form-urlencoded",
                "referer": config.BackendMgmt.URL,
                "cookie": "JSESSIONIDSSO="+sso_token
                });
                
                req.end(function (res) {
                    if (res.error) console.log(res.error);
                    var xmlstr = res.body;
                    var newdata = xmlstr.replace(/(<input[ a-zA-Z{}0-9.\-=\"]*)(">)/g,'$1"\/>');
                    
                    var options = {
                        object: true 
                    }; 
                    var json = xml2json.toJson(newdata,options); 
                    
                    callback(null,json);

                    //res1.json(200 ,newdata);
                });
            });
            
        },
        function(arg, callback) {
            var headerdata = arg.div.div.table.thead.tr.th
            var tbody = arg.div.div.table.tbody.tr;

            var tab = [];
            var header = {};
            for ( var i in headerdata  ) {
                var item = headerdata[i];

                if ( i >= 0 & i <= 3 ) 
                    header[i] = item;
                else 
                    header[i] = item.input.value;
            }

            for ( var i in tbody) {
                var tbodyItem = tbody[i].td;

                var recordItem = {}; 
                for ( var j in tbodyItem ) {
                    var itemvalue = tbodyItem[j]; 

                    if ( j >= 1 & j <= 3 ) { 
                        switch ( j ) {
                            case '3' :  
                                recordItem[header[j]] = itemvalue;
                                break;
                            case '1' : 
                                recordItem[header[j]] = itemvalue.span;
                                break;
                            case '2' : 
                                recordItem[header[j]] = itemvalue.input.value
                                break;                               
                        } 
                            
                    } else {
                        recordItem[header[j]] = itemvalue.input.value
                    }
                }
                tab.push(recordItem);
            }

            callback(null,tab);
        } 
    ], function (err, result) {
          // result now equals 'done'

          callback(result);
    });
};


