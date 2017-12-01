"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('hostController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');
  
var util = require('../lib/util');

var host = require('../lib/Host');

var mongoose = require('mongoose');
var HostObj = mongoose.model('Host');
var HBAObj = mongoose.model('HBA');
  
var HBALIST = require('../demodata/host_hba_list');
var VMAX = require('../lib/Array_VMAX');
var SWITCH = require('../lib/Switch');

var hostController = function (app) {

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



    app.get('/api/hosts', function (req, res) {
        var hostname = req.query.device; 
        host.GetHosts(hostname, function(code,result) {
            res.json(200 , result);
        });

    });


    app.get('/api/host/list', function (req, res) {

        var query = HostObj.find({}).select({ "baseinfo.name": 1, "_id": 0});
        query.exec(function (err, doc) {
            //system error.
            if (err) { 
                res.json(500 , {status: err})
            }
            if (!doc) { //user doesn't exist.
                res.json(200 , []); 
            }
            else {

                var result = [];
                for ( var i in doc ) {
                    var item = doc[i].baseinfo.name;
                    result.push(item);
                }
                res.json(200 , result);
            }

        });

    });

    app.get('/api/hba/nohostname', function (req, res) {
 

         async.waterfall(
        [
            function(callback){
                
                var wwnlist1 ;       
                SWITCH.getAlias(wwnlist1,function(result) {

                    var wwnlist = []; 
                    for ( var i in result ) {
                        var item = result[i];

                        var isfind = false;
                        for ( var j in wwnlist ) {
                            var wwnitem = wwnlist[j];

                            if ( item.zmemid == wwnitem.HBAWWN ) {
                                isfind = true;
                                wwnitem['ALIAS'] = wwnitem.ALIAS + ',' + item.alias;
                            }
                        }

                        if ( !isfind ) {
                            var wwnitem = {};
                            wwnitem['HBAWWN'] = item.zmemid;
                            wwnitem['ALIAS'] = item.alias;
                            wwnlist.push(wwnitem);
                        }
                    }
                    callback(null,wwnlist);
                });


            },
            // Get All Localtion Records
            function(wwnlist,  callback){ 
                 var hostlist ;
                 host.GetHosts(hostlist,function(errcode,result) {
                     
                     var hosthbas = [];
                     for ( var i in result ) {
                        var hostItem = result[i];
                        var hosthba = hostItem.HBAs; 
                        for ( var j in hosthba ) {
                            var hosthbaItem = hosthba[j]; 
                             
                            if ( hosthbaItem.wwn !== undefined )
                                hosthbas.push(hosthbaItem.wwn);
                        }
                     }
 
                    var finalwwnlist = [];
                    for ( var j in wwnlist ) {
                        var wwnitem = wwnlist[j];

                        var isfind = false;
                         for ( var i in hosthbas ) {
                            var hbawwn = hosthbas[i];
                            //console.log(hbawwn+'\t' + wwnitem.HBAWWN);
                            if ( wwnitem.HBAWWN == hbawwn ) {
                                 
                                isfind = true;
                                break;
                            }
                         }
                        if ( !isfind )   
                            finalwwnlist.push(wwnitem);                   

                    }


                     callback(null,finalwwnlist);
                })
                       
                    
            },
            function(param,  callback){ 
                  callback(null,param);
            }
        ], function (err, result) {
              res.json(200, result);
        }
        );

    });

   app.get('/api/host/baseinfo', function (req, res) { 
    var device = req.query.device;

    if ( config.ProductType == 'demo' ) {
             res.json(200,VMAX_ListJSON);

    } else {

        if ( device === undefined ) {
            res.json(401, 'Must be special a device!')
            return;
        } 
        host.GetHosts(device, function(code,result) {

            var finalResult = [];
            var returnData = result;
            var item = {};
            // Combine the UI element for VMAX Basic Info page.

            // -------------- Block1 ---------------------------
            var UI_Block1 = {} ;
            UI_Block1['title'] = "基本信息";
            UI_Block1['detail'] = [];

            item={};
            item["name"] = "主机名称"; 
            item["value"] = returnData.baseinfo.name;
            UI_Block1.detail.push(item);
 
            item={};
            item["name"] = "状态"; 
            item["value"] = returnData.baseinfo.name;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "类型"; 
            item["value"] = returnData.baseinfo.type;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "管理IP"; 
            item["value"] = returnData.baseinfo.management_ip;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "分类"; 
            item["value"] = returnData.baseinfo.catalog;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "服务IP"; 
            item["value"] = returnData.baseinfo.service_ip;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "描述"; 
            item["value"] = returnData.baseinfo.description;
            UI_Block1.detail.push(item);

            item={};
            item["name"] = "关联应用"; 
            item["value"] = returnData.APPs;
            UI_Block1.detail.push(item);


            // -------------- Block2 ---------------------------
 
            var UI_Block2 = {} ;
            UI_Block2['title'] = "配置信息";
            UI_Block2['detail'] = [];

            item={};
            item["name"] = "操作系统"; 
            item["value"] = returnData.configuration.OS;
            UI_Block2.detail.push(item);

            item={};
            item["name"] = "操作系统版本"; 
            item["value"] = returnData.configuration.OSVersion;
            UI_Block2.detail.push(item);

            item={};
            item["name"] = "内存(GB)"; 
            item["value"] = returnData.configuration.memory;
            UI_Block2.detail.push(item);


            // -------------- Block3 ---------------------------
 
            var UI_Block3 = {} ;
            UI_Block3['title'] = "资产信息";
            UI_Block3['detail'] = [];

            item={};
            item["name"] = "资产编号"; 
            item["value"] = returnData.assets.no;
            UI_Block3.detail.push(item);


            item={};
            item["name"] = "用途"; 
            item["value"] = returnData.assets.purpose;
            UI_Block3.detail.push(item);


            item={};
            item["name"] = "所属部门"; 
            item["value"] = returnData.assets.department;
            UI_Block3.detail.push(item);
            item={};
            item["name"] = "资产管理员"; 
            item["value"] = returnData.assets.manager;
            UI_Block3.detail.push(item);


           // -------------- Block4 ---------------------------
 
            var UI_Block4 = {} ;
            UI_Block4['title'] = "维保信息";
            UI_Block4['detail'] = [];

            item={};
            item["name"] = "维保厂商"; 
            item["value"] = returnData.maintenance.vendor;
            UI_Block4.detail.push(item);

            item={};
            item["name"] = "运维部门"; 
            item["value"] = returnData.maintenance.maintenance_department;
            UI_Block4.detail.push(item);

            item={};
            item["name"] = "维保联系人"; 
            item["value"] = returnData.maintenance.maintenance_owner;
            UI_Block4.detail.push(item);

            item={};
            item["name"] = "联系方式"; 
            item["value"] = returnData.maintenance.contact;
            UI_Block4.detail.push(item);


            // -------------- Finally combine the final result record -----------------
            finalResult.push(UI_Block1);
            finalResult.push(UI_Block2);
            finalResult.push(UI_Block3);
            finalResult.push(UI_Block4);

            res.json(200,finalResult);
        })
    }
    });


   app.get('/api/host/hba', function (req, res) { 
        var device = req.query.device;

        if ( device === undefined ) {
            res.json(401, 'Must be special a device!')
            return;
        } 
        host.GetHosts(device, function(code,result) {

            var finalResult = []; 
            var item = {};
               var data = result.HBAs;


                var finalResult = {};
 
                // ---------- the part of table ---------------
                var tableHeader = []; 


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "别名";
                tableHeaderItem["value"] = "alias";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "WWN";
                tableHeaderItem["value"] = "wwn";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);


                var tableHeaderItem = {};
                tableHeaderItem["name"] = "名称";
                tableHeaderItem["value"] = "name";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

                var tableHeaderItem = {};
                tableHeaderItem["name"] = "A/B";
                tableHeaderItem["value"] = "AB";
                tableHeaderItem["sort"] = "true";
                tableHeader.push(tableHeaderItem);

             
                
                finalResult["tableHead"] = tableHeader;
                finalResult["tableBody"] = data;


                res.json(200, finalResult);
 
        }) 


    });



   app.get('/api/host/luns', function (req, res) { 
        var device = req.query.device;

        if ( device === undefined ) {
            res.json(401, 'Must be special a device!')
            return;
        } 


        async.waterfall(
        [
            function(callback){
                host.GetHosts(device, function(code,result) {
                    var data = result.HBAs;
                    var hbawwns = [];
                    for ( var i in data ) {
                        var item = data[i];
                        if ( item.wwn != null )
                            hbawwns.push(item.wwn);
                    }
                    callback(null,hbawwns);
              });
            },
            // Get All Localtion Records
            function(inits,  callback){ 
                 VMAX.GetAssignedLUNByInitiator(inits,function(result) {
                     callback(null,result);
                })
                       
                    
            },
            function(param,  callback){ 
                  callback(null,param);
            }
        ], function (err, result) {
              res.json(200, result);
        }
        );



    });


/* 
*  insert into muti host records
*/
    app.post('/api/hosts', function (req, res) {
        var hosts = req.body;
        var hostArray = [];
        for ( var i in hosts ) {
 

            var newhost = {};

            var lineString = hosts[i];
            var fields = lineString.split(",");
            if ( fields.length < 2 ) continue;
            // get all of fields to newhost structure;
            var j=0;
            var configuration = {};
            var baseinfo = {};
            var maintenance = {};
            configuration["model"]           = fields[j]; j++; 
            configuration["sn"]              = fields[j]; j++;
            configuration["HA"]              = fields[j]; j++;
            baseinfo["type"]                 = fields[j]; j++;
            baseinfo["catalog"]              = fields[j]; j++;
            baseinfo["name"]                 = fields[j]; j++;
            baseinfo["status"]               = fields[j]; j++;
            baseinfo["management_ip"]        = fields[j]; j++;
            baseinfo["service_ip"]           = fields[j]; j++;
             j++;  //其他生产IP
             j++;  //数据中心
             j++;  //机房
            maintenance["vendor"]            = fields[j]; j++;
            maintenance["maintenance_owner"] = fields[j]; j++;
            configuration["OS"]              = fields[j]; j++;
            configuration["OSVersion"]       = fields[j]; j++;
            configuration["CPU"]             = fields[j]; j++;
            configuration["memory"]          = fields[j]; j++;
            configuration["envtype"]         = fields[j]; j++;
            configuration["other"]           = fields[j]; j++;
            baseinfo["description"]          = fields[j]; j++; 
            newhost["baseinfo"] = baseinfo;
            newhost["maintenance"] = maintenance;
            newhost["configuration"] = configuration;


            var hbaStr = fields[j];  j++; 
            var appStr = fields[j]; 

            // Parse HBA data
            // 
            newhost["HBAs"] = [];
            if ( hbaStr !== undefined ) {
                var hbaRecords = hbaStr.split("#");
                for ( var hba_i in hbaRecords) {
                    var hbaRecord = hbaRecords[hba_i];
                    var portwwn = hbaRecord.split("@")[0];
                    var nodewwn = hbaRecord.split("@")[1];

                    var hba = new HBAObj();
                    if ( portwwn !== undefined ) hba.wwn = portwwn.trim();
                    if ( nodewwn !== undefined ) hba.nodewwn = nodewwn.trim();

                    newhost.HBAs.push(hba);

                }

            }
            
            // Parse Application Data
            // 
            newhost["APPs"] = [];
            if ( appStr !== undefined ) {
                var appRecords = appStr.split("@");
                newhost.APPs = appRecords;
            }

            hostArray.push(newhost); 

        }
            //
            // Insert a new host record into MongoDB
            //  
        async.eachSeries(hostArray, function(newhost, asyncdone) {

            console.log(newhost.baseinfo.name);

           HostObj.findOne({"baseinfo.name" : newhost.baseinfo.name}, function (err, doc) {
                //system error.
                if (err) {
                    return   done(err);
                }
                if (!doc) { //user doesn't exist.
                    console.log("host is not exist. insert it."); 
 
                    var newappR = new HostObj(newhost);
                    console.log(newappR);
                    newappR.save(asyncdone);
                }
                else { 
                    doc.update(newhost, function(error, course) {
                        if(error) res.json(200 , {status: error});
                        console.log("The host has exist! Update it.");
                        asyncdone();
                    });

                }

            });  

 
        }, function(err) {
            if ( err ) return console.log(err);
        });


        res.json(200, "OK");

    });

    app.post('/api/hosts1', function (req, res) {
        var host = req.body;

        for ( var i in host ) {
 
            var newhost = new HostObj();

            var lineString = host[i];
            var fields = lineString.split(",");
            if ( fields.length < 2 ) continue;
            // get all of fields to newhost structure;



            console.log("==================  " + i + '\t' + fields.length + '\t' + hbaStr + '\t' + appStr);
            console.log(newhost);

            //
            // Insert a new host record into MongoDB
            // 
             HostObj.findOne({"baseinfo.name" : newhost.baseinfo.name}, function (err, doc) {
                //system error.
                if (err) {
                    return   done(err);
                }
                if (!doc) { //user doesn't exist.
                    console.log("host is not exist. insert it."); 
  
                    newhost.save(function(err, thor) { 
                     if (err)  {  
                        return res.json(null,{status: err})
                      } else 
                        return res.json(null,{status: "The Host has inserted."})
                        //return res.json(200, );
                    });
                }
                else { 
                    doc.update(newhost, function(error, course) {
                        if(error) return next(error);
                    });

                    return res.json(null,{status: "The Host has exist! Update it."}) ;

                }

            });           

        }

        res.json(200, "OK");

    });

    
    app.post('/api/host', function (req, res) {

        var host = req.body;


        async.waterfall(
        [
            function(callback){

                var hbalist = host.HBAs;
                var wwnlist = [];
                for ( var i in hbalist ) {
                    var item = hbalist[i];
                    wwnlist.push(item.wwn);
                }
 
                SWITCH.getAlias(wwnlist, function(result) { 
                    console.log(result);
                    for ( var i in hbalist ) {
                        var item = hbalist[i];
                        item['alias'] = '';
                        for (var j in result ) {
                            var aliasItem = result[j];
                            console.log(aliasItem.toString() );
                            if ( aliasItem.zmemid == item.wwn ) {
                                item.alias = aliasItem.alias;
                            }
                        }
                    }


                    callback(null,host);
              });
            },
 
            function(host,  callback){ 

                console.log(host);
                HostObj.findOne({"baseinfo.name" : host.baseinfo.name}, function (err, doc) {
                    //system error.
                    if (err) {
                        return   done(err);
                    }
                    if (!doc) { //user doesn't exist.
                        console.log("host is not exist. insert it."); 

                        var newhost = new HostObj(host);
                        console.log('Test1');
                        newhost.save(function(err, thor) {
                         console.log('Test2');
                         if (err)  { 
                            return res.json(400 , err);
                          } else 
                            callback(null,{status: "The Host has inserted."})
                            //return res.json(200, );
                        });
                    }
                    else { 
                        doc.update(host, function(error, course) {
                            if(error) return next(error);
                        });

                        callback(null,{status: "The Host has exist! Update it."}) ;

                    }

                });
                       
                    
            },
            function(param,  callback){ 
                  callback(null,param);
            }
        ], function (err, result) {
              res.json(200, result);
        }
        );





    });


/* 
*  Delete a app record 
*/
    app.delete('/api/host', function (req, res) { 
        var device = req.query.device; 

        HostObj.findOne({"baseinfo.name" : device}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("host is not exist. do nothing."); 
                return  res.json(200 , {status: "host is not exist. do nothing."});
            }
            else { 
                doc.remove(host, function(error, course) {
                    if(error) return next(error);
                });

                return  res.json(200 , {status: "The Host has deleted!"});
            }

        });




    });


    // Save the hba with hostname records
    app.post('/api/hba', function (req, res) {

        var hbalist = req.body;

        var hostlist = [];
        for ( var i in hbalist ) {
            var hbaItem = hbalist[i];
            var hosthbaItem = {};
            hosthbaItem['name'] = '';
            hosthbaItem['wwn'] = hbaItem.HBAWWN;
            hosthbaItem['alias'] = hbaItem.ALIAS;
            hosthbaItem['AB'] = 'A';

            var hostname = hbaItem.HOSTNAME; 
            var isfind = false;
            for ( var j in hostlist ) {
                var hostItem = hostlist[j];
                if ( hostItem.baseinfo.name == hostname ) {
                    isfind = true;
                    hostItem.HBAs.push(hosthbaItem);
                    break;
                }
            }
            if ( !isfind ) {
                var hostItem = {};
                var baseinfo = {};
                baseinfo['name'] = hostname;
                hostItem['baseinfo'] = baseinfo;
                hostItem['HBAs'] = [];
                hostItem.HBAs.push(hosthbaItem);

                hostlist.push(hostItem);
            }


            
        }
        console.log(hostlist);

        async.forEach(hostlist, function(host) {
            console.log("doing the host :" + host.baseinfo.name);

                HostObj.findOne({"baseinfo.name" : host.baseinfo.name}, function (err, doc) {
                    //system error.
                    if (err) {
                        return   done(err);
                    }
                    if (!doc) { //user doesn't exist.
                        console.log("host ["+host.baseinfo.name + "] is not exist. insert it."); 

                        var newhost = new HostObj(host); 
                        newhost.save(function(err, thor) { 
                         if (err)  { 
                            return res.json(400 , err);
                          } else 
                            res.json(200,{status: "The Host ["+host.baseinfo.name + "] has inserted."})
                            //return res.json(200, );
                        });
                    }
                    else { 

                        // Append the hba list 
                        // 
                        console.log(doc);
                        var HBAList = Array.prototype.slice.call(doc.HBAs);

                        var newhbalist = HBAList.concat(host.HBAs);
                        host.HBAs=newhbalist; 
 
                         console.log(host.HBAs);
                        doc.update(host, function(error, course) {
                            if(error) return next(error);
                        });

                        res.json(200,{status: "The Host ["+host.baseinfo.name + "] has exist! Update it."}) ;

                    }

                });


        })




        return res.json(200,hostlist);
        //return  res.json(200 , {status: "the records has updated."});
    });



};

module.exports = hostController;
