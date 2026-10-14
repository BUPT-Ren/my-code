# 智阅同行小程序

## 项目简介

智阅同行是一个校园图书共享小程序，为大学生提供图书借阅、收藏管理、AI阅读助手、阅读风格分析、活动报名等功能。

## 功能模块

### 首页
- 图书浏览与搜索
- 分类筛选
- 热门推荐
- 图书收藏

### 活动
- 活动列表浏览
- 活动详情查看
- 活动报名/取消

### 我的
- 用户信息展示
- 收藏管理
- 借阅管理
- 借阅历史
- 消息通知
- AI阅读助手
- 阅读报告
- 个人设置

## 页面结构

```
pages/
├── index/              首页
├── login/              登录
├── register/           注册
├── book-detail/        图书详情
├── activity/           活动列表
├── activity-detail/    活动详情
├── profile/            我的
├── favorites/          收藏列表
├── borrowed/           正在借阅
├── history/            借阅历史
├── notifications/      消息通知
├── settings/           个人设置
├── ai-assistant/       AI阅读助手
└── reading-report/     阅读报告
```

## API对接

小程序与网页端共用同一个后端API，基础路径配置在 `app.js` 中：

```javascript
const API_BASE_URL = 'http://10.29.239.35:5000';
```

### 主要API接口

| 功能 | 接口 | 方法 |
|-----|------|-----|
| 登录 | /api/auth/login | POST |
| 注册 | /api/auth/register | POST |
| 图书列表 | /api/books | GET |
| 图书详情 | /api/books/:id | GET |
| 热门图书 | /api/popular | GET |
| 分类列表 | /api/genres | GET |
| 收藏列表 | /api/favorites | GET |
| 添加收藏 | /api/favorites | POST |
| 取消收藏 | /api/favorites | DELETE |
| 借阅申请 | /api/borrow/request | POST |
| 归还申请 | /api/return/request | POST |
| 正在借阅 | /api/borrowed | GET |
| 借阅历史 | /api/history | GET |
| 活动列表 | /api/activities | GET |
| 活动详情 | /api/activities/:id | GET |
| 活动报名 | /api/activities/:id/register | POST |
| 消息通知 | /api/notifications | GET |
| 阅读统计 | /api/stats | GET |
| AI对话 | /api/ai/chat | POST |
| 个人设置 | /api/settings | POST |

## 开发环境

- 微信开发者工具
- 基础库版本：3.15.0

## 部署说明

1. 修改 `app.js` 中的 `API_BASE_URL` 为实际后端地址
2. 在微信开发者工具中导入项目
3. 配置合法域名（服务器域名需要在微信公众平台配置）

## 注意事项

- 小程序需要用户登录后才能使用借阅、收藏等功能
- Token存储在本地Storage中，每次请求自动携带
- 图片资源使用picsum.photos作为占位图