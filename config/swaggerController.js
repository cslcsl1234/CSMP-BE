"use strict";
  
const debug = require('debug')('swaggerController')  
 

var swaggerController = function (app) {

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

 

 
    var swaggerJSDoc = require('swagger-jsdoc');

    // swagger definition
    var swaggerDefinition = {
        info: {
            title: 'CSMP API',
            version: '1.0.0',
            description: 'RESTful API for Storage Management Platform',
        },
        host: 'csmpserver:8080',
        basePath: '/',
        securityDefinitions: {
            Bearer: {
                type: 'apiKey',
                name: 'Authorization',
                in: 'header'
            }
        }
    };

    // options for the swagger docs
    var options = {
        // import swaggerDefinitions
        swaggerDefinition: swaggerDefinition,
        // path to the API docs
        apis: ['./controllers/*.js','./models/*.js','./config/*.js'],
    };

    // initialize swagger-jsdoc
    var swaggerSpec = swaggerJSDoc(options);

    app.get('/swagger.json', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
 

};

module.exports = swaggerController;
