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
var util = require('../lib/util');

var async = require('async'); 
var cache = require('memory-cache');

var VMAX = require('../lib/Array_VMAX');


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
            res.json(400, 'Must be special a device!')
            return;
        }

        async.waterfall([
            function(callback){ 

            VPLEX.getVplexDisks(device, function(ret) {  
                 
                callback(null,ret);

            });


        },
        // -------------------------------------------------
        // Relation with VPLEX Virutal Volume and Maskview
        // -------------------------------------------------
        function(arg1,  callback) {  

            VPLEX.GetStorageVolumeByDevices(device,function(result) {

                for ( var i in arg1 ) {
                    var item = arg1[i];
                    item['ProviderByDevice'] = '';
                    item['ProviderByDeviceType'] = '';
                    item['ProviderToObject'] = '';
                    item['ConnectedHost'] = '';

                    for ( var j in result ) {
                        var vplexItem = result[j];
                        if ( item.partsn == vplexItem.vplexStorageVolumeSN ) { 
                            item['ProviderByDevice'] = vplexItem.storageName; 
                            item['ProviderByDeviceType'] = vplexItem.storageModel;
                            item['ProviderToObject'] = vplexItem.vplexVVolName ;
                            item['ConnectedHost'] = vplexItem.maskviewName ;
                        }
                    }
                    if (item['ProviderByDevice'] == ''  ) {
                        item['ProviderByDevice'] = item.array;
                        item['ProviderToObject'] = item.vvol ;
                    }
 
                 }
                callback(null,arg1);

            })
           
        },
        function(arg1,  callback){  


                var data = arg1;


                var finalResult = {};

                       // ----- the part of chart --------------

                var groupby = "ProviderByDevice";
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
                tableHeaderItem["name"] = "名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "供给虚拟卷名称";
                tableHeaderItem["value"] = "ProviderToObject";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "已使用";
                tableHeaderItem["value"] = "isused";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "来源存储";
                tableHeaderItem["value"] = "ProviderByDevice";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "来源存储型号";
                tableHeaderItem["value"] = "ProviderByDeviceType";
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


 
   app.get('/api/vplex/vvol', function (req, res) { 
        var device = req.query.device;

        if ( device === undefined ) {
            res.json(400, 'Must be special a device!')
            return;
        }

        async.waterfall([
            function(callback){ 

            VPLEX.getVplexVirtualVolume(device, function(ret) {  
                 
                callback(null,ret);

            });


        },
        // -------------------------------------------------
        // Relation with VPLEX Virutal Volume and Maskview
        // -------------------------------------------------
        function(arg1,  callback) {  

            VPLEX.GetVirtualVolumeRelationByDevices(device,function(result) {

                for ( var i in arg1 ) {
                    var item = arg1[i];
                    item['ProviderByDevice'] = '';
                    item['ProviderByDeviceType'] = '';
                    item['ProviderFromObject'] = '';
                    item['ConnectedHost'] = '';

                    for ( var j in result ) {
                        var vplexItem = result[j];
                        if ( item.part == vplexItem.VPlexVirtualVolumeName ) { 
                            item['ProviderByDevice'] = vplexItem.storageName; 
                            item['ProviderByDeviceType'] = vplexItem.storageModel;
                            item['ProviderFromObject'] = vplexItem.storageVolumeName ;
                            item['ConnectedHost'] = item.view ;
                        }
                    } 
                    if (item['ProviderByDevice'] == ''  ) {
                        item['ProviderByDevice'] = item.array;
                        item['ProviderFromObject'] = '';
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
                tableHeaderItem["name"] = "虚拟卷名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "保护类型";
                tableHeaderItem["value"] = "dgraid";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "来源虚拟磁盘";
                tableHeaderItem["value"] = "vdisk";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "来源物理存储";
                tableHeaderItem["value"] = "ProviderByDevice";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "来源物理存储型号";
                tableHeaderItem["value"] = "ProviderByDeviceType";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "来源物理Device";
                tableHeaderItem["value"] = "ProviderFromObject";
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


   app.get('/api/vplex/storageview', function (req, res) { 
        var device = req.query.device;

        if ( device === undefined ) {
            res.json(400, 'Must be special a device!')
            return;
        }

        async.waterfall([
            function(callback){ 
                VPLEX.getVplexStorageViews(device, function(ret) {  
                    callback(null,ret);
                });
            }, 
            function(arg1, callback){ 
                VPLEX.GetVirtualVolumeRelationByDevices(device,function(result) {

                    for ( var z in arg1 ) {
                        var itemView = arg1[z];
                        var vvols = itemView.vvol;

                        for ( var i in vvols ) {
                            var item = vvols[i];
                            item['ProviderByDevice'] = '';
                            item['ProviderByDeviceType'] = '';
                            item['ProviderFromObject'] = '';
                            item['ConnectedHost'] = '';

                            for ( var j in result ) {
                                var vplexItem = result[j];
                                if ( item.part == vplexItem.VPlexVirtualVolumeName ) { 
                                    item['ProviderByDevice'] = vplexItem.storageName; 
                                    item['ProviderByDeviceType'] = vplexItem.storageModel;
                                    item['ProviderFromObject'] = vplexItem.storageVolumeName ;
                                    item['ConnectedHost'] = item.view ;
                                }
                            } 
                            if (item['ProviderByDevice'] == ''  ) {
                                item['ProviderByDevice'] = item.array;
                                item['ProviderFromObject'] = '';
                            }
                         }
                     }

                    callback(null,arg1);

                })
            }, 
            function(arg1,  callback){  
                var data = arg1;
                var finalResult = {};
                // ----- the part of chart --------------

                var groupby = "part";
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
                tableHeaderItem["name"] = "名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "来源物理存储";
                tableHeaderItem["value"] = "array";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "虚拟卷数量";
                tableHeaderItem["value"] = "vvolCount";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "前端口数量";
                tableHeaderItem["value"] = "portCount";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "initiator数量";
                tableHeaderItem["value"] = "initCount";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

 
 
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

  
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "状态";
                tableHeaderItem["value"] = "opstatus";
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

   app.get('/api/vplex/storageview_detail', function (req, res) { 
        var device = req.query.device;

        if ( device === undefined ) {
            res.json(400, 'Must be special a device!')
            return;
        }

        async.waterfall([
            function(callback){ 

            VPLEX.getVplexStorageViews(device, function(ret) {  
                 
                callback(null,ret);

            });


        }, 

            function(arg1, callback){ 
                VPLEX.GetVirtualVolumeRelationByDevices(device,function(result) {

                    for ( var z in arg1 ) {
                        var itemView = arg1[z];
                        var vvols = itemView.vvol;

                        for ( var i in vvols ) {
                            var item = vvols[i];
                            item['ProviderByDevice'] = '';
                            item['ProviderByDeviceType'] = '';
                            item['ProviderFromObject'] = '';
                            item['ConnectedHost'] = '';

                            for ( var j in result ) {
                                var vplexItem = result[j];
                                if ( item.part == vplexItem.VPlexVirtualVolumeName ) { 
                                    item['ProviderByDevice'] = vplexItem.storageName; 
                                    item['ProviderByDeviceType'] = vplexItem.storageModel;
                                    item['ProviderFromObject'] = vplexItem.storageVolumeName ;
                                    item['ConnectedHost'] = item.view ;
                                }
                            } 
                            if (item['ProviderByDevice'] == ''  ) {
                                item['ProviderByDevice'] = item.array;
                                item['ProviderFromObject'] = '';
                            }
                         }
                     }

                    callback(null,arg1);

                })
            },         
        function(arg1,  callback){  


                var data = arg1;


                var finalResult = {};

                // ----- the part of perf datetime --------------
                finalResult["startDate"] = util.getPerfStartTime();
                finalResult["endDate"] = util.getPerfEndTime();          



                

                // ----- the part of chart --------------

                var groupby = "part";
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
                tableHeaderItem["name"] = "名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "来源物理存储";
                tableHeaderItem["value"] = "array";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "虚拟卷数量";
                tableHeaderItem["value"] = "vvolCount";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "前端口数量";
                tableHeaderItem["value"] = "portCount";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "initiator数量";
                tableHeaderItem["value"] = "initCount";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

 
 
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

  
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "状态";
                tableHeaderItem["value"] = "opstatus";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                // ---------- the part of table event ---------------
                var tableEvent = {}; 
                var tableEventParam = [];
                var tableEventParamItem = {};
                tableEventParamItem["findName"] = 'part';
                tableEventParamItem["postName"] = 'viewname';
                tableEventParam.push(tableEventParamItem);
                tableEvent["event"] = "appendArea";
                tableEvent["param"] = tableEventParam;
                tableEvent["url"] = "/vplex/storageview_detail/luns";  


                finalResult["tableHead"] = tableHeader;
                finalResult["tableEvent"] = tableEvent;
                finalResult["tableBody"] = data;

                callback(null,finalResult); 

            }
            ], function (err, result) {
                   // result now equals 'done' 
                   cache.put('vplex_storageview_result',result);
                  res.json(200, result);
            });
 
    });




   app.get('/api/vplex/storageview_detail/luns', function (req, res) { 
        var viewname = req.query.viewname;
        var perfStartDate = req.query.startDate;
        var perfEndDate = req.query.endDate;

        if ( viewname === undefined ) {
            res.json(400, 'Must be special a viewname!')
            return;
        }
        var result = cache.get('vplex_storageview_result'); 
        var viewDetailData = result.tableBody;
        var viewItem = {};
        for ( var i in viewDetailData ) {
            var item = viewDetailData[i];
            if ( item.part == viewname ) {
                viewItem = item;
                break;
            }
        }

        async.waterfall([
            function(callback){ 
                var vvols = viewItem.vvol;
                var vvolList = [];
                var deviceArray;
                for ( var i in vvols ) {
                    var item = vvols[i];
                    deviceArray = item.ProviderByDevice;
                    vvolList.push(item.ProviderFromObject);
                }
                VMAX.getArrayLunPerformanceByOne(deviceArray,vvolList,function(perfresult) { 
                    callback(null,perfresult);
                })

                
            },
            function(arg1,callback){ 

                var chartData = {};
                for ( var i in arg1 ) {
                    var item = arg1[i];
                    var matrics = item.matrics[0];
                    chartData["category"] = 'ReadRequests';
                    var charDataDetail = [];
                    for ( var j in matrics.ReadRequests ) {
                        var perfItem = matrics.ReadRequests[j];

                        var charDataDetailItem = {};
                        charDataDetailItem["name"] = perfItem[0];
                        charDataDetailItem[item.part] = perfItem[1];
                        charDataDetail.push(charDataDetailItem);
                    }
                    chartData["charData"] = charDataDetail;
                    
                }

                console.log(chartData);
                callback(null,chartData);
            }
            ], function (err, result) {
                 var finalResult = {};

                // ----- the part of perf datetime --------------
                finalResult["startDate"] = util.getPerfStartTime();
                finalResult["endDate"] = util.getPerfEndTime();          

                finalResult["charts"] = [];
                finalResult.charts.push(result);

                // ---------- the part of table ---------------
                var tableHeader = [];
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "虚拟卷名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "来源物理存储";
                tableHeaderItem["value"] = "array";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Raid类型";
                tableHeaderItem["value"] = "dgraid";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "磁盘名称";
                tableHeaderItem["value"] = "vdisk";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "容量(GB)";
                tableHeaderItem["value"] = "Capacity";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);



                // ---------- the part of table event ---------------
                var tableEvent = {}; 
                var tableEventParam = [];
                var tableEventParamItem = {};
                tableEventParamItem["findName"] = 'part';
                tableEventParamItem["postName"] = 'vvolname';
                tableEventParam.push(tableEventParamItem);

                var tableEventParamItem = {};
                tableEventParamItem["findName"] = 'device';
                tableEventParamItem["postName"] = 'device';
                tableEventParam.push(tableEventParamItem);

                tableEvent["event"] = "updateChart";
                tableEvent["param"] = tableEventParam;
                tableEvent["rowSelect"] = "multy"; 
                tableEvent["url"] = "/vplex/storageview_detail/lunperf";  


                finalResult["tableHead"] = tableHeader;
                finalResult["tableEvent"] = tableEvent;
                finalResult["tableBody"] = viewItem.vvol;

                //callback(null,finalResult); 

                res.json(200, finalResult);
            });

 
    });



    app.get('/api/vplex/feport', function (req, res) { 
        var device = req.query.device;

        if ( device === undefined ) {
            res.json(400, 'Must be special a device!')
            return;
        }


        async.waterfall(
        [
            function(callback){
                VPLEX.getVplexFEPort(device, function(ret) {  
                    callback(null,ret);
                });
                  
            },
            // Get Relation 
            function(param,  callback){ 


                VPLEX.GetFEPortRelationByDevices(device,function(result) {

                    for ( var i in param ) {
                        var item = param[i];
                        item['ConnectToPort'] = '';
                        item['ConnectToDevice'] = ''; 

                        for ( var j in result ) {
                            var vplexItem = result[j];
                            if ( item.director == vplexItem.vplexDirectorName & item.part == vplexItem.vplexPortName ) { 
                                item['ConnectToPort'] = vplexItem.switchPortName ; 
                                item['ConnectToDevice'] = vplexItem.switchName; 
                            }
                        }  
                     }
                    callback(null,param);

                })

            },
            function(param,  callback){ 

               var data = param;

                var finalResult = {};
 
                // ---------- the part of table ---------------
                var tableHeader = []; 


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "端口名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "端口类型";
                tableHeaderItem["value"] = "iftype";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "Director名称";
                tableHeaderItem["value"] = "director";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "链路状态";
                tableHeaderItem["value"] = "portstat";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "端口状态";
                tableHeaderItem["value"] = "opstatus";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "当前速率(Gbits/s)";
                tableHeaderItem["value"] = "Speed";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "最大速率(Gbits/s)";
                tableHeaderItem["value"] = "maxspeed";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "NodeWWN";
                tableHeaderItem["value"] = "nodewwn";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem); 

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "PortWWN";
                tableHeaderItem["value"] = "portwwn";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);
 
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "连接交换机端口";
                tableHeaderItem["value"] = "ConnectToPort";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem); 

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "连接交换机名称";
                tableHeaderItem["value"] = "ConnectToDevice";
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

// -------------------------------------- END ------------------------------------


 

     app.get('/api/vplex/test', function ( req, res )  {
        var device = req.query.device; 
        VPLEX.getVplexFEPort(device,function(locations) {  
            res.json(200,locations);
                                                         
        }); 

    } ) ;





};

module.exports = virtualArrayController;
