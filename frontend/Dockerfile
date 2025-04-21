# ─── Stage 1: 构建静态文件 ─────────────────
FROM node:23-alpine3.21 AS builder
WORKDIR /app

# 利用缓存：先拷依赖声明
COPY package*.json ./
RUN npm ci

# 拷贝剩余源码并构建
COPY . .
RUN npm run build        # 输出目录默认为 /app/dist

# ─── Stage 2: Nginx 托管 ───────────────────
FROM nginx:stable-alpine
# 可选：自定义 nginx 配置
# COPY nginx.conf /etc/nginx/nginx.conf

# 将构建产物复制到 Nginx 的静态根目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
