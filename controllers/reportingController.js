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

var Reporting = require('../lib/Reporting');

var mongoose = require('mongoose');   
var ReportInfoObj = mongoose.model('ReportInfo');
var ReportStatusObj = mongoose.model('ReportStatus');


var tempfile = require('tempfile');
var officegen = require('officegen');
var docx = officegen('docx');
var path = require('path');
var fs = require('fs');
var http = require('http'); 



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
        var beginDate = req.query.begindate; 
        var endDate = req.query.enddate;
        console.log("BeginDate="+beginDate+',EndDate=' + endDate);
        var device; 
        Report.GetArraysIncludeHisotry(device, function(ret) {  

            var finalRecord = [];
            


            for ( var i in ret.data ) {
                var item = ret.data[i];
    
                var isFind = false ;
                for ( var j in finalRecord ) {
                    var resItem = finalRecord[j];
                    if ( resItem.type == item.type ) {
                        resItem.quantity++;
 
                       resItem['logical_capacity_PB']              +=  item['logical_capacity_PB']             ;
                       resItem['logical_capacity_last_year_PB']    +=  ( isNaN(item['logical_capacity_last_year_PB']) == true ) ? 0 : item['logical_capacity_last_year_PB'] ; 
                       resItem['logical_capacity_last_month_PB']   +=  ( isNaN(item['logical_capacity_last_month_PB']) == true ) ? 0 : item['logical_capacity_last_month_PB'] ;
                       resItem['allocated_capacity_PB']            +=  item['allocated_capacity_PB']           ;
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
        var beginDate = req.query.begindate; 
        var endDate = req.query.enddate;
        console.log("BeginDate="+beginDate+',EndDate=' + endDate);
        var device;
        Report.GetArraysIncludeHisotry(device, function(ret) {  
                res.json(200 , ret);
            });

    });


    // CEB Report 1.3
    app.get('/api/reports/capacity/top20/sg', function (req, res) {
        var beginDate = req.query.begindate; 
        var endDate = req.query.enddate;
        console.log("BeginDate="+beginDate+',EndDate=' + endDate);
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
            var newret = {};
            newret['data'] = finalRecord;

            res.json(200 ,newret);
        });
        
            

    });


    // CEB Report 1.4
    app.get('/api/reports/capacity/top20/sg_increase', function (req, res) {
        var beginDate = req.query.begindate; 
        var endDate = req.query.enddate; 
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
            var newret = {};
            newret['data'] = retResult;

            res.json(200 ,newret);
        });
        
    });

    app.get('/api/reports/capacity/related/', function (req, res) {
        var ret = require("../demodata/capacityrelated");
        res.json(200 ,ret);
    });
    app.get('/api/reports/performance/summary/iops/', function (req, res) {
        var ret = require("../demodata/summary_iops");
        res.json(200 ,ret);
    });
    app.get('/api/reports/performance/summary/mbps/', function (req, res) {
        var ret = require("../demodata/summary_mbps");
        res.json(200 ,ret);
    });

    app.get('/api/reports/performance/sg/summary/', function (req, res) {
        var ret = require("../demodata/sg_summary");
        res.json(200 ,ret);
    });
    app.get('/api/reports/performance/sg/top10/iops/', function (req, res) {
        var ret = require("../demodata/sg_top10_iops");
        res.json(200 ,ret);
    });

    app.get('/api/reports/performance/sg/top10/iops_avg_increase', function (req, res) {
        var ret = require("../demodata/iops_avg_increase");
        res.json(200 ,ret);
    }); 

    app.get('/api/reports/performance/sg/top10/iops_response_time', function (req, res) {
        var ret = require("../demodata/report_io_response");
        res.json(200 ,ret);
    }); 
};



module.exports = reportingController;
