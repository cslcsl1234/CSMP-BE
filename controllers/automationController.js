"use strict";
const logger = require("../lib/logger")(__filename);


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('automationController')
const name = 'my-app'
var unirest = require('unirest');
var autologger = require('../lib/logger-automation');
const ServiceCatalogs = require('../lib/automation/servicecatalogs');
const ResourcePools = require('../lib/automation/resourcepools');

var configger = require('../config/configger');
var async = require('async');
var util = require('../lib/util');
var VPLEX = require('../lib/Automation_VPLEX');
var AutoService = require('../lib/Automation');
var UNITY = require('../lib/Automation_UNITY');
var VMAX = require('../lib/Automation_VMAX');
var moment = require('moment');

var WebSocketServer = require('ws').Server
var wss = new WebSocketServer({ port: 9000 });

const ZB = require('zeebe-node');

var wsList = {};

wss.on('connection', function (ws) {

    logger.info("\n\n****************\n    WebSocket connect\n*******************");
    var sendStockUpdates = function (ws) {
        if (ws.readyState == 1) {
            var DataFilename = './data.json';

            fs.readFile(DataFilename, function (err, re1) {
                //logger.info(result);
                var result = JSON.parse(re1);
                if (result === undefined) {
                    var outputRecord = {};
                } else {
                    logger.info(JSON.stringify(result.AutoInfo.ActionParamaters))
                    ws.send(JSON.stringify(result.AutoInfo.ActionParamaters));  //需要将对象转成字符串。WebSocket只支持文本和二进制数据
                    logger.info("--------------------------------------------------------");
                }
            });
        }
    }
    ws.on('message', function (message) {
        logger.info("WebSocket receive message: [" + message + "]");
        if (message == '     ') {
            logger.info(" WebSocket receive data is not vaild");
        } else {
            var ms = JSON.parse(message);
            logger.info(`WebSocket Client ID=${ms.client}`)
            wsList[ms.client] = ws;
            ws.send("this is message"); 
        }


    });
});
 


var automationController = function (app) {

    var config = configger.load();

    app.all('*', function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
        res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        res.header('Access-Control-Expose-Headers', '*');

        debug('req.method = %s', req.method);
        debug('req.url = %s', req.url);

        if (req.method == "OPTIONS") res.send(200);  /*让options请求快速返回*/
        else next();
    });


    app.get('/api/auto/resource/purposes', function (req, res) {

        var purposes = [{ "purpose": "OCR-5GB" }, { "purpose": "DS" }, { "purpose": "OCR-1GB" }, { "purpose": "REDOLOG-10GB" }, { "purpose": "ARCHIVE-100GB" }, { "purpose": "DATAFILE-200GB" }, { "purpose": "500GB" }, { "purpose": "1000GB" }, { "purpose": "2000GB" }, { "purpose": "SOFTWARE-50GB" }, { "purpose": "4000GB" }, { "purpose": "8000GB" }];

        res.json(200, purposes);


    });

    app.get('/api/auto/resource/pools', function (req, res) {

        var pools = [
            {
                "resourcePoolName": "silver",
                "color": "5FBC47",
                "totalSize": 1098.46,
                "sizeUnit": "GB",
                "freeSize": 833.22,
                "freeUnit": "GB",
                "percent": 24.15,
                "threshold": 98596.16,
                "maxAllocSize": 106401.71
            },
            {
                "resourcePoolName": "gold",
                "color": "FFC657",
                "totalSize": 846.16,
                "sizeUnit": "GB",
                "freeSize": 588.33,
                "freeUnit": "GB",
                "percent": 30.47,
                "threshold": 75896.57,
                "maxAllocSize": 64118.56
            },
            {
                "resourcePoolName": "Plat",
                "color": "7E6EB0",
                "totalSize": 42.99,
                "sizeUnit": "GB",
                "freeSize": 40.44,
                "freeUnit": "GB",
                "percent": 5.93,
                "threshold": 3866.55,
                "maxAllocSize": 4342.12
            },
            {
                "resourcePoolName": "Clone",
                "color": "E04141",
                "totalSize": 996.65,
                "sizeUnit": "GB",
                "freeSize": 990.66,
                "freeUnit": "GB",
                "percent": 0.6,
                "threshold": 89692.51,
                "maxAllocSize": 105211.31
            }
        ];

        //logger.info(pools);
        res.json(200, pools);


    });


    app.get('/api/auto/service/list', function (req, res) {


        var catalog = req.query.catalog;
        var name1 = req.query.name;
        var name;
        if (name1 != 'ALL') var name = name1;

        var serviceList = ServiceCatalogs.GetServiceCatalog(catalog, name);

        res.json(200, serviceList);


    });


    app.get('/api/auto/service/block/provisioning/getinfo', function (req, res) {

        var poolname = req.query.poolname;
        var config = configger.load();

        try {
            async.waterfall(
                [
                    function (callback) {
    
                        var ret = {};
                        var resourcepool = ResourcePools.GetResourcePool();
                        
                        if (poolname === undefined) { 
                            ret["resourcepools"] = resourcepool;
                            ret["ChoosedResourcePool"] = resourcepool[0];
                            callback(null, ret);
                        } else {
                            var isfind = false;
                            for (var i in resourcepool) {
                                var item = resourcepool[i];
                                if (item.name == poolname) {
                                    isfind = true;
                                    ret["resourcepools"] = resourcepool;
                                    ret["ChoosedResourcePool"] = item;
                                    callback(null, ret);
                                    break;
                                }
                            }
                            if (isfind == false)
                                callback(504, "not found the specical storate resource pool name [" + arrayname + "]");
                        }
    
                    },
                    // Get All Cluster
                    function (retinfo, callback) {
                        /*
                        1、如果是新建应用，则选择物理存储中容量最多的；
                        2、如果是应用扩容，则直接选择原来分配的物理存储和pool
                        */
                        var choosedPhysicalArray = ResourcePools.ChoosePhysicalArray(retinfo.ChoosedResourcePool);
                        var arrayInfo = choosedPhysicalArray.info;
                        retinfo["ChoosedPhysicalArray"] = arrayInfo;
                        var applist = [];
    
                        logger.info(`array type : ${arrayInfo.array_type}`)
                        switch ( arrayInfo.array_type ) {
                            case "VPLEX":
                                var Auto = require('../lib/Automation_VPLEX');
                                break;
                            case "VMAX":
                                var Auto = require('../lib/Automation_VMAX');
                                break;
                            //case "Unity":
                                //var Auto = require('../lib/Automation_UNITY');
                                //break; 
                            default:
                                var msg = `not support physical type [${arrayInfo.array_type}]`;
                                logger.info(msg)
                                callback(600,msg);      
                                break;          
                        }
    
                        if ( Auto !== undefined ) {
                            switch (config.ProductType) {
                                case 'Dev':
                                case 'Test':
                                    Auto.GetStorageViewsDemoVersion(arrayInfo, 'cluster-1', function (response) {
                                        if (response.code !== 200) {
                                            callback(response.code, response.message);
                                        } else {
                                            var result = response.response;
                                            for (var i in result) {
                                                var item = result[i];
                                                var name = item.name;
        
                                                var matchResult = name.match(/([A-Za-z_0-9\-]+)_(VW|View|view|VIEW)/);
                                                //logger.info(name+','+matchResult); 
        
                                                if (matchResult != null) {
                                                    var appItem = { "name": matchResult[1], "name_ext": matchResult[2] };
                                                    applist.push(appItem);
                                                }
                                            }
                                            retinfo["applist"] = applist;
                                            callback(null, retinfo);
                                        }
                                    });
                                    break;
                                case 'Prod':
                                    //var arrayInfo = Auto.GetArrayInfoObject("EMCCTEST");
        
                                    Auto.GetStorageViewsV1(arrayInfo, 'cluster-1', function (response) {
                                        if (response.code !== 200) {
                                            callback(response.code, response.message);
                                        } else {
                                            var result = response.response;
                                            for (var i in result) {
                                                var item = result[i];
                                                var name = item.name;
        
                                                var matchResult = name.match(/([A-Za-z_0-9\-]+)_(VW|View|view|VIEW|SG|sg)$/);
                                                //logger.info(name+','+matchResult); 
        
                                                if (matchResult != null) {
                                                    var appItem = { "name": matchResult[1], "name_ext": matchResult[2] };
                                                    applist.push(appItem);
                                                }
                                            }
                                            retinfo["applist"] = applist;
                                            callback(null, retinfo);
                                        }
                                    });
                                    break;
                            }
                        } else {
                            callback( 504, "Auto Object is undefined ");
                        } 
    
                    }
                    , function (arg1, callback) { 
                        var applist = arg1.applist;
                        var serviceMetadata = ServiceCatalogs.GetServiceMetadata();
                        var autoServiceInfo = {
                            "Application": applist,
                            "StorageResourcePool": arg1.resourcepools,
                            "ChoosedResourcePool" : arg1.ChoosedResourcePool,
                            "ChoosedPhysicalArray": arg1.ChoosedPhysicalArray,
                            "ProtectLevel": serviceMetadata.ProtectLevel,
                            "usedfor": serviceMetadata.usedfor,
                            "HostDeploy": serviceMetadata.HostDeploy
                        };
    
                        callback(null, autoServiceInfo);
    
                    }
                ], function (err, result) {
                    if (err) {
                        logger.info(result);
                        res.json(err, result);
                    } else
                        res.json(200, result);
                });
        } catch(err) {
            console.error(err);
        }

    });
 


    app.get('/autotest/test1', function (req, res) {
        var arrayInfo = Auto.GetArrayInfoObject("EMCCTEST");
        //Auto.StorageRediscover(arrayInfo, function( error , result ) { res.json(200,result);  })


        //Auto.GetStorageArray(arrayInfo, 'cluster-1', function (result) { res.json(200, result); })
        // response
        /*{
            "code": 200,
            "message": "success",
            "response": [
                "Dell-Compellent-497ac00",
                "EMC-CLARiiON-CKM00140400531",
                "EMC-SYMMETRIX-296800706",
                "EMC-SYMMETRIX-297800193"
            ]
        } 
        */

        Auto.GetStorageVolumes(arrayInfo, 'cluster-1', function (result) { res.json(200, result); })
        //Auto.ClaimAllStorageVolume(arrayInfo, function (result) { res.json(200, result); })

        //Auto.CreateExtents(arrayInfo,function(result) {  res.json(200,result);   }) 

        //Auto.UnitTest(arrayInfo, "GetStorageVolumes","cluster-2", function(result) {  res.json(200, result);  })

        //Auto.UnitTest(arrayInfo, "ClaimAllStorageVolume", "cluster-2", function (result) { res.json(200, result); })

    });


    app.get('/autotest/unity', function (req, res) {

        var item785 = {
            "Step": "Create device and assign to sg [ VPLEX_101_BE ] in pyhsical array [ CKM00163300785 ] , arraytype= [ Unity ]",
            "method": "CreatePhysicalDevice_UNITY",
            "arrayinfo": {
                "array_type": "Unity",
                "unity_sn": "CKM00163300785",
                "unity_password": "P@ssw0rd",
                "unity_hostname": "10.32.32.64",
                "unity_pool_name": "jxl_vplex101_pool",
                "unity_username": "admin",
                "sgname": "VPLEX_101_BE"
            },
            "DependOnAction": "N/A",
            "AsignSGName": "VPLEX_101_BE",
            "StorageVolumeName": "ebankwebesxi_unity_785_data_1117120527_test12",
            "capacityByte": 5368709120,
            "show": "false",
            "execute": true
        }

        var item = {
            "Step": "Create device and assign to sg [ VPLEX_101_BE ] in pyhsical array [ CKM00163300785 ] , arraytype= [ Unity ]",
            "method": "CreatePhysicalDevice_UNITY",
            "arrayinfo": {
                "array_type": "Unity",
                "unity_sn": "CKM00140600110",
                "unity_password": "Password1!",
                "unity_hostname": "10.32.32.85",
                "unity_pool_name": "Pool 0",
                "unity_username": "sysadmin",
                "sgname": "RPA_G6_Remote_186"
            },
            "DependOnAction": "N/A",
            "AsignSGName": "RPA_G6_Remote_186",
            "StorageVolumeName": "ebankwebesxi_unity_110_data_1117120527_test12",
            "capacityByte": 5368709120,
            "show": "false",
            "execute": true
        }

        UNITY.CreateDevice(item.arrayinfo, item.AsignSGName, item.capacityByte, item.StorageVolumeName, function (result) {
            if (result.code != 200) {
                //logger.info(result.code, `UNITY.CreateDevice is Fail! array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)] msg=[${result.msg}]`, AutoObject);
                var msg = result.data.msg.error.messages;
                logger.info(msg)

                res.json(result.code, result);
            } else {
                logger.info(result);
                //logger.info(result.code, `UNITY.CreateDevice is succeedful. array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)]`, AutoObject);
                res.json(200, result);
            }

        })
    })



    app.get('/autotest/vmax', function (req, res) {

        var item = {
            "Step": "Create device and assign to sg [ MSCS_SG ] in pyhsical array [ 000297800193 ], arraytype= [ VMAX ]",
            "method": "CreatePhysicalDevice_VMAX",
            "arrayinfo": {
                "array_type": "VMAX",
                "serial_no": "000297800193",
                "password": "smc",
                "unispherehost": "10.121.0.204",
                "universion": "90",
                "user": "smc",
                "verifycert": false,
                "sgname": "MSCS_SG"
            },
            "DependOnAction": "N/A",
            "AsignSGName": "EMC_TC1003_SG",
            "StorageVolumeName": "EMC_TC1003_DEV",
            "capacityByte": 5368709120,
            "show": "false",
            "execute": true
        }

        //var capacity = item.capacityByte / 1024 / 1024 / 1024;
        var capacityBYTE = item.capacityByte;
        var capacity = 20;
        VMAX.CreateDevice(item.arrayinfo, item.AsignSGName, capacity, item.StorageVolumeName, function (result) {
            if (result.code != 200) {
                //logger.info(result.code, `UNITY.CreateDevice is Fail! array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)] msg=[${result.msg}]`, AutoObject);
                //var msg = result.messages;
                //logger.info(msg)

                res.json(result.code, result);
            } else {
                logger.info(result);
                //logger.info(result.code, `UNITY.CreateDevice is succeedful. array=[${item.arrayinfo.unity_sn}] sgname=[${item.AsignSGName}] volname=[${item.StorageVolumeName}] capacity=[${capacity}(GB)]`, AutoObject);
                res.json(200, result);
            }

        })
    })

    app.get('/auto/testfunc', function (req, res) {
        //var arrayInfo = Auto.GetArrayInfoObject("EMCCTEST");


        //var VolName = Auto.ConvertStorageVolumeName('EMC-SYMMETRIX-296800706','VPD83T3:60000970000296800706533030323533');
        //var VolName = Auto.ConvertStorageVolumeName('EMC-CLARiiON-CKM00163300785','VPD83T3:6006016009204100012b995aa384cc7c');
        //res.json(200,result);

        /*
                Auto.GetClaimedExtentsByArray(arrayInfo,'cluster-2',function(result) {  
                    
                    var extents = result.Symm0192.extents;
                    var sortByCapacity = Auto.ExtentsSortByCapacity(extents);
                    
                    res.json(200,sortByCapacity);   
                
                })
        
        */


        var deviceNameParam = {
            appname: "appname",
            usedfor: "usedfor",
            provideType: "local",
            arrayname: "arrayname",
            totalcapacity: 1214
        }
        var devicename = Auto.GenerateDeviceName(deviceNameParam);


        res.json(200, devicename);

    });

    app.get('/auto/testget', function (req, res) {
        //var arrayInfo = Auto.GetArrayInfoObject("EMCCTEST");
        if (util.isEmptyObject(arrayInfo)) {
            logger.info("not find array info");
            res.json(200, {});
        } else {
            /*
            Auto.GetStorageViewsV1(arrayInfo,'cluster-1',function(response) { 
                var result = response.response;
                if ( result.code == 200 ) {
                    for ( var i in result ) {
                        var item = result[i];
                        var name = item.name;
        
                        logger.info(name);
                        var matchResult = name.match(/([A-Za-z_0-9]+)_VW/);
                        logger.info(name+','+matchResult[1]); 
                    }
                    res.json(200,result);  
                } else {
                    res.json(200,result);
                }
 
            });
            */

            /* -------TEST CASE ------------- */
            /* Query All of extents
            /* ------------------------------ */
            //Auto.GetClusters(arrayInfo,function(result) {  res.json(200,result);   }) 

            //Auto.GetExtents(arrayInfo,'cluster-1',function(result) {  res.json(200,result);   }) 
            //Auto.GetClaimedExtentsByArray(arrayInfo,'cluster-2',function(result) {  res.json(200,result);   }) 
            Auto.GetStorageVolumes(arrayInfo, 'cluster-2', function (result) { res.json(200, result); })

            //Auto.GetStorageView(arrayInfo, 'cluster-1', 'ebankwebesxi_VW', function (result) { res.json(200, result); })
            //Auto.GetConsistencyGroups(arrayInfo,function(result) {  res.json(200,result);   }) 
            //Auto.GetConsistencyGroup(arrayInfo, 'cluster-1', 'ebankwebesxi_CG_Prod', function (result) { res.json(200, result); })
            //Auto.GetStorageViews(arrayInfo,'cluster-1',function(result) {  res.json(200,result);   }) 

        }
    });

    app.get('/auto/test', function (req, res) {
        //var arrayInfo = Auto.GetArrayInfoObject("EMCCTEST");


        /* -------TEST CASE ------------- */
        /* Create Local Device            */
        /* ------------------------------ */

        //var createLocalDeviceParamaterExtents = ['extent_Symm0706_0261_1','extent_Symm0192_00FF_1'];

        var createLocalDeviceParamaterExtents = ['extent_Symm0192_00FF_1'];
        var createLocalDeviceParamater = {
            array: arrayInfo,
            devicename: "device_Symm0192_00FF",    // Need matche "Device Naming Rule"
            geometry: "raid-0",      // "raid-0",
            //stripe-depth: Number,  // Default "1"
            extents: createLocalDeviceParamaterExtents   // extents list
        }
        //Auto.CreateLocalDevice(createLocalDeviceParamater ,function(result) {  res.json(200,result);   })



        /* -------TEST CASE ------------- */
        /* Create Local Virtual Volume            */
        /* ------------------------------ */
        /*
        var createLocalVVolParamater = {            
            array: arrayInfo,  
            devicename: "DEVICE-AUTO-03"  
        } ;
        Auto.CreateLocalVVol(createLocalVVolParamater ,function(result) {  
            res.json(200,result);
        })
        */


        /* -------TEST CASE ------------- */
        /* Create Local Virtual Volume    */
        /* ------------------------------ */
        var StorageVolumeClaimParamater = {
            array: arrayInfo,
            clustername: 'cluster-2',
            storagevolume: {
                "capacity": 5,
                "health-state": "ok",
                "io-status": "alive",
                "operational-status": "ok",
                "storage-array-name": "EMC-SYMMETRIX-297800192",
                "system-id": "VPD83T3:60000970000297800192533030304637",
                "use": "unclaimed",
                "StorageVolumeName": "Symm0192_00F7"
            }
        }
        //Auto.StorageVolumeClaim(StorageVolumeClaimParamater ,function(result) {  res.json(200,result);  })


        /* -------TEST CASE -------------   */
        /*                                  */
        /* ------------------------------   */
        var CreateExtentParamater = {
            array: arrayInfo,
            method: 'CreateExtent',
            DependOnAction: 'N/A',
            StorageVolumeName: 'Symm1703_016B,Symm1637_016B',
            show: 'false'
        }

        Auto.CreateExtent(CreateExtentParamater, function (result) { res.json(200, result); })


        var CreateDistributedDeviceParamater = {
            array: arrayInfo,
            devicename: 'dd_Symm0192_00FF_Symm0706_0261',      // NamingRule: dd_<sourcedevice>_<targetdevice>
            devices: ['device_Symm0192_00FF', 'device_Symm0706_0261'],  // The list of supporting cluster-local-devices that will be legs in the new distributed-device.
            sourcedevice: 'device_Symm0192_00FF'     // Picks one of the '--devices' to be used as the source data image for the new device. The command will copy data from the '--source-leg' to the other legs of the new device.
        }

        //Auto.CreateDistributedDevice(CreateDistributedDeviceParamater ,function(result) {      res.json(200,result);      })  

        var AssignStorageViewParamater = {
            array: arrayInfo,
            clustername: 'cluster-2',
            viewname: 'TC_ebankwebesxi_VW',   // The view to add the virtual-volumes to.
            virtualvolumes: ['dd_Symm0192_00FF_Symm0706_0261_vol'] // Comma-separated list of virtual-volumes or (lun, virtual-volume) pairs.
        }
        //Auto.AssignStorageView(AssignStorageViewParamater, function (result) { res.json(200, result); })


        var AssignConsistencyGroupParamater = {
            "method": "AssignConsistencyGroup",
            "DependOnAction": "CreateDistributedDevice",
            "virtual_volume": "dd_Symm0192_00F7_Symm0706_0253_vol",
            "consistoncy_group": "ebankwebesxi_CG_Prod",
            "array": arrayInfo
        }

        //Auto.AssignConsistencyGroup(AssignConsistencyGroupParamater, function (result) { res.json(200, result); })



        var CreateDistributedVirtualVolumeParamater = {
            method: 'CreateDistributedVirtualVolume',
            DependOnAction: "CreateDistributedDevice",
            devicename: 'dd_Symm0192_00F7_Symm0706_0253',
            "array": arrayInfo
        }
        //Auto.CreateVirtualVolume(CreateDistributedVirtualVolumeParamater, function (result) { res.json(200, result); })


    });

    app.get('/api/auto/posttest', function (req, res) {
        var extentlist = 'extent_vnx774_lun27_1';
        var extentlist1 = 'extent_Symm0706_0246_1,extent_Symm0706_0241_1,extent_vnx664_lun27_1';
        Auto.CreateLocalDevice('EMCCTEST', 'cluster-1', "DEVICE-TEST-01", "raid-0", extentlist, function (result) {
            res.json(200, result);
        })

    });



    /*
        Body:         
    
    {
        "appname": "ebankwebesxi",
        "usedfor": "oraredo",
        "capacity": 202,
        "resourceLevel": "Gold",
        "ProtectLevel": { 
            "Backup":true,
            "AppVerification_SameCity":false,
            "AppVerification_DiffCity":false,
            "hostDeplpy":"SC"
        },
        "opsType" : "review"   // [ review | execute ]
    }
    
    */

    function sleep(sleepTime) {
        for (var start = +new Date; +new Date - start <= sleepTime;) { };
    }

    function sleep1(ms) { return new Promise(resolve => { setTimeout(resolve, ms) }) };



    app.post('/api/auto/service/block/provisioning-TEST', function (req, res) {
        res.setTimeout(3600 * 1000);
        var testResult = {
            "resMsg": {
                "code": 200,
                "message": [
                    "find a match ResourcePool!",
                    "Begin execute service [ CapacityProvisingService ] !",
                    "[2018-12-11T06:15:30.649Z] # TEST",
                    "find match storage volume for request capacity [400]. [{\"cluster\":\"cluster-1\",\"name\":\"Symm0118_25D3\",\"storage-array-name\":\"EMC-SYMMETRIX-495700118\",\"capacity\":400,\"health-state\":\"ok\",\"position\":\"primary\"},{\"cluster\":\"cluster-2\",\"name\":\"Symm0119_25D3\",\"storage-array-name\":\"EMC-SYMMETRIX-495700119\",\"capacity\":400,\"health-state\":\"ok\",\"position\":\"second\"}]",
                    "[2018-12-11T06:15:32.030Z] # Operation is [ review ]. Only review execute paramaters."
                ]
            },
            "request": {

            },
            "ResourcePools": [

            ],
            "AutoInfo": {
                "RuleResults": {

                },
                "ResourceInfo": {

                },
                "ActionParamaters": [
                    {
                        "Step": "创建Extent",
                        "method": "CreateExtent",
                        "DependOnAction": "N/A",
                        "StorageVolumeName": "Symm0118_25D3,Symm0119_25D3",
                        "response": "Succeed!",
                        "show": "false"
                    },
                    {
                        "Step": "创建本地存储卷(Local Device)",
                        "method": "CreateLocalDevice",
                        "DependOnAction": "CreateExtent",
                        "devicename": "device_Symm0118_25D3",
                        "geometry": "raid-0",
                        "extents": "extent_Symm0118_25D3_1",
                        "response": "Succeed!",
                        "show": "false"
                    },
                    {
                        "Step": "创建本地存储卷(Local Device)",
                        "method": "CreateLocalDevice",
                        "DependOnAction": "CreateExtent",
                        "devicename": "device_Symm0119_25D3",
                        "geometry": "raid-0",
                        "extents": "extent_Symm0119_25D3_1",
                        "response": "Succeed!",
                        "show": "false"
                    },
                    {
                        "Step": "创建分布式存储卷(Distribute Device)",
                        "method": "CreateDistributedDevice",
                        "DependOnAction": "CreateLocalDevice",
                        "devicename": "dd_Symm0118_25D3_Symm0119_25D3",
                        "devices": [
                            "device_Symm0118_25D3",
                            "device_Symm0119_25D3"
                        ],
                        "sourcedevice": "device_Symm0118_25D3",
                        "response": "Succeed!",
                        "show": "false"
                    },
                    {
                        "Step": "创建分布式虚拟存储卷(Distribute Virtual Device)",
                        "method": "CreateDistributedVirtualVolume",
                        "DependOnAction": "CreateDistributedDevice",
                        "devicename": "dd_Symm0118_25D3_Symm0119_25D3",
                        "response": "Succeed!",
                        "show": "false"
                    },
                    {
                        "Step": "分配分布式虚拟化存储到一致性组(Consistency Group)",
                        "method": "AssignConsistencyGroup",
                        "DependOnAction": "CreateDistributedDevice",
                        "virtual_volume": "dd_Symm0118_25D3_Symm0119_25D3_vol",
                        "consistoncy_group": "ebankwebesxi_CG_Prod",
                        "response": "Succeed!",
                        "show": "false"
                    },
                    {
                        "Step": "分配分布式虚拟化存储到存储组(Storage Group)",
                        "method": "AssignStorageView",
                        "DependOnAction": "CreateDistributedDevice",
                        "clustername": "cluster-1",
                        "viewname": "ebankwebesxi_VW",
                        "virtualvolumes": [
                            "dd_Symm0118_25D3_Symm0119_25D3_vol"
                        ],
                        "response": "Succeed!",
                        "show": "false"
                    },
                    {
                        "Step": "分配分布式虚拟化存储到存储组(Storage Group)",
                        "method": "AssignStorageView",
                        "DependOnAction": "CreateDistributedDevice",
                        "clustername": "cluster-1",
                        "viewname": "RP_C2_VW",
                        "virtualvolumes": [
                            "dd_Symm0118_25D3_Symm0119_25D3_vol"
                        ],
                        "response": "Succeed!",
                        "show": "false"
                    },
                    {
                        "Step": "分配分布式虚拟化存储到存储组(Storage Group)",
                        "method": "AssignStorageView",
                        "DependOnAction": "CreateDistributedDevice",
                        "clustername": "cluster-2",
                        "viewname": "TC_ebankwebesxi_VW",
                        "virtualvolumes": [
                            "dd_Symm0118_25D3_Symm0119_25D3_vol"
                        ],
                        "response": "Failed!",
                        "show": "false"
                    },
                    {
                        "Step": "分配分布式虚拟化存储到存储组(Storage Group)",
                        "method": "AssignStorageView",
                        "DependOnAction": "CreateDistributedDevice",
                        "clustername": "cluster-1",
                        "viewname": "osback1_VW",
                        "virtualvolumes": [
                            "dd_Symm0118_25D3_Symm0119_25D3_vol"
                        ],
                        "response": "Succeed!",
                        "show": "false"
                    }
                ]
            },
            "ActionResponses": [
            ]
        }


        //logger.info(JSON.stringify(req.body));
        var RequestParamater = req.body;

        var newRequestParamater = {
            "appname": "ebankwebesxi",
            "usedfor": "oraredo",
            "capacity": 202,
            "resourceLevel": "Gold",
            "ProtectLevel": {
                "Backup": "true",
                "AppVerification_SameCity": "false",
                "AppVerification_DiffCity": "false",
                "hostDeplpy": "SC"
            },
            "opsType": "review"   // [ review | execute ]
        }
        newRequestParamater.client = RequestParamater.client;
        newRequestParamater.ws = wsList[RequestParamater.client];

        newRequestParamater.appname = RequestParamater.appname;
        newRequestParamater.appname_ext = RequestParamater.appname_ext;
        newRequestParamater.usedfor = RequestParamater.usedfor;
        newRequestParamater.opsType = RequestParamater.opsType;
        newRequestParamater.capacity = RequestParamater.requests[0].capacity;
        newRequestParamater.count = RequestParamater.requests[0].count;
        newRequestParamater.resourceLevel = RequestParamater.requests[0].StorageResourcePool.resourceLevel;
        newRequestParamater.ProtectLevel = RequestParamater.requests[0].ProtectLevel;

        async.waterfall(
            [
                // Get All Cluster
                function (callback) {
                    logger.info("AutoService.BuildParamaterStrucut:" + newRequestParamater);
                    AutoService.BuildParamaterStrucut(newRequestParamater, function (AutoObject) {
                        callback(null, AutoObject);
                    })
                }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
                , function (AutoObject, callback) {

                    if (RequestParamater.opsType == 'review')
                        callback(null, testResult);
                    else {
                        var ws = AutoObject.request.ws;
                        logger.info(" ----------- BEGIN ----------------");
                        for (var i in testResult.AutoInfo.ActionParamaters) {
                            logger.info("BEGIN ============" + i);
                            var item = testResult.AutoInfo.ActionParamaters[i];
                            item.show = 'true';
                            logger.info(JSON.stringify(testResult.AutoInfo.ActionParamaters));
                            ws.send(JSON.stringify(testResult.AutoInfo.ActionParamaters));
                            sleep(5000);
                            logger.info("END ============" + i);
                        }
                    }
                }
            ], function (err, result) {
                // result now equals 'done'
                res.json(200, result);
            });


    });


    app.post('/review', function (req, res) {
        res.setTimeout(3600 * 1000);

        //logger.info(JSON.stringify(req.body));
        var RequestParamater = req.body;

        var newRequestParamater = {
            "appname": "ebankwebesxi",
            "usedfor": "oraredo",
            "capacity": 202,
            "resourceLevel": "Gold",
            "ProtectLevel": {
                "Backup": "true",
                "AppVerification_SameCity": "false",
                "AppVerification_DiffCity": "false",
                "hostDeplpy": "SC"
            },
            "opsType": "review"   // [ review | execute ]
        }
        newRequestParamater.client = RequestParamater.client;
        newRequestParamater.ws = wsList[RequestParamater.client];

        newRequestParamater.appname = RequestParamater.appname;
        newRequestParamater.appname_ext = RequestParamater.appname_ext;
        newRequestParamater.opsType = RequestParamater.opsType;
        newRequestParamater.capacity = RequestParamater.requests[0].capacity;
        newRequestParamater.count = RequestParamater.requests[0].count;
        newRequestParamater.resourceLevel = RequestParamater.requests[0].StorageResourcePool.resourceLevel;
        newRequestParamater.resourcePoolName = RequestParamater.requests[0].StorageResourcePool.name;
        newRequestParamater.ProtectLevel = RequestParamater.requests[0].ProtectLevel;

        async.waterfall(
            [
                // Get All Cluster
                function (callback) {
                    logger.info("AutoService.BuildParamaterStrucut:" + newRequestParamater);
                    AutoService.BuildParamaterStrucut(newRequestParamater, function (AutoObject) {
                        callback(null, AutoObject);
                    })
                }
                , function (AutoObject, callback) {
                    callback(null, AutoObject);
                }
            ], function (err, result) {
                res.json(200, result);
            });
    });



    app.post('/api/auto/service/block/provisioning/review-v2', function (req, res) {
        res.setTimeout(3600 * 1000);
        var RequestParamater = req.body;
        var usedfor = RequestParamater.requests[0].usedfor; 
        //logger.info(JSON.stringify(req.body));

        var newRequestParamater = {
            "appname": "ebankwebesxi",
            "usedfor": "oraredo",
            "capacity": 202,
            "resourceLevel": "Gold",
            "ProtectLevel": {
                "Backup": "true",
                "AppVerification_SameCity": "false",
                "AppVerification_DiffCity": "false",
                "hostDeplpy": "SC"
            },
            "opsType": "review"   // [ review | execute ]
        }
        newRequestParamater.client = RequestParamater.client;
        newRequestParamater.ws = wsList[RequestParamater.client];

        newRequestParamater.appname = RequestParamater.appname;
        newRequestParamater.appname_ext = RequestParamater.appname_ext;
        newRequestParamater.usedfor = (usedfor == undefined || usedfor == "") ? "data" : RequestParamater.requests[0].usedfor;
        newRequestParamater.opsType = RequestParamater.opsType;
        newRequestParamater.capacity = RequestParamater.requests[0].capacity;
        newRequestParamater.count = RequestParamater.requests[0].count;
        newRequestParamater.resourceLevel = RequestParamater.requests[0].StorageResourcePool.resourceLevel;
        newRequestParamater.resourcePoolName = RequestParamater.requests[0].StorageResourcePool.name;
        newRequestParamater.ProtectLevel = RequestParamater.requests[0].ProtectLevel;
        newRequestParamater.timestamp = moment().format('MMDDHHmmss');

        async.waterfall(
            [
                // Get All Cluster
                function (callback) {
                    logger.info("AutoService.BuildParamaterStrucut:" + JSON.stringify(newRequestParamater,2,2));
                    AutoService.BuildParamaterStrucut(newRequestParamater, function (AutoObject) {
                        callback(null, AutoObject);
                    })
                }
                , function (AutoObject, callback) {
                    AutoService.CapacityProvisingService(AutoObject, function (result) {
                        if (result.code == 200)
                            callback(null, result);
                        else
                            callback(result.code, result);
                    })
                }
            ], function (err, result) {
                if (err) {
                    res.json(result.code, result);
                } else {
                    var ActionParamaterLabers = {};
                    ActionParamaterLabers["method"] = "执行操作";
                    ActionParamaterLabers["DependOnAction"] = "依赖操作";
                    ActionParamaterLabers["StorageVolumeName"] = "物理存储卷名称";
                    ActionParamaterLabers["devicename"] = "卷名称";
                    ActionParamaterLabers["clustername"] = "存储存储集群";
                    ActionParamaterLabers["viewname"] = "存储视图名称（view)";
                    ActionParamaterLabers["virtualvolumes"] = "卷保护模式";
                    ActionParamaterLabers["consistency_group"] = "存储存储集群";
                    ActionParamaterLabers["virtual_volume"] = "虚拟卷名称";
                    ActionParamaterLabers["devices"] = "卷名称（device)";
                    ActionParamaterLabers["sourcedevice"] = "分布式卷的源端卷";
                    ActionParamaterLabers["Step"] = "执行步骤名称";
                    ActionParamaterLabers["extents"] = "物理数据块(Extent)";
                    ActionParamaterLabers["geometry"] = "RAID类型";
                    ActionParamaterLabers["AsignSGName"] = "分配卷组（SG）名称";
                    ActionParamaterLabers["capacityByte"] = "容量(Byte)";
                    ActionParamaterLabers["execute"] = "是否已执行";
                    ActionParamaterLabers["response"] = "执行结果";
                    ActionParamaterLabers["arrayinfo"] = "物理存储信息";

                    result.AutoInfo["ActionParamaterLabers"] = ActionParamaterLabers;
                    res.json(200, result);
                }
                // result now equals 'done'

            });
    });


    
    app.post('/api/auto/service/block/provisioning/review', function (req, res) {
        res.setTimeout(3600 * 1000);
        var RequestParamater = req.body;
        var usedfor = RequestParamater.requests[0].usedfor; 
        //logger.info(JSON.stringify(req.body));

        var newRequestParamater = {
            "appname": "ebankwebesxi",
            "usedfor": "oraredo",
            "capacity": 202,
            "resourceLevel": "Gold",
            "ProtectLevel": {
                "Backup": "true",
                "AppVerification_SameCity": "false",
                "AppVerification_DiffCity": "false",
                "hostDeplpy": "SC"
            },
            "opsType": "review"   // [ review | execute ]
        }
        newRequestParamater.client = RequestParamater.client;
        newRequestParamater.ws = wsList[RequestParamater.client];

        newRequestParamater.appname = RequestParamater.appname;
        newRequestParamater.appname_ext = RequestParamater.appname_ext;
        newRequestParamater.usedfor = (usedfor == undefined || usedfor == "") ? "data" : RequestParamater.requests[0].usedfor;
        newRequestParamater.opsType = RequestParamater.opsType;
        newRequestParamater.capacity = RequestParamater.requests[0].capacity;
        newRequestParamater.count = RequestParamater.requests[0].count;
        newRequestParamater.resourceLevel = RequestParamater.requests[0].StorageResourcePool.resourceLevel;
        newRequestParamater.resourcePoolName = RequestParamater.requests[0].StorageResourcePool.name;
        newRequestParamater.ProtectLevel = RequestParamater.requests[0].ProtectLevel;
        newRequestParamater.timestamp = moment().format('MMDDHHmmss');

        async.waterfall(
            [
                // Get All Cluster
                function (callback) {
                    //logger.info("AutoService.BuildParamaterStrucut:" + JSON.stringify(newRequestParamater,2,2));
                    AutoService.BuildParamaterStrucut(newRequestParamater, async function (AutoObject) { 
                            try {
                                
                                const ZEEBE_BROKER_URL = config.ZEEBE.BROKER;
                                const zbc = new ZB.ZBClient(ZEEBE_BROKER_URL)
                                var request = {
                                    bpmnProcessId: 'CSMP-Automation-Main',
                                    variables: AutoObject,
                                    requestTimeout: 600000,
                                }
                                //logger.info("-----\n" + JSON.stringify(request,null,2))
                                const bpmnresult = await zbc.createWorkflowInstanceWithResult( request ).catch((e)=> {
                                    logger.info("Exception:" + e )
                                }) 
                                callback(null, bpmnresult);
                            } catch (e) {
                                logger.error(`There was an error running the 'CSMP-Automation-Main'!`)
                                throw e
                            }  
                    })
                }
                , function (bpmnresult, callback) {
                    var AutoObject = bpmnresult.variables;

                    var ActionParamaterLabers = {};

                    
                    ActionParamaterLabers["StepGroupName"] = "自动化操作组名称";
                    ActionParamaterLabers["method"] = "执行操作";
                    ActionParamaterLabers["DependOnAction"] = "依赖操作";
                    ActionParamaterLabers["StorageVolumeName"] = "物理存储卷名称";
                    ActionParamaterLabers["devicename"] = "卷名称";
                    ActionParamaterLabers["clustername"] = "集群名称";
                    ActionParamaterLabers["viewname"] = "存储视图名称（view)";
                    ActionParamaterLabers["virtualvolumes"] = "卷保护模式";
                    ActionParamaterLabers["consistency_group"] = "存储存储集群";
                    ActionParamaterLabers["virtual_volume"] = "虚拟卷名称";
                    ActionParamaterLabers["devices"] = "卷名称（device)";
                    ActionParamaterLabers["sourcedevice"] = "分布式卷的源端卷";
                    ActionParamaterLabers["Step"] = "执行步骤名称";
                    ActionParamaterLabers["extents"] = "物理数据块(Extent)";
                    ActionParamaterLabers["geometry"] = "RAID类型";
                    ActionParamaterLabers["AsignSGName"] = "RAID类型";
                    ActionParamaterLabers["capacityByte"] = "容量(Byte)";
                    ActionParamaterLabers["execute"] = "是否已执行";
                    ActionParamaterLabers["response"] = "执行结果";
                    ActionParamaterLabers["arrayinfo"] = "执行操作存储信息";

                    ActionParamaterLabers["ReplicationsetName"] = "RPA复制集(Replicate Set)名称";
                    ActionParamaterLabers["CGName"] = "RPA复制一致性组(CG)名称";
                    ActionParamaterLabers["prod"] = "生产卷名称";
                    ActionParamaterLabers["local"] = "本地复制卷名称";                    
                    ActionParamaterLabers["remote"] = "远程复制卷名称";                                    
                    ActionParamaterLabers["ProdJournalVolume"] = "生产日志卷名称";
                    ActionParamaterLabers["LocalJournalVolume"] = "本地复制日志卷名称";
                    ActionParamaterLabers["RemoteJournalVolume"] = "远程复制日志卷名称";

                    AutoObject.AutoInfo["ActionParamaterLabers"] = ActionParamaterLabers;

                    callback(null, bpmnresult);
                }
            ], function (err, bpmnresult) {
                if (err) {
                    res.json(501, err);
                } else {
                    var result = bpmnresult.variables;
                    res.json(200, result);
                }
                // result now equals 'done'

            });
    });






    app.post('/api/auto/service/block/provisioning/execute', function (req, res) {
        var AutoAPI = require('../lib/Automation');

        res.setTimeout(3600 * 1000);
        var AutoObject = req.body;
        if (AutoObject.resMsg.code != 200) {
            res.json(AutoObject.resMsg.code, AutoObject);
        } else {
            var ActionsParamater = AutoObject.AutoInfo.ActionParamaters;
            var RequestParamater = AutoObject.request;
            var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo.info;
            var ws = wsList[RequestParamater.client];
            //logger.info(RequestParamater.client);
            //logger.info(wsList);

            //var ws = AutoObject.request.ws; 
            if (ws === undefined) {
                logger.info(JSON.stringify(wsList, 2, 2));
                res.json(505, "not find the websocket client. clientID=" + RequestParamater.client);
            } else {
                autologger.logs(200, "Begin execute each action.", AutoObject);


                AutoAPI.ExecuteActions(ActionsParamater, ws, function (result) {
                    AutoObject.ActionResponses = result.data;
                    //logger.info("&&&&&\n" + JSON.stringify(result));
                    if (result.code != 200)
                        autologger.logs(result.code, "Provising execute is fail!.", AutoObject);
                    res.json(result.code, AutoObject);
                })

            }

        }



    });


    app.post('/api/auto/service/san/provisioning', function (req, res) {
        var AutoAPI = require('../lib/Automation');

        res.setTimeout(3600 * 1000);
        var AutoObject = req.body;

        var resResult = {
            "resMsg": {
              "code": 200,
              "message": [
                "find a match ResourcePool!",
                "Begin execute service [ CapacityProvisingService ] !",
                "[2020-05-21T02:40:19.877Z] # Begin execute each action."
              ]
            },
            "request": {
              "client": "1590027897134",
              "appname": "EMC-TC1001",
              "appname_ext": "VW",
              "opsType": "review",
              "hosts": [
                  {
                      "name": "hostname1",
                      "type": "AIX",
                      "wwpn": [
                          "11:11:11:11:11:11:11:11",
                          "62:62:62:62:21:21:21:21"
                      ]
                  },
                  {
                      "name": "hostname2",
                      "type": "AIX",
                      "wwpn": [
                          "22:22:22:22:22:22:22:22",
                          "62:62:62:62:21:21:21:21"
                      ]
                  }
              ]
          }
          ,
            "AutoInfo": {
              "RuleResults": {
              },
              "ResourceInfo": {
              },
              "ActionParamaters": [
                {
                  "StepGroupName": "Providing Product Volume",
                  "Step": "Create device and assign to sg [ MSCS_SG ] in pyhsical array [ 000297800193 ], arraytype= [ VMAX ]",
                  "method": "CreatePhysicalDevice",
                  "DependOnAction": "N/A",
                  "AsignSGName": "MSCS_SG",
                  "StorageVolumeName": "EMC-TC1001_VMAX193_0521103643os01",
                  "capacityByte": 1073741824,
                  "position": "primary",
                  "execute": true,
                  "progress": 1,
                  "response": {
                    "code": 200,
                    "msg": "VMAX.CreateDevice is succeedful. array=[000297800193] sgname=[MSCS_SG] volname=[EMC-TC1001_VMAX193_0521103643os01] capacity=[1(GB)]",
                    "data": {
                      "name": "EMC-TC1001_VMAX193_0521103643os01",
                      "lunwwn": "60000970000297800193533030313038"
                    }
                  },
                  "status": "success"
                }
              ],
              "ActionResult": {
              },
              "ActionParamaterLabers": {
                "method": "执行操作",
                "DependOnAction": "依赖操作",
                "StorageVolumeName": "物理存储卷名称",
                "devicename": "卷名称",
              }
            },
            "ActionResponses": [
              {
                "StepGroupName": "Providing Product Volume",
                "Step": "Create device and assign to sg [ MSCS_SG ] in pyhsical array [ 000297800193 ], arraytype= [ VMAX ]",
                "method": "CreatePhysicalDevice",
                "DependOnAction": "N/A",
                "AsignSGName": "MSCS_SG",
                "StorageVolumeName": "EMC-TC1001_VMAX193_0521103643os01",
                "capacityByte": 1073741824,
                "position": "primary",
                "execute": true,
                "progress": 1,
                "response": {
                  "code": 200,
                  "msg": "VMAX.CreateDevice is succeedful. array=[000297800193] sgname=[MSCS_SG] volname=[EMC-TC1001_VMAX193_0521103643os01] capacity=[1(GB)]",
                  "data": {
                    "name": "EMC-TC1001_VMAX193_0521103643os01",
                    "lunwwn": "60000970000297800193533030313038"
                  }
                },
                "status": "success"
              }
            ]
          }

          res.json(200, resResult);
           



    });


    app.post('/api/auto/service/block/provisioning/executetest', function (req, res) {
        var AutoAPI = require('../lib/Automation');

        res.setTimeout(3600 * 1000);
        var AutoObject = req.body;
        if (AutoObject.resMsg.code != 200) {
            res.json(AutoObject.resMsg.code, AutoObject);
        } else {
            var ActionsParamater = AutoObject.AutoInfo.ActionParamaters;
            var RequestParamater = AutoObject.request;
            var arrayInfo = AutoObject.AutoInfo.RuleResults.ArrayInfo.info;
            var ws = wsList[RequestParamater.client];
            //logger.info(RequestParamater.client);
            //logger.info(wsList);

            //var ws = AutoObject.request.ws;  
            autologger.logs(200, "Begin execute each action.", AutoObject);


            AutoAPI.ExecuteActions(ActionsParamater, ws, function (result) {
                //AutoObject.ActionResponses = result.data;
                //logger.info("&&&&&\n" + JSON.stringify(result));
                if (result.code != 200) {
                    var errmsg = "Provising execute is fail!.";
                    if (result.msg !== undefined) errmsg = result.msg;
                    autologger.logs(result.code, errmsg, AutoObject);
                }

                res.json(result.code, AutoObject);
            })


        }



    });


};

module.exports = automationController;

