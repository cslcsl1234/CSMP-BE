"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('topologyController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');  
    

var App = require('../lib/App'); 
var topos = require('../lib/topos.js');
 
 

var topologyController = function (app) {

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



   app.get('/api/topology/level1', function (req, res) {  

		topos.getEntitys(function(entitys) {

            topos.getLinks(function(links)  {

                var finalResult = {};
                finalResult["entity"] = entitys;
                finalResult["link"] = links; 
                var links_level1 = topos.combineLinks_level1(finalResult);
                finalResult["linkByGroup"] = links_level1; 

                // add relationship object in each entities.
                var relaResult = {} ;
                for ( var i in links ) {
                    var item = links[i];
                    var from = item.from;
                    var to = item.to;  
                    if ( relaResult[from] === undefined ) {
                        var relas = [];
                        relas.push(to);
                        relaResult[from] = relas;
                    } else {
                        relaResult[from].push(to);
                    }

                    if ( relaResult[to] === undefined ) {
                        var relas = [];
                        relas.push(from);
                        relaResult[to] = relas;
                    } else {
                        relaResult[to].push(from);
                    }

                }
                
                for ( var j in entitys ) {
                    var item = entitys[j];
                    var key = item.key;
                    item["relationship"] = relaResult[key];
                }

                res.json(200,finalResult);

            })

		})
 
    });

 







};

module.exports = topologyController;
