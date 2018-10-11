"use strict";

/**
 * Define  userSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , taskMonitorSchema  
    ; 
 
/**
 * userSchema.
 * @type {Schema}
 */


taskMonitorSchema = new Schema({
  
	// --- the name of host, it should be unique in the whole enterprices.
    sourcetype: {
            type: String 
        }, 
        timestamp: {
            type: String 
        }, 
        jobName: {
            type: String
        }, 
        jobDesc: { 
            type: String
        },
        dbname:{
            type: String
        }, 
        filename :{
            type: String
        },
        status:{
            type: Boolean
        },
        isExist: {
            type: Boolean
        }

});

taskMonitorSchema.pre('save', function (next,done) {
    var self = this; 
    mongoose.models["taskmonitor"].findOne({id : self.id},function(err, user) { 
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

mongoose.model('taskmonitor', taskMonitorSchema); 

