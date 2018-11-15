"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('automationController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
var async = require('async'); 

var automationController = function (app) {

    var config = configger.load();

    app.all('*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
        res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
        res.header('Access-Control-Expose-Headers', '*');

        debug('req.method = %s', req.method);     
        debug('req.url = %s', req.url); 

        if(req.method=="OPTIONS") res.send(200);  /*让options请求快速返回*/
        else  next();
    });

 
    app.get('/api/auto/resource/purposes', function (req, res) {

        var purposes = [{"purpose":"OCR-5GB"},{"purpose":"DS"},{"purpose":"OCR-1GB"},{"purpose":"REDOLOG-10GB"},{"purpose":"ARCHIVE-100GB"},{"purpose":"DATAFILE-200GB"},{"purpose":"500GB"},{"purpose":"1000GB"},{"purpose":"2000GB"},{"purpose":"SOFTWARE-50GB"},{"purpose":"4000GB"},{"purpose":"8000GB"}];

        res.json(200 , purposes);


    });

    app.get('/api/auto/resource/pools', function (req, res) {

        var pools = [
                {
                    "resourcePoolName":"silver",
                    "color":"5FBC47",
                    "totalSize":1098.46,
                    "sizeUnit":"GB",
                    "freeSize":833.22,
                    "freeUnit":"GB",
                    "percent":24.15,
                    "threshold":98596.16,
                    "maxAllocSize":106401.71
                },
                {
                    "resourcePoolName":"gold",
                    "color":"FFC657",
                    "totalSize":846.16,
                    "sizeUnit":"GB",
                    "freeSize":588.33,
                    "freeUnit":"GB",
                    "percent":30.47,
                    "threshold":75896.57,
                    "maxAllocSize":64118.56
                },
                {
                    "resourcePoolName":"Plat",
                    "color":"7E6EB0",
                    "totalSize":42.99,
                    "sizeUnit":"GB",
                    "freeSize":40.44,
                    "freeUnit":"GB",
                    "percent":5.93,
                    "threshold":3866.55,
                    "maxAllocSize":4342.12
                },
                {
                    "resourcePoolName":"Clone",
                    "color":"E04141",
                    "totalSize":996.65,
                    "sizeUnit":"GB",
                    "freeSize":990.66,
                    "freeUnit":"GB",
                    "percent":0.6,
                    "threshold":89692.51,
                    "maxAllocSize":105211.31
                }
            ];
         
        console.log(pools);
        res.json(200 , pools);


    });




};

module.exports = automationController;
