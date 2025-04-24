# MPA 和 SPA 详解

以下示例演示了一个极简的 SPA 与传统 MPA 在网络请求流程上的对比，并通过一段手写路由＋数据加载的 Demo，帮助你直观理解“为什么 SPA 只需要一次完整页面请求，后续只发数据请求”。

---
## 前置知识: MPA的起源
首先我们应该要知道SSR和MPA作为最早的 Web 发展有几个背景因素，促成了“多页应用（MPA）＋服务器端渲染（Server-Side Rendering，SSR）”成为主流：
最早的 Web 发展有几个背景因素，促成了“多页应用（MPA）＋服务器端渲染（Server-Side Rendering，SSR）”成为主流：  
### 1、浏览器与客户端能力有限
1. **JavaScript 引擎尚未成熟**  
   - 早期浏览器（Netscape Navigator、IE4）对 JavaScript 支持弱，运行速度慢，不适合在客户端做大量逻辑或视图拼装。  
2. **网络带宽、CPU 都很受限**  
   - 客户端设备（台式机、老式笔记本）性能不高，带宽窄，下载和执行大段脚本会严重拖慢体验。
因此，**把 HTML 页面在服务器端一次性渲染好**，只需浏览器 **发一次 HTTP 请求、拿到完整 HTML**，再解析渲染，用户即可看到页面，不依赖客户端能力，体验更可控。

### 2、MPA 模式的天然契合
1. **每个 URL 对应一个 HTML 文档**  
   - 用户访问 `/about.html`、`/contact.html`，服务器就分别返回 `about.html`、`contact.html`。  
2. **并发用户无需占用太多服务器资源**  
   - 渲染只发生在请求时，渲染完成后断开，**服务器保持线程/进程池短暂占用后回收。**
     - 在这里解释一下后端对于MPA+SSR架构中HTTP请求过程中的操作细节
       - 首先server会从线程池 thread pool或者进程池中拿出一个工作线程 worker thread, 或者工作进程 worker process
       - 用该工作线程去执行渲染：把模版+数据渲染成完整的HTML
       - 把渲染结果通过dbconnection返回client
       - render和response完成后关闭该connection，并将线程/进程归还给线程池以便下一期请求使用
     - 那么为什么在这里说server保持线程/进程短暂占用后回收？
       - 短时占用：因为在MPA模式下每个请求只在render时占用一个thread/process, render后马上释放
       - 线程池复用:假设池中有50个线程，就最多同时handle50个并发请求，一旦渲染结束这个线程可接手新的请求
       - 无需长连接：与websocket不同，SSR渲染完就断开，不会持续占用资源
     - 就SPA而言，首次访问仅需后端返回index.html+JS/CSS bundle一般由CDN托管
       - 后续导航走API：client通过fetech或者axios调用后端REST API或者GraphQL端点，返回JSON数据不在生成完整HTML
       - 连接模型：API也是短链接HTTP/1.1 keep-alive或者HTTP/2,执行完成返回后释放资源
       - 资源开销：渲染成本在客户端完成，后端只需处理轻量级的请求和业务校验，API端点可集群化，微服务化，更易做水平拓展，更灵活
       - 但是缺点是首次加载需要下载大量JS首屏慢，需要前端路由、状态管理、错误处理等额外逻辑
     - 对于MPA和SPA的最佳时间和选择方案
       - MPA场景
         - 如果对于内容性或者SEO导向的站点，继续使用SSR，静态内容用SSG static site generation部署
         - 开启模版缓存、页面缓存 cache-control、反向代理如Varnish, Nginx减少渲染压力
       - SPA场景
         - 静态资源部署到CDN，API服务器独立部署，启动无状态实例，配合自动扩缩容
         - 在高并发数据请求时，使用redis缓存热点数据，graphQL dataloader 缓解数据库压力
         - 对关键页面可以引入混合模式 SSR/SSG+CSR, 兼顾首屏性能和交互体验
3. **基于模板引擎快速开发**  
   - CGI、PHP、JSP、ASP 等技术栈天然支持在服务器端写模板（Template），把数据渲染到 HTML，然后发送给浏览器。

这种方式的**优点**在于：

- **SEO 友好**：页面内容对搜索引擎即时可见，无需额外爬虫渲染。  
- **首屏速度可控**：只要服务器性能足够，响应 HTML 能快速呈现页面。  
- **开发模式成熟**：模板引擎、数据库、MVC 框架在服务器端生态早已完善。

---

### 3、从 SSR 到 CSR 的演进
随着浏览器能力提升、网络提速，前端框架（如 Angular、React、Vue）兴起，人们开始把更多逻辑挪到客户端（Client-Side Rendering，CSR）：
1. **CSR（Client-Side Rendering）**  
   - 首次加载一个最小 HTML + 大量 JS Bundle，JS 运行后在客户端拼装视图。  
   - 典型工具：Create React App、Vue CLI。  
2. **Progressive Enhancement**  
   - 页面先做 SSR 保证快速可视，随后客户端加载框架再“hydrate”变成交互式应用。  
   - 典型框架：Next.js、Nuxt.js 支持 **SSR + CSR 混合**，兼顾 SEO、首屏性能和单页体验。

---

## 四、为什么最原始都是 SSR？

1. **技术门槛低**  
   - 服务器端渲染只要写好模板，插数据就行，不用考虑复杂的前端打包、路由拦截、异步状态管理。  
2. **一致性与安全**  
   - 所有渲染逻辑在服务器掌控，客户端无法篡改视图结构，安全性更高。  
3. **架构简单**  
   - MPA＋SSR 模式下，前端只关心 HTML 和少量脚本，后端负责所有业务和视图渲染，职责分工清晰。

---

## 五、示例对比

|               | MPA + SSR                                       | SPA + CSR                                          |
|---------------|-------------------------------------------------|----------------------------------------------------|
| 初次请求      | `GET /home` → 返回完整 `home.html`              | `GET /index.html` + JS → 客户端拼装 Home 视图       |
| 后续导航      | `GET /about` → 返回完整 `about.html`            | JS 拦截 `<Link>`，`fetch /api/about-data` + 渲染   |
| SEO           | 原生支持，搜索引擎可直接抓取                     | 需用预渲染（Prerender）或 SSR 模式                 |
| 首屏性能      | 服务器渲染 + 小 HTML                              | 需要下载并执行大包 JS，首屏延迟较高                  |
| 开发复杂度    | 模板 + 后端语言（PHP/Java/C#…）                  | 前后端分离、打包配置、路由中间件、状态管理等         |

---

### 小结

- **最原始的 Web** 就是 **MPA + SSR** 模式：浏览器能力有限、开发工具偏向服务器端渲染，生态成熟，运营简单。  
- 随着前端框架和浏览器技术进步，才出现 **CSR** 和 **混合 SSR/CSR** 的多种模式，以平衡初次渲染性能、SEO 需求和丰富的前端交互体验。
## 一、MPA（多页应用）请求流程

1. **用户打开** `http://example.com/`  
   → 浏览器 **发 GET /**  
   → 服务器渲染html页面，包含所有的head tag, CSS/JS引用和初始内容并返回给前端
   → 浏览器解析、执行 JS，渲染首页，没有应用逻辑仅负责渲染、页面增强（渐进式增强）而不是核心导航或者页面构建
   - 页面状态和JS环境每次刷新都会丢失：用户session、组件状态需要依赖cookie, serevr session等手段持久化
   - 但是这种模式依然在小型站点或者对SEO要求极高的场景中使用，但对于交互复杂的前端应用而言存在首屏慢、交互迟滞、状态管理困难等问题

2. **点击“关于”链接** `<a href="/about">关于</a>`  
   → 浏览器 **发 GET /about**  
   → 服务器返回完整 HTML（含相同的 CSS、JS 引用）  
   → 浏览器清除旧页面、重新加载新页面、再次解析所有资源。

3. **每次导航都是一次全页刷新**
   - 整个页面重建：包含重新加载 CSS/JS、重新执行应用脚本。
   - 前一次 JS 状态（内存、变量、全局状态）全部丢失。
   - 网络开销大：重复下载同样的资源。

4. **特点**
   1. 在传统的多页应用（MPA）和纯服务器渲染（SSR）模式下，每次浏览器导航都会重新向服务器发起一次完整的 HTTP 请求，服务器再返回一整套新的 HTML 文档、CSS、JS 引用以及初始内容
   2. 为什么无法持久化前端状态？
      1. 每次请求重建整个页面环境
         1. 浏览器访问 /about → 服务器渲染并返回 about.html → 浏览器重新解析 HTML、下载 CSS/JS → 执行 JS 初始化。上一次页面中所有的 JavaScript 运行时环境（变量、内存中的组件状态、事件绑定）都会被销毁，换成全新的执行上下文。
      2. 依赖服务端或 Cookie 来存状态
         1. 用户会话（登录态）必须保存在 Cookie 或者服务器 Session（内存/数据库）里，前端无法在内存中“记得”自己正在做什么
         2. 组件级状态（比如“购物车里已选的商品”、或“表单填写进度”）刷新后都丢失，必须通过 URL 参数、表单恢复、或者额外的客户端存储（localStorage）来补救。
      3. 没有持久化的单页逻辑
         1. 传统 MPA 只把 JavaScript 用于“渐进式增强”（比如表单验证、菜单展开），而不是维护应用状态或路由。
         2. 一旦刷新，所有“页面中 JS 做的事情”都要重新跑一遍，用户感知到“闪烁”、交互延迟
   3. 为什么需要多次请求？
      1. HTML 分离
         1. 每个 URL 都对应一个物理（或模板）文件，服务器端路由（如 /about、/contact）各自生成自己的 HTML。
         2. 浏览器要拿到页面内容，就必须针对每个路径“再问一次服务器”。
      2. 资源加载
         1. 虽然 CSS/JS 可能走缓存（Cache-Control），但首次加载或资源更新后，还是要从服务器拉取。
         2. 对比 SPA 只在首次下载一次，MPA 在每次导航时都要“检查”并确认资源版本。
      3. 后端渲染成本
         1. 服务器每次都要执行模板引擎（如 EJS、Pug、Thymeleaf）来把数据填充到 HTML 中，再发给客户端。
         2. 并且每次都要重新查询数据库、渲染视图，才算响应结束。
---

## 二、SPA（单页应用）请求流程

1. **用户打开** `http://example.com/`  
   → 浏览器 **发 GET /**  
   → 服务器返回 **同一个** `index.html`（含应用的主 JS/CSS）  
   → 浏览器解析并执行一次 JS 框架/应用初始化，渲染“空壳”或首页视图。

2. **点击“关于”**（内部路由链接，非普通 `<a href>`）  
   → 应用代码 拦截 这个点击事件  
   → 只发 **AJAX** 请求：`GET /api/content/about`（返回 JSON）  
   → 应用拿到 JSON 数据后，仅用 JS 去更新局部 DOM（如 `<div id="app">`）  
   → **不触发浏览器的全页刷新**，JS 环境和之前的状态依然保留（比如登录信息、全局变量）

3. **网络开销小**：
   - **一次**完整页面请求
   - 多次 **小数据**请求
   - 不重复下载 CSS/JS

---

## 三、手写 SPA Demo

下面给出一个纯前端 + 极简后端的 Demo，分别是：

- `server.js`：提供静态文件和内容 API
- `public/index.html`：页面壳
- `public/app.js`：路由＋数据加载逻辑

---

### 1. `server.js`（Node.js + Express 后端）

```js
// server.js
const express = require('express')
const path = require('path')
const app = express()

// 1. 静态资源：index.html 和 app.js
app.use(express.static(path.join(__dirname, 'public')))

// 2. 内容 API：根据路由返回 JSON 数据
const pageData = {
  home: { title: '首页', body: '这是首页的动态内容。' },
  about: { title: '关于', body: '这是关于页面的动态内容。' },
  contact: { title: '联系', body: '这是联系页面的动态内容。' },
}
app.get('/api/content/:page', (req, res) => {
  const data = pageData[req.params.page]
  if (!data) return res.status(404).json({ error: 'Not Found' })
  res.json(data)
})

// 3. 其它任意路径都返回 index.html（History API 回退）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'))
})

// 4. 启动
app.listen(3000, () => console.log('Server on http://localhost:3000'))
```

---

### 2. `public/index.html`（SPA 页面壳）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>SPA Demo</title>
  </head>
  <body>
    <!-- 普通链接 + data-link，用来拦截 -->
    <nav>
      <a href="/" data-link>首页</a>
      <a href="/about" data-link>关于</a>
      <a href="/contact" data-link>联系</a>
    </nav>

    <!-- 内容都会渲染到这里 -->
    <div id="app"></div>

    <!-- 应用逻辑 -->
    <script src="app.js"></script>
  </body>
</html>
```

---

### 3. `public/app.js`（路由＋数据加载）

```js
// 1. 拦截内部链接点击，使用 History API
document.body.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-link]')
  if (!link) return // 不是内部导航，放行
  e.preventDefault() // 阻止浏览器全页跳转
  history.pushState(null, '', link.href) // 修改 URL
  loadContent() // 加载并渲染新内容
})

// 2. 监听浏览器前进后退
window.addEventListener('popstate', loadContent)

// 3. 初始加载
window.addEventListener('load', loadContent)

// 4. 核心函数：根据 URL 路径请求 JSON，再渲染
function loadContent() {
  // 4.1 URL → 页面 key（去掉开头 `/`，若空则 'home'）
  const path = window.location.pathname.slice(1) || 'home'
  // 4.2 请求数据
  fetch(`/api/content/${path}`)
    .then((res) => res.json())
    .then((data) => {
      // 4.3 渲染到 #app（局部更新，非全页刷新）
      document.getElementById(
        'app'
      ).innerHTML = `<h1>${data.title}</h1><p>${data.body}</p>`
    })
    .catch(() => {
      document.getElementById(
        'app'
      ).innerHTML = `<h1>404</h1><p>页面未找到。</p>`
    })
}
```

---

## 四、为什么 SPA 只需要一次页面请求

- **初次加载**：浏览器拿到 `index.html` + `app.js`，这就是 SPA 的“壳”——包含所有视图切换逻辑。
- **后续导航**：执行的是 `fetch('/api/...')`，只取数据，**不再请求新的 HTML**，也不重新加载 CSS/JS。
- **页面环境常驻**：所有 JS 变量、状态管理（如登录信息、组件状态）在整个会话内保持，除非手动刷新。

---

## 五、全页刷新会怎样

- 视同 MPA：刷新或普通链接跳转触发浏览器向服务器请求新文档
- 整个 JS 环境被卸载重建，之前所有状态丢失
- 用户体验出现闪烁、延迟；不利于构建复杂交互

---

通过上面的 Demo 你可以在本地运行：

```bash
node server.js
# 访问 http://localhost:3000
```

然后点击导航、F5 刷新，观察网络面板：

- **点击导航** 只会看到 `/api/content/...` 的 JSON 请求
- **F5 刷新** 会重新请求 `/` 并全部重载

这样就能清晰地看出 SPA 与 MPA 在请求次数与体验上的差异。
