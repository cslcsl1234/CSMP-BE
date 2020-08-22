"use strict";
const logger = require("../lib/logger")(__filename); 

var mysql = require('mysql');
var async = require('async'); 
var configger = require('../config/configger');
var util = require('./util'); 
var moment = require('moment');
var dbinfo = require('../config/mysqlConf');


module.exports = {
    Connect,
    yesterdayEventCount
};


    
/*
    * Get a Arrays list.
    * input: 
        - device (option): a vmax serial no. if it isn't assigned, then fetch all of vmaxs.
    * result schema:

*/
function Connect(dblabel, callback) {

    var connection = mysql.createConnection(dbinfo);

    connection.connect(function(err) {
        if (err) throw err
        callback(connection);
    });

    connection.on('error', function(err) {
        logger.error('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
          handleDisconnect(connection);               // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
          throw err;                                  // server variable configures this)
        }
      });

}

function handleDisconnect(conn) {
    conn.on('error', function(err) {
      if (!err.fatal) {
        return;
      }
  
      if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
        throw err;
      }
  
      logger.error('Re-connecting lost connection: ' + err.stack);
  
      var connection = mysql.createConnection(dbinfo);

      connection.connect(function(err) {
          if (err) throw err
          callback(connection);
      });
    });
  }

function yesterdayEventCount(callback) {
    //var yesterday = util.getDatetimeByDay(-2);

    var yesterday = { begin: '2017-12-22T16:00:00.000Z',
                        end: '2018-12-24T16:00:00.000Z' }


    var b = moment(Date.parse(yesterday.begin)).format('YYYY-MM-DD HH:mm:ss');
    var e = moment(Date.parse(yesterday.end)).format('YYYY-MM-DD HH:mm:ss'); 
 
    var QueryStr = ' SELECT  \
                                t.type,count(*) as eventCount \
                        FROM thresholdevent t  \
                        LEFT JOIN `storage` s ON t.sn = s.storageSN \
                        WHERE t.warningDate BETWEEN \''+b +'\' \
                        AND \''+ e +'\' \
                        GROUP BY t.type \
                        '; 
    Connect('',function(connection) {
        connection.query(QueryStr,function(err,results) {
            callback(results);
        });
    })

}