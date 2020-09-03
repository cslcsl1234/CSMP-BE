'use strict';
const logger = require('./logger');
const moment = require('moment'); 

const expressWinston = require('express-winston');
const winston = require('winston')

function logs(code, message, AutoObject) {
  var isodatetime = moment().toISOString();
  var newMessage = "[" + isodatetime + "] # " + message;
  AutoObject.resMsg.code = code;
  AutoObject.resMsg.message.push(newMessage); 
  if (code != 200) {
    //logger.info(JSON.stringify(AutoObject))
    //logger.info(JSON.stringify(AutoObject));
  }      
  return;
}

const logDir = 'logs';
const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: `${logDir}/%DATE%.log`,
  maxSize: "1g",
  maxDays: "30d",
  zippedArchive: true,
  datePattern: 'YYYY-MM-DD'
});


const requestLog = expressWinston.logger({
  transports: [
    new winston.transports.Console({
      json: false,
      colorize: true,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          info => `${info.timestamp} ${info.level} : ${info.message} ` + JSON.stringify(info)
        )
      )
    }),
    dailyRotateFileTransport
  ],
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss:SSS'
    }),
    winston.format.printf(
      info => `${info.timestamp} ${info.level} : ${info.message} ` + JSON.stringify(info)
    )
  ),
  statusLevels: false, // default value
  level: function (req, res) {
    var level = "";
    if (res.statusCode >= 100) { level = "info"; }
    if (res.statusCode >= 400) { level = "warn"; }
    if (res.statusCode >= 500) { level = "error"; }
    // Ops is worried about hacking attempts so make Unauthorized and Forbidden critical
    if (res.statusCode == 401 || res.statusCode == 403) { level = "critical"; }
    // No one should be using the old path, so always warn for those
    if (req.path === "/v1" && level === "info") { level = "warn"; }
    return level;
  },
  meta: true,
  msg: "Request: {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}; ipAddress {{req.connection.remoteAddress}}",
  expressFormat: true,
  requestWhitelist: [
    "url",
    "headers",
    "method",
    "httpVersion",
    "originalUrl",
    "query",
    "body"
  ]
});

module.exports = {
  logs,
  requestLog
}; 