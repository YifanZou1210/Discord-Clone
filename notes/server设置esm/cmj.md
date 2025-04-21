# Server 如何设置 ESM/CJS 疑点

下面从以下几个方面来拆解：

1. **`npm init -y` 与 ESM 默认行为**
2. **如何切换到 CommonJS（CJS）**
3. **为什么 ESM 更流行**
4. **CommonJS 的弊端**
5. **重点、难点与面试官关注**

---

## 1. `npm init -y` 与 ESM 默认行为

- **`npm init -y`** 只是快速生成一个带默认字段的 `package.json`，**并不会**自动把项目设置为 ESM。
- Node.js 判断模块类型主要看两点：
  1. **`package.json` 中的 `"type"` 字段**
     - `"type": "module"` → 所有 `.js` 文件按 ESM 加载
     - `"type": "commonjs"`（或不写） → 所有 `.js` 按 CJS 加载
  2. **文件扩展名**
     - `.mjs` 强制 ESM
     - `.cjs` 强制 CJS

> **举例**
>
> ```jsonc
> // package.json
> {
>   "name": "my-app",
>   "version": "1.0.0",
>   "type": "module" // ← 明确开启 ESM
>   // ...
> }
> ```
>
> 则 `import foo from './foo.js'` 就能运行；如果是默认模式（无 `"type"`），同样的语句会报错 “Unexpected token ‘export’”。

---

## 2. 如何切换到 CommonJS

假设你已经在 `package.json` 写了 `"type": "module"`，要改回 CJS，只需：

1. **移除或修改 `type` 字段**

   ```md
   { "type": "module",
   // 默认即 CommonJS，不需要写
   }
   ```

2. **确保你的文件用 `.js` 扩展名**（默认为 CJS），或者显式改名为 `.cjs`：

   ```md
   src/
   ├─ index.cjs ← CommonJS 强制
   └─ foo.cjs
   ```

3. **将 `import`/`export` 改回 `require`/`module.exports`**

   ```js
   // CommonJS 写法
   const express = require('express')
   const app = express()
   module.exports = app
   ```

> **自动化脚本**  
> 如果你想保留文件名 `.js`，但切回 CJS，也可以在 `package.json`：
>
> ```jsonc
> {
>   "type": "commonjs"
> }
> ```
>
> （注意：Node  目前只识别 `"module"` 或 `"commonjs"`，不写默认为 CommonJS）

---

## 3. 为什么 ESM 更流行

1. **浏览器原生支持**
   - 浏览器从很早就开始用 `<script type="module">` 原生加载 ESM，没有打包器时也能用。
2. **静态分析优化**
   - ESM 的 `import` / `export` 是**编译时静态**，打包器（Rollup、Webpack、Vite）能更好地做**Tree‑Shaking**（删除未引用代码）。
3. **一致性**
   - 前端和后端统一模块语法，减少大项目中两种风格混用的认知负担。
4. **未来标准**
   - ESM 是 ECMAScript 标准定义的一部分，社区与语言层面都推。

---

## 4. CommonJS 的弊端

| 特点         | CommonJS (CJS)                               | ESM                                          |
| ------------ | -------------------------------------------- | -------------------------------------------- |
| 加载方式     | 运行时同步 (`require()`)                     | 编译时静态 (`import`)，可异步加载 `import()` |
| Tree‑Shaking | 较差，打包器难以识别整个依赖链               | 出色，能剔除未用到的 `export`                |
| 互操作       | 从 CJS 调用 ESM 较麻烦，需要 `.default` 属性 | 互操作友好，可以静态或动态互相引用           |
| 浏览器兼容   | 需打包成 ESM 或 UMD 等                       | 现代浏览器原生支持，无需打包                 |

- **性能**：CJS 每次 `require` 都要执行模块初始化，不能静态优化。
- **代码体积**：对大型库做打包时，CJS 包往往更大。
- **场景切换**：在 .mjs/.cjs 混用或跨包调用时，常会遇到 `default` 问题和加载顺序问题。

---

## 5. 重点、难点与面试官关注

1. **重点**
   - `package.json` 的 `"type"` 字段控制默认模块类型
   - 文件扩展名 `.js` / `.mjs` / `.cjs` 的优先级
2. **难点**
   - ESM 与 CJS 混用时如何互相调用
   - 打包器配置（Webpack/Vite）下兼容旧版依赖
3. **面试官常问**
   - Tree‑Shaking 原理：为什么静态导入更好优化？
   - 为什么 Node.js 从 v13 开始原生支持 ESM 而不是放弃 CJS？
   - 在兼容库或迁移历史项目时有哪些坑？
