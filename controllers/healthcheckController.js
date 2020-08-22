"use strict";
const logger = require("../lib/logger")(__filename);


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
        res.setTimeout(3600 * 1000);
        var startdate = req.query.begindate;
        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;

        var d = new Date(); // Today!
        d.setDate(d.getDate() - 1); // Yesterday!
        var startdatetime = moment(d).format('YYYYMMDDHHmmss')

        startdate = startdate + "000000";
        HealthCheck.VMAX(ReportOutputPath, startdate, function (outputfile) {
            //logger.info(outputfile);
            res.json(200, outputfile);
        })

    });

    app.get('/healthcheck/brocade', function (req, res) {
        res.setTimeout(3600 * 1000);
        var startdate = req.query.begindate;
        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;

        var d = new Date(); // Today!
        d.setDate(d.getDate() - 1); // Yesterday!
        var startdatetime = moment(d).format('YYYYMMDDHHmmss')

        HealthCheck.Brocade(ReportOutputPath, startdate, function (result) {
            //logger.info(outputfile);
            res.json(200, result);
        })

    });

    app.get('/healthcheck/vnx', function (req, res) {
        res.setTimeout(3600 * 1000);
        var startdate = req.query.begindate;
        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;

        var d = new Date(); // Today!
        d.setDate(d.getDate() - 1); // Yesterday!
        var startdatetime = moment(d).format('YYYYMMDDHHmmss')

        HealthCheck.VNX(ReportOutputPath, startdate, function (result) {
            //logger.info(outputfile);
            res.json(200, result);
        })

    });

    app.get('/healthcheck/unity', function (req, res) {
        res.setTimeout(3600 * 1000);

        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;
        
        var d = new Date(); // Today!
        d.setDate(d.getDate() - 1); // Yesterday!
        var startdatetime = moment(d).format('YYYYMMDDHHmmss')

        HealthCheck.Unity(ReportOutputPath, startdatetime, function (result) {
            //logger.info(outputfile);
            res.json(200, result);
        })

    });


    app.get('/healthcheck/vplex', function (req, res) {
        res.setTimeout(3600 * 1000);

        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;
        
        var d = new Date(); // Today!
        d.setDate(d.getDate() - 1); // Yesterday!
        var startdatetime = moment(d).format('YYYYMMDDHHmmss')

        HealthCheck.VPLEX(ReportOutputPath, startdatetime, function (result) {
            //logger.info(outputfile);
            res.json(200, result);
        })

    });


    app.get('/healthcheck/xio', function (req, res) {
        res.setTimeout(3600 * 1000);

        var config = configger.load();
        var ReportOutputPath = config.Reporting.OutputPath;
        
        var startdatetime = req.query.start;
        if ( startdatetime === undefined ) {
            var d = new Date();  
            d.setDate(d.getDate() - 1); // Yesterday!
            startdatetime = moment(d).format('YYYY-MM-DD HH:mm:ss')
        }
        var enddatetime = req.query.end;
        if ( enddatetime === undefined ) {
            var d = new Date(); // Today!
            d.setDate(d.getDate()); 
            enddatetime = moment(d).format('YYYY-MM-DD HH:mm:ss')
        } 

 
        HealthCheck.XtremIO(ReportOutputPath, startdatetime, enddatetime, function (result) {
            //logger.info(outputfile);
            res.json(200, result);
        })

    });


};

module.exports = healthcheckController;
