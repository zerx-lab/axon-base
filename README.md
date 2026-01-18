# AxonBase

基于 Next.js 16 + React 19 + Convex（自托管）的全栈应用模板，内置 RBAC 权限管理系统。

## 技术栈

- **前端**: Next.js 16, React 19, Tailwind CSS v4, TypeScript 5
- **后端**: Convex (自托管)
- **包管理器**: Bun

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 启动 Convex 后端

进入 Docker 目录并启动服务：

```bash
cd Docker
docker-compose up -d
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```env
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=<your-admin-key>
```

### 4. 初始化数据库

首次运行需要初始化系统角色和超级管理员账户：

```bash
npx convex run auth:seedSuperAdmin
```

此命令会自动：
- 创建系统角色（Super Administrator, Administrator, User Manager, Viewer）
- 创建超级管理员账户

**默认超级管理员账户：**
- 用户名: `clown`
- 密码: `012359clown`

> 生产环境请务必修改默认密码！

### 5. 启动开发服务器

```bash
bun run dev
```

访问 http://localhost:3000

## 可用命令

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动开发服务器 |
| `bun run build` | 生产环境构建 |
| `bun run start` | 启动生产服务器 |
| `bun run lint` | 运行 ESLint 检查 |

## Convex 数据初始化命令

| 命令 | 说明 |
|------|------|
| `npx convex run auth:seedSuperAdmin` | 初始化角色和超级管理员（推荐） |
| `npx convex run admin/roles:seedSystemRoles` | 仅初始化系统角色 |

## 项目结构

```
axon-base/
├── app/                  # Next.js App Router 页面
├── components/           # React 组件
├── lib/                  # 工具函数和配置
├── convex/               # Convex 后端
│   ├── schema.ts         # 数据库模式
│   ├── auth.ts           # 认证相关函数
│   ├── admin/            # 管理功能
│   │   ├── roles.ts      # 角色管理
│   │   └── users.ts      # 用户管理
│   └── lib/              # 后端工具
│       ├── access.ts     # 权限检查
│       └── permissions.ts # 权限定义
├── Docker/               # Docker 配置
└── docs/                 # 文档
```

## 内置功能

- 用户认证（登录/登出/会话管理）
- RBAC 权限管理
- 用户管理（CRUD）
- 角色管理（CRUD）
- 多语言支持（中文/英文）

## License

MIT
