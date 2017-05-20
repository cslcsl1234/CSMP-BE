mongoose = require 'mongoose'
data = require './config/db'

module.exports = (grunt)->
  grunt.registerTask 'dbinit', 'add initial data', ->
    grunt.task.run 'dbdrop'
    grunt.task.run 'addmenu:maindashboard:#:Dashboard:0:1:glyphicon glyphicon-cog:dashboard.maindashboard'
    
    grunt.task.run 'addmenu:userManagement:#:系统管理:0:2:glyphicon glyphicon-cog:dashboard.userManagement'
    grunt.task.run 'addmenu:userManagement.user:userManagement:用户管理:1:2:ion-android-home:dashboard.sysManage.user'
    grunt.task.run 'addmenu:userManagement.role:userManagement:角色管理:1:3:ion-android-home:dashboard.sysManage.role'
    grunt.task.run 'addmenu:userManagement.menu:userManagement:菜单管理:1:1:ion-android-home:dashboard.sysManage.menu'


    grunt.task.run 'addmenu:EquipmentManagement:#:设备管理:0:10:ion-grid:dashboard.EquipmentManagement'
    grunt.task.run 'addmenu:EquipmentManagement.Array:EquipmentManagement:存储:1:10:ion-android-home:dashboard.EquipmentManagement.Array'

    grunt.task.run 'addmenu:performance:#:性能管理:0:3:glyphicon glyphicon-hdd:dashboard.performance' 
    grunt.task.run 'addmenu:performance.logicalPerformance:performance:逻辑卷性能:1:1:glyphicon glyphicon-hdd:dashboard.performance.logicalPerformance' 

    grunt.task.run 'addrole:admin:userManagement,userManagement.role,userManagement.menu,userManagement.user'
    grunt.task.run 'addrole:guest:EquipmentManagement'
    grunt.task.run 'adduser:admin:admin1@example.com:password:admin'
    grunt.task.run 'adduser:guest:guest@qq.com:password:guest'

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



  grunt.registerTask 'addmenu', 'add a menu item to menus collect', (menuId, parentMenuId, title, level, order, icon, stateRef )->
    Menu= mongoose.model('Menu');
    menu = new Menu
      menuId : menuId 
      parentMenuId : parentMenuId  
      title : title  
      level : level
      icon : icon
      order : order
      stateRef : stateRef

    done = @.async()
    menu.save (err)->
      if err
        console.log "Error: #{err}"
        done off
      else
        console.log "saved Menu: #{menu.menuId} "
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
