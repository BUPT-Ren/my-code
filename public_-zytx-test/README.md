# 智阅同行 - 校园图书共享系统

## 项目简介

智阅同行是一个面向校园的智慧图书共享平台，由北京邮电大学与北邮附中联合共建。系统整合了Web管理平台和微信小程序双端应用，为师生提供图书借阅、个性化推荐、阅读活动管理、AI阅读助手等功能。

### 项目背景

基于对北邮附中师生的问卷调研（教师24份、学生92份），我们发现：

- **87.5%** 的教师依赖网络资源为学生推荐阅读材料，对整合化资源平台需求强烈
- **75%** 的教师缺乏适合学生水平和学科需求的优质图书与数字资源
- 仅 **13.04%** 的学生利用学校图书馆，校园资源利用率低
- **77.23%** 的学生急需个性化书目推荐

基于上述需求，本项目应运而生，旨在搭建连接大学资源与中学需求的智慧阅读桥梁。

## 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                        智阅同行系统                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Web前端    │    │ 微信小程序  │    │  管理后台   │     │
│  │  (HTML/CSS) │    │  (WXML/WXSS)│    │  (HTML/CSS) │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Flask RESTful API 后端                  │   │
│  │         (Python + SQLAlchemy + Flask-CORS)           │   │
│  └─────────────────────────┬───────────────────────────┘   │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    MySQL 数据库                      │   │
│  │         (用户、图书、借阅、活动、通知等)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 功能模块

### 用户端功能

| 模块 | 功能描述 |
|------|----------|
| 用户认证 | 手机号注册/登录、密码重置申请、Token认证 |
| 图书浏览 | 图书列表、分类筛选、关键词搜索、图书详情 |
| 借阅管理 | 借阅申请、归还申请、借阅历史、当前借阅 |
| 收藏功能 | 图书收藏、收藏列表管理 |
| 活动管理 | 活动浏览、活动详情、报名/取消、评论点赞 |
| AI助手 | 智能阅读问答、个性化推荐 |
| 阅读统计 | 借阅数据分析、阅读报告生成 |
| 消息通知 | 系统通知、到期提醒、活动提醒 |
| 个人中心 | 用户资料、个人设置 |

### 管理端功能

| 模块 | 功能描述 |
|------|----------|
| 用户管理 | 用户列表、状态管理、密码重置、信息编辑、批量导入用户、用户类型筛选 |
| 图书管理 | 图书增删改查、库存管理、批量操作、CSV导出 |
| 借阅审核 | 借阅/归还申请审批、请求管理、确认取书、确认还书、批量操作 |
| 活动管理 | 活动发布、编辑、状态管理、签到管理、导出参与名单 |
| 通知管理 | 发送通知、批量发送、借阅状态统计 |
| 管理员管理 | 管理员列表、权限设置、密码重置（仅超级管理员） |
| 数据统计 | 平台运营数据、用户活跃度分析 |

### 权限说明

| 角色 | 权限范围 |
|------|----------|
| 普通管理员 | 根据分配的权限操作相应模块 |
| 超级管理员 | 手机号 `18786898944`，拥有所有权限，可管理其他管理员 |

## 技术栈

### 后端
- **框架**: Flask 2.x
- **ORM**: SQLAlchemy
- **数据库**: MySQL 8.0
- **认证**: JWT Token
- **API**: RESTful 设计
- **限流**: Flask-Limiter

### 前端
- **Web端**: HTML5 + CSS3 + JavaScript (原生)
- **小程序**: 微信小程序原生框架 (WXML/WXSS/JS)

### 部署
- **容器化**: Docker + Docker Compose
- **服务器**: Gunicorn + Nginx

## 目录结构

```
PUBLIC_ZYTX/
├── README.md                   # 项目说明文档
├── project_report.html         # 项目汇报材料
│
├── ZYTX_platform/              # Web平台
│   ├── backend/                # 后端代码
│   │   ├── __init__.py         # Flask应用工厂
│   │   ├── app.py              # 应用入口
│   │   ├── config.py           # 配置文件
│   │   ├── models.py           # 数据模型
│   │   ├── routes.py           # API路由
│   │   ├── auth.py             # 认证模块
│   │   ├── ai_service.py       # AI服务
│   │   └── db_utils.py         # 数据库工具
│   ├── css/                    # 样式文件
│   ├── *.html                  # 前端页面
│   ├── zytx.sql                # 数据库结构
│   ├── Dockerfile              # Docker配置
│   ├── docker-compose.yml      # Docker编排
│   └── requirements.txt        # Python依赖
│
└── mini-program_zytx/          # 微信小程序
    ├── pages/                  # 页面目录
    │   ├── index/              # 首页
    │   ├── login/              # 登录
    │   ├── register/           # 注册
    │   ├── book-detail/        # 图书详情
    │   ├── activity/           # 活动列表
    │   ├── activity-detail/    # 活动详情
    │   ├── profile/            # 个人中心
    │   ├── favorites/          # 收藏列表
    │   ├── borrowed/           # 正在借阅
    │   ├── history/            # 借阅历史
    │   ├── notifications/      # 消息通知
    │   ├── settings/           # 个人设置
    │   ├── ai-assistant/       # AI助手
    │   └── reading-report/     # 阅读报告
    ├── app.js                  # 小程序入口
    ├── app.json                # 小程序配置
    └── app.wxss                # 全局样式
```

## 快速开始

### 环境要求
- Python 3.10+
- MySQL 8.0+
- Node.js (可选，用于开发调试)

### 后端启动

```bash
# 进入后端目录
cd ZYTX_platform/backend

# 安装依赖
pip install -r requirements.txt

# 配置数据库 (修改 config.py 或设置环境变量)
# 创建数据库并导入 zytx.sql

# 启动服务
python app.py
```

### 小程序启动

1. 安装微信开发者工具
2. 导入 `mini-program_zytx` 目录
3. 修改 `app.js` 中的 `API_BASE_URL` 为实际后端地址
4. 编译运行

### Docker 部署

```bash
cd ZYTX_platform
docker-compose up -d
```

## API 文档

详细API文档请参考 [ZYTX_platform/API_DOC.md](ZYTX_platform/API_DOC.md)

### 主要接口

| 功能 | 接口 | 方法 |
|------|------|------|
| 登录 | /api/auth/login | POST |
| 注册 | /api/auth/register | POST |
| 图书列表 | /api/books | GET |
| 图书详情 | /api/books/:id | GET |
| 借阅申请 | /api/borrow/request | POST |
| 归还申请 | /api/return/request | POST |
| 收藏列表 | /api/favorites | GET |
| 活动列表 | /api/activities | GET |
| 活动报名 | /api/activities/:id/register | POST |
| 活动签到 | /api/activities/:id/check-in | POST |
| 导出参与名单 | /api/activities/:id/participants/export | GET |
| 批量导入用户 | /api/admin/users/batch-import | POST |
| AI对话 | /api/ai/chat | POST |
| 阅读统计 | /api/stats | GET |
| 确认取书 | /api/admin/borrow/:id/confirm-pickup | POST |
| 确认还书 | /api/admin/borrow/:id/confirm-return | POST |

## 数据库设计

系统包含以下核心数据表：

| 表名 | 说明 |
|------|------|
| users | 用户信息 |
| books | 图书信息 |
| borrow_records | 借阅记录 |
| borrow_requests | 借阅申请（含取书状态：pending/approved/picked_up/rejected） |
| favorites | 收藏记录 |
| activities | 活动信息 |
| activity_registrations | 活动报名（含签到状态、签到时间） |
| notifications | 消息通知 |
| ai_chat_history | AI对话历史 |
| admins | 管理员信息 |

### 重要字段说明

**activity_registrations 表（活动报名）**：
- `check_in_time`: 签到时间
- `check_in_status`: 签到状态（not_checked_in/checked_in）
- `check_in_by`: 签到操作管理员ID

**borrow_requests 表（借阅申请）**：
- `status`: 申请状态（pending/approved/picked_up/rejected）

## 项目成果

- 完成Web管理平台开发，支持用户管理、图书管理、借阅审核等功能
- 完成微信小程序开发，提供移动端图书借阅体验
- 实现AI智能推荐功能，为用户提供个性化书目推荐
- 建立完整的RESTful API接口体系
- 支持Docker容器化部署

## 未来展望

- 接入真实AI模型，提升推荐准确性
- 增加社交功能，支持书评、读书笔记分享
- 扩展数字资源，支持电子书在线阅读
- 数据分析增强，提供更详细的阅读行为分析
- 多校推广，建立校际资源共享机制

## 开发团队

北京邮电大学

## 许可证

本项目仅供学习交流使用。