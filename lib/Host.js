"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var HostObj = mongoose.model('Host');
var App = require('./App'); 



module.exports = { 
    GetHosts,
    GetHBAFlatRecord
}



/*
    * Get a masking view list info of the vmax.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

        [
          {
            "APPs": [
              "SAP",
              "NetBank"
            ],
            "HBAs": [
              {
                "name": "fcs0",
                "wwn": "C001448782B78A00",
                "AB": "A",
                "_id": "58f1946fc93bfd2e7b000007"
              },
              {
                "name": "fcs1",
                "wwn": "C001448782678200",
                "AB": "B",
                "_id": "58f1946fc93bfd2e7b000006"
              }
            ],
            "configuration": {
              "OS": "AIX",
              "OSVersion": "RHEL6.8",
              "memory": "32",
              "other": "about configuration other things."
            },
            "assets": {
              "no": "BC1-121212",
              "purpose": "SAP System",
              "department": "Marketing",
              "manager": "zhangsan"
            },
            "maintenance": {
              "vendor": "Dell",
              "contact": "az@emc.com",
              "maintenance_department": "Marketing",
              "maintenance_owner": "John"
            },
            "baseinfo": {
              "name": "testhost1",
              "type": "Physical",
              "catalog": "R&D",
              "status": "Test",
              "management_ip": "192.168.1.1",
              "service_ip": "10.1.1.1,11.2.2.2,12.3.3.3",
              "dcname": "BJDC2",
              "area": "1Level-A",
              "description": "this is a description about testhost1."
            }
          }
        ]
*/

function GetHBAFlatRecord(device, callback) { 
      GetHosts(device, function(code,res) {

          App.GetApps( function( app_code, app_result ) {
             var result = []; 
              for ( var i in res) {
                var item = res[i]; 

                var apps = [];
                var apps_name = '';
                // Apps
                for ( var appi in item.APPs) {
                  var appName = item.APPs[appi]; 
                  for ( var j in app_result ) {
                     var appItem = app_result[j];
                     if ( appName == appItem.name ) {
                        apps.push(appItem);
                        if ( apps_name == '' )
                            apps_name = appItem.alias;
                        else 
                            apps_name = apps_name + ',' + appItem.alias;
                     }
                  }
                }
                item.APPs = apps;
 

                // HBAs 
                for ( var hbaj =0 ; hbaj < item.HBAs.length; hbaj++) {
                  var hba_item = item.HBAs[hbaj];
     



                  var newRecord = {};
                  newRecord['dcname'] = item.baseinfo.dcname;
                  newRecord['area'] = item.baseinfo.area;
                  newRecord['app_name'] = apps_name;
                  newRecord['hostname'] = item.baseinfo.name;
                  newRecord['hba_wwn'] = hba_item.wwn;
                  newRecord['hba_name'] = hba_item.name;
                  newRecord['hba_AB'] = hba_item.AB;

                  newRecord['host_type'] = item.baseinfo.type;
                  newRecord['host_status'] = item.baseinfo.status;
                  newRecord['ip'] = item.baseinfo.management_ip + '(M);' + item.baseinfo.service_ip;

                  newRecord['OS'] = item.configuration.OS;
                  newRecord['OSVersion'] = item.configuration.OSVersion;
                  newRecord['memory'] = item.configuration.memory;
                  newRecord['other'] = item.configuration.other;

                  result.push(newRecord);
                }


              }  
              callback(result);

          })

 

      })
}

/*
    * Get a masking view list info of the vmax.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

        [
          {
            "APPs": [
              "SAP",
              "NetBank"
            ],
            "HBAs": [
              {
                "name": "fcs0",
                "wwn": "C001448782B78A00",
                "AB": "A",
                "_id": "58f1946fc93bfd2e7b000007"
              },
              {
                "name": "fcs1",
                "wwn": "C001448782678200",
                "AB": "B",
                "_id": "58f1946fc93bfd2e7b000006"
              }
            ],
            "configuration": {
              "OS": "AIX",
              "OSVersion": "RHEL6.8",
              "memory": "32",
              "other": "about configuration other things."
            },
            "assets": {
              "no": "BC1-121212",
              "purpose": "SAP System",
              "department": "Marketing",
              "manager": "zhangsan"
            },
            "maintenance": {
              "vendor": "Dell",
              "contact": "az@emc.com",
              "maintenance_department": "Marketing",
              "maintenance_owner": "John"
            },
            "baseinfo": {
              "name": "testhost1",
              "type": "Physical",
              "catalog": "R&D",
              "status": "Test",
              "management_ip": "192.168.1.1",
              "service_ip": "10.1.1.1,11.2.2.2,12.3.3.3",
              "dcname": "BJDC2",
              "area": "1Level-A",
              "description": "this is a description about testhost1."
            }
          }
        ]
*/

function GetHosts(device, callback) {

        if ( typeof device !== 'undefined') {
            var hostname = device;
            HostObj.findOne({"baseinfo.name" : hostname },{"_id":0, "__v":0}, function (err, doc) {
                //system error.
                if (err) { 
                    callback(500 , {status: err})
                }
                if (!doc) { //user doesn't exist.
                    callback(500 , {status: "The host not find!"}); 
                }
                else {
                    callback(200 , doc);
                }

            });
        } else {
            HostObj.find({},{"_id":0, "__v":0}, function (err, doc) {
                //system error.
                if (err) { 
                    callback(500 , {status: err})
                }
                if (!doc) { //user doesn't exist.
                    callback(200 , []); 
                }
                else { 
                    callback(500 , doc);
                }

            }).select({ "baseinfo.name": 1, "_id": 0});

        }


}

