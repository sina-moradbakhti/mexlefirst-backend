FROM node:23-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY .env.production .env.production

RUN npm run build

EXPOSE 3001

CMD ["npm", "run" ,"start:prod"]