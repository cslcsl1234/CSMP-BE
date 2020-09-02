"use strict";
const logger = require("../lib/logger")(__filename);

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('switchController')
const name = 'switch'
var unirest = require('unirest');
var configger = require('../config/configger');
var util = require('../lib/util');
var CallGet = require('../lib/CallGet');
var getTopos = require('../lib/topos');
var async = require('async');

var mongoose = require('mongoose');
var SwitchObj = mongoose.model('Switch');
var SWITCH = require('../lib/Switch');
var VMAX = require('../lib/Array_VMAX');
var HOST = require('../lib/Host');

// -----------------------------------
// For demo data
// ----------------------------------
var demo_switchs = require('../demodata/switchs');
var demo_switch_ports = require('../demodata/switch_ports');
var demo_fabrics = require('../demodata/fabrics');
var demo_fabric_zone = require('../demodata/fabric_zone');
var sortBy = require("sort-by");
const Switch = require("../lib/Switch");


var switchController = function (app) {

    var config = configger.load();



    app.get('/api/switchs', function (req, res) {

        var datacenter = req.query.datacenter;
        var deviceid = req.query.device;

        var param = {};
        param['filter_name'] = 'name=\'Availability\'';
        param['keys'] = ['device'];
        param['fields'] = ['devicesn', 'vendor', 'model', 'ip', 'devdesc'];

        if (typeof deviceid !== 'undefined') {
            param['filter'] = 'device=\'' + deviceid + '\'&devtype==\'FabricSwitch\'&!(parttype==\'Fabric\'|parttype=\'Zone%\')&!datagrp=\'%ZONE%\'';
        } else {
            param['filter'] = 'devtype==\'FabricSwitch\'&!parttype';
        }


        async.waterfall([
            function (callback) {
                CallGet.CallGet(param, function (param) {
                    callback(null, param);
                });
            },
            // Get All Localtion Records
            function (param, callback) {

                util.GetLocaltion(function (locations) {
                    logger.info(locations);
                    param['Locations'] = locations;
                    callback(null, param);

                });


            },
            // get customize info
            function (param, callback) {

                var locations = param.Locations;
                GetSwitchInfo(function (result) {

                    for (var i in param.result) {
                        var item = param.result[i];
                        item['info'] = {};
                        item['localtion'] = "";
                        item['datacenter'] = "undefine";
                        var switchsn = item.device;
                        //logger.info("Begin get switch info : " + switchsn);
                        for (var j in result) {
                            var infoItem = result[j];
                            if (infoItem.basicInfo.device == switchsn) {
                                var unitID = infoItem.basicInfo.UnitID;
                                for (var z in locations) {
                                    if (unitID == locations[z].UnitID) {
                                        //logger.info(locations[z].Location);
                                        item['localtion'] = locations[z].Location;
                                        item['datacenter'] = locations[z].datacenter;
                                        break;
                                    }
                                }
                                item['info'] = infoItem;
                            }
                        }
                    }


                    callback(null, param);

                });

            },

            // get customize info
            function (param, callback) {

                var fields = 'part,psname,pswwn,device,deviceid,fabwwn,lswwn,lsname';
                var filter = 'parttype==\'Fabric\'|parttype==\'VSAN\'';

                var fabricResult = [];

                logger.info(config.Backend);
                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                    .headers({ 'Content-Type': 'multipart/form-data' })
                    .query({ 'fields': fields, 'filter': filter })
                    .end(function (response) {

                        //logger.info(response.raw_body);
                        var resultJson = JSON.parse(response.raw_body).values;
                        //logger.info(resultJson);
                        for (var i in param.result) {
                            var swItem = param.result[i];
                            //logger.info(swItem);
                            var isfind = false;
                            for (var j in resultJson) {
                                var item = resultJson[j];
                                if (swItem.device == item.device) {
                                    swItem['lsname'] = item.lsname;
                                    swItem['fabwwn'] = item.fabwwn;
                                    isfind = true;
                                }
                            }
                            if (!isfind) {
                                swItem['lsname'] = swItem.device;
                                swItem['fabwwn'] = '';
                            }
                        }

                        callback(null, param);

                    });


            },
            function (arg1, callback) {
                var param = {};
                param['keys'] = ['pswwn'];
                param['fields'] = ['zsetname'];
                param['filter'] = 'parttype==\'ZoneMember\'';

                CallGet.CallGet(param, function (param) {
                    var zsetresult = param.result;

                    for (var i in arg1.result) {
                        var item = arg1.result[i];
                        for (var j in zsetresult) {
                            var zsetItem = zsetresult[j];
                            if (item.fabwwn == zsetItem.pswwn) {
                                item["zsetname"] = zsetItem.zsetname;
                            }
                        }
                    }
                    callback(null, arg1);
                });

            }


        ], function (err, result) {


            if (typeof deviceid !== 'undefined') {
                res.json(200, result.result[0]);
            } else {
                var ret = [];
                if (datacenter !== undefined) {
                    for (var i in result.result) {
                        var item = result.result[i];
                        if (item.datacenter == datacenter) {
                            ret.push(item);
                        }
                    }
                } else {
                    ret = result.result;
                }


                // need physical switch only.
                var resnew = []
                for (var i in ret) {
                    var item = ret[i];
                    if (item.devicesn === undefined) continue;
                    resnew.push(item);
                }

                res.json(200, resnew);
            }

        });


    });



    app.get('/api/switch', function (req, res) {



        var deviceid = req.query.device;



        var param = {};
        //param['filter_name'] = 'name=\'Availability\'';
        param['keys'] = ['device'];
        param['fields'] = ['devicesn', 'vendor', 'model', 'ip', 'devdesc', 'fabwwn'];

        if (typeof deviceid !== 'undefined') {
            param['filter'] = 'device=\'' + deviceid + '\'&devtype==\'FabricSwitch\'&!(parttype==\'Fabric\'|parttype=\'Zone%\')&!datagrp=\'%ZONE%\'';
        } else {
            res.json(400, 'Must be special a device!');
        }



        async.waterfall([
            function (callback) {


                CallGet.CallGet(param, function (param) {
                    callback(null, param);
                });
            },
            function (param, callback) {

                util.GetLocaltion(function (locations) {
                    param['Locations'] = locations;
                    callback(null, param);

                });


            },
            // get customize info
            function (param, callback) {

                var locations = param.Locations;
                GetSwitchInfo(function (result) {

                    for (var i in param.result) {
                        var item = param.result[i];
                        item['info'] = {};
                        var switchsn = item.device;
                        //logger.info("Begin get switch info : " + switchsn);
                        for (var j in result) {
                            var infoItem = result[j];
                            if (infoItem.basicInfo.device == switchsn) {
                                var unitID = infoItem.basicInfo.UnitID;
                                for (var z in locations) {
                                    if (unitID == locations[z].UnitID) {
                                        //logger.info(locations[z].Location);
                                        item['localtion'] = locations[z].Location;
                                        break;
                                    }
                                }
                                item['info'] = infoItem;
                            }
                        }
                    }


                    callback(null, param);

                });

            },
            function (arg1, callback) {
                var param = {};
                param['keys'] = ['pswwn'];
                param['fields'] = ['zsetname'];
                param['filter'] = 'parttype==\'ZoneMember\'';

                CallGet.CallGet(param, function (param) {
                    var zsetresult = param.result;

                    for (var i in arg1.result) {
                        var item = arg1.result[i];
                        for (var j in zsetresult) {
                            var zsetItem = zsetresult[j];
                            if (item.fabwwn == zsetItem.pswwn) {
                                item["zsetname"] = zsetItem.zsetname;
                            }
                        }
                    }
                    callback(null, arg1);
                });

            }

        ], function (err, result) {
            // result now equals 'done'
            res.json(200, result.result);
        });


    });

    function GetSwitchInfo(callback) {

        SwitchObj.find({}, { "__v": 0, "_id": 0 }, function (err, doc) {
            //system error.
            if (err) {
                return done(err);
            }
            if (!doc) { //user doesn't exist.
                logger.info("switch info record is not exist.");

                callback(null, []);

            } else {
                logger.info("Switch is exist!");
                callback(doc);

            }

        });
    }




    app.get('/api/topos', function (req, res) {



        getTopos(function (result) {
            res.json(200, result);
        });


    });

    app.get('/api/fabrics/switchs/ports', function (req, res) {

        var fabwwn = req.query.fabwwn;
        var device = req.query.device;

        async.waterfall([
            function (callback) {
                SWITCH.getSwitchsByFabric(fabwwn, device, function (fabricResult) {
                    logger.info('The number of Fabrics = ' + fabricResult.length);
                    callback(null, fabricResult);
                })
            },
            function (arg1, callback) {
                var fabric = arg1[0];
                var fabricwwn = fabric.fabwwn;
                var switchs = [];
                for (var i in fabric.switchs) {
                    var item = fabric.switchs[i];
                    switchs.push(item.device);
                }
                async.mapSeries(switchs, function (switchItem, subcallback) {
                    var isPortStatics;
                    SWITCH.GetSwitchPortsDetail(switchItem, isPortStatics, function (result) {
                        subcallback(null, result);
                    })

                },
                    function (err, result) {

                        var mergedResult = [];
                        for ( var i in result ) {
                            var item = result[i];
                            for ( var j in item ) {
                                var item1 = item[j];
                                var isfind = false;
                                for ( var z in mergedResult ) {
                                    var item2 = mergedResult[z];
                                    if ( item1.partwwn == item2.partwwn ) {
                                        isfind = true;
                                        break;
                                    }
                                }
                                if ( isfind == false ) mergedResult.push(item1);
                            }
                        }
                        callback(null, mergedResult);
                    }
                )

            }
        ], function (err, result) {
            // result now equals 'done'  
            res.json(200, result);
        });
    });


    app.get('/api/fabrics', function (req, res) {

        //var fields = 'device,deviceid,vendor,model,ip,devdesc,devicesn,domainid,firmware,psname,pswwn,bootdate';

        var fabwwn = req.query.fabwwn;
        var device = req.query.device;


        if (config.ProductType == 'demo') {
            res.json(200, demo_fabrics);
            return;
        }

        SWITCH.getSwitchsByFabric(fabwwn, device, function (fabricResult) {
            logger.info('The number of Fabrics = ' + fabricResult.length);
            res.json(200, fabricResult);

        })


    });

    app.get('/api/fabric/zone1', function (req, res) {

        var fabwwn = req.query.fabwwn;

        getTopos.getZoneMemberRelation(function (result) {
            res.json(200, result);
        })


    });


    app.get('/api/fabric/zone', function (req, res) {

        //var fields = 'device,deviceid,vendor,model,ip,devdesc,devicesn,domainid,firmware,psname,pswwn,bootdate';

        var fabwwn = req.query.fabwwn;
        SWITCH.getZone(fabwwn, function (result) {
            res.json(200, result);
        })

    });



    /* 
     *  Create a Switch record 
     */
    app.post('/api/switch', function (req, res) {

        var reqBody = req.body;

        SwitchObj.findOne({ "basicInfo.device": reqBody.basicInfo.device }, function (err, doc) {
            //system error.
            if (err) {
                return done(err);
            }
            if (!doc) { //user doesn't exist.
                logger.info("app is not exist. insert it.");

                var newapp = new SwitchObj(reqBody);
                newapp.save(function (err, thor) {
                    logger.info('Test2');
                    if (err) {
                        console.dir(thor);
                        return res.json(400, err);
                    } else
                        return res.json(200, reqBody);
                });
            } else {

                doc.update(reqBody, function (error, course) {
                    if (error) return next(error);
                });


                return res.json(200, { status: "The Switch has exist! Update it." });
            }

        });


    });


    app.get('/api/switchinfo', function (req, res) {
        var device = req.query.device;

        if (device === undefined) {
            res.json(401, 'Must be special a device!')
            return;
        }

        var param = {};
        //param['filter_name'] = 'name=\'Availability\'';
        param['keys'] = ['device'];
        param['fields'] = ['devicesn', 'vendor', 'model', 'ip', 'devdesc'];
        param['filter'] = 'device=\'' + device + '\'&devtype==\'FabricSwitch\'&!(parttype==\'Fabric\'|parttype=\'Zone%\')&!datagrp=\'%ZONE%\'';



        async.waterfall([
            function (callback) {
                CallGet.CallGet(param, function (param) {

                    callback(null, param);

                });
            },
            // Get All Localtion Records
            function (param, callback) {

                util.GetLocaltion(function (locations) {
                    param['Locations'] = locations;
                    callback(null, param);

                });


            },
            // get customize info
            function (param, callback) {

                var locations = param.Locations;
                GetSwitchInfo(function (result) {

                    for (var i in param.result) {
                        var item = param.result[i];
                        item['info'] = {};
                        var switchsn = item.device;
                        //logger.info("Begin get switch info : " + switchsn);
                        for (var j in result) {
                            var infoItem = result[j];
                            if (infoItem.basicInfo.device == switchsn) {
                                var unitID = infoItem.basicInfo.UnitID;
                                for (var z in locations) {
                                    if (unitID == locations[z].UnitID) {
                                        //logger.info(locations[z].Location);
                                        item['localtion'] = locations[z].Location;
                                        break;
                                    }
                                }
                                item['info'] = infoItem;
                            }
                        }
                    }


                    callback(null, param);

                });

            }

        ], function (err, result) {
            // result now equals 'done'
            //res.json(200, result.result); 
            var returnData = result.result[0];
            //logger.info(returnData);
            var finalResult = [];
            var item = {};
            // Combine the UI element for VMAX Basic Info page.

            // -------------- Block1 ---------------------------
            var UI_Block1 = {};
            UI_Block1['title'] = "交换机管理信息";
            UI_Block1['detail'] = [];

            item = {};
            item["name"] = "交换机名称";
            item["value"] = returnData.device;
            UI_Block1.detail.push(item);

            item = {};
            item["name"] = "交换机序列号";
            item["value"] = returnData.devicesn;
            UI_Block1.detail.push(item);

            item = {};
            item["name"] = "厂商";
            item["value"] = returnData.vendor;
            UI_Block1.detail.push(item);

            item = {};
            item["name"] = "型号";
            item["value"] = returnData.model;
            UI_Block1.detail.push(item);

            item = {};
            item["name"] = "管理IP";
            item["value"] = returnData.ip;
            UI_Block1.detail.push(item);



            // -------------- Block1 ---------------------------

            var UI_Block2 = {};
            UI_Block2['title'] = "资产信息";
            UI_Block2['detail'] = [];

            if (returnData.info !== undefined) {

                if (returnData.info.asset !== undefined) {

                    item = {};
                    item["name"] = "资产编号";
                    item["value"] = returnData.info.assets.no;
                    UI_Block2.detail.push(item);

                    item = {};
                    item["name"] = "用途";
                    item["value"] = returnData.info.assets.purpose;
                    UI_Block2.detail.push(item);

                    item = {};
                    item["name"] = "管理员";
                    item["value"] = returnData.info.assets.manager;
                    UI_Block2.detail.push(item);


                    // -------------- Block3 ---------------------------

                    var UI_Block3 = {};
                    UI_Block3['title'] = "维保信息";
                    UI_Block3['detail'] = [];

                    item = {};
                    item["name"] = "上线时间";
                    item["value"] = returnData.info.maintenance.purchaseDate;
                    UI_Block3.detail.push(item);

                    item = {};
                    item["name"] = "维保厂商";
                    item["value"] = returnData.info.maintenance.vendor;
                    UI_Block3.detail.push(item);

                    item = {};
                    item["name"] = "维保年限";
                    item["value"] = returnData.info.maintenance.period;
                    UI_Block3.detail.push(item);

                    item = {};
                    item["name"] = "维保联系人";
                    item["value"] = returnData.info.maintenance.contact;
                    UI_Block3.detail.push(item);

                    // -------------- Finally combine the final result record -----------------
                    finalResult.push(UI_Block2);
                    finalResult.push(UI_Block3);
                }
            }


            finalResult.push(UI_Block1);

            res.json(200, finalResult);
        })
    });


    app.get('/api/switch/ports', function (req, res) {

        var device = req.query.device;
        var isPortStatics = req.query.isPortStatics;

        SWITCH.GetSwitchPortsDetail(device, isPortStatics, function (result) {
            res.json(200, result)
        })

    });

    app.get('/api/switch/port_detail', function (req, res) {
        var device = req.query.device;

        if (device === undefined) {
            res.json(400, 'Must be special a device!')
            return;
        }

        async.waterfall([
            function (callback) {

                SWITCH.GetSwitchPorts(device, function (result) {
                    callback(null, result);
                });


            },

            function (arg1, callback) {
                var host;
                HOST.GetHBAFlatRecord(host, function (hosts) {
                    for (var i in arg1) {
                        var portItem = arg1[i];
                        portItem["hostname"] = portItem.connectedToAlias; // default equal the port alias name;

                        for (var j in hosts) {
                            var hostItem = hosts[j];
                            if (portItem.portwwn == hostItem.hba_wwn) {
                                portItem["hostname"] = hostItem.hostname;
                                break;
                            }
                        }

                    }

                    callback(null, arg1);
                })


            },
            function (arg1, callback) {


                var data = arg1;


                var finalResult = {};

                // ----- the part of perf datetime --------------
                finalResult["startDate"] = util.getPerfStartTime();
                finalResult["endDate"] = util.getPerfEndTime();





                // ----- the part of chart --------------

                var groupby = "partstat";
                var chartData = [];
                for (var i in data) {
                    var item = data[i];

                    var groupbyValue = item[groupby];

                    var isFind = false;
                    for (var j in chartData) {
                        var charItem = chartData[j];
                        if (charItem.name == groupbyValue) {
                            charItem.value = charItem.value + 1;
                            isFind = true;
                        }
                    }
                    if (!isFind) {
                        var charItem = {};
                        charItem["name"] = groupbyValue;
                        charItem["value"] = 1;
                        chartData.push(charItem);
                    }



                }


                finalResult["chartType"] = "pie";
                finalResult["chartData"] = chartData;

                // ---------- the part of table ---------------
                var tableHeader = [];
                var tableHeaderItem = {};
                tableHeaderItem["name"] = "端口序号";
                tableHeaderItem["value"] = "partid";
                tableHeaderItem["sort"] = true;
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "端口名称";
                tableHeaderItem["value"] = "part";
                tableHeaderItem["sort"] = true;
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "类型";
                tableHeaderItem["value"] = "porttype";
                tableHeaderItem["sort"] = true;
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "最大速度";
                tableHeaderItem["value"] = "maxspeed";
                tableHeaderItem["sort"] = true;
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "状态";
                tableHeaderItem["value"] = "partstat";
                tableHeaderItem["sort"] = true;
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "连接WWN";
                tableHeaderItem["value"] = "connectedToWWN";
                tableHeaderItem["sort"] = true;
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "连接设备名称";
                tableHeaderItem["value"] = "hostname";
                tableHeaderItem["sort"] = true;
                tableHeader.push(tableHeaderItem);



                // ---------- the part of table event ---------------
                var tableEvent = {};
                var tableEventParam = [];
                var tableEventParamItem = {};
                tableEventParamItem["findName"] = 'partwwn';
                tableEventParamItem["postName"] = 'portwwn';
                tableEventParam.push(tableEventParamItem);


                var tableEventParamItem = {};
                tableEventParamItem["findName"] = 'device';
                tableEventParamItem["postName"] = 'device';
                tableEventParam.push(tableEventParamItem);


                tableEvent["event"] = "appendArea";
                tableEvent["param"] = tableEventParam;
                tableEvent["url"] = "/switch/port_detail/perf";


                finalResult["tableHead"] = tableHeader;
                finalResult["tableEvent"] = tableEvent;
                finalResult["tableBody"] = data;

                callback(null, finalResult);

            }
        ], function (err, result) {
            // result now equals 'done'  
            res.json(200, result);
        });

    });





    app.get('/api/switch/port_detail/perf', function (req, res) {
        var device = req.query.device;
        var portwwn = req.query.portwwn;
        var start = req.query.startDate;
        var end = req.query.endDate;
        SWITCH.getSwitchPortPerformance1(device, portwwn, start, end, function (result) {

            //var result1 = VMAX.convertPerformanceStruct(result);
            res.json(200, result);
        });


    });



    app.get('/api/switch/alias', function (req, res) {


        async.waterfall(
            [
                function (callback) {
                    var wwnlist1;
                    SWITCH.getAlias(wwnlist1, function (result) {

                        var wwnlist = [];
                        for (var i in result) {
                            var item = result[i];

                            var isfind = false;
                            for (var j in wwnlist) {
                                var wwnitem = wwnlist[j];

                                if (item.zmemid == wwnitem.HBAWWN) {
                                    isfind = true;
                                    if (wwnitem.ALIAS.indexOf(item.alias) < 0)
                                        wwnitem['ALIAS'] = wwnitem.ALIAS + ',' + item.alias;
                                }
                            }

                            if (!isfind) {
                                var wwnitem = {};
                                wwnitem['HBAWWN'] = item.zmemid;
                                wwnitem['ALIAS'] = item.alias;
                                wwnlist.push(wwnitem);
                            }
                        }
                        callback(null, wwnlist);
                    });
                },
                // Get All Localtion Records
                function (wwnlist, callback) {

                    var param = {};
                    if (typeof device !== 'undefined') {
                        param['filter'] = 'device=\'' + device + '\'&!vstatus==\'inactive\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
                    } else {
                        param['filter'] = '!vstatus==\'inactive\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
                    }

                    //param['filter_name'] = '(name=\'InCrcs\'|name=\'LinkFailures\'|name=\'SigLosses\'|name=\'SyncLosses\'|name=\'CreditLost\'|name=\'Availability\'|name=\'ifInOctets\'|name=\'ifOutOctets\')';
                    param['keys'] = ['device', 'partwwn'];
                    //param['fields'] = ['partid','slotnum','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat'];
                    param['fields'] = ['partid', 'part', 'porttype', 'partwwn', 'ifname', 'portwwn', 'maxspeed', 'partstat', 'partphys', 'gbicstat', 'lswwn'];

                    CallGet.CallGet(param, function (param) {
                        var noFindPort = [];
                        for (var i in wwnlist) {
                            var aliasItem = wwnlist[i];
                            aliasItem["connectTo"] = [];

                            var isfind = false;
                            for (var j in param.result) {
                                var portItem = param.result[j];
                                if (aliasItem.HBAWWN == portItem.portwwn) {
                                    aliasItem.connectTo.push(portItem);
                                    isfind = true;

                                }

                            }

                        }


                        for (var j in param.result) {
                            var portItem = param.result[j];
                            var isfind = false;
                            for (var i in wwnlist) {
                                var aliasItem = wwnlist[i];
                                if (aliasItem.HBAWWN == portItem.portwwn) {
                                    isfind = true;
                                    break;
                                }
                            }
                            if (isfind == false) {
                                if ((portItem.partstat.indexOf("Offline") < 0) &&
                                    (portItem.porttype != 'E-Port')
                                ) {
                                    var item = {};
                                    item["HBAWWN"] = portItem.portwwn;
                                    item["ALIAS"] = "n/a";
                                    item["connectTo"] = [];
                                    item.connectTo.push(portItem);
                                    wwnlist.push(item);
                                }
                            }
                        }


                        //callback(null, param.result ); 
                        callback(null, wwnlist);
                    });


                },
                function (param, callback) {
                    callback(null, param);
                }
            ],
            function (err, result) {
                res.json(200, result);
            }
        );

    });



    app.get('/api/switch/test', function (req, res) {
        var device = req.query.device;
        var portwwn = '20D60027F871F600';
        //SWITCH.getSwitchPortPerformance1(device,portwwn,function(result) {   
        //SWITCH.getFabric(device,function(result) {   
        SWITCH.GetSwitchPorts(device, function (result) {
            //var result1 = VMAX.convertPerformanceStruct(result);
            res.json(200, result);
        });


    });




};

module.exports = switchController;