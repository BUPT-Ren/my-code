document.addEventListener('DOMContentLoaded', () => {
    loadActivities();
    
    const searchInput = document.getElementById('search-keyword');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                loadActivities();
            }
        });
    }
});

async function loadActivities() {
    const container = document.getElementById('activities-list');
    const status = document.getElementById('filter-status').value;
    const keyword = document.getElementById('search-keyword')?.value?.trim() || '';
    
    container.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
    
    try {
        let url = `/api/activities?page=${currentPage}&per_page=12`;
        if (status) url += `&status=${status}`;
        if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (res.ok && data.ok) {
            if (keyword && data.activities) {
                data.activities = data.activities.filter(a => 
                    (a.title && a.title.includes(keyword)) || 
                    (a.location && a.location.includes(keyword))
                );
            }
            await renderActivities(data.activities || []);
            renderPagination(data.pagination);
        } else {
            container.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>${data.message || '加载失败'}</p></div>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>加载失败，请检查网络或后端服务</p></div>';
    }
}

function resetFilters() {
    document.getElementById('filter-status').value = '';
    const searchInput = document.getElementById('search-keyword');
    if (searchInput) searchInput.value = '';
    currentPage = 1;
    loadActivities();
}

async function renderActivities(activities) {
    const container = document.getElementById('activities-list');
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>暂无活动</p></div>';
        return;
    }
    
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const token = localStorage.getItem('token');
    
    const registrationStatuses = {};
    
    if (user && token) {
        const promises = activities.map(async (activity) => {
            if (activity.status === 'published' || activity.status === 'ongoing') {
                try {
                    const res = await fetch(`/api/activities/${activity.activity_id}/my-registration`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.ok && data.registered && data.registration) {
                        registrationStatuses[activity.activity_id] = data.registration.status;
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        });
        await Promise.all(promises);
    }
    
    container.innerHTML = activities.map(activity => {
        const startTime = activity.start_time ? new Date(activity.start_time).toLocaleString('zh-CN') : '-';
        const statusClass = activity.status;
        const statusText = {
            'draft': '草稿',
            'published': '报名中',
            'ongoing': '进行中',
            'ended': '已结束'
        }[activity.status] || activity.status;
        
        let actionHtml = '';
        if ((activity.status === 'published' || activity.status === 'ongoing') && user) {
            const regStatus = registrationStatuses[activity.activity_id];
            
            const now = new Date();
            const regStart = activity.registration_start_time ? new Date(activity.registration_start_time) : null;
            const regEnd = activity.registration_end_time ? new Date(activity.registration_end_time) : null;
            
            if (!regStatus || regStatus === 'cancelled' || regStatus === 'rejected') {
                let btnDisabled = '';
                let btnText = '立即报名';
                
                if (regStart && now < regStart) {
                    btnDisabled = 'disabled';
                    btnText = '未开始';
                } else if (regEnd && now > regEnd) {
                    btnDisabled = 'disabled';
                    btnText = '已结束';
                }
                
                actionHtml = `
                    <div class="activity-card-footer">
                        <button class="btn-card-register" ${btnDisabled} onclick="event.stopPropagation(); quickRegister(${activity.activity_id})">${btnText}</button>
                    </div>
                `;
            } else if (regStatus === 'pending') {
                actionHtml = `
                    <div class="activity-card-footer">
                        <button class="btn-card-cancel" onclick="event.stopPropagation(); quickCancel(${activity.activity_id})">取消报名</button>
                    </div>
                `;
            } else if (regStatus === 'approved') {
                actionHtml = `
                    <div class="activity-card-footer">
                        <button class="btn-card-cancel" onclick="event.stopPropagation(); quickCancel(${activity.activity_id})">取消报名</button>
                    </div>
                `;
            }
        } else if ((activity.status === 'published' || activity.status === 'ongoing') && !user) {
            actionHtml = `
                <div class="activity-card-footer">
                    <button class="btn-card-register" onclick="event.stopPropagation(); window.location.href='login.html'">登录后报名</button>
                </div>
            `;
        }
        
        const regStartTime = activity.registration_start_time ? new Date(activity.registration_start_time).toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : '未设置';
        const regEndTime = activity.registration_end_time ? new Date(activity.registration_end_time).toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : '未设置';
        
        return `
            <div class="activity-card" onclick="goToActivity(${activity.activity_id})">
                <div class="activity-cover">
                    ${activity.cover_image ? `<img src="${activity.cover_image}" alt="${activity.title}">` : ''}
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="activity-info">
                    <h3>${activity.title}</h3>
                    <div class="activity-meta">
                        <span><i class="fas fa-clock"></i> ${startTime}</span>
                    </div>
                    <div class="activity-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${activity.location || '待定'}</span>
                    </div>
                    <div class="activity-meta">
                        <span><i class="fas fa-ticket-alt"></i> 报名：${regStartTime} ~ ${regEndTime}</span>
                    </div>
                    <div class="activity-stats">
                        <div class="stat">
                            <div class="stat-value">${activity.approved_count || 0}</div>
                            <div class="stat-label">已报名</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${activity.max_participants || '不限'}</div>
                            <div class="stat-label">名额</div>
                        </div>
                    </div>
                </div>
                ${actionHtml}
            </div>
        `;
    }).join('');
}

async function quickRegister(activityId) {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('登录已过期，请重新登录');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const res = await fetch(`/api/activities/${activityId}/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await res.json();
        
        if (data.ok) {
            alert('报名成功，请等待审核');
            loadActivities();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('报名失败');
    }
}

async function quickCancel(activityId) {
    if (!confirm('确定要取消报名吗？')) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('登录已过期，请重新登录');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const res = await fetch(`/api/activities/${activityId}/cancel`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await res.json();
        
        if (data.ok) {
            alert('报名已取消');
            loadActivities();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('取消报名失败');
    }
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!pagination || pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    for (let i = 1; i <= pagination.pages; i++) {
        html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadActivities();
}

function goToActivity(id) {
    window.location.href = `activity-detail.html?id=${id}`;
}