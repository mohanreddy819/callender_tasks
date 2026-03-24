FROM node:alpine AS builder

WORKDIR /app

COPY ./package.json .

RUN npm install

ENTRYPOINT [ "npm", "run", "build" ]

COPY . .

FROM nginx:alpine

WORKDIR /app

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
