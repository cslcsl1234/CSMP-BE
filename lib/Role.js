"use strict";

var async = require('async');
var mongoose = require('mongoose');
var configger = require('../config/configger');
var RoleObj = mongoose.model('Role');

var UserObj = mongoose.model('User');
var RoleObj = mongoose.model('Role');
var App = require('./App');



module.exports = {
    GetRoleListByUser,
    GetMenuListByRole
}


function GetRoleListByUser(UserName, callback) {
    UserObj.findOne({ username: UserName }).lean().exec(function (err, doc) {
        //system error.
        console.log("11:" + UserName);
        if (err) {
            callback(500, err);
        }
        if (!doc) {
            callback(500, { status: "The user is not exists!" });
        }
        else {
            var rolelist = doc.roleList;
            var allMenuList = [];
            async.forEach(rolelist, function (item, callback) {

                GetMenuListByRole(item, function (retcode, menulist) {

                    if (retcode == 500) {
                        callback(200, allMenuList);
                        return;
                    }
                    if (allMenuList.length == 0) {
                        allMenuList = allMenuList.concat(menulist);
                        console.log(allMenuList);
                    } else {
                        menulist.forEach(function (menuitem) {
                            if (allMenuList.indexOf(menuitem) === -1)
                                allMenuList.push(menuitem);
                        })
                    }
                    callback();
                })
            }, function (err) {
                callback(200, allMenuList);
            });

        }

    });
}



function GetMenuListByRole(RoleName, callback) {
    RoleObj.findOne({ roleName: RoleName }, function (err, doc) {
        //system error.
        if (err) {
            callback(500, err);
        }
        if (!doc) {
            callback(500, { status: "The Role is not exists!" });
        }
        else {
            var menulist = doc.menuList;
            var config = configger.load();

            var newMenulist = [];
            for (var i in menulist) {
                var item = menulist[i];
                if (((config.FunctionConfigure.automation == false) & (item.indexOf('Automation') >= 0)) ||
                    ((config.FunctionConfigure.demo == false) & (item.indexOf('测试功能') >= 0)) ||
                    ((config.FunctionConfigure.report == false) & (item.indexOf('report') >= 0))
                ) {
                    console.log("function is disable");
                }
                else {
                    newMenulist.push(item);
                }
            }
            menulist = newMenulist;
            callback(200, menulist);
        } 

    });
}

