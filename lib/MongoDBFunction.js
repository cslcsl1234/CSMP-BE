"use strict"; 

var async = require('async'); 
var mongoose = require('mongoose');
var unirest = require('unirest');
var configger = require('../config/configger');
var CallGet = require('./CallGet'); 
var host = require('./Host');
var GetEvents = require('./GetEvents');
var util = require('./util');
var ArrayObj = mongoose.model('Array');
var jp = require('jsonpath');
var topos= require('./topos');

module.exports = {
    GetArrayInfo 

}


function GetArrayInfo(callback) {

        ArrayObj.find({}, { "__v": 0, "_id": 0 },  function (err, doc) {
        //system error.
        if (err) {
            return   done(err);
        }
        if (!doc) { //user doesn't exist.
            console.log("array info record is not exist."); 

            callback(null,[]); 
        
        }
        else {
            console.log("Array is exist!");
            callback(doc); 

        }
        
    });
}

 
