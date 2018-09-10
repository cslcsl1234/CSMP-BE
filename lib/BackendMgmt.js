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
    getCollectObjects,
    testCollectObject


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
                    //console.log(session[1]);

                    // Step 2: call the login api to auth
                    // 
                    var queryString =  {"j_username": config.BackendMgmt.USER, "j_password": config.BackendMgmt.PASSWORD }; 

                    //console.log(queryString);
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
                                    //console.log(login_session[1]);                                     
                                    //console.log(login_response.cookies);
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
                    
                        //console.log(res.body);
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
console.log(query);
console.log(REQUIRE_URL);
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
                    
                    console.log(JSON.stringify(json));
                    callback(null,json);

                    //res1.json(200 ,newdata);
                });
            });
            
        },
        function(arg, callback) {


            /*
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

                var recordItem ; 
                for ( var j in tbodyItem ) {
                    var itemvalue = tbodyItem[j]; 

                    if ( recordItem === undefined ) recordItem = {};

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
                */

                var headerdata = arg.div.div.table.thead.tr.th
                var tbody = arg.div.div.table.tbody.tr;
    
                console.log(headerdata);

                var tab = [];
                var header = {};
                for ( var i in headerdata  ) {
                    var item = headerdata[i];
    
                    if ( i >= 0 & i <= 3 ) 
                        header[i] = item;
                    else 
                        header[i] = item.input.value;
                }
  
                if ( tbody !== undefined ) 
                if ( tbody.constructor === Array ) {
                    for ( var i in tbody) {

                        var tbodyItem = tbody[i].td; 
     
                        var recordItem ; 
                        for ( var j in tbodyItem ) {
                            var itemvalue = tbodyItem[j]; 
        
                            if ( recordItem === undefined ) recordItem = {};
        
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
     
                        if ( recordItem === undefined  )  {
                            console.log("recordItem is null");
                        }
                        else { 
                            tab.push(recordItem);
                        }
     
                        
                    }
                } else {
 
                        var tbodyItem = tbody.td;
     
                        var recordItem ; 
                        for ( var j in tbodyItem ) {
                            var itemvalue = tbodyItem[j]; 
        
                            if ( recordItem === undefined ) recordItem = {};
        
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
     
                    
                        if ( recordItem === undefined  )  {
                            console.log("recordItem is null");
                        }
                        else { 
                            tab.push(recordItem);
                        }
      
                }


            callback(null,tab);
        } 
    ], function (err, result) {
          // result now equals 'done'

          callback(result);
    });
};




function getCollectObjects1(query, callback) {  

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
                    
                    console.log(JSON.stringify(json));
                    callback(null,json);

                    //res1.json(200 ,newdata);
                });
            });
            
        },
        function(arg, callback) {


            /*
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

                var recordItem ; 
                for ( var j in tbodyItem ) {
                    var itemvalue = tbodyItem[j]; 

                    if ( recordItem === undefined ) recordItem = {};

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
                */

                var headerdata = arg.div.div.table.thead.tr.th
                var tbody = arg.div.div.table.tbody.tr;

                console.log(headerdata);
    
                var tab = [];
                var header = {};
                for ( var i in headerdata  ) {
                    var item = headerdata[i];
    
                    if ( i >= 0 & i <= 3 ) 
                        header[i] = item;
                    else 
                        header[i] = item.input.value;
                }

                console.log(header);
    
                for ( var i in tbody) {
                    var tbodyItem = tbody[i].td;
    
                    var recordItem ; 
                    for ( var j in tbodyItem ) {
                        var itemvalue = tbodyItem[j]; 
    
                        if ( recordItem === undefined ) recordItem = {};
    
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

                    console.log(recordItem);

                
                if ( recordItem === undefined  )  {
                    console.log("recordItem is null");
                }
                else { 
                    tab.push(recordItem);
                }
                    
            }

            callback(null,tab);
        } 
    ], function (err, result) {
          // result now equals 'done'

          callback(result);
    });
};

/*   testinfo structure

    {  
        exe_type: "testonly",   [testonly, test&save, delete]
        collecter: 
        {
            "export-id": "unisphere",
            "device-name": "EMC VMAX HYPERMAX",
            "sp-id": "emc-vmax-hypermax-4.1.1",
            "spb-id": "emc-vmax-hypermax-collect",
            "spb-version": "4.1.1",
            "DevCount": "2",
            "collecter-name": "EMC VMAX3 采集器 (VMAX3)"
        },
        Deviceinfo:
        {
            "Server": "s5",
            "Instance": "emc-vmax-sd",
            "vmax.vmax_device_type": "2",
            "vmax.serialnb": "000292600886",
            "vmax.smi.host": "10.1.228.43",
            "vmax.smi.username": "admin",
            "vmax.smi.password": "{657308C2F1BA93DA99088DE1EBFFCC02FB6044D3760D35006FD414126E91B8FF75DEA4C53778590781E0749E7EDABDD6}",
            "vmax.unisphere.host": "10.1.228.209",
            "vmax.unisphere.username": "smc",
            "vmax.unisphere.password": "{54DF658D8A1CBF271213C7FF47DF28E4CACC299C0DAB19FDE4CF5E0CC2B15C19F4B776B454573E182ED961F3495D4296}",
        }
    }
*/
function testCollectObject(testinfo, callback) {  
    var config = configger.load();

    var testBody = testinfo; 
    var query = testBody.collecter; 
    var exeType = testBody.exe_type;

    switch ( query["export-id"] ) {
    case "vmax" :
            var jsonAnswersStr = combineRequestAnswer_vmax(testBody.deviceinfo);
            break;
        case "unisphere" :
            var jsonAnswersStr = combineRequestAnswer_unisphere(testBody.deviceinfo);
            break;
        case "vnx" :

            var jsonAnswersStr = combineRequestAnswer_vnx(testBody.deviceinfo);

            break;
        case "emcxtremio" :
            var jsonAnswersStr = combineRequestAnswer_xtremio(testBody.deviceinfo);
            break;

        case "smiprovider" :
            var jsonAnswersStr = combineRequestAnswer_brocade(testBody.deviceinfo);
            break;
    
        
    }
    

    BackEndLogin(function(sso_token) { 

        var req = unirest("POST", config.BackendMgmt.URL+"/discocenter/devicemgmt/test");
        
        req.headers({ 
            "content-type": "application/x-www-form-urlencoded",
            "referer": config.BackendMgmt.URL,
            "cookie": "JSESSIONIDSSO="+sso_token
        });

        if ( exeType == 'delete' ) {
            var isSave = false;
            devicemgmt_modify(testBody, isSave, function(save_response) {

                var saveJson = JSON.parse(save_response);

                callback(saveJson); 
            })
        } else {
            var requreDataItem = {};
            requreDataItem.server = testBody.deviceinfo["Server"];
            requreDataItem.inEdit = false;
            requreDataItem.instance = testBody.deviceinfo["Instance"];
            requreDataItem.jsonAnswers = jsonAnswersStr;
            
            var requreData = [];
            requreData.push(requreDataItem);
            
            var requreDataStr = JSON.stringify(requreData);
        

            var requireForm = {}
            requireForm.id = query['sp-id'];
            requireForm.block = query['spb-id'];
            requireForm.version = query['spb-version'];
            requireForm.spId = query['sp-id'];
            requireForm.spbId = query['spb-id'];
            requireForm.exportId = query['export-id'];
            requireForm.spbVersion = query['spb-version'];
            requireForm.jsonRows = requreDataStr ; 

            console.log(requireForm); 

            req.form(requireForm);

            req.end(function (res) { 
                if (res.error) console.log("Error:"+res.error);  
                var resbody = res.raw_body;
                var resbodyJson = JSON.parse(resbody);
                //console.log(resbodyJson.testResult.status);
                if ( exeType == "testonly" ) {
                    callback(resbodyJson);
                } else  { 
                    var isSave = true; 
                    if  ( resbodyJson.testResult.status == 'SUCCESS' ) {
                        devicemgmt_modify(testBody, isSave, function(save_response) {

                            var saveJson = JSON.parse(save_response);
                            var errCount = saveJson.saveErrors.length;
                            var warnCount = saveJson.saveWarnings.length;

                            if ( errCount == 0 && warnCount == 0 ) {
                                callback(resbodyJson);
                            } else 
                                callback(resbodyJson);
                        })
                    } else {
                        console.log("Test is failed. It is not saved!");
                        callback(resbodyJson);
                    }
                }

                
            });
            
        }


    });

};




/*
*   Functions 
*/
function devicemgmt_modify ( testBody , isSave ,  callback ) {
    var config = configger.load();

    var query = testBody.collecter; 


   switch ( query["export-id"] ) {
       case "vmax" :
            var jsonAnswersStr = combineRequestAnswer_vmax(testBody.deviceinfo);
            break;
        case "unisphere" :
            var jsonAnswersStr = combineRequestAnswer_unisphere(testBody.deviceinfo);
            break;
        case "vnx" :

            var jsonAnswersStr = combineRequestAnswer_vnx(testBody.deviceinfo);

            break;
        case "emcxtremio" :
            var jsonAnswersStr = combineRequestAnswer_xtremio(testBody.deviceinfo);
            break;

        case "smiprovider" :
            var jsonAnswersStr = combineRequestAnswer_brocade(testBody.deviceinfo);
            break;
       
        
    }
     

    BackEndLogin(function(sso_token) { 

        var req = unirest("POST", config.BackendMgmt.URL+"/discocenter/devicemgmt/save");
        
        req.headers({ 
            "content-type": "application/x-www-form-urlencoded",
            "referer": config.BackendMgmt.URL,
            "cookie": "JSESSIONIDSSO="+sso_token
        });



        var requreDataItem = {};
        requreDataItem.server = testBody.deviceinfo["Server"];
        requreDataItem.instance = testBody.deviceinfo["Instance"];
        
        if ( isSave == true ) {
            requreDataItem.isDeleted = false;
            requreDataItem.isModified = true;
        } else {
            requreDataItem.isDeleted = true;
            requreDataItem.isModified = false;
        }

        requreDataItem.jsonAnswers = jsonAnswersStr;
        
        var requreData = [];
        requreData.push(requreDataItem);
         
        var requreDataStr = JSON.stringify(requreData);
      

        var requireForm = {}   
        requireForm.spId = query['sp-id'];
        requireForm.spbId = query['spb-id'];
        requireForm.exportId = query['export-id'];
        requireForm.spbVersion = query['spb-version'];
        requireForm.jsonRows = requreDataStr ; 

        //console.log(requireForm); 

        req.form(requireForm);

        req.end(function (res) {
        if (res.error) console.log(res.error);  
            var resbody = res.raw_body;
            console.log(resbody);
            //var resbodyJson = JSON.parse(resbody); 
            callback(resbody);
        });
        
    });

};
 


function combineRequestAnswer_vmax( deviceinfo ) {
 

    var smiinfo = {};
    smiinfo.host = deviceinfo["vmax.smi.host"] ;
    smiinfo.username = deviceinfo["vmax.smi.username"] ;
    smiinfo.password = deviceinfo["vmax.smi.password"] ;
    smiinfo.useAdvancedSettings = "false" ;

    var unisphereInfo = {};
    unisphereInfo.host = deviceinfo["vmax.unisphere.host"] ;
    unisphereInfo.username = deviceinfo["vmax.unisphere.username"] ;
    unisphereInfo.password = deviceinfo["vmax.unisphere.password"] ;
    unisphereInfo.useAdvancedSettings = "false" ;

    var jsonAnswers = {};
    jsonAnswers.smi = smiinfo;
    jsonAnswers.unisphere = unisphereInfo;
    jsonAnswers.vmax_device_type = deviceinfo["vmax.vmax_device_type"] ;
    jsonAnswers.serialnb = deviceinfo["vmax.serialnb"] ;
    jsonAnswers.collect_other_perf = "3" ;
    jsonAnswers.collect_lun_perf = "2" ;
    jsonAnswers.srdfCollection = "true" ;

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}


function combineRequestAnswer_vnx( deviceinfo ) {

    var block = {};
    block.spa = deviceinfo["vnx.block.spa"];
    block.spb = deviceinfo["vnx.block.spb"];
    block.use_secfile = deviceinfo["vnx.block.use_secfile"] === undefined ? false : deviceinfo["vnx.block.use_secfile"]; 
    block.userscope = deviceinfo["vnx.block.userscope"] === undefined ? 2 :  deviceinfo["vnx.block.userscope"] ;
    block.username = deviceinfo["vnx.block.username"];
    block.password = deviceinfo["vnx.block.password"];
 
    var file = {};
    file.csprimary = deviceinfo["vnx.file.csprimary"];
    file.userscope = deviceinfo["vnx.file.userscope"];
    file.username = deviceinfo["vnx.file.username"];
    file.password = deviceinfo["vnx.file.password"];

    var jsonAnswers = {};
    jsonAnswers.block = block;
    jsonAnswers.file = file;

    var vnxtype = 1;
    switch (deviceinfo["vnx.type"] ) {
        case "VNX Block Only":
            vnxtype = 1;
            break;
        case "VNX NAS Gateway/eNAS":
            vnxtype = 2;
            break;
        case "VNX Unified/File":
            vnxtype = 3;
            break;
        case "Unity/VNXe2":
            vnxtype = 4;
            break; 
            
    }
    jsonAnswers.type = vnxtype; 
    jsonAnswers.friendlyname = deviceinfo["vnx.friendlyname"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}



function combineRequestAnswer_unisphere( deviceinfo ) {

    var jsonAnswers = {};
    jsonAnswers.host = deviceinfo["unisphere.host"]; 
    jsonAnswers.port = deviceinfo["unisphere.port"];
    jsonAnswers.username = deviceinfo["unisphere.username"];
    jsonAnswers.password = deviceinfo["unisphere.password"];
    jsonAnswers.serialnbIncludeList = deviceinfo["unisphere.serialnbIncludeList"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}



function combineRequestAnswer_xtremio( deviceinfo ) {

    var jsonAnswers = {};
    console.log(deviceinfo);
    jsonAnswers.host = deviceinfo["emcxtremio.host"];  
    jsonAnswers.username = deviceinfo["emcxtremio.username"];
    jsonAnswers.password = deviceinfo["emcxtremio.password"];
    jsonAnswers.timezone = deviceinfo["emcxtremio.timezone"];
    jsonAnswers.version = deviceinfo["emcxtremio.version"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}


function combineRequestAnswer_brocade( deviceinfo ) {

    var jsonAnswers = {};
    jsonAnswers.host = deviceinfo["smiprovider.host"];  
    jsonAnswers.username = deviceinfo["smiprovider.username"];
    jsonAnswers.password = deviceinfo["smiprovider.password"];
    jsonAnswers.usesecure = ( deviceinfo["smiprovider.usesecure"] === undefined ) ? ( deviceinfo["smiprovider.port"] == "5989" ? true : false ) : deviceinfo["smiprovider.usesecure"] ;
    jsonAnswers.port = deviceinfo["smiprovider.port"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
 

    return jsonAnswersStr;
}
