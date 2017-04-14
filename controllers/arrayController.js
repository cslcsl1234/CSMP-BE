"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('arrayController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
 
var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');

var mongoose = require('mongoose');
var ArrayObj = mongoose.model('Array');

var CallGet = require('../lib/CallGet'); 
var getTopos = require('./topos.js');

var arrayController = function (app) {

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




    app.get('/api/arrays', function (req, res) {
 
        var param = {};
        var arraysn = req.query.arraysn; 
        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&!parttype&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        } else {
            param['filter'] = '!parttype&(datatype==\'Block\'|datatype==\'File\'|datatype==\'Virtual\'|datatype==\'Object\')';
        } 

        param['filter_name'] = '(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
        param['keys'] = ['device'];
        param['fields'] = ['sstype','device','model','vendor','devdesc'];


        CallGet(param, function(param) {
            for ( var i in param.result) {
                var item = param.result[i];

                var ConfiguredUsableCapacity = item.ConfiguredUsableCapacity;
                var UsedCapacity = item.UsedCapacity;
                var UsedPercent = UsedCapacity / ConfiguredUsableCapacity * 100;
                console.log(item.serialnb + '=' + UsedPercent.toFixed(0));
                item['UsedPercent'] = UsedPercent.toFixed(0);
            }

            getArrayPerformance(function(result) {
                console.log("---------------- Finished ------------");
                
                if ( param.result.length > 0 ) {

                   for ( var i in param.result ) {
                        var item = param.result[i];
                        item['perf'] = [];

                        for ( var j in result.values ) {
                            var perfItem = result.values[j]; 
                            
                            if ( item.device == perfItem.properties.device ) {
                                item.perf.push(perfItem);  
                            }
                        }
                    }

                //
                // get specific a array infomation.
                //
                if (typeof arraysn !== 'undefined') { 

                    ArrayObj.findOne({"basicInfo.serialnb" : arraysn}, function (err, doc) {
                        //system error.
                        if (err) {
                            return   done(err);
                        }
                        if (!doc) { //user doesn't exist.
                            console.log("array is not exist. insert it."); 

                            param.result[0]['info'] = {};
                        
                        }
                        else {
                            console.log("Array is exist!");
             
                            param.result[0]['info'] = doc;
 
                        }
                        res.json(200, param.result);
                    });
                }

                }
             });

        });

         
    });


     app.get('/api/array/disks', function (req, res) {
 

        var arraysn = req.query.arraysn; 

        var param = {};
        param['filter_name'] = '(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'Availability\')';
        param['keys'] = ['device','part'];
        param['fields'] = ['disktype','partmode','sgname','diskrpm','director','partvend','partmdl','partver','partsn','disksize'];

        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&parttype=\'Disk\'';
        } else {
            param['filter'] = 'parttype=\'Disk\'';
        } 

        CallGet(param, function(param) {
            res.json(200, param.result);
        });



         
    });

    app.get('/api/array/luns', function ( req, res )  {

        var arraysn = req.query.arraysn; 

        var param = {};
        param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
        param['keys'] = ['serialnb','part'];
        param['fields'] = ['alias','parttype','config','poolemul','purpose','dgstype','poolname'];

        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'serialnb=\''+arraysn+'\'&(parttype=\'MetaMember\'|parttype=\'LUN\')';
        } else {
            param['filter'] = '(parttype=\'MetaMember\'|parttype=\'LUN\')';
        } 

        CallGet(param, function(param) {
            res.json(200, param.result);
        });



    } ) ;
 
 

     app.get('/api/array/pools', function ( req, res )  {

        var arraysn = req.query.arraysn; 

        var param = {};
        param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\')';
        param['keys'] = ['device','part'];
        param['fields'] = ['dgtype','partstat','poolemul','dgraid','raidtype','iscmpenb','disktype'];

        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&parttype=\'Storage Pool\'';
        } else {
            param['filter'] = 'parttype=\'Storage Pool\'';
        } 

        CallGet(param, function(param) {
            res.json(200, param.result);
        });


    } ) ;
 
     app.get('/api/array/ports', function ( req, res )  {

        var arraysn = req.query.arraysn; 

        var param = {};
        param['filter_name'] = '(name=\'IORate\'|name=\'Throughput\'|name=\'Availability\')';
        param['keys'] = ['device','feport'];
        param['fields'] = ['nodewwn','portwwn','partstat'];

        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&parttype=\'Port\'';
        } else {
            param['filter'] = 'parttype=\'Port\'';
        } 

        CallGet(param, function(param) {
            res.json(200, param.result);
        });
     } ) ;

 

     app.get('/api/array/switchs', function ( req, res )  {

        var arraysn = req.query.arraysn; 


        getTopos(function(topos) { 

            var conn_arrayport = topos.resultArrayDetail;

            if ( typeof arraysn === 'undefined' ) {
                res.json(200, conn_arrayport);
            }  else {
                var result = [];
                for ( var i in conn_arrayport ) {
                    var item = conn_arrayport[i];
                    if ( arraysn == item.array ) {
                        result.push(item);
                    }
                }

                res.json(200,result); 
            }
            
        });



     } ) ;
/*
*  Array Performance
*/

    app.get('/api/array/perf/trend', function (req, res) {

        var arraysn = req.query.arraysn; 
        var start = req.query.start; 
        var end = req.query.end; 

        if (typeof arraysn !== 'undefined') { 
            var filterbase = 'device=\''+arraysn+'\'&!parttype';
        } else {
            res.json(400, 'Must be have arraysn!')
            return;
        } 

        if ( typeof start === 'undefined' ) {
            res.json(400, 'Must be have start paramater!')
            return;
        }

        if ( typeof end === 'undefined' ) {
            res.json(400, 'Must be have end paramater!')
            return;
        }

        console.log(start);

        var filter = filterbase + '&(name==\'ReadRequests\'|name==\'WriteRequests\'|name==\'ReadThroughput\'|name==\'WriteThroughput\'|name==\'IORate\'|name==\'TotalCacheUtilization\')';
        var fields = 'device,name';
        var keys = ['device'];

        //var queryString =  {"filter":filter,"fields":fields}; 
        var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 



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
                        var result = JSON.parse(response.body).values;    

                        res.json(200,result);
                    }

                });
 
    });  



/*
*  Array Capacity
*/

    app.get('/api/array/capacity/trend', function (req, res) {

        var arraysn = req.query.arraysn; 
        var start = req.query.start; 
        var end = req.query.end; 

        if (typeof arraysn !== 'undefined') { 
            var filterbase = 'device=\''+arraysn+'\'&!parttype';
        } else {
            res.json(400, 'Must be have arraysn!')
            return;
        } 

        if ( typeof start === 'undefined' ) {
            res.json(400, 'Must be have start paramater!')
            return;
        }

        if ( typeof end === 'undefined' ) {
            res.json(400, 'Must be have end paramater!')
            return;
        }

        console.log(start);

        var filter = filterbase + '&(name==\'UsedCapacity\'|name==\'PoolFreeCapacity\')';
        var fields = 'device,name';
        var keys = ['device'];

        //var queryString =  {"filter":filter,"fields":fields}; 
        var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end }; 



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
                        var result = JSON.parse(response.body).values;    

                        res.json(200,result);
                    }

                });
 
    });  

    app.get('/api/array/capacity', function (req, res) {
 
 
         var arraysn = req.query.arraysn; 
        if (typeof arraysn !== 'undefined') { 
            var filterbase = 'device=\''+arraysn+'\'&!parttype';
        } else {
            var filterbase = '!parttype';
        } 

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name==\'PrimaryUsedCapacity\'|name==\'LocalReplicaUsedCapacity\'|name==\'RemoteReplicaUsedCapacity\'|name==\'SystemUsedCapacity\'|name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'VirtualUsedCapacity\'|name=\'HDFSUsedCapacity\'|name=\'ObjectUsedCapacity\'|name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredRawCapacity\'|name=\'UnusableCapacity\')';
                var fields = 'device,name';
                var keys = ['device'];





                //var queryString =  {"filter":filter,"fields":fields}; 
                var queryString =  util.CombineQueryString(filter,fields); 
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
                                    var arrayCapacitys = RecordFlat(response.body, keys);   
                                    var resultRecord =[];
                                    for ( var i in arrayCapacitys ) {
                                        var item = arrayCapacitys[i];
                                        
                                        var result = {};
                                        result['device'] = item.device;
                                        result['LastTS'] = item.LastTS;

                                        var rawCapacity = {};
                                        rawCapacity['ConfiguredRawCapacity'] = item.ConfiguredRawCapacity;
                                        rawCapacity['ConfiguredUsableCapacity'] = item.ConfiguredUsableCapacity;
                                        rawCapacity['HotSpareCapacity'] = item.HotSpareCapacity;
                                        rawCapacity['RAIDOverheadCapacity'] = item.RAIDOverheadCapacity;
                                        rawCapacity['UnconfiguredCapacity'] = item.UnconfiguredCapacity;
                                        rawCapacity['UnusableCapacity'] = item.UnusableCapacity;

                                        
                                        var usableCapacity = {};
                                        usableCapacity['FreeCapacity'] = item.FreeCapacity;
                                        usableCapacity['PoolFreeCapacity'] = item.PoolFreeCapacity;
                                        usableCapacity['UsedCapacity'] = item.UsedCapacity;
                                        rawCapacity['ConfiguredUsableCapacityDetail'] = usableCapacity;


                                        var usedByType ={};
                                        usedByType['BlockUsedCapacity'] = item.BlockUsedCapacity;
                                        usedByType['FileUsedCapacity'] = item.FileUsedCapacity;
                                        usedByType['VirtualUsedCapacity'] = item.VirtualUsedCapacity;
                                        usedByType['HDFSUsedCapacity'] = item.HDFSUsedCapacity;
                                        usedByType['ObjectUsedCapacity'] = item.ObjectUsedCapacity;
                                        usableCapacity['UsedCapacityByType'] = usedByType;
  
                                        var usedByPurpose ={};
                                        usedByPurpose['PrimaryUsedCapacity'] = item.PrimaryUsedCapacity;
                                        usedByPurpose['LocalReplicaUsedCapacity'] = item.LocalReplicaUsedCapacity;
                                        usedByPurpose['RemoteReplicaUsedCapacity'] = item.RemoteReplicaUsedCapacity;
                                        usedByPurpose['SystemUsedCapacity'] = item.SystemUsedCapacity; 
                                        usableCapacity['UsedCapacityByPurpose'] = usedByPurpose;

                                        result['Raw'] = rawCapacity;
 
                                        resultRecord.push(result);

                                    }

                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(arg1,  callback){  
               callback(null,arg1);
//                param['filter_name'] = '(name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\')';
  //              param['keys'] = ['device'];
    //            param['fields'] = ['model'];

/*
                var filter = filterbase + '&()';
                var fields = 'device,name';
                var keys = ['device'];

                //var queryString =  {"filter":filter,"fields":fields}; 
                var queryString =  util.CombineQueryString(filter,fields); 
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
                                var resultRecord = RecordFlat(response.body, keys);  
                                    //var resultRecord = JSON.parse(response.body).values; 
                                console.log(resultRecord);
                                arg1 = arg1.concat(resultRecord);
                                callback(null,arg1);
                            }
         
                        }); 
 */

            }
        ], function (err, result) {
           // result now equals 'done'
           res.json(200, result);
        });


 

         
    });





 

     app.get('/api/array/test', function ( req, res )  {

        getArrayPerformance(function(result) {
                console.log("---------------- Finished ------------");

                res.json(200, result);
        });



    } ) ;

    var getArrayPerformance =  function (callback) {
 
        var start = '2016-06-20T18:30:00+08:00'
        var end = '2016-07-01T18:30:00+08:00'
        var filterbase = '!parttype'; 

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name==\'ReadRequests\'|name==\'WriteRequests\')';
                var fields = 'device,name';
                var keys = ['device'];



                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

  
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
               callback(null,arg1);


            }
        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           var r = JSON.parse(result);
           callback(r);
        });


 

         
    };














/* 
*  Create a array record 
*/
    app.post('/api/arrays', function (req, res) {
        console.log(req.body);

        var array = req.body;

        ArrayObj.findOne({"basicInfo.serialnb" : array.basicInfo.serialnb}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("array is not exist. insert it."); 

                var newarray = new ArrayObj(array);
                newarray.save(function(err, thor) {
                  if (err)  {

                    console.dir(thor);
                    return res.json(400 , err);
                  } else 

                    return res.json(200, array);
                });
            }
            else {
                console.log("Array is exist!");
 

                doc.update(array, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(500 , {status: "The Array has exist! Update it."});
            }

        });



    });









};

module.exports = arrayController;
