import User from "../models/user_model.js"                   // 导入 User 模型，用于操作用户集合
import Message from "../models/message_model.js"             // 导入 Message 模型，用于操作消息集合
import cloudinary from "../lib/cloudinary.js"                // 导入 Cloudinary 库，用于 Base64 图片上传
import { getReceiverSocketId, io } from "../lib/socket.js"
// 导入 Socket 工具：获取接收方 socketId 及 io 实例

/** 当前用户在线接收侧边栏用户信息逻辑
 * getUsersForSidebar：获取侧边栏用户列表
 * - 排除当前登录用户，返回所有其他用户的基本信息
 */
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id
    const filteredUsers = await User
      // IDEAS[2025-04-22 12:53]: 优化方案： 1. 使用lean 2.如果用户量大分页加载 3. 缓存加载 4. 错误与空值处理
      .find({ _id: { $ne: loggedInUserId } })
      // 查找 _id 不等于当前用户 ID 的所有文档， $ne是not equal不等于，
      .select("-password")
    // 排除 password 字段，避免敏感信息泄露
    res.status(200).json(filteredUsers)
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message)
    res.status(500).json({ error: "Internal server error" })
  }
}

/** 当前用户接收消息逻辑
 * getMessages：获取当前用户与指定用户之间的聊天记录
 * - 支持双向查询：发送者和接收者可互换
 */
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params
    // 从 URL 参数读取 面向聊天的用户 ID
    const myId = req.user._id
    // 从 req.user 获取 当前登录用户 ID

    const messages = await Message
      // 创建message在mongoDB中
      .find({
        // 查询 Message 集合
        $or: [
          // 使用 $or 操作符合并两个查询条件
          { senderId: myId, receiverId: userToChatId },
          // 条件1：我发给对方的消息来寻找
          { senderId: userToChatId, receiverId: myId },
          // 条件2：对方发给我的消息来寻找
        ],
      })
    res.status(200).json(messages)
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message),// 打印错误日志
      res.status(500).json({ error: "Internal server error" })
  }
}

/** 当前用户发送消息逻辑
 * sendMessage：发送一条新消息
 * - 支持文本与图片二合一；图片为 Base64 字符串时上传到 Cloudinary
 * - 保存到数据库后，通过 Socket.io 实时推送给接收者（如果在线）
 */
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body
    // 从请求体解构出 text（文本）和 image（Base64 字符串）
    const { id: receiverId } = req.params
    // 从 URL 参数读取接收方用户 ID
    const senderId = req.user._id
    // 从 req.user 获取发送方（当前登录用户）ID

    let imageUrl
    // 定义变量存储上传后返回的图片 URL
    if (image) {
      // 如果请求中包含图片
      const uploadResponse = await cloudinary.uploader.upload(image)// 将 Base64 图片上传至 Cloudinary
      imageUrl = uploadResponse.secure_url
      // 获取上传后返回的 HTTPS 安全链接
    }
    const newMessage = new Message({   // 创建新的 Message 文档实例
      senderId,                        // 设置发送者 ID
      receiverId,                      // 设置接收者 ID
      text,                            // 设置消息文本
      image: imageUrl,                 // 设置图片 URL（如有）
    })

    await newMessage.save()
    // 将新消息保存到 MongoDB
    const receiverSocketId = getReceiverSocketId(receiverId)
    // socket.io提供的方法，根据接收者 ID 获取其当前的 Socket.io 连接 ID
    if (receiverSocketId) {
      // 如果接收者在线（有 socketId）就发送myid发送的消息
      io.to(receiverSocketId).emit("newMessage", newMessage)
      // 通过 Socket.io 向接收者推送 "newMessage" 事件和消息内容
    }
    res.status(201).json(newMessage)
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message)
    res.status(500).json({ error: "Internal server error" })
  }
}
