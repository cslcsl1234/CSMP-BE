"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var topos = require('../lib/topos.js');
var util = require('./util');


module.exports = {
    GetSwitchPorts,
    getSwitchPortPerformance
}


function GetPortConnectedTo(device, callback) { 


        var queryString = " PREFIX  srm: <http://ontologies.emc.com/2013/08/srm#>                               ";
        queryString = queryString + " PREFIX  filter:<http://ontologies.emc.com/2015/mnr/topology#>                       ";
        queryString = queryString + " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>                           ";
        queryString = queryString + "                                                                                     ";
        queryString = queryString + " select distinct ?switchPortName ?switchPortNumber ?switchPortWWN  ?switchPortType   ";
        queryString = queryString + "  ?switchPortStatus ?switchPortSpeed ?connectedToEndpoint                  ";
        queryString = queryString + " where {                                                                             ";
        queryString = queryString + "    ?switchport rdf:type srm:SwitchPort .                                            ";
        queryString = queryString + "       ?switchport srm:residesOnPhysicalSwitch ?phySwitch .                          ";
        queryString = queryString + "       ?phySwitch srm:displayName ?phySwitchName .                                   ";
        queryString = queryString + "    ?switchport srm:displayName ?switchPortName .                                    ";
        queryString = queryString + "    ?switchport srm:Identifier ?switchPortID .                                       ";
        queryString = queryString + "    ?switchport srm:status ?switchPortStatus .                                       ";
        queryString = queryString + "    ?switchport srm:type ?switchPortType .                                           ";
        queryString = queryString + "    ?switchport srm:PortNumber ?switchPortNumber .                                   ";
        queryString = queryString + "    ?switchport srm:portSpeed ?switchPortSpeed .                                     ";
        queryString = queryString + "    ?switchport srm:containsProtocolEndpoint ?switchPortEndpoint .                   ";
        queryString = queryString + "    ?switchPortEndpoint srm:wwn ?switchPortWWN .                                     ";
        queryString = queryString + "    OPTIONAL {                                                                       ";
        queryString = queryString + "      ?switchPortEndpoint srm:connectedTo ?connectedToEndpoint .                     ";
        queryString = queryString + "    }                                                                                "; 

        queryString = queryString + "     FILTER  (?phySwitchName = '" + device + "' ) .  "; 
        queryString = queryString + "    } ";

        topos.querySparql(queryString,  function (response) {
                        //var resultRecord = RecordFlat(response.body, keys); 
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

                for ( var i in result ) {
                    var item = result[i];
                    for ( var j in arg1 ) {
                        var portItem = arg1[j];
                        if ( item.switchPortWWN == portItem.partwwn ) {
                            portItem["connectedToWWN"] = item.connectedToEndpoint.replace('topo:srm.ProtocolEndpoint:','');
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

function getSwitchPortPerformance(device, callback) {
 
        var config = configger.load();
        //var start = '2016-06-20T18:30:00+08:00'
        //var end = '2016-07-01T18:30:00+08:00'
        var start = util.getPerfStartTime();
        var end = util.getPerfEndTime();
        if  ( typeof device === 'undefined') 
            var filterbase = '(parttype==\'Port\')';
        else 
            var filterbase = 'device==\''+device+'\'&(parttype==\'Port\')';

        async.waterfall([
            function(callback){ 
                var filter = filterbase + '&(name=\'InCrcs\'|name=\'LinkFailures\'|name=\'SigLosses\'|name=\'SyncLosses\'|name=\'CreditLost\'|name=\'Availability\'|name=\'ifInOctets\'|name=\'ifOutOctets\')';

                var fields = 'device,name,part';
                var keys = ['device,part'];



                //var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '86400'}; 
                var queryString =  {'properties': fields, 'filter': filter, 'start': start , 'end': end , period: '3600'}; 

console.log(queryString);
                unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE )
                        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                        .headers({'Content-Type': 'multipart/form-data'}) 
                        .query(queryString) 
                        .end(function (response) { 
                            if ( response.error ) {
                                console.log(response.error);
                                return response.error;
                            } else {  
                                //console.log(response.body);   
                                var resultRecord = response.body;
                                callback(null,resultRecord);
                            }
         
                        }); 

     
            },
            function(arg1,  callback){ 
                
                var result = [];
                var oriArray = JSON.parse(arg1).values;
                for ( var i in oriArray) {
                    var item = oriArray[i].properties;
                    item['matrics'] = [];
                    var matrics = oriArray[i].points;
                    var matrics_max = util.GetMaxValue(matrics);
                    var matrics_avg = util.GetAvgValue(matrics);


                    var matricsItem = {};
                    matricsItem[item.name] = matrics;
                    matricsItem['max']= matrics_max;
                    matricsItem['avg'] = matrics_avg;


                    var isFind = false;
                    for ( var j in result ) {
                        var resItem = result[j];
                        if ( resItem.device == item.device && resItem.part == item.part ) {
 

                            resItem.matrics.push(matricsItem)
                            isFind = true;
                        } 
                    }
                    if ( !isFind ) {  
                        item['matrics'].push(matricsItem);
                        delete item['name'];

                        result.push(item);                  

                    }


                }

 
                //var ret = arg1.values; 
               callback(null,result);


            }
        ], function (err, result) {
           // result now equals 'done'
           //res.json(200, result);
           // var r = JSON.parse(result);
           callback(result);
        });


 

         
    };
