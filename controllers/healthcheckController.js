"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('healthcheckController')
const moment = require('moment');
var async = require('async');

var configger = require('../config/configger');  
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
        var startdate = req.query.begindate;
        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;

<<<<<<< HEAD
        var d = new Date(); // Today!
        d.setDate(d.getDate() - 1); // Yesterday!
        var startdatetime = monent(d).format('YYYYMMDDHHmmss')

        HealthCheck.VMAX("C:\\",startdatetime,function(outputfile) {
=======
        HealthCheck.VMAX(ReportOutputPath,startdate,function(outputfile) {
>>>>>>> bf9c9db4ff96644cd6f4fcf3b0eda24e4ad8bbcc
            //console.log(outputfile);
            var retData = { filename: outputfile }
            res.json(200,retData);
        })

    });

    app.get('/healthcheck/brocade', function (req, res) {
        var startdate = req.query.begindate;
        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;

<<<<<<< HEAD
        var d = new Date(); // Today!
        d.setDate(d.getDate() - 1); // Yesterday!
        var startdatetime = monent(d).format('YYYYMMDDHHmmss')

        HealthCheck.Brocade(ReportOutputPath,startdatetime,function(result) {
            //console.log(outputfile);
            res.json(200,result);
=======
        HealthCheck.Brocade(ReportOutputPath,startdate,function(result) {
            var retData = { filename: result }
            res.json(200,retData);
>>>>>>> bf9c9db4ff96644cd6f4fcf3b0eda24e4ad8bbcc
        })

    });

    app.get('/healthcheck/vnx', function (req, res) {
        var startdate = req.query.begindate;
        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;
        HealthCheck.VNX(ReportOutputPath,startdate,function(result) {
            var retData = { filename: result }
            res.json(200,retData);
        })

    });
    
    app.get('/healthcheck/unity', function (req, res) {
        var startdate = req.query.begindate;
        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;
        HealthCheck.Unity(ReportOutputPath,startdate,function(result) {
            var retData = { filename: result }
            res.json(200,retData);
        })

    });

};

module.exports = healthcheckController;
