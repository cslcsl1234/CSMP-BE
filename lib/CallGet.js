"use strict"; 

var async = require('async');
var util = require('../lib/util');

var unirest = require('unirest');
var configger = require('../config/configger');
var flatUtil = require('./RecordFlat');




function CallGet(getParamater, callback ) {

   
/*
    async.waterfall(books, function (err, result) {
        console.log(result);
    })
*/

    //getParamater['result'] = {};

    var config = configger.load();
    
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
            var queryString =  util.CombineQueryString(filter,fields,limit); 

            if ( paramater.period !== undefined ) 
                queryString['period'] = paramater.period;
            else 
                queryString['period'] = "604800";
                
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
                            if ( isFlat ) 
                                var resultRecord = flatUtil.RecordFlat(response.body, paramater.keys); 
                            else 
                                var resultRecord = JSON.parse(response.body).values;  
                            paramater.result = mergeResult(paramater.result ,resultRecord, paramater.keys);
                            console.log("#FinalRecords=[" + paramater.result.length + "]");
                            callback(paramater);
                        }

               
     
                    }); 
 
        }



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

                //console.log('====' + JSON.stringify(targetItem) + "=====" );
                //console.log('====' + JSON.stringify(sourceItem) + "=====" );

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
                            console.log(response.body.length);
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




module.exports = {
    CallGet,
    CallGet_SingleField
}
