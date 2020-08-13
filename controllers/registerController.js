"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('registerController')  
const name = 'register'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');
 
var util = require('../lib/util');
var bodyParser = require('body-parser');

var registerController = function (app) {

    var config = configger.load();

    app.all('*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
        res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
        res.header('Access-Control-Expose-Headers', '*');

        app.use(bodyParser.json()); // support json encoded bodies
        app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies



        debug('req.method = %s', req.method);     
        debug('req.url = %s', req.url); 

        if(req.method=="OPTIONS") res.send(200);  /*让options请求快速返回*/
        else  next();
    });


    /**
     * This is to demo an API requires a user logged before accessing.
     */
    app.post('/api/register/array', function (req, res) {
 
        var user_id = req.body.id;
        var token = req.body.token;
        var geo = req.body.geo;

        res.send(user_id + ' ' + token + ' ' + geo);
        
        if ( typeof arraysn === 'undefined' ) {
            var fields = 'serialnb,sstype,device,model,vendor,devdesc,name';
            var filter = 'datatype=\'Block\'&(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\')';

        } else {
            var fields = 'serialnb,arraytyp,model,name';
            var filter = 'serialnb=\''+arraysn+'\'&devtype=\'Array\'&(name=\'TotalDisk\'|name=\'TotalMemory\'|name=\'RawCapacity\'|name=\'TotalLun\'|name=\'ConfiguredRawCapacity\'|name=\'UnconfiguredCapacity\'|name=\'HotSpareCapacity\'|name=\'UnusableCapacity\')';

        }
  
        var queryString =  util.CombineQueryString(filter,fields);

        logger.info(filter);
        logger.info(queryString);

        unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({'Content-Type': 'multipart/form-data'}) 
                .query(queryString) 
                .end(function (response) { 
                    if ( response.error ) {
                        logger.error(response.error);
                        res.json(response.error);
                    } else {
                        logger.info(response.raw_body);
                        var resultFinal = RecordFlat(response.raw_body, 'serialnb'); 
                        res.json(200, resultFinal);

                    }

                 

                });

         
    });

  
     app.get('/api/disks', function (req, res) {
 
        var arraysn = req.query.arraysn;
        var disksn = req.query.disksn;

        if ( typeof arraysn !== 'undefined' && typeof disksn !== 'undefined' ) {
            var filter = 'device=\''+arraysn+'\'&partsn=\''+disksn+'\'&parttype=\'Disk\'&(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'Availability\')';
        } else if (typeof arraysn !== 'undefined') {
            var filter = 'device=\''+arraysn+'\'&parttype=\'Disk\'&(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'Availability\')';
 
        } else {
            var filter = 'parttype=\'Disk\'&(name=\'Capacity\'|name=\'FreeCapacity\'|name=\'Availability\')';
 
        } 

        var fields = 'device,part,disktype,partmode,sgname,diskrpm,director,partvend,partmdl,partver,partsn,disksize,name';
 
        var queryString =  util.CombineQueryString(filter,fields);
 
        unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({'Content-Type': 'multipart/form-data'}) 
                .query(queryString) 
                .end(function (response) { 
                    if ( response.error ) {
                        logger.error(response.error);
                        res.json(response.error);
                    } else {
                        //logger.info(response.raw_body);
                        var resultFinal = RecordFlat(response.raw_body, 'device','part'); 
                        res.json(200, resultFinal);

                    }

                 

                });

         
    });




    app.get('/api/luns', function ( req, res )  {

        var arraysn = req.query.arraysn;
        var lunid = req.query.lunid;

        var basefilter = '(parttype=\'MetaMember\'|parttype=\'LUN\')&(name=\'UsedCapacity\'|name=\'Capacity\'|name=\'ConsumedCapacity\'|name=\'Availability\'|name=\'PoolUsedCapacity\')';


        if ( typeof arraysn !== 'undefined' && typeof lunid !== 'undefined' ) {
            var filter = 'device=\''+arraysn+'\'&part=\''+lunid+'\'&'+basefilter;
            logger.info(filter);
        } else if (typeof arraysn !== 'undefined') {
             var filter = 'device=\''+arraysn+'\'&'+basefilter;
 
        } else {
            var filter = basefilter;
 
        } 

        //var fields = 'serialnb,part,dgraid,poolname,purpose,config,name';
        var fields = 'serialnb,part,alias,parttype,config,poolemul,purpose,dgstype,poolname,name';
        var queryString =  util.CombineQueryString(filter,fields);
 

        var result;
        unirest1.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({'Content-Type': 'multipart/form-data'}) 
                .query(queryString) 
                .end(function (response) { 
                    if ( response.error ) {
                        logger.error(response.error);
                        return response.error;
                    } else {
                        result = response.raw_body;
                        var aa = RecordFlat(result, 'serialnb','part');
                        res.json(200, aa);
                    }

           
 
                });
            } ) ;
 
 



    app.get('/api/pools', function ( req, res )  {

        var arraysn = req.query.arraysn;
        var poolid = req.query.poolid;


        var basefilter = 'parttype=\'Storage Pool\'&(name=\'UsedCapacity\'|name=\'Capacity\')';


        if ( typeof arraysn !== 'undefined' && typeof poolid !== 'undefined' ) {
            var filter = 'device=\''+arraysn+'\'&part=\''+poolid+'\'&'+basefilter;
            logger.info(filter);
        } else if (typeof arraysn !== 'undefined') {
             var filter = 'device=\''+arraysn+'\'&'+basefilter;
 
        } else {
            var filter = basefilter;
 
        } 

        //var fields = 'serialnb,part,dgraid,poolname,purpose,config,name';
        var fields = 'device,part,dgtype,partstat,poolemul,dgraid,raidtype,iscmpenb,disktype,name';
        var queryString =  util.CombineQueryString(filter,fields);
 

        logger.info(filter);
        var result;
        unirest1.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({'Content-Type': 'multipart/form-data'}) 
                .query(queryString) 
                .end(function (response) { 
                    if ( response.error ) {
                        logger.error(response.error);
                        return response.error;
                    } else {
                        result = response.raw_body;
                        var aa = RecordFlat(result, 'device','part');
                        res.json(200, aa);
                    }

           
 
                });
            } ) ;
 

};

module.exports = arrayController;
