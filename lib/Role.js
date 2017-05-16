"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var RoleObj = mongoose.model('Role');

var UserObj = mongoose.model('User');
var RoleObj = mongoose.model('Role');
var App = require('./App'); 



module.exports = { 
    GetRoleListByUser ,
    GetMenuListByRole
}


function GetRoleListByUser(UserName, callback) {   
      UserObj.findOne({username: UserName}).lean().exec( function (err, doc) {
          //system error.
          console.log("11:" + UserName);
          if (err) {
            callback(500 , err);
          }
          if (!doc) { 
            callback(500, {status: "The user is not exists!"});
          }
          else {  
              var rolelist = doc.roleList;  
              var allMenuList = [];
              async.forEach(rolelist, function (item, callback) { 
 
                  GetMenuListByRole(item, function(retcode, menulist) { 
                      if ( allMenuList.length == 0 ) { 
                        allMenuList = allMenuList.concat(menulist);
                        console.log(allMenuList);
                      } else {
                        menulist.forEach( function (menuitem) {
                            if ( allMenuList.indexOf(menuitem) === -1  ) 
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

 