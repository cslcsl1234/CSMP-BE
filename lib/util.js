"use strict";

var configger = require('../config/configger');



exports.CombineQueryString = function(filter, fields) {

    	var config = configger.load();

        var start = config.SRM_RESTAPI.SERIES_BEGIN_TS;
        var queryString =  {'properties': fields , 'filter':  filter } ; 
        
        queryString['limit'] = config.SRM_RESTAPI.SERIES_LIMITS; 
        if ( start.length > 0 ) {
            queryString['start'] = start;
        }

        return queryString;

};

