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
var EquipmentInfo = mongoose.model('EquipmentInfo');
var Datacenter = mongoose.model('Datacenter');


// -----------------------------------
// For demo data
// ----------------------------------
//var demo_dashboard = require('../demodata/dashboard'); 


var dashboardController = function (app) {

    var config = configger.load();


 
    app.get('/api/dashboard/EquipmentSummary', function (req, res) {
 

    	    //if ( config.ProductType == 'demo' ) {
            //        res.json(200,demo_switchs);
            //        return;
            //} ;


            var param = {};
            //param['filter_name'] = 'name=\'Availability\'';
            param['keys'] = ['device'];
            param['fields'] = [ 'vendor','model','devtype' ];
  
            param['filter'] = '!parttype'; 
            CallGet.CallGet(param, function(param) { 
                res.json(200, param.result);
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

                            for ( var j in equipmentAllList ) {
                                var item = equipmentAllList[j];

                                 for ( var i in equipmentInfo ) {
                                    var equipmentItem = equipmentInfo[i];
                                    
                                    if ( item.device == equipmentItem.basicInfo.device ) {
                                        var unitID = equipmentItem.basicInfo.UnitID;
                                        item["UnitID"] = unitID;
                                        equipmentAllList.forEach( function ( equipment ) {
                                            var aa  = SearchDatacenterByUnitID(unitID, arg1.datacenterList);
                                            console.log(aa);
                                        });

                                    }
                                }                               
                            }



                            callback(null,finalResult);
                        })

                    },

                    function(arg1,  callback){  
                       // console.log("LEVEL2:" + arg1);
                    }
                ], function (err, result) {
                   // result now equals 'done'
                   res.json(200, result);
                });

            });

         
    });



function GetEquipmentInfo(callback) {

        EquipmentInfo.find({}, {"_id":0, "__v":0},function (err, doc) {
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
    datacenterInfo.forEach(function(dc){
        dc.Building.forEach( function ( building ) {
            building.Floor.forEach( function ( floor )  {
                floor.Unit.forEach( function ( unit ) {
                    if ( unit.UnitID == UnitID ) {
                        dcInfo["datacenterName"] = dc.Name;
                        dcInfo["building"] = building.Name;
                        dcInfo["floor"] = floor.Name;
                        dcInfo["unit"] = unit.Name;
                        console.log(dcInfo);
                        console.log("=-======");
                        return dc.Name;
                    }
                })
            })
        })
    })

    return "aa";

};


};

module.exports = dashboardController;
