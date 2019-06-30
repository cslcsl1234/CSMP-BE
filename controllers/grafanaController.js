"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('grafanaController')
const name = 'my-app'
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async');

var util = require('../lib/util');
var CallGet = require('../lib/CallGet');
var cache = require('memory-cache');

var host = require('../lib/Host');

var mongoose = require('mongoose');
var HostObj = mongoose.model('Host');
var HBAObj = mongoose.model('HBA');

var HBALIST = require('../demodata/host_hba_list');
var VMAX = require('../lib/Array_VMAX');
var SWITCH = require('../lib/Switch');


var grafanaController = function (app) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  var baseFilter = 'source==\'VMAX-Collector\'&!parttype';

  var config = configger.load();

  app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header('Access-Control-Expose-Headers', '*');



    debug('req.method = %s', req.method);
    debug('req.url = %s', req.url);

    if (req.method == "OPTIONS") res.send(200); /*让options请求快速返回*/
    else next();
  });



  app.get('/grafana/', function (req, res) {
    var hostname = req.query.device;
    var appid = req.query.appid;
    var result = {};

    res.json(200, result);

  });


  app.post('/grafana/search', function (req, res) {
    /*
        var device1;
        VMAX.GetArrays( device1, function( ret) {  
            var result = [];
            for ( var i in ret ) {
                result.push(ret[i].device);
            } 
            console.log(result);
            res.json(200 , result);
        });  
*/
console.log("----------------- Search ----------------------");
console.log(req.url);
console.log(req.body);

    var fields = req.body.target;
    if ( fields == '' ) fields = 'name';
    var filter = baseFilter;

    var fabricResult = [];
    unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE + '/' + fields)
      .auth(config.Backend.USER, config.Backend.PASSWORD, true)
      .headers({
        'Content-Type': 'multipart/form-data'
      })
      .query({
        'fields': fields,
        'filter': filter
      })
      .end(function (response) {


        var resultJson = JSON.parse(response.raw_body).values;
        var result = [];
        for (var i in resultJson) {
          result.push(resultJson[i]);
        }
        res.json(200, result);
      });


  });

  /* Request.body 
  {
    "panelId": 1,
    "range": {
      "from": "2016-10-31T06:33:44.866Z",
      "to": "2016-10-31T12:33:44.866Z",
      "raw": {
        "from": "now-6h",
        "to": "now"
      }
    },
    "rangeRaw": {
      "from": "now-6h",
      "to": "now"
    },
    "interval": "30s",
    "intervalMs": 30000,
    "maxDataPoints": 550,
    "targets": [
       { "target": "upper_50", "refId": "A", "type": "timeseries", "data": { "additional": "optional json" } },
       { "target": "upper_75", "refId": "B", "type": "timeseries" }
    ],
    "adhocFilters": [{
      "key": "City",
      "operator": "=",
      "value": "Berlin"
    }]
  }

     --------------- type="timeseries" response body ---------------------
     [
    {
      "target":"upper_75", // The field being queried for
      "datapoints":[
        [622,1450754160000],  // Metric value as a float , unixtimestamp in milliseconds
        [365,1450754220000]
      ]
    },
    {
      "target":"upper_90",
      "datapoints":[
        [861,1450754160000],
        [767,1450754220000]
      ]
    }
  ]
     --------------- type="table" response body ---------------------
  [
    {
      "columns":[
        {"text":"Time","type":"time"},
        {"text":"Country","type":"string"},
        {"text":"Number","type":"number"}
      ],
      "rows":[
        [1234567,"SE",123],
        [1234567,"DE",231],
        [1234567,"US",321]
      ],
      "type":"table"
    }
  ]
  */
  app.post('/grafana/query', function (req, res) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    console.log(req.url);
    console.log(req.body);


    var period = 0;
    var valuetype = 'average';
    var start = req.body.range.from;
    var end = req.body.range.to;
    var targets = req.body.targets;
    var scopedVars = req.body.scopedVars;
    var part;
    if ( scopedVars.device !== undefined )
      var device =  scopedVars.device.value ;
    else 
      var device;

    var adhocFilters = req.body.adhocFilters;
    for (var i in adhocFilters) {
      var adhocItem = adhocFilters[i];
      switch (adhocItem.key) {
        case 'periods':
          period = adhocItem.value;
          break;
        case 'datatypes':
          valuetype = adhocItem.value;
          break;

        case 'device':
          device = adhocItem.value;
          break;
      }
    }

    /*
      timeserie
    */
    if (targets[0].type == 'timeserie') {

      var param = {};
      param['keys'] = ['device'];
      param['fields'] = ['device', 'name'];
      param['period'] = period;
      param['start'] = start;
      param['end'] = end;
      param['type'] = valuetype;
      if (device === undefined)
        param['filter'] = baseFilter;
      else
        param['filter'] = '!parttype&source=\'VMAX-Collector\'&device=\'' + device + '\'';

      param['filter_name'] = '(name==\'IORate\'|name==\'HitPercent\'|name==\'ReadRequests\'|name==\'WriteRequests\'|name==\'ReadThroughput\'|name==\'WriteThroughput\')';

      var queryString = {};
      queryString['properties'] = param.fields;

      var filter = config.SRM_RESTAPI.BASE_FILTER + param.filter;
      var matrics; 
      if ( scopedVars.matrics !== undefined  ) 
        matrics = 'name=\''+scopedVars.matrics.value +'\'';
      else 
        matrics = "name=\'IORate\'";

      queryString['filter'] = param.filter + '&(' + matrics + ')';
      queryString['start'] = param.start;
      queryString['end'] = param.end;
      queryString['period'] = param.period;
      queryString['type'] = param.type;


      console.log(queryString);
      unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
        .headers({
          'Content-Type': 'multipart/form-data'
        })
        .query(queryString)
        .end(function (response) {
          if (response.error) {
            console.log(response.error);
            return response.error;
          } else {
            //console.log(response.raw_body);   
            var resultRecord = JSON.parse(response.raw_body);

            var finalRecord = [];


            for (var i in resultRecord.values) {
              var item = resultRecord.values[i];

              var recordItem = {};
              recordItem["target"] = item.properties.device;

              var newPoint = [];
              for (var j in item.points) {
                var pointItem = item.points[j];

                var newPointItem = [];
                newPointItem.push(parseFloat(pointItem[1]));
                newPointItem.push(parseFloat(pointItem[0]) * 1000);
                newPoint.push(newPointItem);
              }
              recordItem["datapoints"] = newPoint;

              finalRecord.push(recordItem);

            }
            console.log("resultRecord=" + finalRecord.length);
            res.json(200, finalRecord);
          }

        });

    } else 
    /*
      table
    */ 
   { 
      VMAX.GetArrays( device, function( ret) {  

        var resultItem ={
            "columns":[],
            "rows":[],
            "type":"table"
          };

        for ( var i in ret ) {
          var item = ret[i];
          var row = [];
          for ( var fieldname in item ) {
            if ( i == 0 ) {
            var column = {};
            column["text"] = fieldname;
            column["type"] = "string";
            resultItem.columns.push(column);
            }
            
            row.push(item[fieldname]);
          }

          resultItem.rows.push(row);

        }

        var result = [];
        result.push(resultItem);
        res.json(200,result);   
      
      }); 


    }


  });

  app.post('/grafana/annotations', function (req, res) {

    console.log(req.body);

    var annotation = req.body;

    var annotations = [{
        annotation: annotation,
        "title": "Donlad trump is kinda funny",
        "time": 1539655200000,
        text: "teeext",
        tags: "taaags"
      }
    ];

    res.json(annotations);
    res.end();
  });


  app.post('/grafana/tag-keys', function (req, res) {
    var keys = [{
        type: "string",
        text: "device"
      },
      {
        type: "string",
        text: "periods"
      },
      {
        type: "string",
        text: "datatypes"
      }
    ];

    res.json(keys);
    res.end();
  });


  app.post('/grafana/tag-values', function (req, res) {

    console.log(req.body);
    switch (req.body.key) {
      case 'device':
        var fields = 'name';
        var filter = baseFilter;

        var fabricResult = [];
        unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE + '/' + req.body.key)
          .auth(config.Backend.USER, config.Backend.PASSWORD, true)
          .headers({
            'Content-Type': 'multipart/form-data'
          })
          .query({
            'fields': fields,
            'filter': filter
          })
          .end(function (response) { 

            var resultJson = JSON.parse(response.raw_body).values;
            var result = [];
            for (var i in resultJson) {
              var item = {};
              item["text"] = resultJson[i];
              result.push(item);
            }


            res.json(result);
            res.end();
          });

        break;
      case 'periods':
      case 'datatypes':
        var fabricResult = [];
        unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_AGGREGATES)
          .auth(config.Backend.USER, config.Backend.PASSWORD, true)
          .headers({
            'Content-Type': 'multipart/form-data'
          })
          .end(function (response) {
            var result = [];
            if (req.body.key == 'periods') {
              var resultJson = JSON.parse(response.raw_body).periods;
            } else {
              var resultJson = JSON.parse(response.raw_body).types;
            }
            for (var i in resultJson) {
              var item = {};
              item["text"] = resultJson[i];
              result.push(item);
            }
            res.json(result);
            res.end();
          });

        break;

    }




  });



};

module.exports = grafanaController;