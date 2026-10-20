# TCK Wins 前端

独立应用目录：`tck_wins/frontend`。参考原 `frontend` 的 Next.js App Router、CSS 设计变量、四语言 Provider 和 Toast 实现，保留深色、蓝紫、金色视觉，并增加游戏与 AI 角色界面。

默认连接 **NestJS/PostgreSQL API**，本地 Mock 默认关闭。环境标记、模式说明、业务文案、网络/资产/品牌筛选从 `/api/v1/public/config` 获取；资产、比赛奖励和会员持仓从各自业务接口获取。当前后端仍提供 P0 模拟业务，因此 API 返回演示模式时页面会按接口显示，并不会因为关闭 Mock 就改变业务性质。

## 启动

前后端统一使用 Node.js **22.14+**。先按 [后端说明](../backend/README.md) 启动数据库、API 和 Worker，再运行前端。

```powershell
Set-Location S:\Projects\blockchain\tck\tck_wins\frontend
npm ci
if (-not (Test-Path -LiteralPath '.env.local')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}
npm run dev
```

访问 **http://127.0.0.1:3001**，默认仅监听本机，避免与原前端的 3000 端口冲突。

开发和生产构建统一使用 Webpack（`npm run dev` / `npm run build` 已包含 `--webpack`），避免本机 Turbopack 开发模式出现 React Client Manifest 缺失或空清单。直接调用 Next CLI 时也加 `--webpack`，例如 `node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3001`。更换打包器后停止旧开发服务，再重新启动并刷新浏览器。

本机 `.env.local` 已切换到以下默认配置；正式部署模板见 [.env.production.example](.env.production.example)。管理员入口为 `/admin/login`，可填写用户名；初始账号取自后端 `.env` 的 `ADMIN_USERNAME/ADMIN_PASSWORD`。

```dotenv
NEXT_PUBLIC_SITE_URL=https://tck666.cc
NEXT_PUBLIC_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:4001
MOCK_API_ENABLED=false
```

浏览器请求同源 `/api/v1`，Next.js 的 `beforeFiles` 规则先转发到 `API_PROXY_TARGET`，不会落入本地 Mock。`API_PROXY_TARGET` 是服务端配置，不发送给浏览器。生产使用 `npm run build`、`npm run start`；修改代理或公开环境配置后重新构建。

## 已实现

- 首页、游戏大厅、玩法/网络/资产/模式/品牌筛选与游戏详情；Coin Flip 报价、参与、结果、记录与恢复。
- 演示身份创建、恢复与退出；普通用户和管理员分别使用会话，记录按用户隔离。
- EVM 浏览器钱包发现与选择、真实授权连接、地址/网络展示、刷新恢复、账户/网络切换和断开连接；签名登录请求已接入，需后端开放验签接口。
- 演示角色创建、配额、生成进度、失败返券、重试、匹配与模拟对战。
- Dashboard、任务筛选、提交、审核、驳回重提、双入口领取与奖励状态。
- 票券与资产流水、个人资料、会员、邀请、排行榜、消息筛选和已读。
- 后台概览、用户列表/详情、任务创建/编辑、审核、积分调整、设置版本与审计。
- 游戏、角色、比赛、奖励等后台记录页；历史数据入口为空，不读取原 `data` 导出。
- 简中、英文、日文、韩文；桌面/移动布局，键盘焦点、减少动画、加载/错误/空态。
- 字符串金额、用户/管理员请求域、错误码、超时/取消、账号缓存隔离、写操作幂等键。

其余游戏、购票支付、锦标赛、分佣、Noova 展示清晰的未开放状态，没有伪造真实服务成功结果。

## 演示闭环

1. `/connect` 展开“演示账号入口”后主动进入演示。新账号获得 1,000 SSC 和 3 张 Ticket，均无现金价值。演示身份无真实钱包地址。
2. `/games/coin-flip` 选择正反面，获取 60 秒报价，确认参与。结果由本地服务生成，概率各半；获胜总返还为参与费用 2 倍，否则为 0。
3. 复制结算页对局编号，进入 `/quests/first-game` 提交。
4. `/admin/login` 登录后，进入 `/admin/quest-reviews` 审核；驳回必须输入理由。
5. 回到任务详情或 `/rewards` 领取。同一奖励无论通过哪个入口，只到账一次。
6. `/fighters` 创建角色，可勾选失败演示检查返券，然后重试。角色就绪后可发起模拟比赛。
7. 刷新页面或重启应用，原身份及业务记录仍可恢复。退出后会撤销当前会话；再次进入演示使用本浏览器保存的身份恢复凭据。

演示邀请链接固定使用 `https://tck666.cc/?ref=...`。本地验证时，把生成的 `ref` 参数附加到 `http://127.0.0.1:3001/?ref=...`，在另一个浏览器身份中注册。有效邀请要求受邀者完成任务；不会发放现金佣金。

## 实现结构

```text
app/
  layout.tsx / components.tsx    全局 Provider、导航、权限外壳
  globals.css / wins.css         原 UI 基础与 Wins 扩展
  auth.tsx / i18n.tsx / toast.tsx 会话、四语言、反馈
  site.tsx                      API 配置与统一环境标签
  wallet.tsx / lib/wallet.ts     EVM 钱包发现、连接、事件与消息签名
  features/                     首页、游戏、角色、任务、会员、后台视图
  ui/primitives.tsx              图标、游戏图形、角色图形、卡片、状态与分页
  lib/contracts.ts              前端/演示接口共享类型
  lib/catalog.ts                Mock 服务端种子适配，复用后端种子
  lib/copy.ts                   通用四语言词条与 API 业务文案读取
  lib/api-client.ts             HTTP、认证域、错误、取消与超时
  lib/hooks.ts                  查询缓存、失效、有限轮询、变更操作
  lib/amount.ts                 精确金额格式化与站内跳转校验
  lib/demo-server.ts            独立本地预览适配器
  api/v1/[[...path]]/route.ts    显式开关保护的 Mock 路由
scripts/test.cjs                 隔离存储的业务测试
scripts/browser-check.cjs        可选 Chrome 本机浏览器回归
scripts/wallet-browser-check.cjs 钱包事件及登录接口契约浏览器测试
```

钱包直接使用 [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) / [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) 浏览器接口，没有新增运行依赖。请求缓存和表单采用现有 React 体系的轻量实现，后续可按文档替换为 TanStack Query、React Hook Form；当前并未安装这两个库。

## 钱包连接与登录

右上角默认入口为“连接钱包”。在 `/connect` 选择已安装的 MetaMask 等 EVM 钱包并授权，页面显示实际地址和 Chain ID；多个扩展通过 EIP-6963 分别列出，旧钱包兼容 `window.ethereum`。移动端可使用注入 EVM Provider 的钱包内置浏览器，目前未接入 WalletConnect 扫码。

连接后可在钱包中切换账户或网络，页面自动更新并清除旧网站登录态。刷新仅通过 `eth_accounts` 恢复已经授权的连接，不自动弹出授权或签名。断开连接清除本站连接记录及登录态；钱包扩展中的站点授权可在钱包设置中撤销。

“签名登录”按下面的接口契约调用 API（数据使用项目现有 `{ success, data }` 包装）：

| 接口                | 请求                                               | 响应 data                                                           |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| `POST /auth/nonce`  | `{ walletAddress, chainId }`，chainId 为十进制整数 | `{ nonce, message, expiresAt }`                                     |
| `POST /auth/login`  | `{ walletAddress, nonce, signature, ref? }`        | `{ user, accessToken }`，user 沿用当前用户 DTO 并包含匹配的钱包地址 |
| `GET /auth/me`      | 用户 Bearer Token                                  | `{ user }`                                                          |
| `POST /auth/logout` | 用户 Bearer Token，空对象请求体                    | 沿用现有注销响应                                                    |

前端通过 `personal_sign` 签署后端返回的完整 UTF-8 登录消息，签名前后检查账户和网络是否改变。签名和接口成功返回前不会建立网站登录态；钱包连接成功不会生成演示用户。当前 `tck_wins/backend` 的 nonce/login 仍返回 `FEATURE_DISABLED`，此时页面保留钱包连接并显示“签名登录接口尚未开放”。本次只修改前端，后端需按上述契约接入后才能完成网站登录。

## 可选 Mock 模式

只有单独预览页面时才使用 [.env.mock.example](.env.mock.example) 的配置，设置 `MOCK_API_ENABLED=true` 后重启。该模式仍可独立运行，无需启动数据库；管理员为 `admin`，密码取自前端配置的 `DEMO_ADMIN_PASSWORD`。默认正式 API 模式不读取这套数据。

默认存储为 `.demo/store.json`，已加入 `.gitignore`。包括演示用户、会话摘要、对局、角色、任务、消息、流水和幂等记录。用户/管理员原始 Token 不写入数据文件。浏览器会话与身份恢复凭据保存在当前浏览器的 Local Storage，清除后将不能自动恢复该身份。

每个请求串行执行并用临时文件替换保存；任务按持久化的完成时间在下次请求时推进，**不是独立 Worker**。仅支持本地单进程预览；不要使用多进程/无服务器实例并发写同一个 JSON 文件，不把它当作生产数据库、复式账本或权限平台。`.demo` 不进入静态目录，不要公开分发。

SSC、IP、票券和会员积分独立显示。仅演示规则作用于模拟资产；没有余额提现、真实 NFT 铸造、支付或链上结算。历史用户资料不加载入演示 seed。

## 接入后端

默认已连接独立 NestJS + PostgreSQL 后端及 Worker，见 [后端运行说明](../backend/README.md)。[.env.backend.example](.env.backend.example) 保留浏览器直接访问后端端口的可选配置；通常使用默认同源代理即可。Mock 与后端的账号和数据相互独立，切换后重新登录。

`NEXT_PUBLIC_API_BASE_URL` 默认为 `/api/v1`，不自动降级到 Mock。切换真实服务时：

1. 前后端一起更新，确保后端 `/public/config` 提供 `text/modes/chains/gameKinds/gameAssets/entries/catalog/fighterCreation/features`。`backend/src/public-presentation.ts` 是业务展示内容的统一来源；可选 Mock 复用该服务端模块，浏览器不直接导入它。
2. 设置 `MOCK_API_ENABLED=false`，把 API Base URL 指向后端，或由同域代理优先转发 `/api/v1` 到 NestJS。
3. 认证、任务、奖励、资产等关联模块一起切换；不要混用两套身份/余额。
4. 重新构建前端。Token 存储键包含 API Base URL，以避免跨环境会话混用。
5. 钱包连接已可使用，签名登录仍需后端实现；社交、支付和生成服务在对应 P1 功能完成后再开启页面能力。

独立 Mock 的 Admin 是单一演示管理员，未实现项目范围 RBAC。新增 NestJS 后端已提供 RBAC、账户状态失效、持久账本/预算和独立 Worker；连接后端后按其权限控制访问。真实链上确认、支付对账等仍需后续实现。

## 验证

```powershell
Set-Location S:\Projects\blockchain\tck\tck_wins\frontend
npm run lint
npm test
npm run build
npm run start
```

开发服务与生产构建服务默认共用 3001，启动其中一个前停止另一个。自动化测试使用系统临时目录，不改动 `.demo` 的已有数据。

业务测试覆盖精确金额、站内跳转、用户/管理员隔离、并发扣款和领取、报价复用、状态恢复、越权、审核版本、失败返券、消息快照和会话撤销。浏览器脚本还覆盖真实页面交互与手机布局。

浏览器脚本需先运行应用，并用本机 Chrome 开启仅本机的调试端口 9333；它会创建记录并将截图写入 `test-results`。默认同源 API 配置下，使用 Node 22 运行：

```powershell
$env:CHECK_API_BASE_URL = 'http://127.0.0.1:4001/api/v1'
$env:CHECK_TOKEN_API_BASE_URL = '/api/v1'
node -r ../backend/node_modules/dotenv/config scripts/browser-check.cjs dotenv_config_path=../backend/.env dotenv_config_quiet=true
```

如果管理员密码已修改，将 `DEMO_ADMIN_PASSWORD` 设置为一致值后再运行浏览器脚本。浏览器脚本属于可选本机检查，不是生产发布命令。

钱包测试使用相同的 9333 调试端口。请使用独立的 Chrome 测试数据目录（例如 `--user-data-dir=.../test-results/chrome-wallet-profile`），因为脚本会清理测试浏览器内本站的 Local/Session Storage。

```powershell
node scripts/wallet-browser-check.cjs
```

该脚本在测试页注入两个 EIP-1193 钱包，验证发现、授权拒绝、连接恢复、账户/网络切换、签名取消、UTF-8 签名参数、过期登录操作隔离及手机布局；读取真实 `/public/config`，验证当前后端的 `FEATURE_DISABLED`，成功登录分支使用拦截的测试响应。它不会使用真实私钥或转账，真实扩展授权弹窗需在浏览器手动确认。
