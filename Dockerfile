
# ---------------
# Install Dependencies
# ---------------
FROM node:16-alpine as build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --network-timeout 1000000

# ---------------
# Build App
# ---------------

COPY . .

RUN yarn build

# ---------------
# Install Production Dependencies
# ---------------

FROM node:16-alpine as deps

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --production --network-timeout 1000000

# ---------------
# Release App
# ---------------
FROM node:16-alpine as final

WORKDIR /app

# Copy package files
COPY --from=build /app/package.json ./
COPY --from=deps /app/node_modules/ ./node_modules

# Copy build files
COPY --from=build /app/dist/ ./dist

# Start the app
CMD [ "yarn", "start:prod" ]