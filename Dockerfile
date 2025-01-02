FROM --platform=linux/amd64 ubuntu:22.04

#FROM --platform=linux/amd64 pdal/pdal:latest

RUN apt update && apt install -y curl pdal gdal-bin

RUN curl -sL https://deb.nodesource.com/setup_20.x -o node_setup.sh && \
bash node_setup.sh && \
apt install -y nodejs 

# create non-root node user?
# useradd -ms /bin/bash node
# USER node
# RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app


WORKDIR /app

COPY package*.json /app
COPY client/package*.json /app/client/
COPY server/package*.json /app/server/

RUN npm install --omit=dev

COPY . /app

RUN npm run build

CMD ["npm", "start"]
