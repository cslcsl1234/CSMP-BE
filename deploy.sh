#wget http://dl.fedoraproject.org/pub/epel/6/x86_64/epel-release-6-8.noarch.rpm
#rpm -ivh epel-release-6-8.noarch.rpm

wget https://nodejs.org/dist/v10.14.1/node-v10.14.1-linux-x64.tar.gz
tar -zxvf node-v10.14.1-linux-x64.tar.gz -C /opt

echo "export PATH=$PATH:/opt/node-v10.14.1-linux-x64/bin" >> /etc/profile
. /etc/profile

wget http://people.centos.org/tru/devtools-2/devtools-2.repo -O /etc/yum.repos.d/devtools-2.repo
yum install devtoolset-2-gcc devtoolset-2-binutils devtoolset-2-gcc-c++ -y

git clone https://linux6200:umcewT9a@github.com/linux6200/CSMP-BE.git
cd CSMP-BE
scl enable devtoolset-2 bash

npm install  --unsafe-perm
 


