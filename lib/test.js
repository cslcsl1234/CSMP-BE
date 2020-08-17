"use strict"; 

const moment = require('moment');

var util = require('./util');

var res = util.getlastMonthByDate("2018-03-03");

var dd = moment().format("YYYYMMDD");

logger.info(dd);