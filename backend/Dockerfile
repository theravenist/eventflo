FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# Create folder for local banners mock uploads
RUN mkdir -p public/uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
