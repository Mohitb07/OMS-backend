FROM node:18-alpine

RUN mkdir -p /app

WORKDIR /app

COPY package*.json ./

COPY . .

RUN yarn install
RUN yarn

EXPOSE 3000

CMD ["yarn", "start"]