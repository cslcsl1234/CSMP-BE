end=`date +%Y-%m-01`
begin=`date -d "${end} last day" +%Y-%m-01`

now=`date +%Y%m%d%H%M%S`
echo "${now} Begin execute monthly report from ${begin} to ${end} "
echo "curl http://10.1.228.146:8888/report/storage/${begin}/${end}""


curl http://10.1.228.146:8888/report/storage/${begin}/${end}


now=`date +%Y%m%d%H%M%S`
echo "${now} end execute monthly report from ${begin} to ${end} "
echo " ================================================== "
