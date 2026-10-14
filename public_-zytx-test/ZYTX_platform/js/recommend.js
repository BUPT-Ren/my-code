// AI推荐页面逻辑

// 全局状态（userFavoriteIds 已在 main.js 中声明）
let recommendedBooks = [];
let isSending = false;

// 工具函数
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function getUserId() {
    const user = getUser();
    return user ? (user.user_id || user.id) : null;
}

// ========== 推荐书籍相关 ==========

// 加载用户收藏状态
async function loadUserFavorites() {
    const userId = getUserId();
    if (!userId) return;
    
    try {
        const { res, data } = await fetchJson('/api/favorites');
        if (res && res.ok && data && data.ok) {
            const favorites = data.favorites || [];
            userFavoriteIds = new Set(favorites.map(f => f.book_id || f.id || f.bookId));
        }
    } catch (e) {
        console.warn('加载收藏状态失败', e);
    }
}

// 加载AI推荐书籍
async function loadAIRecommendations() {
    const userId = getUserId();
    const container = document.getElementById('recommend-books-list');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="books-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>AI正在分析...</span>
        </div>
    `;
    
    const timeout = setTimeout(() => {
        container.innerHTML = `
            <div class="no-recommendations">
                <i class="fas fa-clock"></i>
                <p>请求超时</p>
                <p style="font-size: 0.8rem;">AI服务响应较慢，请稍后重试</p>
                <button onclick="loadAIRecommendations()" style="margin-top: 10px; padding: 8px 16px; background: var(--accent-blue); color: white; border: none; border-radius: 6px; cursor: pointer;">重试</button>
            </div>
        `;
    }, 30000);
    
    try {
        const { res, data } = await fetchJson('/api/ai/recommend');
        clearTimeout(timeout);
        
        if (res && res.ok && data && data.ok) {
            recommendedBooks = data.recommendations || [];
            
            if (recommendedBooks.length === 0) {
                container.innerHTML = `
                    <div class="no-recommendations">
                        <i class="fas fa-book"></i>
                        <p>暂无推荐</p>
                        <p style="font-size: 0.8rem;">请先借阅或收藏一些书籍</p>
                    </div>
                `;
                return;
            }
            
            renderBooksList();
        } else {
            container.innerHTML = `
                <div class="no-recommendations">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${data.message || '加载失败'}</p>
                    <button onclick="loadAIRecommendations()" style="margin-top: 10px; padding: 8px 16px; background: var(--accent-blue); color: white; border: none; border-radius: 6px; cursor: pointer;">重试</button>
                </div>
            `;
        }
    } catch (e) {
        clearTimeout(timeout);
        console.error('加载AI推荐失败', e);
        container.innerHTML = `
            <div class="no-recommendations">
                <i class="fas fa-exclamation-circle"></i>
                <p>网络错误</p>
                <button onclick="loadAIRecommendations()" style="margin-top: 10px; padding: 8px 16px; background: var(--accent-blue); color: white; border: none; border-radius: 6px; cursor: pointer;">重试</button>
            </div>
        `;
    }
}

// 渲染书籍列表
function renderBooksList() {
    const container = document.getElementById('recommend-books-list');
    if (!container || recommendedBooks.length === 0) return;
    
    container.innerHTML = '';
    
    recommendedBooks.forEach((book, index) => {
        const isFavorited = book.book_id && userFavoriteIds.has(book.book_id);
        
        const card = document.createElement('div');
        card.className = 'recommend-book-card';
        card.innerHTML = `
            <div class="book-header">
                <div class="book-cover-small">
                    <img src="${book.cover_url || `https://picsum.photos/seed/${hashString(book.title)}/120/170`}" 
                         alt="${book.title}"
                         onerror="this.src='https://picsum.photos/seed/fallback${index}/120/170'">
                </div>
                <div class="book-info-compact">
                    <h4>${book.title}</h4>
                    <div class="author">${book.author || '未知作者'}</div>
                    ${book.genre ? `<span class="genre-tag">${book.genre}</span>` : ''}
                </div>
            </div>
            <div class="book-reason">
                <div class="book-reason-label"><i class="fas fa-lightbulb"></i> 推荐理由</div>
                <div class="book-reason-text">${book.reason || 'AI智能推荐'}</div>
            </div>
            <div class="book-actions-compact">
                <button class="action-btn btn-borrow" ${!book.available ? 'disabled' : ''} data-book-id="${book.book_id || ''}" data-title="${book.title}">
                    <i class="fas fa-book"></i>
                    <span>${book.available ? '借阅' : '不可借'}</span>
                </button>
                <button class="action-btn btn-favorite ${isFavorited ? 'is-favorited' : ''}" ${isFavorited ? 'disabled' : ''} data-book-id="${book.book_id || ''}">
                    <i class="${isFavorited ? 'fas' : 'far'} fa-heart"></i>
                    <span>${isFavorited ? '已收藏' : '收藏'}</span>
                </button>
            </div>
        `;
        
        container.appendChild(card);
        
        // 绑定事件
        const borrowBtn = card.querySelector('.btn-borrow');
        const favoriteBtn = card.querySelector('.btn-favorite');
        
        if (borrowBtn && !borrowBtn.disabled) {
            borrowBtn.addEventListener('click', () => handleBorrow(book, borrowBtn));
        }
        
        if (favoriteBtn && !favoriteBtn.disabled) {
            favoriteBtn.addEventListener('click', () => handleFavorite(book, favoriteBtn));
        }
    });
}

// 借阅处理
async function handleBorrow(book, btn) {
    const userId = getUserId();
    
    if (!userId) {
        alert('请先登录');
        return;
    }
    
    const span = btn.querySelector('span');
    const originalText = span.textContent;
    span.textContent = '借阅中...';
    btn.disabled = true;
    
    try {
        const body = book.book_id 
            ? { book_id: book.book_id }
            : { book_title: book.title };
            
        const { res, data } = await fetchJson('/api/borrow', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        
        if (res && res.ok && data && data.ok) {
            span.textContent = '已借阅';
            btn.style.background = '#38A169';
            book.available = false;
        } else {
            alert(data.message || '借阅失败');
            span.textContent = originalText;
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert('请求失败');
        span.textContent = originalText;
        btn.disabled = false;
    }
}

// 收藏处理
async function handleFavorite(book, btn) {
    const userId = getUserId();
    
    if (!userId) {
        alert('请先登录');
        return;
    }
    
    if (!book.book_id) {
        alert('该书籍暂未入库，无法收藏');
        return;
    }
    
    try {
        const { res, data } = await fetchJson('/api/favorites', {
            method: 'POST',
            body: JSON.stringify({ book_id: book.book_id })
        });
        
        if (res && res.ok && data && data.ok) {
            const icon = btn.querySelector('i');
            const span = btn.querySelector('span');
            icon.className = 'fas fa-heart';
            span.textContent = '已收藏';
            btn.classList.add('is-favorited');
            btn.disabled = true;
            userFavoriteIds.add(book.book_id);
        } else {
            alert(data.message || '收藏失败');
        }
    } catch (e) {
        console.error(e);
        alert('请求失败');
    }
}

// 字符串哈希
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash) % 10000;
}

// ========== AI 对话相关 ==========

// 加载聊天历史
async function loadChatHistory() {
    const container = document.getElementById('chat-messages');
    
    if (!container) return;
    
    try {
        const { res, data } = await fetchJson('/api/ai/history');
        
        if (res && res.ok && data && data.ok && data.history && data.history.length > 0) {
            container.innerHTML = '';
            data.history.forEach(msg => {
                appendMessage(msg.role, msg.content, false);
            });
            scrollToBottom();
        }
    } catch (e) {
        console.warn('加载聊天历史失败', e);
    }
}

// 添加消息到界面
function appendMessage(role, content, scroll = true) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const user = getUser();
    const userInitial = user ? (user.phone || 'U').charAt(0).toUpperCase() : 'U';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${role === 'assistant' ? '<i class="fas fa-robot"></i>' : userInitial}
        </div>
        <div class="message-content">${formatContent(content)}</div>
    `;
    
    container.appendChild(messageDiv);
    
    if (scroll) {
        scrollToBottom();
    }
}

// 格式化消息内容
function formatContent(content) {
    return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// 滚动到底部
function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// 显示打字指示器
function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    container.appendChild(typingDiv);
    scrollToBottom();
}

// 移除打字指示器
function removeTypingIndicator() {
    const typing = document.getElementById('typing-indicator');
    if (typing) {
        typing.remove();
    }
}

// 发送消息
async function sendMessage(message) {
    const userId = getUserId();
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (!userId) {
        alert('请先登录');
        return;
    }
    
    if (!message || !message.trim() || isSending) return;
    
    isSending = true;
    input.value = '';
    sendBtn.disabled = true;
    
    appendMessage('user', message.trim());
    showTypingIndicator();
    
    try {
        const { res, data } = await fetchJson('/api/ai/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: message.trim(),
                stream: false
            })
        });
        
        removeTypingIndicator();
        
        if (res && res.ok && data && data.ok) {
            appendMessage('assistant', data.content);
        } else {
            appendMessage('assistant', `抱歉，出现了一些问题：${data.message || '请稍后重试'}`);
        }
    } catch (e) {
        console.error(e);
        removeTypingIndicator();
        appendMessage('assistant', '抱歉，网络连接出现问题，请稍后重试');
    } finally {
        isSending = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

// 清空聊天历史
async function clearChatHistory() {
    const userId = getUserId();
    
    if (!userId) return;
    
    if (!confirm('确定要清空所有聊天记录吗？')) return;
    
    try {
        const { res, data } = await fetchJson('/api/ai/history/clear', {
            method: 'POST'
        });
        
        if (res && res.ok && data && data.ok) {
            const container = document.getElementById('chat-messages');
            if (container) {
                container.innerHTML = `
                    <div class="message assistant">
                        <div class="message-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="message-content">
                            <p>聊天记录已清空。有什么想聊的吗？</p>
                        </div>
                    </div>
                `;
            }
        } else {
            alert(data.message || '清空失败');
        }
    } catch (e) {
        console.error(e);
        alert('请求失败');
    }
}

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', async () => {
    // 加载收藏状态
    await loadUserFavorites();
    
    // 加载AI推荐
    await loadAIRecommendations();
    
    // 加载聊天历史
    await loadChatHistory();
    
    // 绑定刷新按钮
    const refreshBtn = document.getElementById('refresh-recommend');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('loading');
            await loadAIRecommendations();
            refreshBtn.classList.remove('loading');
        });
    }
    
    // 绑定发送按钮
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const message = chatInput.value.trim();
            if (message) {
                sendMessage(message);
            }
        });
    }
    
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = chatInput.value.trim();
                if (message) {
                    sendMessage(message);
                }
            }
        });
    }
    
    // 绑定快捷按钮
    const quickBtns = document.querySelectorAll('.quick-btn');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const msg = btn.dataset.msg;
            if (msg) {
                sendMessage(msg);
            }
        });
    });
    
    // 绑定清空按钮
    const clearBtn = document.getElementById('clear-chat');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearChatHistory);
    }
});