"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var ReportStatusObj = mongoose.model('ReportStatus');
var ReportInfoObj = mongoose.model('ReportInfo'); 

module.exports = { 
    generateReportStatus ,
    GetReportingInfoList
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

