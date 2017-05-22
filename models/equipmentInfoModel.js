"use strict";

/**
 * Define  userSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , equipmentInfoSchema 
    , DEVICE_LEVEL = 'high,middle,low'.split(',')
    , EQUIPMENT_TYPE = 'Array Block,Array File,Array Unity,Array Object,Array ServerSAN,Switch Core,Switch Edge'.split(',')
    ;
/**
 * userSchema.
 * @type {Schema}
 */

equipmentInfoSchema = new Schema({
    basicInfo : {

        device: {
            type: String,
            required: true,
            unique: true
        },
        alias: {
            type: String,
            required: true 
        },
        UnitID: {
            type: String 
        },
        area: { 
            type: String  
        },
        deviceLevel :{
            type: String,
            required: true,
            enum: DEVICE_LEVEL
        },
        equipmentType: {
            type: String,
            required: true,
            enum: EQUIPMENT_TYPE
        }

    }, 
    maintenance :{
        vendor: {
            type: String
        },
        contact: {
            type: String
        },
        pubchaseDate: {
            type: String
        },
        period: {
            type: String
        }
    },
    assets : {
        no: {
            type: String
        },
        purpose: {
            type: String
        },
        department: {
            type: String
        },
        manager: {
            type: String
        }
    }, 
    ability : {
        maxMemory : {
            type: String
        },
        maxDisks : {
            type: String
        },
        maxFEs : {
            type: String
        },
        maxCabinets : {
            type: String
        }

    }


});

equipmentInfoSchema.pre('save', function (next) {
    var array = this;
    if (!array.isModified) {
        return next();
    }
    //todo encrypt password here.
    return next();
});

equipmentInfoSchema.methods = {
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
equipmentInfoSchema.statics = {

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
mongoose.model('EquipmentInfo', equipmentInfoSchema); 
