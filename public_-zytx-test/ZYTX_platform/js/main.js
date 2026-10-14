/*
// 全局变量 ...
let userFavoriteIds = new Set();
// ...

// 工具函数 (fetchJson, initTestUserIfNeeded...)
async function fetchJson(url) { ... }
async function initTestUserIfNeeded() { ... }

// UI 函数 (updateUserUI, createUnifiedBookCard...)
function updateUserUI() { ... }
function createUnifiedBookCard(book) { ... }

// 页面加载函数 (loadHomePopularBooks, loadAllBooks...)
async function loadHomePopularBooks() { ... }
async function loadAllBooks() { ... }
async function loadProfile() { ... }
async function loadBorrowed() { ... }

async function loadFavorites() { ... } 
async function loadNotifications() { ... }

async function loadRecommend() { ... }
async function loadSettings() { ... }

// 事件监听 (Sidebar, Profile Dropdown...)
// ...

// DOMContentLoaded 初始化
document.addEventListener('DOMContentLoaded', async () => {
    await initTestUserIfNeeded();
    updateUserUI(); 
    // ...
    if (title.includes('我的收藏')) {
       loadFavorites(); // 现在这个函数存在了，调用就不会报错了
    }
    // ...
});
*/

// ==========================================
// 1. 全局变量与工具函数 (Global & Utils)
// ==========================================
let userFavoriteIds = new Set();
let currentPage = 1;
let isLoading = false;
let currentFilters = {
    q: '',
    genre: '',
    available: '',
    publish_year: ''
};
let pendingBorrowRequests = new Map(); // book_id -> request_id 映射

// 需要登录才能访问的页面
const PAGES_REQUIRE_LOGIN = [
    '个人资料',
    '我的收藏',
    '借阅历史',
    '正在借阅',
    '偏好设置',
    '通知',
    '阅读统计'
];

// 获取Token
function getToken() {
    return localStorage.getItem('token');
}

// 检查是否已登录
function isLoggedIn() {
    return !!getToken();
}

// 验证 token 是否有效
async function verifyToken() {
    const token = getToken();
    if (!token) return false;
    
    try {
        const res = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return res.ok && data.ok;
    } catch (err) {
        return false;
    }
}

// 检查页面是否需要登录
async function checkPageAuth() {
    const title = document.title || '';
    const needsLogin = PAGES_REQUIRE_LOGIN.some(page => title.includes(page));
    
    if (needsLogin) {
        const isValid = await verifyToken();
        if (!isValid) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            alert('登录已过期，请重新登录');
            window.location.href = '/login.html';
            return false;
        }
    }
    return true;
}

// 通用 Fetch 封装（自动携带Token）
async function fetchJson(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    
    // 如果有Token，添加到请求头
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const res = await fetch(url, {
            ...options,
            headers
        });
        
        // 处理401未授权错误
        if (res.status === 401) {
            const data = await res.json().catch(() => ({}));
            // Token过期或无效，清除登录状态并跳转登录页
            if (data.message && (data.message.includes('过期') || data.message.includes('无效') || data.message.includes('未登录'))) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // 如果不在登录页，则跳转
                if (!window.location.pathname.includes('login.html')) {
                    alert('登录已过期，请重新登录');
                    window.location.href = '/login.html';
                }
            }
            return { res, data };
        }
        
        const data = await res.json();
        return { res, data };
    } catch (err) {
        console.error('fetch error', err);
        return { res: null, data: null };
    }
}

// POST请求封装
async function postJson(url, body = {}) {
    return fetchJson(url, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

// 初始化测试用户
async function initTestUserIfNeeded() {
    if (localStorage.getItem('user')) return;
    // 生产环境应移除此功能
    console.warn('测试用户初始化已禁用，请手动登录');
}

// 加载管理员信息到下拉栏（管理页面共用）
function loadAdminInfo() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    const user = JSON.parse(userStr);
    const avatar = document.getElementById('admin-avatar');
    const name = document.getElementById('admin-name');
    const dropdownName = document.getElementById('dropdown-name');
    const dropdownPhone = document.getElementById('dropdown-phone');
    
    if (avatar) avatar.textContent = user.phone ? user.phone.slice(-2) : 'AD';
    if (name) name.textContent = user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '管理员';
    if (dropdownName) dropdownName.textContent = '管理员';
    if (dropdownPhone) dropdownPhone.textContent = user.phone || '';
}

// ==========================================
// 2. UI 更新与渲染逻辑 (UI Logic)
// ==========================================

// 同步用户信息到界面 (右上角头像等)
function updateUserUI() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) return;

    const displayPhone = user.phone || '';
    const displayAvatar = displayPhone ? displayPhone.slice(-2) : 'U';
    const displayName = displayPhone ? displayPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '用户';
    const avatarUrl = user.avatar_url || '';

    const navAvatar = document.getElementById('nav-user-avatar');
    const navName = document.getElementById('nav-user-name');
    const dropdownName = document.getElementById('dropdown-user-name');
    const dropdownPhone = document.getElementById('dropdown-user-phone');

    if (navAvatar) {
        if (avatarUrl) {
            navAvatar.innerHTML = `<img src="${avatarUrl}" alt="头像" onerror="this.style.display='none';this.parentElement.innerText='${displayAvatar}';this.parentElement.style.background='var(--accent-blue)'">`;
            navAvatar.style.background = 'transparent';
        } else {
            navAvatar.innerHTML = displayAvatar;
            navAvatar.style.background = 'var(--accent-blue)';
            navAvatar.style.color = 'white';
        }
    }

    if (navName) navName.textContent = displayName;
    if (dropdownName) dropdownName.textContent = '用户';
    if (dropdownPhone) dropdownPhone.textContent = displayPhone;

    const profileEl = document.getElementById('user-profile');
    if (profileEl && !navAvatar) {
        const avatarEl = profileEl.querySelector('.user-avatar');
        const nameSpan = profileEl.querySelector('span');
        if (avatarEl) {
            if (avatarUrl) {
                avatarEl.innerHTML = `<img src="${avatarUrl}" alt="头像" onerror="this.style.display='none';this.parentElement.innerText='${displayAvatar}';this.parentElement.style.background='var(--accent-blue)'">`;
                avatarEl.style.background = 'transparent';
            } else {
                avatarEl.innerHTML = displayAvatar;
                avatarEl.style.background = 'var(--accent-blue)';
                avatarEl.style.color = 'white';
            }
        }
        if (nameSpan) nameSpan.textContent = displayName;
    }

    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !dropdownName) {
        const nameDiv = dropdown.querySelector('.name');
        const phoneDiv = dropdown.querySelector('.phone');
        if (nameDiv) nameDiv.textContent = '用户';
        if (phoneDiv) phoneDiv.textContent = displayPhone;
    }
    
    checkAndShowAdminEntry();
}

async function checkAndShowAdminEntry() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const res = await fetch('/api/auth/check-admin', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok && data.is_admin) {
            const adminEntry = document.getElementById('admin-entry');
            if (adminEntry) adminEntry.style.display = 'flex';
        }
    } catch (err) {
        console.warn('检查管理员状态失败', err);
    }
}

// 加载用户收藏列表到缓存
async function loadGenres() {
    const select = document.getElementById('genre-select');
    if (!select) return;
    
    try {
        const { res, data } = await fetchJson('/api/genres');
        if (res && data && data.ok) {
            const genres = data.genres || [];
            select.innerHTML = '<option value="">全部类型</option>';
            genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error('加载书籍类型失败', err);
    }
}

async function loadUserFavoritesSet() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) return;
    const userId = user.user_id || user.id;

    try {
        const { res, data } = await fetchJson(`/api/favorites`);
        if (res && res.ok && data && data.ok) {
            const list = data.favorites || [];
            userFavoriteIds = new Set(list.map(item => item.book_id || item.id || item.bookId));
        }
    } catch (err) {
        console.warn('无法加载收藏状态', err);
    }
}

async function updateSidebarBadges() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) return;
    const userId = user.user_id || user.id;

    try {
        const { res: favRes, data: favData } = await fetchJson(`/api/favorites`);
        const favCount = (favRes && favRes.ok && favData && favData.ok) ? (favData.favorites || []).length : 0;

        const { res: borrowedRes, data: borrowedData } = await fetchJson(`/api/borrowed`);
        const borrowedCount = (borrowedRes && borrowedRes.ok && borrowedData && borrowedData.ok) ? (borrowedData.borrowed || []).length : 0;

        const favBadge = document.querySelector('.badge[data-type="favorites"]');
        if (favBadge) favBadge.textContent = favCount;

        const borrowedBadge = document.querySelector('.badge[data-type="borrowed"]');
        if (borrowedBadge) borrowedBadge.textContent = borrowedCount;

    } catch (err) {
        console.warn('更新侧边栏数字失败', err);
    }
}

// 创建统一风格的图书卡片
function createUnifiedBookCard(book) {
    const card = document.createElement('div');
    card.classList.add('book-card');
    
    const bookId = book.book_id || book.id || '';
    card.dataset.bookId = bookId;

    const isFavorited = userFavoriteIds.has(bookId);
    const favBtnClass = isFavorited ? 'action-btn btn-favorite is-favorited' : 'action-btn btn-favorite';
    const favBtnText = isFavorited ? '已收藏' : '收藏';
    const favIconClass = isFavorited ? 'fas fa-heart' : 'far fa-heart';
    const favBtnDisabled = isFavorited ? 'disabled' : '';
    
    // 检查是否有待审核的借阅申请
    const hasPendingRequest = pendingBorrowRequests.has(parseInt(bookId));
    const requestId = hasPendingRequest ? pendingBorrowRequests.get(parseInt(bookId)) : null;

    // 借阅按钮状态
    let borrowBtnClass = 'action-btn btn-borrow';
    let borrowBtnDisabled = '';
    let borrowBtnIcon = 'fas fa-book';
    let borrowBtnText = book.available ? '借阅' : '已借出';
    
    if (hasPendingRequest) {
        borrowBtnClass = 'action-btn btn-borrow btn-pending';
        borrowBtnDisabled = '';
        borrowBtnIcon = 'fas fa-clock';
        borrowBtnText = '审核中';
    } else if (!book.available) {
        borrowBtnDisabled = 'disabled';
    }

    card.innerHTML = `
        <div class="book-cover">
            <img src="${book.cover_url || 'https://picsum.photos/seed/book/400/250'}" 
                 alt="${book.title}"
                 onerror="this.onerror=null; this.src='https://picsum.photos/seed/fallback${book.book_id || Math.floor(Math.random()*10000)}/400/250';">
        </div>
        <div class="book-details">
            <h3 class="book-title">${book.title}</h3>
            <div class="book-meta">${book.author || ''} ${book.isbn ? '| ' + book.isbn : ''}</div>
            <p class="book-description">${book.introduction || '暂无简介'}</p>
            <div class="book-actions">
                <span class="book-status ${book.available ? 'status-available' : 'status-borrowed'}">
                    ${book.available ? '可借阅' : '已借出'}
                </span>
                <button class="${favBtnClass}" ${favBtnDisabled}>
                    <i class="${favIconClass}"></i>
                    <span>${favBtnText}</span>
                </button>
                <button class="${borrowBtnClass}" ${borrowBtnDisabled} data-request-id="${requestId || ''}">
                    <i class="${borrowBtnIcon}"></i>
                    <span>${borrowBtnText}</span>
                </button>
            </div>
        </div>
    `;

    bindUnifiedCardEvents(card);
    return card;
}

// 绑定卡片事件
function bindUnifiedCardEvents(card) {
    const favBtn = card.querySelector('.btn-favorite');
    const borrowBtn = card.querySelector('.btn-borrow');
    const bookId = card.dataset.bookId; 
    
    card.addEventListener('click', function(e) {
        if (e.target.closest('.btn-favorite') || e.target.closest('.btn-borrow') || e.target.closest('.book-actions')) {
            return;
        }
        if (bookId) {
            window.location.href = `book-detail.html?id=${bookId}`;
        }
    });
    
    card.style.cursor = 'pointer';
    
    // 收藏逻辑
    if (favBtn) {
        favBtn.addEventListener('click', async function() {
            if (this.classList.contains('is-favorited') || this.disabled) return;

            const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
            if (!user) { alert('请先登录'); return; }
            const userId = user.user_id || user.id;
            if (!bookId) { alert('未识别到图书ID'); return; }

            try {
                const { res, data: d } = await fetchJson('/api/favorites', { 
                    method: 'POST', 
                    body: JSON.stringify({ book_id: bookId }) 
                });
                
                if (res.ok && d.ok) {
                    const icon = this.querySelector('i');
                    const span = this.querySelector('span');
                    icon.classList.replace('far', 'fas');
                    span.textContent = '已收藏';
                    this.classList.add('is-favorited');
                    this.disabled = true;
                    userFavoriteIds.add(bookId);
                } else if(d.message && d.message.includes('已存在')) {
                    // 已存在也视为成功
                    const icon = this.querySelector('i');
                    const span = this.querySelector('span');
                    icon.classList.replace('far', 'fas');
                    span.textContent = '已收藏';
                    this.classList.add('is-favorited');
                    this.disabled = true;
                } else {
                    alert(d.message || '收藏失败');
                }
            } catch (e) { 
                console.error(e); 
                alert('请求失败'); 
            }
        });
    }

    // 借阅逻辑（改为申请借阅，需管理员审核）
    if (borrowBtn && !borrowBtn.disabled) {
        borrowBtn.addEventListener('click', function() {
            const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
            if (!user) { alert('请先登录'); return; }
            
            // 检查是否是"审核中"状态
            if (this.classList.contains('btn-pending')) {
                // 打开撤销申请弹窗
                const requestId = this.dataset.requestId;
                openCancelRequestModal(bookId, requestId, this);
            } else {
                // 打开借阅申请模态框
                openBorrowModal(bookId, this);
            }
        });
    }
}

// ==========================================
// 借阅申请模态框
// ==========================================
let currentBorrowBookId = null;
let currentBorrowBtn = null;

function createBorrowModal() {
    if (document.getElementById('modal-borrow-request')) return;
    
    const modalHTML = `
        <div id="modal-borrow-request" class="modal-overlay-borrow">
            <div class="modal-box-borrow">
                <div class="modal-header-borrow">
                    <h3><i class="fas fa-book-reader"></i> 借阅申请</h3>
                    <span class="close-modal-borrow">&times;</span>
                </div>
                <div class="modal-body-borrow">
                    <p>借阅书籍需要管理员审核，请仔细阅读以下须知：</p>
                    <div class="borrow-notice">
                        <p><strong>借阅须知：</strong></p>
                        <p>1. 借阅期限为 <strong>30天</strong>，请按时归还。</p>
                        <p>2. 逾期未还将影响您的借阅信用。</p>
                        <p>3. 书籍如有损坏或遗失，需照价赔偿。</p>
                        <p>4. 提交申请后，请等待管理员审核。</p>
                        <p>5. 审核通过后，您将收到通知，请在指定时间前往图书馆取书。</p>
                    </div>
                </div>
                <div class="modal-footer-borrow">
                    <button class="btn-cancel-borrow close-modal-borrow-btn">取消</button>
                    <button id="confirm-borrow-btn" class="btn-confirm-borrow">
                        <i class="fas fa-paper-plane"></i> 提交申请
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 绑定关闭事件
    document.querySelectorAll('.close-modal-borrow, .close-modal-borrow-btn').forEach(el => {
        el.addEventListener('click', closeBorrowModal);
    });
    
    document.getElementById('modal-borrow-request').addEventListener('click', function(e) {
        if (e.target === this) closeBorrowModal();
    });
    
    // 绑定确认按钮
    document.getElementById('confirm-borrow-btn').addEventListener('click', submitBorrowRequest);
}

function openBorrowModal(bookId, btn) {
    createBorrowModal();
    currentBorrowBookId = bookId;
    currentBorrowBtn = btn;
    
    const modal = document.getElementById('modal-borrow-request');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeBorrowModal() {
    const modal = document.getElementById('modal-borrow-request');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    
    const confirmBtn = document.getElementById('confirm-borrow-btn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 提交申请';
        confirmBtn.disabled = false;
    }
    
    currentBorrowBookId = null;
    currentBorrowBtn = null;
}

async function submitBorrowRequest() {
    if (!currentBorrowBookId || !currentBorrowBtn) return;
    
    // 检查是否登录
    if (!isLoggedIn()) {
        alert('请先登录');
        closeBorrowModal();
        return;
    }
    
    const confirmBtn = document.getElementById('confirm-borrow-btn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
    confirmBtn.disabled = true;
    
    try {
        const { res, data: d } = await postJson('/api/borrow/request', { book_id: currentBorrowBookId });
        
        if (res && res.ok && d.ok) {
            const requestId = d.request_id;
            
            // 更新 pendingBorrowRequests 映射
            pendingBorrowRequests.set(parseInt(currentBorrowBookId), requestId);
            
            // 更新按钮状态
            currentBorrowBtn.classList.add('btn-pending');
            currentBorrowBtn.innerHTML = '<i class="fas fa-clock"></i><span>审核中</span>';
            currentBorrowBtn.dataset.requestId = requestId;
            
            closeBorrowModal();
            
            // 显示成功提示
            showToast('借阅申请已提交，请等待管理员审核');
        } else {
            alert(d.message || '申请失败');
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert('请求失败');
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

function showToast(message, isError = false) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${isError ? '#EF4444' : '#10B981'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
            font-size: 14px;
        `;
        document.body.appendChild(toast);
    }
    
    toast.style.background = isError ? '#EF4444' : '#10B981';
    toast.textContent = message;
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// ==========================================
// 加载待审核借阅申请
// ==========================================
async function loadPendingBorrowRequests() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) return;
    
    const userId = user.user_id || user.id;
    
    try {
        const { res, data } = await fetchJson('/api/borrow/pending-books');
        
        if (res && res.ok && data && data.ok) {
            pendingBorrowRequests = new Map(Object.entries(data.pending_books || {}).map(([k, v]) => [parseInt(k), v]));
        }
    } catch (e) {
        console.warn('加载待审核申请失败', e);
    }
}

// ==========================================
// 撤销申请模态框
// ==========================================
let currentCancelRequestId = null;
let currentCancelBookId = null;
let currentCancelBtn = null;

function createCancelRequestModal() {
    if (document.getElementById('modal-cancel-request')) return;
    
    const modalHTML = `
        <div id="modal-cancel-request" class="modal-overlay-borrow">
            <div class="modal-box-borrow">
                <div class="modal-header-borrow">
                    <h3><i class="fas fa-hourglass-half"></i> 借阅申请审核中</h3>
                    <span class="close-modal-cancel">&times;</span>
                </div>
                <div class="modal-body-borrow">
                    <p>您的借阅申请正在审核中，请耐心等待管理员处理。</p>
                    <div class="borrow-notice" style="background: #FEF3C7; border-color: #FCD34D;">
                        <p><strong>申请状态：</strong></p>
                        <p>当前状态：<span style="color: #D97706; font-weight: 600;">待审核</span></p>
                        <p>审核通过后，您将收到通知，请在指定时间前往图书馆取书。</p>
                    </div>
                </div>
                <div class="modal-footer-borrow">
                    <button class="btn-cancel-borrow close-modal-cancel-btn">关闭</button>
                    <button id="confirm-cancel-request-btn" class="btn-confirm-borrow" style="background: var(--error-red);">
                        <i class="fas fa-times"></i> 撤销申请
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.querySelectorAll('.close-modal-cancel, .close-modal-cancel-btn').forEach(el => {
        el.addEventListener('click', closeCancelRequestModal);
    });
    
    document.getElementById('modal-cancel-request').addEventListener('click', function(e) {
        if (e.target === this) closeCancelRequestModal();
    });
    
    document.getElementById('confirm-cancel-request-btn').addEventListener('click', submitCancelRequest);
}

function openCancelRequestModal(bookId, requestId, btn) {
    createCancelRequestModal();
    currentCancelBookId = bookId;
    currentCancelRequestId = requestId;
    currentCancelBtn = btn;
    
    const modal = document.getElementById('modal-cancel-request');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeCancelRequestModal() {
    const modal = document.getElementById('modal-cancel-request');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    
    const confirmBtn = document.getElementById('confirm-cancel-request-btn');
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-times"></i> 撤销申请';
        confirmBtn.disabled = false;
    }
    
    currentCancelRequestId = null;
    currentCancelBookId = null;
    currentCancelBtn = null;
}

async function submitCancelRequest() {
    if (!currentCancelRequestId) return;
    
    const confirmBtn = document.getElementById('confirm-cancel-request-btn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 撤销中...';
    confirmBtn.disabled = true;
    
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) {
        alert('请先登录');
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        return;
    }
    
    try {
        const res = await fetch(`/api/borrow/requests/${currentCancelRequestId}/cancel`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: user.user_id || user.id })
        });
        const data = await res.json();
        
        if (res.ok && data.ok) {
            // 更新按钮状态
            if (currentCancelBtn) {
                currentCancelBtn.classList.remove('btn-pending');
                currentCancelBtn.innerHTML = '<i class="fas fa-book"></i><span>借阅</span>';
                currentCancelBtn.dataset.requestId = '';
            }
            
            // 从待审核列表中移除
            pendingBorrowRequests.delete(parseInt(currentCancelBookId));
            
            closeCancelRequestModal();
            showToast('申请已撤销');
        } else {
            alert(data.message || '撤销失败');
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert('请求失败');
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

// 渲染图书列表
function renderBooks(container, books) {
    if (!container) return;
    container.innerHTML = '';
    books.forEach(book => {
        const card = createUnifiedBookCard(book);
        container.appendChild(card);
    });
}

// ==========================================
// 3. 页面特定加载函数 (Page Specific Loaders)
// ==========================================

// 首页：热门图书
async function loadHomePopularBooks() {
    const container = document.getElementById('home-popular-books');
    if (!container) return;
    
    try {
        const { res, data } = await fetchJson('/api/popular');
        if (res && data && data.ok) {
            const top8Books = (data.books || []).slice(0, 8);
            container.innerHTML = '';
            if (top8Books.length === 0) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 2rem;">暂无热门借阅数据</div>';
            } else {
                top8Books.forEach(book => {
                    const card = createUnifiedBookCard(book);
                    container.appendChild(card);
                });
            }
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">加载失败</div>';
    }
}

// 搜索结果加载函数
async function loadSearchResults(filters = {}, page = 1, append = false) {
    const container = document.getElementById('search-results-container');
    const loadMoreBtn = document.getElementById('load-more-search');
    if (!container) return;

    if (!append && page === 1) {
        isLoading = false;
    }
    
    if (isLoading) return;
    isLoading = true;
    
    if (!append) {
        container.innerHTML = `
            <div class="loading-indicator" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--accent-blue);"></i>
                <p style="margin-top: 1rem; color: #666;">正在搜索...</p>
            </div>
        `;
    }
    
    if (loadMoreBtn) {
        loadMoreBtn.textContent = '加载中...';
        loadMoreBtn.disabled = true;
    }

    try {
        const params = new URLSearchParams({ page: page.toString(), page_size: '20' });
        if (filters.q) params.set('q', filters.q);
        if (filters.genre) params.set('genre', filters.genre);
        if (filters.available) params.set('available', filters.available);
        if (filters.publish_year) params.set('publish_year', filters.publish_year);
        
        const { res, data } = await fetchJson(`/api/books?${params}`);
        
        if (!res) {
            container.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem;"></i>
                    <p style="margin-top: 1rem;">网络请求失败，请检查网络连接</p>
                </div>
            `;
            return;
        }
        
        if (!data || !data.ok) {
            container.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                    <p style="margin-top: 1rem;">${data?.message || '搜索失败，请稍后重试'}</p>
                </div>
            `;
            return;
        }
        
        const books = data.books || [];
        
        if (!append) container.innerHTML = '';
        
        if (books.length === 0 && !append) {
            const searchTerm = filters.q || '';
            container.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-search" style="font-size: 3rem; color: #ccc;"></i>
                    <p style="margin-top: 1rem; color: #888; font-size: 1.1rem;">
                        未找到${searchTerm ? `与"${searchTerm}"相关` : '符合条件'}的图书
                    </p>
                    <p style="color: #aaa; margin-top: 0.5rem;">请尝试其他关键词或筛选条件</p>
                </div>
            `;
        } else {
            books.forEach(book => {
                const card = createUnifiedBookCard(book);
                container.appendChild(card);
            });
        }
        
        if (loadMoreBtn) {
            if (books.length < 20 || (data.pagination && data.pagination.page >= data.pagination.pages)) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.textContent = '加载更多';
                loadMoreBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #e74c3c;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem;"></i>
                <p style="margin-top: 1rem;">发生错误，请稍后重试</p>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}

// 首页：全部图书（支持多条件过滤）
async function loadAllBooks(filters = {}, page = 1, append = false) {
    const container = document.getElementById('all-books-container');
    const loadMoreBtn = document.getElementById('load-more-books');
    if (!container) return;

    // 新搜索时重置 isLoading，允许打断旧请求
    if (!append && page === 1) {
        isLoading = false;
    }
    
    if (isLoading) return;
    isLoading = true;
    
    // 显示 loading 状态
    if (!append) {
        container.innerHTML = `
            <div class="loading-indicator" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--accent-blue);"></i>
                <p style="margin-top: 1rem; color: #666;">正在搜索...</p>
            </div>
        `;
    }
    
    if (loadMoreBtn) {
        loadMoreBtn.textContent = '加载中...';
        loadMoreBtn.disabled = true;
    }

    try {
        const params = new URLSearchParams({ page: page.toString(), page_size: '20' });
        if (filters.q) params.set('q', filters.q);
        if (filters.genre) params.set('genre', filters.genre);
        if (filters.available) params.set('available', filters.available);
        if (filters.publish_year) params.set('publish_year', filters.publish_year);
        
        const { res, data } = await fetchJson(`/api/books?${params}`);
        
        // 错误处理
        if (!res) {
            container.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem;"></i>
                    <p style="margin-top: 1rem;">网络请求失败，请检查网络连接</p>
                </div>
            `;
            return;
        }
        
        if (!data || !data.ok) {
            container.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                    <p style="margin-top: 1rem;">${data?.message || '搜索失败，请稍后重试'}</p>
                </div>
            `;
            return;
        }
        
        const books = data.books || [];
        
        if (!append) container.innerHTML = '';
        
        if (books.length === 0 && !append) {
            const searchTerm = filters.q || '';
            container.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-search" style="font-size: 3rem; color: #ccc;"></i>
                    <p style="margin-top: 1rem; color: #888; font-size: 1.1rem;">
                        未找到${searchTerm ? `与"${searchTerm}"相关` : '符合条件'}的图书
                    </p>
                    <p style="color: #aaa; margin-top: 0.5rem;">请尝试其他关键词或筛选条件</p>
                </div>
            `;
        } else {
            books.forEach(book => {
                const card = createUnifiedBookCard(book);
                container.appendChild(card);
            });
        }
        
        if (loadMoreBtn) {
            if (books.length < 20 || (data.pagination && data.pagination.page >= data.pagination.pages)) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.textContent = '加载更多';
                loadMoreBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #e74c3c;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem;"></i>
                <p style="margin-top: 1rem;">发生错误，请稍后重试</p>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}

// 首页：初始化搜索和过滤器
function initInfiniteScroll() {
    const loadMoreBtn = document.getElementById('load-more-books');
    const searchInput = document.getElementById('all-books-search');
    const searchBtn = document.getElementById('all-books-search-btn');
    const genreSelect = document.getElementById('genre-select');
    const statusSelect = document.getElementById('status-select');
    const timeSelect = document.getElementById('publish-time-select');

    // 收集所有过滤条件
    function collectFilters() {
        return {
            q: searchInput?.value.trim() || '',
            genre: genreSelect?.value || '',
            available: statusSelect?.value || '',
            publish_year: timeSelect?.value || ''
        };
    }

    // 判断是否有搜索/筛选条件
    function hasActiveFilters(filters) {
        return filters.q || filters.genre || filters.available || filters.publish_year;
    }

    // 切换显示模式：首页模式 vs 搜索结果模式
    function toggleSearchMode(isSearchMode, searchTerm) {
        const popularSection = document.getElementById('popular-section');
        const allBooksSection = document.getElementById('all-books-section');
        const searchResultsSection = document.getElementById('search-results-section');
        const searchResultsTitle = document.getElementById('search-results-title');

        if (isSearchMode) {
            if (popularSection) popularSection.style.display = 'none';
            if (allBooksSection) allBooksSection.style.display = 'none';
            if (searchResultsSection) searchResultsSection.style.display = 'block';
            if (searchResultsTitle) {
                searchResultsTitle.textContent = searchTerm ? `搜索"${searchTerm}"的结果` : '筛选结果';
            }
        } else {
            if (popularSection) popularSection.style.display = 'block';
            if (allBooksSection) allBooksSection.style.display = 'block';
            if (searchResultsSection) searchResultsSection.style.display = 'none';
        }
    }

    // 应用过滤条件
    function applyFilters() {
        currentFilters = collectFilters();
        currentPage = 1;
        
        const isSearchMode = hasActiveFilters(currentFilters);
        toggleSearchMode(isSearchMode, currentFilters.q);
        
        if (isSearchMode) {
            loadSearchResults(currentFilters, currentPage, false);
        } else {
            loadAllBooks(currentFilters, currentPage, false);
        }
    }

    // 清除搜索
    function clearSearch() {
        if (searchInput) searchInput.value = '';
        if (genreSelect) genreSelect.value = '';
        if (statusSelect) statusSelect.value = '';
        if (timeSelect) timeSelect.value = '';
        currentFilters = { q: '', genre: '', available: '', publish_year: '' };
        currentPage = 1;
        toggleSearchMode(false);
        loadAllBooks(currentFilters, currentPage, false);
    }

    // 加载更多（首页全部馆藏）
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++;
            loadAllBooks(currentFilters, currentPage, true);
        });
    }

    // 加载更多（搜索结果）
    const loadMoreSearchBtn = document.getElementById('load-more-search');
    if (loadMoreSearchBtn) {
        loadMoreSearchBtn.addEventListener('click', () => {
            currentPage++;
            loadSearchResults(currentFilters, currentPage, true);
        });
    }

    // 清除搜索按钮
    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }

    // 搜索按钮点击
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }

    // 搜索框回车
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    }

    // 下拉过滤器变化时实时过滤
    [genreSelect, statusSelect, timeSelect].forEach(select => {
        if (select) {
            select.addEventListener('change', applyFilters);
        }
    });
}

// 个人资料页
async function loadProfile() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) return;
    const userId = user.user_id || user.id;
    
    const { res, data } = await fetchJson(`/api/profile/${userId}`);
    if (res && data && (data.ok || data.profile)) {
        const u = data.profile || data.data || data.user || {};
        
        const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
        
        setTxt('profile-phone', u.phone || '');
        setTxt('profile-phone-2', u.phone || '');
        setTxt('profile-registered', u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '');
        setTxt('profile-status', u.status === 'active' ? '正常' : (u.status === 'suspended' ? '已停用' : '已删除'));
        setTxt('profile-school', u.school || '未设置');
        
        const prefsEl = document.getElementById('profile-preferences');
        if (prefsEl) {
            let hobbies = u.hobbies;
            if (typeof hobbies === 'string') { try { hobbies = JSON.parse(hobbies); } catch(e){} }
            prefsEl.textContent = Array.isArray(hobbies) && hobbies.length > 0 ? hobbies.join('、') : '未设置';
        }

        const avatar = document.getElementById('profile-avatar');
        if (avatar) {
            const url = u.avatar_url || u.avatar || '';
            if (avatar.tagName === 'IMG') avatar.src = url;
            else if (url) {
                avatar.innerHTML = `<img src="${url}" alt="头像" onerror="this.parentElement.innerText='${(u.phone || 'U').charAt(0)}'">`;
            } else {
                avatar.innerText = (u.phone || 'U').charAt(0).toUpperCase();
            }
        }
        
        // 渲染最近收藏
        renderProfileFavorites(u.recent_favorites || []);
        
        // 渲染最近活动
        renderProfileActivities(u.recent_activities || []);
    }
}

// 渲染个人资料页的收藏书籍
function renderProfileFavorites(favorites) {
    const container = document.getElementById('profile-favorites-grid');
    if (!container) return;
    
    if (favorites.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 2rem;">暂无收藏书籍</div>';
        return;
    }
    
    container.innerHTML = '';
    favorites.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card small-card';
        card.innerHTML = `
            <div class="book-cover">
                <img src="${book.cover_url}" alt="${book.title}" onerror="this.src='https://picsum.photos/seed/fallback/200/120'">
            </div>
            <h4 class="book-title">${book.title}</h4>
        `;
        container.appendChild(card);
    });
}

// 渲染个人资料页的最近活动
function renderProfileActivities(activities) {
    const container = document.getElementById('profile-activity-list');
    if (!container) return;
    
    if (activities.length === 0) {
        container.innerHTML = '<li style="color: #888;">暂无活动记录</li>';
        return;
    }
    
    container.innerHTML = '';
    activities.forEach(activity => {
        const li = document.createElement('li');
        const timeStr = activity.time ? new Date(activity.time).toLocaleDateString('zh-CN') : '';
        li.innerHTML = `${activity.text} <span style="color: #888;">- ${timeStr}</span>`;
        container.appendChild(li);
    });
}

// 借阅页
async function loadBorrowed() {
    const container = document.getElementById('borrowed-list') || document.getElementById('borrowed-books-grid');
    // 注意：borrowed.html 现在可能用 borrowed.js 控制，这里保留以防万一
    // 如果 borrowed.js 存在，这里的逻辑可能是多余的，但保留无害
}

//收藏页加载逻辑
async function loadFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;
    
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userId = user ? (user.user_id || user.id) : null;
    
    if (!userId) {
        container.innerHTML = '<div style="text-align:center; padding:2rem;">请先登录查看收藏</div>';
        return;
    }

    try {
        // 1. 获取后端数据
        const { res, data } = await fetchJson(`/api/favorites`);
        
        if (res && data && data.ok) {
            const favs = data.favorites || [];
            
            if (favs.length === 0) {
                container.innerHTML = '<div style="text-align:center; color:#888; padding:3rem;">暂无收藏书籍，快去书库看看吧</div>';
                return;
            }

            container.innerHTML = ''; // 清空加载提示
            
            // 2. 渲染列表 (使用 favorites.css 定义的 .fav-item 列表样式)
            favs.forEach(book => {
                const item = document.createElement('div');
                item.className = 'fav-item';
                const bookId = book.book_id || book.id || book.bookId;
                item.dataset.bookId = bookId;

                const cover = book.cover_url || 'https://picsum.photos/seed/book/200/300';
                const title = book.title || '未知书名';
                const author = book.author || '未知作者';
                const isbn = book.isbn || '暂无ISBN';
                const publisher = book.publisher || '未知出版社';
                const year = book.publish_date || book.year || '未知年份';
                const intro = book.introduction || book.description || '暂无简介...';
                const isAvailable = book.available !== false; 

                item.innerHTML = `
                    <div class="fav-cover">
                        <img src="${cover}" alt="${title}">
                    </div>
                    <div class="fav-info">
                        <h3 class="fav-title">${title}</h3>
                        <div class="fav-meta-row"><i class="fas fa-user-edit"></i> ${author}</div>
                        <div class="fav-meta-row"><i class="fas fa-barcode"></i> ${isbn}</div>
                        <div class="fav-meta-row"><i class="fas fa-building"></i> ${publisher}</div>
                        <div class="fav-meta-row"><i class="far fa-calendar-alt"></i> ${year}</div>
                        <div class="fav-meta-row" style="margin-top:0.5rem">
                             <span class="book-status ${isAvailable ? 'status-available' : 'status-borrowed'}">
                                ${isAvailable ? '可借阅' : '已借出'}
                            </span>
                        </div>
                    </div>
                    <div class="fav-intro">
                        <div class="fav-intro-label">内容简介：</div>
                        ${intro}
                    </div>
                    <div class="fav-actions">
                        <button class="fav-btn btn-cancel-fav">
                            <i class="fas fa-heart-broken"></i> 取消收藏
                        </button>
                        <button class="fav-btn btn-borrow-fav" ${!isAvailable ? 'disabled' : ''}>
                            <i class="fas fa-book"></i>
                            <span>${isAvailable ? '借阅' : '暂不可借'}</span>
                        </button>
                    </div>
                `;
                
                container.appendChild(item);

                // 3. 绑定事件
                const cancelBtn = item.querySelector('.btn-cancel-fav');
                const borrowBtn = item.querySelector('.btn-borrow-fav');

                // 取消收藏
                cancelBtn.addEventListener('click', async () => {
                    if (!confirm(`确定要取消收藏《${title}》吗？`)) return;
                    cancelBtn.disabled = true;
                    try {
                        const { res: delRes, data: delData } = await fetchJson('/api/favorites', { 
                            method: 'DELETE', 
                            body: JSON.stringify({ book_id: bookId }) 
                        });
                        if (delRes.ok && delData.ok) {
                            item.style.opacity = '0';
                            setTimeout(() => {
                                item.remove();
                                if (typeof userFavoriteIds !== 'undefined') userFavoriteIds.delete(bookId);
                                if (container.children.length === 0) {
                                    container.innerHTML = '<div style="text-align:center; color:#888; padding:3rem;">暂无收藏书籍</div>';
                                }
                            }, 300);
                        } else {
                            alert(delData.message || '取消失败');
                            cancelBtn.disabled = false;
                        }
                    } catch (e) {
                        console.error(e);
                        alert('网络请求失败');
                        cancelBtn.disabled = false;
                    }
                });

                // 借阅
                borrowBtn.addEventListener('click', async () => {
                    if (borrowBtn.disabled) return;
                    const span = borrowBtn.querySelector('span');
                    const originalText = span.textContent;
                    span.textContent = '...';
                    borrowBtn.disabled = true;
                    try {
                        const { res: bRes, data: bData } = await fetchJson('/api/borrow', { 
                            method: 'POST', 
                            body: JSON.stringify({ book_id: bookId }) 
                        });
                        if (bRes.ok && bData.ok) {
                            span.textContent = '已借阅';
                            borrowBtn.style.background = 'var(--success-green)';
                            const statusEl = item.querySelector('.book-status');
                            if(statusEl) {
                                statusEl.className = 'book-status status-borrowed';
                                statusEl.textContent = '已借出';
                            }
                        } else {
                            alert(bData.message || '借阅失败');
                            span.textContent = originalText;
                            borrowBtn.disabled = false;
                        }
                    } catch (e) {
                        console.error(e);
                        alert('请求失败');
                        span.textContent = originalText;
                        borrowBtn.disabled = false;
                    }
                });
                
                item.style.cursor = 'pointer';
                item.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    window.location.href = `book-detail.html?id=${bookId}`;
                });
            });
        }
    } catch (err) {
        console.error('加载收藏失败', err);
        container.innerHTML = '<div style="text-align:center; color:red; padding:2rem;">加载失败，请检查网络或后端连接</div>';
    }
}

//通知页加载
async function loadNotifications() {
    const container = document.querySelector('.notifications-container') || document.getElementById('notifications-list');
    if (!container) return;
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userId = user ? (user.user_id || user.id) : null;
    if (!userId) return;
    
    try {
        const { res, data } = await fetchJson(`/api/notifications?user_id=${userId}`);
        if (res && data && data.ok) {
            const notes = data.notifications || [];
            container.innerHTML = '';
            notes.forEach(n => {
                const item = document.createElement('div');
                item.classList.add('notification-item');
                if (!n.is_read) item.classList.add('unread');
                item.innerHTML = `
                    <div class="notification-title">${n.title||n.message||''}</div>
                    <div class="notification-meta">${n.date||n.created_at||''}</div>
                    <button class="mark-read-btn">标记已读</button>
                `;
                container.appendChild(item);
            });
            const countEl = document.querySelector('.notification-count');
            if (countEl) countEl.textContent = `共${notes.filter(n=>!n.is_read).length}条未读通知`;
        }
    } catch (err) {
        console.error(err);
    }
}

// 推荐页
async function loadRecommend() {
    const container = document.getElementById('recommend-books');
    if (!container) return;
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userId = user ? (user.user_id || user.id) : null;
    const url = userId ? `/api/recommend?user_id=${userId}` : '/api/recommend';
    
    const { res, data } = await fetchJson(url);
    if (res && data && data.ok) {
        const books = data.recommendations || [];
        container.innerHTML = '';
        books.forEach(book => {
            const card = createUnifiedBookCard(book);
            container.appendChild(card);
        });
    }
}

// 设置页
async function loadSettings() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) return;
    const userId = user.user_id || user.id;
    
    const { res, data } = await fetchJson(`/api/settings?user_id=${userId}`);
    if (res && data && data.ok) {
        const s = data.data || {};
        const emailEl = document.getElementById('settings-email');
        if (emailEl) emailEl.value = s.email || '';
        const phoneEl = document.getElementById('settings-phone');
        if (phoneEl) phoneEl.value = s.phone || user.phone || '';
    }
}

// ==========================================
// 4. 事件监听与初始化 (Initialization)
// ==========================================

// 侧边栏与下拉菜单事件
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('expanded');
    });
}

const userProfile = document.getElementById('user-profile');
const userDropdown = document.getElementById('user-dropdown');
if (userProfile && userDropdown) {
    userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (userDropdown.classList.contains('show') && !userProfile.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });

    userDropdown.addEventListener('click', (e) => {
        const target = e.target.closest('.dropdown-item');
        if (!target) return;
        if (target.querySelector('.fa-sign-out-alt') || /退出/.test(target.textContent)) {
            e.preventDefault();
            localStorage.removeItem('user');
            userDropdown.classList.remove('show');
            window.location.href = '/login.html';
        }
    });
}

// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 先检查页面权限
    const canProceed = await checkPageAuth();
    if (!canProceed) return;
    
    await initTestUserIfNeeded();
    updateUserUI();
    await loadUserFavoritesSet();
    await loadPendingBorrowRequests();
    await updateSidebarBadges();

    // 4. 根据当前页面标题执行不同的加载逻辑
    const title = document.title || '';
    
    if (title.includes('首页') || title.includes('图书馆')) {
        loadGenres();
        loadHomePopularBooks();
        loadAllBooks();
        initInfiniteScroll();
    } else if (title.includes('个人资料')) {
        loadProfile();
    } else if (title.includes('正在借阅')) {
        // borrowed.js 会处理主要逻辑，这里留空或做额外处理
    } else if (title.includes('我的收藏')) {
        if (typeof loadFavorites === 'function') loadFavorites(); 
    } else if (title.includes('通知')) {
        loadNotifications();
    } else if (title.includes('AI推荐')) {
        loadRecommend();
    } else if (title.includes('偏好设置')) {
        loadSettings();
    }
});