"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('testController')
const name = 'my-app'
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
var moment = require('moment');
var xml2json = require('xml2json');
var sortBy = require('sort-by');


var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');
var App = require('../lib/App');
var GETCALL = require('../lib/CallGet');

var mongoose = require('mongoose');
var AppObj = mongoose.model('Application');

var getTopos = require('../lib/topos.js');
var Host = require('../lib/Host');
var VMAX = require('../lib/Array_VMAX');
var VPLEX = require('../lib/Array_VPLEX');
var Switch = require('../lib/Switch');
var VNX = require('../lib/Array_VNX');
var Capacity = require('../lib/Array_Capacity');
var GetEvents = require('../lib/GetEvents');
var DeviceMgmt = require('../lib/DeviceManagement');
var SWITCH = require('../lib/Switch');
var CallGet = require('../lib/CallGet');
var util = require('../lib/util');
var topos = require('../lib/topos');
var DeviceMgmt = require('../lib/DeviceManagement');
var Report = require('../lib/Reporting');

var CAPACITY = require('../lib/Array_Capacity');
var backendMgmt = require('../lib/BackendMgmt');
var Analysis = require('../lib/analysis');
var MongoDBFunction = require('../lib/MongoDBFunction');
var sortBy = require('sort-by');
var Ansible = require('../lib/Ansible');
var Automation = require('../lib/Automation');
var VMAX_AUTO = require('../lib/Automation_VMAX');
var RPA = require('../lib/Automation_RPA');
var Automation_VPLEX = require('../lib/Automation_VPLEX');

var testController = function (app) {

  var config = configger.load();

  app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header('Access-Control-Expose-Headers', '*');

    debug('req.method = %s', req.method);
    debug('req.url = %s', req.url);

    if (req.method == "OPTIONS") res.send(200);  /*让options请求快速返回*/
    else next();
  });
  app.get('/rpa1', function (req, res) {

    var resourceinfo = require("../config/ResourcePool");

    var RPAInfo1 = RPA.GetRPAInfo("RPA-1");
    var RPAInfo = RPAInfo1.info;

    var CGName = 'ebankwebesxi_CG';
    var ClusterName = 'cluster1';
    var ReplicationsetName = 'rset0';


    async.waterfall(
      [
        function (callback) {   
          var createReplicationSetParamater = {
            "CGName": "ebankwebesxi_CG",
            "ReplicationsetName": "rs_1230213033os01",
            "volume": {
              "prod": "dd_ebankwebesxi_VMAX193_unity785_1230213033os01_vol",
              "local": "device_ebankwebesxi_VMAX193_1230213033os01_local_vol",
              "remote": "RPA_CDP_VNX_log_1 (2)"
            }
          }
          
       
          RPA.CreateReplicationSet(RPAInfo, createReplicationSetParamater, function (result) { 
            callback(null, result) 
          });


        } 

      ], function (err, result) {
        res.json(200, result)
      });


  });

  app.get('/rpa', function (req, res) {

    var resourceinfo = require("../config/ResourcePool");

    var RPAInfo1 = RPA.GetRPAInfo("RPA-1");
    var RPAInfo = RPAInfo1.info;

    var CGName = 'ebankwebesxi_CG';
    var ClusterName = 'cluster1';
    var ReplicationsetName = 'rset0';


    async.waterfall(
      [
        function (callback) {

          var createCGParamater = {
            "ClusterName": ClusterName,
            "CGName": CGName,
            "Copys": {
              "Prod": {
                journalVolumeName: "device_sc7020_cdp_log_4_1_vol"
              },
              "Local": {
                journalVolumeName: "sx_journals1 (60)"
              },
              "Remote": {
                journalVolumeName: "RPA_CDP_VNX_log_2 (3)"
              }
            }
          }
          RPA.CreateConsistencyGroup(RPAInfo, createCGParamater, function (result) {
            if (result.code != 200) {
              callback(result.code, result);
            } else
            callback(null, result)
          });

        },
        function (arg1, callback) {
          var createReplicationSetParamater = {
            "CGName": CGName,
            "ReplicationsetName": ReplicationsetName,
            "volume": {
              "prod": "dd_ebankwebesxi_VMAX193_unity785_1231213659os01_vol",
              "local": "device_ebankwebesxi_VMAX193_1231213659os01_local_vol",
              "remote": "RPA_CDP_VNX__2 (1)"
            } 
          }
      
          var createReplicationSetParamater1 = {
            "CGName": "ebankwebesxi_CG",
            "ReplicationsetName": "rs_1230213033os01",
            "volume": {
              "prod": "dd_ebankwebesxi_VMAX193_unity785_1230213033os01_vol",
              "local": "device_ebankwebesxi_VMAX193_1230213033os01_local_vol",
              "remote": "RPA_CDP_VNX_log_2 (3)"
            }
          }
          
       
          RPA.CreateReplicationSet(RPAInfo, createReplicationSetParamater, function (result) { 
            callback(null, result) 
          });

        }, 
        function( arg1, callback ) {
          
          RPA.EnableConsistencyGroup(RPAInfo, CGName, function (result) { 
            callback(null, result) 
          });
      
        }

      ], function (err, result) {
        res.json(200, result)
      });


  });


  app.get('/rpa_unit_test', function (req, res) {

    var RPAInfo1 = RPA.GetRPAInfo("RPA-1");
    var RPAInfo = RPAInfo1.info;

    /*
    var RPAInfo = {
        "IP": "10.32.32.185",
        "username": "admin",
        "password": "admin",
        "baseurl": "/fapi/rest/5_1"
      } 
      */

    RPA.GetConsistencyGroups(RPAInfo, function (result) { res.json(200, result) });

    /*
    RPA.GetClusters(RPAInfo, function(result) { 
        var id = RPA.GetClusterID(result,"cluster2");
        console.log(result);
        res.json(200, result) ; 
    }); 
    */

   //RPA.GetRPAConfigureInfo(RPAInfo, function (result) { res.json(200, result) });
    //RPA.GetSplitters(RPAInfo, "cluster1", function (result) { res.json(200, result) });
    //RPA.GetVolumes(RPAInfo, "cluster1", function(result) { res.json(200, result)});
    //RPA.GetCopys(RPAInfo, "ebankwebesxi_CG", function(result) { res.json(200, result)});
    //RPA.GetReplicationSets(RPAInfo, "ebankwebesxi_CG", function(result) { res.json(200, result)}); 

    /*
    var createCGParamater = {
      "ClusterName": "cluster1",
      "CGName": "TESTCREATE_CG",
      "Copys": {
        "Prod": {
          journalVolumeName: "device_sc7020_cdp_log_4_1_vol"
        },
        "Local": {
          journalVolumeName: "sx_journals1 (60)"
        },
        "Remote": {
          journalVolumeName: "RPA_CDP_VNX_log_1 (2)"
        }
      }
    }
    RPA.CreateConsistencyGroup(RPAInfo, createCGParamater, function (result) {
      if (result.code != 200) {
        res.json(result.code, result);
      } else
        res.json(200, result)
    });
*/

    var CreateCopyParamater = {
      "clustername": "cluster1",
      "CGName": CGName,
      "CopyName": "Prod",
      "CopySerial": 0
    }
    //RPA.CreateCopy(RPAInfo, CreateCopyParamater , function (result) { res.json(200, result) });


    var paramater = {
      "clustername": "cluster1",
      "CGName": CGName,
      "CopyName": "Prod",
      "VolumeName": "device_sc7020_cdp_log_4_1_vol"
    }
    //RPA.AddJournalVolumeToCopy(RPAInfo, paramater, function (result) { res.json(200, result) });

    var ReplicationsetName = "rset2";
    var CGName = "TESTCREATE_CG";
    //RPA.CreateReplicationSet(RPAInfo, CGName, ReplicationsetName, function (result) { res.json(200, result) });

    var paramater = {
      "clustername": "cluster1",
      "CGName": CGName,
      "CopyName": "Prod",
      "VolumeName": "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-05_vol",
      "ReplicationSetName": ReplicationsetName
    }
    //RPA.AddVolumeToCopy(RPAInfo, paramater, function (result) { res.json(200, result) });


    // ----- Local Copy
    // -----------------------
    var CreateCopyParamater = {
      "clustername": "cluster1",
      "CGName": CGName,
      "CopyName": "Local",
      "CopySerial": 1
    }
    //RPA.CreateCopy(RPAInfo, CreateCopyParamater , function (result) { res.json(200, result) });


    var paramater = {
      "clustername": "cluster1",
      "CGName": CGName,
      "CopyName": "Local",
      "VolumeName": "sx_journals1 (60)"
    }
    //RPA.AddJournalVolumeToCopy(RPAInfo, paramater, function (result) { res.json(200, result) });

    var paramater = {
      "clustername": "cluster1",
      "CGName": CGName,
      "CopyName": "Local",
      "VolumeName": "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-06_vol",
      "ReplicationSetName": ReplicationsetName
    }
    //RPA.AddVolumeToCopy(RPAInfo, paramater, function (result) { res.json(200, result) });



    // ----- Remote Copy
    // -----------------------
    var CreateCopyParamater = {
      "clustername": "cluster2",
      "CGName": CGName,
      "CopyName": "Remote",
      "CopySerial": 0
    }
    //RPA.CreateCopy(RPAInfo, CreateCopyParamater , function (result) { res.json(200, result) });


    var paramater = {
      "clustername": "cluster2",
      "CGName": CGName,
      "CopyName": "Remote",
      "VolumeName": "RPA_CDP_VNX_log_1 (2)"
    }
    //RPA.AddJournalVolumeToCopy(RPAInfo, paramater, function (result) { res.json(200, result) });

    var paramater = {
      "clustername": "cluster2",
      "CGName": CGName,
      "CopyName": "Remote",
      "VolumeName": "RPA_CDP_VNX__2 (1)",
      "ReplicationSetName": ReplicationsetName
    }
    //RPA.AddVolumeToCopy(RPAInfo, paramater, function (result) { res.json(200, result) });

    var paramater = {
      "CGName": CGName,
      "Source": {
        "clustername": "cluster1",
        "CopyName": "Prod"
      },
      "Target": {
        "clustername": "cluster1",
        "CopyName": "Local"
      }
    }
    //RPA.CreateLink(RPAInfo, paramater, function (result) { res.json(200, result) });



    var paramater = {
      "CGName": CGName,
      "Source": {
        "clustername": "cluster1",
        "CopyName": "Prod"
      },
      "Target": {
        "clustername": "cluster2",
        "CopyName": "Remote"
      }
    }
    //RPA.CreateLink(RPAInfo, paramater, function (result) { res.json(200, result) });
 
    //RPA.EnableConsistencyGroup(RPAInfo, CGName, function (result) { res.json(200, result) });

    //RPA.DisableConsistencyGroup(RPAInfo, CGName, function (result) { res.json(200, result)});

    var paramater = {
      "ClusterName": "cluster1",
      "SplitterName": "CKM00115200199",
      "VolumeName": "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-03_vol"
    }
    //RPA.AddVolumeToSplitter(RPAInfo, paramater, function (result) {  res.json(200, result)  });


    var createCGParamater = {
      "ClusterName": "cluster1",
      "CGName": "TESTCREATE_CG",
      "Copys": {
        "Prod": {
          "journalVolumeName": "device_sc7020_cdp_log_4_1_vol"
        },
        "Local": {
          "journalVolumeName": "sx_journals1 (60)"
        },
        "Remote": {
          "journalVolumeName": "RPA_CDP_VNX_log_1 (2)"
        }
      }
    }
    // RPA.CreateConsistencyGroup(RPAInfo, createCGParamater, function (result) {  res.json(200, result)});



    var createReplicationSetParamater2 = {
      "CGName": "ebankwebesxi_CG",
      "ReplicationsetName": "rset2",
      "volume": {
        "prod": "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-05_vol",
        "local": "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-06_vol",
        "remote": "RPA_CDP_VNX__2 (1)"
      },
      "splitter": {
        "cluster1": "CKM00115200199",
        "cluster2": "CKM00140600110-A"
      }
    }

    var createReplicationSetParamater1 = {
      "CGName": "TESTCREATE_CG",
      "ReplicationsetName": "rset2",
      "volume": {
        "prod": "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-03_vol",
        "local": "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-04_vol",
        "remote": "RPA_CDP_VNX__1 (0)"
      } 
    }

    var createReplicationSetParamater3 = {
      "CGName": "TESTCREATE_CG",
      "ReplicationsetName": "rset3",
      "volume": {
        "prod": "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-05_vol",
        "local": "dd_ebankwebesxi_VMAX193_unity785_data-1130175738-06_vol",
        "remote": "RPA_CDP_VNX__2 (1)"
      } 
    }


    //RPA.CreateReplicationSet(RPAInfo, createReplicationSetParamater1, function (result) { res.json(200, result) });

  });


  function sleep(sleepTime) {
    for (var start = +new Date; +new Date - start <= sleepTime;) { };
  }
  

  app.get('/vmaxtest', function (req, res) {

    var physicalArrayInfos = [{
      serial_no: '000296800706',
      password: 'smc',
      unispherehost: '10.121.0.207',
      universion: '90',
      user: 'smc',
      verifycert: false
    },
    {
      serial_no: '000297800193',
      password: 'smc',
      unispherehost: '10.121.0.204',
      universion: '90',
      user: 'smc',
      verifycert: false
    }];

    VMAX.SyncDeviceID(physicalArrayInfos, function (result) {
      console.log("----- SyncDeviceID is finished ----- " + JSON.stringify(result));
      res.json(200, result);
    })
  });
 

  app.get('/autotest', function (req, res) {

    VPLEX.UnitTest(arrayinfo, functionname, clustername, function (result) {
      res.json(200, result);
    });


  });

  app.get('/awxtest', function (req, res) {


    var config = configger.load();
    //var servicename = req.query.servicename;
    /*
            var servicename = "gatherfact";
            var postbody = { "extra_vars" : {
                "serial_no": "000297800192",
                "password": "smc",
                "unispherehost": "10.121.0.204",
                "universion": "90",
                "user": "smc",
                "verifycert": false,
                "factname": "sg"
            }
            }
            */


    var servicename = "volume-create";
    var postbody = {
      "extra_vars": {
        "serial_no": "000297800193",
        "password": "smc",
        "unispherehost": "10.121.0.204",
        "universion": "90",
        "user": "smc",
        "verifycert": false,
        "sg_name": "ansible-test-sg",
        "cap_unit": "GB",
        "capacity": "3",
        "vol_name": "ansible-test-volume-03"
      }
    }

    /*
    var servicename = "storagegroup-create";
    var postbody = {
        "extra_vars":{
            "serial_no":"000297800193",
            "password":"smc",
            "unispherehost":"10.121.0.204",
            "universion":"90",
            "user":"smc",
            "verifycert":false,
            "sg_name":"ansible-test-sg",
            "service_level":  "Diamond",
            "srp": "SRP_1"
    
        }
    }
    */

    Ansible.executeAWXService(servicename, postbody, function (result) {
      console.log("executeAWXService is return. ")
      //console.log(msg); 
      res.json(result.code, result);


    })

  });

  function GetAssignedInitiatorByDevices(device, callback) {

    async.waterfall([
      function (callback) {

        var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
        queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

        queryString = queryString + "     SELECT distinct  ?arraySN ?deviceName ?deviceWWN ?MaskingView  ";
        queryString = queryString + "     WHERE {    ";
        queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
        queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
        queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    ";
        queryString = queryString + "       ?device srm:displayName ?deviceName .   ";
        queryString = queryString + "       ?device srm:volumeWWN ?deviceWWN .    ";
        queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";
        if (device !== undefined)
          queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";
        queryString = queryString + "     }  ";

        topos.querySparql(queryString, function (response) {
          for (var i in response) {
            var item = response[i];
            item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:" + item.arraySN + ":", "");
          }
          var result = {};
          result["devices"] = response;
          callback(null, result);
        });
      },
      function (arg1, callback) {
        var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
        queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

        queryString = queryString + "     SELECT distinct  ?arraySN ?MaskingView ?initEndPoint ";
        queryString = queryString + "     WHERE {    ";
        queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
        queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
        queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    ";
        queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";
        queryString = queryString + "       ?MaskingView srm:maskedToInitiator ?initEndPoint .    ";

        if (device !== undefined)
          queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";
        queryString = queryString + "     }  ";

        var maskingviews = {};
        topos.querySparql(queryString, function (response) {
          for (var i in response) {
            var item = response[i];
            item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:" + item.arraySN + ":", "");
            item["initEndPoint"] = item.initEndPoint.replace("topo:srm.ProtocolEndpoint:", "");
            if (maskingviews[item.MaskingView] !== undefined) {
              maskingviews[item.MaskingView]["initEndPoint"].push(item.initEndPoint);
            } else {
              maskingviews[item.MaskingView] = {}
              maskingviews[item.MaskingView]["arraySN"] = item.arraySN;
              maskingviews[item.MaskingView]["initEndPoint"] = [];
              maskingviews[item.MaskingView]["initEndPoint"].push(item.initEndPoint);
            };
          }



          arg1["maskingview"] = maskingviews;
          callback(null, arg1);
        });
      },
      function (arg1, callback) {
        var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + "     PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>   ";
        queryString = queryString + "     PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>   ";

        queryString = queryString + "     SELECT distinct  ?arraySN ?MaskingView ?FEName ";
        queryString = queryString + "     WHERE {    ";
        queryString = queryString + "       ?arrayEntity rdf:type srm:StorageEntity .     ";
        queryString = queryString + "       ?arrayEntity srm:serialNumber ?arraySN .    ";
        queryString = queryString + "       ?arrayEntity srm:containsStorageVolume ?device .    ";
        queryString = queryString + "       ?device srm:maskedTo ?MaskingView .   ";
        queryString = queryString + "       ?MaskingView srm:maskedToTarget ?FEEndPoint .    ";
        queryString = queryString + "       ?FEEndPoint srm:Identifier ?FEName .    ";

        if (device !== undefined)
          queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  ";
        queryString = queryString + "     }  ";

        var maskingviews = arg1.maskingview;
        topos.querySparql(queryString, function (response) {
          for (var i in response) {
            var item = response[i];
            item["MaskingView"] = item.MaskingView.replace("topo:srm.MaskingView:" + item.arraySN + ":", "");
            item["FEName"] = item.FEName.replace("topo:srm.StorageFrontEndPort:" + item.arraySN + ":", "");

            if (maskingviews[item.MaskingView] !== undefined) {
              if (maskingviews[item.MaskingView]["FEName"] === undefined)
                maskingviews[item.MaskingView]["FEName"] = [];
              maskingviews[item.MaskingView]["FEName"].push(item.FEName);
            } else {
              maskingviews[item.MaskingView] = {}
              maskingviews[item.MaskingView]["arraySN"] = item.arraySN;
              maskingviews[item.MaskingView]["FEName"] = [];
              maskingviews[item.MaskingView]["FEName"].push(item.FEName);
            };

          }

          callback(null, arg1);
        });
      }
    ], function (err, result) {

      callback(result);
    });

  }


  app.get('/test1', function (req, res) {
    var filter = {};
    DeviceMgmt.getMgmtObjectInfo(filter, function (arrayInfo) {
      var resInfo = {};
      for (var i in arrayInfo) {
        var item = arrayInfo[i];

        if (item.name.indexOf("VNX") >= 0 | item.name.indexOf("UNITY") >= 0) {
          resInfo[item.name] = item;
        } else
          resInfo[item.storagesn] = item;
      }

      res.json(200, resInfo);
    })
  });


  app.get('/test3', function (req, res) {
    var device;
    var perfStat = util.getConfStartTime('1w');
    var param = {};
    param['device'] = device;
    param['period'] = '3600';
    param['start'] = perfStat;
    param['type'] = 'max';

    param['keys'] = ['serialnb,part'];
    param['fields'] = ['device', 'dgstype', 'fsid', 'format', 'fsname', 'nasname', 'partdesc', 'type'];
    param['filter'] = 'parttype==\'FileSystem\'';
    param['filter_name'] = '(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'UsedCapacity\'|name=\'CurrentUtilization\'|name=\'TotalBandwidth\'|name=\'TotalThroughput\')';


    var ret1 = []
    CallGet.CallGetPerformance(param, function (ret) {
      res.json(200, ret);
    });
  });

  app.get('/test4', function (req, res) {

    var start = '2018-09-01T16:00:00.000Z';
    var end = '2018-10-30T16:00:00.000Z';

    var param = {};
    var device = '000496700235';
    if (typeof device !== 'undefined') {
      param['filter'] = '!parttype&device=\'' + device + '\'&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
    } else {
      //param['filter'] = '!parttype&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\'|source==\'VNXUnity-Collector\')';
      param['filter'] = '!parttype&(source=\'VMAX-Collector\'|source==\'VNXBlock-Collector\')';
    }


    param['filter_name'] = '(name=\'UsedCapacity\')';
    param['keys'] = ['serialnb'];
    param['fields'] = ['sstype', 'device', 'model', 'vendor', 'devdesc'];
    param['period'] = 86400;
    param['start'] = start;
    param['end'] = end
    param['type'] = 'max';


    CallGet.CallGetPerformance(param, function (retcap) {

      res.json(200, retcap);
    });


  });

  app.get('/test/users', function (req, res) {
    var existentUsernames = ["Joe"];
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header('Access-Control-Expose-Headers', '*');

    res.json(200, { exists: false });
  });


  app.get('/test', function (req, res) {
    res.setTimeout(1200 * 1000);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    var from = req.query.from;
    var to = req.query.to;

    var device = req.query.device;
    var period = 86400;
    var eventParam = {};
    if (typeof device !== 'undefined') {
      eventParam['filter'] = 'device=\'' + device + '\'&!acknowledged&active=\'1\'';
      var filter = 'device=\'' + device + '\'&!acknowledged&active=\'1\'';
    } else {
      eventParam['filter'] = '!acknowledged&active=\'1\'';
    }

    //console.log(eventParam);
    //GetEvents.GetEvents(eventParam, function(result1) {   
    var fabwwn;

    var config = configger.load();
    var ReportTmpDataPath = config.Reporting.TmpDataPath;
    //GetAssignedInitiatorByDevices1(device,function(result) {

    //SWITCH.getZone(device, function (zonelist) { res.json(200, zonelist); });

    // Switch.getFabric(fabwwn,function(resultJson) {    res.json(200,resultJson);       });

     //var device = 'ED_DCX_4S_B-10000027F81E390B'; 
     //Switch.GetSwitchPorts(device, function(result) {  res.json(200,result);       }); 
     /*
    Switch.GetSwitchPorts(device, function(result) {  
      var a = [];
      for ( var i in result) {
        var item = result[i];
        //if ( item.partwwn == '20880027F81E388C') a.push(item);
    }          
    res.json(200,a);       }); 
    */

    //VMAX.getArrayPerformance1( function(result) {            res.json(200,result);       }); 

    // VMAX.GetCapacity(device, function(result) {            res.json(200,result);       });  
    var sgname;
    var period = 86400;

    var valuetype = 'average';
    //var start  = util.getPerfStartTime(); 
    var start = '2019-06-21T16:00:00.000Z';
    var end = '2019-06-26T16:00:00.000Z';

    //var start = '2018-10-01T16:00:00.000Z';
    //var end = '2018-10-30T16:00:00.000Z';

    //var device = '000297800859';
    var part;

    //VMAX.GetFEPorts(device, function (rest) { res.json(200, rest); });
    //VMAX.getArrayPerformanceV3( device, start, end , valuetype, period, function(result) {            res.json(200,result);       }); 


    // VMAX.GetStorageGroupsPerformance(device, period, start, end, valuetype, function(rest) {        res.json(200,rest);           });
    //function GetFCSwitchPart(devtype,parttype,callback) { 
    //Report.getAppStorageRelationV2(device, function (result )  {  res.json(200,result) });


    //Report.getArrayResourceLimits(from,to, function (result )  {  res.json(200,result) });

    //CAPACITY.GetArrayTotalCapacity('lastMonth', function(result) {   res.json(200,result);   }); 
    // Report.GetArraysIncludeHisotry(device, start, end, function(result) {    res.json(200,result);   }); 

    //VMAX.getArrayLunPerformance1(device, function(ret) {           res.json(200,ret);        });

    //cdevice, function(rest) {             res.json(200,rest);        });
    //getTopos.getTopos(function(result) { res.json(200, result) });

    // SWITCH.getZone(device, function(rest) {             res.json(200,rest);        });
    // VMAX.GetStorageGroups(device, function(result) {   res.json(200,result);   }); 
    //VMAX.GetDirectorPerformance(device, period, start, valuetype, function(rest) {             res.json(200,rest);        });
    //VMAX.GetDiskPerformance(device, period, start,end,  valuetype, function(rest) {             res.json(200,rest);        });
    //VMAX.GetArrays(  function(ret) {  res.json(200,ret);   }); 
    //Report.GetStoragePorts(function(ret) {


    //VMAX.GetSGTop20ByCapacity(device, function(ret) {
    //Capacity.GetArrayCapacity(device, function(ret) {     res.json(200,ret);        });
    //DeviceMgmt.GetArrayAliasName(function(ret) {           res.json(200,ret);        });
    //DeviceMgmt.getPartnerArrayInfo(device, function(ret) {           res.json(200,ret);        });
    //VNX.GetBlockDevices(device,  function(result) {   res.json(200,result);   }); 
    //VNX.getSPPerformance(device, part, start, end ,function(result) {  res.json(200,result);   });

    //VNX.GetUNITY_NASSERVER(device,  function(result) {   res.json(200,result);   }); 
    //VNX.GetVNX_NFSExport(device,  function(result) {   res.json(200,result);   }); 
    //VNX.GetUNITY_NFSExport(device,  function(result) {   res.json(200,result);   }); 
    //var device  = 'Unity-022';
    var vols = 'jytjsxt';
    var start = '2018-01-01T01:01:01+08:00';
    var end = '2018-08-29T16:00:00.000Z';
    // VNX.getNFSPerformance(device, vols, start, end,function(result) {  res.json(200,result);   }); 
    //VNX.getUNITY_FS_Performance(device, vols, start, end,function(result) {  res.json(200,result);   }); 

    //VNX.GetArrayType(device,  function(result) {   res.json(200,result);   }); 

    //Report.initiatalApplicationInfo( function (ret ) { res.json(200,ret); });
    //VNX.GetMaskViews(function(ret) {  res.json(200,ret);   }); 
    VMAX.GetMaskViews(device, function(ret) { res.json(200,ret); });

    //Report.E2ETopology(device, function (ret) { res.json(200, ret); });
 
    /*
    Report.E2ETopology(device, function (ret) { 
      
      var match = ret.marched;
      
      var result = [];
      for ( var i in match ) {
        var item = match[i];
        if ( item.hbawwn == '21000024FF3FA4B5' && item.arrayport_wwn == '500014428075F000') {
          result.push(item);
        }
      }

      res.json(200, result); 
    
    }); 
    */

    /*
     VPLEX.getVplexStorageViews(device, function(ret) {  
       var result = [];
       for ( var i in ret ) {
         var item = ret[i];
         if ( item.part == 'JXQ_BackupServer' && item.device == 'CKM00130800839') {
           result.push(item);
         }
       }  
       res.json(200,result);    
      });
      */

    //VPLEX.getVplexStorageViews(device, function(ret) {  res.json(200,ret);   }); 

    //Report.ArrayAccessInfos(device, function(ret) {    res.json(200,ret);    });


    //VMAX.GetAssignedHosts(device, function(rest) { res.json(200,rest); });

    //Report.GetApplicationInfo( function (ret) {  res.json(200,ret); });
    //Analysis.getAppTopology(function(apptopo) {            res.json(200,apptopo);        })
    // DeviceMgmt.getMgmtObjectInfo(device, function(ret) {     res.json(200,ret);        });
    //var apps = Report.ApplicationCapacityAnalysis("","");
    //res.json(200,apps);
    //VNX.GetSPs(device, function(ret) { res.json(200,ret); });
    //var sgname; 
    //VNX.GetUnity_FileSystem(device, function(ret) { res.json(200,ret); });

    //var finalResult={};
    //VNX.GetUnity_FileSystem(device,function(result) {  res.json(200,result); }); 



    //VPLEX.GetVirtualVolumeRelationByDevices(device, function(ret) {  res.json(200,ret);   }); 
    //VPLEX.GetStorageVolumeByDevices(device, function(ret) {  res.json(200,ret);   }); 
  });


  app.get('/test_backmgmt', function (req, res1) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var config = configger.load();
    var url = '/overview/physical';
    //var url = "/polling/server?server=s3";
    var REQUIRE_URL = config.BackendMgmt.URL + url;

    async.waterfall(
      [
        function (callback) {
          backendMgmt.BackEndLogin(function (sso_token) {

            var req = unirest("GET", REQUIRE_URL);

            req.headers({
              "content-type": "application/x-www-form-urlencoded",
              "referer": config.BackendMgmt.URL,
              "cookie": "JSESSIONIDSSO=" + sso_token
            });

            req.end(function (res) {
              if (res.error) console.log(res.error);


              var xmlstr = "<div>" + res.body + "</div>";
              var options = {
                object: true
              };
              var json = xml2json.toJson(xmlstr, options);

              var serverList = [];
              for (var i in json.div.div.div) {
                var item = json.div.div.div[i];
                if (item.id === undefined) continue;

                var serverItem = {};
                serverItem["id"] = item.id;
                serverItem["name"] = item.h2.a['$t'];
                serverItem["type"] = item.h2.a["title"];
                serverList.push(serverItem);
              }

              callback(null, serverList);
            });
          });

        }

      ], function (err, result) {
        // result now equals 'done'

        res1.json(200, result);
      });
  });



  app.get('/test2', function (req, res) {

    var start = '2019-06-01T08:00:00.000+08:00';
    var end = '2019-06-10T08:00:00.000+08:00';
    var fename = 'FA-8F';

    var tmpresult = {};


    var isNeedBaseLine = false;
    async.waterfall([
      function (callback) {

        var param = {};
        param['period'] = 86400;
        param['start'] = start;
        param['end'] = end;
        param['type'] = 'max';
        param['filter_name'] = '(name==\'Capacity\')';
        param['keys'] = ['part'];
        param['fields'] = ['device'];

        param['filter'] = 'datagrp=\'VMAX-STORAGEPOOLS\'&parttype=\'Disk Group\'';



        CallGet.CallGetPerformance(param, function (feperf) {

          tmpresult["diskgroup"] = feperf;
          callback(null, tmpresult);
        });
      },
      function (restData, callback) {

        var param = {};
        param['period'] = 86400;
        param['start'] = start;
        param['end'] = end;
        param['type'] = 'max';
        //param['filter_name'] = '(name==\'Capacity\')';
        param['filter_name'] = '!vstatus==\'inactive\'';
        param['keys'] = ['part'];
        param['fields'] = ['device'];

        //param['filter'] = 'datagrp=\'VMAX-STORAGEPOOLS\'&parttype=\'Storage Pool\'';

        param['filter'] = '((datagrp=\'VMAX-SAF\'&name=\'ThickLunCapacity\')|(datagrp=\'VMAX-STORAGEPOOLS\'&parttype=\'Storage Pool\'&name=\'Capacity\'))'



        CallGet.CallGetPerformance(param, function (feperf) {

          restData["pool"] = feperf;
          callback(null, restData);
        });


      },
      function (restData, callback) {

        var result = [];


        for (var i in restData.diskgroup) {
          var item = restData.diskgroup[i];
          var newItem = {};

          var isfind = false;
          for (var j in result) {
            var resultItem = result[j];
            if (resultItem.device == item.device) {
              isfind = true;
              resultItem.rawCapacity += item.matricsStat.Capacity.last;
              break;
            }
          }
          if (isfind == false) {
            newItem["device"] = item.device;
            newItem["storageSn"] = item.device;
            newItem["plannedCapacity"] = 0;
            newItem["maxCapacity"] = 0;
            newItem["viewCapacity"] = 0;
            newItem["viewCapacityPercent"] = 0;
            newItem["rawCapacity"] = item.matricsStat.Capacity.last;
            result.push(newItem);
          }
        }

        for (var i in restData.pool) {
          var item = restData.pool[i];
          var newItem = {};

          if (item.device == '000292600901') console.log(item);

          var isfind = false;
          for (var j in result) {
            var resultItem = result[j];
            if (resultItem.device == item.device) {
              isfind = true;
              if (resultItem.logicCapacity === undefined) resultItem["logicCapacity"] = 0;
              resultItem.logicCapacity += (item.matricsStat.Capacity !== undefined ? item.matricsStat.Capacity.last : 0 + item.matricsStat.ThickLunCapacity !== undefined ? item.matricsStat.ThickLunCapacity.last : 0);
              break;
            }
          }
          if (isfind == false) {
            newItem["device"] = item.device;
            newItem["logicCapacity"] = (item.matricsStat.Capacity !== undefined ? item.matricsStat.Capacity.last : 0 + item.matricsStat.ThickLunCapacity !== undefined ? item.matricsStat.ThickLunCapacity.last : 0);
            result.push(newItem);
          }
        }



        callback(null, result);

      }
    ], function (err, result) {

      var device;
      DeviceMgmt.getMgmtObjectInfo(device, function (ret) {

        for (var i in result) {
          var item = result[i];
          for (var j in ret) {
            var item1 = ret[j];

            if (item.device == item1.sn) item["storageName"] = item1.name;

          }


        }

        result.sort(sortBy("storageName"));

        res.json(200, result);
      });

    });


  });

  app.get('/api/test/list', function (req, res) {

    var query = AppObj.find({}).select({ "name": 1, "_id": 0 });
    query.exec(function (err, doc) {
      //system error.
      if (err) {
        res.json(500, { status: err })
      }
      if (!doc) { //user doesn't exist.
        res.json(200, []);
      }
      else {
        res.json(500, doc);
      }

    });

  });
  app.get("/autovplex_test", function (req, res) {
    var paramaters = {
      "arrayinfo": {
        "arrayname": "EMCCTEST1",
        "arraytype": "VPLEX",
        "capacity": 1000,
        "info": {
          "name": "EMCCTEST",
          "type": "VPLEX",
          "version": "5.5",
          "endpoint": "https://10.32.32.100/vplex",
          "auth": {
            "username": "service",
            "password": "password"
          }
        },
        "capability": {
          "CDP": {
            "catalog": "CDP.RPA",
            "name": "RPA-1"
          }
        },
        "backend-array": [
          {
            "array_type": "VMAX",
            "serial_no": "000297800193",
            "password": "smc",
            "unispherehost": "10.121.0.204",
            "universion": "90",
            "user": "smc",
            "verifycert": false,
            "sgname": "MSCS_SG",
            "purpose": "Prod"
          },
          {
            "array_type": "Unity",
            "unity_sn": "CKM00163300785",
            "unity_password": "P@ssw0rd",
            "unity_hostname": "10.32.32.64",
            "unity_pool_name": "jxl_vplex101_pool",
            "unity_username": "admin",
            "sgname": "VPLEX_101_BE",
            "purpose": "Prod"
          }
        ]
      },
      basevolname: 'voltest',
      appname: "appname",
      usedfor: 'data',
      count: 2,
      capacityGB: 2,
      storageviews: ['sv1','sv2']
  }

  var paramaters2 = {
    "arrayinfo": {
      "arrayname": "EMCCTEST1",
      "arraytype": "VPLEX",
      "capacity": 1000,
      "info": {
        "name": "EMCCTEST",
        "type": "VPLEX",
        "version": "5.5",
        "endpoint": "https://10.32.32.100/vplex",
        "auth": {
          "username": "service",
          "password": "password"
        }
      }, 
      "backend-array": [ 
        {
          "array_type": "Unity",
          "unity_sn": "CKM00163300785",
          "unity_password": "P@ssw0rd",
          "unity_hostname": "10.32.32.64",
          "unity_pool_name": "jxl_vplex101_pool",
          "unity_username": "admin",
          "sgname": "VPLEX_101_BE",
          "purpose": "Prod"
        }
      ]
    },
    basevolname: "voltest_\`${request.appname}\`",
    appname: "appname",
    usedfor: 'data',
    count: 2,
    capacityGB: 2,
    storageviews: ['sv1','sv2']
}
    //Automation.ExecuteActions_TEST(   function(result) {res.json(200,result);   }) 
    //Automation_VPLEX.CreateAndExportVolume_TEST(   function(result) {res.json(200,result);   })
    Automation_VPLEX.VPlexProvising(paramaters2,function(result) {res.json(200,result);   })
    
  });

  app.get("/test13", function (req, res) {
    var arrayInfo =  {
      "name": "EMCCTEST",
      "type": "VPLEX",
      "version": "5.5",
      "endpoint": "https://10.32.32.100/vplex",
      "auth": {
        "username": "service",
        "password": "password"
      }
    }

    //Automation.ExecuteActions_TEST(   function(result) {res.json(200,result);   }) 
    //Automation_VPLEX.CreateAndExportVolume_TEST(   function(result) {res.json(200,result);   })
    Automation_VPLEX.GetStorageViews(arrayInfo, 'cluster-1',function(result) {res.json(200,result);   })
    
  });

  app.get("/test14", function (req, res) {

    var arrayinfo = {
      "name": "EMCCTEST",
      "type": "VPLEX",
      "version": "5.5",
      "endpoint": "https://10.32.32.100/vplex",
      "auth": {
        "username": "service",
        "password": "password"
      }
    }

    var aa = [
      {
        "name": "VOLTEST_1228171527",
        "lunwwn": "60000970000297800193533030303444"
      },
      {
        "name": "VOLTEST_1228171527",
        "lunwwn": "600601602f204100130a075e6f5f3475"
      }
    ]

    Automation_VPLEX.ClaimStorageVolume(arrayinfo, aa, function(result) {
      res.json(200,result);
    })

  });


  



  app.get('/test12', function (req, res) {

    var fs = require('fs');
    var parser = require('xml2json');

    async.waterfall(
      [
        function (callback) {
          fs.readFile('./demodata/backmgmt-get.xml', 'utf-8', function (err, data) {
            if (err) res.json(500, err);
            else {
              console.log("----");
              var options = {
                object: true
              };
              var newdata = data.replace(/(<input[ a-zA-Z{}0-9.=\"]*)(">)/g, '$1"\/>');

              var json = parser.toJson(newdata, options);
              callback(null, json);
            }

          });

        },
        function (arg, callback) {
          var headerdata = arg.div.div.table.thead.tr.th
          var tbody = arg.div.div.table.tbody.tr;

          var tab = [];
          var header = {};
          for (var i in headerdata) {
            var item = headerdata[i];

            if (i >= 0 & i <= 3)
              header[i] = item;
            else
              header[i] = item.input.value;
          }

          for (var i in tbody) {
            var tbodyItem = tbody[i].td;

            var recordItem = {};
            for (var j in tbodyItem) {
              var itemvalue = tbodyItem[j];

              if (j >= 1 & j <= 3) {
                switch (j) {
                  case '3':
                    recordItem[header[j]] = itemvalue;
                    break;
                  case '1':
                    recordItem[header[j]] = itemvalue.span;
                    break;
                  case '2':
                    recordItem[header[j]] = itemvalue.input.value
                    break;
                }

              } else {
                recordItem[header[j]] = itemvalue.input.value
              }
            }
            tab.push(recordItem);
          }

          callback(null, tab);
        }
      ], function (err, result) {
        // result now equals 'done'

        res.json(200, result);
      });
  });



};

module.exports = testController;
