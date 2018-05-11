var schedule = require("node-schedule");  


schedule.scheduleJob('1 * * * * *', function(){  
	console.log("Begin Execute ...");
});  

