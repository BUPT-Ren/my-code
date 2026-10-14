let currentBookId = null;
let currentRating = 5;
let currentBookAvailable = false;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentBookId = urlParams.get('id');
    
    if (currentBookId) {
        loadBookDetail();
    } else {
        document.getElementById('book-detail').innerHTML = '<div class="error-message">图书不存在</div>';
    }
    
    setupRatingInput();
    setupBackBtnPosition();
});

async function loadBookDetail() {
    const container = document.getElementById('book-detail');
    
    try {
        const res = await fetch(`/api/books/${currentBookId}/detail`);
        const data = await res.json();
        
        if (data.ok) {
            await renderBookDetail(data.book);
        } else {
            container.innerHTML = `<div class="error-message">${data.message}</div>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="error-message">加载失败</div>';
    }
}

async function renderBookDetail(book) {
    const container = document.getElementById('book-detail');
    const publishDate = book.publish_date ? new Date(book.publish_date).toLocaleDateString('zh-CN') : '未知';
    currentBookAvailable = book.available_copies > 0;
    
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userId = user ? (user.user_id || user.id) : null;
    
    // 检查收藏状态
    const isFavorited = await checkFavoriteStatus(userId);
    
    // 检查借阅状态
    const borrowStatus = await checkBorrowStatus(userId);
    
    const reviewsHtml = book.reviews && book.reviews.length > 0 
        ? book.reviews.map(review => renderReview(review)).join('')
        : '<div class="empty-state"><i class="fas fa-comment-slash"></i><p>暂无读后感</p></div>';
    
    // 借阅按钮状态
    let borrowBtnHtml = '';
    if (borrowStatus === 'pending') {
        borrowBtnHtml = `<button class="btn btn-borrow btn-pending" disabled>
            <i class="fas fa-clock"></i> 审核中
        </button>`;
    } else if (currentBookAvailable) {
        borrowBtnHtml = `<button class="btn btn-borrow" onclick="borrowBook()">
            <i class="fas fa-book"></i> 借阅
        </button>`;
    } else {
        borrowBtnHtml = `<button class="btn btn-borrow" disabled>
            <i class="fas fa-book"></i> 暂不可借
        </button>`;
    }
    
    // 收藏按钮状态
    const favBtnClass = isFavorited ? 'btn btn-favorite is-favorited' : 'btn btn-favorite';
    const favBtnIcon = isFavorited ? 'fas fa-heart' : 'far fa-heart';
    const favBtnText = isFavorited ? '已收藏' : '收藏';
    
    container.innerHTML = `
        <div class="back-nav">
            <button class="back-btn" onclick="history.back()">
                <i class="fas fa-arrow-left"></i> 返回上一页
            </button>
        </div>
        
        <div class="book-header">
            <div class="book-cover-wrapper">
                <img src="${book.cover_url || 'https://picsum.photos/seed/book/200/280'}" alt="${book.title}">
            </div>
            <div class="book-info-wrapper">
                <h1>${book.title}</h1>
                <div class="author">作者: ${book.author || '未知'}</div>
                
                <span class="book-status-badge ${currentBookAvailable ? 'available' : 'unavailable'}">
                    ${currentBookAvailable ? '可借阅' : '已借完'}
                </span>
                
                <div class="book-meta-list">
                    <div class="meta-item">
                        <span class="meta-label">ISBN:</span>
                        <span class="meta-value">${book.isbn || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">出版日期:</span>
                        <span class="meta-value">${publishDate}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">馆藏数量:</span>
                        <span class="meta-value">${book.total_copies || 0} 本</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">可借数量:</span>
                        <span class="meta-value">${book.available_copies || 0} 本</span>
                    </div>
                </div>
                
                <div class="book-actions">
                    ${borrowBtnHtml}
                    <button class="${favBtnClass}" id="btn-favorite" onclick="toggleFavorite()">
                        <i class="${favBtnIcon}"></i> ${favBtnText}
                    </button>
                </div>
            </div>
        </div>
        
        <div class="section-card">
            <h2><i class="fas fa-info-circle"></i> 内容简介</h2>
            <div class="book-description">${book.introduction || '暂无简介'}</div>
        </div>
        
        <div class="section-card">
            <h2><i class="fas fa-robot"></i> AI 评价</h2>
            <div class="ai-evaluation" id="ai-evaluation">
                <div class="ai-badge"><i class="fas fa-robot"></i> AI 智能评价</div>
                <div class="content">正在生成中...</div>
            </div>
        </div>
        
        <div class="section-card">
            <h2><i class="fas fa-comments"></i> 读者读后感</h2>
            <div class="reviews-section" id="reviews-section">
                ${reviewsHtml}
            </div>
            
            <div class="write-review">
                <h3>发表读后感</h3>
                <textarea id="review-content" placeholder="分享你对这本书的看法..."></textarea>
                <div class="rating-input">
                    <label>评分:</label>
                    <div class="stars" id="rating-stars">
                        <i class="fas fa-star active" data-rating="1"></i>
                        <i class="fas fa-star active" data-rating="2"></i>
                        <i class="fas fa-star active" data-rating="3"></i>
                        <i class="fas fa-star active" data-rating="4"></i>
                        <i class="fas fa-star active" data-rating="5"></i>
                    </div>
                </div>
                <button onclick="submitReview()">提交读后感</button>
            </div>
        </div>
    `;
    
    setupRatingInput();
    loadAIEvaluation();
}

async function checkFavoriteStatus(userId) {
    if (!userId) return false;
    
    try {
        const { res, data } = await fetchJson('/api/favorites');
        if (res && res.ok && data && data.ok && data.favorites) {
            return data.favorites.some(fav => (fav.book_id || fav.id) == currentBookId);
        }
    } catch (err) {
        console.error(err);
    }
    return false;
}

async function checkBorrowStatus(userId) {
    if (!userId) return null;
    
    try {
        const { res, data } = await fetchJson('/api/borrow/pending-books');
        if (res && res.ok && data && data.ok && data.pending_books) {
            const pending = data.pending_books.find(p => p.book_id == currentBookId);
            return pending ? 'pending' : null;
        }
    } catch (err) {
        console.error(err);
    }
    return null;
}

function renderReview(review) {
    const time = review.created_at ? new Date(review.created_at).toLocaleString('zh-CN') : '-';
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    
    return `
        <div class="review-item">
            <div class="review-header">
                <div class="review-user">
                    <div class="review-avatar">${(review.user_name || 'U').charAt(0)}</div>
                    <div>
                        <div class="review-name">${review.user_name || '匿名用户'}</div>
                        <div class="review-time">${time}</div>
                    </div>
                </div>
                <div class="review-rating">${stars}</div>
            </div>
            <div class="review-content">${review.content}</div>
        </div>
    `;
}

async function loadAIEvaluation() {
    const container = document.getElementById('ai-evaluation');
    if (!container) return;
    
    const contentEl = container.querySelector('.content');
    const badgeEl = container.querySelector('.ai-badge');
    
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const res = await fetch(`/api/books/${currentBookId}/ai-evaluation`, { headers });
        const data = await res.json();
        
        if (data.ok) {
            contentEl.textContent = data.evaluation;
            
            if (data.personalized && badgeEl) {
                badgeEl.innerHTML = '<i class="fas fa-robot"></i> AI 个性化评价';
                badgeEl.style.background = 'linear-gradient(135deg, #6366F1, #8B5CF6)';
            }
        } else {
            contentEl.textContent = '暂无法生成评价';
        }
    } catch (err) {
        console.error(err);
        contentEl.textContent = '评价生成失败';
    }
}

function setupRatingInput() {
    const starsContainer = document.getElementById('rating-stars');
    if (!starsContainer) return;
    
    const stars = starsContainer.querySelectorAll('i');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.dataset.rating);
            updateStars();
        });
        
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
    });
    
    starsContainer.addEventListener('mouseleave', function() {
        updateStars();
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('#rating-stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function updateStars() {
    highlightStars(currentRating);
}

async function borrowBook() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    const token = localStorage.getItem('token');
    const userId = user.user_id || user.id;
    
    try {
        const { res, data } = await fetchJson('/api/borrow', {
            method: 'POST',
            body: JSON.stringify({ book_id: currentBookId })
        });
        
        if (res && res.ok && data && data.ok) {
            alert('借阅申请已提交，请等待管理员审核');
            const borrowBtn = document.querySelector('.btn-borrow');
            if (borrowBtn) {
                borrowBtn.innerHTML = '<i class="fas fa-clock"></i> 审核中';
                borrowBtn.classList.add('btn-pending');
                borrowBtn.disabled = true;
            }
        } else {
            alert(data.message || '借阅失败');
        }
    } catch (err) {
        console.error(err);
        alert('借阅失败');
    }
}

async function toggleFavorite() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    const userId = user.user_id || user.id;
    const btn = document.getElementById('btn-favorite');
    const isFavorited = btn.classList.contains('is-favorited');
    
    try {
        if (isFavorited) {
            const { res, data } = await fetchJson('/api/favorites', {
                method: 'DELETE',
                body: JSON.stringify({ book_id: currentBookId })
            });
            
            if (res && res.ok && data && data.ok) {
                btn.classList.remove('is-favorited');
                btn.innerHTML = '<i class="far fa-heart"></i> 收藏';
                alert('已取消收藏');
            } else {
                alert((data && data.message) || '取消收藏失败');
            }
        } else {
            const { res, data } = await fetchJson('/api/favorites', {
                method: 'POST',
                body: JSON.stringify({ book_id: currentBookId })
            });
            
            if (res && res.ok && data && data.ok) {
                btn.classList.add('is-favorited');
                btn.innerHTML = '<i class="fas fa-heart"></i> 已收藏';
                alert('收藏成功');
            } else if (data && data.message && data.message.includes('已存在')) {
                btn.classList.add('is-favorited');
                btn.innerHTML = '<i class="fas fa-heart"></i> 已收藏';
            } else {
                alert((data && data.message) || '收藏失败');
            }
        }
    } catch (err) {
        console.error(err);
        alert('操作失败');
    }
}

async function submitReview() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    const content = document.getElementById('review-content').value.trim();
    
    if (!content) {
        alert('请输入读后感内容');
        return;
    }
    
    try {
        const { res, data } = await fetchJson(`/api/books/${currentBookId}/reviews`, {
            method: 'POST',
            body: JSON.stringify({ content, rating: currentRating })
        });
        
        if (res && res.ok && data.ok) {
            alert('读后感已提交，请等待管理员审核');
            document.getElementById('review-content').value = '';
        } else {
            alert(data?.message || '提交失败');
        }
    } catch (err) {
        console.error(err);
        alert('提交失败');
    }
}

function setupBackBtnPosition() {
    function updateBackBtnPosition() {
        const backNav = document.querySelector('.back-nav');
        const sidebar = document.getElementById('sidebar');
        if (!backNav || !sidebar) return;
        
        if (sidebar.classList.contains('expanded')) {
            backNav.style.left = '285px';
        } else {
            backNav.style.left = '75px';
        }
    }
    
    updateBackBtnPosition();
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const observer = new MutationObserver(updateBackBtnPosition);
        observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }
}