FROM node:6.9.0

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --unsafe-perm --registry=https://registry.npm.taobao.org

RUN npm install grunt -g

# Copy app source code
COPY . .

#Expose port and start application
EXPOSE 8080
CMD [ "npm","start" ]
