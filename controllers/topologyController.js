"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('topologyController')
const name = 'my-app'
var unirest = require('unirest');
var configger = require('../config/configger');
var util = require('../lib/util');
var mongoose = require('mongoose');

var App = require('../lib/App');
var topos = require('../lib/topos.js');
var Report = require('../lib/Reporting');
var CAPACITY = require('../lib/Array_Capacity');

var AppTopologyObj = mongoose.model('AppTopology');


var topologyController = function (app) {

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


    app.get('/api/topologyview', function (req, res) {


        topos.getToposViews(function (result) {
            res.json(200, result);
        });

    });



    app.get('/api/topology/level1', function (req, res) {

        topos.getEntitys(function (entitys) {

            topos.getLinks(function (links) {

                var finalResult = {};

                // add relationship object in each entities.
                var relaResult = {};
                for (var i in links) {
                    var item = links[i];
                    var from = item.from;
                    var to = item.to;
                    if (relaResult[from] === undefined) {
                        var relas = [];
                        relas.push(to);
                        relaResult[from] = relas;
                    } else {
                        relaResult[from].push(to);
                    }

                    if (relaResult[to] === undefined) {
                        var relas = [];
                        relas.push(from);
                        relaResult[to] = relas;
                    } else {
                        relaResult[to].push(from);
                    }

                }

                for (var j in entitys) {
                    var item = entitys[j];
                    var key = item.key;
                    item["relationship"] = relaResult[key];
                }

                // Drop entity that have not include submember.
                entitys = topos.cleanEntityFilter(entitys);
                // short the group that is very long
                entitys = topos.shortGroupNameFilter(entitys);
                // Add a "description" propertite in each entity
                entitys = topos.addDescriptionFilter(entitys);

                finalResult["entity"] = entitys;
                finalResult["link"] = links;
                var links_level1 = topos.combineLinks_level1(finalResult);
                finalResult["linkByGroup"] = links_level1;

                res.json(200, finalResult);

            })

        })

    });




    app.get('/api/topology/app', function (req, res) {
        res.setTimeout(3600 * 10000);
        //var device = '000492600549';
        var device;
        var config = configger.load();
        var ReportTmpDataPath = config.Reporting.TmpDataPath;
        var ReportOutputPath = config.Reporting.OutputPath;
        var crypto = require('crypto');
        var md5sum = crypto.createHash('md5');
        console.log(" =========================================================== ");
        console.log(" Begin topology for application.  " + Date());
        console.log(" =========================================================== ");

        Report.initiatalApplicationInfo(function (apps) {
            var fs = require('fs');
            var fsname = ReportOutputPath + '//' + 'applicationInfo.json';
            fs.writeFileSync(fsname, '[\n');
            for (var i in apps) {
                var item = apps[i];

                //console.log(item.maskingview);
                if (i == 0)
                    fs.appendFileSync(fsname, JSON.stringify(item) + '\n');
                else
                    fs.appendFileSync(fsname, ', ' + JSON.stringify(item) + '\n');
            }
            fs.appendFileSync(fsname, ']\n');


            console.log(Date() + " ===== Get ApplicationInfo is done. ===== apps:" + apps.length);
            Report.E2ETopology(device, function (topoAll) {
                //Report.E2ETopologyTest(device, function(topoAll) {
                var masking = topoAll.masking;
                var zone = topoAll.zone;
                var nomarched_zone = topoAll.nomarched_zone;
                var nomarched_masking = topoAll.nomarched;
                var topo = topoAll.marched;

                console.log(Date() + "===== Begin execute application capacity analysis ======");
                console.log("========================================================");
                Report.ApplicationCapacityAnalysis(masking, apps, function(applicationCapacity) {
                    var fs = require('fs');
                    var wstream = fs.createWriteStream("./data/ApplicationCapacityAnalysis.json");
    
                    wstream.write('[');
                    for (var i in applicationCapacity) {
                        var item = applicationCapacity[i];
                        if (i == 0) wstream.write(JSON.stringify(item) + '\n');
                        else wstream.write(', ' + JSON.stringify(item) + '\n');
                    }
                    wstream.write(']\n');
                    wstream.end();
                    console.log(Date() + "===== End  execute application capacity analysis ======");
                });




                var finalRecords = [];
                for (var j in topo) {
                    var topoItem = topo[j];

                    //  if ( topoItem.marched_type != 'find' ) continue;
                    //  if ( topoItem.zname.indexOf('VPLEX') >=0 ) continue;

                    finalRecords.push(topoItem);

                }

                var finalRecords_new = [];
                var finalRecords_null = [];
                for (var j in finalRecords) {
                    var topoItem = finalRecords[j];

                    // if ( topoItem.marched_type != 'find' ) continue;
                    // if ( topoItem.zname.indexOf('VPLEX') >=0 ) continue;

                    var retItem = {};
                    retItem.appShortName = "";
                    retItem.app = "";
                    retItem.appManagerA = "";
                    retItem.host = "";
                    retItem.hostip = "";
                    retItem.hostStatus = "";

                    for (var z in topoItem) {
                        retItem[z] = topoItem[z];
                    }

                    for (var i in apps) {
                        var appItem = apps[i];

                        if (appItem.WWN == topoItem.hbawwn) {
                            retItem["appShortName"] = appItem["appShortName"];
                            retItem["app"] = appItem["app"];
                            retItem["appManagerA"] = appItem["appManagerA"];
                            retItem["host"] = appItem["host"];
                            retItem["hostip"] = appItem["hostIP"];
                            retItem["hostStatus"] = appItem["hostRunType"];
                        }
                    }

                    if (retItem.marched_type == 'find') {
                        delete retItem.marched_type;

                        if (retItem.connect_hba_swport_wwn === undefined || retItem.connect_hba_swport_wwn === null || retItem.connect_hba_swport_wwn === '')
                            finalRecords_null.push(retItem);
                        else
                            finalRecords_new.push(retItem);


                    }
                }
                console.log(Date() + "===== execute write topology file ======");



                var fs = require('fs');
                var wstream = fs.createWriteStream("./data/finalRecords_null.json");

                wstream.write('[');
                for (var i in finalRecords_null) {
                    var item = finalRecords_null[i];
                    if (i == 0) wstream.write(JSON.stringify(item) + '\n');
                    else wstream.write(', ' + JSON.stringify(item) + '\n');
                }
                wstream.write(']\n');
                wstream.end();


                console.log("finalRecords_new record number: " + finalRecords_new.length);

                var fsname = ReportOutputPath + '//' + 'topology.json';
                fs.writeFileSync(fsname, '[\n');
                for (var i in finalRecords_new) {
                    var item = finalRecords_new[i];

                    //console.log(item.maskingview);
                    if (i == 0)
                        fs.appendFileSync(fsname, JSON.stringify(item) + '\n');
                    else
                        fs.appendFileSync(fsname, ', ' + JSON.stringify(item) + '\n');
                }
                fs.appendFileSync(fsname, ']\n');


                var json2xls = require('json2xls');
                var xls = json2xls(finalRecords_new);
                var outputFilename = ReportOutputPath + '//' + 'topology.xlsx';
                console.log("Write Result to file [" + outputFilename + "]");
                fs.writeFileSync(outputFilename, xls, 'binary');

                var ret = {};
                ret.filename = outputFilename;
                ret.generateDatetime = util.CurrentDateTime();
                ret.NumberOfRecord = finalRecords_new.length;


                // Insert the all of record into MongoDB 
                var appTopologyRecord = {};
                appTopologyRecord.metadata = ret;
                appTopologyRecord.data = finalRecords_new;
                appTopologyRecord.nomached_zone = nomarched_zone;
                //appTopologyRecord.nomarched_masking = topoAll.nomarched;
                //appTopologyRecord.zone = zone ; 
                //appTopologyRecord.masking = masking ;

                console.log(Date() + "===== execute write lunmappping file ======");


                /*  ------------------------------
                    for lun mapping view 
                  ------------------------------ */
                var lunTopoViews = topos.CombineLunTopoViews(masking, finalRecords_new);
                var fs = require('fs');
                var json2xls = require('json2xls'); 

                var fsname = "./data/lunmapping.json";
                fs.writeFileSync(fsname, '[\n');
                for (var i in lunTopoViews) {
                    var item = lunTopoViews[i];

                    //console.log(item.maskingview);
                    if (i == 0)
                        fs.appendFileSync(fsname, JSON.stringify(item) + '\n');
                    else
                        fs.appendFileSync(fsname, ', ' + JSON.stringify(item) + '\n');
                }
                fs.appendFileSync(fsname, ']\n');


 
                var xls1 = json2xls(lunTopoViews);

                var outputFilename1 = ReportOutputPath + '//' + 'lunmapping.xlsx';
                console.log(Date() + "Write Result to file [" + outputFilename1 + "]");
                fs.writeFileSync(outputFilename1, xls1, 'binary');

                console.log(Date() + "===== execute write mongo record ======");



                var newRecord = new AppTopologyObj(appTopologyRecord);

                newRecord.save(function (err, thor) {
                    if (err) {
                        return res.json(400, err);
                    } else
                        console.log(Date() + " FINISHED ! ");
                        console.log("========================================================");

                    res.json(200, ret);
                });


            });
        });


    });



};

module.exports = topologyController;
