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
var async = require('async');

var App = require('../lib/App');
var topos = require('../lib/topos.js');
var Report = require('../lib/Reporting');
var CAPACITY = require('../lib/Array_Capacity');

var AppTopologyObj = mongoose.model('AppTopology');
var VPLEX = require('../lib/Array_VPLEX');


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
                var finalRecords_all = [];
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
                    finalRecords_all.push(retItem);
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

                console.log("finalRecords_all record number: " + finalRecords_all.length);

                var fsname = ReportOutputPath + '//' + 'topology_all.json';
                fs.writeFileSync(fsname, '[\n');
                for (var i in finalRecords_all) {
                    var item = finalRecords_all[i];

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


    app.get('/api/topology/app/vplex', function (req, res) {
        var device;
        async.waterfall([
            function (callback) {

                VPLEX.getVplexStorageViews(device, function (sg) {
                    callback(null, sg);

                });

            },
            function (arg1, callback) { 

                var results = [];
                for ( var i in arg1 ) {
                    var item = arg1[i];
                    for ( var j in item.inits ) {
                        var initItem = item.inits[j];
                        var hostname = initItem.replace(/_HBA[0-9]/g,''); 

                        for ( var z in item.vvol ) {
                            var vvolItem = item.vvol[z];
                            var newItem = {};
                            newItem["hostname"] = hostname;
                            newItem.total_capacity = item.Capacity;
                            newItem.vplexsn = item.device;
                            newItem.vplex_cluster = item.cluster;
                            newItem.vplex_svname = item.part;  
                            newItem.vvol = vvolItem.part;
                            newItem.vvol_capacity = vvolItem.Capacity;
                            newItem.vplex_devicename = "";
                            newItem.backarray = vvolItem.array;
                            newItem.backarray_name = "";
                            newItem.backarray_lunid = "";
                            newItem.backarray_lunwwn = vvolItem.lunwwn;

                            results.push(newItem);

                        }
                        
                        
                    }
                }

                var unduprecords = [];
                // remove duplicate records
                for ( var i in results ) {
                    var item = results[i];
                    var issame = false;
                    for ( var j in unduprecords ) {
                        var item1 = unduprecords[j]; 
                        for ( var field in item ) {
                            if ( item[field] == item1[field]) {
                                issame = true;
                                continue;
                            }
                            else {
                                issame = false;
                                break;
                            }
                        }
                        if ( issame == true ) break;
                    }
                    
                    if ( issame == false ) 
                        unduprecords.push(item);
                }
                    callback(null, unduprecords); 

            },
            // Search back array lun info;
            function(arg1, callback ) {

                VPLEX.GetStorageVolumeByDevices(device, function(result) {
                    for ( var i in arg1 ) {
                        var item = arg1[i];
                        for ( var j in result ) {
                            var lunItem = result[j];
                            if ( item.backarray_lunwwn == lunItem. vplexStorageVolumeSN ) {
                                if ( item.vplex_svname.indexOf( lunItem.maskviewName ) < 0 ) 
                                    item.vplex_svname += ',' + lunItem.maskviewName;
                                item["vplex_devicename"] = lunItem.vplexStorageVolumeName;
                                item["backarray_name"] = lunItem.storageName;
                                item["backarray_lunid"] = lunItem.storageVolName;
                            }
                        }
                    }
                    callback(null, arg1);
                })
            }

        ], function (err, result) { 
            var config = configger.load(); 
            var ReportOutputPath = config.Reporting.OutputPath;
            var fs = require('fs');
            
            var json2xls = require('json2xls');
            var xls = json2xls(result);
            var outputFilename = ReportOutputPath + '//' + 'topology-vplex.xlsx';
            console.log("Write Result to file [" + outputFilename + "]");
            fs.writeFileSync(outputFilename, xls, 'binary');

            res.json(200, result);
        });


    });

};

module.exports = topologyController;
