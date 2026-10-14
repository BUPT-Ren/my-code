"""
AI服务封装 - DeepSeek API
"""
import requests
import json
from flask import current_app
from typing import Generator, List, Dict, Optional

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


class AIService:
    """DeepSeek AI服务"""
    
    def __init__(self):
        self.api_key = None
        self.model = 'deepseek-chat'
    
    def _get_config(self):
        """获取配置"""
        if self.api_key is None:
            self.api_key = current_app.config.get('DEEPSEEK_API_KEY', '')
            self.model = current_app.config.get('DEEPSEEK_MODEL', 'deepseek-chat')
        return self.api_key
    
    def _build_headers(self) -> dict:
        """构建请求头"""
        return {
            'Authorization': f'Bearer {self._get_config()}',
            'Content-Type': 'application/json'
        }
    
    def chat(self, messages: List[Dict], stream: bool = False) -> Dict:
        """
        非流式对话
        
        Args:
            messages: 对话消息列表 [{"role": "user", "content": "..."}]
            stream: 是否流式输出
        
        Returns:
            {"ok": True, "content": "AI回复内容"} 或 {"ok": False, "error": "错误信息"}
        """
        if not self._get_config():
            return {"ok": False, "error": "API Key未配置"}
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False
        }
        
        try:
            response = requests.post(
                DEEPSEEK_API_URL,
                headers=self._build_headers(),
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'choices' in result and len(result['choices']) > 0:
                    content = result['choices'][0]['message']['content']
                    return {"ok": True, "content": content}
                else:
                    return {"ok": False, "error": "API返回格式异常"}
            else:
                error_msg = response.text
                try:
                    error_data = response.json()
                    error_msg = error_data.get('message', error_msg)
                except:
                    pass
                return {"ok": False, "error": f"API请求失败: {error_msg}"}
                
        except requests.exceptions.Timeout:
            return {"ok": False, "error": "API请求超时"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
    
    def chat_stream(self, messages: List[Dict]) -> Generator[str, None, None]:
        """
        流式对话 - 生成器方式
        
        Args:
            messages: 对话消息列表
        
        Yields:
            str: 每次返回一块文本内容
        """
        if not self._get_config():
            yield "[ERROR] API Key未配置"
            return
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True
        }
        
        headers = self._build_headers()
        
        try:
            response = requests.post(
                DEEPSEEK_API_URL,
                headers=headers,
                json=payload,
                stream=True,
                timeout=120
            )
            
            if response.status_code != 200:
                yield f"[ERROR] API请求失败: {response.status_code}"
                return
            
            for line in response.iter_lines():
                if line:
                    line_text = line.decode('utf-8')
                    if line_text.startswith('data:'):
                        data_str = line_text[5:].strip()
                        if data_str and data_str != '[DONE]':
                            try:
                                data = json.loads(data_str)
                                if 'choices' in data and len(data['choices']) > 0:
                                    delta = data['choices'][0].get('delta', {})
                                    content = delta.get('content', '')
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
                                
        except requests.exceptions.Timeout:
            yield "[ERROR] API请求超时"
        except Exception as e:
            yield f"[ERROR] {str(e)}"


def build_recommend_prompt(user_data: Dict) -> str:
    """
    构建推荐书籍的Prompt
    
    Args:
        user_data: 用户数据，包含借阅历史、收藏等
    
    Returns:
        str: 构建好的prompt
    """
    borrowed_books = user_data.get('borrowed_books', [])
    favorite_books = user_data.get('favorite_books', [])
    hobbies = user_data.get('hobbies', [])
    
    prompt = """你是一位专业的图书推荐专家。请根据用户的阅读历史和偏好，推荐3本适合的书籍。

要求：
1. 每本书包含：书名、作者、简短推荐理由
2. 推荐理由只需说明书籍的亮点和适合阅读的人群，不要提及用户的借阅历史或收藏记录
3. 书籍类型要多样化
4. 请严格按照JSON格式返回，不要有其他内容

返回格式示例：
{
  "books": [
    {"title": "书名1", "author": "作者1", "reason": "推荐理由1", "genre": "类型1"},
    {"title": "书名2", "author": "作者2", "reason": "推荐理由2", "genre": "类型2"},
    {"title": "书名3", "author": "作者3", "reason": "推荐理由3", "genre": "类型3"}
  ]
}

用户信息：
"""
    
    if borrowed_books:
        book_titles = [b.get('title', '') for b in borrowed_books[:10] if b.get('title')]
        if book_titles:
            prompt += f"\n- 借阅过的书籍：{', '.join(book_titles)}"
    
    if favorite_books:
        fav_titles = [b.get('title', '') for b in favorite_books[:10] if b.get('title')]
        if fav_titles:
            prompt += f"\n- 收藏的书籍：{', '.join(fav_titles)}"
    
    if hobbies:
        prompt += f"\n- 阅读偏好：{', '.join(hobbies)}"
    
    prompt += "\n\n请推荐3本书："
    
    return prompt


def parse_recommend_response(response_text: str) -> List[Dict]:
    """
    解析AI推荐响应，提取书籍列表
    
    Args:
        response_text: AI返回的文本
    
    Returns:
        List[Dict]: 书籍列表
    """
    books = []
    
    try:
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            json_str = response_text[json_start:json_end]
            data = json.loads(json_str)
            books = data.get('books', [])
    except json.JSONDecodeError:
        pass
    
    if not books:
        import re
        title_pattern = r'"title"\s*:\s*"([^"]+)"'
        author_pattern = r'"author"\s*:\s*"([^"]+)"'
        reason_pattern = r'"reason"\s*:\s*"([^"]+)"'
        
        titles = re.findall(title_pattern, response_text)
        authors = re.findall(author_pattern, response_text)
        reasons = re.findall(reason_pattern, response_text)
        
        for i in range(min(len(titles), 3)):
            books.append({
                'title': titles[i],
                'author': authors[i] if i < len(authors) else '未知',
                'reason': reasons[i] if i < len(reasons) else 'AI推荐',
                'genre': ''
            })
    
    return books[:3]


ai_service = AIService()