let notifyPage = 1;
let pageSize = 10;
let selectedRecords = new Set();
let currentRecords = [];
let currentNotifyRecord = null;
let filteredTotal = 0;
let isAllSelected = false;
let notifyFilters = { status: '', phone: '', book: '' };

const templates = {
    due_reminder: {
        title: '您有图书即将到期',
        content: '您好，您借阅的《{书名}》将于{到期日}到期，请及时归还，以免产生逾期费用。',
        type: 'due_reminder'
    },
    overdue: {
        title: '您有图书已逾期',
        content: '您好，您借阅的《{书名}》已于{到期日}逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。',
        type: 'due_reminder'
    },
    pickup: {
        title: '您预约的图书已可取',
        content: '您好，您预约的《{书名}》已有可借副本，请于7个工作日内前往图书馆取书。',
        type: 'reservation'
    },
    activity: {
        title: '图书馆活动邀请',
        content: '您好！图书馆近期将举办读书分享活动，诚邀您参加。活动详情请关注图书馆公告。',
        type: 'news'
    }
};

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

async function loadStats() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/borrow/status-stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            document.getElementById('stat-borrowed').textContent = data.stats.borrowed || 0;
            document.getElementById('stat-overdue').textContent = data.stats.overdue || 0;
            document.getElementById('stat-due-today').textContent = data.stats.due_today || 0;
            document.getElementById('stat-pending-pickup').textContent = data.stats.pending_pickup || 0;
        }
    } catch (err) {
        console.error('加载统计失败:', err);
    }
}

async function loadRecords(page = 1) {
    notifyPage = page;
    const token = localStorage.getItem('token');
    const status = document.getElementById('filter-status').value;
    const phone = document.getElementById('search-phone').value.trim();
    const book = document.getElementById('search-book').value.trim();
    
    notifyFilters = { status, phone, book };
    
    const tbody = document.getElementById('records-list');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>';
    
    try {
        let url = `/api/admin/borrow/users-list?page=${page}&page_size=${pageSize}`;
        if (status) url += `&status=${status}`;
        if (phone) url += `&phone=${encodeURIComponent(phone)}`;
        if (book) url += `&book=${encodeURIComponent(book)}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            currentRecords = data.records;
            filteredTotal = data.pagination.total;
            renderRecords(data.records);
            renderPagination(data.pagination);
            updateBatchBar();
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">加载失败: ${data.message}</td></tr>`;
        }
    } catch (err) {
        console.error('加载记录失败:', err);
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">加载失败</td></tr>';
    }
}

function renderRecords(records) {
    const tbody = document.getElementById('records-list');
    
    if (!records || records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    <i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                    暂无借阅记录
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = records.map(record => {
        const statusClass = getStatusClass(record);
        const statusText = getStatusText(record);
        const isPendingPickup = statusClass === 'pending-pickup';
        const isBorrowed = statusClass === 'borrowed' || statusClass === 'overdue' || statusClass === 'due-today';
        
        return `
        <tr data-id="${record.record_id}" data-status="${statusClass}">
            <td class="col-checkbox">
                <input type="checkbox" 
                       class="record-checkbox" 
                       data-id="${record.record_id}"
                       data-status="${statusClass}"
                       ${selectedRecords.has(record.record_id) ? 'checked' : ''}
                       onchange="toggleSelect(${record.record_id}, this.checked)">
            </td>
            <td class="col-user">
                <div class="user-info-cell">
                    <div class="user-phone">${record.user_phone || '用户' + record.user_id}</div>
                </div>
            </td>
            <td class="col-book">
                <div class="book-info-cell">
                    <img class="book-cover" src="${record.book_cover || 'https://via.placeholder.com/40x56?text=Book'}" alt="cover">
                    <div class="book-text">
                        <div class="book-title">${record.book_title || '未知书籍'}</div>
                        <div class="book-author">${record.book_author || ''}</div>
                    </div>
                </div>
            </td>
            <td class="col-time">${formatDate(record.borrow_time)}</td>
            <td class="col-due">
                <span class="${isOverdue(record.due_time) && !isPendingPickup ? 'text-danger' : ''}">${isPendingPickup ? '-' : formatDate(record.due_time)}</span>
            </td>
            <td class="col-status">
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td class="col-actions">
                <div class="table-actions">
                    ${isPendingPickup ? `
                        <button class="btn-pickup" onclick="confirmPickup(${record.record_id})" title="确认取书">
                            <i class="fas fa-hand-holding"></i>
                        </button>
                    ` : ''}
                    ${isBorrowed ? `
                        <button class="btn-return" onclick="confirmReturn(${record.record_id})" title="确认还书">
                            <i class="fas fa-undo"></i>
                        </button>
                    ` : ''}
                    <button class="btn-notify" onclick="showNotifyModal(${record.record_id})" title="发送通知">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function getStatusClass(record) {
    if (record.status === 'pending-pickup') return 'pending-pickup';
    if (record.status === 'returned') return 'returned';
    if (record.status === 'picked_up') return 'picked-up';
    if (isOverdue(record.due_time)) return 'overdue';
    if (isDueToday(record.due_time)) return 'due-today';
    return 'borrowed';
}

function getStatusText(record) {
    if (record.status === 'pending-pickup') return '待取书';
    if (record.status === 'returned') return '已归还';
    if (record.status === 'picked_up') return '已取书';
    if (isOverdue(record.due_time)) return '已逾期';
    if (isDueToday(record.due_time)) return '今日到期';
    return '借阅中';
}

function isOverdue(dueTime) {
    if (!dueTime) return false;
    const due = new Date(dueTime);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return due < now;
}

function isDueToday(dueTime) {
    if (!dueTime) return false;
    const due = new Date(dueTime);
    const now = new Date();
    return due.toDateString() === now.toDateString();
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, pages, total } = pagination;
    
    if (pages <= 1) {
        container.innerHTML = `<span class="pagination-info">共 ${total} 条</span>`;
        return;
    }
    
    let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="loadRecords(${page - 1})">上一页</button>`;
    
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    if (startPage > 1) html += `<button onclick="loadRecords(1)">1</button>`;
    if (startPage > 2) html += '<span>...</span>';
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="loadRecords(${i})">${i}</button>`;
    }
    
    if (endPage < pages - 1) html += '<span>...</span>';
    if (endPage < pages) html += `<button onclick="loadRecords(${pages})">${pages}</button>`;
    
    html += `<button ${page >= pages ? 'disabled' : ''} onclick="loadRecords(${page + 1})">下一页</button>`;
    html += `<span class="pagination-info">共 ${total} 条</span>`;
    
    container.innerHTML = html;
}

function filterByStatus(status) {
    document.getElementById('filter-status').value = status;
    document.getElementById('search-phone').value = '';
    document.getElementById('search-book').value = '';
    selectedRecords.clear();
    isAllSelected = false;
    loadRecords(1);
}

function resetFilters() {
    document.getElementById('filter-status').value = '';
    document.getElementById('search-phone').value = '';
    document.getElementById('search-book').value = '';
    selectedRecords.clear();
    isAllSelected = false;
    loadRecords(1);
}

function toggleSelect(id, checked) {
    if (checked) {
        selectedRecords.add(id);
    } else {
        selectedRecords.delete(id);
    }
    updateBatchBar();
}

function toggleSelectAll(checked) {
    if (isAllSelected) {
        clearSelection();
        return;
    }
    
    const checkboxes = document.querySelectorAll('.record-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        const id = parseInt(cb.dataset.id);
        if (checked) {
            selectedRecords.add(id);
        } else {
            selectedRecords.delete(id);
        }
    });
    
    const selectAll = document.getElementById('select-all');
    const selectAllHeader = document.getElementById('select-all-header');
    if (selectAll) selectAll.checked = checked;
    if (selectAllHeader) selectAllHeader.checked = checked;
    
    updateBatchBar();
}

async function selectAllFiltered() {
    const token = localStorage.getItem('token');
    const { status, phone, book } = notifyFilters;
    
    try {
        let url = '/api/admin/borrow/records/ids?';
        if (status) url += `status=${status}&`;
        if (phone) url += `phone=${encodeURIComponent(phone)}&`;
        if (book) url += `book=${encodeURIComponent(book)}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            selectedRecords = new Set(data.record_ids);
            isAllSelected = true;
            
            const checkboxes = document.querySelectorAll('.record-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = true;
            });
            
            const selectAll = document.getElementById('select-all');
            const selectAllHeader = document.getElementById('select-all-header');
            if (selectAll) selectAll.checked = true;
            if (selectAllHeader) selectAllHeader.checked = true;
            
            updateBatchBar();
        } else {
            alert(data.message || '获取数据失败');
        }
    } catch (err) {
        console.error('全选失败:', err);
        alert('操作失败');
    }
}

function clearSelection() {
    selectedRecords.clear();
    isAllSelected = false;
    
    const checkboxes = document.querySelectorAll('.record-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
    });
    
    const selectAll = document.getElementById('select-all');
    const selectAllHeader = document.getElementById('select-all-header');
    if (selectAll) selectAll.checked = false;
    if (selectAllHeader) selectAllHeader.checked = false;
    
    updateBatchBar();
}

function updateBatchBar() {
    const bar = document.getElementById('batch-action-bar');
    const countEl = document.getElementById('selected-count');
    const selectAllBtn = document.getElementById('select-all-btn');
    const totalInfo = document.getElementById('total-info');
    
    if (selectedRecords.size > 0 || isAllSelected) {
        bar.style.display = 'flex';
        countEl.textContent = selectedRecords.size;
        
        if (totalInfo) {
            totalInfo.textContent = `（共 ${filteredTotal} 条符合条件）`;
        }
        
        if (selectAllBtn) {
            if (isAllSelected) {
                selectAllBtn.textContent = '清除选择';
                selectAllBtn.onclick = clearSelection;
            } else if (selectedRecords.size < filteredTotal) {
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

function showNotifyModal(recordId) {
    const record = currentRecords.find(r => r.record_id === recordId);
    if (!record) return;
    
    currentNotifyRecord = record;
    
    const targetInfo = document.getElementById('notify-target-info');
    targetInfo.innerHTML = `
        <div class="target-card">
            <div class="target-row">
                <span class="target-label">用户：</span>
                <span class="target-value">${record.user_phone || '用户' + record.user_id}</span>
            </div>
            <div class="target-row">
                <span class="target-label">图书：</span>
                <span class="target-value">《${record.book_title || '未知'}》</span>
            </div>
            <div class="target-row">
                <span class="target-label">到期日：</span>
                <span class="target-value">${formatDate(record.due_time)}</span>
            </div>
        </div>
    `;
    
    const autoTemplate = isOverdue(record.due_time) ? 'overdue' : 'due_reminder';
    selectTemplate(autoTemplate);
    
    document.getElementById('modal-notify').classList.add('show');
}

function selectTemplate(templateKey) {
    const template = templates[templateKey];
    if (!template) return;
    
    document.getElementById('notify-title').value = template.title;
    
    let content = template.content;
    if (currentNotifyRecord) {
        content = content
            .replace('{书名}', currentNotifyRecord.book_title || '未知')
            .replace('{到期日}', formatDate(currentNotifyRecord.due_time))
            .replace('{借阅日期}', formatDate(currentNotifyRecord.borrow_time));
    }
    document.getElementById('notify-content').value = content;
    
    document.querySelectorAll('.template-btn').forEach(btn => btn.classList.remove('active'));
}

function showBatchNotifyModal() {
    if (selectedRecords.size === 0) {
        alert('请先选择要发送通知的记录');
        return;
    }
    
    const uniqueUsers = new Set();
    selectedRecords.forEach(id => {
        const record = currentRecords.find(r => r.record_id === id);
        if (record) uniqueUsers.add(record.user_id);
    });
    
    document.getElementById('batch-notify-count').textContent = selectedRecords.size;
    document.getElementById('batch-user-count').textContent = uniqueUsers.size;
    
    document.getElementById('batch-notify-title').value = '';
    document.getElementById('batch-notify-content').value = '';
    
    document.querySelectorAll('#modal-batch-notify .template-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById('modal-batch-notify').classList.add('show');
}

function selectBatchTemplate(templateKey) {
    const template = templates[templateKey];
    if (!template) return;
    
    document.getElementById('batch-notify-title').value = template.title;
    document.getElementById('batch-notify-content').value = template.content;
    
    document.querySelectorAll('#modal-batch-notify .template-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

async function sendNotification() {
    const title = document.getElementById('notify-title').value.trim();
    const content = document.getElementById('notify-content').value.trim();
    
    if (!title) {
        alert('请输入通知标题');
        return;
    }
    if (!content) {
        alert('请输入通知内容');
        return;
    }
    if (!currentNotifyRecord) {
        alert('未选择发送对象');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/notifications/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentNotifyRecord.user_id,
                title: title,
                content: content,
                type: 'system'
            })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('通知发送成功');
            closeModal('modal-notify');
        } else {
            alert(data.message || '发送失败');
        }
    } catch (err) {
        console.error('发送通知失败:', err);
        alert('发送失败');
    }
}

async function sendBatchNotification() {
    const title = document.getElementById('batch-notify-title').value.trim();
    const content = document.getElementById('batch-notify-content').value.trim();
    
    if (!title) {
        alert('请输入通知标题');
        return;
    }
    if (!content) {
        alert('请输入通知内容');
        return;
    }
    if (selectedRecords.size === 0) {
        alert('请先选择要发送通知的记录');
        return;
    }
    
    const recordIds = Array.from(selectedRecords);
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/notifications/batch-send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                record_ids: recordIds,
                title: title,
                content: content,
                type: 'system'
            })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(`成功发送 ${data.sent_count || recordIds.length} 条通知`);
            closeModal('modal-batch-notify');
            selectedRecords.clear();
            isAllSelected = false;
            loadRecords(notifyPage);
        } else {
            alert(data.message || '发送失败');
        }
    } catch (err) {
        console.error('批量发送失败:', err);
        alert('发送失败');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

document.addEventListener('DOMContentLoaded', async () => {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return;
    
    loadAdminInfo();
    loadStats();
    loadRecords(1);
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });
});

document.getElementById('search-phone').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') loadRecords(1);
});

document.getElementById('search-book').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') loadRecords(1);
});

async function confirmPickup(requestId) {
    if (!confirm('确认该用户已取书？')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/borrow/${requestId}/confirm-pickup`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('取书确认成功');
            loadStats();
            loadRecords(notifyPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('确认取书失败:', err);
        alert('操作失败');
    }
}

async function batchConfirmPickup() {
    let pickupIds = [];
    
    if (isAllSelected) {
        const allIds = await fetchAllRecordIds();
        pickupIds = allIds;
    } else {
        selectedRecords.forEach(id => {
            const record = currentRecords.find(r => r.record_id === id);
            if (record && record.status === 'pending-pickup') {
                pickupIds.push(id);
            }
        });
    }
    
    if (pickupIds.length === 0) {
        alert('请选择待取书的记录');
        return;
    }
    
    if (!confirm(`确认为选中的 ${pickupIds.length} 条记录确认取书？`)) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/borrow/batch-confirm-pickup', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ request_ids: pickupIds })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(data.message);
            selectedRecords.clear();
            isAllSelected = false;
            loadStats();
            loadRecords(notifyPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批量确认取书失败:', err);
        alert('操作失败');
    }
}

async function confirmReturn(recordId) {
    if (!confirm('确认该用户已还书？')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/borrow/${recordId}/confirm-return`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('还书确认成功');
            loadStats();
            loadRecords(notifyPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('确认还书失败:', err);
        alert('操作失败');
    }
}

async function batchConfirmReturn() {
    let returnIds = [];
    
    if (isAllSelected) {
        const allIds = await fetchAllRecordIds();
        returnIds = allIds;
    } else {
        selectedRecords.forEach(id => {
            const record = currentRecords.find(r => r.record_id === id);
            if (record && record.status !== 'pending-pickup' && record.status !== 'returned') {
                returnIds.push(id);
            }
        });
    }
    
    if (returnIds.length === 0) {
        alert('请选择借阅中的记录');
        return;
    }
    
    if (!confirm(`确认为选中的 ${returnIds.length} 条记录确认还书？`)) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/borrow/batch-confirm-return', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ record_ids: returnIds })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(data.message);
            selectedRecords.clear();
            isAllSelected = false;
            loadStats();
            loadRecords(notifyPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批量确认还书失败:', err);
        alert('操作失败');
    }
}

async function fetchAllRecordIds() {
    const token = localStorage.getItem('token');
    const { status, phone, book } = notifyFilters;
    
    let url = '/api/admin/borrow/records/ids?';
    if (status) url += `status=${status}&`;
    if (phone) url += `phone=${encodeURIComponent(phone)}&`;
    if (book) url += `book=${encodeURIComponent(book)}`;
    
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        return data.ok ? data.record_ids : [];
    } catch (err) {
        console.error('获取记录ID失败:', err);
        return [];
    }
}