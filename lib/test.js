"use strict";
const logger = require("../lib/logger")(__filename); 

const moment = require('moment');

var util = require('./util');

var res = util.getlastMonthByDate("2018-03-03");

var dd = moment().format("YYYYMMDD");

logger.info(dd);