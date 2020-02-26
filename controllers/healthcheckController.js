"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('healthcheckController')
var configger = require('../config/configger');
var fs = require('fs');
var xml2json = require('xml2json');
var XLSX = require('xlsx');


var healthcheckController = function (app) {

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


    app.get('/healthcheck/vmax', function (req, res) {


        async.waterfall(
            [
                function(callback){
                      callback(null,param);
                },
                // Get All Localtion Records
                function(param,  callback){ 
                    var DataFilename = 'c:\\tmp\\healthcheck\\symevent.out';
                    var allevents = {};

                    fs.readFile(DataFilename, function (err, xmloutput) {
                        if (err) console.log(err);
            
            
                        var options = {
                            object: true
                        };
                        var json = xml2json.toJson(xmloutput, options);
            
                        // Symmetrix Events records
                        var summarys = [];
            
                        var device = json.SymCLI_ML.Symmetrix.Symm_Info.symid;
                        var events = json.SymCLI_ML.Symmetrix.Event;
                        var summaryItem = {
                            device: device ,
                            Fatal: 0,
                            Warning: 0,
                            Informational: 0
                        }
                        for (var i in events) {
                            var item = events[i];
            
                            if (summaryItem[item.severity] === undefined) summaryItem[item.severity] = 0;
                            summaryItem[item.severity]++
            
                        }
                        summarys.push(summaryItem);
                        allevents[`symevent (${device.substr(device.length-4,device.length)})`] = events;



                        var result = {};
                        result["Health Check Summary"] = summarys;
                        result["allevents"] = allevents;
                        callback(null, result); 
                    });
                },
                function(param,  callback){ 
                      callback(null,param);
                }
            ], function (err, result) {

                console.log(summarys);
                // Summary 
                var wb = XLSX.utils.book_new();
                var ws = XLSX.utils.json_to_sheet(summarys);
                XLSX.utils.book_append_sheet(wb, ws, "Health Check Summary");
    
                // Symmetrix Event detail 
                var ws1 = XLSX.utils.json_to_sheet(events);
                var sheetname = `symevent (${device.substr(device.length-4,device.length)})`
                XLSX.utils.book_append_sheet(wb, ws1, sheetname);
    
                var outputFilename = "c:\\SymEvent.xlsx";
                XLSX.writeFile(wb, outputFilename);
    
                res.json(200, json)
 
            });
    
 
    });








};

module.exports = healthcheckController;
