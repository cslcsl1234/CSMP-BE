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

const ZB = require('zeebe-node');
var Ansible = require('./Ansible');


module.exports = {
    GetConsistencyGroups,
    GetClusters,
    GetClusterID,
    GetVolumes,


    CreateConsistencyGroup,
}


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

    async.waterfall(
        [
            function (callback) {
                var url = "/groups/settings";
                CallGet.CallRPAGet(rpainfo, url, function (result) {
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
            },
            function (groups, callback) {

                callback(null, groups)

            }
        ], function (err, result) {
            callback( result );
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
            callback( result );
        });

}

function GetClusterID(Clusters, ClusterName) {
    for ( var i in Clusters ) {
        var item = Clusters[i];
        if ( item.clusterName == ClusterName ) {
            return item.clusterUID.id;
        }
    }
    return null;
}




function GetVolumes(rpainfo, clusterName, callback) {

    async.waterfall(
        [
            function (callback) {
                GetClusters(rpainfo, function(Clusters) {
                    var isfind = false;
                    for ( var i in Clusters ) {
                        var item = Clusters[i];
                        if ( item.clusterName == clusterName ) {
                            isfind = true 
                            callback(null, item);
                        }
                    }
                    if ( isfind == false ) {
                        callback(505, `not find the cluster [${clusterName}]`);
                    }
                })
            },
            function (cluster, callback) {

                var clusterID = cluster.clusterUID.id;
                var url = `/clusters/${clusterID}/volumes`;
                CallGet.CallRPAGet(rpainfo, url, function (result) { 
                    if ( result.code == 200 ) {
                        var res = result.response.content;
                        callback(null, res);
                    }
                    else  {
                        callback( result.code, result);
                    }
                    
                })

            }
        ], function (err, result) {
            callback( result );
        });

}










/*

 Create somethine

*/


/*
Response:
    {
        "id": 1240713852
    }
*/

function CreateConsistencyGroup(rpainfo, CGName, callback) {
    var CGParamater = {
        "groupName": "g2",
        "primaryRPA": {
            "clusterUID": {
                "id": 111
            },
            "rpaNumber": 1
        }
    }



    async.waterfall(
        [
            function (callback) { 
 
                var url = `/groups/default_group`;
                CallGet.CallRPAPost(rpainfo, url, JSON.stringify(CGParamater), function (result) { 
                    if ( result.code == 200 ) {
                        var res = result.response;
                        callback(null, res);
                    }
                    else  {
                        callback( result.code, result);
                    }
                    
                })

            }
        ], function (err, result) {
            callback( result );
        });

}


