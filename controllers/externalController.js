"use strict";
const logger = require("../lib/logger")(__filename);

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('externalController')  
const name = 'my-app'  
var unirest = require('unirest');
var moment = require('moment');
var configger = require('../config/configger');  
    
var async = require('async'); 

var App = require('../lib/App'); 
var topos = require('../lib/topos.js');
var VPLEX = require('../lib/Array_VPLEX');  
var VMAX = require('../lib/Array_VMAX');
var VNX = require('../lib/Array_VNX');
var CallGet = require('../lib/CallGet'); 
var DeviceMgmt = require('../lib/DeviceManagement');

var externalController = function (app) {

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
 
   app.get('/api/external/cmdb', function (req, res) { 
        var device;

        var finalResult = {};
        async.waterfall([
            function(callback){ 
                topology(device, function(ret) {
                    finalResult["topology"] = ret;
                    callback(null,finalResult);
                })
 
            } ,
            function(arg1,  callback) {  
                vplexinfo(device, function(ret) {
                    arg1["array"] = ret.array;
                    arg1["lun"] = ret.lun;
                    callback(null, arg1);

                });

            }  
            ], function (err, result) {
                   // result now equals 'done' 
                   res.json(200, result);
            });  
    });



function topology(device, callback) { 
 
        var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + "  PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>  ";
        queryString = queryString + "  PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>  ";
        queryString = queryString + "  SELECT distinct ?fabric ?zonesetName ?zoneName ?zoneMemberName ?endpoint ?swport_wwn ?vplex_port ?vplex_wwn ";
        queryString = queryString + "  WHERE {  ";
        queryString = queryString + "      ?fabric rdf:type srm:Fabric . ";
        queryString = queryString + "      ?fabric srm:containsZoneSet ?zoneset . ";
        queryString = queryString + "      ?zoneset srm:displayName ?zonesetName . ";
        queryString = queryString + "      ?zoneset srm:containsZone ?zone . ";
        queryString = queryString + "      ?zone srm:displayName ?zoneName . ";
        queryString = queryString + "      ?zone srm:containsZoneMember ?zoneMember . ";
        queryString = queryString + "      ?zoneMember srm:displayName ?zoneMemberName . ";
        queryString = queryString + "      ?zoneMember srm:containsProtocolEndpoint ?endpoint . ";  
        queryString = queryString + "      ?endpoint srm:connectedTo ?swport_wwn_id .  ";
        queryString = queryString + "      ?swport_wwn_id srm:wwn   ?swport_wwn . ";
        queryString = queryString + "      OPTIONAL { ";
        queryString = queryString + "          ?endpoint srm:residesOnVPlexPort ?vplex_port . ";
        queryString = queryString + "          ?endpoint srm:wwn ?vplex_wwn . ";
        queryString = queryString + "      } ";

        //queryString = queryString + "          FILTER (?zoneName = 'tuoguan_vm7_h1_VPLX_Y_E2DB_FE0') ";
        queryString = queryString + "       }   ";

        topos.querySparql(queryString, function(result) {  
  
                var hostLinks = [];
                var vplexLinks = [];

                for ( var i in result ) {
                    var item = result[i];
                    if ( item.zoneName.indexOf("VPLX") > -1 ) {
                        if ( item.vplex_port == "" ) {
                            hostLinks.push(item);
                        } else {
                            vplexLinks.push(item);
                        }
                    }
                }

                var finalResult = [];
                //finalResult["hostlinks"] = hostLinks;
                //finalResult["vplexlinks"] = vplexLinks;   

                for ( var i in hostLinks ) {
                    var hostItem = hostLinks[i];

                    for ( var j in vplexLinks ) {
                        var vplexItem = vplexLinks[j];

                        if ( hostItem.fabric == vplexItem.fabric && 
                            hostItem.zonesetName == vplexItem.zonesetName &&
                             hostItem.zoneName == vplexItem.zoneName ) {
                             
                             var finalItem = {};
                             
                             finalItem["name"] = hostItem.zonesetName + '-' + hostItem.zoneName ;
                             finalItem["HBAWWN"] = hostItem.zoneMemberName;
                             finalItem["EdgeWWN"] = hostItem.swport_wwn;
                             finalItem["CoreWWN"] = vplexItem.swport_wwn;
                             finalItem["VplexWWN"] = vplexItem.vplex_wwn;

                             finalResult.push(finalItem);

                        }
                    }
                }
                callback(finalResult);

            });
 
    };

function vplexinfo(device, callback) { 
  

        async.waterfall([
            function(callback){ 
                VPLEX.getVplexVirtualVolume(device, function(ret) {  
                    callback(null,ret);
                });
            },
            // -------------------------------------------------
            // Relation with VPLEX Virutal Volume and Maskview
            // -------------------------------------------------
            function(arg1,  callback) {  

                VPLEX.GetVirtualVolumeRelationByDevices(device,function(result) {

                    for ( var i in arg1 ) {
                        var item = arg1[i];
                        item['ProviderByDevice'] = '';
                        item['ProviderByDeviceType'] = '';
                        item['ProviderFromObject'] = '';
                        item['ConnectedHost'] = '';

                        for ( var j in result ) {
                            var vplexItem = result[j];
                            if ( item.part == vplexItem.VPlexVirtualVolumeName ) { 
                                item['ProviderByDevice'] = vplexItem.storageName; 
                                item['ProviderByDeviceType'] = vplexItem.storageModel;
                                item['ProviderFromObject'] = vplexItem.storageVolumeName ;
                                item['ConnectedHost'] = item.view ;
                            }
                        } 
                        if (item['ProviderByDevice'] == ''  ) {
                            item['ProviderByDevice'] = item.array;
                            item['ProviderFromObject'] = '';
                        }
                     }
                    callback(null,arg1);

                })
               
            },            
            function(arg1,  callback) {  

                var physicalArray ;
                VMAX.GetDevices(physicalArray,function(result) {

                    for ( var j in result ) {
                        var deviceItem = result[j];

                        for ( var i in arg1 ) {
                            var item = arg1[i];
                            
                            if ( deviceItem.device == item.ProviderByDevice && deviceItem.part == item.ProviderFromObject ) {
                                //logger.info(deviceItem.device +'|' + item.ProviderByDevice +'|' + deviceItem.part +'|' +item.ProviderFromObject);
                                item['disktype'] = deviceItem.disktype; 
                                item['PyhsicalCapacity'] = parseFloat(deviceItem.Capacity); 
                                item['PyhsicalUsedCapacity'] = parseFloat(deviceItem.UsedCapacity); 
                                break;
                            }

                        }
                    }
     
                    callback(null,arg1);

                })
               
            },            
            function(arg1,  callback) {  

                var array = [];
                var vvol = [];
                var finalResult = {};

                for ( var i in arg1 ) {
                    var item = arg1[i];

                    //logger.info(item.disktype);
                    if ( item.disktype !==  undefined ) {
                        var vvolItem = {};
                        vvolItem["array"] = item.device;
                        vvolItem["lun"] = item.part;
                        vvolItem["disktype"] = item.disktype;
                        vvolItem["TotalCapacity"] = item.PyhsicalCapacity;
                        vvolItem["UsedCapacity"] = item.PyhsicalUsedCapacity;
                        vvol.push(vvolItem);       
                    }
 

                    var isFind = false;
                    for ( var j in array ) {
                        var arrayItem = array[j];
                        if ( arrayItem.array == item.device ) {
                            arrayItem["TotalUsableCapacity"] = arrayItem.TotalUsableCapacity + parseInt(item.Capacity);
                            if ( item.ismasked != '0' ) {
                                arrayItem["AllocatedCapacity"] = arrayItem.AllocatedCapacity + parseInt(item.Capacity);
                                if ( item.PyhsicalUsedCapacity !== undefined )  
                                    arrayItem["UsedCapacity"] = arrayItem.UsedCapacity + parseInt(item.PyhsicalUsedCapacity);
                            
                            }
                            isFind = true;
                            break;
                        }
                    }
                    if ( isFind == false ) {
                        var arrayItem = {};
                        arrayItem["array"] = item.device;
                        arrayItem["TotalUsableCapacity"] = parseInt(item.Capacity);
                        if ( item.ismasked == '0' ) {
                            arrayItem["AllocatedCapacity"] = 0;
                            arrayItem["UsedCapacity"] = 0;
                        } else {
                            arrayItem["AllocatedCapacity"] = parseInt(item.Capacity);
                            if ( item.PyhsicalUsedCapacity === undefined ) 
                                arrayItem["UsedCapacity"] = 0;
                            else 
                                arrayItem["UsedCapacity"] = parseInt(item.PyhsicalUsedCapacity);
                        }

                        array.push(arrayItem);
                        
                    }

                }

                finalResult["array"] = array;
                finalResult["lun"] = vvol;

                callback(null,finalResult );

     
            }
            ], function (err, result) {
                   // result now equals 'done' 
                   callback(result);
            });       
 
    };

    app.get('/api/external/arrayinfo', function (req, res) { 
        res.setTimeout(1200*1000);

        var config = configger.load(); 
        var ReportTmpDataPath = config.Reporting.TmpDataPath;
        var ReportOutputPath = config.Reporting.OutputPath;
                        
        var device; 
 
        async.auto(
            {
                vnxinfo: function( callback, result ) {
                    VNX.GetArrays(device, function(ret) {
                        callback(null,ret);
                   })                        
                },
                vmaxinfo: function(callback, result ) {
                    VMAX.GetArrays(device, function(ret) {
                        callback(null,ret);
                   })  
                },
                arrayinfo: function( callback, result ) {
                    var filter = {};
                    DeviceMgmt.getMgmtObjectInfo(filter, function(arrayInfo) {
                        callback(null,arrayInfo);
                    })
                },
                mergeResult: ["vnxinfo","vmaxinfo","arrayinfo", function(callback, result ) {
                    var finalResult = [];
                    finalResult = finalResult.concat(result.vnxinfo);
                    finalResult = finalResult.concat(result.vmaxinfo);
                    
                    for ( var i in finalResult ) {
                        var item = finalResult[i];
                        for ( var j in result.arrayinfo ) {
                            var arrayInfoItem = result.arrayinfo[j];
                            if ( item.serialnb == arrayInfoItem.storagesn ) {
                                item["ST_ALIAS"] = arrayInfoItem.name;
                                item["LOCATION"] = arrayInfoItem.cabinet;
                            }
                        }
                    }

                    callback(null,finalResult);

                }]
            }, function(err, result ) {

                var finalResult = [];
                for ( var i in result.mergeResult ) {
                    var item = result.mergeResult[i];

                    if ( item.serialnb == 'CETV3163400036' ) continue;


                    var finalResultItem = {};
                    finalResultItem["ST_VENDOR"] = item.vendor;
                    finalResultItem["ST_ALIAS"] =  item.ST_ALIAS === undefined ? "" : item.ST_ALIAS;
                    finalResultItem["ST_SN"] = item.serialnb;
                    finalResultItem["ST_MODEL"] = item.model;
                    finalResultItem["ST_MICROCODE"] = item.devdesc;
                    finalResultItem["CACHE_SIZE"] = Math.round(item.TotalMemory/1024);
                    finalResultItem["PORT_NUMBER"] = item.TotalFEPort;
                    finalResultItem["DISK_NUMBER"] = item.TotalDisk;
                    finalResultItem["RAW_CAPACITY"] = item.RawCapacity;
                    finalResultItem["CAPACITY"] = item.ConfiguredUsableCapacity;
                    finalResultItem["ALLOCATED"] = item.UsedCapacity;
                    finalResultItem["LOCATION"] = item.LOCATION === undefined ? "" : item.LOCATION;

                    finalResult.push(finalResultItem);
                                       
                }
                const fs = require('fs');
                const Json2csvParser = require('json2csv').Parser;
                const fields = ["ST_VENDOR","ST_ALIAS","ST_SN","ST_MODEL","ST_MICROCODE","CACHE_SIZE","PORT_NUMBER","DISK_NUMBER","RAW_CAPACITY","CAPACITY","ALLOCATED","LOCATION"];

                const json2csvParser = new Json2csvParser({ fields });
                const csv = json2csvParser.parse(finalResult);
                 
                var filename = [ReportOutputPath,'/', 'array_info', moment().format('YYYY-MM-DD') , '.csv'].join('');
                logger.info(filename);
                fs.writeFileSync(filename, csv);

                res.json(200,finalResult);
            }
            
        );
    });

    app.get('/api/external/switchinfo', function (req, res) { 
        res.setTimeout(1200*1000);

        var config = configger.load(); 
        var ReportTmpDataPath = config.Reporting.TmpDataPath;
        var ReportOutputPath = config.Reporting.OutputPath;
                      

        var param = {};  
        param['keys'] = ['device','devicesn','vendor','model','ip','devdesc','firmware','lsname'];  
        param['filter'] = 'datagrp=\'BROCADE_FCSWITCH_PORT\'';
 
        CallGet.CallGet(param, function(swinfo) {   
            var finalResult = [];
            for ( var i in swinfo.result ) {
                var item = swinfo.result[i];

                var finalResultItem = {};
                finalResultItem["SW_SN"] = item.devicesn; 
                finalResultItem["SW_NAME"] = item.lsname;
                finalResultItem["SW_MODEL"] = item.model;
                finalResultItem["SW_VENDOR"] = item.vendor; 
                finalResultItem["IP"] = item.ip;
                finalResultItem["ST_MICROCODE"] = item.firmware; 

                finalResult.push(finalResultItem);

            }  


            const fs = require('fs');
            const Json2csvParser = require('json2csv').Parser;
            const fields = ["SW_SN","SW_NAME","SW_MODEL","SW_VENDOR","IP","CACHE_SIZE","ST_MICROCODE"];

            const json2csvParser = new Json2csvParser({ fields });
            const csv = json2csvParser.parse(finalResult);
             
            var filename = [ReportOutputPath,'/', 'switch_info', moment().format('YYYY-MM-DD') , '.csv'].join('');
            logger.info(filename);
            fs.writeFileSync(filename, csv);


            res.json(200,finalResult); 
        });        
    
    });


};

module.exports = externalController;
