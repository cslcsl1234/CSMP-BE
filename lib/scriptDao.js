var mysql = require('mysql');
var mysqlConf = require('../config/mysqlConf');
var scriptSqlMap = require('./scriptSqlMap');
var pool = mysql.createPool(mysqlConf.mysql);
const logger = require("../lib/logger")(__filename);

//var connection = mysql.createConnection({
  //host     : 'localhost',
  //user     : 'root',
  //password : '',
  //database : 'ssmp'
//});  

module.exports = {
    add: function (script, callback) {
        if ( script.closetime == "" ) script.closetime="0000-00-00 00:00:00";
        pool.query(scriptSqlMap.add, [script.name, script.changeorder,script.changedesc,script.businessname,script.type,script.createtime,script.status,script.params,script.cmd,script.closetime], function (error, result) {
		    logger.info('--------------------------INSERT----------------------------');
            if (error) throw error;
		    logger.info('INSERT ID:',script);      
		    logger.info('-----------------------------------------------------------------');
			logger.info(result.insertId);

            callback(result.affectedRows > 0,result.insertId);
        });
    },
    list: function (callback) {
        pool.query(scriptSqlMap.list, function (error, result) { 
			logger.info('--------------------------SELECT All----------------------------');
            if (error) throw error;
		    logger.info("the number of record is :" + result.length);
		    logger.info('------------------------------------------------------------\n\n');  
            callback(result);
        });
    },
    getById: function (id, callback) {
        logger.info(scriptSqlMap.getById);
        pool.getConnection(function(err, connection) {
            if (err) throw err; // not connected!
        });

        pool.query(scriptSqlMap.getById, id, function (error, result) {
			logger.info('--------------------------SELECT getById----------------------------');
            if (error) throw error; 
		    logger.info('------------------------------------------------------------\n\n');  
 
            callback(result[0]);
        });
    },
    deleteById: function (id, callback) {
        pool.query(scriptSqlMap.deleteById, id, function (error, result) {
			logger.info('--------------------------DELETE----------------------------');
            if (error) throw error; 
		    logger.info('------------------------------------------------------------\n\n');  

            callback(result.affectedRows > 0);
        });
    },
    update: function (script, callback) {
        if ( script.closetime == "" ) script.closetime="0000-00-00 00:00:00";
        pool.query(scriptSqlMap.update, [script.name, script.changeorder,script.changedesc,script.businessname,script.type,script.createtime,script.status,script.params,script.cmd,script.closetime, script.id], function (error, result) {
		    logger.info('--------------------------UPDATE----------------------------');
            if (error) throw error;
            logger.info(script);
		    logger.info('------------------------------------------------------------\n\n');
            if (error) throw error;
            callback(result.affectedRows > 0,script.id);
        });
    }
};