"use strict";

/**
 * Define  menuSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , UnitSchema 
    , FloorSchema
    , BuildingSchema
    , DatacenterSchema
    , DEFAULT_EXPIRE_TIME='1h';// 1 hour.

require('../models/userModel')

UnitSchema = new Schema({
    UnitID: {
        type: String,
        required: true
    },
    Name: {
        type: String,
        required: true 
    },    
    Description: {
        type: String 
    },
    MaxPowerLoad: {
        type: Number ,
        default : 0
    },
    MaxCabinet: {
        type: Number,
        default : 0
    }
});

FloorSchema = new Schema({ 
    Name: {
        type: String,
        required: true 
    },    
    Description: {
        type: String 
    },
    Unit: [ UnitSchema ]
});

BuildingSchema = new Schema({ 
    Name: {
        type: String,
        required: true 
    },    
    Description: {
        type: String 
    },
    Floor: [ FloorSchema ]
});

DatacenterSchema = new Schema({ 
    Name: {
        type: String,
        required: true,
        unique: true 
    },    
    Description: {
        type: String 
    },
    Type: {
        type: String 
    },
    City: {
        type: String 
    },
    Address: {
        type: String 
    },
    isDefault : {
        type : Boolean
    },
    Building: [ BuildingSchema ]
});


 

var  User = mongoose.model('User') 
DatacenterSchema.pre('save', function (next) {
    var user = this;
    if (!user.isModified) {
        return next();
    }
    //todo encrypt password here.
    return next();
});

DatacenterSchema.methods = {
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
DatacenterSchema.statics = {

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
mongoose.model('Datacenter', DatacenterSchema);  
