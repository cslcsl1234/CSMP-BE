"use strict";

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
  var fs = require('fs');
  if (hostinfo.privateKey === undefined)
    hostinfo["privateKey"] = fs.readFileSync(hostinfo.privateKeyFile);

  var conn = new Client();
  var result = "";
  conn.on('ready', function () {
    var command = `source ~/.bash_profile; ${cmd}`
    conn.exec(command, function (err, stream) {
      if (err) throw err;
      stream.on('close', function (code, signal) {
        console.log(`SSH Closed`);
        conn.end();

        //console.log(result);
        callback(result);
      }).on('data', function (data) {
        result += data.toString('utf8');
      });
    });
  }).on('error', function (err) {
    callback(err);
  })
    .connect(hostinfo);

}

