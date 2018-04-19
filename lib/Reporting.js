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
    GetStoragePorts,
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

 
                    for ( var sf in marchList ) {
                        //console.log("FindMarchList:" + marchList[sf].maskingview.sgname + '\t' + marchList[sf].findcount);  
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
                            if ( zonememberItem.zmemtype == "P ermanent Address")
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
                               
                                resultItem["connect_array"] = arrayport_list[j].ConnectDevice;
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
        function(arg, callback ) {

            GetStoragePorts(function(initRes ) {
                for ( var i in arg.notfind ) {
                    var item = arg.notfind[i];
                    for (var j in item.zonemembers ){
                        var zmemItem = item.zonemembers[j];
                        var zmemWWN ;
                        if ( zmemItem.switchportConnectedWWN !== undefined ) 
                            zmemWWN = zmemItem.switchportConnectedWWN;
                        else 
                            if ( zmemItem.zmemtype == 'Permanent Address') 
                                zmemWWN = zmemItem.zmemid;

                        for ( var z in initRes ) {
                            if ( zmemItem.switchportConnectedWWN == initRes[z].portwwn ) {
                                zmemItem["switchportConnectedType"] = "Array";
                                zmemItem["switchportConnectedDevice"] = initRes[z].device; 
                                break;
                            }
                        }
                
                    }
                }
                callback(null,arg);
            })

        }
        
        ,
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
        ,
        function(arg,  callback){  
            var result = [];
            for ( var i in arg.result ) {
                var item = arg.result[i];
                var resultItem = {};
                resultItem["connect_hba_wwn"]  = item.connect_hba_wwn ;
                resultItem["connect_hba_swport"]  = item.connect_hba_swport ;
                resultItem["connect_hba_swport_status"]  = item.connect_hba_swport_status ;
                resultItem["connect_hba_swport_alias"]  = item.connect_hba_swport_alias ;
                resultItem["connect_hba_sw"]  = item.connect_hba_sw ;
                resultItem["connect_hba_zmemtype"]  = item.connect_hba_zmemtype ;

                resultItem["zsetname"]  = item.zsetname ;
                resultItem["zonename"]  = item.zonename ;

                resultItem["connect_arrayport"]  = item.ConnectPortName ;
                resultItem["connect_arrayport_wwn"]  = item.connect_arrayport_wwn ;
                resultItem["connect_arrayport_swport"]  = item.connect_arrayport_swport ;
                resultItem["connect_arrayport_swport_status"]  = item.connect_arrayport_swport_status ;
                resultItem["connect_arrayport_swport_alias"]  = item.connect_arrayport_swport_alias ;
                resultItem["connect_arrayport_sw"]  = item.connect_arrayport_sw ;
                resultItem["connect_arrayport_zmemtype"]  = item.connect_arrayport_zmemtype ;
                resultItem["array"]  = item.ConnectDevice;
 
                resultItem["flag"]  = "find" ;

                result.push(resultItem);
            }     

            for ( var i in arg.notfind ) {
                var item = arg.notfind[i];
                var ArrayList = [];
                var HBAList = [];
                for ( var j in item.zonemembers ) {
                    var zitem = item.zonemembers[j];
                    if( ( zitem.switchportConnectedType !== undefined ) && ( zitem.switchportConnectedType = "Array" ) ) 
                        ArrayList.push(zitem);
                    else 
                        HBAList.push(zitem);
                }

                for ( var h1 in ArrayList ) {
                    var arrayItem = ArrayList[h1];

                    for ( var h2 in HBAList ) {
                        var hbaItem = HBAList[h2];
                        var resultItem = {};
                        resultItem["connect_hba_wwn"]  = (hbaItem.switchportConnectedWWN !== undefined ) ? hbaItem.switchportConnectedWWN : (hbaItem.zmemtype=="Permanent Address")? hbaItem.zmemid : hbaItem.zmemid ;
                        resultItem["connect_hba_swport"]  = (hbaItem.switchport !== undefined ) ? hbaItem.switchport : "" ;
                        resultItem["connect_hba_swport_status"]  = (hbaItem.switchportstate !== undefined ) ? hbaItem.switchportstate : "" ;
                        resultItem["connect_hba_swport_alias"]  =(hbaItem.alias !== undefined ) ? hbaItem.alias : "" ;
                        resultItem["connect_hba_sw"]  = (hbaItem.switch !== undefined ) ? hbaItem.switch : "" ;
                        resultItem["connect_hba_zmemtype"]  = hbaItem.zmemtype ;
        
                        resultItem["zsetname"]  = item.zsetname ;
                        resultItem["zonename"]  = item.zname ;
        
                        resultItem["connect_arrayport"]  = (arrayItem.switchportConnectedWWN !== undefined ) ? arrayItem.switchportConnectedWWN : "" ;
                        resultItem["connect_arrayport_wwn"]  = (arrayItem.switchportConnectedWWN !== undefined ) ? arrayItem.switchportConnectedWWN : "" ;
                        resultItem["connect_arrayport_swport"]  = (arrayItem.switchport !== undefined ) ? arrayItem.switchport : "" ;
                        resultItem["connect_arrayport_swport_status"]  = (arrayItem.switchportstate !== undefined ) ? arrayItem.switchportstate : "" ;
                        resultItem["connect_arrayport_swport_alias"]  = (arrayItem.alias !== undefined ) ? arrayItem.alias : "" ;
                        resultItem["connect_arrayport_sw"]  = (arrayItem.switch !== undefined ) ? arrayItem.switch : "" ;
                        resultItem["connect_arrayport_zmemtype"]  = arrayItem.zmemtype ;
                        resultItem["array"]  = (arrayItem.switchportConnectedDevice !== undefined ) ? arrayItem.switchportConnectedDevice : "" ;
 
                        resultItem["flag"]  = "notfind" ;

                        
                        result.push(resultItem);

                    }

                }

            }     

            callback(null,result);

        }

    ], function (err, result) { 
        console.log(" --- return  is begin ---");

        var fs = require('fs');
        var json2xls = require('json2xls');

        var xls = json2xls(result);

        fs.writeFileSync('c:\\data.xlsx', xls, 'binary');
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
                            if ( zonememberItem.zmemtype == "P ermanent Address")
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
                               
                                resultItem["connect_array"] = arrayport_list[j].ConnectDevice;
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
        function(arg, callback ) {

            GetStoragePorts(function(initRes ) {
                for ( var i in arg.notfind ) {
                    var item = arg.notfind[i];
                    for (var j in item.zonemembers ){
                        var zmemItem = item.zonemembers[j];
                        var zmemWWN ;
                        if ( zmemItem.switchportConnectedWWN !== undefined ) 
                            zmemWWN = zmemItem.switchportConnectedWWN;
                        else 
                            if ( zmemItem.zmemtype == 'Permanent Address') 
                                zmemWWN = zmemItem.zmemid;

                        for ( var z in initRes ) {
                            if ( zmemItem.switchportConnectedWWN == initRes[z].portwwn ) {
                                zmemItem["switchportConnectedType"] = "Array";
                                zmemItem["switchportConnectedDevice"] = initRes[z].device; 
                                break;
                            }
                        }
                
                    }
                }
                callback(null,arg);
            })

        }
        
        ,
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

function GetStoragePorts( callback) { 

   async.waterfall([
       function(callback){ 

           var param = {};
           param['keys'] = ['portwwn']; 
           param['fields'] = ['datagrp','porttype','device'];
           param['filter'] = 'parttype=\'Port\'&devtype=\'Array\'';

           CallGet.CallGet(param, function(param) { 

            callback(null, param.result ); 
           });
       }
   ], function (err, result) {
      callback(result);
   });

}
