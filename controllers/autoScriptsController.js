"use strict";


/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('autoScriptsController')
const name = 'my-app'
var unirest = require('unirest');
var configger = require('../config/configger');
var scriptDAO = require('../lib/scriptDao');
var result = require('../lib/result');

var autoScriptsController = function (app) {

    var config = configger.load();

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


    app.get('/scripts/application', function (req, res) {


        App.GetApps(function (code, result) {
            res.json(code, result);

        })


    });

    /* list scripts */
    app.get('/scripts', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        logger.info('list scripts called');
        scriptDAO.list(function (scripts) {
            //logger.info(scripts);
            logger.info("------------");
            res.json(result.createResult(true, scripts));
            //logger.info(res);
        });
    });


    /* get script */
    app.get('/scripts/:id', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        var id = req.params.id;
        logger.info('get script called, id: ' + id);
        scriptDAO.getById(id, function (script) {
            res.json(result.createResult(true, script));
        });
    });


/* delete script */
app.delete('/scripts/:id', function (req, res) {
	res.setHeader("Access-Control-Allow-Origin", "*"); 
    var id = req.params.id;
    logger.info('delete script called, id=' + id);
    scriptDAO.deleteById(id, function (success) {
        res.json(result.createResult(success, null));
    });
});

/* add scripts */
app.post('/scripts', function (req, res) {
	res.setHeader("Access-Control-Allow-Origin", "*"); 
    logger.info('post scripts called');	
    var script = req.body;
    
    logger.info(script); 
    scriptDAO.add(script, function (success,id) {
        var r =  result.createResult(success, id);
        res.json(r);
    });
});

/* update scripts */
app.put('/scripts/:id', function (req, res) {
	res.setHeader("Access-Control-Allow-Origin", "*");
    logger.info('update script called');
    var script = req.body;
    scriptDAO.update(script, function (success,id) {
        var r =  result.createResult(success, id);
        res.json(r);
    });
});
/* patch scripts */
app.patch('/scripts/:id', function (req, res) {
	res.setHeader("Access-Control-Allow-Origin", "*"); 
    logger.info('patch script called');
    scriptDAO.getById(req.params.id, function (script) {
        var name = req.body.name;
        if(name) {
            script.name = name;
        }
         var changeorder = req.body.changeorder;
        if(changeorder) {
            script.changeorder = changeorder;
        }
		 var changedesc = req.body.changedesc;
        if(changedesc) {
            script.changedesc = changedesc;
        }
		 var type = req.body.type;
        if(type) {
            script.type = type;
        }
		 var status = req.body.status;
        if(status) {
            script.status = status;
        }
		 var closetime = req.body.closetime;
        if(closetime) {
            script.closetime = closetime;
        }
        logger.info(script);
        scriptDAO.update(script, function (success) {
            var r =  result.createResult(success, null);
            res.json(r);
        });
    });
});

};

module.exports = autoScriptsController;
