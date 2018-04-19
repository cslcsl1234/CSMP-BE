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
    configger.get().SRM_RESTAPI.BASE_FILTER = configger.get().SRM_RESTAPI.BASE_FILTER + "&";

    return configger.get();
}

module.exports = configger;


