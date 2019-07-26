FROM node:10.16-alpine
MAINTAINER brandon.davis@kitware.com

RUN npm install yarn

# Install dependencies via yarn
# - Only copying in a minimum of source files that specify deps so as to not
#   cache-invalidate this layer unless deps change.
COPY package.json yarn.lock /tdm/
RUN yarn config set registry "https://registry.npmjs.org/" \
 && yarn --cwd /tdm

COPY src/utils /tdm/src/utils
COPY cli /tdm/cli

WORKDIR /tdm/cli

# https://github.com/npm/uid-number/issues/3
ENTRYPOINT ["node"]
