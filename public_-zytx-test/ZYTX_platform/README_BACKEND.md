# 智阅同行 - 后端开发文档

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Python | 3.10+ | 编程语言 |
| Flask | 2.x | Web框架 |
| SQLAlchemy | - | ORM |
| MySQL | 8.0 | 数据库 |
| JWT | - | Token认证 |
| Docker | - | 容器化部署 |

---

## 项目结构

```
backend/
├── __init__.py         # Flask应用工厂
├── app.py              # 应用入口
├── config.py           # 配置文件
├── models.py           # 数据模型
├── routes.py           # API路由
├── auth.py             # 认证模块
├── ai_service.py       # AI服务
└── db_utils.py         # 数据库工具
```

---

## 数据库表结构

### 用户相关

#### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | INT | 主键 |
| phone | VARCHAR(20) | 手机号/教育号 |
| password_hash | VARCHAR(255) | 密码哈希 |
| nickname | VARCHAR(50) | 昵称 |
| school | VARCHAR(100) | 学校 |
| status | ENUM | 状态（active/suspended） |

#### admins 表
| 字段 | 类型 | 说明 |
|------|------|------|
| admin_id | INT | 主键 |
| user_id | INT | 关联用户ID |
| level | VARCHAR(20) | 级别（normal/super） |
| permissions | JSON | 权限列表 |

### 借阅相关

#### borrow_records 表
| 字段 | 类型 | 说明 |
|------|------|------|
| record_id | INT | 主键 |
| user_id | INT | 用户ID |
| book_id | INT | 图书ID |
| borrow_time | DATETIME | 借阅时间 |
| due_time | DATETIME | 到期时间 |
| return_time | DATETIME | 归还时间 |
| status | ENUM | 状态（borrowed/returned/overdue/lost） |

#### borrow_requests 表
| 字段 | 类型 | 说明 |
|------|------|------|
| request_id | INT | 主键 |
| user_id | INT | 用户ID |
| book_id | INT | 图书ID |
| request_type | ENUM | 类型（borrow/return/renew/lost） |
| status | ENUM | 状态（**pending/approved/picked_up/rejected**） |
| pickup_time | DATETIME | 取书时间 |

### 活动相关

#### activities 表
| 字段 | 类型 | 说明 |
|------|------|------|
| activity_id | INT | 主键 |
| title | VARCHAR(200) | 标题 |
| description | TEXT | 描述 |
| start_time | DATETIME | 开始时间 |
| end_time | DATETIME | 结束时间 |
| location | VARCHAR(200) | 地点 |
| max_participants | INT | 最大人数 |
| status | ENUM | 状态（draft/published/ongoing/ended） |

#### activity_registrations 表
| 字段 | 类型 | 说明 |
|------|------|------|
| registration_id | INT | 主键 |
| activity_id | INT | 活动ID |
| user_id | INT | 用户ID |
| status | ENUM | 状态（pending/approved/rejected/cancelled） |
| check_in_time | DATETIME | **签到时间** |
| check_in_status | ENUM | **签到状态（not_checked_in/checked_in）** |
| check_in_by | INT | **签到操作管理员ID** |

---

## 权限系统

### 角色定义

| 角色 | 说明 |
|------|------|
| 普通管理员 | 根据分配的权限操作相应模块 |
| 超级管理员 | 手机号 `18786898944`，拥有所有权限 |

### 权限类型

| 权限标识 | 说明 |
|----------|------|
| user_manage | 用户管理 |
| book_manage | 图书管理 |
| borrow_manage | 借阅管理 |
| activity_manage | 活动管理 |
| notification_manage | 通知管理 |

### 权限验证装饰器

```python
from backend.auth import login_required, admin_required, super_admin_required, is_super_admin

# 需要登录
@login_required
def some_api():
    pass

# 需要管理员权限
@admin_required
def admin_api():
    pass

# 需要超级管理员权限
@super_admin_required
def super_admin_api():
    pass

# 判断是否是超级管理员
if is_super_admin(admin=current_admin):
    # 执行超级管理员操作
    pass
```

---

## 数据库迁移

当 `models.py` 有结构变更时，需要执行数据库迁移SQL。

### activity_registrations 表（签到功能）

```sql
ALTER TABLE activity_registrations 
ADD COLUMN check_in_time DATETIME NULL,
ADD COLUMN check_in_status ENUM('not_checked_in', 'checked_in') DEFAULT 'not_checked_in',
ADD COLUMN check_in_by INT NULL;
```

### borrow_requests 表（取书确认）

```sql
ALTER TABLE borrow_requests 
MODIFY COLUMN status ENUM('pending', 'approved', 'picked_up', 'rejected') DEFAULT 'pending';
```

---

## 开发规范

### API 响应格式

```python
# 成功
return jsonify({'ok': True, 'message': '操作成功', 'data': {...}})

# 失败
return jsonify({'ok': False, 'message': '错误信息'}), 400
```

### 错误处理

```python
try:
    # 业务逻辑
    db.session.commit()
    return jsonify({'ok': True, 'message': '操作成功'})
except Exception as e:
    db.session.rollback()
    import traceback
    traceback.print_exc()
    return jsonify({'ok': False, 'message': str(e)}), 500
```

### 事务处理

```python
try:
    # 数据库操作
    db.session.add(obj)
    db.session.commit()
except Exception as e:
    db.session.rollback()
    raise
```

---

## 常用命令

### 启动开发服务器

```bash
cd backend
python app.py
```

### 数据库操作

```bash
# 进入MySQL容器
docker compose exec mysql mysql -u zytx_user -p zytx

# 备份数据库
docker compose exec mysql mysqldump -u root -p zytx > backup.sql

# 导入SQL
docker compose exec -T mysql mysql -u zytx_user -p zytx < backup.sql
```

### 查看日志

```bash
docker compose logs -f flask
```

---

## 注意事项

1. **环境变量**: 敏感信息（SECRET_KEY、数据库密码等）放在 `.env` 文件中，不要提交到 Git
2. **生产环境**: `DEBUG=False`
3. **定期备份**: 定期备份数据库
4. **Token 过期**: 默认4小时，可在 `auth.py` 中修改