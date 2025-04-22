import express from 'express'
import { signup, login, logout, updateProfile, checkAuth } from '../controllers/auth_controller.js'
import { protectRoute } from '../middleware/auth_middleware.js'
const router = express.Router()



router.post("/signup", signup)
// 具体处理逻辑放在controller中设置
// (req, res) => {
// res.send('signup router')}
router.post('/login', login)
router.post('/logout', logout)
// protectRoute唯一功能是校验请求携带的JWT是否合法不关心请求的业务含义只做鉴权
router.put("/update-profile", protectRoute, updateProfile)

// 一般前端SPA中往往需要在页面初始化或者刷新时去后端确认当前用户是否已登陆
// 这个checkAuth轻量接口允许client感知server最新用户状态，避免在每次页面加载的时候都先调用登录接口活着手动解析localstorage
// 如果不提供它就需要前端自己保全本地状态，状态丢失或者token意外清除时用户体验容易崩溃
// checkAuth 专门用于“探测当前这一次请求的用户状态”，无论是user还是admin，不会也不应一次性返回多个用户。
router.get("/checkauth", protectRoute, checkAuth)

export default router
