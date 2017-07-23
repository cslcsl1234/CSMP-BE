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

    app.get('/api/reporting/test2', function(req, res){ 
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

        var out = fs.createWriteStream ( 'tmp/out_json.docx' );

        out.on ( 'error', function ( err ) {
            console.log ( err );
        });

        docx.generate ( res );

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


};

module.exports = reportingController;
