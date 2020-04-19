mongoimport -h csmpdbserver -d csmp -c menus --drop menus.dat
mongoimport -h csmpdbserver -d csmp -c users --drop users.dat
mongoimport -h csmpdbserver -d csmp -c roles --drop roles.dat

