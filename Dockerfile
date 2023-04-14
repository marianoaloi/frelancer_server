FROM node:16.19
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY *.js ./
COPY public ./public
COPY routes ./routes
COPY views ./views
# COPY bin ./bin


RUN rm -rf node_modules
RUN npm i
# RUN npm i deasync
# If you are building your code for production
#RUN npm start --only=production

# Bundle app source
# COPY . .

VOLUME [ "/data/freelancer-server" ]
EXPOSE 30200


#CMD ["PORT=8845", "node", "bin/www" ]
CMD [ "PORT=30200;","node", "./www.js" ]