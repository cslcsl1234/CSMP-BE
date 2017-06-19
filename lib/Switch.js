"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var topos = require('../lib/topos.js');

module.exports = {
    GetSwitchPorts
}


function GetPortConnectedTo(device, callback) { 


        var queryString = "PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>  ";
        queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#> ";
        queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ";

        queryString = queryString + " SELECT distinct ?arraySN ?deviceName ?deviceWWN ?vplexName ?vplexVVolName ?vplexMaskviewName ";
        queryString = queryString + " WHERE {  ";
        queryString = queryString + "     ?arrayEntity rdf:type srm:StorageEntity .   ";
        queryString = queryString + "     ?arrayEntity srm:serialNumber ?arraySN .  ";
        queryString = queryString + "     ?arrayEntity srm:containsStorageVolume ?device .  ";
        queryString = queryString + "     ?device srm:displayName ?deviceName . ";
        queryString = queryString + "     ?device srm:volumeWWN ?deviceWWN .  ";
        queryString = queryString + "     ?device srm:associatedToStorageVolume ?deviceAssoc . ";
        queryString = queryString + "     ?deviceAssoc srm:associatedToVPlexStorageVolume ?vplexVol . ";
        queryString = queryString + "     ?vplexVol srm:residesOnDevice ?vplexDevice . ";
        queryString = queryString + "     ?vplexDevice srm:residesOnVirtualVolume ?vplexVVol . ";
        queryString = queryString + "     ?vplexVVol srm:displayName ?vplexVVolName . ";
        queryString = queryString + "     ?vplexVVol srm:residesOnVPlexCluster ?vplex . ";
        queryString = queryString + "     ?vplex srm:displayName ?vplexName . ";
        queryString = queryString + "     ?vplexVVol srm:maskedTo ?maskview . ";
        queryString = queryString + "     ?maskview srm:displayName ?vplexMaskviewName . ";
        queryString = queryString + "     FILTER  (?arraySN = '" + device + "' ) .  "; 
        queryString = queryString + "    } ";

        topos.querySparql(queryString,  function (response) {
                        //var resultRecord = RecordFlat(response.body, keys);
                        console.log(response);
                        callback(response);
        }); 



}


function GetSwitchPorts(device, callback) {

    var param = {};
    if (typeof device !== 'undefined') { 
        param['filter'] = 'device=\''+device+'\'&' + param['filter'];
    } 

    param['filter_name'] = '(name=\'InCrcs\'|name=\'LinkFailures\'|name=\'SigLosses\'|name=\'SyncLosses\'|name=\'CreditLost\'|name=\'Availability\'|name=\'ifInOctets\'|name=\'ifOutOctets\')';
    param['keys'] = ['device','partwwn'];
    param['fields'] = ['partid','slotnum','part','porttype','partwwn','ifname','portwwn','maxspeed','partstat','partphys','gbicstat'];
    param['filter'] = 'device=\''+device+'\'&parttype=\'Port\'&!iftype=\'Ethernet\'&!discrim=\'FCoE\'';



    async.waterfall([
        function(callback){ 
            CallGet.CallGet(param, function(param) { 
            var result = [];
     
            callback(null, param.result ); 
            });
        },
        function(arg1,  callback){ 
            GetPortConnectedTo(device,function(result) {

                for ( var i in arg1 ) {
                    var deviceItem = arg1[i];

                    for ( var j in result ) {
                        var devicePerfItem = result[j];

                        if ( deviceItem.device == devicePerfItem.device && deviceItem.part == devicePerfItem.part ) {
                            deviceItem['perf'] = devicePerfItem.matrics;
                        }
                    }
                }
                callback(null,arg1);
            })
        },
        function(arg1,  callback){ 
                callback(null,arg1);
        },
        // -- Get all of initial group member list and rela with maskview 
        function(arg1,  callback){   

                callback(null,arg1);
        }
    ], function (err, result) {
       // result now equals 'done'
       //res.json(200, result);
       // var r = JSON.parse(result);
       callback(result);
    });





}

