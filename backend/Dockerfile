FROM node:22-alpine AS development-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci 

FROM node:22-alpine AS production-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS build-env
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=development-dependencies-env /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=production-dependencies-env /app/node_modules ./node_modules
COPY --from=build-env /app/dist ./dist
CMD ["npm", "run", "start"]