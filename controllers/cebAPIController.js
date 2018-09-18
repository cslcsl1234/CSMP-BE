"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('cebAPIController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
  
var util = require('../lib/util');
var CallGet = require('../lib/CallGet'); 
var cache = require('memory-cache');

var host = require('../lib/Host');

var mongoose = require('mongoose');
var HostObj = mongoose.model('Host');
var HBAObj = mongoose.model('HBA');
  
var HBALIST = require('../demodata/host_hba_list');
var VMAX = require('../lib/Array_VMAX');
var VNX = require('../lib/Array_VNX');
var SWITCH = require('../lib/Switch');
var CAPACITY = require('../lib/Array_Capacity');
var mysql = require('../lib/MySQLDBFunction');
var AppTopologyObj = mongoose.model('AppTopology');
var DeviceMgmt = require('../lib/DeviceManagement');
var Report = require('../lib/Reporting');
var Analysis = require('../lib/analysis'); 
var topos= require('../lib/topos'); 

var cebAPIController = function (app) {

    var config = configger.load();

    app.all('*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
        res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
        res.header('Access-Control-Expose-Headers', '*');

        debug('req.method = %s', req.method);     
        debug('req.url = %s', req.url); 

        if(req.method=="OPTIONS") res.send(200);  /*让options请求快速返回*/
        else  next();
    });


    app.get('/ceb/config/storage/getStorageView', function (req, res) {
        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([
            function(callback){ 
                var param = {};  
                param['fields'] = ['serialnb','device','model','arraytyp','devdesc','name'];
                param['period'] = util.getPeriod(start,end);
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '!parttype&devtype=\'Array\'';
                param['filter_name'] = '(name==\'ConfiguredRawCapacity\'|name=\'TotalLun\'|name==\'TotalDisk\'|name==\'TotalMemory\')';

                var resRecord = [];
                CallGet.CallGetPerformance(param, function(param) {  
                    for ( var i in param ) {
                        var item = param[i];

                        var resItem = {};
                        resItem["maintenanceInfo"] = "";
                        resItem["model"] = item.arraytyp;
                        resItem["maxCache"] = "";
                        resItem["storageSN"] = item.serialnb;
                        resItem["location"] = "1:SD";
                        resItem["diskCount"] = item.matricsStat.TotalDisk===undefined ? 0:item.matricsStat.TotalDisk.max;
                        resItem["lifeCycle"] = "";
                        resItem["type"] = "高端";
                        resItem["used"] = "一般应用";
                        resItem["pools"] = "VP_EFD_MIR1;VP_FC1_MIR1;VP_FC2_MIR1";
                        var url;
                        switch ( item.arraytyp ) {
                            case 'Symmetrix' :
                                url = "../vmax/summary.html";
                                break;
                            case 'VNX' :
                                url = "../vnx/summary.html";
                                break;
                            case 'XtremIO' : 
                                url = "../xtremio/summary.html";
                                break;
                            case '' : 
                                url = "../unity/summary.html";
                                break;
                        }
                        resItem["url"] =url;
                        resItem["poolCount"] = 3;
                        resItem["version"] = item.model;
                        resItem["size"] = Math.round((item.matricsStat.ConfiguredRawCapacity===undefined?0:item.matricsStat.ConfiguredRawCapacity.max)/1024);
                        resItem["microcode"] = item.devdesc;
                        resItem["ports"] = "";
                        resItem["address"] = "";
                        resItem["maxDisks"] = 0;
                        resItem["storageName"] = "";
                        resItem["maxPorts"] = "";
                        resItem["portCount"] = 0;
                        resItem["devices"] = item.matricsStat.TotalLun===undefined ? 0 : item.matricsStat.TotalLun.max;
                        resItem["cacheSize"] = (item.matricsStat.TotalMemory===undefined?0:item.matricsStat.TotalMemory.max)/1024;
         
                        resRecord.push(resItem);
                    }
                    callback(null, resRecord ); 
                });
 
            },
            function(arg1,  callback){ 
                var filter;
                DeviceMgmt.getMgmtObjectInfo(filter,function(arrayinfo) { 
                    for ( var i in arg1 ) {
                        var item = arg1[i];
                        for ( var j in arrayinfo ) {
                            var infoItem = arrayinfo[j];
                            if ( item.storageSN == infoItem.sn ) {
                                item["location"] = infoItem.datacenter+":"+infoItem.cabinet;
                                item["type"] = infoItem.level=='middle'?'中端':'高端';
                                item["used"] = infoItem.specialInfo.used=='general'?'一般应用':'应用';
                                item["storageName"] = infoItem.name; 
                                item["maxCache"] = infoItem.specialInfo.maxCache;
                                item["maxDisks"] = infoItem.specialInfo.maxDisks;
                                item["maxPorts"] = infoItem.specialInfo.maxPorts;
                                item["lifeCycle"] = infoItem.specialInfo.lifeCycle;
                                break;
                            }
                        }
                    }
                    
                    callback(null,arg1);
                })


            },
            function(arg, callback) {
                
                var param = {};
                param['filter'] = 'parttype=\'Storage Pool\'';
                param['keys'] = ['serialnb','device','part']; 

                var finalResult = [];
                CallGet.CallGet(param, function(param) {   
                    var deviceList={};
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        if ( deviceList[item.serialnb] === undefined ) deviceList[item.serialnb] = item.part;
                        else deviceList[item.serialnb] += ',' + item.part;
                    } 

                    for ( var i in arg ) {
                        var item = arg[i];
                        item.pools = deviceList[item.storageSN];
                        item.poolCount = deviceList[item.storageSN]===undefined?0:deviceList[item.storageSN].split(',').length;
                    }
                    
                    callback(null,arg);
                });
            },
            function(arg, callback) {
                
                var param = {};
                param['filter'] = 'parttype=\'Port\'&(partgrp=\'Front-End\'|porttype=\'FE\')';
                param['keys'] = ['serialnb','device','feport']; 

                var finalResult = [];
                CallGet.CallGet(param, function(param) {   
                    var deviceList={};
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        if ( deviceList[item.serialnb] === undefined ) deviceList[item.serialnb] = item.feport;
                        else deviceList[item.serialnb] += ',' + item.feport;
                    } 

                    for ( var i in arg ) {
                        var item = arg[i];
                        item.ports = deviceList[item.storageSN];
                        item.portCount = deviceList[item.storageSN]===undefined?0:deviceList[item.storageSN].split(',').length;
                    }
                    
                    callback(null,arg);
                });
            }
        ], function (err, result) { 
           
            res.json(200,result);
        });

    });


    app.get('/ssmp/rest/vmax/summary/:device', function (req, res) {


        var device = req.params.device;

        console.log("deiv="+device);
        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([
            function(callback){ 
                var param = {};  
                param['device'] = device;
                param['fields'] = ['vendor','arraytype','serialnb','device','model','arraytyp','devdesc','name'];
                param['period'] = util.getPeriod(start,end);
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '!parttype&devtype=\'Array\'';
                param['filter_name'] = '(name==\'ConfiguredRawCapacity\'|name=\'TotalLun\'|name==\'TotalDisk\'|name==\'TotalMemory\')';

                var resRecord = [];
                CallGet.CallGetPerformance(param, function(param) {  
                    for ( var i in param ) {
                        var item = param[i];

                        var retItem = {};
                        retItem["address"] = "";
                        retItem["cacheSize"] =  (item.matricsStat.TotalMemory===undefined?0:item.matricsStat.TotalMemory.max)/1024;
                        retItem["devices"] = item.matricsStat.TotalLun===undefined ? 0 : item.matricsStat.TotalLun.max;
                        retItem["disks"] = item.matricsStat.TotalDisk===undefined ? 0:item.matricsStat.TotalDisk.max;
                        retItem["hostCount"] = "";
                        retItem["lifeCycle"] = "";
                        retItem["location"] = "";
                        retItem["maintenanceInfo"] = "";
                        retItem["maxCache"] = 0;
                        retItem["maxDisks"] = 0;
                        retItem["maxPorts"] = 0;
                        retItem["microcodeVersion"] = item.devdesc;
                        retItem["model"] = "VMAX";
                        retItem["pools"] = 5;
                        retItem["ports"] = 48;
                        retItem["size"] = Math.round((item.matricsStat.ConfiguredRawCapacity===undefined?0:item.matricsStat.ConfiguredRawCapacity.max)/1024);
                        retItem["storageName"] = "";
                        retItem["storageSN"] = item.serialnb;
                        retItem["type"] = "高端";
                        retItem["used"] = "一般应用";
                        retItem["vendor"] = item.vendor;
                        
                        
                       
                        

                        resRecord.push(retItem);
                    }
                    callback(null, resRecord ); 
                });
 
            },
            function(arg1,  callback){ 
                var filter;
                DeviceMgmt.getMgmtObjectInfo(filter,function(arrayinfo) { 
                    for ( var i in arg1 ) {
                        var item = arg1[i];
                        for ( var j in arrayinfo ) {
                            var infoItem = arrayinfo[j];
                            if ( item.storageSN == infoItem.sn ) {
                                item["location"] = infoItem.datacenter+":"+infoItem.cabinet;
                                item["type"] = infoItem.level=='middle'?'中端':'高端';
                                item["used"] = infoItem.specialInfo.used=='general'?'一般应用':'应用';
                                item["storageName"] = infoItem.name; 
                                item["maxCache"] = infoItem.specialInfo.maxCache;
                                item["maxDisks"] = infoItem.specialInfo.maxDisks;
                                item["maxPorts"] = infoItem.specialInfo.maxPorts;
                                item["lifeCycle"] = infoItem.specialInfo.lifeCycle;
                                break;
                            }
                        }
                    }
                    
                    callback(null,arg1);
                })


            },
            function(arg, callback) {
                
                var param = {};
                param['filter'] = 'parttype=\'Storage Pool\'';
                param['keys'] = ['serialnb','device','part']; 

                var finalResult = [];
                CallGet.CallGet(param, function(param) {   
                    var deviceList={};
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        if ( deviceList[item.serialnb] === undefined ) deviceList[item.serialnb] = item.part;
                        else deviceList[item.serialnb] += ',' + item.part;
                    } 

                    for ( var i in arg ) {
                        var item = arg[i]; 
                        item.pools = deviceList[item.storageSN]===undefined?0:deviceList[item.storageSN].split(',').length;
                    }
                    
                    callback(null,arg);
                });
            },
            function(arg, callback) {
                
                var param = {};
                param['filter'] = 'parttype=\'Port\'&(partgrp=\'Front-End\'|porttype=\'FE\')';
                param['keys'] = ['serialnb','device','feport']; 

                var finalResult = [];
                CallGet.CallGet(param, function(param) {   
                    var deviceList={};
                    for ( var i in param.result ) {
                        var item = param.result[i];

                        if ( deviceList[item.serialnb] === undefined ) deviceList[item.serialnb] = item.feport;
                        else deviceList[item.serialnb] += ',' + item.feport;
                    } 

                    for ( var i in arg ) {
                        var item = arg[i]; 
                        item.ports = deviceList[item.storageSN]===undefined?0:deviceList[item.storageSN].split(',').length;
                    }
                    
                    callback(null,arg);
                });
            }
        ], function (err, result) { 
           
            res.json(200,result[0]);
        });

    });



    app.get('/ssmp/rest/vmax/ports/:device', function (req, res) {


        var device = req.params.device;
 
        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([

            function( callback) {
                
                var param = {}; 
                param['filter'] = 'device=\''+device+'\'&datagrp=\'VMAX-PORTS\'';
                param['keys'] = ['serialnb','device','porttype','port','negspeed','partstat','feport','portwwn','director']; 

                var finalResult = [];
                CallGet.CallGet(param, function(param) {   
                    for ( var i in param.result ) {
                        var item = param.result[i]; 

                        var resItem = {};

                        resItem["portType"] = item.porttype  ;
                        resItem["portNumber"] = item.port  ;
                        resItem["ArraySN"] = item.serialnb  ;
                        resItem["rate"] = item.negspeed  ;
                        resItem["status"] = item.partstat  ;
                        resItem["name"] = item.feport  ;
                        resItem["WWPN"] = item.portwwn  ;
                        resItem["director"] = item.director  ;
                        resItem["configedStatus"] = ""  ;
                        resItem["usedStatus"] = item.porttype=='FA'?'主机':'RDF';

                        finalResult.push(resItem);
                    } 
 
                    
                    callback(null,finalResult);
                });
            }
        ], function (err, result) { 
           
            res.json(200,result);
        });

    });


    

    app.get('/ssmp/rest/vmax/portToApp/:device', function (req, res) {


        var device = req.params.device;
        var portname = req.query.portName; 


        async.waterfall([

            function( callback) {
                var topoRecord = [];
                topos.getApplicationTopologyView(function(apptopo){
                    for ( var i in apptopo ) {
                        var item = apptopo[i];
                        if ( item.array == device & item.arrayport == portname ) {
                            topoRecord.push(item);
                        }
                    }
                    callback(null,topoRecord);
                })
            },
            function ( arg ,callback ) {
                var appinfo = [];

                for ( var i in arg ) {
                    var item = arg[i];

                    var isfind = false ;
                    for ( var j in appinfo ) {
                        var appinfoItem = appinfo[j];
                        if ( item.app == appinfoItem.appName & item.host == appinfoItem.hostName ) {
                            isfind = true;
                            break;
                        }
                    }

                    if ( isfind == false ) {
                        var appinfoItem = {};
                        appinfoItem["appName"] = item.app ;
                        appinfoItem["admin"] = item.appManagerA ;
                        appinfoItem["hostIP"] = item.hostip;
                        appinfoItem["masterSlave"] = item.hostStatus;
                        appinfoItem["hostName"] = item.host;
    
                        appinfo.push(appinfoItem);
                    }

                }

                callback(null, appinfo);
            }
        ], function (err, result) { 
           
            res.json(200,result);
        });

    });



    app.get('/ssmp/rest/vmax/caches/:device', function (req, res) {


        var device = req.params.device;
 
        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([

            function( callback) {
                
                var param = {};  
                param['device'] = device;
                param['fields'] = ['vendor','arraytype','serialnb','device','model','arraytyp','devdesc','name'];
                param['period'] = util.getPeriod(start,end);
                param['start'] = start;
                param['end'] = end;
                param['filter'] = '!parttype&devtype=\'Array\'';
                param['filter_name'] = '(name==\'TotalMemory\')';

                var resRecord = {};
                CallGet.CallGetPerformance(param, function(param) {  
                    for ( var i in param ) {
                        var item = param[i];
                        var a = item.matricsStat.TotalMemory === undefined ? 0 : item.matricsStat.TotalMemory.max;
                        resRecord = {"cacheSize": a}
                        
                       
                        
                    }
                    callback(null, resRecord ); 
                });
            }
        ], function (err, result) { 
           
            res.json(200,result);
        });

    });



    app.get('/ssmp/rest/vmax/disks/:device', function (req, res) {


        var device = req.params.device;
 
        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([

            function( callback) {
                
                var param = {};  
                param['device'] = device;
                param['fields'] = ['part','disktype','diskrpm','partstat','isspare','diskgrp','name'];
                param['period'] = util.getPeriod(start,end);
                param['start'] = start;
                param['end'] = end;
                param['filter'] = 'datagrp=\'VMAX-DISKS\'';
                param['filter_name'] = '(name==\'Capacity\')';

                var resRecord = [];
                CallGet.CallGetPerformance(param, function(param) {  
                    for ( var i in param ) {
                        var item = param[i];

                        var resRecordItem = {};
                        resRecordItem["name"] = item.part;
                        resRecordItem["type"] = item.disktype;
                        resRecordItem["RPM"] = item.diskrpm;
                        resRecordItem["status"] =  item.partstat;
                        resRecordItem["spare"] = item.isspare==0?"FALSE":"TRUE";
                        resRecordItem["diskGroup"] = item.diskgrp;
                        resRecordItem["size"] = item.matricsStat.Capacity === undefined? 0 :  item.matricsStat.Capacity.max ;

                        resRecord.push(resRecordItem);
                       
                        
                    }

                    var r = {};
                    r["sizeUnit"] = "GB";
                    r["rpmUnit"] = "rpm";
                    r["data"] = resRecord;
                    callback(null, r ); 
                });
            }
        ], function (err, result) { 
           
            res.json(200,result);
        });

    });




    app.get('/ssmp/rest/vmax/rdfgroup', function (req, res) {


        var device = req.params.device;
 
        var realtimeDatetime = util.getRealtimeDateTimeByDay(-1); 
        var start = realtimeDatetime.begin;
        var end = realtimeDatetime.end;


        async.waterfall([

            function( callback) {
                Report.getArrayResourceLimits(start, end,  function(result) {  
                    callback(null, result ); 
                });
            }
        ], function (err, result) { 
           
            res.json(200,result);
        });

    });
    

    app.get('/ceb/storageSet/addOrUpdate', function (req, res) {  
        var data ={};
        data["sn"] = req.query.storageSN;
        data["name"] = req.query.name;
        data["datacenter"] = req.query.datacenter;
        data["level"] = req.query.type;
        data["type"] = "array";
        data["createdData"] = "";
        data["updatedData"] = "";
        data["specialInfo"] = "";

        var specialInfo = {};
        specialInfo["used"] = req.query.used;
        specialInfo["maxCache"] = req.query.maxCache;
        specialInfo["maxDisks"] = req.query.maxDisks
        specialInfo["maxPorts"] = req.query.maxPorts;
        specialInfo["lifeCycle"] = req.query.lifeCycle;
        specialInfo["maintenanceInfo"] = req.query.maintenanceInfo;
        data["specialInfo"] = JSON.stringify(specialInfo);


        DeviceMgmt.putMgmtObjectInfo(data, function(result) {
            if ( result.status == 'FAIL' ) {
                return res.json(400, result);
            } else {
                return res.json(200, result);
            }
        })

        
    });
    

    app.get('/ceb/storageSet/list', function (req, res) {   
        var filter = {};
        var finalResult = [];
        DeviceMgmt.getMgmtObjectInfo(filter, function(devInfo) {
            for ( var i in devInfo ) {
                var item=devInfo[i]; 

                var resultItem = {};
                resultItem["resourcePoolVo"] = [];
                resultItem["resourcePoolVoSize"] = 0;
                resultItem["storageSN"] = item.sn;
                resultItem["name"] = item.name;
                resultItem["model"] = "VMAX";
                resultItem["address"] = "";
                resultItem["datacenter"] = item.datacenter;
                resultItem["datacenterName"] = item.datacenter==1?"SDDataCenter":"JXQDataCenter";
                resultItem["room"] = "2";
                resultItem["type"] = item.type=='high'?"高端":"中端";
                resultItem["used"] =  item.specialInfo.used == 'general'?"一般应用":"其他应用";
                resultItem["lifeCycle"] = "";
                resultItem["maintenanceInfo"] = "";
                resultItem["providerid"] = "";
                resultItem["updatedDate"] = item.createData;
                resultItem["maxCache"] = "";
                resultItem["maxDisks"] = "";
                resultItem["maxPorts"] = "";
                resultItem["id"] = item.sn;

                finalResult.push(resultItem);
            }

            res.json(200,finalResult);
        })
    });


    app.get('/ceb/storageSet/getStorageById', function (req, res) {   
        var storagesn = req.query.id;
        var filter = {"sn": storagesn }; 
        DeviceMgmt.getMgmtObjectInfo(filter, function(devInfo) {
            for ( var i in devInfo ) {
                var item=devInfo[i]; 

                var resultItem = {}; 
                resultItem["storageSN"] = item.sn;
                resultItem["name"] = item.name;
                resultItem["model"] = "VMAX";
                resultItem["address"] = "";
                resultItem["datacenter"] = item.datacenter;
                resultItem["datacenterName"] = item.datacenter==1?"SDDataCenter":"JXQDataCenter";
                resultItem["room"] = "2";
                resultItem["type"] = item.type;
                resultItem["used"] =  item.specialInfo.used;
                resultItem["lifeCycle"] = "";
                resultItem["maintenanceInfo"] = "";
                resultItem["providerid"] = "";
                resultItem["updatedDate"] = item.createData;
                resultItem["maxCache"] = "";
                resultItem["maxDisks"] = "";
                resultItem["maxPorts"] = "";
                resultItem["id"] = item.sn;

                res.json(200,resultItem);
            }

            
        })
    });

    
    app.get('/ceb/system/datacenter/list', function (req, res) {   
        var filter = {};
        var finalResult = [{"name":"SDDataCenter","description":"上地数据中心","address":" 上地","city":"上地","updatedOn":0,"createdOn":0,"id":1}];
        res.json(200,finalResult);
        
    });
    



};

module.exports = cebAPIController;
