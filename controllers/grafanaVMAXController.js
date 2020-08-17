"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('grafanaVMAXController')
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


var grafanaVMAXController = function (app) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  var arrayBaseFilter = 'source==\'VMAX-Collector\'';
  var arrayFilter = arrayBaseFilter + '&!parttype';

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



  app.get('/grafana/vmax/', function (req, res) {
    var hostname = req.query.device;
    var appid = req.query.appid;
    var result = {};

    res.json(200, result);

  });


  app.post('/grafana/vmax/search', function (req, res) { 
    logger.info("----------------- Search ----------------------");
    logger.info(req.url);
    logger.info(req.body);

    var target = req.body.target;

    switch ( target ) {
      case '' : 
        var filter = arrayFilter;
        var key = ['datagrp','name'];
    
        break;
      case 'device': 
        var filter = arrayFilter;
        var key = ['device'];
    
        break;
    }

    logger.info(filter);
    logger.info(key.toString());

    unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
    .auth(config.Backend.USER, config.Backend.PASSWORD, true)
    .headers({
      'Content-Type': 'multipart/form-data'
    })
    .query({
      'fields': key,
      'filter': filter
    })
    .end(function (response) {

      var resultJson = JSON.parse(response.raw_body).values; 
      var result = []; 

      result.push('UsedCapacityPercent');


      for (var i in resultJson) {
        var item = resultJson[i]; 
        var itemValue = '';

        for ( var j in key ) {
          var fieldname = key[j];
          itemValue += (itemValue === '')?item[fieldname]:'+'+item[fieldname]; 
        }
           
        result.push(itemValue);

      }  


      res.json(200, result.sort());

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
  app.post('/grafana/vmax/query', function (req, res) {

    logger.info(req.url);
    logger.info(JSON.stringify(req.body));


    var start = req.body.range.from;
    var end = req.body.range.to; 
    var targets = req.body.targets;
    var scopedVars = req.body.scopedVars; 
    var scopedFilter ;
    for ( var fieldname in scopedVars ) {
        if ( fieldname.substring(0,2) == '__' ) continue;
        var temp = fieldname+'==\''+scopedVars[fieldname].value + '\'';
        var scopedFilter = ( scopedFilter === undefined ) ? temp : scopedFilter + '&'+temp ;
    }
 
    /*
      timeserie
    */

   if (targets[0].type == 'timeseries') {  
      var target = targets[0];

      var targetName = target.target;
      var datagrp = targetName.split('+')[0];
      var metric = targetName.split('+')[1];

      if ( target.data !== null ) {
        var fields = target.data.fields;
        var fieldKey = target.data.key
      } 
      else {
        var fields = 'device,name';
        var fieldKey = 'device';
      }
        
      
    


      // 
      // combine the filter string
      //
      var filter = config.SRM_RESTAPI.BASE_FILTER + arrayBaseFilter
      switch ( targetName ) {
        case 'UsedCapacityPercent' :
             filter +=  '&!parttype'+
                '&(name==\'ConfiguredUsableCapacity\'|name==\'LogicalUsedCapacity\')' + 
                ( (scopedFilter === undefined ) ? '' : '&' + scopedFilter );
        
                break;
        default:
           filter = filter + '&datagrp==\''+datagrp+'\''+
                    '&name==\''+metric+'\'' + 
                    ( (scopedFilter === undefined ) ? '' : '&' + scopedFilter );
           break;
      }


      var queryString = {};
      queryString['properties'] = fields;
      queryString['filter'] = filter ;


      queryString['start'] = start;
      queryString['end'] = end;
      //queryString['period'] = param.period;
      //queryString['type'] = valuetype;

      logger.info(queryString);
      unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
        .headers({
          'Content-Type': 'multipart/form-data'
        })
        .query(queryString)
        .end(function (response) {
          if (response.error) {
            logger.error(response.error);
            return response.error;
          } else {
            //logger.info(response.raw_body);   
            var resultRecord = JSON.parse(response.raw_body);

            var finalRecord = []; 
            for (var i in resultRecord.values) {
              var item = resultRecord.values[i];

              var recordItem = {};  
              recordItem["target"] = item.properties[fieldKey]; 

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
            logger.info("resultRecord=" + finalRecord.length);
            res.json(200, finalRecord);
          }

        });

      } else {
        /*
          table
        */  

      }

  });

  app.post('/grafana/vmax/annotations', function (req, res) {

    logger.info(req.body);

    var annotation = req.body;

    var annotations = [{
      annotation: annotation,
      "title": "Donlad trump is kinda funny",
      "time": 1539655200000,
      text: "teeext",
      tags: "taaags"
    }];

    res.json(annotations);
    res.end();
  });


  app.post('/grafana/vmax/tag-keys', function (req, res) {
    var keys = [{
        type: "string",
        text: "device"
      },
      {
        type: "string",
        text: "sgname"
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


  app.post('/grafana/vmax/tag-values', function (req, res) {

    logger.info(req.body);
    switch (req.body.key) {
      case 'device':
        var fields = 'name';
        var filter = arrayFilter;

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

      case 'sgname':

        fields = 'device,part';
        filter = arrayBaseFilter + '&datagrp==\'VMAX-StorageGroup\'';

        logger.info(filter);

        unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
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
              var item = resultJson[i];
              var resultItem = item.device + '+' + item.part;
              item["text"] = resultItem;
              result.push(item);
            }

            res.json(result.sort());
            res.end();

          });



        break;
    }




  });



};

module.exports = grafanaVMAXController;