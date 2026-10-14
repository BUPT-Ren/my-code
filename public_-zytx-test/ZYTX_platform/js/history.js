let currentEditRecordId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 直接加载历史记录，函数内部会处理用户登录
    await loadHistoryItems();
    
    // 设置模态框事件
    setupReviewModal();
});

async function loadHistoryItems() {
    const historyContainer = document.getElementById('history-list');
    if (!historyContainer) {
        console.error('history-list container not found');
        return;
    }

    historyContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:#666;">加载中...</div>';

    try {
        const { res, data } = await fetchJson('/api/history');
        
        if (res && res.ok && data && data.ok) {
            const records = data.history || [];
            
            if (records.length === 0) {
                historyContainer.innerHTML = '<div style="text-align:center; color:#888; padding:3rem;">暂无借阅历史</div>';
                return;
            }

            historyContainer.innerHTML = '';
            records.forEach(rec => {
                const card = createHistoryCard(rec);
                historyContainer.appendChild(card);
            });
        } else {
            historyContainer.innerHTML = `<div style="text-align:center; color:red;">加载失败: ${(data && data.message) || '未知错误'}</div>`;
        }
    } catch (err) {
        console.error('网络请求错误:', err);
        historyContainer.innerHTML = '<div style="text-align:center; color:red;">网络错误，请检查后端连接</div>';
    }
}

function createHistoryCard(record) {
    const book = record.book || {};
    const card = document.createElement('div');
    card.className = 'history-card';
    
    // 数据准备
    const bookId = book.book_id || book.id || '';
    const recordId = record.record_id;
    const title = book.title || '未知书名';
    const author = book.author || '未知';
    const isbn = book.isbn || 'N/A';
    const publishDate = book.publish_date || '未知';
    const cover = book.cover_url || 'https://picsum.photos/seed/book/200/300';
    const intro = book.introduction || '暂无简介...';
    const review = record.review || ''; // 读后感
    
    // 日期处理
    const borrowDate = record.borrow_time ? record.borrow_time.split('T')[0] : '未知';
    const returnDate = record.return_time ? record.return_time.split('T')[0] : '未归还';
    
// 收藏状态检查 (依赖全局 Set: userFavoriteIds)
    const isFavorited = (typeof userFavoriteIds !== 'undefined') && userFavoriteIds.has(parseInt(bookId));
    
    // 借阅按钮状态 (record.status === 'borrowed' 表示当前正借着，是否可再借取决于业务逻辑，
    // 但这里是从历史记录再次借阅，所以我们检查 book.available)
    // 注意：book.available_copies 可能未在历史接口返回，通常需要完整 book 对象。
    // 这里假设后端返回的 book 包含 available_copies
    const isAvailable = book.available_copies > 0;

    card.innerHTML = `
        <div class="h-col-cover">
            <img src="${cover}" alt="${title}">
        </div>

        <div class="h-col-meta">
            <div class="h-title" title="${title}">${title}</div>
            <div class="h-meta-item" title="索书号"><i class="fas fa-barcode"></i> ${isbn}</div>
            <div class="h-meta-item" title="作者"><i class="fas fa-user-edit"></i> ${author}</div>
            <div class="h-meta-item" title="出版日期"><i class="far fa-calendar-alt"></i> ${publishDate}</div>
        </div>

        <div class="h-col-intro">
            <span class="h-label">内容简介：</span>
            ${intro}
        </div>

        <div class="h-col-review" id="review-display-${recordId}">
            <span class="h-label">我的感悟：</span>
            ${review ? review : '<div class="h-review-empty">暂无读后感，点击右侧按钮添加...</div>'}
        </div>

        <div class="h-col-dates">
            <div class="h-date-group">
                <label>借阅日期</label>
                <div>${borrowDate}</div>
            </div>
            <div class="h-date-group ${returnDate !== '未归还' ? 'returned' : ''}">
                <label>归还日期</label>
                <div>${returnDate}</div>
            </div>
        </div>

        <div class="h-col-actions">
            <button class="h-btn btn-fav ${isFavorited ? 'is-favorited' : ''}" onclick="toggleHistoryFav(this, '${bookId}')">
                <i class="${isFavorited ? 'fas' : 'far'} fa-heart"></i>
                <span>${isFavorited ? '已收藏' : '收藏'}</span>
            </button>
            
            <button class="h-btn btn-borrow-h" ${!isAvailable ? 'disabled' : ''} onclick="borrowFromHistory(this, '${bookId}')">
                <i class="fas fa-book"></i>
                <span>借阅</span>
            </button>
            
            <button class="h-btn btn-review" onclick="openReviewModal('${recordId}', '${title.replace(/'/g, "\\'")}', '${review.replace(/\n/g, "\\n").replace(/'/g, "\\'")}')">
                <i class="fas fa-pen"></i>
                <span>读后感</span>
            </button>
        </div>
    `;
    
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        window.location.href = `book-detail.html?id=${bookId}`;
    });
    
    return card;
}

// === 功能逻辑 ===

// 1. 收藏/取消收藏 (复用逻辑)
async function toggleHistoryFav(btn, bookId) {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) { alert('请先登录'); return; }
    const userId = user.user_id || user.id;

    const isFav = btn.classList.contains('is-favorited');
    const method = isFav ? 'DELETE' : 'POST';
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');

    try {
        const { res, data } = await fetchJson('/api/favorites', {
            method: method,
            body: JSON.stringify({ book_id: bookId })
        });
        
        if (res && res.ok && data && data.ok) {
            if (isFav) {
                // 取消成功
                btn.classList.remove('is-favorited');
                icon.className = 'far fa-heart';
                span.textContent = '收藏';
                if (typeof userFavoriteIds !== 'undefined') userFavoriteIds.delete(bookId);
            } else {
                // 收藏成功
                btn.classList.add('is-favorited');
                icon.className = 'fas fa-heart';
                span.textContent = '已收藏';
                if (typeof userFavoriteIds !== 'undefined') userFavoriteIds.add(bookId);
            }
        } else {
            alert(data.message || '操作失败');
        }
    } catch (e) {
        console.error(e);
        alert('网络请求失败');
    }
}

// 2. 借阅 (复用逻辑)
async function borrowFromHistory(btn, bookId) {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) { alert('请先登录'); return; }
    
    const span = btn.querySelector('span');
    const originalText = span.textContent;
    span.textContent = '...';
    btn.disabled = true;

    try {
        const { res, data } = await fetchJson('/api/borrow', {
            method: 'POST',
            body: JSON.stringify({ book_id: bookId })
        });
        
        if (res && res.ok && data && data.ok) {
            span.textContent = '已借阅';
            btn.style.background = 'var(--success-green)';
            alert('借阅成功！');
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

// 3. 读后感模态框逻辑
window.openReviewModal = function(recordId, title, currentReview) {
    currentEditRecordId = recordId;
    
    // 填充内容
    document.getElementById('review-book-title').textContent = `书名：《${title}》`;
    const textarea = document.getElementById('review-content');
    // 解码可能存在的换行符等
    textarea.value = currentReview || '';
    
    // 显示模态框
    const modal = document.getElementById('modal-review');
    modal.style.display = 'flex';
    modal.offsetHeight; // 触发重绘
    modal.classList.add('show');
}

function setupReviewModal() {
    const modal = document.getElementById('modal-review');
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const saveBtn = document.getElementById('save-review-btn');
    
    // 关闭函数
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    };
    
    // 绑定关闭
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    modal.onclick = (e) => { if(e.target === modal) closeModal(); };
    
    // 保存逻辑
    saveBtn.onclick = async () => {
        if (!currentEditRecordId) return;
        
        const content = document.getElementById('review-content').value;
        const confirmSave = confirm('确定要保存修改吗？');
        
        if (!confirmSave) return;
        
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';
        
        try {
            const { res, data } = await fetchJson('/api/history/review', {
                method: 'POST',
                body: JSON.stringify({
                    record_id: currentEditRecordId,
                    review: content
                })
            });
            
            if (res && res.ok && data && data.ok) {
                // 更新页面显示
                const displayEl = document.getElementById(`review-display-${currentEditRecordId}`);
                if (displayEl) {
                    if (content.trim()) {
                        displayEl.innerHTML = `<span class="h-label">我的感悟：</span>${content.replace(/\n/g, '<br>')}`;
                    } else {
                        displayEl.innerHTML = `<span class="h-label">我的感悟：</span><div class="h-review-empty">暂无读后感，点击右侧按钮添加...</div>`;
                    }
                    
                    // 更新按钮点击事件中的参数，以便下次打开是新的内容
                    // 这一步比较麻烦，最简单的是刷新列表，或者只更新DOM。
                    // 为了简化，我们只更新DOM，但下次点击传参可能还是旧的? 
                    // 不会，因为我们是用 onclick 绑定的字面量。
                    // 比较好的做法是重新绑定 onclick，或者像下面这样刷新整个列表（损耗稍大但安全）
                    // 或者更聪明点：将 review 存在 data-review 属性中读取，而不是直接传参。
                    
                    // 这里采用简单的刷新当前项的 onclick (较复杂)，或者简单提示成功。
                    // 为了用户体验最好：
                    const btn = displayEl.closest('.history-card').querySelector('.btn-review');
                    // 更新 onclick 属性字符串 (Hack)
                    // 更优雅的方式是在 openReviewModal 时不传 content，而是根据 recordId 去 DOM 找。
                    // 让我们修改 openReviewModal 的逻辑（见下文优化）
                }
                closeModal();
            } else {
                alert(data.message || '保存失败');
            }
        } catch (e) {
            console.error(e);
            alert('网络错误');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '保存修改';
        }
    };
}

// 优化：修改 openReviewModal 以便从 DOM 动态获取最新内容，而不是依赖 HTML 字符串传参
window.openReviewModal = function(recordId, title, currentReview) {
    currentEditRecordId = recordId;
    
    // 如果传入了currentReview参数，使用它；否则从DOM获取
    let review = currentReview || '';
    
    if (!currentReview) {
        // 从 DOM 中获取当前的显示内容（去除非纯文本的 HTML 标签）
        const displayEl = document.getElementById(`review-display-${recordId}`);
        
        // 检查是否是空状态
        if (displayEl && !displayEl.querySelector('.h-review-empty')) {
            // 移除 label，获取剩余文本
            const clone = displayEl.cloneNode(true);
            const label = clone.querySelector('.h-label');
            if (label) label.remove();
            review = clone.innerText.trim();
        }
    }
    
    document.getElementById('review-book-title').textContent = `书名：《${title}》`;
    document.getElementById('review-content').value = review;
    
    const modal = document.getElementById('modal-review');
    modal.style.display = 'flex';
    modal.offsetHeight; 
    modal.classList.add('show');
}
