"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('automationController')
const name = 'my-app'
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
var CallGet = require('../lib/CallGet');
var Auto = require('../lib/Automation_VPLEX');
var AutoService = require('../lib/Automation');

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

        console.log(pools);
        res.json(200, pools);


    });


    app.get('/api/auto/service/list', function (req, res) {

        var serviceList = [
            {
                "catalog":"Block",
                "name":"块服务",
                "services":[
                    {
                        "name":"VPLEXCapacityProvisioning",
                        "label":"VPLEX容量扩容服务",
                        "version":"v1.0",
                        "enabled":true,
                        "roles":[
                            "admin",
                            "user"
                        ],
                        "description":"为已经使用VPLEX存储的主机(包括x86物理机和ESXi主机)扩充存储容量空间.",
                        "detailFunctionDesc":"<ol class=\"GreenNumbers\"><li><font color=\"black\">在该服务前, 需要在VPLEX后端物理存储中分配物理卷到VPLEX中</font></li><li><font color=\"black\">该服务将自动Claim Storage Volume并随后创建一系列VPLEX逻辑对象(Extent, Device, Distrubuted Device, VirtualVolume)</font></li></ol><p class=\"ingredients\"><span>自动化规则:?</span>Milk, salt, coriander, cardamom, cinnamon, turmeric, honey, vanillaextract, regularoats, oatbran.</p>",
                        "propertices":{
                            "support_host_type":[
                                "X86物理机",
                                "IBM LPar",
                                "VMWare ESXi"
                            ],
                            "estimated_execution_time":"15 min",
                            "service_level":"Base Service",
                            "last_month_execution_count":0
                        },
                        "image":"VPLEX"
                    }
                ]
            }
        ];
 
        res.json(200, serviceList);


    });

    

    app.get('/api/auto/service/block/provisioning/getinfo', function (req, res) {

        var autoServiceInfo = {
            "Application":[
                {
                    "name":"APP1",
                    "TotalCapacity":200,
                    "UsedCapacity":100
                }
            ],
            "StorageResourcePool":[
                {
                    "name":"VPLEX-高端",
                    "resourceLevel":"Gold",
                    "resourceType":"VPLEX",
                    "TotalCapacity":100,
                    "UsedCapacity":30
                }
            ],
            "ProtectLevel":[
                {
                    "name":"DR_SameCity",
                    "label":"同城容灾",
                    "value":"true"
                },
                {
                    "name":"DR_DiffCity",
                    "label":"异地容灾",
                    "value":"disable"
                },
                {
                    "name":"Backup",
                    "label":"备份(NBU)",
                    "value":"true"
                },
                {
                    "name":"AppVerification_SameCity",
                    "label":"同城应用核验",
                    "value":"disable"
                },
                {
                    "name":"AppVerification_DiffCity",
                    "label":"异地应用核验",
                    "value":"disable"
                }
            ]
        };
 
        res.json(200, autoServiceInfo);


    });



    app.post('/api/auto/service/block/provisioning', function (req, res) {

        /*  autoRequestBody = 
            {
                "appname":"ebankwebesxi",
                "usedfor":"oraredo",
                "capacity":400,
                "StorageResourcePool":{
                    "name":"VPLEX-高端",
                    "resourceLevel":"Gold",
                    "resourceType":"VPLEX",
                    "TotalCapacity":100,
                    "UsedCapacity":30
                },
                "ProtectLevel":{
                    "DR_SameCity":true,
                    "DR_DiffCity":false,
                    "Backup":true,
                    "AppVerification_SameCity":false,
                    "AppVerification_DiffCity":false
                },
                "opsType":"review"
            }        
        */
        var autoRequestBody =  req.body;

        console.log(autoRequestBody);

        var autoResponseBody = {
            "resMsg":{
                "code":200,
                "message":[
                    "find a match ResourcePool!",
                    "Begin execute service [ CapacityProvisingService ] !",
                    "[2018-12-11T06:15:30.649Z] # TEST",
                    "find match storage volume for request capacity [400]. [{\"cluster\":\"cluster-1\",\"name\":\"Symm0118_25D3\",\"storage-array-name\":\"EMC-SYMMETRIX-495700118\",\"capacity\":400,\"health-state\":\"ok\",\"position\":\"primary\"},{\"cluster\":\"cluster-2\",\"name\":\"Symm0119_25D3\",\"storage-array-name\":\"EMC-SYMMETRIX-495700119\",\"capacity\":400,\"health-state\":\"ok\",\"position\":\"second\"}]",
                    "[2018-12-11T06:15:32.030Z] # Operation is [ review ]. Only review execute paramaters."
                ]
            },
            "request":{
        
            },
            "ResourcePools":[
        
            ],
            "AutoInfo":{
                "RuleResults":{
        
                },
                "ResourceInfo":{
        
                },
                "ActionParamaters":[
                    {
                        "method":"CreateExtent",
                        "DependOnAction":"N/A",
                        "StorageVolumeName":"Symm0118_25D3,Symm0119_25D3"
                    },
                    {
                        "method":"CreateLocalDevice",
                        "DependOnAction":"CreateExtent",
                        "devicename":"device_Symm0118_25D3",
                        "geometry":"raid-0",
                        "extents":"extent_Symm0118_25D3_1"
                    },
                    {
                        "method":"CreateLocalDevice",
                        "DependOnAction":"CreateExtent",
                        "devicename":"device_Symm0119_25D3",
                        "geometry":"raid-0",
                        "extents":"extent_Symm0119_25D3_1"
                    },
                    {
                        "method":"CreateDistributedDevice",
                        "DependOnAction":"CreateLocalDevice",
                        "devicename":"dd_Symm0118_25D3_Symm0119_25D3",
                        "devices":[
                            "device_Symm0118_25D3",
                            "device_Symm0119_25D3"
                        ],
                        "sourcedevice":"device_Symm0118_25D3"
                    },
                    {
                        "method":"CreateDistributedVirtualVolume",
                        "DependOnAction":"CreateDistributedDevice",
                        "devicename":"dd_Symm0118_25D3_Symm0119_25D3"
                    },
                    {
                        "method":"AssignConsistencyGroup",
                        "DependOnAction":"CreateDistributedDevice",
                        "virtual_volume":"dd_Symm0118_25D3_Symm0119_25D3_vol",
                        "consistoncy_group":"ebankwebesxi_CG_Prod"
                    },
                    {
                        "method":"AssignStorageView",
                        "DependOnAction":"CreateDistributedDevice",
                        "clustername":"cluster-1",
                        "viewname":"ebankwebesxi_VW",
                        "virtualvolumes":[
                            "dd_Symm0118_25D3_Symm0119_25D3_vol"
                        ]
                    },
                    {
                        "method":"AssignStorageView",
                        "DependOnAction":"CreateDistributedDevice",
                        "clustername":"cluster-1",
                        "viewname":"RP_C2_VW",
                        "virtualvolumes":[
                            "dd_Symm0118_25D3_Symm0119_25D3_vol"
                        ]
                    },
                    {
                        "method":"AssignStorageView",
                        "DependOnAction":"CreateDistributedDevice",
                        "clustername":"cluster-2",
                        "viewname":"TC_ebankwebesxi_VW",
                        "virtualvolumes":[
                            "dd_Symm0118_25D3_Symm0119_25D3_vol"
                        ]
                    },
                    {
                        "method":"AssignStorageView",
                        "DependOnAction":"CreateDistributedDevice",
                        "clustername":"cluster-1",
                        "viewname":"osback1_VW",
                        "virtualvolumes":[
                            "dd_Symm0118_25D3_Symm0119_25D3_vol"
                        ]
                    }
                ]
            },
            "ActionResponses":[
        
            ]
        };
 
        res.json(200, autoResponseBody);


    });




    app.get('/auto/test1', function (req, res) {
        var arrayInfo = Auto.GetArrayInfoObject("EMCCTEST");

        Auto.ClaimAllStorageVolume(arrayInfo, function (result) { res.json(200, result); })

        //Auto.CreateExtents(arrayInfo,function(result) {  res.json(200,result);   }) 

    });

    app.get('/auto/testfunc', function (req, res) {
        var arrayInfo = Auto.GetArrayInfoObject("EMCCTEST");


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
        var arrayInfo = Auto.GetArrayInfoObject("SMIULATE-VPLEX");


        /* -------TEST CASE ------------- */
        /* Query All of extents
        /* ------------------------------ */
        //Auto.GetClusters(arrayInfo,function(result) {  res.json(200,result);   }) 

        //Auto.GetExtents(arrayInfo,'cluster-1',function(result) {  res.json(200,result);   }) 
        //Auto.GetClaimedExtentsByArray(arrayInfo,'cluster-2',function(result) {  res.json(200,result);   }) 
        //Auto.GetStorageVolumes(arrayInfo,'cluster-1',function(result) {  res.json(200,result);   }) 

        //Auto.GetStorageView(arrayInfo, 'cluster-1', 'ebankwebesxi_VW', function (result) { res.json(200, result); })
        //Auto.GetConsistencyGroups(arrayInfo,function(result) {  res.json(200,result);   }) 
        //Auto.GetConsistencyGroup(arrayInfo, 'cluster-1', 'ebankwebesxi_CG_Prod', function (result) { res.json(200, result); })
        //Auto.GetStorageViews(arrayInfo,'cluster-1',function(result) {  res.json(200,result);   }) 
  

        Auto.GetStorageViewsV1(arrayInfo,'cluster-2',function(result) {  
            
            var finalResult = [];
            var res1 = result.response.context;
            for ( var i in res1 ) {
                var item = res1[i];
                var newItem = {};
                for ( var j in item.attributes )  {
                    var item1 = item.attributes[j];
                    if ( ( item1.name == 'name')  ) {
                        newItem['name'] = item1.value; 
                    }
                    if ( ( item1.name == 'virtual-volumes') )  {  
                        var vvols = [];
                        var ps = [];
                        for ( var z in item1.value ) {
                            var vvol = item1.value[z].split(',')[1];
                            if ( vvol.indexOf('dd_') == 0 ) {
                                vvols.push(vvol);
                                var pname = vvol.split('_')[1];
                                var sname = vvol.split('_')[3];
                                var psname = pname+'_'+sname;
                                var isfind = false;
                                for ( var jj in ps ) {
                                    var psItem = ps[jj];
                                    if ( psItem == psname ) {
                                        isfind = true;
                                        break;;
                                    }
                                }
                                if ( isfind == false )
                                    ps.push(pname+'_'+sname);
                            }
                                
                        }
                        
                        //newItem['virtualvolumes'] = vvols;
                        newItem['ps'] = ps;
                    }
                }
                finalResult.push(newItem);
            }
            res.json(200,finalResult);   
        
        
        }) 



    });

    app.get('/auto/test', function (req, res) {
        var arrayInfo = Auto.GetArrayInfoObject("EMCCTEST");


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
            clustername: 'cluster-2',
            StorageVolumeName: 'Symm0193_0161'
        }

        //Auto.CreateExtent(CreateExtentParamater ,function(result) {      res.json(200,result);      })  


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


        var AssignConsistencyGroupParamater =       {
            "method": "AssignConsistencyGroup",
            "DependOnAction": "CreateDistributedDevice",
            "virtual_volume": "dd_Symm0192_00F7_Symm0706_0253_vol",
            "consistoncy_group": "ebankwebesxi_CG_Prod",
            "array": arrayInfo
          }

         Auto.AssignConsistencyGroup(AssignConsistencyGroupParamater, function (result) { res.json(200, result); })



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
        "DR_SameCity":true,
        "DR_DiffCity":false,
        "Backup":true,
        "AppVerification_SameCity":false,
        "AppVerification_DiffCity":false
    },
    "opsType" : "review"   // [ review | execute ]
}

*/
    app.post('/api/auto/service/block/provisioning-true', function (req, res) {
        res.setTimeout(3600*1000); 

        var RequestParamater =  req.body;
        


        async.waterfall(
            [
                // Get All Cluster
                function (callback) {
                    AutoService.BuildParamaterStrucut(RequestParamater, function (AutoObject) {
                        callback(null, AutoObject);
                    })
                }
                , function (AutoObject, callback) {
                    AutoService.CapacityProvisingService(AutoObject, function (result) {
                        callback(null, result);
                    })
                }
            ], function (err, result) {
                // result now equals 'done'
                res.json(200, result);
            });

        /*
        AutoService.CreateStorageDevice(RequestParamater, function(result) { 
            res.json(200,result);
        })
        */

    });





};

module.exports = automationController;

