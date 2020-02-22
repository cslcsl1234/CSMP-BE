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
        pool.query(scriptSqlMap.add, [script.name, script.changeorder,script.changedesc,script.businessname,script.type,script.createtime,script.status,script.params,script.cmd,script.closetime], function (error, result) {
		    console.log('--------------------------INSERT----------------------------');
		    console.log('INSERT ID:',script);      
		    console.log('-----------------------------------------------------------------');
			console.log(result.insertId);
            if (error) throw error;
            callback(result.affectedRows > 0,result.insertId);
        });
    },
    list: function (callback) {
        pool.query(scriptSqlMap.list, function (error, result) {
			console.log('--------------------------SELECT All----------------------------');
		    console.log("the number of record is :" + result.length);
		    console.log('------------------------------------------------------------\n\n');  
            if (error) throw error;
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
            console.log(result);
            console.log(id);
		    console.log('------------------------------------------------------------\n\n');  
            if (error) throw error;
            console.log(result[0]);
            callback(result[0]);
        });
    },
    deleteById: function (id, callback) {
        pool.query(scriptSqlMap.deleteById, id, function (error, result) {
			console.log('--------------------------DELETE----------------------------');
		    console.log(id);
		    console.log('------------------------------------------------------------\n\n');  
            if (error) throw error;
            callback(result.affectedRows > 0);
        });
    },
    update: function (script, callback) {
        pool.query(scriptSqlMap.update, [script.name, script.changeorder,script.changedesc,script.businessname,script.type,script.createtime,script.status,script.params,script.cmd,script.closetime, script.id], function (error, result) {
		    console.log('--------------------------UPDATE----------------------------');
		    console.log(script);
		    console.log('------------------------------------------------------------\n\n');
            if (error) throw error;
            callback(result.affectedRows > 0,script.id);
        });
    }
};