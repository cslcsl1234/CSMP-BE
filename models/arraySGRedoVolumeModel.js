"use strict";

/**
 * Define  userSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , ArraySGRedoVolumeSchema  
    ;
/**
 * userSchema.
 * @type {Schema}
 */

 
/**
 * @swagger
 * definitions:
 *   ApplicationInfoItem:
 *     properties:
 *       appname:
 *         type: string 
 *         example: 金融IC卡系统（EBIC）
 *         description: 应用系统名称
 *       device:
 *         type: string
 *         example: DC1-VMAX1
 *         description: 关联存储名称
 *       devicesn:
 *         type: string
 *         example: 000292600886
 *         description: 关联存储序列号
 *       sgname:        
 *         type: string
 *         example: EBIC_P7509P1_SG
 *         description: 关联存储SG
 *       redovol:
 *         type: array
 *         example: ["vol1","vol2"]
 *         description: Redo卷  
 */


ArraySGRedoVolumeSchema = new Schema({ 
        appname: {
            type: String,
            required: true
        },
        device: {
            type: String,
            required: true
        },  
        devicesn: {
            type: String,
            required: true
        },  
        sgname: {
            type: String,
            required: true 
        },
        redovol: {
            type: Array 
        }
});

ArraySGRedoVolumeSchema.pre('save', function (next) {
    var array = this;
    if (!array.isModified) {
        return next();
    }
    //todo encrypt password here.
    return next();
});

ArraySGRedoVolumeSchema.methods = {
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
ArraySGRedoVolumeSchema.statics = {

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
mongoose.model('ArraySGRedoVolume', ArraySGRedoVolumeSchema); 
