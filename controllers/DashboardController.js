"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('dashboardController')  
const name = 'dashboard'  
var unirest = require('unirest');
var configger = require('../config/configger');
var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');
var CallGet = require('../lib/CallGet'); 
var getTopos = require('../lib/topos'); 

var async = require('async');
var mongoose = require('mongoose'); 
var EquipmentInfo = mongoose.model('Array');
var SwitchObj = mongoose.model('Switch');
var Datacenter = mongoose.model('Datacenter');

var dashboard_demo = require('../demodata/Dashboard'); 

// -----------------------------------
// For demo data
// ----------------------------------
//var demo_dashboard = require('../demodata/dashboard'); 


var dashboardController = function (app) {

    var config = configger.load();


 
    app.get('/api/dashboard/EquipmentSummary', function (req, res) {
 
            var param = {};
            //param['filter_name'] = 'name=\'Availability\'';
            param['keys'] = ['device'];
            param['fields'] = [ 'vendor','model','devtype' ];
  
            param['filter'] = '!parttype'; 
            CallGet.CallGet(param, function(param) { 
                //res.json(200, param.result);
                var equipmentAllList = param.result;
                var finalResult = {}; 
                finalResult["equipmentList"] = equipmentAllList;


                async.waterfall([
                    function(callback){ 
                        GetDatacenterInfo(function(datacenterInfo) {
                            
                            var dcList = [];
                            for ( var i in datacenterInfo ) {
                                var dcItem = datacenterInfo[i];
                                var resultItem = {};
                                resultItem["DatacenterName"] = dcItem.Name; 
                                dcList.push(resultItem);
                            }
                            finalResult["datacenter"] = dcList;
                            finalResult["datacenterList"] = datacenterInfo;

                            callback(null,finalResult);


                        })

                    },

                    function(arg1,  callback){   
                        GetEquipmentInfo(function(equipmentInfo) {
 
                            var equipmentAllList = finalResult.equipmentList;

                            console.log(equipmentInfo);

                            for ( var j in equipmentAllList ) {
                                var item = equipmentAllList[j];


                                 var isFindDevInfo = false; 
                                 for ( var i in equipmentInfo ) {
                                    var equipmentItem = equipmentInfo[i];
                                    
                                    if ( item.device == equipmentItem.basicInfo.device ) {
                                        isFindDevInfo = true;
                                        var unitID = equipmentItem.basicInfo.UnitID;
                                        item["UnitID"] = unitID;

                                        for ( var z in equipmentAllList ) {
                                            var equipment = equipmentAllList[z];
                                            var aa  = SearchDatacenterByUnitID(unitID, arg1.datacenterList);
                                            item["localtion"] = aa;
                                        } 

                                    }

                                }   


                                if ( ! isFindDevInfo ) {
                                    var localtion = {};
                                    localtion["datacenter"] = 'undefine';
                                    item["localtion"] = localtion;

                                }                          
                            } 
 
                            callback(null,finalResult);
                        })

                    },
                    function(arg1,  callback){ 

                        var finalResult = {};

                        var devsByDC = [];
                        var devList = arg1.equipmentList;
                        for ( var i in devList ) {
                            var devItem = devList[i];

                            var isFind = false;
                            for ( var j in devsByDC ) {
                                var devByDCItem = devsByDC[j]; 
                                if ( devItem.localtion.datacenter == devByDCItem.datacenter ) {

                                    isFind = true;
                                    switch ( devItem.devtype ) {
                                        case "FabricSwitch" :
                                            devByDCItem.FabricSwitch = devByDCItem.FabricSwitch + 1;
                                            break;

                                        case "Host":
                                        case "PassiveHost":
                                            devByDCItem.Host = devByDCItem.Host + 1;
                                            break;

                                        case "VirtualStorage":
                                            devByDCItem.VirtualStorage = devByDCItem.VirtualStorage + 1;
                                            break;

                                        case "Array":
                                            devByDCItem.Array = devByDCItem.Array + 1;
                                            break;

                                        default :
                                            devByDCItem.Other = devByDCItem.Other + 1;
                                            break;


                                    }
                                }
                            }

                            if ( !isFind ) {
                                var devByDCItem = {} ;
                                devByDCItem["datacenter"] = devItem.localtion.datacenter;
                                devByDCItem["FabricSwitch"] = 0;
                                devByDCItem["Host"] = 0;
                                devByDCItem["VirtualStorage"] = 0;
                                devByDCItem["Array"] = 0;
                                devByDCItem["Other"] = 0;

                                switch ( devItem.devtype ) {
                                    case "FabricSwitch" :
                                        devByDCItem["FabricSwitch"] = 1;
                                        break;

                                    case "Host":
                                    case "PassiveHost":
                                        devByDCItem["Host"] = 1;
                                        break;

                                    case "VirtualStorage":
                                        devByDCItem["VirtualStorage"] = 1;
                                        break;

                                    case "Array":
                                        devByDCItem["Array"] = 1;
                                        break;

                                    default :
                                        devByDCItem["Other"] = 1;
                                        break;


                                }
                                devsByDC.push(devByDCItem);

                            }

                        }

                       finalResult["Datacenter"] = devsByDC;
                       callback(null,finalResult);
                    }
                ], function (err, result) {
                   // result now equals 'done'
                   res.json(200, result);
                });

            });

         
    });



function GetEquipmentInfo(callback) {

    var result = [];
    async.waterfall([
            function(callback){ 

                EquipmentInfo.find({}, {"_id":0, "__v":0},function (err, doc) {
                    //system error.
                    if (err) {
                        return   done(err);
                    }
                    if (!doc) { //user doesn't exist.
                        callback(null,[]);
                    }
                    else { 
                        result = result.concat(doc);
                        callback(null,result); 
                    }

                });
            },
             function(arg1, callback){  
                SwitchObj.find({}, {"_id":0, "__v":0},function (err, doc) {
                    //system error.
                    if (err) {
                        return   done(err);
                    }
                    if (!doc) { //user doesn't exist.
                        callback(null,[]);
                    }
                    else { 
                        result = result.concat(doc);
                        callback(null,result); 
                    }

                });  
             }
         ], function (err, result) {
               // result now equals 'done'
               console.log(result);
               callback(result);
         });

};


function GetDatacenterInfo(callback) {

        Datacenter.find({}, {"_id":0, "__v":0},function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                callback([]);
            }
            else { 
                callback(doc); 
            }

        });


};


function SearchDatacenterByUnitID(UnitID, datacenterInfo ) {
    //console.log(datacenterInfo);
    var dcInfo = {};
    for ( var i in datacenterInfo ) {
        var dc = datacenterInfo[i];

        for ( var j in dc.Building ) {
            var building = dc.Building[j];

            for ( var z in building.Floor ) {
                var floor  = building.Floor[z];

                for ( var y in floor.Unit ) {
                    var unit = floor.Unit[y];

                    if ( unit.UnitID == UnitID ) {
                        dcInfo["datacenter"] = dc.Name;
                        dcInfo["building"] = building.Name;
                        dcInfo["floor"] = floor.Name;
                        dcInfo["unit"] = unit.Name; 
                        return dcInfo;
                    }

                }


            }

        }
    } 

    dcInfo["datacenter"] = "";
    dcInfo["building"] = "";
    dcInfo["floor"] = "";
    dcInfo["unit"] = "";
    return dcInfo;

};


};

module.exports = dashboardController;
