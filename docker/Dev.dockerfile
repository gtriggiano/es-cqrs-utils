FROM node:argon-slim

WORKDIR /package

ADD package.json package.json
RUN npm install

# Add node_modules/.bin to PATH
ENV PATH "/package/node_modules/.bin:${PATH}"
