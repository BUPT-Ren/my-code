#!/usr/bin/env python
"""
运行脚本：python run.py [命令]
命令：
  无参数    - 启动应用
  --init-db - 初始化数据库表
  --test    - 运行测试
"""
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    from backend import create_app
    
    app = create_app()
    
    # 处理命令行参数
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == '--init-db':
            print("正在初始化数据库...")
            try:
                with app.app_context():
                    from backend import db
                    # 创建所有表
                    db.create_all()
                    print("✓ 数据库表创建成功")
                    # 不自动插入示例数据（使用外部 SQL 或手动导入）
                    print("提示：未插入示例数据；请使用外部 SQL 导入或手动初始化")
            except Exception as e:
                print(f"✗ 初始化失败: {e}")
                return
        
        elif command == '--test':
            print("运行测试...")
            # 可以添加测试代码
            test_connection(app)
            return
        
        elif command == '--help':
            print(__doc__)
            return
        
        else:
            print(f"未知命令: {command}")
            print("使用 --help 查看帮助")
            return
    
    # 没有参数，正常启动应用
    print("=" * 60)
    print("启动 Flask 应用")
    print("=" * 60)
    print(f"应用名称: {app.name}")
    print(f"调试模式: {app.debug}")
    print(f"数据库: {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1]}")
    print(f"静态文件: {app.static_folder}")
    print("=" * 60)
    print(f"主页: http://localhost:5000")
    print(f"API接口: http://localhost:5000/api")
    print(f"健康检查: http://localhost:5000/health")
    print(f"数据库测试: http://localhost:5000/test_db")
    print("=" * 60)
    print("按 Ctrl+C 停止")
    
    app.run(host='0.0.0.0', port=5000, debug=True)

def insert_sample_data():
    """插入示例数据"""
    # 示例数据插入逻辑已移除。请使用外部 SQL (例如 ZYTX_SQL.txt) 在数据库中准备数据。
    return

def test_connection(app):
    """测试连接"""
    with app.app_context():
        from backend import db
        from sqlalchemy import text
        
        try:
            # 测试数据库连接
            db.session.execute(text('SELECT 1'))
            print("✓ 数据库连接正常")
            
            # 测试表数量
            from backend.models import User, Book
            user_count = User.query.count()
            book_count = Book.query.count()
            print(f"✓ 用户表: {user_count} 条记录")
            print(f"✓ 图书表: {book_count} 条记录")
            
        except Exception as e:
            print(f"✗ 连接测试失败: {e}")

if __name__ == '__main__':
    main()