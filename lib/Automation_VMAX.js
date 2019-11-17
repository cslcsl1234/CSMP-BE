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
var Ansible = require('../lib/Ansible');


module.exports = {
    SyncDeviceID,
    CreateDevice,
    GenerateVolName
}




function SyncDeviceID(arrayinfos, maincallback) {

    console.log(arrayinfos);
    async.waterfall(
        [

            // 0. Add alloca lun in the two physical 
            function (callback) {

                async.mapSeries(arrayinfos, function (arrayinfoItem, subcallback) {
                    console.log(`Begin SyncDeviceID for array ${JSON.stringify(arrayinfoItem)}.`);

                    var servicename = "gatherfact";
                    var postbody = {
                        "extra_vars": arrayinfoItem
                    }

                    postbody.extra_vars["factname"] = "vol";
                    Ansible.executeAWXService(servicename, postbody, function (result) {
                        console.log("executeAWXService is return. ")
                        console.log(result);
                        if (result.code == 200) {
                            var res = {};
                            res["array"] = arrayinfoItem.serial_no;
                            res["sgname"] = arrayinfoItem.sgname;
                            res["vols"] = result.data.res.result.Volumes;
                            res["arrayinfo"] = arrayinfoItem;

                            subcallback(null, res);
                        } else {
                            subcallback(result.code, result);
                        }

                    }) 

                },
                    function (err, result) {  
                        if ( err ) {
                            callback(err, result[0] );
                        } else 
                            callback(null, result);
                    }
                )
            }, /*
            function(callback) {
                var res = [{"array":"000297800192","sgname": "ansible_sg_test","vols":["00001","00002","00003","00004","00005","00006","00007","00008","00009","0000A","0000B","0000C","0000D","0000E","0000F","00010","00011","00012","00013","00014","00015","00016","00017","00018","00019","0001A","0001B","0001C","0001D","0001E","0001F","00020","00021","00024","00025","00026","00027","00028","00029","0002A","0002B","0002C","0002D","0002E","0002F","00030","00031","00032","00033","00034","00035","00036","00037","00038","00039","0003A","0003B","0003C","0003D","0003E","0003F","00040","00041","00042","00043","00044","00045","00046","00047","00048","00049","0004A","0004B","0004C","0004D","0004E","0004F","00050","00051","00052"]},{"array":"000297800193","sgname": "ansible_sg_test","vols":["00001","00002","00003","00004","00005","00006","00007","00008","00009","0000A","0000B","0000C","0000D","0000E","0000F","00010","00011","00012","00013","00014","00015","00016","00017","00018","00019","0001A","0001B","0001C","0001D","0001E","0001F","00020","00021","00022","00023","00024","00025","00026","00027","00028","00029","0002A","0002B","0002C","0002D","0002E","0002F","00030","00031","00032","00033","00034","00035","00036","00037","00038","00039","0003A","0003B","0003C","0003D","0003E","0003F","00040","00041","00042","00043","00044","00045","00046","00047","00048","00049","0004A","0004B","0004C","0004D","0004E","0004F","00050","00051"]}]
                callback(null , res );
            }, */
            function (arg1, callback) {
                if (arg1.length == 2) {
                    var array1 = arg1[0].array;
                    var sgname1 = arg1[0].sgname;
                    var vol1 = arg1[0].vols;
                    var arrayinfo1 = arg1[0].arrayinfo;

                    var array2 = arg1[1].array;
                    var sgname2 = arg1[1].sgname;
                    var vol2 = arg1[1].vols;
                    var arrayinfo2 = arg1[1].arrayinfo;

                    //console.log(vol1);
                    //console.log("========");
                    //console.log(vol2);


                    // get max id 
                    var vol1_maxid;
                    for (var i in vol1) {
                        if (vol1_maxid == undefined) vol1_maxid = vol1[i];
                        else if (vol1_maxid < vol1[i]) vol1_maxid = vol1[i];
                    }

                    var vol2_maxid;
                    for (var i in vol2) {
                        if (vol2_maxid == undefined) vol2_maxid = vol2[i];
                        else if (vol2_maxid < vol2[i]) vol2_maxid = vol2[i];
                    }


                    // compare the vol1 list and vol2 list
                    var id_sync_flag;
                    var vol1_res = [];
                    var vol2_res = [];
                    if (vol1_maxid == vol2_maxid) {
                        id_sync_flag = true;
                        vol1_res.push(vol1_maxid);
                        vol2_res.push(vol2_maxid);
                    } else {
                        id_sync_flag = false;
                        if (vol1_maxid > vol2_maxid) {
                            vol1_res.push(vol1_maxid);
                            for (var i = 1; i == vol1_maxid - vol2_maxid; i++) {
                                vol2_res.push(vol2_maxid + i);
                            }
                        } else {
                            vol2_res.push(vol2_maxid);
                            for (var i = 1; i == vol2_maxid - vol1_maxid; i++) {
                                vol1_res.push(vol1_maxid + i);
                            }
                        }
                    }

                    var match_result = {};
                    match_result["id_sync_flag"] = id_sync_flag;
                    match_result["arrays"] = [];
                    var matchResultItem = {};
                    matchResultItem["array"] = array1;
                    matchResultItem["arrayinfo"] = arrayinfo1;
                    matchResultItem["sgname"] = sgname1;

                    matchResultItem["devices"] = vol1_res;
                    match_result.arrays.push(matchResultItem);

                    var matchResultItem2 = {};
                    matchResultItem2["array"] = array2;
                    matchResultItem2["arrayinfo"] = arrayinfo2;

                    matchResultItem2["sgname"] = sgname2;
                    matchResultItem2["devices"] = vol2_res;
                    match_result.arrays.push(matchResultItem2);


                    callback(null, match_result);
                } else {
                    var ret = {}
                    ret["code"] = 509;
                    ret["data"] = " The number of backend arrays should be 2, not it is " + arg1.length
                    callback(509, ret);
                }
 

            }
        ], function (err, result) {
            maincallback(result);
        }
    )

}

function CreateDevice(arrayinfo, sgname, capacity, volName, callback) {

    var servicename = "volume-create";
    var postbody = {
        "extra_vars": {
            "serial_no": arrayinfo.serial_no,
            "password": arrayinfo.password,
            "unispherehost": arrayinfo.unispherehost,
            "universion": arrayinfo.universion,
            "user": arrayinfo.user,
            "verifycert": arrayinfo.verifycert,
            "sg_name": sgname,
            "cap_unit": "GB",
            "capacity": capacity,
            "vol_name": volName
        }
    }


    Ansible.executeAWXService(servicename, postbody, function (result) {
        console.log("executeAWXService is return. ")
        if ( result.code != 200 ) {
            if ( result.data.msg.error !== undefined )
                var errmsg = JSON.stringify(result.data.msg.error.messages)
            else if ( result.data.msg !== undefined )
                var errmsg =  result.data.msg;

            result.msg = `${result.msg}. Error: ${errmsg}`
        }
            
        else { 
            var lunwwn = result.data.res.volume_detail.volume_details.wwn;
            var lunwwn1 = lunwwn.replace(/:/g,"").toLocaleLowerCase()
            result.data = { "name": volName, "lunwwn" : lunwwn1 }
        }
        callback(result);
    })

}

function GenerateVolName (arrayinfo, request, timestamp ) {
    var usedfor = request.usedfor;
    var appname = request.appname;
    var arraySN = arrayinfo.serial_no;
    var now = new Date(); 
    var subArraySN = arraySN.substring(arraySN.length-3,arraySN.length);

    var volName = `${appname}-VMAX${subArraySN}_${usedfor}-${timestamp}`
    return volName

}