"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var ReportStatusObj = mongoose.model('ReportStatus');
var ReportInfoObj = mongoose.model('ReportInfo'); 

var VMAX = require('../lib/Array_VMAX');
var VNX = require('../lib/Array_VNX');
var SWITCH = require('../lib/Switch');

var TEST = require('../tmp/test.json');


module.exports = { 
    generateReportStatus ,
    GetReportingInfoList ,

    GetArraysIncludeHisotry,

    E2ETopology
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
                    resultItem["logical_capacity_last_month_PB"] = Math.round(hisItem.ConfiguredUsableCapacity / 1000 );
                    resultItem["allocated_capacity_last_month_PB"] = Math.round(hisItem.UsedCapacity / 1000 );
                    break;
                }
            }

            for ( var j in result.arraysHistory.PeriousYear ) {
                var hisItem = result.arraysHistory.PeriousYear[j];
                if ( hisItem.device == item.device ) {
                    resultItem["logical_capacity_last_year_PB"] = Math.round(hisItem.ConfiguredUsableCapacity / 1000 );
                    resultItem["allocated_capacity_last_year_PB"] = Math.round(hisItem.UsedCapacity / 1000 );
                    break;
                }
            } 

            items.push(resultItem);
        }

        finalResult["data"] = items;
       callback(finalResult);
    });


}





function E2ETopology(device, callback) {
 
    var finalResult = [];


    async.waterfall([
        function(callback) { 
            VMAX.GetMaskViews(device, function(res) {  
                for ( var i in res ) {
                    var item = res[i];
                    var resultItem = {};
                    resultItem["dirnport"] = item.dirnport;
                    

                    for ( var j in item.sg_member ) {
                        var devItem = item.sg_member[j]; 

                        if ( resultItem["Devices"] === undefined ) 
                            resultItem["Devices"] = devItem.part;
                        else 
                            resultItem["Devices"] = resultItem.Devices + ',' + devItem.part;

                    }
                    resultItem["Capacity"] = item.Capacity;
                    resultItem["sn"] = item.device;
                    
                    resultItem["View"] = item.part;
                    resultItem["IG"] = item.initgrp;
                    resultItem["PG"] = item.portgrp;
                    resultItem["SG"] = item.sgname;
                    
                    var res1 = {};
                    res1["Masking"] = resultItem;
                    res1["initgrp"] = item.initgrp_member;
                    res1["portgrp"] = item.portgrp_member;

                    var wwnlist = "";
                    for ( var i in item.initgrp_member ) {
                        wwnlist = wwnlist + "|"+item.initgrp_member[i];
                    }
                    for ( var j in item.portgrp_member ) {
                        wwnlist = wwnlist + "|" + item.portgrp_member[j].portwwn;
                    }
                    res1["wwnlist"] = wwnlist;

                    finalResult.push(res1);
                }
                callback(null,finalResult);
            });
           callback(null,TEST);

        }, 
        function(arg,  callback){  

            console.log("BEGIN-");
            var result = [];
            var nofind_result = [];
            SWITCH.getZone(device, function(zonelist) {
 
                for ( var iii in zonelist ) { 
                    var zoneItem = zonelist[iii];


                    var hba_list = [];
                    var arrayport_list = [];
                    var maskingview ;
                    // Find a MaskingView has match the zone
                    for ( var i in arg ) {
                        var maskingItem = arg[i]
                        var wwnlist = maskingItem.wwnlist;
                        var findCount = 0;
                        for ( var j in zoneItem.zonemembers ) {
                            var zonememberItem = zoneItem.zonemembers[j];
                            if ( wwnlist.indexOf(zonememberItem.switchportConnectedWWN) >= 0 ) {
                                findCount++;
                                zonememberItem["masking"] = ( zonememberItem.masking === undefined ) ? maskingItem.Masking.View : zonememberItem.masking +',' + maskingItem.Masking.View;
 
                            }

                        } 
                        if ( findCount == zoneItem.zonemembers.length ) 
                            maskingview = maskingItem;
                        
                    }
                    
                    if ( maskingview !== undefined ) {
                        maskingItem = maskingview;

                        for ( var j in zoneItem.zonemembers ) {
                            var zonememberItem = zoneItem.zonemembers[j]; 
 
                            var isFindHBA = false;
                            var isFindArrayPort = false;


                            for ( var z1 in maskingItem.initgrp ) {
                                var initItem = maskingItem.initgrp[z1];
                                if ( initItem == zonememberItem.switchportConnectedWWN ) {
                                    hba_list.push(zonememberItem);
                                    isFindHBA = true;
                                    break;
                                }
                            }

                            if ( isFindHBA == false ) 
                            for ( var z2 in maskingItem.portgrp ) {
                                var portItem = maskingItem.portgrp[z2];
                                if ( portItem.portwwn == zonememberItem.switchportConnectedWWN ) {
                                    arrayport_list.push(zonememberItem);
                                    isFindArrayPort = true;
                                    break;                                    
                                }
                            }
 


                        }



                    }


                    if ( hba_list.length > 0 && arrayport_list.length > 0 ) {
                        //console.log(iii+'\t'+ hba_list.length + '\t' + arrayport_list.length);
                        for ( var i in hba_list ) {

                            for ( var j in arrayport_list ) {
                                var resultItem = {};
                                resultItem["zsetname"] = zoneItem.zsetname;
                                resultItem["fabricname"] = zoneItem.fabricname;
                                resultItem["zonename"] = zoneItem.zname;
                                resultItem["fabwwn"] = zoneItem.fabricwwn;
                                resultItem["zoneInfo"] = zoneItem;
                                resultItem["Masking"] = maskingview;

                                resultItem["connect_hba_wwn"] = hba_list[i].switchportConnectedWWN;
                                resultItem["connect_hba_swport"] = hba_list[i].switchport;
                                resultItem["connect_hba_swport_status"] = hba_list[i].switchportstate;
                                resultItem["connect_hba_swport_alias"] = hba_list[i].alias;
                                resultItem["connect_hba_sw"] = hba_list[i].switch;
                                resultItem["connect_hba_zmemtype"] = hba_list[i].zmemtype;
                               
                                resultItem["connect_arrayport_wwn"] = arrayport_list[j].switchportConnectedWWN;
                                resultItem["connect_arrayport_swport"] = arrayport_list[j].switchport;
                                resultItem["connect_arrayport_swport_status"] = hba_list[i].switchportstate;
                                resultItem["connect_arrayport_swport_alias"] = arrayport_list[j].alias;
                                resultItem["connect_arrayport_sw"] = arrayport_list[j].switch;
                                resultItem["connect_arrayport_zmemtype"] = hba_list[i].zmemtype;
 
                                result.push(resultItem);
                            }
                        }
                   } else {
                    nofind_result.push(zoneItem);
                   }

                    
                }

                var result_combine = {};
                result_combine["result"] = result;
                result_combine["notfind"] = nofind_result;
                console.log("#Find:["+result.length+"]\t#NoFind=["+nofind_result.length+"].");
                callback(null, result_combine); 
            });

        }
    ], function (err, result) { 

       callback(result);
    });


}



