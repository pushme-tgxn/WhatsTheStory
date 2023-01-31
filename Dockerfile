FROM node:16-bullseye

# copy and install app
RUN mkdir -p /usr/src/app

COPY ./index.js /usr/src/app
COPY ./package.json /usr/src/app
COPY ./package-lock.json /usr/src/app

WORKDIR /usr/src/app
RUN npm install

ENTRYPOINT ["npm", "start"]
