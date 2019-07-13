#====================
#==== CentOS 6.8 ====
#====================
wget http://people.centos.org/tru/devtools-2/devtools-2.repo -O /etc/yum.repos.d/devtools-2.repo
yum install devtoolset-2-gcc devtoolset-2-binutils devtoolset-2-gcc-c++ -y

cd /opt
wget https://nodejs.org/dist/v6.10.0/node-v6.10.0-linux-x64.tar.gz
tar -zxvf node-v6.10.0-linux-x64.tar.gz
echo "export PATH=${PATH}:/opt/node-v6.10.0-linux-x64/bin" >> /etc/profile
. /etc/profile
npm install bower -g
npm install gulp -g


wget https://repo.mongodb.org/yum/redhat/6/mongodb-org/4.0/x86_64/RPMS/mongodb-org-server-4.0.10-1.el6.x86_64.rpm
wget https://repo.mongodb.org/yum/redhat/6/mongodb-org/4.0/x86_64/RPMS/mongodb-org-tools-4.0.10-1.el6.x86_64.rpm
rpm -ivh mongodb-org-server-4.0.10-1.el6.x86_64.rpm
rpm -ivh mongodb-org-tools-4.0.10-1.el6.x86_64.rpm
service mongod start
chkconfig mongod on


scl enable devtoolset-2 bash

mkdir /csmp; cd /csmp
git clone https://linux6200:umcewT9a@github.com/linux6200/CSMP-BE.git
git clone https://linux6200:umcewT9a@github.com/linux6200/CSMP-FE.git
cd /csmp/CSMP-BE
npm install  --unsafe-perm

cd /csmp/CSMP-FE
npm install
bower install --allow-root


echo '
127.0.0.1   csmpcollecter
127.0.0.1   csmpcollecter_pb
127.0.0.1   csmpserver
127.0.0.1   csmpdbserver
' >> /etc/hosts


