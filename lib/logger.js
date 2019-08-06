var appRoot = require('app-root-path');
var winston = require('winston');
var moment = require('moment');

// define the custom settings for each transport (file, console)
var options = {
  file: {
    level: 'info',
    filename: `${appRoot}/logs/app.log`,
    handleExceptions: true,
    json: false,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

// instantiate a new Winston Logger with the settings defined above
var logger = winston.createLogger({
  transports: [
    new winston.transports.File(options.file),
    new winston.transports.Console(options.console)
  ],
  exitOnError: false, // do not exit on handled exceptions
});

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function(message, encoding) {
    // use the 'info' log level so the output will be picked up by both transports (file and console)
    logger.info(message);
  },
};

function logs(code,message,AutoObject) {
  var isodatetime = moment().toISOString();
  var newMessage = "[" + isodatetime + "] # " + message;
  AutoObject.resMsg.code = code;
  AutoObject.resMsg.message.push(newMessage);
  logger.info(newMessage);
  if ( code != 200 ) {
    //console.log(JSON.stringify(AutoObject))
    //logger.info(JSON.stringify(AutoObject));
  }
  return ; 
}

module.exports = {
  logger,
  logs
}

