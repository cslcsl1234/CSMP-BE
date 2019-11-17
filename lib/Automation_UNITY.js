"use strict";

var async = require('async');
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');
var util = require('./util');
var fs = require('fs');
var moment = require('moment');

var autologger = require('./logger');
var WebSocket = require('ws');
var Naming = require('../config/SDCityBank-Naming.json');

const ZB = require('zeebe-node');
var Ansible = require('./Ansible');


module.exports = {
    CreateDevice, 
    GenerateVolName
}

function GenerateVolName (arrayinfo, request, timestamp ) {
    var usedfor = request.usedfor;
    var appname = request.appname;
    var arraySN = arrayinfo.unity_sn; 
    var subArraySN = arraySN.substring(arraySN.length-3,arraySN.length); 
    var volName = `${appname}-unity${subArraySN}_${usedfor}-${timestamp}`
    return volName

}


/*
Request:
        var item = {
            "Step":"Create device and assign to sg [ VPLEX_101_BE ] in pyhsical array [ CKM00163300785 ] , arraytype= [ Unity ]",
            "method":"CreatePhysicalDevice_UNITY",
            "arrayinfo":{
                "array_type":"Unity",
                "unity_sn":"CKM00163300785",
                "unity_password":"P@ssw0rd",
                "unity_hostname":"10.32.32.64",
                "unity_pool_name":"jxl_vplex101_pool",
                "unity_username":"admin",
                "sgname":"VPLEX_101_BE"
            },
            "DependOnAction":"N/A",
            "AsignSGName":"VPLEX_101_BE",
            "StorageVolumeName":"ebankwebesxi_unity_785_data_1117120527_test07",
            "capacityByte":5368709120,
            "show":"false",
            "execute":true
        }
Response:
        {
        "code": 200,
        "msg": "successful",
        "data": "[{\"wwn\":\"60:06:01:60:2F:20:41:00:C5:BA:D0:5D:2E:5F:39:1B\",\"id\":\"sv_605\",\"name\":\"ebankwebesxi_unity_785_data_1117120527_test07\"}]"
        }

*/
function CreateDevice(arrayinfo, sgname, capacity, volName, callback) {

    var servicename = "dellemc-unity-device-create";
    var postbody = {
        "extra_vars": 
        {
            "capacity": capacity,
            "unity_host_name": sgname , 
            "unity_hostname": arrayinfo.unity_hostname ,
            "unity_password": arrayinfo.unity_password  ,
            "unity_pool_name": arrayinfo.unity_pool_name ,
            "unity_username": arrayinfo.unity_username ,
            "unity_vol_name": volName
            }
    }  

    Ansible.executeAWXService(servicename, postbody, function (result) {
        /*   result :
                {
                "code": 200,
                "msg": "successful",
                "data": {
                    "play_pattern": "localhost",
                    "play": "localhost",
                    "task": "RESPONSE",
                    "task_args": "",
                    "remote_addr": "127.0.0.1",
                    "res": {
                    "_ansible_no_log": false,
                    "unity_update_results": [],
                    "warnings": [
                        "Module did not set no_log for unity_password",
                        "Module did not set no_log for unity_password_updates"
                    ],
                    "changed": false,
                    "unity_query_results": [
                        {
                        "resource_type": "lun",
                        "entries": [
                            {
                            "wwn": "60:06:01:60:2F:20:41:00:02:BB:D0:5D:CA:E9:E7:97",
                            "id": "sv_603",
                            "name": "ebankwebesxi_unity_785_data_1117120527_test05"
                            }
                        ]
                        }
                    ],
                    "invocation": {
                        "module_args": {
                        "unity_username": "admin",
                        "unity_license_path": null,
                        "unity_hostname": "10.32.32.64",
                        "unity_updates": null,
                        "unity_queries": [
                            {
                            "filter": "name lk \"ebankwebesxi_unity_785_data_1117120527_test05\" ",
                            "fields": "name,wwn",
                            "resource_type": "lun"
                            }
                        ],
                        "unity_password_updates": null,
                        "unity_password": "P@ssw0rd"
                        }
                    }
                    },
                    "pid": 13073,
                    "play_uuid": "0242ac12-0003-bd19-252c-000000000006",
                    "task_uuid": "0242ac12-0003-bd19-252c-00000000000d",
                    "event_loop": null,
                    "playbook_uuid": "17bd3a6b-2b5e-497f-bae0-89683406c2c6",
                    "playbook": "dellemc-unity-lun-create.yml",
                    "task_action": "dellemc_unity",
                    "host": "localhost",
                    "task_path": "/tmp/awx_216_9500h683/project/dellemc-unity-lun-create.yml:47"
                }
                }
        */
        console.log("executeAWXService is return. ") 
        if ( result.code != 200 ) 
            result.msg = `${result.msg}. Error: ${JSON.stringify(result.data.msg.error.messages)}`
        else { 
            var lunwwn = result.data.res.unity_query_results[0].entries[0].wwn;
            var lunwwn1 = lunwwn.replace(/:/g,"").toLocaleLowerCase()
            result.data = { "name": volName, "lunwwn" : lunwwn1 }
        }
        
        callback(result);
    })

}