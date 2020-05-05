if [ -z "$1" ]
  then
    echo "Usage: $0 <customername>";
    exit;
fi



dbserver=csmpdbserver
basepath=../CustomerData
customerdata=${basepath}/$1
 
#mongoimport --host ${dbserver}  -d csmp -c menus --drop menus.dat

ls ${customerdata} |while read filename
do
        basefilename=${filename%.*}
        echo "base import datafile:  ${filename}"
        mongoimport --host ${dbserver}  -d csmp -c ${basefilename}  --drop ${customerdata}/${filename}


done
