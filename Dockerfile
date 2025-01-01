FROM --platform=linux/amd64 ubuntu:22
#FROM --platform=linux/amd64 pdal/pdal:latest

# install nodejs, pdal, gdal
RUN apt update && \
apt install -y curl && \
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
apt-get install -y nodejs pdal gdal

# create non-root node user?
# useradd -ms /bin/bash node
# USER node
# RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app


# WORKDIR /app

# COPY package*.json ./
# COPY server .
# COPY dist .

# RUN npm install
# RUN npm run build

# CMD ["node", "server.js"]
