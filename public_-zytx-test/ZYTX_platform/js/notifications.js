let notificationsContainer = null;
let allNotifications = [];
let selectedIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
    notificationsContainer = document.querySelector('.notifications-container') || document.getElementById('notifications-list');
    loadNotifications();
    initBatchActions();
});

async function loadNotifications() {
    if (!notificationsContainer) return;
    
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userId = user ? (user.user_id || user.id) : null;
    if (!userId) return;
    
    try {
        const res = await fetch(`/api/notifications?user_id=${userId}`);
        const data = await res.json();
        
        if (res.ok && data.ok) {
            allNotifications = data.notifications || [];
            selectedIds.clear();
            renderNotifications();
            updateNotificationCount();
        }
    } catch (err) {
        console.error('加载通知失败', err);
    }
}

function renderNotifications() {
    if (!notificationsContainer) return;
    
    if (allNotifications.length === 0) {
        notificationsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>暂无通知</p></div>';
        return;
    }
    
    notificationsContainer.innerHTML = allNotifications.map(n => {
        const typeClass = getTypeClass(n.type);
        const iconClass = getTypeIcon(n.type);
        const typeLabel = getTypeLabel(n.type);
        const time = n.created_at ? new Date(n.created_at).toLocaleString('zh-CN') : '';
        
        return `
            <div class="notification-item ${typeClass} ${n.is_read ? '' : 'unread'}" data-id="${n.notification_id}">
                <div class="notification-checkbox">
                    <input type="checkbox" class="notif-checkbox" data-id="${n.notification_id}">
                </div>
                <div class="icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="content">
                    <div class="notification-type">${typeLabel}</div>
                    <div class="title">${n.title || '通知'}</div>
                    <div class="message">${n.content || ''}</div>
                    <div class="time">${time}</div>
                </div>
                <div class="notification-actions">
                    ${n.is_read ? '' : '<button class="mark-read-btn" data-id="' + n.notification_id + '"><i class="fas fa-check"></i> 已读</button>'}
                    <button class="delete-btn" data-id="${n.notification_id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
    
    bindNotificationEvents();
}

function getTypeClass(type) {
    const typeMap = {
        'system': 'system-notification',
        'activity': 'event-notification',
        'borrow': 'borrow-notification',
        'return': 'return-notification',
        'default': 'admin-notification'
    };
    return typeMap[type] || typeMap['default'];
}

function getTypeIcon(type) {
    const iconMap = {
        'system': 'fas fa-cog',
        'activity': 'fas fa-calendar-alt',
        'borrow': 'fas fa-book',
        'return': 'fas fa-undo',
        'default': 'fas fa-bell'
    };
    return iconMap[type] || iconMap['default'];
}

function getTypeLabel(type) {
    const labelMap = {
        'system': '系统通知',
        'activity': '活动通知',
        'borrow': '借阅通知',
        'return': '归还通知',
        'default': '通知'
    };
    return labelMap[type] || labelMap['default'];
}

function bindNotificationEvents() {
    document.querySelectorAll('.notif-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            if (this.checked) {
                selectedIds.add(id);
            } else {
                selectedIds.delete(id);
            }
            updateBatchButtons();
        });
    });
    
    document.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            await markAsRead(id);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            if (confirm('确定删除此通知吗？')) {
                await deleteNotification(id);
            }
        });
    });
}

async function markAsRead(notificationId) {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userId = user ? (user.user_id || user.id) : null;
    
    try {
        await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        
        const notif = allNotifications.find(n => n.notification_id == notificationId);
        if (notif) notif.is_read = true;
        
        renderNotifications();
        updateNotificationCount();
    } catch (err) {
        console.error('标记已读失败', err);
    }
}

async function deleteNotification(notificationId) {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userId = user ? (user.user_id || user.id) : null;
    
    try {
        const res = await fetch(`/api/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await res.json();
        
        if (data.ok) {
            allNotifications = allNotifications.filter(n => n.notification_id != notificationId);
            selectedIds.delete(parseInt(notificationId));
            renderNotifications();
            updateNotificationCount();
        }
    } catch (err) {
        console.error('删除通知失败', err);
    }
}

function initBatchActions() {
    const selectAllBtn = document.getElementById('select-all-btn');
    const batchReadBtn = document.getElementById('batch-read-btn');
    const batchDeleteBtn = document.getElementById('batch-delete-btn');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', toggleSelectAll);
    }
    
    if (batchReadBtn) {
        batchReadBtn.addEventListener('click', batchMarkRead);
    }
    
    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', batchDelete);
    }
}

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.notif-checkbox');
    const selectAllBtn = document.getElementById('select-all-btn');
    const allSelected = selectedIds.size === allNotifications.length;
    
    checkboxes.forEach(cb => {
        cb.checked = !allSelected;
        const id = parseInt(cb.dataset.id);
        if (!allSelected) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
    });
    
    if (selectAllBtn) {
        selectAllBtn.innerHTML = allSelected ? '<i class="fas fa-check-square"></i> 全选' : '<i class="fas fa-square"></i> 取消全选';
    }
    
    updateBatchButtons();
}

function updateBatchButtons() {
    const batchReadBtn = document.getElementById('batch-read-btn');
    const batchDeleteBtn = document.getElementById('batch-delete-btn');
    const count = selectedIds.size;
    
    if (batchReadBtn) {
        batchReadBtn.disabled = count === 0;
        batchReadBtn.innerHTML = count > 0 ? `<i class="fas fa-check-double"></i> 标记已读(${count})` : '<i class="fas fa-check-double"></i> 标记已读';
    }
    
    if (batchDeleteBtn) {
        batchDeleteBtn.disabled = count === 0;
        batchDeleteBtn.innerHTML = count > 0 ? `<i class="fas fa-trash"></i> 删除(${count})` : '<i class="fas fa-trash"></i> 删除';
    }
}

async function batchMarkRead() {
    if (selectedIds.size === 0) return;
    
    try {
        const { res, data } = await fetchJson('/api/notifications/batch-read', {
            method: 'POST',
            body: JSON.stringify({
                notification_ids: Array.from(selectedIds)
            })
        });
        
        if (res && res.ok && data && data.ok) {
            selectedIds.forEach(id => {
                const notif = allNotifications.find(n => n.notification_id === id);
                if (notif) notif.is_read = true;
            });
            selectedIds.clear();
            renderNotifications();
            updateNotificationCount();
            updateBatchButtons();
        }
    } catch (err) {
        console.error('批量标记已读失败', err);
    }
}

async function batchDelete() {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条通知吗？`)) return;
    
    try {
        const { res, data } = await fetchJson('/api/notifications/batch-delete', {
            method: 'POST',
            body: JSON.stringify({
                notification_ids: Array.from(selectedIds)
            })
        });
        
        if (data.ok) {
            allNotifications = allNotifications.filter(n => !selectedIds.has(n.notification_id));
            selectedIds.clear();
            renderNotifications();
            updateNotificationCount();
            updateBatchButtons();
        }
    } catch (err) {
        console.error('批量删除失败', err);
    }
}

function updateNotificationCount() {
    const unreadCount = allNotifications.filter(n => !n.is_read).length;
    const countEl = document.querySelector('.notification-count');
    if (countEl) {
        countEl.textContent = unreadCount > 0 ? `共${unreadCount}条未读通知` : '暂无未读通知';
    }
}