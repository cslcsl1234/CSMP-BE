const ZB = require('zeebe-node')
var configger = require('../../config/configger'); 


module.exports = { 
    exceptionProcess
}

async function exceptionProcess(zbc,AutoObject,code,msg) {
    var config = configger.load();

    var resMsg = AutoObject.resMsg;
    resMsg.code = code;
    resMsg.message.push(msg);

    await zbc.publishMessage({
        name: "Exception_Handler_Begin",
        variables: AutoObject ,
        timeToLive: 10000
    });
};


