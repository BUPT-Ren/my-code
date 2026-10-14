// js/borrowed.js - 正在借阅页面（含审核状态展示）

let currentActionBookId = null;
let currentActionRecordId = null;
let pendingRequests = new Map(); // 存储待审核的申请

document.addEventListener('DOMContentLoaded', () => {
    loadBorrowedBooks();
    loadPendingRequests();
    setupModals();
    setupTabs();
});

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            if (tab === 'borrowing') {
                document.getElementById('borrowed-list').classList.add('active');
            } else {
                document.getElementById('requests-list').classList.add('active');
                loadRequestsList();
            }
        });
    });
}

async function loadPendingRequests() {
    try {
        const { res, data } = await fetchJson('/api/borrow/requests?status=pending');
        
        if (res && res.ok && data && data.ok) {
            pendingRequests.clear();
            (data.requests || []).forEach(req => {
                if (req.record_id) {
                    pendingRequests.set(req.record_id, req);
                }
            });
            updateUIWithPendingStatus();
        }
    } catch (e) {
        console.warn('加载待审核申请失败', e);
    }
}

function updateUIWithPendingStatus() {
    const countBadge = document.getElementById('request-count');
    if (countBadge) {
        countBadge.textContent = pendingRequests.size;
    }
    
    pendingRequests.forEach((req, recordId) => {
        const item = document.querySelector(`.borrowed-item[data-record-id="${recordId}"]`);
        if (!item) return;
        
        // 还书申请
        if (req.request_type === 'return') {
            const returnBtn = item.querySelector('.btn-return');
            if (returnBtn) {
                returnBtn.innerHTML = '<i class="fas fa-clock"></i> 等待审核';
                returnBtn.classList.add('btn-pending');
                returnBtn.disabled = true;
                returnBtn.onclick = null;
            }
            
            addPendingStatusTag(item, '还书申请审核中');
        }
        
        // 续借申请
        if (req.request_type === 'renew') {
            const extendBtn = item.querySelector('.btn-extend');
            if (extendBtn) {
                extendBtn.innerHTML = '<i class="fas fa-clock"></i> 等待审核';
                extendBtn.classList.add('btn-pending');
                extendBtn.disabled = true;
                extendBtn.onclick = null;
            }
            
            addPendingStatusTag(item, '续借申请审核中');
        }
        
        // 挂失申请
        if (req.request_type === 'lost') {
            const lostBtn = item.querySelector('.btn-lost');
            if (lostBtn) {
                lostBtn.innerHTML = '<i class="fas fa-clock"></i> 等待处理';
                lostBtn.classList.add('btn-pending');
                lostBtn.disabled = true;
                lostBtn.onclick = null;
            }
            
            addPendingStatusTag(item, '挂失申请处理中');
        }
    });
}

function addPendingStatusTag(item, text) {
    let statusTag = item.querySelector('.pending-status-tag');
    if (!statusTag) {
        const datesDiv = item.querySelector('.b-dates');
        if (datesDiv) {
            statusTag = document.createElement('div');
            statusTag.className = 'pending-status-tag';
            datesDiv.appendChild(statusTag);
        }
    }
    if (statusTag) {
        statusTag.innerHTML = `<i class="fas fa-hourglass-half"></i> ${text}`;
    }
}

async function loadBorrowedBooks() {
    const container = document.getElementById('borrowed-list');
    if (!container) return;

    try {
        const { res, data } = await fetchJson('/api/borrowed');

        if (res && res.ok && data && data.ok) {
            const records = data.borrowed || [];
            
            if (records.length === 0) {
                container.innerHTML = '<div style="text-align:center; color:#888; padding:3rem;">当前没有正在借阅的书籍</div>';
                return;
            }

            container.innerHTML = '';
            records.forEach(record => {
                const card = createBorrowedCard(record);
                container.appendChild(card);
            });
            
            await loadPendingRequests();
        } else {
            container.innerHTML = `<div style="text-align:center; color:red;">加载失败: ${data.message || '未知错误'}</div>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="text-align:center; color:red;">网络错误，请检查后端服务</div>';
    }
}

function createBorrowedCard(record) {
    const item = document.createElement('div');
    item.className = 'borrowed-item';

    const book = record.book || {};
    
    const bookId = book.book_id || record.book_id;
    const recordId = record.record_id;
    
    const title = book.title || record.book_title || '未知书名';
    const author = book.author || '未知作者';
    const isbn = book.isbn || 'N/A';
    const coverUrl = book.cover_url || 'https://picsum.photos/seed/book/200/300';
    
    const intro = book.introduction || '暂无内容简介...';
    const publishDate = book.publish_date || '未知日期';

    let borrowDateStr = record.borrow_time || record.borrow_date || new Date().toISOString();
    if (borrowDateStr.includes('T')) borrowDateStr = borrowDateStr.split('T')[0];
    
    let dueDateStr = record.due_time;
    if (!dueDateStr && borrowDateStr) {
        const bDate = new Date(borrowDateStr);
        const dDate = new Date(bDate);
        dDate.setDate(bDate.getDate() + 30);
        dueDateStr = dDate.toISOString().split('T')[0];
    } else if (dueDateStr && dueDateStr.includes('T')) {
        dueDateStr = dueDateStr.split('T')[0];
    }

    item.dataset.bookId = bookId;
    item.dataset.recordId = recordId;
    item.dataset.title = title;

    item.innerHTML = `
        <div class="b-cover" onclick="goToBookDetail('${bookId}')">
            <img src="${coverUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/100x140?text=No+Cover'">
        </div>

        <div class="b-info">
            <div class="b-title" onclick="goToBookDetail('${bookId}')">${title}</div>
            <div class="b-meta">
                <span>作者：${author}</span>
                <span>出版日期：${publishDate}</span> <span>索书号：${isbn}</span>
            </div>
        </div>

        <div class="b-intro">
            <strong>内容简介：</strong>
            ${intro}
        </div>

        <div class="b-dates">
            <div class="date-group">
                <label>借阅时间</label>
                <div class="date-val">${borrowDateStr}</div>
            </div>
            <div class="date-group due">
                <label>应还日期</label>
                <div class="date-val">${dueDateStr}</div>
            </div>
        </div>

        <div class="b-actions">
            <button class="b-btn btn-return" onclick="openModal('return', '${bookId}', '${title}', '${recordId}')">
                <i class="fas fa-undo"></i> 申请归还
            </button>
            <button class="b-btn btn-extend" onclick="openModal('extend', '${bookId}', '${title}', '${recordId}')">
                <i class="far fa-clock"></i> 申请延期
            </button>
            <button class="b-btn btn-lost" onclick="openModal('lost', '${bookId}', '${title}', '${recordId}')">
                <i class="fas fa-exclamation-circle"></i> 无法归还
            </button>
        </div>
    `;
    return item;
}

// --- 模态框逻辑 ---

window.openModal = function(type, bookId, bookTitle, recordId) {
    currentActionBookId = bookId;
    currentActionRecordId = recordId;
    
    let targetModalId = '';
    if (type === 'return') targetModalId = 'modal-return';
    if (type === 'extend') {
        targetModalId = 'modal-extend';
        const subjectEl = document.getElementById('extend-subject');
        if(subjectEl) subjectEl.value = `关于《${bookTitle}》的延期申请`;
    }
    if (type === 'lost') targetModalId = 'modal-lost';

    document.querySelectorAll('.modal-overlay').forEach(el => {
        if (el.id === targetModalId) {
            el.style.display = 'flex';
            el.offsetHeight; 
            el.classList.add('show');
        } else {
            if (el.classList.contains('show') || el.style.display === 'flex') {
                el.classList.remove('show');
                setTimeout(() => {
                    if (!el.classList.contains('show')) {
                        el.style.display = 'none';
                    }
                }, 300);
            }
        }
    });
}

function setupModals() {
    // 1. 关闭按钮通用逻辑
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });

    // 2. 确认还书
    const confirmReturnBtn = document.getElementById('confirm-return-btn');
    if (confirmReturnBtn) {
        confirmReturnBtn.addEventListener('click', async function() {
            if (!currentActionRecordId) return;
            
            const originalText = this.textContent;
            this.textContent = '提交中...';
            this.disabled = true;

            try {
                const { res, data } = await postJson('/api/return/request', { 
                    record_id: currentActionRecordId 
                });

                if (res && res.ok && data.ok) {
                    alert('还书申请已提交，请等待管理员审核！');
                    closeAllModals();
                    markAsPending(currentActionRecordId, 'return');
                } else {
                    alert(data?.message || '申请失败');
                }
            } catch (e) {
                console.error(e);
                alert('网络请求失败');
            } finally {
                this.textContent = originalText;
                this.disabled = false;
            }
        });
    }

    // 3. 发送延期申请
    const sendExtendBtn = document.getElementById('send-extend-btn');
    if (sendExtendBtn) {
        sendExtendBtn.addEventListener('click', async function() {
            if (!currentActionRecordId) {
                alert('未找到借阅记录');
                return;
            }
            
            const reason = document.getElementById('extend-reason').value;
            const duration = document.getElementById('extend-duration').value;
            
            if (!reason.trim()) { alert('请填写申请原因'); return; }
            
            const originalText = this.textContent;
            this.textContent = '提交中...';
            this.disabled = true;
            
            try {
                const { res, data } = await postJson('/api/renew/request', { 
                    record_id: currentActionRecordId,
                    duration: parseInt(duration),
                    reason: reason
                });
                
                if (res && res.ok && data.ok) {
                    alert('续借申请已提交，请等待管理员审核！');
                    closeAllModals();
                    markAsPending(currentActionRecordId, 'renew');
                } else {
                    alert(data?.message || '申请失败');
                }
            } catch (e) {
                console.error(e);
                alert('网络请求失败');
            } finally {
                this.textContent = originalText;
                this.disabled = false;
            }
        });
    }

    // 4. 提交挂失/异常
    const confirmLostBtn = document.getElementById('confirm-lost-btn');
    if (confirmLostBtn) {
        confirmLostBtn.addEventListener('click', async function() {
            const reason = document.getElementById('lost-reason').value;
            
            if (!reason.trim()) { alert('请填写具体情况说明'); return; }
            
            const originalText = this.textContent;
            this.textContent = '提交中...';
            this.disabled = true;
            
            try {
                const { res, data } = await postJson('/api/lost/request', { 
                    record_id: currentActionRecordId,
                    reason: reason
                });
                
                if (res && res.ok && data.ok) {
                    alert('挂失申请已提交，请等待管理员处理！');
                    closeAllModals();
                    markAsPending(currentActionRecordId, 'lost');
                } else {
                    alert(data?.message || '申请失败');
                }
            } catch (e) {
                console.error(e);
                alert('网络请求失败');
            } finally {
                this.textContent = originalText;
                this.disabled = false;
            }
        });
    }
}

function markAsPending(recordId, type) {
    const item = document.querySelector(`.borrowed-item[data-record-id="${recordId}"]`);
    if (!item) return;
    
    if (type === 'return') {
        const returnBtn = item.querySelector('.btn-return');
        if (returnBtn) {
            returnBtn.innerHTML = '<i class="fas fa-clock"></i> 等待审核';
            returnBtn.classList.add('btn-pending');
            returnBtn.disabled = true;
            returnBtn.onclick = null;
        }
        addPendingStatusTag(item, '还书申请审核中');
    }
    
    if (type === 'renew') {
        const extendBtn = item.querySelector('.btn-extend');
        if (extendBtn) {
            extendBtn.innerHTML = '<i class="fas fa-clock"></i> 等待审核';
            extendBtn.classList.add('btn-pending');
            extendBtn.disabled = true;
            extendBtn.onclick = null;
        }
        addPendingStatusTag(item, '续借申请审核中');
    }
    
    if (type === 'lost') {
        const lostBtn = item.querySelector('.btn-lost');
        if (lostBtn) {
            lostBtn.innerHTML = '<i class="fas fa-clock"></i> 等待处理';
            lostBtn.classList.add('btn-pending');
            lostBtn.disabled = true;
            lostBtn.onclick = null;
        }
        addPendingStatusTag(item, '挂失申请处理中');
    }
}

function addPendingStatusTag(item, text) {
    let statusTag = item.querySelector('.pending-status-tag');
    if (!statusTag) {
        const datesDiv = item.querySelector('.b-dates');
        if (datesDiv) {
            statusTag = document.createElement('div');
            statusTag.className = 'pending-status-tag';
            datesDiv.appendChild(statusTag);
        }
    }
    if (statusTag) {
        statusTag.innerHTML = `<i class="fas fa-hourglass-half"></i> ${text}`;
    }
}

function closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('show');
    setTimeout(() => {
        if (!modalElement.classList.contains('show')) {
            modalElement.style.display = 'none';
        }
    }, 300);
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => {
        el.classList.remove('show');
        setTimeout(() => el.style.display = 'none', 300);
    });
}

function goToBookDetail(bookId) {
    if (bookId) {
        window.location.href = `book-detail.html?id=${bookId}`;
    }
}

async function loadRequestsList() {
    const container = document.getElementById('requests-list');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-placeholder">加载中...</div>';
    
    try {
        const { res, data } = await fetchJson('/api/borrow/requests?status=pending');
        
        if (res && res.ok && data && data.ok) {
            const requests = data.requests || [];
            
            if (requests.length === 0) {
                container.innerHTML = '<div style="text-align:center; color:#888; padding:3rem;">暂无待审核的申请</div>';
                return;
            }
            
            container.innerHTML = '';
            requests.forEach(req => {
                const card = createRequestCard(req);
                container.appendChild(card);
            });
        } else {
            container.innerHTML = `<div style="text-align:center; color:red;">加载失败: ${data.message || '未知错误'}</div>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="text-align:center; color:red;">网络错误，请检查后端服务</div>';
    }
}

function createRequestCard(req) {
    const card = document.createElement('div');
    card.className = 'request-item';
    
    const typeMap = {
        'borrow': { text: '借阅申请', icon: 'fa-book', color: '#3B82F6' },
        'return': { text: '还书申请', icon: 'fa-undo', color: '#10B981' },
        'renew': { text: '延期申请', icon: 'fa-clock', color: '#F59E0B' },
        'lost': { text: '挂失申请', icon: 'fa-exclamation-triangle', color: '#EF4444' }
    };
    
    const typeInfo = typeMap[req.request_type] || { text: '未知申请', icon: 'fa-question', color: '#6B7280' };
    const requestTime = req.request_time ? new Date(req.request_time).toLocaleString('zh-CN') : '-';
    const bookTitle = req.book_title || '未知书名';
    const bookCover = req.book_cover || 'https://picsum.photos/seed/book/80/100';
    const requestId = req.request_id;
    
    card.innerHTML = `
        <div class="req-cover">
            <img src="${bookCover}" alt="${bookTitle}">
        </div>
        <div class="req-info">
            <div class="req-title">${bookTitle}</div>
            <div class="req-type" style="color: ${typeInfo.color}">
                <i class="fas ${typeInfo.icon}"></i> ${typeInfo.text}
            </div>
        </div>
        <div class="req-time">
            <label>申请时间</label>
            <div>${requestTime}</div>
        </div>
        <div class="req-status">
            <span class="status-badge pending">待审核</span>
        </div>
        <div class="req-actions">
            <button class="req-cancel-btn" onclick="cancelRequest(${requestId}, '${bookTitle.replace(/'/g, "\\'")}')">
                <i class="fas fa-times"></i> 撤销申请
            </button>
        </div>
    `;
    
    return card;
}

async function cancelRequest(requestId, bookTitle) {
    if (!confirm(`确定要撤销《${bookTitle}》的申请吗？\n撤销后需要重新提交申请。`)) return;
    
    try {
        const { res, data } = await fetchJson(`/api/borrow/requests/${requestId}/cancel`, {
            method: 'POST'
        });
        
        if (res && res.ok && data && data.ok) {
            alert('申请已撤销');
            loadRequestsList();
            loadPendingRequests();
        } else {
            alert(data.message || '撤销失败');
        }
    } catch (err) {
        console.error(err);
        alert('网络请求失败');
    }
}