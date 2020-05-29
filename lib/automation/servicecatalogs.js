"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose'); 
//var CallGet = require('./CallGet'); 
const fs = require('fs');


module.exports = { 
    GetServiceCatalog ,
    GetServiceMetadata
}

var serviceinfofile = '../../config/automation_serviceinfo';

function GetServiceCatalog(catalog, name) {  
    //var data = fs.readFileSync('..\\..\\config\\automation_serviceinfo.json').toString(); 
    var dataJson = require(serviceinfofile);
    //var dataJson = JSON.parse(data);
    var serviceCatalogs = dataJson.ServiceCatalogs;

    if ( catalog === undefined && name === undefined ) return serviceCatalogs;

    if ( catalog !== undefined ) {
        for ( var i in serviceCatalogs ) {
            var item = serviceCatalogs[i];
            if ( item.catalog == catalog ) {
                var retData = item;
                return retData;
            }
        }
        return {};
    } else if ( name !== undefined ) {
        for ( var i in serviceCatalogs ) {
            var item = serviceCatalogs[i];
            if ( item.name == name ) {
                var retData = item;
                return retData;
            }
        }
        return {};
    }
}



function GetServiceMetadata() {    
    var dataJson = require(serviceinfofile);  
 
    var retData = {
        ProtectLevel : dataJson.ProtectLevel,
        usedfor :  dataJson.usedfor,
        HostDeploy : dataJson.HostDeploy
    } 

    return retData;
}