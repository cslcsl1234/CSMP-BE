"use strict";

/**
 * Define  userSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , autoServiceInstanceSchema
    , RequestsItemSchema
    , HostsItemSchema
    , DEVICE_LEVEL = 'high,middle,low'.split(',')
    , ARRAY_TYPE = 'Array Block,Array File,Array Unity,Array Object,Array ServerSAN,Switch Core,Switch Edge'.split(',')
    ;
/**
 * userSchema.
 * @type {Schema}
 */
RequestsItemSchema = new Schema({
    UsedFor: {
        type: String
    },
    ProtectType: {
        type: String
    },
    Storage: {
        type: String
    },
    CapacityGB: {
        type: String
    },
    DeviceWWN: {
        type: String
    },
    Device: {
        type: String
    }
});

HostsItemSchema = new Schema({
    name: {
        type: String
    },
    type: {
        type: String
    },
    wwpn: [ String ]
});


autoServiceInstanceSchema = new Schema({
    ResponseMessage: {
        Code: {
            type: String
        },
        Message: {
            type: String
        },
        Status: {
            type: String
        },
        StatusDatetime: {
            type: String
        }
    },
    "InstanceID": {
        type: String,
        required: true,
        unique: true
    },
    "AppName": {
        type: String
    },
    "AppCode": {
        type: String
    },
    "HA":{
        type: String
    }, 
    "ResourcePoolName": {
        type: String
    },
    Requests: [RequestsItemSchema],
    Hosts : [ HostsItemSchema ]
});

autoServiceInstanceSchema.pre('save', function (next) {
    var array = this;
    if (!array.isModified) {
        return next();
    }
    //todo encrypt password here.
    return next();
});




//create and set two models into mongoose instance, they can be fetched anywhere mongoose object is presented.
mongoose.model('autoServiceInstance', autoServiceInstanceSchema); 
