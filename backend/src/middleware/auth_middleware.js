import jwt from "jsonwebtoken"
import User from "../models/user_model.js"

export const protectRoute = async (req, res, next) => {
  try {
    // 这里的req.cookies.jwt需要和前端内部cookies命名一致
    const token = req.cookies.jwt

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" })
    }
    // 使用jwtwebtoken.verify解析并验证token
    // - secret 存在env中确保key不泄露
    // - verify若失败（过期/篡改）会抛出异常
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // decoded结果是 {userId: "...", iat:xxx, exp: xxx, ...}
    
    // 检查decoded是否有效
    // - 通常 verify() 要么返回 payload，要么抛异常，不会返回 falsy
    // - 但这里做额外保险检查
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" })
    }

    // 在 Mongoose 的 Query.prototype.select() 方法中：不带符号（如 'email fullName'）表示 只包含 这些字段，其他字段全部省略。
    // 带 - 前缀（如 '-password'）表示 排除 该字段，其他字段全部包含
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    req.user = user

    next()
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message)
    res.status(500).json({ message: "Internal server error" })
  }
}