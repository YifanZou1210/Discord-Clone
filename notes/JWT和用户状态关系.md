# JWT Token 与用户状态的关系

## 一、JWT Token 与用户认证状态的关系

| 用户操作         | 服务器行为                                         | 客户端操作                                         | JWT 变化情况             |
| ---------------- | -------------------------------------------------- | -------------------------------------------------- | ------------------------ |
| **Sign Up 注册** | 创建新用户，立即生成并返回 `access token`          | 将 token 存储于 cookie（推荐）或 localStorage      | 新 token 被创建并存储    |
| **Login 登录**   | 验证用户凭证，生成新 token                         | 替换旧 token，存入 cookie 或 localStorage          | 新 token 替换旧 token    |
| **Token 仍有效** | 后端 middleware 检查 token 是否有效（解密 + 验签） | 携带 token 发起 API 请求（在 cookie 或 header 中） | token 被反复使用验证身份 |
| **Token 过期**   | 拒绝请求，返回 401 Unauthorized                    | 前端检测 401，自动跳转 login 页面                  | token 被废弃             |
| **Logout 登出**  | 清除 cookie / session，无需操作数据库              | 删除 localStorage 或清除 cookie 中的 token         | token 被废弃            |
| **Token 被篡改** | 验签失败，拒绝访问，返回 403 Forbidden             | 一般重新登录                                       | token 无效，需重新获取   |

### 疑问点解释
#### 1. Token 被废弃 Revoked的解释
- 服务器主动标记该Token无效
- 典型应用场景：用户登出、密码修改、管理员强制退出
- JWT默认无状态，不存储token状态，要实现废弃一般要配合黑名单 token blacklist 机制

> JWT是一个签名后的身份证明，只要JWT token有效,用户目前的状态就被视为已登录状态，一旦Token失效比如过期/废弃/篡改，用户就被视为未登录，所以我们所有需要认证后访问的接口比如 /profiles,/posts等都需要校验JWT token，一旦JWT校验失败就返回无法登录无法查看页面
> JWT有效的状态如下：
> - Token没过期
> - Token没废弃，比如黑名单
> - Token没被client丢失，localStorage保留

#### 2. 为什么JWT登录每次都要生成新Token替换旧Token
- **安全设计原则的需要**
  1. Token重放攻击风险：如果同一个 token 被多个设备或多个会话重复使用，一旦某个设备上的 token 泄露，攻击者就可以拿着老 token 不断发起请求。每次登录生成新 token，可以让旧 token 立即失效（配合黑名单 blacklist），即使旧 token 被截获也无法继续使用。
  2. 单点登录 Single Sign-On/Single Session
     1. 业务常见需求是一个账号同时只允许一处登录。
     2. 如何实现该业务？server在生成新 token 时，将旧 token 写入黑名单（如 Redis），校验时拒绝黑名单内的 token。
     3. 最后的实现效果：用户在新设备登录会“踢掉”旧设备，保证同一账号只留一个有效凭证。

如下是基于redis blacklist的伪代码，实现的是单点登录逻辑：
```js
// 伪代码：登录逻辑
async function login(req, res) {
// payload可扩展为{userId, role, iat, jti}
  const payload = { userId: user._id };
  //生成JWT签发Token，签名算法默认为HMAC-SHA256保证不能被伪造
  const newToken = jwt.sign(payload, SECRET, { expiresIn: '2h' });

  // 如果用户已有旧 token，取出当前用户上一次登录保存的token加入黑名单
  const oldToken = await redis.get(`token:${user._id}`);
  if (oldToken) {
    //将它加入到Redis Set中废弃旧token，防止多点登录
    await redis.sadd('jwt:blacklist', oldToken);
  }
  // 保存新 token
  await redis.set(`token:${user._id}`, newToken, 'EX', 2 * 3600);
  // 将新签发的token返回给前端前端负责存到localStorage或者cookies
  res.json({ token: newToken });
}

// 认证中间件
async function authMiddleware(req, res, next) {
  const token = req.header('Authorization').split(' ')[1];
  // 检查黑名单
  const isRevoked = await redis.sismember('jwt:blacklist', token);
  if (isRevoked) return res.status(401).send('Token revoked');
  // 验签过期
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).send('Invalid or expired token');
  }
}

```
- **`iat`(Issued At)时间戳的作用**
  1. 记录签发时间
     1. JWT的标准字段`iat`用于标注token签发时刻
     2. 每次生成新 token，`iat`都不同，可以用来区分老 token 和新 token。
  2. 基于`iat`的策略
     1. 强制更新策略：当用户修改密码或权限发生变化时，服务器可记录“允许的最低 iat”，比这个时间戳早的 token 都视为失效。
     2. Token 旋转（Rotation）：在短期有效的 access token 之外，配合更长期的 refresh token，每次刷新都生成新的 access token 并更新 iat，防止长时间 token 被滥用。
    TODOS: 详细解释Token旋转Rotation部分如何实现
  3. 常见优化方案如下

| 方案         | 优点         | 缺点            | 
| ------------- | ---------------- | ------------------- |
| 每次登录都生成新token  | 简单直接，可用黑名单立即废弃旧Token | 需要维护黑名单，存储和查表开销| 
| Access/Refresh Token分离 | Access短时有效，Refresh长时有效，提升安全性| 实现更复杂，需要refresh token状态  | 
| Token本身不存储状态| 无需server存储，水平拓展容易 |只能依赖过期时间，到期主动立即失效|

对于中小型项目，用“每次登录生成新 token + Redis 黑名单”已经足够。对于大规模系统，建议采用“Access/Refresh Token”组合，并在刷新时处理旋转和废弃。

#### 3. server端如何感知Token过期/失效/被废弃？
1. **过期** - 服务器server可以自动检测exp
   1. `exp`字段含义
      - JWT标准字段 `exp` expiration time是一个unix时间戳，代表token在之后不再有效
      - 格式如下
      ```jsonc
        {
          "sub": "userId123",
          "iat": 1690000000,
          "exp": 1690003600   // 1 小时后过期
        }
      ```
   2. 验证流程
      1. 调用 `jwt.verify(token, secret) `时，库内部会
         1. 解码header和payload
         2. 根据secret重新计算sign，与token中的签名比对
         3. 检查`exp`是否大于当前时间戳
2. **签名篡改** - 服务器可以自动检测
   1. 篡改场景：攻击者修改了 payload（比如提升权限）或 header（如算法字段），但未持有正确的 SECRET。
   2. 验证流程
      1. jwt.verify 会重新用 SECRET 计算签名，若与 token 中不匹配，抛出 JsonWebTokenError。
      2. 核心原理： HMAC-SHA256（或指定算法）保证完整性。
3. **被废弃token** - 默认无法检测，需要额外机制
   1. **为什么server无法感知**
      1. JWT 本身是无状态的（stateless），服务器不保存任何已签发 token 的记录。
      2. 即使 token 未过期、签名合法，服务器也不会自动拒绝“被手动废弃”的旧 token。
   2. **实现方案**
      1. ***Token黑名单***：将需要废弃的token ID或者或者整个token字符串放入redis/db的集合set/table
         1. 验证流程
            1. 解码并验证签名jwt.verify
            2. 从payload去除jti或者原token
            3. 查询redis: `SISMEMBER blacklist jti`
            4. 若存在则拒绝访问
      2. ***短时有效+刷新机制***
         1. 思路
            1. Access Token 设置较短过期（如15分钟），过期后必须用 Refresh Token（长期有效）去换新的 Access Token。
            2. Refresh Token 同样可废弃（存数据库），但废弃频次低于 Access Token。
         2. 优点
            1. Access Token 即使泄露，其可用窗口很短；
            2. 不需要黑名单管理大量短期 token，只需对 Refresh Token 建表。
         3. 缺点
            1. 实现复杂度提升，需要两个端点：/auth/refresh 和 /auth/logout。
4. **其他注意事项和优化方案**
   1. 异常处理：务必细化错误类型，区分“签名异常”与“过期异常”，便于前端展示不同提示。
   2. Header 严谨校验：需先检测 Authorization 是否存在，再做 split，否则可能抛出未定义错误。
   3. 黑名单清理：可以给每条废弃的 token 设置与 JWT 相同的过期时间，定期由 Redis 自动清理，避免无效堆积。
   4. 性能优化
      1. 若黑名单条目较多，可用 Bloom Filter 或 Redis Hash 替代 Set。
      2. 对极高 QPS 系统，可考虑减少黑名单查验频率，例如只在登录/登出相关接口做校验，其他接口只验签。

#### 4. 其他Authentication是否也有Token失效=登录状态终结的逻辑
是的，本质一致，只要是Authentication,本质都是
用户获得凭证（token/session）→ 携带凭证访问受保护资源 → 凭证失效=重新认证


---

## 二、Token 存储方式与生命周期设计

| 存储方式          | 优点                       | 缺点                           | 场景推荐          |
| ----------------- | -------------------------- | ------------------------------ | ----------------- |
| `HttpOnly Cookie` | 安全，防止 XSS，服务器可控 | 跨域配置复杂，受 SameSite 限制 | SSR、Web 安全首选 |
| `localStorage`    | 易操作，适合 SPA 和移动端  | 容易被 XSS 攻击读取            | 小型或移动端应用  |
| `sessionStorage`  | 页面关闭即失效，适合短会话 | 无法跨页面持久化               | 简单系统          |

---

## 三、JWT 生命周期控制（Token 到底多久失效）

JWT 的设计核心是“**无状态认证**”，常见方案：

### 1. **Access Token + Expire Time**

```js
jwt.sign(payload, secret, { expiresIn: '15m' })
```

- 设置 token 生命周期为 15 分钟。
- token 到期后，客户端收到 401 需要重新登录。

### 2. **Access Token + Refresh Token（推荐）**

| 类型          | 生命周期         | 存储位置            | 作用                                          |
| ------------- | ---------------- | ------------------- | --------------------------------------------- |
| Access Token  | 短（15~30 分钟） | cookie/localStorage | 每次请求都携带，用于验证用户身份              |
| Refresh Token | 长（7 天~30 天） | `HttpOnly Cookie`   | 用于后台偷偷换取新的 access token（静默续期） |

#### Refresh Token 刷新流程

```text
[用户发请求] → [Access Token 过期] → 返回 401 →
[客户端静默发送 Refresh Token] → 后端验证 → 颁发新 Access Token
```

---

### 示例：不同场景下的 JWT 状态（时序图）

```text
[User]           [Browser]                   [Server]
   ↓                  ↓                          ↓
点击注册     →   POST /signup   →   创建新用户 + 生成 JWT
   ↓                  ←----------  Set-Cookie: jwt=xxxxx
刷新页面     →   自动附带 cookie  →   Middleware 验证 token
   ↓                  ↓                          ↓
token 有效  →   允许访问私有资源
token 失效  →   返回 401 → 跳转登录页面
用户点击登出 →  清除 cookie 或 localStorage
```

## 四、实践建议：如何做得更健壮？

| 问题           | 推荐做法                                     |
| -------------- | -------------------------------------------- |
| Token 被篡改   | JWT 使用强加密算法（如 HS256） + 密钥保护    |
| Token 泄露     | 使用 `HttpOnly` cookie 避免 XSS              |
| Token 被滥用   | Access Token 设置短过期 + IP/UA 检查         |
| 自动续签 Token | 配置 Refresh Token，隐藏于 secure cookie     |
| 多端登录管理   | Redis 存储 token 列表，实现 token 黑名单机制 |

---

## 五、总结

> JWT 是一种**无状态的身份认证机制**，登录或注册后生成 token 表示“你是谁”；token 失效即登录状态失效，必须重新获取才能继续访问受保护的资源。
