"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var xls2json = require("xls-to-json");

var ReportStatusObj = mongoose.model('ReportStatus');
var ReportInfoObj = mongoose.model('ReportInfo'); 
var CallGet = require('./CallGet'); 
var configger = require('../config/configger');

var VMAX = require('../lib/Array_VMAX');
var VNX = require('../lib/Array_VNX');
var SWITCH = require('../lib/Switch');

var TEST = require('../tmp/test.json');


module.exports = { 
    generateReportStatus ,
    GetReportingInfoList , 
    GetArraysIncludeHisotry,

    E2ETopology,
    ArrayAccessInfos,
    GetApplicationInfo
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

    var xlsFileName = '../CSMP-BE/report/resource/CMDBTOSTORAGE20180501.csv';
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
                    resItem['app'] = item['应用系统名称'];
                    resItem['host'] = item['主机名'];
                    resItem['WWN'] = item['WWN'];
                    res.push(resItem);
                }
            }
            console.log(res);
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
                          console.log(statusItem);
                          console.log(statusItem.ReportInfoID +'\t' +item.ID +'\t'+ statusItem.Status);
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


function GetArraysIncludeHisotry(device, callback) {

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


function E2ETopology(device, callback) {
    var config = configger.load(); 
    var ReportTmpDataPath = config.Reporting.TmpDataPath;
    var ReportOutputPath = config.Reporting.OutputPath;

    var finalResult = [];

    async.waterfall([

        function(callback) { 
            console.log(Date()+" --- GetMaskViews is begin ---");
            ArrayAccessInfos(device, function(res) { 
                
                var fs1 = require('fs'); 
                 var wstream = fs1.createWriteStream(ReportTmpDataPath + '//' + 'masking.json');  
                          
                 wstream.write('[');
                 for ( var i in res ) {
                     var item = res[i];
                     wstream.write(JSON.stringify(item) +',\n');
                 }
                 wstream.write(']\n');
                 wstream.end();    
        
                
                
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
                     wstream.write(JSON.stringify(item) +',\n');
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
                    /* else if ( hbaList.length == 0  && arrayList.length > 0 ) { 
                            for ( var array_i in arrayList ) {
                                var arrayItem = arrayList[array_i];
                                var hbaItem;
                                var result = combineResult(hbaItem,arrayItem,"notfind hba in zone");

                                finalResult.push(result);
                            } 
                    else if ( hbaList.length == 0  && arrayList.length == 0 ) { 
                        for ( var array_i in arrayList ) {
                            var arrayItem = arrayList[array_i];
                            var hbaItem;
                            var result = combineResult(hbaItem,arrayItem,"notfind hba&arrayport in zone");

                            finalResult.push(result);
                        } 
                    }

                            */
 
                    // ----------------------------------------------------------------------


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
            
            callback(null,finalResult);
        } 
        
    ], function (err, result) { 
        console.log(" --- return  is begin ---");


         var fs1 = require('fs');
        var util = require('util'); 
         var wstream = fs1.createWriteStream(ReportTmpDataPath + '//'+ 'nomarched_masking.json');  
                  
         wstream.write('[');
         for ( var i in result.nomarched ) {
             var item = result.nomarched[i];
             wstream.write(JSON.stringify(item) +',\n');
         }
         wstream.write(']\n');
         wstream.end();    

         
         var fs2= require('fs');
        var util = require('util'); 
         var wstream = fs2.createWriteStream(ReportTmpDataPath + '//'+ 'nomarched_zoning.json');  
                  
         wstream.write('[');
         for ( var i in result.nomarched_zone ) {
             var item = result.nomarched_zone[i];
             wstream.write(JSON.stringify(item) +',\n');
         }
         wstream.write(']\n');
         wstream.end();    



         //var ret = {};
         //ret["#result"] = result.marched.length;
         //ret["#nomarched"] = result.nomarched.length;
        callback(result.marched);
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


            }

            
        result["devices"] = masking.devices;
        result["maskingview"] = masking.part;
        result["IG"] = masking.initgrp;
        result["PG"] = masking.portgrp;
        result["SG"] = masking.sgname; 

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
        result["connect_arrayport_zmemtype"] = arrayItem.zone.zonemember.zmemtype;
        result["connect_arrayport_swport_alias"] = arrayItem.zone.zonemember.alias;
        result["connect_arrayport_swport_status"] = arrayItem.zone.zonemember.switchportstate;
        result["connect_arrayport_swport_wwn"] = arrayItem.zone.zonemember.switchportwwn;
        result["connect_arrayport_swport"] = arrayItem.zone.zonemember.switchport;
 
        result["arrayport"] = arrayItem.masking.member.feport;
        result["arrayport_wwn"] = arrayItem.masking.member.portwwn;
        result["array"] = arrayItem.masking.member.device;

 
    }

    result["devices"] = maskingItem.Devices;
    result["maskingview"] = maskingItem.part;
    result["IG"] = maskingItem.initgrp;
    result["PG"] = maskingItem.portgrp;
    result["SG"] = maskingItem.sgname; 
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
    arrayport["Capacity"] = maskingItem.Capacity;
    arrayport["sn"] = maskingItem.sn;
    arrayport["part"] = maskingItem.part;
    arrayport["initgrp"] = maskingItem.initgrp;
    arrayport["portgrp"] = maskingItem.portgrp;
    arrayport["sgname"] = maskingItem.sgname;
    arrayport["member"] = portitem;
        
    res["zone"] = zone;
    res["masking"] = arrayport;

    return res;


}
