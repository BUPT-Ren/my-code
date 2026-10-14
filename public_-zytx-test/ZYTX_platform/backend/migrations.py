"""
数据库迁移和初始化工具
"""
from . import db
import json
from datetime import datetime

def init_sample_data():
    """初始化示例数据（不创建表，只插入数据）"""
    # 移除示例数据插入逻辑。数据库已包含测试数据时，不应再通过代码自动插入。
    return False