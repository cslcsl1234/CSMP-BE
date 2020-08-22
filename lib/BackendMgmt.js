"use strict";
const logger = require("../lib/logger")(__filename);

var async = require('async');
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');
var jp = require('jsonpath');
var xml2json = require('xml2json');
var fs = require('fs');
var xml2js = require('xml2js');



module.exports = {
    BackEndLogin,
    BackEndLoginV1,
    BackEndLogout,
    getBackendServerList,
    getBackendServerStatus,


    getCollectCatalogs,
    getCollectObjects,
    testCollectObject,
    getCollectCatalogs1


}




function BackEndLogin(callback) {
    var BEInfo = {
        sso_token: "",
        BEVersion: "0.0"
    }
    var config = configger.load();
    var req = unirest("GET", `${config.BackendMgmt.URL}/empty.html`);
    req.end(function (response) {
        if (response.error) {
            logger.error(response.error);
            callback({});
        } else {
            var sessionid = response.headers['set-cookie'][0];
            var session = sessionid.match(/JSESSIONID=([A-Z0-9]*);[ a-zA-Z0-9=;/]*/i);
            //logger.info(session[1]);

            var resString = response.body.toString();
            var versionArray = resString.match(/Version ([0-9].[0-9]*)[u]*[0-9]*/i);
            if (versionArray != null) {
                var version = versionArray[1];
            }
            logger.info(`Backend Version = [ ${version} ]`);
            BEInfo.BEVersion = version;

            switch (version) {
                case '4.4':
                    unirest('POST', `${config.BackendMgmt.URL}/j_security_check`)
                        .headers({ 'Cookie': 'JSESSIONID=' + session[1] })
                        .query('j_username=admin&j_password=changeme')
                        .end((login_response) => {
                            if (login_response.error) {
                                logger.error(login_response.error);
                                return login_response.error;
                            } else {
                                //logger.info(login_response);   
                                var login_sessionid = login_response.headers['set-cookie'][0];
                                var login_sso_token = login_response.cookies.JSESSIONIDSSO;
                                BEInfo.sso_token = login_sso_token;
                                callback(BEInfo);
                            }
                        });
                    break;
                default:
                    let req1 = unirest.post(`${config.BackendMgmt.URL}/j_security_check?j_username=admin&j_password=changeme`);
                    req1.header('Cookie', 'JSESSIONID=' + session[1]);
                    req1.header('referer', 'https://csmpcollecter:58443/centralized-management/empty.html');
                    req1.query('j_username=admin&j_password=changeme')
                    req1.end(function (login_response) {
                        if (login_response.error) {
                            logger.error(login_response.error);
                            return login_response.error;
                        } else {
                            //logger.info(login_response);   
                            var login_sessionid = login_response.headers['set-cookie'][0];
                            var login_sso_token = login_response.cookies.JSESSIONIDSSO;
                            BEInfo.sso_token = login_sso_token;
                            callback(BEInfo);
                        }
                    })
                    break;
            }

        }


    });

}


function BackEndLoginV1(callback) {
    var config = configger.load();


    // Step 1: begin the first call for get a sessionid-A.
    unirest.get(config.BackendMgmt.URL)
        .end(function (response) {
            if (response.error) {
                logger.error(response.error);
                return response.error;
            } else {
                //logger.info(response);   
                var sessionid = response.headers['set-cookie'][0];
                var session = sessionid.match(/JSESSIONID=([A-Z0-9]*);[ a-zA-Z0-9=;/]*/i);
                //logger.info(session[1]);

                // Step 2: call the login api to auth
                // 
                var queryString = { "j_username": config.BackendMgmt.USER, "j_password": config.BackendMgmt.PASSWORD };

                //logger.info(queryString);
                unirest.post(config.BackendMgmt.URL + "/j_security_check")
                    .headers({ 'Cookie': 'JSESSIONID=' + session[1] })
                    .query('j_username=admin&j_password=changeme')
                    .end(function (login_response) {
                        if (login_response.error) {
                            logger.error(login_response.error);
                            return login_response.error;
                        } else {
                            //logger.info(login_response);   
                            var login_sessionid = login_response.headers['set-cookie'][0];
                            var login_session = login_sessionid.match(/JSESSIONID=([A-Z0-9]*);[ a-zA-Z0-9=;/]*/i);
                            //logger.info(login_session[1]);                                     
                            //logger.info(login_response.cookies);
                            var login_sso_token = login_response.cookies.JSESSIONIDSSO;
                            callback(login_sso_token);

                            /*
                            // Step 1: begin the first call for get a sessionid-A.
                            unirest.get(config.BackendMgmt.URL)
                                    .headers({'Cookie':'JSESSIONID='+login_session[1]}) 
                                    .end(function (response1) { 
                                        if ( response1.error ) {
                                            logger.error(response1.error);
                                            return response1.error;
                                        } else {  
                                            //logger.info(response);    
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



    var queryString = { 'properties': fields, 'filter': filter, 'start': start, 'end': end, period: '86400' };
    //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 


    unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
        .headers({ 'Content-Type': 'multipart/form-data' })
        .query(queryString)
        .end(function (response) {
            if (response.error) {
                logger.error(response.error);
                return response.error;
            } else {
                //logger.info(response.raw_body);   
                var resultRecord = response.raw_body;
                callback(null, resultRecord);
            }

        });
};

function getBackendServerList(callback) {
    var config = configger.load();

    var REQUIRE_URL = config.BackendMgmt.URL + "/discocenter/devicemgmt/edit";

    var serverListFile = "BackendServerList";
    fs.exists("./data/" + serverListFile + ".json", function (exists) {
        if (exists) {
            logger.info("server list file is exists! " + serverListFile + ".json");
            var serverList = require("../data/" + serverListFile);
            callback(serverList);
        } else {
            logger.info("server list file is NOT exists! Create it...  ...");
            executeGetBackendServerList(function (serverList) {

                var serverListJson = JSON.stringify(serverList);
                fs.writeFile("./data/" + serverListFile + ".json", serverListJson, function (err) {
                    if (err) {
                        logger.error(err);
                    };
                    callback(serverList);
                })


            })
        }
    })

};

function executeGetBackendServerList(callback) {
    var config = configger.load();
    var url = '/overview/physical';
    var REQUIRE_URL = config.BackendMgmt.URL + url;

    async.waterfall(
        [
            function (callback) {
                BackEndLogin(function (BEInfo) {
                    var sso_token = BEInfo.sso_token;
                    var BEVersion = BEInfo.BEVersion;

                    var req = unirest("GET", REQUIRE_URL);

                    req.headers({
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO=" + sso_token
                    });

                    req.end(function (res) {
                        if (res.error) logger.error(res.error);


                        var xmlstr = "<div>" + res.body + "</div>";
                        var options = {
                            object: true
                        };
                        var json = xml2json.toJson(xmlstr, options);

                        var serverList = [];
                        for (var i in json.div.div.div) {
                            var item = json.div.div.div[i];
                            if (item.id === undefined) continue;

                            var serverItem = {};
                            serverItem["id"] = item.id;
                            serverItem["name"] = item.h2.a['$t'];
                            serverItem["type"] = item.h2.a["title"];
                            serverList.push(serverItem);
                        }

                        callback(null, serverList);
                    });
                });

            }

        ], function (err, result) {
            callback(result);
        });
};


function getBackendServerStatus(serverid, callback) {
    var config = configger.load();
    var url = '/polling/server?server=' + serverid;
    var REQUIRE_URL = config.BackendMgmt.URL + url;

    async.waterfall(
        [
            function (callback) {
                BackEndLogin(function (BEInfo) {
                    var sso_token = BEInfo.sso_token;
                    var BEVersion = BEInfo.BEVersion;


                    var req = unirest("GET", REQUIRE_URL);

                    req.headers({
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO=" + sso_token
                    });

                    req.end(function (res) {
                        if (res.error) logger.error(res.error);


                        callback(null, res);
                    });
                });

            }

        ], function (err, result) {
            callback(result);
        });
};


function getCollectCatalogs1(callback) {
    var config = configger.load();

    var REQUIRE_URL = config.BackendMgmt.URL + "/discocenter/devicemgmt/list";

    async.waterfall(
        [
            function (callback) {
                BackEndLogin(function (BEInfo) {
                    var sso_token = BEInfo.sso_token;
                    var BEVersion = BEInfo.BEVersion;


                    var req = unirest("GET", REQUIRE_URL);

                    req.headers({
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO=" + sso_token
                    });

                    logger.info(REQUIRE_URL);
                    logger.info(config.BackendMgmt.URL);
                    logger.info("JSESSIONIDSSO=" + sso_token)
                    req.end(function (res) {
                        if (res.error) logger.error(res.error);
                        callback(null, res.body);
                    });
                });

            }
        ], function (err, result) {
            // result now equals 'done'

            callback(result);
        });

};



function getCollectCatalogs(callback) {
    var config = configger.load();

    var REQUIRE_URL = config.BackendMgmt.URL + "/discocenter/devicemgmt/list";
    var BEVersion;
    async.waterfall(
        [
            function (callback) {
                BackEndLogin(function (BEInfo) {
                    //logger.info(BEInfo);
                    var sso_token = BEInfo.sso_token;
                    BEVersion = BEInfo.BEVersion;


                    var req = unirest("GET", REQUIRE_URL);

                    req.headers({
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO=" + sso_token
                    });

                    logger.info(REQUIRE_URL);
                    logger.info(config.BackendMgmt.URL);
                    logger.info("JSESSIONIDSSO=" + sso_token)
                    req.end(function (res) {
                        if (res.error) logger.error(res.error);

                        //logger.info(res.body);
                        var xmlstr = "<div>" + res.body + "</div>";
                        var options = {
                            object: true
                        };
                        var json = xml2json.toJson(xmlstr, options);

                        //res1.json(200 , jsontab);
                        callback(null, json);
                    });
                });

            },
            function (json, callback) {
                var arg = json.div.div.table.tbody.tr;
                var tabResult = [];
                for (var i in arg) {
                    var item = arg[i];
                    var input = item.td[0].input;
                    var tabResultItem = {};
                    for (var j in input) {
                        var inputItem = input[j];
                        tabResultItem[inputItem.name] = inputItem.value;
                    }
                    switch (BEVersion) {
                        case '4.4':
                            tabResultItem['DevCount'] = item.td[1];
                            break;
                        default:
                            tabResultItem['DevCount'] = item.td[3];
                            break;
                    }
                    tabResult.push(tabResultItem);


                }
                callback(null, tabResult);
            },
            function (arg, callback) {

                var filtered = [];
                for (var i in arg) {
                    var item = arg[i];
                    item["collecter-name"] = item["device-name"] + ' 采集器';
                    filtered.push(item);
                }
                callback(null, filtered);
            }

        ], function (err, result) {
            // result now equals 'done'

            callback(result);
        });

};




function getCollectObjects(query, callback) {

    var config = configger.load();

    var REQUIRE_URL = config.BackendMgmt.URL + "/discocenter/devicemgmt/get";

    async.waterfall(
        [
            function (callback) {
                BackEndLogin(function (BEInfo) {
                    var sso_token = BEInfo.sso_token;
                    var BEVersion = BEInfo.BEVersion;
                    var req = unirest("GET", REQUIRE_URL);

                    req.query(query);
                    logger.info(query);
                    logger.info(REQUIRE_URL);
                    req.headers({
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO=" + sso_token
                    });


                    req.end(function (res) {
                        if (res.error) logger.error(res.error);
                        var xmlstr = res.body;

                        var newdata = xmlstr.replace(/(<input[ a-zA-Z{}0-9.\-=\"\_,\&\;\[\]]*)(">)/g, '$1"\/>');

                        var parser = new xml2js.Parser();
                        parser.parseString(newdata, function (err, result) {
                            callback(null, result);
                        });
                    });
                });

            },
            function (arg, callback) {
                var headerdata = arg.div.div[0].table[0].thead[0].tr[0].th
                var tbody = arg.div.div[0].table[0].tbody[0].tr;

                var tab = [];
                var header = {};
                for (var i in headerdata) {
                    var item = headerdata[i];

                    if (i >= 0 & i <= 3)
                        header[i] = item;
                    else
                        header[i] = item.input[0].$.value;
                }

                if (tbody !== undefined)
                    for (var i in tbody) {

                        var tbodyItem = tbody[i].td;

                        var recordItem = {};
                        for (var j in tbodyItem) {
                            var itemvalue = tbodyItem[j];

                            if (j >= 1 & j <= 3) {
                                switch (j) {
                                    case '3':
                                        recordItem[header[j]] = itemvalue;
                                        break;
                                    case '1':
                                        recordItem[header[j]] = itemvalue.span[0].$;
                                        break;
                                    case '2':
                                        recordItem[header[j]] = itemvalue.input[0].$.value
                                        break;
                                }

                            } else {
                                recordItem[header[j]] = itemvalue.input[0].$.value
                            }
                        }
                        if (recordItem === undefined) {
                            logger.info("recordItem is null");
                        }
                        else {
                            tab.push(recordItem);
                        }
                    }

                callback(null, tab);
            }
        ], function (err, result) {
            callback(result);


        });
};


function getCollectObjects_xml2json(query, callback) {

    var config = configger.load();

    var REQUIRE_URL = config.BackendMgmt.URL + "/discocenter/devicemgmt/get";

    async.waterfall(
        [
            function (callback) {
                BackEndLogin(function (BEInfo) {
                    var sso_token = BEInfo.sso_token;
                    var BEVersion = BEInfo.BEVersion;


                    var req = unirest("GET", REQUIRE_URL);

                    req.query(query);
                    logger.info(query);
                    logger.info(REQUIRE_URL);
                    req.headers({
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO=" + sso_token
                    });


                    req.end(function (res) {
                        logger.info("query result is done");
                        if (res.error) logger.error(res.error);
                        var xmlstr = res.body;

                        var newdata = xmlstr.replace(/(<input[ a-zA-Z{}0-9.\-=\"\_,&;]*)(">)/g, '$1"\/>');

                        /**

                        var options = {
                            object: true
                        };
                        var json = xml2json.toJson(newdata, options); 
                        callback(null, json);

                         */
                        var parser = new xml2js.Parser();
                        parser.parseString(newdata, function (err, result) {
                            callback(null, result);
                        });
                    });
                });

            },
            function (arg, callback) {
                logger.info(JSON.stringify(arg));

                var headerdata = arg.div.div.table.thead.tr.th
                var tbody = arg.div.div.table.tbody.tr;

                //logger.info(headerdata);

                var tab = [];
                var header = {};
                for (var i in headerdata) {
                    var item = headerdata[i];

                    if (i >= 0 & i <= 3)
                        header[i] = item;
                    else
                        header[i] = item.input.value;
                }

                if (tbody !== undefined)
                    if (tbody.constructor === Array) {
                        for (var i in tbody) {

                            var tbodyItem = tbody[i].td;

                            var recordItem = {};
                            for (var j in tbodyItem) {
                                var itemvalue = tbodyItem[j];

                                if (j >= 1 & j <= 3) {
                                    switch (j) {
                                        case '3':
                                            recordItem[header[j]] = itemvalue;
                                            break;
                                        case '1':
                                            recordItem[header[j]] = itemvalue.span;
                                            break;
                                        case '2':
                                            recordItem[header[j]] = itemvalue.input.value
                                            break;
                                    }

                                } else {
                                    recordItem[header[j]] = itemvalue.input.value
                                }
                            }
                            if (recordItem === undefined) {
                                logger.info("recordItem is null");
                            }
                            else {
                                tab.push(recordItem);
                            }


                        }
                    } else {
                        logger.info("IS NOT ARRAY");
                        var tbodyItem = tbody.td;

                        var recordItem;
                        for (var j in tbodyItem) {
                            var itemvalue = tbodyItem[j];

                            if (recordItem === undefined) recordItem = {};

                            if (j >= 1 & j <= 3) {
                                switch (j) {
                                    case '3':
                                        recordItem[header[j]] = itemvalue;
                                        break;
                                    case '1':
                                        recordItem[header[j]] = itemvalue.span;
                                        break;
                                    case '2':
                                        recordItem[header[j]] = itemvalue.input.value
                                        break;
                                }

                            } else {
                                recordItem[header[j]] = itemvalue.input.value
                            }
                        }


                        if (recordItem === undefined) {
                            logger.info("recordItem is null");
                        }
                        else {
                            tab.push(recordItem);
                        }

                    }

                callback(null, tab);
            }
        ], function (err, result) {
            // result now equals 'done'
            logger.info("TEST2==" + result.length + "--");
            callback(result);


        });
};




/*   testinfo structure

    {  
        exe_type: "testonly",   [testonly, new, e dit, delete]
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
        deviceinfo:
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

    var objQuery = {};
    objQuery.spId = query["sp-id"];
    objQuery.spbId = query["spb-id"];
    objQuery.spbVersion = query["spb-version"];
    objQuery.exportId = query["export-id"];

    var jsonAnswersStr = chooseJSONAnswer(objQuery, testBody.deviceinfo);
    async.waterfall(
        [
            function (callback) {

                BackEndLogin(function (BEInfo) {
                    var sso_token = BEInfo.sso_token;
                    var BEVersion = BEInfo.BEVersion;

                    if (exeType == 'delete') {
                        var isSave = false;
                        devicemgmt_modify(testBody, isSave, function (save_response) {

                            var saveJson = JSON.parse(save_response);

                            callback(null, saveJson);
                        })
                    } else {
                        var requreDataItem = {};
                        requreDataItem.server = testBody.deviceinfo["Server"];
                        //requreDataItem.inEdit = true;  // testonly
                        requreDataItem.isDeleted = false;
                        requreDataItem.isModified = false;
                        requreDataItem.instance = testBody.deviceinfo["Instance"];
                        requreDataItem.jsonAnswers = jsonAnswersStr;

                        var requreData = [];
                        requreData.push(requreDataItem);

                        var requreDataStr = JSON.stringify(requreData);

                        var requireForm = {}
                        requireForm.spId = query['sp-id'];
                        requireForm.spbId = query['spb-id'];
                        requireForm.spbVersion = query['spbVersion'];
                        requireForm.exportId = query['export-id'];
                        requireForm.jsonRows = requreDataStr;


                        var req = unirest("POST", config.BackendMgmt.URL + "/discocenter/devicemgmt/test");

                        req.headers({
                            "content-type": "application/x-www-form-urlencoded",
                            "referer": config.BackendMgmt.URL,
                            "cookie": "JSESSIONIDSSO=" + sso_token
                        });
                        //logger.info(sso_token);
                        logger.info(requireForm);
                        req.form(requireForm);

                        req.end(function (res) {
                            if (res.error) logger.error("Error:" + res.error);
                            var resbody = res.raw_body;
                            var resbodyJson = JSON.parse(resbody);
                            //logger.info(resbodyJson.testResult.status);
                            //logger.info(resbodyJson);
                            callback(null, resbodyJson);

                        });


                    }


                });
            },
            function (resbodyJson, callback) {

                switch (exeType) {
                    case 'delete':
                    case 'testonly':
                        callback(null, resbodyJson);
                        break;
                    default:
                        var isSave = true;


                        /* FOR TEST
                        if (resbodyJson.testResult.status == 'SUCCESS') {
                            logger.info("Test is Succeed! Begin execute save operate...")

                            devicemgmt_modify(testBody, isSave, function (save_response) { 
                                var saveJson = JSON.parse(save_response);
                                var errCount = saveJson.saveErrors.length;
                                var warnCount = saveJson.saveWarnings.length;

                                if (errCount == 0 && warnCount == 0) {
                                    callback(null, resbodyJson);
                                } else
                                    callback(null, resbodyJson);
                            })
                        } else {
                            logger.info("Test is failed! It is not saved!");
                            callback(null, resbodyJson);
                        } 

                        */
                        devicemgmt_modify(testBody, isSave, function (save_response) {
                            var saveJson = JSON.parse(save_response);
                            var errCount = saveJson.saveErrors.length;
                            var warnCount = saveJson.saveWarnings.length;

                            if (errCount == 0 && warnCount == 0) {
                                callback(null, resbodyJson);
                            } else
                                callback(null, resbodyJson);
                        })
                        break;
                }



            }
            ,
            function (arg1, callback) {
                BackEndLogin(function (BEInfo) {
                    var sso_token = BEInfo.sso_token;
                    var BEVersion = BEInfo.BEVersion;


                    var req = unirest("POST", config.BackendMgmt.URL + "/discocenter/devicemgmt/test");

                    req.headers({
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO=" + sso_token
                    });

                    var requreDataItem = {};
                    requreDataItem.server = testBody.deviceinfo["Server"];
                    requreDataItem.inEdit = false;
                    requreDataItem.instance = testBody.deviceinfo["Instance"];
                    requreDataItem.jsonAnswers = jsonAnswersStr;

                    var requreData = [];
                    requreData.push(requreDataItem);

                    var requreDataStr = JSON.stringify(requreData);

                    var requireForm = {}
                    requireForm.spId = query['sp-id'];
                    requireForm.spbId = query['spb-id'];
                    requireForm.spbVersion = query['spbVersion'];
                    requireForm.exportId = query['export-id'];
                    requireForm.jsonRows = requreDataStr;

                    logger.info(requireForm);
                    req.form(requireForm);

                    req.end(function (res) {
                        if (res.error) logger.error("Error:" + res.error);
                        var resbody = res.raw_body;
                        var resbodyJson = JSON.parse(resbody);
                        logger.info(resbodyJson.testResult.status);
                        callback(null, resbodyJson);

                    }); 
                }); 
            }
        ], function (err, result) {
            logger.info("======\n Device Test operate is completed \n ======");
            logger.info(result);
            callback(result);
        });


};




/*
*   Functions 
*/
function devicemgmt_modify1(testBody, isSave, callback) {
    fd
    var config = configger.load();

    var query = testBody.collecter;
    var objQuery = {};
    objQuery.spId = query["sp-id"];
    objQuery.spbId = query["spb-id"];
    objQuery.spbVersion = query["spb-version"];
    objQuery.exportId = query["export-id"];

    logger.info(" ==== begin devicemgmt_modify ==== ");
    var jsonAnswersStr = chooseJSONAnswer(objQuery, testBody.deviceinfo);
    async.waterfall(
        [
            function (callback) {
                BackEndLogin(function (BEInfo) {
                    var sso_token = BEInfo.sso_token;
                    var BEVersion = BEInfo.BEVersion;

                    var requreDataItem = {};
                    requreDataItem.server = testBody.deviceinfo["Server"];
                    requreDataItem.inDeleted = false;
                    requreDataItem.isModified = true;
                    requreDataItem.instance = testBody.deviceinfo["Instance"];
                    requreDataItem.jsonAnswers = jsonAnswersStr;

                    var requreData = [];
                    requreData.push(requreDataItem);


                    var req = unirest("POST", config.BackendMgmt.URL + "/discocenter/devicemgmt/save");

                    req.headers({
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO=" + sso_token
                    });

                    var requreDataStr = JSON.stringify(requreData);

                    var requireForm = {}
                    requireForm.spId = query['sp-id'];
                    requireForm.spbId = query['spb-id'];
                    requireForm.exportId = query['export-id'];
                    requireForm.spbVersion = query['spb-version'];
                    requireForm.jsonRows = requreDataStr;

                    logger.info(requireForm);

                    req.form(requireForm);

                    req.end(function (res) {
                        if (res.error) logger.error(res.error);
                        var resbody = res.raw_body;
                        logger.info(resbody);
                        //var resbodyJson = JSON.parse(resbody); 
                        callback(null, resbody);
                    });

                });
            }
        ], function (err, result) {
            // result now equals 'done'
            callback(result);
        });

};

function devicemgmt_modify(testBody, isSave, callback) {
    var config = configger.load();

    var query = testBody.collecter;
    var objQuery = {};
    objQuery.spId = query["sp-id"];
    objQuery.spbId = query["spb-id"];
    objQuery.spbVersion = query["spb-version"];
    objQuery.exportId = query["export-id"];

    logger.info(" ==== begin devicemgmt_modify ==== ");


    async.waterfall(
        [
            function (callback) {

                var requreData = [];
                getCollectObjects(objQuery, function (result) {

                    for (var i in result) {
                        var deviceinfo = result[i];


                        logger.info("=================\nStep 1: Get All device info exists already. \n====================\n\n");
                        logger.info(deviceinfo);

                        var requreDataItem = {};
                        requreDataItem.server = deviceinfo["Server"];
                        requreDataItem.instance = deviceinfo["Instance"];
                        requreDataItem.isDeleted = false;
                        requreDataItem.isModified = false;

                        var jsonAnswersStr = chooseJSONAnswer(objQuery, deviceinfo);


                        requreDataItem.jsonAnswers = jsonAnswersStr;

                        requreData.push(requreDataItem);

                    }


                    callback(null, requreData);

                });


            },
            // Get All Localtion Records
            function (requreData, callback) {

                logger.info("=================\nStep 2: combine the new device info. \n====================\n\n");


                var requreDataItem = {};
                requreDataItem.server = testBody.deviceinfo["Server"];
                requreDataItem.instance = testBody.deviceinfo["Instance"];

                if (isSave == true) {
                    requreDataItem.isDeleted = false;
                    requreDataItem.isModified = true;
                } else {
                    requreDataItem.isDeleted = true;
                    requreDataItem.isModified = false;
                }


                var jsonAnswersStr = chooseJSONAnswer(objQuery, testBody.deviceinfo);


                requreDataItem.jsonAnswers = jsonAnswersStr;
                logger.info(requreDataItem);


                var requireDataNew = [];
                var isfind = false;
                if (requreData.length > 0)
                    for (var i in requreData) {
                        var item = requreData[i];

                        switch (query["export-id"]) {

                            case "smiprovider":
                                if (item.jsonAnswers.host == jsonAnswersStr.host) {
                                    isfind = true;
                                    requireDataNew.push(requreDataItem);
                                } else {
                                    requireDataNew.push(item);
                                }
                                break;
                            default:
                                if (item.jsonAnswers == jsonAnswersStr) {
                                    isfind = true;
                                    requireDataNew.push(requreDataItem);
                                } else {
                                    requireDataNew.push(item);
                                }
                                break;

                        }
                    }
                else
                    requireDataNew.push(requreDataItem);

                if (isfind == false)
                    requireDataNew.push(requreDataItem);

                callback(null, requireDataNew);

            },
            function (requreData, callback) {

                logger.info("=================\nStep 3: send request to backend server to execute. \n====================\n\n");


                BackEndLogin(function (BEInfo) {
                    var sso_token = BEInfo.sso_token;
                    var BEVersion = BEInfo.BEVersion;


                    var req = unirest("POST", config.BackendMgmt.URL + "/discocenter/devicemgmt/save");

                    req.headers({
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": config.BackendMgmt.URL,
                        "cookie": "JSESSIONIDSSO=" + sso_token
                    });

                    var requreDataStr = JSON.stringify(requreData);

                    var requireForm = {}
                    requireForm.spId = query['sp-id'];
                    requireForm.spbId = query['spb-id'];
                    requireForm.exportId = query['export-id'];
                    requireForm.spbVersion = query['spb-version'];
                    requireForm.jsonRows = requreDataStr;

                    logger.info(requireForm);

                    req.form(requireForm);

                    req.end(function (res) {
                        if (res.error) logger.error(res.error);
                        var resbody = res.raw_body;
                        logger.info(resbody);
                        //var resbodyJson = JSON.parse(resbody); 
                        callback(null, resbody);
                    });

                });
            }
        ], function (err, result) {
            logger.info("=================\nStep 4: execute complete. \n====================\n\n");
            logger.info(result);
            callback(result);
        });

};

/*
objQuery.spId = query["sp-id"];
objQuery.spbId = query["spb-id"];
objQuery.spbVersion = query["spb-version"];
objQuery.exportId = query["export-id"];
*/

function chooseJSONAnswer(objQuery, deviceinfo) {
    var jsonAnswersStr = {};


    switch (objQuery.exportId) {
        case "vmax":
            jsonAnswersStr = combineRequestAnswer_vmax(deviceinfo);
            break;
        case "unisphere":
            jsonAnswersStr = combineRequestAnswer_unisphere(deviceinfo);
            break;
        case "vnx":

            jsonAnswersStr = combineRequestAnswer_vnx(deviceinfo);

            break;
        case "emcxtremio":
            jsonAnswersStr = combineRequestAnswer_xtremio(deviceinfo);
            break;

        case "smiprovider":
            jsonAnswersStr = combineRequestAnswer_brocade(deviceinfo);
            break;

        case "discoverycontext":
            jsonAnswersStr = combineRequestAnswer_brocadeV2(deviceinfo);
            break;

        case "snmpagent":
            switch (objQuery.spbId) {
                case "emc-data-domain-collect":
                    jsonAnswersStr = combineRequestAnswer_datadomain(deviceinfo);
                    break;
                case "cisco-mds-nexus-collect":
                    jsonAnswersStr = combineRequestAnswer_cisco(deviceinfo);
                    break;

            }
            break;

        case "vplex":
            jsonAnswersStr = combineRequestAnswer_vplex(deviceinfo);
            break;

        case "emcisilon.system":
            jsonAnswersStr = combineRequestAnswer_isilon(deviceinfo);
            break;



        case "rp":
            jsonAnswersStr = combineRequestAnswer_recoverpoint(deviceinfo);
            break;

        case "unisphere":
            jsonAnswersStr = combineRequestAnswer_hypermax(deviceinfo);
            break;

        case "ecs":
            jsonAnswersStr = combineRequestAnswer_ecs(deviceinfo);
            break;


        case "netapp":
            jsonAnswersStr = combineRequestAnswer_netapp(deviceinfo);
            break;

        default:
            logger.info("Not support test device type [" + query["export-id"] + "].")
            break;
    }

    return jsonAnswersStr;
}


function combineRequestAnswer_vmax(deviceinfo) {


    var smiinfo = {};
    smiinfo.host = deviceinfo["vmax.smi.host"];
    smiinfo.username = deviceinfo["vmax.smi.username"];
    smiinfo.password = deviceinfo["vmax.smi.password"];
    smiinfo.useAdvancedSettings = "false";

    var unisphereInfo = {};
    unisphereInfo.host = deviceinfo["vmax.unisphere.host"];
    unisphereInfo.username = deviceinfo["vmax.unisphere.username"];
    unisphereInfo.password = deviceinfo["vmax.unisphere.password"];
    unisphereInfo.port = deviceinfo["vmax.unisphere.port"];
    unisphereInfo.useAdvancedSettings = "false";

    var jsonAnswers = {};
    jsonAnswers.vmax_device_type = deviceinfo["vmax.vmax_device_type"];
    jsonAnswers.serialnb = deviceinfo["vmax.serialnb"];
    //jsonAnswers.collect_other_perf = "3";
    //jsonAnswers.collect_lun_perf = "2";
    //jsonAnswers.srdfCollection = "true";

    jsonAnswers.smi = smiinfo;
    jsonAnswers.unisphere = unisphereInfo;


    
    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}


function combineRequestAnswer_vnx(deviceinfo) {

    var block = {};
    block.spa = deviceinfo["vnx.block.spa"];
    block.spb = deviceinfo["vnx.block.spb"];
    block.use_secfile = deviceinfo["vnx.block.use_secfile"];
    block.userscope = deviceinfo["vnx.block.userscope"];
    block.username = deviceinfo["vnx.block.username"];
    block.password = deviceinfo["vnx.block.password"];

    var file = {};
    file.csprimary = deviceinfo["vnx.file.csprimary"] === undefined ? "" : deviceinfo["vnx.file.csprimary"];
    file.userscope = deviceinfo["vnx.file.userscope"] === undefined ? "" : deviceinfo["vnx.file.userscope"];
    file.username = deviceinfo["vnx.file.username"];
    file.password = deviceinfo["vnx.file.password"];

    var unity = {
        "management": deviceinfo["vnx.unity.management"],
        "username": deviceinfo["vnx.unity.username"],
        "password": deviceinfo["vnx.unity.password"]
    }

    var jsonAnswers = {};
    switch (deviceinfo["vnx.type"]) {
        case "1":    // Block Only
            jsonAnswers.block = block;
            break;
        case "2":   // Nas gateway
            jsonAnswers.block = block;
            jsonAnswers.file = file;
            break;
        case "3":    // Unified/File
            jsonAnswers.block = block;
            jsonAnswers.file = file;
            break;
        case "4":    // Unity
            jsonAnswers.unity = unity;
            break;
    }



    jsonAnswers.type = deviceinfo["vnx.type"];
    jsonAnswers.friendlyname = deviceinfo["vnx.friendlyname"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}



function combineRequestAnswer_unisphere(deviceinfo) {

    var jsonAnswers = {};
    jsonAnswers.host = deviceinfo["unisphere.host"];
    jsonAnswers.port = deviceinfo["unisphere.port"];
    jsonAnswers.username = deviceinfo["unisphere.username"];
    jsonAnswers.password = deviceinfo["unisphere.password"];
    jsonAnswers.serialnbIncludeList = deviceinfo["unisphere.serialnbIncludeList"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}



function combineRequestAnswer_xtremio(deviceinfo) {

    var jsonAnswers = {};
    logger.info(deviceinfo);
    jsonAnswers.host = deviceinfo["emcxtremio.host"];
    jsonAnswers.username = deviceinfo["emcxtremio.username"];
    jsonAnswers.password = deviceinfo["emcxtremio.password"];
    jsonAnswers.timezone = deviceinfo["emcxtremio.timezone"];
    jsonAnswers.version = deviceinfo["emcxtremio.version"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);
    return jsonAnswersStr;
}


function combineRequestAnswer_brocade(deviceinfo) {

    var jsonAnswers = {};
    jsonAnswers.host = deviceinfo["smiprovider.host"];
    jsonAnswers.username = deviceinfo["smiprovider.username"];
    jsonAnswers.password = deviceinfo["smiprovider.password"];
    jsonAnswers.usesecure = (deviceinfo["smiprovider.usesecure"] === undefined) ? (deviceinfo["smiprovider.port"] == "5989" ? "true" : "false") : deviceinfo["smiprovider.usesecure"];
    jsonAnswers.port = deviceinfo["smiprovider.port"];

    var jsonAnswersStr = JSON.stringify(jsonAnswers);


    return jsonAnswersStr;
}

function combineRequestAnswer_brocadeV2(deviceinfo) {

    var jsonAnswers = {
        "smiprovider": {
            "username": deviceinfo["discoverycontext.smiprovider.username"],
            "password": deviceinfo["discoverycontext.smiprovider.password"],
            "usesecure": deviceinfo["discoverycontext.smiprovider.usesecure"]
        },
        "discoveryoption": deviceinfo["discoverycontext.discoveryoption"],
        "host": deviceinfo["discoverycontext.host"]
    }

    var jsonAnswersStr = JSON.stringify(jsonAnswers);


    return jsonAnswersStr;
}



function combineRequestAnswer_vplex(deviceinfo) {

    var jsonAnswers = {
        "cluster1": {
            "host": deviceinfo["vplex.cluster1.host"],
            "serialnb": deviceinfo["vplex.cluster1.serialnb"],
            "username": deviceinfo["vplex.cluster1.username"],
            "password": deviceinfo["vplex.cluster1.password"]
        },
        "cluster2": {
            "host": deviceinfo["vplex.cluster2.host"],
            "serialnb": deviceinfo["vplex.cluster2.serialnb"],
            "username": deviceinfo["vplex.cluster2.username"],
            "password": deviceinfo["vplex.cluster2.password"]
        },
        "type": deviceinfo["vplex.type"]
    }

    var jsonAnswersStr = JSON.stringify(jsonAnswers);

    return jsonAnswersStr;
}



function combineRequestAnswer_isilon(deviceinfo) {

    var jsonAnswers = {
        "host": deviceinfo["emcisilon.system.host"],
        "username": deviceinfo["emcisilon.system.username"],
        "password": deviceinfo["emcisilon.system.password"]
    }

    var jsonAnswersStr = JSON.stringify(jsonAnswers);

    return jsonAnswersStr;
}



function combineRequestAnswer_recoverpoint(deviceinfo) {

    var jsonAnswers = {
        "host": deviceinfo["rp.host"],
        "username": deviceinfo["rp.username"],
        "password": deviceinfo["rp.password"]
    }

    var jsonAnswersStr = JSON.stringify(jsonAnswers);

    return jsonAnswersStr;
}


function combineRequestAnswer_hypermax(deviceinfo) {

    var jsonAnswers = {
        "host": deviceinfo["unisphere.host"],
        "port": deviceinfo["unisphere.port"],
        "username": deviceinfo["unisphere.username"],
        "password": deviceinfo["unisphere.password"],
        "serialnbIncludeList": deviceinfo["unisphere.serialnbIncludeList"]
    }

    var jsonAnswersStr = JSON.stringify(jsonAnswers);

    return jsonAnswersStr;
}


function combineRequestAnswer_cisco(deviceinfo) {

    var jsonAnswers = {
        "name": deviceinfo["snmpagent.name"],
        "hostname": deviceinfo["snmpagent.hostname"],
        "port": deviceinfo["snmpagent.port"],
        "version": deviceinfo["snmpagent.version"],
        "community": deviceinfo["snmpagent.community"],
        "timeout": deviceinfo["snmpagent.timeout"],
        "retries": deviceinfo["snmpagent.retries"]
    }

    if (deviceinfo["snmpagent.capability"].length > 0)
        jsonAnswers["capability"] = deviceinfo["snmpagent.capability"]

    var jsonAnswersStr = JSON.stringify(jsonAnswers);

    return jsonAnswersStr;
}


function combineRequestAnswer_datadomain(deviceinfo) {

    var jsonAnswers = {
        "name": deviceinfo["snmpagent.name"],
        "hostname": deviceinfo["snmpagent.hostname"],
        "port": deviceinfo["snmpagent.port"],
        "version": deviceinfo["snmpagent.version"],
        "community": deviceinfo["snmpagent.community"],
        "timeout": deviceinfo["snmpagent.timeout"],
        "retries": deviceinfo["snmpagent.retries"],
        "maxbulksize": deviceinfo["snmpagent.maxbulksize"],
        "capability": deviceinfo["snmpagent.capability"]
    }


    var jsonAnswersStr = JSON.stringify(jsonAnswers);

    return jsonAnswersStr;
}


function combineRequestAnswer_ecs(deviceinfo) {

    var jsonAnswers = {
        "friendlyname": deviceinfo["ecs.friendlyname"],
        "ip": deviceinfo["ecs.ip"],
        "username": deviceinfo["ecs.username"],
        "password": deviceinfo["ecs.password"],
        "in_geo_group": deviceinfo["ecs.in_geo_group"],

    }

    if (deviceinfo["ecs.in_geo_group"] == 'true') {
        jsonAnswers["collect_ns_and_bucket"] = deviceinfo["ecs.collect_ns_and_bucket"];
    }

    var jsonAnswersStr = JSON.stringify(jsonAnswers);

    return jsonAnswersStr;
}

function combineRequestAnswer_netapp(deviceinfo) {

    var jsonAnswers = {
        "type": deviceinfo["netapp.type"],
        "hostname": deviceinfo["netapp.hostname"],
        "ip": deviceinfo["netapp.ip"],
        "port": deviceinfo["netapp.port"],
        "username": deviceinfo["netapp.username"],
        "password": deviceinfo["netapp.password"]
    }


    var jsonAnswersStr = JSON.stringify(jsonAnswers);

    return jsonAnswersStr;
}

