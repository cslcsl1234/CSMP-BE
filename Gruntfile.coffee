mongoose = require 'mongoose'
data = require './config/db'

module.exports = (grunt)->
  grunt.registerTask 'dbinit', 'add initial data', ->
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
