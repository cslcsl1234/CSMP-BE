var scriptSqlMap = {
    add: 'INSERT INTO scriptdetail(name,changeorder,changedesc,businessname,type,createtime,status,params,cmd,closetime) VALUES(?,?,?,?,?,?,?,?,?,?)',
    deleteById: 'DELETE FROM scriptdetail where id=?',
    update: 'UPDATE scriptdetail SET name = ?,changeorder = ?,changedesc = ?,businessname = ?,type = ?,createtime = ?,status = ?,params = ?,cmd = ?,closetime = ? WHERE id = ?',
    list: 'SELECT * FROM scriptdetail',
    getById: 'select * from scriptdetail where id = ?'
};
module.exports = scriptSqlMap;