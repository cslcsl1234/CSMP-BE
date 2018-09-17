"use strict";

/**
 * Define  userSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , eventSchema  
    ;
/**
 * userSchema.
 * @type {Schema}
 */
 

eventSchema = new Schema({
 

	// --- the name of host, it should be unique in the whole enterprices.
        id: {
            type: String,
            required: true,
            unique: true
        },
	// --- the type of host, the vaild values is : Physical, Virtual, etc.
        eventdisplayname: {
            type: String 
        },
	// --- the catalog of host, like by business or department etc.
        severity: {
            type: Number
        },
	// --- the current status of host, the vaild values is : Prod, Test
        customerSeverity: { 
            type: Number
        },
        state:{
            type: String
        },
	// -- the management ip address of host
        ProcessMethod:{
            type: String
        },
        eventCatalog : {
            type: String
        },
        timestamp: {
            type: String
        },
        eventDescription: {
            type: String
        },
        acknowlaged: {
            type: Boolean
        },
        detailinfo: {
            type: String
        }

});

eventSchema.pre('save', function (next) {
    var host = this;
    if (! host.isModified) {
        return next();
    }
    //todo encrypt password here.
    return next();
});

mongoose.model('Event', eventSchema); 

