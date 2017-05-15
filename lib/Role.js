"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var RoleObj = mongoose.model('Role');

var UserObj = mongoose.model('User');
var RoleObj = mongoose.model('Role');
var App = require('./App'); 



module.exports = { 
    GetRoleListByUser   
}


function GetRoleListByUser(UserName, callback) {   
      UserObj.findOne({username: UserName}, function (err, doc) {
          //system error.
          if (err) {
            callback(500 , err);
          }
          if (!doc) { 
            callback(500, {status: "The user is not exists!"});
          }
          else { 
              var rolelist = doc.roleList;
              for ( var i in rolelist ) {
                var roleitem = rolelist[i];
                GetMenuListByRole(roleitem.roleName, function(retcode, menulist) {
                    if ( retcode == 200 ) {
                        console.log(menulist);
                    }
                });
              }
              callback(200, rolelist); 
          }

      });
}



function GetMenuListByRole(RoleName, callback) {   
      RoleObj.findOne({roleName: RoleName}, function (err, doc) {
          //system error.
          if (err) {
              callback(500 , err);
          }
          if (!doc) { 
              callback(500, {status: "The Role is not exists!"});
          }
          else { 
              var menulist = doc.menuList;
              callback(200, menulist); 
          }

      });
}

