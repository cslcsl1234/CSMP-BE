'use strict';
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const logDir = 'logs';


const loglevel = { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 };

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
const dailyRotateFileTransport = new transports.DailyRotateFile({
    filename: `${logDir}/%DATE%.log`,
    maxSize: "1g",
    maxDays: "30d",
    zippedArchive: true,
    datePattern: 'YYYY-MM-DD'
});


const logger = function (filename) {
    return createLogger({
        level: process.env.NODE_ENV === 'development' ? 'silly' : 'info',
        format: format.combine(
            //format.label({ label: path.basename(process.mainModule.filename) }),
            format.label({ label: filename.replace(process.cwd(), '.') }),
            format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss:SSS'
            }),
            format.printf(info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`
            )
        ),
        transports: [
            new transports.Console(
                {
                    level: 'silly',
                    format: format.combine(
                        format.colorize(),
                        format.printf(
                            info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`
                        )
                    )
                }
            ),
            dailyRotateFileTransport
        ]
    });
}



module.exports = logger;

// logger.debug('Debugging info');
// logger.verbose('Verbose info');
// logger.info('Hello world');
// logger.warn('Warning message');
// logger.error('Error info');