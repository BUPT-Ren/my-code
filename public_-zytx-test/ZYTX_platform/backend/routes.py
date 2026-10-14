from flask import Blueprint, request, jsonify, current_app, Response, stream_with_context
from sqlalchemy import text, or_, func
from datetime import datetime, timedelta
import json
import hashlib
import csv
import io
import re
from .db_utils import db_manager
import traceback
from . import db, limiter
from .models import User, Book, BorrowRecord, Favorite, Notification, AIRecommendation, AIChatHistory, BorrowRequest, Admin, Activity, ActivitySummary, ActivityRegistration, ActivityPost, ActivityComment, ActivityLike, ActivitySummaryLike, BookReview, PasswordResetRequest
from .ai_service import ai_service, build_recommend_prompt, parse_recommend_response
from .auth import generate_token, login_required, get_current_user_id, admin_required, get_current_admin, super_admin_required, is_super_admin, SUPER_ADMIN_PHONE
from werkzeug.security import generate_password_hash, check_password_hash

api_bp = Blueprint('api', __name__)

def execute_procedure(proc_name, params=None):
    """
    执行存储过程的修复版本
    解决 "Commands out of sync" 问题
    """
    params = params or {}
    
    # 构建 CALL 语句
    param_placeholders = ', '.join([f':{key}' for key in params.keys()])
    sql = f"CALL {proc_name}({param_placeholders})"
    
    print(f"执行存储过程: {proc_name}, 参数: {params}")
    
    try:
        # 使用独立的连接，避免会话状态污染
        with db.engine.connect() as connection:
            # 使用 text() 包装 SQL
            result = connection.execute(text(sql), params)
            
            # 处理多个结果集
            all_results = []
            while True:
                try:
                    # 获取当前结果集
                    rows = result.fetchall()
                    if rows:
                        # 转换为字典
                        dict_rows = []
                        for row in rows:
                            row_dict = {}
                            for idx, column in enumerate(result.keys()):
                                value = row[idx]
                                # 处理特殊数据类型
                                if hasattr(value, 'isoformat'):
                                    row_dict[column] = value.isoformat()
                                elif isinstance(value, (bytes, bytearray)):
                                    row_dict[column] = value.decode('utf-8', errors='ignore')
                                elif isinstance(value, (list, dict)):
                                    row_dict[column] = json.dumps(value)
                                else:
                                    row_dict[column] = value
                            dict_rows.append(row_dict)
                        all_results.append(dict_rows)
                except Exception as fetch_err:
                    # 这个结果集没有行数据，可能是 UPDATE/INSERT
                    pass
                
                # 移动到下一个结果集
                try:
                    if not result.nextset():
                        break
                except:
                    break
            
            # 关闭结果集
            try:
                result.close()
            except:
                pass
            
            # 通常返回第一个结果集
            return all_results[0] if all_results else []
            
    except Exception as e:
        current_app.logger.error(f"存储过程 {proc_name} 执行失败: {str(e)}")
        raise e


def safe_call_procedure(proc_name, params=None):
    """
    安全调用存储过程 - 彻底解决 out of sync 问题
    使用 SQLAlchemy 原生方式，确保所有结果集都被正确读取
    """
    params = params or {}
    
    # 构建 CALL 语句
    param_names = list(params.keys())
    param_placeholders = ', '.join([f':{name}' for name in param_names])
    sql = f"CALL {proc_name}({param_placeholders})"
    
    print(f"安全调用存储过程: {proc_name}, 参数: {params}")
    
    try:
        # 使用原始的数据库连接
        with db.engine.raw_connection() as raw_conn:
            with raw_conn.cursor() as cursor:
                # 执行存储过程
                cursor.callproc(proc_name, list(params.values()))
                
                # 获取所有结果集
                results = []
                while True:
                    try:
                        # 获取当前结果集
                        rows = cursor.fetchall()
                        if rows:
                            # 获取列名
                            column_names = [desc[0] for desc in cursor.description]
                            # 转换为字典
                            dict_rows = []
                            for row in rows:
                                row_dict = {}
                                for idx, col_name in enumerate(column_names):
                                    value = row[idx]
                                    # 处理特殊类型
                                    if hasattr(value, 'isoformat'):
                                        row_dict[col_name] = value.isoformat()
                                    elif isinstance(value, bytes):
                                        try:
                                            row_dict[col_name] = value.decode('utf-8')
                                        except:
                                            row_dict[col_name] = str(value)
                                    else:
                                        row_dict[col_name] = value
                                dict_rows.append(row_dict)
                            results.append(dict_rows)
                    except Exception as fetch_error:
                        # 这个结果集没有行数据
                        pass
                    
                    # 移动到下一个结果集
                    try:
                        if not cursor.nextset():
                            break
                    except Exception:
                        break
                
                # 提交事务
                raw_conn.commit()
                
                # 返回第一个结果集（通常是主要结果）
                return results[0] if results else []
                
    except Exception as e:
        print(f"存储过程 {proc_name} 调用失败: {e}")
        raise e
def call_proc(sql, params=None):
    """
    兼容旧有代码的简易封装：接收形如 "CALL sp_name(:p_a, :p_b)" 的字符串
    并提取存储过程名后调用 db_manager.call_procedure_simple。
    如果 db_manager 不可用或调用失败，回退到 safe_call_procedure。
    """
    params = params or {}
    try:
        proc = sql.strip()
        if proc.upper().startswith('CALL '):
            proc = proc[5:]
        # 去除参数部分
        if '(' in proc:
            proc = proc.split('(')[0]
        proc = proc.strip()
        # 优先使用 db_manager 的简易调用
        try:
            return db_manager.call_procedure_simple(proc, params)
        except Exception:
            # 回退到安全的调用实现
            try:
                return safe_call_procedure(proc, params)
            except Exception as e:
                current_app.logger.error(f"call_proc 回退 safe_call_procedure 失败: {e}")
                raise
    except Exception as e:
        current_app.logger.error(f"call_proc 封装失败: {e}")
        raise

# --- 用户认证 ---
@api_bp.route('/auth/register', methods=['POST'])
@limiter.limit("3 per minute")
def register():
    data = request.get_json() or {}
    phone = data.get('identifier')
    password = data.get('password')
    birthday = data.get('birthday')
    hobbies = data.get('hobbies')
    school = data.get('school')
    avatar_url = data.get('avatar_url')

    if not phone or not password:
        return jsonify({'ok': False, 'message': '手机号和密码不能为空'}), 400
    
    # 验证手机号格式
    import re
    if not re.match(r'^1[3-9]\d{9}$', phone):
        return jsonify({'ok': False, 'message': '手机号格式不正确'}), 400
    
    # 验证密码强度
    if len(password) < 6:
        return jsonify({'ok': False, 'message': '密码长度不能少于6位'}), 400

    try:
        # 检查手机号是否已存在
        existing_user = User.query.filter_by(phone=phone).first()
        if existing_user:
            return jsonify({'ok': False, 'message': '手机号已存在'}), 400
        
        # 创建新用户
        user = User(
            phone=phone,
            password_hash=generate_password_hash(password),
            birthday=birthday if birthday else None,
            hobbies=hobbies if hobbies else None,
            school=school if school else None,
            avatar_url=avatar_url if avatar_url else None,
            status='active'
        )
        
        db.session.add(user)
        db.session.commit()
        
        token = generate_token(user.user_id)
        
        return jsonify({
            'ok': True,
            'message': '注册成功',
            'token': token,
            'user': {
                'user_id': user.user_id,
                'phone': user.phone,
                'status': user.status
            }
        }), 201
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    identifier = data.get('identifier')
    password = data.get('password')
    
    if not identifier or not password:
        return jsonify({'ok': False, 'message': '手机号和密码不能为空'}), 400
    
    try:
        user = User.query.filter_by(phone=identifier).first()
        
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 401
        
        if user.status == 'suspended':
            return jsonify({'ok': False, 'message': '账号已被禁用'}), 403
        
        if user.password_hash and ':' in user.password_hash:
            password_valid = check_password_hash(user.password_hash, password)
        elif user.password_hash and len(user.password_hash) == 32 and all(c in '0123456789abcdef' for c in user.password_hash.lower()):
            password_valid = (user.password_hash.lower() == hashlib.md5(password.encode()).hexdigest())
        else:
            password_valid = False
        
        if not password_valid:
            return jsonify({'ok': False, 'message': '密码错误'}), 401
        
        token = generate_token(user.user_id)
        
        return jsonify({
            'ok': True,
            'message': '登录成功',
            'token': token,
            'user': {
                'user_id': user.user_id,
                'phone': user.phone,
                'status': user.status
            }
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/auth/password-reset-request', methods=['POST'])
@limiter.limit("3 per hour")
def submit_password_reset_request():
    """用户提交密码重置申请"""
    data = request.get_json() or {}
    phone = data.get('phone', '').strip()
    reason = data.get('reason', '').strip()
    
    if not phone:
        return jsonify({'ok': False, 'message': '请输入手机号'}), 400
    
    if not re.match(r'^1[3-9]\d{9}$', phone):
        return jsonify({'ok': False, 'message': '请输入正确的手机号'}), 400
    
    try:
        user = User.query.filter_by(phone=phone).first()
        if not user:
            return jsonify({'ok': False, 'message': '该手机号未注册'}), 404
        
        pending_request = PasswordResetRequest.query.filter_by(
            user_id=user.user_id,
            status='pending'
        ).first()
        if pending_request:
            return jsonify({'ok': False, 'message': '您已有待处理的申请，请等待管理员处理'}), 400
        
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = PasswordResetRequest.query.filter(
            PasswordResetRequest.user_id == user.user_id,
            PasswordResetRequest.created_at >= today_start
        ).count()
        if today_count >= 3:
            return jsonify({'ok': False, 'message': '今日申请次数已达上限，请明天再试'}), 429
        
        reset_request = PasswordResetRequest(
            user_id=user.user_id,
            phone=phone,
            reason=reason
        )
        db.session.add(reset_request)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '申请已提交，请等待管理员处理'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/auth/verify', methods=['GET'])
def verify_token_api():
    """验证 token 是否有效"""
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header:
        return jsonify({'ok': False, 'message': '未登录'}), 401
    
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
    else:
        token = auth_header
    
    from .auth import verify_token
    success, user_id, error = verify_token(token)
    
    if success:
        return jsonify({'ok': True, 'user_id': user_id})
    else:
        return jsonify({'ok': False, 'message': error}), 401


@api_bp.route('/auth/check-admin', methods=['GET'])
def check_admin():
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header:
        return jsonify({'ok': False, 'is_admin': False, 'message': '未登录'}), 401
    
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
    else:
        token = auth_header
    
    from .auth import verify_token
    success, user_id, error = verify_token(token)
    
    if not success:
        return jsonify({'ok': False, 'is_admin': False, 'message': error}), 401
    
    try:
        admin = Admin.query.filter_by(user_id=user_id).first()
        
        if admin:
            user = User.query.get(user_id)
            is_super = user and user.phone == SUPER_ADMIN_PHONE
            return jsonify({
                'ok': True,
                'is_admin': True,
                'level': admin.level,
                'admin_level': admin.level,
                'phone': user.phone if user else None,
                'is_super': is_super
            })
        else:
            return jsonify({
                'ok': True,
                'is_admin': False
            })
            
    except Exception as e:
        return jsonify({'ok': False, 'is_admin': False, 'message': str(e)}), 500


@api_bp.route('/auth/register-admin', methods=['POST'])
@limiter.limit("3 per minute")
def register_admin():
    data = request.get_json() or {}
    phone = data.get('identifier')
    password = data.get('password')
    admin_key = data.get('admin_key')
    birthday = data.get('birthday')
    hobbies = data.get('hobbies')
    school = data.get('school')
    
    if not phone or not password:
        return jsonify({'ok': False, 'message': '手机号和密码不能为空'}), 400
    
    import re
    if not re.match(r'^1[3-9]\d{9}$', phone):
        return jsonify({'ok': False, 'message': '手机号格式不正确'}), 400
    
    if len(password) < 6:
        return jsonify({'ok': False, 'message': '密码长度不能少于6位'}), 400
    
    if not admin_key:
        return jsonify({'ok': False, 'message': '管理员密钥不能为空'}), 400
    
    valid_admin_key = current_app.config.get('ADMIN_REGISTER_KEY')
    if not valid_admin_key:
        return jsonify({'ok': False, 'message': '系统配置错误，请联系管理员'}), 500
    if admin_key != valid_admin_key:
        return jsonify({'ok': False, 'message': '管理员密钥错误'}), 403
    
    try:
        existing_user = User.query.filter_by(phone=phone).first()
        if existing_user:
            return jsonify({'ok': False, 'message': '手机号已存在'}), 400
        
        user = User(
            phone=phone,
            password_hash=generate_password_hash(password),
            birthday=birthday if birthday else None,
            hobbies=hobbies if hobbies else None,
            school=school if school else None,
            status='active'
        )
        
        db.session.add(user)
        db.session.flush()
        
        admin = Admin(
            user_id=user.user_id,
            level='normal'
        )
        db.session.add(admin)
        db.session.commit()
        
        token = generate_token(user.user_id)
        
        return jsonify({
            'ok': True,
            'message': '管理员注册成功',
            'token': token,
            'user': {
                'user_id': user.user_id,
                'phone': user.phone,
                'status': user.status,
                'is_admin': True
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# 图书管理 API
# ============================================

@api_bp.route('/admin/books', methods=['GET'])
@login_required
@admin_required
def admin_get_books():
    """管理员获取图书列表"""
    search = request.args.get('search', '')
    genre = request.args.get('genre', '')
    status = request.args.get('status', '')
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 20)), 100)
    
    try:
        query = Book.query
        
        if search:
            query = query.filter(
                or_(
                    Book.title.ilike(f'%{search}%'),
                    Book.author.ilike(f'%{search}%'),
                    Book.isbn.ilike(f'%{search}%')
                )
            )
        
        if genre:
            query = query.filter(func.json_contains(Book.genres, f'"{genre}"'))
        
        if status == 'available':
            query = query.filter(Book.available_copies > 0)
        elif status == 'unavailable':
            query = query.filter(Book.available_copies <= 0)
        
        total = query.count()
        books = query.order_by(Book.created_at.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()
        
        return jsonify({
            'ok': True,
            'books': [book.to_dict() for book in books],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'pages': (total + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/books/export', methods=['GET'])
@login_required
@admin_required
def admin_export_books():
    """管理员导出图书列表（CSV）"""
    search = request.args.get('search', '')
    genre = request.args.get('genre', '')
    status = request.args.get('status', '')
    
    try:
        query = Book.query
        
        if search:
            query = query.filter(
                or_(
                    Book.title.ilike(f'%{search}%'),
                    Book.author.ilike(f'%{search}%'),
                    Book.isbn.ilike(f'%{search}%')
                )
            )
        
        if genre:
            query = query.filter(func.json_contains(Book.genres, f'"{genre}"'))
        
        if status == 'available':
            query = query.filter(Book.available_copies > 0)
        elif status == 'unavailable':
            query = query.filter(Book.available_copies <= 0)
        
        books = query.order_by(Book.created_at.desc()).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'ISBN', '书名', '作者', '分类', '简介', '出版日期',
            '总库存', '可借数量', '封面链接', '豆瓣链接', '视频链接'
        ])
        
        for book in books:
            isbn = book.isbn or ''
            title = book.title or ''
            author = book.author or ''
            genres = '; '.join(book.genres) if book.genres else ''
            introduction = book.introduction or ''
            publish_date = book.publish_date.strftime('%Y-%m-%d') if book.publish_date else ''
            total_copies = book.total_copies or 0
            available_copies = book.available_copies or 0
            cover_url = book.cover_url or ''
            douban_link = book.douban_link or ''
            video_link = book.video_link or ''
            
            writer.writerow([
                isbn, title, author, genres, introduction, publish_date,
                total_copies, available_copies, cover_url, douban_link, video_link
            ])
        
        output.seek(0)
        date_str = datetime.now().strftime('%Y-%m-%d')
        
        response = Response(
            '\ufeff' + output.getvalue(),
            mimetype='text/csv;charset=utf-8',
            headers={'Content-Disposition': f'attachment;filename=books_{date_str}.csv'}
        )
        return response
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/books/ids', methods=['GET'])
@login_required
@admin_required
def admin_get_book_ids():
    """管理员获取当前筛选条件下所有图书ID"""
    search = request.args.get('search', '')
    genre = request.args.get('genre', '')
    status = request.args.get('status', '')
    
    try:
        query = Book.query
        
        if search:
            query = query.filter(
                or_(
                    Book.title.ilike(f'%{search}%'),
                    Book.author.ilike(f'%{search}%'),
                    Book.isbn.ilike(f'%{search}%')
                )
            )
        
        if genre:
            query = query.filter(func.json_contains(Book.genres, f'"{genre}"'))
        
        if status == 'available':
            query = query.filter(Book.available_copies > 0)
        elif status == 'unavailable':
            query = query.filter(Book.available_copies <= 0)
        
        books = query.with_entities(Book.book_id).all()
        book_ids = [b.book_id for b in books]
        
        return jsonify({
            'ok': True,
            'book_ids': book_ids,
            'total': len(book_ids)
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/books', methods=['POST'])
@login_required
@admin_required
def admin_create_book():
    """管理员新增图书"""
    data = request.get_json() or {}
    
    isbn = data.get('isbn', '').strip()
    title = data.get('title', '').strip()
    author = data.get('author', '').strip()
    genres = data.get('genres', [])
    introduction = data.get('introduction', '').strip()
    publish_date = data.get('publish_date')
    total_copies = data.get('total_copies', 1)
    cover_url = data.get('cover_url', '').strip()
    douban_link = data.get('douban_link', '').strip()
    video_link = data.get('video_link', '').strip()
    
    if not isbn:
        return jsonify({'ok': False, 'message': 'ISBN不能为空'}), 400
    if not title:
        return jsonify({'ok': False, 'message': '书名不能为空'}), 400
    
    try:
        existing = Book.query.filter_by(isbn=isbn).first()
        if existing:
            return jsonify({'ok': False, 'message': '该ISBN已存在'}), 400
        
        book = Book(
            isbn=isbn,
            title=title,
            author=author,
            genres=genres if isinstance(genres, list) else [],
            introduction=introduction,
            publish_date=datetime.strptime(publish_date, '%Y-%m-%d').date() if publish_date else None,
            total_copies=total_copies,
            available_copies=total_copies,
            cover_url=cover_url,
            douban_link=douban_link,
            video_link=video_link
        )
        
        db.session.add(book)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '图书添加成功',
            'book': book.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/books/<int:book_id>', methods=['PUT'])
@login_required
@admin_required
def admin_update_book(book_id):
    """管理员编辑图书"""
    data = request.get_json() or {}
    
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({'ok': False, 'message': '图书不存在'}), 404
        
        if 'isbn' in data:
            new_isbn = data['isbn'].strip()
            if new_isbn and new_isbn != book.isbn:
                existing = Book.query.filter(Book.isbn == new_isbn, Book.book_id != book_id).first()
                if existing:
                    return jsonify({'ok': False, 'message': '该ISBN已被其他图书使用'}), 400
                book.isbn = new_isbn
        
        if 'title' in data:
            book.title = data['title'].strip()
        if 'author' in data:
            book.author = data['author'].strip()
        if 'genres' in data:
            book.genres = data['genres'] if isinstance(data['genres'], list) else []
        if 'introduction' in data:
            book.introduction = data['introduction'].strip()
        if 'publish_date' in data:
            book.publish_date = datetime.strptime(data['publish_date'], '%Y-%m-%d').date() if data['publish_date'] else None
        if 'total_copies' in data:
            diff = data['total_copies'] - book.total_copies
            book.total_copies = data['total_copies']
            book.available_copies = max(0, book.available_copies + diff)
        if 'cover_url' in data:
            book.cover_url = data['cover_url'].strip()
        if 'douban_link' in data:
            book.douban_link = data['douban_link'].strip()
        if 'video_link' in data:
            book.video_link = data['video_link'].strip()
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '图书更新成功',
            'book': book.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/books/<int:book_id>', methods=['DELETE'])
@login_required
@admin_required
def admin_delete_book(book_id):
    """管理员删除图书"""
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({'ok': False, 'message': '图书不存在'}), 404
        
        borrowed_count = BorrowRecord.query.filter_by(book_id=book_id, status='borrowed').count()
        if borrowed_count > 0:
            return jsonify({'ok': False, 'message': f'该图书有 {borrowed_count} 本正在借阅中，无法删除'}), 400
        
        db.session.delete(book)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '图书删除成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# 用户管理 API
# ============================================

@api_bp.route('/admin/users', methods=['GET'])
@login_required
@admin_required
def admin_get_users():
    """管理员获取用户列表"""
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    user_type = request.args.get('user_type', '')
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 20)), 100)
    
    try:
        query = User.query
        
        if search:
            query = query.filter(
                or_(
                    User.phone.ilike(f'%{search}%'),
                    User.school.ilike(f'%{search}%')
                )
            )
        
        if status:
            query = query.filter_by(status=status)
        
        admin_user_ids = db.session.query(Admin.user_id).subquery()
        
        if user_type == 'admin':
            query = query.filter(User.user_id.in_(admin_user_ids))
        elif user_type == 'phone':
            query = query.filter(
                User.phone.op('REGEXP')('^1[3-9][0-9]{9}$'),
                ~User.user_id.in_(admin_user_ids)
            )
        elif user_type == 'education':
            query = query.filter(
                ~User.phone.op('REGEXP')('^1[3-9][0-9]{9}$'),
                ~User.user_id.in_(admin_user_ids)
            )
        
        total = query.count()
        users = query.order_by(User.created_at.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()
        
        result = []
        for user in users:
            user_data = user.to_dict()
            user_data['borrow_count'] = BorrowRecord.query.filter_by(user_id=user.user_id).count()
            user_data['active_borrow_count'] = BorrowRecord.query.filter_by(user_id=user.user_id, status='borrowed').count()
            admin = Admin.query.filter_by(user_id=user.user_id).first()
            user_data['is_admin'] = admin is not None
            user_data['admin_level'] = admin.level if admin else None
            result.append(user_data)
        
        return jsonify({
            'ok': True,
            'users': result,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'pages': (total + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/users/ids', methods=['GET'])
@login_required
@admin_required
def admin_get_user_ids():
    """管理员获取当前筛选条件下所有用户ID"""
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    
    try:
        query = User.query
        
        if search:
            query = query.filter(
                or_(
                    User.phone.ilike(f'%{search}%'),
                    User.school.ilike(f'%{search}%')
                )
            )
        
        if status:
            query = query.filter_by(status=status)
        
        users = query.with_entities(User.user_id).all()
        user_ids = [u.user_id for u in users]
        
        return jsonify({
            'ok': True,
            'user_ids': user_ids,
            'total': len(user_ids)
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/users/<int:user_id>', methods=['GET'])
@login_required
@admin_required
def admin_get_user_detail(user_id):
    """管理员获取用户详情"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        user_data = user.to_dict()
        user_data['total_borrowed'] = BorrowRecord.query.filter_by(user_id=user_id).count()
        user_data['current_borrowed'] = BorrowRecord.query.filter_by(user_id=user_id, status='borrowed').count()
        user_data['favorite_count'] = Favorite.query.filter_by(user_id=user_id).count()
        
        admin = Admin.query.filter_by(user_id=user_id).first()
        user_data['is_admin'] = admin is not None
        user_data['admin_level'] = admin.level if admin else None
        
        return jsonify({
            'ok': True,
            'user': user_data
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@login_required
@admin_required
def admin_update_user(user_id):
    """管理员编辑用户"""
    data = request.get_json() or {}
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        if 'school' in data:
            user.school = data['school'].strip() if data['school'] else None
        if 'birthday' in data:
            user.birthday = datetime.strptime(data['birthday'], '%Y-%m-%d').date() if data['birthday'] else None
        if 'hobbies' in data:
            user.hobbies = data['hobbies'] if isinstance(data['hobbies'], list) else []
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url'].strip() if data['avatar_url'] else None
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '用户信息更新成功',
            'user': user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/users/<int:user_id>/status', methods=['PATCH'])
@login_required
@admin_required
def admin_toggle_user_status(user_id):
    """管理员启用/禁用用户"""
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if new_status not in ['active', 'suspended']:
        return jsonify({'ok': False, 'message': '无效的状态'}), 400
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        admin = Admin.query.filter_by(user_id=user_id).first()
        if admin and admin.level == 'super':
            current_admin = get_current_admin()
            if current_admin.level != 'super':
                return jsonify({'ok': False, 'message': '无法修改超级管理员状态'}), 403
        
        user.status = new_status
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'用户已{"启用" if new_status == "active" else "禁用"}',
            'user': user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/users/<int:user_id>/reset-password', methods=['POST'])
@login_required
@admin_required
def admin_reset_user_password(user_id):
    """管理员重置用户密码"""
    data = request.get_json() or {}
    new_password = data.get('new_password', '123456')
    
    if len(new_password) < 6:
        return jsonify({'ok': False, 'message': '密码长度不能少于6位'}), 400
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '密码重置成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def admin_delete_user(user_id):
    """管理员删除用户"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        admin = Admin.query.filter_by(user_id=user_id).first()
        if admin:
            return jsonify({'ok': False, 'message': '无法删除管理员账号，请先移除管理员权限'}), 400
        
        active_borrows = BorrowRecord.query.filter_by(user_id=user_id, status='borrowed').count()
        if active_borrows > 0:
            return jsonify({'ok': False, 'message': f'该用户有 {active_borrows} 本书正在借阅中，无法删除'}), 400
        
        BorrowRecord.query.filter_by(user_id=user_id).delete()
        Favorite.query.filter_by(user_id=user_id).delete()
        Notification.query.filter_by(receiver_id=user_id).delete()
        AIChatHistory.query.filter_by(user_id=user_id).delete()
        BorrowRequest.query.filter_by(user_id=user_id).delete()
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '用户删除成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/users/batch-import', methods=['POST'])
@login_required
@admin_required
def admin_batch_import_users():
    """管理员批量导入用户（支持Excel和CSV）"""
    try:
        if 'file' not in request.files:
            return jsonify({'ok': False, 'message': '请选择文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'ok': False, 'message': '请选择文件'}), 400
        
        filename = file.filename.lower()
        
        if filename.endswith('.csv'):
            users_data = parse_csv_users(file)
        elif filename.endswith(('.xlsx', '.xls')):
            users_data = parse_excel_users(file)
        else:
            return jsonify({'ok': False, 'message': '仅支持 .xlsx、.xls、.csv 格式文件'}), 400
        
        if not users_data:
            return jsonify({'ok': False, 'message': '文件中没有有效数据'}), 400
        
        success_count = 0
        failed_count = 0
        errors = []
        
        for idx, user_data in enumerate(users_data, start=2):
            phone = user_data.get('phone', '').strip()
            password = user_data.get('password', '').strip() or '123456'
            school = user_data.get('school', '').strip() or None
            birthday = user_data.get('birthday', '').strip() or None
            
            if not phone:
                errors.append(f"第{idx}行: 手机号不能为空")
                failed_count += 1
                continue
            
            existing = User.query.filter_by(phone=phone).first()
            if existing:
                errors.append(f"第{idx}行: 手机号已存在 ({phone})")
                failed_count += 1
                continue
            
            if len(password) < 6:
                errors.append(f"第{idx}行: 密码长度不能少于6位")
                failed_count += 1
                continue
            
            try:
                user = User(
                    phone=phone,
                    password_hash=generate_password_hash(password),
                    school=school,
                    status='active'
                )
                
                if birthday:
                    try:
                        user.birthday = datetime.strptime(birthday, '%Y-%m-%d').date()
                    except ValueError:
                        try:
                            user.birthday = datetime.strptime(birthday, '%Y/%m/%d').date()
                        except ValueError:
                            errors.append(f"第{idx}行: 生日格式不正确 ({birthday})")
                            pass
                
                db.session.add(user)
                success_count += 1
                
            except Exception as e:
                errors.append(f"第{idx}行: 创建用户失败 - {str(e)}")
                failed_count += 1
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'导入完成：成功 {success_count} 条，失败 {failed_count} 条',
            'success_count': success_count,
            'failed_count': failed_count,
            'errors': errors[:20]
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': f'导入失败: {str(e)}'}), 500


def parse_csv_users(file):
    """解析CSV文件中的用户数据"""
    users = []
    content = file.read().decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(content))
    
    for row in reader:
        user = {
            'phone': row.get('手机号', row.get('phone', '')),
            'password': row.get('密码', row.get('password', '')),
            'school': row.get('学校', row.get('school', '')),
            'birthday': row.get('生日', row.get('birthday', ''))
        }
        users.append(user)
    
    return users


def parse_excel_users(file):
    """解析Excel文件中的用户数据"""
    from openpyxl import load_workbook
    
    users = []
    wb = load_workbook(file)
    ws = wb.active
    
    headers = []
    for cell in ws[1]:
        headers.append(str(cell.value).strip() if cell.value else '')
    
    phone_idx = -1
    password_idx = -1
    school_idx = -1
    birthday_idx = -1
    
    for idx, header in enumerate(headers):
        if header in ['手机号', 'phone']:
            phone_idx = idx
        elif header in ['密码', 'password']:
            password_idx = idx
        elif header in ['学校', 'school']:
            school_idx = idx
        elif header in ['生日', 'birthday']:
            birthday_idx = idx
    
    if phone_idx == -1:
        return []
    
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or not row[phone_idx]:
            continue
        
        user = {
            'phone': str(row[phone_idx]) if row[phone_idx] else '',
            'password': str(row[password_idx]) if password_idx >= 0 and row[password_idx] else '',
            'school': str(row[school_idx]) if school_idx >= 0 and row[school_idx] else '',
            'birthday': str(row[birthday_idx]) if birthday_idx >= 0 and row[birthday_idx] else ''
        }
        users.append(user)
    
    return users


@api_bp.route('/admin/users/import-template', methods=['GET'])
def download_user_import_template():
    """下载用户导入模板"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill
    
    wb = Workbook()
    ws = wb.active
    ws.title = '用户导入模板'
    
    headers = ['手机号', '密码', '学校', '生日']
    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal='center')
        cell.fill = PatternFill(start_color='E0E0E0', end_color='E0E0E0', fill_type='solid')
    
    ws.cell(row=2, column=1, value='13800138001')
    ws.cell(row=2, column=2, value='123456')
    ws.cell(row=2, column=3, value='示例学校')
    ws.cell(row=2, column=4, value='2000-01-01')
    
    ws.cell(row=3, column=1, value='13800138002')
    ws.cell(row=3, column=2, value='')
    ws.cell(row=3, column=3, value='测试学校')
    ws.cell(row=3, column=4, value='')
    
    ws.column_dimensions['A'].width = 15
    ws.column_dimensions['B'].width = 12
    ws.column_dimensions['C'].width = 20
    ws.column_dimensions['D'].width = 12
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return Response(
        output.getvalue(),
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=user_import_template.xlsx'}
    )


# --- 书目查询 ---
@api_bp.route('/genres', methods=['GET'])
def get_genres():
    """获取所有书籍类型（从数据库动态提取）"""
    try:
        books = Book.query.filter(Book.genres.isnot(None)).all()
        genres_set = set()
        
        for book in books:
            if book.genres:
                genres_list = book.genres if isinstance(book.genres, list) else json.loads(book.genres) if isinstance(book.genres, str) else []
                for g in genres_list:
                    if g and isinstance(g, str):
                        genres_set.add(g.strip())
        
        genres_list = sorted(list(genres_set))
        
        return jsonify({
            'ok': True,
            'genres': genres_list
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/books', methods=['GET'])
def list_books():
    """获取图书列表（支持多条件过滤）"""
    q = request.args.get('q', '')
    available = request.args.get('available', '')
    genre = request.args.get('genre', '')
    publish_year = request.args.get('publish_year', '')
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 20)), 100)
    
    try:
        query = Book.query
        
        # 关键词搜索（书名、作者、ISBN）
        if q:
            query = query.filter(
                or_(
                    Book.title.ilike(f'%{q}%'),
                    Book.author.ilike(f'%{q}%'),
                    Book.isbn.ilike(f'%{q}%')
                )
            )
        
        # 类型过滤（genres 是 JSON 数组）
        if genre:
            query = query.filter(func.json_contains(Book.genres, f'"{genre}"'))
        
        # 可用性过滤
        if available:
            if available == 'available':
                query = query.filter(Book.available_copies > 0)
            elif available == 'borrowed':
                query = query.filter(Book.available_copies <= 0)
        
        # 出版时间过滤
        if publish_year:
            now = datetime.now()
            if publish_year == '1':
                start_date = now - timedelta(days=365)
                query = query.filter(Book.publish_date >= start_date)
            elif publish_year == '3':
                start_date = now - timedelta(days=365*3)
                query = query.filter(Book.publish_date >= start_date)
            elif publish_year == '5':
                start_date = now - timedelta(days=365*5)
                query = query.filter(Book.publish_date >= start_date)
            elif publish_year == '5+':
                cutoff_date = now - timedelta(days=365*5)
                query = query.filter(Book.publish_date < cutoff_date)
        
        # 分页
        total = query.count()
        books = query.offset((page - 1) * page_size).limit(page_size).all()
        
        return jsonify({
            'ok': True,
            'books': [book.to_dict() for book in books],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'pages': (total + page_size - 1) // page_size
            }
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    """获取图书详情"""
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({'ok': False, 'message': '图书不存在'}), 404
        
        return jsonify({'ok': True, 'book': book.to_dict()})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# --- 借阅相关 ---
@api_bp.route('/borrow', methods=['POST'])
@login_required
def borrow():
    """借阅图书"""
    data = request.get_json() or {}
    user_id = get_current_user_id()
    book_id = data.get('book_id')
    book_title = data.get('book_title')

    try:
        if not book_id and book_title:
            book = Book.query.filter_by(title=book_title).first()
            if not book:
                return jsonify({'ok': False, 'message': '图书不存在'}), 404
            book_id = book.book_id

        if not book_id:
            return jsonify({'ok': False, 'message': 'book_id or book_title required'}), 400

        # 尝试调用存储过程 sp_borrow_book
        try:
            rows = call_proc(
                "CALL sp_borrow_book(:p_user_id, :p_book_id)",
                {'p_user_id': user_id, 'p_book_id': book_id}
            )

            if rows:
                result = rows[0]
                if 'message' in result and 'No available copies' in result['message']:
                    return jsonify({'ok': False, 'message': '图书已被借完'}), 400

                borrow_record = BorrowRecord.query.get(result.get('record_id'))
                return jsonify({
                    'ok': True,
                    'message': '借阅成功',
                    'record_id': result.get('record_id'),
                    'due_date': borrow_record.due_time.isoformat() if borrow_record else None
                })
        except Exception as e:
            current_app.logger.warning(f"sp_borrow_book 调用失败，尝试 ORM 回退：{e}")

        # 如果存储过程不可用，则使用 ORM 回退逻辑（尽量保证行为一致）
        try:
            book = Book.query.get(book_id)
            if not book:
                return jsonify({'ok': False, 'message': '图书不存在'}), 404
            if book.available_copies <= 0:
                return jsonify({'ok': False, 'message': '图书已被借完'}), 400

            # 扣减库存并创建借阅记录（默认 30 天）
            book.available_copies = book.available_copies - 1
            due = datetime.utcnow() + timedelta(days=30)
            br = BorrowRecord(user_id=user_id, book_id=book.book_id, due_time=due)
            db.session.add(br)
            db.session.commit()

            return jsonify({'ok': True, 'message': '借阅成功', 'record_id': br.record_id, 'due_date': due.isoformat()})
        except Exception as e:
            current_app.logger.error(f"ORM 回退借阅失败: {e}")
            return jsonify({'ok': False, 'message': '借阅失败'}), 500
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/return', methods=['POST'])
@login_required
def return_book():
    """归还图书"""
    data = request.get_json() or {}
    record_id = data.get('record_id')
    user_id = data.get('user_id')
    book_id = data.get('book_id')
    book_title = data.get('book_title')

    try:
        # 优先使用 record_id
        if record_id:
            rows = call_proc(
                "CALL sp_return_book(:p_record_id)",
                {'p_record_id': record_id}
            )
            return jsonify({
                'ok': True,
                'message': rows[0].get('message', '还书成功') if rows else '还书成功'
            })
        
        # 如果没有 record_id，需要 user_id 和 book_id/book_title
        if not user_id:
            return jsonify({'ok': False, 'message': 'record_id 或 user_id 必填'}), 400
        
        # 如果传了 book_title，查找 book_id
        if not book_id and book_title:
            book = Book.query.filter_by(title=book_title).first()
            if not book:
                return jsonify({'ok': False, 'message': '图书不存在'}), 404
            book_id = book.book_id
        
        if not book_id:
            return jsonify({'ok': False, 'message': 'book_id 或 book_title 必填'}), 400
        
        # 查找未归还的借阅记录
        borrow_record = BorrowRecord.query.filter_by(
            user_id=user_id,
            book_id=book_id,
            status='borrowed'
        ).first()
        
        if not borrow_record:
            return jsonify({'ok': False, 'message': '未找到未归还的借阅记录'}), 404
        
        # 调用存储过程还书
        rows = call_proc(
            "CALL sp_return_book(:p_record_id)",
            {'p_record_id': borrow_record.record_id}
        )
        
        return jsonify({
            'ok': True,
            'message': rows[0].get('message', '还书成功') if rows else '还书成功'
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# --- 借阅/归还申请（需管理员审核）---
@api_bp.route('/borrow/request', methods=['POST'])
@login_required
def borrow_request():
    """提交借书申请"""
    data = request.get_json() or {}
    book_id = data.get('book_id')
    book_title = data.get('book_title')
    
    # 从Token获取当前用户ID
    user_id = get_current_user_id()
    
    try:
        if not book_id and book_title:
            book = Book.query.filter_by(title=book_title).first()
            if not book:
                return jsonify({'ok': False, 'message': '图书不存在'}), 404
            book_id = book.book_id
        
        if not book_id:
            return jsonify({'ok': False, 'message': 'book_id or book_title required'}), 400
        
        # 检查是否已有待审核的借书申请
        existing_request = BorrowRequest.query.filter_by(
            user_id=user_id,
            book_id=book_id,
            request_type='borrow',
            status='pending'
        ).first()
        
        if existing_request:
            return jsonify({'ok': False, 'message': '您已提交过借书申请，请等待审核'}), 400
        
        # 检查是否已借阅该书且未归还
        borrowed = BorrowRecord.query.filter_by(
            user_id=user_id,
            book_id=book_id,
            status='borrowed'
        ).first()
        
        if borrowed:
            return jsonify({'ok': False, 'message': '您已借阅该书，请先归还'}), 400
        
        # 检查借阅数量限制（正在借阅 + 待审核借阅申请 <= 5）
        current_borrowed = BorrowRecord.query.filter_by(
            user_id=user_id,
            status='borrowed'
        ).count()
        
        pending_borrow_requests = BorrowRequest.query.filter_by(
            user_id=user_id,
            request_type='borrow',
            status='pending'
        ).count()
        
        if current_borrowed + pending_borrow_requests >= 5:
            return jsonify({
                'ok': False,
                'message': f'借阅已达上限（正在借阅{current_borrowed}本 + 待审核{pending_borrow_requests}本 = {current_borrowed + pending_borrow_requests}本，上限5本）'
            }), 400
        
        # 创建借书申请
        borrow_req = BorrowRequest(
            user_id=user_id,
            book_id=book_id,
            request_type='borrow',
            status='pending'
        )
        db.session.add(borrow_req)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '借书申请已提交，请等待管理员审核',
            'request_id': borrow_req.request_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/return/request', methods=['POST'])
@login_required
def return_request():
    """提交还书申请"""
    data = request.get_json() or {}
    record_id = data.get('record_id')
    book_id = data.get('book_id')
    book_title = data.get('book_title')
    
    # 从Token获取当前用户ID
    user_id = get_current_user_id()
    
    try:
        # 如果提供了record_id
        if record_id:
            borrow_record = BorrowRecord.query.get(record_id)
            if not borrow_record:
                return jsonify({'ok': False, 'message': '借阅记录不存在'}), 404
            if borrow_record.user_id != user_id:
                return jsonify({'ok': False, 'message': '无权操作此记录'}), 403
            if borrow_record.status != 'borrowed':
                return jsonify({'ok': False, 'message': '该书籍已归还或状态异常'}), 400
            book_id = borrow_record.book_id
        else:
            # 通过book_id或book_title查找
            if not book_id and book_title:
                book = Book.query.filter_by(title=book_title).first()
                if not book:
                    return jsonify({'ok': False, 'message': '图书不存在'}), 404
                book_id = book.book_id
            
            if not book_id:
                return jsonify({'ok': False, 'message': 'record_id or book_id required'}), 400
            
            borrow_record = BorrowRecord.query.filter_by(
                user_id=user_id,
                book_id=book_id,
                status='borrowed'
            ).first()
            
            if not borrow_record:
                return jsonify({'ok': False, 'message': '未找到未归还的借阅记录'}), 404
            
            record_id = borrow_record.record_id
        
        # 检查是否已有待审核的还书申请
        existing_request = BorrowRequest.query.filter_by(
            record_id=record_id,
            request_type='return',
            status='pending'
        ).first()
        
        if existing_request:
            return jsonify({'ok': False, 'message': '您已提交过还书申请，请等待审核'}), 400
        
        # 创建还书申请
        return_req = BorrowRequest(
            user_id=user_id,
            book_id=book_id,
            request_type='return',
            record_id=record_id,
            status='pending'
        )
        db.session.add(return_req)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '还书申请已提交，请等待管理员审核',
            'request_id': return_req.request_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/borrow/requests', methods=['GET'])
@login_required
def get_borrow_requests():
    """获取用户的借阅/归还申请列表"""
    user_id = get_current_user_id()
    request_type = request.args.get('type')
    status = request.args.get('status')
    
    try:
        query = BorrowRequest.query.filter_by(user_id=user_id)
        
        if request_type:
            query = query.filter_by(request_type=request_type)
        if status:
            query = query.filter_by(status=status)
        
        requests = query.order_by(BorrowRequest.request_time.desc()).all()
        
        return jsonify({
            'ok': True,
            'requests': [r.to_dict() for r in requests]
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/borrow/requests/<int:request_id>', methods=['GET'])
def get_borrow_request_detail(request_id):
    """获取申请详情"""
    try:
        req = BorrowRequest.query.get(request_id)
        if not req:
            return jsonify({'ok': False, 'message': '申请不存在'}), 404
        
        return jsonify({
            'ok': True,
            'request': req.to_dict()
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/borrow/pending-books', methods=['GET'])
@login_required
def get_pending_borrow_books():
    """获取用户所有待审核借阅申请的书籍ID列表"""
    user_id = get_current_user_id()
    
    try:
        pending_requests = BorrowRequest.query.filter_by(
            user_id=user_id,
            request_type='borrow',
            status='pending'
        ).all()
        
        pending_map = {}
        for req in pending_requests:
            pending_map[req.book_id] = req.request_id
        
        return jsonify({
            'ok': True,
            'pending_books': pending_map
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/borrow/requests/<int:request_id>/cancel', methods=['POST'])
@login_required
def cancel_borrow_request(request_id):
    """取消待审核的申请"""
    user_id = get_current_user_id()
    
    try:
        req = BorrowRequest.query.get(request_id)
        
        if not req:
            return jsonify({'ok': False, 'message': '申请不存在'}), 404
        
        if req.user_id != user_id:
            return jsonify({'ok': False, 'message': '无权操作此申请'}), 403
        
        if req.status != 'pending':
            return jsonify({'ok': False, 'message': '只能取消待审核的申请'}), 400
        
        db.session.delete(req)
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '申请已取消'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/renew/request', methods=['POST'])
@login_required
def renew_request():
    """提交续借申请"""
    data = request.get_json() or {}
    record_id = data.get('record_id')
    duration = data.get('duration', 7)
    reason = data.get('reason', '')
    
    if not record_id:
        return jsonify({'ok': False, 'message': 'record_id required'}), 400
    
    # 从Token获取当前用户ID
    user_id = get_current_user_id()
    
    try:
        # 检查借阅记录是否存在
        borrow_record = BorrowRecord.query.get(record_id)
        if not borrow_record:
            return jsonify({'ok': False, 'message': '借阅记录不存在'}), 404
        
        if borrow_record.user_id != user_id:
            return jsonify({'ok': False, 'message': '无权操作此记录'}), 403
        
        if borrow_record.status != 'borrowed':
            return jsonify({'ok': False, 'message': '该书籍已归还或状态异常'}), 400
        
        # 检查是否已有待审核的续借申请
        existing_request = BorrowRequest.query.filter_by(
            record_id=record_id,
            request_type='renew',
            status='pending'
        ).first()
        
        if existing_request:
            return jsonify({'ok': False, 'message': '您已提交过续借申请，请等待审核'}), 400
        
        # 计算新的归还日期
        from datetime import timedelta
        new_due_time = borrow_record.due_time + timedelta(days=duration)
        
        # 创建续借申请
        renew_req = BorrowRequest(
            user_id=user_id,
            book_id=borrow_record.book_id,
            request_type='renew',
            record_id=record_id,
            status='pending',
            reject_reason=reason,
            pickup_time=new_due_time
        )
        db.session.add(renew_req)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '续借申请已提交，请等待管理员审核',
            'request_id': renew_req.request_id,
            'new_due_time': new_due_time.isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/lost/request', methods=['POST'])
@login_required
def lost_request():
    """提交挂失申请"""
    data = request.get_json() or {}
    record_id = data.get('record_id')
    reason = data.get('reason', '')
    
    if not record_id:
        return jsonify({'ok': False, 'message': 'record_id required'}), 400
    
    # 从Token获取当前用户ID
    user_id = get_current_user_id()
    
    try:
        # 检查借阅记录是否存在
        borrow_record = BorrowRecord.query.get(record_id)
        if not borrow_record:
            return jsonify({'ok': False, 'message': '借阅记录不存在'}), 404
        
        if borrow_record.user_id != user_id:
            return jsonify({'ok': False, 'message': '无权操作此记录'}), 403
        
        if borrow_record.status != 'borrowed':
            return jsonify({'ok': False, 'message': '该书籍已归还或状态异常'}), 400
        
        # 检查是否已有待审核的挂失申请
        existing_request = BorrowRequest.query.filter_by(
            record_id=record_id,
            request_type='lost',
            status='pending'
        ).first()
        
        if existing_request:
            return jsonify({'ok': False, 'message': '您已提交过挂失申请，请等待审核'}), 400
        
        # 创建挂失申请
        lost_req = BorrowRequest(
            user_id=user_id,
            book_id=borrow_record.book_id,
            request_type='lost',
            record_id=record_id,
            status='pending',
            reject_reason=reason  # 存储挂失原因
        )
        db.session.add(lost_req)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '挂失申请已提交，请等待管理员处理',
            'request_id': lost_req.request_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/borrow/check-pending', methods=['GET'])
def check_pending_request():
    """检查用户对某本书是否有待审核的申请"""
    user_id = request.args.get('user_id')
    book_id = request.args.get('book_id')
    
    if not user_id or not book_id:
        return jsonify({'ok': False, 'message': 'user_id and book_id required'}), 400
    
    try:
        # 检查借书申请
        borrow_request = BorrowRequest.query.filter_by(
            user_id=user_id,
            book_id=book_id,
            request_type='borrow',
            status='pending'
        ).first()
        
        # 检查还书申请（需要通过record_id关联）
        return_request = None
        borrow_record = BorrowRecord.query.filter_by(
            user_id=user_id,
            book_id=book_id,
            status='borrowed'
        ).first()
        
        if borrow_record:
            return_request = BorrowRequest.query.filter_by(
                record_id=borrow_record.record_id,
                request_type='return',
                status='pending'
            ).first()
        
        return jsonify({
            'ok': True,
            'has_pending_borrow': borrow_request is not None,
            'has_pending_return': return_request is not None,
            'borrow_request_id': borrow_request.request_id if borrow_request else None,
            'return_request_id': return_request.request_id if return_request else None
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# --- 收藏管理 ---
@api_bp.route('/favorites', methods=['GET'])
@login_required
def get_favorites():
    """获取收藏列表"""
    user_id = get_current_user_id()
    
    try:
        favorites = Favorite.query.filter_by(user_id=user_id).all()
        favorites_data = []
        
        for fav in favorites:
            book_data = fav.book.to_dict() if fav.book else {}
            book_data['favorite_id'] = fav.favorite_id
            book_data['favorited_at'] = fav.created_at.isoformat() if fav.created_at else None
            favorites_data.append(book_data)
        
        return jsonify({'ok': True, 'favorites': favorites_data})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/favorites', methods=['POST'])
@login_required
def add_favorite():
    """添加收藏"""
    data = request.get_json() or {}
    user_id = get_current_user_id()
    book_id = data.get('book_id')
    
    if not book_id:
        return jsonify({'ok': False, 'message': 'book_id required'}), 400
    
    try:
        # 检查是否已收藏
        existing = Favorite.query.filter_by(user_id=user_id, book_id=book_id).first()
        if existing:
            return jsonify({'ok': False, 'message': '已收藏过该书'}), 400

        # 优先尝试调用存储过程
        try:
            rows = call_proc(
                "CALL sp_add_favorite(:p_user_id, :p_book_id)",
                {'p_user_id': user_id, 'p_book_id': book_id}
            )
            fav_id = rows[0].get('favorite_id') if rows else None
            return jsonify({'ok': True, 'message': '已加入收藏', 'favorite_id': fav_id})
        except Exception:
            current_app.logger.warning('sp_add_favorite 调用失败，使用 ORM 回退')

        # ORM 回退：创建 Favorite 记录
        fav = Favorite(user_id=user_id, book_id=book_id)
        db.session.add(fav)
        db.session.commit()
        return jsonify({'ok': True, 'message': '已加入收藏', 'favorite_id': fav.favorite_id})
    except Exception as e:
        current_app.logger.error(f"添加收藏失败: {e}")
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/favorites', methods=['DELETE'])
@login_required
def remove_favorite():
    """取消收藏"""
    data = request.get_json() or {}
    user_id = get_current_user_id()
    book_id = data.get('book_id')
    favorite_id = data.get('favorite_id')
    
    if not book_id and not favorite_id:
        return jsonify({'ok': False, 'message': 'book_id or favorite_id required'}), 400
    
    try:
        # 如果有 favorite_id，直接使用
        if favorite_id:
            try:
                call_proc(
                    "CALL sp_remove_favorite_by_id(:p_favorite_id)",
                    {'p_favorite_id': favorite_id}
                )
                return jsonify({'ok': True, 'message': '已取消收藏'})
            except Exception:
                current_app.logger.warning('sp_remove_favorite_by_id 调用失败，尝试 ORM 回退')
                fav = Favorite.query.get(favorite_id)
                if fav:
                    db.session.delete(fav)
                    db.session.commit()
                    return jsonify({'ok': True, 'message': '已取消收藏'})
                else:
                    return jsonify({'ok': False, 'message': '收藏记录不存在'}), 404

        # 否则根据 user_id + book_id 删除
        try:
            call_proc(
                "CALL sp_remove_favorite(:p_user_id, :p_book_id)",
                {'p_user_id': user_id, 'p_book_id': book_id}
            )
            return jsonify({'ok': True, 'message': '已取消收藏'})
        except Exception:
            current_app.logger.warning('sp_remove_favorite 调用失败，尝试 ORM 回退')
            fav = Favorite.query.filter_by(user_id=user_id, book_id=book_id).first()
            if fav:
                db.session.delete(fav)
                db.session.commit()
                return jsonify({'ok': True, 'message': '已取消收藏'})
            else:
                return jsonify({'ok': False, 'message': '收藏记录不存在'}), 404
    except Exception as e:
        current_app.logger.error(f"取消收藏失败: {e}")
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/borrowed', methods=['GET'])
@login_required
def borrowed_list():
    """获取当前正在借阅的记录（status='borrowed'）"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'ok': False, 'message': 'user_id required'}), 400
    try:
        records = BorrowRecord.query.filter_by(user_id=user_id, status='borrowed').order_by(BorrowRecord.borrow_time.desc()).all()
        items = []
        for r in records:
            rd = r.to_dict()
            if r.book:
                rd['book'] = r.book.to_dict()
            items.append(rd)
        return jsonify({'ok': True, 'borrowed': items})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500



# --- 通知管理 ---
@api_bp.route('/notifications', methods=['GET'])
@login_required
def get_notifications():
    """获取通知列表"""
    user_id = get_current_user_id()
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    
    try:
        query = Notification.query.filter_by(receiver_id=user_id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        notifications = query.order_by(Notification.created_at.desc()).all()
        
        return jsonify({
            'ok': True,
            'notifications': [note.to_dict() for note in notifications]
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notification_id):
    """标记通知已读"""
    user_id = get_current_user_id()
    try:
        notification = Notification.query.filter_by(notification_id=notification_id, receiver_id=user_id).first()
        if not notification:
            return jsonify({'ok': False, 'message': '通知不存在或无权操作'}), 404
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '已标记为已读'
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/notifications/batch-read', methods=['POST'])
@login_required
def batch_mark_notifications_read():
    """批量标记通知已读"""
    user_id = get_current_user_id()
    data = request.get_json() or {}
    notification_ids = data.get('notification_ids', [])
    
    try:
        if notification_ids:
            Notification.query.filter(
                Notification.notification_id.in_(notification_ids),
                Notification.receiver_id == user_id
            ).update({'is_read': True}, synchronize_session=False)
        else:
            Notification.query.filter_by(receiver_id=user_id, is_read=False).update({'is_read': True}, synchronize_session=False)
        
        db.session.commit()
        return jsonify({'ok': True, 'message': '已标记为已读'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
@login_required
def delete_notification(notification_id):
    """删除单条通知"""
    user_id = get_current_user_id()
    
    try:
        notification = Notification.query.filter_by(
            notification_id=notification_id,
            receiver_id=user_id
        ).first()
        
        if not notification:
            return jsonify({'ok': False, 'message': '通知不存在'}), 404
        
        db.session.delete(notification)
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '通知已删除'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/notifications/batch-delete', methods=['POST'])
@login_required
def batch_delete_notifications():
    """批量删除通知"""
    user_id = get_current_user_id()
    data = request.get_json() or {}
    notification_ids = data.get('notification_ids', [])
    
    if not notification_ids:
        return jsonify({'ok': False, 'message': '请选择要删除的通知'}), 400
    
    try:
        deleted = Notification.query.filter(
            Notification.notification_id.in_(notification_ids),
            Notification.receiver_id == user_id
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'已删除 {deleted} 条通知',
            'deleted_count': deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/notifications/unread-count', methods=['GET'])
@login_required
def get_unread_notification_count():
    """获取未读通知数量"""
    user_id = get_current_user_id()
    
    try:
        count = Notification.query.filter_by(receiver_id=user_id, is_read=False).count()
        
        return jsonify({
            'ok': True,
            'unread_count': count
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# --- 用户设置 ---
@api_bp.route('/settings', methods=['GET'])
@login_required
def get_settings():
    """获取用户设置"""
    user_id = get_current_user_id()
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        return jsonify({
            'ok': True,
            'settings': user.to_dict()
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/settings', methods=['POST'])
@login_required
def update_settings():
    """更新用户设置"""
    user_id = get_current_user_id()
    data = request.get_json() or {}
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        if data.get('birthday'):
            try:
                user.birthday = datetime.strptime(data['birthday'], '%Y-%m-%d').date()
            except:
                pass
        
        if data.get('hobbies'):
            user.hobbies = data['hobbies']
        
        if data.get('school'):
            user.school = data['school']
        
        if data.get('avatar_url'):
            user.avatar_url = data['avatar_url']
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '设置已保存'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


# --- AI推荐 ---
@api_bp.route('/recommend', methods=['GET'])
@login_required
def recommend():
    """获取AI推荐"""
    user_id = get_current_user_id()
    
    try:
        # 调用存储过程获取推荐
        rows = call_proc(
            "CALL sp_get_recommendations(:p_user_id, :p_page, :p_page_size)",
            {'p_user_id': user_id, 'p_page': 1, 'p_page_size': 10}
        )
        
        recommendations = []
        for row in rows:
            book_data = {
                'book_id': row['book_id'],
                'title': row['title'],
                'author': row['author'],
                'genres': row['genres'],
                'cover_url': row['cover_url'],
                'reason': '根据您的借阅历史和偏好推荐'
            }
            recommendations.append(book_data)
        
        # 如果推荐为空，返回一些热门图书
        if not recommendations:
            popular_books = Book.query\
                .order_by(Book.available_copies.desc())\
                .limit(5)\
                .all()
            
            recommendations = [
                {
                    'book_id': book.book_id,
                    'title': book.title,
                    'author': book.author,
                    'cover_url': book.cover_url,
                    'reason': '热门图书推荐'
                }
                for book in popular_books
            ]
        
        return jsonify({
            'ok': True,
            'recommendations': recommendations
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/recommend/feedback', methods=['POST'])
def recommend_feedback():
    """记录用户对推荐的反馈（like/dislike）到 ai_recommendations 表"""
    user_id = get_current_user_id()
    data = request.get_json() or {}
    book_id = data.get('book_id')
    feedback = data.get('feedback')  # 'like' or 'dislike' or 'none'

    if not book_id or not feedback:
        return jsonify({'ok': False, 'message': 'book_id and feedback required'}), 400

    try:
        rec = AIRecommendation.query.filter_by(user_id=user_id, book_id=book_id).first()
        if rec:
            rec.feedback = feedback
            rec.feedback_at = datetime.utcnow()
        else:
            rec = AIRecommendation(user_id=user_id, book_id=book_id, feedback=feedback, feedback_at=datetime.utcnow())
            db.session.add(rec)

        db.session.commit()
        return jsonify({'ok': True, 'message': '反馈已保存'})
    except Exception as e:
        current_app.logger.error(f"保存推荐反馈失败: {e}")
        return jsonify({'ok': False, 'message': str(e)}), 500


# --- 其他辅助接口 ---
@api_bp.route('/profile', methods=['GET'])
@login_required
def get_user_profile():
    """获取用户个人资料"""
    user_id = get_current_user_id()
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        borrow_stats = BorrowRecord.query.filter_by(user_id=user_id).all()
        current_borrowed = len([r for r in borrow_stats if r.status == 'borrowed'])
        total_borrowed = len(borrow_stats)
        
        profile_data = user.to_dict()
        profile_data.update({
            'current_borrowed': current_borrowed,
            'total_borrowed': total_borrowed,
            'favorite_count': Favorite.query.filter_by(user_id=user_id).count()
        })
        
        # 获取最近收藏的3本书
        recent_favorites = Favorite.query.filter_by(user_id=user_id)\
            .order_by(Favorite.created_at.desc())\
            .limit(3)\
            .all()
        
        favorites_list = []
        for fav in recent_favorites:
            if fav.book:
                favorites_list.append({
                    'book_id': fav.book.book_id,
                    'title': fav.book.title,
                    'cover_url': fav.book.cover_url or f'https://picsum.photos/seed/{fav.book.book_id}/200/120'
                })
        profile_data['recent_favorites'] = favorites_list
        
        # 获取最近活动记录（借阅、归还、收藏）
        activities = []
        
        # 借阅和归还记录
        recent_borrows = BorrowRecord.query.filter_by(user_id=user_id)\
            .order_by(BorrowRecord.borrow_time.desc())\
            .limit(5)\
            .all()
        
        for record in recent_borrows:
            book_title = record.book.title if record.book else '未知书籍'
            if record.status == 'borrowed':
                activities.append({
                    'type': 'borrow',
                    'title': book_title,
                    'time': record.borrow_time,
                    'text': f'借阅了《{book_title}》'
                })
            elif record.status == 'returned':
                time = record.return_time or record.borrow_time
                activities.append({
                    'type': 'return',
                    'title': book_title,
                    'time': time,
                    'text': f'归还了《{book_title}》'
                })
        
        # 收藏记录
        recent_favs_activities = Favorite.query.filter_by(user_id=user_id)\
            .order_by(Favorite.created_at.desc())\
            .limit(3)\
            .all()
        
        for fav in recent_favs_activities:
            if fav.book:
                activities.append({
                    'type': 'favorite',
                    'title': fav.book.title,
                    'time': fav.created_at,
                    'text': f'收藏了《{fav.book.title}》'
                })
        
        # 按时间排序，取最近5条
        activities.sort(key=lambda x: x['time'] if x['time'] else datetime.min, reverse=True)
        profile_data['recent_activities'] = activities[:5]
        
        return jsonify({
            'ok': True,
            'profile': profile_data
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/user_by_phone', methods=['GET'])
def get_user_by_phone():
    """通过手机号查找用户（用于前端测试账号初始化）"""
    phone = request.args.get('phone')
    if not phone:
        return jsonify({'ok': False, 'message': 'phone required'}), 400
    try:
        user = User.query.filter_by(phone=phone).first()
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        return jsonify({'ok': True, 'user': user.to_dict()})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/popular', methods=['GET'])
def popular_books():
    """获取热门图书"""
    try:
        # 使用借阅次数最多的图书作为热门推荐
        popular = db.session.query(
            Book,
            db.func.count(BorrowRecord.record_id).label('borrow_count')
        ).join(
            BorrowRecord, Book.book_id == BorrowRecord.book_id
        ).group_by(
            Book.book_id
        ).order_by(
            db.func.count(BorrowRecord.record_id).desc()
        ).limit(8).all()
        
        books_data = []
        for book, borrow_count in popular:
            book_dict = book.to_dict()
            book_dict['borrow_count'] = borrow_count
            books_data.append(book_dict)
        
        return jsonify({
            'ok': True,
            'books': books_data,
            'title': '热门图书'
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/search', methods=['GET'])
def search_books():
    """高级搜索接口"""
    q = request.args.get('q', '')
    author = request.args.get('author', '')
    genre = request.args.get('genre', '')
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 20)), 100)
    
    try:
        # 调用存储过程进行多条件搜索
        rows = call_proc(
            "CALL sp_search_books(:p_keyword, :p_author, :p_genres, :p_page, :p_page_size)",
            {
                'p_keyword': q,
                'p_author': author,
                'p_genres': genre,
                'p_page': page,
                'p_page_size': page_size
            }
        )
        
        # 第一个结果是总数
        total_count = rows[0]['total_count'] if rows else 0
        # 后续结果是图书列表
        books_list = rows[1:] if len(rows) > 1 else []
        
        return jsonify({
            'ok': True,
            'books': books_list,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total_count,
                'pages': (total_count + page_size - 1) // page_size
            }
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# --- 错误处理 ---
@api_bp.errorhandler(404)
def not_found(error):
    return jsonify({'ok': False, 'message': '接口不存在'}), 404


@api_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'ok': False, 'message': '服务器内部错误'}), 500

@api_bp.route('/history/review', methods=['POST'])
def update_history_review():
    """更新借阅记录的读后感"""
    data = request.get_json() or {}
    record_id = data.get('record_id')
    review_content = data.get('review')
    
    if not record_id:
        return jsonify({'ok': False, 'message': 'record_id is required'}), 400
        
    try:
        record = BorrowRecord.query.get(record_id)
        if not record:
            return jsonify({'ok': False, 'message': '借阅记录不存在'}), 404
            
        # 更新字段
        record.review = review_content
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '读后感已保存'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500
    
@api_bp.route('/history', methods=['GET'])
@login_required
def get_borrow_history():
    """获取用户的借阅历史记录"""
    user_id = get_current_user_id()
        
    try:
        # 查询该用户的所有借阅记录，按借阅时间倒序排列
        records = BorrowRecord.query.filter_by(user_id=user_id)\
            .order_by(BorrowRecord.borrow_time.desc())\
            .all()
        
        history_list = []
        for r in records:
            record_data = r.to_dict()
            
            if r.book:
                record_data['book'] = {
                    'book_id': r.book.book_id,
                    'title': r.book.title,
                    'author': r.book.author,
                    'isbn': r.book.isbn,
                    'publish_date': r.book.publish_date.isoformat() if r.book.publish_date else '未知',
                    'cover_url': r.book.cover_url,
                    'introduction': r.book.introduction,
                    'available_copies': r.book.available_copies
                }
            else:
                record_data['book'] = {
                    'title': '未知图书', 
                    'author': '未知',
                    'cover_url': ''
                }
                
            history_list.append(record_data)
            
        return jsonify({
            'ok': True, 
            'history': history_list
        })
        
    except Exception as e:
        print(f"Error getting history: {e}")
        traceback.print_exc()
        return jsonify({'ok': False, 'message': '获取历史记录失败'}), 500


@api_bp.route('/stats', methods=['GET'])
@login_required
def get_stats():
    """获取用户阅读统计数据"""
    user_id = get_current_user_id()
    
    try:
        stats = {
            'total_books': 0,
            'borrowed_this_month': 0,
            'favorite_category': '',
            'borrow_trend': [],
            'borrow_trend_labels': [],
            'categories': {}
        }
        
        if user_id:
            stats['total_books'] = BorrowRecord.query.filter_by(user_id=user_id).count()
            
            from datetime import datetime
            month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            stats['borrowed_this_month'] = BorrowRecord.query.filter(
                BorrowRecord.user_id == user_id,
                BorrowRecord.borrow_time >= month_start
            ).count()
            
            from sqlalchemy import func
            category_stats = db.session.query(
                Book.genres,
                func.count(BorrowRecord.record_id).label('count')
            ).join(Book, BorrowRecord.book_id == Book.book_id)\
             .filter(BorrowRecord.user_id == user_id)\
             .group_by(Book.genres)\
             .all()
            
            categories = {}
            for row in category_stats:
                if row.genres:
                    genres_list = row.genres if isinstance(row.genres, list) else json.loads(row.genres) if isinstance(row.genres, str) else []
                    for g in genres_list:
                        categories[g] = categories.get(g, 0) + row.count
            
            stats['categories'] = categories
            if categories:
                stats['favorite_category'] = max(categories, key=categories.get)
            
            from datetime import timedelta
            trend = []
            labels = []
            for i in range(5, -1, -1):
                month_date = datetime.now() - timedelta(days=i*30)
                month_start_t = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if month_date.month == 12:
                    month_end = month_date.replace(year=month_date.year+1, month=1, day=1)
                else:
                    month_end = month_date.replace(month=month_date.month+1, day=1)
                
                count = BorrowRecord.query.filter(
                    BorrowRecord.user_id == user_id,
                    BorrowRecord.borrow_time >= month_start_t,
                    BorrowRecord.borrow_time < month_end
                ).count()
                trend.append(count)
                labels.append(f'{month_date.month}月')
            
            stats['borrow_trend'] = trend
            stats['borrow_trend_labels'] = labels
        
        return jsonify({'ok': True, 'data': stats})
        
    except Exception as e:
        current_app.logger.error(f"获取统计数据失败: {e}")
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/renew', methods=['POST'])
def renew_book():
    """续借图书"""
    data = request.get_json() or {}
    record_id = data.get('record_id')
    
    if not record_id:
        return jsonify({'ok': False, 'message': 'record_id required'}), 400
    
    try:
        rows = call_proc(
            "CALL sp_renew_book(:p_record_id)",
            {'p_record_id': record_id}
        )
        
        if rows and rows[0].get('message'):
            msg = rows[0]['message']
            if 'successfully' in msg.lower() or '成功' in msg:
                record = BorrowRecord.query.get(record_id)
                return jsonify({
                    'ok': True,
                    'message': '续借成功',
                    'new_due_time': record.due_time.isoformat() if record else None
                })
            else:
                return jsonify({'ok': False, 'message': msg}), 400
        
        return jsonify({'ok': True, 'message': '续借成功'})
        
    except Exception as e:
        current_app.logger.error(f"续借失败: {e}")
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/reserve', methods=['POST'])
def reserve_book():
    """预约图书"""
    data = request.get_json() or {}
    user_id = data.get('user_id')
    book_id = data.get('book_id')
    
    if not user_id or not book_id:
        return jsonify({'ok': False, 'message': 'user_id and book_id required'}), 400
    
    try:
        rows = call_proc(
            "CALL sp_reserve_book(:p_user_id, :p_book_id)",
            {'p_user_id': user_id, 'p_book_id': book_id}
        )
        
        if rows and rows[0].get('reservation_id'):
            return jsonify({
                'ok': True,
                'message': '预约成功',
                'reservation_id': rows[0]['reservation_id']
            })
        elif rows and rows[0].get('message'):
            return jsonify({'ok': False, 'message': rows[0]['message']}), 400
        
        return jsonify({'ok': True, 'message': '预约成功'})
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/reservations', methods=['GET'])
def get_reservations():
    """获取用户预约列表"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'ok': False, 'message': 'user_id required'}), 400
    
    try:
        reservations = db.session.execute(
            text("SELECT r.reservation_id, r.book_id, r.reserved_at, r.status, r.expiry_date, "
                 "b.title, b.author, b.cover_url "
                 "FROM reservations r "
                 "JOIN books b ON r.book_id = b.book_id "
                 "WHERE r.user_id = :user_id AND r.status = 'waiting'"),
            {'user_id': user_id}
        ).fetchall()
        
        result = []
        for row in reservations:
            result.append({
                'reservation_id': row[0],
                'book_id': row[1],
                'reserved_at': row[2].isoformat() if row[2] else None,
                'status': row[3],
                'expiry_date': row[4].isoformat() if row[4] else None,
                'book': {
                    'title': row[5],
                    'author': row[6],
                    'cover_url': row[7]
                }
            })
        
        return jsonify({'ok': True, 'reservations': result})
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/reserve/<int:reservation_id>', methods=['DELETE'])
def cancel_reservation(reservation_id):
    """取消预约"""
    try:
        call_proc(
            "CALL sp_cancel_reservation(:p_reservation_id)",
            {'p_reservation_id': reservation_id}
        )
        return jsonify({'ok': True, 'message': '预约已取消'})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/browse', methods=['POST'])
@login_required
def record_browse():
    """记录浏览历史"""
    user_id = get_current_user_id()
    data = request.get_json() or {}
    book_id = data.get('book_id')
    
    if not book_id:
        return jsonify({'ok': False, 'message': 'book_id required'}), 400
    
    try:
        db.session.execute(
            text("INSERT INTO browse_history (user_id, book_id) VALUES (:user_id, :book_id)"),
            {'user_id': user_id, 'book_id': book_id}
        )
        db.session.commit()
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/browse_history', methods=['GET'])
@login_required
def get_browse_history():
    """获取浏览历史"""
    user_id = get_current_user_id()
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 20))
    
    try:
        offset = (page - 1) * page_size
        
        rows = db.session.execute(
            text("SELECT bh.history_id, bh.book_id, bh.browse_time, "
                 "b.title, b.author, b.cover_url "
                 "FROM browse_history bh "
                 "JOIN books b ON bh.book_id = b.book_id "
                 "WHERE bh.user_id = :user_id "
                 "ORDER BY bh.browse_time DESC "
                 "LIMIT :limit OFFSET :offset"),
            {'user_id': user_id, 'limit': page_size, 'offset': offset}
        ).fetchall()
        
        history = []
        for row in rows:
            history.append({
                'history_id': row[0],
                'book_id': row[1],
                'browse_time': row[2].isoformat() if row[2] else None,
                'book': {
                    'book_id': row[1],
                    'title': row[3],
                    'author': row[4],
                    'cover_url': row[5]
                }
            })
        
        return jsonify({'ok': True, 'history': history})
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/change_phone', methods=['POST'])
@login_required
def change_phone():
    """修改手机号"""
    user_id = get_current_user_id()
    data = request.get_json() or {}
    new_phone = data.get('new_phone')
    
    if not new_phone:
        return jsonify({'ok': False, 'message': 'new_phone required'}), 400
    
    if not new_phone.isdigit() or len(new_phone) != 11:
        return jsonify({'ok': False, 'message': '手机号必须是11位数字'}), 400
    
    try:
        existing = User.query.filter(User.phone == new_phone, User.user_id != user_id).first()
        if existing:
            return jsonify({'ok': False, 'message': '该手机号已被其他用户使用'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        user.phone = new_phone
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '手机号修改成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/change_password', methods=['POST'])
@login_required
def change_password():
    """修改密码"""
    data = request.get_json() or {}
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'ok': False, 'message': '旧密码和新密码不能为空'}), 400
    
    # 验证新密码强度
    if len(new_password) < 6:
        return jsonify({'ok': False, 'message': '新密码长度不能少于6位'}), 400
    
    # 从Token获取当前用户ID
    user_id = get_current_user_id()
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        # 验证旧密码（兼容明文和哈希）
        password_valid = False
        if user.password_hash and ':' in user.password_hash:
            password_valid = check_password_hash(user.password_hash, old_password)
        else:
            password_valid = (user.password_hash == old_password)
        
        if not password_valid:
            return jsonify({'ok': False, 'message': '旧密码错误'}), 400
        
        # 更新密码（使用哈希）
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '密码修改成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# AI 推荐与对话 API
# ============================================

@api_bp.route('/ai/recommend', methods=['GET'])
@login_required
def ai_recommend():
    """获取AI推荐书籍（3本）"""
    user_id = get_current_user_id()
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        borrowed_records = BorrowRecord.query.filter_by(user_id=user_id).all()
        borrowed_books = []
        seen_book_ids = set()
        for record in borrowed_records:
            if record.book and record.book.book_id not in seen_book_ids:
                borrowed_books.append({
                    'title': record.book.title,
                    'author': record.book.author,
                    'book_id': record.book.book_id
                })
                seen_book_ids.add(record.book.book_id)
        
        favorites = Favorite.query.filter_by(user_id=user_id).all()
        favorite_books = []
        for fav in favorites:
            if fav.book:
                favorite_books.append({
                    'title': fav.book.title,
                    'author': fav.book.author,
                    'book_id': fav.book.book_id
                })
        
        hobbies = user.hobbies if user.hobbies else []
        
        user_data = {
            'borrowed_books': borrowed_books,
            'favorite_books': favorite_books,
            'hobbies': hobbies if isinstance(hobbies, list) else []
        }
        
        prompt = build_recommend_prompt(user_data)
        
        messages = [{"role": "user", "content": prompt}]
        result = ai_service.chat(messages)
        
        if result.get('ok'):
            books = parse_recommend_response(result['content'])
            
            for book in books:
                db_book = Book.query.filter(
                    or_(
                        Book.title == book.get('title'),
                        Book.title.like(f"%{book.get('title', '')}%")
                    )
                ).first()
                if db_book:
                    book['book_id'] = db_book.book_id
                    book['cover_url'] = db_book.cover_url
                    book['available'] = db_book.available_copies > 0
                else:
                    book['book_id'] = None
                    book['cover_url'] = f"https://picsum.photos/seed/{hash(book.get('title', 'book')) % 10000}/200/300"
                    book['available'] = True
            
            return jsonify({
                'ok': True,
                'recommendations': books
            })
        else:
            return jsonify({'ok': False, 'message': result.get('error', 'AI服务暂时不可用')}), 500
            
    except Exception as e:
        current_app.logger.error(f"AI推荐失败: {e}")
        traceback.print_exc()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/ai/chat', methods=['POST'])
@login_required
def ai_chat():
    """AI对话接口"""
    data = request.get_json() or {}
    user_id = get_current_user_id()
    message = data.get('message')
    stream = data.get('stream', False)
    
    if not message:
        return jsonify({'ok': False, 'message': 'message required'}), 400
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        user_msg = AIChatHistory(
            user_id=user_id,
            role='user',
            content=message
        )
        db.session.add(user_msg)
        db.session.commit()
        
        history = AIChatHistory.query.filter_by(user_id=user_id)\
            .order_by(AIChatHistory.created_at.desc())\
            .limit(10)\
            .all()
        history.reverse()
        
        messages = []
        for h in history:
            messages.append({
                "role": h.role,
                "content": h.content
            })
        
        system_prompt = {
            "role": "system",
            "content": """你是一位专业的图书推荐助手，隶属于"智阅同行"图书馆平台。
你的职责是：
1. 帮助用户寻找适合的书籍
2. 讨论书籍内容、作者风格
3. 分享阅读心得和感悟
4. 根据用户的阅读偏好提供个性化推荐

请用友好、专业的语气回复，回复要简洁有条理。如果用户询问具体的书籍，可以提供书名、作者和简要介绍。"""
        }
        
        messages.insert(0, system_prompt)
        
        if stream:
            def generate():
                full_response = ""
                for chunk in ai_service.chat_stream(messages):
                    if chunk.startswith("[ERROR]"):
                        yield f"data: {json.dumps({'error': chunk})}\n\n"
                        return
                    full_response += chunk
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                assistant_msg = AIChatHistory(
                    user_id=user_id,
                    role='assistant',
                    content=full_response
                )
                db.session.add(assistant_msg)
                db.session.commit()
                yield f"data: {json.dumps({'done': True})}\n\n"
            
            return Response(
                stream_with_context(generate()),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no'
                }
            )
        else:
            result = ai_service.chat(messages)
            
            if result.get('ok'):
                assistant_msg = AIChatHistory(
                    user_id=user_id,
                    role='assistant',
                    content=result['content']
                )
                db.session.add(assistant_msg)
                db.session.commit()
                
                return jsonify({
                    'ok': True,
                    'content': result['content']
                })
            else:
                return jsonify({'ok': False, 'message': result.get('error', 'AI服务暂时不可用')}), 500
                
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"AI对话失败: {e}")
        traceback.print_exc()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/ai/history', methods=['GET'])
@login_required
def ai_chat_history():
    """获取AI聊天历史"""
    user_id = get_current_user_id()
    limit = request.args.get('limit', 50, type=int)
    
    try:
        history = AIChatHistory.query.filter_by(user_id=user_id)\
            .order_by(AIChatHistory.created_at.desc())\
            .limit(limit)\
            .all()
        
        messages = [h.to_dict() for h in reversed(history)]
        
        return jsonify({
            'ok': True,
            'history': messages
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/ai/history/clear', methods=['POST'])
@login_required
def clear_ai_history():
    """清空AI聊天历史"""
    user_id = get_current_user_id()
    
    try:
        AIChatHistory.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '聊天历史已清空'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# 管理员审核 API
# ============================================

@api_bp.route('/admin/borrow/requests', methods=['GET'])
@login_required
@admin_required
def admin_get_requests():
    """管理员获取待审核的借阅/归还申请列表"""
    status = request.args.get('status', 'pending')
    request_type = request.args.get('type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 20)), 100)
    
    try:
        query = BorrowRequest.query
        
        if status:
            query = query.filter_by(status=status)
        if request_type:
            query = query.filter_by(request_type=request_type)
        if start_date:
            query = query.filter(BorrowRequest.request_time >= start_date)
        if end_date:
            query = query.filter(BorrowRequest.request_time <= end_date + ' 23:59:59')
        
        total = query.count()
        requests = query.order_by(BorrowRequest.request_time.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()
        
        result = []
        for req in requests:
            req_dict = req.to_dict()
            if req.user:
                req_dict['user_phone'] = req.user.phone
            result.append(req_dict)
        
        return jsonify({
            'ok': True,
            'requests': result,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'pages': (total + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/borrow/requests/ids', methods=['GET'])
@login_required
@admin_required
def admin_get_request_ids():
    """管理员获取当前筛选条件下所有申请ID"""
    status = request.args.get('status', 'pending')
    request_type = request.args.get('type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        query = BorrowRequest.query
        
        if status:
            query = query.filter_by(status=status)
        if request_type:
            query = query.filter_by(request_type=request_type)
        if start_date:
            query = query.filter(BorrowRequest.request_time >= start_date)
        if end_date:
            query = query.filter(BorrowRequest.request_time <= end_date + ' 23:59:59')
        
        requests = query.with_entities(BorrowRequest.request_id).all()
        request_ids = [r.request_id for r in requests]
        
        return jsonify({
            'ok': True,
            'request_ids': request_ids,
            'total': len(request_ids)
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# 密码重置申请管理 API
# ============================================

@api_bp.route('/admin/password-reset-requests', methods=['GET'])
@login_required
@admin_required
def admin_get_password_reset_requests():
    """管理员获取密码重置申请列表"""
    status = request.args.get('status', 'pending')
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 20)), 100)
    
    try:
        query = PasswordResetRequest.query
        
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        requests = query.order_by(PasswordResetRequest.created_at.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()
        
        return jsonify({
            'ok': True,
            'requests': [r.to_dict() for r in requests],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'pages': (total + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/password-reset-requests/<int:request_id>/approve', methods=['POST'])
@login_required
@admin_required
def admin_approve_password_reset(request_id):
    """管理员批准密码重置申请"""
    data = request.get_json() or {}
    new_password = data.get('new_password', '123456').strip()
    
    if len(new_password) < 6:
        return jsonify({'ok': False, 'message': '密码长度不能少于6位'}), 400
    
    try:
        reset_request = PasswordResetRequest.query.get(request_id)
        if not reset_request:
            return jsonify({'ok': False, 'message': '申请不存在'}), 404
        
        if reset_request.status != 'pending':
            return jsonify({'ok': False, 'message': f'该申请已{reset_request.status}，无法重复处理'}), 400
        
        user = User.query.get(reset_request.user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        user.password_hash = generate_password_hash(new_password)
        
        reset_request.status = 'approved'
        reset_request.processed_at = datetime.utcnow()
        
        admin = get_current_admin()
        if admin:
            reset_request.processed_by = admin.admin_id
        
        sender_id = admin.user_id if admin else None
        notification = Notification(
            sender_id=sender_id,
            receiver_id=user.user_id,
            title='密码重置成功',
            content='您的密码已重置成功，请联系管理员获取新密码。',
            type='system'
        )
        db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '密码重置成功'
        })
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/password-reset-requests/<int:request_id>/reject', methods=['POST'])
@login_required
@admin_required
def admin_reject_password_reset(request_id):
    """管理员拒绝密码重置申请"""
    data = request.get_json() or {}
    reject_reason = data.get('reason', '').strip()
    
    try:
        reset_request = PasswordResetRequest.query.get(request_id)
        if not reset_request:
            return jsonify({'ok': False, 'message': '申请不存在'}), 404
        
        if reset_request.status != 'pending':
            return jsonify({'ok': False, 'message': f'该申请已{reset_request.status}，无法重复处理'}), 400
        
        reset_request.status = 'rejected'
        reset_request.reject_reason = reject_reason
        reset_request.processed_at = datetime.utcnow()
        
        admin = get_current_admin()
        if admin:
            reset_request.processed_by = admin.admin_id
        
        user = User.query.get(reset_request.user_id)
        if user:
            sender_id = admin.user_id if admin else None
            notification = Notification(
                sender_id=sender_id,
                receiver_id=user.user_id,
                title='密码重置申请被拒绝',
                content=f'您的密码重置申请已被拒绝。原因：{reject_reason or "无"}。如有疑问请联系管理员。',
                type='system'
            )
            db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '已拒绝该申请'
        })
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/borrow/requests/<int:request_id>/approve', methods=['POST'])
@login_required
@admin_required
def admin_approve_request(request_id):
    """管理员批准借阅/归还/续借/挂失申请"""
    data = request.get_json() or {}
    admin_message = data.get('message', '')
    
    admin = get_current_admin()
    admin_user_id = get_current_user_id()
    
    try:
        req = BorrowRequest.query.get(request_id)
        if not req:
            return jsonify({'ok': False, 'message': '申请不存在'}), 404
        
        if req.status != 'pending':
            return jsonify({'ok': False, 'message': f'该申请已{req.status}，无法重复处理'}), 400
        
        if req.request_type == 'borrow':
            book = Book.query.get(req.book_id)
            if not book:
                return jsonify({'ok': False, 'message': '图书不存在'}), 404
            
            if book.available_copies <= 0:
                return jsonify({'ok': False, 'message': '库存不足，无法批准借阅'}), 400
            
            book.available_copies -= 1
            
            borrow_record = BorrowRecord(
                user_id=req.user_id,
                book_id=req.book_id,
                borrow_time=datetime.utcnow(),
                due_time=datetime.utcnow() + timedelta(days=30),
                status='borrowed'
            )
            db.session.add(borrow_record)
            db.session.flush()
            
            req.status = 'approved'
            req.approved_by = admin_user_id
            req.approved_at = datetime.utcnow()
            req.admin_message = admin_message
            req.record_id = borrow_record.record_id
            
        elif req.request_type == 'return':
            if not req.record_id:
                return jsonify({'ok': False, 'message': '缺少借阅记录ID'}), 400
            
            borrow_record = BorrowRecord.query.get(req.record_id)
            if not borrow_record:
                return jsonify({'ok': False, 'message': '借阅记录不存在'}), 404
            
            if borrow_record.status != 'borrowed':
                return jsonify({'ok': False, 'message': '该书籍已归还或状态异常'}), 400
            
            borrow_record.status = 'returned'
            borrow_record.return_time = datetime.utcnow()
            
            book = Book.query.get(borrow_record.book_id)
            if book:
                book.available_copies += 1
            
            req.status = 'approved'
            req.approved_by = admin_user_id
            req.approved_at = datetime.utcnow()
            req.admin_message = admin_message
            
        elif req.request_type == 'renew':
            if not req.record_id:
                return jsonify({'ok': False, 'message': '缺少借阅记录ID'}), 400
            
            borrow_record = BorrowRecord.query.get(req.record_id)
            if not borrow_record:
                return jsonify({'ok': False, 'message': '借阅记录不存在'}), 404
            
            if borrow_record.status != 'borrowed':
                return jsonify({'ok': False, 'message': '该书籍已归还，无法续借'}), 400
            
            new_due_time = req.pickup_time if req.pickup_time else borrow_record.due_time + timedelta(days=7)
            borrow_record.due_time = new_due_time
            borrow_record.renewal_count += 1
            
            req.status = 'approved'
            req.approved_by = admin_user_id
            req.approved_at = datetime.utcnow()
            req.admin_message = admin_message
            
        elif req.request_type == 'lost':
            if not req.record_id:
                return jsonify({'ok': False, 'message': '缺少借阅记录ID'}), 400
            
            borrow_record = BorrowRecord.query.get(req.record_id)
            if not borrow_record:
                return jsonify({'ok': False, 'message': '借阅记录不存在'}), 404
            
            borrow_record.status = 'lost'
            
            req.status = 'approved'
            req.approved_by = admin_user_id
            req.approved_at = datetime.utcnow()
            req.admin_message = admin_message or '挂失已处理，请联系图书馆了解赔偿事宜'
            
        else:
            return jsonify({'ok': False, 'message': '未知的申请类型'}), 400
        
        notification = Notification(
            sender_id=admin_user_id,
            receiver_id=req.user_id,
            title=f'您的{req.request_type}申请已通过',
            content=admin_message or f'您提交的{req.request_type}申请已被管理员批准。',
            type='system'
        )
        db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '申请已批准',
            'request': req.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"批准申请失败: {e}")
        traceback.print_exc()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/borrow/requests/<int:request_id>/reject', methods=['POST'])
@login_required
@admin_required
def admin_reject_request(request_id):
    """管理员拒绝借阅/归还/续借/挂失申请"""
    data = request.get_json() or {}
    reject_reason = data.get('reason', '')
    
    admin_user_id = get_current_user_id()
    
    if not reject_reason:
        return jsonify({'ok': False, 'message': '请填写拒绝原因'}), 400
    
    try:
        req = BorrowRequest.query.get(request_id)
        if not req:
            return jsonify({'ok': False, 'message': '申请不存在'}), 404
        
        if req.status != 'pending':
            return jsonify({'ok': False, 'message': f'该申请已{req.status}，无法重复处理'}), 400
        
        req.status = 'rejected'
        req.approved_by = admin_user_id
        req.approved_at = datetime.utcnow()
        req.reject_reason = reject_reason
        
        notification = Notification(
            sender_id=admin_user_id,
            receiver_id=req.user_id,
            title=f'您的{req.request_type}申请已被拒绝',
            content=f'您的{req.request_type}申请被拒绝。原因：{reject_reason}',
            type='system'
        )
        db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '申请已拒绝',
            'request': req.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/stats', methods=['GET'])
@login_required
@admin_required
def admin_get_stats():
    """管理员获取统计数据"""
    try:
        total_users = User.query.count()
        total_books = Book.query.count()
        total_borrows = BorrowRecord.query.count()
        pending_requests = BorrowRequest.query.filter_by(status='pending').count()
        active_borrows = BorrowRecord.query.filter_by(status='borrowed').count()
        
        today = datetime.utcnow().date()
        today_borrows = BorrowRecord.query.filter(
            db.func.date(BorrowRecord.borrow_time) == today
        ).count()
        
        return jsonify({
            'ok': True,
            'stats': {
                'total_users': total_users,
                'total_books': total_books,
                'total_borrows': total_borrows,
                'pending_requests': pending_requests,
                'active_borrows': active_borrows,
                'today_borrows': today_borrows
            }
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/stats/borrow-trend', methods=['GET'])
@login_required
@admin_required
def admin_get_borrow_trend():
    """管理员获取借阅趋势数据（近7天）"""
    days = request.args.get('days', 7, type=int)
    
    try:
        trend = []
        for i in range(days - 1, -1, -1):
            date = datetime.utcnow().date() - timedelta(days=i)
            count = BorrowRecord.query.filter(
                db.func.date(BorrowRecord.borrow_time) == date
            ).count()
            
            trend.append({
                'date': date.strftime('%m/%d'),
                'count': count
            })
        
        return jsonify({
            'ok': True,
            'trend': trend
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/stats/category-distribution', methods=['GET'])
@login_required
@admin_required
def admin_get_category_distribution():
    """管理员获取图书分类占比数据"""
    try:
        books = Book.query.filter(Book.genres.isnot(None)).all()
        
        category_count = {}
        for book in books:
            if book.genres:
                genres_list = book.genres if isinstance(book.genres, list) else json.loads(book.genres) if isinstance(book.genres, str) else []
                for g in genres_list:
                    if g and isinstance(g, str):
                        g = g.strip()
                        category_count[g] = category_count.get(g, 0) + 1
        
        categories = sorted(category_count.items(), key=lambda x: x[1], reverse=True)[:8]
        
        result = [{'name': name, 'count': count} for name, count in categories]
        
        return jsonify({
            'ok': True,
            'categories': result
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/stats/popular-books', methods=['GET'])
@login_required
@admin_required
def admin_get_popular_books():
    """管理员获取热门图书排行"""
    limit = request.args.get('limit', 10, type=int)
    
    try:
        popular = db.session.query(
            Book,
            db.func.count(BorrowRecord.record_id).label('borrow_count')
        ).join(
            BorrowRecord, Book.book_id == BorrowRecord.book_id
        ).group_by(
            Book.book_id
        ).order_by(
            db.func.count(BorrowRecord.record_id).desc()
        ).limit(limit).all()
        
        books_data = []
        for book, borrow_count in popular:
            books_data.append({
                'book_id': book.book_id,
                'title': book.title,
                'author': book.author,
                'borrow_count': borrow_count
            })
        
        return jsonify({
            'ok': True,
            'books': books_data
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/stats/active-users', methods=['GET'])
@login_required
@admin_required
def admin_get_active_users():
    """管理员获取活跃用户排行"""
    limit = request.args.get('limit', 10, type=int)
    
    try:
        active = db.session.query(
            User,
            db.func.count(BorrowRecord.record_id).label('borrow_count')
        ).join(
            BorrowRecord, User.user_id == BorrowRecord.user_id
        ).group_by(
            User.user_id
        ).order_by(
            db.func.count(BorrowRecord.record_id).desc()
        ).limit(limit).all()
        
        users_data = []
        for user, borrow_count in active:
            phone_display = user.phone[:3] + '****' + user.phone[7:] if user.phone and len(user.phone) == 11 else user.phone
            users_data.append({
                'user_id': user.user_id,
                'phone': phone_display,
                'school': user.school,
                'borrow_count': borrow_count
            })
        
        return jsonify({
            'ok': True,
            'users': users_data
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/borrow/requests/batch-approve', methods=['POST'])
@login_required
@admin_required
def admin_batch_approve_requests():
    """管理员批量批准申请"""
    data = request.get_json() or {}
    request_ids = data.get('request_ids', [])
    admin_message = data.get('message', '')
    
    if not request_ids or not isinstance(request_ids, list):
        return jsonify({'ok': False, 'message': '请选择要处理的申请'}), 400
    
    admin_user_id = get_current_user_id()
    success_count = 0
    errors = []
    
    for request_id in request_ids:
        try:
            req = BorrowRequest.query.get(request_id)
            if not req:
                errors.append(f'申请 {request_id} 不存在')
                continue
            
            if req.status != 'pending':
                errors.append(f'申请 {request_id} 已处理')
                continue
            
            # 根据类型处理
            if req.request_type == 'borrow':
                book = Book.query.get(req.book_id)
                if not book:
                    errors.append(f'申请 {request_id}: 图书不存在')
                    continue
                if book.available_copies <= 0:
                    errors.append(f'申请 {request_id}: 库存不足')
                    continue
                
                book.available_copies -= 1
                borrow_record = BorrowRecord(
                    user_id=req.user_id,
                    book_id=req.book_id,
                    borrow_time=datetime.utcnow(),
                    due_time=datetime.utcnow() + timedelta(days=30),
                    status='borrowed'
                )
                db.session.add(borrow_record)
                db.session.flush()
                req.record_id = borrow_record.record_id
                
            elif req.request_type == 'return':
                if not req.record_id:
                    errors.append(f'申请 {request_id}: 缺少借阅记录')
                    continue
                borrow_record = BorrowRecord.query.get(req.record_id)
                if not borrow_record or borrow_record.status != 'borrowed':
                    errors.append(f'申请 {request_id}: 借阅记录状态异常')
                    continue
                borrow_record.status = 'returned'
                borrow_record.return_time = datetime.utcnow()
                book = Book.query.get(borrow_record.book_id)
                if book:
                    book.available_copies += 1
                    
            elif req.request_type == 'renew':
                if not req.record_id:
                    errors.append(f'申请 {request_id}: 缺少借阅记录')
                    continue
                borrow_record = BorrowRecord.query.get(req.record_id)
                if not borrow_record or borrow_record.status != 'borrowed':
                    errors.append(f'申请 {request_id}: 借阅记录状态异常')
                    continue
                new_due_time = req.pickup_time if req.pickup_time else borrow_record.due_time + timedelta(days=7)
                borrow_record.due_time = new_due_time
                borrow_record.renewal_count += 1
                
            elif req.request_type == 'lost':
                if not req.record_id:
                    errors.append(f'申请 {request_id}: 缺少借阅记录')
                    continue
                borrow_record = BorrowRecord.query.get(req.record_id)
                if not borrow_record:
                    errors.append(f'申请 {request_id}: 借阅记录不存在')
                    continue
                borrow_record.status = 'lost'
            
            req.status = 'approved'
            req.approved_by = admin_user_id
            req.approved_at = datetime.utcnow()
            req.admin_message = admin_message
            
            notification = Notification(
                sender_id=admin_user_id,
                receiver_id=req.user_id,
                title=f'您的{req.request_type}申请已通过',
                content=admin_message or f'您提交的{req.request_type}申请已被管理员批准。',
                type='system'
            )
            db.session.add(notification)
            success_count += 1
            
        except Exception as e:
            errors.append(f'申请 {request_id}: {str(e)}')
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': f'提交失败: {str(e)}'}), 500
    
    return jsonify({
        'ok': True,
        'success_count': success_count,
        'errors': errors if errors else None
    })


@api_bp.route('/admin/borrow/requests/batch-reject', methods=['POST'])
@login_required
@admin_required
def admin_batch_reject_requests():
    """管理员批量拒绝申请"""
    data = request.get_json() or {}
    request_ids = data.get('request_ids', [])
    reject_reason = data.get('reason', '')
    
    if not request_ids or not isinstance(request_ids, list):
        return jsonify({'ok': False, 'message': '请选择要处理的申请'}), 400
    
    if not reject_reason:
        return jsonify({'ok': False, 'message': '请填写拒绝原因'}), 400
    
    admin_user_id = get_current_user_id()
    success_count = 0
    
    try:
        for request_id in request_ids:
            req = BorrowRequest.query.get(request_id)
            if req and req.status == 'pending':
                req.status = 'rejected'
                req.approved_by = admin_user_id
                req.approved_at = datetime.utcnow()
                req.reject_reason = reject_reason
                
                notification = Notification(
                    sender_id=admin_user_id,
                    receiver_id=req.user_id,
                    title=f'您的{req.request_type}申请已被拒绝',
                    content=f'您的{req.request_type}申请被拒绝。原因：{reject_reason}',
                    type='system'
                )
                db.session.add(notification)
                success_count += 1
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'success_count': success_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# 管理员图书管理 API（补充）
# ============================================

@api_bp.route('/admin/books/batch-delete', methods=['POST'])
@login_required
@admin_required
def admin_batch_delete_books():
    """管理员批量删除图书"""
    data = request.get_json() or {}
    book_ids = data.get('book_ids', [])
    
    if not book_ids or not isinstance(book_ids, list):
        return jsonify({'ok': False, 'message': '请选择要删除的图书'}), 400
    
    try:
        deleted_count = Book.query.filter(Book.book_id.in_(book_ids)).delete(synchronize_session=False)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'成功删除 {deleted_count} 本图书',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/books/<int:book_id>/stock', methods=['PATCH'])
@login_required
@admin_required
def admin_update_book_stock(book_id):
    """管理员快速调整图书库存"""
    data = request.get_json() or {}
    new_stock = data.get('available_copies')
    
    if new_stock is None:
        return jsonify({'ok': False, 'message': '请提供库存数量'}), 400
    
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({'ok': False, 'message': '图书不存在'}), 404
        
        book.available_copies = new_stock
        if new_stock > book.total_copies:
            book.total_copies = new_stock
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '库存更新成功',
            'book': book.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/books/batch-stock', methods=['POST'])
@login_required
@admin_required
def admin_batch_update_stock():
    """管理员批量调整图书库存"""
    data = request.get_json() or {}
    book_ids = data.get('book_ids', [])
    operation = data.get('operation', 'add')
    amount = data.get('amount', 0)
    
    if not book_ids or not isinstance(book_ids, list):
        return jsonify({'ok': False, 'message': '请选择要调整的图书'}), 400
    
    if operation not in ['add', 'subtract']:
        return jsonify({'ok': False, 'message': '无效的操作类型'}), 400
    
    try:
        amount = int(amount)
    except (ValueError, TypeError):
        return jsonify({'ok': False, 'message': '数量必须是整数'}), 400
    
    if amount <= 0:
        return jsonify({'ok': False, 'message': '数量必须大于0'}), 400
    
    success_count = 0
    errors = []
    
    try:
        for book_id in book_ids:
            book = Book.query.get(book_id)
            if not book:
                errors.append({'book_id': book_id, 'error': '图书不存在'})
                continue
            
            if operation == 'add':
                book.available_copies += amount
                book.total_copies += amount
            else:
                if book.available_copies < amount:
                    errors.append({'book_id': book_id, 'title': book.title, 'error': f'可借数量不足，当前可借{book.available_copies}本'})
                    continue
                if book.total_copies < amount:
                    errors.append({'book_id': book_id, 'title': book.title, 'error': f'总库存不足，当前库存{book.total_copies}本'})
                    continue
                book.available_copies -= amount
                book.total_copies -= amount
            
            book.updated_at = datetime.utcnow()
            success_count += 1
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'成功调整 {success_count} 本图书库存',
            'success_count': success_count,
            'errors': errors if errors else None
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/books/import', methods=['POST'])
@login_required
@admin_required
def admin_import_books():
    """管理员批量导入图书（支持CSV/JSON/Excel）"""
    if 'file' not in request.files:
        return jsonify({'ok': False, 'message': '请上传文件'}), 400
    
    file = request.files['file']
    mode = request.form.get('mode', 'preview')
    update_stock_rows = request.form.get('update_stock_rows', '')
    
    if file.filename == '':
        return jsonify({'ok': False, 'message': '请选择文件'}), 400
    
    filename = file.filename.lower()
    
    try:
        books_data = []
        
        if filename.endswith('.csv'):
            content = file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(content))
            for row in reader:
                books_data.append(row)
        
        elif filename.endswith('.json'):
            content = file.read().decode('utf-8')
            books_data = json.loads(content)
            if not isinstance(books_data, list):
                books_data = [books_data]
        
        elif filename.endswith(('.xlsx', '.xls')):
            try:
                import openpyxl
            except ImportError:
                return jsonify({'ok': False, 'message': '服务器未安装openpyxl库，无法处理Excel文件'}), 500
            
            wb = openpyxl.load_workbook(file)
            ws = wb.active
            headers = [cell.value for cell in ws[1] if cell.value]
            
            for row in ws.iter_rows(min_row=2, values_only=True):
                if not any(row):
                    continue
                row_data = {}
                for i, header in enumerate(headers):
                    if i < len(row):
                        row_data[header] = row[i]
                books_data.append(row_data)
        
        else:
            return jsonify({'ok': False, 'message': '不支持的文件格式，请上传CSV、JSON或Excel文件'}), 400
        
        preview = []
        valid_count = 0
        invalid_count = 0
        new_count = 0
        update_count = 0
        
        all_isbns = []
        for item in books_data:
            isbn = str(item.get('isbn', item.get('ISBN', ''))).strip()
            if isbn:
                all_isbns.append(isbn)
        
        existing_books_map = {}
        if all_isbns:
            existing_books = Book.query.filter(Book.isbn.in_(all_isbns)).all()
            existing_books_map = {b.isbn: b for b in existing_books}
        
        for idx, item in enumerate(books_data, 1):
            isbn = str(item.get('isbn', item.get('ISBN', ''))).strip()
            title = item.get('title', item.get('书名', item.get('名称', '')))
            if isinstance(title, str):
                title = title.strip()
            
            author = item.get('author', item.get('作者', ''))
            if isinstance(author, str):
                author = author.strip()
            
            introduction = item.get('introduction', item.get('简介', item.get('介绍', '')))
            if isinstance(introduction, str):
                introduction = introduction.strip()
            
            errors = []
            is_update = isbn in existing_books_map
            
            if not isbn:
                errors.append('ISBN不能为空')
            else:
                if is_update:
                    existing_book = existing_books_map[isbn]
                    if not title:
                        title = existing_book.title
                    if not author:
                        author = existing_book.author
                    if not introduction:
                        introduction = existing_book.introduction
                else:
                    if not title:
                        errors.append('书名不能为空')
                    if not author:
                        errors.append('作者不能为空')
                    if not introduction:
                        errors.append('简介不能为空')
            
            genres_raw = item.get('genres', item.get('分类', item.get('类别', '')))
            if genres_raw:
                if isinstance(genres_raw, str):
                    genres = [g.strip() for g in genres_raw.replace('；', ';').replace(',', ';').split(';') if g.strip()]
                elif isinstance(genres_raw, list):
                    genres = genres_raw
                else:
                    genres = []
            else:
                genres = []
            
            try:
                total_copies = int(item.get('total_copies', item.get('总库存', item.get('库存', 1))))
                if total_copies < 0:
                    total_copies = 1
            except (ValueError, TypeError):
                total_copies = 1
            
            try:
                available_copies = int(item.get('available_copies', item.get('可借数量', total_copies)))
                if available_copies < 0:
                    available_copies = total_copies
                if available_copies > total_copies:
                    available_copies = total_copies
            except (ValueError, TypeError):
                available_copies = total_copies
            
            publish_date = item.get('publish_date', item.get('出版日期', item.get('出版时间', '')))
            if publish_date:
                if isinstance(publish_date, datetime):
                    publish_date = publish_date.strftime('%Y-%m-%d')
                else:
                    publish_date = str(publish_date).strip()
            else:
                publish_date = None
            
            cover_url = item.get('cover_url', item.get('封面', item.get('封面链接', '')))
            if isinstance(cover_url, str):
                cover_url = cover_url.strip()
            
            douban_link = item.get('douban_link', item.get('豆瓣链接', ''))
            if isinstance(douban_link, str):
                douban_link = douban_link.strip()
            
            video_link = item.get('video_link', item.get('视频链接', ''))
            if isinstance(video_link, str):
                video_link = video_link.strip()
            
            is_valid = len(errors) == 0
            if is_valid:
                valid_count += 1
                if is_update:
                    update_count += 1
                else:
                    new_count += 1
            else:
                invalid_count += 1
            
            preview.append({
                'row': idx,
                'isbn': isbn,
                'title': title,
                'author': author,
                'introduction': introduction,
                'genres': genres,
                'total_copies': total_copies,
                'available_copies': available_copies,
                'publish_date': publish_date,
                'cover_url': cover_url,
                'douban_link': douban_link,
                'video_link': video_link,
                'valid': is_valid,
                'is_update': is_update,
                'existing_book_id': existing_books_map[isbn].book_id if is_update and isbn in existing_books_map else None,
                'errors': errors if errors else None
            })
        
        if mode == 'import':
            update_stock_set = set()
            if update_stock_rows:
                try:
                    update_stock_set = set(json.loads(update_stock_rows))
                except:
                    pass
            
            imported_count = 0
            updated_count = 0
            
            for item in preview:
                if not item['valid']:
                    continue
                
                if item.get('is_update'):
                    book = Book.query.filter_by(isbn=item['isbn']).first()
                    if book:
                        if item.get('title'):
                            book.title = item['title']
                        if item.get('author'):
                            book.author = item['author']
                        if item.get('introduction'):
                            book.introduction = item['introduction']
                        if item.get('genres'):
                            book.genres = item['genres']
                        if item.get('publish_date'):
                            try:
                                book.publish_date = datetime.strptime(item['publish_date'], '%Y-%m-%d')
                            except:
                                pass
                        if item.get('cover_url'):
                            book.cover_url = item['cover_url']
                        if item.get('douban_link'):
                            book.douban_link = item['douban_link']
                        if item.get('video_link'):
                            book.video_link = item['video_link']
                        
                        if item['row'] in update_stock_set:
                            book.total_copies = item.get('total_copies', book.total_copies)
                            book.available_copies = item.get('available_copies', book.available_copies)
                        
                        book.updated_at = datetime.utcnow()
                        updated_count += 1
                else:
                    try:
                        pub_date = None
                        if item.get('publish_date'):
                            pub_date = datetime.strptime(item['publish_date'], '%Y-%m-%d')
                    except:
                        pub_date = None
                    
                    book = Book(
                        isbn=item['isbn'],
                        title=item['title'],
                        author=item['author'],
                        introduction=item.get('introduction'),
                        genres=item.get('genres', []),
                        total_copies=item.get('total_copies', 1),
                        available_copies=item.get('available_copies', item.get('total_copies', 1)),
                        publish_date=pub_date,
                        cover_url=item.get('cover_url'),
                        douban_link=item.get('douban_link'),
                        video_link=item.get('video_link'),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.session.add(book)
                    imported_count += 1
            
            db.session.commit()
            
            return jsonify({
                'ok': True,
                'message': f'成功新增 {imported_count} 本图书，更新 {updated_count} 本图书',
                'imported_count': imported_count,
                'updated_count': updated_count,
                'skipped_count': invalid_count
            })
        
        return jsonify({
            'ok': True,
            'mode': 'preview',
            'preview': preview,
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'new_count': new_count,
            'update_count': update_count,
            'total_count': len(books_data)
        })
        
    except json.JSONDecodeError:
        return jsonify({'ok': False, 'message': 'JSON文件格式错误'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': f'导入失败: {str(e)}'}), 500


@api_bp.route('/admin/books/import-template', methods=['GET'])
@login_required
@admin_required
def admin_download_import_template():
    """下载图书导入模板"""
    template = 'ISBN,书名,作者,分类,简介,出版日期,总库存,可借数量,封面链接,豆瓣链接,视频链接\n'
    template += '9787020008735,红楼梦,曹雪芹,文学;小说,中国古典四大名著之一,讲述贾宝玉与林黛玉的爱情故事,1982-01-01,10,10,https://example.com/hongloumeng.jpg,https://book.douban.com/subject/1000001/,\n'
    template += '9787544253994,百年孤独,加西亚·马尔克斯,文学;小说,魔幻现实主义文学代表作,讲述布恩迪亚家族七代人的传奇故事,2011-06-01,5,5,,https://book.douban.com/subject/6082808/,\n'
    
    response = Response(
        template.encode('utf-8-sig'),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment;filename=books_import_template.csv'}
    )
    return response


# ============================================
# 管理员用户管理 API（补充）
# ============================================

@api_bp.route('/admin/users/batch-status', methods=['POST'])
@login_required
@admin_required
def admin_batch_update_user_status():
    """管理员批量修改用户状态"""
    data = request.get_json() or {}
    user_ids = data.get('user_ids', [])
    new_status = data.get('status')
    
    if not user_ids or not isinstance(user_ids, list):
        return jsonify({'ok': False, 'message': '请选择要操作的用户'}), 400
    
    if new_status not in ['active', 'suspended']:
        return jsonify({'ok': False, 'message': '无效的状态'}), 400
    
    try:
        updated_count = User.query.filter(
            User.user_id.in_(user_ids),
            User.is_admin == False
        ).update(
            {'status': new_status},
            synchronize_session=False
        )
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'成功{"启用" if new_status == "active" else "禁用"} {updated_count} 个用户',
            'updated_count': updated_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# 管理员数据统计 API（补充）
# ============================================

@api_bp.route('/admin/stats/user-growth', methods=['GET'])
@login_required
@admin_required
def admin_get_user_growth():
    """管理员获取用户增长趋势（近6个月）"""
    try:
        growth = []
        for i in range(5, -1, -1):
            month_date = datetime.utcnow() - timedelta(days=i * 30)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            if month_date.month == 12:
                month_end = month_date.replace(year=month_date.year + 1, month=1, day=1)
            else:
                month_end = month_date.replace(month=month_date.month + 1, day=1)
            
            count = User.query.filter(
                User.created_at >= month_start,
                User.created_at < month_end
            ).count()
            
            growth.append({
                'month': f'{month_date.year}-{str(month_date.month).zfill(2)}',
                'count': count
            })
        
        return jsonify({
            'ok': True,
            'growth': growth
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/stats/borrow-by-hour', methods=['GET'])
@login_required
@admin_required
def admin_get_borrow_by_hour():
    """管理员获取借阅时段分布"""
    try:
        hours_data = []
        for hour in range(24):
            count = db.session.query(db.func.count(BorrowRecord.record_id)).filter(
                db.func.extract('hour', BorrowRecord.borrow_time) == hour
            ).scalar()
            
            hours_data.append({
                'hour': hour,
                'count': count or 0
            })
        
        return jsonify({
            'ok': True,
            'hours': hours_data
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# 管理员通知管理 API
# ============================================

@api_bp.route('/admin/borrow/status-stats', methods=['GET'])
@login_required
@admin_required
def admin_get_borrow_status_stats():
    """获取借阅状态统计"""
    try:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        borrowed_count = BorrowRecord.query.filter(
            BorrowRecord.due_time > now,
            BorrowRecord.due_time >= today_end,
            BorrowRecord.return_time == None
        ).count()
        
        overdue_count = BorrowRecord.query.filter(
            BorrowRecord.due_time < now,
            BorrowRecord.return_time == None
        ).count()
        
        due_today_count = BorrowRecord.query.filter(
            BorrowRecord.due_time >= today_start,
            BorrowRecord.due_time < today_end,
            BorrowRecord.return_time == None
        ).count()
        
        pending_pickup_count = BorrowRequest.query.filter(
            BorrowRequest.request_type == 'borrow',
            BorrowRequest.status == 'approved'
        ).count()
        
        return jsonify({
            'ok': True,
            'stats': {
                'borrowed': borrowed_count,
                'overdue': overdue_count,
                'due_today': due_today_count,
                'pending_pickup': pending_pickup_count
            }
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/borrow/users-list', methods=['GET'])
@login_required
@admin_required
def admin_get_borrow_users_list():
    """获取借阅用户列表（筛选+分页）"""
    try:
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 10, type=int)
        status = request.args.get('status', '')
        phone = request.args.get('phone', '')
        book_title = request.args.get('book', '')
        
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        due_soon_end = today_start + timedelta(days=3)
        
        query = db.session.query(
            BorrowRecord.record_id,
            BorrowRecord.user_id,
            BorrowRecord.book_id,
            BorrowRecord.borrow_time,
            BorrowRecord.due_time,
            BorrowRecord.status,
            User.phone.label('user_phone'),
            Book.title.label('book_title'),
            Book.author.label('book_author'),
            Book.cover_url.label('book_cover')
        ).join(
            User, BorrowRecord.user_id == User.user_id
        ).join(
            Book, BorrowRecord.book_id == Book.book_id
        ).filter(
            BorrowRecord.return_time == None
        )
        
        if status == 'borrowed':
            query = query.filter(
                BorrowRecord.due_time > now,
                BorrowRecord.due_time >= today_end
            )
        elif status == 'overdue':
            query = query.filter(BorrowRecord.due_time < now)
        elif status == 'due-today':
            query = query.filter(
                BorrowRecord.due_time >= today_start,
                BorrowRecord.due_time < today_end
            )
        elif status == 'due-soon':
            query = query.filter(
                BorrowRecord.due_time >= today_end,
                BorrowRecord.due_time < due_soon_end
            )
        elif status == 'pending-pickup':
            query = db.session.query(
                BorrowRequest.request_id.label('record_id'),
                BorrowRequest.user_id,
                BorrowRequest.book_id,
                BorrowRequest.request_time.label('borrow_time'),
                db.literal(None).label('due_time'),
                db.literal('pending-pickup').label('status'),
                User.phone.label('user_phone'),
                Book.title.label('book_title'),
                Book.author.label('book_author'),
                Book.cover_url.label('book_cover')
            ).join(
                User, BorrowRequest.user_id == User.user_id
            ).join(
                Book, BorrowRequest.book_id == Book.book_id
            ).filter(
                BorrowRequest.request_type == 'borrow',
                BorrowRequest.status == 'approved'
            )
        
        if phone:
            query = query.filter(User.phone.like(f'%{phone}%'))
        
        if book_title:
            query = query.filter(Book.title.like(f'%{book_title}%'))
        
        query = query.order_by(BorrowRecord.due_time.asc() if status != 'pending-pickup' else BorrowRequest.request_time.desc())
        
        total = query.count()
        records = query.offset((page - 1) * page_size).limit(page_size).all()
        
        records_list = []
        for r in records:
            records_list.append({
                'record_id': r.record_id,
                'user_id': r.user_id,
                'book_id': r.book_id,
                'borrow_time': r.borrow_time.isoformat() if r.borrow_time else None,
                'due_time': r.due_time.isoformat() if r.due_time else None,
                'status': r.status,
                'user_phone': r.user_phone,
                'book_title': r.book_title,
                'book_author': r.book_author,
                'book_cover': r.book_cover
            })
        
        return jsonify({
            'ok': True,
            'records': records_list,
            'pagination': {
                'page': page,
                'pages': (total + page_size - 1) // page_size,
                'total': total
            }
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/borrow/records/ids', methods=['GET'])
@login_required
@admin_required
def admin_get_borrow_record_ids():
    """获取当前筛选条件下所有借阅记录ID"""
    try:
        status = request.args.get('status', '')
        phone = request.args.get('phone', '')
        book_title = request.args.get('book', '')
        
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        due_soon_end = today_start + timedelta(days=3)
        
        query = db.session.query(
            BorrowRecord.record_id,
            BorrowRecord.user_id,
            BorrowRecord.book_id,
            BorrowRecord.due_time,
            BorrowRecord.status
        ).join(
            User, BorrowRecord.user_id == User.user_id
        ).join(
            Book, BorrowRecord.book_id == Book.book_id
        ).filter(
            BorrowRecord.return_time == None
        )
        
        if status == 'borrowed':
            query = query.filter(
                BorrowRecord.due_time > now,
                BorrowRecord.due_time >= today_end
            )
        elif status == 'overdue':
            query = query.filter(BorrowRecord.due_time < now)
        elif status == 'due-today':
            query = query.filter(
                BorrowRecord.due_time >= today_start,
                BorrowRecord.due_time < today_end
            )
        elif status == 'due-soon':
            query = query.filter(
                BorrowRecord.due_time >= today_end,
                BorrowRecord.due_time < due_soon_end
            )
        elif status == 'pending-pickup':
            query = db.session.query(
                BorrowRequest.request_id.label('record_id'),
                BorrowRequest.user_id,
                BorrowRequest.book_id,
                db.literal(None).label('due_time'),
                db.literal('pending-pickup').label('status')
            ).join(
                User, BorrowRequest.user_id == User.user_id
            ).join(
                Book, BorrowRequest.book_id == Book.book_id
            ).filter(
                BorrowRequest.request_type == 'borrow',
                BorrowRequest.status == 'approved'
            )
        
        if phone:
            query = query.filter(User.phone.like(f'%{phone}%'))
        
        if book_title:
            query = query.filter(Book.title.like(f'%{book_title}%'))
        
        records = query.all()
        record_ids = [r.record_id for r in records]
        
        return jsonify({
            'ok': True,
            'record_ids': record_ids,
            'total': len(record_ids)
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# 确认取书/还书 API
# ============================================

@api_bp.route('/admin/borrow/<int:request_id>/confirm-pickup', methods=['POST'])
@login_required
@admin_required
def admin_confirm_pickup(request_id):
    """管理员确认取书"""
    try:
        borrow_request = BorrowRequest.query.get(request_id)
        if not borrow_request:
            return jsonify({'ok': False, 'message': '借阅申请不存在'}), 404
        
        if borrow_request.request_type != 'borrow':
            return jsonify({'ok': False, 'message': '该申请不是借书申请'}), 400
        
        if borrow_request.status != 'approved':
            return jsonify({'ok': False, 'message': '该申请状态不允许确认取书'}), 400
        
        borrow_request.status = 'picked_up'
        borrow_request.pickup_time = datetime.utcnow()
        
        notification = Notification(
            sender_id=get_current_user_id(),
            receiver_id=borrow_request.user_id,
            title='取书成功',
            content=f'您已成功取阅《{borrow_request.book.title if borrow_request.book else "图书"}》，请按时归还。',
            type='system'
        )
        db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '取书确认成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/borrow/batch-confirm-pickup', methods=['POST'])
@login_required
@admin_required
def admin_batch_confirm_pickup():
    """管理员批量确认取书"""
    try:
        data = request.get_json()
        request_ids = data.get('request_ids', [])
        
        if not request_ids:
            return jsonify({'ok': False, 'message': '请选择要确认的记录'}), 400
        
        success_count = 0
        failed_count = 0
        admin_user_id = get_current_user_id()
        
        for request_id in request_ids:
            borrow_request = BorrowRequest.query.get(request_id)
            if borrow_request and borrow_request.request_type == 'borrow' and borrow_request.status == 'approved':
                borrow_request.status = 'picked_up'
                borrow_request.pickup_time = datetime.utcnow()
                
                notification = Notification(
                    sender_id=admin_user_id,
                    receiver_id=borrow_request.user_id,
                    title='取书成功',
                    content=f'您已成功取阅《{borrow_request.book.title if borrow_request.book else "图书"}》，请按时归还。',
                    type='system'
                )
                db.session.add(notification)
                success_count += 1
            else:
                failed_count += 1
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'批量确认完成：成功 {success_count} 条，失败 {failed_count} 条',
            'success_count': success_count,
            'failed_count': failed_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/borrow/<int:record_id>/confirm-return', methods=['POST'])
@login_required
@admin_required
def admin_confirm_return(record_id):
    """管理员直接确认还书（无需用户申请）"""
    try:
        borrow_record = BorrowRecord.query.get(record_id)
        if not borrow_record:
            return jsonify({'ok': False, 'message': '借阅记录不存在'}), 404
        
        if borrow_record.status not in ('borrowed', 'overdue'):
            return jsonify({'ok': False, 'message': '该书籍已归还或状态异常'}), 400
        
        borrow_record.status = 'returned'
        borrow_record.return_time = datetime.utcnow()
        
        book = Book.query.get(borrow_record.book_id)
        if book:
            book.available_copies += 1
        
        notification = Notification(
            sender_id=get_current_user_id(),
            receiver_id=borrow_record.user_id,
            title='还书成功',
            content=f'您已成功归还《{borrow_record.book.title if borrow_record.book else "图书"}》。感谢您的借阅！',
            type='system'
        )
        db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '还书确认成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/borrow/batch-confirm-return', methods=['POST'])
@login_required
@admin_required
def admin_batch_confirm_return():
    """管理员批量确认还书"""
    try:
        data = request.get_json()
        record_ids = data.get('record_ids', [])
        
        if not record_ids:
            return jsonify({'ok': False, 'message': '请选择要确认的记录'}), 400
        
        success_count = 0
        failed_count = 0
        admin_user_id = get_current_user_id()
        
        for record_id in record_ids:
            borrow_record = BorrowRecord.query.get(record_id)
            if borrow_record and borrow_record.status in ('borrowed', 'overdue'):
                borrow_record.status = 'returned'
                borrow_record.return_time = datetime.utcnow()
                
                book = Book.query.get(borrow_record.book_id)
                if book:
                    book.available_copies += 1
                
                notification = Notification(
                    sender_id=admin_user_id,
                    receiver_id=borrow_record.user_id,
                    title='还书成功',
                    content=f'您已成功归还《{borrow_record.book.title if borrow_record.book else "图书"}》。感谢您的借阅！',
                    type='system'
                )
                db.session.add(notification)
                success_count += 1
            else:
                failed_count += 1
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'批量确认完成：成功 {success_count} 条，失败 {failed_count} 条',
            'success_count': success_count,
            'failed_count': failed_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/notifications/send', methods=['POST'])
@login_required
@admin_required
def admin_send_notification():
    """发送单个通知"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        title = data.get('title')
        content = data.get('content')
        notify_type = data.get('type', 'system')
        
        if not user_id or not title or not content:
            return jsonify({'ok': False, 'message': '参数不完整'}), 400
        
        admin_user_id = get_current_user_id()
        
        notification = Notification(
            sender_id=admin_user_id,
            receiver_id=user_id,
            title=title,
            content=content,
            type=notify_type
        )
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '通知发送成功',
            'notification_id': notification.notification_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/notifications/batch-send', methods=['POST'])
@login_required
@admin_required
def admin_batch_send_notifications():
    """批量发送通知"""
    try:
        data = request.get_json()
        record_ids = data.get('record_ids', [])
        title = data.get('title')
        content = data.get('content')
        notify_type = data.get('type', 'system')
        
        if not record_ids or not title or not content:
            return jsonify({'ok': False, 'message': '参数不完整'}), 400
        
        admin_user_id = get_current_user_id()
        
        records = BorrowRecord.query.filter(
            BorrowRecord.record_id.in_(record_ids)
        ).all()
        
        sent_count = 0
        for record in records:
            user_content = content
            user_content = user_content.replace('{书名}', record.book.title if record.book else '未知')
            user_content = user_content.replace('{到期日}', record.due_time.strftime('%Y-%m-%d') if record.due_time else '未知')
            user_content = user_content.replace('{借阅日期}', record.borrow_time.strftime('%Y-%m-%d') if record.borrow_time else '未知')
            
            if record.user:
                user_content = user_content.replace('{用户名}', record.user.phone[-4:] if record.user.phone else '用户')
            
            notification = Notification(
                sender_id=admin_user_id,
                receiver_id=record.user_id,
                title=title,
                content=user_content,
                type=notify_type
            )
            db.session.add(notification)
            sent_count += 1
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'成功发送 {sent_count} 条通知',
            'sent_count': sent_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


import os
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@api_bp.route('/upload/image', methods=['POST'])
@login_required
def upload_image():
    try:
        if 'file' not in request.files:
            return jsonify({'ok': False, 'message': '没有文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'ok': False, 'message': '没有选择文件'}), 400
        
        if file and allowed_file(file.filename):
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            unique_name = f"{timestamp}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_name)
            file.save(filepath)
            
            url = f"/static/uploads/{unique_name}"
            return jsonify({'ok': True, 'url': url, 'filename': unique_name})
        
        return jsonify({'ok': False, 'message': '不支持的文件类型'}), 400
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# === 活动管理 API ===

@api_bp.route('/activities', methods=['GET'])
def get_activities():
    try:
        status = request.args.get('status', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        query = Activity.query
        
        if status:
            query = query.filter_by(status=status)
        
        pagination = query.order_by(Activity.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        activities = []
        for a in pagination.items:
            activity_dict = a.to_dict()
            approved_count = ActivityRegistration.query.filter_by(
                activity_id=a.activity_id, status='approved'
            ).count()
            activity_dict['approved_count'] = approved_count
            activities.append(activity_dict)
        
        return jsonify({
            'ok': True,
            'activities': activities,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>', methods=['GET'])
def get_activity(activity_id):
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        data = activity.to_dict()
        
        registration_count = ActivityRegistration.query.filter_by(
            activity_id=activity_id, status='approved'
        ).count()
        data['approved_count'] = registration_count
        
        if activity.summary:
            data['summary'] = activity.summary.to_dict()
        
        return jsonify({'ok': True, 'activity': data})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities', methods=['POST'])
@login_required
@admin_required
def create_activity():
    try:
        data = request.get_json()
        
        if data.get('status') == 'published':
            if not data.get('registration_start_time') or not data.get('registration_end_time'):
                return jsonify({'ok': False, 'message': '发布活动必须设置报名时间段'}), 400
        
        activity = Activity(
            title=data.get('title'),
            description=data.get('description'),
            cover_image=data.get('cover_image'),
            content_images=data.get('content_images'),
            start_time=datetime.fromisoformat(data['start_time']) if data.get('start_time') else None,
            end_time=datetime.fromisoformat(data['end_time']) if data.get('end_time') else None,
            registration_start_time=datetime.fromisoformat(data['registration_start_time']) if data.get('registration_start_time') else None,
            registration_end_time=datetime.fromisoformat(data['registration_end_time']) if data.get('registration_end_time') else None,
            location=data.get('location'),
            max_participants=data.get('max_participants', 0),
            status=data.get('status', 'draft'),
            created_by=get_current_user_id()
        )
        
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({'ok': True, 'activity_id': activity.activity_id, 'message': '活动创建成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>', methods=['PUT'])
@login_required
@admin_required
def update_activity(activity_id):
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        data = request.get_json()
        
        if 'title' in data:
            activity.title = data['title']
        if 'description' in data:
            activity.description = data['description']
        if 'cover_image' in data:
            activity.cover_image = data['cover_image']
        if 'content_images' in data:
            activity.content_images = data['content_images']
        if 'start_time' in data:
            activity.start_time = datetime.fromisoformat(data['start_time']) if data['start_time'] else None
        if 'end_time' in data:
            activity.end_time = datetime.fromisoformat(data['end_time']) if data['end_time'] else None
        if 'registration_start_time' in data:
            activity.registration_start_time = datetime.fromisoformat(data['registration_start_time']) if data['registration_start_time'] else None
        if 'registration_end_time' in data:
            activity.registration_end_time = datetime.fromisoformat(data['registration_end_time']) if data['registration_end_time'] else None
        if 'location' in data:
            activity.location = data['location']
        if 'max_participants' in data:
            activity.max_participants = data['max_participants']
        if 'status' in data:
            if data['status'] == 'published':
                if not activity.registration_start_time or not activity.registration_end_time:
                    return jsonify({'ok': False, 'message': '发布活动必须设置报名时间段'}), 400
            activity.status = data['status']
        
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '活动更新成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_activity(activity_id):
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        current_admin = get_current_admin()
        if activity.status != 'draft' and not is_super_admin(admin=current_admin):
            return jsonify({'ok': False, 'message': '仅超级管理员可删除非草稿状态的活动'}), 403
        
        ActivityRegistration.query.filter_by(activity_id=activity_id).delete()
        
        posts = ActivityPost.query.filter_by(activity_id=activity_id).all()
        for post in posts:
            ActivityComment.query.filter_by(post_id=post.post_id).delete()
            ActivityLike.query.filter_by(post_id=post.post_id).delete()
        ActivityPost.query.filter_by(activity_id=activity_id).delete()
        
        ActivitySummaryLike.query.filter(
            ActivitySummaryLike.summary_id.in_(
                db.session.query(ActivitySummary.summary_id).filter_by(activity_id=activity_id)
            )
        ).delete(synchronize_session=False)
        ActivitySummary.query.filter_by(activity_id=activity_id).delete()
        
        db.session.delete(activity)
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '活动删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/publish', methods=['POST'])
@login_required
@admin_required
def publish_activity(activity_id):
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        activity.status = 'published'
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '活动发布成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/end', methods=['POST'])
@login_required
@admin_required
def end_activity(activity_id):
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        activity.status = 'ended'
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '活动已结束'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/register', methods=['POST'])
@login_required
def register_activity(activity_id):
    try:
        user_id = get_current_user_id()
        
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        if activity.status != 'published' and activity.status != 'ongoing':
            return jsonify({'ok': False, 'message': '活动未开放报名'}), 400
        
        now = datetime.utcnow()
        if activity.registration_start_time and now < activity.registration_start_time:
            return jsonify({'ok': False, 'message': '报名尚未开始'}), 400
        if activity.registration_end_time and now > activity.registration_end_time:
            return jsonify({'ok': False, 'message': '报名已结束'}), 400
        
        existing = ActivityRegistration.query.filter_by(
            activity_id=activity_id, user_id=user_id
        ).first()
        
        if existing and existing.status in ['pending', 'approved']:
            return jsonify({'ok': False, 'message': '您已报名该活动'}), 400
        
        if existing:
            existing.status = 'pending'
            existing.registered_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'ok': True, 'message': '重新报名成功，请等待审核', 'registration_id': existing.registration_id})
        
        if activity.max_participants > 0:
            approved_count = ActivityRegistration.query.filter_by(
                activity_id=activity_id, status='approved'
            ).count()
            if approved_count >= activity.max_participants:
                return jsonify({'ok': False, 'message': '活动名额已满'}), 400
        
        registration = ActivityRegistration(
            activity_id=activity_id,
            user_id=user_id,
            status='pending'
        )
        
        db.session.add(registration)
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '报名成功，请等待审核', 'registration_id': registration.registration_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/my-registration', methods=['GET'])
@login_required
def get_my_activity_registration(activity_id):
    """获取当前用户在指定活动的报名状态"""
    try:
        user_id = get_current_user_id()
        
        registration = ActivityRegistration.query.filter_by(
            activity_id=activity_id, user_id=user_id
        ).first()
        
        if registration:
            return jsonify({
                'ok': True,
                'registered': True,
                'registration': registration.to_dict()
            })
        else:
            return jsonify({
                'ok': True,
                'registered': False,
                'registration': None
            })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/cancel', methods=['POST'])
@login_required
def cancel_activity_registration(activity_id):
    """取消活动报名"""
    try:
        user_id = get_current_user_id()
        
        registration = ActivityRegistration.query.filter_by(
            activity_id=activity_id, 
            user_id=user_id
        ).first()
        
        if not registration:
            return jsonify({'ok': False, 'message': '未找到报名记录'}), 404
        
        if registration.status not in ['pending', 'approved']:
            return jsonify({'ok': False, 'message': '只能取消待审核或已通过的报名'}), 400
        
        registration.status = 'cancelled'
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '报名已取消'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/registrations', methods=['GET'])
@login_required
@admin_required
def get_activity_registrations(activity_id):
    try:
        status = request.args.get('status', '')
        
        query = ActivityRegistration.query.filter_by(activity_id=activity_id)
        
        if status in ['pending', 'approved', 'rejected']:
            query = query.filter_by(status=status)
        elif status == 'checked-in':
            query = query.filter(
                ActivityRegistration.status == 'approved',
                ActivityRegistration.check_in_status == 'checked_in'
            )
        elif status == 'not-checked-in':
            query = query.filter(
                ActivityRegistration.status == 'approved',
                ActivityRegistration.check_in_status == 'not_checked_in'
            )
        
        registrations = query.order_by(ActivityRegistration.registered_at.desc()).all()
        
        result = []
        for r in registrations:
            rd = r.to_dict()
            if r.user:
                rd['user_name'] = r.user.phone
                rd['user_avatar'] = r.user.avatar_url
            result.append(rd)
        
        return jsonify({'ok': True, 'registrations': result})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/registrations/<int:reg_id>/approve', methods=['POST'])
@login_required
@admin_required
def approve_registration(activity_id, reg_id):
    try:
        registration = ActivityRegistration.query.get(reg_id)
        if not registration or registration.activity_id != activity_id:
            return jsonify({'ok': False, 'message': '报名记录不存在'}), 404
        
        data = request.get_json()
        action = data.get('action')
        admin_user_id = get_current_user_id()
        activity = registration.activity
        
        if action == 'approve':
            registration.status = 'approved'
            registration.approved_at = datetime.utcnow()
            registration.approved_by = admin_user_id
            
            notification = Notification(
                sender_id=admin_user_id,
                receiver_id=registration.user_id,
                title='活动报名审核通过',
                content=f'您报名的活动「{activity.title}」已审核通过。活动时间：{activity.start_time.strftime("%Y-%m-%d %H:%M") if activity.start_time else "待定"}，地点：{activity.location or "待定"}。请准时参加！',
                type='activity'
            )
            db.session.add(notification)
        elif action == 'reject':
            registration.status = 'rejected'
            
            notification = Notification(
                sender_id=admin_user_id,
                receiver_id=registration.user_id,
                title='活动报名审核未通过',
                content=f'您报名的活动「{activity.title}」审核未通过。感谢您的关注，欢迎参与其他活动。',
                type='activity'
            )
            db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '操作成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/admin-register', methods=['POST'])
@login_required
@admin_required
def admin_batch_register_users(activity_id):
    """管理员为用户批量报名活动"""
    try:
        data = request.get_json()
        user_ids = data.get('user_ids', [])
        
        if not user_ids or not isinstance(user_ids, list):
            return jsonify({'ok': False, 'message': '请选择要报名的用户'}), 400
        
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        if activity.status not in ['published', 'ongoing']:
            return jsonify({'ok': False, 'message': '活动未开放报名'}), 400
        
        admin_user_id = get_current_user_id()
        
        success_count = 0
        failed_count = 0
        errors = []
        
        approved_count = ActivityRegistration.query.filter_by(
            activity_id=activity_id, status='approved'
        ).count()
        
        for user_id in user_ids:
            user = User.query.get(user_id)
            if not user:
                errors.append(f'用户ID {user_id} 不存在')
                failed_count += 1
                continue
            
            existing = ActivityRegistration.query.filter_by(
                activity_id=activity_id, user_id=user_id
            ).first()
            
            if existing and existing.status in ['pending', 'approved']:
                errors.append(f'{user.phone} 已报名')
                failed_count += 1
                continue
            
            if activity.max_participants > 0 and approved_count >= activity.max_participants:
                errors.append('活动名额已满')
                failed_count += 1
                break
            
            if existing:
                existing.status = 'approved'
                existing.approved_at = datetime.utcnow()
                existing.approved_by = admin_user_id
            else:
                registration = ActivityRegistration(
                    activity_id=activity_id,
                    user_id=user_id,
                    status='approved',
                    approved_at=datetime.utcnow(),
                    approved_by=admin_user_id
                )
                db.session.add(registration)
            
            notification = Notification(
                sender_id=admin_user_id,
                receiver_id=user_id,
                title='活动报名成功',
                content=f'管理员已为您报名活动「{activity.title}」。活动时间：{activity.start_time.strftime("%Y-%m-%d %H:%M") if activity.start_time else "待定"}，地点：{activity.location or "待定"}。',
                type='activity'
            )
            db.session.add(notification)
            
            success_count += 1
            approved_count += 1
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'批量报名完成：成功 {success_count} 人，失败 {failed_count} 人',
            'success_count': success_count,
            'failed_count': failed_count,
            'errors': errors[:10]
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/check-in', methods=['POST'])
@login_required
@admin_required
def admin_check_in_user(activity_id):
    """管理员为单个用户签到"""
    try:
        data = request.get_json()
        registration_id = data.get('registration_id')
        
        registration = ActivityRegistration.query.get(registration_id)
        if not registration:
            return jsonify({'ok': False, 'message': '报名记录不存在'}), 404
        
        if registration.activity_id != activity_id:
            return jsonify({'ok': False, 'message': '报名记录不属于该活动'}), 400
        
        if registration.status != 'approved':
            return jsonify({'ok': False, 'message': '该用户未通过审核，无法签到'}), 400
        
        if registration.check_in_status == 'checked_in':
            return jsonify({'ok': False, 'message': '该用户已签到'}), 400
        
        admin_user_id = get_current_user_id()
        
        registration.check_in_status = 'checked_in'
        registration.check_in_time = datetime.utcnow()
        registration.check_in_by = admin_user_id
        
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '签到成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/batch-check-in', methods=['POST'])
@login_required
@admin_required
def admin_batch_check_in(activity_id):
    """管理员批量签到"""
    try:
        data = request.get_json()
        registration_ids = data.get('registration_ids', [])
        
        if not registration_ids:
            return jsonify({'ok': False, 'message': '请选择要签到的用户'}), 400
        
        admin_user_id = get_current_user_id()
        success_count = 0
        failed_count = 0
        
        for reg_id in registration_ids:
            registration = ActivityRegistration.query.get(reg_id)
            if registration and registration.activity_id == activity_id and registration.status == 'approved' and registration.check_in_status != 'checked_in':
                registration.check_in_status = 'checked_in'
                registration.check_in_time = datetime.utcnow()
                registration.check_in_by = admin_user_id
                success_count += 1
            else:
                failed_count += 1
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'批量签到完成：成功 {success_count} 人，失败 {failed_count} 人',
            'success_count': success_count,
            'failed_count': failed_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/participants/export', methods=['GET'])
def export_activity_participants(activity_id):
    """导出活动参与人员名单"""
    import jwt
    
    token = request.args.get('token')
    if not token:
        return jsonify({'ok': False, 'message': '未登录，请先登录'}), 401
    
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload.get('user_id')
        
        admin = Admin.query.filter_by(user_id=user_id).first()
        if not admin:
            return jsonify({'ok': False, 'message': '需要管理员权限'}), 403
            
    except jwt.ExpiredSignatureError:
        return jsonify({'ok': False, 'message': '登录已过期，请重新登录'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'ok': False, 'message': '无效的token'}), 401
    
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        registrations = ActivityRegistration.query.filter_by(activity_id=activity_id).all()
        
        import io
        output = io.StringIO()
        output.write('\ufeff')
        output.write('序号,账号,学校,报名时间,审核状态,签到状态,签到时间\n')
        
        for idx, reg in enumerate(registrations, 1):
            user = User.query.get(reg.user_id)
            phone = user.phone if user else ''
            school = user.school if user and user.school else ''
            register_time = reg.registered_at.strftime('%Y-%m-%d %H:%M') if reg.registered_at else ''
            
            status_text = {'pending': '待审核', 'approved': '已通过', 'rejected': '已拒绝', 'cancelled': '已取消'}.get(reg.status, reg.status)
            check_in_text = {'not_checked_in': '未签到', 'checked_in': '已签到'}.get(reg.check_in_status, '未签到')
            check_in_time = reg.check_in_time.strftime('%Y-%m-%d %H:%M') if reg.check_in_time else ''
            
            output.write(f'{idx},{phone},{school},{register_time},{status_text},{check_in_text},{check_in_time}\n')
        
        output.seek(0)
        
        return Response(
            output.getvalue(),
            mimetype='text/csv;charset=utf-8',
            headers={'Content-Disposition': f'attachment; filename=activity_{activity_id}_participants.csv'}
        )
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/auto-mark-absent', methods=['POST'])
@login_required
@admin_required
def auto_mark_absent(activity_id):
    """活动结束后自动标记未签到用户"""
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        count = ActivityRegistration.query.filter_by(
            activity_id=activity_id,
            status='approved',
            check_in_status='not_checked_in'
        ).update({'check_in_status': 'not_checked_in'})
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'已标记 {count} 名未签到用户'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/participants', methods=['GET'])
def get_activity_participants(activity_id):
    """获取活动参与成员列表（用户端）"""
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        registrations = ActivityRegistration.query.filter_by(activity_id=activity_id).all()
        
        participants = []
        for reg in registrations:
            user = User.query.get(reg.user_id)
            participants.append({
                'user_id': reg.user_id,
                'user_phone': user.phone if user else None,
                'user_avatar': user.avatar_url if user else None,
                'user_school': user.school if user else None,
                'status': reg.status,
                'check_in_status': reg.check_in_status if reg.status == 'approved' else None
            })
        
        return jsonify({
            'ok': True,
            'participants': participants
        })
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/summary', methods=['POST'])
@login_required
@admin_required
def create_activity_summary(activity_id):
    try:
        activity = Activity.query.get(activity_id)
        if not activity:
            return jsonify({'ok': False, 'message': '活动不存在'}), 404
        
        data = request.get_json()
        
        if activity.summary:
            activity.summary.content = data.get('content')
            activity.summary.images = data.get('images')
        else:
            summary = ActivitySummary(
                activity_id=activity_id,
                content=data.get('content'),
                images=data.get('images')
            )
            db.session.add(summary)
        
        activity.status = 'ended'
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '活动总结发布成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/summary/like', methods=['POST'])
@login_required
def like_activity_summary(activity_id):
    """点赞活动总结"""
    try:
        user_id = get_current_user_id()
        
        activity = Activity.query.get(activity_id)
        if not activity or not activity.summary:
            return jsonify({'ok': False, 'message': '活动总结不存在'}), 404
        
        summary = activity.summary
        
        existing = ActivitySummaryLike.query.filter_by(
            summary_id=summary.summary_id, 
            user_id=user_id
        ).first()
        
        if existing:
            db.session.delete(existing)
            summary.likes_count = max(0, summary.likes_count - 1)
            db.session.commit()
            return jsonify({'ok': True, 'liked': False, 'likes_count': summary.likes_count})
        else:
            like = ActivitySummaryLike(
                summary_id=summary.summary_id,
                user_id=user_id
            )
            db.session.add(like)
            summary.likes_count += 1
            db.session.commit()
            return jsonify({'ok': True, 'liked': True, 'likes_count': summary.likes_count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activities/<int:activity_id>/posts', methods=['GET'])
def get_activity_posts(activity_id):
    try:
        posts = ActivityPost.query.filter_by(activity_id=activity_id).order_by(ActivityPost.created_at.desc()).all()
        
        user_id = None
        user = get_current_user_id()
        if user:
            user_id = user
        
        result = []
        for p in posts:
            pd = p.to_dict()
            if user_id:
                like = ActivityLike.query.filter_by(post_id=p.post_id, user_id=user_id).first()
                pd['is_liked'] = like is not None
            result.append(pd)
        
        return jsonify({'ok': True, 'posts': result})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activity-posts/<int:post_id>/like', methods=['POST'])
@login_required
def like_post(post_id):
    try:
        user_id = get_current_user_id()
        
        post = ActivityPost.query.get(post_id)
        if not post:
            return jsonify({'ok': False, 'message': '帖子不存在'}), 404
        
        existing = ActivityLike.query.filter_by(post_id=post_id, user_id=user_id).first()
        
        if existing:
            db.session.delete(existing)
            post.likes_count = max(0, post.likes_count - 1)
            db.session.commit()
            return jsonify({'ok': True, 'liked': False, 'likes_count': post.likes_count})
        else:
            like = ActivityLike(post_id=post_id, user_id=user_id)
            db.session.add(like)
            post.likes_count += 1
            db.session.commit()
            return jsonify({'ok': True, 'liked': True, 'likes_count': post.likes_count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activity-posts/<int:post_id>/comments', methods=['GET'])
def get_post_comments(post_id):
    try:
        comments = ActivityComment.query.filter_by(post_id=post_id).order_by(ActivityComment.created_at.asc()).all()
        return jsonify({'ok': True, 'comments': [c.to_dict() for c in comments]})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/activity-posts/<int:post_id>/comments', methods=['POST'])
@login_required
def add_post_comment(post_id):
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({'ok': False, 'message': '评论内容不能为空'}), 400
        
        post = ActivityPost.query.get(post_id)
        if not post:
            return jsonify({'ok': False, 'message': '帖子不存在'}), 404
        
        comment = ActivityComment(
            post_id=post_id,
            user_id=user_id,
            content=content
        )
        
        db.session.add(comment)
        db.session.commit()
        
        return jsonify({'ok': True, 'comment': comment.to_dict(), 'message': '评论成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


# === 图书详情 API ===

@api_bp.route('/books/<int:book_id>/detail', methods=['GET'])
def get_book_detail(book_id):
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({'ok': False, 'message': '图书不存在'}), 404
        
        data = book.to_dict()
        
        approved_reviews = BookReview.query.filter_by(book_id=book_id, status='approved').order_by(BookReview.created_at.desc()).all()
        data['reviews'] = [r.to_dict() for r in approved_reviews]
        data['review_count'] = len(approved_reviews)
        
        if approved_reviews:
            avg_rating = sum(r.rating for r in approved_reviews) / len(approved_reviews)
            data['avg_rating'] = round(avg_rating, 1)
        else:
            data['avg_rating'] = 0
        
        return jsonify({'ok': True, 'book': data})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/books/<int:book_id>/reviews', methods=['GET'])
def get_book_reviews(book_id):
    try:
        status = request.args.get('status', 'approved')
        
        query = BookReview.query.filter_by(book_id=book_id)
        
        if status:
            query = query.filter_by(status=status)
        
        reviews = query.order_by(BookReview.created_at.desc()).all()
        
        return jsonify({'ok': True, 'reviews': [r.to_dict() for r in reviews]})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/books/<int:book_id>/reviews', methods=['POST'])
@login_required
def create_book_review(book_id):
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        content = data.get('content', '').strip()
        rating = data.get('rating', 5)
        
        if not content:
            return jsonify({'ok': False, 'message': '读后感内容不能为空'}), 400
        
        book = Book.query.get(book_id)
        if not book:
            return jsonify({'ok': False, 'message': '图书不存在'}), 404
        
        existing = BookReview.query.filter_by(book_id=book_id, user_id=user_id).first()
        if existing:
            return jsonify({'ok': False, 'message': '您已发表过读后感'}), 400
        
        review = BookReview(
            book_id=book_id,
            user_id=user_id,
            content=content,
            rating=rating,
            status='pending'
        )
        
        db.session.add(review)
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '读后感已提交，请等待审核', 'review_id': review.review_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/reviews', methods=['GET'])
@login_required
@admin_required
def get_pending_reviews():
    try:
        status = request.args.get('status', 'pending')
        
        query = BookReview.query
        
        if status:
            query = query.filter_by(status=status)
        
        reviews = query.order_by(BookReview.created_at.desc()).all()
        
        return jsonify({'ok': True, 'reviews': [r.to_dict() for r in reviews]})
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/reviews/ids', methods=['GET'])
@login_required
@admin_required
def admin_get_review_ids():
    try:
        status = request.args.get('status', 'pending')
        
        query = BookReview.query
        
        if status:
            query = query.filter_by(status=status)
        
        reviews = query.with_entities(BookReview.review_id).all()
        review_ids = [r.review_id for r in reviews]
        
        return jsonify({
            'ok': True,
            'review_ids': review_ids,
            'total': len(review_ids)
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/reviews/<int:review_id>/approve', methods=['POST'])
@login_required
@admin_required
def approve_review(review_id):
    try:
        review = BookReview.query.get(review_id)
        if not review:
            return jsonify({'ok': False, 'message': '读后感不存在'}), 404
        
        data = request.get_json()
        action = data.get('action')
        
        if action == 'approve':
            review.status = 'approved'
            review.reviewed_at = datetime.utcnow()
            review.reviewed_by = get_current_user_id()
        elif action == 'reject':
            review.status = 'rejected'
            review.reviewed_at = datetime.utcnow()
            review.reviewed_by = get_current_user_id()
        
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '操作成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/books/<int:book_id>/ai-evaluation', methods=['GET'])
def get_book_ai_evaluation(book_id):
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({'ok': False, 'message': '图书不存在'}), 404
        
        user_id = None
        try:
            user_id = get_current_user_id()
        except:
            pass
        
        personalized = False
        borrowed_titles = []
        favorite_titles = []
        
        if user_id:
            borrowed_records = BorrowRecord.query.filter_by(user_id=user_id)\
                .join(Book).order_by(BorrowRecord.borrow_time.desc()).limit(10).all()
            borrowed_titles = [r.book.title for r in borrowed_records if r.book]
            
            favorites = Favorite.query.filter_by(user_id=user_id)\
                .join(Book).order_by(Favorite.created_at.desc()).limit(10).all()
            favorite_titles = [f.book.title for f in favorites if f.book]
            
            personalized = bool(borrowed_titles or favorite_titles)
        
        if personalized:
            prompt = f"""请基于用户的阅读偏好，为以下图书撰写一段个性化评价。

待评价图书：
- 书名：{book.title}
- 作者：{book.author or '未知'}
- ISBN：{book.isbn or '未知'}
- 简介：{book.introduction or '暂无简介'}

请在评价中：
1. 简要介绍这本书的内容和主题
2. 说明这本书的推荐理由和适合人群
3. 字数约100字，不要提及用户的个人阅读历史

请直接输出评价内容，不需要其他格式。"""
        else:
            prompt = f"""请为以下图书撰写一段专业评价，包括内容简介、主题分析、阅读价值推荐等，字数约100字。

书名：{book.title}
作者：{book.author or '未知'}
ISBN：{book.isbn or '未知'}
简介：{book.introduction or '暂无简介'}

请直接输出评价内容，不需要其他格式。"""
        
        messages = [{"role": "user", "content": prompt}]
        try:
            response = ai_service.chat(messages)
            if response.get('ok'):
                evaluation = response.get('content', '暂无法生成评价')
            else:
                evaluation = response.get('error', 'AI服务暂时不可用')
        except Exception as e:
            evaluation = f'AI评价生成失败：{str(e)}'
        
        return jsonify({
            'ok': True, 
            'evaluation': evaluation,
            'personalized': personalized
        })
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


# ============================================
# 管理员管理 API（仅超级管理员可访问）
# ============================================

@api_bp.route('/admin/admins', methods=['GET'])
@login_required
@super_admin_required
def get_admins():
    """获取管理员列表（仅超级管理员）"""
    try:
        admins = Admin.query.all()
        result = []
        
        for admin in admins:
            user = User.query.get(admin.user_id)
            if user:
                result.append({
                    'admin_id': admin.admin_id,
                    'user_id': admin.user_id,
                    'phone': user.phone,
                    'school': user.school,
                    'avatar_url': user.avatar_url,
                    'status': user.status,
                    'level': admin.level,
                    'is_super': user.phone == SUPER_ADMIN_PHONE,
                    'permissions': admin.permissions or [],
                    'created_at': admin.created_at.isoformat() if admin.created_at else None
                })
        
        return jsonify({'ok': True, 'admins': result})
        
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/admins', methods=['POST'])
@login_required
@super_admin_required
def create_admin():
    """创建管理员（仅超级管理员）"""
    try:
        data = request.get_json()
        phone = data.get('phone', '').strip()
        password = data.get('password', '').strip()
        permissions = data.get('permissions', [])
        
        if not phone:
            return jsonify({'ok': False, 'message': '请输入手机号'}), 400
        
        if not re.match(r'^1[3-9]\d{9}$', phone):
            return jsonify({'ok': False, 'message': '手机号格式不正确'}), 400
        
        user = User.query.filter_by(phone=phone).first()
        
        if not user:
            if not password or len(password) < 6:
                return jsonify({'ok': False, 'message': '新用户需设置密码（至少6位）'}), 400
            
            user = User(
                phone=phone,
                password_hash=generate_password_hash(password),
                status='active'
            )
            db.session.add(user)
            db.session.flush()
        
        existing_admin = Admin.query.filter_by(user_id=user.user_id).first()
        if existing_admin:
            return jsonify({'ok': False, 'message': '该用户已是管理员'}), 400
        
        admin = Admin(
            user_id=user.user_id,
            level='normal',
            permissions=permissions
        )
        db.session.add(admin)
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '管理员创建成功',
            'admin': {
                'admin_id': admin.admin_id,
                'user_id': user.user_id,
                'phone': user.phone,
                'level': admin.level,
                'permissions': admin.permissions
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/admins/<int:admin_id>', methods=['PUT'])
@login_required
@super_admin_required
def update_admin(admin_id):
    """编辑管理员（仅超级管理员）"""
    try:
        data = request.get_json()
        permissions = data.get('permissions')
        
        admin = Admin.query.get(admin_id)
        if not admin:
            return jsonify({'ok': False, 'message': '管理员不存在'}), 404
        
        user = User.query.get(admin.user_id)
        if user and user.phone == SUPER_ADMIN_PHONE:
            return jsonify({'ok': False, 'message': '无法编辑超级管理员'}), 403
        
        if permissions is not None:
            admin.permissions = permissions if isinstance(permissions, list) else []
        
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': '管理员信息更新成功',
            'admin': {
                'admin_id': admin.admin_id,
                'permissions': admin.permissions
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/admins/<int:admin_id>', methods=['DELETE'])
@login_required
@super_admin_required
def delete_admin(admin_id):
    """移除管理员身份（仅超级管理员）"""
    try:
        admin = Admin.query.get(admin_id)
        if not admin:
            return jsonify({'ok': False, 'message': '管理员不存在'}), 404
        
        user = User.query.get(admin.user_id)
        if user and user.phone == SUPER_ADMIN_PHONE:
            return jsonify({'ok': False, 'message': '无法移除超级管理员'}), 403
        
        db.session.delete(admin)
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '管理员已移除'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/admins/<int:admin_id>/reset-password', methods=['POST'])
@login_required
@super_admin_required
def reset_admin_password(admin_id):
    """重置管理员密码（仅超级管理员）"""
    try:
        data = request.get_json()
        new_password = data.get('new_password', '123456')
        
        if len(new_password) < 6:
            return jsonify({'ok': False, 'message': '密码长度不能少于6位'}), 400
        
        admin = Admin.query.get(admin_id)
        if not admin:
            return jsonify({'ok': False, 'message': '管理员不存在'}), 404
        
        user = User.query.get(admin.user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        if user.phone == SUPER_ADMIN_PHONE:
            return jsonify({'ok': False, 'message': '无法重置超级管理员密码'}), 403
        
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '密码重置成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/admins/<int:admin_id>/status', methods=['PATCH'])
@login_required
@super_admin_required
def toggle_admin_status(admin_id):
    """启用/禁用管理员账号（仅超级管理员）"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['active', 'suspended']:
            return jsonify({'ok': False, 'message': '无效的状态'}), 400
        
        admin = Admin.query.get(admin_id)
        if not admin:
            return jsonify({'ok': False, 'message': '管理员不存在'}), 404
        
        user = User.query.get(admin.user_id)
        if not user:
            return jsonify({'ok': False, 'message': '用户不存在'}), 404
        
        if user.phone == SUPER_ADMIN_PHONE:
            return jsonify({'ok': False, 'message': '无法修改超级管理员状态'}), 403
        
        user.status = new_status
        db.session.commit()
        
        return jsonify({
            'ok': True,
            'message': f'管理员账号已{"启用" if new_status == "active" else "禁用"}',
            'status': new_status
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500


@api_bp.route('/admin/init-super-admin', methods=['POST'])
def init_super_admin():
    """初始化超级管理员（仅用于首次部署）"""
    try:
        existing_super = User.query.filter_by(phone=SUPER_ADMIN_PHONE).first()
        
        if existing_super:
            admin = Admin.query.filter_by(user_id=existing_super.user_id).first()
            if admin:
                Admin.query.filter(Admin.level == 'super', Admin.admin_id != admin.admin_id).update({'level': 'normal'})
                db.session.commit()
                return jsonify({'ok': True, 'message': '超级管理员已存在'})
            
            Admin.query.filter(Admin.level == 'super').update({'level': 'normal'})
            
            new_admin = Admin(
                user_id=existing_super.user_id,
                level='super',
                permissions=[]
            )
            db.session.add(new_admin)
            db.session.commit()
            return jsonify({'ok': True, 'message': '超级管理员已设置'})
        
        password = request.get_json().get('password', 'admin123') if request.is_json else 'admin123'
        
        user = User(
            phone=SUPER_ADMIN_PHONE,
            password_hash=generate_password_hash(password),
            status='active'
        )
        db.session.add(user)
        db.session.flush()
        
        Admin.query.filter(Admin.level == 'super').update({'level': 'normal'})
        
        admin = Admin(
            user_id=user.user_id,
            level='super',
            permissions=[]
        )
        db.session.add(admin)
        db.session.commit()
        
        return jsonify({'ok': True, 'message': '超级管理员创建成功', 'phone': SUPER_ADMIN_PHONE})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'message': str(e)}), 500