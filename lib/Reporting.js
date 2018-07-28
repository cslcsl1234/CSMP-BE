"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var xls2json = require("xls-to-json");

var ReportStatusObj = mongoose.model('ReportStatus');
var ReportInfoObj = mongoose.model('ReportInfo'); 
var CallGet = require('./CallGet'); 
var configger = require('../config/configger');
var util = require('./util');
var moment = require('moment');
var VMAX = require('../lib/Array_VMAX');
var VNX = require('../lib/Array_VNX');
var SWITCH = require('../lib/Switch');

var DeviceMgmt = require('../lib/DeviceManagement');
var TEST = require('../tmp/test.json');
var AppTopologyObj = mongoose.model('AppTopology');

module.exports = { 
    generateReportStatus ,
    GetReportingInfoList , 
    GetArraysIncludeHisotry,
    GetArraysIncludeHisotry1,
    GetArraysIncludeHisotry2,

    E2ETopology,
    E2ETopologyTest,
    ArrayAccessInfos,
    GetApplicationInfo,
    getAppStorageRelation,
    getVMAXDirectorAddress,

    ApplicationCapacityAnalysis
    
}

/*

{
  "ID" : "ReportInfoID-GenerateTime",
  "ReportInfoID" : "xxxx",
  "Name" : "xxxx report",
  "GenerateTime" : "121212122112",
  "Status" : "running",
  "StatusTime" : "100012121212",
  "ReportFile" : "ReportInfoID-GenerateTime.docx",
  "ReportFileURL" : "../report/out/ReportInfoID-GenerateTime.docx",
  "ReportParamater" : [
      {
        "Name" : "device",
        "Value" : "yyyyyyy"
      },
      {
        "Name" : "Begin",
        "Value" : "12131213213"
      },
      {
        "Name" : "Count",
        "Value" : 12
      },
      {
        "Name" : "typename",
        "Value" : "yyyyyyy"
      }
  ]           
}


*/

function GetApplicationInfo( callback ) {


    
    var xlsFileName = '/csmp/reporting/resource/CMDBTOSTORAGE.csv';
    xls2json({
        input: xlsFileName,  // input xls
        output: null, // output json
        sheet: "CMDBTOSTORAGE"  // specific sheetname
      }, function(err, result) {
        if(err) {
          console.error(err);
        } else {
            var res = [];
            for ( var i in result ) {
                var item = result[i];
    
                item.WWN = item.WWN.replace(/:/g,"");
                item.WWN = item.WWN.replace(/^0x/,"");
                item.WWN = item.WWN.toUpperCase();
    
                var isfind = false;
                for ( var j in res ) {
                    var resItem = res[j];
                    if ( resItem['app'] == item['应用系统名称'] &&
                         resItem['host'] == item['主机名'] &&
                         resItem['WWN'] == item['WWN'] ) {
                            isfind = true;
                            break;
                    }
    
                }
                if ( isfind == false ) {
                    var resItem = {};
                    resItem['appShortName'] = item['应用系统简称'];
                    resItem['app'] = item['应用系统名称'];
                    resItem['appManagerA'] = item['应用管理员A'];
                    resItem['host'] = item['主机名']
                    resItem['hostRunType'] = item['主备状态'];
                    resItem['WWN'] = item['WWN'];
                    res.push(resItem);
                }
            }
            //console.log(res);
            callback(res);
        }
      });
    
}




function generateReportStatus(reportStatus , callback) {


        ReportStatusObj.findOne({"ID" : reportStatus.ID}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("Report status is not exist. insert it."); 

                var newreport = new ReportStatusObj(reportStatus);
                newreport.save(function(err, thor) {
                  if (err)  {

                    console.dir(thor);
                    callback(error);
                  } else 

                    callback("The Report status insert is succeeds!");
                });
            }
            else {  
                doc.update(reportStatus, function(error, course) {
                    if(error) callback(error);
                });


                callback( "The Report status has exist! Update it.");
            }

        });

};


function GetReportingInfoList(callback) {

      var data = {};
      var result=[];

        async.waterfall(
        [
            function(callback1){

                var query = ReportInfoObj.find({}).select({ "__v": 0, "_id": 0, "ReportParamater._id" : 0});

                query.exec(function (err, doc) { 
                    if (err) { 
                        return err;
                    }
                    if (!doc) {  
                        return [];
                    }
                    else { 
                        data['reportinfo'] = doc;
                        callback1(null,data);
                    }

                });


                  
            },
            // Get All report status Records
            function(param,  callback1){  

                    ReportStatusObj.find({}, { "__v": 0, "_id": 0, "ReportParamater._id": 0}, function (err, doc) {
                        //system error.
                        if (err) {
                            return  err;
                        }
                        if (!doc) { //user doesn't exist.
                            param['reportstatus'] = [];
                            callback1(null,param);
                        }
                        else {  
                            data['reportstatus'] = doc;
                            callback1(null,param);
                        }

                    });

            },
            function(param,  callback1){ 
 
                  var ret = [];
                  var reportinfo = param.reportinfo;

                  for ( var i in reportinfo ) {
                      var item = reportinfo[i];
                      var aa = JSON.parse(JSON.stringify(item));
                      aa['GeneratedCount'] = 0; 
                      for ( var j in param.reportstatus ) {
                          var statusItem = param.reportstatus[j]; 
                          //console.log(statusItem.ReportInfoID +'\t' +item.ID +'\t'+ statusItem.Status);
                          if ( statusItem.ReportInfoID == item.ID && statusItem.Status == 'complete') {
                              aa.GeneratedCount++;
                          }
                      }

                      ret.push(aa);
                      
                  }

                  callback1(null,ret);
            }
        ], function (err, result) {
              // result now equals 'done'
              callback(result);
        });






}



function GetArraysIncludeHisotry2(device, start,end, callback) {

    var result = {};
 

    async.waterfall([
        function(callback) { 


            var param = {}; 
            if (typeof arraysn !== 'undefined') { 
                param['filter'] = 'device=\''+device+'\'&(source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
            } else {
                param['filter'] = '!parttype&(source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
            } 
    
            //param['filter_name'] = '(name=\'RawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'PoolFreeCapacity\'|name=\'PoolUsableCapacity\'|name=\'PoolUsedCapacity\'|name=\'PoolOverheadCapacity\'|name=\'SystemUsedCapacity\'|name=\'UsedCapacity\'|name=\'BlockUsedCapacity\'|name=\'PrimaryUsedCapacity\'|name=\'LocalReplicaUsedCapacity\'|name=\'RemoteReplicaUsedCapacity\'|name=\'FreeCapacity\'|name=\'VirtualUsedCapacity\'|name=\'FileUsedCapacity\'|name=\'PoolSubscribedCapacity\'|name=\'ConfiguredRawCapacity\'|name=\'ConfiguredUsableCapacity\'|name=\'RAIDOverheadCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\')';
            param['filter_name'] = '(name=\'UsedCapacity\'|name=\'ConfiguredUsableCapacity\')';
            param['keys'] = ['serialnb'];
            param['fields'] = ['device','devdesc','sstype','vendor','model'];
            param['period'] = 3600;
            param['start'] = util.getConfStartTime('1d');
            param['type'] = 'last';


            CallGet.CallGet(param, function(param) {
                callback(null,param.result);
            });
            
    
        } 
    ], function (err, result) { 
  
        callback(result);
    });


}



function GetArraysIncludeHisotry(device, start,end, callback) {

    var result = {};
 

    async.waterfall([
        function(callback) { 
            var param = {};
            if (typeof device !== 'undefined') {  
                param['filter'] = 'device=\''+arraysn+'\'&!parttype&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
            } else { 
                //param['filter'] = '!parttype&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
                param['filter'] = '!parttype&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\')';
            } 
    
            param['filter_name'] = '(name=\'ConfiguredUsableCapacity\'|name=\'UsedCapacity\'|name=\'FreeCapacity\')';
            param['keys'] = ['serialnb'];
            param['fields'] = ['sstype','device','model','vendor','devdesc'];
            param['period'] = 86400;
            param['start'] = start;
            param['end'] = end;
            param['type'] = 'max';
            CallGet.CallGet(param, function(param) {
                callback(null,param.result);
            });
            
    
        } ,

        function( arg , callback ) {

            var res = [];
            for ( var i in arg ) {
                var item = arg[i];

                item['device'] = item.serialnb;

                var resItem = {};
                resItem["name"] = "";
                resItem["model"] = item.model;
                
                if ( item.model.indexOf('VMAX') >=0 )
                    resItem["type"] =  'High' ;
                else if ( item.model.indexOf('VNX') >=0 )
                    resItem["type"] =  'Middle' ;
                else 
                    resItem["type"] =  'Other' ;


                resItem["sn"] = item.device;
                resItem["logical_capacity_PB"] =  parseFloat((parseFloat(item.ConfiguredUsableCapacity) / 1024).toFixed(3)) ;
                resItem["allocated_capacity_PB"] = parseFloat( ( (parseFloat(item.UsedCapacity) + parseFloat(item.FreeCapacity) ) / 1024).toFixed(3)) ;
 
                res.push(resItem);
            }

            var lastMonth = util.getlastMonthByDate(start);


            var param = {};
            if (typeof device !== 'undefined') {  
                param['filter'] = 'device=\''+arraysn+'\'&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
            } else { 
                //param['filter'] = '!parttype&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
                param['filter'] = '!parttype&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\')';
            } 
    
    
            param['filter_name'] = '(name=\'ConfiguredUsableCapacity\'|name=\'UsedCapacity\'|name=\'FreeCapacity\')';
            param['keys'] = ['serialnb'];
            param['fields'] = ['sstype','device','model','vendor','devdesc'];
            param['period'] = 86400;
            param['start'] = lastMonth.firstDay;
            param['end'] = lastMonth.lastDay;
            param['type'] = 'max';
            CallGet.CallGet(param, function(param) {
                for ( var i in param.result) {
                    var item = param.result[i];

                    item['device'] = item.serialnb;

                    for ( var j in res ) {
                        var oriItem = res[j];
                        if ( item.device == oriItem.sn ) {
                            oriItem["logical_capacity_last_month_PB"] = parseFloat((parseFloat(item.ConfiguredUsableCapacity) / 1024).toFixed(3)) ;
                            oriItem["allocated_capacity_last_month_PB"] = parseFloat( ( (parseFloat(item.UsedCapacity) + parseFloat(item.FreeCapacity) ) / 1024).toFixed(3)) ;
                                                       
                        }
                    }
                }
                callback(null,res);
            });
                       
        } ,
        function( arg , callback ) {
 

            var lastYear = util.getlastYearByDate(start);


            var param = {};
            if (typeof device !== 'undefined') {  
                param['filter'] = 'device=\''+arraysn+'\'&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
            } else { 
                //param['filter'] = '!parttype&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
                param['filter'] = '!parttype&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\')';
            } 
    
    
            param['filter_name'] = '(name=\'ConfiguredUsableCapacity\'|name=\'UsedCapacity\'|name=\'FreeCapacity\')';
            param['keys'] = ['serialnb'];
            param['fields'] = ['sstype','device','model','vendor','devdesc'];
            param['period'] = 604800;
            param['start'] = lastYear.firstDay;
            param['end'] = lastYear.lastDay;
            param['type'] = 'max';
            CallGet.CallGet(param, function(param) {
                for ( var i in param.result) {
                    var item = param.result[i];

                    item['device'] = item.serialnb;

                    for ( var j in arg ) {
                        var oriItem = arg[j];
                        if ( item.device == oriItem.sn ) {
                            oriItem["logical_capacity_last_year_PB"] =  parseFloat((parseFloat(item.ConfiguredUsableCapacity) / 1024).toFixed(3)) ;
                            oriItem["allocated_capacity_last_year_PB"] = parseFloat( ( (parseFloat(item.UsedCapacity) + parseFloat(item.FreeCapacity) ) / 1024).toFixed(3)) ;
                                                       
                        }
                    }
                }
                callback(null,arg);
            });
                       
        }
    ], function (err, result) { 
  
        callback(result);
    });


}



function GetArraysIncludeHisotry1(device, callback) {

    var result = {};

    async.waterfall([
        function(callback) {  
            VMAX.GetArrays(device, function(param) {
                result["arrays"] = param;
                callback(null,result);
            });

        }, 
        function(arg,  callback){   
            VNX.GetArrays(device, function(res) {
                for ( var i in res ) {
                    arg.arrays.push(res[i]);
                }
                callback(null,arg);
            });
        },
        // Get All Localtion Records
        function(param,  callback){   

            VMAX.GetArraysHistory(device, function(res) {
                param["arraysHistory"] = res;
                callback(null,param); 
             });
        }, 
        function(arg,  callback){    
            VNX.GetArraysHistory(device, function(res) { 
               for ( var i in res.PeriousMonth ) {
                   arg.arraysHistory.PeriousMonth.push(res.PeriousMonth[i]);
               }
               for ( var i in res.PeriousYear ) {
                arg.arraysHistory.PeriousYear.push(res.PeriousYear[i]);
            }
               callback(null,arg);
            });
        }
    ], function (err, result) {   
        var finalResult = {};
        var items = [];
        for ( var i in result.arrays ) {
            var item = result.arrays[i]; 
            var resultItem = {};
            resultItem["name"] = ""; 
            resultItem["model"] = item.model;
            if ( item.model.indexOf("VMAX") >= 0 )
                 resultItem["type"] = "High";   // High/Middle
            else 
                 resultItem["type"] = "Middle"

            resultItem["sn"] = item.device;
            resultItem["logical_capacity_PB"] = Math.round(item.ConfiguredUsableCapacity / 1000 );

            resultItem["allocated_capacity_PB"] = Math.round(item.UsedCapacity / 1000 );
            resultItem["allocated_capacity_last_year_PB"] = Math.round(item.logical_capacity_PB / 1000 );

            for ( var j in result.arraysHistory.PeriousMonth ) {
                var hisItem = result.arraysHistory.PeriousMonth[j];
                if ( hisItem.device == item.device ) {
                    resultItem["logical_capacity_last_month_PB"] = Math.round(( ( isNaN(hisItem.ConfiguredUsableCapacity) == true ) ? 0 : hisItem.ConfiguredUsableCapacity ) / 1000 );
                    resultItem["allocated_capacity_last_month_PB"] = Math.round( (   ( isNaN(hisItem.UsedCapacity) == true ) ? 0 : hisItem.UsedCapacity ) / 1000 );
                    break;
                }
            }

            for ( var j in result.arraysHistory.PeriousYear ) {
                var hisItem = result.arraysHistory.PeriousYear[j];
                if ( hisItem.device == item.device ) {
                    resultItem["logical_capacity_last_year_PB"] = Math.round( ( ( isNaN(hisItem.ConfiguredUsableCapacity) == true ) ? 0 : hisItem.ConfiguredUsableCapacity ) / 1000 );
                    resultItem["allocated_capacity_last_year_PB"] = Math.round( ( ( isNaN(hisItem.UsedCapacity) == true ) ? 0 : hisItem.UsedCapacity ) / 1000 );
                    break;
                }
            } 

            items.push(resultItem);
        }

        finalResult["data"] = items;
       callback(finalResult);
    });


}

function ArrayAccessInfos(device, callback) {

    async.waterfall([

        function(callback) { 
            console.log(Date()+" --- GetMaskViews is begin ---");
            
            var finalResult = [];


            VMAX.GetMaskViews(device, function(res) {  
                for ( var i in res ) {
                    var item = res[i];
                    var resultItem = {};
                    
                    var res1 = {};
                    res1["dirnport"] = item.dirnport;
                    


                    res1["Capacity"] = item.Capacity;
                    res1["sn"] = item.device;
                    res1["ip"] = "";
                    
                    res1["part"] = item.part;
                    res1["initgrp"] = item.initgrp;
                    res1["portgrp"] = item.portgrp;
                    res1["sgname"] = item.sgname;
 
                    res1["initgrp_member"] = item.initgrp_member;
                    res1["portgrp_member"] = item.portgrp_member;
                    res1["sg_member"] = item.sg_member;


                    finalResult.push(res1);
                }
                callback(null,finalResult);
            }); 

        }, 




        function(arg,  callback){  
            console.log("=====================================");
            console.log(Date() + " --- VNX getmasking is begin ---");
            VNX.GetMaskViews(function(res) {  
                for ( var i in res ) {
                    var item = res[i];


                    arg.push(item);
                }

                callback(null,arg);

            });
        } ,

        // Add Device list field 
        function (arg ,callback) {

            for ( var i in arg ) {
                var item = arg[i];
                var deviceList = ""

                for ( var j in item.sg_member ) {
                    var devItem = item.sg_member[j]; 

                    if ( item["Devices"] === undefined ) 
                        item["Devices"] = devItem.part;
                    else 
                        item["Devices"] = item.Devices + ',' + devItem.part;

                    if ( item["lunname"] === undefined ) 
                        item["lunname"]  = devItem.lunname;
                    else 
                        item["lunname"] = item.lunname +',' +devItem.lunname;
                } 
            }
            callback(null,arg);
        },
        function(arg,  callback){  

            for ( var i in arg ) {
                var item = arg[i];

                var wwnlist = "";
                for ( var i in item.initgrp_member ) {
                    wwnlist = wwnlist + "|"+item.initgrp_member[i];
                }
                for ( var j in item.portgrp_member ) {
                    wwnlist = wwnlist + "|" + item.portgrp_member[j].portwwn;
                }
                item["wwnlist"] = wwnlist; 

            }
            callback(null,arg);
 
        }  


    ], function (err, result) { 
        console.log(" --- return  is begin ---");

        callback(result);
    });

}

function E2ETopologyTest(device , callback ) {
    var config = configger.load(); 
    var ReportTmpDataPath = config.Reporting.TmpDataPath;
    var retrunRecord = {};
    retrunRecord.marched = require(ReportTmpDataPath + '//'+ 'marched');
    retrunRecord.nomarched_zone =  require(ReportTmpDataPath + '//'+ 'nomarched_zoning');
    retrunRecord.nomarched =  require(ReportTmpDataPath + '//'+ 'nomarched_masking');
        
    retrunRecord.masking = require(ReportTmpDataPath + '//'+ 'masking');
    retrunRecord.zone = require(ReportTmpDataPath + '//'+ 'zoning');

    callback(retrunRecord);

}

function E2ETopology(device, callback) {
    var config = configger.load(); 
    var ReportTmpDataPath = config.Reporting.TmpDataPath;
    var ReportOutputPath = config.Reporting.OutputPath;

    var finalResult = [];

    async.waterfall([
        function(callback) {
            var arrayInfo = require("../config/StorageInfo");
            var resInfo = {};
            for ( var i in arrayInfo ) {
                var item = arrayInfo[i];

                if ( item.name.indexOf("VNX") >= 0 | item.name.indexOf("UNITY") >= 0  ) {
                    resInfo[item.name] = item;
                } else 
                    resInfo[item.storagesn] = item;
            } 
            callback(null,resInfo);
        }, 
        function(arrayInfo, callback) { 
            console.log(Date()+" --- GetMaskViews is begin ---");
            ArrayAccessInfos(device, function(res) { 
                
                var fs1 = require('fs'); 
                 var wstream = fs1.createWriteStream(ReportTmpDataPath + '//' + 'masking.json');  
                          
                 wstream.write('[');
                 for ( var i in res ) {
                     var item = res[i]; 
                     if ( i == 0 ) wstream.write(JSON.stringify(item) +'\n');
                     else wstream.write(', ' + JSON.stringify(item) +'\n');
                 }
                 wstream.write(']\n');
                 wstream.end();    

                 for ( var i in res ) {
                     
                    var item = res[i];  

                    if ( item.sn !== undefined )  {
                        var array = item.sn;
                    }
                    else if (  item.device.indexOf("VNX") >= 0 | item.device.indexOf("UNITY") >= 0  ) {
                        var array =  item.device;
                    }     
                        

                    if ( arrayInfo[array] === undefined ) {
                        item["arrayname"] = "";
                        item["arraytype"] = "";
                            
                    } else {
                        if ( item.sn !== undefined )  {
                            item["arrayname"] = arrayInfo[array].name;
                            item["arraytype"] = arrayInfo[array].type;
                        }
                        else if (  item.device.indexOf("VNX") >= 0 | item.device.indexOf("UNITY") >= 0  ) { 
                            item["arrayname"] = arrayInfo[array].name;
                            item["sn"] = arrayInfo[array].storagesn;
                            item["arraytype"] = arrayInfo[array].type;
                        }     

                    }

                 }

                var ret = {};
                ret["masking"] = res;



                callback(null,ret);
            });
        },
        function (arg , callback) {
           SWITCH.getZone(device, function(zonelist) { 

                var fs1 = require('fs');  
                 var wstream = fs1.createWriteStream(ReportTmpDataPath +'//' + 'zoning.json');  
                          
                 wstream.write('[');
                 for ( var i in zonelist ) {
                     var item = zonelist[i]; 
                     if ( i == 0 ) wstream.write(JSON.stringify(item) +'\n');
                     else wstream.write(', ' + JSON.stringify(item) +'\n');
                 }
                 wstream.write(']\n');
                 wstream.end();    
        


                arg["zone"] = zonelist;

                callback(null,arg);
           });
 
        } ,

        function ( arg, callback ) {

            var finalResult_marched = [];
            var finalResult_nomarched = [];

            var masking = arg.masking;
            var zoning = arg.zone;
            console.log("masking = [" + masking.length+"], zoning= ["+zoning.length+"]");

            for ( var masking_i in masking ) {
                var maskingItem = masking[masking_i];
                var isMarched = false ;

                if ( maskingItem.portgrp_member.length == 0 ) { 
                    var result = combineResultFromMasking(maskingItem,"portgrp is empty.");

                    for ( var i in result ) 
                        finalResult_marched.push(result[i]);

                    continue;
                }

                if ( masking_i % 1000 == 0 ) console.log("finished "+ masking_i + " in " + masking.length);
                for ( var zone_i in zoning ) {
                    var zoneItem = zoning[zone_i];
                    zoneItem["marchedCount"] = 0;
    
                    var hbaList = [];
                    var arrayList = []; 


                    for ( var initgrp_i in maskingItem.initgrp_member ) {
                        var initgrpItem = maskingItem.initgrp_member[initgrp_i];

                        for ( var zonemember_i in zoneItem.zonemembers ) {
                            var zonememberItem = zoneItem.zonemembers[zonemember_i];
                            //console.log("test2:" +zonememberItem.switchportConnectedWWN +'\t' + initgrpItem);
 
                            if ( zonememberItem.switchportConnectedWWN == initgrpItem ) {
                                var marchResult = combineMarchResult(zoneItem, zonememberItem,maskingItem, initgrpItem);
                                hbaList.push(marchResult);
                            }
                        }

                    } // for  initgrp_i 

                    for ( var portgrp_i in maskingItem.portgrp_member ) {
                        var portgrpItem = maskingItem.portgrp_member[portgrp_i];  
                        for ( var zonemember_i in zoneItem.zonemembers ) {
                            var zonememberItem = zoneItem.zonemembers[zonemember_i];
 
                            //console.log("test1:" +zonememberItem.switchportConnectedWWN +'\t' + portgrpItem.portwwn);
                            if ( zonememberItem.switchportConnectedWWN == portgrpItem.portwwn ) { 
                                var marchResult = combineMarchResult(zoneItem, zonememberItem,maskingItem, portgrpItem);
                                arrayList.push(marchResult);
                            }
                        }

                    } // for portgrp_i


 
                    //console.log("hbalist=["+hbaList.length+"], arrayList=["+arrayList.length+"]");
                    // ------------------------------------------------------------------

                    if ( hbaList.length > 0 && arrayList.length > 0 ) {
                        isMarched = true;
                        zoneItem.marchedCount++;
                        for ( var hba_i in hbaList ) {
                            var hbaItem = hbaList[hba_i];``
    
                            for ( var array_i in arrayList ) {
                                var arrayItem = arrayList[array_i];
    
                                var result = combineResult(hbaItem,arrayItem,maskingItem,"find");

                                finalResult_marched.push(result);
                            }
                        }
                    } else  if ( hbaList.length > 0 && arrayList.length == 0 ) { 
                        isMarched = true;
                        zoneItem.marchedCount++;
                        for ( var hba_i in hbaList ) {
                            var hbaItem = hbaList[hba_i];
                            var arrayItem1;
                            var result = combineResult(hbaItem,arrayItem1,maskingItem,"notfind arrayport in zone");
 
                            finalResult_marched.push(result);
                        }  
                    } 


                } // for zone_i
                if ( isMarched == false ) {
                    finalResult_nomarched.push(maskingItem);
                }
            } // for masking_i
            var finalResult_nomarched_zone = [];
            for ( var zone_i in zoning ) {
                var zoneItem = zoning[zone_i];

                if ( zoneItem.marchedCount == 0 ) finalResult_nomarched_zone.push(zoneItem);

            }
            
            var finalResult = {};
            
            // Make sure the "find" record is in the first.
            var marched_find = [];
            for ( var i in finalResult_marched ) {
                var item1 = finalResult_marched[i];
                if ( item1.marched_type == 'find' ) 
                    marched_find.push(item1);
            }
            for ( var i in finalResult_marched ) {
                var item1 = finalResult_marched[i];
                if ( item1.marched_type != 'find' ) 
                    marched_find.push(item1);
            }
            finalResult["marched"] = marched_find;



            finalResult["nomarched"] = finalResult_nomarched;
            finalResult["nomarched_zone"] = finalResult_nomarched_zone;
            finalResult["zone"] = zoning;
            finalResult["masking"] = arg.masking;
            
            callback(null,finalResult);
        } 
        
    ], function (err, result) { 
        console.log(" --- return  is begin ---");

        var fs = require('fs');
        var util = require('util'); 
         var wstream = fs.createWriteStream(ReportTmpDataPath + '//'+ 'marched.json');  
                  
         wstream.write('[');
         for ( var i in result.marched ) {
             var item = result.marched[i];
             if ( i == 0 ) wstream.write(JSON.stringify(item) +'\n');
             else wstream.write(', ' + JSON.stringify(item) +'\n');
         }
         wstream.write(']\n');
         wstream.end();    


         var fs1 = require('fs');
        var util = require('util'); 
         var wstream = fs1.createWriteStream(ReportTmpDataPath + '//'+ 'nomarched_masking.json');  
                  
         wstream.write('[');
         for ( var i in result.nomarched ) {
             var item = result.nomarched[i];
             if ( i == 0 ) wstream.write(JSON.stringify(item) +'\n');
             else wstream.write(', ' + JSON.stringify(item) +'\n');
         }
         wstream.write(']\n');
         wstream.end();    

         
         var fs2= require('fs');
        var util = require('util'); 
         var wstream = fs2.createWriteStream(ReportTmpDataPath + '//'+ 'nomarched_zoning.json');  
                  
         wstream.write('[');
         for ( var i in result.nomarched_zone ) {
             var item = result.nomarched_zone[i];
             if ( i == 0 ) wstream.write(JSON.stringify(item) +'\n');
             else wstream.write(', ' + JSON.stringify(item) +'\n');
         }
         wstream.write(']\n');
         wstream.end();    



         //var ret = {};
         //ret["#result"] = result.marched.length;
         //ret["#nomarched"] = result.nomarched.length;
        //callback(result.marched);
        callback(result);
    });




}

function combineResultFromMasking(masking,marchedtype) {
    var finalResult = [];
    for ( var i in masking.initgrp_member ) {
        var initItem = masking.initgrp_member[i];

        var result = {};

        result["hbawwn"] = initItem;

        if ( masking.portgrp_member > 0 )
            for ( var j in masking.portgrp_member ) {
                var portItem = masking.portgrp_member[j];

                var result = {};

                result["hbawwn"] = initItem;
                result["arrayport"] = portItem.feport;
                result["arrayport_wwn"] = portItem.portwwn;
                result["array"] = portItem.device;
                result["arrayname"] = masking.arrayname;
                result["arraytype"] = masking.arraytype;

            }

            
        result["devices"] = masking.devices;
        result["maskingview"] = masking.part;
        result["IG"] = masking.initgrp;
        result["PG"] = masking.portgrp;
        result["SG"] = masking.sgname; 
        result["Capacity"] = masking.Capacity; 

        result['marched_type'] = marchedtype;

        finalResult.push(result);
    }

    return finalResult;
}


function combineResult(hbaItem, arrayItem, maskingItem, marchedtype) {
    var result = {}; 
    if ( hbaItem !== undefined ) { 
        result["hbawwn"] = hbaItem.zone.zonemember.switchportConnectedWWN;
        result["connect_hba_swport"] = hbaItem.zone.zonemember.switchport;
        result["connect_hba_swport_wwn"] = hbaItem.zone.zonemember.switchportwwn;
        result["connect_hba_swport_status"] = hbaItem.zone.zonemember.switchportstate;
        result["connect_hba_swport_alias"] = hbaItem.zone.zonemember.alias;
        result["connect_hba_zmemtype"] = hbaItem.zone.zonemember.zmemtype;
        result["connect_hba_sw_ip"] = hbaItem.zone.zonemember.switchip; 
        result["connect_hba_sw_id"] = hbaItem.zone.zonemember.switchsn; 
        result["connect_hba_sw"] = hbaItem.zone.zonemember.switch;

    }  

    if ( hbaItem !== undefined ) {
            
        result['fabricname'] = hbaItem.zone.fabricname;
        result['zsetname'] = hbaItem.zone.zsetname;
        result['zname'] = hbaItem.zone.zname; 
    } else if ( arrayItem !== undefined ) {
            
        result['fabricname'] = arrayItem.zone.fabricname;
        result['zsetname'] = arrayItem.zone.zsetname;
        result['zname'] = arrayItem.zone.zname; 
    }

    if ( arrayItem !== undefined ) { 

        result["connect_arrayport_sw"] = arrayItem.zone.zonemember.switch; 
        result["connect_arrayport_sw_id"] = arrayItem.zone.zonemember.switchsn; 
        result["connect_arrayport_sw_ip"] = arrayItem.zone.zonemember.switchip; 
        result["connect_arrayport_zmemtype"] = arrayItem.zone.zonemember.zmemtype;
        result["connect_arrayport_swport_alias"] = arrayItem.zone.zonemember.alias;
        result["connect_arrayport_swport_status"] = arrayItem.zone.zonemember.switchportstate;
        result["connect_arrayport_swport_wwn"] = arrayItem.zone.zonemember.switchportwwn;
        result["connect_arrayport_swport"] = arrayItem.zone.zonemember.switchport;
 
        result["arrayport"] = arrayItem.masking.member.feport;
        result["arrayport_wwn"] = arrayItem.masking.member.portwwn;
        result["array"] = arrayItem.masking.member.device;
        result["arrayname"] = maskingItem.arrayname;
        result["arraytype"] = maskingItem.arraytype;

 
    }

    result["devices"] = maskingItem.Devices;
    result["deviceips"] = ( maskingItem.ip === undefined ) ? "" : maskingItem.ip;
    result["maskingview"] = maskingItem.part;
    result["IG"] = maskingItem.initgrp;
    result["PG"] = maskingItem.portgrp;
    result["SG"] = maskingItem.sgname; 
    result["Capacity"] = maskingItem.Capacity;
    result['marched_type'] = marchedtype;

    return result;
}

function combineMarchResult(zoneitem, zonememberItem, maskingItem, portitem){

    var res = {};
    var zone = {};
    zone["fabricname"] = zoneitem.fabricname;
    zone["device"] = zoneitem.device;
    zone["zsetname"] = zoneitem.zsetname;
    zone["zname"] = zoneitem.zname;
    zone["zonemember"] = zonememberItem;

    var arrayport = {};
    arrayport["sn"] = maskingItem.sn;
    arrayport["ip"] = maskingItem.ip;
    arrayport["part"] = maskingItem.part;
    arrayport["initgrp"] = maskingItem.initgrp;
    arrayport["portgrp"] = maskingItem.portgrp;
    arrayport["sgname"] = maskingItem.sgname;
    arrayport["Capacity"] = maskingItem.Capacity;
    arrayport["member"] = portitem;
        
    res["zone"] = zone;
    res["masking"] = arrayport;

    return res;


}




function getAppStorageRelation (callback) { 
    var device;
    var config = configger.load();  
    async.waterfall(
        [

            function(callback){ 
                var query = AppTopologyObj.find({}).select({ "metadata": 1, "data": 1,  "_id": 0});
                query.exec(function (err, doc) {
                    //system error.
                    if (err) { 
                        res.json(500 , {status: err})
                    }
                    if (!doc) { //user doesn't exist.
                        res.json(200 , []); 
                    }
                    else {
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

                        callback(null,lastRecord.data);
                        
                    }

                });

            },  
            function(param,  callback) {  
                var res = [];
                DeviceMgmt.GetArrayAliasName(function(arrayinfo) {      
                    for ( var i in param ) {
                        var item = param[i];
                        if ( item.array === undefined ) continue; 

                        var isfind = false;
                        for ( var j in res ) {
                            var resItem = res[j];
                            if ( resItem.app == item.app && resItem.array == item.array && resItem.SG == item.SG ) {
                                isfind = true;
                                break;
                            }
                        }

                        if ( isfind == false ) {
                            var resItem = {}; 
                            resItem.app = item.app;
                            resItem.array = item.array;
                            resItem.SG = item.SG;
                            resItem.array_name = ""; 
/*
                            var arrayinfoItem = arrayinfo[resItem.array]; 
                            resItem.array_name = arrayinfoItem.name;
                            resItem.array_level = arrayinfoItem.type;
*/
                            for ( var z in arrayinfo ) {
                                if ( resItem.array == arrayinfo[z].storagesn ) {
                                    resItem.array_name = arrayinfo[z].name;
                                    resItem.array_level = arrayinfo[z].type;
                                    break;
                                }
                            } 
                            if ( resItem.array_level == 'high')
                                res.push(resItem);
                        }
                    } 

                    for ( var i in res ) {
                        if ( res[i].app == "" ) res[i].app = res[i].SG ;
                    } 
                    callback(null,res);
                               
                }); 
            },  
            function(arg1, callback) { 
                callback(null,arg1);
            } 
        ], function (err, result) {
            // result now equals 'done'
            callback(result);
        });

    
    };
        

    function ApplicationCapacityAnalysis(masking, appinfo) {
        //var masking = require("../demodata/masking");
        //var appinfo = require("../demodata/array_apps");

        var arrayInfo = require("../config/StorageInfo");

        var appInfoByInitiator = {};
        for ( var i in appinfo ) {
            var appItem = appinfo[i];

            if ( appInfoByInitiator[appItem.WWN] === undefined ) appInfoByInitiator[appItem.WWN] = appItem;
        }

        var apps = [];
        for ( var i in masking ) {
            var maskingItem = masking[i];
            var initmembers = maskingItem.initgrp_member;

            for ( var j in arrayInfo ) {
                var arrayInfoItem = arrayInfo[j];
                if ( arrayInfoItem.storagesn == maskingItem.sn ) {
                    maskingItem["arrayname"] = arrayInfoItem.name;
                    maskingItem["cabinet"] = arrayInfoItem.cabinet;
                    maskingItem["cabinet"] = arrayInfoItem.cabinet;
                    
                    break;
                }
            }

            for ( var j in initmembers ) {
                var initiator = initmembers[j];

                if (appInfoByInitiator[initiator] === undefined ) continue;

                var isfind = false;
                for ( var z in apps ) {
                    var resAppItem = apps[z];

                    if ( resAppItem.appName == appInfoByInitiator[initiator].app &
                        resAppItem.hostName == appInfoByInitiator[initiator].host &
                        resAppItem.storageSN == maskingItem.sn
                    ) {
                        isfind = true;
                         if ( resAppItem.sgname.indexOf(maskingItem.sgname) >= 0  ) {
                             
                            break;
                        }
                        else { 
                            resAppItem.sgname += '|' + maskingItem.sgname;
                            for ( var lunj in maskingItem.sg_member ) {
                                var lun2 = maskingItem.sg_member[lunj];

                                var lunIsFind = false;
                                for ( var luni in resAppItem.storageList ) {
                                    var lun1 = resAppItem.storageList[luni];
                                
                                    
                                    if ( lun1.part == lun2.part ) {
                                        lunIsFind = true;
                                        break;
                                    }
                                }
                                if ( lunIsFind == false ) {
                                    resAppItem.storageList.push(lun2);
                                }
                            }
                            
                        }
                    }
                }

                if ( isfind == false ) {
                    var appsItem = {};
                    appsItem["appName"] = appInfoByInitiator[initiator].app;
                    appsItem["hostName"] = appInfoByInitiator[initiator].host;
                    appsItem["storageSN"] = maskingItem.sn;
                    appsItem["storageName"] = maskingItem.arrayname;
                    appsItem["sgname"] = '|'+ maskingItem.sgname;
                    appsItem["storageList"] = maskingItem.sg_member;
    
                    apps.push(appsItem);
                }

                
            }

        }
 

 
        var finalRecordTmp = [];
        for ( var i in apps ) {
            var item = apps[i];

            // Combine host item struct
            var storageList = [];
            var hostItem = {};
            hostItem.logicUnitCount = 0 ;
            hostItem.hostName = item.hostName ;
            hostItem.storageList = [];
            hostItem.capacitySize = 0;
            hostItem.storageCount = 1;

            for ( var z in item.storageList ) {
                var storageitem = item.storageList[z];

                var lunItem = {};
                lunItem["Capacity"] = Math.round(storageitem.SGLunCapacity * 100) / 100 ;
                lunItem["storageName"] = item.storageName;
                lunItem["storageSN"] = storageitem.device;
                lunItem["LogicUnit"] = storageitem.part;
                
                storageList.push(lunItem);

                hostItem.logicUnitCount++;
                hostItem.capacitySize += storageitem.SGLunCapacity === undefined ? 0 : Math.round(storageitem.SGLunCapacity * 100) / 100 ;

            } 
            hostItem.storageList = storageList;


            var isfind  = false;
            for ( var j in finalRecordTmp ) {
                var finalItem = finalRecordTmp[j];
                if ( item.appName == finalItem.appName ) {
                    isfind = true;

                    var hostsItem = finalItem.hostGroup[0];
                    if ( hostsItem === undefined ) continue;

                    hostsItem.logicUnitCount += hostItem.logicUnitCount;
                    hostsItem.hostCount++;
                    hostsItem.hosts.push(hostItem);  
 
                    if ( finalItem.resources.storage !== undefined & finalItem.resources.storage.indexOf(storageitem.device) < 0 ) {
                        finalItem.resources.storage += '|' + storageitem.device ;
                        finalItem.storageCount++;
                        
                        hostsItem.capacitySize += hostItem.capacitySize;
                        finalItem.capacitySize += hostItem.capacitySize;

                        hostsItem.storageCount++;
                    }
                         
                    finalItem.hostCount++;
                    finalItem.logicUnitCount += hostItem.logicUnitCount;
                    break;
                }
            }
            if ( isfind == false ) {
                var finalItem = {};
                finalItem["logicUnitCount"] = 0;
                finalItem["capacitySize"] = 0;
                finalItem["storageCount"] = 0;
                finalItem["hostCount"] = 0;
                finalItem["appName"] = item.appName;
                finalItem["hostGroupCount"] = 0;
                finalItem["hostGroup"] = [];

                // Combine the hostGroup item;
                var hostsItem = {};
                hostsItem["logicUnitCount"] = 0;
                hostsItem["capacitySize"] = 0;
                hostsItem["hostCount"] = 0;
                hostsItem["storageCount"] = 0;
                hostsItem["hosts"] = [];
                hostsItem["hostGroupName"] = "暂未关联";


                hostsItem.logicUnitCount = hostItem.logicUnitCount;
                hostsItem.capacitySize = hostItem.capacitySize;
                hostsItem.hostCount = 1;
                hostsItem.storageCount = item.storageSN === undefined ? 0: 1 ;
                hostsItem.hosts.push(hostItem);  


                finalItem.logicUnitCount = hostItem.logicUnitCount;
                finalItem.capacitySize = hostItem.capacitySize;
                finalItem.storageCount =  item.storageSN === undefined ? 0: 1 ;
                finalItem.hostCount = 1;
                finalItem.hostGroup.push(hostsItem);

                finalItem["resources"] = {};
                finalItem.resources["storage"] = item.storageSN === undefined ? "": item.storageSN ;
                finalRecordTmp.push(finalItem);
               
            }

        }


        return finalRecordTmp;

    }



    function getVMAXDirectorAddress (callback) { 
        
        var device ;
        async.waterfall(
            [

                function(callback){
                    var param = {}; 
                    param['filter'] = '!vstatus==\'inactive\'&(parttype=\'LUNtoDirectorPort\')';
                    param['keys'] = ['device','part','director','dirnport','model'];
            
                    if (  device !==  undefined ) { 
                        param['filter'] = 'device=\''+device+'\'&' + param['filter'];
                    } 


                    CallGet.CallGet(param, function(param) {  
                        var res = param.result;
                        var FEPortTOLun = [];
                        for ( var i in res ) {
                            var item = res[i];
                            var itemDirnport = item.director.split('|');
                            for ( var j in itemDirnport ) {
                                var director = itemDirnport[j];
                                
                                var isfind = false;
                                for ( var z in FEPortTOLun ) {
                                    var FEPortToLunItem = FEPortTOLun[z];
                                    if ( FEPortToLunItem.device == item.device && FEPortToLunItem.director == director ) {
                                        

                                        var isfindLun = false;
                                        for (var x in FEPortToLunItem.luns ) {
                                            var lunItem = FEPortToLunItem.luns[x];
                                            if ( lunItem == item.part )  {
                                                isfindLun = true;
                                                break;
                                            }

                                        }
                                        if ( isfindLun == false ) FEPortToLunItem.luns.push(item.part);

                                        isfind = true;
                                    }
                                }
                                if ( isfind == false ) {
                                    var FEPortToLunItem = {};
                                    FEPortToLunItem.device = item.device;
                                    FEPortToLunItem.model = item.model;
                                    
                                    FEPortToLunItem.director = director;
                                    FEPortToLunItem.luns = [];
                                    FEPortToLunItem.luns.push(item.part);

                                    FEPortTOLun.push(FEPortToLunItem)
                                }

                            }
                        } 
                        callback(null,FEPortTOLun);

                    });

                }, 
                function ( arg1, callback) { 
                    var param = {}; 
                    param['filter'] = '(parttype=\'MetaMember\')';
                    param['keys'] = ['device','part','headname'];
            
                    if (  device !==  undefined ) { 
                        param['filter'] = 'device=\''+device+'\'&' + param['filter'];
                    } 

                    CallGet.CallGet(param, function(param) {  
                        var res = param.result;
                        
                        var devicelist = {};
                        for ( var j in res ) {
                            var item = res[j];
                           // console.log(item);
                            if (devicelist[item.device] === undefined ) devicelist[item.device] = {};
                            if (devicelist[item.device][item.headname] === undefined ) devicelist[item.device][item.headname] = [];

                            devicelist[item.device][item.headname].push(item.part);
                        } 

                        for ( var i in arg1 ) {
                            var item = arg1[i];

                            for ( var j in item.luns ) {
                                var lunItem = item.luns[j];

                                if ( devicelist[item.device] === undefined ) {
                                    //console.log(item.device);
                                    var a;
                                } else 
                                if ( devicelist[item.device][lunItem] !== undefined ) {
                                    item.luns = item.luns.concat(devicelist[item.device][lunItem]);
                                }
                            }
    
                        }

                        var newDiretcor = [];
                        for ( var i in arg1 ) {
                            var item = arg1[i];

			    var newluns= new Set(item.luns);

                            var newDiretcorItem = {};
                            newDiretcorItem.device = item.device;
                            newDiretcorItem.director = item.director;
                            newDiretcorItem.model = item.model;
                            //newDiretcorItem.luns = newluns.length;

			    switch ( item.model ) {
				case "VMAX450F":
					var MAX_ADDRESS = 1024*16;
					break;
				default :
					var MAX_ADDRESS = 4096 ;
					break;

			   }
                            newDiretcorItem.maxAvailableAddress= MAX_ADDRESS ;
                            newDiretcorItem.availableAddress= MAX_ADDRESS - newluns.size;

                            newDiretcor.push(newDiretcorItem);
                            
                        }
                        callback(null,newDiretcor);

                    });

                } 
                ], function (err, result) { 
                    callback(result );
                });
    

};
