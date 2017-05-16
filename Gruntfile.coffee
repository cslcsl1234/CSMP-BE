mongoose = require 'mongoose'
data = require './config/db'

module.exports = (grunt)->
  grunt.registerTask 'dbinit', 'add initial data', ->
    grunt.task.run 'addrole:admin:userManagement,EquipmentManagement,userManagement.user'
    grunt.task.run 'addrole:user:EquipmentManagement'
    grunt.task.run 'adduser:admin:admin1@example.com:secret:admin'
    grunt.task.run 'adduser:guest:guest@qq.com:secret:user'

  grunt.registerTask 'adduser', 'add a user to db', (user, email, pass, role)->
    User = mongoose.model('User');
    user = new User
      username: user
      email: email
      password: pass
      roleList: role

    done = @.async()
    user.save (err)->
      if err
        console.log "Error: #{err}"
        done off
      else
        console.log "saved User: #{user.username}"
        done()

  grunt.registerTask 'addrole', 'add a role to db', (roleName, menulist)->
    Role = mongoose.model('Role');
    role = new Role
      roleName: roleName
      menuList: menulist.split(",")

    done = @.async()
    role.save (err)->
      if err
        console.log "Error: #{err}"
        done off
      else
        console.log "saved Role: #{role.roleName} #{role.menuList}"
        done()

  grunt.registerTask 'dbdrop', 'drop the database', ->
    done = @.async();
    mongoose.connection.on 'open', ->
      mongoose.connection.db.dropDatabase (err)->
        if err
          console.log "Error: #{err}"
          done off
        else
          console.log 'Successfully dropped db'
          done()

  grunt.registerTask('default', ['dbinit']);
