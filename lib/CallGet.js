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
        //logger.info("+++++++++++++++\n" + JSON.stringify(ret,0,1) + "\n+++++++++++++++++++");
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
        logger.info("-----------------------------");
        logger.info(config.Backend.URL + getMethod);
        logger.info(queryString);

        logger.info("****************\n" + config.BackendExtra.length);

        unirest
            .get(config.Backend.URL + getMethod)
            .auth(config.Backend.USER, config.Backend.PASSWORD, true)
            .headers({ "Content-Type": "multipart/form-data" })
            .query(queryString)
            .end(function (response) {
                //logger.info("----- Query is finished -----");
                //logger.info(response);
                if (response.error) {
                    logger.error(response.error);
                    return response.error;
                    callback({});
                } else if (response.raw_body == "") {
                    logger.info("No result!");
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
                    logger.info("#FinalRecords=[" + paramater.result.length + "]");
                    callback(paramater);
                }
            });
    }
}

function DoGetV2(paramater, callback) {
    console.time(`CallGetV2 - execute time`);
    logger.info(" ============================================================================================ ");

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
                logger.info(
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

                logger.info(`Task(${TaskSerial}): GET ${backendItem.URL}${getMethod}`);
                logger.info(`Task(${TaskSerial}): QUERY ${JSON.stringify(queryString,2,2)}`);
                console.time(`Task(${TaskSerial})`)
                unirest
                    .get(backendItem.URL + getMethod)
                    .auth(backendItem.USER, backendItem.PASSWORD, true)
                    .headers({ "Content-Type": "multipart/form-data" })
                    .query(queryString)
                    .end(function (response) {
                        //logger.info("----- Query is finished -----");
                        //logger.info(response);
                        if (response.error) {
                            logger.error(response.error);
                            return response.error;
                            callback(504, {});
                        } else if (response.raw_body == "") {
                            logger.info("No result!");
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
                            logger.info(`Task(${TaskSerial}): finished. #result: ${result.result.length} `);
                            console.timeEnd(`Task(${TaskSerial})`)
                            logger.info("       ---- ---- ---- ----");
                            callback(null, result);
                        }
                    });
            },
            function (err, result) {
                if (err) {
                    if ( err == 504 ) callback({});
                    else {
                        logger.error(err);
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
                        logger.info(`CallGetV2 - #FinalResult: ${resItem.result.length} ` );
                    else
                        logger.info(`CallGetV2 - #FinalResult: 0 (#)` );
                    console.timeEnd(`CallGetV2 - execute time`);
                    logger.info("============================================================================================ ");

                    callback(resItem);
                }
            }
        );
    }
}

function CallGetPerformance(paramater, callback) {
    console.time(`CallGetPerformance - execute time`);
    logger.info(" ============================================================================================ ");

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
                        logger.info(
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

                        logger.info(`Task(${TaskSerial}): GET ${backendItem.URL}${config.SRM_RESTAPI.METRICS_SERIES_VALUE}`);
                        logger.info(`Task(${TaskSerial}): QUERY ${JSON.stringify(queryString,2,2)}`);
                        console.time(`Task(${TaskSerial})`);
                        unirest
                            .get(backendItem.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                            .auth(backendItem.USER, backendItem.PASSWORD, true)
                            .headers({ "Content-Type": "multipart/form-data" })
                            .query(queryString)
                            .end(function (response) {
                                if (response.error) {
                                    logger.error(response.error);
                                    return response.error;
                                } else {
                                    //logger.info(response.raw_body);
                                    var resultRecord = JSON.parse(response.raw_body);
                                    var executeEndTime = new Date();
                                    logger.info(`Task(${TaskSerial}) finished: ${resultRecord.values.length}`);
                                    console.timeEnd(`Task(${TaskSerial})`);
                                    logger.info(" ---- ---- ---- ----");
                                    subcallback(null, resultRecord);
                                }
                            });
                    },
                    function (err, result) {
                        if (err) {
                            logger.error(err);
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
            logger.info("CallGetPerformance - #FinalResult: " + result.length );
            console.timeEnd(`CallGetPerformance - execute time`);
            logger.info("============================================================================================ ");

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
                        logger.info("111:" + cookies);
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
                        logger.info("222:" + cookies);
                        logger.info(response);
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
        //logger.info('the target is EMPTY!');
    } else {
        for (var i in target) {
            var targetItem = target[i];

            for (var j in sources) {
                var isFind = false;
                var sourceItem = sources[j];

                // logger.info('====' + JSON.stringify(targetItem) + "=====" );
                //logger.info('====' + JSON.stringify(sourceItem) + "=====" );

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
            logger.info("FinalResult=" + getParamater.result.length);
            callback(getParamater);
        }
    );
}

function DoGet_singleField(fields, paramater, callback) {
    if (fields.length == 0) {
        //logger.info('fields is empty!');
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
        logger.info(queryString);

        unirest
            .get(config.Backend.URL + getMethod)
            .auth(config.Backend.USER, config.Backend.PASSWORD, true)
            .headers({ "Content-Type": "multipart/form-data" })
            .query(queryString)
            .end(function (response) {
                //logger.info("----- Query is finished -----");
                //logger.info(response.raw_body);
                if (response.error) {
                    logger.error(response.error);
                    return response.error;
                } else {
                    //logger.info(response.raw_body.length);
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
                            //logger.info(lunMatricsArray[tt].timestamp + '\t' + lunMatricsItem.timestamp);
                            if (lunMatricsArray[tt].timestamp == lunMatricsItem.timestamp) {
                                //logger.info("isfind="+matricsName + '=' + lunMatricsItem[matricsName] );
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
    if (getParamater.query !== undefined)
        var queryString = getParamater.query;
    else
        var queryString = "";

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
    unirest
        .get(API)
        //.headers({ username: VPLEXURL_USERNAME, password: VPLEXURL_PASSWORD })
        .auth(VPLEXURL_USERNAME, VPLEXURL_PASSWORD, true)
        .query(queryString)
        .end(function (response) {
            //logger.info("----- Query is finished -----");
            //logger.info(response);

            if (response.error) {
                retObj.code = response.code !== undefined ? response.code : 500;
                var msg = {};

                //msg.response = response.body.response;
                msg.response = response.error === undefined ? response : JSON.stringify(response.error);
                msg.request = {};
                msg.request.header = response.headers;
                msg.request.url = response.request;
                retObj.message = msg;
            } else if (response.raw_body == "") {
                retObj.code = response.code;
                retObj.message = "Not Result";
                retObj.response = response.raw_body;
            } else if (response.body.response !== undefined) {
                retObj.response = response.body.response;
            } else {
                retObj.response = response
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

    logger.info("  ========  CallAutoPost ( VPLEX ) ======= ");
    logger.info("URL:" + API);
    logger.info("BODY:" + body);

    unirest
        .post(API)
        .headers({ username: VPLEXURL_USERNAME, password: VPLEXURL_PASSWORD })
        .send(body)
        .end(function (response) {
            var responseBody = response.body;
            //logger.info("----- Query is finished -----");
            //logger.info(response);

            var resObj = {};
            resObj.code = response.code;
            resObj.msg = "Success";
            resObj.data = getParamater;
            resObj.response = responseBody.response;

            if (response.code != 200) {
                resObj.code = response.code;
                resObj.msg = "Fail";
                if (response.code == 202 ) {
                    resObj.headers = response.headers;
                }
                if (responseBody.response.message !== undefined && responseBody.response.message != null) {
                    resObj.msg = responseBody.response.message;
                    resObj.response = null;
                } else
                    if (responseBody.response.exception !== undefined && responseBody.response.exception != null ) {
                        resObj.msg = responseBody.response.exception;
                        resObj.response = responseBody.response.exception;
                    }
            } else {
                resObj.response = responseBody.response["custom-data"];
            }

            //logger.info("%%%%%%%%\n" + JSON.stringify(resObj,null,2) + "\n%%%%%%\n");
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

    // logger.info(fullurl);
    unirest
        .get(fullurl)
        .auth(username, password, true)
        .headers({ "Content-Type": "application/json" })
        .end(function (response) {
            //logger.info("----- Query is finished -----");
            //logger.info(response);

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

    logger.info(`CallRPAPost:  ${fullurl}`);
    logger.info(`BODY:\n ${body}`);

    unirest
        .post(fullurl)
        .auth(username, password, true)
        .headers({ "Content-Type": "application/json" })
        .send(body)
        .end(function (response) {
            //logger.info("----- Query is finished -----");
            //logger.info(response);

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
            //logger.info("&&&&\n" + JSON.stringify(retObj,null,2));
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

    logger.info(fullurl);
    logger.info(`------ Body ----- \n ${JSON.stringify(body)}`);

    unirest
        .put(fullurl)
        .auth(username, password, true)
        .headers({ "Content-Type": "application/json" })
        .send(body)
        .end(function (response) {
            // logger.info("----- PUT is finished -----");
            //logger.error(response.error);

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
