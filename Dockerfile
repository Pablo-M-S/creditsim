FROM node:22-alpine

RUN apk add --no-cache vips-dev git

WORKDIR /opt/app

COPY app/package*.json ./
RUN npm install

COPY app ./

EXPOSE 7870

CMD ["npm", "run", "develop"]
