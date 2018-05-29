"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('BackendMgmtController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger'); 
var mongoose = require('mongoose'); 
var backendMgmt = require('../lib/BackendMgmt');
var xml2json = require('xml2json');
var async = require('async'); 
var moment = require('moment');
var urlencode = require('urlencode');

var BackendMgmtController = function (app) {

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



    app.get('/api/backendmgmt/test', function (req, res) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        backendMgmt.BackEndLogin(function(ret) {
            res.json(200 , ret);
        });

 

    });


 
 
   
    app.get('/api/backendmgmt/discocenter/devicemgmt/list', function (req, res1) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        var config = configger.load();

        var REQUIRE_URL = config.BackendMgmt.URL+"/discocenter/devicemgmt/list";

        async.waterfall(
            [
                function(callback){
                    backendMgmt.BackEndLogin(function(sso_token) { 
            
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
                            
                            default :

                                break;
                        }
                    }
                    callback(null,filtered);
                }

            ], function (err, result) {
                  // result now equals 'done'
 
                  res1.json(200 ,result);
            });
        });

  
   
        app.get('/api/backendmgmt/discocenter/devicemgmt/get', function (req, res1) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            var config = configger.load();
    
            var REQUIRE_URL = config.BackendMgmt.URL+"/discocenter/devicemgmt/get";
    
            async.waterfall(
                [
                    function(callback){
                        backendMgmt.BackEndLogin(function(sso_token) { 
                
                            var req = unirest("GET", REQUIRE_URL );

                            req.query({
                                "spId": "emc-vmax-4.1.1",
                                "spbId": "emc-vmax-collect",
                                "spbVersion": "4.1.1",
                                "exportId": "vmax"
                              });

                            req.headers({ 
                            "content-type": "application/x-www-form-urlencoded",
                            "referer": config.BackendMgmt.URL,
                            "cookie": "JSESSIONIDSSO="+sso_token
                            });
                            
                            req.end(function (res) {
                                if (res.error) console.log(res.error);
                                var xmlstr = res.body;
                                var newdata = xmlstr.replace(/(<input[ a-zA-Z{}0-9.=\"]*)(">)/g,'$1"\/>');
             
                                var options = {
                                    object: true 
                                };
                                var json = xml2json.toJson(newdata,options); 
                                //res1.json(200 , jsontab);
                                callback(null,json);
                            });
                        });
                        
                    },
                    function(arg, callback) {
                        var data = arg.div.div.table.thead.tr.th;
                        callback(null,arg);
                    } 
                ], function (err, result) {
                      // result now equals 'done'
     
                      res1.json(200 ,result);
                });
            });



  
            app.get('/api/backendmgmt/discocenter/devicemgmt/test', function (req, res1) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
                var config = configger.load();
        
        
                backendMgmt.BackEndLogin(function(sso_token) { 
         
                    var req = unirest("POST", config.BackendMgmt.URL+"/discocenter/devicemgmt/test");
                    
                    req.headers({ 
                    "content-type": "application/x-www-form-urlencoded",
                    "referer": config.BackendMgmt.URL,
                    "cookie": "JSESSIONIDSSO="+sso_token
                    });
                    
                    var smiinfo = {};
                    smiinfo.host = "1.1.1.1";
                    smiinfo.username = "admin";
                    smiinfo.password = "#1Password";
                    smiinfo.useAdvancedSettings = false;

                    var unisphereInfo = {};
                    unisphereInfo.host = "1.1.1.1";
                    unisphereInfo.username = "smc";
                    unisphereInfo.password = "smc";
                    unisphereInfo.useAdvancedSettings = false;
                    
                    var requreData = {};
                    requreData.server = "sc20a5214";
                    requreData.inEdit = false;
                    
                    requreData.instance = "emc-vmax";
                    var jsonAnswers = {};
                    jsonAnswers.smi = smiinfo;
                    jsonAnswers.unisphere = unisphereInfo;
                    jsonAnswers.vmax_device_type = "2"
                    jsonAnswers.serialnb = "1234567";
                    jsonAnswers.collect_other_perf = "3";
                    jsonAnswers.collect_lun_perf = "2";
                    jsonAnswers.srdfCollection = true

                    var requreDataStr = JSON.stringify(jsonAnswers);
                    requreData.jsonAnswers = requreDataStr;
                    var requreData1 = [];
                    requreData1.push(requreData);
                    var b = JSON.stringify(requreData1);
                    var a = urlencode(b);
                    console.log(a);

                    req.form({
                    "id": "emc-vmax-4.1.1",
                    "block": "emc-vmax-collect",
                    "version": "4.1.1",
                    "spId": "emc-vmax-4.1.1",
                    "spbId": "emc-vmax-collect",
                    "exportId": "vmax",
                    "spbVersion": "4.1.1",
                    //"jsonRows": "[{\"server\":\"sc20a5214\",\"inEdit\":false,\"instance\":\"emc-vmax\",\"jsonAnswers\":\"{\\\"smi\\\":{\\\"host\\\":\\\"1.2.3.4\\\",\\\"username\\\":\\\"admin\\\",\\\"password\\\":\\\"#1Password\\\",\\\"useAdvancedSettings\\\":false},\\\"unisphere\\\":{\\\"host\\\":\\\"5.6.7.8\\\",\\\"username\\\":\\\"smc\\\",\\\"password\\\":\\\"smc\\\",\\\"useAdvancedSettings\\\":false},\\\"vmax_device_type\\\":\\\"2\\\",\\\"serialnb\\\":\\\"1234567890\\\",\\\"collect_other_perf\\\":\\\"3\\\",\\\"collect_lun_perf\\\":\\\"2\\\",\\\"srdfCollection\\\":true}\"}]"
                    "jsonRows" : "%5B%7B%22server%22%3A%22sc20a5214%22%2C%22inEdit%22%3Afalse%2C%22instance%22%3A%22emc-vmax%22%2C%22jsonAnswers%22%3A%22%7B%5C%22smi%5C%22%3A%7B%5C%22host%5C%22%3A%5C%221.2.1.1%5C%22%2C%5C%22username%5C%22%3A%5C%22admin%5C%22%2C%5C%22password%5C%22%3A%5C%22%231Password%5C%22%2C%5C%22useAdvancedSettings%5C%22%3Afalse%7D%2C%5C%22unisphere%5C%22%3A%7B%5C%22host%5C%22%3A%5C%222.2.2.2%5C%22%2C%5C%22username%5C%22%3A%5C%22smc%5C%22%2C%5C%22password%5C%22%3A%5C%22smc%5C%22%2C%5C%22useAdvancedSettings%5C%22%3Afalse%7D%2C%5C%22vmax_device_type%5C%22%3A%5C%222%5C%22%2C%5C%22serialnb%5C%22%3A%5C%2212345%5C%22%2C%5C%22collect_other_perf%5C%22%3A%5C%223%5C%22%2C%5C%22collect_lun_perf%5C%22%3A%5C%222%5C%22%2C%5C%22srdfCollection%5C%22%3Atrue%7D%22%7D%5D"
                    });
                    
                    req.end(function (res) {
                    if (res.error) console.log(res.error);
                    
                    console.log(res.body);
                        res1.json(200 , res.body);
                    });
                    
                });
        
         
        
            });
        

};

module.exports = BackendMgmtController;
