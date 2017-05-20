"use strict";

var configger = require('../config/configger');



exports.CombineQueryString = function(filter, fields,limit) {

    	var config = configger.load();

        //var start = config.SRM_RESTAPI.SERIES_BEGIN_TS;
        var start = this.getPerfStartTime();
        var queryString =  {'properties': fields , 'filter':  filter } ; 
        
        if ( typeof limit !== 'undefined') 
            queryString['limit'] = limit;
        else
          queryString['limit'] = config.SRM_RESTAPI.SERIES_LIMITS; 
        //queryString['period'] = '86400';
        queryString['period'] = '604800';
        if ( start.length > 0 ) {
            queryString['start'] = start;
        }

        return queryString;

};



exports.CurrentDateTime = function() {

   var d = new Date();  
	return d.toISOString();

};

exports.getPerfStartTime = function() {

   var d = new Date(); 
   	var a = d.getTime() - ( 86400000 * 30 ) ;   // the day of 30 days before
   	var s = new Date(a);
	//var date = new Date();

	var start = '2016-03-20T18:30:00+08:00'
	return start;
	//return s.toISOString();

};

exports.getPerfEndTime = function() {

    //var end = '2016-07-01T18:30:00+08:00'
    //return end;
	return this.CurrentDateTime();
}


exports.MergeAndDistinctItem = function(s,t,key) {

    for ( var i in s ) {
      var item = s[i];
      var keyValue = item[key];

      var isFind = false;
      for ( var j in t) {
        var item_t = t[j];
        var keyValue_t = item_t[key];

        if ( keyValue == keyValue_t ) {
          isFind = true;
          break;
        } else {
          isFind = false;
        }
      }

      if ( isFind == false ) {
        t.push(item);
      }
    }
    
    return t;
  //return this.CurrentDateTime();
}


exports.GetMaxValue = function(data) {

    var maxvalue = 0;
    for ( var i in data ) {
      var item = data[i];
      var ts = item[0];
      var value = item[1];

      if ( value > maxvalue ) maxvalue = value;
    }

    return maxvalue;
}

exports.GetAvgValue = function(data) {

    var sumvalue = 0;
    for ( var i in data ) {
      var item = data[i]; 
      sumvalue = sumvalue + Number(item[1]); 
    }
 
    return sumvalue / data.length;
}

