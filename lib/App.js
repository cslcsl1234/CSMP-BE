"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var AppObj = mongoose.model('Application');
//var CallGet = require('./CallGet'); 



module.exports = { 
    GetApps 
}



/*
    * Get a application list info .
    * input: 
        - N/A
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

function GetApps( callback) {


    AppObj.find({},{"_id":0, "__v":0}, function (err, doc) {
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

    });



}

