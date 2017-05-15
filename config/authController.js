"use strict";

var mongoose = require('mongoose')
    , User = mongoose.model('User')
    , Role = mongoose.model('Role')
    , Auth = mongoose.model('Auth');

const debug = require('debug')('authController')  
const name = 'my-app'  

var authController = function (app) {

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

    /**
     * validate the authKey when an API is requested, by default only '/api/login' doesn't require authorized access.
     */
    app.all('/api/*', function (req, res, next) {


        //if it's login/logout API, let it go.
        if (req.method === 'POST' && req.url.indexOf('/api/log') === 0) {
            return next();
        }
        var authKey = req.header('Authorization');

        //if request without authKey
        if (!authKey) {
            res.json(403, {message: 'please provide your authKey.'});
        }
        //get this user by autKey.
        Auth.getLoggedUser(authKey, function (err, user) {
            if (err) {
                return res.json(500, err);
            }
            if (!user) {
                res.json(403, {message: 'Your authKey is invalid.'});

            } else {
                req.user = user;
                return next();
            }
        })
    });

    /**
     * this function is aim to valid the api starts with '/api/admin/' should be accessed by the user whose role is admin.
     */
    app.all('/api/admin/*', function (req, res, next) {
        if (req.user && req.user.role === 'admin') {
            return next();
        }
        //remind the role is incorrect.
        return  res.json(403, {message: 'only admin role can access this api.'});
    });

    /**
     * if authKey for this user has been in the database, delete it first.
     *
     * @param res {object} Express Http response.
     * @param userId {ObjectId} the id of logging user.
     */
    var getAuthKey = function (res, user) {

        var userId = user.id;
        //only if there is no authKey, add one.
        var addAuthKey = function (res, userId) { 
            Auth.addAuthKey(userId, function (err, authKey) {
                if (err) {
                    return res.json(500, err);
                }
                return res.json(200, {authKey: authKey, user: user });

            });
        };


        /**s
         * try to find if the authKey for this user exits.
         */
        Auth.find({user: userId})
            .exec(function (err, auths) {
                if (err) return res.json(500, err);
                //if the authkey for this user already exists, remove it.
                if (auths.length > 0) {
                    auths.forEach(function (auth) {
                        auth.remove();
                    })
                }
                addAuthKey(res, userId);
            });

    };

    /**
     * login
     * @curl -i -H "Accept: application/json" -X POST -d "username=yan&password=secret"
     *      http://localhost:8080/api/login
     * @return authKey, each time when this user accesses other APIs of the site, this authKey should be provided.
     */
    app.post('/api/login', function (req, res) {
        var user = {
            username: req.body.username,
            password: req.body.password
        };


        debug(req.body);
        debug("username = %s, password = %s", req.body.username, req.body.password);

        User.login(user, function (err, userid, msg) {

            debug(msg);
            if (err) {
                res.json(500, err);
            }
            if (!userid) {
                res.json(400, {message: msg});
            } else { 
                getAuthKey(res, msg);
            }
        });
    });

/*
*  Create and Update a user
*/
    app.post('/api/user/add', function (req, res) {
 
      var user = req.body;
      User.findOne({username: user.username}, function (err, doc) {
          //system error.
          if (err) {
            return   done(err);
          }
          if (!doc) { //user doesn't exist.
            console.log("user is not exist.");
            var newuser =  new User(user); 
            newuser.save(function(err, thor) {
              if (err) return console.error(err);
              console.dir(thor);
            });
            return res.json(200, newuser);
          }
          else {
          console.log("user is exist!");
              doc.update(user, function(error, course) {
                  if(error) return next(error);
              });

            return  res.json(200 , {status: "The user has updated!"});
          }

      });



    });
 

/*
*  Delete a user
*/
    app.post('/api/user/del', function (req, res) {
 

        var user = req.body;
        if ( user._id === undefined ) {
          return  res.json(500 , {status: "Must specified the user ID !"});
        }
        console.log(conditions);
        var conditions = {_id: user._id};

        console.log(conditions);
        User.remove(conditions, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            else {
                console.log("the user is remove !"); 
                return  res.json(200 , {status: "The user has removed!"});
            }

        });


	});



/*
*  Get a user list
*/
    app.get('/api/user/list', function (req, res) {

        var query = User.find({}).select({ "__v": 0});
        query.exec(function (err, doc) {
            //system error.
            if (err) { 
                res.json(600 , {status: err})
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
*  modify a user password
*/
    app.post('/api/user/modifyPasswd', function (req, res) {
 
      var user = req.body;
      if ( user._id === undefined ) {
        return  res.json(500 , {status: "Must specified the user ID !"});
      }      
      User.findOne({_id: user._id}, function (err, doc) {
          //system error.
          if (err) {
            return   done(err);
          }
          if (!doc) { //user doesn't exist.
            return res.json(500, {status: "The user is not exists!"});
          }
          else { 
              doc.update(user, function(error, course) {
                  if(error) return next(error);
              });

            return  res.json(200 , {status: "The user password has updated!"});
          }

      });



    });
 

    /**
     * logoff function.
     */
    app.post('/api/logout', function (req, res) {
        var authKey = req.header('authKey');
        Auth.remove({authKey: authKey}, function (err) {
           if (err) {
                res.json(500, err);
            } else {
                return res.json(200, {status: 'successfully logout'});
            }
        }); //end Auth.remove()
    });



/*
*  Create and Update a Role
*/
    app.post('/api/role/add', function (req, res) {
 
      var role = req.body;
      Role.findOne({roleName: role.roleName}, function (err, doc) {
          //system error.
          if (err) {
            return   done(err);
          }
          if (!doc) { //role doesn't exist.
            console.log("role is not exist.");
            var newrole =  new Role(role); 
            newrole.save(function(err, thor) {
              if (err) return console.error(err);
              console.dir(thor);
            });
            return res.json(200, newrole);
          }
          else {
              console.log("role is exist!");
              doc.update(role, function(error, course) {
                  if(error) return next(error);
              });

            return  res.json(200 , {status: "The role has updated!"});
          }

      });



    });




/*
*  Get a user list
*/
    app.get('/api/role/list', function (req, res) {

        var query = Role.find({}).select({ "__v": 0, "menuList": 0 });
        query.exec(function (err, doc) {
            //system error.
            if (err) { 
                res.json(600 , {status: err})
            }
            if (!doc) { //user doesn't exist.
                res.json(500 , []); 
            }
            else {
 
                res.json(200 , doc);
            }

        });
    });








};

module.exports = authController;
