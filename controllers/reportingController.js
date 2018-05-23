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

    app.get('/api/reporting/test', function(req, res){ 
        var tempFilePath = tempfile('.docx');
        docx.setDocSubject ( 'testDoc Subject' );
        docx.setDocKeywords ( 'keywords' );
        docx.setDescription ( 'test description' );
 
        var pObj = docx.createP({align: 'center'});
        pObj.addText('Policy Data', {bold: true, underline: true});
 
        docx.on('finalize', function(written) {
            console.log('Finish to create Word file.\nTotal bytes created: ' + written + '\n');
        });
        docx.on('error', function(err) {
            console.log(err);
        });
 
        res.writeHead ( 200, {
            "Content-Type": "application/vnd.openxmlformats-officedocument.documentml.document",
            'Content-disposition': 'attachment; filename=testdoc.docx'
        });
        docx.generate(res);
    });

    app.post('/api/reporting/test2', function(req, res){ 

        var reportInstInfo = req.body;
        var reportInfo;
        var reportStatus = {};

        async.waterfall(
        [
            function(callback){

                console.log(reportInstInfo);
                Reporting.GetReportingInfoList(function(result) {  
          
                    for ( var i in result ) {
                        var reportInfoItem = result[i];
                        if ( reportInfoItem.ID == reportInstInfo.ReportInfoID ) {
                            reportInfo = reportInfoItem;
                            break;
                        }
                    }

                    reportInfo["reportInstance"] = reportInstInfo;

                    callback(null,reportInfo);
                  
                });


            },
            // Get All report status Records
            function(param,  callback){  
                console.log(param); 

                reportStatus["ID"] = param.ID + "-" + param.reportInstance.Name;
                reportStatus["ReportInfoID"] =  param.ID;
                reportStatus["Name"] = param.reportInstance.Name;
                reportStatus["GenerateTime"] = param.reportInstance.GenerateTime;
                reportStatus["Status"] = "running";
                reportStatus["StatusTime"] = new Date();
                reportStatus["ReportFile"] = param.GenerateOutputPath+'/'+param.reportInstance.Name+'.'+param.Format;
                reportStatus["ReportFileURL"] =  '/' + reportStatus.ReportFile;
                reportStatus["ReportParamater"] = param.reportInstance.ReportParamater;
 

                Reporting.generateReportStatus(reportStatus, function(result) {  
                    console.log(result);
                    callback(null,param);                  
                });

            },
            // Get All report status Records
            function(param,  callback){  

                    console.log(reportInfo);

                   docx.on ( 'finalize', function ( written ) {
                                console.log ( 'Finish to create Word file.\nTotal bytes created: ' + written + '\n' );
                            });

                    docx.on ( 'error', function ( err ) {
                                console.log ( err );
                            });


                    var table = [
                        [{
                            val: "No.",
                            opts: {
                                cellColWidth: 4261,
                                b:true,
                                sz: '48',
                                shd: {
                                    fill: "7F7F7F",
                                    themeFill: "text1",
                                    "themeFillTint": "80"
                                },
                                fontFamily: "Avenir Book"
                            }
                        },{
                            val: "Title1",
                            opts: {
                                b:true,
                                color: "A00000",
                                align: "right",
                                shd: {
                                    fill: "92CDDC",
                                    themeFill: "text1",
                                    "themeFillTint": "80"
                                }
                            }
                        },{
                            val: "Title2",
                            opts: {
                                align: "center",
                                cellColWidth: 42,
                                b:true,
                                sz: '48',
                                shd: {
                                    fill: "92CDDC",
                                    themeFill: "text1",
                                    "themeFillTint": "80"
                                }
                            }
                        }],
                        [1,'All grown-ups were once children',''],
                        [2,'there is no harm in putting off a piece of work until another day.',''],
                        [3,'But when it is a matter of baobabs, that always means a catastrophe.',''],
                        [4,'watch out for the baobabs!','END'],
                    ]

                    var tableStyle = {
                        tableColWidth: 4261,
                        tableSize: 24,
                        tableColor: "ada",
                        tableAlign: "left",
                        tableFontFamily: "Comic Sans MS"
                    }

                    var data = [[{ align: 'right' }, {
                            type: "text",
                            val: "Simple"
                        }, {
                            type: "text",
                            val: " with color",
                            opt: { color: '000088' }
                        }, {
                            type: "text",
                            val: "  and back color.",
                            opt: { color: '00ffff', back: '000088' }
                        }, {
                            type: "linebreak"
                        }, {
                            type: "text",
                            val: "Bold + underline",
                            opt: { bold: true, underline: true }
                        }], {
                            type: "horizontalline"
                        }, [{ backline: 'EDEDED' }, {
                            type: "text",
                            val: "  backline text1.",
                            opt: { bold: true }
                        }, {
                            type: "text",
                            val: "  backline text2.",
                            opt: { color: '000088' }
                        }], {
                            type: "text",
                            val: "Left this text.",
                            lopt: { align: 'left' }
                        }, {
                            type: "text",
                            val: "Center this text.",
                            lopt: { align: 'center' }
                        }, {
                            type: "text",
                            val: "Right this text.",
                            lopt: { align: 'right' }
                        }, {
                            type: "text",
                            val: "Fonts face only.",
                            opt: { font_face: 'Arial' }
                        }, {
                            type: "text",
                            val: "Fonts face and size.",
                            opt: { font_face: 'Arial', font_size: 40 }
                        }, {
                            type: "table",
                            val: table,
                            opt: tableStyle
                        }, [{}, {
                            type: "image",
                            path: path.resolve(__dirname, '../1.PNG')
                        },{
                            type: "image",
                            path: path.resolve(__dirname, '../1.PNG')
                        }], {
                            type: "pagebreak"
                        }, [{}, {
                            type: "numlist"
                        }, {
                            type: "text",
                            text: "numList1.",
                        }, {
                            type: "numlist"
                        }, {
                            type: "text",
                            text: "numList2.",
                        }], [{}, {
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

                    var out = fs.createWriteStream ( param.GenerateOutputPath+'/'+param.reportInstance.Name+'.'+param.Format );

                    out.on ( 'error', function ( err ) {
                        console.log ( err );
                    });

                    docx.generate ( out );
                    callback(null,param);

            },
            // Get All report status Records
            function(param,  callback){   
                reportStatus["Status"] = "complete";
                reportStatus["StatusTime"] = new Date();
                Reporting.generateReportStatus(reportStatus, function(result) {  
                    console.log(result);
                    callback(null,param);                  
                });

            }
        ], function (err, result) {
              // result now equals 'done'
              res.json(200,result);
        });


 


    });





     app.get('/api/reporting/types', function ( req, res )  { 

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

        res.json(200,result);

    } ) ;

     app.get('/api/reporting/list', function ( req, res )  { 

        Reporting.GetReportingInfoList(function(result) {  
  
            res.json(200,result);
          
        });

    } ) ;

     app.get('/api/reporting/reportfiles', function ( req, res )  { 
        var reportid = req.query.ReportInfoID; 

        if ( reportid === undefined ) {
            res.json(400, 'Must be special a report id!')
            return;
        }

        ReportStatusObj.find({ReportInfoID: reportid}, { "__v": 0, "_id": 0, "ReportParamater._id": 0}, function (err, doc) {
            //system error.
            if (err) {
                return  err;
            }
            if (!doc) { //user doesn't exist.
                res.json(200,[]);
            }
            else {  
                res.json(200,doc);
            }

        });

    } ) ;
 

     app.get('/api/reporting/downloadfiles', function ( req, res )  { 
        var reportInstance = req.query.reportInstance; 
        var aa = JSON.parse(reportInstance);
       console.log(aa);
        if ( reportInstance === undefined ) {
            res.json(400, 'Must be special a reportInstance !')
            return;
        } 

        var FileURL = aa.ReportFile;
        console.log(FileURL);
        var file =  __dirname + path.normalize("/") +".."+ path.normalize("/") + path.normalize( FileURL);
        var file1 =  "." + path.normalize("/") +path.normalize( FileURL);
        console.log(file1);
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.download(file1);


    } ) ;

    app.get('/api/reporting/info', function (req, res) {

        var reportid = req.query.ID; 
        if ( reportid === undefined ) {
            var query = ReportInfoObj.find({}).select({ "__v": 0, "_id": 0});
        } else {
           var query = ReportInfoObj.find({ID: reportid}).select({ "__v": 0, "_id": 0}); 
        }

        query.exec(function (err, doc) { 
            if (err) { 
                res.json(500 , {status: err})
            }
            if (!doc) {  
                res.json(500 , []); 
            }
            else { 
                res.json(200 , doc);
            }

        });

    });






/* 
*  Create a report info record 
*/
    app.post('/api/reporting/info', function (req, res) { 
        var reportinfo = req.body;

        ReportInfoObj.findOne({"ID" : reportinfo.ID}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("Report info is not exist. insert it."); 

                var newreport = new ReportInfoObj(reportinfo);
                newreport.save(function(err, thor) {
                  if (err)  {

                    console.dir(thor);
                    return res.json(400 , err);
                  } else 

                    return res.json(200, {status: "The Report info insert is succeeds!"});
                });
            }
            else { 
                console.log(reportinfo);
                doc.update(reportinfo, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(200 , {status: "The Report info has exist! Update it."});
            }

        });



    });


/* 
*  Delete a report info record 
*/
    app.delete('/api/reporting/info', function (req, res) {
        var reportid = req.query.ID; 

        if ( reportid === undefined ) {
            res.json(400, 'Must be special a report id!')
            return;
        }

        var menu = req.body;
        var conditions = {ID: reportid};
        ReportInfoObj.remove(conditions, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            else {
                console.log("the report info is remove !"); 
                return  res.json(200 , {status: "The report info has removed!"});
            }

        });



    });

     app.get('/api/reporting/test11', function ( req, res )  { 

        Reporting.GetReportingInfoList(function(locations) {  
  
            res.json(200,locations);
          
        });

    } ) ;


     app.post('/api/report/report01_listapi', function ( req, res )  { 

        var list = [];
 
        var item1 = {"Display" :"parm1","value": "parm1_value"};
        var item2 = {"Display" :"parm2","value": "parm2_value"};
        var item3 = {"Display" :"parm3","value": "parm3_value"};

        list.push(item1);
        list.push(item2);
        list.push(item3);
        
        
            res.json(200,list);
 
    } ) ;

     app.post('/api/report/reporttest01_api', function ( req, res )  { 

        console.log(req.body);
        
        res.json(200,"OK");
 
    } ) ;


    // CEB Report 1.1
    app.get('/api/reports/capacity/summary', function (req, res) {
        res.setTimeout(1200*1000);

        var beginDate = req.query.from; 
        var endDate = req.query.to;
        console.log("BeginDate="+beginDate+',EndDate=' + endDate);
        var device; 
        Report.GetArraysIncludeHisotry(device, function(ret) {  
            console.log(ret);
        //var ret = require("../demodata/test");
            var finalRecord = [];

            for ( var i in ret.data ) {
                var item = ret.data[i];
    
                var isFind = false ;
                for ( var j in finalRecord ) {
                    var resItem = finalRecord[j];
                    if ( resItem.type == item.type ) {
                        resItem.quantity++;
 
                       resItem['logical_capacity_PB']              +=  ( isNaN(item['logical_capacity_PB']) == true ) ? 0 : item['logical_capacity_PB'] ;;
                       resItem['logical_capacity_last_year_PB']    +=  ( isNaN(item['logical_capacity_last_year_PB']) == true ) ? 0 : item['logical_capacity_last_year_PB'] ; 
                       resItem['logical_capacity_last_month_PB']   +=  ( isNaN(item['logical_capacity_last_month_PB']) == true ) ? 0 : item['logical_capacity_last_month_PB'] ;
                       resItem['allocated_capacity_PB']            +=  ( isNaN(item['allocated_capacity_PB']) == true ) ? 0 : item['allocated_capacity_PB'] ;          ;
                       resItem['allocated_capacity_last_year_PB']  +=  ( isNaN(item['allocated_capacity_last_year_PB']) == true ) ? 0 : item['allocated_capacity_last_year_PB'] ;
                       resItem['allocated_capacity_last_month_PB'] +=   ( isNaN(item['allocated_capacity_last_month_PB']) == true ) ? 0 : item['allocated_capacity_last_month_PB'] ;
                       isFind = true;  
                        break;        
                    }
                }
                if ( isFind == false ) {
                    var resItem = {};
                    resItem['type'] = item.type;
                    resItem.quantity = 1;

                    
                   resItem['logical_capacity_PB']              =  ( isNaN(item['logical_capacity_PB']) == true ) ? 0 : item['logical_capacity_PB'] ;
                   resItem['logical_capacity_last_year_PB']    =   ( isNaN(item['logical_capacity_last_year_PB']) == true ) ? 0 : item['logical_capacity_last_year_PB'] ;
                   resItem['logical_capacity_last_month_PB']   =  ( isNaN(item['logical_capacity_last_month_PB']) == true ) ? 0 : item['logical_capacity_last_month_PB'] ;
                   resItem['allocated_capacity_PB']            =   ( isNaN(item['allocated_capacity_PB']) == true ) ? 0 : item['allocated_capacity_PB'] ;
                   resItem['allocated_capacity_last_year_PB']  =  ( isNaN(item['allocated_capacity_last_year_PB']) == true ) ? 0 : item['allocated_capacity_last_year_PB'] ;
                   resItem['allocated_capacity_last_month_PB'] =  ( isNaN(item['allocated_capacity_last_month_PB']) == true ) ? 0 : item['allocated_capacity_last_month_PB'] ;
                    finalRecord.push(resItem);
                }
                
                
            }
            for ( var i in finalRecord ) {
                var item = finalRecord[i];
                if ( item.type == 'High' ) item.type = '高端存储';
                if ( item.type == 'Middle' ) item.type = '中端存储';
            }

            var ret = {};
            ret["data"] = finalRecord;
            res.json(200 , ret);

        });

    });


    // CEB Report 1.2
    app.get('/api/reports/capacity/details', function (req, res) {
        res.setTimeout(1200*1000);
        var beginDate = req.query.from; 
        var endDate = req.query.to;
        console.log("BeginDate="+beginDate+',EndDate=' + endDate);
        var device;
        var start = moment(req.query.from).toISOString(); 
        var end = moment(req.query.to).toISOString(); 
        async.waterfall([
            function(callback) { 

                Report.GetArraysIncludeHisotry(device,start, end, function(ret1) {  
                    DeviceMgmt.GetArrayAliasName(function(arrayinfo) {     

                        var ret = ret1;
                        for ( var i in ret  ) {
                            var item = ret[i];
                            for ( var j in arrayinfo ) {
                                var arrayItem = arrayinfo[j];
                                //console.log(item.sn + '\t' + arrayItem.storagesn);
                                if  ( item.sn == arrayItem.storagesn )  {
                                    item.name = arrayItem.name
                                }
                            }
                        }
                        callback(null,ret);

                    });
                });
            }, 
            function( arg, callback ) {   
                var ret = util.JsonSort(arg,"name");      
                callback(null,ret);
            } 
        ], function (err, result) {
            var newret = {};
            newret['data'] = result; 

            // result now equals 'done'
            res.json(200 ,newret);
        });

    });

    // CEB Report 1.3
    app.get('/api/reports/capacity/top20/sg', function (req, res) {
        res.setTimeout(1200*1000);
        var beginDate = req.query.from; 
        var endDate = req.query.to;
        console.log("BeginDate="+beginDate+',EndDate=' + endDate);

                
        async.waterfall([
            function(callback) { 

                VMAX.GetSGTop20ByCapacity(function(ret) {  

                    var finalRecord = [];
                    for ( var i in ret ) {
                        var item = ret[i];

                        var retItem = {};
                        retItem["device_name"] = "";
                        retItem["device_sn"] = item.device;
                        retItem["sg_name"] = item.sgname;
                        retItem["app_name"] = "";
                        retItem["sg_lun_total"] = item.SumOfLuns;
                        retItem["sg_capacity_GB"] = item.Capacity;
                        retItem["sg_capacity_last_dec_GB"] = ( item.sg_capacity_last_dec_GB === undefined ) ? 0 : item.sg_capacity_last_dec_GB ;

                        finalRecord.push(retItem);
                    }


                    callback(null,finalRecord);
                });
            
                
            }, 
            function (arg, callback) {
                Report.getAppStorageRelation( function (result )  {   
                    
                    for (var i in arg ) {
                        var item = arg[i];
                        for ( var j in result ) {
                            var appItem = result[j];
                            if (  appItem.array == item.device_sn )
                                item.device_name = appItem.array_name;
                            if ( appItem.array == item.device_sn && appItem.SG == item.sg_name ) {
                                if ( item.app_name == ""  ) 
                                    item.app_name = appItem.app;
                                else 
                                    item.app_name = item.app_name +"," + appItem.app
                            }
                        }
                    }
                    callback(null,arg);


                }); 

            }
            ], function (err, result) {
                var newret = {};
                newret['data'] = result; 

                // result now equals 'done'
                res.json(200 ,newret);
            });

    });


    // CEB Report 1.4
    app.get('/api/reports/capacity/top20/sg_increase', function (req, res) {
        res.setTimeout(1200*1000);
        var beginDate = req.query.from; 
        var endDate = req.query.to; 

        async.waterfall([
            function(callback) { 

                VMAX.GetSGTop20ByUsedCapacityIncrease(function(ret) {  
                    var retResult = [];
                    for ( var i = 0 ; i< 20 ; i++ ) {
                        var item = ret[i];
                        var retItem = {};
            
                        retItem["device_name"] = "";
                        retItem["device_sn"] = item.device;
                        retItem["sg_name"] = item.sgname;
                        retItem["app_name"] = "";
                        retItem["sg_lun_total"] = item.SumOfLuns;
                        retItem["sg_capacity_GB"] = item.UsedCapacity;
                        retItem["sg_capacity_last_dec_GB"] = item.UsedCapacityLastTear;
                        retItem["sg_logical_capacity_GB"] = item.Capacity;
                        retResult.push(retItem);
            
                    } 
                    callback ( null,retResult);
                });
            
                               
                
            }, 
            function (arg, callback) {
                Report.getAppStorageRelation( function (result )  {   
                    
                    for (var i in arg ) {
                        var item = arg[i];
                        for ( var j in result ) {
                            var appItem = result[j];
                            if (  appItem.array == item.device_sn )
                                item.device_name = appItem.array_name;
                            if ( appItem.array == item.device_sn && appItem.SG == item.sg_name ) {
                                if ( item.app_name == ""  ) 
                                    item.app_name = appItem.app;
                                else 
                                    item.app_name = item.app_name +"," + appItem.app
                            }
                        }
                    }
                    callback(null,arg);


                }); 

            }
            ], function (err, result) {
                var newret = {};
                newret['data'] = result; 

                // result now equals 'done'
                res.json(200 ,newret);
            });


    });


    // CEB Report 1.5

    app.get('/api/reports/capacity/related/', function (req, res) {
        //var ret = require("../demodata/capacityrelated");
        res.setTimeout(1200*1000);
        var device;

        async.waterfall(
            [
                function(callback){
                    var arrayInfo = require("../config/StorageInfo");
                    callback(null,arrayInfo);
                }, 
                function(param,  callback){ 
                    var finalRecords = [];
                    VMAX.GetArrays(device, function(result) {         
                        for ( var i in result ) {
                            var item = result[i];
            
                            var retItem = {};
                            // Search the array custimized name
                            var isfind = false;
                            for ( var j in param) {
                                var arrayinfoItem = param[j];
                                if ( arrayinfoItem.storagesn == item.device ) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if ( isfind = false ) {
                                retItem.device_name = "";
                            }

                            // Combine anothers field
                            retItem.device_sn = item.device;
                            retItem.available_port_addr_total = 0;
                            retItem.allocated_port_addr_total = 0;
                            retItem.pair = 0;
                            retItem.rdf_group = 0;
                            retItem.details = [];



                            finalRecords.push(retItem);
                        }
            
                        callback(null,finalRecords);
                    
                    }); 
                },
                function(param,  callback){ 
                    VMAX.GetStorageGroups(device, function(result) {            
                        for ( var i in result ) {
                            var sgItem = result[i];

                            var sgRetItem = {};
                            sgRetItem.sg_name = sgItem.sgname;
                            sgRetItem.lun = sgItem.SumOfLuns;
                            sgRetItem.capacity_GB = sgItem.Capacity;
                            sgRetItem.iops_limits = sgItem.iolimit;
                            sgRetItem.iops_limits_change = 0;
                            sgRetItem.mbps_limits = 0;
                            sgRetItem.mbps_limits_change = 0;
                            sgRetItem.response_time_ms = 0;
                            sgRetItem.response_time_increase_last_month_percent = 0;
                            sgRetItem.response_time_increase_last_year_percent = 0;

                            var isfind = false;
                            for ( var j in param) {
                                var item = param[j];
                                if ( sgItem.device == item.device_sn ) {
                                    item.details.push(sgRetItem);
                                    isfind = true;
                                    break;
                                }
                            }
                        }     
                    
                        callback(null,param);
                    }); 

                }
            ], function (err, result) {
                  // result now equals 'done'
                  var ret = {}
                  ret.data = result 
                  res.json(200 ,ret);
            });
    
       
    });

        // CEB Report 2.1
    app.get('/api/reports/performance/summary/iops/', function (req, res) {
        //var ret = require("../demodata/summary_iops");
        res.setTimeout(1200*1000);
        var device;

        async.waterfall(
            [
                function(callback){
                    var arrayInfo = require("../config/StorageInfo");
                    callback(null,arrayInfo);
                },
                // Get All Localtion Records
                function(param,  callback){ 
                    var deviceList = [];
                    VMAX.getArrayPerformance1( function(result) {         
                        for ( var i in result ) {
                            var item = result[i];
            
                            var retItem = {};
                            // Search the array custimized name
                            var isfind = false;
                            for ( var j in param) {
                                var arrayinfoItem = param[j];
                                if ( arrayinfoItem.storagesn == item.device ) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if ( isfind = false ) {
                                retItem.device_name = "";
                            }

                            // Combine anothers field
                            retItem.device_sn = item.device; 
                            retItem.iops_max = item.matricsStat.ReadRequests.max + item.matricsStat.WriteRequests.max;
                            retItem.iops_avg = item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg;
                            retItem.iops_avg_last_year = 0;
                            retItem.iops_avg_last_month = 0;
                                                          
                            deviceList.push(retItem);
                        }
            
                        callback(null,deviceList);
                    
                    }); 
                },
                function(devlist, callback ) {
                    var groups = [];
                    for ( var i in devlist ) {
                        var item = devlist[i];
                        if ( item.device_name === undefined ) continue;
                        var nameGroup = item.device_name.split("-")[0]; 

                        var isfind=false;
                        for ( var j in groups ) {
                            var groupItem = groups[j];
                            if ( nameGroup == groupItem.device_group ) {
                                isfind = true;
                                groupItem.iops_max += item.iops_max;
                                groupItem.iops_avg += item.iops_avg;
                                groupItem.iops_avg_last_year += 0;
                                groupItem.device_list.push(item);

                            }
                        }

                        if ( isfind == false ) {
                            var groupItem = {};
                            groupItem.device_group = nameGroup;
                            groupItem.iops_max = item.iops_max;
                            groupItem.iops_avg = item.iops_avg;
                            groupItem.iops_avg_last_year = 0;
                            groupItem.device_list = [];
                            groupItem.device_list.push(item);

                            groups.push(groupItem);
                            
                        }

                    }
                    callback(null,groups)
                }
            ], function (err, result) {
                  // result now equals 'done'
                  var ret = {}
                  ret.data = result 
                  res.json(200 ,ret);
            });
    
    
    }); 


    // CEB Report 2.1 - MBPS
    app.get('/api/reports/performance/summary/mbps/', function (req, res) {
        //var ret = require("../demodata/summary_mbps");
        res.setTimeout(1200*1000);
        var device;

        async.waterfall(
            [
                function(callback){
                    var arrayInfo = require("../config/StorageInfo");
                    callback(null,arrayInfo);
                },
                // Get All Localtion Records
                function(param,  callback){ 
                    var deviceList = [];
                    VMAX.getArrayPerformance1( function(result) {         
                        for ( var i in result ) {
                            var item = result[i];
            
                            var retItem = {};
                            // Search the array custimized name
                            var isfind = false;
                            for ( var j in param) {
                                var arrayinfoItem = param[j];
                                if ( arrayinfoItem.storagesn == item.device ) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if ( isfind = false ) {
                                retItem.device_name = "";
                            }

                            // Combine anothers field
                            retItem.device_sn = item.device;  
                            retItem.mbps_max = item.matricsStat.ReadThroughput.max + item.matricsStat.WriteThroughput.max;
                            retItem.mbps_avg = item.matricsStat.ReadThroughput.avg + item.matricsStat.WriteThroughput.avg;
                            retItem.mbps_avg_last_year = 0;
                            retItem.mbps_avg_last_month = 0;
                                                          
                            deviceList.push(retItem);
                        }
            
                        callback(null,deviceList);
                    
                    }); 
                },
                function(devlist, callback ) {
                    var groups = [];
                    for ( var i in devlist ) {
                        var item = devlist[i];
                        if ( item.device_name === undefined ) continue;
                        var nameGroup = item.device_name.split("-")[0]; 

                        var isfind=false;
                        for ( var j in groups ) {
                            var groupItem = groups[j];
                            if ( nameGroup == groupItem.device_group ) {
                                isfind = true;
                                groupItem.mbps_max += item.mbps_max;
                                groupItem.mbps_avg += item.mbps_avg;
                                groupItem.mbps_avg_last_year += 0;
                                groupItem.device_list.push(item);

                            }
                        }

                        if ( isfind == false ) {
                            var groupItem = {};
                            groupItem.device_group = nameGroup;
                            groupItem.mbps_max = item.mbps_max;
                            groupItem.mbps_avg = item.mbps_avg;
                            groupItem.mbps_avg_last_year = 0;
                            groupItem.device_list = [];
                            groupItem.device_list.push(item);

                            groups.push(groupItem);
                            
                        }

                    }
                    callback(null,groups)
                }
            ], function (err, result) {
                  // result now equals 'done'
                  var ret = {}
                  ret.data = result 
                  res.json(200 ,ret);
            });
    
    
    });

    // CEB Report 2.2
    app.get('/api/reports/performance/sg/summary/', function (req, res) {
        //var ret = require("../demodata/sg_summary");
        res.setTimeout(1200*1000);
        var device;
        async.waterfall(
            [
                function(callback){
                    var arrayInfo = require("../config/StorageInfo");
                    callback(null,arrayInfo);
                },
                function ( param, callback ) {

                    var rets = [];
                    VMAX.GetStorageGroups(device, function(result) {            

                        for ( var i in result ) {
                            var item = result[i];

                            var retItem = {};

                            retItem.app_name = "";

                            // Search the array custimized name
                            var isfind = false;
                            for ( var j in param) {
                                var arrayinfoItem = param[j];
                                if ( arrayinfoItem.storagesn == item.device ) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if ( isfind = false ) {
                                retItem.device_name = "";
                            }
                            retItem.app_name = ""; 
                            retItem.device_sn = item.device;
                            retItem.sg_name = item.sgname;
                            retItem.sg_lun_total = item.SumOfLuns;
                            retItem.sg_capacity_GB = item.Capacity;
                            retItem.iops_limit = 0;
                            retItem.mbps_limits = 0;
                            retItem.limits = 0; 
                            rets.push(retItem);
                        }
                        callback(null,rets);

                    }); 
                },
                function(arg1, callback ) {

                    arg1.sort(sortBy("-sg_capacity_GB"));
                    
                    callback(null,arg1);
                }, 
                function (arg, callback) {
                    Report.getAppStorageRelation( function (result )  {   
                        
                        for (var i in arg ) {
                            var item = arg[i];
                            for ( var j in result ) {
                                var appItem = result[j];
                                if (  appItem.array == item.device_sn )
                                    item.device_name = appItem.array_name;
                                if ( appItem.array == item.device_sn && appItem.SG == item.sg_name ) {
                                    if ( item.app_name == ""  ) 
                                        item.app_name = appItem.app;
                                    else 
                                        item.app_name = item.app_name +"," + appItem.app
                                }
                            }
                        }
                        callback(null,arg);
    
    
                    }); 
    
                }
            ], function (err, result) {
                  // result now equals 'done'

                  var ret = {}
                  ret.data = result;

                  res.json(200 ,ret);
            });


    });


        // CEB Report 2.2.1
    app.get('/api/reports/performance/sg/top10/iops/', function (req, res) {
        res.setTimeout(1200*1000);
        async.waterfall(
            [
                function(callback){
                    var arrayInfo = require("../config/StorageInfo");
                    callback(null,arrayInfo);
                },
                // Get All Localtion Records
                function(param,  callback){ 
                    //var ret = require("../demodata/sg_top10_iops");
                    var device;
                    var period = 604800;
                    var valuetype = 'last';
                    var start = util.getConfStartTime('1m');
                    var end ;
                    VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function(rest) { 
                        var rets = [];
                        for ( var i in rest ) {
                            var item = rest[i]; 

                            var retItem = {};

                            retItem.app_name = "";

                            // Search the array custimized name
                            var isfind = false;
                            for ( var j in param) {
                                var arrayinfoItem = param[j];
                                if ( arrayinfoItem.storagesn == item.device ) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if ( isfind = false ) {
                                retItem.device_name = "";
                            }


                            retItem.device_sn = item.device;
                            retItem.sg_name = item.sgname;
                            retItem.iops_max = item.matricsStat.ReadRequests.max + item.matricsStat.WriteRequests.max ;
                            retItem.iops_avg = item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg ;
                            retItem.response_time_ms = item.matricsStat.ResponseTime.max;
                            rets.push(retItem);
                        }
                        callback(null,rets);  
                    });
                },
                function(arg1, callback ) {

                    arg1.sort(sortBy("-iops_avg"));
                    
                    callback(null,arg1);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation( function (result )  {   
                        
                        for (var i in arg ) {
                            var item = arg[i];
                            for ( var j in result ) {
                                var appItem = result[j];
                                if (  appItem.array == item.device_sn )
                                    item.device_name = appItem.array_name;
                                if ( appItem.array == item.device_sn && appItem.SG == item.sg_name ) {
                                    if ( item.app_name == ""  ) 
                                        item.app_name = appItem.app;
                                    else 
                                        item.app_name = item.app_name +"," + appItem.app
                                }
                            }
                        }
                        callback(null,arg);
    
    
                    }); 
    
                }
            ], function (err, result) {
                  // result now equals 'done'

                  var ret = {}
                  ret.data = []; 
                  for ( var i=0; i<10; i++ ) {
                      ret.data.push(result[i]);
                  }

                  res.json(200 ,ret);
            });
    
    });

    app.get('/api/reports/performance/sg/top10/middle_iops/', function (req, res) {
        res.setTimeout(1200*1000);
        async.waterfall(
            [
                function(callback){
                    var arrayInfo = require("../config/StorageInfo");
                    callback(null,arrayInfo);
                },
                // Get All Localtion Records
                function(arg1,  callback){ 
                    var param = {};  
                    param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
                    param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\')';
               
                    param['keys'] = ['serialnb','part'];
                    param['fields'] = ['device','sgname'];
                    param['period'] = 86400;
                    param['type'] = 'max';
                    param['valuetype'] = 'MAX';
                    CallGet.CallGet(param, function(param) {
                        callback(null,param.result);
                    });
    
 
                }, 
                function(arg1, callback) {
                    var result = [];
                    for ( var i in arg1){
                        var item = arg1[i];
                        var isfind = false ;
                        for ( var j in result ) {
                            var sgItem = result[j];
                            if ( item.sgname == sgItem.sg_name ) {
                                isfind = true; 
                                if ( item.TotalThroughput >= sgItem.iops_max ) sgItem.iops_max = item.TotalThroughput;
                                break;
                            }
                        }

                        if ( isfind == false ) {
                            var sgItem = {};
                            sgItem.device_name = item.device;
                            sgItem.device_sn = item.serialnb;
                            sgItem.sg_name = item.sgname; 
                            sgItem.iops_max = item.TotalThroughput;
                            result.push(sgItem);
                        }
                    }
                    callback(null,result);
                },
                function(arg1,  callback){ 
                    var param = {};  
                    param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
                    param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\')';
               
                    param['keys'] = ['serialnb','part'];
                    param['fields'] = ['device','sgname'];
                    param['period'] = 86400;
                    param['type'] = 'average';
                    param['valuetype'] = 'MAX';
                    CallGet.CallGet(param, function(param) { 
                        var result = [];
                        for ( var i in param.result){
                            var item = param.result[i];
                            var isfind = false ;
                            for ( var j in result ) {
                                var sgItem = result[j];
                                if ( item.sgname == sgItem.sg_name ) {
                                    isfind = true;
                                    if ( item.TotalThroughput >= sgItem.iops_avg ) sgItem.iops_avg = item.TotalThroughput; 
                                    break;
                                }
                            }
    
                            if ( isfind == false ) {
                                var sgItem = {};
                                sgItem.device_name = item.device;
                                sgItem.device_sn = item.serialnb;
                                sgItem.sg_name = item.sgname; 
                                sgItem.iops_avg = item.TotalThroughput;
                                result.push(sgItem);
                            }
                        }  

                        for ( var i in arg1 ) {
                            var item1 = arg1[i];
                            for ( var j in result ) {
                                var item2 = result[j];
                                if ( item1.device == item2.device && item1.sg_name == item2.sg_name ) {
                                    item1.iops_avg = item2.iops_avg;
                                }

                            }
                        }
                        
                        callback(null,arg1);


                    });
    
 
                },
                function(arg1, callback ) {

                    arg1.sort(sortBy("-iops_avg"));
                    
                    callback(null,arg1);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation( function (result )  {   
                        
                        for (var i in arg ) {
                            var item = arg[i];
                            for ( var j in result ) {
                                var appItem = result[j];
                                if (  appItem.array == item.device_sn )
                                    item.device_name = appItem.array_name;
                                if ( appItem.array == item.device_sn && appItem.SG == item.sg_name ) {
                                    if ( item.app_name == ""  ) 
                                        item.app_name = appItem.app;
                                    else 
                                        item.app_name = item.app_name +"," + appItem.app
                                }
                            }
                        }
                        callback(null,arg);
    
    
                    }); 
    
                }
            ], function (err, result) {
                  // result now equals 'done'

                  var ret = {}
                  ret.data = []; 
                  for ( var i=0; i<10; i++ ) {
                      ret.data.push(result[i]);
                  }

                  res.json(200 ,ret);
            });
    
    });

    app.get('/api/reports/performance/sg/top10/iops_avg_increase', function (req, res) {
        //var ret = require("../demodata/iops_avg_increase");
        res.setTimeout(1200*1000);
        async.waterfall(
            [
                function(callback){
                    var arrayInfo = require("../config/StorageInfo");
                    callback(null,arrayInfo);
                },
                // Get All Localtion Records
                function(param,  callback){ 
                    //var ret = require("../demodata/sg_top10_iops");
                    var device;
                    var period = 604800;
                    var valuetype = 'last';
                    var start = util.getConfStartTime('1m');
                    var end ;
                    VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function(rest) { 
                        var rets = [];
                        for ( var i in rest ) {
                            var item = rest[i]; 

                            var retItem = {};

                            retItem.app_name = "";

                            // Search the array custimized name
                            var isfind = false;
                            for ( var j in param) {
                                var arrayinfoItem = param[j];
                                if ( arrayinfoItem.storagesn == item.device ) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if ( isfind = false ) {
                                retItem.device_name = "";
                            }


                            retItem.device_sn = item.device;
                            retItem.sg_name = item.sgname;
                            retItem.iops_max = item.matricsStat.ReadRequests.max + item.matricsStat.WriteRequests.max ;
                            retItem.iops_avg = item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg ;
                            rets.push(retItem);
                        }
                        callback(null,rets);  
                    });
                },
                function(arg1, callback ) {

                    arg1.sort(sortBy("-iops_avg"));
                    var ret = []; 
                    for ( var i=0; i<10; i++ ) {
                        ret.push(arg1[i]);
                    }
  
                    callback(null,ret);
                },
                // Get The last year performance 
                function(param,  callback){ 
                    //var ret = require("../demodata/sg_top10_iops");
                    var device;
                    var period = 604800;
                    var valuetype = 'average';
                    var start = util.getLastYear().lastDay;
                    var end = util.getLastYear().firstDay ;
                    VMAX.GetStorageGroupsPerformance(device, period, start,end,  valuetype, function(rest) { 
                        var rets = [];
                        for ( var i in rest ) {
                            var item = rest[i]; 

                            for ( var j in param ) {
                                var top10Item = param[j];
                                //console.log( top10Item.device_sn +"\t" + item.device +"\t" + top10Item.sg_name +"\t" + item.sgname);
                                if ( top10Item.device_sn == item.device && top10Item.sg_name == item.sgname ) {
                                    top10Item.iops_avg_lastyear = item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg ;
                                    top10Item.iops_avg_increase = top10Item.iops_avg_lastyear > 0 ? ( top10Item.iops_avg - top10Item.iops_avg_lastyear ) /top10Item.iops_avg_lastyear : 100;
                                    break;
                                }
                            }

                        }
                        callback(null,param);  
                    });
                } ,
                function (arg, callback) {
                    Report.getAppStorageRelation( function (result )  {   
                        
                        for (var i in arg ) {
                            var item = arg[i];
                            for ( var j in result ) {
                                var appItem = result[j];
                                if (  appItem.array == item.device_sn )
                                    item.device_name = appItem.array_name;
                                if ( appItem.array == item.device_sn && item.sg_name.indexOf(appItem.SG) >= 0  ) {
                                    if ( item.app_name == ""  ) 
                                        item.app_name = appItem.app;
                                    else 
                                        item.app_name = item.app_name +"," + appItem.app
                                }
                            }
                        }
                        callback(null,arg);
    
    
                    }); 
    
                }
            ], function (err, result) {
                  // result now equals 'done'

                  var ret = {}
                  ret.data = result; 

                  res.json(200 ,ret);
            });
    }); 


    app.get('/api/reports/performance/sg/top10/middle_iops_avg_increase', function (req, res) {
        //var ret = require("../demodata/iops_avg_increase");
        res.setTimeout(1200*1000);
        async.waterfall(
            [
                function(  callback){ 
                    var param = {};  
                    param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
                    param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\')';
               
                    param['keys'] = ['serialnb','part'];
                    param['fields'] = ['device','sgname'];
                    param['period'] = 86400;
                    param['type'] = 'average';
                    param['valuetype'] = 'MAX';
                    var start = util.getConfStartTime('1m'); 
                    CallGet.CallGet(param, function(param) { 
                        var result = [];
                        for ( var i in param.result){
                            var item = param.result[i];
                            var isfind = false ;
                            for ( var j in result ) {
                                var sgItem = result[j];
                                if ( item.sgname == sgItem.sg_name ) {
                                    isfind = true;
                                    if ( item.TotalThroughput >= sgItem.iops_avg ) sgItem.iops_avg = item.TotalThroughput; 
                                    break;
                                }
                            }
    
                            if ( isfind == false ) {
                                var sgItem = {};
                                sgItem.device_name = item.device;
                                sgItem.device_sn = item.serialnb;
                                sgItem.sg_name = item.sgname; 
                                sgItem.iops_avg = item.TotalThroughput;
                                result.push(sgItem);
                            }
                        }  


                        callback(null,result);


                    });
    
 
                },
                function( arg1, callback){ 
                    var param = {};  
                    param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
                    param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\')';
               
                    param['keys'] = ['serialnb','part'];
                    param['fields'] = ['device','sgname'];
                    param['period'] = 86400;
                    param['type'] = 'average';
                    param['valuetype'] = 'MAX';
                    var start = util.getLastYear().lastDay;
                    var end = util.getLastYear().firstDay ;
                    CallGet.CallGet(param, function(param) { 
                        var result = [];
                        for ( var i in param.result){
                            var item = param.result[i];
                            var isfind = false ;
                            for ( var j in result ) {
                                var sgItem = result[j];
                                if ( item.sgname == sgItem.sg_name ) {
                                    isfind = true;
                                    if ( item.TotalThroughput >= sgItem.iops_avg ) sgItem.iops_avg = item.TotalThroughput; 
                                    break;
                                }
                            }
    
                            if ( isfind == false ) {
                                var sgItem = {};
                                sgItem.device_name = item.device;
                                sgItem.device_sn = item.serialnb;
                                sgItem.sg_name = item.sgname; 
                                sgItem.iops_avg = item.TotalThroughput;
                                result.push(sgItem);
                            }
                        }  
 
                        for ( var i in arg1 ) {
                            var item1 = arg1[i];
                            for ( var j in result ) {
                                var item2 = result[j];
                                if ( item1.device == item2.device && item1.sg_name == item2.sg_name ) {
                                    item1.iops_avg_lastyear = item2.iops_avg;
                                    item1.iops_avg_increase = item1.iops_avg - item1.iops_avg_lastyear;
                                }

                            }
                        }
                        
                        callback(null,arg1);


                    });
    
 
                },
                function(arg1, callback ) {

                    arg1.sort(sortBy("-iops_avg"));
  
                    callback(null,arg1);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation( function (result )  {   
                        
                        for (var i in arg ) {
                            var item = arg[i];
                            for ( var j in result ) {
                                var appItem = result[j];
                                if (  appItem.array == item.device_sn )
                                    item.device_name = appItem.array_name;
                                if ( appItem.array == item.device_sn && appItem.SG == item.sg_name ) {
                                    if ( item.app_name == ""  ) 
                                        item.app_name = appItem.app;
                                    else 
                                        item.app_name = item.app_name +"," + appItem.app
                                }
                            }
                        }
                        callback(null,arg);
    
    
                    }); 
    
                }
            ], function (err, result) {
                  // result now equals 'done'


                  var ret = {}
                  ret.data = []; 
                  for ( var i=0; i<10; i++ ) {
                      ret.data.push(result[i]);
                  }

                  res.json(200 ,ret);
            });
    }); 

    app.get('/api/reports/performance/sg/top10/iops_response_time', function (req, res) {
        //var ret = require("../demodata/report_io_response");
        res.setTimeout(1200*1000);

        async.waterfall(
            [
                function(callback){
                    var arrayInfo = require("../config/StorageInfo");
                    callback(null,arrayInfo);
                },
                // Get All Localtion Records
                function(param,  callback){ 
                    //var ret = require("../demodata/sg_top10_iops");
                    var device;
                    var period = 604800;
                    var valuetype = 'last';
                    var start = util.getConfStartTime('1m');
                    var end ;
                    VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function(rest) { 
                        var rets = [];
                        for ( var i in rest ) {
                            var item = rest[i]; 

                            var retItem = {};

                            retItem.app_name = "";

                            // Search the array custimized name
                            var isfind = false;
                            for ( var j in param) {
                                var arrayinfoItem = param[j];
                                if ( arrayinfoItem.storagesn == item.device ) {
                                    isfind = true;
                                    retItem.device_name = arrayinfoItem.name;

                                }
                            }
                            if ( isfind = false ) {
                                retItem.device_name = "";
                            }


                            retItem.device_sn = item.device;
                            retItem.sg_name = item.sgname;
                           // retItem.iops_max = item.matricsStat.ReadRequests.max + item.matricsStat.WriteRequests.max ;
                            retItem.iops_avg = item.matricsStat.ReadRequests.avg + item.matricsStat.WriteRequests.avg ;
                            retItem.response_time_ms = item.matricsStat.ResponseTime.max;
                            rets.push(retItem);
                        }
                        callback(null,rets);  
                    });
                },
                function(arg1, callback ) {

                    arg1.sort(sortBy("-response_time_ms"));
                    
                    callback(null,arg1);
                },
                function (arg, callback) {
                    Report.getAppStorageRelation( function (result )  {   
                        
                        for (var i in arg ) {
                            var item = arg[i];
                            for ( var j in result ) {
                                var appItem = result[j];
                                if (  appItem.array == item.device_sn )
                                    item.device_name = appItem.array_name;
                                if ( appItem.array == item.device_sn && appItem.SG == item.sg_name ) {
                                    if ( item.app_name == ""  ) 
                                        item.app_name = appItem.app;
                                    else 
                                        item.app_name = item.app_name +"," + appItem.app
                                }
                            }
                        }
                        callback(null,arg);
    
    
                    }); 
    
                }
            ], function (err, result) {
                  // result now equals 'done'

                  var ret = {}
                  ret.data = []; 
                  for ( var i=0; i<10; i++ ) {
                      ret.data.push(result[i]);
                  }

                  res.json(200 ,ret);
            });
    }); 



    app.get('/api/reports/performance/sg/top10/middle_iops_response_time', function (req, res) { 
        res.setTimeout(1200*1000);

        async.waterfall(
            [
                function(  callback){ 
                    var param = {};  
                    param['filter'] = 'source=\'VNXBlock-Collector\'&(parttype==\'LUN\'|parttype==\'MetaMember\')';
                    param['filter_name'] = '(name=\'TotalThroughput\'|name=\'TotalBandwidth\'|name=\'ResponseTime\')';
               
                    param['keys'] = ['serialnb','part'];
                    param['fields'] = ['device','sgname'];
                    param['period'] = 86400;
                    param['type'] = 'average';
                    param['valuetype'] = 'MAX';
                    var start = util.getConfStartTime('1m'); 
                    CallGet.CallGet(param, function(param) { 
                        var result = [];
                        for ( var i in param.result){
                            var item = param.result[i];
                            var isfind = false ;
                            for ( var j in result ) {
                                var sgItem = result[j];
                                if ( item.sgname == sgItem.sg_name ) {
                                    isfind = true;
                                    if ( item.TotalThroughput >= sgItem.iops_avg ) sgItem.iops_avg = item.TotalThroughput; 
                                    if ( item.ResponseTime >= sgItem.response_time_ms ) sgItem.response_time_ms = item.ResponseTime; 
                                    break;
                                }
                            }
    
                            if ( isfind == false ) {
                                var sgItem = {};
                                sgItem.device_name = item.device;
                                sgItem.device_sn = item.serialnb;
                                sgItem.sg_name = item.sgname; 
                                sgItem.iops_avg = item.TotalThroughput;
                                sgItem.response_time_ms = item.ResponseTime;
                                result.push(sgItem);
                            }
                        }  


                        callback(null,result);


                    });
    
 
                },
                function(arg1, callback ) {

                    arg1.sort(sortBy("-response_time_ms"));
                    
                    callback(null,arg1);
                }
            ], function (err, result) {
                  // result now equals 'done'

                  var ret = {}
                  ret.data = []; 
                  for ( var i=0; i<10; i++ ) {
                      ret.data.push(result[i]);
                  }

                  res.json(200 ,ret);
            });
    }); 


};



module.exports = reportingController;
