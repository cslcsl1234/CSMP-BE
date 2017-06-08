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
var mongoose = require('mongoose');  
var VPLEX = require('../lib/Array_VPLEX'); 




var virtualArrayController = function (app) {

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



   app.get('/api/virtualarrays', function (req, res) { 
        var device = req.query.device;


		VPLEX.GetArrays(device, function(ret) {
		    res.json(200,ret);
		}) 
    });

 
   app.get('/api/vplex/array', function (req, res) { 
    var device = req.query.device;
 

        if ( device === undefined ) {
            res.json(401, 'Must be special a device!')
            return;
        }

        VPLEX.GetArrays(device, function(ret) {

            var finalResult = [];
            var returnData = ret[0];
            var item = {};
            // Combine the UI element for VMAX Basic Info page.

            // -------------- Block1 ---------------------------
            var UI_Block1 = {} ;
            UI_Block1['title'] = "虚拟存储管理信息";
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
            item["value"] = returnData.vstgtype;
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
            item["value"] = 0;
            UI_Block2.detail.push(item);

            item={};
            item["name"] = "磁盘数量"; 
            item["value"] = 0;
            UI_Block2.detail.push(item);

            item={};
            item["name"] = "LUN数量"; 
            item["value"] = 0;
            UI_Block2.detail.push(item);


            // -------------- Finally combine the final result record -----------------
            finalResult.push(UI_Block1);
            finalResult.push(UI_Block2);

            res.json(200,finalResult);
        }) 


    });

   app.get('/api/vplex/disks', function (req, res) { 
    var device = req.query.device;
 

        if ( device === undefined ) {
            res.json(401, 'Must be special a device!')
            return;
        }

        VPLEX.getVplexDisks(device, function(ret) { 
            var data = ret;

            var finalResult = {};

                        // ----- the part of chart --------------

            var groupby = "array";
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
            tableHeaderItem["name"] = "磁盘序列号";
            tableHeaderItem["value"] = "partsn";
            tableHeaderItem["sort"] = "true";
            tableHeader.push(tableHeaderItem);


            var tableHeaderItem = {};
            tableHeaderItem["name"] = "来源存储";
            tableHeaderItem["value"] = "array";
            tableHeaderItem["sort"] = "true";
            tableHeader.push(tableHeaderItem);

            var tableHeaderItem = {};
            tableHeaderItem["name"] = "Device";
            tableHeaderItem["value"] = "dev";
            tableHeaderItem["sort"] = "true";
            tableHeader.push(tableHeaderItem);

            var tableHeaderItem = {};
            tableHeaderItem["name"] = "";
            tableHeaderItem["value"] = "虚拟磁盘";
            tableHeaderItem["sort"] = "vdisk";
            tableHeader.push(tableHeaderItem);

            var tableHeaderItem = {};
            tableHeaderItem["name"] = "已分配";
            tableHeaderItem["value"] = "isused";
            tableHeaderItem["sort"] = "true";
            tableHeader.push(tableHeaderItem);

            var tableHeaderItem = {};
            tableHeaderItem["name"] = "容量(GB)";
            tableHeaderItem["value"] = "Capacity";
            tableHeaderItem["sort"] = "true";
            tableHeader.push(tableHeaderItem);
  
            
            finalResult["tableHead"] = tableHeader;
            finalResult["tableBody"] = data;


            res.json(200,finalResult);

        });
   });

// -------------------------------------- END ------------------------------------

};

module.exports = virtualArrayController;
