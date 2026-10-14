from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from .config import Config
from sqlalchemy import text, event
db = SQLAlchemy()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

def create_app():
    app = Flask(__name__, static_folder='../', static_url_path='/')
    app.config.from_object(Config)
    app.config['JSON_AS_ASCII'] = False
    db.init_app(app)
    
    cors_origins = app.config.get('CORS_ORIGINS', 'http://localhost:5000,http://127.0.0.1:5000')
    if isinstance(cors_origins, str):
        cors_origins = [origin.strip() for origin in cors_origins.split(',')]
    CORS(app, origins=cors_origins)
    
    limiter.init_app(app)
    
    with app.app_context():
        @event.listens_for(db.engine, "connect")
        def set_charset(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("SET NAMES utf8mb4")
            cursor.close()

    from .routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return app.send_static_file('index.html')


    @app.route('/test_db')
    def test_db():
        try:
            # 尝试执行一个简单查询，使用 text() 包装
            result = db.session.execute(text('SELECT 1'))
            return '数据库连接成功！'
        except Exception as e:
            return f'数据库连接失败: {str(e)}'

    @app.route('/health')
    def health_check():
        try:
            # 获取数据库版本，使用 text() 包装
            result = db.session.execute(text('SELECT VERSION()'))
            version = result.fetchone()[0]
            return f'数据库连接成功！MySQL 版本: {version}'
        except Exception as e:
            return f'数据库连接失败: {str(e)}'
        
    return app