import sys
import os

# 获取当前文件所在目录的父目录（项目根目录）
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

# 将项目根目录添加到 Python 路径
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# 现在可以导入 backend
from backend import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)