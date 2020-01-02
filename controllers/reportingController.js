"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('reportingController')
const name = 'reporting'
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('../lib/CallGet');
var getTopos = require('../lib/topos');
var async = require('async');
var moment = require('moment');
var numeral = require('numeral');

var Reporting = require('../lib/Reporting');

var mongoose = require('mongoose');
var ReportInfoObj = mongoose.model('ReportInfo');
var ReportStatusObj = mongoose.model('ReportStatus');
var DeviceMgmt = require('../lib/DeviceManagement');

var tempfile = require('tempfile');
var officegen = require('officegen');
var docx = officegen('docx');
var path = require('path');
var fs = require('fs');
var http = require('http');
var util = require('../lib/util');
var sortBy = require('sort-by');


var VMAX = require('../lib/Array_VMAX');
var Report = require('../lib/Reporting');

var reportingController = function (app) {

    var config = configger.load();

    app.get('/api/reporting/test', function (req, res) {
        var tempFilePath = tempfile('.docx');
        docx.setDocSubject('testDoc Subject');
        docx.setDocKeywords('keywords');
        docx.setDescription('test description');

        var pObj = docx.createP({
            align: 'center'
        });
        pObj.addText('Policy Data', {
            bold: true,
            underline: true
        });

        docx.on('finalize', function (written) {
            console.log('Finish to create Word file.\nTotal bytes created: ' + written + '\n');
        });
        docx.on('error', function (err) {
            console.log(err);
        });

        res.writeHead(200, {
            "Content-Type": "application/vnd.openxmlformats-officedocument.documentml.document",
            'Content-disposition': 'attachment; filename=testdoc.docx'
        });
        docx.generate(res);
    });

    app.post('/api/reporting/test2', function (req, res) {

        var reportInstInfo = req.body;
        var reportInfo;
        var reportStatus = {};

        async.waterfall(
            [
                function (callback) {

                    console.log(reportInstInfo);
                    Reporting.GetReportingInfoList(function (result) {

                        for (var i in result) {
                            var reportInfoItem = result[i];
                            if (reportInfoItem.ID == reportInstInfo.ReportInfoID) {
                                reportInfo = reportInfoItem;
                                break;
                            }
                        }

                        reportInfo["reportInstance"] = reportInstInfo;

                        callback(null, reportInfo);

                    });


                },
                // Get All report status Records
                function (param, callback) {
                    console.log(param);

                    reportStatus["ID"] = param.ID + "-" + param.reportInstance.Name;
                    reportStatus["ReportInfoID"] = param.ID;
                    reportStatus["Name"] = param.reportInstance.Name;
                    reportStatus["GenerateTime"] = param.reportInstance.GenerateTime;
                    reportStatus["Status"] = "running";
                    reportStatus["StatusTime"] = new Date();
                    reportStatus["ReportFile"] = param.GenerateOutputPath + '/' + param.reportInstance.Name + '.' + param.Format;
                    reportStatus["ReportFileURL"] = '/' + reportStatus.ReportFile;
                    reportStatus["ReportParamater"] = param.reportInstance.ReportParamater;


                    Reporting.generateReportStatus(reportStatus, function (result) {
                        console.log(result);
                        callback(null, param);
                    });

                },
                // Get All report status Records
                function (param, callback) {

                    console.log(reportInfo);

                    docx.on('finalize', function (written) {
                        console.log('Finish to create Word file.\nTotal bytes created: ' + written + '\n');
                    });

                    docx.on('error', function (err) {
                        console.log(err);
                    });


                    var table = [
                        [{
                            val: "No.",
                            opts: {
                                cellColWidth: 4261,
                                b: true,
                                sz: '48',
                                shd: {
                                    fill: "7F7F7F",
                                    themeFill: "text1",
                                    "themeFillTint": "80"
                                },
                                fontFamily: "Avenir Book"
                            }
                        }, {
                            val: "Title1",
                            opts: {
                                b: true,
                                color: "A00000",
                                align: "right",
                                shd: {
                                    fill: "92CDDC",
                                    themeFill: "text1",
                                    "themeFillTint": "80"
                                }
                            }
                        }, {
                            val: "Title2",
                            opts: {
                                align: "center",
                                cellColWidth: 42,
                                b: true,
                                sz: '48',
                                shd: {
                                    fill: "92CDDC",
                                    themeFill: "text1",
                                    "themeFillTint": "80"
                                }
                            }
                        }],
                        [1, 'All grown-ups were once children', ''],
                        [2, 'there is no harm in putting off a piece of work until another day.', ''],
                        [3, 'But when it is a matter of baobabs, that always means a catastrophe.', ''],
                        [4, 'watch out for the baobabs!', 'END'],
                    ]

                    var tableStyle = {
                        tableColWidth: 4261,
                        tableSize: 24,
                        tableColor: "ada",
                        tableAlign: "left",
                        tableFontFamily: "Comic Sans MS"
                    }

                    var data = [
                        [{
                            align: 'right'
                        }, {
                            type: "text",
                            val: "Simple"
                        }, {
                            type: "text",
                            val: " with color",
                            opt: {
                                color: '000088'
                            }
                        }, {
                            type: "text",
                            val: "  and back color.",
                            opt: {
                                color: '00ffff',
                                back: '000088'
                            }
                        }, {
                            type: "linebreak"
                        }, {
                            type: "text",
                            val: "Bold + underline",
                            opt: {
                                bold: true,
                                underline: true
                            }
                        }], {
                            type: "horizontalline"
                        },
                        [{
                            backline: 'EDEDED'
                        }, {
                            type: "text",
                            val: "  backline text1.",
                            opt: {
                                bold: true
                            }
                        }, {
                            type: "text",
                            val: "  backline text2.",
                            opt: {
                                color: '000088'
                            }
                        }], {
                            type: "text",
                            val: "Left this text.",
                            lopt: {
                                align: 'left'
                            }
                        }, {
                            type: "text",
                            val: "Center this text.",
                            lopt: {
                                align: 'center'
                            }
                        }, {
                            type: "text",
                            val: "Right this text.",
                            lopt: {
                                align: 'right'
                            }
                        }, {
                            type: "text",
                            val: "Fonts face only.",
                            opt: {
                                font_face: 'Arial'
                            }
                        }, {
                            type: "text",
                            val: "Fonts face and size.",
                            opt: {
                                font_face: 'Arial',
                                font_size: 40
                            }
                        }, {
                            type: "table",
                            val: table,
                            opt: tableStyle
                        },
                        [{}, {
                            type: "image",
                            path: path.resolve(__dirname, '../1.PNG')
                        }, {
                            type: "image",
                            path: path.resolve(__dirname, '../1.PNG')
                        }], {
                            type: "pagebreak"
                        },
                        [{}, {
                            type: "numlist"
                        }, {
                            type: "text",
                            text: "numList1.",
                        }, {
                            type: "numlist"
                        }, {
                            type: "text",
                            text: "numList2.",
                        }],
                        [{}, {
                            type: "dotlist"
                        }, {
                            type: "text",
                            text: "dotlist1.",
                        }, {
                            type: "dotlist"
                        }, {
                            type: "text",
                            text: "dotlist2.",
                        }], {
                            type: "pagebreak"
                        }
                    ]

                    var pObj = docx.createByJson(data);

                    var out = fs.createWriteStream(param.GenerateOutputPath + '/' + param.reportInstance.Name + '.' + param.Format);

                    out.on('error', function (err) {
                        console.log(err);
                    });

                    docx.generate(out);
                    callback(null, param);

                },
                // Get All report status Records
                function (param, callback) {
                    reportStatus["Status"] = "complete";
                    reportStatus["StatusTime"] = new Date();
                    Reporting.generateReportStatus(reportStatus, function (result) {
                        console.log(result);
                        callback(null, param);
                    });

                }
            ],
            function (err, result) {
                // result now equals 'done'
                res.json(200, result);
            });





    });





    app.get('/api/reporting/types', function (req, res) {

        var result = [];

        var item = {};
        item['Type'] = 'Performance';
        item['TypeIcon'] = '../images/performance.ico';
        result.push(item);

        var item = {};
        item['Type'] = 'Capacity';
        item['TypeIcon'] = '../images/capacity.ico';
        result.push(item);

        var item = {};
        item['Type'] = 'Event';
        item['TypeIcon'] = '../images/event.ico';
        result.push(item);

        res.json(200, result);

    });

    app.get('/api/reporting/list', function (req, res) {

        Reporting.GetReportingInfoList(function (result) {

            res.json(200, result);

        });

    });

    app.get('/api/reporting/reportfiles', function (req, res) {
        var reportid = req.query.ReportInfoID;

        if (reportid === undefined) {
            res.json(400, 'Must be special a report id!')
            return;
        }

        ReportStatusObj.find({
            ReportInfoID: reportid
        }, {
            "__v": 0,
            "_id": 0,
            "ReportParamater._id": 0
        }, function (err, doc) {
            //system error.
            if (err) {
                return err;
            }
            if (!doc) { //user doesn't exist.
                res.json(200, []);
            } else {
                res.json(200, doc);
            }

        });

    });


    app.get('/api/reporting/downloadfiles', function (req, res) {
        var reportInstance = req.query.reportInstance;
        var aa = JSON.parse(reportInstance);
        console.log(aa);
        if (reportInstance === undefined) {
            res.json(400, 'Must be special a reportInstance !')
            return;
        }

        var FileURL = aa.ReportFile;
        console.log(FileURL);
        var file = __dirname + path.normalize("/") + ".." + path.normalize("/") + path.normalize(FileURL);
        var file1 = "." + path.normalize("/") + path.normalize(FileURL);
        console.log(file1);
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.download(file1);


    });

    app.get('/api/reporting/info', function (req, res) {

        var reportid = req.query.ID;
        if (reportid === undefined) {
            var query = ReportInfoObj.find({}).select({
                "__v": 0,
                "_id": 0
            });
        } else {
            var query = ReportInfoObj.find({
                ID: reportid
            }).select({
                "__v": 0,
                "_id": 0
            });
        }

        query.exec(function (err, doc) {
            if (err) {
                res.json(500, {
                    status: err
                })
            }
            if (!doc) {
                res.json(500, []);
            } else {
                res.json(200, doc);
            }

        });

    });






    /* 
     *  Create a report info record 
     */
    app.post('/api/reporting/info', function (req, res) {
        var reportinfo = req.body;

        ReportInfoObj.findOne({
            "ID": reportinfo.ID
        }, function (err, doc) {
            //system error.
            if (err) {
                return done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("Report info is not exist. insert it.");

                var newreport = new ReportInfoObj(reportinfo);
                newreport.save(function (err, thor) {
                    if (err) {

                        console.dir(thor);
                        return res.json(400, err);
                    } else

                        return res.json(200, {
                            status: "The Report info insert is succeeds!"
                        });
                });
            } else {
                console.log(reportinfo);
                doc.update(reportinfo, function (error, course) {
                    if (error) return next(error);
                });


                return res.json(200, {
                    status: "The Report info has exist! Update it."
                });
            }

        });



    });


    /* 
     *  Delete a report info record 
     */
    app.delete('/api/reporting/info', function (req, res) {
        var reportid = req.query.ID;

        if (reportid === undefined) {
            res.json(400, 'Must be special a report id!')
            return;
        }

        var menu = req.body;
        var conditions = {
            ID: reportid
        };
        ReportInfoObj.remove(conditions, function (err, doc) {
            //system error.
            if (err) {
                return done(err);
            } else {
                console.log("the report info is remove !");
                return res.json(200, {
                    status: "The report info has removed!"
                });
            }

        });



    });

    app.get('/api/reporting/test11', function (req, res) {

        Reporting.GetReportingInfoList(function (locations) {

            res.json(200, locations);

        });

    });


    app.post('/api/report/report01_listapi', function (req, res) {

        var list = [];

        var item1 = {
            "Display": "parm1",
            "value": "parm1_value"
        };
        var item2 = {
            "Display": "parm2",
            "value": "parm2_value"
        };
        var item3 = {
            "Display": "parm3",
            "value": "parm3_value"
        };

        list.push(item1);
        list.push(item2);
        list.push(item3);


        res.json(200, list);

    });

    app.post('/api/report/reporttest01_api', function (req, res) {

        console.log(req.body);

        res.json(200, "OK");

    });


    // CEB Report 1.1
    app.get('/api/reports/capacity/summary', function (req, res) {
        res.setTimeout(1200 * 1000);
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        console.log("BeginDate=" + start + ',EndDate=' + end);
        var device;
        Report.GetArraysIncludeHisotry(device, start, end, function (ret) {
            var finalRecord = [];

            for (var i in ret) {
                var item = ret[i];

                var isFind = false;
                for (var j in finalRecord) {
                    var resItem = finalRecord[j];
                    if (resItem.type == item.type) {
                        resItem.quantity++;

                        resItem['logical_capacity_PB'] += (isNaN(item['logical_capacity_PB']) == true) ? 0 : item['logical_capacity_PB'];
                        resItem['logical_capacity_last_year_PB'] += (isNaN(item['logical_capacity_last_year_PB']) == true) ? 0 : item['logical_capacity_last_year_PB'];
                        resItem['logical_capacity_last_month_PB'] += (isNaN(item['logical_capacity_last_month_PB']) == true) ? 0 : item['logical_capacity_last_month_PB'];
                        resItem['allocated_capacity_PB'] += (isNaN(item['allocated_capacity_PB']) == true) ? 0 : item['allocated_capacity_PB'];
                        resItem['allocated_capacity_last_year_PB'] += (isNaN(item['allocated_capacity_last_year_PB']) == true) ? 0 : item['allocated_capacity_last_year_PB'];
                        resItem['allocated_capacity_last_month_PB'] += (isNaN(item['allocated_capacity_last_month_PB']) == true) ? 0 : item['allocated_capacity_last_month_PB'];
                        resItem['allocated_capacity_increase_PB'] = resItem['allocated_capacity_PB'] - resItem['allocated_capacity_last_month_PB'];

                        isFind = true;
                        break;
                    }
                }
                if (isFind == false) {
                    var resItem = {};
                    resItem['type'] = item.type;
                    resItem.quantity = 1;


                    resItem['logical_capacity_PB'] = (isNaN(item['logical_capacity_PB']) == true) ? 0 : item['logical_capacity_PB'];
                    resItem['logical_capacity_last_year_PB'] = (isNaN(item['logical_capacity_last_year_PB']) == true) ? 0 : item['logical_capacity_last_year_PB'];
                    resItem['logical_capacity_last_month_PB'] = (isNaN(item['logical_capacity_last_month_PB']) == true) ? 0 : item['logical_capacity_last_month_PB'];
                    resItem['allocated_capacity_PB'] = (isNaN(item['allocated_capacity_PB']) == true) ? 0 : item['allocated_capacity_PB'];
                    resItem['allocated_capacity_last_year_PB'] = (isNaN(item['allocated_capacity_last_year_PB']) == true) ? 0 : item['allocated_capacity_last_year_PB'];
                    resItem['allocated_capacity_last_month_PB'] = (isNaN(item['allocated_capacity_last_month_PB']) == true) ? 0 : item['allocated_capacity_last_month_PB'];
                    finalRecord.push(resItem);
                }


            }
            for (var i in finalRecord) {
                var item = finalRecord[i];
                if (item.type == 'High') item.type = '高端存储';
                if (item.type == 'Middle') item.type = '中端存储';

                item.logical_capacity_PB = item.logical_capacity_PB / 1024;
                item.logical_capacity_last_year_PB = item.logical_capacity_last_year_PB / 1024;
                item.logical_capacity_last_month_PB = item.logical_capacity_last_month_PB / 1024;
                item.allocated_capacity_PB = item.allocated_capacity_PB / 1024;
                item.allocated_capacity_last_year_PB = item.allocated_capacity_last_year_PB / 1024;
                item.allocated_capacity_last_month_PB = item.allocated_capacity_last_month_PB / 1024;

                item.logical_capacity_last_month_increase = numeral(((item.logical_capacity_PB - item.logical_capacity_last_month_PB) / item.logical_capacity_last_month_PB * 100)).format("0,0") + " %";
                item.logical_capacity_last_year_increase = numeral(((item.logical_capacity_PB - item.logical_capacity_last_year_PB) / item.logical_capacity_last_year_PB * 100)).format("0,0") + " %";

                item.allocated_capacity_last_month_increase = numeral(((item.allocated_capacity_PB - item.allocated_capacity_last_month_PB) / item.allocated_capacity_last_month_PB * 100)).format("0,0") + " %";
                item.allocated_capacity_last_year_increase = numeral(((item.allocated_capacity_PB - item.allocated_capacity_last_year_PB) / item.allocated_capacity_last_year_PB * 100)).format("0,0") + " %";


            }

            var ret = {};
            ret["data"] = finalRecord;
            res.json(200, ret);

        });

    });


    // CEB Report 1.2
    app.get('/api/reports/capacity/details', function (req, res) {
        res.setTimeout(1200 * 1000);
        var device = req.query.device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        async.waterfall([
            function (callback) {

                Report.GetArraysIncludeHisotry(device, start, end, function (ret1) {
                    DeviceMgmt.GetArrayAliasName(function (arrayinfo) {

                        var ret = ret1;
                        for (var i in ret) {
                            var item = ret[i];
                            for (var j in arrayinfo) {
                                var arrayItem = arrayinfo[j];
                                //console.log(item.sn + '\t' + arrayItem.storagesn);
                                if (item.sn == arrayItem.storagesn) {
                                    item.name = arrayItem.name
                                }
                            }

                            item.logical_capacity_last_month_increase = numeral(((item.logical_capacity_PB - item.logical_capacity_last_month_PB) / item.logical_capacity_last_month_PB * 100)).format("0,0") + " %";
                            item.logical_capacity_last_year_increase = numeral(((item.logical_capacity_PB - item.logical_capacity_last_year_PB) / item.logical_capacity_last_year_PB * 100)).format("0,0") + " %";

                            item.allocated_capacity_last_month_increase = numeral(((item.allocated_capacity_PB - item.allocated_capacity_last_month_PB) / item.allocated_capacity_last_month_PB * 100)).format("0,0") + " %";
                            item.allocated_capacity_last_year_increase = numeral(((item.allocated_capacity_PB - item.allocated_capacity_last_year_PB) / item.allocated_capacity_last_year_PB * 100)).format("0,0") + " %";


                        }
                        callback(null, ret);

                    });
                });
            },
            function (arg, callback) {
                var ret = util.JsonSort(arg, "name");
                callback(null, ret);
            }
        ], function (err, result) {
            var newret = {};
            newret['data'] = result;

            // result now equals 'done'
            res.json(200, newret);
        });

    });

    // CEB Report 1.3
    app.get('/api/reports/capacity/top20/sg', function (req, res) {
        res.setTimeout(1200 * 1000);
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        console.log("BeginDate=" + start + ',EndDate=' + end);


        async.waterfall([
            function (callback) {

                var param = {};
                param['keys'] = ['device', 'sgname', 'lunname'];
                param['filter'] = '(source=\'VMAX-Collector\'&datagrp=\'VMAX-STORAGE-GROUPS\'&parttype=\'StorageGroupToLUN\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }

                var resItem = {};
                CallGet.CallGet(param, function (param) {
                    for (var i in param.result) {
                        var item = param.result[i];
                        if (resItem[item.device] === undefined) resItem[item.device] = {};
                        if (resItem[item.device][item.sgname] === undefined) resItem[item.device][item.sgname] = {};
                        if (resItem[item.device][item.sgname]["devcount"] === undefined) resItem[item.device][item.sgname]["devcount"] = 1
                        else
                            resItem[item.device][item.sgname]["devcount"] += 1;

                    }
                    callback(null, resItem);
                });

            },
            function (arg1, callback) {
                var param = {};
                param['filter_name'] = '(name=\'Capacity\')';
                param['keys'] = ['device', 'sgname', 'lunname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'parttype'];
                param['period'] = 86400;
                param['type'] = 'last';
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '(source=\'VMAX-Collector\'&datagrp=\'VMAX-STORAGE-GROUPS\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    var ret = param.result;
                    var finalRecord = [];
                    for (var i in ret) {
                        var item = ret[i];
                        item.Capacity = parseFloat(parseFloat(item.Capacity).toFixed(3));

                        var retItem = {};
                        retItem["device_name"] = "";
                        retItem["device_sn"] = item.device;
                        retItem["sg_name"] = item.sgname;
                        retItem["app_name"] = "";
                        if (arg1[item.device] !== undefined)
                            if (arg1[item.device][item.sgname] !== undefined)
                                retItem["sg_lun_total"] = arg1[item.device][item.sgname].devcount === undefined ? 0 : arg1[item.device][item.sgname].devcount;
                            else
                                retItem["sg_lun_total"] = 0;
                        else
                            retItem["sg_lun_total"] = 0;

                        //retItem["sg_capacity_GB"] = parseFloat(numeral(item.Capacity).format("0,0.00"));
                        retItem["sg_capacity_GB"] = item.Capacity;
                        retItem["sg_capacity_last_dec_GB"] = item.Capacity;


                        // 20180608: filter the Storage Group that for GateKeeper;
                        if (retItem.sg_capacity_GB >= 1)
                            finalRecord.push(retItem);
                    }


                    callback(null, finalRecord);
                });


            },
            function (arg1, callback) {

                //var lastYear = util.getlastYearByDate(start); 

                var lastYear = util.getlastMonthByDate(start);

                var param = {};
                param['filter_name'] = '(name=\'Capacity\')';
                param['keys'] = ['device', 'sgname', 'lunname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'parttype'];
                param['period'] = 86400;
                param['type'] = 'last';
                param['start'] = lastYear.firstDay;
                param['end'] = lastYear.lastDay;
                param['filter'] = '(source=\'VMAX-Collector\'&datagrp=\'VMAX-STORAGE-GROUPS\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    //VMAX.GetSGTop20ByCapacity(function(ret) {  
                    var ret = param.result;
                    for (var i in ret) {
                        var item = ret[i];
                        item.Capacity = parseFloat(parseFloat(item.Capacity).toFixed(3));

                        for (var j in arg1) {
                            var retItem = arg1[j];
                            if (retItem.device_sn == item.device && retItem.sg_name == item.sgname) {
                                if (item.Capacity == 'n/a')
                                    retItem["sg_capacity_last_dec_GB"] = 0;
                                else
                                    retItem["sg_capacity_last_dec_GB"] = item.Capacity;
                            }
                        }

                    }


                    callback(null, arg1);
                });


            },
            function (arg, callback) {
                Report.getAppStorageRelation(function (result) {

                    for (var i in arg) {
                        var item = arg[i];
                        for (var j in result) {
                            var appItem = result[j];
                            if (appItem.array == item.device_sn)
                                item.device_name = appItem.array_name;
                            if (appItem.array == item.device_sn && appItem.SG == item.sg_name) {
                                if (item.app_name == "")
                                    item.app_name = appItem.app;
                                else
                                    item.app_name = item.app_name + "," + appItem.app
                            }
                        }
                    }
                    callback(null, arg);


                });

            },
            function (arg1, callback) {
                for (var i in arg1) {
                    var item = arg1[i];

                    item["increase"] = numeral(((item.sg_capacity_GB - item.sg_capacity_last_dec_GB) / item.sg_capacity_last_dec_GB * 100)).format("0,0") + " %";

                }
                callback(null, arg1);
            },
            function (arg1, callback) {
                // Get Capacity Top20 by App-name
                var appCapacity = [];
                for (var i in arg1) {
                    var item = arg1[i];
                    var appCapacityItem = {};
                    // Only need one side DC.
                    if (item.device_name.indexOf('-SD') >= 0) {
                        var isfind = false;
                        for (var j in appCapacity) {
                            var appCapacityItem = appCapacity[j];
                            if (appCapacityItem.app_name == item.app_name) {
                                isfind = true;
                                appCapacityItem.sg_capacity_GB += item.sg_capacity_GB;
                                break;
                            }

                        }
                        if (isfind == false) {
                            var appCapacityItem = {};
                            appCapacityItem["app_name"] = (item.app_name == "") ? item.sgname : item.app_name;
                            appCapacityItem["nameflag"] = (item.app_name == "") ? 'sgname' : 'appname';
                            appCapacityItem["sg_capacity_GB"] = item.sg_capacity_GB;
                            appCapacity.push(appCapacityItem);
                        }
                    }
                }

                appCapacity.sort(sortBy("-sg_capacity_GB"));
                var result = [];
                for (var i = 0; i < 20; i++) {
                    if (appCapacity[i] === undefined) break;
                    var appCapacityItem = appCapacity[i];
                    for (var j in arg1) {
                        var item = arg1[j];
                        if (appCapacityItem.nameflag == "sgname") {
                            if (item.device_name.indexOf('-SD') >= 0 && item.sgname == appCapacityItem.app_name) {
                                result.push(item);
                            }
                        } else {
                            if (item.device_name.indexOf('-SD') >= 0 && item.app_name == appCapacityItem.app_name) {
                                result.push(item);
                            }
                        }
                    }
                }

                callback(null, result);

            }
        ], function (err, result) {
            var newret = {};
            newret['data'] = result;

            // result now equals 'done'
            res.json(200, newret);
        });

    });


    // CEB Report 1.4
    app.get('/api/reports/capacity/top20/sg_increase', function (req, res) {
        res.setTimeout(1200 * 1000);
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        console.log("BeginDate=" + start + ',EndDate=' + end);


        async.waterfall([
            function (callback) {

                var param = {};
                param['keys'] = ['device', 'sgname', 'lunname'];
                param['filter'] = '(source=\'VMAX-Collector\'&datagrp=\'VMAX-STORAGE-GROUPS\'&parttype=\'StorageGroupToLUN\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }

                var resItem = {};
                CallGet.CallGet(param, function (param) {
                    for (var i in param.result) {
                        var item = param.result[i];
                        if (resItem[item.device] === undefined) resItem[item.device] = {};
                        if (resItem[item.device][item.sgname] === undefined) resItem[item.device][item.sgname] = {};
                        if (resItem[item.device][item.sgname]["devcount"] === undefined) resItem[item.device][item.sgname]["devcount"] = 1
                        else
                            resItem[item.device][item.sgname]["devcount"] += 1;

                    }
                    callback(null, resItem);
                });

            },
            function (arg1, callback) {
                var param = {};
                param['filter_name'] = '(name=\'Capacity\')';
                param['keys'] = ['device', 'sgname', 'lunname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'parttype'];
                param['period'] = 86400;
                param['type'] = 'last';
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '(source=\'VMAX-Collector\'&datagrp=\'VMAX-STORAGE-GROUPS\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    var ret = param.result;
                    var finalRecord = [];
                    for (var i in ret) {
                        var item = ret[i];
                        item.Capacity = parseFloat(parseFloat(item.Capacity).toFixed(3));

                        var retItem = {};
                        retItem["device_name"] = "";
                        retItem["device_sn"] = item.device;
                        retItem["sg_name"] = item.sgname;
                        retItem["app_name"] = "";
                        if (arg1[item.device] !== undefined)
                            if (arg1[item.device][item.sgname] !== undefined)
                                retItem["sg_lun_total"] = arg1[item.device][item.sgname].devcount === undefined ? 0 : arg1[item.device][item.sgname].devcount;
                            else
                                retItem["sg_lun_total"] = 0;
                        else
                            retItem["sg_lun_total"] = 0;

                        retItem["sg_capacity_GB"] = item.Capacity;
                        retItem["sg_capacity_last_dec_GB"] = item.Capacity;
                        retItem["sg_logical_capacity_GB"] = item.Capacity;
                        finalRecord.push(retItem);
                    }


                    callback(null, finalRecord);
                });


            },
            function (arg1, callback) {

                //var lastYear = util.getlastYearByDate(start); 

                var lastYear = util.getlastMonthByDate(start);

                var param = {};
                param['filter_name'] = '(name=\'Capacity\')';
                param['keys'] = ['device', 'sgname', 'lunname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'parttype'];
                param['period'] = 86400;
                param['type'] = 'last';
                param['start'] = lastYear.firstDay;
                param['end'] = lastYear.lastDay;
                param['filter'] = '(source=\'VMAX-Collector\'&datagrp=\'VMAX-STORAGE-GROUPS\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    //VMAX.GetSGTop20ByCapacity(function(ret) {  
                    var ret = param.result;
                    for (var i in ret) {
                        var item = ret[i];
                        item.Capacity = parseFloat(parseFloat(item.Capacity).toFixed(3));

                        for (var j in arg1) {
                            var retItem = arg1[j];
                            if (retItem.device_sn == item.device && retItem.sg_name == item.sgname) {
                                if (item.Capacity == 'n/a')
                                    retItem["sg_capacity_last_dec_GB"] = 0;
                                else
                                    retItem["sg_capacity_last_dec_GB"] = item.Capacity;
                            }
                        }

                    }


                    callback(null, arg1);
                });


            },
            function (arg, callback) {
                Report.getAppStorageRelation(function (result) {

                    for (var i in arg) {
                        var item = arg[i];
                        for (var j in result) {
                            var appItem = result[j];
                            if (appItem.array == item.device_sn)
                                item.device_name = appItem.array_name;
                            if (appItem.array == item.device_sn && appItem.SG == item.sg_name) {
                                if (item.app_name == "")
                                    item.app_name = appItem.app;
                                else
                                    item.app_name = item.app_name + "," + appItem.app
                            }
                        }
                    }
                    callback(null, arg);


                });

            },
            function (arg1, callback) {
                // Get Capacity Top20 by App-name
                var appCapacity = [];
                for (var i in arg1) {
                    var item = arg1[i];
                    var appCapacityItem = {};
                    // Only need one side DC.
                    if (item.device_name.indexOf('-SD') >= 0) {
                        var isfind = false;
                        for (var j in appCapacity) {
                            var appCapacityItem = appCapacity[j];
                            if (appCapacityItem.app_name == item.app_name) {
                                isfind = true;
                                appCapacityItem.sg_capacity_GB += item.sg_capacity_GB;
                                appCapacityItem.sg_capacity_last_dec_GB += item.sg_capacity_last_dec_GB;
                                break;
                            }

                        }
                        if (isfind == false) {
                            var appCapacityItem = {};
                            appCapacityItem["app_name"] = item.app_name;
                            appCapacityItem["sg_capacity_GB"] = item.sg_capacity_GB;
                            appCapacityItem["sg_capacity_last_dec_GB"] = item.sg_capacity_last_dec_GB;

                            appCapacity.push(appCapacityItem);
                        }
                    }
                }
                var appCapacityIncrease = [];
                for (var i in appCapacity) {
                    var item = appCapacity[i];
                    item["increase"] = (item.sg_capacity_GB - item.sg_capacity_last_dec_GB) / item.sg_capacity_last_dec_GB * 100;
                    if (item.increase > 0)
                        appCapacityIncrease.push(item);
                }

                appCapacityIncrease.sort(sortBy("-increase"));
                var result = [];
                for (var i = 0; i < 20; i++) {
                    var appCapacityItem = appCapacityIncrease[i];
                    if (appCapacityItem === undefined) continue;
                    for (var j in arg1) {
                        var item = arg1[j];
                        if (item.device_name.indexOf('-SD') >= 0 && item.app_name == appCapacityItem.app_name) {
                            item["increase"] = numeral(((item.sg_capacity_GB - item.sg_capacity_last_dec_GB) / item.sg_capacity_last_dec_GB * 100)).format("0,0") + " %";

                            result.push(item);
                        }
                    }
                }

                callback(null, result);

            }
        ], function (err, result) {
            var newret = {};
            newret['data'] = result;

            // result now equals 'done'
            res.json(200, newret);
        });

    });


    // CEB Report 2.3

    app.get('/api/reports/capacity/related/', function (req, res) {
        res.setTimeout(1200 * 1000);
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        console.log("BeginDate=" + start + ',EndDate=' + end);
        var device;


        async.waterfall([
            function (callback) {
                var filter = {};
                DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                    callback(null, arrayInfo);
                })

            },
            function (param, callback) {
                var finalRecords = [];
                VMAX.GetArrays(device, function (result) {
                    for (var i in result) {
                        var item = result[i];

                        var retItem = {};
                        // Search the array custimized name
                        var isfind = false;
                        for (var j in param) {
                            var arrayinfoItem = param[j];
                            if (arrayinfoItem.storagesn == item.device) {
                                isfind = true;
                                retItem.device_name = arrayinfoItem.name;

                            }
                        }
                        if (isfind = false) {
                            retItem.device_name = "";
                        }

                        // Combine anothers field
                        retItem.device_sn = item.device;
                        retItem.available_port_addr_total = 0;
                        retItem.allocated_port_addr_total = 0;
                        retItem.allocated_addr_percent = 0;
                        retItem.pair = 0;
                        retItem.rdf_group = 0;
                        retItem.details = [];



                        finalRecords.push(retItem);
                    }

                    callback(null, finalRecords);

                });
            },
            function (arg1, callback) {
                var device;
                Report.getVMAXDirectorAddress(device, function (address) {

                    var arrayDirector = []

                    for (var i in address) {
                        var item = address[i];

                        var isfind = false;
                        for (var j in arrayDirector) {
                            var dirItem = arrayDirector[j];
                            if (item.device == dirItem.device) {
                                dirItem.maxAvailableAddress += item.maxAvailableAddress;
                                dirItem.availableAddress += item.availableAddress;
                                isfind = true;
                                break;
                            }
                        }
                        if (isfind == false) {
                            var dirItem = {};
                            dirItem.device = item.device;
                            dirItem.availableAddress = item.availableAddress;
                            dirItem.maxAvailableAddress = item.maxAvailableAddress;

                            arrayDirector.push(dirItem);
                        }
                    }

                    for (var j in arg1) {
                        var arrayListItem = arg1[j];

                        for (var i in arrayDirector) {
                            var dirItem = arrayDirector[i];
                            if (arrayListItem.device_sn == dirItem.device) {
                                arrayListItem["available_port_addr_total"] = dirItem.maxAvailableAddress;
                                arrayListItem["allocated_port_addr_total"] = dirItem.maxAvailableAddress - dirItem.availableAddress;
                                arrayListItem["allocated_addr_percent"] = parseFloat(((dirItem.maxAvailableAddress - dirItem.availableAddress) / dirItem.maxAvailableAddress * 100).toFixed(0)) + " %";

                            }
                        }

                    }
                    callback(null, arg1);
                });

            },
            function (arg1, callback) {
                var param = {};
                param['keys'] = ['device', 'srdfgrpn', 'devconf', 'srcarray'];
                param['filter'] = '(datagrp=\'VMAX-RDFREPLICAS\')';

                var resItem = {};
                CallGet.CallGet(param, function (param) {
                    var rdfGroupCount = {};
                    for (var i in param.result) {
                        var item = param.result[i];
                        if (rdfGroupCount[item.device] == undefined) {
                            rdfGroupCount[item.device] = {};
                            rdfGroupCount[item.device]["rdfCount"] = 1;
                        } else {
                            rdfGroupCount[item.device]["rdfCount"]++;
                        }
                    }

                    for (var j in arg1) {
                        var arrayListItem = arg1[j];
                        if (rdfGroupCount[arrayListItem.device_sn] !== undefined)
                            arrayListItem["rdf_group"] = rdfGroupCount[arrayListItem.device_sn].rdfCount;

                    }
                    callback(null, arg1);
                });

            },
            function (arg1, callback) {
                var param = {};
                param['keys'] = ['device', 'srdfgrpn', 'devconf', 'srcarray', 'part'];
                param['filter'] = '(datagrp=\'VMAX-RDFREPLICAS\')';

                var resItem = {};
                CallGet.CallGet(param, function (param) {
                    var rdfGroupCount = {};
                    for (var i in param.result) {
                        var item = param.result[i];
                        if (rdfGroupCount[item.device] == undefined) {
                            rdfGroupCount[item.device] = {};
                            rdfGroupCount[item.device]["pairCount"] = 1;
                        } else {
                            rdfGroupCount[item.device]["pairCount"]++;
                        }
                    }

                    for (var j in arg1) {
                        var arrayListItem = arg1[j];
                        if (rdfGroupCount[arrayListItem.device_sn] !== undefined)
                            arrayListItem["pair"] = rdfGroupCount[arrayListItem.device_sn].pairCount;

                    }
                    callback(null, arg1);
                });

            },
            function (arg1, callback) {
                var param = {};
                param['keys'] = ['device', 'sgname', 'lunname'];
                param['filter'] = '(source=\'VMAX-Collector\'&datagrp=\'VMAX-STORAGE-GROUPS\'&parttype=\'StorageGroupToLUN\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }

                var resItem = {};
                CallGet.CallGet(param, function (param) {
                    for (var i in param.result) {
                        var item = param.result[i];

                        for (var j in arg1) {
                            var arrayItem = arg1[j];
                            if (item.device == arrayItem.device_sn) {
                                if (arrayItem.details.length == 0) {
                                    var detailItem = {};
                                    detailItem.sg_name = item.sgname;
                                    detailItem.lun = 1;
                                    arrayItem.details.push(detailItem);
                                } else {
                                    var isfind = false;
                                    for (var z in arrayItem.details) {
                                        var sgItem = arrayItem.details[z];
                                        if (sgItem.sg_name == item.sgname) {
                                            isfind = true;
                                            sgItem.lun++;
                                        }
                                    }
                                    if (isfind == false) {
                                        var detailItem = {};
                                        detailItem.sg_name = item.sgname;
                                        detailItem.lun = 1;
                                        arrayItem.details.push(detailItem);
                                    }
                                }
                            }

                        }

                    }
                    callback(null, arg1);
                });

            },

            function (arg1, callback) {
                var param = {};
                param['filter_name'] = '(name=\'Capacity\'|name=\'ResponseTime\')';
                param['keys'] = ['device', 'sgname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'bwlimit', 'parttype'];
                param['period'] = 86400;
                param['limit'] = 1000000;
                param['type'] = 'max';
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    var ret = param.result;
                    var finalRecord = [];
                    for (var i in ret) {
                        var item = ret[i];
                        item.Capacity = parseFloat(parseFloat(item.Capacity).toFixed(3));
                        item.ResponseTime = parseFloat(parseFloat(item.ResponseTime).toFixed(3));

                        for (var j in arg1) {
                            var arrayItem = arg1[j];
                            if (arrayItem.device_sn == item.device) {
                                for (var z in arrayItem.details) {
                                    var sgItem = arrayItem.details[z];
                                    if (sgItem.sg_name == item.sgname) {
                                        sgItem.capacity_GB = item.Capacity;
                                        sgItem.iops_limits = item.iolimit;
                                        sgItem.iops_limits_change = (item.iolimit == 'N/A') ? 'N/A' : 0;
                                        sgItem.mbps_limits = item.bwlimit;
                                        sgItem.mbps_limits_change = (item.bwlimit == 'N/A') ? 'N/A' : 0;
                                        sgItem.response_time_ms = item.ResponseTime;
                                        sgItem.response_time_increase_last_month_percent = 0;
                                        sgItem.response_time_increase_last_year_percent = 0;
                                    }
                                }
                            }

                        }

                    }


                    callback(null, arg1);
                });


            },

            function (arg1, callback) {
                var param = {};
                param['filter_name'] = '(name=\'ResponseTime\')';
                param['keys'] = ['device', 'sgname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'bwlimit', 'parttype'];
                param['period'] = 86400;
                param['type'] = 'average';
                param['limit'] = 1000000;
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    var ret = param.result;
                    var finalRecord = [];
                    for (var i in ret) {
                        var item = ret[i];
                        item.ResponseTime = parseFloat(parseFloat(item.ResponseTime).toFixed(3));

                        for (var j in arg1) {
                            var arrayItem = arg1[j];
                            if (arrayItem.device_sn == item.device) {
                                for (var z in arrayItem.details) {
                                    var sgItem = arrayItem.details[z];
                                    if (sgItem.sg_name == item.sgname) {
                                        sgItem.avg_response_time_ms = item.ResponseTime;
                                        sgItem.avg_response_time_increase_last_month_percent = 0;
                                        sgItem.avg_response_time_increase_last_year_percent = 0;
                                    }
                                }
                            }

                        }

                    }


                    callback(null, arg1);
                });


            },

            function (arg1, callback) {
                //var lastYear = util.getlastYearByDate(start); 

                var lastYear = util.getlastMonthByDate(start);

                var param = {};
                param['filter_name'] = '(name=\'Capacity\'|name=\'ResponseTime\')';
                param['keys'] = ['device', 'sgname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'bwlimit', 'parttype'];
                param['period'] = 86400;
                param['type'] = 'max';
                param['limit'] = 1000000;
                param['start'] = lastYear.firstDay;
                param['end'] = lastYear.lastDay;
                param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    //VMAX.GetSGTop20ByCapacity(function(ret) {  
                    var ret = param.result;
                    for (var i in ret) {
                        var item = ret[i];
                        item.Capacity = parseFloat(parseFloat(item.Capacity).toFixed(3));
                        item.ResponseTime = parseFloat(parseFloat(item.ResponseTime).toFixed(3));

                        for (var j in arg1) {
                            var arrayItem = arg1[j];
                            if (arrayItem.device_sn == item.device) {
                                for (var z in arrayItem.details) {
                                    var sgItem = arrayItem.details[z];
                                    if (sgItem.sg_name == item.sgname) {
                                        sgItem.response_time_last_month = item.ResponseTime;
                                        sgItem.response_time_increase_last_month_percent = parseFloat(((sgItem.response_time_ms - sgItem.response_time_last_month) / sgItem.response_time_last_month * 100).toFixed(2));

                                    }

                                }

                            }

                        }

                    }


                    callback(null, arg1);
                });


            },


            function (arg1, callback) {
                //var lastYear = util.getlastYearByDate(start); 

                var lastYear = util.getlastMonthByDate(start);

                var param = {};
                param['filter_name'] = '(name=\'ResponseTime\')';
                param['keys'] = ['device', 'sgname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'bwlimit', 'parttype'];
                param['period'] = 86400;
                param['type'] = 'average';
                param['limit'] = 1000000;
                param['start'] = lastYear.firstDay;
                param['end'] = lastYear.lastDay;
                param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    //VMAX.GetSGTop20ByCapacity(function(ret) {  
                    var ret = param.result;
                    for (var i in ret) {
                        var item = ret[i];
                        item.ResponseTime = parseFloat(parseFloat(item.ResponseTime).toFixed(3));

                        for (var j in arg1) {
                            var arrayItem = arg1[j];
                            if (arrayItem.device_sn == item.device) {
                                for (var z in arrayItem.details) {
                                    var sgItem = arrayItem.details[z];
                                    if (sgItem.sg_name == item.sgname) {
                                        sgItem.avg_response_time_last_month = item.ResponseTime;
                                        sgItem.avg_response_time_increase_last_month_percent = parseFloat(((sgItem.avg_response_time_ms - sgItem.avg_response_time_last_month) / sgItem.avg_response_time_last_month * 100).toFixed(2));

                                    }

                                }

                            }

                        }

                    }


                    callback(null, arg1);
                });


            },

            function (arg1, callback) {
                var lastYear = util.getlastYearByDate(start);
                var param = {};
                param['filter_name'] = '(name=\'Capacity\'|name=\'ResponseTime\')';
                param['keys'] = ['device', 'sgname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'bwlimit', 'parttype'];
                param['period'] = 86400;
                param['type'] = 'max';
                param['limit'] = 1000000;
                param['start'] = lastYear.firstDay;
                param['end'] = lastYear.lastDay;
                param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    //VMAX.GetSGTop20ByCapacity(function(ret) {  
                    var ret = param.result;
                    for (var i in ret) {
                        var item = ret[i];
                        item.Capacity = parseFloat(parseFloat(item.Capacity).toFixed(3));
                        item.ResponseTime = parseFloat(parseFloat(item.ResponseTime).toFixed(3));

                        for (var j in arg1) {
                            var arrayItem = arg1[j];
                            if (arrayItem.device_sn == item.device) {
                                for (var z in arrayItem.details) {
                                    var sgItem = arrayItem.details[z];
                                    if (sgItem.sg_name == item.sgname) {
                                        sgItem.response_time_last_year = item.ResponseTime;
                                        sgItem.response_time_increase_last_year_percent = parseFloat(((sgItem.response_time_ms - sgItem.response_time_last_year) / sgItem.response_time_last_year * 100).toFixed(2));

                                    }

                                }

                            }

                        }

                    }


                    callback(null, arg1);
                });


            },

            function (arg1, callback) {
                var lastYear = util.getlastYearByDate(start);
                var param = {};
                param['filter_name'] = '(name=\'ResponseTime\')';
                param['keys'] = ['device', 'sgname'];
                param['fields'] = ['devcount', 'sgcount', 'iolimit', 'bwlimit', 'parttype'];
                param['period'] = 86400;
                param['type'] = 'average';
                param['limit'] = 1000000;
                param['start'] = lastYear.firstDay;
                param['end'] = lastYear.lastDay;
                param['filter'] = '(source=\'VMAX-Collector\'&parttype=\'Storage Group\')';
                if (typeof device !== 'undefined') {
                    param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                }


                CallGet.CallGet(param, function (param) {
                    //VMAX.GetSGTop20ByCapacity(function(ret) {  
                    var ret = param.result;
                    for (var i in ret) {
                        var item = ret[i];
                        item.ResponseTime = parseFloat(parseFloat(item.ResponseTime).toFixed(3));

                        for (var j in arg1) {
                            var arrayItem = arg1[j];
                            if (arrayItem.device_sn == item.device) {
                                for (var z in arrayItem.details) {
                                    var sgItem = arrayItem.details[z];
                                    if (sgItem.sg_name == item.sgname) {
                                        sgItem.avg_response_time_last_year = item.ResponseTime;
                                        sgItem.avg_response_time_increase_last_year_percent = parseFloat(((sgItem.avg_response_time_ms - sgItem.avg_response_time_last_year) / sgItem.avg_response_time_last_year * 100).toFixed(2));

                                    }

                                }

                            }

                        }

                    }


                    callback(null, arg1);
                });


            },
            function (arg1, callback) {
                for (var i in arg1) {
                    var item = arg1[i];
                    var itemDetails = item.details;
                    itemDetails.sort(sortBy("-avg_response_time_ms"));

                }

                arg1.sort(sortBy("device_name"));
                callback(null, arg1);
            }
        ], function (err, result) {
            // result now equals 'done'

            var res1 = {};
            res1.data = result;
            res.json(200, res1);
        });

    });


    // CEB Report 2.1  - IOPS Summary
    app.get('/api/reports/performance/summary/iops/', function (req, res) {
        //var ret = require("../demodata/summary_iops");
        res.setTimeout(1200 * 1000);
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        console.log("BeginDate=" + start + ',EndDate=' + end);
        var device;

        async.waterfall(
            [
                function (callback) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                        callback(null, arrayInfo);
                    })
                },
                // Get Current Month matrics
                function (arg1, callback) {
                    var deviceList = [];
                    var param = {};
                    param['keys'] = ['device'];
                    param['fields'] = ['name'];
                    param['period'] = 3600;
                    param['start'] = start;
                    param['end'] = end;
                    param['limit'] = 1000000;
                    param['filter'] = '!parttype&source=\'VMAX-Collector\'';
                    param['filter_name'] = '(name==\'ReadRequests\'|name==\'WriteRequests\')';
                    param['type'] = 'average';

                    CallGet.CallGetPerformance(param, function (result) {

                        for (var i in result) {
                            var item = result[i];
                            var retItem = {};
                            // Search the array custimized name
                            var isfind = false;
                            for (var j in arg1) {
                                var arrayinfoItem = arg1[j];
                                if (arrayinfoItem.storagesn == item.device) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if (isfind = false) {
                                retItem.device_name = "";
                            }

                            // Combine anothers field
                            retItem.device_sn = item.device;
                            retItem.iops_max = Math.round(item.matricsStat.ReadRequests.max + item.matricsStat.WriteRequests.max);
                            retItem.iops_avg = Math.round(item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg);
                            retItem.iops_avg_last_year = 0;
                            retItem.iops_avg_last_month = 0;

                            deviceList.push(retItem);
                        }

                        callback(null, deviceList);

                    });
                },
                // Get Last Month matrics
                function (arg1, callback) {

                    var lastMonth = util.getlastMonthByDate(start);

                    var deviceList = [];
                    var param = {};
                    param['keys'] = ['device'];
                    param['fields'] = ['name'];
                    param['period'] = 86400;
                    param['start'] = lastMonth.firstDay;
                    param['end'] = lastMonth.lastDay;
                    param['filter'] = '!parttype&source=\'VMAX-Collector\'';
                    param['limit'] = 1000000;
                    param['filter_name'] = '(name==\'ReadRequests\'|name==\'WriteRequests\')';
                    param['type'] = 'average';


                    CallGet.CallGetPerformance(param, function (result) {

                        for (var i in result) {
                            var item = result[i];
                            for (var j in arg1) {
                                var arrayinfoItem = arg1[j];

                                if (arrayinfoItem.device_sn == item.device) {

                                    arrayinfoItem.iops_avg_last_month = Math.round(item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg);
                                    arrayinfoItem.iops_lastmonth_increase = parseFloat(((arrayinfoItem.iops_avg - arrayinfoItem.iops_avg_last_month) / arrayinfoItem.iops_avg_last_month * 100).toFixed(2));
                                }
                            }

                        }

                        callback(null, arg1);

                    });
                },
                // Get Last Year matrics
                function (arg1, callback) {

                    //var lastYear = util.getlastYearByDate(start); 
                    var lastYear = util.getlastMonthByDate(start);


                    var deviceList = [];
                    var param = {};
                    param['keys'] = ['device'];
                    param['fields'] = ['name'];
                    param['period'] = 86400;
                    param['start'] = lastYear.firstDay;
                    param['end'] = lastYear.lastDay;
                    param['filter'] = '!parttype&source=\'VMAX-Collector\'';
                    param['limit'] = 1000000;
                    param['filter_name'] = '(name==\'ReadRequests\'|name==\'WriteRequests\')';
                    param['type'] = 'average';

                    CallGet.CallGetPerformance(param, function (result) {

                        for (var i in result) {
                            var item = result[i];
                            for (var j in arg1) {
                                var arrayinfoItem = arg1[j];

                                if (arrayinfoItem.device_sn == item.device) {

                                    arrayinfoItem.iops_avg_last_year = Math.round(item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg);
                                    arrayinfoItem.iops_lastyear_increase = parseFloat(((arrayinfoItem.iops_avg - arrayinfoItem.iops_avg_last_year) / arrayinfoItem.iops_avg_last_year * 100).toFixed(2));
                                }
                            }

                        }

                        callback(null, arg1);

                    });
                },
                function (devlist, callback) {
                    var groups = [];
                    for (var i in devlist) {
                        var item = devlist[i];
                        if (item.device_name === undefined) continue;
                        var nameGroup = item.device_name.split("-")[0];

                        var isfind = false;
                        for (var j in groups) {
                            var groupItem = groups[j];
                            if (nameGroup == groupItem.device_group) {
                                isfind = true;
                                groupItem.iops_max += item.iops_max;
                                groupItem.iops_avg += item.iops_avg;
                                groupItem.iops_avg_last_year += item.iops_avg_last_year;
                                groupItem.device_list.push(item);

                            }
                        }

                        if (isfind == false) {
                            var groupItem = {};
                            groupItem.device_group = nameGroup;
                            groupItem.iops_max = item.iops_max;
                            groupItem.iops_avg = item.iops_avg;
                            groupItem.iops_avg_last_year = item.iops_avg_last_year;
                            groupItem.device_list = [];
                            groupItem.device_list.push(item);

                            groups.push(groupItem);

                        }

                    }

                    for (var j in groups) {
                        var groupItem = groups[j];
                        groupItem.group_iops_lastyear_increase = parseFloat(((groupItem.iops_avg - groupItem.iops_avg_last_year) / groupItem.iops_avg_last_year * 100).toFixed(2));
                    }
                    callback(null, groups)
                }
            ],
            function (err, result) {
                // result now equals 'done'
                var ret = {}
                ret.data = result
                res.json(200, ret);
            });


    });

    // CEB Report 2.1 - MBPS
    app.get('/api/reports/performance/summary/mbps/', function (req, res) {
        //var ret = require("../demodata/summary_mbps");
        res.setTimeout(1200 * 1000);
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        console.log("BeginDate=" + start + ',EndDate=' + end);
        var device;

        async.waterfall(
            [
                function (callback) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                        callback(null, arrayInfo);
                    })
                },
                // Get Current Month matrics
                function (arg1, callback) {
                    var deviceList = [];
                    var param = {};
                    param['keys'] = ['device'];
                    param['fields'] = ['name'];
                    param['period'] = 3600;
                    param['start'] = start;
                    param['end'] = end;
                    param['filter'] = '!parttype&source=\'VMAX-Collector\'';
                    param['limit'] = 1000000;
                    param['filter_name'] = '(name==\'ReadThroughput\'|name==\'WriteThroughput\')';
                    param['type'] = 'average';

                    CallGet.CallGetPerformance(param, function (result) {

                        for (var i in result) {
                            var item = result[i];
                            var retItem = {};
                            // Search the array custimized name
                            var isfind = false;
                            for (var j in arg1) {
                                var arrayinfoItem = arg1[j];
                                if (arrayinfoItem.storagesn == item.device) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if (isfind = false) {
                                retItem.device_name = "";
                            }

                            // Combine anothers field
                            retItem.device_sn = item.device;
                            retItem.mbps_max = Math.round(item.matricsStat.ReadThroughput.max + item.matricsStat.WriteThroughput.max);
                            retItem.mbps_avg = Math.round(item.matricsStat.ReadThroughput.avg + item.matricsStat.WriteThroughput.avg);
                            retItem.mbps_avg_last_year = 0;
                            retItem.mbps_avg_last_month = 0;

                            deviceList.push(retItem);
                        }

                        callback(null, deviceList);

                    });
                },
                // Get Last Month matrics
                function (arg1, callback) {

                    var lastMonth = util.getlastMonthByDate(start);

                    var deviceList = [];
                    var param = {};
                    param['keys'] = ['device'];
                    param['fields'] = ['name'];
                    param['period'] = 86400;
                    param['start'] = lastMonth.firstDay;
                    param['end'] = lastMonth.lastDay;
                    param['filter'] = '!parttype&source=\'VMAX-Collector\'';
                    param['limit'] = 1000000;
                    param['filter_name'] = '(name==\'ReadThroughput\'|name==\'WriteThroughput\')';
                    param['type'] = 'average';

                    CallGet.CallGetPerformance(param, function (result) {

                        for (var i in result) {
                            var item = result[i];
                            for (var j in arg1) {
                                var arrayinfoItem = arg1[j];

                                if (arrayinfoItem.device_sn == item.device) {

                                    arrayinfoItem.mbps_avg_last_month = Math.round(item.matricsStat.ReadThroughput.avg + item.matricsStat.WriteThroughput.avg);
                                    arrayinfoItem.mbps_lastmonth_increase = parseFloat(((arrayinfoItem.mbps_avg - arrayinfoItem.mbps_avg_last_month) / arrayinfoItem.mbps_avg_last_month * 100).toFixed(2));
                                }
                            }

                        }

                        callback(null, arg1);

                    });
                },
                // Get Last Year matrics
                function (arg1, callback) {

                    //var lastYear = util.getlastYearByDate(start); 
                    var lastYear = util.getlastMonthByDate(start);


                    var deviceList = [];
                    var param = {};
                    param['keys'] = ['device'];
                    param['fields'] = ['name'];
                    param['period'] = 86400;
                    param['start'] = lastYear.firstDay;
                    param['end'] = lastYear.lastDay;
                    param['filter'] = '!parttype&source=\'VMAX-Collector\'';
                    param['limit'] = 1000000;
                    param['filter_name'] = '(name==\'ReadThroughput\'|name==\'WriteThroughput\')';
                    param['type'] = 'average';

                    CallGet.CallGetPerformance(param, function (result) {

                        for (var i in result) {
                            var item = result[i];
                            for (var j in arg1) {
                                var arrayinfoItem = arg1[j];

                                if (arrayinfoItem.device_sn == item.device) {

                                    arrayinfoItem.mbps_avg_last_year = Math.round(item.matricsStat.ReadThroughput.avg + item.matricsStat.WriteThroughput.avg);
                                    arrayinfoItem.mbps_lastyear_increase = parseFloat(((arrayinfoItem.mbps_avg - arrayinfoItem.mbps_avg_last_year) / arrayinfoItem.mbps_avg_last_year * 100).toFixed(2));
                                }
                            }

                        }

                        callback(null, arg1);

                    });
                },
                function (devlist, callback) {
                    var groups = [];
                    for (var i in devlist) {
                        var item = devlist[i];
                        if (item.device_name === undefined) continue;
                        var nameGroup = item.device_name.split("-")[0];

                        var isfind = false;
                        for (var j in groups) {
                            var groupItem = groups[j];
                            if (nameGroup == groupItem.device_group) {
                                isfind = true;
                                groupItem.mbps_max += item.mbps_max;
                                groupItem.mbps_avg += item.mbps_avg;
                                groupItem.mbps_avg_last_year += item.mbps_avg_last_year;
                                groupItem.device_list.push(item);

                            }
                        }

                        if (isfind == false) {
                            var groupItem = {};
                            groupItem.device_group = nameGroup;
                            groupItem.mbps_max = item.mbps_max;
                            groupItem.mbps_avg = item.mbps_avg;
                            groupItem.mbps_avg_last_year = item.mbps_avg_last_year;
                            groupItem.device_list = [];
                            groupItem.device_list.push(item);

                            groups.push(groupItem);

                        }

                    }

                    for (var j in groups) {
                        var groupItem = groups[j];
                        groupItem.group_mbps_lastyear_increase = parseFloat(((groupItem.mbps_avg - groupItem.mbps_avg_last_year) / groupItem.mbps_avg_last_year * 100).toFixed(2));
                    }
                    callback(null, groups)
                }
            ],
            function (err, result) {
                // result now equals 'done'
                var ret = {}
                ret.data = result
                res.json(200, ret);
            });


    });



    // CEB Report 2.2
    app.get('/api/reports/performance/sg/summary/', function (req, res) {
        //var ret = require("../demodata/sg_summary");
        res.setTimeout(1200 * 1000);
        var device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();


        async.waterfall(
            [
                function (callback) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                        callback(null, arrayInfo);
                    })
                },
                function (arg, callback) {

                    var param = {};
                    param['keys'] = ['device', 'sgname', 'lunname'];
                    param['filter'] = '(source=\'VMAX-Collector\'&datagrp=\'VMAX-STORAGE-GROUPS\'&parttype=\'StorageGroupToLUN\')';
                    if (typeof device !== 'undefined') {
                        param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                    }

                    var resItem = {};
                    CallGet.CallGet(param, function (param) {
                        for (var i in param.result) {
                            var item = param.result[i];
                            if (resItem[item.device] === undefined) resItem[item.device] = {};
                            if (resItem[item.device][item.sgname] === undefined) resItem[item.device][item.sgname] = {};
                            if (resItem[item.device][item.sgname]["devcount"] === undefined) resItem[item.device][item.sgname]["devcount"] = 1
                            else
                                resItem[item.device][item.sgname]["devcount"] += 1;

                        }
                        callback(null, resItem);
                    });

                },
                function (arg1, callback) {
                    var param = {};
                    param['filter_name'] = '(name=\'Capacity\')';
                    param['keys'] = ['device', 'sgname', 'lunname'];
                    param['fields'] = ['devcount', 'sgcount', 'iolimit', 'bwlimit', 'parttype'];
                    param['period'] = 86400;
                    param['type'] = 'last';
                    param['start'] = start;
                    param['end'] = end;
                    param['limit'] = 1000000;
                    param['filter'] = '(source=\'VMAX-Collector\'&datagrp=\'VMAX-STORAGE-GROUPS\'&parttype=\'Storage Group\')';
                    if (typeof device !== 'undefined') {
                        param['filter'] = 'device=\'' + device + '\'&' + param.filter;
                    }


                    CallGet.CallGet(param, function (param) {
                        var ret = param.result;
                        var finalRecord = [];
                        for (var i in ret) {
                            var item = ret[i];
                            item.Capacity = parseFloat(parseFloat(item.Capacity).toFixed(3));

                            var retItem = {};
                            retItem.app_name = "";
                            retItem["device_name"] = "";
                            retItem["device_sn"] = item.device;
                            retItem["sg_name"] = item.sgname;
                            if (arg1[item.device] !== undefined)
                                if (arg1[item.device][item.sgname] !== undefined)
                                    retItem["sg_lun_total"] = arg1[item.device][item.sgname].devcount === undefined ? 0 : arg1[item.device][item.sgname].devcount;
                                else
                                    retItem["sg_lun_total"] = 0;
                            else
                                retItem["sg_lun_total"] = 0;

                            retItem["sg_capacity_GB"] = item.Capacity;
                            retItem["iops_limit"] = item.iolimit;
                            retItem["mbps_limits"] = item.bwlimit;
                            retItem["limits"] = 0;
                            finalRecord.push(retItem);
                        }


                        callback(null, finalRecord);
                    });


                },
                function (arg1, callback) {

                    arg1.sort(sortBy("-sg_capacity_GB"));

                    callback(null, arg1);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation(function (result) {

                        for (var i in arg) {
                            var item = arg[i];
                            for (var j in result) {
                                var appItem = result[j];
                                if (appItem.array == item.device_sn)
                                    item.device_name = appItem.array_name;
                                if (appItem.array == item.device_sn && appItem.SG == item.sg_name) {
                                    if (item.app_name == "")
                                        item.app_name = appItem.app;
                                    else
                                        item.app_name = item.app_name + "," + appItem.app
                                }
                            }
                        }
                        callback(null, arg);


                    });

                }
            ],
            function (err, result) {
                // result now equals 'done'

                var ret = {}
                ret.data = result;

                res.json(200, ret);
            });


    });


    // CEB Report 2.2.1
    app.get('/api/reports/performance/sg/top10/iops/', function (req, res) {

        res.setTimeout(1200 * 1000);
        var device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();


        async.waterfall(
            [
                function (callback) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                        callback(null, arrayInfo);
                    })
                },
                // Get IOPS peak value 
                function (param, callback) {
                    //var ret = require("../demodata/sg_top10_iops");
                    var device;
                    var period = 86400;
                    var valuetype = 'max';
                    VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function (rest) {
                        var rets = [];
                        for (var i in rest) {
                            var item = rest[i];

                            var retItem = {};

                            retItem.app_name = "";

                            // Search the array custimized name
                            var isfind = false;
                            for (var j in param) {
                                var arrayinfoItem = param[j];
                                if (arrayinfoItem.storagesn == item.device) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if (isfind = false) {
                                retItem.device_name = "";
                            }


                            retItem.device_sn = item.device;
                            retItem.sg_name = item.sgname;
                            retItem.iops_max = (item.matricsStat.WriteRequests === undefined | item.matricsStat.WriteRequests === undefined) ? 0 : item.matricsStat.ReadRequests.max + item.matricsStat.WriteRequests.max;
                            retItem.response_time_ms = item.matricsStat.ResponseTime === undefined ? 0 : item.matricsStat.ResponseTime.max;
                            rets.push(retItem);
                        }
                        callback(null, rets);
                    });
                },
                // Get IOPS average value 
                function (param, callback) {
                    var device;
                    var period = 86400;
                    var valuetype = 'average';
                    VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function (rest) {
                        for (var i in rest) {
                            var item = rest[i];

                            for (var j in param) {
                                var item1 = param[j];

                                if (item.device == item1.device_sn & item.sgname == item1.sg_name) {
                                    item1["iops_avg"] = (item.matricsStat.WriteRequests === undefined | item.matricsStat.WriteRequests === undefined) ? 0 : item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg;
                                    break;
                                }

                            }
                        }



                        callback(null, param);
                    });
                },
                function (arg1, callback) {

                    for (var i in arg1) {
                        if (isNaN(parseFloat(arg1[i].iops_avg)))
                            arg1[i]["iops_avg"] = 0;
                    }
                    arg1.sort(sortBy("-iops_avg"));

                    callback(null, arg1);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation(function (result) {

                        for (var i in arg) {
                            var item = arg[i];
                            for (var j in result) {
                                var appItem = result[j];
                                if (appItem.array == item.device_sn)
                                    item.device_name = appItem.array_name;
                                if (appItem.array == item.device_sn && appItem.SG == item.sg_name) {
                                    if (item.app_name == "")
                                        item.app_name = appItem.app;
                                    else
                                        item.app_name = item.app_name + "," + appItem.app
                                }
                            }
                        }
                        callback(null, arg);


                    });

                }
            ],
            function (err, result) {
                // result now equals 'done'

                var ret = {}
                ret.data = [];
                for (var i = 0; i < 10; i++) {
                    ret.data.push(result[i]);
                }

                res.json(200, ret);
            });

    });

    app.get('/api/reports/performance/sg/top10/middle_iops/', function (req, res) {
        res.setTimeout(1200 * 1000);
        var device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        async.waterfall(
            [
                function (callback) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                        callback(null, arrayInfo);
                    })
                },
                // Get All Localtion Records
                function (arg1, callback) {
                    var param = {};
                    param['device'] = device;
                    param['period'] = 86400;
                    param['start'] = start;
                    param['end'] = end;
                    param['type'] = 'max';
                    param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\'|name=\'ResponseTime\')';
                    param['keys'] = ['serialnb', 'part'];
                    param['fields'] = ['device', 'sgname'];
                    param['limit'] = 1000000;
                    param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';

                    CallGet.CallGetPerformance(param, function (rest) {
                        var result = [];
                        for (var i in rest) {
                            var item = rest[i];
                            var isfind = false;
                            for (var j in result) {
                                var sgItem = result[j];
                                if (item.serialno == sgItem.device_sn && item.sgname == sgItem.sg_name) {
                                    isfind = true;
                                    if (item.matricsStat.TotalThroughput.avg >= sgItem.iops_avg) sgItem.iops_avg = item.matricsStat.TotalThroughput.avg;
                                    if (item.matricsStat.TotalThroughput.max >= sgItem.iops_max) sgItem.iops_max = item.matricsStat.TotalThroughput.max;
                                    break;
                                }
                            }

                            if (isfind == false) {
                                if (item.sgname != 'N/A') {
                                    var sgItem = {};
                                    sgItem.device_name = item.device;
                                    sgItem.device_sn = item.serialnb;
                                    sgItem.sg_name = item.sgname;
                                    sgItem.iops_avg = item.matricsStat.TotalThroughput.avg;
                                    sgItem.iops_max = item.matricsStat.TotalThroughput.max;
                                    result.push(sgItem);
                                }
                            }
                        }


                        callback(null, result);



                    });


                },
                function (arg1, callback) {

                    arg1.sort(sortBy("-iops_avg"));

                    callback(null, arg1);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation(function (result) {

                        for (var i in arg) {
                            var item = arg[i];
                            for (var j in result) {
                                var appItem = result[j];
                                if (appItem.array == item.device_sn)
                                    item.device_name = appItem.array_name;
                                if (appItem.array == item.device_sn && appItem.SG == item.sg_name) {
                                    if (item.app_name == "")
                                        item.app_name = appItem.app;
                                    else
                                        item.app_name = item.app_name + "," + appItem.app
                                }
                            }
                        }
                        callback(null, arg);


                    });

                }
            ],
            function (err, result) {
                // result now equals 'done'

                var ret = {}
                ret.data = [];
                for (var i = 0; i < 10; i++) {
                    ret.data.push(result[i]);
                }

                res.json(200, ret);
            });

    });

    //
    // CEB-REPORT-MONTHLY: 2.2.1.2  IOPS均值增幅 TOP 10
    // 
    app.get('/api/reports/performance/sg/top10/iops_avg_increase', function (req, res) {
        //var ret = require("../demodata/iops_avg_increase");
        res.setTimeout(1200 * 1000);
        var device = req.query.device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        var top = req.query.top;

        async.waterfall(
            [
                function (callback) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                        callback(null, arrayInfo);
                    })
                },
                // Get All Localtion Records
                function (param, callback) {
                    //var ret = require("../demodata/sg_top10_iops"); 
                    var period = 86400;
                    var valuetype = 'average';
                    VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function (rest) {
                        var rets = [];
                        for (var i in rest) {
                            var item = rest[i];

                            var retItem = {};

                            retItem.app_name = "";

                            // Search the array custimized name
                            var isfind = false;
                            for (var j in param) {
                                var arrayinfoItem = param[j];
                                if (arrayinfoItem.storagesn == item.device) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if (isfind = false) {
                                retItem.device_name = "";
                            }


                            retItem.device_sn = item.device;
                            retItem.sg_name = item.sgname;
                            retItem.iops_max = item.matricsStat.ReadRequests.max + item.matricsStat.WriteRequests.max;
                            retItem.iops_avg = item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg;
                            rets.push(retItem);
                        }
                        callback(null, rets);
                    });
                },
                // Get The last year performance 
                function (param, callback) {
                    //var ret = require("../demodata/sg_top10_iops"); 
                    var period = 86400;
                    var valuetype = 'average';
                    var lastMonth_start = util.getlastYearByDate(start).firstDay;
                    var lastMonth_end = util.getlastYearByDate(start).lastDay;
                    VMAX.GetStorageGroupsPerformance(device, period, lastMonth_start, lastMonth_end, valuetype, function (rest) {
                        var rets = [];
                        for (var i in rest) {
                            var item = rest[i];

                            for (var j in param) {
                                var top10Item = param[j];

                                if (top10Item.device_sn == item.device && top10Item.sg_name == item.sgname) {
                                    //console.log( top10Item.device_sn +"\t" + item.device +"\t" + top10Item.sg_name +"\t" + item.sgname);
                                    top10Item.iops_avg_lastyear = item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg;
                                    //top10Item.iops_avg_increase = top10Item.iops_avg_lastyear > 0 ? ( top10Item.iops_avg - top10Item.iops_avg_lastyear ) /top10Item.iops_avg_lastyear : 0 ;
                                    break;
                                }
                            }

                        }
                        callback(null, param);
                    });
                },
                function (arg, callback) {
                    var JXQ = [];
                    var SD = [];
                    var UNKNOW = [];
                    for (var i in arg) {
                        var item = arg[i];
                        if (item.sg_name == 'XIAOI_SG') console.log(item);
                        if (item.device_name === undefined) UNKNOW.push(item);
                        else if (item.device_name.indexOf('JXQ') > 0) JXQ.push(item);
                        else if (item.device_name.indexOf('SD') > 0) SD.push(item);
                        else UNKNOW.push(item);
                    }

                    var newResult = [];
                    for (var i in JXQ) {
                        var JXQItem = JXQ[i];
                        var JXQDeviceName = JXQItem.device_name.split('-')[0];
                        for (var j in SD) {
                            var SDItem = SD[j];
                            var SDDeviceName = SDItem.device_name.split('-')[0];

                            if (JXQItem.sg_name == SDItem.sg_name && JXQDeviceName == SDDeviceName) {
                                var newItem = {};

                                if (JXQItem.iops_avg > SDItem.iops_avg) {
                                    newItem["app_name"] = JXQItem.app_name;
                                    newItem["device_name"] = JXQItem.device_name;
                                    newItem["device_sn"] = JXQItem.device_sn;
                                } else {
                                    newItem["app_name"] = SDItem.app_name;
                                    newItem["device_name"] = SDItem.device_name;
                                    newItem["device_sn"] = SDItem.device_sn;
                                }

                                newItem["sg_name"] = JXQItem.sg_name;
                                newItem["iops_max"] = JXQItem.iops_max + SDItem.iops_max;
                                newItem["iops_avg"] = JXQItem.iops_avg + SDItem.iops_avg;
                                newItem["iops_avg_lastyear"] = JXQItem.iops_avg_lastyear + SDItem.iops_avg_lastyear;
                                newItem.iops_avg_increase = (newItem.iops_avg_lastyear > 0 ? (newItem.iops_avg - newItem.iops_avg_lastyear) / newItem.iops_avg_lastyear : 0) * 100;
                                newResult.push(newItem);
                                break;
                            }
                        }
                    }

                    callback(null, newResult);

                },
                function (arg1, callback) {
                    arg1.sort(sortBy("-iops_avg_increase"));
                    var ret = [];
                    for (var i = 0; i < 10; i++) {
                        ret.push(arg1[i]);
                    }
                    callback(null, ret);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation(function (result) {

                        for (var i in arg) {
                            var item = arg[i];
                            for (var j in result) {
                                var appItem = result[j];
                                if (appItem.array == item.device_sn)
                                    item.device_name = appItem.array_name;
                                if (appItem.array == item.device_sn && item.sg_name.indexOf(appItem.SG) >= 0) {
                                    if (item.app_name == "")
                                        item.app_name = appItem.app;
                                    else
                                        item.app_name = item.app_name + "," + appItem.app
                                }
                            }
                        }
                        callback(null, arg);


                    });

                }
            ],
            function (err, result) {
                // result now equals 'done'

                var ret = {}
                ret.data = result;

                res.json(200, ret);
            });
    });


    app.get('/api/reports/performance/sg/top10/middle_iops_avg_increase', function (req, res) {
        //var ret = require("../demodata/iops_avg_increase");
        res.setTimeout(1200 * 1000);
        var device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();

        async.waterfall(
            [
                function (callback) {
                    var param = {};
                    param['device'] = device;
                    param['period'] = 86400;
                    param['start'] = start;
                    param['end'] = end;
                    param['type'] = 'max';
                    param['filter_name'] = '(name=\'TotalThroughput\')';
                    param['keys'] = ['serialnb', 'part'];
                    param['fields'] = ['device', 'sgname'];
                    param['limit'] = 1000000;
                    param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';

                    CallGet.CallGetPerformance(param, function (rest) {
                        var result = [];
                        for (var i in rest) {
                            var item = rest[i];
                            var isfind = false;
                            for (var j in result) {
                                var sgItem = result[j];
                                if (item.serialno == sgItem.device_sn && item.sgname == sgItem.sg_name) {
                                    isfind = true;
                                    if (item.matricsStat.TotalThroughput.avg >= sgItem.iops_avg) sgItem.iops_avg = item.matricsStat.TotalThroughput.avg;

                                    break;
                                }
                            }

                            if (isfind == false) {
                                if (item.sgname != 'N/A') {
                                    var sgItem = {};
                                    sgItem.device_name = item.device;
                                    sgItem.device_sn = item.serialnb;
                                    sgItem.sg_name = item.sgname;
                                    sgItem.iops_avg = item.matricsStat.TotalThroughput.avg;

                                    result.push(sgItem);
                                }
                            }
                        }


                        callback(null, result);



                    });



                },
                function (arg1, callback) {


                    //var lastYear = util.getlastYearByDate(start); 

                    var lastYear = util.getlastMonthByDate(start);


                    var param = {};
                    param['device'] = device;
                    param['period'] = 86400;
                    param['start'] = lastYear.firstDay;
                    param['end'] = lastYear.lastDay;
                    param['type'] = 'max';
                    param['filter_name'] = '(name=\'TotalThroughput\')';
                    param['keys'] = ['serialnb', 'part'];
                    param['fields'] = ['device', 'sgname'];
                    param['limit'] = 1000000;
                    param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';

                    CallGet.CallGetPerformance(param, function (rest) {
                        var result = [];
                        for (var i in rest) {
                            var item = rest[i];
                            var isfind = false;
                            for (var j in result) {
                                var sgItem = result[j];
                                if (item.serialno == sgItem.device_sn && item.sgname == sgItem.sg_name) {
                                    isfind = true;
                                    if (item.matricsStat.TotalThroughput.avg >= sgItem.iops_avg) sgItem.iops_avg = item.matricsStat.TotalThroughput.avg;

                                    break;
                                }
                            }

                            if (isfind == false) {
                                if (item.sgname != 'N/A') {
                                    var sgItem = {};
                                    sgItem.device_name = item.device;
                                    sgItem.device_sn = item.serialnb;
                                    sgItem.sg_name = item.sgname;
                                    sgItem.iops_avg = item.matricsStat.TotalThroughput.avg;

                                    result.push(sgItem);
                                }
                            }
                        }

                        for (var i in arg1) {
                            var item1 = arg1[i];
                            for (var j in result) {
                                var item2 = result[j];
                                if (item1.device == item2.device && item1.sg_name == item2.sg_name) {
                                    item1.iops_avg_lastyear = item2.iops_avg;
                                    item1.iops_avg_increase = item1.iops_avg - item1.iops_avg_lastyear;
                                }

                            }
                        }
                        callback(null, arg1);
                    });

                },
                function (arg1, callback) {

                    arg1.sort(sortBy("-iops_avg"));

                    callback(null, arg1);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation(function (result) {

                        for (var i in arg) {
                            var item = arg[i];
                            for (var j in result) {
                                var appItem = result[j];
                                if (appItem.array == item.device_sn)
                                    item.device_name = appItem.array_name;
                                if (appItem.array == item.device_sn && appItem.SG == item.sg_name) {
                                    if (item.app_name == "")
                                        item.app_name = appItem.app;
                                    else
                                        item.app_name = item.app_name + "," + appItem.app
                                }
                            }
                        }
                        callback(null, arg);


                    });

                }
            ],
            function (err, result) {
                // result now equals 'done' 
                var ret = {}
                ret.data = [];
                for (var i = 0; i < 10; i++) {
                    ret.data.push(result[i]);
                }

                res.json(200, ret);
            });
    });


    //
    // CEB-REPORT-MONTHY: 2.2.1.4 "HOST IO LIMIT 情况统计"
    //
    app.get('/api/reports/performance/sg/iolimit', function (req, res) {
        //var ret = require("../demodata/report_io_response");
        res.setTimeout(1200 * 1000);
        var device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();


        async.waterfall(
            [
                function (callback) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                        callback(null, arrayInfo);
                    })
                },
                // Get All Localtion Records
                function (param, callback) {
                    //var ret = require("../demodata/sg_top10_iops");
                    var device;
                    var period = 3600;
                    var valuetype = 'max';


                    var param = {};
                    param['device'] = device;
                    param['period'] = period;
                    param['start'] = start;
                    param['end'] = end;
                    param['type'] = valuetype;
                    param['filter_name'] = '(name=\'HostIOLimitExceededPercent\')';
                    param['keys'] = ['device', 'part'];
                    param['fields'] = ['name', 'sgname', 'parttype', 'iolmstat', 'iolimit'];
                    param['filter'] = '(datagrp=\'VMAX-StorageGroup\'&parttype=\'Storage Group\'&iolmstat=\'Defined\')';
                    param['limit'] = 100000;

                    CallGet.CallGetPerformance(param, function (rest) {
                        callback(null, rest);
                    });

                },
                function (arg1, callback) {
                    var rets = [];
                    for (var i in arg1) {
                        var item = arg1[i];

                        var retsItem = {};
                        retsItem["appname"] = "";
                        retsItem["arrayname"] = "";
                        retsItem["device"] = item.device;
                        retsItem["sgname"] = item.sgname;
                        retsItem["iolimit"] = item.iolimit;
                        retsItem["exceed_80_workingtime"] = 0;
                        retsItem["exceed_80_noworkingtime"] = 0;
                        retsItem["exceed_100_workingtime"] = 0;
                        retsItem["exceed_100_noworkingtime"] = 0;


                        for (var j in item.matrics) {
                            var matricsItem = item.matrics[j];
                            if (matricsItem.HostIOLimitExceededPercent === undefined) continue;

                            var isWorkingTime = util.isWorkingTime(matricsItem.timestamp)

                            // exceed 80%
                            if (matricsItem.HostIOLimitExceededPercent >= 80 & matricsItem.HostIOLimitExceededPercent < 100) {
                                if (isWorkingTime == true)
                                    retsItem.exceed_80_workingtime++;
                                else
                                    retsItem.exceed_80_noworkingtime++;

                            } else if (matricsItem.HostIOLimitExceededPercent >= 100) {
                                if (isWorkingTime == true)
                                    retsItem.exceed_100_workingtime++;
                                else
                                    retsItem.exceed_100_noworkingtime++;

                            }


                        }

                        rets.push(retsItem);
                    }
                    //arg1.sort(sortBy("-response_time_ms"));

                    callback(null, rets);
                },
                function (arg, callback) {

                    Report.getAppStorageRelation(function (result) {

                        for (var i in arg) {
                            var item = arg[i];
                            for (var j in result) {
                                var appItem = result[j];
                                if (appItem.array == item.device)
                                    item["arrayname"] = appItem.array_name;
                                if (appItem.array == item.device && appItem.SG == item.sgname) {
                                    if (item["appname"] == "")
                                        item.appname = appItem.app;
                                    else
                                        item.appname = item.appname + "," + appItem.app
                                }
                            }
                        }
                        callback(null, arg);


                    });

                }
            ],
            function (err, result) {
                // result now equals 'done'
                var retData = {};
                retData.data = result;
                res.json(200, retData);
            });
    });


    //
    // CEB-REPORT-MONTHY: 2.2.1.3 响应时间 TOP 10
    //
    app.get('/api/reports/performance/sg/top10/iops_response_time', function (req, res) {
        //var ret = require("../demodata/report_io_response");
        res.setTimeout(1200 * 1000);
        var device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();


        async.waterfall(
            [
                function (callback) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                        callback(null, arrayInfo);
                    })
                },
                // Get All Localtion Records
                function (param, callback) {
                    //var ret = require("../demodata/sg_top10_iops");
                    var device;
                    var period = 86400;
                    var valuetype = 'average';
                    VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function (rest) {
                        var rets = [];
                        for (var i in rest) {
                            var item = rest[i];

                            var retItem = {};

                            retItem.app_name = "";

                            // Search the array custimized name
                            var isfind = false;
                            for (var j in param) {
                                var arrayinfoItem = param[j];
                                if (arrayinfoItem.storagesn == item.device) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if (isfind = false) {
                                retItem.device_name = "";
                            }


                            retItem.device_sn = item.device;
                            retItem.sg_name = item.sgname;
                            // retItem.iops_max = item.matricsStat.ReadRequests.max + item.matricsStat.WriteRequests.max ;
                            retItem.iops_avg = item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg;
                            retItem.response_time_ms = item.matricsStat.ResponseTime.avg;
                            rets.push(retItem);
                        }
                        callback(null, rets);
                    });
                },
                function (arg1, callback) {
                    for (var i in arg1) {
                        if (isNaN(parseFloat(arg1[i].response_time_ms)))
                            arg1[i]["response_time_ms"] = 0;
                    }
                    arg1.sort(sortBy("-response_time_ms"));

                    callback(null, arg1);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation(function (result) {

                        for (var i in arg) {
                            var item = arg[i];
                            for (var j in result) {
                                var appItem = result[j];
                                if (appItem.array == item.device_sn)
                                    item.device_name = appItem.array_name;
                                if (appItem.array == item.device_sn && appItem.SG == item.sg_name) {
                                    if (item.app_name == "")
                                        item.app_name = appItem.app;
                                    else
                                        item.app_name = item.app_name + "," + appItem.app
                                }
                            }
                        }
                        callback(null, arg);


                    });

                }
            ],
            function (err, result) {
                // result now equals 'done'

                var ret = {}
                ret.data = [];
                for (var i = 0; i < 10; i++) {
                    ret.data.push(result[i]);
                }

                res.json(200, ret);
            });
    });



    app.get('/api/reports/performance/sg/top10/middle_iops_response_time', function (req, res) {
        res.setTimeout(1200 * 1000);
        var device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();


        async.waterfall(
            [
                function (callback) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
                        callback(null, arrayInfo);
                    })
                },
                // Get All Localtion Records
                function (arg1, callback) {
                    var param = {};
                    param['device'] = device;
                    param['period'] = 86400;
                    param['start'] = start;
                    param['end'] = end;
                    param['type'] = 'max';
                    param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\'|name=\'ResponseTime\')';
                    param['keys'] = ['serialnb', 'part'];
                    param['fields'] = ['device', 'sgname'];
                    param['limit'] = 1000000;
                    param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';

                    CallGet.CallGetPerformance(param, function (rest) {
                        var result = [];
                        for (var i in rest) {
                            var item = rest[i];
                            var isfind = false;
                            for (var j in result) {
                                var sgItem = result[j];
                                if (item.serialno == sgItem.device_sn && item.sgname == sgItem.sg_name) {
                                    isfind = true;
                                    if (item.matricsStat.TotalThroughput.avg >= sgItem.iops_avg) sgItem.iops_avg = item.matricsStat.TotalThroughput.avg;
                                    if (item.matricsStat.ResponseTime.avg >= sgItem.response_time_ms) sgItem.response_time_ms = item.matricsStat.ResponseTime.avg;
                                    break;
                                }
                            }

                            if (isfind == false) {
                                if (item.sgname != 'N/A') {
                                    var sgItem = {};
                                    sgItem.device_name = item.device;
                                    sgItem.device_sn = item.serialnb;
                                    sgItem.sg_name = item.sgname;
                                    sgItem.iops_avg = item.matricsStat.TotalThroughput.avg;
                                    if (item.matricsStat.ResponseTime !== undefined)
                                        sgItem.response_time_ms = item.matricsStat.ResponseTime.avg;
                                    else
                                        sgItem.response_time_ms = 0;

                                    result.push(sgItem);
                                }
                            }
                        }


                        callback(null, result);



                    });


                },
                function (arg1, callback) {

                    arg1.sort(sortBy("-response_time_ms"));

                    callback(null, arg1);
                }
            ],
            function (err, result) {
                // result now equals 'done'

                var ret = {}
                ret.data = [];
                for (var i = 0; i < 10; i++) {
                    ret.data.push(result[i]);
                }

                res.json(200, ret);
            });
    });


    /*  
        Array's FE Direcoor using the number of address, when exceed 80% then export to report;
        Array's total number of SRDF Group , total number of RDF pair statistics to report;
    */
    app.get('/api/reports/array/resource/statistics', function (req, res) {
        res.setTimeout(1200 * 1000);
        var device;
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();
        var ReportOutputPath = req.query.path;

        async.waterfall(
            [
                function (callback) {

                    Report.getArrayResourceLimits(start, end, function (result) {
                        callback(null, result);
                    })
                },
                // Get All Localtion Records
                function (arg1, callback) {

                    var FEDirector = arg1.arrayfe_statistic;
                    var fs = require('fs');
                    var json2xls = require('json2xls');

                    var xls = json2xls(FEDirector);

                    var outputFilename = ReportOutputPath + '//' + 'ArrayResource.xlsx';
                    console.log("Write Result to file [" + outputFilename + "]");
                    fs.writeFileSync(outputFilename, xls, 'binary');
                    callback(null, arg1);

                }
            ],
            function (err, result) {
                res.json(200, result);
            });
    });




    /* 
        20190223 add: weekly report

    */


    // CEB Weekly Report
    app.get('/api/reports/weeklyreport/performance/applications', function (req, res) {

        res.setTimeout(1200 * 1000);
        var device = req.query.device;
        //ar start = moment(req.query.from).utc(8).format('YYYY-MM-DDTHH:mm:ss') + 'Z'
        //var end = moment(req.query.to).utc(8).format('YYYY-MM-DDTHH:mm:ss') + 'Z'
        var start = moment(req.query.from).toISOString();
        var end = moment(req.query.to).toISOString();

        var start_dt = moment(start).format('YYYYMMDD');
        //var priv_dt = moment(start).subtract(1, 'days').format('YYYYMMDD');
        var priv_dt = start_dt;
        var end_dt = moment(end).format('YYYYMMDD');

        var period = 86400;
        var valuetype = 'average';

        var config = configger.load();
        var ReportTmpDataPath = config.Reporting.TmpDataPath;
        var ReportOutputPath = config.Reporting.OutputPath;

        //var outputFilename = ReportOutputPath + '//' + 'WeeklyReport_' + start_dt + '-' + end_dt + '.xlsx';
        //var DataFilename = ReportOutputPath + '//' + 'RecordData_WeeklyReport.json';
        var outputFilename = ReportOutputPath + '//' + 'DISK_IO_Report_' + end_dt + '.xlsx';
        var DataFilename = ReportOutputPath + '//' + 'RecordData_WeeklyReport.json';



        console.log("Report output filename: " + outputFilename);
        console.log("Data filename:" + DataFilename);
        console.log("Priv Data:" + priv_dt);

        var data = {};

        var CEB_Core_Application_SG = require('../config/CEB-Core-Application-SG');

        /* Data
        {
            "data" :{

            },
            "result":{

            }
        }


        */

        async.waterfall(
            [
                function (callback) {

                    var result = {};
                    result["data"] = {};
                    result["result"] = {};
                    result["result"]["application"] = {};
                    result["result"]["application"]["Throughput"] = {};
                    result["result"]["application"]["ResponseTime"] = {};


                    callback(null, result);


                },
                function (arg1, callback) {
                    Report.getAppStorageRelationV2(device, function (result) {
                        arg1.data["AppStorageRelation"] = result;

                        var DataFilename = '/csmp/reporting/test/test.json';
                        fs.writeFile(DataFilename, JSON.stringify(arg1), function (err) {
                            if (err) throw err;
                        });

                        callback(null, arg1);
                    });
                    //var aaa = require("/csmp/reporting/test/test.json");
                    //callback(null, aaa);
                },
                function (arg1, callback) {
                    var AppStorageelation = arg1.data.AppStorageRelation;
                    var AppSGMapping = [];
                    for (var i in AppStorageelation) {
                        var item = AppStorageelation[i];
                        var newItem = {};
                        newItem["device"] = item.device;
                        newItem["arrayname"] = item.arrayname;
                        newItem["sgname"] = item.sgname;
                        if (item.appinfo !== undefined && item.appinfo.length > 0)
                            newItem["appname"] = item.appinfo[0].app;
                        else
                            newItem["appname"] = "";
                        AppSGMapping.push(newItem);
                    }

                    arg1.data["AppSGMapping"] = AppSGMapping;

                    callback(null, arg1);
                },
                // calculate response time for each storage group
                function (arg1, callback) {
                    console.log("================== Begin GetStorageGroupsPerformance ================");
                    var period_detail = 0;
                    var valuetype1 = 'average';

                    var param = {};
                    param['device'] = device;
                    param['period'] = period_detail;
                    param['start'] = start;
                    param['end'] = end;
                    param['type'] = valuetype1;
                    param['filter_name'] = '(name=\'IORate\'|name=\'ResponseTime\')';
                    param['keys'] = ['device', 'part'];
                    param['fields'] = ['name', 'sgname'];
                    param['filter'] = '(datagrp=\'VMAX-StorageGroup\'&parttype=\'Storage Group\')';
                    param['limit'] = 100000;

                    CallGet.CallGetPerformance(param, function (rest) {


                        console.log("filter the sg in the CEB-Core-Application-sg ");
                        var retArray = [];
                        var sgperf_result = [];
                        var appResult = {};

                        for (var j in CEB_Core_Application_SG) {


                            var sgname_arrayname_head = CEB_Core_Application_SG[j].split('|')[1];
                            var sgname = CEB_Core_Application_SG[j].split('|')[0];

                            console.log("SGName=" + sgname + "," + "array=" + sgname_arrayname_head);


                            appResult[sgname] = [];

                            for (var i in rest) {
                                var item = rest[i];



                                if (sgname == item.sgname) {


                                    var isfind = false;
                                    var itemResult = {};


                                    for (var zz in arg1.data.AppSGMapping) {
                                        var zzItem = arg1.data.AppSGMapping[zz];

                                        if (sgname_arrayname_head !== undefined) {

                                            var arrayNameHead = zzItem.arrayname.split('-')[0];
                                            if (item.device == zzItem.device && item.sgname == zzItem.sgname && sgname_arrayname_head == arrayNameHead) {
                                                isfind = true;
                                                itemResult["device"] = zzItem.device;
                                                itemResult["arrayname"] = zzItem.arrayname;
                                                itemResult["sgname"] = zzItem.sgname;
                                                itemResult["appname"] = zzItem.appname;
                                                break;
                                            }

                                        } else {
                                            if (item.device == zzItem.device && item.sgname == zzItem.sgname) {
                                                isfind = true;
                                                itemResult["device"] = zzItem.device;
                                                itemResult["arrayname"] = zzItem.arrayname;
                                                itemResult["sgname"] = zzItem.sgname;
                                                itemResult["appname"] = zzItem.appname;
                                                break;
                                            }
                                        }
                                    }

                                    if (isfind == false) continue;


                                    delete item.matricsStat;
                                    var matricsbyday = {};
                                    for (var jj in item.matrics) {
                                        var MatricsItem = item.matrics[jj];
                                        var date = moment.unix(MatricsItem.timestamp).format("YYYY-MM-DD");
                                        var hour = moment.unix(MatricsItem.timestamp).format("HH");
                                        if (matricsbyday[date] === undefined) matricsbyday[date] = [];
                                        var mItem = {};
                                        mItem["hour"] = hour;
                                        mItem["IORate"] = MatricsItem.IORate;
                                        mItem["ResponseTime"] = MatricsItem.ResponseTime;

                                        matricsbyday[date].push(mItem);
                                    }
                                    item["day"] = matricsbyday;
                                    item["ResponeTimeByDay"] = {};
                                    /*

                                                                        if (item.sgname == 'EBPP_SG') {
                                                                            console.log(item);
                                                                            console.log("**************");
                                                                        }
                                    */

                                    var totalResponseTime = 0;
                                    for (var date in matricsbyday) {
                                        var totalTime = 0;
                                        var totalIOPS = 0;
                                        var ResponeTimeValue = 0;
                                        for (var j in matricsbyday[date]) {
                                            var dayItem = matricsbyday[date][j];
                                            totalTime += dayItem.IORate * dayItem.ResponseTime;
                                            totalIOPS += dayItem.IORate;
                                        }
                                        ResponeTimeValue = totalIOPS == 0 ? 0 : totalTime / totalIOPS;
                                        totalResponseTime += ResponeTimeValue;
                                        item["ResponeTimeByDay"][date] = ResponeTimeValue;
                                    }

                                    item["ResponeTimeTotal"] = totalResponseTime;

                                    itemResult["ResponeTimeByDay"] = item.ResponeTimeByDay;
                                    itemResult["ResponeTimeTotal"] = item.ResponeTimeTotal;
                                    appResult[sgname].push(itemResult);
                                    if (item.sgname == 'EBPP_SG') console.log(itemResult);

                                    retArray.push(item);
                                }
                            }
                        }

                        for (var sgname in appResult) {
                            var item = appResult[sgname];
                            var totalRT = 0;
                            var totalRTResult = {};
                            totalRTResult["sgname"] = sgname;

                            for (var i in item) {
                                var perfItem = item[i];
                                if (perfItem.ResponeTimeTotal > totalRT) {
                                    totalRT = perfItem.ResponeTimeTotal;
                                    totalRTResult = perfItem;
                                }
                            }
                            sgperf_result.push(totalRTResult);
                        }

                        // the finalrecord of responsetime for each application 
                        var responseTimeRecords = [];
                        for (var i in sgperf_result) {
                            var item = sgperf_result[i];

                            var record = {};
                            record["系统名称"] = item["appname"];
                            record["所属存储"] = item["arrayname"];
                            record["SG成员"] = item.sgname;

                            var totalValue = 0;
                            var totalCount = 0;
                            for (var dtname in item.ResponeTimeByDay) {
                                var value1 = item.ResponeTimeByDay[dtname];
                                record[dtname] = value1;
                                totalValue += value1;
                                totalCount++;
                            }
                            record["本周日均响应时间峰值"] = (totalCount == 0) ? 0 : totalValue / totalCount;
                            responseTimeRecords.push(record);

                        }


                        arg1["data"]["SGPerfDetail"] = retArray;
                        arg1["data"]["SGPerfResponeTimeResult"] = sgperf_result;
                        arg1["data"]["APPResult"] = appResult;
                        arg1["result"]["application"]["ResponseTime"] = responseTimeRecords;
                        callback(null, arg1);

                    })
                },
                // -------------------------------------
                // Get IOPS peak value 
                // -----------------------------------------
                function (data, callback) {
                    console.log("================== Begin GetStorageGroupsPerformance (Get IOPS peak value)================");
                    VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function (rest) {
                        var rets = [];
                        var arg1 = data.data.AppStorageRelation;

                        for (var i in arg1) {
                            var appItem = arg1[i];

                            for (var j in rest) {
                                var item = rest[j];
                                if (item === undefined || item == null || item == "null") continue;
                                if (item.device == appItem.device && item.sgname == appItem.sgname) {
                                    appItem["perf"] = item;
                                    break;
                                }
                            }
                        }
                        callback(null, data);
                    });
                },
                function (arg1, callback) {
                    var records = {};
                    var retArray = [];
                    for (var i in arg1.data.AppStorageRelation) {
                        var item = arg1.data.AppStorageRelation[i];

                        // filter the sg in the CEB-Core-Application-sg 
                        for (var j in CEB_Core_Application_SG) {
                            var sgname_arrayname_head = CEB_Core_Application_SG[j].split('|')[1];
                            var sgname = CEB_Core_Application_SG[j].split('|')[0];
                            //var sgname = CEB_Core_Application_SG[j];
                            for (var zz in arg1.data.AppSGMapping) {
                                var zzItem = arg1.data.AppSGMapping[zz];

                                if (item.device == zzItem.device && item.sgname == zzItem.sgname) {
                                    var arrayname = zzItem.arrayname;
                                    break;
                                }

                            }

                            if (sgname_arrayname_head !== undefined) {
                                var aa = arrayname.split('-')[0];
                                if (aa == sgname_arrayname_head && sgname == item.sgname) {
                                    retArray.push(item);
                                    break;
                                }
                            } else {
                                if (sgname == item.sgname) {
                                    retArray.push(item);
                                    break;
                                }
                            }

                        }
                    }
                    arg1["data"].AppStorageRelation = retArray;

                    callback(null, arg1);
                },
                function (arg1, callback) {
                    var finalRecords = {};

                    for (var i in arg1.data.AppStorageRelation) {
                        var item = arg1.data.AppStorageRelation[i];

                        if (item.appinfo === undefined) {
                            var appname = item.sgname;
                        } else {
                            for (var appItem in item.appinfo) {
                                var appname = item.appinfo[appItem].app;
                                if (appname === "" || appname === undefined)
                                    console.log(JSON.stringify(item));
                            }
                        }

                        if (item.arrayname === undefined) {
                            var array = item.device;
                            var sgmember = array + '~' + item.sgname + '~' + item.Capacity;
                        } else {
                            var array = item.arrayname.split('-')[0];
                            var sgmember = item.arrayname + '~' + item.sgname + '~' + item.Capacity;
                        }


                        if (finalRecords[appname] === undefined) {
                            var record = {};

                            record["appname"] = appname;
                            record["array"] = array;
                            record["sgmember"] = [];
                            record["sgmember"].push(sgmember);

                            record["sgname"] = [];
                            record.sgname.push(item.perf);

                            finalRecords[appname] = record;
                        } else {
                            if (finalRecords[appname].array.indexOf(array) < 0)
                                finalRecords[appname].array = finalRecords[appname].array + ',' + array;

                            finalRecords[appname].sgmember.push(sgmember);


                            if (item.perf === undefined) {
                                console.log("Not Exist Performance Data ====\n" + finalRecords[appname].sgname.length);
                                console.log(JSON.stringify(item));
                            } else
                                finalRecords[appname].sgname.push(item.perf);
                        }
                    }

                    arg1.data.array_sg_performance = finalRecords;
                    callback(null, arg1);
                },
                function (arg1, callback) {
                    var outputRecords = [];
                    for (var i in arg1.data.array_sg_performance) {
                        var item = arg1.data.array_sg_performance[i];
                        var record = {};
                        record["系统名称"] = item.appname;
                        record["所属存储"] = item.array;
                        for (var sgi in item.sgname) {
                            var sgItem = item.sgname[sgi];

                            if (sgItem === undefined) continue;
                            if (sgItem.sgname === undefined) sgItem["sgname"] = 'nosgname';

                            if (record["sgname"] === undefined) record["sgname"] = sgItem.sgname;
                            else {
                                if (record["sgname"].indexOf(sgItem.sgname) < 0)
                                    record["sgname"] = record["sgname"] + ',' + sgItem.sgname;
                            }
                        }
                        record["sgmember"] = item.sgmember;
                        record["ResponseTime"] = {};
                        record["ThroughputDetail"] = {};

                        for (var j in item.sgname) {
                            var sgperf = item.sgname[j];

                            if (sgperf === undefined) {
                                console.log("====================\n" + j);
                                //console.log(JSON.stringify(item) );
                                continue;
                            }

                            if (sgperf.matrics === undefined) continue;
                            // for matrics for each sgname performance
                            for (var z in sgperf.matrics) {
                                var sgperfMatrics = sgperf.matrics[z];

                                // Throughput
                                if (record.ThroughputDetail[sgperfMatrics.timestamp] === undefined)
                                    record.ThroughputDetail[sgperfMatrics.timestamp] = sgperfMatrics.WriteThroughput + sgperfMatrics.ReadThroughput;
                                else
                                    record.ThroughputDetail[sgperfMatrics.timestamp] += sgperfMatrics.WriteThroughput + sgperfMatrics.ReadThroughput;

                            }


                        }
                        outputRecords.push(record);


                    }
                    arg1.data.output = outputRecords;
                    callback(null, arg1);
                },

                function (arg1, callback) {

                    var responseTimeRecords = [];
                    var ThroughputRecords = [];
                    for (var i in arg1.data.output) {
                        var item = arg1.data.output[i];

                        var record = {};
                        record["系统名称"] = item["系统名称"];
                        record["所属存储"] = item["所属存储"];
                        record["SG成员"] = item.sgname;

                        var totalValue = 0;
                        var totalCount = 0;
                        for (var timestamp in item.ThroughputDetail) {
                            var value1 = item.ThroughputDetail[timestamp];
                            var dt = moment.unix(timestamp).format('YYYY-MM-DD');
                            var week;

                            switch (moment.unix(timestamp).format('d')) {
                                case '0':
                                    week = "星期日";
                                    break;
                                case '1':
                                    week = "星期一";
                                    break;
                                case '2':
                                    week = "星期二";
                                    break;
                                case '3':
                                    week = "星期三";
                                    break;
                                case '4':
                                    week = "星期四";
                                    break;
                                case '5':
                                    week = "星期五";
                                    break;
                                case '6':
                                    week = "星期六";
                                    break;

                            }
                            var dtname = dt + " " + week;
                            record[dtname] = value1;
                            totalValue += value1;
                            totalCount++;
                        }
                        record["本周工作日均值"] = (totalCount == 0) ? 0 : totalValue / totalCount;
                        // record["SG成员"] = JSON.stringify(item["sgmember"]); 
                        ThroughputRecords.push(record);

                    }
                    arg1.result["application"]["Throughput"] = ThroughputRecords;
                    callback(null, arg1)

                },

                // --------------------------
                // Statistics for Arrays
                //----------------------------
                function (arg1, callback) {
                    var device;
                    DeviceMgmt.GetArrayAliasName(function (arrayinfo) {
                        arg1["data"]["arrayinfo"] = arrayinfo;
                        callback(null, arg1);
                    });
                },
                // --------------------------------
                // 存储资源IOPS日间及夜间峰值 
                // --------------------------------
                function (arg1, callback) {
                    var device;
                    var period_detail = 0;
                    var valuetype = 'max'
                    var arrayinfos = arg1.data.arrayinfo;
                    VMAX.getArrayPerformanceV3(device, start, end, valuetype, period_detail, function (result) {
                        var aaa = {};
                        var records = [];
                        for (var i in result) {
                            var item = result[i];

                            delete item.matricsStat;

                            var ArrayName = item.device;
                            for (var z in arrayinfos) {
                                var infoItem = arrayinfos[z];
                                if (item.device == infoItem.sn) {
                                    ArrayName = infoItem.name;
                                    break;
                                }
                            }

                            item["ArrayName"] = ArrayName;
                            item["NameHead"] = ArrayName.split('-')[0];

                            for (var j in item.matrics) {
                                var item1 = item.matrics[j];
                                item1["datetime"] = moment.unix(item1.timestamp).format('YYYY-MM-DD HH:mm:ss');
                            }

                            if (aaa[item.NameHead] === undefined) aaa[item.NameHead] = [];
                            aaa[item.NameHead].push(item);

                        }

                        arg1.data["ArrayIORateDetail"] = aaa;



                        // Merge the result of 2 side array
                        var mergedRecords = [];
                        for (var i in result) {
                            var item = result[i];
                            var arrayNameHead = item.NameHead;
                            var isfind = false;
                            for (var j in mergedRecords) {
                                var mergedItem = mergedRecords[j];
                                if (arrayNameHead == mergedItem["NameHead"]) {
                                    isfind = true;

                                    mergedItem.devices += ',' + item.device;

                                    for (var i1 in item.matrics) {

                                        var item1 = item.matrics[i1];

                                        var matricsIsfind = false;
                                        for (var i2 in mergedItem.matrics) {
                                            var item2 = mergedItem.matrics[i2];

                                            if (item1.timestamp == item2.timestamp) {
                                                matricsIsfind = true;
                                                item2.IORate += item1.IORate;
                                                item2.IORateExpress = item2.IORateExpress + '+' + item1.IORate;
                                            }
                                        }
                                        if (matricsIsfind == false) {
                                            var newItem = {};
                                            newItem["timestamp"] = item1["timestamp"];

                                            var timestamp = item1.timestamp;
                                            newItem["date"] = moment.unix(timestamp).format('YYYY-MM-DD');
                                            newItem["hour"] = moment.unix(timestamp).format('HH');
                                            newItem["minute"] = moment.unix(timestamp).format('mm');

                                            newItem["IORate"] = item1["IORate"];
                                            newItem["IORateExpress"] = item1["IORate"];

                                            mergedItem.matrics.push(newItem);
                                        }

                                    }
                                }
                            }

                            if (isfind == false) {
                                var mergedRecordItem = {};

                                mergedRecordItem["NameHead"] = arrayNameHead;
                                mergedRecordItem["devices"] = item.device;
                                mergedRecordItem["matrics"] = [];
                                for (var i1 in item.matrics) {
                                    var item1 = item.matrics[i1];
                                    var newItem = {};
                                    newItem["timestamp"] = item1["timestamp"];

                                    var timestamp = item1.timestamp;
                                    newItem["date"] = moment.unix(timestamp).format('YYYY-MM-DD');
                                    newItem["hour"] = moment.unix(timestamp).format('HH');
                                    newItem["minute"] = moment.unix(timestamp).format('mm');

                                    newItem["IORate"] = item1["IORate"];
                                    newItem["IORateExpress"] = item1["IORate"];

                                    mergedRecordItem.matrics.push(newItem);
                                }

                                mergedRecords.push(mergedRecordItem);
                            }

                        }


                        // Split the max value of Day and night in whole Day.
                        var finalRecords_day = [];
                        var finalRecords_night = [];
                        for (var i in mergedRecords) {
                            var item = mergedRecords[i];

                            var record_night = {};
                            var record_day = {};
                            record_day["ArrayName"] = item.NameHead;
                            record_night["ArrayName"] = item.NameHead;
                            for (var j in item.matrics) {
                                var item1 = item.matrics[j];
                                var dt = item1.date;
                                var hour = item1.hour;

                                if (hour >= 9 && hour < 18) {
                                    if (record_day[dt] === undefined) record_day[dt] = item1.IORate;
                                    else if (item1.IORate > record_day[dt]) record_day[dt] = item1.IORate;
                                } else {
                                    if (record_night[dt] === undefined) record_night[dt] = item1.IORate;
                                    else if (item1.IORate > record_night[dt]) record_night[dt] = item1.IORate;
                                }

                            }

                            finalRecords_day.push(record_day);
                            finalRecords_night.push(record_night);



                        }


                        if (arg1.result["array"] === undefined) arg1.result["array"] = {};
                        arg1.data["IOPS_HOURS_DETAIL"] = mergedRecords;
                        arg1.result["array"]["IOPS_HOURS_DAY"] = finalRecords_day;
                        arg1.result["array"]["IOPS_HOURS_NIGHT"] = finalRecords_night;

                        callback(null, arg1);
                    })
                },
                function (arg1, callback) {
                    var device;
                    var arrayinfos = arg1.data.arrayinfo;
                    VMAX.getArrayPerformanceV3(device, start, end, valuetype, period, function (result) {

                        var SD = [];
                        var JXQ = [];
                        var records = [];
                        for (var i in result) {
                            var item = result[i];

                            var record = {};
                            record["系统名称"] = item.device;
                            for (var z in arrayinfos) {
                                var infoItem = arrayinfos[z];
                                if (item.device == infoItem.sn) {
                                    record["系统名称"] = infoItem.name.split('-')[0];
                                    record["localtion"] = infoItem.name.split('-')[1];
                                    break;
                                }
                            }
                            for (var j in item.matrics) {
                                var perfitem = item.matrics[j];
                                var timestamp = perfitem.timestamp;
                                var dt = moment.unix(timestamp).format('YYYY-MM-DD');
                                var week;
                                switch (moment.unix(timestamp).format('d')) {
                                    case '0':
                                        week = "星期日";
                                        break;
                                    case '1':
                                        week = "星期一";
                                        break;
                                    case '2':
                                        week = "星期二";
                                        break;
                                    case '3':
                                        week = "星期三";
                                        break;
                                    case '4':
                                        week = "星期四";
                                        break;
                                    case '5':
                                        week = "星期五";
                                        break;
                                    case '6':
                                        week = "星期六";
                                        break;

                                }
                                var dtname = dt + " " + week;
                                record[dtname] = perfitem.IORate;
                            }
                            if (record.localtion == "JXQ") JXQ.push(record);
                            else SD.push(record);


                        }




                        for (var i in SD) {
                            var item_sd = SD[i];
                            var record;
                            for (var j in JXQ) {
                                var item_jxq = JXQ[j];

                                //console.log(item_sd["系统名称"] +'\t'+ item_jxq["系统名称"]);
                                if (item_sd["系统名称"] == item_jxq["系统名称"])
                                    for (var name in item_jxq) {
                                        if (name == '系统名称' || name == 'localtion') continue;
                                        if (item_sd[name] === undefined) item_sd[name] = item_jxq[name];
                                        else item_sd[name] += item_jxq[name];
                                    }

                            }
                            delete item_sd['localtion'];


                            var value = 0;
                            var count = 0;
                            for (var name in item_sd) {
                                if (name == "系统名称") continue;
                                else {
                                    value += item_sd[name];
                                    count++;
                                }
                            }
                            item_sd["本周工作日均值"] = (count > 0) ? value / count : 0;
                            records.push(item_sd);

                        }

                        if (arg1.result["array"] === undefined) arg1.result["array"] = {};
                        arg1.result["array"]["IOPS"] = records;

                        callback(null, arg1);
                    });

                },
                function (arg1, callback) {
                    // Recording the data for using next week;

                    fs.readFile(DataFilename, function (err, datarecord) {
                        if (datarecord === undefined) {
                            var outputRecord = {};
                        } else {
                            var outputRecord = JSON.parse(datarecord);
                            datarecord[end_dt] = arg1.result;
                        }



                        outputRecord[end_dt] = arg1.result;
                        fs.writeFile(DataFilename, JSON.stringify(outputRecord), function (err) {
                            if (err) throw err;
                        });


                        var PrivData = outputRecord[priv_dt];
                        var applicationData = arg1.result["application"];
                        var arrayData = arg1.result["array"];


                        var ThroughputRecords = applicationData["Throughput"];
                        for (var j in ThroughputRecords) {
                            var item1 = ThroughputRecords[j];

                            if (PrivData === undefined) {
                                item1["上周工作日均值"] = -2;
                            } else {
                                var isfind = false;

                                for (var i in PrivData.application.Throughput) {
                                    var item = PrivData.application.Throughput[i];

                                    if (item1["系统名称"] == item["系统名称"]) {
                                        //console.log(item1["系统名称"] +'\t' + item["系统名称"])
                                        isfind = true;
                                        item1["上周工作日均值"] = item["本周工作日均值"];
                                        //console.log(item);
                                        //console.log(item1["系统名称"] +'\t' + item["系统名称"]+"\t"+item1["上周工作日均值"] +"\t"+ item["本周工作日均值"]);
                                        break;
                                    }
                                }
                                if (isfind == false) {
                                    item1["上周工作日均值"] = -1;
                                }
                            }
                        }



                        var responseTimeRecords = applicationData["ResponseTime"];
                        for (var j in responseTimeRecords) {
                            var item1 = responseTimeRecords[j];

                            if (PrivData === undefined) {
                                item1["上周日均响应时间峰值"] = -2;
                            } else {
                                var isfind = false;

                                for (var i in PrivData.application.ResponseTime) {
                                    var item = PrivData.application.ResponseTime[i];

                                    if (item1["系统名称"] == item["系统名称"]) {
                                        //console.log(item1["系统名称"] +'\t' + item["系统名称"])
                                        isfind = true;
                                        item1["上周日均响应时间峰值"] = item["本周日均响应时间峰值"];
                                        //console.log(item);
                                        //console.log(item1["系统名称"] +'\t' + item["系统名称"]+"\t"+item1["上周日均响应时间峰值"] +"\t"+ item["本周日均响应时间峰值"]);
                                        break;
                                    }
                                }
                                if (isfind == false) {
                                    item1["上周日均响应时间峰值"] = -1;
                                }
                            }
                        }



                        var arrayIOPS = arrayData["IOPS"];
                        for (var j in arrayIOPS) {
                            var item1 = arrayIOPS[j];

                            if (PrivData === undefined) {
                                item1["上周工作日均值"] = -2;
                            } else {
                                var isfind = false;

                                for (var i in PrivData.array.IOPS) {
                                    var item = PrivData.array.IOPS[i];

                                    if (item1["系统名称"] == item["系统名称"]) {
                                        // console.log(item1["系统名称"] +'\t' + item["系统名称"])
                                        isfind = true;
                                        item1["上周工作日均值"] = item["本周工作日均值"];
                                        var percent = item1["上周工作日均值"] > 0 ? (item1["本周工作日均值"] - item1["上周工作日均值"]) / item1["上周工作日均值"] * 100 : 0;
                                        item1["本周IOPS增幅"] = percent.toFixed(2) + " %";
                                        break;
                                    }
                                }
                                if (isfind == false) {
                                    item1["上周工作日均值"] = -1;
                                }
                            }
                        }

                        callback(null, arg1);
                    });

                },
                function (arg, callback) {
                    var arg1 = arg.result;

                    var ThroughputRecords = arg1["application"]["Throughput"];
                    var responseTimeRecords = arg1["application"]["ResponseTime"];

                    var XLSX = require('xlsx');

                    var wb = XLSX.utils.book_new();

                    var ThroughputRecordsNew = [];
                    for (var i in ThroughputRecords) {
                        var item = ThroughputRecords[i];
                        var itemNew = {};

                        for (var fieldname in item) {
                            switch (fieldname) {
                                case 'SG成员':
                                    itemNew[fieldname] = item[fieldname];

                                    switch (item[fieldname]) {
                                        case "FUND_SG":
                                        case "IFTS_SG":
                                        case "ECIF_SG":
                                        case "EBMCP_SG":
                                        case "TPOS_SG":
                                            itemNew["系统吞吐量QOS设定"] = "20000IOPS,1000MB/s"
                                            break;
                                        default:
                                            itemNew["系统吞吐量QOS设定"] = "NA"
                                            break;
                                    }

                                    break;
                                default:
                                    itemNew[fieldname] = item[fieldname];
                                    break;
                            }
                        }

                        var percent = (itemNew["本周工作日均值"] - itemNew["上周工作日均值"]) / itemNew["上周工作日均值"] * 100;
                        itemNew["本周增幅(%)"] = percent.toFixed(2) + '%';
                        ThroughputRecordsNew.push(itemNew);
                    }

                    var ws1 = XLSX.utils.json_to_sheet(ThroughputRecordsNew);
                    //系统存储磁盘读写吞吐量
                    XLSX.utils.book_append_sheet(wb, ws1, "DISK_IO");

                    // 系统存储IO响应时间 
                    for (var i in responseTimeRecords) {
                        var item = responseTimeRecords[i];
                        var percent = (item["本周日均响应时间峰值"] - item["上周日均响应时间峰值"]) / item["上周日均响应时间峰值"] * 100;
                        item["本周增幅(%)"] = percent.toFixed(2) + '%';
                    }
                    var ws2 = XLSX.utils.json_to_sheet(responseTimeRecords);
                    XLSX.utils.book_append_sheet(wb, ws2, "DISK_IO_XYSJ");

                    var ArrayIOPS = arg1["array"]["IOPS"];
                    var ArrayIOPSNew = [];
                    for (var i in ArrayIOPS) {
                        var item = ArrayIOPS[i];
                        if (item['系统名称'] == 'VMAX4') continue;

                        var itemNew = {};
                        var name = item["系统名称"];
                        if (item["系统名称"] == 'VMAX') name = 'VMAX1';
                        var infoItem = SearchArrayConfigureInfo(name);
                        var maxvalue = 0;
                        for (var fieldname in item) {
                            switch (fieldname) {
                                case '系统名称':
                                    itemNew[fieldname] = item[fieldname];
                                    itemNew["存储配置"] = infoItem == null ? "" : infoItem.Configure;
                                    itemNew["存储IO推荐阀值(IOPS)"] = infoItem == null ? "" : infoItem.IOPS_Threshold;
                                    itemNew["总阀值的60%设定警戒阀值(IOPS)"] = infoItem == null ? "" : infoItem["IOPS_threshold_60%"];
                                    break;
                                default:
                                    itemNew[fieldname] = item[fieldname];
                                    if (fieldname.indexOf('星期') > 0) {
                                        if (maxvalue < item[fieldname]) maxvalue = item[fieldname];
                                    }
                                    break;
                            }
                        }
                        itemNew["每周最高值与警戒阈值占比"] = infoItem == null ? "" : ((maxvalue / infoItem["IOPS_threshold_60%_number"]) * 100).toFixed(2) + '%';
                        ArrayIOPSNew.push(itemNew);
                    }
                    var ws3 = XLSX.utils.json_to_sheet(ArrayIOPSNew);
                    //存储资源IOPS均值
                    XLSX.utils.book_append_sheet(wb, ws3, "DISK_IOPS_AVG");


                    var ArrayIOPSHours_dayNew = [];
                    var ArrayIOPSHours_day = arg1["array"]["IOPS_HOURS_DAY"];
                    for (var i in ArrayIOPSHours_day) {
                        var item = ArrayIOPSHours_day[i];
                        if (item['ArrayName'] == 'VMAX4') continue;

                        var itemDayNew = {};
                        var name = item["ArrayName"];
                        if (item["ArrayName"] == 'VMAX') name = 'VMAX1';
                        var infoItem = SearchArrayConfigureInfo(name);
                        var maxvalue = 0;
                        for (var fieldname in item) {
                            switch (fieldname) {
                                case 'ArrayName':
                                    if (item[fieldname] == 'VMAX4') break;
                                    itemDayNew[fieldname] = item[fieldname];
                                    itemDayNew["存储配置"] = infoItem == null ? "" : infoItem.Configure;
                                    itemDayNew["存储IO推荐阀值(IOPS)"] = infoItem == null ? "" : infoItem.IOPS_Threshold;
                                    itemDayNew["总阀值的60%设定警戒阀值(IOPS)"] = infoItem == null ? "" : infoItem["IOPS_threshold_60%"];
                                    break;
                                default:
                                    itemDayNew[fieldname] = item[fieldname];
                                    if (fieldname.indexOf('-') > 0) {
                                        if (maxvalue < item[fieldname]) maxvalue = item[fieldname];
                                    }
                                    break;
                            }
                        }
                        itemDayNew["每周最高值与警戒阈值占比"] = infoItem == null ? "" : ((maxvalue / infoItem["IOPS_threshold_60%_number"]) * 100).toFixed(2) + '%';
                        ArrayIOPSHours_dayNew.push(itemDayNew);
                    }
                    var ws4 = XLSX.utils.json_to_sheet(ArrayIOPSHours_dayNew);
                    //存储资源IOPS日间峰值
                    XLSX.utils.book_append_sheet(wb, ws4, "Day_IOPS_MAX");


                    var ArrayIOPSHours_nightNew = [];
                    var ArrayIOPSHours_night = arg1["array"]["IOPS_HOURS_NIGHT"];

                    for (var i in ArrayIOPSHours_night) {
                        var item = ArrayIOPSHours_night[i];
                        if (item['ArrayName'] == 'VMAX4') continue;

                        var itemNightNew = {};
                        var name = item["ArrayName"];
                        if (item["ArrayName"] == 'VMAX') name = 'VMAX1';
                        var infoItem = SearchArrayConfigureInfo(name);
                        var maxvalue = 0;
                        for (var fieldname in item) {
                            switch (fieldname) {
                                case 'ArrayName':
                                    itemNightNew[fieldname] = item[fieldname];
                                    itemNightNew["存储配置"] = infoItem == null ? "" : infoItem.Configure;
                                    itemNightNew["存储IO推荐阀值(IOPS)"] = infoItem == null ? "" : infoItem.IOPS_Threshold;
                                    itemNightNew["总阀值的60%设定警戒阀值(IOPS)"] = infoItem == null ? "" : infoItem["IOPS_threshold_60%"];
                                    break;
                                default:
                                    itemNightNew[fieldname] = item[fieldname];
                                    if (fieldname.indexOf('-') > 0) {
                                        if (maxvalue < item[fieldname]) maxvalue = item[fieldname];
                                    }
                                    break;
                            }
                        }
                        itemNightNew["每周最高值与警戒阈值占比"] = infoItem == null ? "" : ((maxvalue / infoItem["IOPS_threshold_60%_number"]) * 100).toFixed(2) + '%';
                        ArrayIOPSHours_nightNew.push(itemNightNew);
                    }
                    var ws5 = XLSX.utils.json_to_sheet(ArrayIOPSHours_nightNew);
                    //存储资源IOPS夜间峰值
                    XLSX.utils.book_append_sheet(wb, ws5, "Night_IOPS_MAX");
                    XLSX.writeFile(wb, outputFilename);

                    // 日夜间峰值的合成一个表
                    var ArrayIOPSHours = [];
                    for (var i in ArrayIOPSHours_dayNew) {
                        var item = ArrayIOPSHours_dayNew[i];
                        item["DataType"] = "日间";
                        ArrayIOPSHours.push(item);
                        for (var j in ArrayIOPSHours_nightNew) {
                            var item1 = ArrayIOPSHours_nightNew[j];
                            if (item.ArrayName == item1.ArrayName) {
                                item1["DataType"] = "夜间";
                                ArrayIOPSHours.push(item1);
                            }
                        }
                    }
                    var ws6 = XLSX.utils.json_to_sheet(ArrayIOPSHours);
                    //存储资源IOPS日夜间峰值
                    XLSX.utils.book_append_sheet(wb, ws6, "IOPS_MAX");
                    XLSX.writeFile(wb, outputFilename);

                    callback(null, arg);
                }

            ],
            function (err, result) {
                //var DataFilename = '/csmp/reporting/weeklyreport_detail_'+end_dt+'.json'
                var DataFilename = '/csmp/reporting/DISK_IO_Report_' + end_dt + '.json'
                fs.writeFile(DataFilename, JSON.stringify(result, null, ' '), function (err) {
                    if (err) throw err;
                    res.json(200, DataFilename + ',' + outputFilename);
                });

                //res.json(200, result.data.IOPS_HOURS_DETAIL);
            });

    });


    function SearchArrayConfigureInfo(device) {
        var arrayInfo = [
            {
                "ArrayName": "VMAX1",
                "Configure": "一代存储VMAX 8引擎16控",
                "IOPS_Threshold": "6万",
                "IOPS_threshold_60%": "3.6万",
                "IOPS_threshold_60%_number": 36000
            },
            {
                "ArrayName": "VMAX2",
                "Configure": "一代存储VMAX 4引擎8控",
                "IOPS_Threshold": "5万",
                "IOPS_threshold_60%": "4万",
                "IOPS_threshold_60%_number": 40000
            },
            {
                "ArrayName": "VMAX3",
                "Configure": "二代存储VMAX20k 4引擎8控",
                "IOPS_Threshold": "7万",
                "IOPS_threshold_60%": "4.2万",
                "IOPS_threshold_60%_number": 42000
            },
            {
                "ArrayName": "VMAX5",
                "Configure": "二代存储VMAX20k 4引擎8控",
                "IOPS_Threshold": "5万",
                "IOPS_threshold_60%": "3万",
                "IOPS_threshold_60%_number": 30000
            },
            {
                "ArrayName": "VMAX6",
                "Configure": "二代存储VMAX20k 4引擎8控",
                "IOPS_Threshold": "6万",
                "IOPS_threshold_60%": "3.6万",
                "IOPS_threshold_60%_number": 36000
            },
            {
                "ArrayName": "VMAX7",
                "Configure": "二代存储VMAX10k 2引擎4控",
                "IOPS_Threshold": "2.5万",
                "IOPS_threshold_60%": "1.5万",
                "IOPS_threshold_60%_number": 15000
            },
            {
                "ArrayName": "VMAX8",
                "Configure": "二代存储VMAX40k 4引擎8控",
                "IOPS_Threshold": "4.6万",
                "IOPS_threshold_60%": "2.8万",
                "IOPS_threshold_60%_number": 28000
            },
            {
                "ArrayName": "VMAX9",
                "Configure": "二代存储VMAX20k 4引擎8控",
                "IOPS_Threshold": "6.9万",
                "IOPS_threshold_60%": "4.1万",
                "IOPS_threshold_60%_number": 41000
            },
            {
                "ArrayName": "VMAX10",
                "Configure": "三代存储VMAX200k 2引擎4控",
                "IOPS_Threshold": "3.3万",
                "IOPS_threshold_60%": "2万",
                "IOPS_threshold_60%_number": 20000
            },
            {
                "ArrayName": "VMAX11",
                "Configure": "三代全闪存储VMAX450F2引擎4控",
                "IOPS_Threshold": "10万",
                "IOPS_threshold_60%": "6万",
                "IOPS_threshold_60%_number": 60000
            },
            {
                "ArrayName": "VMAX12",
                "Configure": "三代全闪存储VMAX450F2引擎4控",
                "IOPS_Threshold": "9.2万",
                "IOPS_threshold_60%": "5.5万",
                "IOPS_threshold_60%_number": 55000
            },
            {
                "ArrayName": "VMAX13",
                "Configure": "三代全闪存储VMAX250F2引擎4控",
                "IOPS_Threshold": "25万",
                "IOPS_threshold_60%": "15万",
                "IOPS_threshold_60%_number": 150000
            },
            {
                "ArrayName": "VMAX14",
                "Configure": "三代全闪存储VMAX950F2引擎4控",
                "IOPS_Threshold": "36万",
                "IOPS_threshold_60%": "22万",
                "IOPS_threshold_60%_number": 220000
            },
            {
                "ArrayName": "VMAX15",
                "Configure": "三代全闪存储VMAX950F2引擎4控",
                "IOPS_Threshold": "27万",
                "IOPS_threshold_60%": "16万",
                "IOPS_threshold_60%_number": 160000
            }
        ];




        for (var i in arrayInfo) {
            var item = arrayInfo[i];
            if (item.ArrayName == device) {
                return item;
            }
        }

        return null;


    }



    app.get('/fullConfigIOInfos', function (req, res) {
        var ReportOutputPath = "/csmp/reporting";

        var finalRecords_new = require("/csmp/reporting/topology_all");

        // 20191214: add the fullConfigIOInfo<datetime>.json file
        var fullConfigIOInfos = [];
        for (var i in finalRecords_new) {
            var item = finalRecords_new[i];

            var isfind = false;
            for (var j in fullConfigIOInfos) {
                var newItem = fullConfigIOInfos[j];

                //if ( newItem["应用ID"] == "FTS" ) console.log(newItem);

                if (
                    newItem["关联主机HbaWwn"] == item.hbawwn &&
                    newItem["存储SN"] == item.array &&
                    newItem["存储名称"] == item.arrayname &&
                    newItem["存储类型"] == item.arraytype &&
                    newItem["View"] == item.maskingview &&
                    newItem["IG"] == item.IG &&
                    newItem["PG"] == item.PG &&
                    newItem["SG"] == item.SG
                ) { 
                    isfind = true;

                    newItem["关联存储端口号"] = newItem["关联存储端口号"] + ',' + item.arrayport_wwn;
                    newItem["端口名称"] = newItem["端口名称"] + ',' + item.arrayport;
 
                    break;
                }
            }

            if (isfind == false) {
                var newItem = {};

                newItem["应用ID"] = item.appShortName;
                newItem["应用名称"] = item.app;
                newItem["管理员"] = item.appManagerA;
                newItem["关联主机"] = item.host;
                newItem["主备机状态"] = item.hostStatus;
                newItem["关联主机HbaWwn"] = item.hbawwn;
                newItem["主机关联交换机端口Wwpn"] = item.connect_hba_swport_wwn;
                newItem["主机关联交换机名称"] = item.connect_hba_sw;
                newItem["主机关联交换机SN"] = item.connect_hba_sw_id;
                newItem["存储关联交换机SN"] = item.connect_arrayport_sw_id;
                newItem["存储关联交换机名称"] = item.connect_arrayport_sw;
                newItem["存储关联交换机端口Wwpn"] = item.connect_arrayport_swport_wwn;
                newItem["关联存储端口号"] = item.arrayport_wwn;
                newItem["端口名称"] = item.arrayport;
                newItem["关联Device"] = item.devices;
                newItem["Device逻辑总容量(GB)"] = item.Capacity;
                newItem["存储SN"] = item.array;
                newItem["存储名称"] = item.arrayname;
                newItem["存储类型"] = item.arraytype;
                newItem["View"] = item.maskingview;
                newItem["IG"] = item.IG;
                newItem["PG"] = item.PG;
                newItem["SG"] = item.SG;

                fullConfigIOInfos.push(newItem);
            }


        }
        var fs = require("fs");
        const Json2csvParser = require('json2csv').Parser;
        const fields = ["应用ID", "应用名称", "管理员", "关联主机", "主备机状态", "关联主机HbaWwn", "主机关联交换机端口Wwpn", "主机关联交换机名称", "主机关联交换机SN", "存储关联交换机SN", "存储关联交换机名称", "存储关联交>换机端口Wwpn", "关联存储端口号", "端口名称", "关联Device", "Device逻辑总容量(GB)", "存储SN", "存储名称", "存储类型", "View", "IG", "PG", "SG"];

        const json2csvParser = new Json2csvParser({ fields });
        const csv = json2csvParser.parse(fullConfigIOInfos);

        var filename = ['fullConfigIOInfos', moment().format('YYYY-MM-DD'), '.csv'].join('');
        //console.log(csv);
        //fs.writeFileSync(filename, csv);

        res.setHeader("Content-disposition", "attachment; filename=" + filename + "\"");
        res.setHeader("Content-Type", "text/csv");
        res.status(200).send(csv);


    });

};



module.exports = reportingController;
