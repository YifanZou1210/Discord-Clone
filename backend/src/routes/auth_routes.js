import express from 'express'
import { signup } from '../controllers/auth_controller.js'
import { protectRoute } from '../middleware/auth_middleware.js'
const router = express.Router()



router.post("/signup", signup)
// 具体处理逻辑放在controller中设置
// (req, res) => {
// res.send('signup router')}
// router.post('/login', login)
// router.post('/logout', logout)
// router.put("/update-profile", protectRoute, updateProfile)
// router.get("/check", protectRoute, checkAuth)
export default router