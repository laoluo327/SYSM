# 📦 做账管理系统 - 内网部署快速指南

## ✅ 打包完成

您的系统已成功打包，文件位于：
- **部署包文件夹**: `sysm-deploy/`
- **压缩文件**: `sysm-部署包.zip` (约 536 KB)

---

## 🚀 部署步骤（3步完成）

### 第1步：传输到内网服务器

将 `sysm-部署包.zip` 传输到内网服务器，然后解压到任意目录，例如：
- Windows: `D:\sysm`
- Linux: `/opt/sysm`

### 第2步：安装依赖

打开命令行/终端，进入解压后的目录：

**Windows (PowerShell 或 CMD):**
```powershell
cd D:\sysm
cd server
npm install --production
cd ..
```

**Linux/macOS:**
```bash
cd /opt/sysm
cd server
npm install --production
cd ..
```

⏱️ **预计耗时**: 1-3 分钟（取决于网络速度）

### 第3步：启动服务

**Windows - 方式1（双击启动）:**
```
直接双击 "启动服务.bat"
```

**Windows - 方式2（命令行）:**
```powershell
node server/index.js
```

**Linux/macOS:**
```bash
node server/index.js
```

✅ 看到以下提示表示启动成功：
```
服务器已启动: http://0.0.0.0:3001
```

### 第4步：访问系统

打开浏览器访问：
```
http://服务器IP:3001
```

**默认管理员账号：**
- 👤 用户名: `admin`
- 🔑 密码: `admin`

⚠️ **重要**: 首次登录后请立即修改密码！

---

## 📋 完整部署目录结构

```
sysm/
├── server/                 # 后端服务
│   ├── index.js           # 服务入口
│   ├── package.json       # 后端依赖配置
│   ├── db/                # 数据库目录
│   │   └── init.js        # 数据库初始化
│   ├── routes/            # API 路由
│   ├── middleware/        # 中间件
│   └── backups/           # 备份目录
├── dist/                  # 前端静态文件（已构建）
│   ├── index.html
│   └── assets/
├── package.json           # 项目配置
├── README.txt             # 快速说明
└── 部署指南.md             # 详细部署文档
```

---

## 🔧 常用操作

### 修改端口

如果 3001 端口被占用，可以通过环境变量修改：

**Windows (PowerShell):**
```powershell
$env:PORT=8080
node server/index.js
```

**Linux/macOS:**
```bash
export PORT=8080
node server/index.js
```

### 后台运行（Linux 使用 PM2）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/index.js --name sysm

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

### Windows 后台运行

使用 `nssm` (Non-Sucking Service Manager)：
```powershell
# 下载 nssm: https://nssm.cc/download
nssm install sysm "C:\node.exe" "D:\sysm\server\index.js"
nssm start sysm
```

---

## 🔐 安全建议

1. **修改默认密码**: 首次登录后立即修改 admin 密码
2. **防火墙设置**: 只允许内网 IP 访问 3001 端口
3. **定期备份**: 使用管理后台的数据中心功能定期备份数据库
4. **监控日志**: 定期检查服务运行状态

---

## 📊 数据库说明

- **类型**: SQLite（嵌入式数据库，无需单独安装）
- **位置**: `server/db/accounting.db`
- **自动初始化**: 首次启动自动创建
- **备份恢复**: 在管理后台 → 数据中心 → 数据库管理

---

## 🐛 常见问题

### Q1: 启动时报错 "Cannot find module"
**A**: 没有安装依赖，执行：
```bash
cd server
npm install --production
```

### Q2: 端口 3001 被占用
**A**: 修改端口（见上方"修改端口"章节）

### Q3: 访问页面空白
**A**: 
- 检查 `dist/` 目录是否存在
- 确认前端构建是否正常
- 查看浏览器控制台错误

### Q4: 如何停止服务
**A**: 
- 命令行启动: 按 `Ctrl+C`
- PM2 启动: `pm2 stop sysm`

---

## 📞 技术支持

详细部署说明请查看：`部署指南.md`

---

**部署完成，祝您使用愉快！** 🎉
