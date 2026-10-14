// 检查管理员权限
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

// 加载统计数据
async function loadStats() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            document.getElementById('total-books').textContent = data.stats.total_books || 0;
            document.getElementById('total-users').textContent = data.stats.total_users || 0;
            document.getElementById('active-borrows').textContent = data.stats.active_borrows || 0;
            document.getElementById('pending-requests').textContent = data.stats.pending_requests || 0;
            document.getElementById('pending-count').textContent = data.stats.pending_requests || 0;
            
            // 更新趋势文字
            document.getElementById('books-trend').textContent = `共 ${data.stats.total_books || 0} 本`;
            document.getElementById('users-trend').textContent = `共 ${data.stats.total_users || 0} 人`;
            document.getElementById('borrows-trend').textContent = `今日 ${data.stats.today_borrows || 0} 本`;
            
            // 如果有待审核申请，添加紧急样式
            if (data.stats.pending_requests > 0) {
                document.getElementById('pending-trend').classList.add('urgent');
            }
        }
    } catch (err) {
        console.error('加载统计数据失败:', err);
    }
}

// 加载借阅趋势图
async function loadBorrowTrendChart() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/stats/borrow-trend', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        const ctx = document.getElementById('borrowTrendChart').getContext('2d');
        
        let labels = [];
        let values = [];
        
        if (data.ok && data.trend) {
            labels = data.trend.map(item => item.date);
            values = data.trend.map(item => item.count);
        } else {
            // 默认数据
            const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            labels = days;
            values = [12, 19, 15, 25, 22, 30, 28];
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '借阅数量',
                    data: values,
                    borderColor: '#4A86E8',
                    backgroundColor: 'rgba(74, 134, 232, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4A86E8',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('加载借阅趋势图失败:', err);
    }
}

// 加载分类占比图
async function loadCategoryChart() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/stats/category-distribution', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        let labels = [];
        let values = [];
        
        if (data.ok && data.categories) {
            labels = data.categories.map(item => item.name);
            values = data.categories.map(item => item.count);
        } else {
            // 默认数据
            labels = ['文学小说', '科技', '历史', '艺术', '其他'];
            values = [35, 25, 18, 12, 10];
        }
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#4A86E8',
                        '#38A169',
                        '#DD6B20',
                        '#9F7AEA',
                        '#A0AEC0'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '60%'
            }
        });
    } catch (err) {
        console.error('加载分类占比图失败:', err);
    }
}

// 加载待审核申请列表
async function loadPendingRequests() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('pending-requests-list');
    
    try {
        const res = await fetch('/api/admin/borrow/requests?status=pending&page_size=5', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok && data.requests && data.requests.length > 0) {
            container.innerHTML = data.requests.map(req => `
                <div class="request-item">
                    <span class="request-type ${req.request_type}">${getTypeLabel(req.request_type)}</span>
                    <div class="request-info">
                        <div class="book-title">${req.book_title || '未知书籍'}</div>
                        <div class="user-name">申请人: ${req.user_phone || `用户${req.user_id}`}</div>
                    </div>
                    <div class="request-time">${formatTime(req.request_time)}</div>
                    <div class="request-actions">
                        <button class="btn-approve" onclick="quickApprove(${req.request_id})">批准</button>
                        <button class="btn-reject" onclick="quickReject(${req.request_id})">拒绝</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-placeholder">
                    <i class="fas fa-check-circle"></i>
                    <p>暂无待审核申请</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('加载待审核申请失败:', err);
        container.innerHTML = '<div class="loading-placeholder">加载失败</div>';
    }
}

// 快速批准
async function quickApprove(requestId) {
    const token = localStorage.getItem('token');
    
    if (!confirm('确定要批准该申请吗？')) return;
    
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
            loadPendingRequests();
            loadStats();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批准失败:', err);
        alert('操作失败');
    }
}

// 快速拒绝
async function quickReject(requestId) {
    const token = localStorage.getItem('token');
    const reason = prompt('请输入拒绝原因:');
    
    if (!reason) return;
    
    try {
        const res = await fetch(`/api/admin/borrow/requests/${requestId}/reject`, {
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
            loadPendingRequests();
            loadStats();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('拒绝失败:', err);
        alert('操作失败');
    }
}

// 获取申请类型标签
function getTypeLabel(type) {
    const labels = {
        'borrow': '借书',
        'return': '还书',
        'renew': '续借',
        'lost': '挂失'
    };
    return labels[type] || type;
}

// 格式化时间
function formatTime(timeStr) {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return;
    
    loadAdminInfo();
    loadStats();
    loadBorrowTrendChart();
    loadCategoryChart();
    loadPendingRequests();
});