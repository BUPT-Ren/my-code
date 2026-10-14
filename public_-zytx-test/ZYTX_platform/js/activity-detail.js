let currentActivityId = null;
let currentUserRegistration = null;
let isAdminMode = false;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentActivityId = urlParams.get('id');
    isAdminMode = urlParams.get('admin') === '1';
    
    if (currentActivityId) {
        loadActivityDetail();
    } else {
        document.getElementById('activity-detail').innerHTML = '<div class="error-message">活动不存在</div>';
    }
});

async function loadActivityDetail() {
    const container = document.getElementById('activity-detail');
    
    try {
        const res = await fetch(`/api/activities/${currentActivityId}`);
        const data = await res.json();
        
        if (data.ok) {
            renderActivityDetail(data.activity);
        } else {
            container.innerHTML = `<div class="error-message">${data.message}</div>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="error-message">加载失败</div>';
    }
}

async function renderActivityDetail(activity) {
    const container = document.getElementById('activity-detail');
    const startTime = activity.start_time ? new Date(activity.start_time).toLocaleString('zh-CN') : '-';
    const endTime = activity.end_time ? new Date(activity.end_time).toLocaleString('zh-CN') : '-';
    const regStartTime = activity.registration_start_time ? new Date(activity.registration_start_time).toLocaleString('zh-CN') : '未设置';
    const regEndTime = activity.registration_end_time ? new Date(activity.registration_end_time).toLocaleString('zh-CN') : '未设置';
    
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userId = user ? (user.user_id || user.id) : null;
    
    const now = new Date();
    const regStart = activity.registration_start_time ? new Date(activity.registration_start_time) : null;
    const regEnd = activity.registration_end_time ? new Date(activity.registration_end_time) : null;
    
    let canRegister = true;
    let regStatusText = '';
    if (regStart && now < regStart) {
        canRegister = false;
        regStatusText = '报名尚未开始';
    } else if (regEnd && now > regEnd) {
        canRegister = false;
        regStatusText = '报名已结束';
    }
    
    let registrationHtml = '';
    
    if (!isAdminMode && (activity.status === 'published' || activity.status === 'ongoing')) {
        if (userId) {
            const token = localStorage.getItem('token');
            try {
                const regRes = await fetch(`/api/activities/${currentActivityId}/my-registration`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const regData = await regRes.json();
                
                if (regData.ok && regData.registered && regData.registration) {
                    currentUserRegistration = regData.registration;
                    const status = currentUserRegistration.status;
                    
                    if (status === 'cancelled' || status === 'rejected') {
                        const noteText = status === 'cancelled' ? '您之前的报名已取消' : '您之前的报名未通过审核';
                        let btnDisabled = canRegister ? '' : 'disabled';
                        let btnText = canRegister ? '立即报名' : regStatusText;
                        registrationHtml = `
                            <div class="register-section">
                                <h3>立即报名参与</h3>
                                <p class="registration-note">${noteText}，可重新报名</p>
                                <p>报名时间：${regStartTime} ~ ${regEndTime}</p>
                                <button class="btn-register" ${btnDisabled} onclick="registerActivity()">${btnText}</button>
                            </div>
                        `;
                    } else {
                        const statusText = {
                            'pending': '待审核',
                            'approved': '已通过'
                        }[status] || status;
                        
                        let actionBtn = '';
                        if (status === 'pending' || status === 'approved') {
                            actionBtn = `<button class="btn-cancel-register" onclick="cancelRegistration()">取消报名</button>`;
                        }
                        
                        registrationHtml = `
                            <div class="register-section">
                                <h3>${status === 'approved' ? '报名成功' : '已报名'}</h3>
                                <p>您的报名状态: <span class="registration-status ${status}">${statusText}</span></p>
                                <p>报名时间：${regStartTime} ~ ${regEndTime}</p>
                                ${actionBtn}
                            </div>
                        `;
                    }
                } else {
                    let btnDisabled = canRegister ? '' : 'disabled';
                    let btnText = canRegister ? '立即报名' : regStatusText;
                    registrationHtml = `
                        <div class="register-section">
                            <h3>立即报名参与</h3>
                            <p>名额有限，先到先得</p>
                            <p>报名时间：${regStartTime} ~ ${regEndTime}</p>
                            <button class="btn-register" ${btnDisabled} onclick="registerActivity()">${btnText}</button>
                        </div>
                    `;
                }
            } catch (e) {
                console.error(e);
                registrationHtml = `
                    <div class="register-section">
                        <h3>立即报名参与</h3>
                        <p>名额有限，先到先得</p>
                        <p>报名时间：${regStartTime} ~ ${regEndTime}</p>
                        <button class="btn-register" onclick="registerActivity()">立即报名</button>
                    </div>
                `;
            }
        } else {
            registrationHtml = `
                <div class="register-section">
                    <h3>立即报名参与</h3>
                    <p>请先登录后报名</p>
                    <p>报名时间：${regStartTime} ~ ${regEndTime}</p>
                    <button class="btn-register" onclick="window.location.href='login.html'">去登录</button>
                </div>
            `;
        }
    }
    
    let summaryHtml = '';
    if (activity.summary) {
        const likesCount = activity.summary.likes_count || 0;
        summaryHtml = `
            <div class="summary-section">
                <h2><i class="fas fa-file-alt"></i> 活动总结</h2>
                <div class="summary-content">${activity.summary.content}</div>
                ${activity.summary.images && activity.summary.images.length > 0 ? `
                    <div class="activity-gallery">
                        ${activity.summary.images.map(img => `<img src="${img}" alt="活动图片">`).join('')}
                    </div>
                ` : ''}
                <div class="summary-actions">
                    <button class="like-summary-btn" onclick="toggleSummaryLike(this)">
                        <i class="far fa-heart"></i>
                        <span class="likes-count">${likesCount}</span> 人觉得赞
                    </button>
                </div>
            </div>
        `;
    }
    
    let participantsHtml = `
        <div class="participants-section">
            <h2><i class="fas fa-users"></i> 参与成员</h2>
            <div class="participants-stats">
                <div class="stat-item">
                    <div class="stat-value" id="total-participants">-</div>
                    <div class="stat-label">总报名</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="approved-participants">-</div>
                    <div class="stat-label">已通过</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="checked-in-participants">-</div>
                    <div class="stat-label">已签到</div>
                </div>
            </div>
            <div class="participants-list" id="participants-list">
                <div class="loading-placeholder">加载中...</div>
            </div>
            <button class="load-more-btn" id="load-more-participants" style="display: none;" onclick="loadMoreParticipants()">加载更多</button>
        </div>
    `;
    
    container.innerHTML = `
        <div class="activity-header">
            ${activity.cover_image ? `<img src="${activity.cover_image}" class="cover-image" alt="${activity.title}">` : ''}
            <h1>${activity.title}</h1>
            <div class="meta-grid">
                <div class="meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <div>
                        <div class="label">开始时间</div>
                        <div class="value">${startTime}</div>
                    </div>
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar-check"></i>
                    <div>
                        <div class="label">结束时间</div>
                        <div class="value">${endTime}</div>
                    </div>
                </div>
                <div class="meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <div class="label">活动地点</div>
                        <div class="value">${activity.location || '待定'}</div>
                    </div>
                </div>
                <div class="meta-item">
                    <i class="fas fa-users"></i>
                    <div>
                        <div class="label">报名人数</div>
                        <div class="value">${activity.approved_count || 0} / ${activity.max_participants || '不限'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        ${registrationHtml}
        
        <div class="activity-description">
            <h2>活动详情</h2>
            <div class="content">${activity.description || '暂无详情'}</div>
            ${activity.content_images && activity.content_images.length > 0 ? `
                <div class="activity-gallery">
                    ${activity.content_images.map(img => `<img src="${img}" alt="活动图片">`).join('')}
                </div>
            ` : ''}
        </div>
        
        ${summaryHtml}
        ${participantsHtml}
    `;
    
    loadParticipants();
}

async function registerActivity() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) {
        alert('请先登录');
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
        const res = await fetch(`/api/activities/${currentActivityId}/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await res.json();
        
        if (data.ok) {
            alert('报名成功，请等待审核');
            loadActivityDetail();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('报名失败');
    }
}

async function cancelRegistration() {
    if (!confirm('确定要取消报名吗？')) return;
    
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) {
        alert('请先登录');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('登录已过期，请重新登录');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const res = await fetch(`/api/activities/${currentActivityId}/cancel`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await res.json();
        
        if (data.ok) {
            alert('报名已取消');
            currentUserRegistration = null;
            loadActivityDetail();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('取消报名失败');
    }
}

async function toggleSummaryLike(btn) {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) {
        alert('请先登录');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('登录已过期，请重新登录');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const res = await fetch(`/api/activities/${currentActivityId}/summary/like`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await res.json();
        
        if (data.ok) {
            const icon = btn.querySelector('i');
            const countSpan = btn.querySelector('.likes-count');
            
            if (data.liked) {
                btn.classList.add('liked');
                icon.classList.remove('far');
                icon.classList.add('fas');
            } else {
                btn.classList.remove('liked');
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
            countSpan.textContent = data.likes_count;
        }
    } catch (err) {
        console.error(err);
    }
}

let participantsPage = 1;
let allParticipants = [];

async function loadParticipants() {
    const container = document.getElementById('participants-list');
    
    try {
        const res = await fetch(`/api/activities/${currentActivityId}/participants`);
        const data = await res.json();
        
        if (data.ok) {
            allParticipants = data.participants || [];
            
            const total = allParticipants.length;
            const approved = allParticipants.filter(p => p.status === 'approved').length;
            const checkedIn = allParticipants.filter(p => p.status === 'approved' && p.check_in_status === 'checked_in').length;
            
            document.getElementById('total-participants').textContent = total;
            document.getElementById('approved-participants').textContent = approved;
            document.getElementById('checked-in-participants').textContent = checkedIn;
            
            renderParticipants();
        } else {
            container.innerHTML = '<div style="color: #888; text-align: center;">暂无参与者</div>';
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="color: #888; text-align: center;">加载失败</div>';
    }
}

function renderParticipants() {
    const container = document.getElementById('participants-list');
    const pageSize = 20;
    const endIndex = participantsPage * pageSize;
    const displayParticipants = allParticipants.slice(0, endIndex);
    
    if (displayParticipants.length === 0) {
        container.innerHTML = '<div style="color: #888; text-align: center;">暂无参与者</div>';
        return;
    }
    
    container.innerHTML = displayParticipants.map(p => {
        const avatar = p.user_avatar 
            ? `<img src="${p.user_avatar}" alt="头像">`
            : (p.user_phone || 'U').charAt(0).toUpperCase();
        
        let statusText = '';
        let statusClass = '';
        
        if (p.status === 'pending') {
            statusText = '待审核';
            statusClass = 'pending';
        } else if (p.status === 'approved') {
            if (p.check_in_status === 'checked_in') {
                statusText = '已签到';
                statusClass = 'checked-in';
            } else {
                statusText = '未签到';
                statusClass = 'not-checked-in';
            }
        } else if (p.status === 'rejected') {
            statusText = '已拒绝';
            statusClass = 'rejected';
        }
        
        return `
            <div class="participant-item">
                <div class="participant-avatar">${avatar}</div>
                <span class="participant-name">${p.user_phone ? p.user_phone.slice(-4) : '用户'}</span>
                <span class="participant-status ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');
    
    const loadMoreBtn = document.getElementById('load-more-participants');
    if (endIndex < allParticipants.length) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

function loadMoreParticipants() {
    participantsPage++;
    renderParticipants();
}