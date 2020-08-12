'use strict'; 
const logger = require('./logger');


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
    logs
}; 