"use strict"; 

var async = require('async');
var util = require('../lib/util');

var unirest = require('unirest');
var configger = require('../config/configger');
var flatUtil = require('./RecordFlat');



module.exports = {
    CallGet,
    CallGet_SingleField,
    convertPerformanceStruct,
    formatDate,
    centralizedManage,
    CallGetPerformance
}


function CallGet(getParamater, callback ) {
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
   
/*
    async.waterfall(books, function (err, result) {
        console.log(result);
    })
*/

    //getParamater['result'] = {};

    var config = configger.load();
    
    if ( getParamater !== undefined ) {
        if ( getParamater.start === undefined ) {
            switch ( getParamater.period ) {
                case 0 :
                    getParamater['start'] = util.getConfStartTime('1w');
                    break;
                case 3600 :
                    getParamater['start'] = util.getConfStartTime('2w');
                    break;
                default :
                    getParamater['start'] = util.getConfStartTime('1m');
                    break;
            }            
        }
    } 


    var f = new DoGet(getParamater, function(ret) { 
        callback(ret);
    });


};
 
 
function DoGet( paramater , callback) { 

 
        var config = configger.load();
        var keys = paramater.keys;  
        if ( (typeof paramater.result === 'undefined') && ( typeof paramater.filter_name !== 'undefined') )  {
            var fields = keys + ',' + paramater.fields + ',name';  
            var filter = paramater.filter + '&' + paramater.filter_name;
            var getMethod = config.SRM_RESTAPI.METRICS_SERIES_VALUE;
            var limit = paramater.limit;
            var period = paramater.period;
            var start = paramater.start;
            var end = paramater.end;
 
            var queryString =  util.CombineQueryString(filter,fields,start, end, period, limit); 


            var isFlat = true;
        } else {  
            var fields = keys  + ',' + paramater.fields ;
            var filter = paramater.filter ;
            var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE
            var queryString =  {"filter":filter,"fields":fields}; 
            var isFlat = false;
        }

        if ( fields.length > 0 ) {  
  
            console.log(queryString); 

            unirest.get(config.Backend.URL + getMethod )
                    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                    .headers({'Content-Type': 'multipart/form-data'}) 
                    .query(queryString) 
                    .end(function (response) { 

                            //console.log("----- Query is finished -----");
                            //console.log(response.body);
                        if ( response.error ) {
                            console.log(response.error);
                            return response.error;
                        } else {  
                            if ( isFlat ) {
                                if ( paramater.valuetype !== undefined  && paramater.valuetype == 'MAX')
                                    var resultRecord = flatUtil.RecordFlatMaxValue(response.body, paramater.keys); 
                                else 
                                    var resultRecord = flatUtil.RecordFlat(response.body, paramater.keys); 
                            }
                            else 
                                var resultRecord = JSON.parse(response.body).values;   
                            paramater.result = mergeResult(paramater.result ,resultRecord, paramater.keys);
                            console.log("#FinalRecords=[" + paramater.result.length + "]");
                            callback(paramater);
                        }

               
     
                    }); 
 
        }



};



function CallGetPerformance(paramater, callback ) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; 

    var config = configger.load(); 
    if ( paramater !== undefined ) {
        if ( paramater.start === undefined ) {
            if ( paramater.period !== undefined )
                switch ( parseInt(paramater.period) ) {
                    case 0 : 
                        paramater['start'] = util.getConfStartTime('1d'); 
                       break;
                    case 3600 :
                        paramater['start'] = util.getConfStartTime('2w');
                        break;
                    case undefined : 
                        paramater['start'] = util.getConfStartTime('1w');

                        break;
                    default : 
                        paramater['start'] = util.getConfStartTime('1m');
                        break;
                }
            else  {
                paramater['start'] = util.getConfStartTime('1w');
                paramater['period'] = 3600;
            }            
        }
        if ( paramater.end === undefined ) 
            paramater['end'] = util.getCurrentTime();


        var filterbase = ( paramater.device !== undefined)  ?'device==\''+paramater.device+'\'' : undefined ;


    } else {
        callback({});
    } 
 
    var fields = paramater.keys + ',' + paramater.fields + ',name';  
    var filter = ( filterbase === undefined ? "" :  filterbase + '&' ) + paramater.filter + '&' + paramater.filter_name;
    var getMethod = config.SRM_RESTAPI.METRICS_SERIES_VALUE;
    var limit = paramater.limit;
    var period = paramater.period;
    var start = paramater.start;
    var end = paramater.end;
    var type = ( paramater.type === undefined ? 'max' : paramater.type ) ;


    var isFlat = true; 

    if ( fields.length <= 0 ) callback({});

    async.waterfall([
        function(callback){  


        if ( paramater.type === undefined )  {
            var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: period}; 
        } else {
            var type = paramater.type;
            var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: period, type: type};             
        }
            console.log(queryString);
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

        },
        function(arg1,  callback){  
      
                var result1 = util.convertSRMPerformanceStruct(arg1); 
                //var ret = arg1.values; 
                callback(null,result1);                    

        }
    ], function (err, result) {
       // result now equals 'done'
       //res.json(200, result);
       // var r = JSON.parse(result);
       callback(result);
    });


};
 


function centralizedManage( callback) { 
 
    var config = configger.load(); 


    async.waterfall([
        function(callback){ 

            unirest.get(config.BackendMgmt.URL) 
                    .headers({'Content-Type': 'multipart/form-data'})  
                    .end(function (response) { 

                        var hearder = response.headers; 
                        var cookies = String(hearder["set-cookie"]).split(";");
                        var sessionid = "";
                        for ( var i in cookies ) {
                            var cookie = cookies[i];
                            if ( cookie.indexOf("JSESSIONID") >=0 ) {
                                sessionid = cookie.split("=")[1];
                                break;
                            }
                        } 
                        console.log("111:"+cookies);
                        callback(null, sessionid);
                        //callback(null,response);

                    }); 
        },
       function(sessionid,callback){ 
            var sessionStr = "JSESSIONID="+sessionid;

            unirest.post(config.BackendMgmt.URL + "/j_security_check")
            .header('Cookie', sessionStr)
            //.send('j_username=admin&j_password=changeme')
            .field({'j_username':'admin','j_password':'changeme'})
            .end(function (response) {

                var hearder = response.headers; 
                var cookies = String(hearder["set-cookie"]).split(";");
                var sessionid = "";
                for ( var i in cookies ) {
                    var cookie = cookies[i];
                    if ( cookie.indexOf("JSESSIONID") >=0 ) {
                        sessionid = cookie.split("=")[1];
                        break;
                    }
                } 
                console.log("222:"+cookies);
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
    ], function (err, result) { 
       callback(result);

    });


};



function mergeResult(target, sources, keys) { 
    if ( typeof target === 'undefined' )  { 
        target = sources;
        //console.log('the target is EMPTY!');
    } else {
  
        for ( var i in target ) {
            var targetItem = target[i]; 

            for (var j in sources ) {
                var isFind = false;
                var sourceItem = sources[j];

                console.log('====' + JSON.stringify(targetItem) + "=====" );
                console.log('====' + JSON.stringify(sourceItem) + "=====" );

                for ( var key in keys ) {
                    var keyItem = keys[key]; 
                    if ( targetItem[keyItem] == sourceItem[keyItem] ) { isFind = true;   }
                    else {
                        isFind = false ;
                        break;
                    }
                }
 
                // Finded equal item in sources
                if ( isFind ) {
                    for ( var z in sourceItem ) { 
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


function CallGet_SingleField(getParamater, callback ) {
 
    var config = configger.load();
    async.waterfall([
        function(callback){ 
            var f = new DoGet_singleField(getParamater.fields , getParamater , callback);
 
        },        
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
        function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        },
       function(arg1,result,  callback){ 
            var f = new DoGet_singleField(arg1, getParamater, callback);

        }
    ], function (err, result) {
       // result now equals 'done'
       console.log('FinalResult='+getParamater.result.length);
       callback(getParamater);

    });

    };
 
 
function DoGet_singleField(fields, paramater , callback) { 

        if ( fields.length == 0 )  {
            //console.log('fields is empty!');
            callback(null,fields,paramater);
            return;
        } 
        var config = configger.load();
        var keys = paramater.keys;  
        if ( (typeof paramater.result === 'undefined') && ( typeof paramater.filter_name !== 'undefined') )  {
            fields = keys + ',name'; 
            var fieldArray = paramater.fields  ;  
            var filter = paramater.filter + '&' + paramater.filter_name;
            var getMethod = config.SRM_RESTAPI.METRICS_SERIES_VALUE;
            var queryString =  util.CombineQueryString(filter,fields); 
            
            var isFlat = true;
        } else { 
            if (  typeof fields == 'string')
                var fieldArray = fields.split(',')  ;
            else 
                var fieldArray = fields;

            fields = keys  + ',' + fieldArray[0];  
            var filter = paramater.filter
            fieldArray.splice(0,1);
            var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE
            var queryString =  {"filter":filter,"fields":fields}; 
            var isFlat = false;
        }

 
     
 
        if ( fields.length > 0 ) {  
 

            

            console.log(queryString);

            unirest.get(config.Backend.URL + getMethod )
                    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                    .headers({'Content-Type': 'multipart/form-data'}) 
                    .query(queryString) 
                    .end(function (response) { 

                            //console.log("----- Query is finished -----");
                            //console.log(response.body);
                        if ( response.error ) {
                            console.log(response.error);
                            return response.error;
                        } else { 
                            //console.log(response.body.length);
                            if ( isFlat ) 
                                var resultRecord = flatUtil.RecordFlat(response.body, paramater.keys); 
                            else 
                                var resultRecord = JSON.parse(response.body).values;  
                            paramater.result = mergeResult(paramater.result ,resultRecord, paramater.keys);
                            callback(null,fieldArray.toString(),paramater);
                        }

               
     
                    }); 


            this.fields = fieldArray.toString();  
    }



};

function convertPerformanceStruct(perf) {

    var finalResult = [];
    for ( var i in perf ) {
        var lunItem = perf[i];

        var lunItemResult = {};
        lunItemResult['part'] = lunItem.part;
        lunItemResult['parttype'] = lunItem.parttype;
        lunItemResult['device'] = lunItem.device;
        lunItemResult['matrics'] = [];
        var lunMatricsArray = [];

        for ( var j in lunItem.matrics ) {
            var lunMatrics = lunItem.matrics[j];
            var keys = Object.keys(lunMatrics)
            for ( var z in keys ) {
                if ( keys[z] != 'max' && keys[z] != 'avg') {
                    var matricsName = keys[z];

                    for ( var aa in lunMatrics[matricsName] ) {
                        var lunMatricsItem = {};
                        var item1 = lunMatrics[matricsName][aa];
                        lunMatricsItem['timestamp'] = item1[0];
                        lunMatricsItem[matricsName] = item1[1];

                        var isfind = false;
                        for ( var tt in lunMatricsArray ) {
                            //console.log(lunMatricsArray[tt].timestamp + '\t' + lunMatricsItem.timestamp);
                            if ( lunMatricsArray[tt].timestamp == lunMatricsItem.timestamp ) {
                                //console.log("isfind="+matricsName + '=' + lunMatricsItem[matricsName] );
                                lunMatricsArray[tt][matricsName] = lunMatricsItem[matricsName];
                                isfind = true;
                                break;
                            }
                        }
                        if ( !isfind ) {
                            lunMatricsArray.push(lunMatricsItem);
                        }

                    }
                    
                }
            } 

        } // end for ( var j in lunItem.matrics )

        lunItemResult['matrics'] = lunMatricsArray;
        finalResult.push(lunItemResult);
    }

    return finalResult;

}

 

function formatDate(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return date.getMonth()+1 + "/" + date.getDate() + "/" + date.getFullYear() + "  " + strTime;
}
