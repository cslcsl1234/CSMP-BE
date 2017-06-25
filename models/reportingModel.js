"use strict";

/**
 * Define  menuSchema & authSchema, which are used for the authentication.
 */

var mongoose = require('mongoose')
    , uuid = require('node-uuid')
    , Schema = mongoose.Schema
    , ObjectId = mongoose.Schema.ObjectId
    , ReportParamaterSchema 
    , ReportInfoSchema
    , ReportStatusSchema
    , ReportParamaterValueSchema
    , TYPE = 'List,TimeStamp,Number,String'.split(',')
    , GENERATE = 'enable,disable'.split(',')
    , FORMATE = 'docx,pdf,xsl,csv,ppt'.split(',')
    , STATUS = 'running,complete,error'.split(',')


ReportParamaterSchema = new Schema({
    Name: {
        type: String,
        required: true
    },
    DisplayName: {
        type: String,
        required: true 
    },    
    Description: {
        type: String 
    },
    Type: {
        type: String ,
        required: true ,
        enum: TYPE
    },
    Data: {
        type: String 
    }
});

ReportInfoSchema = new Schema({ 
    ID: {
        type: String,
        required: true 
    },    
    Name: {
        type: String,
        required: true 
    },    
    Type: {
        type: String,
        required: true 
    },    
    Format: {
        type: String,
        required: true ,
        enum: FORMATE
    },    
    TypeIcon: {
        type: String,
        required: true 
    },    
    TemplatePath: {
        type: String,
        required: true 
    },    
    Generate: {
        type: String,
        required: true ,
        enum: GENERATE
    },    
    GenerateURL: {
        type: String,
        required: true 
    },    
    GenerateOutputPath: {
        type: String,
        required: true 
    },    
    GenerateSchedule: {
        type: String 
    },     
    Description: {
        type: String 
    },
    ReportParamater: [ ReportParamaterSchema ]
});


ReportParamaterValueSchema = new Schema({
    Name: {
        type: String,
        required: true
    },
    Value: {
        type: String,
        required: true 
    } 
});


ReportStatusSchema = new Schema({ 
    ID : {
        type: String,
        required: true 
    }, 
    ReportInfoID : {
        type: String,
        required: true 
    },    
    Name: {
        type: String,
        required: true 
    }, 
    GenerateTime: {
        type: String,
        required: true 
    },    
    Status: {
        type: String,
        required: true ,
        enum: STATUS
    },    
    StatusTime: {
        type: String,
        required: true  
    },    
    
    ReportFile :{
        type: String
    },
    ReportFileURL : {
        type: String
    },
    ReportParamater:  [ ReportParamaterValueSchema ]
    
});

  
ReportStatusSchema.pre('save', function (next) {
    var reportstatus = this;
    if (!reportstatus.isModified) {
        return next();
    } 
    return next();
});



  
ReportInfoSchema.pre('save', function (next) {
    var report = this;
    if (!report.isModified) {
        return next();
    } 
    return next();
});



//create and set two models into mongoose instance, they can be fetched anywhere mongoose object is presented.
mongoose.model('ReportInfo', ReportInfoSchema);  
mongoose.model('ReportStatus', ReportStatusSchema);  
