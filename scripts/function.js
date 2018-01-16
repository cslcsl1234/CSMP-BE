"use strict"

var unirest = require("unirest");
var Config= require("./config.json");
var csmpserver = Config.Server +":" + Config.Port;

module.exports = {
	GetSwitchPorts,
	GetAuthKey,
	GetUsers
}

function GetSwitchPorts(callback) {

	GetAuthKey(function (authKey) {

	  if ( authKey == null )  {
		console.log("Error: getAuthKey.");
		callback(null);
	  }
	  else {
		var req = unirest("GET", "http://"+csmpserver+"/api/switch/ports");

		req.headers({
		  "authorization": authKey,
		  "content-type": "application/json"
		});

		req.end(function (res) {
		  if (res.error) throw new Error(res.error);

			var result = res.body;
			callback(result);
		});
	  }

	});


};

function GetUsers(callback) {

	GetAuthKey(function (authKey) {

	  if ( authKey == null )  {
		console.log("Error: getAuthKey.");
		callback(null);
	  }
	  else {
		var req = unirest("GET", "http://"+csmpserver+"/api/user/list");
		req.headers({
		  "authorization": authKey,
		  "content-type": "application/json"
		});

		req.end(function (res) {
		  if (res.error) throw new Error(res.error);

			var result = res.body;
			
			callback(result);
		});
	  }

	});


};

function GetAuthKey(callback) {

	var req_login = unirest("POST", "http://"+csmpserver+"/api/login");

	req_login.headers({
	  "content-type": "application/x-www-form-urlencoded"
	});

	req_login.form({
	  "username": "admin",
	  "password": "password"
	});

	req_login.end(function (res) {

	  if ( res.statusCode == 400 ) {
		console.log("Error: ["+res.body.message+"]");
		callback(null);
		
	  }
	  else {
		var authKey = res.body.authKey;
		callback(authKey);
	 }
		
	});

}
