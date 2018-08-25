Node Rest API Authentication Demo
==========================

When it comes to Rest API, each request from the client is statless, so the tranditional session-based tranditional authentication in web app no longer
works, instead, an authKey-based soultion can be a good way to secure a system.

To start a this demo you need a running mongoDB on localhost with default parameter & installed gruntJS:
		
		git clone git://github.com/yanCode/Node-Rest-Auth-Demo.git auth
		cd auth
		npm install
		grunt   (This installs 2 users, username:yan password:secret, role: user; username:boss password:secret, role: admin)
		node app.js




To play this app
===============

1. login:
     curl -i -X POST -d "username=yan&password=secret" http://localhost:8080/api/login  (an authKey is returned if logging sccuessfully)

2. Access an API
     curl -i -H "authKey: YOUR_RETURNED_AUTHKEY" -X GET  http://localhost:8080/api/time

3. Access an API requiring admin privilege, so please using boss:secrect login first
     curl -i -H "authKey: YOUR_RETURNED_AUTHKEY" -X GET  http://localhost:8080/api/admin/time

4. Logout
    curl -i -H "authKey: YOUR_RETURNED_AUTHKEY" -X POST  http://localhost:8080/api/logout




Container
===============
1. rebuild the docker image
   > docker-compose build

2. Start container apps
   docker-compose up

3. Initiator the mongodb data
   docker-compose run app grunt

4. Access the app api of backend
   http://<IP>:8000/api/...  (update port mapping in docker-compose.yml)