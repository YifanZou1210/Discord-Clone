import jwt from "jsonwebtoken";  // 导入 jsonwebtoken 库，用于生成和验证 JWT
/**
 * generateToken：生成 JWT 并通过 Cookie 返回给客户端
 * @param {string} userId - 用户在数据库中的唯一标识 (User’s unique ID)
 * @param {object} res    - Express 的响应对象 (Express response object)
 * @returns {string} token - 生成的 JWT 字符串 (Signed JWT)
 */
export const generateToken = (userId, res) => {
  // ────────────────────────────────────────────────────────
  // 1. 生成 Token (Sign the token)
  // ────────────────────────────────────────────────────────
  // jwt.sign(payload, secretOrPrivateKey, [options, callback])
  // - payload: 放入 token 的有效载荷，这里只放 userId
  // - secretOrPrivateKey: 用于签名的密钥，通常保存在环境变量中
  // - options.expiresIn: token 的过期时间，这里设为 7 天
  const token = jwt.sign(
    { userId },                     // 有效载荷 (Payload)
    process.env.JWT_SECRET,         // 签名密钥 (Secret key)
    { expiresIn: "7d" }             // 7 天后过期 (Expires in 7 days)
  );

  // ────────────────────────────────────────────────────────
  // 2. 设置 Cookie (Set the cookie)
  // ────────────────────────────────────────────────────────
  // 传输方式http-only cookies,当前后端同域或者配置好cors时推荐这种方式来存储访问token减轻xss风险
  // 也可以将token返回在json return中由前端存到localstorage或sessionstorage然后每次在authentication:bearer头中发送
  // res.cookie(name, value, [options])
  // - maxAge: Cookie 存活时长，单位毫秒 (Duration in ms)
  // - httpOnly: true 阻止客户端 JavaScript 访问，减轻 XSS 风险
  // - sameSite: 'strict' 严格同源策略，减轻 CSRF 风险
  // - secure: true 只在 HTTPS 连接时发送，避免明文传输
  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,      // 7 天 = 7×24×60×60×1000 ms
    httpOnly: true,                      // 只能被服务器读/写，客户端脚本无法访问
    sameSite: "strict",                  // 严格同源，浏览器不随跨站请求发送 Cookie
    secure: process.env.NODE_ENV !== "development" 
    // 非开发环境下强制 HTTPS 传输
  });
  // 注意：即使 payload、secret 相同，只要生成时间不同，token 就不同。这是 JWT 的特性，保证每个 token 是一次性的、不可伪造的、可追踪的

  // ────────────────────────────────────────────────────────
  // 返回 token，以备其他业务逻辑（如在响应体中也返回）使用
  // ────────────────────────────────────────────────────────
  return token;
};


