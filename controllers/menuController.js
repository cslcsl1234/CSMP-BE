"use strict";

/**
 * This controller is to demo the common APIs a project provides.
 * In spite of there are various level authorizations, the auth-controlled logic is not mixed with any auth code.
 * This is AOP.
 * @param app
 */
const debug = require('debug')('menuController')  
const name = 'my-app'  
var unirest = require('unirest');
var configger = require('../config/configger');
var unirest1 = require('unirest');  
var mongoose = require('mongoose');
var MenuObj = mongoose.model('Menu');

var FunctionDefine_Array = require("../config/FunctionDefine_Array");

 
var menuController = function (app) {

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



    app.get('/api/menu/list', function (req, res) {

        var query = MenuObj.find({}).select({ "__v": 0, "_id": 0});
        query.exec(function (err, doc) {
            //system error.
            if (err) { 
                res.json(500 , {status: err})
            }
            if (!doc) { //user doesn't exist.
                res.json(500 , []); 
            }
            else {
 
                res.json(200 , doc);
            }

        });

    });


/* 
*  Create a menu record 
*/
    app.post('/api/menu/add', function (req, res) {
        console.log(req.body);

        var menu = req.body;

        MenuObj.findOne({"menuId" : menu.menuId}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
                console.log("menu item is not exist. insert it."); 

                var newmenu = new MenuObj(menu); 
                newmenu.save(function(err, thor) { 
                 if (err)  {
                    console.dir(thor);
                    return res.json(400 , err);
                  } else 
                    return res.json(200, {status: "The menu has inserted."});
                });
            }
            else {
                console.log("the menu is exist!");
 

                doc.update(menu, function(error, course) {
                    if(error) return next(error);
                });


                return  res.json(200 , {status: "The menu has exist! Update it."});
            }

        });



    });



/* 
*  Delete a menu record 
*/
    app.post('/api/menu/del', function (req, res) {
        console.log(req.body);

        var menu = req.body;
        var conditions = {menuId: menu.menuId};
        MenuObj.remove(conditions, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            else {
                console.log("the menu is remove !"); 
                return  res.json(200 , {status: "The menu has removed!"});
            }

        });



    });





    app.get('/api/menu/ObjectManage/Array', function (req, res) {

        var arraytype = req.query.arraytype;
        if ( arraytype === undefined ) {
            res.json(400,"Must assign a arraytype paramater! ");
            return;
        }

        switch ( arraytype.toUpperCase() ) {
            case "VMAX" :
            case "VMAX1" :
                res.json(200,FunctionDefine_Array);
                break;

            default :
                res.json(200,"default arraytype");
        }
        

    });




};

module.exports = menuController;
