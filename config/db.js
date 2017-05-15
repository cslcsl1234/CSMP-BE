"use strict";

/**
 * This is the mongoDB config file, also loads all model definition of the whole project.
 * @author: ShengYan, Zhang
 * @since: 2013/07/11
 *
 * @type {*}
 */
var configger = require('./configger');
var config = configger.load();
var mongoose = require('mongoose');

var dbUrl = config.MongoDBURL;
console.log(dbUrl);
/**
 * This may use a loop to automatically load all models.
 */
require('./../models/userModel');
require('./../models/arrayModel');

require('./../models/switchModel');
require('./../models/appModel');

require('./../models/hostModel');


require('./../models/menuModel');

//connect to db.
mongoose.connect(dbUrl, function (err, res) {
    if (err) {
        console.log('ERROR connecting to: ' + dbUrl + '. ' + err);
    } else {
        console.log('Successfully connected to: ' + dbUrl);
    }
});
