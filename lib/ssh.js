"use strict";
const logger = require("../lib/logger")(__filename);

var async = require('async');
var mongoose = require('mongoose');

var Client = require('ssh2').Client;



module.exports = {
  remoteCommand
}



/*
hostinfo = {
      host: '192.168.100.100',
      port: 22,
      username: 'frylock',
      privateKey: require('fs').readFileSync('/here/is/my/key'),
        readyTimeout: 5000
  }
*/

function remoteCommand(hostinfo, cmd, callback) {
  var retMsg = {
    code: 200,
    msg: "",
    data: {}
  }
  var fs = require('fs');
  if (hostinfo.privateKey === undefined)
    if (hostinfo.privateKeyFile !== undefined)
      hostinfo["privateKey"] = fs.readFileSync(hostinfo.privateKeyFile);

  var conn = new Client();
  var result = "";
  conn.on('ready', function () {
    var command = `source ~/.bash_profile; ${cmd}`
    conn.exec(command, function (err, stream) {
      if (err) throw err;
      stream.on('close', function (code, signal) {
        logger.info(`SSH Closed [ host=${hostinfo.host} ]. code=${code}`);
        conn.end();

        //console.log(result);
        if (code == 0 || code == 1) {
          retMsg.code = 200;
          retMsg.msg = "succeed";
          retMsg.data = result;
          callback(result);
        } else {
          retMsg.code = code;
          retMsg.msg = "fail";
          retMsg.data = result;
          callback(retMsg);
        }
      }).on('data', function (data) {
        result += data.toString('utf8');
      });
    });
  }).on('error', function (err) {
    retMsg.code = 501;
    retMsg.msg = err;
    retMsg.data = null
    callback(retMsg);
  })
    .connect(hostinfo);

}

