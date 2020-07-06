"use strict";

var async = require("async");
var util = require("../lib/util");

var unirest = require("unirest");
var configger = require("../config/configger");
var flatUtil = require("./RecordFlat");
var JSONbig = require("json-bigint");
var fs = require("fs");

module.exports = {
    CallGet,
    CallGet_SingleField,
    convertPerformanceStruct,
    formatDate,
    centralizedManage,
    CallGetPerformance,

    CallAutoGet,
    CallAutoPost,

    CallRPAGet,
    CallRPAPost,
    CallRPAPut
};

function CallGet(getParamater, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; 

    var config = configger.load();

    if (getParamater !== undefined) {
        if (getParamater.start === undefined) {
            switch (getParamater.period) {
                case 0:
                    getParamater["start"] = util.getConfStartTime("1d");
                    break;
                case 3600:
                    getParamater["start"] = util.getConfStartTime("1w");
                    break;
                default:
                    getParamater["start"] = util.getConfStartTime("1m");
                    break;
            }
        }
    }

    var f = new DoGetV2(getParamater, function (ret) {
        //console.log("+++++++++++++++\n" + JSON.stringify(ret,0,1) + "\n+++++++++++++++++++");
        callback(ret);
    });
}

function DoGet(paramater, callback) {
    var config = configger.load();
    var keys = paramater.keys;
    //if ( (typeof paramater.result === 'undefined') && ( typeof paramater.filter_name !== 'undefined') )  {
    if (paramater.filter_name !== undefined) {
        var fields =
            paramater.fields !== undefined
                ? keys + "," + paramater.fields + ",name"
                : keys + ",name";
        var filter = paramater.filter + "&" + paramater.filter_name;
        var getMethod = config.SRM_RESTAPI.METRICS_SERIES_VALUE;
        var limit = paramater.limit;
        var period = paramater.period;
        var start = paramater.start;
        var end = paramater.end;
        var type = paramater.type;

        // add for limit for vstatus
        //var pubfilter =  ( config.ProductType == 'Prod' ) ? '&vstatus=\'active\'' : '' ;
        filter = config.SRM_RESTAPI.BASE_FILTER + filter;

        var queryString = util.CombineQueryString(
            filter,
            fields,
            start,
            end,
            period,
            limit,
            type
        );

        var isFlat = true;
    } else {
        var fields =
            paramater.fields !== undefined ? keys + "," + paramater.fields : keys;
        var filter = paramater.filter;
        var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE;

        // add for limit for vstatus
        filter = config.SRM_RESTAPI.BASE_FILTER + filter;

        var queryString = { filter: filter, fields: fields };
        var isFlat = false;
    }

    if (fields.length > 0) {
        console.log("-----------------------------");
        console.log(config.Backend.URL + getMethod);
        console.log(queryString);

        console.log("****************\n" + config.BackendExtra.length);

        unirest
            .get(config.Backend.URL + getMethod)
            .auth(config.Backend.USER, config.Backend.PASSWORD, true)
            .headers({ "Content-Type": "multipart/form-data" })
            .query(queryString)
            .end(function (response) {
                //console.log("----- Query is finished -----");
                //console.log(response);
                if (response.error) {
                    console.log(response.error);
                    return response.error;
                    callback({});
                } else if (response.raw_body == "") {
                    console.log("No result!");
                    callback({});
                } else {
                    if (isFlat) {
                        if (
                            paramater.valuetype !== undefined &&
                            paramater.valuetype == "MAX"
                        )
                            var resultRecord = flatUtil.RecordFlatMaxValue(
                                response.raw_body,
                                paramater.keys
                            );
                        else
                            var resultRecord = flatUtil.RecordFlat(
                                response.raw_body,
                                paramater.keys
                            );
                    } else var resultRecord = JSON.parse(response.raw_body).values;
                    paramater.result = mergeResult(
                        paramater.result,
                        resultRecord,
                        paramater.keys
                    );
                    console.log("#FinalRecords=[" + paramater.result.length + "]");
                    callback(paramater);
                }
            });
    }
}

function DoGetV2(paramater, callback) {
    console.time(`CallGetV2 - execute time`);
    console.log(" ============================================================================================ ");
 
    var config = configger.load(); 
    var keys = paramater.keys;
    if (paramater.filter_name !== undefined) {
        var fields =
            paramater.fields !== undefined
                ? keys + "," + paramater.fields + ",name"
                : keys + ",name";
        var filter = paramater.filter + "&" + paramater.filter_name;
        var getMethod = config.SRM_RESTAPI.METRICS_SERIES_VALUE;
        var limit = paramater.limit;
        var period = paramater.period;
        var start = paramater.start;
        var end = paramater.end;
        var type = paramater.type;

        // add for limit for vstatus
        //var pubfilter =  ( config.ProductType == 'Prod' ) ? '&vstatus=\'active\'' : '' ;
        filter = config.SRM_RESTAPI.BASE_FILTER + filter;
        var queryString = util.CombineQueryString(
            filter,
            fields,
            start,
            end,
            period,
            limit,
            type
        );

        var isFlat = true;
    } else { 
        var fields =
            paramater.fields !== undefined ? keys + "," + paramater.fields : keys;
        var filter = paramater.filter;
        var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE;

        // add for limit for vstatus
        filter = config.SRM_RESTAPI.BASE_FILTER + filter;

        var queryString = { filter: filter, fields: fields };
        var isFlat = false;
    } 

    if (fields.length > 0) {
        var TaskSerial = 0;
        //if ( config.BackendExtra.length > 1 ) {
        async.mapSeries(
            config.BackendExtra,
            function (backendItem, callback) {
                TaskSerial++;
                console.log(
                    `Task(${TaskSerial}): APG-SERVER-INFO: ${JSON.stringify(backendItem)}`
                );

                switch (config.ProductType) {
                    case "Test":
                    case "Dev":
                        var SRMDevLastDT = backendItem.SRMDevLastDT;

                        var d1 = new Date(SRMDevLastDT);
                        var a = d1.getTime() - 86400000 * 30; // the day of 30 days before
                        var s = new Date(a);
                        queryString.start = s.toISOString();

                        var d = new Date(SRMDevLastDT).toISOString();
                        queryString.end = d;
                }

                console.log(`Task(${TaskSerial}): GET ${backendItem.URL}${getMethod}`);
                console.log(`Task(${TaskSerial}): QUERY ${JSON.stringify(queryString,2,2)}`);
                console.time(`Task(${TaskSerial})`)
                unirest
                    .get(backendItem.URL + getMethod)
                    .auth(backendItem.USER, backendItem.PASSWORD, true)
                    .headers({ "Content-Type": "multipart/form-data" })
                    .query(queryString)
                    .end(function (response) {
                        //console.log("----- Query is finished -----");
                        //console.log(response);
                        if (response.error) {
                            console.log(response.error);
                            return response.error;
                            callback(504, {});
                        } else if (response.raw_body == "") {
                            console.log("No result!");
                            callback(504, {});
                        } else {
                            if (isFlat) {
                                if (
                                    paramater.valuetype !== undefined &&
                                    paramater.valuetype == "MAX"
                                )
                                    var resultRecord = flatUtil.RecordFlatMaxValue(
                                        response.raw_body,
                                        paramater.keys
                                    );
                                else
                                    var resultRecord = flatUtil.RecordFlat(
                                        response.raw_body,
                                        paramater.keys
                                    );
                            } else var resultRecord = JSON.parse(response.raw_body).values;

                            var result = { result: [] };
                            result.result = mergeResult(
                                paramater.result,
                                resultRecord,
                                paramater.keys
                            );
                            var TaskEndTime = new Date();
                            console.log(`Task(${TaskSerial}): finished. #result: ${result.result.length} `);
                            console.timeEnd(`Task(${TaskSerial})`)
                            console.log("       ---- ---- ---- ----");
                            callback(null, result);
                        }
                    });
            },
            function (err, result) {
                if (err) {
                    if ( err == 504 ) callback({});
                    else { 
                        console.log(err);
                    }
                } else {
 
                    var resItem = result[0];
                    for (var i in result) {
                        if (i == 0) continue;
                        var item = result[i];
                        for (var j in item.result) {
                            var item1 = item.result[j];
                            resItem.result.push(item1);
                        }
                    }
                    var totalEndTime = new Date();
                    if ( resItem !== undefined ) 
                        console.log(`CallGetV2 - #FinalResult: ${resItem.result.length} ` );
                    else 
                        console.log(`CallGetV2 - #FinalResult: 0 (#)` );
                    console.timeEnd(`CallGetV2 - execute time`);
                    console.log("============================================================================================ ");
    
                    callback(resItem);
                }  
            }
        );
    }
}

function CallGetPerformance(paramater, callback) { 
    console.time(`CallGetPerformance - execute time`);
    console.log(" ============================================================================================ ");

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    var config = configger.load();
    if (paramater !== undefined) {
        if (paramater.start === undefined) {
            if (paramater.period !== undefined)
                switch (parseInt(paramater.period)) {
                    case 0:
                        paramater["start"] = util.getConfStartTime("1d");
                        break;
                    case 3600:
                        paramater["start"] = util.getConfStartTime("2w");
                        break;
                    case undefined:
                        paramater["start"] = util.getConfStartTime("1w");

                        break;
                    default:
                        paramater["start"] = util.getConfStartTime("1m");
                        break;
                }
            else {
                paramater["start"] = util.getConfStartTime("1w");
                paramater["period"] = 3600;
            }
        }
        if (paramater.end === undefined) paramater["end"] = util.getCurrentTime();

        var filterbase =
            paramater.device !== undefined
                ? "device=='" + paramater.device + "'"
                : undefined;
    } else {
        callback({});
    }


    var fields = paramater.keys + "," + paramater.fields + ",name";
    var filter =
        (filterbase === undefined ? "" : filterbase + "&") +
        paramater.filter +
        "&" +
        paramater.filter_name;
    var getMethod = config.SRM_RESTAPI.METRICS_SERIES_VALUE;
    var limit = paramater.limit;
    var period = paramater.period;
    var start = paramater.start;
    var end = paramater.end;
    var type = paramater.type === undefined ? "max" : paramater.type;
 
    if (fields.length <= 0) callback({});

    async.waterfall(
        [
            function (callback) {
                var queryString = {};
                queryString["properties"] = fields;

                filter = config.SRM_RESTAPI.BASE_FILTER + filter;
                queryString["filter"] = filter;
                if (start !== undefined) queryString["start"] = start;
                if (end !== undefined) queryString["end"] = end;
                if (period !== undefined) queryString["period"] = period;
                if (limit !== undefined) queryString["limit"] = limit;
                if (type !== undefined) queryString["type"] = type;

                var TaskSerial = 0;

                async.mapSeries(
                    config.BackendExtra,
                    function (backendItem, subcallback) {
                        TaskSerial++;
                        console.log(
                            `Task(${TaskSerial}) APG-SERVER-INFO: ${JSON.stringify(
                                backendItem
                            )}`
                        );
                        if ( start === undefined && end === undefined ) {
                            switch (config.ProductType) {
                                case "Test":
                                case "Dev":
                                    var SRMDevLastDT = backendItem.SRMDevLastDT;
    
                                    var d1 = new Date(SRMDevLastDT);
                                    switch (period) {
                                        case 0:
                                            var a = d1.getTime() - 86400000 * 1; // the day of 1 days before
                                            break;
                                        case 3600:
                                            var a = d1.getTime() - 86400000 * 7; // the day of 7 days before
                                            break;
                                        case 86400:
                                            var a = d1.getTime() - 86400000 * 30; // the day of 30 days before
                                            break;
                                        default: 
                                                var a = d1.getTime() - 86400000 * 7; // the day of 7 days before
                                                break;
        
                                    }
    
                                    var s = new Date(a);
                                    queryString.start = s.toISOString();
    
                                    var d = new Date(SRMDevLastDT).toISOString();
                                    queryString.end = d;
                            }
                        }

                        console.log(`Task(${TaskSerial}): GET ${backendItem.URL}${config.SRM_RESTAPI.METRICS_SERIES_VALUE}`);
                        console.log(`Task(${TaskSerial}): QUERY ${JSON.stringify(queryString,2,2)}`);
                        console.time(`Task(${TaskSerial})`);
                        unirest
                            .get(backendItem.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                            .auth(backendItem.USER, backendItem.PASSWORD, true)
                            .headers({ "Content-Type": "multipart/form-data" })
                            .query(queryString)
                            .end(function (response) {
                                if (response.error) {
                                    console.log(response.error);
                                    return response.error;
                                } else {
                                    //console.log(response.raw_body);
                                    var resultRecord = JSON.parse(response.raw_body);
                                    var executeEndTime = new Date();  
                                    console.log(`Task(${TaskSerial}) finished: ${resultRecord.values.length}`);
                                    console.timeEnd(`Task(${TaskSerial})`);
                                    console.log(" ---- ---- ---- ----");
                                    subcallback(null, resultRecord);
                                }
                            });
                    },
                    function (err, result) {
                        if (err) {
                            console.log(err);
                        }
                        var resItem = result[0];
                        for (var i in result) {
                            if (i == 0) continue;
                            var item = result[i];
                            for (var j in item.values) {
                                var item1 = item.values[j];
                                resItem.values.push(item1);
                            }
                        }

                        callback(null, resItem);
                    }
                );
            },
            function (arg1, callback) {
                var tmpArg1 = JSON.stringify(arg1);

                if ((tmpArg1 !== undefined) & (tmpArg1 !== null) & (tmpArg1 != ""))
                    var result1 = util.convertSRMPerformanceStruct(tmpArg1);
                else var result1 = [];

                callback(null, result1);

            }
        ],
        function (err, result) {
            var totalEndTime = new Date();
            console.log("CallGetPerformance - #FinalResult: " + result.length );
            console.timeEnd(`CallGetPerformance - execute time`);
            console.log("============================================================================================ ");

            callback(result);
        }
    );
}

function centralizedManage(callback) {
    var config = configger.load();

    async.waterfall(
        [
            function (callback) {
                unirest
                    .get(config.BackendMgmt.URL)
                    .headers({ "Content-Type": "multipart/form-data" })
                    .end(function (response) {
                        var hearder = response.headers;
                        var cookies = String(hearder["set-cookie"]).split(";");
                        var sessionid = "";
                        for (var i in cookies) {
                            var cookie = cookies[i];
                            if (cookie.indexOf("JSESSIONID") >= 0) {
                                sessionid = cookie.split("=")[1];
                                break;
                            }
                        }
                        console.log("111:" + cookies);
                        callback(null, sessionid);
                        //callback(null,response);
                    });
            },
            function (sessionid, callback) {
                var sessionStr = "JSESSIONID=" + sessionid;

                unirest
                    .post(config.BackendMgmt.URL + "/j_security_check")
                    .header("Cookie", sessionStr)
                    //.send('j_username=admin&j_password=changeme')
                    .field({ j_username: "admin", j_password: "changeme" })
                    .end(function (response) {
                        var hearder = response.headers;
                        var cookies = String(hearder["set-cookie"]).split(";");
                        var sessionid = "";
                        for (var i in cookies) {
                            var cookie = cookies[i];
                            if (cookie.indexOf("JSESSIONID") >= 0) {
                                sessionid = cookie.split("=")[1];
                                break;
                            }
                        }
                        console.log("222:" + cookies);
                        console.log(response);
                        callback(null, sessionid);
                        //callback(null,response);
                    });
            }
            /*,
              function(sessionid,callback){ 
                  var sessionStr = "JSESSIONID="+sessionid;
              
                  unirest.post(config.BackendMgmt.URL + "/j_security_check")
                  .header('Cookie', sessionStr)
                  .query('j_username=admin')
                  .query('j_password=changeme')
                  .end(function (response) { 
                    callback(null,response);
                  });
      
      
              } */
        ],
        function (err, result) {
            callback(result);
        }
    );
}

function mergeResult(target, sources, keys) {
    if (typeof target === "undefined") {
        target = sources;
        //console.log('the target is EMPTY!');
    } else {
        for (var i in target) {
            var targetItem = target[i];

            for (var j in sources) {
                var isFind = false;
                var sourceItem = sources[j];

                // console.log('====' + JSON.stringify(targetItem) + "=====" );
                //console.log('====' + JSON.stringify(sourceItem) + "=====" );

                for (var key in keys) {
                    var keyItem = keys[key];
                    if (targetItem[keyItem] == sourceItem[keyItem]) {
                        isFind = true;
                    } else {
                        isFind = false;
                        break;
                    }
                }

                // Finded equal item in sources
                if (isFind) {
                    for (var z in sourceItem) {
                        targetItem[z] = sourceItem[z];
                    }
                }
            }
        }
    }
    return target;
}

/*
    * each field fetch.

*/

function CallGet_SingleField(getParamater, callback) {
    var config = configger.load(); 
    async.waterfall(
        [
            function (callback) {
                var f = new DoGet_singleField(
                    getParamater.fields,
                    getParamater,
                    callback
                ); 
            },
            function ( arg1, result, callback ) {  
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {  
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) { 
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {
                var f = new DoGet_singleField(arg1, getParamater, callback);
            },
            function (arg1, result, callback) {
                var f = new DoGet_singleField(arg1, getParamater, callback);
            }
        ],
        function (err, result) {
            // result now equals 'done'
            console.log("FinalResult=" + getParamater.result.length);
            callback(getParamater);
        }
    );
}

function DoGet_singleField(fields, paramater, callback) {
    if (fields.length == 0) {
        //console.log('fields is empty!');
        callback(null, fields, paramater);
        return;
    }
    var config = configger.load();
    var keys = paramater.keys;
    if ( typeof paramater.result === "undefined"  ) {
        if ( typeof paramater.filter_name !== "undefined" ) {
            fields = keys + ",name";
            var filter = paramater.filter + "&" + paramater.filter_name;
            var fieldArray = fields.split(",");
        } else {
            fields = keys;
            var filter = paramater.filter;
            var fieldArray = paramater.fields;
        }
        
          
        var getMethod = config.SRM_RESTAPI.METRICS_SERIES_VALUE;
        var queryString = util.CombineQueryString(filter, fields);

        var isFlat = true;
    } else {
        if (typeof fields == "string") var fieldArray = fields.split(",");
        else var fieldArray = fields;

        fields = keys + "," + fieldArray[0];
        var filter = paramater.filter;
        fieldArray.splice(0, 1);
        var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE;
        var queryString = { filter: filter, fields: fields };
        var isFlat = false;
    }

    if (fields.length > 0) {
        console.log(queryString);

        unirest
            .get(config.Backend.URL + getMethod)
            .auth(config.Backend.USER, config.Backend.PASSWORD, true)
            .headers({ "Content-Type": "multipart/form-data" })
            .query(queryString)
            .end(function (response) {
                //console.log("----- Query is finished -----");
                //console.log(response.raw_body);
                if (response.error) {
                    console.log(response.error);
                    return response.error;
                } else {
                    //console.log(response.raw_body.length);
                    if (isFlat)
                        var resultRecord = flatUtil.RecordFlat(
                            response.raw_body,
                            paramater.keys
                        );
                    else var resultRecord = JSON.parse(response.raw_body).values;
                    paramater.result = mergeResult(
                        paramater.result,
                        resultRecord,
                        paramater.keys
                    );
                    callback(null, fieldArray.toString(), paramater);
                }
            });

        this.fields = fieldArray.toString();
    }
}

function convertPerformanceStruct(perf) {
    var finalResult = [];
    for (var i in perf) {
        var lunItem = perf[i];

        var lunItemResult = {};
        lunItemResult["part"] = lunItem.part;
        lunItemResult["parttype"] = lunItem.parttype;
        lunItemResult["device"] = lunItem.device;
        lunItemResult["matrics"] = [];
        var lunMatricsArray = [];

        for (var j in lunItem.matrics) {
            var lunMatrics = lunItem.matrics[j];
            var keys = Object.keys(lunMatrics);
            for (var z in keys) {
                if (keys[z] != "max" && keys[z] != "avg") {
                    var matricsName = keys[z];

                    for (var aa in lunMatrics[matricsName]) {
                        var lunMatricsItem = {};
                        var item1 = lunMatrics[matricsName][aa];
                        lunMatricsItem["timestamp"] = item1[0];
                        lunMatricsItem[matricsName] = item1[1];

                        var isfind = false;
                        for (var tt in lunMatricsArray) {
                            //console.log(lunMatricsArray[tt].timestamp + '\t' + lunMatricsItem.timestamp);
                            if (lunMatricsArray[tt].timestamp == lunMatricsItem.timestamp) {
                                //console.log("isfind="+matricsName + '=' + lunMatricsItem[matricsName] );
                                lunMatricsArray[tt][matricsName] = lunMatricsItem[matricsName];
                                isfind = true;
                                break;
                            }
                        }
                        if (!isfind) {
                            lunMatricsArray.push(lunMatricsItem);
                        }
                    }
                }
            }
        } // end for ( var j in lunItem.matrics )

        lunItemResult["matrics"] = lunMatricsArray;
        finalResult.push(lunItemResult);
    }

    return finalResult;
}

function formatDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? "0" + minutes : minutes;
    var strTime = hours + ":" + minutes + " " + ampm;
    return (
        date.getMonth() +
        1 +
        "/" +
        date.getDate() +
        "/" +
        date.getFullYear() +
        "  " +
        strTime
    );
}

// for Automation restapi
/*
    Paramater: 
          {
              array: JSONObject,     // referenct config/arrays.json
              url: String 
          }
*/

function CallAutoGet(getParamater, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var retObj = { code: 200, message: "succeed", response: null };

    var name = getParamater.name;
    var url = getParamater.url;
    var arrayInfo = getParamater.array;
    if (arrayInfo === undefined)
        callback({
            code: 404,
            message: "array infomation object is undefined",
            response: null
        });

    var VPLEXURL_ENDPOINT = arrayInfo.endpoint;
    var VPLEXURL_USERNAME = arrayInfo.auth.username;
    var VPLEXURL_PASSWORD = arrayInfo.auth.password;

    var API = VPLEXURL_ENDPOINT + url;
    console.log(API);
    unirest
        .get(API)
        .headers({ username: VPLEXURL_USERNAME, password: VPLEXURL_PASSWORD })
        .end(function (response) {
            //console.log("----- Query is finished -----");
            //console.log(response);

            if (response.error) {
                retObj.code = response.code !== undefined ? response.code : 500;
                var msg = {};
 
                //msg.response = response.body.response;
                msg.response = response.error===undefined?response: JSON.stringify(response.error);
                msg.request = {};
                msg.request.header = response.headers;
                msg.request.url = response.request;
                retObj.message = msg;
            } else if (response.raw_body == "") {
                retObj.code = response.code;
                retObj.message = "Not Result";
                retObj.response = response.raw_body;
            } else {
                retObj.response = response.body.response;
            }
            callback(retObj);
        });
}

// for Automation restapi
/*
    Paramater: 
          {
              array: JSONObject,     // referenct config/arrays.json
              url: String ,
              body: String 
          }
*/
function CallAutoPost(getParamater, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var arrayInfo = getParamater.array;
    if (arrayInfo === undefined)
        callback({
            code: 404,
            message: "array infomation object is undefined",
            response: null
        });

    var url = getParamater.url;
    var body = getParamater.body;

    var VPLEXURL_ENDPOINT = arrayInfo.endpoint;
    var VPLEXURL_USERNAME = arrayInfo.auth.username;
    var VPLEXURL_PASSWORD = arrayInfo.auth.password;

    var API = VPLEXURL_ENDPOINT + url;

    console.log("  ========  CallAutoPost ( VPLEX ) ======= ");
    console.log("URL:" + API);
    console.log("BODY:" + body);

    unirest
        .post(API)
        .headers({ username: VPLEXURL_USERNAME, password: VPLEXURL_PASSWORD })
        .send(body)
        .end(function (response) {
            var responseBody = response.body;
            //console.log("----- Query is finished -----");
            //console.log(responseBody);

            /*
                      1. Fail response "responseBody"
      {
          response: {
              context: null,
              message: null,
              exception: 'extent   Evaluation of <<extent create -d\ncreate:  [ebankwebesxi_VMAX193_0101144532os01,\n         ebankwebesxi_unity785_0101144532os01]>> failed.\ncause:   Command execution failed.\ncause:   Failed to set value for option --storage-volumes.\ncause:   Could not find appropriate contexts matching\n         \'[ebankwebesxi_VMAX193_0101144532os01]\'.\n',
          'custom-data': null 
        }
      }
                  */
            var resObj = {};
            resObj.code = response.code;
            resObj.msg = "Success";
            resObj.data = getParamater;
            resObj.response = responseBody.response;

            if (response.code != 200) {
                resObj.code = response.code;
                resObj.msg = "Fail";
                if (responseBody.response.exception !== undefined) {
                    resObj.msg = responseBody.response.exception;
                    resObj.response = responseBody.response.exception;
                }
            } else {
                resObj.response = responseBody.response["custom-data"];
            }

            //console.log("%%%%%%%%\n" + JSON.stringify(resObj,null,2) + "\n%%%%%%\n");
            callback(resObj);
        });
}

function CallRPAGet(rpainfo, url, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var retObj = { code: 200, message: "succeed", response: null };

    var IP = rpainfo.IP;
    var username = rpainfo.username;
    var password = rpainfo.password;
    var fullurl = `https://${rpainfo.IP}${rpainfo.baseurl}${url}`;
    if (IP === undefined)
        callback({
            code: 404,
            message: "RPA infomation object is undefined",
            response: rpainfo
        });

    // console.log(fullurl);
    unirest
        .get(fullurl)
        .auth(username, password, true)
        .headers({ "Content-Type": "application/json" })
        .end(function (response) {
            //console.log("----- Query is finished -----");
            //console.log(response);

            if (response.error) {
                retObj.code = response.code !== undefined ? response.code : 500;
                var msg = {};

                msg.response = response;
                //msg.response = response.body.response;
                msg.response = response;
                msg.request = {};
                msg.request.header = response.headers;
                msg.request.url = response.request;
                retObj.message = msg;
            } else if (response.raw_body == "") {
                retObj.code = response.code;
                retObj.message = "Not Result";
                retObj.response = response.raw_body;
            } else {
                retObj.response = JSONbig.parse(response.raw_body);
            }
            callback(retObj);
        });
}

function CallRPAPost(rpainfo, url, body, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var retObj = { code: 200, msg: "succeed", data: body, response: null };

    var IP = rpainfo.IP;
    var username = rpainfo.username;
    var password = rpainfo.password;
    var fullurl = `https://${rpainfo.IP}${rpainfo.baseurl}${url}`;
    if (IP === undefined)
        callback({
            code: 404,
            message: "RPA infomation object is undefined",
            response: rpainfo
        });

    console.log(`CallRPAPost:  ${fullurl}`);
    console.log(`BODY:\n ${body}`);

    unirest
        .post(fullurl)
        .auth(username, password, true)
        .headers({ "Content-Type": "application/json" })
        .send(body)
        .end(function (response) {
            //console.log("----- Query is finished -----");
            //console.log(response);

            if (response.error) {
                retObj.code = response.code !== undefined ? response.code : 500;
                retObj.msg = response.body;
                retObj.response = response.raw_body;
            } else if (response.raw_body == "") {
                retObj.code = response.code == 204 ? 200 : response.code;
                retObj.message = "Not Result";
                retObj.response = response.raw_body;
            } else {
                retObj.response = JSONbig.parse(response.raw_body);
            }
            //console.log("&&&&\n" + JSON.stringify(retObj,null,2));
            callback(retObj);
        });
}

function CallRPAPut(rpainfo, url, body, callback) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var retObj = { code: 200, message: "succeed", response: null };

    var IP = rpainfo.IP;
    var username = rpainfo.username;
    var password = rpainfo.password;
    var fullurl = `https://${rpainfo.IP}${rpainfo.baseurl}${url}`;
    if (IP === undefined)
        callback({
            code: 404,
            message: "RPA infomation object is undefined",
            response: rpainfo
        });

    console.log(fullurl);
    console.log(`------ Body ----- \n ${JSON.stringify(body)}`);

    unirest
        .put(fullurl)
        .auth(username, password, true)
        .headers({ "Content-Type": "application/json" })
        .send(body)
        .end(function (response) {
            // console.log("----- PUT is finished -----");
            //console.log(response.error);

            retObj.data = body;
            if (response.error) {
                retObj.code = response.code !== undefined ? response.code : 500;
                retObj.message = response.raw_body;
            } else if (response.code == 204) {
                retObj.code = 200;
                retObj.message = "Not Result";
                retObj.response = response.raw_body;
            } else {
                retObj.response = JSONbig.parse(response.body);
            }
            callback(retObj);
        });
}
