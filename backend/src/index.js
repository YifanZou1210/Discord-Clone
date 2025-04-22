import express from 'express'
import authRoutes from './routes/auth_routes.js'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import { connectDB } from './lib/db.js'
dotenv.config()
const app = express()
const PORT = process.env.PORT

app.use(express.json())
app.use(express.urlencoded({ extended: true })) // 如需表单
app.use(cookieParser())
app.use('/api/auth', authRoutes)

//app.listen() 的作用就是启动 HTTP 服务器，让你的应用开始在指定的 端口（和可选的主机地址）上监听 传入的请求。
app.listen(PORT || 8080, () => {
  console.log(`server is running on`, process.env.PORT)
  connectDB()
})