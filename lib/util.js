"use strict";

var configger = require('../config/configger');

var mongoose = require('mongoose');
var DatacenterObj = mongoose.model('Datacenter');
var CallGet = require('./CallGet'); 
 


        
exports.CombineQueryString = function(filter, fields, start, end, period,limit) {

      var config = configger.load();

        //var start = config.SRM_RESTAPI.SERIES_BEGIN_TS; 
        var queryString =  {'properties': fields , 'filter':  filter } ; 


        switch ( config.ProductType ) {
          case 'Prod' :
              queryString['start'] = ( start === undefined ? this.getPerfStartTime() : start ) ;
              queryString['end'] = ( end === undefined ? this.getPerfEndTime() : end ) ;
              queryString['limit'] = ( limit === undefined ? config.SRM_RESTAPI.SERIES_LIMITS : limit ) ;
              queryString['period'] = ( period === undefined ? config.SRM_RESTAPI.SERIES_PERIOD : period ) ;

              break;
          case 'dev' :
          case 'test' :
              queryString['start'] = config.SRM_RESTAPI.SERIES_BEGIN_TS;
              queryString['end'] = ( end === undefined ? this.getPerfEndTime() : end ) ;
              queryString['limit'] = ( limit === undefined ? config.SRM_RESTAPI.SERIES_LIMITS : limit ) ;
              queryString['period'] = ( period === undefined ? config.SRM_RESTAPI.SERIES_PERIOD : period ) ;
              break;

          default :
              queryString['start'] = ( start === undefined ? this.getPerfStartTime() : start ) ;
              queryString['end'] = ( end === undefined ? this.getPerfEndTime() : end ) ;
              queryString['limit'] = ( limit === undefined ? config.SRM_RESTAPI.SERIES_LIMITS : limit ) ;
              queryString['period'] = ( period === undefined ? config.SRM_RESTAPI.SERIES_PERIOD : period ) ;
              break;
        } 

        //queryString['type'] = 'last';
        return queryString;

};



exports.CurrentDateTime = function() {

   var d = new Date();  
  return d.toISOString();

};

exports.getPerfStartTime= function() {

  //var date = new Date();

  //var start = '2016-05-01T18:30:00+08:00'
  //return start;

  var config = configger.load();

  switch ( config.ProductType ) {
      // ------------------ Prod -------------------
      case "Prod" :
        var d = new Date(); 
        var a = d.getTime() - ( 86400000 * 30 ) ;   // the day of 30 days before
        var s = new Date(a);      
          break;
      // ------------------ Dev, Test -------------------
      case "Test":
      case "Dev":
        var SRMDevLastDT = config.SRMDevLastDT;
        var s = new Date(SRMDevLastDT); 

        break;
    } 
    

  return s.toISOString();

};

exports.getFirstDayofMonth = function (d) {
  var date = new Date(d), y = date.getFullYear(), m = date.getMonth();
  var firstDay = new Date(y, m, 1).toISOString();
  var lastDay = new Date(y, m + 1, 0).toISOString();  
  var res = {};
  res["firstDay"] = firstDay;
  res["lastDay"] = lastDay;

  return res;
}

exports.getConfStartTime= function(periodtype) {

  var config = configger.load();

  switch ( config.ProductType ) {
      // ------------------ Prod -------------------
      case "Prod" :
        var d = new Date(); 
        break;
      // ------------------ Dev, Test -------------------
      case "Test":
      case "Dev":
        var SRMDevLastDT = config.SRMDevLastDT;
        var d = new Date(SRMDevLastDT); 
        break;
    } 

    switch (periodtype) {
      case '1d' :
        var a = d.getTime() - ( 86400000 * 2 ) ;   
        break;
      case '1w' :
        var a = d.getTime() - ( 86400000 * 7 ) ;   
        break;
      case '2w' :
        var a = d.getTime() - ( 86400000 * 14 ) ;   
        break;
      case '1m' :
        var a = d.getTime() - ( 86400000 * 30 ) ;   
        break;
      default :
        var a = d.getTime() - ( 86400000 * 7 ) ;   
        break;
    }
    var s = new Date(a);
    //var date = new Date();
    //var start = '2016-03-20T18:30:00+08:00'
    //return start;
    return s.toISOString();

};

exports.getPerfEndTime = function() {

    //var end = '2016-07-01T18:30:00+08:00'
    //return end;
  return this.CurrentDateTime();
}

exports.getCurrentTime = function() {

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
                     //console.log("\t unit=" + unitItem  );
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

 
exports.convertPerformanceStruct = function(perf) {

    var finalResult = [];
    for ( var i in perf ) {
        var lunItem = perf[i];

        var lunItemResult = {};
        lunItemResult['part'] = lunItem.part;
        lunItemResult['parttype'] = lunItem.parttype;
        lunItemResult['device'] = lunItem.device;
        lunItemResult['matrics'] = [];
        var lunMatricsArray = [];

        for ( var j in lunItem.matrics ) {
            var lunMatrics = lunItem.matrics[j];
            var keys = Object.keys(lunMatrics)
            for ( var z in keys ) {
                if ( keys[z] != 'max' && keys[z] != 'avg') {
                    var matricsName = keys[z];

                    for ( var aa in lunMatrics[matricsName] ) {
                        var lunMatricsItem = {};
                        var item1 = lunMatrics[matricsName][aa];
                        lunMatricsItem['timestamp'] = item1[0];
                        lunMatricsItem[matricsName] = item1[1];

                        var isfind = false;
                        for ( var tt in lunMatricsArray ) {
                            //console.log(lunMatricsArray[tt].timestamp + '\t' + lunMatricsItem.timestamp);
                            if ( lunMatricsArray[tt].timestamp == lunMatricsItem.timestamp ) {
                                //console.log("isfind="+matricsName + '=' + lunMatricsItem[matricsName] );
                                lunMatricsArray[tt][matricsName] = lunMatricsItem[matricsName];
                                isfind = true;
                                break;
                            }
                        }
                        if ( !isfind ) {
                            lunMatricsArray.push(lunMatricsItem);
                        }

                    }
                    
                }
            } 

        } // end for ( var j in lunItem.matrics )

        lunItemResult['matrics'] = lunMatricsArray;
        finalResult.push(lunItemResult);
    }

    return finalResult;

}


exports.convertSRMPerformanceStruct1 = function(originPerfData) {

    var result = [];
    var oriArray = JSON.parse(originPerfData).values;
    for ( var i in oriArray) { 
        var item = oriArray[i].properties;
        console.log(item.part + '\t' + item.name);
        item['matrics'] = [];
        var matrics = oriArray[i].points;
        var matrics_max = this.GetMaxValue(matrics);
        var matrics_avg = this.GetAvgValue(matrics);


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

    var result1 = this.convertPerformanceStruct(result); 
    //var ret = arg1.values; 
    return originPerfData;

}


/*
   Result Strucat:

[
      {
        "serialnb": "CETV2164300044",
        "part": "LOGICAL UNIT NUMBER 4",
        "matricsStat": [
          {
            "ReadThroughput": {
              "max": "216.416",
              "avg": 31.936255714285714
            }
          },
          {
            "TotalThroughput": {
              "max": "9.60606",
              "avg": 37.13156571428571
            }
          }
        ],
        "matrics": [
          {
            "timestamp": "1513059852",
            "ReadThroughput": "0.0",
            "TotalThroughput": "0.0"
           },
          {
            "timestamp": "1513060153",
            "ReadThroughput": "0.0",
            "TotalThroughput": "0.0"
          }
        ]
      }
]




 */
exports.convertSRMPerformanceStruct = function(originPerfData) {

    var result = [];
    var oriArray = JSON.parse(originPerfData).values; 
    for ( var i in oriArray) { 
        var item = oriArray[i].properties;
        //console.log(item.part + '\t' + item.name);
        var matrics = oriArray[i].points; 
        var matricsName = item.name;


        var matricsStatItem = {};
        matricsStatItem[matricsName] = {};
        matricsStatItem[matricsName]["max"] = this.GetMaxValue(matrics);
        matricsStatItem[matricsName]["avg"] = this.GetAvgValue(matrics);




        var isfind = false;
        for ( var z in result ) {
             var resultItem = result[z];
             if ( resultItem.part == item.part ) {
                isfind = true;
                resultItem.matricsStat.push(matricsStatItem);

                for ( var j in matrics ) {
                    var timestamp = matrics[j][0];
                    var value = matrics[j][1];

                    var nTSFind = false ;
                    for ( var m in resultItem.matrics ) {
                        var nTS = resultItem.matrics[m];
                        if ( nTS.timestamp == timestamp ) {
                           nTS[matricsName] = value ;
                           nTSFind = true;
                        }
                    }
                    if ( nTSFind == false ) {
                        var newItem = {};
                        newItem["timestamp"] = timestamp;
                        newItem[matricsName] = value;
                        resultItem.matrics.push(newItem);                      
                    }

                }

             }
        }

        if ( isfind == false ) {


            delete item.name;


            item["matricsStat"] = [];
            item.matricsStat.push(matricsStatItem);



            item['matrics'] = [];
            for ( var j in matrics ) {
                var timestamp = matrics[j][0];
                var value = matrics[j][1];

                var newItem = {};
                newItem["timestamp"] = timestamp;
                newItem[matricsName] = value;
                item.matrics.push(newItem);
            }
            result.push(item);
        }

    }

    return result;

}

exports.searchCatalog = function(catalog, data) { 

  for ( var i in data ) {
      var item = data[i];
      if ( item.catalog == catalog ) return item;
  }
  return null;

}




exports.convertPerfFormat = function(data) {

                var result = [];
                var oriArray = JSON.parse(data).values;
                for ( var i in oriArray) {
                    var item = oriArray[i].properties;
                    item['matrics'] = [];
                    var matrics = oriArray[i].points;
                    var matrics_max = this.GetMaxValue(matrics);
                    var matrics_avg = this.GetAvgValue(matrics);


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


               var perfdata = CallGet.convertPerformanceStruct(result);


                var charts = [];

                for ( var i in perfdata ) {
                    var item = perfdata[i];

                    for ( var matricsi in item.matrics ) {

                        var matrics = item.matrics[matricsi];
                        //console.log("--------matrics begin ------------");
                        //console.log(matrics);
                        //console.log("--------matrics end------------");
                        var keys = Object.keys(matrics);
                        var lunname = item.part;                //lunname;
                        var arrayname  = item.device;           //array

                        for ( var keyi in keys ) {
                            var keyname = keys[keyi];

                            if ( keyname == 'timestamp' ) {
                                var timestamp = matrics[keyname];   //ts
                                continue;
                            } else {
                                var categoryname = keyname;         //perf-matrics-name
                                var value = matrics[keyname];       //perf-matrics-value
                            }
                            //console.log("array="+arrayname);
                            //console.log("lunname="+lunname);
                            //console.log("ts="+timestamp);
                            //console.log("categoryname="+categoryname);
                            //console.log("value="+value);
                            //console.log("---------");

                            // Search in result struct 
                            var isFind_chart = false;
                            for ( var charti in charts ) {
                                var chartItem = charts[charti];
                                if ( chartItem.category == categoryname ) {
                                    isFind_chart = true;

                                    var isFind_chartData = false;
                                    for ( var chartDatai in chartItem.chartData ) {
                                        var chartDataItem = chartItem.chartData[chartDatai] ;
                                        if ( chartDataItem.name == timestamp ) {
                                            isFind_chartData = true;
                                            chartDataItem[lunname] = value;
                                        }

                                    } // for 

                                    if ( !isFind_chartData ) {
                                        var chartDataItem = {};
                                        chartDataItem['name'] = timestamp;
                                        chartDataItem[lunname] = value;
                                        chartItem.chartData.push(chartDataItem);
                                    }

                                }
                            } // for ( charts ) 

                            if ( !isFind_chart ) {
                                var chartItem = {};
                                chartItem['category'] = categoryname;
                                chartItem['chartData'] = [];

                                var chartDataItem = {};
                                chartDataItem['name'] = timestamp;
                                chartDataItem[lunname] = value;
                                chartItem.chartData.push(chartDataItem);

                                charts.push(chartItem);
                            }


                        } // for ( keys )
                    } // for ( matrics )
                    
                } // for ( arg1 )

                return charts;

}
