"use strict";

/**
 * Define  userSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , IOLimitEventSchema  
    ; 
 
/**
 * userSchema.
 * @type {Schema}
 */


IOLimitEventSchema = new Schema({
  
        id: {
            type: String ,
            required: true ,
            unique: true 
        }, 
	// --- the name of host, it should be unique in the whole enterprices.
        array: {
            type: String 
        }, 
        arrayname: {
            type: String 
        }, 
        sgname: {
            type: String
        }, 
        iolimit: { 
            type: String
        },
        appname:{
            type: String
        }, 
        timestamp:{
            type: String
        },
        HostIOLimitExceededPercent:{
            type: Number
        },
        acknowlaged:{
            type: Boolean
        },
        commons:{
            type: String
        }

 

});

IOLimitEventSchema.pre('save', function (next,done) {
    var self = this; 
    mongoose.models["IOLimitEvent"].findOne({id : self.id},function(err, user) { 
        if(err) {
            done(err);
        } else if(user) {
            self.invalidate("username", "username must be unique");
            done(400,self.id);
        } else {
            next();
        }
    });
    
}); 

mongoose.model('IOLimitEvent', IOLimitEventSchema); 

