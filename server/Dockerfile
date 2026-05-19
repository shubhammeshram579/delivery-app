# FROM node:20-alpine
# WORKDIR /app
# RUN apk add --no-cache dumb-init
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN mkdir -p logs uploads
# EXPOSE 5000
# ENTRYPOINT ["dumb-init", "--"]
# # CMD ["sh", "-c", "npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && npm run dev"]
# CMD ["sh", "-c", "npx sequelize-cli db:migrate && npm run dev"]
# # CMD ["npm", "run", "dev"]


FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p logs uploads

EXPOSE 5000

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "-c", "npx sequelize-cli db:migrate && npm run dev"]