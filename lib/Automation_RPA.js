"use strict";

var async = require('async');
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet');
var util = require('./util');
var fs = require('fs');
var moment = require('moment');
 
var WebSocket = require('ws');

const ZB = require('zeebe-node');
var Ansible = require('./Ansible');


module.exports = {
    // ====================== Service Unit =====================
    CreateConsistencyGroup,
    CreateReplicationSet,

    // ==================== Atomic Service Function ============================
    GetRPAInfo,
    GetRPAConfigureInfo,
    GetConsistencyGroups,
    GetReplicationSets,
    GetClusters,
    GetSplitters,
    GetClusterID,
    GetVolumes,
    GetCopys,


    CreateCopy,
    AddJournalVolumeToCopy,
    AddVolumeToCopy,

    CreateLink,
    AddVolumeToSplitter,
    EnableConsistencyGroup,
    DisableConsistencyGroup,
    PauseConsistencyGroup

}

// ====================== Service Unit ===================== 

function GetRPAInfo( cdpname ) {

    if ( cdpname.indexOf("TestCase") >= 0 ) {
        // For TEST  
        console.log("GetRPAInfo: for test" + cdpname);
        var StorageCapability = require(`../__tests__/automation/data/${cdpname}.StorageCapability.json`);
        var item =  StorageCapability.CDP.RPA[0] ;
        return item;
    } else {
        var StorageCapability = require("../config/StorageCapability");
        for (var i in StorageCapability.CDP.RPA) {
            var item = StorageCapability.CDP.RPA[i];
            if (item.name == cdpname) {
                return item;
            }
        }
        return null;
    }

    
}

/* 
Paramater:
  var createReplicationSetParamater = {
      "CGName" : "TESTCREATE_CG",
      "ReplicationsetName" : "rset2",

      "volume" :{
        "prod" : "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-05_vol",
        "local" : "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-06_vol",
        "remote" : "RPA_CDP_VNX__2 (1)"
      },
      "splitter" : {
          "cluster1": "CKM00115200199",
          "cluster2": "CKM00140600110-A"
      }
    }
Response:

*/

function GetRPAConfigureInfo(RPAInfo, callback) {
    var data = {};

    async.waterfall(
        [
            function (callback) {

                GetConsistencyGroups(RPAInfo, function (cglist) {
                    data["ConsistencyGroups"] = cglist;
                    callback(null, data);
                });

            },
            function (data, callback) {
                var cgs = data.ConsistencyGroups;
                async.map(cgs, function (cgItem, subcallback) {
                    GetCopys(RPAInfo, cgItem.name, function (result) {
                        var copyResult = {};
                        for (var i in result) {
                            var item = result[i];
                            copyResult[item.role] = item;
                        }
                        cgItem["copys"] = copyResult;
                        subcallback(null, cgItem);
                    });

                },
                    function (err, result) {
                        data.ConsistencyGroups = result;
                        callback(null, data);
                    }
                )

            },
            function (data, callback) {
                var cgs = data.ConsistencyGroups;
                async.map(cgs, function (cgItem, subcallback) {
                    GetReplicationSets(RPAInfo, cgItem.name, function (result) {
                        cgItem["replicationsets"] = result;
                        subcallback(null, cgItem);
                    });

                },
                    function (err, result) {
                        data.ConsistencyGroups = result;
                        callback(null, data);
                    }
                )

            },

            function (data, callback) {
                GetClusters(RPAInfo, function (result) {
                    var clusters = [];
                    for (var i in result) {
                        var item = result[i];
                        //console.log(item);
                        var newItem = { "clusterid": item.clusterUID.id.toString(), "clusterName": item.clusterName };
                        clusters.push(newItem);
                    }
                    data["clusters"] = clusters;
                    callback(null, data);
                });
            },
            function (data, callback) {
                var clusters = data.clusters;
                for (var i in data.ConsistencyGroups) {
                    var item = data.ConsistencyGroups[i];
                    for (var field in item.copys) {
                        var fieldItem = item.copys[field];
                        for (var z in clusters) {
                            //console.log(fieldItem.clusterid + "," + clusters[z].clusterid);
                            if (fieldItem.clusterid == clusters[z].clusterid) {
                                fieldItem["ClusterName"] = clusters[z].clusterName;
                                break;
                            }
                        }

                    }
                }
                callback(null, data);
            },
            function (data, callback) {
                var clusters = data.clusters;
                async.map(clusters, function (clusterItem, subcallback) {
                    GetVolumes(RPAInfo, clusterItem.clusterName, function (result) {
                        clusterItem["volumes"] = result;
                        for (var i in result) {
                            var item = result[i];
                            item["usedFor"] = 'unused';
                        }
                        subcallback(null, clusterItem);
                    });

                },
                    function (err, result) {
                        data.clusters = result;
                        callback(null, data);
                    }
                )

            },
            function (data, callback) {
                var clusters = data.clusters;
                async.map(clusters, function (clusterItem, subcallback) {
                    GetSplitters(RPAInfo, clusterItem.clusterName, function (result) {
                        clusterItem["splitters"] = result;
                        subcallback(null, clusterItem);
                    });

                },
                    function (err, result) {
                        data.clusters = result;
                        callback(null, data);
                    }
                )

            },
            // check data 
            function (data, callback) {
                var clusters = data.clusters;
                for (var i in data.ConsistencyGroups) {
                    var cgItem = data.ConsistencyGroups[i];
                    for (var j in cgItem.copys) {
                        var copyItem = cgItem.copys[j];
                        //console.log("================\n"+JSON.stringify(copyItem));
                        for (var z in copyItem.journal) {
                            var journalVolItem = copyItem.journal[z];
                            var volItem = searchVolumeInCluster(journalVolItem.id, clusters);
                            if (volItem != null) volItem["usedFor"] = "journal";
                        }

                    }

                    for (var j in cgItem.replicationsets) {
                        var rsItem = cgItem.replicationsets[j];
                        for (var z in rsItem.volumes) {
                            var dataVolItem = rsItem.volumes[z];
                            var volItem = searchVolumeInCluster(dataVolItem.id, clusters);
                            if (volItem != null) volItem["usedFor"] = "data";
                        }

                    }

                }
                callback(null, data)
            },
            function (data, callback) {
                var cgs = data.ConsistencyGroups;
                var spliters = {};
                for (var i in cgs) {
                    var item = cgs[i];
                    var rs = item.replicationsets;
                    for (var j in rs) {
                        var rsItem = rs[j];
                        for (var z in rsItem.volumes) {
                            var volItem = rsItem.volumes[z];
                            for (var ii in volItem.attachedSplitters) {
                                var splitterid = volItem.attachedSplitters[ii];
                                if (spliters[splitterid] === undefined) spliters[splitterid] = { "sizeInGB": volItem.sizeInGB, "volCount": 0 };
                                else {
                                    spliters[splitterid].sizeInGB += volItem.sizeInGB;
                                    spliters[splitterid].volCount++;
                                }
                            }
                        }
                    }
                }


                var clusters = data.clusters;
                for (var i in clusters) {
                    var clusterItem = clusters[i];
                    for (var j in clusterItem.splitters) {
                        var splitterItem = clusterItem.splitters[j];
                        if (spliters[splitterItem.id] !== undefined) {
                            splitterItem["sizeInGB"] = spliters[splitterItem.id].sizeInGB;
                            splitterItem["volCount"] = spliters[splitterItem.id].volCount;
                        } else {
                            splitterItem["sizeInGB"] = 0;
                            splitterItem["volCount"] = 0;
                        }
                    }
                }

                callback(null, data);
            }

        ], function (err, result) {
            var retmsg = {
                code: 200,
                msg: "succeed",
                data: result
            }
            if (err && result != 'Not Result') {
                retmsg.code = err;
                retmsg.msg = result;
                retmsg.data = "";
            }
            callback(retmsg);
        });

}

function searchVolumeInCluster(volid, clusters) {
    for (var i in clusters) {
        var clusterItem = clusters[i];
        for (var j in clusterItem.volumes) {
            var volItem = clusterItem.volumes[j];
            if (volid == volItem.id) {
                return volItem;
            }
        }
    }
    return null;
}


function CreateReplicationSet_V1(RPAInfo, paramater, callback) {

    var CGName = paramater.CGName;
    var ReplicationsetName = paramater.ReplicationsetName;
    var prod_volname = paramater.volume.prod;
    var local_volname = paramater.volume.local;
    var remote_volname = paramater.volume.remote;

    var Cluster1_Splitters = paramater.splitter.cluster1;
    var Cluster2_Splitters = paramater.splitter.cluster2;

    var data = {
        "rpaconfiginfo": null,
        "request": {
            "cg": null
        }
    };

    var retmsg = {
        code: 200,
        msg: "succeed",
        data: null
    }
    async.waterfall(
        [
            function (callback) {
                GetRPAConfigureInfo(RPAInfo, function (result) {
                    data["rpaconfiginfo"] = result.data;
                    callback(null, data)
                });
            },
            function (data, callback) {

                // 10. Check Conisstency Group 
                var cgs = data.rpaconfiginfo.ConsistencyGroups;
                var isfind = false;
                for (var i in cgs) {
                    var item = cgs[i];
                    if (item.name == CGName) {
                        isfind = true;
                        data.request.cg = item;
                        break;
                    }
                }
                if (isfind == false) {
                    callback(504, `not find ConsistencyGroup [${CGName}]`)
                }

                // 20. Check ReplicationSet
                isfind = false;
                var rss = data.request.cg.replicationsets;
                for (var i in rss) {
                    var item = rss[i];
                    if (item.name == ReplicationsetName) {
                        isfind = true;
                        break;
                    }
                }
                if (isfind == true) {
                    callback(505, `Replication set [${ReplicationsetName}] is exists!`);
                }

                callback(null, data);
            },
 
            function (data, callback) {
                DisableConsistencyGroup(RPAInfo, CGName, function (result) {
                //PauseConsistencyGroup(RPAInfo, CGName, function (result) {
                    //console.log(result);
                    callback(null, data)
                });

            }, 

            function (data, callback) {
                var CGid = data.request.cg.groupUID;
                var url = `/groups/${CGid}/replication_sets?replicationSetName=${ReplicationsetName}`;
                CallGet.CallRPAPost(RPAInfo, url, "", function (result) {
                    if (result.code == 200) {
                        var res = result.response;
                        callback(null, data);
                    }
                    else {
                        callback(result.code, result);
                    }

                })
            },
            function (data, callback) {

                console.log("--------  AddVolumeToCopy for Prod ------")
                util.sleep(5000);
                var Copy;
                if (data.request !== undefined) {
                    if (data.request.cg !== undefined) {
                        if (data.request.cg.copys !== undefined) {
                            if (data.request.cg.copys.Prod !== undefined) {
                                Copy = data.request.cg.copys.Prod;
                            }
                        }
                    }
                }

                if (Copy === undefined)
                    callback(504, `not find copy [Prod] in Consistency group [${data.request.cg.name}]!`);

                var paramater = {
                    "clustername": Copy.ClusterName,
                    "CGName": CGName,
                    "CopyName": Copy.name,
                    "VolumeName": prod_volname,
                    "ReplicationSetName": ReplicationsetName
                }
                console.log(`*****\nAddVolumeToCopy: ${JSON.stringify(paramater)}`);

                AddVolumeToCopy(RPAInfo, paramater, function (result) {
                    console.log("*******\n" + JSON.stringify(result));
                    if (result.code != 200) {
                        callback(result.code, result.msg);
                    }
                    else {
                        util.sleep(5000);

                        async.map(Copy.splitters, function (item, subcallback) {
                            var paramater = {
                                "ClusterName": item.clustername,
                                "SplitterName": item.splitterName,
                                "VolumeName": prod_volname
                            }
                            console.log(`*****\AddVolumeToSplitter: ${JSON.stringify(paramater)}`);
                            AddVolumeToSplitter(RPAInfo, paramater, function (result) {
                                subcallback(null, item);
                            });

                        },
                            function (err, result) {
                                callback(null, data);
                            }
                        )
                    }



                });
            },
            function (data, callback) {

                console.log("--------  AddVolumeToCopy for Local ------")
                util.sleep(5000);
                var Copy;
                if (data.request !== undefined) {
                    if (data.request.cg !== undefined) {
                        if (data.request.cg.copys !== undefined) {
                            if (data.request.cg.copys.Local !== undefined) {
                                Copy = data.request.cg.copys.Local;
                            }
                        }
                    }
                }

                if (Copy === undefined)
                    callback(504, `not find copy [Prod] in Consistency group [${data.request.cg.name}]!`);

                var paramater = {
                    "clustername": Copy.ClusterName,
                    "CGName": CGName,
                    "CopyName": Copy.name,
                    "VolumeName": local_volname,
                    "ReplicationSetName": ReplicationsetName
                }
                console.log(`*****\nAddVolumeToCopy: ${JSON.stringify(paramater)}`);

                AddVolumeToCopy(RPAInfo, paramater, function (result) {
                    console.log("*******\n" + JSON.stringify(result));
                    if (result.code != 200) {
                        callback(result.code, result.msg);
                    }
                    else {
                        util.sleep(5000);

                        async.map(Copy.splitters, function (item, subcallback) {
                            var paramater = {
                                "ClusterName": item.clustername,
                                "SplitterName": item.splitterName,
                                "VolumeName": local_volname
                            }
                            console.log(`*****\AddVolumeToSplitter: ${JSON.stringify(paramater)}`);
                            AddVolumeToSplitter(RPAInfo, paramater, function (result) {
                                subcallback(null, item);
                            });

                        },
                            function (err, result) {
                                callback(null, data);
                            }
                        )
                    }



                });
            },
            function (data, callback) {

                console.log("--------  AddVolumeToCopy for Remote ------")
                util.sleep(5000);
                var Copy;
                if (data.request !== undefined) {
                    if (data.request.cg !== undefined) {
                        if (data.request.cg.copys !== undefined) {
                            if (data.request.cg.copys.Remote !== undefined) {
                                Copy = data.request.cg.copys.Remote;
                            }
                        }
                    }
                }

                if (Copy === undefined)
                    callback(504, `not find copy [Prod] in Consistency group [${data.request.cg.name}]!`);

                var paramater = {
                    "clustername": Copy.ClusterName,
                    "CGName": CGName,
                    "CopyName": Copy.name,
                    "VolumeName": remote_volname,
                    "ReplicationSetName": ReplicationsetName
                }
                console.log(`*****\nAddVolumeToCopy: ${JSON.stringify(paramater)}`);

                AddVolumeToCopy(RPAInfo, paramater, function (result) {
                    console.log("*******\n" + JSON.stringify(result));
                    if (result.code != 200) {
                        callback(result.code, result.msg);
                    }
                    else {
                        util.sleep(5000);

                        async.map(Copy.splitters, function (item, subcallback) {
                            var paramater = {
                                "ClusterName": item.clustername,
                                "SplitterName": item.splitterName,
                                "VolumeName": remote_volname
                            }
                            console.log(`*****\AddVolumeToSplitter: ${JSON.stringify(paramater)}`);
                            AddVolumeToSplitter(RPAInfo, paramater, function (result) {
                                subcallback(null, item);
                            });

                        },
                            function (err, result) {
                                callback(null, data);
                            }
                        )
                    }



                });
            },
            
            function (data, callback) {
                EnableConsistencyGroup(RPAInfo, CGName, function (result) {
                    console.log("RPA: Enable Consistency Group [" + CGName + "]");
                    console.log(result);
                    callback(null, data)
                });

            }, 

        ], function (err, result) {

            if (err) {
                retmsg.code = err;
                retmsg.msg = result;
                retmsg.data = "";
            } else {
                retmsg.data = result;
            }
            callback(retmsg);
        });

}

function CreateReplicationSet(RPAInfo, paramater, callback) {

    var CGName = paramater.CGName;
    var ReplicationsetName = paramater.ReplicationsetName;
    var prod_volname = paramater.volume.prod;
    var local_volname = paramater.volume.local;
    var remote_volname = paramater.volume.remote;
 

    var data = {
        "rpaconfiginfo": null,
        "request": {
            "cg": null
        }
    };

    var retmsg = {
        code: 200,
        msg: "succeed",
        data: null
    }
    async.waterfall(
        [
            function (callback) {
                GetRPAConfigureInfo(RPAInfo, function (result) {
                    data["rpaconfiginfo"] = result.data;
                    callback(null, data)
                });
            },
            function (data, callback) {

                // 10. Check Conisstency Group 
                var cgs = data.rpaconfiginfo.ConsistencyGroups;
                var isfind = false;
                for (var i in cgs) {
                    var item = cgs[i];
                    if (item.name == CGName) {
                        isfind = true;
                        data.request.cg = item;
                        break;
                    }
                }
                if (isfind == false) {
                    callback(504, `not find ConsistencyGroup [${CGName}]`)
                }

                // 20. Check ReplicationSet
                isfind = false;
                var rss = data.request.cg.replicationsets;
                for (var i in rss) {
                    var item = rss[i];
                    if (item.name == ReplicationsetName) {
                        isfind = true;
                        break;
                    }
                }
                if (isfind == true) {
                    callback(505, `Replication set [${ReplicationsetName}] is exists!`);
                }

                callback(null, data);
            }, 

            function (data, callback) {
                var CGid = data.request.cg.groupUID; 
                var prodVolumeInfo = {};
                prodVolumeInfo["clusterid"] = data.request.cg.copys.Prod.clusterid;
                prodVolumeInfo["copyid"] = data.request.cg.copys.Prod.copyid;
                prodVolumeInfo["volumeid"] = searchVolumeID(data.rpaconfiginfo.clusters, prodVolumeInfo["clusterid"], prod_volname );

                var localVolumeInfo = {};
                localVolumeInfo["clusterid"] = data.request.cg.copys.Local.clusterid;
                localVolumeInfo["copyid"] = data.request.cg.copys.Local.copyid;
                localVolumeInfo["volumeid"] = searchVolumeID(data.rpaconfiginfo.clusters, localVolumeInfo["clusterid"], local_volname );


                var remoteVolumeInfo = {};
                remoteVolumeInfo["clusterid"] = data.request.cg.copys.Remote.clusterid;
                remoteVolumeInfo["copyid"] = data.request.cg.copys.Remote.copyid;
                remoteVolumeInfo["volumeid"] = searchVolumeID(data.rpaconfiginfo.clusters, remoteVolumeInfo["clusterid"], remote_volname );


                var CreateReplicationSetParamater = {
                    "groupUID": {
                        "id": CGid
                    },
                    "activationParams" : {
                        "enable": true,
                        "startTransfer": true
                    },
                    "replicationSetsChanges" : [ 
                        {
                        "name": ReplicationsetName , 
                        "shouldAttachAsClean": true,
                        "volumesChanges": [
                            { 
                            "newVolume":{
                                "deviceUID":{
                                    "id": prodVolumeInfo.volumeid
                                },
                                "JsonSubType":"VolumeSelectionParam"
                            },
                            "newVolumeID" :  {
                                    "id": prodVolumeInfo.volumeid
                                } ,
                            "copyUID" : {
                                        "groupUID": {
                                            "id": CGid
                                        },
                                        "globalCopyUID": {
                                            "clusterUID": {
                                                "id": prodVolumeInfo.clusterid
                                            },
                                            "copyUID": prodVolumeInfo.copyid
                                        }
                                    }
                            },
                            { 
                            "newVolume":{
                                "deviceUID":{
                                    "id": localVolumeInfo.volumeid
                                },
                                "JsonSubType":"VolumeSelectionParam"
                            },
                            "newVolumeID" :  {
                                    "id": localVolumeInfo.volumeid
                                } ,
                            "copyUID" : {
                                        "groupUID": {
                                            "id": CGid
                                        },
                                        "globalCopyUID": {
                                            "clusterUID": {
                                                "id": localVolumeInfo.clusterid
                                            },
                                            "copyUID": localVolumeInfo.copyid
                                        }
                                    }
                            },
                            { 
                            "newVolume":{
                                "deviceUID":{
                                    "id": remoteVolumeInfo.volumeid
                                },
                                "JsonSubType":"VolumeSelectionParam"
                            },
                            "newVolumeID" :  {
                                    "id": remoteVolumeInfo.volumeid
                                } ,
                            "copyUID" : {
                                        "groupUID": {
                                            "id": CGid
                                        },
                                        "globalCopyUID": {
                                            "clusterUID": {
                                                "id": remoteVolumeInfo.clusterid
                                            },
                                            "copyUID": remoteVolumeInfo.copyid
                                        }
                                    }
                            }
                        ]
                    }
                    ]
                }
                var url = `/groups/${CGid}/settings`;
                CallGet.CallRPAPut(RPAInfo, url, CreateReplicationSetParamater , function (result) {
                    console.log("------ call finished ----")
                    //console.log(result);
                    if (result.code == 200 ) {  
                        callback(null, result);
                    }
                    else {
                        result["paramater"] = CreateReplicationSetParamater; 
                        callback(result.code, result);
                    }

                })
 
            }, 
             
        ], function (err, result) {
            retmsg.code = 200;
            retmsg.msg = result.message;
            retmsg.data = result.paramater

            if (err) {
                retmsg.code = err;
                retmsg.msg =  result; 
            }  
            callback(retmsg);
        });

}

function searchVolumeID(clusterinfo, clusterid, volumename ) {
    for ( var i in clusterinfo ) {
        var clusterItem = clusterinfo[i];
        if ( clusterItem.clusterid == clusterid ) {
            for ( var j in clusterItem.volumes ) {
                var volItem = clusterItem.volumes[j];
                if ( volItem.volumeName.indexOf(volumename) >= 0 ) {
                    return volItem.id;
                }
            }
        }
    }
    return -1;
}

/*
====================== Atomic Service Function ============================
*/
/*
rpainfo:
        var RPAInfo = {
            "IP": "10.32.32.185",
            "username": "admin",
            "password": "admin",
            "baseurl": "/fapi/rest/5_1"
          } 

Response:
        [
            {
                "groupUID": 1207771531,
                "name": "cg1",
                "enabled": true
            },
            {
                "groupUID": 604108370,
                "name": "ebankwebesxi_CG",
                "enabled": true
            }
        ]
*/
function GetConsistencyGroups(rpainfo, callback) {
    var config = configger.load();
    async.waterfall(
        [
            function (callback) {

                if ( config.ProductType == 'Test' ) { 
                    var ret =         [
                        {
                            "groupUID": 1207771531,
                            "name": "cg1",
                            "enabled": true
                        },
                        {
                            "groupUID": 604108370,
                            "name": "ebankwebesxi_CG",
                            "enabled": true
                        }
                    ];

                    callback(null, ret);

                }
                else {
                    var url = "/groups/settings";
                    CallGet.CallRPAGet(rpainfo, url, function (result) {
                        //console.log(result);
                        var groups = result.response.innerSet;
                        var ret = [];
                        for (var i in groups) {
                            var item = groups[i];
                            var newItem = {
                                "groupUID": item.groupUID.id,
                                "name": item.name,
                                "enabled": item.enabled
                            }
                            ret.push(newItem);
                        }
                        callback(null, ret);
                    })
                }

            },
            function (groups, callback) {

                callback(null, groups)

            }
        ], function (err, result) {
            callback(result);
        });

}


/*

Response:

    [
        {
            "clusterUID": {
                "id": 5157609537127272574
            },
            "clusterName": "cluster1"
        },
        {
            "clusterUID": {
                "id": 5075647406941350638
            },
            "clusterName": "cluster2"
        }
    ]

*/

function GetClusters(rpainfo, callback) {

    async.waterfall(
        [
            function (callback) {
                var url = "/clusters";
                CallGet.CallRPAGet(rpainfo, url, function (result) {
                    var res = result.response.clustersInformation;
                    callback(null, res);
                })
            },
            function (groups, callback) {
                callback(null, groups)

            }
        ], function (err, result) {
            callback(result);
        });

}

function GetClusterID(Clusters, ClusterName) {
    for (var i in Clusters) {
        var item = Clusters[i];
        if (item.clusterName == ClusterName) {
            return item.clusterUID.id;
        }
    }
    return null;
}



/*
RESPONSE:
    [
        {
            "id": "3854019522802210",
            "splitterType": "CLARIION",
            "splitterName": "vnx5600CS0-A"
        },
        {
            "id": "3854019522802211",
            "splitterType": "CLARIION",
            "splitterName": "vnx5600CS0-B"
        },
        {
            "id": "902812189870082303",
            "splitterType": "VPLEX_ARRAY",
            "splitterName": "CKM00115200199"
        }
    ]
*/

function GetSplitters(rpainfo, clusterName, callback) {

    async.waterfall(
        [
            function (callback) {
                GetClusters(rpainfo, function (Clusters) {
                    var isfind = false;
                    for (var i in Clusters) {
                        var item = Clusters[i];
                        if (item.clusterName == clusterName) {
                            isfind = true
                            callback(null, item);
                        }
                    }
                    if (isfind == false) {
                        callback(505, `not find the cluster [${clusterName}]`);
                    }
                })
            },
            function (cluster, callback) {

                var clusterID = cluster.clusterUID.id;
                var url = `/clusters/${clusterID}/splitters/settings`;
                CallGet.CallRPAGet(rpainfo, url, function (result) {
                    if (result.code == 200) {
                        var res = [];
                        for (var i in result.response.splittersSettings) {
                            var item = result.response.splittersSettings[i];
                            var newItem = {};
                            newItem["id"] = item.splitterUID.id;
                            newItem["splitterType"] = item.splitterUID.splitterType;
                            newItem["splitterName"] = item.splitterName;
                            res.push(newItem);
                        }

                        callback(null, res);
                    }
                    else {
                        callback(result.code, result);
                    }
                })
            }
        ], function (err, result) {
            callback(result);
        });
}


/*
RESPONSE:
    [
    {
        "id": "-7609059912181279192",
        "volumeName": "ESXi72_CRR_target (4)",
        "vendorName": "DGC",
        "productName": "VRAID",
        "sizeInBytes": 42949672960,
        "sizeInGB": 40,
        "arraySerialNumber": "CKM00140600110"
    },
    {
        "id": "-6725618810670745914",
        "volumeName": "ESXi_CRR_log (5)",
        "vendorName": "DGC",
        "productName": "VRAID",
        "sizeInBytes": 108447924224,
        "sizeInGB": 101,
        "arraySerialNumber": "CKM00140600110"
    }
    ]
*/

function GetVolumes(rpainfo, clusterName, callback) {

    async.waterfall(
        [
            function (callback) {
                GetClusters(rpainfo, function (Clusters) {
                    var isfind = false;
                    for (var i in Clusters) {
                        var item = Clusters[i];
                        if (item.clusterName == clusterName) {
                            isfind = true
                            callback(null, item);
                        }
                    }
                    if (isfind == false) {
                        callback(505, `not find the cluster [${clusterName}]`);
                    }
                })
            },
            function (cluster, callback) {

                var clusterID = cluster.clusterUID.id;
                var url = `/clusters/${clusterID}/volumes`;
                CallGet.CallRPAGet(rpainfo, url, function (result) {
                    if (result.code == 200) {
                        var res = [];
                        for (var i in result.response.content) {
                            var item = result.response.content[i];
                            var newItem = {};
                            newItem["id"] = item.volumeID.id;
                            newItem["volumeName"] = item.volumeName;
                            newItem["vendorName"] = item.vendorName;
                            newItem["productName"] = item.productName;
                            newItem["sizeInBytes"] = item.sizeInBytes;
                            newItem["sizeInGB"] = Math.round(item.sizeInBytes / 1024 / 1024 / 1024, 0);
                            newItem["arraySerialNumber"] = item.arraySerialNumber;
                            res.push(newItem);
                        }

                        callback(null, res);
                    }
                    else {
                        callback(result.code, result);
                    }

                })

            }
        ], function (err, result) {
            callback(result);
        });

}


function convertVolumeStructure(volinfo) {

    var volItem = volinfo.volumeInfo;
    var newItem1 = {};
    newItem1["id"] = volItem.volumeID.id.toString();
    newItem1["volumeName"] = volItem.volumeName;
    newItem1["vendorName"] = volItem.vendorName;
    newItem1["productName"] = volItem.productName;
    newItem1["sizeInBytes"] = volItem.sizeInBytes;
    newItem1["sizeInGB"] = Math.round(volItem.sizeInBytes / 1024 / 1024 / 1024, 0);
    newItem1["arraySerialNumber"] = volItem.arraySerialNumber;
    newItem1["clusterid"] = volinfo.clusterUID.id;
    newItem1["copyid"] = volinfo.groupCopyUID.globalCopyUID.copyUID;
    for (var z in volinfo.attachedSplitters) {
        var item3 = volinfo.attachedSplitters[z];

        if (newItem1["attachedSplitters"] === undefined) newItem1["attachedSplitters"] = [];
        newItem1["attachedSplitters"].push(item3.id);
    }

    return newItem1;

}

function GetReplicationSets(rpainfo, CGName, callback) {

    async.waterfall(
        [
            function (callback) {
                GetConsistencyGroups(rpainfo, function (cglist) {
                    var isfind = false;
                    for (var i in cglist) {
                        var item = cglist[i];
                        if (item.name == CGName) {
                            isfind = true;
                            callback(null, item.groupUID);
                        }
                    }
                    if (isfind == false) {
                        callback(504, `not find ConsistencyGroup [${CGName}]`)
                    }
                });
            },
            function (groupUID, callback) {
                var url = `/groups/${groupUID}/replication_sets`;
                CallGet.CallRPAGet(rpainfo, url, function (result) {
                    if (result.code == 200) {
                        var rss = [];
                        for (var i in result.response.innerSet) {
                            var item = result.response.innerSet[i];
                            var newItem = {};
                            newItem["id"] = item.replicationSetUID.id;
                            newItem["name"] = item.replicationSetName;
                            newItem["sizeInBytes"] = item.sizeInBytes;

                            var res = [];
                            for (var j in item.volumes) {
                                var item2 = item.volumes[j];
                                var volItem = item2.volumeInfo;
                                var newItem1 = {};
                                newItem1["id"] = volItem.volumeID.id.toString();
                                newItem1["volumeName"] = volItem.volumeName;
                                newItem1["vendorName"] = volItem.vendorName;
                                newItem1["productName"] = volItem.productName;
                                newItem1["sizeInBytes"] = volItem.sizeInBytes;
                                newItem1["sizeInGB"] = Math.round(volItem.sizeInBytes / 1024 / 1024 / 1024, 0);
                                newItem1["arraySerialNumber"] = volItem.arraySerialNumber;
                                newItem1["clusterid"] = item2.clusterUID.id;
                                newItem1["copyid"] = item2.groupCopyUID.globalCopyUID.copyUID;
                                for (var z in item2.attachedSplitters) {
                                    var item3 = item2.attachedSplitters[z];

                                    if (newItem1["attachedSplitters"] === undefined) newItem1["attachedSplitters"] = [];
                                    newItem1["attachedSplitters"].push(item3.id);
                                }

                                res.push(newItem1);
                            }
                            newItem["volumes"] = res;
                            rss.push(newItem);
                        }
                        callback(null, rss);
                    }
                    else {
                        callback(result.code, result);
                    }

                })

            }
        ], function (err, result) {
            callback(result);
        });

}


/*
RESPONSE:
    {
    "code": 200,
    "msg": "succeed",
    "data": [
        {
        "clusterID": "5157609537127272574",
        "copyUID": 1,
        "name": "ebankwebesxi_Local"
        },
        {
        "clusterID": "5075647406941350638",
        "copyUID": 0,
        "name": "ebankwebesxi_Remote"
        },
        {
        "clusterID": "5157609537127272574",
        "copyUID": 0,
        "name": "ebankwebesxi_Prod"
        }
    ]
    }

*/

function GetCopys(rpainfo, CGName, callback) {

    async.waterfall(
        [
            function (callback) {
                GetConsistencyGroups(rpainfo, function (cglist) {
                    var isfind = false;
                    for (var i in cglist) {
                        var item = cglist[i];
                        if (item.name == CGName) {
                            isfind = true;
                            callback(null, item.groupUID);
                        }
                    }
                    if (isfind == false) {
                        callback(504, `not find ConsistencyGroup [${CGName}]`)
                    }
                });
            },
            function (groupUID, callback) {
                var data = { "groupUID": groupUID };
                GetSplitters(rpainfo, rpainfo.cluster1, function (result) {
                    for (var i in result) {
                        var item = result[i];
                        item["clustername"] = rpainfo.cluster1;
                    }
                    GetSplitters(rpainfo, rpainfo.cluster2, function (result2) {
                        for (var i in result2) {
                            var item = result2[i];
                            item["clustername"] = rpainfo.cluster2;
                        }
                        var splitters = result.concat(result2);
                        data["splitters"] = splitters;
                        callback(null, data);
                    })

                });
            },
            function (data, callback) {
                var groupUID = data.groupUID;
                var url = `/groups/${groupUID}/copies/settings`;
                CallGet.CallRPAGet(rpainfo, url, function (result) {
                    if (result.code == 200) {
                        var res = [];
                        for (var i in result.response.innerSet) {
                            var item = result.response.innerSet[i];
                            var newItem = {};
                            newItem["clusterid"] = item.copyUID.globalCopyUID.clusterUID.id;
                            newItem["CGid"] = groupUID;

                            newItem["copyid"] = item.copyUID.globalCopyUID.copyUID;
                            newItem["name"] = item.name;
                            //newItem["role"] = item.roleInfo.role;
                            switch (item.roleInfo.role) {
                                case 'ACTIVE':
                                    newItem["role"] = "Prod";
                                    break;
                                case 'REPLICA':
                                    if (item.roleInfo.sourceCopyUID.globalCopyUID.clusterUID.id.toString() === item.copyUID.globalCopyUID.clusterUID.id.toString())
                                        newItem["role"] = "Local";
                                    else
                                        newItem["role"] = "Remote";

                                    break;
                            }
                            //newItem["JournalSize"] = item.journal.grossJournalSize;
                            //newItem["JournalSizeInGB"] = item.journal.grossJournalSize / 1024 / 1024;
                            newItem["journal"] = [];

                            for (var j in item.journal.journalVolumes) {
                                var journalItem = item.journal.journalVolumes[j];
                                var volItem = convertVolumeStructure(journalItem);
                                newItem.journal.push(volItem);
                            }
                            newItem["splitters"] = [];
                            for (var j in item.groupCopySplitters) {
                                var splitterItem = item.groupCopySplitters[j];
                                for (var z in data.splitters) {
                                    var splitterItem1 = data.splitters[z];
                                    if (splitterItem.id.toString() == splitterItem1.id) {
                                        newItem.splitters.push(splitterItem1);
                                        break;
                                    }
                                }
                            }

                            res.push(newItem);
                        }

                        callback(null, res);
                    }
                    else {
                        callback(result.code, result);
                    }

                })

            }
        ], function (err, result) {
            callback(result);
        });

}








/*

 Create somethine

*/


/*
desc:
    create sistency group name {{ CGName }} in cluster {{ clustername }}.
Paramater:
    var createCGParamater = {
      "ClusterName": "cluster1",
      "CGName" : "TESTCREATE_CG", 
      "Copys" : {
          "Prod" : {
              journalVolumeName : "device_sc7020_cdp_log_4_1_vol"
          },
          "Local" : {
              journalVolumeName : "sx_journals1 (60)"
          },
          "Remote" : {
              journalVolumeName : "RPA_CDP_VNX_log_1 (2)"
          }
      } 
    }
Response:
    {
    "id": 2015162275
    }
*/

function CreateConsistencyGroup(rpainfo, createCGParamater, callback) {
    var clustername = createCGParamater.ClusterName;

 
    var clustername_remote = clustername == rpainfo.cluster1 ?  rpainfo.cluster2 :  rpainfo.cluster1;

    var CGName = createCGParamater.CGName;
    var prod_logvolname = createCGParamater.Copys.Prod.journalVolumeName;
    var local_logvolname = createCGParamater.Copys.Local.journalVolumeName;
    var remote_logvolname = createCGParamater.Copys.Remote.journalVolumeName;

    async.waterfall(
        [
            function (callback) {
                GetClusters(rpainfo, function (result) {
                    var id = GetClusterID(result, clustername);
                    callback(null, id);
                });
            },
            function (clusterid, callback) {

                var CGParamater = { 
                    "groupName": CGName,
                    "primaryRPA": {
                        "clusterUID": {
                            "id": clusterid
                        },
                        "rpaNumber": 1
                    }
                }

                var url = `/groups/default_group`;
                CallGet.CallRPAPost(rpainfo, url, JSON.stringify(CGParamater), function (result) { 
                    if (result.code == 200) { 
                        callback(null, result);
                    }
                    else {
                        callback(result.code, result);
                    }

                })
            },
            function (arg1, callback) { 
                util.sleep(5000);
                console.log("--------  create copy -------")

                var CreateCopyParamater = {
                    "clustername": clustername,
                    "CGName": CGName,
                    "CopyName": "Prod",
                    "CopySerial": 0
                }
                CreateCopy(rpainfo, CreateCopyParamater, function (result) { 
                    result.data =CreateCopyParamater;
                    callback(null, result) 
            });

            },
            function (arg1, callback) {
                console.log("--------  AddJournalVolumeToCopy for Prod -------")
                util.sleep(5000);
                var paramater = {
                    "clustername": clustername,
                    "CGName": CGName,
                    "CopyName": "Prod",
                    "VolumeName": prod_logvolname
                }
                AddJournalVolumeToCopy(rpainfo, paramater, function (result) {
                    console.log("AddJournalVolumeToCopy for Prod RETURN: " + JSON.stringify(result));
                    result.data =paramater;
                    if (result.code != 200) {
                        callback(result.code, result);
                    } else
                        callback(null, result)
                });

            },

            function (arg1, callback) {
                console.log("--------  Create copy for Local ------")
                util.sleep(5000);

                // ----- Local Copy
                // -----------------------
                var CreateCopyParamater = {
                    "clustername": clustername,
                    "CGName": CGName,
                    "CopyName": "Local",
                    "CopySerial": 1
                }
                CreateCopy(rpainfo, CreateCopyParamater, function (result) {
                    if (result.code != 200) {
                        callback(result.code, result);
                    } else
                        callback(null, result)
                });

            },

            function (arg1, callback) {
                console.log("--------  AddJournalVolumeToCopy for Local ------")
                util.sleep(5000);

                var paramater = {
                    "clustername": clustername,
                    "CGName": CGName,
                    "CopyName": "Local",
                    "VolumeName": local_logvolname
                }
                AddJournalVolumeToCopy(rpainfo, paramater, function (result) {
                    console.log("AddJournalVolumeToCopy for Local RETURN: " + JSON.stringify(result)); 
                    result.data =paramater;
                    if (result.code != 200) {
                        callback(result.code, result);
                    } else
                        callback(null, result)
                });

            },
            function (arg1, callback) {
                console.log("--------  CreateCopy for Remote ------")
                util.sleep(5000);

                // ----- Remote Copy
                // -----------------------

                var CreateCopyParamater = {
                    "clustername": clustername_remote,
                    "CGName": CGName,
                    "CopyName": "Remote",
                    "CopySerial": 0
                }
                CreateCopy(rpainfo, CreateCopyParamater, function (result) { callback(null, result) });

            },
            function (arg1, callback) {
                console.log("--------  AddJournalVolumeToCopy for Remote ------")
                util.sleep(5000);

                var paramater = {
                    "clustername": clustername_remote,
                    "CGName": CGName,
                    "CopyName": "Remote",
                    "VolumeName": remote_logvolname
                }
                AddJournalVolumeToCopy(rpainfo, paramater, function (result) {
                    console.log("AddJournalVolumeToCopy for Remote RETURN: " + JSON.stringify(result));
                    result.data =paramater;
                    if (result.code != 200) {
                        callback(result.code, result);
                    } else
                        callback(null, result)
                });

            },
            function (arg1, callback) {
                console.log("--------  CreateLink for Prod to Local ------")
                util.sleep(5000);

                var paramater = {
                    "CGName": CGName,
                    "Source": {
                        "clustername": clustername,
                        "CopyName": "Prod"
                    },
                    "Target": {
                        "clustername": clustername,
                        "CopyName": "Local"
                    }
                }
                CreateLink(rpainfo, paramater, function (result) { callback(null, result) });

            },
            function (arg1, callback) {
                console.log("--------  CreateLink for Prod to Remote ------")
                util.sleep(5000);

                var paramater = {
                    "CGName": CGName,
                    "Source": {
                        "clustername": clustername,
                        "CopyName": "Prod"
                    },
                    "Target": {
                        "clustername": clustername_remote,
                        "CopyName": "Remote"
                    }
                }
                CreateLink(rpainfo, paramater, function (result) { callback(null, result) });

            }
        ], function (err, result) {
            var retmsg = {
                code: 200,
                msg: "succeed", 
                response: result
            }
            if (err) {
                retmsg.code = err;
                retmsg.msg = result.msg; 
            } 
            callback(retmsg);
        });
}

/*
desc:  
    create a copy {{ CopyName }} on the CG {{ CGName }} in cluster {{ clustername }}.
paramater:
{
    "clustername" : "cluster1",
    "CGName" : "CGTEST",
    "CopyName" : "Prod",
    "CopySerial" : 0  
}
Response:
    
*/
function CreateCopy(rpainfo, paramater, callback) {

    var clustername = paramater.clustername;
    var CGName = paramater.CGName;
    var CopyName = paramater.CopyName;
    var CopySerial = paramater.CopySerial;

    // get the productionCopy value
    var productionCopy;
    if (clustername == rpainfo.cluster1 && CopySerial == 0) productionCopy = true;
    else productionCopy = false;

    var Data = {
        "clusterid": 0,
        "CGid": 0,
        "productionCopy": productionCopy
    }
    async.waterfall(
        [
            function (callback) {
                GetConsistencyGroups(rpainfo, function (cglist) {
                    var isfind = false;
                    for (var i in cglist) {
                        var item = cglist[i];
                        if (item.name == CGName) {
                            isfind = true;
                            Data.CGid = item.groupUID
                            callback(null, Data);
                        }
                    }
                    if (isfind == false) {
                        callback(504, `not find ConsistencyGroup [${CGName}]`)
                    }
                });

            },
            function (datas, callback) {

                GetClusters(rpainfo, function (result) {
                    var id = GetClusterID(result, clustername);
                    datas.clusterid = id;
                    callback(null, datas);
                });

            },
            function (data, callback) {

                var Paramater = {
                    "groupCopy": {
                        "groupUID": {
                            "id": data.CGid
                        },
                        "globalCopyUID": {
                            "clusterUID": {
                                "id": data.clusterid
                            },
                            "copyUID": CopySerial
                        }
                    },
                    "copyName": CopyName,
                    "enabled": false,
                    "productionCopy": data.productionCopy,
                    "JsonSubType": "ConsistencyGroupCopySettingsParams"
                }

                var url = `/groups/${data.CGid}/copies`;
                CallGet.CallRPAPost(rpainfo, url, JSON.stringify(Paramater), function (result) {
                    if (result.code == 200) {
                        var res = result.response;
                        callback(null, res);
                    }
                    else {
                        callback(result.code, result);
                    }

                })
            }
        ], function (err, result) {

            var retmsg = {
                code: 200,
                msg: "succeed",
                data: Data
            }
            if (err != 200 && result != 'Not Result') {
                retmsg.code = err;
                retmsg.msg = result;
                retmsg.data = "";
            }
            callback(retmsg);
        });

}



/*
desc:
    add a volume {{volumename}} to  {{ CopyName }} on the CG {{ CGName }} in cluster {{ clustername }}.
paramater:
{
    "clustername" : "cluster1",
    "CGName" : "CGTEST",
    "CopyName" : "Prod" ,
    "VolumeName": "volname"
}
Response:
    
*/
function AddJournalVolumeToCopy(rpainfo, paramater, callback) {

    var clustername = paramater.clustername;
    var CGName = paramater.CGName;
    var CopyName = paramater.CopyName;
    var VolumeName = paramater.VolumeName;
    var VolumeType = paramater.VolumeType;


    var Data = {
        "clusterid": 0,
        "CGid": 0,
        "copyid": 0,
        "volumeid": 0
    }
    async.waterfall(
        [
            function (callback) {
                console.log("    *** AddJournalVolumeToCopy  getcopys ***");

                GetCopys(rpainfo, CGName, function (copylist) {
                    var isfind = false;
                    for (var i in copylist) {
                        var item = copylist[i];
                        if (item.name == CopyName) {
                            isfind = true;
                            callback(null, item);
                            break;
                        }
                    }
                    if (isfind == false) {
                        callback(503, `not find Copy [${CopyName}]`)
                    }
                });

            },
            function (copy, callback) {
                console.log("    *** AddJournalVolumeToCopy  getvolumes ***");
                GetVolumes(rpainfo, clustername, function (volumes) {

                    for (var i in volumes) {
                        var item = volumes[i];
                        console.log(item.volumeName);
                        var isfind = false;
                        if (item.volumeName.indexOf(VolumeName) >= 0 ) {
                            isfind = true;
                            copy["volumeUID"] = item.id;
                            callback(null, copy);
                            break;
                        }
                    }
                    if (isfind == false)
                        callback(504, `not find volume [${VolumeName}] in cluster [${clustername}]`)
                });
            },
            function (copy, callback) {
                console.log("    *** AddJournalVolumeToCopy  call post for add  ***");
                var calParam = { "id": copy.volumeUID }
                var url = `/groups/${copy.CGid}/clusters/${copy.clusterid}/copies/${copy.copyid}/journal_volumes`;

               // console.log(copy);
                CallGet.CallRPAPost(rpainfo, url, JSON.stringify(calParam), function (result) {
                    //console.log(result);
                    if (result.code == 200) {
                        var res = result.response;
                        console.log(result);
                        callback(null, copy);
                    }
                    else {

                        callback(result.code, copy);
                    }

                })
            }
        ], function (err, result) {
            var retmsg = {
                code: 200,
                msg: "succeed",
                data: result
            }
            if (err != 200 && result != 'Not Result') {
                retmsg.code = err;
                retmsg.msg = result;
                retmsg.data = "";
            }
            callback(retmsg);
        });

}



/*
desc:
    add a volume {{volumename}} to  {{ CopyName }} on the CG {{ CGName }} in cluster {{ clustername }}.
paramater:
{
    "clustername" : "cluster1",
    "CGName" : "CGTEST",
    "CopyName" : "Prod" ,
    "VolumeName": "volname"
}
Response:
    
*/
function AddVolumeToCopy(rpainfo, paramater, callback) {

    var clustername = paramater.clustername;
    var CGName = paramater.CGName;
    var CopyName = paramater.CopyName;
    var VolumeName = paramater.VolumeName;
    var ReplicationSetName = paramater.ReplicationSetName;


    var Data = {
        "clusterid": 0,
        "CGid": 0,
        "copyid": 0,
        "volumeid": 0
    }
    async.waterfall(
        [
            function (callback) {
                GetCopys(rpainfo, CGName, function (copylist) {
                    var isfind = false;
                    for (var i in copylist) {
                        var item = copylist[i];
                        if (item.name == CopyName) {
                            isfind = true;
                            callback(null, item);
                        }
                    }
                    if (isfind == false) {
                        callback(503, `not find Copy [${CopyName}]`)
                    }
                });

            },
            function (copy, callback) {
                GetVolumes(rpainfo, clustername, function (volumes) {

                    for (var i in volumes) {
                        var item = volumes[i];
                        var isfind = false;
                        if (item.volumeName.indexOf(VolumeName) >= 0) {
                            isfind = true;
                            copy["volumeUID"] = item.id;
                            callback(null, copy);
                            break;
                        }
                    }
                    if (isfind == false)
                        callback(504, `not find volume [${VolumeName}] in cluster [${clustername}]`)
                });
            },
            function (copy, callback) {
                var url = `/groups/${copy.CGid}/replication_sets`;
                CallGet.CallRPAGet(rpainfo, url, function (result) {
                    if (result.code == 200) {
                        var isfind = false;
                        for (var i in result.response.innerSet) {
                            var item = result.response.innerSet[i];
                            if (item.replicationSetName == ReplicationSetName) {
                                isfind = true;
                                copy["replicationUID"] = item.replicationSetUID.id;
                                callback(null, copy);
                            }
                        }
                        if (isfind == false)
                            callback(505, `not find replication [${ReplicationSetName}]`);
                    }

                })
            },
            function (copy, callback) {
                var calParam = {
                    "replicationSet": {
                        "groupUID": {
                            "id": copy.CGid
                        },
                        "id": copy.replicationUID
                    },
                    "volumeID":
                    {
                        "id": copy.volumeUID
                    }
                }
                var url = `/groups/${copy.CGid}/clusters/${copy.clusterid}/copies/${copy.copyid}/user_volumes`;

                CallGet.CallRPAPost(rpainfo, url, JSON.stringify(calParam), function (result) {

                    if (result.code == 200) {
                        var res = result.response;
                        callback(null, copy);
                    }
                    else {
                        //console.log(result);
                        callback(result.code, copy);
                    }
                })
            },
            function (data, callback) {
                callback(null, data);
            }
        ], function (err, result) {
            var retmsg = {
                code: 200,
                msg: "succeed",
                data: result
            }
            if (err) {
                retmsg.code = err;
                retmsg.msg = result;
                retmsg.data = "";
            }
            callback(retmsg);
        });

}



/*
desc:
    add a volume {{volumename}} to  {{ CopyName }} on the CG {{ CGName }} in cluster {{ clustername }}.
paramater:
{
    "CGName" : "CGTEST",
    "Source" : {
        "clustername" : "cluster1",
        "CopyName" : "Prod"
    },
    "Target" : {
        "clustername" : "cluster1",
        "CopyName" : "Local"        
    } 
}
Response:
    
*/

function CreateLink(rpainfo, paramater, callback) {

    var createLinkParamater = {
        "firstCopy": {
            "clusterUID": {
                "id": 5157609537127272574
            },
            "copyUID": 0
        },
        "secondCopy": {
            "clusterUID": {
                "id": 5157609537127272574
            },
            "copyUID": 1
        },

        "policy":
        {
            "JsonSubType": "ConsistencyGroupLinkPolicy",
            "protectionPolicy": {
                "protectionType": "ASYNCHRONOUS",
                "syncReplicationLatencyThresholds": {
                    "thresholdEnabled": false
                },
                "syncReplicationThroughputThresholds": {
                    "thresholdEnabled": false
                },
                "rpoPolicy": {
                    "maximumAllowedLag": {
                        "value": 25000000,
                        "type": "MICROSECONDS"
                    },
                    "allowRegulation": false,
                    "minimizationType": "MINIMIZE_LAG"
                },
                "replicatingOverWAN": false,
                "compression": "LOW",
                "bandwidthLimit": 0,
                "measureLagToTargetRPA": true,
                "deduplication": false,
                "weight": 1
            },
            "advancedPolicy": {
                "performLongInitialization": false,
                "snapshotGranularity": "DYNAMIC"
            },
            "snapshotShippingPolicy": null
        }
    }

    async.waterfall(
        [
            function (callback) {
                GetClusters(rpainfo, function (result) {
                    var sourceClusterid = GetClusterID(result, paramater.Source.clustername);
                    var targetClusterid = GetClusterID(result, paramater.Target.clustername);
                    paramater.Source["clusterid"] = sourceClusterid;
                    paramater.Target["clusterid"] = targetClusterid;

                    callback(null, paramater);
                });
            },
            function (data, callback) {
                var CGName = data.CGName;
                GetConsistencyGroups(rpainfo, function (cglist) {
                    var isfind = false;
                    for (var i in cglist) {
                        var item = cglist[i];
                        if (item.name == CGName) {
                            isfind = true;
                            data["CGid"] = item.groupUID;
                            callback(null, data);
                        }
                    }
                    if (isfind == false) {
                        callback(504, `not find ConsistencyGroup [${CGName}]`)
                    }
                });
            },
            function (data, callback) {
                var CGName = data.CGName;
                GetCopys(rpainfo, CGName, function (copylist) {
                    var isfind = 0;
                    for (var i in copylist) {
                        var item = copylist[i];
                        if (item.name == data.Source.CopyName) {
                            data.Source["CopyNameId"] = item.copyid;
                            isfind++;
                        }
                        if (item.name == data.Target.CopyName) {
                            data.Target["CopyNameId"] = item.copyid;
                            isfind++;
                        }
                        if (isfind == 2) {
                            callback(null, data);
                            break;
                        }

                    }
                    if (isfind < 2) {
                        callback(503, `only find Copy [${isfind}]. Should 2`)
                    }
                });

            },
            function (data, callback) {
                var url = `/groups/${data.CGid}/links`;

                createLinkParamater.firstCopy.clusterUID.id = data.Source.clusterid;
                createLinkParamater.secondCopy.clusterUID.id = data.Target.clusterid;

                createLinkParamater.firstCopy.copyUID = data.Source.CopyNameId;
                createLinkParamater.secondCopy.copyUID = data.Target.CopyNameId;

                CallGet.CallRPAPost(rpainfo, url, JSON.stringify(createLinkParamater), function (result) {
                    if (result.code == 200) {
                        var res = result.response;
                        //console.log(result);
                        callback(null, data);
                    }
                    else {

                        callback(result.code, data);
                    }

                })
            }
        ], function (err, result) {
            callback(result);
        });

}



/*
desc:
    add a volume {{volumename}} to  {{ CopyName }} on the CG {{ CGName }} in cluster {{ clustername }}.
paramater:
{
    "ClusterName" : "cluster1",
    "SplitterName" : "CKM00115200199",
    "VolumeName" : "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-03_vol"
}
Response:
    
*/

function AddVolumeToSplitter(rpainfo, paramater, callback) {

    var clustername = paramater.ClusterName;
    var volumename = paramater.VolumeName;
    var splitername = paramater.SplitterName;

    var AddVolumeToSplitterParamater = {
        "volumeID": {
            "id": ""
        },
        "shouldAttachAsClean": false
    }

    async.waterfall(
        [
            function (callback) {
                GetClusters(rpainfo, function (result) {
                    var Clusterid = GetClusterID(result, clustername);
                    paramater["clusterid"] = Clusterid;

                    callback(null, paramater);
                });
            },
            function (data, callback) {

                GetSplitters(rpainfo, clustername, function (result) {
                    var isfind = false;
                    for (var i in result) {
                        var item = result[i];
                        if (item.splitterName == splitername) {
                            isfind = true;
                            data["splitterID"] = item.id;
                            callback(null, data);
                            break;
                        }
                    }
                    if (isfind == false) {
                        callback(504, `not find splitter ${splitername} in cluster [${clustername}] `);
                    }

                });
            },
            function (data, callback) {
                GetVolumes(rpainfo, clustername, function (volumes) {

                    for (var i in volumes) {
                        var item = volumes[i];
                        var isfind = false;
                        if (item.volumeName.indexOf(volumename) >= 0 ) {
                            isfind = true;
                            data["volumeid"] = item.id;
                            callback(null, data);
                            break;
                        }
                    }
                    if (isfind == false)
                        callback(504, `not find volume [${volumename}] in cluster [${clustername}]`)
                });
            },
            function (data, callback) {

                var url = `/clusters/${data.clusterid}/splitters/${data.splitterID}/volumes`;
                AddVolumeToSplitterParamater.volumeID.id = data.volumeid;

                CallGet.CallRPAPost(rpainfo, url, JSON.stringify(AddVolumeToSplitterParamater), function (result) {
                    if (result.code == 200) {
                        var res = result.response;
                        //.log(result);
                        callback(null, data);
                    }
                    else {

                        callback(result.code, data);
                    }

                })
            }
        ], function (err, result) {
            callback(result);
        });

}


/*
desc:
    create sistency group name {{ CGName }} in cluster {{ clustername }}.
Response:
    {
    "id": 2015162275
    }
*/

function EnableConsistencyGroup(rpainfo, CGName, callback) {

    async.waterfall(
        [
            function (callback) {
                GetConsistencyGroups(rpainfo, function (cglist) {
                    var isfind = false;
                    for (var i in cglist) {
                        var item = cglist[i];
                        if (item.name == CGName) {
                            isfind = true;
                            callback(null, item.groupUID);
                        }
                    }
                    if (isfind == false) {
                        callback(504, `not find ConsistencyGroup [${CGName}]`)
                    }
                });


            },
            function (CGid, callback) {
                var url = `/groups/${CGid}/enable?startTransfer=true`;
                CallGet.CallRPAPut(rpainfo, url, "", function (result) {
                    if (result.code == 200) {
                        var res = result.response;
                        callback(null, res);
                    }
                    else {
                        callback(result.code, result);
                    }

                })
            }
        ], function (err, result) {
            callback(result);
        });

}

/*
desc:
    create sistency group name {{ CGName }} in cluster {{ clustername }}.
Response:
    {
    "id": 2015162275
    }
*/

function DisableConsistencyGroup(rpainfo, CGName, callback) {

    async.waterfall(
        [
            function (callback) {
                GetConsistencyGroups(rpainfo, function (cglist) {
                    var isfind = false;
                    for (var i in cglist) {
                        var item = cglist[i];
                        if (item.name == CGName) {
                            isfind = true;
                            callback(null, item.groupUID);
                        }
                    }
                    if (isfind == false) {
                        callback(504, `not find ConsistencyGroup [${CGName}]`)
                    }
                });


            },
            function (CGid, callback) {
                var url = `/groups/${CGid}/disable`;
                CallGet.CallRPAPut(rpainfo, url, "", function (result) {
                    if (result.code == 200) {
                        var res = result.response;
                        callback(null, res);
                    }
                    else {
                        callback(result.code, result);
                    }

                })
            }
        ], function (err, result) {
            callback(result);
        });

}


/*
desc:
    create sistency group name {{ CGName }} in cluster {{ clustername }}.
Response:
    {
    "id": 2015162275
    }
*/ 

function PauseConsistencyGroup(rpainfo, CGName, callback) {

    async.waterfall(
        [
            function (callback) {
                GetConsistencyGroups(rpainfo, function (cglist) {
                    var isfind = false;
                    for (var i in cglist) {
                        var item = cglist[i];
                        if (item.name == CGName) {
                            isfind = true;
                            callback(null, item.groupUID);
                        }
                    }
                    if (isfind == false) {
                        callback(504, `not find ConsistencyGroup [${CGName}]`)
                    }
                });


            },
            function (CGid, callback) {
                var url = `/groups/${CGid}/pause_transfer`;
                CallGet.CallRPAPut(rpainfo, url, "", function (result) {
                    if (result.code == 200) {
                        var res = result.response;
                        callback(null, res);
                    }
                    else {
                        callback(result.code, result);
                    }

                })
            }
        ], function (err, result) {
            callback(result);
        });

}
