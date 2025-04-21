import { generateToken } from "../lib/utils.js"
import User from "../models/user_model.js"
import bcrypt from "bcryptjs"
// import cloudinary from "../lib/cloudinary.js"

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

// export const login = async (req, res) => {
//   const { email, password } = req.body
//   try {
//     const user = await User.findOne({ email })

//     if (!user) {
//       return res.status(400).json({ message: "Invalid credentials" })
//     }

//     const isPasswordCorrect = await bcrypt.compare(password, user.password)
//     if (!isPasswordCorrect) {
//       return res.status(400).json({ message: "Invalid credentials" })
//     }

//     generateToken(user._id, res)

//     res.status(200).json({
//       _id: user._id,
//       fullName: user.fullName,
//       email: user.email,
//       profilePic: user.profilePic,
//     })
//   } catch (error) {
//     console.log("Error in login controller", error.message)
//     res.status(500).json({ message: "Internal Server Error" })
//   }
// }

// export const logout = (req, res) => {
//   try {
//     res.cookie("jwt", "", { maxAge: 0 })
//     res.status(200).json({ message: "Logged out successfully" })
//   } catch (error) {
//     console.log("Error in logout controller", error.message)
//     res.status(500).json({ message: "Internal Server Error" })
//   }
// }

// export const updateProfile = async (req, res) => {
//   try {
//     const { profilePic } = req.body
//     const userId = req.user._id

//     if (!profilePic) {
//       return res.status(400).json({ message: "Profile pic is required" })
//     }

//     const uploadResponse = await cloudinary.uploader.upload(profilePic)
//     const updatedUser = await User.findByIdAndUpdate(
//       userId,
//       { profilePic: uploadResponse.secure_url },
//       { new: true }
//     )

//     res.status(200).json(updatedUser)
//   } catch (error) {
//     console.log("error in update profile:", error)
//     res.status(500).json({ message: "Internal server error" })
//   }
// }

// export const checkAuth = (req, res) => {
//   try {
//     res.status(200).json(req.user)
//   } catch (error) {
//     console.log("Error in checkAuth controller", error.message)
//     res.status(500).json({ message: "Internal Server Error" })
//   }
// }