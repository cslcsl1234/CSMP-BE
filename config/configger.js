/* configger.js
 * Reads configuration using nconf.
 * Returns a JavaScript object representing the effective configuration.
 */

var configger = require('nconf');
var fs = require('fs');
configger.load = function(defaults) {
    configger.argv().env({whitelist: ['configFile']});    
    var configFile = './config/config.json';

    if (configger.get('configFile')) {
        configFile = configger.get('configFile');
    }

    if (!fs.existsSync(configFile)) {
        throw {
            name : 'FileNotFoundException',
            message : 'Unable to find configFile ' + configFile
        };
    }

    configger.file(configFile);

    configger.defaults(defaults);

    if ( configger.get().ProductType != "Prod" )
        configger.get().SRM_RESTAPI.BASE_FILTER = "";
    else 
        configger.get().SRM_RESTAPI.BASE_FILTER = '!vstatus==\'inactive\'' + "&";

    configger.get().SRM_RESTAPI.BASE_FILTER = '!vstatus==\'inactive\'' + "&";

    // add mutil-apg-server function;
    var a = configger.get().Backend;
    //configger.set('Backend', a[0]); 
    //configger.set('BackendExtra', a);
    var newConfigger = configger.get();

    newConfigger.Backend = a[0];
    newConfigger.BackendExtra = a;


    //console.log("$$$$\n"+ JSON.stringify(newConfigger,1,1));

    return newConfigger;
}

module.exports = configger;


