"use strict";

/**
 * Define  userSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , MgmtObjectInfoSchema  
    ;
/**
 * userSchema.
 * @type {Schema}
 */

 
/**
 * @swagger
 * definitions:
 *   mgmtObjectInfoItem:
 *     properties:
 *       sn:
 *         type: string 
 *         example: 00000156700456
 *         description: 设备序列号(PK)
 *       name:
 *         type: string
 *         example: VMX10-JXQ
 *         description: 自定义设备名称
 *       datacenter:
 *         type: string
 *         example: JXQ
 *         description: 所属数据中心名称
 *       level:        
 *         type: string
 *         example: high|middle|low
 *         description: 设备级别(高端|中端|低端)
 *       type:        
 *         type: string
 *         example: array
 *         description: 设备类型(array|switch|host) 
 */ 

MgmtObjectInfoSchema = new Schema({ 
        sn: {
            type: String,
            required: true
        },
        name: {
            type: String 
        },  
        datacenter: {
            type: String 
        },  
        level: {
            type: String 
        },
        type: {
            type: String,
            required: true 
        },
        createdData : {
            type: String
        },
        updatedDate : {
            type: String
        },
        specialInfo : {
            type: Object
        }
});

MgmtObjectInfoSchema.pre('save', function (next) {
    var array = this;
    if (!array.isModified) {
        return next();
    }
    //todo encrypt password here.
    return next();
});

MgmtObjectInfoSchema.methods = {
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
MgmtObjectInfoSchema.statics = {

 
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
mongoose.model('MgmtObjectInfo', MgmtObjectInfoSchema); 
