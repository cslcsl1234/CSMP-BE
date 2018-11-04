
type=$1

## ------------------------ Start ----------------------------
if [ "${type}" = "start" ];
then 
    echo "this is ${type} ops."

    ##  ---------------------------------
    ##           Backend Service 
    ##  ---------------------------------
    if ps -ef|grep node|grep app.js|grep -v grep > /dev/null  ;
    then 
	echo "node app.js is running ... "
    else 
 	echo "node app.js is not running ..."
	cd /csmp/CSMP-BE
	nohup node app.js 1>&2 2>./CSMP-BE.out &
    fi

    sleep 3

    ##  ---------------------------------
    ##           FrontEnd Service 
    ##  ---------------------------------
    if ps -ef|grep gulp|grep -v grep > /dev/null ;
    then 
	echo "front end service is running ... "
    else 
	echo "front end service is not running ... "
	cd /csmp/CSMP-FE
	nohup gulp serve 1>&2 2>./CSMP-FE.out &
    fi

    sleep 3

    ##  ---------------------------------
    ##           Event Receive Service
    ##  ---------------------------------
    if ps -ef|grep TrapReceiver|grep -v grep > /dev/null ;
    then
        echo " TrapReceiver service is running ... "
    else
        echo " TrapReceiver service is not running ... "
        cd /csmp/CSMP-BE/scripts
        nohup node TrapReceiver.js 1>&2 2>./TrapReceiver.out &
    fi





## ------------------------ Stop ----------------------------
else if [ "${type}" = "stop" ];
then 
    echo "this is ${type} ops."

    ##  ---------------------------------
    ##           Backend Service 
    ##  ---------------------------------
    if ps -ef|grep node|grep app.js|grep -v grep > /dev/null ;
    then 
	echo "node app.js is running, now is stoping it... "
	ps -ef|grep node|grep app.js|grep -v grep|awk '{print $2}'|xargs kill -9
    else 
 	echo "node app.js is not running ..."
    fi

    sleep 3
    ##  ---------------------------------
    ##           FrontEnd Service 
    ##  ---------------------------------
    if ps -ef|grep gulp|grep -v grep > /dev/null ;
    then 
	echo "front end service is running ... "
    	ps -ef|grep gulp|grep -v grep|awk '{print $2}'|xargs kill -9
    else 
	echo "front end service is not running ... "
    fi

    sleep 3

    ##  ---------------------------------
    ##           Event Receive Service
    ##  ---------------------------------
    if ps -ef|grep TrapReceiver|grep -v grep > /dev/null ;
    then
        echo " TrapReceiver service is running ... "
        ps -ef|grep TrapReceiver|grep -v grep|awk '{print $2}'|xargs kill -9
    else
        echo " TrapReceiver service is not running ... "
    fi




## ------------------------ Restart ----------------------------
else if [ "${type}" = "restart" ];
then 
    echo "this is ${type} ops."

    ##  ---------------------------------
    ##           Backend Service 
    ##  ---------------------------------
    if ps -ef|grep node|grep app.js|grep -v grep > /dev/null ;
    then 
	echo "node app.js is running, now is restart it... "
	ps -ef|grep node|grep app.js|grep -v grep|awk '{print $2}'|xargs kill -9
	cd /csmp/CSMP-BE
        nohup node app.js 1>&2 2>./CSMP-BE.out &
    else 
 	echo "node app.js is not running , now is start it..."
	cd /csmp/CSMP-BE
        nohup node app.js 1>&2 2>./CSMP-BE.out &
    fi

    sleep 3

    ##  ---------------------------------
    ##           FrontEnd Service 
    ##  ---------------------------------
    if ps -ef|grep gulp|grep -v grep > /dev/null ;
    then 
	echo "front end service is running ... "
    	ps -ef|grep gulp|grep -v grep|awk '{print $2}'|xargs kill -9
	cd /csmp/CSMP-FE
	nohup gulp serve 1>&2 2>./CSMP-FE.out &
    else 
	echo "front end service is not running ... "
	cd /csmp/CSMP-FE
	nohup gulp serve 1>&2 2>./CSMP-FE.out &
    fi

    sleep 3
    ##  ---------------------------------
    ##           Event Receive Service 
    ##  ---------------------------------
    if ps -ef|grep TrapReceiver|grep -v grep > /dev/null ;
    then 
	echo " TrapReceiver service is running ... "
    	ps -ef|grep TrapReceiver|grep -v grep|awk '{print $2}'|xargs kill -9
	cd /csmp/CSMP-BE/scripts
        nohup node TrapReceiver.js 1>&2 2>./TrapReceiver.out &
    else 
	echo " TrapReceiver service is not running ... "
	cd /csmp/CSMP-BE/scripts
        nohup node TrapReceiver.js 1>&2 2>./TrapReceiver.out &
    fi

else 
    echo "this is unknow ops. do nothing."
fi
fi
fi



