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
var healthcheckInfo = require('../config/SSHHostInfo')
var fs = require('fs');
var SSH = require('../lib/ssh');



module.exports = {
    VMAX,
    Brocade,
    Unity,
    VNX
}



function VMAX(reportpath, startdatetime, callback) {

    var config = configger.load();
    var hostinfo = healthcheckInfo.VMAX_SE.hostinfo;
    var cmds = healthcheckInfo.VMAX_SE.cmds;

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

console.log(json1);

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
                                    if (item !== undefined && item.severity !== undefined) {
                                        if (summaryItem[item.severity] === undefined) summaryItem[item.severity] = 0;
                                        summaryItem[item.severity]++
                                    }
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
                    if (item !== undefined && item.severity !== undefined) {
                        var sheetname = `${item.severity}(${symid.substr(symid.length - 4, symid.length)})`;
                        if (detailsheets[sheetname] === undefined) detailsheets[sheetname] = [];
                        detailsheets[sheetname].push(item);
                    }
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
                            if (fieldname == 'failed')
                                var sheetname = `ComponentFailed(${symid.substr(symid.length - 4, symid.length)})`;
                            else if (fieldname == 'degraded')
                                var sheetname = `ComponentDegraded(${symid.substr(symid.length - 4, symid.length)})`;
                            else
                                var sheetname = `${fieldname}(${symid.substr(symid.length - 4, symid.length)})`;

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

            var filename = `HealthCheck_VMAX_${dt.year}${dt.month}${dt.day}.xlsx`;
            var outputFilename = path.join(reportpath, filename);
            XLSX.writeFile(wb, outputFilename);

            //FormatExcelFile_VMAX(outputFilename, function (file) {
                //callback(file)
            //})
		callback(outputFilename)



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

    if (disks instanceof Array) {
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
    } else {
        var diskItem = disks["Disk_Info"];

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


/*
    Brocade Switch Health Check
*/

function Brocade(reportpath, startdatetime, callback) {

    var config = configger.load();
    var hostinfo = healthcheckInfo.Brocade.hostinfo;
    var cmds = healthcheckInfo.Brocade.cmds;

    for (var i in hostinfo) {
        var item = hostinfo[i];
        if (item.privateKey !== undefined)
            item.privateKey = fs.readFileSync(item.privateKey);
    }

    async.waterfall(
        [
            function (callback) {

                var pattern = /Fabric OS:  v([0-9.]+)[a-z]\n/
                async.mapSeries(hostinfo, function (hostinfoItem, subcallback) {

                    console.log(hostinfoItem)
                    async.waterfall(
                        [
                            function (callback1) {
                                SSH.remoteCommand(hostinfoItem, "switchshow; version", function (output) {
                                    console.log(output);
                                    var switchname1 = /switchName:[\t](.*?)\n/.exec(output);
				    if ( switchname1 === undefined || switchname1 === null ) var switchname = ""; 
				    else var switchname = switchname1[1];

                                    var switchstatus1= /switchState:[\t ]*(.*?)[ ]*\n/.exec(output);
				    if ( switchstatus1 === undefined || switchstatus1 === null ) var switchstatus = ""; 
				    else var switchstatus = switchstatus1[1];


                                    var switchdomain1= /switchDomain:[\t ]*(.*?)\n/.exec(output);
				    if ( switchdomain1 === undefined || switchdomain1 === null ) var switchdomain = ""; 
				    else var switchdomain = switchdomain1[1];


                                    var switchinfo = {
                                        "switchname": switchname,
                                        "managementip": hostinfoItem.host,
                                        "switchstatus": switchstatus,
                                        "switchDomain": switchdomain,
                                        "switchOSVersion": /Fabric OS:[\t ]*(.*?)\n/.exec(output)[1]
                                    }
                                    callback1(null, switchinfo);

                                })
                            },
                            function (switchinfo, callback1) {
console.log(JSON.stringify(switchinfo,2,2));

                                var version = switchinfo.switchOSVersion;
console.log(version)
                                var version1 = /v([0-9.]+)[a-z]*/.exec(version)[1];
                                var v1 = version1.split('.');
console.log(version1+','+v1);
				var v2 = v1[0]+'.'+v1[1];
				var v3 = parseFloat(v2);

                                //if ((v1[0] >= 7) && (v1[1] >= 4)) {
				if ( v3 >= 7.4 ) {
                                    var cmd = "mapsdb --show"
                                } else {
                                    var cmd = "switchstatusshow"
                                }
console.log("Execute cmd:" + cmd);
                                SSH.remoteCommand(hostinfoItem, cmd, function (output) {
                                    console.log(output);
                                    var HealthStatus1 = /SwitchState:[\t ]*(.*?)\n/.exec(output);
                                    var HealthStatus2= /Current Switch Policy Status:[\t ]*(.*?)\n/.exec(output);

console.log("-------");
console.log( HealthStatus1 + ',' + HealthStatus2);
console.log("*********");

				    if ( HealthStatus1 !== undefined && HealthStatus1 != null) 
					var HealthStatus = HealthStatus1[1];
				    else if ( HealthStatus2 !== undefined && HealthStatus2 != null ) 
					var HealthStatus = HealthStatus2[1];
				    else var HealthStatus = "";
console.log("---------|"+HealthStatus+"|--------------\n");

                                    switchinfo["HealthStatus"] = HealthStatus;
                                    switchinfo["HealthStatusOutput"] = output;
                                    callback1(null, switchinfo);

                                })
                            }],
                        function (err, result) {
                            subcallback(null, result);
                        })

                },
                    function (err, result) {

                        callback(null, result);
                    }
                )

            },
            function (param, callback) {

                callback(null, param);
            }
        ], function (err, result) {

            var summary = [];
            var detail = {};
            for (var i in result) {
                var item = result[i];
                var newItem = {};
                for (var fieldname in item) {
                    if (fieldname == 'HealthStatusOutput') {

                        continue;
                    }
                    newItem[fieldname] = item[fieldname];
                }
                summary.push(newItem);

                if (item["HealthStatus"] != 'HEALTHY') {
                    detail[item.switchname] = item.HealthStatusOutput;
                }
            }
            // Summary 
            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.json_to_sheet(summary);
            XLSX.utils.book_append_sheet(wb, ws, "Health Check Summary");

            console.log(detail);


            // Write each sheet to the excel files
            for (var sheetname in detail) {
                var detaildata = detail[sheetname];
                var dd = [];
                var itemdd = { "detail": detaildata }
                dd.push(itemdd);
                var ws1 = XLSX.utils.json_to_sheet(dd);
                XLSX.utils.book_append_sheet(wb, ws1, sheetname);

            }

            var filename = `HealthCheck_Brocade_${startdatetime}.xlsx`;
            var outputFilename = path.join(reportpath, filename);
            XLSX.writeFile(wb, outputFilename);

            //reformat excel file
            //FormatExcelFile_Brocade(outputFilename);

            callback(outputFilename)

        });
};


function FormatExcelFile_Brocade(xlFilePath) {
    var Excel = require("exceljs");// load exceljs module
    var workbook = new Excel.Workbook();
    workbook.xlsx.readFile(xlFilePath).then(function () {
        async.waterfall(
            [
                function (callback) {
                    //  -------------------------------
                    // Check the heath status 

                    var switchs = [];
                    var ws = workbook.getWorksheet("Health Check Summary");
                    for (var i in ws.columns) {
                        var colItem = ws.columns[i];
                        colItem.width = 20;
                    }

                    var healthStatusCellID;
                    var switchNameCellID;
                    ws.eachRow(function (row, rowID) {
                        //console.log("Current Row:" + rowID);
                        var switchname;
                        row.eachCell(function (cell, colID) {
                            if (rowID == 1 && cell.value == "switchname") switchNameCellID = colID
                            if (rowID == 1 && cell.value == "HealthStatus") healthStatusCellID = colID;
                            //console.log(`rowid=${rowID} colID=${colID} value=${cell.value} healthID=${healthStatusCellID} switchname=${switchname}`)
                            if (rowID > 1) {
                                if (colID == switchNameCellID) switchname = cell.value;
                                if (colID == healthStatusCellID) {
                                    if (cell.value !== "HEALTHY") {
                                        cell.fill = {
                                            type: 'pattern',
                                            pattern: 'solid',
                                            fgColor: { argb: 'FFFF0000' },
                                            bgColor: { argb: 'FF0000FF' }
                                        };
                                        if (switchname !== undefined) {
                                            cell.value = { text: cell.value, hyperlink: '#\'' + switchname + '\'!A1' };
                                            switchs.push(switchname);
                                        }

                                    }
                                }
                            }

                        });
                        callback(null, switchs);
                    });

                },
                function (switchs, callback) {
                    // format each switch sheet 
                    workbook.eachSheet(function (ws, wsid) {
                        //console.log(`worksheet[${wsid}]: ${ws.name}`);
                        if (ws.name != "Health Check Summary") {
                            ws.columns[0].width = 100;
                            ws.eachRow(function (row, rowID) {
                                row.eachCell(function (cell, colID) {
                                    if (rowID == 1 && colID == 1) {
                                        cell.value = { text: 'Health Check Detail', hyperlink: '#\'' + "Health Check Summary" + '\'!A1' };
                                        console.log(cell.value)
                                    }
                                    if (rowID == 2) {
                                        cell.alignment = { wrapText: true };
                                        callback(null, switchs);
                                    }
                                    console.log("Cell Value=" + cell.value + " for cell [" + rowID + "]" + "[" + colID + "]");
                                });


                            });
                        }
                    })

                }
            ],
            function (err, result) {
                workbook.xlsx.writeFile(xlFilePath);
            })




    });
}




function FormatExcelFile_VMAX(xlFilePath, callback) {
    var Excel = require("exceljs");// load exceljs module
    var workbook = new Excel.Workbook();
    workbook.xlsx.readFile(xlFilePath).then(function () {
        async.waterfall(
            [
                function (callback) {
                    //  -------------------------------
                    // Check the heath status 
                    workbook.eachSheet(function (ws, wsid) {
                        var devices = [];
                        if (ws.name == "Health Check Summary") {
                            for (var i in ws.columns) {
                                var colItem = ws.columns[i];
                                colItem.width = 20;
                            }

                            var deviceCellID, device, subDeviceID;
                            var FatalCellID, faildiskCellID, ComponentDegradedCellID, ComponentFailedCellID, InformationalCellID, WarningCellID
                            ws.eachRow(function (row, rowID) {
                                //console.log("Current Row:" + rowID);
                                var devicename;
                                row.eachCell(function (cell, colID) {
                                    if (rowID == 1) {
                                        if (cell.value == "device") deviceCellID = colID;
                                        if (cell.value == "Fatal") FatalCellID = colID;
                                        if (cell.value == "Warning") WarningCellID = colID;
                                        if (cell.value == "Informational") InformationalCellID = colID;
                                        if (cell.value == "ComponentFailed") ComponentFailedCellID = colID;
                                        if (cell.value == "ComponentDegraded") ComponentDegradedCellID = colID;
                                        if (cell.value == "faildisk") faildiskCellID = colID;
                                    }
                                    console.log(`rowid=${rowID} colID=${colID} value=${cell.value}`)
                                    if (rowID > 1) {
                                        if (colID == deviceCellID) {
                                            device = cell.value;
                                            subDeviceID = device.substr(device.length - 4, device.length)
                                        }
                                        switch (colID) {
                                            case FatalCellID:
                                                if (cell.value > 0) {
                                                    cell.fill = {
                                                        type: 'pattern',
                                                        pattern: 'solid',
                                                        fgColor: { argb: 'FFFF0000' },
                                                        bgColor: { argb: 'FFFFFF00' }
                                                    };

                                                    if (device !== undefined) {
                                                        var sheetname = `Fatal(${subDeviceID})`;
                                                        console.log('-----' + device + ',' + subDeviceID);
                                                        cell.value = { text: cell.value, hyperlink: '#\'' + sheetname + '\'!A1' };
                                                    }

                                                }
                                                break;
                                            case faildiskCellID:
                                                if (cell.value > 0) {
                                                    cell.fill = {
                                                        type: 'pattern',
                                                        pattern: 'solid',
                                                        fgColor: { argb: 'FFFF0000' },
                                                        bgColor: { argb: 'FF0000FF' }
                                                    };

                                                    if (device !== undefined) {
                                                        var sheetname = `faildisk(${subDeviceID})`;
                                                        console.log('-----' + device + ',' + subDeviceID);
                                                        cell.value = { text: cell.value, hyperlink: '#\'' + sheetname + '\'!A1' };
                                                    }

                                                }
                                                break;
                                            case ComponentDegradedCellID:
                                                if (cell.value > 0) {
                                                    cell.fill = {
                                                        type: 'pattern',
                                                        pattern: 'solid',
                                                        fgColor: { argb: 'FFFF0000' },
                                                        bgColor: { argb: 'FF0000FF' }
                                                    };

                                                    if (device !== undefined) {
                                                        var sheetname = `ComponentDegraded(${subDeviceID})`;
                                                        console.log('-----' + device + ',' + subDeviceID);
                                                        cell.value = { text: cell.value, hyperlink: '#\'' + sheetname + '\'!A1' };
                                                    }

                                                }
                                                break;
                                            case ComponentFailedCellID:
                                                if (cell.value > 0) {
                                                    cell.fill = {
                                                        type: 'pattern',
                                                        pattern: 'solid',
                                                        fgColor: { argb: 'FFFF0000' },
                                                        bgColor: { argb: 'FF0000FF' }
                                                    };

                                                    if (device !== undefined) {
                                                        var sheetname = `ComponentFailed(${subDeviceID})`;
                                                        console.log('-----' + device + ',' + subDeviceID);
                                                        cell.value = { text: cell.value, hyperlink: '#\'' + sheetname + '\'!A1' };
                                                    }

                                                }
                                                break;
                                            case InformationalCellID:
                                                if (cell.value > 0) {
                                                    cell.fill = {
                                                        type: 'pattern',
                                                        pattern: 'solid',
                                                        fgColor: { argb: 'FF00FF00' },
                                                        bgColor: { argb: 'FF0000FF' }
                                                    };

                                                    if (device !== undefined) {
                                                        var sheetname = `Informational(${subDeviceID})`;
                                                        console.log('-----' + device + ',' + subDeviceID);
                                                        cell.value = { text: cell.value, hyperlink: '#\'' + sheetname + '\'!A1' };
                                                    }

                                                }
                                                break;
                                            case WarningCellID:
                                                if (cell.value > 0) {
                                                    cell.fill = {
                                                        type: 'pattern',
                                                        pattern: 'solid',
                                                        fgColor: { argb: 'FFFFFF00' },
                                                        bgColor: { argb: 'FF0000FF' }
                                                    };

                                                    if (device !== undefined) {
                                                        var sheetname = `Warning(${subDeviceID})`;
                                                        console.log('-----' + device + ',' + subDeviceID);
                                                        cell.value = { text: cell.value, hyperlink: '#\'' + sheetname + '\'!A1' };
                                                    }

                                                }
                                                break;
                                            default:
                                                console.log(`nofind defined colID: rowid=${rowID} colID=${colID} value=${cell.value}`)
                                                break;
                                        }
                                    }

                                });
                                callback(null, devices);
                            });
                        } else {
                            for (var i in ws.columns) {
                                var colItem = ws.columns[i];
                                colItem.width = 30;
                            }
                            ws.eachRow(function (row, rowID) {
                                row.eachCell(function (cell, colID) {
                                    if (rowID == 1)
                                        cell.value = { text: cell.value, hyperlink: '#\'Health Check Summary\'!A1' };
                                });
                            });
                        }


                    })

                }
            ],
            function (err, result) {
                workbook.xlsx.writeFile(xlFilePath);
                callback(xlFilePath);
            })




    });
}






function Unity(reportpath, startdatetime, callback) {
    var hostinfo = healthcheckInfo.Unity.hostinfo;
    async.map(hostinfo, function (hostinfoItem, subcallback) {

        var URL = `https://${hostinfoItem.host}:${hostinfoItem.port}/api/instances/system/0`;
        var CookieJar = unirest.jar();
        var queryString = {
            'fields': 'id,serialNumber,health,name,model,avgPower,currentPower,internalModel,isAutoFailbackEnabled'
        };
        unirest.get(URL)
            .auth(hostinfoItem.username, hostinfoItem.password, true)
            .headers({
                'Content-Type': 'application/json',
                'X-EMC-REST-CLIENT': 'true'
            })
            .query(queryString)
            .jar(CookieJar)
            .end(function (response) {
                if (response.error) {
                    console.log(response.error);
                    return response.error;
                } else {
                    var MOD_AUTH_CAS_S = response.request.headers.cookie;
                    var resultRecord = response.body.content;
                    var newRecord = {
                        serialNumber: resultRecord.serialNumber,
                        name: resultRecord.name,
                        model: resultRecord.model,
                        isAutoFailbackEnabled: resultRecord.isAutoFailbackEnabled,
                        currentPower: resultRecord.currentPower,
                        avgPower: resultRecord.avgPower,
                        healthStatus: resultRecord.health.descriptionIds[0],
                        healthDescriptions: resultRecord.health.descriptions[0]
                    }
                    subcallback(null, newRecord);
                }

            });
    },
        function (err, result) {
            // Summary 
            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.json_to_sheet(result);
            XLSX.utils.book_append_sheet(wb, ws, "Health Check Summary");

            var filename = `HealthCheck_Unity_${startdatetime}.xlsx`;
            var outputFilename = path.join(reportpath, filename);
            XLSX.writeFile(wb, outputFilename);
            callback(outputFilename);
        }

    );
}




function VNX(reportpath, startdatetime, callback) {

    var config = configger.load();
    var clihostinfo = healthcheckInfo.VNX.hostinfo;
    var sphostinfo = healthcheckInfo.VNX.SPlist;

    async.waterfall(
        [
            function (callback) {

                var outputResult = [];
                async.mapSeries(clihostinfo, function (clihostinfoItem, subcallback1) {

                    async.mapSeries(sphostinfo, function (spItem, subcallback2) {
                        var cmd = `. ~/.bash_profile; ${spItem.cli} -h ${spItem.host} -user ${spItem.username} -password ${spItem.password} -scope ${spItem.scope} -Xml faults -list`
                        console.log(cmd);
                        console.log(spItem);
                        SSH.remoteCommand(clihostinfoItem, cmd, function (xmloutput) {
                            var options = {
                                object: true
                            };
                        console.log(cmd);
                        console.log(xmloutput);
                            var json1 = xml2json.toJson(xmloutput, options)
                            var json2 = { "clihostinfo": clihostinfoItem, "spinfo": spItem, "output": json1 }
                            subcallback2(null, json2);
                        })
                    },
                        function (err, result) {
                            subcallback1(null, result);

                        }
                    )  // async.map(sphostinfo)

                },
                    function (err, result) {

                        for (var i in result) {
                            for (var j in (result[i])) {
                                var item = result[i][j];
                                outputResult.push(item);
                            }
                        }
                        callback(null, outputResult);
                    }
                ) // async.map(clihostinfo)

            },
            function (outputJson, callback) {
                var newOutput = [];
                for (var i in outputJson) {
                    var item = outputJson[i];
                    var output = item.output;
                    var result = output.CIM.MESSAGE.SIMPLERSP.METHODRESPONSE.PARAMVALUE;

                    var newItem = {
                        "clihost": item.clihostinfo.host,
                        "sp_ip": item.spinfo.host,
                        "Subsystem": "",
                        "healthStatus": "Normally",
                        "output": result
                    }

                    var detailInfo = [];


		    
		    if ( Array.isArray(result) ) {
			console.log("is array");
		    } else {
			var result1 = [];
			result1.push(result);
			result = result1;
		    }
                    for (var j in result) {
                        var infoItem = result[j];
                        if (infoItem.NAME == "Faulted Subsystem") {
                            newItem.Subsystem = infoItem.VALUE;
                            newItem.healthStatus = "Faulted"
                        }
                        else {
                            var detailInfoItem = { "name": "", "status": "" }
                            var value = infoItem.VALUE;

                            if (value.trim() == "")
                                console.log("====" + value + "===" + value.trim() + "----");
                            else {
                                if (value !== undefined) {
                                    detailInfoItem.name = value.substr(0, value.lastIndexOf(":") - 1).trim();
                                    detailInfoItem.status = value.substr(value.lastIndexOf(":") + 1, value.length).trim();
                                    detailInfo.push(detailInfoItem);
                                }
                            }
                        }

                    }

		    if ( newItem.healthStatus == "Faulted" )  
                    	newItem["detail"] = detailInfo;
	            else 
                    	newItem["detail"] = [];

                    newOutput.push(newItem);
                }



                callback(null, newOutput);
            }
        ], function (err, result) {


		var result1 = [];
		var detailsheets= {};
		for ( var i in result ) {
		   var item = result[i];
		   var item1 = {};
		   item1.spip = item.sp_ip;
		   item1.subsystem= item.subsystem;
		   item1.status = item.healthStatus;
		   result1.push(item1);

		   var sheetname = item1.spip;
		   detailsheets[sheetname] = item.detail;


		}

            var wb = XLSX.utils.book_new();
            var ws = XLSX.utils.json_to_sheet(result1);
            XLSX.utils.book_append_sheet(wb, ws, "Health Check Summary");



            // Write each sheet to the excel files
            for (var sheetname in detailsheets) {
                var detaildata = detailsheets[sheetname];
                if (detaildata.length > 0) {
                    var ws1 = XLSX.utils.json_to_sheet(detaildata);
                    XLSX.utils.book_append_sheet(wb, ws1, sheetname);
                }

            }


            var filename = `HealthCheck_VNX_${startdatetime}.xlsx`;
            var outputFilename = path.join(reportpath, filename);
            XLSX.writeFile(wb, outputFilename);

            //reformat excel file
            //FormatExcelFile_Brocade(outputFilename);

            callback(outputFilename)

        });


};
