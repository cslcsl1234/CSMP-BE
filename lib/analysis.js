"use strict";

var async = require('async');
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');

var moment = require('moment');
var AppObj = mongoose.model('Application');
//var CallGet = require('./CallGet'); 
var configger = require('../config/configger');
var AppTopologyObj = mongoose.model('AppTopology');

module.exports = {
    GenerateBaseLine,
    getAppTopology,
    getAppTopologyAll
}


/*
   Data: 

   {
      "orgiData": [
        {
          "timestamp": "1527904800",
          "HostMBperSec": 3.41981,
          "Requests": 378.84,
          "CurrentUtilization": 1.81505
        },
        {
          "timestamp": "1527908400",
          "HostMBperSec": 2.49122,
          "Requests": 128.1,
          "CurrentUtilization": 0.840408
        }
      ],
      "baselineData": [
        {
          "timestamp": "1525392000",
          "HostMBperSec": 70.6321,
          "Requests": 2971.16,
          "CurrentUtilization": 15.1469
        },
        {
          "timestamp": "1525395600",
          "HostMBperSec": 38.3261,
          "Requests": 3479.43,
          "CurrentUtilization": 15.7259
        }
      ]
    }

*/


function GenerateBaseLine(data, callback) {

    var config = configger.load();

    var baselinePeriod = config.Analysis.baselinePeriod;
    var PeriodNumber = config.Analysis.PeriodNumber;
    var baselinePercent = config.Analysis.baselinePercent;

    console.log(baselinePeriod + '\t' + PeriodNumber + '\t' + baselinePercent);

    async.waterfall([
        function(callback) {

            var orgiData = data.orgiData;
            var baselineData = data.baselineData;

            for (var i in orgiData) {
                var origItem = orgiData[i];

                var BLTS = [];
                for (var j = 1; j <= baselinePeriod; j++) {
                    var ts = origItem.timestamp - PeriodNumber * j;
                    // console.log("orgiTS="+origItem.timestamp + "\t"+ts + "\t" + moment.unix(ts).toISOString(true));
                    BLTS.push(ts);
                }

                var BLItem = {};
                for (var j in baselineData) {
                    var baselineItem = baselineData[j];
                    for (var z in BLTS) {
                        if (baselineItem.timestamp == BLTS[z]) {
                            for (var fieldname in baselineItem) {
                                if (fieldname == 'timestamp') continue;
                                if (BLItem[fieldname] === undefined)
                                    BLItem[fieldname] = baselineItem[fieldname] / baselinePeriod;
                                else
                                    BLItem[fieldname] += baselineItem[fieldname] / baselinePeriod;
                            }
                        }
                    }
                }

                for (var fieldname in origItem) {
                    if (fieldname == 'timestamp') continue;
                    if (BLItem[fieldname] === undefined) BLItem[fieldname] = 0;

                    origItem["BL_" + fieldname] = BLItem[fieldname];
                }


            }

            callback(null, orgiData);

        },
        function(data, callback) {
            var finalResult = {};

            for (var i in data) {
                var item = data[i];
                for (var fieldname in item) {
                    if (fieldname == 'timestamp') continue;

                    if (fieldname.indexOf("BL_") >= 0) continue;

                    var subItem = {};
                    subItem["timestamp"] = item.timestamp;
                    subItem[fieldname] = item[fieldname];
                    if ((item["BL_" + fieldname] + item["BL_" + fieldname] * baselinePercent / 100) === NaN)
                        subItem["BL_TOP"] = 0;
                    else
                        subItem["BL_TOP"] = item["BL_" + fieldname] + item["BL_" + fieldname] * baselinePercent / 100;

                    subItem["BL_BOTTOM"] = item["BL_" + fieldname] - item["BL_" + fieldname] * baselinePercent / 100;
                    subItem["BL"] = item["BL_" + fieldname];

                    if (finalResult[fieldname] === undefined) {
                        finalResult[fieldname] = {};
                        finalResult[fieldname]["Title"] = fieldname;
                        finalResult[fieldname]["dataset"] = [];
                    }
                    finalResult[fieldname]["dataset"].push(subItem);

                }
            }

            callback(null, finalResult);
        }
    ], function(err, result) {

        callback(result);
    });



}



function getAppTopology(callback) {
    var config = configger.load();
    var ReportOutputPath = config.Reporting.OutputPath;
    var appTopoFile = path.join(ReportOutputPath, 'topology.json');
    fs.readFile(appTopoFile, function(err, apptopoData) {
        var jsonData = JSON.parse(apptopoData);
        callback(jsonData);
    });
    /*
    console.log(moment.utc(Date.now()).format() + " Begin Query mongodb ...");
    var query = AppTopologyObj.find({k
    set -}).sort({"metadata.generateDatetime":-1}).limit(1).select({ "metadata": 1, "data": 1,  "_id": 0});
    query.exec(function (err, doc) {
        //system error.
        if (err) { 
            res.json(500 , {status: err})
        }
        if (!doc) { //user doesn't exist.
            res.json(200 , []); 
        }
        else {
            console.log(moment.utc(Date.now()).format() + " mongodb has return. ");
            var lastRecord ;
            for ( var i in doc ) {
                var item = doc[i];
                var generateDT = new Date(item.metadata.generateDatetime);
                if ( lastRecord === undefined ) {
                    var lastRecord = item;
                } else {
                    var lastRecordgenerateDT = new Date(lastRecord.metadata.generateDatetime);
                    if ( generateDT > lastRecordgenerateDT ) 
                        lastRecord = item;
                } 
            } 
            console.log(moment.utc(Date.now()).format() + " It has got the last record.");

            //console.log(lastRecord.data);

            callback(lastRecord.data); 
        } 
    }); 
    */
};


function getAppTopologyAll(callback) {
    var config = configger.load();
    var ReportOutputPath = config.Reporting.OutputPath;
    var appTopoFile = path.join(ReportOutputPath, 'topology_all.json');
    fs.readFile(appTopoFile, function(err, apptopoData) {
        var jsonData = JSON.parse(apptopoData);
        callback(jsonData);
    });
};