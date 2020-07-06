"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('arrayController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');   
const ISILON = require('../lib/Array_Isilon')



var fileArrayController = function (app) {

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



   app.get('/api/filearrays', function (req, res) { 
        var device = req.query.device;
        var datacenter = req.query.datacenter;

		ISILON.GetArrays(device, function(ret) {
            var result = [];

            for ( var i in ret ) {
                var item = ret[i]; 
                item["NASFSCapacity"] = (item.NASFSCapacity/1024).toFixed(2);
            }

            if ( datacenter !== undefined ) {
                for ( var i in ret ) {
                    var item = ret[i];
                    if ( item.datacenter == datacenter ) {
                        result.push(item);
                    }
                }
            } else 
                result = ret;
		    res.json(200,result);
		}) 
    });

  



};

module.exports = fileArrayController;
