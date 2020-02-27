"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('healthcheckController')
var async = require('async');

var configger = require('../config/configger');
var fs = require('fs');
var xml2json = require('xml2json');
var XLSX = require('xlsx');
var healthcheckInfo = require('../config/SEHosts')
var fs = require('fs');
var SSH = require('../lib/ssh');

var HealthCheck = require('../lib/healthcheck');


var healthcheckController = function (app) {



    app.all('*', function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
        res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        res.header('Access-Control-Expose-Headers', '*');

        debug('req.method = %s', req.method);
        debug('req.url = %s', req.url);

        if (req.method == "OPTIONS") res.send(200);  /*让options请求快速返回*/
        else next();
    });


    app.get('/healthcheck/vmax', function (req, res) {
        var config = configger.load();


        HealthCheck.VMAX("C:\\","20200227101112",function(outputfile) {
            //console.log(outputfile);
            res.json(200,outputfile);
        })

    });


};

module.exports = healthcheckController;
