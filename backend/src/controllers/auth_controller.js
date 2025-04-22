import { generateToken } from "../lib/utils.js"
import User from "../models/user_model.js"
import bcrypt from "bcryptjs"
import cloudinary from "../lib/cloudinary.js"

// 注册逻辑
export const signup = async (req, res) => {
  // ------ 得到请求体数据： 从请求中解构赋值得到请求post的数据
  const { fullName, email, password } = req.body
  try {
    // 1. 检查要求数据是否存在
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }
    // 2. 检查密码是否valid
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }
    // ------ 检查db是否存在用户
    const user = await User.findOne({ email })
    if (user) return res.status(400).json({ message: "Email already exists" })
    // hash password - 加盐哈希法 salted hash
    // 创建salt，参数 10 表示 cost factor（成本因子）或 salt rounds
    const salt = await bcrypt.genSalt(10)
    // 用生成好的 salt 对明文密码做哈希
    const hashedPassword = await bcrypt.hash(password, salt)
    // ------ 创建新用户
    const newUser = new User({
      fullName: fullName,
      email: email,
      password: hashedPassword,
    })
    // 如果用户保存到db成功，我们需要返回client token
    if (newUser) {
      // 创建与用户绑定的jwt token
      generateToken(newUser._id, res)
      await newUser.save()
      res.status(201).json({
        _id: newUser._id, //MongoDB（通过 Mongoose）自动为每条文档生成的不显式声明的主键
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      })
    } else {
      res.status(400).json({ message: "Invalid user data" })
    }
  } catch (error) {
    console.log("Error in signup controller", error.message)
    res.status(500).json({ message: "Internal Server Error" })
  }
}
// 登录逻辑
// 登录时无需带 token；登录成功后你才获得 token。此后，你才在请求中通过 Authorization: Bearer token 或 cookie 来证明你是谁。
export const login = async (req, res) => {
  // 登录在mongoDB中检查是否target email存在
  const { email, password } = req.body
  try {
    const user = await User.findOne({ email })
    // email用户是否存在
    if (!user) {
      return res.status(400).json({ message: "email not existed" })
    }
    // password在email存在情况下是否正确
    const isPasswordCorrect = await bcrypt.compare(password, user.password)
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid passwords for current email" })
    }
    // 生成新token并通过cookies返回前端
    generateToken(user._id, res)

    res.status(200).json({
      _id: user._id,//从mongoDB中根据email检索到的
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    })
  } catch (error) {
    console.log("Error in login controller", error.message)
    res.status(500).json({ message: "Internal Server Error" })
  }
}

// 登出逻辑
// 1. 由于我们使用httpOnly cookie, loggout时只需要后端控制前端不必要操作
// 2. 如果使用 localstorage, 登出时前后端都必须清除否则存在xss风险，不用localstorage存储敏感token特别是带权限信息的access token
// 3. 在无状态的JWT方案中，登出只需要在client/server端清除cookies不必再次发送token
// 4. 如果实现了token撤销(黑名单)或者refresh token旋转策略，那么登出时需要将当前token发送给服务器以便服务器标记为已失效
export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 })
    res.status(200).json({ message: "Logged out successfully" })
  } catch (error) {
    console.log("Error in logout controller", error.message)
    res.status(500).json({ message: "Internal Server Error" })
  }
}
// 更新profile逻辑
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body
    const userId = req.user._id

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" })
    }

    // 上传到 Cloudinary
    //    - cloudinary.uploader.upload 会把图片推送到云端存储
    //    - 返回值 uploadResponse 包含 secure_url、public_id 等信息
    // ─────────────────────────────────────────────────────────────
    const uploadResponse = await cloudinary.uploader.upload(profilePic)
    // uploadResponse.secure_url 是 HTTPS 安全链接，用作用户头像地址

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },//更新内容：新头像
      { new: true }
    )

    res.status(200).json(updatedUser)
  } catch (error) {
    console.log("error in update profile:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const checkAuth = (req, res) => {
  try {
    // 将protectRoute挂载的req.user已经验证的用户信息原封不动的返回给前端
    // 目的是确认client持有的JWT的合法性，并把当前用户的非敏感信息
    res.status(200).json(req.user)
  } catch (error) {
    console.log("Error in checkAuth controller", error.message)
    res.status(500).json({ message: "Internal Server Error" })
  }
}