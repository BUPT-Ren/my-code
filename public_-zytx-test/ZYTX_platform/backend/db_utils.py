"""
数据库工具 - 专门处理存储过程调用
"""
import pymysql
from .config import Config
import json
from urllib.parse import urlparse, unquote

class DatabaseManager:
    """数据库连接管理器"""
    
    def __init__(self):
        self.parse_connection_string()
    
    def parse_connection_string(self):
        """解析数据库连接字符串"""
        # 解析连接字符串
        if 'pymysql' in Config.SQLALCHEMY_DATABASE_URI:
            # 移除 mysql+pymysql:// 前缀，替换为 mysql:// 以便 urlparse 解析
            uri = Config.SQLALCHEMY_DATABASE_URI.replace('mysql+pymysql://', 'mysql://')
        else:
            uri = Config.SQLALCHEMY_DATABASE_URI.replace('mysql+mysqlconnector://', 'mysql://')
        
        parsed = urlparse(uri)
        
        self.host = parsed.hostname or 'localhost'
        self.port = parsed.port or 3306
        self.username = parsed.username or 'root'
        
        # 解码密码（包含特殊字符）
        self.password = unquote(parsed.password) if parsed.password else ''
        
        # 数据库名是路径的第一部分
        self.database = parsed.path[1:] if parsed.path.startswith('/') else parsed.path
    
    def get_connection(self):
        """获取新的数据库连接"""
        conn = pymysql.connect(
            host=self.host,
            user=self.username,
            password=self.password,
            database=self.database,
            port=self.port,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        conn.cursor().execute('SET NAMES utf8mb4')
        return conn
    
    def call_procedure(self, proc_name, params=None, commit=True):
        """
        调用存储过程 - 完全修复版本
        确保正确处理所有结果集，避免 "Commands out of sync"
        """
        params = params or {}
        
        # 构建参数列表
        param_names = list(params.keys())
        param_values = list(params.values())
        
        print(f"[DB] 调用存储过程: {proc_name}")
        print(f"[DB] 参数: {params}")
        
        connection = None
        try:
            # 每次调用都创建新连接，避免连接状态污染
            connection = self.get_connection()
            
            with connection.cursor() as cursor:
                # 调用存储过程
                cursor.callproc(proc_name, param_values)
                
                # 获取所有结果集
                all_results = []
                while True:
                    try:
                        # 获取当前结果集
                        rows = cursor.fetchall()
                        if rows:
                            all_results.append(rows)
                    except pymysql.err.InterfaceError:
                        # 没有更多行
                        break
                    
                    # 检查是否有下一个结果集
                    try:
                        if not cursor.nextset():
                            break
                    except Exception:
                        break
                
                # 提交事务
                if commit:
                    connection.commit()
                
                print(f"[DB] 结果集数量: {len(all_results)}")
                
                # 返回第一个结果集（如果有）
                if all_results:
                    # 将结果转换为字典列表
                    result_dicts = []
                    for row in all_results[0]:
                        # 处理特殊类型
                        processed_row = {}
                        for key, value in row.items():
                            if isinstance(value, (bytes, bytearray)):
                                processed_row[key] = value.decode('utf-8', errors='ignore')
                            elif hasattr(value, 'isoformat'):
                                processed_row[key] = value.isoformat()
                            else:
                                processed_row[key] = value
                        result_dicts.append(processed_row)
                    
                    return result_dicts
                else:
                    return []
                
        except Exception as e:
            print(f"[DB] 存储过程调用失败: {e}")
            if connection:
                connection.rollback()
            raise e
        finally:
            if connection:
                connection.close()
    
    def call_procedure_simple(self, proc_name, params=None):
        """
        简化的存储过程调用 - 使用原始 SQL
        避免使用 cursor.callproc
        """
        params = params or {}
        
        # 构建参数占位符
        param_placeholders = ', '.join([f'%s' for _ in params])
        param_values = list(params.values())
        
        # 构建 CALL 语句
        sql = f"CALL {proc_name}({param_placeholders})"
        
        print(f"[DB-SIMPLE] 调用存储过程: {proc_name}")
        print(f"[DB-SIMPLE] SQL: {sql}")
        print(f"[DB-SIMPLE] 参数值: {param_values}")
        
        connection = None
        try:
            connection = self.get_connection()
            
            with connection.cursor() as cursor:
                # 直接执行 SQL
                cursor.execute(sql, param_values)
                
                # 获取结果
                results = []
                while True:
                    try:
                        rows = cursor.fetchall()
                        if rows:
                            results.append(rows)
                    except:
                        break
                    
                    try:
                        if not cursor.nextset():
                            break
                    except:
                        break
                
                connection.commit()
                
                # 处理结果
                if results:
                    return [dict(row) for row in results[0]]
                return []
                
        except Exception as e:
            print(f"[DB-SIMPLE] 调用失败: {e}")
            if connection:
                connection.rollback()
            raise e
        finally:
            if connection:
                connection.close()


# 创建全局实例
db_manager = DatabaseManager()