"use strict";

var async = require('async');
const fs = require('fs');


module.exports = {
    GetResourcePool,
    ChoosePhysicalArray
}

const ResourcePoolFilename = "./config/ResourcePool.json";

function GetResourcePool() {
    var ret1 = fs.readFileSync(ResourcePoolFilename);

    var result = JSON.parse(ret1);
    if (result === undefined) {
        var outputRecord = {};
    } else { 
        var outputRecord = result;
    }
    return outputRecord;
};

/*
选择资源池内的物理存储。 
*/
function ChoosePhysicalArray(resourcepool) {
    if ( resourcepool.members === undefined ) return {};
    if ( resourcepool.members.length == 0 ) return {};

    var retItem ;
    for ( var i in resourcepool.members ) {
        var item = resourcepool.members[i];
        if ( retItem === undefined ) 
            retItem = item;

        if ( item.capacity > retItem.capacity ) {
            retItem = item;
        }
        
    }
    return retItem;
}