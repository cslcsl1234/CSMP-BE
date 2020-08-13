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
const moment = require('moment');
const UTIL = require('../lib/util')
var configger = require('../config/configger');
const ECS = require('../lib/Array_ECS');
const isilon = require('../lib/Array_Isilon');
const { ConvertStorageVolumeName } = require('../lib/Automation_VPLEX');



var objectArrayController = function (app) {

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



    app.get('/api/objectarrays', function (req, res) {
        var device = req.query.device;
        var datacenter = req.query.datacenter;

        ECS.GetArrays(device, function (ret) {
            var result = [];

            for (var i in ret) {
                var item = ret[i];
                item["Capacity"] = (item.Capacity / 1024).toFixed(0);
            }

            if (datacenter !== undefined) {
                for (var i in ret) {
                    var item = ret[i];
                    if (item.datacenter == datacenter) {
                        result.push(item);
                    }
                }
            } else
                result = ret;
            res.json(200, result);
        })
    });



    app.get('/api/ecs/array', function (req, res) {
        var device = req.query.device;


        ECS.GetArrays(device, function (ret) {
            logger.info(JSON.stringify(ret, 2, 2))
            var item = ret[0];
            var result = [
                {
                    "title": "存储管理信息",
                    "detail": [
                        {
                            "name": "虚拟数据中心名称",
                            "value": item.device
                        },
                        {
                            "name": "存储序列号",
                            "value": item.serialnb
                        },
                        {
                            "name": "厂商",
                            "value": item.vendor
                        },
                        {
                            "name": "型号",
                            "value": item.model
                        },
                        {
                            "name": "存储类型",
                            "value": item.arraytyp
                        },
                        {
                            "name": "微码版本",
                            "value": item.devdesc
                        }
                    ]
                },
                {
                    "title": "存储硬件配置信息",
                    "detail": [
                        {
                            "name": "可用容量(GB)",
                            "value": item.Capacity
                        },
                        {
                            "name": "已使用容量(GB)",
                            "value": item.UsedCapacity
                        },
                        {
                            "name": "剩余可用容量(GB)",
                            "value": item.FreeCapacity
                        }
                    ]
                }
            ]

            res.json(200, result);
        })
    });





    app.get('/api/ecs/array/pools', function (req, res) {
        var device = req.query.device;
 

        var result1 = {
            "startDate": "2017-01-01T01:01:01+08:00",
            "endDate": "2017-01-01T01:01:01+08:00",
            "chartData": {},
            "chartType": "pie",
            "tableBody": [
            ], 
            "tableEvent": {
                "event": "appendArea",
                "param": [
                    {
                        "findName": "systemid",
                        "postName": "device"
                    },
                    {
                        "findName": "poolid",
                        "postName": "poolid"
                    }
                ],
                "url": "/ecs/array/nodes/subdetail"
            },
            "tableHead": [
                {
                    "name": "虚拟数据中心",
                    "value": "systemid",
                    "sort": "true"
                },
                {
                    "name": "存储池名称",
                    "value": "poolname",
                    "sort": "true"
                },
                {
                    "name": "可用容量",
                    "value": "Capacity",
                    "sort": "true"
                },
                {
                    "name": "剩余可用容量",
                    "value": "FreeCapacity",
                    "sort": true
                },
                {
                    "name": "已使用容量",
                    "value": "UsedCapacity",
                    "sort": true
                },
                {
                    "name": "User Data",
                    "value": "UserData",
                    "sort": true
                },
                {
                    "name": "Local Protection",
                    "value": "LocalProtection",
                    "sort": true
                },
                {
                    "name": "System Metadata",
                    "value": "SystemMetadata",
                    "sort": true
                },
                {
                    "name": "Geo Copy",
                    "value": "GeoCopy",
                    "sort": true
                },
                {
                    "name": "Geo Cache",
                    "value": "GeoCache",
                    "sort": true
                }

            ]
        }

        var chartData = {
            tooltip: {
                trigger: 'item',
                formatter: '{b}<br/>{c} ({d}%)'
            },
            series: [
                {
                    name: '访问来源1',
                    type: 'pie',
                    selectedMode: 'single',
                    radius: [0, '40%'],
        
                    label: {
                        position: 'inner'
                    },
                    labelLine: {
                        show: false
                    },
                    data: [
                        {value: 335, name: '直达'},
                        {value: 679, name: '营销广告'},
                        {value: 1548, name: '搜索引擎'}
                    ]
                },
                {
                    name: '访问来源',
                    type: 'pie',
                    radius: ['45%', '60%'],
                    label: {
                        formatter: '{b}\n{c}, {d}% '
                    },
                    data: [
                        {value: 335, name: '直达'},
                        {value: 310, name: '邮件营销'},
                        {value: 234, name: '联盟广告'},
                        {value: 135, name: '视频广告'},
                        {value: 1048, name: '百度'},
                        {value: 251, name: '谷歌'},
                        {value: 147, name: '必应'},
                        {value: 102, name: '其他'}
                    ]
                }
            ]
        };

        ECS.GetPools(device, function (ret) {
            var totalUsedCapacity = 0;
            var totalFreeCapacity = 0;
            var totalGeoCache =0;
            var totalLocalProtection = 0; 
            var totalSystemMetadata = 0;
            var totalGeoCopy = 0;
            var totalUserData = 0;

            for (var i in ret) {
                var item = ret[i];
                totalUsedCapacity += item.UsedCapacity;
                totalFreeCapacity += item.FreeCapacity;
                totalGeoCache += item.GeoCache;
                totalLocalProtection += item.LocalProtection;
                totalSystemMetadata += item.SystemMetadata;
                totalGeoCopy += item.GeoCopy;
                totalUserData += item.UserData;

                item.Capacity = UTIL.capacity(item.Capacity);
                item.UsedCapacity = UTIL.capacity(item.UsedCapacity);
                item.GeoCache = UTIL.capacity(item.GeoCache);
                item.LocalProtection = UTIL.capacity(item.LocalProtection);
                item.FreeCapacity = UTIL.capacity(item.FreeCapacity);
                item.SystemMetadata = UTIL.capacity(item.SystemMetadata);
                item.GeoCopy = UTIL.capacity(item.GeoCopy);
                item.UserData = UTIL.capacity(item.UserData);

 
            } 
 
            var dataLevel1 = [ 
                {
                    "name": "FreeCapacity",
                    "value": Math.round(totalFreeCapacity/1024,2)
                },
                {
                    "name": "UsedCapacity",
                    "value": Math.round(totalUsedCapacity/1024,2)
                }
            ] 
            var dataLevel2 = [
                
                {
                    "name": "FreeCapacity",
                    "value": Math.round(totalFreeCapacity/1024,2)
                },
                
                {
                    "name": "UserData",
                    "value": Math.round(totalUserData/1024,2)
                },
                {
                    "name": "LocalProtection",
                    "value": Math.round(totalLocalProtection/1024,2)
                },
                {
                    "name": "SystemMetadata",
                    "value": Math.round(totalSystemMetadata/1024,2)
                },
                {
                    "name": "GeoCopy",
                    "value": Math.round(totalGeoCopy/1024,2)
                },
                {
                    "name": "GeoCache",
                    "value": Math.round(totalGeoCache/1024,2)
                }
            ]
            chartData.series[0].data = dataLevel1;
            chartData.series[1].data = dataLevel2; 
            result1['chartData'] = chartData;

            result1.startDate = UTIL.getPerfStartTime();
            result1.endDate = UTIL.getPerfEndTime();
            result1.tableBody = ret;
            
            res.json(200, result1);
        })
    });


    app.get('/api/ecs/array/nodes/subdetail', function (req, res) {
        var device = req.query.device;
        var poolid = req.query.poolid;


        var result = { 
                "tableHead": [
                    {
                        "name": "节点名称",
                        "value": "nodename",
                        "sort": true
                    },
                    {
                        "name": "IP",
                        "value": "ip",
                        "sort": true
                    },
                    {
                        "name": "版本",
                        "value": "devdesc",
                        "sort": "true"
                    },
                    {
                        "name": "rackid",
                        "value": "rackid",
                        "sort": "true"
                    },
                    {
                        "name": "存储池名称",
                        "value": "poolname",
                        "sort": "true"
                    },
                    {
                        "name": "可用容量(GB)",
                        "value": "Capacity",
                        "sort": "true"
                    },
                    {
                        "name": "已用容量(GB)",
                        "value": "UsedCapacity",
                        "sort": true
                    },
                    {
                        "name": "剩余可用容量(GB)",
                        "value": "FreeCapacity",
                        "sort": true
                    }
                ],
                "tableBody": [] 
        }

        ECS.GetNodes(device, poolid, function (ret) {
            result.tableBody = ret;
            res.json(200, result);
        })
    });



    app.get('/api/ecs/array/nodes', function (req, res) {
        var device = req.query.device;
        //var poolid = req.query.poolid;


        var result = {
            "tableData": {
                "tableHead": [
                    {
                        "name": "节点ID",
                        "value": "nodeid",
                        "sort": true
                    },
                    {
                        "name": "节点名称",
                        "value": "node",
                        "sort": true
                    },
                    {
                        "name": "IP",
                        "value": "ip",
                        "sort": true
                    },
                    {
                        "name": "版本",
                        "value": "devdesc",
                        "sort": "true"
                    },
                    {
                        "name": "rackid",
                        "value": "rackid",
                        "sort": "true"
                    },
                    {
                        "name": "存储池名称",
                        "value": "poolname",
                        "sort": "true"
                    },
                    {
                        "name": "可用容量(GB)",
                        "value": "Capacity",
                        "sort": "true"
                    },
                    {
                        "name": "已用容量(GB)",
                        "value": "UsedCapacity",
                        "sort": true
                    },
                    {
                        "name": "剩余可用容量(GB)",
                        "value": "FreeCapacity",
                        "sort": true
                    }
                ],
                "tableBody": []
            }
        }

        ECS.GetNodes(device, poolid, function (ret) {
            result.tableData.tableBody = ret;
            res.json(200, result);
        })
    });



    app.get('/api/ecs/array/disks', function (req, res) {
        var device = req.query.device;
        var nodeid = req.query.nodeid;


        var result = {
            "tableData": {
                "tableHead": [
                    {
                        "name": "节点名称",
                        "value": "nodename",
                        "sort": true
                    },
                    {
                        "name": "IP",
                        "value": "ip",
                        "sort": true
                    },
                    {
                        "name": "存储池名称",
                        "value": "poolname",
                        "sort": "true"
                    },
                    {
                        "name": "磁盘ID",
                        "value": "part",
                        "sort": "true"
                    },
                    {
                        "name": "可用容量(GB)",
                        "value": "Capacity",
                        "sort": "true"
                    },
                    {
                        "name": "已用容量(GB)",
                        "value": "UsedCapacity",
                        "sort": true
                    },
                    {
                        "name": "剩余可用容量(GB)",
                        "value": "FreeCapacity",
                        "sort": true
                    },
                    {
                        "name": "已用容量占比(%)",
                        "value": "UsedPercent",
                        "sort": true
                    }
                ],
                "tableBody": []
            }
        }

        ECS.GetDisks(device, nodeid, function (ret) {
            result.tableData.tableBody = ret;
            res.json(200, result);
        })
    });



    app.get('/api/ecs/array/namespaces', function (req, res) {
        var device = req.query.device;

        var result = {
            "tableData": {
                "tableHead": [
                    {
                        "name": "名称",
                        "value": "ns",
                        "sort": true
                    },
                    {
                        "name": "Bucket数量",
                        "value": "BucketCount",
                        "sort": true
                    },
                    {
                        "name": "数据对象数量",
                        "value": "UsedObjectCount",
                        "sort": "true"
                    },
                    {
                        "name": "配额(Quota)",
                        "value": "Quota",
                        "sort": "true"
                    },
                    {
                        "name": "已用容量(GB)",
                        "value": "UsedCapacity",
                        "sort": true
                    },
                    {
                        "name": "已用容量配额占比(%)",
                        "value": "QuotaUsagePercent",
                        "sort": true
                    }
                ],
                "tableBody": []
            }
        }

        ECS.GetNamespaces(device, function (ret) {
            result.tableData.tableBody = ret;
            res.json(200, result);
        })
    });


    app.get('/api/ecs/array/replicationgroups', function (req, res) {
        var device = req.query.device;

        var result = {
            "tableData": {
                "tableHead": [
                    {
                        "name": "复制组名称",
                        "value": "rgname",
                        "sort": true
                    },
                    {
                        "name": "源虚拟中心",
                        "value": "device",
                        "sort": true
                    },
                    {
                        "name": "目标虚拟中心",
                        "value": "remzone",
                        "sort": "true"
                    },
                    {
                        "name": "存储池",
                        "value": "poolname",
                        "sort": "true"
                    },
                    {
                        "name": "复制中心数量",
                        "value": "numsites",
                        "sort": true
                    },
                    {
                        "name": "RPO(s)",
                        "value": "RgRpo",
                        "sort": true
                    },
                    {
                        "name": "IngressBandwidth",
                        "value": "IngressBandwidth",
                        "sort": true
                    },
                    {
                        "name": "EgressBandwidth",
                        "value": "EgressBandwidth",
                        "sort": true
                    }
                ],
                "tableBody": []
            }
        }

        ECS.GetReplicateGroups(device, function (ret) {
            result.tableData.tableBody = ret;
            res.json(200, result);
        })
    });



    // Islion

    app.get('/api/isilon/array/nodes', function (req, res) {
        var device = req.query.device; 

        var result = {
            "tableData": {
                "tableHead": [
                    {
                        "name": "节点ID",
                        "value": "nodeid",
                        "sort": true
                    },
                    {
                        "name": "节点名称",
                        "value": "node",
                        "sort": true
                    },
                    {
                        "name": "序列号",
                        "value": "serial",
                        "sort": true
                    },
                    {
                        "name": "版本",
                        "value": "devdesc",
                        "sort": "true"
                    }, 
                    {
                        "name": "HDD可用容量",
                        "value": "HDDCapacity",
                        "sort": "true"
                    },
                    {
                        "name": "SSD可用容量",
                        "value": "SSDCapacity",
                        "sort": "true"
                    },
                    {
                        "name": "HDD已用容量",
                        "value": "HDDUsedCapacity",
                        "sort": true
                    },
                    {
                        "name": "SSD已用容量",
                        "value": "SSDUsedCapacity",
                        "sort": true
                    },
                    {
                        "name": "利用率(%)",
                        "value": "CurrentUtilization",
                        "sort": true
                    }
                ],
                "tableBody": []
            }
        }

        isilon.GetNodes(device, function (ret) {
            for ( var i in ret ) {
                var item = ret[i];
                item.HDDCapacity = UTIL.capacity(item.HDDCapacity);
                item.SSDCapacity = UTIL.capacity(item.SSDCapacity);
                item.HDDUsedCapacity = UTIL.capacity(item.HDDUsedCapacity);
                item.SSDUsedCapacity = UTIL.capacity(item.SSDUsedCapacity);  
            }
            result.tableData.tableBody = ret;
            res.json(200, result);
        })
    });

    app.get('/api/isilon/filesystems', function (req, res) {
        var device = req.query.device; 

        var result = {
            "tableData": {
                "tableHead": [
                    {
                        "name": "文件系统名称",
                        "value": "part",
                        "sort": true
                    },
                    {
                        "name": "可用容量",
                        "value": "Capacity",
                        "sort": true
                    },
                    {
                        "name": "使用容量",
                        "value": "UsedCapacity",
                        "sort": true
                    },
                    {
                        "name": "剩余可用容量",
                        "value": "FreeCapacity",
                        "sort": "true"
                    } 
                ],
                "tableBody": []
            }
        }

        isilon.GetFileSystems(device, function (ret) {
            for ( var i in ret ) {
                var item = ret[i];
                item.Capacity = UTIL.capacity(item.Capacity);
                item.FreeCapacity = UTIL.capacity(item.FreeCapacity);
                item.UsedCapacity = UTIL.capacity(item.UsedCapacity);
            }
            result.tableData.tableBody = ret;
            res.json(200, result);
        })
    });


    
    app.get('/api/isilon/snapshots', function (req, res) {
        var device = req.query.device; 

        var result = {
            "tableData": {
                "tableHead": [
                    {
                        "name": "快照名称",
                        "value": "part",
                        "sort": true
                    },
                    {
                        "name": "路径",
                        "value": "partdesc",
                        "sort": true
                    },
                    {
                        "name": "创建时间",
                        "value": "CreateOn",
                        "sort": true
                    },
                    {
                        "name": "容量",
                        "value": "Capacity",
                        "sort": "true"
                    } 
                ],
                "tableBody": []
            }
        }

        isilon.GetSnapshots(device, function (ret) {
            for ( var i in ret ) {
                var item = ret[i];
                item.Capacity = UTIL.capacity(item.Capacity);  
                item["CreateOn"] = moment(parseFloat(item.module)*1000);
            }
            result.tableData.tableBody = ret;
            res.json(200, result);
        })
    });

};

module.exports = objectArrayController;
