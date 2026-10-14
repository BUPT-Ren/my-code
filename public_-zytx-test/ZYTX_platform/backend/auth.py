"""
JWT认证模块
"""
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app


def generate_token(user_id, expires_in=4*3600):
    """
    生成JWT Token
    
    Args:
        user_id: 用户ID
        expires_in: 过期时间（秒），默认4小时
    
    Returns:
        str: JWT Token
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(seconds=expires_in),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    return token


def verify_token(token):
    """
    验证JWT Token
    
    Args:
        token: JWT Token
    
    Returns:
        tuple: (success: bool, user_id: int or None, error: str or None)
    """
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return True, payload.get('user_id'), None
    except jwt.ExpiredSignatureError:
        return False, None, 'Token已过期，请重新登录'
    except jwt.InvalidTokenError:
        return False, None, 'Token无效'


def login_required(f):
    """
    登录验证装饰器
    从请求头获取Token并验证，将user_id注入到request对象
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # 从请求头获取Token
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header:
            return jsonify({'ok': False, 'message': '未登录，请先登录'}), 401
        
        # 支持 "Bearer token" 格式
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
        
        # 验证Token
        success, user_id, error = verify_token(token)
        
        if not success:
            return jsonify({'ok': False, 'message': error}), 401
        
        # 将user_id注入到request对象
        request.current_user_id = user_id
        
        return f(*args, **kwargs)
    
    return decorated


def optional_login(f):
    """
    可选登录装饰器
    如果有Token则验证，没有则跳过
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header:
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
            else:
                token = auth_header
            
            success, user_id, error = verify_token(token)
            if success:
                request.current_user_id = user_id
            else:
                request.current_user_id = None
        else:
            request.current_user_id = None
        
        return f(*args, **kwargs)
    
    return decorated


def get_current_user_id():
    """
    获取当前登录用户ID
    需要在@login_required装饰的函数中使用
    """
    return getattr(request, 'current_user_id', None)


def admin_required(f):
    """
    管理员权限验证装饰器
    需要@login_required先验证登录，然后检查是否是管理员
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # 先检查是否登录
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'ok': False, 'message': '未登录，请先登录'}), 401
        
        # 延迟导入避免循环依赖
        from .models import Admin
        
        # 检查是否是管理员
        admin = Admin.query.filter_by(user_id=user_id).first()
        if not admin:
            return jsonify({'ok': False, 'message': '需要管理员权限'}), 403
        
        # 将管理员信息注入到request对象
        request.current_admin = admin
        
        return f(*args, **kwargs)
    
    return decorated


def get_current_admin():
    """
    获取当前管理员信息
    需要在@admin_required装饰的函数中使用
    """
    return getattr(request, 'current_admin', None)


SUPER_ADMIN_PHONE = '18786898944'


def is_super_admin(admin=None, user_id=None):
    """
    判断是否是超级管理员（手机号为18786898944）
    """
    if admin:
        from .models import User
        user = User.query.get(admin.user_id)
        if user and user.phone == SUPER_ADMIN_PHONE:
            return True
        return False
    
    if user_id:
        from .models import User, Admin
        user = User.query.get(user_id)
        if user and user.phone == SUPER_ADMIN_PHONE:
            return True
        return False
    
    return False


def super_admin_required(f):
    """
    超级管理员权限验证装饰器
    只有手机号为18786898944的管理员才能通过
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'ok': False, 'message': '未登录，请先登录'}), 401
        
        from .models import Admin, User
        
        admin = Admin.query.filter_by(user_id=user_id).first()
        if not admin:
            return jsonify({'ok': False, 'message': '需要管理员权限'}), 403
        
        user = User.query.get(user_id)
        if not user or user.phone != SUPER_ADMIN_PHONE:
            return jsonify({'ok': False, 'message': '需要超级管理员权限'}), 403
        
        request.current_admin = admin
        request.is_super_admin = True
        
        return f(*args, **kwargs)
    
    return decorated