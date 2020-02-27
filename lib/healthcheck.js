"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('healthcheckController')
var async = require('async');

var configger = require('../config/configger');
var fs = require('fs');
var path = require('path');
var xml2json = require('xml2json');
var XLSX = require('xlsx');
var healthcheckInfo = require('../config/SEHosts')
var fs = require('fs');
var SSH = require('../lib/ssh');



module.exports = {
    VMAX
}



function VMAX(reportpath, startdatetime, callback) {

    var config = configger.load();
    var hostinfo = healthcheckInfo.hostinfo;
    var cmds = healthcheckInfo.cmds;

    for (var i in hostinfo) {
        var item = hostinfo[i];
        item.privateKey = fs.readFileSync(item.privateKey);
    }

    var dt = {
        year: startdatetime.substring(0, 4),
        month: startdatetime.substring(4, 6),
        day: startdatetime.substring(6, 8),
        hour: startdatetime.substring(8, 10),
        min: startdatetime.substring(10, 12),
        sec: startdatetime.substring(12, 14),
    }
    var syseventStarttime = `${dt.month}/${dt.day}/${dt.year}:${dt.hour}:${dt.min}:${dt.sec}`
    async.waterfall(
        [
            function (callback) {

                async.mapSeries(hostinfo, function (hostinfoItem, subcallback) {
                    SSH.remoteCommand(hostinfoItem, "symcfg list -output xml", function (xmloutput) {
                        var options = {
                            object: true
                        };
                        var json1 = xml2json.toJson(xmloutput, options)
                        var json = json1.SymCLI_ML.Symmetrix;
                        var symlist = [];
                        for (var i in json) {
                            var item = json[i];
                            symlist.push(item.Symm_Info);
                        }
                        var subResult = { hostinfo: hostinfoItem, symlist: symlist }
                        subcallback(null, subResult);
                    })
                },
                    function (err, result) {

                        var arraylist = [];
                        for (var i in result) {
                            var item = result[i];

                            var symlist = item.symlist;
                            var hostinfo = item.hostinfo;
                            for (var j in symlist) {
                                var symitem = symlist[j];
                                if (symitem.attachment != 'Local') continue;


                                symitem["hostinfo"] = hostinfo;

                                var isfind = false;
                                for (var z in arraylist) {
                                    var newSymItem = arraylist[z];
                                    if (newSymItem.symid == symitem.symid) {
                                        isfind = true;
                                        break;
                                    }
                                }
                                if (isfind == false) {
                                    arraylist.push(symitem);
                                }
                            }
                        }
                        /*
                        arraylist = [
                            {
                                "symid": "000296800706",
                                "attachment": "Local",
                                "model": "VMAX100K",
                                "microcode_version": "5977",
                                "cache_megabytes": "450560",
                                "devices": "1984",
                                "physical_devices": "1"
                            }
                        ]
                        */
                        callback(null, arraylist);
                    }
                )

            },
            function (param, callback) {
                var tasklist = [];
                for (var i in param) {
                    var item = param[i];

                    for (var cmdname in cmds) {
                        var cmdItem = cmds[cmdname];
                        cmdItem = cmdItem.replace(/<sid>/g, item.symid);
                        cmdItem = cmdItem.replace(/<startdatetime>/g, syseventStarttime);


                        var newItem = {};
                        for (var fieldname in item) {
                            newItem[fieldname] = item[fieldname];
                        }

                        var cmdinfo = { cmdname: cmdname, cmd: cmdItem }
                        newItem["cmdinfo"] = cmdinfo;
                        tasklist.push(newItem);
                    }
                }
                callback(null, tasklist);
            },
            function (tasklist, callback) {
                async.mapSeries(tasklist, function (taskItem, subcallback) {

                    var hostinfoItem = taskItem.hostinfo;
                    var cmdname = taskItem.cmdinfo.cmdname;
                    var cmd = taskItem.cmdinfo.cmd;

                    console.log(hostinfoItem.host);
                    console.log(cmd);

                    SSH.remoteCommand(hostinfoItem, cmd, function (xmloutput) {
                        var options = {
                            object: true
                        };
                        var json1 = xml2json.toJson(xmloutput, options)

                        switch (cmdname) {
                            case 'event':
                                var result = SymEventData(json1);
                                break;
                            case 'failed':
                            case 'degraded':
                                var result = SymEnvData(json1);
                                break;
                            case 'faildisk':
                                var result = SymDisk(json1);
                                break;

                        }
                        result["cmdname"] = cmdname;
                        console.log("-=---------------------------------");
                        subcallback(null, result);
                    })
                },
                    function (err, result) {
                        // reformat  
                        var reformaterResult = {};
                        for (var i in result) {
                            var item = result[i];

                            if (reformaterResult[item.cmdname] === undefined) reformaterResult[item.cmdname] = {};
                            reformaterResult[item.cmdname][item.symid] = item.data

                        }
                        callback(null, reformaterResult);
                    })

            },
            function (data, callback) {
                // Summary
                var summarys = [];

                for (var cmdname in data) {
                    var dataItem = data[cmdname];


                    for (var symid in dataItem) {

                        var isfind = false;
                        for (var i in summarys) {
                            var summaryItem1 = summarys[i];
                            if (summaryItem1.device == symid) {
                                isfind = true;
                                var summaryItem = summaryItem1;
                            }
                        }
                        if (isfind == false) {
                            var summaryItem = {
                                "device": symid,
                                "Fatal": 0,
                                "Warning": 0,
                                "Informational": 0,
                                "ComponentFailed": 0,
                                "ComponentDegraded": 0
                            }
                            summarys.push(summaryItem);
                        }
                        var symData = dataItem[symid];
                        switch (cmdname) {
                            case 'event':
                                for (var i in symData) {
                                    var item = symData[i];
                                    if (summaryItem[item.severity] === undefined) summaryItem[item.severity] = 0;
                                    summaryItem[item.severity]++
                                }
                                break;
                            case 'failed':
                                summaryItem["ComponentFailed"] = symData.length;
                                break;
                            case 'degraded':
                                summaryItem["ComponentDegraded"] = symData.length;
                                break;
                            case 'faildisk':
                                summaryItem["faildisk"] = symData.length;
                                break;
                        }
                    }
                }
                data["Health Check Summary"] = summarys;
                callback(null, data);
            }
        ], function (err, result) {

            // Summary 
            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.json_to_sheet(result["Health Check Summary"]);
            XLSX.utils.book_append_sheet(wb, ws, "Health Check Summary");

            var detailsheets = {};
            // Symmetrix Event detail - Fatal
            var events = result["event"];
            for (var symid in events) {
                var symItem = events[symid];
                for (var i in symItem) {
                    var item = symItem[i];
                    var sheetname = `${item.severity}(${symid.substr(symid.length - 4, symid.length)})`;
                    if (detailsheets[sheetname] === undefined) detailsheets[sheetname] = [];
                    detailsheets[sheetname].push(item);
                }
            }

            // Component Fail & Degrage

            for (var fieldname in result) {
                switch (fieldname) {
                    case 'failed':
                    case 'degraded':
                    case 'faildisk':
                        var componentData = result[fieldname];
                        for (var symid in componentData) {
                            var symItem = componentData[symid];
                            var sheetname = `${fieldname} (${symid.substr(symid.length - 4, symid.length)})`;
                            detailsheets[sheetname] = symItem;
                        }
                        break;
                    default:
                        continue;
                }
            }


            // Write each sheet to the excel files
            for (var sheetname in detailsheets) {
                var detaildata = detailsheets[sheetname];
                if (detaildata.length > 0) {
                    var ws1 = XLSX.utils.json_to_sheet(detaildata);
                    XLSX.utils.book_append_sheet(wb, ws1, sheetname);
                }

            }

            var filename = `HealthCheck_VMAX_${startdatetime}.xlsx`;
            var outputFilename = path.join(reportpath, filename);
            XLSX.writeFile(wb, outputFilename);

            callback(result)

        });


};


function SymEventData(data) {

    var data1 = data.SymCLI_ML.Symmetrix;
    var symid = data1.Symm_Info.symid;


    if (Array.isArray(data1.Event)) var events = data1.Event;
    else {
        var events = [];
        events.push(data1.Event);
    }

    var result = {
        "symid": symid,
        "data": events
    }

    return result;
}


function SymEnvData(data) {

    //console.log(JSON.stringify(data,1,2));
    var data1 = data.SymCLI_ML.Symmetrix;
    var symid = data1.Symm_Info.symid;
    var envdata = data1.EnvironmentData;
    var SystemBay = data1.SystemBay;

    var resultData = [];
    for (var componenttype in SystemBay) {

        switch (componenttype) {
            case 'StandbyPowerSupplies':
                var item = SystemBay[componenttype];
                for (var j in item.Module) {
                    var item1 = item.Module[j];

                    for (var z in item1.Module) {
                        var item2 = item1.Module[z];
                        var result = {
                            "SysBayName": SystemBay.sys_bay_name,
                            "ComponentType": componenttype,
                            "ModuleName": item1.module_name,
                            "ModuleState": item1.module_state,
                            "SubModuleName": item2.module_name,
                            "SubModuleState": item2.module_state
                        }
                        resultData.push(result);
                    }

                }

                break;
            case 'EnclosureSlot':
                var item1 = SystemBay[componenttype];
                if (Array.isArray(item1)) var item = item1[0];
                else item = item1;

                //console.log(JSON.stringify(item,1,2));
                for (var j in item.Module) {
                    var item1 = item.Module[j];

                    var result = {
                        "SysBayName": SystemBay.sys_bay_name,
                        "ComponentType": componenttype,
                        "ModuleName": `EnclosureSlot ${item.enclosure_number}`,
                        "ModuleState": item.enclosure_state,
                        "SubModuleName": item1.module_name,
                        "SubModuleState": item1.module_state
                    }
                    resultData.push(result);
                }

                for (var j in item.Director) {
                    var item1 = item.Director[j];

                    for (var z in item1.Module) {
                        var item2 = item1.Module[z];
                        var result = {
                            "SysBayName": SystemBay.sys_bay_name,
                            "ComponentType": componenttype,
                            "ModuleName": `EnclosureSlot ${item.enclosure_number}, Director ${item1.dir_slot_number}`,
                            "ModuleState": item1.dir_state,
                            "SubModuleName": item2.module_name,
                            "SubModuleState": item2.module_state
                        }
                        resultData.push(result);
                    }

                }

                break;
            case "Enclosure":
                var item1 = SystemBay[componenttype];
                if (Array.isArray(item1)) var item = item1[0];
                else item = item1;

                for (var z in item.Module) {
                    var item1 = item.Module[z];
                    var result = {
                        "SysBayName": SystemBay.sys_bay_name,
                        "ComponentType": componenttype,
                        "ModuleName": `Enclosure ${item.enclosure_number}`,
                        "ModuleState": item.enclosure_state,
                        "SubModuleName": item1.module_name,
                        "SubModuleState": item1.module_state
                    }
                    resultData.push(result);
                }

                break;
            case "LED":
                var item = SystemBay[componenttype];
                var result = {
                    "SysBayName": SystemBay.sys_bay_name,
                    "ComponentType": componenttype,
                    "ModuleName": `LED`,
                    "ModuleState": 'Normal',
                    "SubModuleName": item.Module.module_name,
                    "SubModuleState": item.Module.module_state
                }
                resultData.push(result);

                break;

            case "MatrixInterfaceBoardEnclosure":
                var item = SystemBay[componenttype];

                for (var z in item) {
                    var item1 = item[z];
                    var result = {
                        "SysBayName": SystemBay.sys_bay_name,
                        "ComponentType": componenttype,
                        "ModuleName": `MatrixInterfaceBoardEnclosure`,
                        "ModuleState": "Normal",
                        "SubModuleName": item1.mibe_name,
                        "SubModuleState": item1.mibe_state
                    }
                    resultData.push(result);
                }

                break;

            default:
                console.log(symid + " no process component : " + componenttype);
                break;

        }



    }

    var result = {
        "symid": symid,
        "data": resultData
    }

    return result;
}

function SymDisk(data) {

    //console.log(JSON.stringify(data,1,2))
    var data1 = data.SymCLI_ML.Symmetrix;
    var symid = data1.Symm_Info.symid;
    var disks = data1.Disk === undefined ? [] : data1.Disk;

    var resultData = [];

    for (var i in disks) {
        var item = disks[i];
        var diskItem = item["Disk_Info"];

        var resultItem = {
            "Ident": diskItem.ident,
            "Int": diskItem.interface,
            "TID": diskItem.tid,
            "Grp": diskItem.disk_group,
            "GrpName": diskItem.disk_group_name,
            "Vendor": diskItem.vendor,
            "technology": diskItem.technology,
            "revision": diskItem.revision,
            "Hypr_MB": diskItem.hyper_size_megabytes,
            "Total_MB": diskItem.actual_megabytes,
            "Free_MB": diskItem.avail_megabytes,
            "spare_disk": diskItem.spare_disk,
            "failed_disk": diskItem.failed_disk,
            "service_state": diskItem.service_state
        }
        resultData.push(resultItem);
    }

    var result = {
        "symid": symid,
        "data": resultData
    }

    return result;
}
