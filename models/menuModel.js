"use strict";

/**
 * Define  menuSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , menuSchema 
    , roleSchema
    , DEFAULT_EXPIRE_TIME='1h';// 1 hour.
/**
 * menuSchema.
 * @type {Schema}
 */
menuSchema = new Schema({
    menuId: {
        type: String,
        required: true,
        unique: true
    },
    parentMenuId: {
        type: String,
        required: true 
    },
    title: {
        type: String,
        required: true
    },
    level: {
        type: Number,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        required: true
    },
    stateRef: { 
        type: String, 
        required: true
    }
});

roleSchema = new Schema({
    roleName: {
        type: String,
        required: true,
        unique: true
    },
    menuList: Array
});

var  User = mongoose.model('User') 
menuSchema.pre('save', function (next) {
    var user = this;
    if (!user.isModified) {
        return next();
    }
    //todo encrypt password here.
    return next();
});

menuSchema.methods = {
    comparePassword: function (candidatePassword) {
        var user = this;
        //todo should compare encrypted password only
        return  user.password === candidatePassword
    }
};

/**
 * User static method.
 * @type {{login: Function}}
 */
menuSchema.statics = {

    /**
     * Login function, upon succeeded, the id logged user will be returned for future process.
     *
     * @param user {Object}, containing username & password.
     * @param done {Function(err,userId,message)}, callback function, if login succeeded, userId will be returned,
     *        otherwise userId will be none,with a message provided as the error message. Any system err, will be
     *        passed in first parameter err.
     * @returns {*}
     */
    login: function (user, done) {
        if (!(user && user.username && user.password)) {
            return done(null, null, 'username & password are required');
        }

        this.findOne({username: user.username}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            } 
            //user doesn't exit.
            if (!doc) {
                return  done(null, null, "user doesn't exit!");
            }
            //password correct.
            if (doc.comparePassword(user.password)) {
                done(null, doc.id, doc);
            } else {
                done(null, null, "password incorrect!");
            }
        });
    } ,

    add: function (user, done) {
        if (!(user && user.username && user.password)) {
            return done(null, null, 'username & password are required');
        }
        var User = this;
	var userobj = new User({username: user.username, password: user.password, email: user.email, role: user.role});
        this.findOne({username: user.username}, function (err, doc) {
            //system error.
            if (err) {
                return   done(err);
            }
            if (!doc) { //user doesn't exist.
		userobj.save();
            } else {   // find the user is exist;
                return  done(null, null, "user has exist!");
	    }
	    
        });
    }

};



//create and set two models into mongoose instance, they can be fetched anywhere mongoose object is presented.
mongoose.model('Menu', menuSchema); 
mongoose.model('Role', roleSchema); 
