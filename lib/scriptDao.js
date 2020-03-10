var mysql = require('mysql');
var mysqlConf = require('../config/mysqlConf');
var scriptSqlMap = require('./scriptSqlMap');
var pool = mysql.createPool(mysqlConf.mysql);
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
		    console.log('--------------------------INSERT----------------------------');
            if (error) throw error;
		    console.log('INSERT ID:',script);      
		    console.log('-----------------------------------------------------------------');
			console.log(result.insertId);

            callback(result.affectedRows > 0,result.insertId);
        });
    },
    list: function (callback) {
        pool.query(scriptSqlMap.list, function (error, result) { 
			console.log('--------------------------SELECT All----------------------------');
            if (error) throw error;
		    console.log("the number of record is :" + result.length);
		    console.log('------------------------------------------------------------\n\n');  
            callback(result);
        });
    },
    getById: function (id, callback) {
        console.log(scriptSqlMap.getById);
        pool.getConnection(function(err, connection) {
            if (err) throw err; // not connected!
        });

        pool.query(scriptSqlMap.getById, id, function (error, result) {
			console.log('--------------------------SELECT getById----------------------------');
            if (error) throw error; 
		    console.log('------------------------------------------------------------\n\n');  
 
            callback(result[0]);
        });
    },
    deleteById: function (id, callback) {
        pool.query(scriptSqlMap.deleteById, id, function (error, result) {
			console.log('--------------------------DELETE----------------------------');
            if (error) throw error; 
		    console.log('------------------------------------------------------------\n\n');  

            callback(result.affectedRows > 0);
        });
    },
    update: function (script, callback) {
        if ( script.closetime == "" ) script.closetime="0000-00-00 00:00:00";
        pool.query(scriptSqlMap.update, [script.name, script.changeorder,script.changedesc,script.businessname,script.type,script.createtime,script.status,script.params,script.cmd,script.closetime, script.id], function (error, result) {
		    console.log('--------------------------UPDATE----------------------------');
            if (error) throw error;
            console.log(script);
		    console.log('------------------------------------------------------------\n\n');
            if (error) throw error;
            callback(result.affectedRows > 0,script.id);
        });
    }
};