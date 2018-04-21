"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var ReportStatusObj = mongoose.model('ReportStatus');
var ReportInfoObj = mongoose.model('ReportInfo'); 
var CallGet = require('./CallGet'); 

var VMAX = require('../lib/Array_VMAX');
var VNX = require('../lib/Array_VNX');
var SWITCH = require('../lib/Switch');

var TEST = require('../tmp/test.json');


module.exports = { 
    generateReportStatus ,
    GetReportingInfoList , 
    GetArraysIncludeHisotry,

    E2ETopology,
    ArrayAccessInfos
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
 
    var finalResult = [];

    async.waterfall([
/*
        function(callback) { 
            console.log(Date()+" --- GetMaskViews is begin ---");
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
                    res1["initgrp_member"] = item.initgrp_member;
                    res1["portgrp_member"] = item.portgrp_member;


                    finalResult.push(res1);
                }
                callback(null,finalResult);
            }); 

        }, 



        function(arg,  callback){  
            console.log(Date() + " --- VNX getmasking is begin ---");
            VNX.GetMaskViews(function(res) {  
                for ( var i in res ) {
                    var item = res[i];


                    arg.push(item);
                }

                callback(null,arg);

            });
        } 
        
        ,    
*/
        function(callback) {
            var fs = require('C:\\Maskingview'); 
            var res = {};
            res["masking"] = fs;
            callback(null,res);
        }, 
        function (arg , callback) {
           // SWITCH.getZone(device, function(zonelist) {
            var zonelist = require('c:\\Zone');
            arg["zone"] = zonelist;

            callback(null,arg);
 
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
                            var hbaItem = hbaList[hba_i];
    
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
                            var arrayItem;
                            var result = combineResult(hbaItem,arrayItem,maskingItem,"notfind arrayport in zone");
 
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
            finalResult["marched"] = finalResult_marched;
            finalResult["nomarched"] = finalResult_nomarched;
            finalResult["nomarched_zone"] = finalResult_nomarched_zone;
            
            callback(null,finalResult);
        } 
        
    ], function (err, result) { 
        console.log(" --- return  is begin ---");
         var fs = require('fs');
         var json2xls = require('json2xls');

         var xls = json2xls(result.marched);
 
         fs.writeFileSync('c:\\topology.xlsx', xls, 'binary');



         var fs1 = require('fs');
        var util = require('util'); 
         var wstream = fs1.createWriteStream('c:\\nomarched_masking.json');  
                  
         wstream.write('[');
         for ( var i in result.nomarched ) {
             var item = result.nomarched[i];
             wstream.write(JSON.stringify(item) +',\n');
         }
         wstream.write(']\n');
         wstream.end();    

         
         var fs2= require('fs');
        var util = require('util'); 
         var wstream = fs2.createWriteStream('c:\\nomarched_zoning.json');  
                  
         wstream.write('[');
         for ( var i in result.nomarched_zone ) {
             var item = result.nomarched_zone[i];
             wstream.write(JSON.stringify(item) +',\n');
         }
         wstream.write(']\n');
         wstream.end();    



         var ret = {};
         ret["#result"] = result.marched.length;
         ret["#nomarched"] = result.nomarched.length;
        callback(ret);
    });




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

        result["devices"] = maskingItem.Devices;
        result["maskingview"] = maskingItem.part;
        result["IG"] = maskingItem.initgrp;
        result["PG"] = maskingItem.portgrp;
        result["SG"] = maskingItem.sgname; 
 
    }

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

function E2ETopologytest(device, callback) {
 
    var finalResult = [];


    async.waterfall([
/*
        function(callback) { 
            console.log(Date()+" --- GetMaskViews is begin ---");
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
                    res1["initgrp_member"] = item.initgrp_member;
                    res1["portgrp_member"] = item.portgrp_member;


                    finalResult.push(res1);
                }
                callback(null,finalResult);
            }); 

        }, 



        function(arg,  callback){  
            console.log(Date() + " --- VNX getmasking is begin ---");
            VNX.GetMaskViews(function(res) {  
                for ( var i in res ) {
                    var item = res[i];


                    arg.push(item);
                }

                callback(null,arg);

            });
        } 
        ,    
*/
        function(callback) {
            var fs = require('C:\\Maskingview'); 
            callback(null,fs);
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
 
        }  ,

        function(arg,  callback){  
            var zzzname = 'HP_BL660_123_HBA2_SD_VNX3_120_SPB1_P2';
            console.log(Date() + " --- getZone is begin ---");
            var result = [];
            var nofind_result = [];
           // SWITCH.getZone(device, function(zonelist) {
               var zonelist = require('c:\\zone');
 
                console.log(Date() + " --- getZone is return  ---" + zonelist.length);
 
                for ( var iii in zonelist ) { 
                    var zoneItem = zonelist[iii];
                    if ( zoneItem.zname == zzzname ) console.log(zoneItem);    
                    var hba_list = [];
                    var arrayport_list = [];
                    var maskingview ;
                    // Find a MaskingView has match the zone
                    var marchList = [];   
                    for ( var i in arg ) {
                        var maskingItem = arg[i];
                        //console.log(maskingItem);
                        var wwnlist = maskingItem.wwnlist;
                        var findCount = 0;     

                        for ( var j in zoneItem.zonemembers ) {
                            var zonememberItem = zoneItem.zonemembers[j];
                            if ( zonememberItem.switchportConnectedWWN !== undefined ) 
                                var searchWWN = zonememberItem.switchportConnectedWWN;
                            else {
                                if ( zonememberItem.zmemtype == 'Permanent Address' ) {
                                    var searchWWN = zonememberItem.zmemid;
                                } 
                            }
                            //if ( zoneItem.zname == zzzname ) console.log(wwnlist + '\t' +searchWWN );   
                            if ( searchWWN !== undefined )
                            if ( wwnlist.indexOf(searchWWN) >= 0 ) {
                                if ( zoneItem.zname == zzzname ) console.log(wwnlist + '\t' +zonememberItem.switchportConnectedWWN );   
                                findCount++;
                                //zonememberItem["masking"] = ( zonememberItem.masking === undefined ) ? maskingItem.Masking.View : zonememberItem.masking +',' + maskingItem.Masking.View;
 
                            }

                        } 
                       //if ( zoneItem.zname == zzzname ) console.log(findCount );   

                            if ( findCount > 0 ) {
                                var marchItem = {};
                                marchItem["maskingview"] = maskingItem;
                                marchItem['findcount'] = findCount;
                                marchList.push(marchItem);
                            }
                        
                    }

                    if ( zoneItem.zname == zzzname ) 
                    for ( var sf in marchList ) {
                        console.log("FindMarchList:" + marchList[sf].maskingview.sgname + '\t' + marchList[sf].findcount);  
                        if ( marchList[sf].findcount == zoneItem.zonemembers.length ) {
                            maskingview = marchList[sf].maskingview;
                            break;
                        }    
                    }
                                          
                    
                    



                        if ( findCount >= 2 && findCount <= zoneItem.zonemembers.length )  {
                            if ( zoneItem.zname == zzzname ) console.log(findCount+"BEGIN---333" + JSON.stringify(maskingItem));                            
                            maskingview = maskingItem;  
                        } else {
                           // if ( zoneItem.zname == zzzname ) console.log("BEGIN---");                            
                            var findCount1 = 0;
                            for ( var j in zoneItem.zonemembers ) {
                                var zonememberItem = zoneItem.zonemembers[j];

                                if ( zonememberItem.zmemtype == 'Permanent Address' ) {
                                    //if ( zoneItem.zname == zzzname ) console.log("BEGIN---111" + wwnlist + "\t" + zonememberItem.zmemid);                            
                                    if ( wwnlist.indexOf(zonememberItem.zmemid) >= 0 ) {
                                        findCount1++;
                                    }                                    
                                } else {
                                    //if ( zoneItem.zname == zzzname ) console.log("BEGIN---222" + wwnlist + "\t" + zonememberItem.switchportConnectedWWN);                            
                                    if ( wwnlist.indexOf(zonememberItem.switchportConnectedWWN) >= 0 ) {
                                        findCount1++;
                                    }                                      
                                }
                            }
                            if ( findCount1 == zoneItem.zonemembers.length )  {
                                if ( zoneItem.zname == zzzname ) console.log("BEGIN---222" + maskingItem);                            
                                     maskingview = maskingItem;  
                                
                            } 
                        }
                        
                    
                    if ( iii % 1000 == 0 ) 
                    console.log(Date() + "\t"+iii+ " --- getZone is 111  ---" + zonelist.length);
                     
                    if ( maskingview !== undefined ) {
                        var maskingItem = maskingview;
 
                        for ( var jj in zoneItem.zonemembers ) {
                            var zonememberItem = zoneItem.zonemembers[jj]; 
                            if ( zoneItem.zname == zzzname ) console.log("-----------------\n");
                            if ( zoneItem.zname == zzzname ) console.log("zonemember:====" + zonememberItem.switchportConnectedWWN);
                            var conntedWWN = "";
                            if ( zonememberItem.zmemtype == "Permanent Address")
                                conntedWWN = zonememberItem.zmemid;
                            else 
                                conntedWWN = zonememberItem.switchportConnectedWWN;

                            var isFindHBA = false;
                            var isFindArrayPort = false;


                            for ( var z1 in maskingview.initgrp_member ) {
                                var initItem = maskingview.initgrp_member[z1];
                               
                                if ( zoneItem.zname == zzzname ) console.log("initItem:====" + initItem);

                                if ( initItem == conntedWWN ) {
                                    hba_list.push(zonememberItem);
                                    isFindHBA = true;
                                }
                            }

                            if ( isFindHBA == false ) 
                            for ( var z2 in maskingItem.portgrp_member ) {
                                var portItem = maskingItem.portgrp_member[z2];

                                if ( zoneItem.zname == zzzname ) console.log("portItem:====" + portItem.portwwn);

                                if ( portItem.portwwn == conntedWWN ) {
                                    zonememberItem["ConnectType"] = 'Array';
                                    zonememberItem["ConnectDevice"] = portItem.device;
                                    zonememberItem["ConnectPortName"] = portItem.feport;
                                    arrayport_list.push(zonememberItem);
                                    isFindArrayPort = true;
                                                                       
                                }
                            }
 

                        }



                    }

                    if ( zoneItem.zname == zzzname ) console.log("hba="+hba_list.length+"\t"+"aray="+arrayport_list.length);

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

                                resultItem["connect_hba_wwn"] = ( hba_list[i].zmemtype != "Permanent Address") ? hba_list[i].switchportConnectedWWN : hba_list[i].zmemid;
                                resultItem["connect_hba_swport"] = hba_list[i].switchport;
                                resultItem["connect_hba_swport_status"] = hba_list[i].switchportstate;
                                resultItem["connect_hba_swport_alias"] = hba_list[i].alias;
                                resultItem["connect_hba_sw"] = hba_list[i].switch;
                                resultItem["connect_hba_zmemtype"] = hba_list[i].zmemtype;
                               
                                resultItem["connect_array"] = arrayport_list[j].switchportConnectedDevice;
                                resultItem["connect_arrayport"] = ""; 
                                resultItem["connect_arrayport_wwn"] = ( arrayport_list[j].zmemtype != "Permanent Address") ? arrayport_list[j].switchportConnectedWWN : arrayport_list[j].zmemid;
                                resultItem["connect_arrayport_swport"] = arrayport_list[j].switchport;
                                resultItem["connect_arrayport_swport_status"] = arrayport_list[j].switchportstate;
                                resultItem["connect_arrayport_swport_alias"] = arrayport_list[j].alias;
                                resultItem["connect_arrayport_sw"] = arrayport_list[j].switch;
                                resultItem["connect_arrayport_zmemtype"] = arrayport_list[j].zmemtype;
 
                                result.push(resultItem);
                            }
                        }
                   } else {
                    nofind_result.push(zoneItem);
                   }

                    
                }
                console.log(Date() + " --- getZone is return end ---");
 
                var result_combine = {};
                result_combine["result"] = result;
                result_combine["notfind"] = nofind_result;
                console.log("#Find:["+result.length+"]\t#NoFind=["+nofind_result.length+"].");
                callback(null, result_combine); 
           
           
           // });

        },
        function(arg,  callback){  
            var result = [];
            for ( var i in arg.result ) {
                var item = arg.result[i];
                var resultItem = {};

                resultItem["ConnHost_HBAWWN"] = item.connect_hba_wwn; 
                

                resultItem["ConnHost_SWPort"] = item.connect_hba_swport; 
                resultItem["ConnHost_SW"] = item.connect_hba_sw;
                           
                resultItem["ConnArray_SW"] = item.connect_arrayport_sw;
                resultItem["ConnArray_SWPort"] = item.connect_arrayport_swport; 
                                 
                resultItem["Array"] = (item.connect_array !== undefined ) ? item.connect_array : "";
                resultItem["ArrayPort"] = (item.connect_arrayport !== undefined ) ? item.connect_arrayport : ""; ;
                resultItem["ArrayPortWWN"] = item.connect_arrayport_wwn;
                 

                //resultItem["Devices"] = item.Masking.Devices;
                //resultItem["Capacity"] = item.Masking.Capacity;
                resultItem["View"] = item.Masking.part;
                resultItem["IG"] = item.Masking.initgrp;
                resultItem["PG"] = item.Masking.portgrp;
                resultItem["SG"] = item.Masking.sgname;
                
                result.push(resultItem);
            }
            //callback(null,result);
            callback(null,arg);
        }


    ], function (err, result) { 
        console.log(" --- return  is begin ---");

        /*

        var fs = require('fs');
        var util = require('util');
        var wstream = fs.createWriteStream('c:\\Maskingview.json');
    
        wstream.write('[');
        for ( var i in result ) {
            wstream.write(util.inspect(result[i])+',\n');
        }
        wstream.write(']\n');
        wstream.end();
*/

       callback(result);
    });


}

