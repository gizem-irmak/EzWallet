FROM node:18
WORKDIR /app

ADD package*.json /app/

RUN npm install

ADD . /app

ENV WAIT_VERSION 2.7.2
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/$WAIT_VERSION/wait /wait
RUN chmod +x /wait

CMD /wait && npm run test:coverage

# FROM node:14
# WORKDIR /app
# COPY . /app
# RUN rm -rf node_modules
# RUN npm install
# CMD [ "npm", "run", "test:coverage" ]