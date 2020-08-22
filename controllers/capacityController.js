"use strict";
const logger = require("../lib/logger")(__filename);

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('capacityController')
const name = 'my-app'
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');

var mongoose = require('mongoose');
var ArrayObj = mongoose.model('Array');

var CallGet = require('../lib/CallGet');
var getTopos = require('../lib/topos.js');
var CAPACITY = require('../lib/Array_Capacity');


var GetEvents = require('../lib/GetEvents');

// ----------------------------------------
// ------------ For Demo Data -------------
// ----------------------------------------
var Capacity_Overview = require('../demodata/Capacity_Overview');
var Capacity_DistributeMap = require('../demodata/Capacity_DistributeMap');

var Capacity_PoolDetail = require('../demodata/Capacity_PoolDetail');
var Capacity_PoolComponentDetail = require('../demodata/Capacity_PoolComponentDetail');
var Capacity_PoolOverview = require('../demodata/Capacity_PoolOverview');


var capacityController = function (app) {

    var config = configger.load();

    app.all('*', function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
        res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        res.header('Access-Control-Expose-Headers', '*');

        debug('req.method = %s', req.method);
        debug('req.url = %s', req.url);

        if (req.method == "OPTIONS") res.send(200); /*让options请求快速返回*/
        else next();
    });

    app.get('/api/capacity/distributemap', function (req, res) {

        async.waterfall([
            function (callback) {
                var periodType;
                CAPACITY.GetArrayTotalCapacity(periodType, function (ret) {
                    callback(null, ret.Total);
                })
            },
            function (arg1, callback) {
                if ( JSON.stringify(arg1) == "{}" ) 
                    callback(604, arg1) 
                else {
                    var res = CAPACITY.CombineCapacity(arg1);
                    callback(null, res);
                }

            },
            function (arg1, callback) {
                callback(null, arg1);
            }
        ], function (err, ret) {
            // result now equals 'done'
            res.json(200, ret);
        });
    });

    app.get('/api/capacity/distributemapByArray1', function (req, res) {
        var periodtype;
        async.waterfall([

            function (callback) {
                CAPACITY.GetArrayTotalCapacity(periodtype, function (ret) {
                    callback(null, ret.Detail);
                })
            },
            function (arg1, callback) {

                var result = [];
                for (var i in arg1) {
                    var item = arg1[i];
                    var res = CAPACITY.CombineCapacity(item);
                    result.push(res);
                }
                callback(null, result);
            }
        ], function (err, ret) {
            // result now equals 'done'
            res.json(200, ret);
        });

    });


    app.get('/api/capacity/distributemapByArray', function (req, res) {

        async.waterfall([

            function (callback) {
                var periodType = '';
                getPeriodCapacity(periodType, function (rss) {
                    callback(null, rss);
                });
            },
            function (arg1, callback) {

                var periodType = 'lastyear';
                getPeriodCapacity(periodType, function (lastyear_res) {
                    for (var i in arg1) {
                        var item = arg1[i];

                        for (var j in lastyear_res) {
                            var lyItem = lastyear_res[j];
                            if (item.device == lyItem.device) {
                                item["YearOnYearGrowthRate"] = (lyItem.Allocated > 0 ? ((item.Allocated - lyItem.Allocated) / lyItem.Allocated) * 100 : 0);
                                break;
                            }
                        }
                    }

                    callback(null, arg1);
                });

            },
            function (arg1, callback) {

                var periodType = 'lastmonth';
                getPeriodCapacity(periodType, function (lastmonth_res) {
                    for (var i in arg1) {
                        var item = arg1[i];

                        for (var j in lastmonth_res) {
                            var lyItem = lastmonth_res[j];
                            if (item.device == lyItem.device) {
                                item["MonthOnMonthGrowthRate"] = (lyItem.Allocated > 0 ? ((item.Allocated - lyItem.Allocated) / lyItem.Allocated) * 100 : 0);
                                break;
                            }
                        }
                    }

                    callback(null, arg1);
                });

            }
        ], function (err, ret) {
            // result now equals 'done'
            res.json(200, ret);
        });


    });

    var getPeriodCapacity = function (periodtype, callback) {
        async.waterfall([

            function (callback) {
                CAPACITY.GetArrayTotalCapacity(periodtype, function (ret) {
                    callback(null, ret.Detail);
                })
            },
            function (arg1, callback) {

                var result = [];
                for (var i in arg1) {
                    var item = arg1[i];
                    var res = CAPACITY.CombineCapacity(item);
                    result.push(res);
                }
                callback(null, result);
            },
            function (arg1, callback) {

                var finalResult = [];
                for (var i in arg1) {
                    var item = arg1[i];

                    var resItem = {};

                    resItem["device"] = item.device;
                    resItem["Allocated"] = item.RawCapacity.ConfiguredRawCapacityGB.ConfiguredUsable.Allocated.Total;
                    resItem["PoolFree"] = item.RawCapacity.ConfiguredRawCapacityGB.ConfiguredUsable.AllocateUsable.BlockPoolFree;
                    resItem["NASPoolFree"] = item.RawCapacity.ConfiguredRawCapacityGB.ConfiguredUsable.AllocateUsable.NASPoolFree;
                    resItem["ConfiguredUsableFree"] = item.RawCapacity.ConfiguredRawCapacityGB.ConfiguredUsable.AllocateUsable.ConfiguredUsableFree;

                    finalResult.push(resItem);
                }
                callback(null, finalResult);
            }
        ], function (err, ret) {
            // result now equals 'done'
            callback(ret);
        });

    };

    app.get('/api/capacity/overview', function (req, res) {
        res.json(200, Capacity_Overview);

    });
    app.get('/api/capacity/PoolOverview', function (req, res) {
        res.json(200, Capacity_PoolOverview);
    });
    app.get('/api/capacity/PoolDetail', function (req, res) {
        res.json(200, Capacity_PoolDetail);
    });
    app.get('/api/capacity/PoolComponentDetail', function (req, res) {
        res.json(200, Capacity_PoolComponentDetail);
    });



    /*
     *  Array Capacity
     */



    app.get('/api/capacity/overview1', function (req, res) {

        if (config.ProductType == 'demo') {
            res.json(200, Capacity_Overview);
            return;
        };


        async.waterfall([
            function (callback) {


                var param = {};
                param['filter'] = '!parttype';
                param['filter_name'] = '(name==\'PrimaryUsedCapacity\'|name==\'LocalReplicaUsedCapacity\'|name==\'RemoteReplicaUsedCapacity\'|name==\'SystemUsedCapacity\'|name=\'BlockUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'VirtualUsedCapacity\'|name=\'HDFSUsedCapacity\'|name=\'ObjectUsedCapacity\'|name=\'FreeCapacity\'|name=\'PoolFreeCapacity\'|name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'HotSpareCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'UnconfiguredCapacity\'|name=\'ConfiguredRawCapacity\'|name=\'UnusableCapacity\')';
                param['keys'] = ['device'];
                param['fields'] = ['device'];
                param['limit'] = 1000000;

                CallGet.CallGet(param, function (param) {


                    var data = param.result;
                    callback(null, data);
                });

            },
            function (arg1, callback) {
                callback(null, arg1);


            }
        ], function (err, result) {
            // result now equals 'done'
            res.json(200, result);
        });





    });


    app.get('/api/capacity/PoolOverview1', function (req, res) {

        if (config.ProductType == 'demo') {
            res.json(200, Capacity_PoolOverview);
            return;
        };


        async.waterfall([
            function (callback) {


                callback(null, "neet to do");

            },
            function (arg1, callback) {
                callback(null, arg1);


            }
        ], function (err, result) {
            // result now equals 'done'
            res.json(200, result);
        });





    });




    app.get('/api/capacity/PoolDetail1', function (req, res) {

        if (config.ProductType == 'demo') {
            res.json(200, Capacity_PoolDetail);
            return;
        };



        async.waterfall([
            function (callback) {

                var param = {};
                param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\')';
                param['keys'] = ['device', 'part'];
                param['fields'] = ['diskrpm', 'isfast', 'raidtype', 'pooltype'];

                param['filter'] = 'parttype=\'Storage Pool\'';


                CallGet.CallGet(param, function (param) {
                    var data = param.result;
                    callback(null, data);
                });

            },
            function (arg1, callback) {
                callback(null, arg1);


            }
        ], function (err, result) {
            // result now equals 'done'
            res.json(200, result);
        });





    });


    app.get('/api/capacity/PoolComponentDetail1', function (req, res) {

        if (config.ProductType == 'demo') {
            res.json(200, Capacity_PoolComponentDetail);
            return;
        };


        async.waterfall([
            function (callback) {


                callback(null, "neet to do");

            },
            function (arg1, callback) {
                callback(null, arg1);


            }
        ], function (err, result) {
            // result now equals 'done'
            res.json(200, result);
        });

    });




};

module.exports = capacityController;