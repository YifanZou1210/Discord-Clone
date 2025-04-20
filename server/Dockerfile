FROM node:23-alpine3.21
WORKDIR /usr/src/app

# 1. 缓存依赖
COPY package*.json ./
RUN npm ci

# 2. 拷贝代码
COPY . .

# 3. 声明端口（文档化）
EXPOSE 5000

# 4. 启动命令
CMD ["node", "index.js"]
