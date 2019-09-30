FROM node

WORKDIR /code

COPY package.json /code/
COPY package-lock.json /code/
COPY ./public/ /code/public/
COPY ./src/ /code/src/

RUN npm install

CMD npm start
