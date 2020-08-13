"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
var DEMOS = require('../demodata/demos');
var DEMOS_TEMPLATE = require('../config/FunctionDefine_DEMOS');

var DEMOS_TEMPLATE1 = require('../demodata/demo_template1');
var DEMOS_TEMPLATE2 = require('../demodata/demo_template2');
var DEMOS_TEMPLATE3 = require('../demodata/demo_template3');
var DEMOS_TEMPLATE4 = require('../demodata/demo_template4');
var DEMOS_TEMPLATE5 = require('../demodata/demo_template5');
var DEMOS_TEMPLATE6 = require('../demodata/demo_template6');
var DEMOS_TEMPLATE7 = require('../demodata/demo_template7');
var DEMOS_TEMPLATE7_DETAIL = require('../demodata/demo_template7_detail');
var DEMOS_TEMPLATE8 = require('../demodata/demo_template8');
var DEMOS_TEMPLATE8_DETAIL = require('../demodata/demo_template8_detail');
var DEMOS_TEMPLATE9 = require('../demodata/demo_template9');
var DEMOS_TEMPLATE10 = require('../demodata/demo_template10');
var DEMOS_TEMPLATE10_DETAIL = require('../demodata/demo_template10_detail');


var demoController = function (app) {
    /**
     * This is to demo an API requires a user logged before accessing.
     */
    app.get('/api/time', function (req, res) {
        res.json(200, {'message': 'This is time page API!', 'user': req.user});
    });
    /**
     * mimic a admin level api.
     */
    app.get('/api/admin/time', function (req, res) {
        res.json(200, {'message': 'This is Admin time API!'});
    });

    app.get('/api/demos', function (req, res) {
        res.json(200, DEMOS);
    });

    app.get('/api/demos/host', function (req, res) {

        res.json(200, DEMOS);
    });

    app.get('/api/demos/template1', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template1 : ' + param);
        res.json(200, DEMOS_TEMPLATE1);
    });

    app.get('/api/demos/template2', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template2 : ' + param);

        res.json(200, DEMOS_TEMPLATE2);
    });

    app.get('/api/demos/template3', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template3 : ' + param);

        res.json(200, DEMOS_TEMPLATE3);
    });


    app.get('/api/demos/template4', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template4 : ' + param);

        res.json(200, DEMOS_TEMPLATE4);
    });


    app.get('/api/demos/template5', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template5 : ' + param);

        res.json(200, DEMOS_TEMPLATE5);
    });


    app.get('/api/demos/template6', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template6 : ' + param);

        res.json(200, DEMOS_TEMPLATE6);
    });



    app.get('/api/demos/template7', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template7 : ' + param);

        res.json(200, DEMOS_TEMPLATE7);
    });

    app.get('/api/demos/template7_detail', function (req, res) {
        var param1 = req.query.number;
        var param2 = req.query.type;
        
        logger.info('API: template7_detail : ' + param1 + ";" + param2);

        res.json(200, DEMOS_TEMPLATE7_DETAIL);
    });




    app.get('/api/demos/template8', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template8 : ' + param);

        res.json(200, DEMOS_TEMPLATE8);
    });

    app.get('/api/demos/template8_detail', function (req, res) {
        var param = req.query.device;
        logger.info('API: template8_detail : ' + param);

        res.json(200, DEMOS_TEMPLATE8_DETAIL);
    });







    app.get('/api/demos/template9', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template9 : ' + param);

        res.json(200, DEMOS_TEMPLATE9);
    });


    app.get('/api/demos/template10', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template10 : ' + param);

        res.json(200, DEMOS_TEMPLATE10);
    });


    app.get('/api/demos/template10_detail', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template10_detail : ' + param);

        res.json(200, DEMOS_TEMPLATE10_DETAIL);
    });

    app.get('/api/demos/template11', function (req, res) {
        var param = req.query.host_name_param;
        logger.info('API: template11 : ' + param);

        res.json(200, DEMOS_TEMPLATE10);
    });



};

module.exports = demoController;