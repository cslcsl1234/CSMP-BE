"use strict";

/**
 * Define  userSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , appTopologySchema  
    ;
/**
 * userSchema.
 * @type {Schema}
 */
var zonememberSchema = new Schema({
    zmemid : String, 
    zmemtype : String, 
    switch : String, 
    switchportwwn : String, 
    switchportstate : String, 
    switchportConnectedWWN : String, 
    switch_oriname : String, 
    alias : String   
},{ _id : false });

var zoneSchema = new Schema( {
    fabricwwn : String, 
    device : String, 
    zsetname : String, 
    zname : String, 
    zonemembers : [ zonememberSchema ], 
    fabricname : String, 
    marchedCount : Number
},{ _id : false });

var arrayPortSchema = new Schema({
    device : String, 
    feport : String, 
    maxspeed : Number, 
    negspeed : Number, 
    nodewwn : String, 
    portwwn : String, 
    partstat : String, 
    vmaxtype : String, 
    MappingVolCount : Number, 
    ConnectedToPort : String, 
    ConnectedToSwitch : String  
},{ _id : false });


var arrayDeviceSchema = new Schema({
    device : String, 
    part : String, 
    model : String, 
    parttype : String, 
    config : String, 
    poolemul : String, 
    purpose : String, 
    dgstype : String, 
    poolname : String, 
    partsn : String, 
    sgname : String, 
    ismasked : String, 
    vmaxtype : String, 
    disktype : String
},{ _id : false });

var maskingViewSchema = new Schema({
    dirnport : String, 
    Capacity : Number, 
    sn : String, 
    part : String, 
    initgrp : String, 
    portgrp : String, 
    sgname : String, 
    initgrp_member : Array, 
    portgrp_member : [ arrayPortSchema ], 
    sg_member : [ arrayDeviceSchema ] , 
    Devices : String, 
    wwnlist : String
},{ _id : false });


var appTopologyItemSchema = new Schema({
    appShortName  :String,
    app  :String,
    appManagerA  :String,
    host  :String,
    hostStatus :String,
    hbawwn  :String,
    connect_hba_swport_alias  :String,
    connect_hba_zmemtype  :String,
    fabricname  :String,
    zsetname  :String,
    zname  :String,
    connect_arrayport_sw  :String,
    connect_arrayport_zmemtype  :String,
    connect_arrayport_swport_alias  :String,
    connect_arrayport_swport_status  :String,
    connect_arrayport_swport_wwn  :String,
    arrayport  :String,
    arrayport_wwn  :String,
    array  :String,
    arrayname :String,
    arraytype :String,
    devices  :String,
    maskingview  :String,
    IG  :String,
    PG  :String,
    SG  :String,
    Capacity : Number,
    marched_type  :String
    
},{ _id : false });

appTopologySchema = new Schema({
    metadata : {

        filename: {
            type: String,
            required: true
        },
        generateDatetime: {
            type: String,
            required: true 
        },
        NumberOfRecord: {
            type: String 
        }
    }, 
    data : [   appTopologyItemSchema   ],
    nomached_zone: [ zoneSchema ],
    nomarched_masking: [ maskingViewSchema ]
    //zone: [ zoneSchema ],
    //masking: [ maskingViewSchema ]

});

appTopologySchema.pre('save', function (next) {
    var array = this;
    if (!array.isModified) {
        return next();
    }
    //todo encrypt password here.
    return next();
});

appTopologySchema.methods = {
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
appTopologySchema.statics = {

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
mongoose.model('AppTopology', appTopologySchema); 
