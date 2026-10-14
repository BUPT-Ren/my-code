# API 对接文档（智阅同行图书馆系统）

## 基础信息

- **基础路径**：`/api`
- **请求格式**：JSON
- **响应格式**：
```json
{
    "ok": true|false,
    "message": "...",
    "data": {...}
}
```
- **认证方式**：JWT Token（请求头添加 `Authorization: Bearer <token>`）

## 全局约定

- 所有请求与响应均为 UTF-8
- 成功时返回 `ok: true`
- 错误统一返回 `ok: false` 和 `message`

---

## 一、用户认证接口

### 1.1 登录

- **URL**: `POST /api/auth/login`
- **请求体**:
```json
{
    "identifier": "手机号",
    "password": "密码"
}
```
- **成功响应**:
```json
{
    "ok": true,
    "message": "登录成功",
    "token": "jwt_token",
    "user": {
        "user_id": 1,
        "phone": "13800138000",
        "nickname": "用户昵称"
    }
}
```

### 1.2 注册

- **URL**: `POST /api/auth/register`
- **请求体**:
```json
{
    "phone": "手机号",
    "password": "密码"
}
```

### 1.3 检查管理员权限

- **URL**: `GET /api/auth/check-admin`
- **响应**:
```json
{
    "ok": true,
    "is_admin": true,
    "level": "normal",
    "admin_level": "normal",
    "phone": "13800138000",
    "is_super": false
}
```

---

## 二、图书管理接口

### 2.1 获取图书列表

- **URL**: `GET /api/books`
- **查询参数**:
    - `q`: 搜索关键词（可选）
    - `page`: 页码（默认1）
    - `page_size`: 每页数量（默认20）
    - `category`: 分类（可选）

### 2.2 获取图书详情

- **URL**: `GET /api/books/<book_id>`

---

## 三、借阅管理接口

### 3.1 提交借阅申请

- **URL**: `POST /api/borrow/request`
- **请求体**:
```json
{
    "book_id": 1
}
```

### 3.2 提交归还申请

- **URL**: `POST /api/return/request`
- **请求体**:
```json
{
    "record_id": 1
}
```

### 3.3 获取借阅状态统计

- **URL**: `GET /api/admin/borrow/status-stats`
- **响应**:
```json
{
    "ok": true,
    "stats": {
        "borrowed": 10,
        "overdue": 5,
        "due_today": 3,
        "pending_pickup": 2
    }
}
```

### 3.4 确认取书

- **URL**: `POST /api/admin/borrow/<record_id>/confirm-pickup`
- **权限**: 管理员

### 3.5 批量确认取书

- **URL**: `POST /api/admin/borrow/batch-confirm-pickup`
- **权限**: 管理员
- **请求体**:
```json
{
    "request_ids": [1, 2, 3]
}
```

### 3.6 确认还书

- **URL**: `POST /api/admin/borrow/<record_id>/confirm-return`
- **权限**: 管理员

### 3.7 批量确认还书

- **URL**: `POST /api/admin/borrow/batch-confirm-return`
- **权限**: 管理员
- **请求体**:
```json
{
    "record_ids": [1, 2, 3]
}
```

---

## 四、活动管理接口

### 4.1 获取活动列表

- **URL**: `GET /api/activities`
- **查询参数**:
    - `status`: 活动状态（draft/published/ongoing/ended）
    - `page`: 页码
    - `page_size`: 每页数量

### 4.2 获取活动详情

- **URL**: `GET /api/activities/<activity_id>`

### 4.3 活动报名

- **URL**: `POST /api/activities/<activity_id>/register`

### 4.4 取消报名

- **URL**: `POST /api/activities/<activity_id>/cancel`

### 4.5 获取报名列表

- **URL**: `GET /api/activities/<activity_id>/registrations`
- **查询参数**:
    - `status`: 筛选状态（pending/approved/rejected/checked-in/not-checked-in）

### 4.6 审核报名

- **URL**: `POST /api/activities/<activity_id>/registrations/<reg_id>/approve`
- **请求体**:
```json
{
    "action": "approve"
}
```
或
```json
{
    "action": "reject"
}
```

### 4.7 管理员为用户报名

- **URL**: `POST /api/activities/<activity_id>/admin-register`
- **权限**: 管理员
- **请求体**:
```json
{
    "user_ids": [1, 2, 3]
}
```

### 4.8 签到

- **URL**: `POST /api/activities/<activity_id>/check-in`
- **权限**: 管理员
- **请求体**:
```json
{
    "registration_id": 1
}
```

### 4.9 批量签到

- **URL**: `POST /api/activities/<activity_id>/batch-check-in`
- **权限**: 管理员
- **请求体**:
```json
{
    "registration_ids": [1, 2, 3]
}
```

### 4.10 导出参与名单

- **URL**: `GET /api/activities/<activity_id>/participants/export?token=<jwt_token>`
- **权限**: 管理员
- **响应**: CSV 文件下载

### 4.11 获取参与成员列表

- **URL**: `GET /api/activities/<activity_id>/participants`
- **响应**:
```json
{
    "ok": true,
    "participants": [
        {
            "user_id": 1,
            "user_phone": "138****8000",
            "user_avatar": "...",
            "user_school": "...",
            "status": "approved",
            "check_in_status": "checked_in"
        }
    ]
}
```

---

## 五、用户管理接口（管理员）

### 5.1 获取用户列表

- **URL**: `GET /api/admin/users`
- **查询参数**:
    - `page`: 页码
    - `page_size`: 每页数量
    - `status`: 用户状态（active/suspended）
    - `user_type`: 用户类型（admin/phone/education）
    - `search`: 搜索关键词

### 5.2 批量导入用户

- **URL**: `POST /api/admin/users/batch-import`
- **权限**: 管理员
- **请求体**: `multipart/form-data`
    - `file`: Excel或CSV文件
- **响应**:
```json
{
    "ok": true,
    "message": "导入完成：成功 10 条，失败 2 条",
    "success_count": 10,
    "failed_count": 2,
    "errors": []
}
```

### 5.3 下载导入模板

- **URL**: `GET /api/admin/users/import-template`
- **响应**: Excel 文件下载

### 5.4 重置用户密码

- **URL**: `POST /api/admin/users/<user_id>/reset-password`
- **权限**: 管理员
- **请求体**:
```json
{
    "new_password": "新密码"
}
```

### 5.5 修改用户状态

- **URL**: `PATCH /api/admin/users/<user_id>/status`
- **权限**: 管理员
- **请求体**:
```json
{
    "status": "suspended"
}
```

### 5.6 删除用户

- **URL**: `DELETE /api/admin/users/<user_id>`
- **权限**: 管理员

---

## 六、管理员管理接口（仅超级管理员）

**超级管理员手机号**: `18786898944`

### 6.1 获取管理员列表

- **URL**: `GET /api/admin/admins`
- **权限**: 超级管理员

### 6.2 创建管理员

- **URL**: `POST /api/admin/admins`
- **权限**: 超级管理员
- **请求体**:
```json
{
    "phone": "手机号",
    "password": "密码",
    "permissions": ["user_manage", "book_manage"]
}
```

### 6.3 编辑管理员

- **URL**: `PUT /api/admin/admins/<admin_id>`
- **权限**: 超级管理员
- **请求体**:
```json
{
    "permissions": ["user_manage", "activity_manage"]
}
```

### 6.4 删除管理员

- **URL**: `DELETE /api/admin/admins/<admin_id>`
- **权限**: 超级管理员

### 6.5 重置管理员密码

- **URL**: `POST /api/admin/admins/<admin_id>/reset-password`
- **权限**: 超级管理员
- **请求体**:
```json
{
    "new_password": "新密码"
}
```

### 6.6 修改管理员状态

- **URL**: `PATCH /api/admin/admins/<admin_id>/status`
- **权限**: 超级管理员
- **请求体**:
```json
{
    "status": "suspended"
}
```

---

## 七、通知管理接口

### 7.1 发送单个通知

- **URL**: `POST /api/admin/notifications/send`
- **权限**: 管理员
- **请求体**:
```json
{
    "user_id": 1,
    "title": "通知标题",
    "content": "通知内容",
    "type": "system"
}
```

### 7.2 批量发送通知

- **URL**: `POST /api/admin/notifications/batch-send`
- **权限**: 管理员
- **请求体**:
```json
{
    "record_ids": [1, 2, 3],
    "title": "通知标题",
    "content": "通知内容",
    "type": "system"
}
```

### 7.3 获取用户通知列表

- **URL**: `GET /api/notifications`

### 7.4 标记通知已读

- **URL**: `POST /api/notifications/<notification_id>/read`

---

## 八、AI 推荐接口

### 8.1 AI 对话

- **URL**: `POST /api/ai/chat`
- **请求体**:
```json
{
    "message": "用户消息",
    "conversation_id": "会话ID（可选）"
}
```

### 8.2 获取推荐

- **URL**: `GET /api/recommend`

---

## 九、统计接口

### 9.1 阅读统计

- **URL**: `GET /api/stats`

### 9.2 热门图书

- **URL**: `GET /api/popular`

---

## 十、健康检查

- **URL**: `GET /health`
- **URL**: `GET /test_db`

---

## 十一、错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权/Token无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 十二、更新日志

### v1.1.0 (2026-03-25)
- 新增活动签到功能（单个签到、批量签到）
- 新增导出活动参与名单功能
- 新增用户批量导入功能
- 新增管理员管理功能（仅超级管理员）
- 新增确认取书/确认还书功能
- 新增批量操作全选功能
- 定义超级管理员（18786898944）
- 优化用户类型筛选功能
- 删除活动动态模块

### v1.0.0
- 初始版本发布