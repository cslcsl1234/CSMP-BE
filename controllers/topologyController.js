"use strict";
const logger = require("../lib/logger")(__filename);

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('topologyController')
const name = 'my-app'
var unirest = require('unirest');
var path = require('path');
var configger = require('../config/configger');
var util = require('../lib/util');
var mongoose = require('mongoose');
var async = require('async');
var sortBy = require('sort-by');

var App = require('../lib/App');
var topos = require('../lib/topos.js');
var Report = require('../lib/Reporting');
var CAPACITY = require('../lib/Array_Capacity');
var Analysis = require('../lib/analysis');
var AppTopologyObj = mongoose.model('AppTopology');
var VPLEX = require('../lib/Array_VPLEX');


var topologyController = function(app) {

    var config = configger.load();

    app.all('*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
        res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        res.header('Access-Control-Expose-Headers', '*');

        debug('req.method = %s', req.method);
        debug('req.url = %s', req.url);

        if (req.method == "OPTIONS") res.send(200); /*让options请求快速返回*/
        else next();
    });


    app.get('/api/topologyview', function(req, res) {


        topos.getToposViews(function(result) {
            res.json(200, result);
        });

    });


    app.get('/api/topology/level2', function(req, res) {
        //app.get('/level2', function(req, res) {
        logger.info(req.query.params);
        var queryParamater = JSON.parse(req.query.params);
        var category = queryParamater.category;
        var device = queryParamater.key;
        async.waterfall(
            [
                function(callback) {

                    topos.getTopoViewFilter(device, category, function(result) {
                        callback(null, result);
                    })

                },
                // Get All Localtion Records
                function(param, callback) {
                    callback(null, param);
                },
                function(param, callback) {
                    callback(null, param);
                }
            ],
            function(err, result) {
                res.json(200, result);
            });



    });

    app.get('/api/topology/level1', function(req, res) {

        Analysis.getAppTopologyAll(function(apptopo) {
            var entity = [];
            var link = [];
            var group = [];
            var linkByGroup = [];

            var topodataTmp = {};
            var topodata = [];


            for (var i in apptopo) {
                var item = apptopo[i];

                var topodataKey = `_${item.appShortName}_${item.host}_${item.connect_hba_sw}_${item.connect_arrayport_sw}_${item.array}_`;
                var topodataNewItem = {
                    key: topodataKey,
                    appShortName: item.appShortName,
                    host: item.host,
                    connect_hba_sw: item.connect_hba_sw,
                    connect_arrayport_sw: item.connect_arrayport_sw,
                    array: item.array
                }
                topodataTmp[topodataKey] = topodataNewItem;


                // Entity
                var isfind = { array: false, arraysw: false, hbasw: false, host: false, app: false }
                for (var entity_i in entity) {
                    var entityItem = entity[entity_i];
                    // array
                    if (entityItem.key == item.array) {
                        isfind.array = true;
                    }
                    if (entityItem.key == item.connect_arrayport_sw) {
                        isfind.arraysw = true;
                    }
                    if (entityItem.key == item.connect_hba_sw) {
                        isfind.hbasw = true;
                    }
                    if (entityItem.key == item.host) {
                        isfind.host = true;
                    }
                    if (entityItem.key == item.appShortName) {
                        isfind.app = true;
                    }
                }

                if (isfind.array == false) {
                    var arrayItem = {
                        "datacenter": "datacenter",
                        "category": "Array",
                        "group": "EMC",
                        "key": item.array,
                        "displayName": item.arrayname
                    }
                    entity.push(arrayItem);
                }


                if (isfind.arraysw == false) {
                    var Item = {
                        "datacenter": "datacenter",
                        "category": "Switch",
                        "group": "Brocade",
                        "key": item.connect_arrayport_sw,
                        "displayName": item.connect_arrayport_sw
                    }
                    entity.push(Item);
                }

                if (isfind.host == false) {
                    var Item = {
                        "datacenter": "datacenter",
                        "category": "PhysicalHost",
                        "group": "Host",
                        "key": item.host,
                        "displayName": item.host
                    }
                    entity.push(Item);
                }

                if (isfind.app == false) {
                    var Item = {
                        "datacenter": "datacenter",
                        "category": "Application",
                        "group": "App",
                        "key": item.appShortName,
                        "displayName": item.app
                    }
                    entity.push(Item);
                }




                // Link
                var isfindLink = { app_host: false, host_sw: false, sw_array: false }
                for (var link_i in link) {
                    var linkItem = link[link_i];
                    // app_host
                    if (linkItem.from == item.appShortName && linkItem.to == item.host) {
                        isfindLink.app_host = true;
                    }
                    if (linkItem.from == item.host && linkItem.to == item.connect_hba_sw) {
                        isfindLink.host_sw = true;
                    }
                    if (linkItem.from == item.connect_arrayport_sw && linkItem.to == item.array) {
                        isfindLink.sw_array = true;
                    }
                }

                if (isfindLink.app_host == false) {
                    var linkItem = {
                        from: item.appShortName,
                        to: item.host
                    }
                    link.push(linkItem);
                }
                if (isfindLink.host_sw == false) {
                    var linkItem = {
                        from: item.host,
                        to: item.connect_hba_sw
                    }
                    link.push(linkItem);
                }
                if (isfindLink.sw_array == false) {
                    var linkItem = {
                        from: item.connect_arrayport_sw,
                        to: item.array
                    }
                    link.push(linkItem);
                }



            }

            for (var key in topodataTmp) {
                topodata.push(topodataTmp[key]);
            }

            // --------------------------------
            // build group data
            // --------------------------------

            //1. datacenter
            for (var i in entity) {
                var item = entity[i];
                isfind = false;
                for (var j in group) {
                    var groupItem = group[j];
                    if (item.datacenter == groupItem.key) {
                        isfind = true;
                        break;
                    }
                }
                if (isfind == false) {
                    var newItem = {
                        "isGroup": true,
                        "category": "DatacenterGroup",
                        "group": "",
                        "key": item.datacenter,
                        "text": item.datacenter,
                        "order": 10
                    }
                    group.push(newItem);
                }
            }


            //2. category
            for (var i in entity) {
                var item = entity[i];
                isfind = false;
                for (var j in group) {
                    var groupItem = group[j];
                    if (item.category == groupItem.key) {
                        isfind = true;
                        break;
                    }
                }
                if (isfind == false) {
                    var newItem = {
                        "isGroup": true,
                        "category": "",
                        "group": item.datacenter,
                        "key": item.category,
                        "text": item.category,
                        "order": 20
                    }
                    if (newItem.key == "Application") {
                        newItem.category = "ApplicationGroup";
                        newItem.order = 20
                    };
                    if (newItem.key == "PhysicalHost") {
                        newItem.category = "HostGroup";
                        newItem.order = 30
                    };
                    if (newItem.key == "Switch") {
                        newItem.category = "SwitchGroup";
                        newItem.order = 40
                    };
                    if (newItem.key == "Array") {
                        newItem.category = "ArrayGroup";
                        newItem.order = 50
                    };
                    group.push(newItem);
                }
            }

            //3. group
            for (var i in entity) {
                var item = entity[i];
                isfind = false;
                for (var j in group) {
                    var groupItem = group[j];
                    if (item.group == groupItem.key) {
                        isfind = true;
                        break;
                    }
                }
                if (isfind == false) {
                    var newItem = {
                        "isGroup": true,
                        "category": item.group,
                        "group": item.category,
                        "key": item.group,
                        "text": item.group,
                        "order": 1000
                    }
                    group.push(newItem);
                }
            }
            // 按照显示顺序插入Group 
            group.sort(sortBy("order"));

            entity = entity.concat(group);

            var result = { entity: entity, link: link, linkByGroup: group, relationship: topodata }
            res.json(200, result);
        })

    });

    app.get('/api/topology/level1V1', function(req, res) {

        topos.getEntitys(function(entitys) {

            topos.getLinks(function(links) {

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




    app.get('/api/topology/app', function(req, res) {
        res.setTimeout(3600 * 10000);
        //var device = '000492600549';
        var device;
        var config = configger.load();
        var ReportTmpDataPath = config.Reporting.TmpDataPath;
        var ReportOutputPath = config.Reporting.OutputPath;
        var crypto = require('crypto');
        var md5sum = crypto.createHash('md5');
        logger.info(" =========================================================== ");
        logger.info(" Begin topology for application.  " + Date());
        logger.info(" =========================================================== ");

        Report.initiatalApplicationInfo(function(apps) {
            var fs = require('fs');
            var fsname = path.join(ReportOutputPath, 'applicationInfo.json');
            fs.writeFileSync(fsname, '[\n');
            for (var i in apps) {
                var item = apps[i];

                //logger.info(item.maskingview);
                if (i == 0)
                    fs.appendFileSync(fsname, JSON.stringify(item) + '\n');
                else
                    fs.appendFileSync(fsname, ', ' + JSON.stringify(item) + '\n');
            }
            fs.appendFileSync(fsname, ']\n');


            logger.info(Date() + " ===== Get ApplicationInfo is done. ===== apps:" + apps.length);
            Report.E2ETopology(device, function(topoAll) {
                //Report.E2ETopologyTest(device, function(topoAll) {
                var masking = topoAll.masking;
                var zone = topoAll.zone;
                var nomarched_zone = topoAll.nomarched_zone;
                var nomarched_masking = topoAll.nomarched;
                var topo = topoAll.marched;

                logger.info(Date() + "===== Begin execute application capacity analysis ======");
                logger.info("========================================================");
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
                    logger.info(Date() + "===== End  execute application capacity analysis ======");
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
                logger.info(Date() + "===== execute write topology file ======");



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


                logger.info("finalRecords_new record number: " + finalRecords_new.length);

                var fsname = ReportOutputPath + '//' + 'topology.json';
                fs.writeFileSync(fsname, '[\n');
                for (var i in finalRecords_new) {
                    var item = finalRecords_new[i];

                    //logger.info(item.maskingview);
                    if (i == 0)
                        fs.appendFileSync(fsname, JSON.stringify(item) + '\n');
                    else
                        fs.appendFileSync(fsname, ', ' + JSON.stringify(item) + '\n');
                }
                fs.appendFileSync(fsname, ']\n');

                logger.info("finalRecords_all record number: " + finalRecords_all.length);

                var fsname = ReportOutputPath + '//' + 'topology_all.json';
                fs.writeFileSync(fsname, '[\n');
                for (var i in finalRecords_all) {
                    var item = finalRecords_all[i];

                    //logger.info(item.maskingview);
                    if (i == 0)
                        fs.appendFileSync(fsname, JSON.stringify(item) + '\n');
                    else
                        fs.appendFileSync(fsname, ', ' + JSON.stringify(item) + '\n');
                }
                fs.appendFileSync(fsname, ']\n');


                var json2xls = require('json2xls');
                var xls = json2xls(finalRecords_new);
                var outputFilename = ReportOutputPath + '//' + 'topology.xlsx';
                logger.info("Write Result to file [" + outputFilename + "]");
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

                logger.info(Date() + "===== execute write lunmappping file ======");


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

                    //logger.info(item.maskingview);
                    if (i == 0)
                        fs.appendFileSync(fsname, JSON.stringify(item) + '\n');
                    else
                        fs.appendFileSync(fsname, ', ' + JSON.stringify(item) + '\n');
                }
                fs.appendFileSync(fsname, ']\n');



                var xls1 = json2xls(lunTopoViews);

                var outputFilename1 = ReportOutputPath + '//' + 'lunmapping.xlsx';
                logger.info(Date() + "Write Result to file [" + outputFilename1 + "]");
                fs.writeFileSync(outputFilename1, xls1, 'binary');

                logger.info(Date() + "===== execute write mongo record ======");



                var newRecord = new AppTopologyObj(appTopologyRecord);

                newRecord.save(function(err, thor) {
                    if (err) {
                        return res.json(400, err);
                    } else
                        logger.info(Date() + " FINISHED ! ");
                    logger.info("========================================================");

                    res.json(200, ret);
                });


            });
        });


    });


    app.get('/api/topology/app/vplex', function(req, res) {
        var device;
        async.waterfall([
            function(callback) {

                VPLEX.getVplexStorageViews(device, function(sg) {
                    callback(null, sg);

                });

            },
            function(arg1, callback) {

                var results = [];
                for (var i in arg1) {
                    var item = arg1[i];
                    for (var j in item.inits) {
                        var initItem = item.inits[j];
                        var hostname = initItem.replace(/_HBA[0-9]/g, '');

                        for (var z in item.vvol) {
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
                for (var i in results) {
                    var item = results[i];
                    var issame = false;
                    for (var j in unduprecords) {
                        var item1 = unduprecords[j];
                        for (var field in item) {
                            if (item[field] == item1[field]) {
                                issame = true;
                                continue;
                            } else {
                                issame = false;
                                break;
                            }
                        }
                        if (issame == true) break;
                    }

                    if (issame == false)
                        unduprecords.push(item);
                }
                callback(null, unduprecords);

            },
            // Search back array lun info;
            function(arg1, callback) {

                VPLEX.GetStorageVolumeByDevices(device, function(result) {
                    for (var i in arg1) {
                        var item = arg1[i];
                        for (var j in result) {
                            var lunItem = result[j];
                            if (item.backarray_lunwwn == lunItem.vplexStorageVolumeSN) {
                                if (item.vplex_svname.indexOf(lunItem.maskviewName) < 0)
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

        ], function(err, result) {
            var config = configger.load();
            var ReportOutputPath = config.Reporting.OutputPath;
            var fs = require('fs');

            var json2xls = require('json2xls');
            var xls = json2xls(result);
            var outputFilename = ReportOutputPath + '//' + 'topology-vplex.xlsx';
            logger.info("Write Result to file [" + outputFilename + "]");
            fs.writeFileSync(outputFilename, xls, 'binary');

            res.json(200, result);
        });


    });

};

module.exports = topologyController;