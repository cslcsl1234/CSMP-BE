"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('cebAPIController')
const name = 'my-app'
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');

var util = require('../lib/util');
var CallGet = require('../lib/CallGet');
var cache = require('memory-cache');

var host = require('../lib/Host');

var mongoose = require('mongoose');
var HostObj = mongoose.model('Host');
var HBAObj = mongoose.model('HBA');

var HBALIST = require('../demodata/host_hba_list');
var VMAX = require('../lib/Array_VMAX');
var VNX = require('../lib/Array_VNX');
var SWITCH = require('../lib/Switch');
var CAPACITY = require('../lib/Array_Capacity');
var mysql = require('../lib/MySQLDBFunction');
var AppTopologyObj = mongoose.model('AppTopology');
var DeviceMgmt = require('../lib/DeviceManagement');
var Report = require('../lib/Reporting');
var Analysis = require('../lib/analysis');
var topos = require('../lib/topos');
var sortBy = require('sort-by');

var cebAPIController = function (app) {

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


    app.get('/ceb/config/storage/getStorageView', function (req, res) {
        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1);
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([
            function (callback) {
                var param = {};
                param['fields'] = ['serialnb', 'device', 'model', 'arraytyp', 'devdesc', 'name'];
                param['period'] = util.getPeriod(start, end);
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '!parttype&devtype=\'Array\'';
                param['filter_name'] = '(name==\'ConfiguredRawCapacity\'|name=\'TotalLun\'|name==\'TotalDisk\'|name==\'TotalMemory\')';

                var resRecord = [];
                CallGet.CallGetPerformance(param, function (param) {
                    for (var i in param) {
                        var item = param[i];

                        var resItem = {};
                        resItem["maintenanceInfo"] = "";
                        resItem["model"] = item.arraytyp;
                        resItem["maxCache"] = "";
                        resItem["storageSN"] = item.serialnb;
                        resItem["location"] = "1:SD";
                        resItem["diskCount"] = item.matricsStat.TotalDisk === undefined ? 0 : item.matricsStat.TotalDisk.max;
                        resItem["lifeCycle"] = "";
                        resItem["type"] = "高端";
                        resItem["used"] = "一般应用";
                        resItem["pools"] = "VP_EFD_MIR1;VP_FC1_MIR1;VP_FC2_MIR1";
                        var url;
                        switch (item.arraytyp) {
                            case 'Symmetrix':
                                url = "../vmax/summary.html";
                                break;
                            case 'VNX':
                                url = "../vnx/summary.html";
                                break;
                            case 'XtremIO':
                                url = "../xtremio/summary.html";
                                break;
                            case '':
                                url = "../unity/summary.html";
                                break;
                        }
                        resItem["url"] = url;
                        resItem["poolCount"] = 3;
                        resItem["version"] = item.model;
                        resItem["size"] = Math.round((item.matricsStat.ConfiguredRawCapacity === undefined ? 0 : item.matricsStat.ConfiguredRawCapacity.max) / 1024);
                        resItem["microcode"] = item.devdesc;
                        resItem["ports"] = "";
                        resItem["address"] = "";
                        resItem["maxDisks"] = 0;
                        resItem["storageName"] = "";
                        resItem["maxPorts"] = "";
                        resItem["portCount"] = 0;
                        resItem["devices"] = item.matricsStat.TotalLun === undefined ? 0 : item.matricsStat.TotalLun.max;
                        resItem["cacheSize"] = (item.matricsStat.TotalMemory === undefined ? 0 : item.matricsStat.TotalMemory.max) / 1024;

                        resRecord.push(resItem);
                    }
                    callback(null, resRecord);
                });

            },
            function (arg1, callback) {
                var filter;
                DeviceMgmt.getMgmtObjectInfo(filter, function (arrayinfo) {
                    for (var i in arg1) {
                        var item = arg1[i];
                        for (var j in arrayinfo) {
                            var infoItem = arrayinfo[j];
                            if (item.storageSN == infoItem.sn) {
                                item["location"] = infoItem.datacenter + ":" + infoItem.cabinet;
                                item["type"] = infoItem.level == 'middle' ? '中端' : '高端';
                                item["used"] = infoItem.specialInfo.used == 'general' ? '一般应用' : '应用';
                                item["storageName"] = infoItem.name;
                                item["maxCache"] = infoItem.specialInfo.maxCache;
                                item["maxDisks"] = infoItem.specialInfo.maxDisks;
                                item["maxPorts"] = infoItem.specialInfo.maxPorts;
                                item["maxlundirector"] = (infoItem.specialInfo.maxlundirector === undefined ? 0 : infoItem.specialInfo.maxlundirector);
                                item["SRDFPairThreshold"] = (infoItem.specialInfo.SRDFPairThreshold === undefined ? 0 : infoItem.specialInfo.SRDFPairThreshold);
                                item["SRDFGroupThreshold"] = (infoItem.specialInfo.SRDFGroupThreshold === undefined ? 0 : infoItem.specialInfo.SRDFGroupThreshold);
                                item["lifeCycle"] = infoItem.specialInfo.lifeCycle;
                                break;
                            }
                        }
                    }

                    callback(null, arg1);
                })


            },
            function (arg, callback) {

                var param = {};
                param['filter'] = 'parttype=\'Storage Pool\'';
                param['keys'] = ['serialnb', 'device', 'part'];

                var finalResult = [];
                CallGet.CallGet(param, function (param) {
                    var deviceList = {};
                    for (var i in param.result) {
                        var item = param.result[i];

                        if (deviceList[item.serialnb] === undefined) deviceList[item.serialnb] = item.part;
                        else deviceList[item.serialnb] += ',' + item.part;
                    }

                    for (var i in arg) {
                        var item = arg[i];
                        item.pools = deviceList[item.storageSN];
                        item.poolCount = deviceList[item.storageSN] === undefined ? 0 : deviceList[item.storageSN].split(',').length;
                    }

                    callback(null, arg);
                });
            },
            function (arg, callback) {

                var param = {};
                param['filter'] = 'parttype=\'Port\'&(partgrp=\'Front-End\'|porttype=\'FE\')';
                param['keys'] = ['serialnb', 'device', 'feport'];

                var finalResult = [];
                CallGet.CallGet(param, function (param) {
                    var deviceList = {};
                    for (var i in param.result) {
                        var item = param.result[i];

                        if (deviceList[item.serialnb] === undefined) deviceList[item.serialnb] = item.feport;
                        else deviceList[item.serialnb] += ',' + item.feport;
                    }

                    for (var i in arg) {
                        var item = arg[i];
                        item.ports = deviceList[item.storageSN];
                        item.portCount = deviceList[item.storageSN] === undefined ? 0 : deviceList[item.storageSN].split(',').length;
                    }

                    callback(null, arg);
                });
            }
        ], function (err, result) {

            res.json(200, result);
        });

    });



    app.get('/ssmp/rest/vmax/summary/:device', function (req, res) {


        var device = req.params.device;

        console.log("deiv=" + device);
        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1);
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([
            function (callback) {
                var param = {};
                param['device'] = device;
                param['fields'] = ['vendor', 'arraytype', 'serialnb', 'device', 'model', 'arraytyp', 'devdesc', 'name'];
                param['period'] = util.getPeriod(start, end);
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '!parttype&devtype=\'Array\'';
                param['filter_name'] = '(name==\'ConfiguredRawCapacity\'|name=\'TotalLun\'|name==\'TotalDisk\'|name==\'TotalMemory\')';

                var resRecord = [];
                CallGet.CallGetPerformance(param, function (param) {
                    for (var i in param) {
                        var item = param[i];

                        var retItem = {};
                        retItem["address"] = "";
                        retItem["cacheSize"] = (item.matricsStat.TotalMemory === undefined ? 0 : item.matricsStat.TotalMemory.max) / 1024;
                        retItem["devices"] = item.matricsStat.TotalLun === undefined ? 0 : item.matricsStat.TotalLun.max;
                        retItem["disks"] = item.matricsStat.TotalDisk === undefined ? 0 : item.matricsStat.TotalDisk.max;
                        retItem["hostCount"] = "";
                        retItem["lifeCycle"] = "";
                        retItem["location"] = "";
                        retItem["maintenanceInfo"] = "";
                        retItem["maxCache"] = 0;
                        retItem["maxDisks"] = 0;
                        retItem["maxPorts"] = 0;
                        retItem["microcodeVersion"] = item.devdesc;
                        retItem["model"] = "VMAX";
                        retItem["pools"] = 5;
                        retItem["ports"] = 48;
                        retItem["size"] = Math.round((item.matricsStat.ConfiguredRawCapacity === undefined ? 0 : item.matricsStat.ConfiguredRawCapacity.max) / 1024);
                        retItem["storageName"] = "";
                        retItem["storageSN"] = item.serialnb;
                        retItem["type"] = "高端";
                        retItem["used"] = "一般应用";
                        retItem["vendor"] = item.vendor;





                        resRecord.push(retItem);
                    }
                    callback(null, resRecord);
                });

            },
            function (arg1, callback) {
                var filter;
                DeviceMgmt.getMgmtObjectInfo(filter, function (arrayinfo) {
                    for (var i in arg1) {
                        var item = arg1[i];
                        for (var j in arrayinfo) {
                            var infoItem = arrayinfo[j];
                            if (item.storageSN == infoItem.sn) {
                                item["location"] = infoItem.datacenter + ":" + infoItem.cabinet;
                                item["type"] = infoItem.level == 'middle' ? '中端' : '高端';
                                item["used"] = infoItem.specialInfo.used == 'general' ? '一般应用' : '应用';
                                item["storageName"] = infoItem.name;
                                item["maxCache"] = infoItem.specialInfo.maxCache;
                                item["maxDisks"] = infoItem.specialInfo.maxDisks;
                                item["maxPorts"] = infoItem.specialInfo.maxPorts;
                                item["maxlundirector"] = infoItem.specialInfo.maxlundirector;
                                item["SRDFPairThreshold"] = infoItem.specialInfo.SRDFPairThreshold;
                                item["SRDFGroupThreshold"] = infoItem.specialInfo.SRDFGroupThreshold;

                                item["lifeCycle"] = infoItem.specialInfo.lifeCycle;
                                break;
                            }
                        }
                    }

                    callback(null, arg1);
                })


            },
            function (arg, callback) {

                var param = {};
                param['filter'] = 'parttype=\'Storage Pool\'';
                param['keys'] = ['serialnb', 'device', 'part'];

                var finalResult = [];
                CallGet.CallGet(param, function (param) {
                    var deviceList = {};
                    for (var i in param.result) {
                        var item = param.result[i];

                        if (deviceList[item.serialnb] === undefined) deviceList[item.serialnb] = item.part;
                        else deviceList[item.serialnb] += ',' + item.part;
                    }

                    for (var i in arg) {
                        var item = arg[i];
                        item.pools = deviceList[item.storageSN] === undefined ? 0 : deviceList[item.storageSN].split(',').length;
                    }

                    callback(null, arg);
                });
            },
            function (arg, callback) {

                var param = {};
                param['filter'] = 'parttype=\'Port\'&(partgrp=\'Front-End\'|porttype=\'FE\')';
                param['keys'] = ['serialnb', 'device', 'feport'];

                var finalResult = [];
                CallGet.CallGet(param, function (param) {
                    var deviceList = {};
                    for (var i in param.result) {
                        var item = param.result[i];

                        if (deviceList[item.serialnb] === undefined) deviceList[item.serialnb] = item.feport;
                        else deviceList[item.serialnb] += ',' + item.feport;
                    }

                    for (var i in arg) {
                        var item = arg[i];
                        item.ports = deviceList[item.storageSN] === undefined ? 0 : deviceList[item.storageSN].split(',').length;
                    }

                    callback(null, arg);
                });
            }
        ], function (err, result) {

            res.json(200, result[0]);
        });

    });



    app.get('/ssmp/rest/vmax/ports/:device', function (req, res) {


        var device = req.params.device;

        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1);
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([

            function (callback) {

                var param = {};
                param['filter'] = 'device=\'' + device + '\'&datagrp=\'VMAX-PORTS\'';
                param['keys'] = ['serialnb', 'device', 'porttype', 'port', 'negspeed', 'partstat', 'feport', 'portwwn', 'director'];

                var finalResult = [];
                CallGet.CallGet(param, function (param) {
                    for (var i in param.result) {
                        var item = param.result[i];

                        var resItem = {};

                        resItem["portType"] = item.porttype;
                        resItem["portNumber"] = item.port;
                        resItem["ArraySN"] = item.serialnb;
                        resItem["rate"] = item.negspeed;
                        resItem["status"] = item.partstat;
                        resItem["name"] = item.feport;
                        resItem["WWPN"] = item.portwwn;
                        resItem["director"] = item.director;
                        resItem["configedStatus"] = "";
                        resItem["usedStatus"] = item.porttype == 'FA' ? '主机' : 'RDF';

                        finalResult.push(resItem);
                    }


                    callback(null, finalResult);
                });
            }
        ], function (err, result) {

            res.json(200, result);
        });

    });




    app.get('/ssmp/rest/vmax/portToApp/:device', function (req, res) {


        var device = req.params.device;
        var portname = req.query.portName;


        async.waterfall([

            function (callback) {
                var topoRecord = [];
                topos.getApplicationTopologyView(function (apptopo) {
                    for (var i in apptopo) {
                        var item = apptopo[i];
                        if (item.array == device & item.arrayport == portname) {
                            topoRecord.push(item);
                        }
                    }
                    callback(null, topoRecord);
                })
            },
            function (arg, callback) {
                var appinfo = [];

                for (var i in arg) {
                    var item = arg[i];

                    var isfind = false;
                    for (var j in appinfo) {
                        var appinfoItem = appinfo[j];
                        if (item.app == appinfoItem.appName & item.host == appinfoItem.hostName) {
                            isfind = true;
                            break;
                        }
                    }

                    if (isfind == false) {
                        var appinfoItem = {};
                        appinfoItem["appName"] = item.app;
                        appinfoItem["admin"] = item.appManagerA;
                        appinfoItem["hostIP"] = item.hostip;
                        appinfoItem["masterSlave"] = item.hostStatus;
                        appinfoItem["hostName"] = item.host;

                        appinfo.push(appinfoItem);
                    }

                }

                callback(null, appinfo);
            }
        ], function (err, result) {

            res.json(200, result);
        });

    });



    app.get('/ssmp/rest/vmax/caches/:device', function (req, res) {


        var device = req.params.device;

        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1);
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([

            function (callback) {

                var param = {};
                param['device'] = device;
                param['fields'] = ['vendor', 'arraytype', 'serialnb', 'device', 'model', 'arraytyp', 'devdesc', 'name'];
                param['period'] = util.getPeriod(start, end);
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '!parttype&devtype=\'Array\'';
                param['filter_name'] = '(name==\'TotalMemory\')';

                var resRecord = {};
                CallGet.CallGetPerformance(param, function (param) {
                    for (var i in param) {
                        var item = param[i];
                        var a = item.matricsStat.TotalMemory === undefined ? 0 : item.matricsStat.TotalMemory.max;
                        resRecord = { "cacheSize": a }



                    }
                    callback(null, resRecord);
                });
            }
        ], function (err, result) {

            res.json(200, result);
        });

    });



    app.get('/ssmp/rest/vmax/disks/:device', function (req, res) {


        var device = req.params.device;

        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1);
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([

            function (callback) {

                var param = {};
                param['device'] = device;
                param['fields'] = ['part', 'disktype', 'diskrpm', 'partstat', 'isspare', 'diskgrp', 'name'];
                param['period'] = util.getPeriod(start, end);
                param['start'] = start;
                param['end'] = end;
                param['filter'] = 'datagrp=\'VMAX-DISKS\'';
                param['filter_name'] = '(name==\'Capacity\')';

                var resRecord = [];
                CallGet.CallGetPerformance(param, function (param) {
                    for (var i in param) {
                        var item = param[i];

                        var resRecordItem = {};
                        resRecordItem["name"] = item.part;
                        resRecordItem["type"] = item.disktype;
                        resRecordItem["RPM"] = item.diskrpm;
                        resRecordItem["status"] = item.partstat;
                        resRecordItem["spare"] = item.isspare == 0 ? "FALSE" : "TRUE";
                        resRecordItem["diskGroup"] = item.diskgrp;
                        resRecordItem["size"] = item.matricsStat.Capacity === undefined ? 0 : item.matricsStat.Capacity.max;

                        resRecord.push(resRecordItem);


                    }

                    var r = {};
                    r["sizeUnit"] = "GB";
                    r["rpmUnit"] = "rpm";
                    r["data"] = resRecord;
                    callback(null, r);
                });
            }
        ], function (err, result) {

            res.json(200, result);
        });

    });




    app.get('/ssmp/rest/vmax/rdfgroup', function (req, res) {


        var device = req.params.device;

        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1);
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([

            function (callback) {
                Report.getArrayResourceLimits(start, end, function (result) {
                    callback(null, result);
                });
            }
        ], function (err, result) {

            res.json(200, result);
        });

    });


    app.get('/ceb/storageSet/addOrUpdate', function (req, res) {
        var data = {};
        data["sn"] = req.query.storageSN;
        data["name"] = req.query.name;
        data["datacenter"] = req.query.datacenter;
        data["level"] = req.query.type;
        data["type"] = "array";
        data["createdData"] = "";
        data["updatedData"] = "";
        data["specialInfo"] = "";

        var specialInfo = {};
        specialInfo["used"] = req.query.used;
        specialInfo["maxCache"] = req.query.maxCache;
        specialInfo["maxDisks"] = req.query.maxDisks
        specialInfo["maxPorts"] = req.query.maxPorts;
        specialInfo["lifeCycle"] = req.query.lifeCycle;
        specialInfo["maintenanceInfo"] = req.query.maintenanceInfo;
        specialInfo["maxlundirector"] = req.query.maxlundirector;
        specialInfo["SRDFPairThreshold"] = req.query.SRDFPairThreshold;
        specialInfo["SRDFGroupThreshold"] = req.query.SRDFGroupThreshold;
        data["specialInfo"] = JSON.stringify(specialInfo);


        DeviceMgmt.putMgmtObjectInfo(data, function (result) {
            if (result.status == 'FAIL') {
                return res.json(400, result);
            } else {
                return res.json(200, result);
            }
        })


    });


    app.get('/ceb/storageSet/list', function (req, res) {
        var filter = {};
        var finalResult = [];
        DeviceMgmt.getMgmtObjectInfo(filter, function (devInfo) {
            for (var i in devInfo) {
                var item = devInfo[i];

                var resultItem = {};
                resultItem["resourcePoolVo"] = [];
                resultItem["resourcePoolVoSize"] = 0;
                resultItem["storageSN"] = item.sn;
                resultItem["name"] = item.name;
                resultItem["model"] = "VMAX";
                resultItem["address"] = "";
                resultItem["datacenter"] = item.datacenter;
                resultItem["datacenterName"] = item.datacenter == 1 ? "SDDataCenter" : "JXQDataCenter";
                resultItem["room"] = "2";
                resultItem["type"] = item.type == 'high' ? "高端" : "中端";
                resultItem["used"] = item.specialInfo.used == 'general' ? "一般应用" : "其他应用";
                resultItem["lifeCycle"] = "";
                resultItem["maintenanceInfo"] = "";
                resultItem["providerid"] = "";
                resultItem["maxlundirector"] = item.specialInfo.maxlundirector;
                resultItem["SRDFPairThreshold"] = item.specialInfo.SRDFPairThreshold;
                resultItem["SRDFGroupThreshold"] = item.specialInfo.SRDFGroupThreshold;

                resultItem["updatedDate"] = item.createData;
                resultItem["maxCache"] = "";
                resultItem["maxDisks"] = "";
                resultItem["maxPorts"] = item.specialInfo.maxPorts;;
                resultItem["id"] = item.sn;

                finalResult.push(resultItem);
            }

            res.json(200, finalResult);
        })
    });


    app.get('/ceb/storageSet/getStorageById', function (req, res) {
        var storagesn = req.query.id;
        var filter = { "sn": storagesn };
        DeviceMgmt.getMgmtObjectInfo(filter, function (devInfo) {
            for (var i in devInfo) {
                var item = devInfo[i];

                var resultItem = {};
                resultItem["storageSN"] = item.sn;
                resultItem["name"] = item.name;
                resultItem["model"] = "VMAX";
                resultItem["address"] = "";
                resultItem["datacenter"] = item.datacenter;
                resultItem["datacenterName"] = item.datacenter == 1 ? "SDDataCenter" : "JXQDataCenter";
                resultItem["room"] = "2";
                resultItem["type"] = item.type;
                resultItem["used"] = item.specialInfo.used;
                resultItem["lifeCycle"] = "";
                resultItem["maintenanceInfo"] = "";
                resultItem["providerid"] = "";
                resultItem["maxlundirector"] = item.specialInfo.maxlundirector;
                resultItem["SRDFPairThreshold"] = item.specialInfo.SRDFPairThreshold;
                resultItem["SRDFGroupThreshold"] = item.specialInfo.SRDFGroupThreshold;
                resultItem["updatedDate"] = item.createData;
                resultItem["maxCache"] = "";
                resultItem["maxDisks"] = "";
                resultItem["maxPorts"] = "";
                resultItem["id"] = item.sn;

                res.json(200, resultItem);
            }


        })
    });


    app.get('/ceb/system/datacenter/list', function (req, res) {
        var filter = {};
        var finalResult = [{ "name": "SDDataCenter", "description": "上地数据中心", "address": " 上地", "city": "上地", "updatedOn": 0, "createdOn": 0, "id": 1 }];
        res.json(200, finalResult);

    });





    app.get('/ssmp/rest/vmax', function (req, res) {

        var device;
        async.waterfall([
            function (callback) {
                VMAX.GetArrays(device, function (ret) {
                    callback(null, ret);
                })

            },
            function (arg1, callback) {
                var filter;
                DeviceMgmt.getMgmtObjectInfo(filter, function (arrayinfo) {
                    for (var i in arg1) {
                        var item = arg1[i];
                        for (var j in arrayinfo) {
                            var infoItem = arrayinfo[j];
                            if (item.device == infoItem.storagesn) {  
                                item["location"] = infoItem.datacenter + ":" + infoItem.cabinet;
                                item["type"] = infoItem.level == 'middle' ? '中端' : '高端';
                                item["used"] = infoItem.specialInfo.used == 'general' ? '一般应用' : '应用';
                                item["storageName"] = infoItem.name;
                                item["maxCache"] = infoItem.specialInfo.maxCache;
                                item["maxDisks"] = infoItem.specialInfo.maxDisks;
                                item["maxPorts"] = infoItem.specialInfo.maxPorts;
                                item["maxlundirector"] = infoItem.specialInfo.maxlundirector;
                                item["SRDFPairThreshold"] = infoItem.specialInfo.SRDFPairThreshold;
                                item["SRDFGroupThreshold"] = infoItem.specialInfo.SRDFGroupThreshold;

                                item["lifeCycle"] = infoItem.specialInfo.lifeCycle;
                                break;
                            }
                        }
                    }
                    callback(null, arg1);
                })
            }
        ], function (err, result) {

            var finalResult = [];
            for (var i in result) {
                var item = result[i];

                var storageName = item.storageName.split('-')[0];
                var localtion = item.storageName.split('-')[1];

                var isfind = false;
                for ( var j in result ) {
                    var item1 = result[j];
                    if ( item.device == item1.device ) continue;

                    var storageName1 = item1.storageName.split('-')[0];
                    var localtion1 = item1.storageName.split('-')[1];

                    if ( storageName == storageName1 ) {
                        var resultItem = {}; 
                        resultItem["location"] = localtion ;
                        resultItem["localSN"] = item.device ;
                        resultItem["remoteSN"] = item1.device ;
                        finalResult.push( resultItem );
                        
                        isfind = true;
                        break;
                    }
    
                }
                if ( isfind == false ) {
                    var resultItem = {}; 
                    resultItem["location"] = localtion ;
                    resultItem["localSN"] = item.device ;
                    resultItem["remoteSN"] = "" ;
                    finalResult.push( resultItem );                    
                }

            } 
            res.json(200, finalResult);
        });

    });


    app.get('/ssmp/rest/vmax/storagegroup/:devicesn', function (req, res) {
        var device = req.params.devicesn;
        async.waterfall([
            function (callback) {
                var finalrecord = [];
                VMAX.GetStorageGroups(device, function (ret) {
                    for (var i in ret) {
                        var item = ret[i];
                        finalrecord.push(item.sgname);
                    }
                    callback(null, finalrecord);
                })

            }
        ], function (err, result) {

            res.json(200, result);
        });

    });



    /*
    {
        "ismasked": "0",
        "poolname": "DG1_F_F",
        "vmaxtype": "VMAX3",
        "sgname": "N/A",
        "purpose": "Pool Contributor",
        "partsn": "N/A",
        "part": "FFCA0",
        "parttype": "LUN",
        "disktype": "Fibre Channel",
        "dgstype": "Thick",
        "name": "Capacity",
        "poolemul": "FBA",
        "model": "VMAX200K",
        "device": "000496700481",
        "config": "2-Way Mir",
        "Capacity": "n/a",
        "UsedCapacity": "n/a",
        "ConnectedDevice": "",
        "ConnectedDeviceType": "",
        "ConnectedObject": "",
        "ConnectedHost": "",
        "hosts": [],
        "ConnectedHostCount": 0,
        "ConnectedInitiators": []
    },

*/


    app.get('/ssmp/rest/vmax/available-luns/:devicesn', function (req, res) {
        var device = req.params.devicesn;
        var sgname = req.params.sgname;

        async.waterfall([
            function (callback) {
                var finalrecord = [];
 
                var param = {}; 
                param['filter'] = '(parttype=\'LUN\')';
                param['filter_name'] = '(name=\'Capacity\')';
                param['keys'] = ['device', 'part'];
                param['fields'] = ['model', 'parttype', 'config', 'poolemul', 'purpose', 'dgstype', 'poolname', 'partsn', 'sgname', 'ismasked', 'vmaxtype', 'disktype','dgraid'];
                param['period'] = 86400;
                param['start'] = util.getConfStartTime('1w');
    
                if (device !== undefined) {
                    param['filter'] = 'device=\'' + device + '\'&' + param['filter'];
                } 
                
                CallGet.CallGet(param, function (param) {
                    var ret = param.result;
                    for (var i in ret) {
                        var item = ret[i];
                        if (item.ismasked !== undefined) 
                            if (item.ismasked == "0" && item.config.indexOf('RDF') < 0 ) {
                                finalrecord.push(item);
                            }
                    }
                    finalrecord.sort(sortBy('part'));
                    callback(null, finalrecord);
                    
    
                }); 

            },
            // Get partner array luns info for compare
            function(luns,callback) { 
                DeviceMgmt.getPartnerArrayInfo(device, function(partnerArray) {      
                    var partnerDevice = partnerArray.sn;
 
                    var finalRecord=[];
                    // query partner luns
                    var param = {}; 
                    param['filter'] = '(parttype=\'LUN\')';
                    param['filter_name'] = '(name=\'Capacity\')';
                    param['keys'] = ['device', 'part'];
                    param['fields'] = ['model', 'parttype', 'config', 'poolemul', 'purpose', 'dgstype', 'poolname', 'partsn', 'sgname', 'ismasked', 'vmaxtype', 'disktype','dgraid'];
                    param['period'] = 86400;
                    param['start'] = util.getConfStartTime('1w');
        
                    if (device !== undefined) {
                        param['filter'] = 'device=\'' + partnerDevice + '\'&' + param['filter'];
                    } 
                    
                    CallGet.CallGet(param, function (param) {
                        var ret = param.result;
                        for ( var i in luns ) {
                            var item = luns[i];
                            var isfind = false;
                            for ( var j in ret ) {
                                var partnerItem = ret[j]; 
                                if (
                                   ( item.ismasked == partnerItem.ismasked ) &&
                                   ( item.part == partnerItem.part ) &&
                                   ( item.dgraid == partnerItem.dgraid ) &&
                                   ( item.config == partnerItem.config ) &&
                                   ( item.Capacity == partnerItem.Capacity ) 
                                    ) {
                                        isfind = true;
                                        finalRecord.push(item);
                                        break;
                                    }
                            } 
                        }  
                        callback(null,finalRecord);    
                    }); 
              });
            },
            function (luns, callback) {
                var finalRecord = {
                    "success": true,
                    "data": []
                }

                for (var i in luns) {
                    var item = luns[i];
                    var newItem = {};

                    if (item.config.indexOf("RDF") >= 0) {
                        var type = item.config.split("+")[1];
                        var rdfProp = item.config.split("+")[0];
                    } else {
                        var type = item.config;
                        var rdfProp = "N/A";
                    }

                    newItem["id"] = item.part;
                    newItem["name"] = item.part;
                    newItem["type"] = item.dgraid;
                    newItem["size(GB)"] = item.Capacity;
                    newItem["rdfProp"] = "";
                    newItem["rdfRelation"] = rdfProp;

                    finalRecord.data.push(newItem);
                }

                callback(null, finalRecord);
            }
        ], function (err, result) {

            res.json(200, result);
        });

    });



    // 获取某个SG相关的所有前端囗信息
    app.get('/ssmp/rest/vmax/:devicesn/:sgname/ports', function (req, res) {
        var device = req.params.devicesn;
        var sgname = req.params.sgname;

        async.waterfall([
            function (callback) {

                VMAX.GetMaskViews(device, function (maskings) {
                    var isfind = false;
                    for (var i in maskings) {
                        var item = maskings[i];
                        if (item.sgname == sgname) {
                            isfind = true;
                            callback(null, item);
                        }
                    }
                    if (isfind == false)
                        callback(null, {});

                });

            },
            function (arg1, callback) {

                if (JSON.stringify(arg1) == '{}') {

                    callback(null, []);
                }
                else
                    Report.getVMAXDirectorAddress(device, function (address) {

                        var feports = arg1.portgrp_member;

                        for (var j in feports) {
                            var item = feports[j];

                            var feport = item.feport;
                            var director = feport.split(':')[0];

                            for (var i in address) {

                                var dirItem = address[i];

                                if (dirItem.director == director) {
                                    item['availableAddress'] = dirItem.availableAddress;
                                    item['maxAvailableAddress'] = dirItem.maxAvailableAddress;
                                    item['isAvailableAddress'] = (dirItem.availableAddress > 0) ? 'YES' : 'NO';

                                }

                            }

                        }

                        callback(null, feports);
                    });

            },

        ], function (err, result) {

            var finalResult = {};
            finalResult["success"] = "true";
            finalResult["data"] = result;
            res.json(200, finalResult);
        });

    });

    

    // 获取交换机端囗信息
    app.get('/ssmp/rest/switch/:device/ports', function (req, res) {
        var device = req.params.devicesn;
        var sgname = req.params.sgname;

        async.waterfall([
            function (callback) {

                SWITCH.GetSwitchPorts(device, function (ports) {
                    callback(null,ports);

                });

            },
            function (arg1, callback) {
                callback(null,arg1);
            },

        ], function (err, result) {
 
            res.json(200, result);
        });

    });


    // 获取所有VMAX存储中的iolimit设置情况
    app.get('/ssmp/rest/vmax/sg-iolimit', function (req, res) {
        var device = req.params.devicesn;
        var sgname = req.params.sgname;

        async.waterfall([
            function (callback) {

                VMAX.GetStorageGroups(device, function (sg) {
	            for ( var i in sg ) {
			var item = sg[i];
			delete item.luns;
		    }
                    callback(null, sg);

                });

            },
            function (arg1, callback) {
                var filter = {};
                DeviceMgmt.getMgmtObjectInfo(filter, function (arrayinfo) {
                    for ( var i in arg1 ) {
                        var item = arg1[i];
                        for ( var j in arrayinfo ) {
                            var info = arrayinfo[j];
                            if ( item.device == info.sn ) {
                                item["arrayname"]= info.name;
                            }
                        }
                    }
                    callback(null, arg1);
                });

            }

        ], function (err, result) {
            result.sort(sortBy('arrayname'));
            res.json(200, result);
        });

    });

};

module.exports = cebAPIController;
