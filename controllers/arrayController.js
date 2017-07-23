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

var App = require('../lib/App'); 
var getTopos = require('../lib/topos.js');


var GetEvents = require('../lib/GetEvents');
var VMAX = require('../lib/Array_VMAX');
var host = require('../lib/Host');

var testjson = require('../demodata/test');  


// ----------------------------------------
// ------------ For Demo Data -------------
// ----------------------------------------

var VMAXListJSON = require('../demodata/arrayContorller');
var demo_array_apps = require('../demodata/array_apps');
var demo_array_hosts= require('../demodata/array_hosts');
var demo_array_maskviews= require('../demodata/array_maskviews');
var demo_array_capacity = require('../demodata/array_capacity');
var demo_array_capacity_trend = require('../demodata/array_capacity_trend');
var demo_array_disks = require('../demodata/array_disks');
var demo_array_initialgroups = require('../demodata/array_initialgroups');
var demo_array_lunperf = require('../demodata/array_lunperf');
var demo_array_luns = require('../demodata/array_luns');
var demo_array_performance = require('../demodata/array_performance');
var demo_array_pools = require('../demodata/array_pools');
var demo_array_ports = require('../demodata/array_ports');
var demo_array_switchs = require('../demodata/array_switchs');

var VMAXDISKListJSON = require('../demodata/array_vmax_disks');
var VMAX_ListJSON = require('../demodata/array_vmax');



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
        var device = req.query.device;
        var datacenter = req.query.datacenter;

        if ( datacenter !== undefined) {
            VMAX.GetArraysByDatacenter(datacenter, function(ret) {
                res.json(200,ret);
            })

        } else {
                        
            VMAX.GetArrays(device, function(ret) {
                res.json(200,ret);
            })        
        }


    });

   app.get('/api/vmax/array', function (req, res) { 
    var device = req.query.device;

    if ( config.ProductType == 'demo' ) {
             res.json(200,VMAX_ListJSON);

    } else {

        if ( device === undefined ) {
            res.json(401, 'Must be special a device!')
            return;
        }

        VMAX.GetArrays_VMAX(device, function(ret) {

            var finalResult = [];
            var returnData = ret[0];
            var item = {};
            // Combine the UI element for VMAX Basic Info page.

            // -------------- Block1 ---------------------------
            var UI_Block1 = {} ;
            UI_Block1['title'] = "存储管理信息";
            UI_Block1['detail'] = [];

            item={};
            item["name"] = "存储序列号"; 
            item["value"] = returnData.device;
            UI_Block1.detail.push(item);
 
            item={};
            item["name"] = "厂商"; 
            item["value"] = returnData.vendor;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "型号"; 
            item["value"] = returnData.model;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "存储类型"; 
            item["value"] = returnData.sstype;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "微码版本"; 
            item["value"] = returnData.devdesc;
            UI_Block1.detail.push(item);


            // -------------- Block1 ---------------------------
 
            var UI_Block2 = {} ;
            UI_Block2['title'] = "存储硬件配置信息";
            UI_Block2['detail'] = [];

            item={};
            item["name"] = "缓存大小(Gb)"; 
            item["value"] = returnData.TotalMemory;
            UI_Block2.detail.push(item);

            item={};
            item["name"] = "磁盘数量"; 
            item["value"] = returnData.TotalDisk;
            UI_Block2.detail.push(item);

            item={};
            item["name"] = "LUN数量"; 
            item["value"] = returnData.TotalLun;
            UI_Block2.detail.push(item);


            // -------------- Finally combine the final result record -----------------
            finalResult.push(UI_Block1);
            finalResult.push(UI_Block2);

            res.json(200,finalResult);
        })
    }
    });

   app.get('/api/vmax/array/disks', function (req, res) { 
    var device = req.query.device;

    if ( config.ProductType == 'demo' ) { 
            res.json(200,VMAXDISKListJSON);
            return;

    } else {

            if ( device === undefined ) {
                res.json(400, 'Must be special a device!')
                return;
            }

            var param = {};
            param['filter_name'] = '(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'Availability\')';
            param['keys'] = ['device','part'];
            param['fields'] = ['disktype','partmode','sgname','diskrpm','director','partvend','partmdl','partver','partsn','disksize'];

            if (typeof device !== 'undefined') { 
                param['filter'] = 'device=\''+device+'\'&parttype=\'Disk\'';
            } else {
                param['filter'] = 'parttype=\'Disk\'';
            } 

            CallGet.CallGet(param, function(param) {
                
                var data = param.result;

                var finalResult = {};

                // ----- the part of chart --------------

                var groupby = "disktype";
                var groupbyField = "Capacity";
                var chartData = [];
                for ( var i in data ) {
                    var item = data[i];

                    var groupbyValue = item[groupby]; 
                    var itemValue = item[groupbyField];

                    var isFind = false;
                    for ( var j in chartData ) {
                        var charItem = chartData[j];
                        if ( charItem.name == groupbyValue ) {
                            charItem.value = charItem.value + parseFloat(itemValue);
                            isFind = true;
                        }
                    }
                    if ( !isFind ) {
                        var charItem = {};
                        charItem["name"] = groupbyValue;
                        charItem["value"] = parseFloat(itemValue);
                        chartData.push(charItem);
                    }

                }
                finalResult["chartType"] = "pie";
                finalResult["chartData"] = chartData;


                // ---------- the part of table ---------------
                var tableHeader = [];
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "磁盘名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "序列号";
                tableHeaderItem["value"] = "partsn";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "用途";
                tableHeaderItem["value"] = "partmode";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "类型";
                tableHeaderItem["value"] = "disktype";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "转速";
                tableHeaderItem["value"] = "diskrpm";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "型号";
                tableHeaderItem["value"] = "partmdl";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "微码版本";
                tableHeaderItem["value"] = "partver";
                tableHeaderItem["sort"] = "partver";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "厂商";
                tableHeaderItem["value"] = "partvend";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "disksize";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                
                finalResult["tableHead"] = tableHeader;
                finalResult["tableBody"] = data;


                res.json(200, finalResult);

            });

        }
    });


   app.get('/api/vmax/array/luns1', function (req, res) { 
    var device = req.query.device;

    if ( config.ProductType == 'demo' ) { 
            res.json(200,VMAXDISKListJSON);
            return;

    } else {

            if ( device === undefined ) {
                res.json(400, 'Must be special a device!')
                return;
            }

            var param = {};
            param['filter'] = '(parttype=\'MetaMember\'|parttype=\'LUN\')';
            param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
            param['keys'] = ['device','part','parttype'];
            param['fields'] = ['alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked'];
            param['limit'] = 1000000;

            if (typeof device !== 'undefined') { 
                param['filter'] = 'device=\''+device+'\'&' + param['filter'];
            } 


            CallGet.CallGet(param, function(param) { 
                
                var data = param.result;

                var finalResult = {};
 
                // ---------- the part of table ---------------
                var tableHeader = [];
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Thin?";
                tableHeaderItem["value"] = "dgstype";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "用途";
                tableHeaderItem["value"] = "purpose";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "类型";
                tableHeaderItem["value"] = "config";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Pool";
                tableHeaderItem["value"] = "poolname";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "masked?";
                tableHeaderItem["value"] = "ismasked";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem); 

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "已使用容量(GB)";
                tableHeaderItem["value"] = "UsedCapacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                
                finalResult["tableHead"] = tableHeader;
                finalResult["tableBody"] = data;


                res.json(200, finalResult);

            });

        }
    });

   app.get('/api/vmax/array/luns', function (req, res) { 
        var device = req.query.device;

        async.waterfall([
            function(callback){ 

            if ( device === undefined ) {
                res.json(400, 'Must be special a device!')
                return;
            }

            var param = {};
            param['filter'] = '(parttype=\'MetaMember\'|parttype=\'LUN\')';
            param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
            param['keys'] = ['device','part','parttype'];
            param['fields'] = ['alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked'];
            param['limit'] = 1000000;

            if (typeof device !== 'undefined') { 
                param['filter'] = 'device=\''+device+'\'&' + param['filter'];
            } 


            CallGet.CallGet(param, function(param) { 
                
                var data = param.result;
                callback(null,data);

            });

        },
        // -------------------------------------------------
        // Relation with VPLEX Virutal Volume and Maskview
        // -------------------------------------------------
        function(arg1,  callback) {  

            VMAX.GetAssignedVPlexByDevices(device,function(result) {

                for ( var i in arg1 ) {
                    var item = arg1[i];
                    item['ConnectedDevice'] = '';
                    item['ConnectedDeviceType'] = '';
                    item['ConnectedObject'] = '';
                    item['ConnectedHost'] = '';

                    for ( var j in result ) {
                        var vplexItem = result[j];
                        if ( item.partsn == vplexItem.deviceWWN ) {
                            item['ConnectedDevice'] = vplexItem.vplexName;
                            item['ConnectedDeviceType'] = 'VPlex';
                            item['ConnectedObject'] = vplexItem.vplexVVolName;
                            item['ConnectedHost'] = vplexItem.vplexMaskviewName;
                        }
                    }
                 }
                callback(null,arg1);

            })
           
        },
        function(arg1,  callback){  


                var data = arg1;


                var finalResult = {};

                // ---------- the part of table ---------------
                var tableHeader = [];
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Thin?";
                tableHeaderItem["value"] = "dgstype";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "用途";
                tableHeaderItem["value"] = "purpose";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "类型";
                tableHeaderItem["value"] = "config";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Pool";
                tableHeaderItem["value"] = "poolname";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "masked?";
                tableHeaderItem["value"] = "ismasked";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem); 

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "已使用容量(GB)";
                tableHeaderItem["value"] = "UsedCapacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "分配设备名称";
                tableHeaderItem["value"] = "ConnectedDevice";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "分配设备类型";
                tableHeaderItem["value"] = "ConnectedDeviceType";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "分配对象名";
                tableHeaderItem["value"] = "ConnectedObject";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "分配主机名称";
                tableHeaderItem["value"] = "ConnectedHost";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                
                finalResult["tableHead"] = tableHeader;
                finalResult["tableBody"] = data;

                callback(null,finalResult); 

            }
            ], function (err, result) {
                   // result now equals 'done' 
                   res.json(200, result);
            });
 
    });

    /*
    *  Add mata lun display
    */
   app.get('/api/vmax/array/lundetail', function (req, res) { 
        var device = req.query.device;
        var volname = req.query.volname;
        var metaconf  = req.query.metaconf;

            var param = {};
            param['filter'] = 'device=\''+device+'\'&parttype=\'MetaMember\'&headname=\''+volname + '\'';
            param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
            param['keys'] = ['device','part'];
            param['fields'] = ['alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked'];


            CallGet.CallGet(param, function(param) { 

                var data = param.result;

                var finalResult = {};

                // ---------- the part of table ---------------
                var tableHeader = [];
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Thin?";
                tableHeaderItem["value"] = "dgstype";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "用途";
                tableHeaderItem["value"] = "purpose";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "类型";
                tableHeaderItem["value"] = "config";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Pool";
                tableHeaderItem["value"] = "poolname";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);
 
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


  
                var tabledata = {};
                tabledata["tableHead"] = tableHeader;
                tabledata["tableBody"] = data;

                finalResult["tableData"] = [];
                finalResult.tableData.push(tabledata);

                res.json(200,finalResult);
 

            });
    });

    /*
    *  Add mata lun display
    */
   app.get('/api/vmax/array/lunsV2', function (req, res) { 
        var device = req.query.device;

        async.waterfall([
            function(callback){ 

            if ( device === undefined ) {
                res.json(400, 'Must be special a device!')
                return;
            }

            var param = {};
            //param['filter'] = '(parttype=\'LUN\')&(part=\'06B2\'|part=\'055B\'|part=\'09DA\')';
            param['filter'] = '(parttype=\'LUN\')';
            param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';
            param['keys'] = ['device','part','parttype'];
            param['fields'] = ['alias','config','poolemul','purpose','dgstype','poolname','partsn','sgname','ismasked','metadesc','metaconf'];
            param['limit'] = 1000000;

            if (typeof device !== 'undefined') { 
                param['filter'] = 'device=\''+device+'\'&' + param['filter'];
            } 


            CallGet.CallGet(param, function(param) { 
                
                var data = param.result;
                callback(null,data);

            });

        },
        // -------------------------------------------------
        // Relation with VPLEX Virutal Volume and Maskview
        // -------------------------------------------------
        function(arg1,  callback) {  

            VMAX.GetAssignedVPlexByDevices(device,function(result) {

                for ( var i in arg1 ) {
                    var item = arg1[i];
                    item['ConnectedDevice'] = '';
                    item['ConnectedDeviceType'] = '';
                    item['ConnectedObject'] = '';
                    item['ConnectedHost'] = '';

                    for ( var j in result ) {
                        var vplexItem = result[j];
                        if ( item.partsn == vplexItem.deviceWWN ) {
                            item['ConnectedDevice'] = vplexItem.vplexName;
                            item['ConnectedDeviceType'] = 'VPlex';
                            item['ConnectedObject'] = vplexItem.vplexVVolName;
                            item['ConnectedHost'] = vplexItem.vplexMaskviewName;
                        }
                    }
                 }
                callback(null,arg1);

            })
           
        },
        function(arg1,  callback){  


                var data = arg1;


                var finalResult = {};

                // ---------- the part of table ---------------
                var tableHeader = [];
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Thin?";
                tableHeaderItem["value"] = "dgstype";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "用途";
                tableHeaderItem["value"] = "purpose";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "类型";
                tableHeaderItem["value"] = "config";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Pool";
                tableHeaderItem["value"] = "poolname";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "masked?";
                tableHeaderItem["value"] = "ismasked";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem); 

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "metaed?";
                tableHeaderItem["value"] = "metaconf";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem); 

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "StorageGroup";
                tableHeaderItem["value"] = "sgname";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem); 
      
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "已使用容量(GB)";
                tableHeaderItem["value"] = "UsedCapacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "分配设备名称";
                tableHeaderItem["value"] = "ConnectedDevice";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "分配设备类型";
                tableHeaderItem["value"] = "ConnectedDeviceType";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "分配对象名";
                tableHeaderItem["value"] = "ConnectedObject";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "分配主机名称";
                tableHeaderItem["value"] = "ConnectedHost";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                
                // ---------- the part of table event ---------------
                var tableEvent = {}; 
                var tableEventParam = [];

                var tableEventParamItem = {};
                tableEventParamItem["findName"] = 'device';
                tableEventParamItem["postName"] = 'device';
                tableEventParam.push(tableEventParamItem);

                var tableEventParamItem = {};
                tableEventParamItem["findName"] = 'part';
                tableEventParamItem["postName"] = 'volname';
                tableEventParam.push(tableEventParamItem);


                var tableEventParamItem = {};
                tableEventParamItem["findName"] = 'metaconf';
                tableEventParamItem["postName"] = 'metaconf';
                tableEventParam.push(tableEventParamItem);

                tableEvent["event"] = "appendTable";
                tableEvent["param"] = tableEventParam; 
                tableEvent["url"] = "/vmax/array/lundetail";  




                finalResult["tableEvent"] = tableEvent;
                var tabledata = {};
                tabledata["tableHead"] = tableHeader;
                tabledata["tableBody"] = data;

                finalResult["tableData"] = [];
                finalResult.tableData.push(tabledata);

                callback(null,finalResult); 

            }
            ], function (err, result) {
                   // result now equals 'done' 
                   res.json(200, result);
            });
 
    });



   app.get('/api/vmax/array/pools', function (req, res) { 
    var device = req.query.device;

    if ( config.ProductType == 'demo' ) { 
            res.json(200,VMAXDISKListJSON);
            return;

    } else {

            if ( device === undefined ) {
                res.json(400, 'Must be special a device!')
                return;
            }

        var param = {};
        param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'SubscribedCapacity\')';
        param['keys'] = ['device','part'];
        param['fields'] = ['dgtype','partstat','poolemul','dgraid','raidtype','iscmpenb','disktype'];

        param['filter'] = 'device=\''+device+'\'&parttype=\'Storage Pool\'';


        CallGet.CallGet(param, function(param) {
  
                console.log(param.result);
                var data = param.result;

                var finalResult = {};
 
                // ---------- the part of table ---------------
                var tableHeader = []; 


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "保护方式";
                tableHeaderItem["value"] = "raidtype";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "状态";
                tableHeaderItem["value"] = "partstat";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "RAID类型";
                tableHeaderItem["value"] = "dgraid";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "磁盘类型";
                tableHeaderItem["value"] = "disktype";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "可用容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem); 

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "已分配容量(GB)";
                tableHeaderItem["value"] = "SubscribedCapacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);
 
                
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "已使用容量(GB)";
                tableHeaderItem["value"] = "UsedCapacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);
 
                
                finalResult["tableHead"] = tableHeader;
                finalResult["tableBody"] = data;


                res.json(200, finalResult);

            });

        }
    });

   app.get('/api/vmax/array/switchs', function (req, res) { 
    var device = req.query.device;

    if ( config.ProductType == 'demo' ) { 
            res.json(200,VMAXDISKListJSON);
            return;

    } else {

            if ( device === undefined ) {
                res.json(400, 'Must be special a device!')
                return;
            }

        var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
        queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";
        queryString = queryString + " SELECT distinct  ?FEPortDisplayName ?SwitchPortDisplayName ?SwitchDisplayName ?SwitchVendor ?SwitchModel  ";
        queryString = queryString + " WHERE {  ";
        queryString = queryString + "       ?array rdf:type srm:StorageEntity .    ";
        queryString = queryString + "       ?array srm:displayName ?ArrayDisplayName .    ";
        queryString = queryString + "       ?array srm:containsStorageFrontEndAdapter ?FEAdapter .    "; 
        queryString = queryString + "      ?FEAdapter srm:containsStorageFrontEndPort ?FEPort .     "; 
        queryString = queryString + "      ?FEPort srm:containsProtocolEndpoint ?FEPortEndpoint .     "; 
        queryString = queryString + "      ?FEPortEndpoint srm:connectedTo ?SwitchPortEndpoint .     "; 
        queryString = queryString + "      ?SwitchPortEndpoint srm:residesOnSwitchPort ?SwitchPort .     "; 

        queryString = queryString + "      ?SwitchPort srm:displayName ?SwitchPortDisplayName .     "; 
        queryString = queryString + "      ?FEPort srm:Identifier ?FEPortDisplayNameOrigin .     "; 
        queryString = queryString + "      BIND(REPLACE(?FEPortDisplayNameOrigin, \"topo:srm.StorageFrontEndPort:\", \"\", \"i\") AS ?FEPortDisplayName) . ";
        queryString = queryString + "      ?SwitchPortEndpoint srm:residesOnLogicalSwitch ?LogicalSwitch .     "; 
        queryString = queryString + "      ?LogicalSwitch srm:residesOnPhysicalSwitch ?PhysicalSwitch .     "; 
        queryString = queryString + "      ?LogicalSwitch srm:displayName ?SwitchDisplayName .     "; 
        queryString = queryString + "      ?LogicalSwitch srm:vendor ?SwitchVendor .     "; 
        queryString = queryString + "      ?PhysicalSwitch srm:model ?SwitchModel .     "; 
         queryString = queryString + "      FILTER ( ?ArrayDisplayName = \"" + device + "\" )  . ";
       queryString = queryString + "  } "; 
 

        getTopos.querySparql(queryString, function(result) {  
  
                

                var finalResult = {};
 
                // ---------- the part of table ---------------
                var tableHeader = []; 


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "前端口名称";
                tableHeaderItem["value"] = "FEPortDisplayName";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "联接交换机端口";
                tableHeaderItem["value"] = "SwitchPortDisplayName";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "交换机名称";
                tableHeaderItem["value"] = "SwitchDisplayName";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "交换机厂商";
                tableHeaderItem["value"] = "SwitchVendor";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "交换机型号";
                tableHeaderItem["value"] = "SwitchModel";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);
 
                
                finalResult["tableHead"] = tableHeader;
                finalResult["tableBody"] = result;


                res.json(200, finalResult);

            });

        }
    });



   app.get('/api/arrays/:device', function (req, res) {
        
	
        if ( config.ProductType == 'demo' ) {
		var rets = [];
		for ( var i in VMAXListJSON ) {
			var item = VMAXListJSON[i];
			if ( item.device ==  req.query.device  )  {
				rets.push(item);

			}
		}
                res.json(200,rets);
        } else {
		VMAX.GetArrays(req.query.device, function(ret) {
		    res.json(200,ret);
		})
	}

    });




     app.get('/api/array/apps', function (req, res) {

 
        var arraysn = req.query.device; 
        var finalRecord = [];
	if ( config.ProductType == 'demo' ) {
		res.json(200,demo_array_apps);
		return;
	} ;

        VMAX.GetAssignedHosts(arraysn, function(result) {

            var finalRecord = [];
            for ( var i in result ) {
                var item = result[i];

                var findApp  = false;
                if ( typeof item.host !== 'undefined') {

                   var applist = item.host.app_name.split(',');
                    for ( var appi in applist )  {
                        var appName = applist[appi];

                        for ( var recordi in finalRecord ) {
                            var finalRecordItem = finalRecord[recordi];
                            if ( finalRecordItem.app_name == appName ) {
                                findApp = true;
                                util.MergeAndDistinctItem( item.StorageGroup , finalRecordItem.Devices, 'partsn');
                                break;
                            }
                        }
                        if ( findApp == false ) {
                            var newRecord = {};
                            newRecord['app_name'] = appName;
                            newRecord['Devices'] = item.StorageGroup;
                            finalRecord.push(newRecord);
                        }
                    }
                } else {

                    for ( var recordi in finalRecord ) {
                        var finalRecordItem = finalRecord[recordi];
                        if ( finalRecordItem.app_name == item.hba_wwn ) {
                            findApp = true;
                            util.MergeAndDistinctItem( item.StorageGroup , finalRecordItem.Devices, 'partsn');
                            break;
                        }
                    }
                    if ( findApp == false ) {
                        var newRecord = {};
                        newRecord['app_name'] = item.hba_wwn;
                        newRecord['Devices'] = item.StorageGroup;
                        finalRecord.push(newRecord);   
                    }

                
                }
 
            }

            // Calculat the count and capacity of devices each host
            for ( var i in finalRecord) {
                var item = finalRecord[i];
                if ( typeof item.Devices !== 'undefined') {
                    var count = 0;
                    var capacity = 0;
                    for ( var j in item.Devices ) {
                        var deviceItem = item.Devices[j];
                        count++;
                        capacity += parseFloat(deviceItem.Capacity);
                    }
                    item['DeviceCount'] = count;
                    item['Capacity'] = capacity;
                } else {
                    item['DeviceCount'] = 0;
                    item['Capacity'] = 0;                    
                }
            }

            App.GetApps( function( app_code, app_result ) {

                for ( var i in finalRecord) {
                    var item = finalRecord[i];

                    for ( var j in app_result ) {
                        var appItem = app_result[j];
                        if ( item.app_name == appItem.alias ) {
                            item['app'] = appItem;
                        }
                    }
 
                }
                res.json(200,finalRecord);
            });  // GetApps

        });
 

    });
    
    app.get('/api/array/hosts', function (req, res) {

 
        var device = req.query.device; 
        var finalRecord = [];
        async.waterfall(

        [

            function(callback){ 
                VMAX.GetDevices(device,function(result) { 

                    callback(null,result);
                                      
                }); 

            }, 
            // Restruct to devices to by host .
            function(param,  callback){  
 
                var storagegroups=[];
                for ( var i in param ) {
                    var item = param[i];
                    if ( item.ismasked == "0" )  continue;

                    //item.Availability = ( Math.random() * 100 );
                    var ResponseTime = 0; 
                    for ( var z in item.perf ) {
                        var perfitem = item.perf[z]; 
                        if ( perfitem.ReadResponseTime !== undefined ) {
                            ResponseTime = ResponseTime + Math.floor(perfitem.max);
                        } else  if ( perfitem.WriteResponseTime !== undefined ) {
                            ResponseTime = ResponseTime + Math.floor(perfitem.max);
                        }
                    }

                    //console.log(item.part + "--------------------------"+ResponseTime);
                    if ( ResponseTime > 100 ) {
                        item.Availability = 100;
                    } else {
                        item.Availability = ResponseTime;
                    }

                    var isFind = false;
                    for ( var j in storagegroups ) {
                        var sgitem = storagegroups[j];
                        if ( sgitem.host_name == item.sgname ) {
                            sgitem.Devices.push(item);
                            isFind = true;
                            break;                        
                        }
                    }
                    if ( !isFind ) {
                        var newhostItem = {};
                        newhostItem["app_name"] = '';
                        newhostItem["host_name"] = item.sgname;
                        newhostItem["host_type"] = '';
                        newhostItem["host_status"] = '';
                        newhostItem["host_ip"] = '';
                        newhostItem["host_os"] = '';
                        newhostItem["host_osversion"] = '';
                        newhostItem["Devices"] = [];  
                        newhostItem.Devices.push(item);    
                        storagegroups.push(newhostItem);                        
                    }



                    
 
                    callback(null,storagegroups);
                }

            },

            function(param,  callback){  

                  callback(null,param);

            }

        ], function (err, result) {

              // result now equals 'done'

              res.json(200,result);

        });
    });


    app.get('/api/array/hosts_old', function (req, res) {

 
        var device = req.query.device; 
        var finalRecord = [];
        async.waterfall(

        [

            function(callback){ 
                VMAX.GetDevices(device,function(result) { 

                    callback(null,result);
                                      
                }); 

            }, 
            // Restruct to devices to by host .
            function(param,  callback){  

                var hosts = [];
                for ( var i in param ) {
                    var item = param[i];
                    if ( item.ismasked == "0" )  continue;

                    //item.Availability = ( Math.random() * 100 );
                    var ResponseTime = 0; 
                    for ( var z in item.perf ) {
                        var perfitem = item.perf[z]; 
                        if ( perfitem.ReadResponseTime !== undefined ) {
                            ResponseTime = ResponseTime + Math.floor(perfitem.max);
                        } else  if ( perfitem.WriteResponseTime !== undefined ) {
                            ResponseTime = ResponseTime + Math.floor(perfitem.max);
                        }
                    }

                    //console.log(item.part + "--------------------------"+ResponseTime);
                    if ( ResponseTime > 100 ) {
                        item.Availability = 100;
                    } else {
                        item.Availability = ResponseTime;
                    }

                    for ( var j in item.hostinfo ) {
                        var hostItem = item.hostinfo[j];

                        var newhostItem = {};

                        if ( hostItem.hostname == 'unknow' ) {
                            var hostname = hostItem.hbawwn;  
                        }
                        else {
                            var hostname = hostItem.hostname;
                        }
                        
                        var isFind = false;
                        for ( var z in hosts ) {
                            var newhost = hosts[z];
                            if ( newhost.host_name == hostname ) {
                                newhost.Devices.push(item);
                                isFind = true;
                                break;
                            }
                        }
                        if ( !isFind ) {
                            if ( hostItem.hostname == 'unknow' ) {
                                var hostname = hostItem.hbawwn;                            
                                newhostItem["app_name"] = '';
                                newhostItem["host_name"] = hostItem.hbawwn;
                                newhostItem["host_type"] = '';
                                newhostItem["host_status"] = '';
                                newhostItem["host_ip"] = '';
                                newhostItem["host_os"] = '';
                                newhostItem["host_osversion"] = '';
                                newhostItem["Devices"] = [];
                            } else {
                                var hostname = hostItem.hostname;
                                newhostItem["app_name"] = hostItem.app_name;
                                newhostItem["host_name"] = hostItem.hostname;
                                newhostItem["host_type"] = hostItem.host_type;
                                newhostItem["host_status"] = hostItem.status;
                                newhostItem["host_ip"] = hostItem.ip;
                                newhostItem["host_os"] = hostItem.OS;
                                newhostItem["host_osversion"] = hostItem.OSVersion;
                                newhostItem["Devices"] = [];
                            }     


                            newhostItem.Devices.push(item); 
                            hosts.push(newhostItem);                      
                        }  

                    }
 
                    callback(null,hosts);
                }

            },

            function(param,  callback){  

                  callback(null,param);

            }

        ], function (err, result) {

              // result now equals 'done'

              res.json(200,result);

        });
    });



     app.get('/api/array/hosts1', function (req, res) {

 
        var arraysn = req.query.device; 
        var finalRecord = [];

    	if ( config.ProductType == 'demo' ) {
    		res.json(200,demo_array_hosts);
    		return;
    	} ;

        VMAX.GetAssignedHosts(arraysn, function(result) {


            for (var i in result ) {
                var item = result[i];
                var finalRecordItem = {};
                if ( typeof item.host !== 'undefined' ) {
                    // Find a host
                    var findHost = false;
                    for ( var j in finalRecord ) {
                        var hostItem = finalRecord[j];
                        if ( item.host.hostname == hostItem.host_name ) {
                            findHost = true;

                            util.MergeAndDistinctItem( item.StorageGroup , hostItem.Devices, 'partsn');

                            break;
                        } 
                    }
                    if ( findHost == false ) {
                        finalRecordItem['app_name'] = item.host.app_name;                        
                        finalRecordItem['host_name'] = item.host.hostname;
                        finalRecordItem['host_type'] = item.host.host_type;
                        finalRecordItem['host_status'] = item.host.host_status;
                        finalRecordItem['host_ip'] = item.host.ip;
                        finalRecordItem['host_os'] = item.host.OS;
                        finalRecordItem['host_osversion'] = item.host.OSVersion;
                        finalRecordItem['Devices'] = item.StorageGroup;
                        finalRecord.push(finalRecordItem);
                    }

                                        
                } else {
                    // Not find host
                    finalRecordItem['app_name'] = '';
                    
                    finalRecordItem['host_name'] = item.hba_wwn;
                    finalRecordItem['host_type'] = '';
                    finalRecordItem['host_status'] = '';
                    finalRecordItem['host_ip'] = '';
                    finalRecordItem['host_os'] = '';
                    finalRecordItem['host_osversion'] = '';
                    finalRecordItem['Devices'] = item.StorageGroup;

                    finalRecord.push(finalRecordItem);

                }
                
            }

            // Calculat the count and capacity of devices each host
            for ( var i in finalRecord) {
                var item = finalRecord[i];
                if ( typeof item.Devices !== 'undefined') {
                    var count = 0;
                    var capacity = 0;
                    for ( var j in item.Devices ) {
                        var deviceItem = item.Devices[j];
                        count++;
                        capacity += parseFloat(deviceItem.Capacity);
                    }
                    item['DeviceCount'] = count;
                    item['Capacity'] = capacity;
                } else {
                    item['DeviceCount'] = 0;
                    item['Capacity'] = 0;                    
                }
            }


            res.json(200,finalRecord);
        });
 

    });



     app.get('/api/array/maskviews', function (req, res) {


        var arraysn = req.query.device; 

	if ( config.ProductType == 'demo' ) {
		res.json(200,demo_array_maskviews);
		return;
	} ;

        VMAX.GetMaskViews(arraysn, function(result) {
            res.json(200,result);
        });

    });

     app.get('/api/array/initialgroups', function (req, res) {


        var arraysn = req.query.device; 

        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_array_initialgroups);
                return;
        } ;


        VMAX.GetInitialGroups(arraysn, function(result) {
            res.json(200,result);
        });

    });

     app.get('/api/array/disks', function (req, res) {
 

        var arraysn = req.query.device; 

        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_array_disks);
                return;
        } ;


        var param = {};
        param['filter_name'] = '(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'Availability\')';
        param['keys'] = ['device','part'];
        param['fields'] = ['disktype','partmode','sgname','diskrpm','director','partvend','partmdl','partver','partsn','disksize'];

        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&parttype=\'Disk\'';
        } else {
            param['filter'] = 'parttype=\'Disk\'';
        } 

        CallGet.CallGet(param, function(param) {
            res.json(200, param.result);
        });



         
    });
    app.get('/api/array/luns', function ( req, res )  {

        var arraysn = req.query.device; 


        VMAX.GetDevices(arraysn, function(result) {
            res.json(200,result);
        });
    });

 

     app.get('/api/array/pools', function ( req, res )  {

        var arraysn = req.query.device; 

        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_array_pools);
                return;
        } ;


        var param = {};
        param['filter_name'] = '(name=\'UsedCapacity\'|name=\'Capacity\')';
        param['keys'] = ['device','part'];
        param['fields'] = ['dgtype','partstat','poolemul','dgraid','raidtype','iscmpenb','disktype'];

        if (typeof arraysn !== 'undefined') { 
            param['filter'] = 'device=\''+arraysn+'\'&parttype=\'Storage Pool\'';
        } else {
            param['filter'] = 'parttype=\'Storage Pool\'';
        } 

        CallGet.CallGet(param, function(param) {
            res.json(200, param.result);
        });


    } ) ;
 
     app.get('/api/array/ports', function ( req, res )  {

        var arraysn = req.query.device; 

        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_array_ports);
                return;
        } ;


        VMAX.GetFEPorts(arraysn, function(result) {
            res.json(200,result);
        });

     } ) ;


     app.get('/api/array/switchs', function ( req, res )  {

        var arraysn = req.query.device; 

        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_array_switchs);
                return;
        } ;



        getTopos.getTopos(function(topos) { 

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

        var arraysn = req.query.device; 
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

        var arraysn = req.query.device; 
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

        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_array_capacity_trend);
                return;
        } ;


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
 
 
         var arraysn = req.query.device; 

        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_array_capacity);
                return;
        } ;



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
                                    var arrayCapacitys = RecordFlat.RecordFlat(response.body, keys);   
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
 

            }
        ], function (err, result) {
           // result now equals 'done'
           res.json(200, result);
        });


 

         
    });


    app.get('/api/array/events', function (req, res) {
 
 
        var arraysn = req.query.device; 
        var eventParam = {};
        if (typeof arraysn !== 'undefined') { 
            eventParam['filter'] = 'device=\''+arraysn + '\'&!acknowledged&active=\'1\'&devtype=\'Array\'';
            var filterbase = 'device=\''+arraysn+'\'&!parttype';
        } else {
            eventParam['filter'] = '!acknowledged&active=\'1\'&devtype=\'Array\'';
        } 

        //console.log(eventParam);
        GetEvents.GetEvents(eventParam, function(result) {   

            res.json(200,result);
        });


    });






    app.get('/api/array/performance', function (req, res) {
 
 
        var arraysn = req.query.device; 

        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_array_performance);
                return;
        } ;



        var eventParam = {};
        if (typeof arraysn !== 'undefined') { 
            eventParam['filter'] = 'device=\''+arraysn + '\'&!acknowledged&active=\'1\'&devtype=\'Array\'';
            var filterbase = 'device=\''+arraysn+'\'&!parttype';
        } else {
            eventParam['filter'] = '!acknowledged&active=\'1\'&devtype=\'Array\'';
        } 

        //console.log(eventParam);
        VMAX.getArrayPerformance( function(result) {   

            res.json(200,result);
        });


    });


 


    app.get('/api/array/lunperf', function (req, res) {
 
 
        var arraysn = req.query.device; 

        if ( config.ProductType == 'demo' ) {
                res.json(200,demo_array_lunperf);
                return;
        } ;


        //console.log(eventParam);
        VMAX.getArrayLunPerformance(arraysn, function(result) {   

            res.json(200,result);
        });


    });


 






/* 
*  Create a array record 
*/
    app.post('/api/arrays', function (req, res) { 
        var array = req.body;

        ArrayObj.findOne({"basicInfo.device" : array.basicInfo.device}, function (err, doc) {
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

                    return res.json(200, {status: "The Array insert is succeeds!"});
                });
            }
            else { 
                console.log(array);
                doc.update(array, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(200 , {status: "The Array has exist! Update it."});
            }

        });



    });




 

     app.get('/api/array/test', function ( req, res )  {
        var device = req.query.device; 

        //VMAX.GetAssignedVPlexByDevices(device,function(locations) {  
        //VMAX.GetAssignedHosts(device,function(locations) {
       //VMAX.GetMaskViews(device,function(locations) {
        //VMAX.GetAssignedHostsByDevices(device,function(locations) { 
        //VMAX.GetAssignedHostsByDevices(device,function(locations) { 
    
                VMAX.GetDevices(device,function(result) { 

                    res.json(200,result);
                                      
                }); 

        //VMAX.getArrayLunPerformance(device,function(result) {
        //
        //
        /*
        var inits = [];
        var init="5000144290592910";
        inits.push(init);
        var init="500014428059CB11";
        inits.push(init);
        
        VMAX.GetAssignedLUNByInitiator(inits,function(result) {
             res.json(200,result);
        })
        */

    } ) ;

 


     app.get('/api/array/test1', function ( req, res )  {
        

        var arg1 = testjson;

                console.log(arg1);
                var charts = [];

                for ( var i in arg1 ) {
                    var item = arg1[i];

                    for ( var matricsi in item.matrics ) {

                        var matrics = item.matrics[matricsi];
                        //console.log("--------matrics begin ------------");
                        //console.log(matrics);
                        //console.log("--------matrics end------------");
                        var keys = Object.keys(matrics);
                        var lunname = item.part;                //lunname;
                        var arrayname  = item.device;           //array

                        for ( var keyi in keys ) {
                            var keyname = keys[keyi];

                            if ( keyname == 'timestamp' ) {
                                var timestamp = matrics[keyname];   //ts
                                continue;
                            } else {
                                var categoryname = keyname;         //perf-matrics-name
                                var value = matrics[keyname];       //perf-matrics-value
                            }
                            //console.log("array="+arrayname);
                            //console.log("lunname="+lunname);
                            //console.log("ts="+timestamp);
                            //console.log("categoryname="+categoryname);
                            //console.log("value="+value);
                            //console.log("---------");

                            // Search in result struct 
                            var isFind_chart = false;
                            for ( var charti in charts ) {
                                var chartItem = charts[charti];
                                if ( chartItem.category == categoryname ) {
                                    isFind_chart = true;

                                    var isFind_chartData = false;
                                    for ( var chartDatai in chartItem.chartData ) {
                                        var chartDataItem = chartItem.chartData[chartDatai] ;
                                        if ( chartDataItem.name == timestamp ) {
                                            isFind_chartData = true;
                                            chartDataItem[lunname] = value;
                                        }

                                    } // for 

                                    if ( !isFind_chartData ) {
                                        var chartDataItem = {};
                                        chartDataItem['name'] = timestamp;
                                        chartDataItem[lunname] = value;
                                        chartItem.chartData.push(chartDataItem);
                                    }

                                }
                            } // for ( charts ) 

                            if ( !isFind_chart ) {
                                var chartItem = {};
                                chartItem['category'] = categoryname;
                                chartItem['chartData'] = [];

                                var chartDataItem = {};
                                chartDataItem['name'] = timestamp;
                                chartDataItem[lunname] = value;
                                chartItem.chartData.push(chartDataItem);

                                charts.push(chartItem);
                            }


                        } // for ( keys )
                    } // for ( matrics )
                    
                } // for ( arg1 )
        res.json(200,charts);
        

    } ) ;








};

module.exports = arrayController;
