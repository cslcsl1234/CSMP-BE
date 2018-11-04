basepath=/csmp
ddd=`date +%Y%m%d`

if [ $# != 1 ];
then 
    echo ""
    echo "Usage: deploy.sh <deploy file name>";
    echo ""
    exit -2
fi


deployfilename=$1

if [ ! -f ${deployfilename} ];
then 
    echo ""
    echo "The deploy file [${deployfilename}] is not exist!"
    echo "Deploy Fail !"
    echo ""
    exit -1
fi

echo ""
echo "deploy file is [${deployfilename}]"
echo "Begin deploy ... ..."
echo ""

echo ""
echo "  [Step 1]: Backup Enviremtment ..."
backpath=${basepath}/backup
backfile=${backpath}/CSMP-Backup-${ddd}.tar.gz
if [ ! -d ${backpath} ];
then 
    echo "            Backup Path [${backpath}] is not exist. creating it ..."
    mkdir -p ${backpath}
else 
    echo "            Backup file is [${backfile}]."
fi 
cd ${basepath}
tar czf ${backfile} ./CSMP-BE ./CSMP-FE ./deploy.sh ./index.html ./CustomerData ./service.sh 
echo ""

echo ""
echo "  [Step 2]: Stoping Service ..."
cd ${basepath}
if [ ! -f ./service.sh ];
then 
    echo "[ERROR]: the [service.sh] is not exist!"
    echo "Please contect the EMC !"
    exit -1
fi
./service.sh stop

echo "            Please waiting 5s to next step ..."
sleep 5

echo ""
echo "  [Step 3]: Clean up envirament ..."
rm -f -r ${basepath}/CSMP-[FB]E


echo ""
echo "  [Step 4]: deploy package ..."
cd ${basepath}
tar -zxf ${deployfilename}
if [ ! -f ./index.html ];
then 
    echo "[ERROR]: the [index.html] is not exist!"
    echo "Please contect the EMC !"
    exit -1
fi
cp -f ${basepath}/index.html ${basepath}/CSMP-FE/src/.


echo ""
echo "  [Step 5]: starting service ..."
cd ${basepath}
if [ ! -f ./service.sh ];
then 
    echo "[ERROR]: the [service.sh] is not exist!"
    echo "Please contect the EMC !"
    exit -1
fi
./service.sh start


echo ""
echo "deploy is successed ! "
echo "----------------------------------------------------"
echo "Please use browse to access http://10.255.20.16:8000"
echo "----------------------------------------------------"
echo "enjoy it! Good Day!"
echo ""






