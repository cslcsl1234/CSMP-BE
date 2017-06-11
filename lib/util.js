"use strict";

var configger = require('../config/configger');

var mongoose = require('mongoose');
var DatacenterObj = mongoose.model('Datacenter');

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

exports.GetLocaltionByUnitID = function(UnitID,callback) {

        DatacenterObj.find({}, { "__v": 0, "_id": 0 },  function (err, doc) {
        //system error.
        if (err) {
            return   done(err);
        }
        if (!doc) { //user doesn't exist. 

            return "";
        
        }
        else {
            for ( var j in doc ) {
              var item = doc[j]; 
               

              var dcname = item.Name;

              //console.log('--------\n');
              //console.log('dcname=' + dcname);
              for ( var building_i in item.Building) {
                  var buildingItem = item.Building[building_i];
                  var buildingName = buildingItem.Name;
                  //console.log("\tbuild=" + buildingName);

                  for ( var floor_i in buildingItem.Floor ) {
                      var floorItem = buildingItem.Floor[floor_i];
                      var floorName = floorItem.Name;
                    //console.log("\tfloor=" + floorName);

                      for ( var unit_i in floorItem.Unit ) {
                          var unitItem = floorItem.Unit[unit_i];
                          var unitName = unitItem.Name;
                     //console.log("\t unit=" + unitName);
                     //console.log("\t unitID-ori=" + UnitID);


                         if ( unitItem.UnitID == UnitID ) {
                            callback( dcname + "-" + buildingName + "-" + floorName + "-" + unitName );
                          }
                      }
                  }
              }
 
            } 
            callback( "Not Defined" );

        }
        
    });  
}



exports.GetLocaltion = function(callback) {

        DatacenterObj.find({}, { "__v": 0, "_id": 0 },  function (err, doc) {
        //system error.
        if (err) {
            return   done(err);
        }
        if (!doc) { //user doesn't exist. 

            return "";
        
        }
        else { 
            var result = [];
            for ( var j in doc ) {
              var item = doc[j]; 

              var dcname = item.Name;

              //console.log('--------\n');
              //console.log('dcname=' + dcname); 
              for ( var building_i=0; building_i<item.Building.length; building_i ++) {
                  var buildingItem = item.Building[building_i];
                  var buildingName = buildingItem.Name;
                  //console.log(building_i + "\tbuild=" + buildingName);

                  for ( var floor_i = 0; floor_i < buildingItem.Floor.length; floor_i ++ ) {
                      var floorItem = buildingItem.Floor[floor_i];
                      var floorName = floorItem.Name;
                    //console.log("\tfloor=" + floorName);

                      for ( var unit_i = 0; unit_i< floorItem.Unit.length; unit_i++ ) {
                          var unitItem = floorItem.Unit[unit_i];
                          var unitName = unitItem.Name;
                     console.log("\t unit=" + unitItem  );
                     //console.log("\t unitID-ori=" + unitName);
                          var retItem = {};

                          retItem['UnitID'] = unitItem.UnitID;
                          retItem['Location'] = dcname + "-" + buildingName + "-" + floorName + "-" + unitName;
                          retItem['datacenter'] = dcname ;
                          retItem['building'] = buildingName ;
                          retItem['floor'] = floorName ;
                          retItem['unitName'] = unitName ;
                          
                          result.push(retItem);
                      }
                  }
              }
 
            } 
            callback( result );
 
        }
        
    });  
}
