let requestPage = 1;
let pageSize = 10;
let totalItems = 0;
let selectedIds = new Set();
let currentRejectId = null;
let currentRejectReviewId = null;
let currentRequests = [];
let currentReviews = [];
let currentShortcut = 'today';
let currentType = '';
let filteredTotal = 0;
let isAllSelected = false;
let requestFilters = { type: '', status: 'pending', startDate: '', endDate: '' };

function setDateShortcut(shortcut) {
    currentShortcut = shortcut;
    document.querySelectorAll('.date-shortcut').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const dateRangeGroup = document.getElementById('date-range-group');
    const today = new Date();
    
    if (shortcut === 'custom') {
        dateRangeGroup.style.display = 'flex';
        return;
    }
    
    dateRangeGroup.style.display = 'none';
    
    let startDate, endDate;
    
    switch (shortcut) {
        case 'today':
            startDate = endDate = today.toISOString().slice(0, 10);
            break;
        case '7days':
            const day7Ago = new Date(today);
            day7Ago.setDate(day7Ago.getDate() - 6);
            startDate = day7Ago.toISOString().slice(0, 10);
            endDate = today.toISOString().slice(0, 10);
            break;
        case '30days':
            const day30Ago = new Date(today);
            day30Ago.setDate(day30Ago.getDate() - 29);
            startDate = day30Ago.toISOString().slice(0, 10);
            endDate = today.toISOString().slice(0, 10);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
            endDate = today.toISOString().slice(0, 10);
            break;
        default:
            startDate = endDate = null;
    }
    
    document.getElementById('start-date').value = startDate || '';
    document.getElementById('end-date').value = endDate || '';
    
    loadRequests(1);
}

async function loadRequests(page = 1) {
    requestPage = page;
    const token = localStorage.getItem('token');
    const type = document.getElementById('filter-type').value;
    const status = document.getElementById('filter-status').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    currentType = type;
    requestFilters = { type, status, startDate, endDate };
    
    const tbody = document.getElementById('requests-list');
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>';
    
    if (type === 'review') {
        await loadReviews(status);
        return;
    }
    
    if (type === 'password_reset') {
        await loadPasswordResetRequests(status, page);
        return;
    }
    
    if (type === '') {
        await loadAllTypes(status, startDate, endDate);
        return;
    }
    
    try {
        let url = `/api/admin/borrow/requests?page=${page}&page_size=${pageSize}`;
        if (type) url += `&type=${type}`;
        if (status) url += `&status=${status}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            currentRequests = data.requests;
            currentReviews = [];
            filteredTotal = data.pagination.total;
            totalItems = data.pagination.total;
            renderRequests(data.requests);
            renderPagination(data.pagination);
            updateBatchBar();
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">加载失败: ${data.message}</td></tr>`;
        }
    } catch (err) {
        console.error('加载申请列表失败:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">加载失败</td></tr>';
    }
}

async function loadAllTypes(status, startDate, endDate) {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('requests-list');
    
    try {
        let borrowUrl = `/api/admin/borrow/requests?page=1&page_size=100`;
        if (status) borrowUrl += `&status=${status}`;
        if (startDate) borrowUrl += `&start_date=${startDate}`;
        if (endDate) borrowUrl += `&end_date=${endDate}`;
        
        let reviewUrl = '/api/admin/reviews';
        if (status) reviewUrl += `?status=${status}`;
        
        const [borrowRes, reviewRes] = await Promise.all([
            fetch(borrowUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(reviewUrl, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const borrowData = await borrowRes.json();
        const reviewData = await reviewRes.json();
        
        const borrowRequests = borrowData.ok ? (borrowData.requests || []) : [];
        const reviews = reviewData.ok ? (reviewData.reviews || []) : [];
        
        currentRequests = borrowRequests;
        currentReviews = reviews;
        
        const total = borrowRequests.length + reviews.length;
        filteredTotal = total;
        
        renderAllTypes(borrowRequests, reviews);
        
        document.getElementById('pagination').innerHTML = total > 0 ? `<span class="pagination-info">共 ${total} 条</span>` : '';
        document.getElementById('batch-action-bar').style.display = 'none';
        
    } catch (err) {
        console.error('加载数据失败:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">加载失败</td></tr>';
    }
}

function renderAllTypes(borrowRequests, reviews) {
    const tbody = document.getElementById('requests-list');
    
    const header = document.getElementById('table-header');
    if (header) {
        header.innerHTML = `
            <th class="col-checkbox">
                <input type="checkbox" id="select-all-header" onchange="toggleSelectAll(this.checked)">
            </th>
            <th class="col-type">类型</th>
            <th class="col-user">申请人</th>
            <th class="col-book">书籍信息</th>
            <th class="col-extra">附加信息</th>
            <th class="col-time">时间</th>
            <th class="col-status">状态</th>
            <th class="col-actions">操作</th>
        `;
    }
    
    if (borrowRequests.length === 0 && reviews.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-cell">
                    <i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                    暂无记录
                </td>
            </tr>
        `;
        return;
    }
    
    const allItems = [];
    
    borrowRequests.forEach(req => {
        allItems.push({
            type: 'request',
            data: req,
            time: new Date(req.request_time || 0)
        });
    });
    
    reviews.forEach(review => {
        allItems.push({
            type: 'review',
            data: review,
            time: new Date(review.created_at || 0)
        });
    });
    
    allItems.sort((a, b) => b.time - a.time);
    
    tbody.innerHTML = allItems.map(item => {
        if (item.type === 'request') {
            return renderRequestRow(item.data);
        } else {
            return renderReviewRow(item.data);
        }
    }).join('');
}

function renderRequestRow(req) {
    return `
        <tr data-id="${req.request_id}">
            <td class="col-checkbox">
                <input type="checkbox" 
                       class="request-checkbox" 
                       data-id="${req.request_id}"
                       onchange="toggleSelect(${req.request_id}, this.checked)">
            </td>
            <td class="col-type">
                <span class="request-type ${req.request_type}">${getTypeLabel(req.request_type)}</span>
            </td>
            <td class="col-user">
                <div class="user-info-cell">
                    <div class="user-name">用户${req.user_id}</div>
                    <div class="user-phone">${req.user_phone || ''}</div>
                </div>
            </td>
            <td class="col-book">
                <div class="book-info-cell">
                    <img class="book-cover" src="${req.book_cover || 'https://via.placeholder.com/40x56?text=Book'}" alt="cover">
                    <div class="book-text">
                        <div class="book-title">${req.book_title || '未知书籍'}</div>
                        <div class="book-author">${req.book_author || ''}</div>
                    </div>
                </div>
            </td>
            <td class="col-extra">-</td>
            <td class="col-time">${formatDateTime(req.request_time)}</td>
            <td class="col-status">
                <span class="status-badge ${req.status}">${getStatusLabel(req.status)}</span>
            </td>
            <td class="col-actions">
                <div class="table-actions">
                    <button class="btn-view" onclick="showDetail(${req.request_id})">
                        <i class="fas fa-eye"></i> 详情
                    </button>
                    ${req.status === 'pending' ? `
                        <button class="btn-approve" onclick="singleApprove(${req.request_id})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-reject" onclick="showRejectModal(${req.request_id})">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function renderReviewRow(review) {
    const stars = '★'.repeat(review.rating || 5) + '☆'.repeat(5 - (review.rating || 5));
    const contentPreview = (review.content || '').length > 30 
        ? (review.content || '').substring(0, 30) + '...' 
        : (review.content || '');
    
    return `
        <tr data-id="${review.review_id}">
            <td class="col-checkbox">
                <input type="checkbox" 
                       class="review-checkbox" 
                       data-id="${review.review_id}"
                       onchange="toggleSelect(${review.review_id}, this.checked)">
            </td>
            <td class="col-type">
                <span class="request-type review">读后感</span>
            </td>
            <td class="col-user">
                <div class="user-info-cell">
                    <div class="user-name">${review.user_name || '用户' + review.user_id}</div>
                </div>
            </td>
            <td class="col-book">
                <div class="book-info-cell">
                    <div class="book-text">
                        <div class="book-title">${review.book_title || '未知书籍'}</div>
                        <div class="book-rating" style="color: #F59E0B;">${stars}</div>
                    </div>
                </div>
            </td>
            <td class="col-extra" style="max-width: 120px;">
                <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${review.content || ''}">
                    ${contentPreview}
                </div>
            </td>
            <td class="col-time">${formatDateTime(review.created_at)}</td>
            <td class="col-status">
                <span class="status-badge ${review.status}">${getStatusLabel(review.status)}</span>
            </td>
            <td class="col-actions">
                <div class="table-actions">
                    <button class="btn-view" onclick="showReviewDetail(${review.review_id})">
                        <i class="fas fa-eye"></i> 详情
                    </button>
                    ${review.status === 'pending' ? `
                        <button class="btn-approve" onclick="approveReview(${review.review_id}, 'approve')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-reject" onclick="showRejectReviewModal(${review.review_id})">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

async function loadReviews(status) {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('requests-list');
    
    try {
        let url = '/api/admin/reviews';
        if (status) url += `?status=${status}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            currentReviews = data.reviews || [];
            currentRequests = [];
            currentType = 'review';
            filteredTotal = currentReviews.length;
            renderReviews(currentReviews);
            document.getElementById('pagination').innerHTML = currentReviews.length > 0 ? `<span class="pagination-info">共 ${currentReviews.length} 条</span>` : '';
            updateBatchBar();
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">加载失败: ${data.message}</td></tr>`;
        }
    } catch (err) {
        console.error('加载读后感列表失败:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">加载失败</td></tr>';
    }
}

let passwordResetRequests = [];

async function loadPasswordResetRequests(status, page = 1) {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('requests-list');
    
    try {
        let url = `/api/admin/password-reset-requests?page=${page}&page_size=${pageSize}`;
        if (status) url += `&status=${status}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            passwordResetRequests = data.requests || [];
            currentRequests = [];
            currentReviews = [];
            currentType = 'password_reset';
            filteredTotal = data.pagination.total;
            renderPasswordResetRequests(passwordResetRequests);
            renderPagination(data.pagination);
            updateBatchBar();
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">加载失败: ${data.message}</td></tr>`;
        }
    } catch (err) {
        console.error('加载密码重置申请失败:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">加载失败</td></tr>';
    }
}

function renderPasswordResetRequests(requests) {
    const tbody = document.getElementById('requests-list');
    
    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">暂无密码重置申请</td></tr>';
        return;
    }
    
    tbody.innerHTML = requests.map(req => {
        const statusBadge = req.status === 'pending' 
            ? '<span class="status-badge pending">待处理</span>'
            : req.status === 'approved'
            ? '<span class="status-badge approved">已批准</span>'
            : '<span class="status-badge rejected">已拒绝</span>';
        
        const createdAt = req.created_at ? new Date(req.created_at).toLocaleString('zh-CN') : '-';
        
        return `
            <tr>
                <td class="col-checkbox">
                    <input type="checkbox" class="request-checkbox" data-id="${req.request_id}" onchange="updateSelectedIds()">
                </td>
                <td class="col-type">
                    <span class="type-badge password-reset">密码重置</span>
                </td>
                <td class="col-user">
                    <div class="user-info-cell">
                        <span class="phone">${req.phone || '-'}</span>
                        ${req.user_school ? `<span class="school">${req.user_school}</span>` : ''}
                    </div>
                </td>
                <td class="col-book">-</td>
                <td class="col-extra">
                    <span class="reason-text">${req.reason || '无'}</span>
                    ${req.reject_reason ? `<br><span class="reject-reason">拒绝原因: ${req.reject_reason}</span>` : ''}
                </td>
                <td class="col-time">${createdAt}</td>
                <td class="col-status">${statusBadge}</td>
                <td class="col-actions">
                    <div class="table-actions">
                        ${req.status === 'pending' ? `
                            <button class="btn-approve" onclick="showApprovePasswordResetModal(${req.request_id})" title="批准">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn-reject" onclick="showRejectPasswordResetModal(${req.request_id})" title="拒绝">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : `
                            <span class="processed-info">
                                ${req.processed_at ? new Date(req.processed_at).toLocaleString('zh-CN') : '-'}
                            </span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function showApprovePasswordResetModal(requestId) {
    const newPassword = prompt('请输入新密码（不填则使用默认密码 123456）:', '');
    if (newPassword === null) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/password-reset-requests/${requestId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ new_password: newPassword || '123456' })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('密码重置成功');
            loadPasswordResetRequests(document.getElementById('filter-status').value, requestPage);
            loadPendingCount();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批准密码重置失败:', err);
        alert('操作失败');
    }
}

async function showRejectPasswordResetModal(requestId) {
    const reason = prompt('请输入拒绝原因:', '');
    if (reason === null) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/password-reset-requests/${requestId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason || '' })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('已拒绝该申请');
            loadPasswordResetRequests(document.getElementById('filter-status').value, requestPage);
            loadPendingCount();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('拒绝密码重置失败:', err);
        alert('操作失败');
    }
}

async function checkAdminAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    
    try {
        const res = await fetch('/api/auth/check-admin', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (!data.ok || !data.is_admin) {
            alert('您没有管理员权限');
            window.location.href = '/index.html';
            return false;
        }
        return true;
    } catch (err) {
        console.error('权限检查失败:', err);
        window.location.href = '/login.html';
        return false;
    }
}

// 加载待审核数量
async function loadPendingCount() {
    const token = localStorage.getItem('token');
    
    try {
        const [borrowRes, reviewRes] = await Promise.all([
            fetch('/api/admin/borrow/requests?status=pending&page_size=1', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/admin/reviews?status=pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        const borrowData = await borrowRes.json();
        const reviewData = await reviewRes.json();
        
        const borrowCount = borrowData.ok && borrowData.pagination ? (borrowData.pagination.total || 0) : 0;
        const reviewCount = reviewData.ok && reviewData.reviews ? reviewData.reviews.length : 0;
        const totalCount = borrowCount + reviewCount;
        
        const el = document.getElementById('sidebar-pending-count');
        if (el) el.textContent = totalCount;
    } catch (err) {
        console.error('加载待审核数量失败:', err);
    }
}

// 渲染申请列表
function renderRequests(requests) {
    const tbody = document.getElementById('requests-list');
    
    // 重置表头
    const header = document.getElementById('table-header');
    if (header) {
        header.innerHTML = `
            <th class="col-checkbox">
                <input type="checkbox" id="select-all-header" onchange="toggleSelectAll(this.checked)">
            </th>
            <th class="col-type">类型</th>
            <th class="col-user">申请人</th>
            <th class="col-book">书籍信息</th>
            <th class="col-extra">附加信息</th>
            <th class="col-time">申请时间</th>
            <th class="col-status">状态</th>
            <th class="col-actions">操作</th>
        `;
    }
    
    if (!requests || requests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-cell">
                    <i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                    暂无申请记录
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = requests.map(req => `
        <tr data-id="${req.request_id}">
            <td class="col-checkbox">
                <input type="checkbox" 
                       class="request-checkbox" 
                       data-id="${req.request_id}"
                       ${selectedIds.has(req.request_id) ? 'checked' : ''}
                       onchange="toggleSelect(${req.request_id}, this.checked)">
            </td>
            <td class="col-type">
                <span class="request-type ${req.request_type}">${getTypeLabel(req.request_type)}</span>
            </td>
            <td class="col-user">
                <div class="user-info-cell">
                    <div class="user-name">用户${req.user_id}</div>
                    <div class="user-phone">${req.user_phone || ''}</div>
                </div>
            </td>
            <td class="col-book">
                <div class="book-info-cell">
                    <img class="book-cover" src="${req.book_cover || 'https://via.placeholder.com/40x56?text=Book'}" alt="cover">
                    <div class="book-text">
                        <div class="book-title">${req.book_title || '未知书籍'}</div>
                        <div class="book-author">${req.book_author || ''}</div>
                    </div>
                </div>
            </td>
            <td class="col-extra">-</td>
            <td class="col-time">${formatDateTime(req.request_time)}</td>
            <td class="col-status">
                <span class="status-badge ${req.status}">${getStatusLabel(req.status)}</span>
            </td>
            <td class="col-actions">
                <div class="table-actions">
                    <button class="btn-view" onclick="showDetail(${req.request_id})">
                        <i class="fas fa-eye"></i> 详情
                    </button>
                    ${req.status === 'pending' ? `
                        <button class="btn-approve" onclick="singleApprove(${req.request_id})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-reject" onclick="showRejectModal(${req.request_id})">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// 获取类型标签
function getTypeLabel(type) {
    const labels = {
        'borrow': '借书',
        'return': '还书',
        'renew': '续借',
        'lost': '挂失',
        'review': '读后感'
    };
    return labels[type] || type;
}

// 渲染读后感列表
function renderReviews(reviews) {
    const tbody = document.getElementById('requests-list');
    
    // 修改表头
    const header = document.getElementById('table-header');
    if (header) {
        header.innerHTML = `
            <th class="col-checkbox">
                <input type="checkbox" id="select-all-header" onchange="toggleSelectAll(this.checked)">
            </th>
            <th class="col-type">类型</th>
            <th class="col-user">申请人</th>
            <th class="col-book">书籍信息</th>
            <th class="col-extra">附加信息</th>
            <th class="col-time">提交时间</th>
            <th class="col-status">状态</th>
            <th class="col-actions">操作</th>
        `;
    }
    
    if (!reviews || reviews.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-cell">
                    <i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                    暂无读后感记录
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = reviews.map(review => {
        const stars = '★'.repeat(review.rating || 5) + '☆'.repeat(5 - (review.rating || 5));
        const contentPreview = (review.content || '').length > 30 
            ? (review.content || '').substring(0, 30) + '...' 
            : (review.content || '');
        
        return `
            <tr data-id="${review.review_id}">
                <td class="col-checkbox">
                    <input type="checkbox" 
                           class="review-checkbox" 
                           data-id="${review.review_id}"
                           onchange="toggleSelect(${review.review_id}, this.checked)">
                </td>
                <td class="col-type">
                    <span class="request-type review">读后感</span>
                </td>
                <td class="col-user">
                    <div class="user-info-cell">
                        <div class="user-name">${review.user_name || '用户' + review.user_id}</div>
                    </div>
                </td>
                <td class="col-book">
                    <div class="book-info-cell">
                        <div class="book-text">
                            <div class="book-title">${review.book_title || '未知书籍'}</div>
                            <div class="book-rating" style="color: #F59E0B;">${stars}</div>
                        </div>
                    </div>
                </td>
                <td class="col-extra" style="max-width: 120px;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${review.content || ''}">
                        ${contentPreview}
                    </div>
                </td>
                <td class="col-time">${formatDateTime(review.created_at)}</td>
                <td class="col-status">
                    <span class="status-badge ${review.status}">${getStatusLabel(review.status)}</span>
                </td>
                <td class="col-actions">
                    <div class="table-actions">
                        <button class="btn-view" onclick="showReviewDetail(${review.review_id})">
                            <i class="fas fa-eye"></i> 详情
                        </button>
                        ${review.status === 'pending' ? `
                            <button class="btn-approve" onclick="approveReview(${review.review_id}, 'approve')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn-reject" onclick="showRejectReviewModal(${review.review_id})">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 获取状态标签
function getStatusLabel(status) {
    const labels = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝'
    };
    return labels[status] || status;
}

// 格式化日期时间
function formatDateTime(timeStr) {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 渲染分页
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, pages, total } = pagination;
    
    if (pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // 上一页
    html += `<button ${page <= 1 ? 'disabled' : ''} onclick="loadRequests(${page - 1})">上一页</button>`;
    
    // 页码
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    if (startPage > 1) {
        html += `<button onclick="loadRequests(1)">1</button>`;
        if (startPage > 2) html += '<span>...</span>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="loadRequests(${i})">${i}</button>`;
    }
    
    if (endPage < pages) {
        if (endPage < pages - 1) html += '<span>...</span>';
        html += `<button onclick="loadRequests(${pages})">${pages}</button>`;
    }
    
    // 下一页
    html += `<button ${page >= pages ? 'disabled' : ''} onclick="loadRequests(${page + 1})">下一页</button>`;
    
    html += `<span class="pagination-info">共 ${total} 条</span>`;
    
    container.innerHTML = html;
}

// 重置筛选
function resetFilters() {
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-status').value = 'pending';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('date-range-group').style.display = 'none';
    
    document.querySelectorAll('.date-shortcut').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.date-shortcut[onclick*="today"]').classList.add('active');
    
    currentShortcut = 'today';
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('start-date').value = today;
    document.getElementById('end-date').value = today;
    
    loadRequests(1);
}

// 选择/取消选择
function toggleSelect(id, checked) {
    if (checked) {
        selectedIds.add(id);
    } else {
        selectedIds.delete(id);
    }
    updateBatchBar();
}

// 全选/取消全选
function toggleSelectAll(checked) {
    if (isAllSelected) {
        clearSelection();
        return;
    }
    
    const checkboxes = document.querySelectorAll('.request-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        const id = parseInt(cb.dataset.id);
        if (checked) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
    });
    
    document.getElementById('select-all').checked = checked;
    document.getElementById('select-all-header').checked = checked;
    
    updateBatchBar();
}

async function selectAllFiltered() {
    const token = localStorage.getItem('token');
    const { type, status, startDate, endDate } = requestFilters;
    
    try {
        let ids = [];
        
        if (type === 'review') {
            let url = '/api/admin/reviews/ids?';
            if (status) url += `status=${status}`;
            
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.ok) {
                ids = data.review_ids;
            }
        } else {
            let url = '/api/admin/borrow/requests/ids?';
            if (status) url += `status=${status}&`;
            if (type) url += `type=${type}&`;
            if (startDate) url += `start_date=${startDate}&`;
            if (endDate) url += `end_date=${endDate}`;
            
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.ok) {
                ids = data.request_ids;
            }
        }
        
        selectedIds = new Set(ids);
        isAllSelected = true;
        
        const checkboxes = document.querySelectorAll('.request-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = true;
        });
        
        document.getElementById('select-all').checked = true;
        document.getElementById('select-all-header').checked = true;
        
        updateBatchBar();
        
    } catch (err) {
        console.error('全选失败:', err);
        alert('操作失败');
    }
}

function clearSelection() {
    selectedIds.clear();
    isAllSelected = false;
    
    const checkboxes = document.querySelectorAll('.request-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
    });
    
    document.getElementById('select-all').checked = false;
    document.getElementById('select-all-header').checked = false;
    
    updateBatchBar();
}

// 更新批量操作栏
function updateBatchBar() {
    const bar = document.getElementById('batch-action-bar');
    const countEl = document.getElementById('selected-count');
    const selectAllBtn = document.getElementById('select-all-btn');
    const totalInfo = document.getElementById('total-info');
    
    if (selectedIds.size > 0 || isAllSelected) {
        bar.style.display = 'flex';
        countEl.textContent = selectedIds.size;
        
        if (totalInfo) {
            totalInfo.textContent = `（共 ${filteredTotal} 条符合条件）`;
        }
        
        if (selectAllBtn) {
            if (isAllSelected) {
                selectAllBtn.textContent = '清除选择';
                selectAllBtn.onclick = clearSelection;
            } else if (selectedIds.size < filteredTotal && currentType !== '') {
                selectAllBtn.textContent = '选择全部';
                selectAllBtn.onclick = selectAllFiltered;
                selectAllBtn.style.display = 'inline-block';
            } else {
                selectAllBtn.style.display = 'none';
            }
        }
    } else {
        bar.style.display = 'none';
    }
}

// 单个批准
async function singleApprove(requestId) {
    if (!confirm('确定要批准该申请吗？')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/borrow/requests/${requestId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: '' })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('已批准');
            selectedIds.delete(requestId);
            loadRequests(requestPage);
            loadPendingCount();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批准失败:', err);
        alert('操作失败');
    }
}

// 显示拒绝弹窗
function showRejectModal(requestId) {
    currentRejectId = requestId;
    currentRejectReviewId = null;
    document.getElementById('reject-reason').value = '';
    document.getElementById('modal-reject').classList.add('show');
}

// 确认拒绝
async function confirmReject() {
    const reason = document.getElementById('reject-reason').value.trim();
    
    if (!reason) {
        alert('请输入拒绝原因');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    // 判断是读后感拒绝还是借阅申请拒绝
    if (currentRejectReviewId) {
        try {
            const res = await fetch(`/api/admin/reviews/${currentRejectReviewId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'reject' })
            });
            const data = await res.json();
            
            if (data.ok) {
                alert('已拒绝');
                closeModal('modal-reject');
                currentRejectReviewId = null;
                loadReviews(document.getElementById('filter-status').value);
                loadPendingCount();
            } else {
                alert(data.message || '操作失败');
            }
        } catch (err) {
            console.error('拒绝失败:', err);
            alert('操作失败');
        }
        return;
    }
    
    try {
        const res = await fetch(`/api/admin/borrow/requests/${currentRejectId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('已拒绝');
            closeModal('modal-reject');
            selectedIds.delete(currentRejectId);
            loadRequests(requestPage);
            loadPendingCount();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('拒绝失败:', err);
        alert('操作失败');
    }
}

// 批量批准
async function batchApprove() {
    if (selectedIds.size === 0) {
        alert('请先选择要处理的申请');
        return;
    }
    
    if (!confirm(`确定要批量批准 ${selectedIds.size} 个申请吗？`)) return;
    
    const token = localStorage.getItem('token');
    const ids = Array.from(selectedIds);
    
    try {
        const res = await fetch('/api/admin/borrow/requests/batch-approve', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ request_ids: ids })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(`成功批准 ${data.success_count || ids.length} 个申请`);
            selectedIds.clear();
            isAllSelected = false;
            loadRequests(requestPage);
            loadPendingCount();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批量批准失败:', err);
        alert('操作失败');
    }
}

// 显示批量拒绝弹窗
function showBatchRejectModal() {
    if (selectedIds.size === 0) {
        alert('请先选择要处理的申请');
        return;
    }
    
    document.getElementById('batch-reject-count').textContent = selectedIds.size;
    document.getElementById('batch-reject-reason').value = '';
    document.getElementById('modal-batch-reject').classList.add('show');
}

// 确认批量拒绝
async function confirmBatchReject() {
    const reason = document.getElementById('batch-reject-reason').value.trim();
    
    if (!reason) {
        alert('请输入拒绝原因');
        return;
    }
    
    const token = localStorage.getItem('token');
    const ids = Array.from(selectedIds);
    
    try {
        const res = await fetch('/api/admin/borrow/requests/batch-reject', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ request_ids: ids, reason: reason })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(`成功拒绝 ${data.success_count || ids.length} 个申请`);
            closeModal('modal-batch-reject');
            selectedIds.clear();
            isAllSelected = false;
            loadRequests(requestPage);
            loadPendingCount();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批量拒绝失败:', err);
        alert('操作失败');
    }
}

// 显示详情
async function showDetail(requestId) {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/borrow/requests/${requestId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const req = data.request;
            const content = document.getElementById('modal-detail-content');
            const footer = document.getElementById('modal-detail-footer');
            
            content.innerHTML = `
                <div class="detail-row">
                    <span class="detail-label">申请类型</span>
                    <span class="detail-value"><span class="request-type ${req.request_type}">${getTypeLabel(req.request_type)}</span></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">申请状态</span>
                    <span class="detail-value"><span class="status-badge ${req.status}">${getStatusLabel(req.status)}</span></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">申请人</span>
                    <span class="detail-value">用户${req.user_id} (${req.user_phone || '未知'})</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">书籍</span>
                    <span class="detail-value">${req.book_title || '未知书籍'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">作者</span>
                    <span class="detail-value">${req.book_author || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">申请时间</span>
                    <span class="detail-value">${formatDateTime(req.request_time)}</span>
                </div>
                ${req.status !== 'pending' ? `
                <div class="detail-section">
                    <div class="detail-section-title">处理信息</div>
                    <div class="detail-row">
                        <span class="detail-label">处理时间</span>
                        <span class="detail-value">${formatDateTime(req.approved_at)}</span>
                    </div>
                    ${req.reject_reason ? `
                    <div class="detail-row">
                        <span class="detail-label">拒绝原因</span>
                        <span class="detail-value">${req.reject_reason}</span>
                    </div>
                    ` : ''}
                    ${req.admin_message ? `
                    <div class="detail-row">
                        <span class="detail-label">备注信息</span>
                        <span class="detail-value">${req.admin_message}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            `;
            
            if (req.status === 'pending') {
                footer.innerHTML = `
                    <button class="btn-cancel" onclick="closeModal('modal-detail')">关闭</button>
                    <button class="btn-reject" onclick="closeModal('modal-detail'); showRejectModal(${requestId})">拒绝</button>
                    <button class="btn-confirm" onclick="closeModal('modal-detail'); singleApprove(${requestId})">
                        <i class="fas fa-check"></i> 批准
                    </button>
                `;
            } else {
                footer.innerHTML = `<button class="btn-cancel" onclick="closeModal('modal-detail')">关闭</button>`;
            }
            
            document.getElementById('modal-detail').classList.add('show');
        } else {
            alert('获取详情失败');
        }
    } catch (err) {
        console.error('获取详情失败:', err);
        alert('操作失败');
    }
}

// 关闭弹窗
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return;
    
    loadAdminInfo();
    loadPendingCount();
    
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('start-date').value = today;
    document.getElementById('end-date').value = today;
    
    loadRequests(1);
});

// 点击模态框外部关闭
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });
});

function exportRequests() {
    if (currentType === 'review') {
        exportReviews();
        return;
    }
    
    if (currentType === '') {
        exportAllTypes();
        return;
    }
    
    if (!currentRequests || currentRequests.length === 0) {
        alert('暂无数据可导出');
        return;
    }
    
    const typeLabels = {
        'borrow': '借书',
        'return': '还书',
        'renew': '续借',
        'lost': '挂失'
    };
    
    const statusLabels = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝'
    };
    
    let csv = '\uFEFF申请类型,申请人ID,申请人手机,书籍名称,书籍作者,申请时间,状态\n';
    
    currentRequests.forEach(req => {
        const type = typeLabels[req.request_type] || req.request_type;
        const status = statusLabels[req.status] || req.status;
        const title = (req.book_title || '').replace(/"/g, '""');
        const author = (req.book_author || '').replace(/"/g, '""');
        const time = formatDateTime(req.request_time);
        
        csv += `${type},${req.user_id},"${req.user_phone || ''}","${title}","${author}",${time},${status}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `申请记录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

function exportAllTypes() {
    if ((!currentRequests || currentRequests.length === 0) && (!currentReviews || currentReviews.length === 0)) {
        alert('暂无数据可导出');
        return;
    }
    
    const typeLabels = {
        'borrow': '借书',
        'return': '还书',
        'renew': '续借',
        'lost': '挂失'
    };
    
    const statusLabels = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝'
    };
    
    let csv = '\uFEFF类型,申请人,书籍名称,附加信息,时间,状态\n';
    
    const allItems = [];
    
    (currentRequests || []).forEach(req => {
        allItems.push({
            type: typeLabels[req.request_type] || req.request_type,
            user: `用户${req.user_id}`,
            title: req.book_title || '未知书籍',
            extra: '-',
            time: new Date(req.request_time || 0),
            status: statusLabels[req.status] || req.status
        });
    });
    
    (currentReviews || []).forEach(review => {
        allItems.push({
            type: '读后感',
            user: review.user_name || `用户${review.user_id}`,
            title: review.book_title || '未知书籍',
            extra: `评分: ${review.rating || 5}星`,
            time: new Date(review.created_at || 0),
            status: statusLabels[review.status] || review.status
        });
    });
    
    allItems.sort((a, b) => b.time - a.time);
    
    allItems.forEach(item => {
        const title = (item.title || '').replace(/"/g, '""');
        const time = formatDateTime(item.time.toISOString());
        csv += `${item.type},"${item.user}","${title}","${item.extra}",${time},${item.status}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `审核记录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

function exportReviews() {
    if (!currentReviews || currentReviews.length === 0) {
        alert('暂无数据可导出');
        return;
    }
    
    const statusLabels = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝'
    };
    
    let csv = '\uFEFF读后感ID,用户,书籍名称,评分,内容,提交时间,状态\n';
    
    currentReviews.forEach(review => {
        const status = statusLabels[review.status] || review.status;
        const title = (review.book_title || '').replace(/"/g, '""');
        const content = (review.content || '').replace(/"/g, '""').replace(/\n/g, ' ');
        const time = formatDateTime(review.created_at);
        
        csv += `${review.review_id},"${review.user_name || '用户' + review.user_id}","${title}",${review.rating || 5},"${content}",${time},${status}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `读后感记录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

async function showReviewDetail(reviewId) {
    const review = currentReviews.find(r => r.review_id === reviewId);
    if (!review) {
        alert('读后感不存在');
        return;
    }
    
    const stars = '★'.repeat(review.rating || 5) + '☆'.repeat(5 - (review.rating || 5));
    const content = document.getElementById('modal-detail-content');
    const footer = document.getElementById('modal-detail-footer');
    
    content.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">类型</span>
            <span class="detail-value"><span class="request-type review">读后感</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">状态</span>
            <span class="detail-value"><span class="status-badge ${review.status}">${getStatusLabel(review.status)}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">用户</span>
            <span class="detail-value">${review.user_name || '用户' + review.user_id}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">书籍</span>
            <span class="detail-value">${review.book_title || '未知书籍'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">评分</span>
            <span class="detail-value" style="color: #F59E0B;">${stars}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">提交时间</span>
            <span class="detail-value">${formatDateTime(review.created_at)}</span>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">读后感内容</div>
            <div style="padding: 1rem; background: #f5f5f5; border-radius: 8px; white-space: pre-wrap;">${review.content || '无内容'}</div>
        </div>
    `;
    
    if (review.status === 'pending') {
        footer.innerHTML = `
            <button class="btn-cancel" onclick="closeModal('modal-detail')">关闭</button>
            <button class="btn-reject" onclick="closeModal('modal-detail'); showRejectReviewModal(${reviewId})">拒绝</button>
            <button class="btn-confirm" onclick="closeModal('modal-detail'); approveReview(${reviewId}, 'approve')">
                <i class="fas fa-check"></i> 通过
            </button>
        `;
    } else {
        footer.innerHTML = `<button class="btn-cancel" onclick="closeModal('modal-detail')">关闭</button>`;
    }
    
    document.getElementById('modal-detail').classList.add('show');
}

async function approveReview(reviewId, action) {
    if (!confirm(action === 'approve' ? '确定要通过该读后感吗？' : '确定要拒绝该读后感吗？')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/reviews/${reviewId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(action === 'approve' ? '已通过' : '已拒绝');
            loadReviews(document.getElementById('filter-status').value);
            loadPendingCount();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('审核失败:', err);
        alert('操作失败');
    }
}

function showRejectReviewModal(reviewId) {
    currentRejectReviewId = reviewId;
    document.getElementById('reject-reason').value = '';
    document.getElementById('modal-reject').classList.add('show');
}