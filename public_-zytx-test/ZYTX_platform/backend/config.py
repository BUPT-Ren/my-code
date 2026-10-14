import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

class Config:
    # 应用配置
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # 数据库配置
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '3306')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'zytx')
    DB_DRIVER = os.getenv('DB_DRIVER', 'mysqlconnector')
    
    # 构建数据库URI
    encoded_password = quote_plus(DB_PASSWORD)
    
    if DB_DRIVER == 'pymysql':
        SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4'
    elif DB_DRIVER == 'mysqlconnector':
        SQLALCHEMY_DATABASE_URI = f'mysql+mysqlconnector://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4'
    else:
        SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'False').lower() == 'true'
    
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 3600,
        'connect_args': {
            'charset': 'utf8mb4'
        }
    }
    
    # 其他配置
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # DeepSeek API 配置
    DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
    DEEPSEEK_MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat')
    
    # 管理员注册密钥
    ADMIN_REGISTER_KEY = os.getenv('ADMIN_REGISTER_KEY', '')
    
    # CORS 配置
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5000,http://127.0.0.1:5000')