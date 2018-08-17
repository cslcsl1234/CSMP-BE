"use strict";

/**
 * Define  userSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , hostSchema 
    , DEVICE_LEVEL = 'high,middle,low'.split(',')
    , HOST_TYPE= 'Physical,Virtual'.split(',')
    , HOST_STATUS= 'Product,Test,Development'.split(',')
    ;
/**
 * userSchema.
 * @type {Schema}
 */

var hbaSchema = new Schema({
    name: String,
    wwn: String,
    nodewwn: String,
    alias: String,
    AB: String
},{ _id : false });

hostSchema = new Schema({

    baseinfo: {

	// --- the name of host, it should be unique in the whole enterprices.
        name: {
            type: String
        },
	// --- the type of host, the vaild values is : Physical, Virtual, etc.
        type: {
            type: String 
            //enum: HOST_TYPE
        },
	// --- the catalog of host, like by business or department etc.
        catalog: {
            type: String
        },
	// --- the current status of host, the vaild values is : Prod, Test
        status: { 
            type: String 
            //enum: HOST_STATUS
        },
	// -- the management ip address of host
        management_ip:{
            type: String
        },
	// -- the service ips address of host, if have a few of ip addresses, then use ',' split, like "192.168.1.1,10.10.10.11".
        service_ip:{
            type: String
        },
	// -- the host is belong to which data center.
        UnitID: {
             type: String
        },
	// -- the description of host, can be anything.
        description:{
            type: String
        }

    },
    maintenance :{
	// -- the provider of host.
       vendor: {
            type: String
        },
	// -- the contact of maintenance contant.
        contact: {
            type: String
        },
        maintenance_department: {
            type: String
        },
        maintenance_owner: {
            type: String
        }
    },
    assets : {
	// -- the asset number has managed by enterprise.
        no: {
            type: String
        },
	// -- the purchar purpose generally.
        purpose: {
            type: String
        },
	// -- the department host's asset has belong to.
        department: {
            type: String
        },
	// -- the department manager.
        manager: {
            type: String
        }
    }, 
    configuration : {
	// -- the OperatorSystem of host, like 'Windows, AIX, Linux" etc.
        sn: {
            type: String
        } ,
         model: {
            type: String
        } ,
        HA: {
            type: String
        } ,
         OS: {
            type: String
        },
        OSVersion: {
            type: String
        },
        memory: {
            type: String
        },
        cpu: {
            type: String
        },
	// -- Could be any thing about configuration.
        envtype: {
            type: String
        } ,
        other: {
            type: String
        }

    },
    HBAs: [   hbaSchema   ],
    APPs: Array 

});

hostSchema.pre('save', function (next) {
    var host = this;
    if (! host.isModified) {
        return next();
    }
    //todo encrypt password here.
    return next();
});

mongoose.model('Host', hostSchema); 
mongoose.model('HBA', hbaSchema); 

