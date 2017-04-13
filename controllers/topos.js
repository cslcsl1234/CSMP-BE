"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('switchController')  
const name = 'switch'  
var unirest = require('unirest');
var configger = require('../config/configger');
var RecordFlat = require('../lib/RecordFlat');
var util = require('../lib/util');
var CallGet = require('../lib/CallGet'); 
var async = require('async');
 

function getTopos(callback ) {

   
/*
    async.waterfall(books, function (err, result) {
        console.log(result);
    })
*/

 
    var config = configger.load();
    var toposResult = {};

    var config = configger.load();
    async.waterfall([
        function(callback){ 
            var f = new getSwitchPorts(callback);
 
        },        
        function(arg1,  callback){ 
            var f = new getArrayPorts(arg1 , callback);

        },
        function(arg1,  callback){ 
            var f = new getZoning(arg1 , callback);

        },
        function(arg1,  callback){ 
            var f = new matchArrayPorts(arg1 , callback);

        }
    ], function (err, result) {
       // result now equals 'done'
       //console.log(result); 
       callback(result);
    });

};


function getSwitchPorts( callback) { 

    var config = configger.load();
        var keys = ['device','partwwn'];
        var fieldsArray = ['device','model','firmware','partwwn','partid','slotnum','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat'];
        var filter = 'parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';
        var fields = fieldsArray.toString(); 
        var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE
        var queryString =  {"filter":filter,"fields":fields};  

            unirest.get(config.Backend.URL + getMethod )
                    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                    .headers({'Content-Type': 'multipart/form-data'}) 
                    .query(queryString) 
                    .end(function (response) { 
                        if ( response.error ) {
                            console.log(response.error);
                            return response.error;
                        } else {  
                            //var resultRecord = RecordFlat(response.body, keys);
                            var swports = JSON.parse(response.body).values; 
                            var toposResult = {};
                            toposResult["swports"]=swports;  
                            callback(null,toposResult);
                        }

               
     
            }); 
 

         
};
  
 
function getArrayPorts(arg1, callback) {
    var config = configger.load();
        var keys = ['device','feport'];
        var fieldsArray = ['device','feport','portwwn','partstat'];
        var filter = 'parttype=\'Port\'';
        var fields = fieldsArray.toString(); 
        var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE
        var queryString =  {"filter":filter,"fields":fields};  
 

            unirest.get(config.Backend.URL + getMethod )
                    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                    .headers({'Content-Type': 'multipart/form-data'}) 
                    .query(queryString) 
                    .end(function (response) { 
                        if ( response.error ) {
                            console.log(response.error);
                            return response.error;
                        } else {  
                            //var resultRecord = RecordFlat(response.body, keys);
                            var arrayports = JSON.parse(response.body).values;  
                            arg1["arrayports"]=arrayports;  
                            console.log(arrayports.length);
                            callback(null,arg1);
                        }

               
     
            }); 
 

};

function getZoning(arg1, callback) {

    var config = configger.load(); 
        var filter = 'parttype=\'ZoneMember\'';
        var fields = 'device,pswwn,zsetname,zname,zmemid,zmemtype';
        var getMethod = config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE
        var queryString =  {"filter":filter,"fields":fields};  
 
 

        var zoneResult = [];
        unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({'Content-Type': 'multipart/form-data'}) 
                .query({'fields': fields , 'filter':  filter }) 
                .end(function (response) {

                    var resultJson = JSON.parse(response.body).values; 
                    for ( var i in resultJson ) {
                        var item = resultJson[i];
                        var zoneItem = {};
                        var zoneMemberItem = {};
                        zoneMemberItem['zmemid'] = item.zmemid;
                        zoneMemberItem['zmemtype'] = item.zmemtype; 


                        zoneItem['device'] = item.device;
                        zoneItem['zsetname'] = item.zsetname;
                        zoneItem['zname'] = item.zname;
                        zoneItem['zonemembers'] = [];
                        zoneItem.zonemembers.push(zoneMemberItem);

                        if ( zoneResult.length == 0 ) {
                            zoneResult.push(zoneItem);
                        } else {
                            var isFind = false;
                            for ( var j in zoneResult) {
                                var item1 = zoneResult[j];
                                if ( item1.device == item.device &&  
                                    item1.zsetname == item.zsetname && 
                                    item1.zname == item.zname 
                                    ) {
                                    item1.zonemembers.push(zoneMemberItem);
                                    isFind = true;
                                }
                            }
                            if ( ! isFind ) {
                                zoneResult.push(zoneItem);
                            }
                        }

                    }
                    arg1["Zoning"] = zoneResult;
                    callback(null,arg1);
                
                });

 

};



function matchTopos(arg1, callback ) {
    var swports = arg1.swports;
    var arrayports = arg1.arrayports;
    var Zonings = arg1.Zoning;

    var resultArrayDetail = [];
    var resultZoneDetail = [];
    for ( var i_sw in swports ) {
        var swportItem = swports[i_sw];

        swportItem['Zoning'] = [];
        swportItem['Connecting'] = [];

        if ( swportItem.portwwn.trim() != '' ) {
            var swConnPortWWN = swportItem.portwwn.trim();

            // Relationship with Zoning
                // for new, support "WWN ZONE" only

            for ( var i_zoning in Zonings ) {
                var zoneItem = Zonings[i_zoning]; 

                for ( var i_zonemember in zoneItem.zonemembers) {
                    var zonememberItem = zoneItem.zonemembers[i_zonemember];
                    if ( swConnPortWWN == zonememberItem.zmemid ) {
                        //zonememberItem['swDevice'] = swportItem.device;
                        //zonememberItem['swPortWWN'] = swportItem.partwwn;
                        //console.log(zonememberItem);
                        swportItem.Zoning.push(zoneItem);

                    }
                } 
            }



        }
    }
 
    callback(null,arg1);

}


function matchArrayPorts(arg1, callback ) {
    var swports = arg1.swports;
    var arrayports = arg1.arrayports;
    var Zonings = arg1.Zoning;

    var resultArrayDetail = [];


        // Relationship with Array Port
        for ( var i_array in arrayports ) {

            var arrayportItem = arrayports[i_array];
            var arrayPortWWN = arrayportItem.portwwn.trim();

            
            var resultDetailItem = {};
            resultDetailItem["array_portwwn"] =  arrayPortWWN ;
            resultDetailItem["array_port"] =  arrayportItem.feport ;
            resultDetailItem["array"] =  arrayportItem.device ;


            var arrayPortFind = false;

            for ( var i_sw in swports ) {
                var swportItem = swports[i_sw];
                var swConnPortWWN = swportItem.portwwn.trim(); 

                    if ( swConnPortWWN == arrayPortWWN ) {
                        arrayPortFind = true;
                        resultDetailItem["switch"] =  swportItem.device ;
                        resultDetailItem["switch_model"] =  swportItem.model ;
                        resultDetailItem["switch_firmware"] =  swportItem.firmware ;
                        resultDetailItem["switch_portwwn"] =  swportItem.partwwn ;
                        resultDetailItem["switch_port"] =  swportItem.part ;
                        resultDetailItem["switch_porttype"] =  swportItem.porttype ;
                        resultDetailItem["switch_maxspeed"] =  swportItem.maxspeed ;
                        resultDetailItem["switch_portstat"] =  swportItem.partstat ;

                        //console.log(swportItem.device + '\t|' + swportItem.part + '\t|' +swportItem.partwwn + '\t|' + swportItem.portwwn+ '\t|' + arrayportItem.device + '\t|' + arrayportItem.feport + '\t|' + arrayPortWWN);
                        resultArrayDetail.push(resultDetailItem);

                    }
            };
            if ( ! arrayPortFind ) {
                resultArrayDetail.push(resultDetailItem);
            }

        }

    arg1["resultArrayDetail"] = resultArrayDetail; 
    callback(null,arg1);

  
}
 


module.exports = getTopos;