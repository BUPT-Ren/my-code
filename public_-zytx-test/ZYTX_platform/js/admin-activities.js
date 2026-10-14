let activityPage = 1;
let currentActivityId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadAdminInfo();
    loadActivities();
    setupEventListeners();
});

function setupEventListeners() {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            if (modal) modal.style.display = 'none';
        });
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

async function loadActivities() {
    const container = document.getElementById('activities-list');
    const status = document.getElementById('filter-status').value;
    
    container.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
    
    try {
        let url = `/api/activities?page=${activityPage}&per_page=12`;
        if (status) url += `&status=${status}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.ok) {
            renderActivities(data.activities);
            renderPagination(data.pagination);
        } else {
            container.innerHTML = `<div class="error-message">${data.message}</div>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="error-message">加载失败，请检查网络</div>';
    }
}

function renderActivities(activities) {
    const container = document.getElementById('activities-list');
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>暂无活动</p></div>';
        return;
    }
    
    container.innerHTML = activities.map(activity => {
        const startTime = activity.start_time ? new Date(activity.start_time).toLocaleString('zh-CN') : '-';
        const endTime = activity.end_time ? new Date(activity.end_time).toLocaleString('zh-CN') : '-';
        const statusClass = activity.status;
        const statusText = {
            'draft': '草稿',
            'published': '已发布',
            'ongoing': '进行中',
            'ended': '已结束'
        }[activity.status] || activity.status;
        
        return `
            <div class="activity-card" data-id="${activity.activity_id}">
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
                <div class="activity-actions">
                    <button class="btn-small btn-view" onclick="viewActivity(${activity.activity_id})">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    <button class="btn-small btn-edit" onclick="editActivity(${activity.activity_id})">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    ${activity.status !== 'draft' ? `
                        <button class="btn-small btn-registrations" onclick="showRegistrations(${activity.activity_id}, '${activity.title}')">
                            <i class="fas fa-users"></i> 报名
                        </button>
                    ` : ''}
                    ${activity.status === 'published' || activity.status === 'ongoing' || activity.status === 'ended' ? `
                        <button class="btn-small btn-summary" onclick="showSummaryModal(${activity.activity_id})">
                            <i class="fas fa-file-alt"></i> 总结
                        </button>
                    ` : ''}
                    ${activity.status === 'published' ? `
                        <button class="btn-small btn-end" onclick="endActivity(${activity.activity_id})">
                            <i class="fas fa-stop-circle"></i> 结束
                        </button>
                    ` : ''}
                    <button class="btn-small btn-delete" onclick="deleteActivity(${activity.activity_id}, '${activity.title}', '${activity.status}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
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
    activityPage = page;
    loadActivities();
}

function resetFilters() {
    document.getElementById('filter-status').value = '';
    activityPage = 1;
    loadActivities();
}

function showCreateModal() {
    currentActivityId = null;
    document.getElementById('modal-title').innerHTML = '<i class="fas fa-calendar-plus"></i> 创建活动';
    document.getElementById('activity-form').reset();
    document.getElementById('activity-id').value = '';
    document.getElementById('activity-cover').value = '';
    document.getElementById('activity-content-images').value = '[]';
    document.getElementById('cover-preview').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>点击上传封面图片</span>';
    document.getElementById('content-images-preview').innerHTML = '<div class="add-image-btn"><i class="fas fa-plus"></i><span>添加图片</span></div>';
    document.getElementById('btn-publish').style.display = 'inline-flex';
    document.getElementById('btn-save-draft').style.display = 'inline-flex';
    openModal('modal-activity');
}

async function editActivity(id) {
    try {
        const res = await fetch(`/api/activities/${id}`);
        const data = await res.json();
        
        if (data.ok) {
            const activity = data.activity;
            currentActivityId = id;
            
            document.getElementById('modal-title').innerHTML = '<i class="fas fa-edit"></i> 编辑活动';
            document.getElementById('activity-id').value = id;
            document.getElementById('activity-title').value = activity.title;
            document.getElementById('activity-description').value = activity.description || '';
            document.getElementById('activity-location').value = activity.location || '';
            document.getElementById('activity-max-participants').value = activity.max_participants || 0;
            
            if (activity.start_time) {
                document.getElementById('activity-start-time').value = activity.start_time.slice(0, 16);
            }
            if (activity.end_time) {
                document.getElementById('activity-end-time').value = activity.end_time.slice(0, 16);
            }
            if (activity.registration_start_time) {
                document.getElementById('registration-start-time').value = activity.registration_start_time.slice(0, 16);
            }
            if (activity.registration_end_time) {
                document.getElementById('registration-end-time').value = activity.registration_end_time.slice(0, 16);
            }
            
            if (activity.cover_image) {
                document.getElementById('activity-cover').value = activity.cover_image;
                document.getElementById('cover-preview').innerHTML = `<img src="${activity.cover_image}" alt="封面">`;
            }
            
            if (activity.content_images && activity.content_images.length > 0) {
                document.getElementById('activity-content-images').value = JSON.stringify(activity.content_images);
                const previewHtml = activity.content_images.map((img, idx) => `
                    <div class="image-item">
                        <img src="${img}" alt="图片${idx + 1}">
                        <button class="remove-btn" onclick="removeContentImage(${idx})">&times;</button>
                    </div>
                `).join('') + '<div class="add-image-btn"><i class="fas fa-plus"></i><span>添加图片</span></div>';
                document.getElementById('content-images-preview').innerHTML = previewHtml;
            }
            
            document.getElementById('btn-publish').style.display = activity.status === 'draft' ? 'inline-flex' : 'none';
            document.getElementById('btn-save-draft').style.display = activity.status === 'draft' ? 'inline-flex' : 'none';
            document.getElementById('btn-save-changes').style.display = activity.status !== 'draft' ? 'inline-flex' : 'none';
            
            openModal('modal-activity');
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('获取活动信息失败');
    }
}

async function saveActivity(status) {
    const id = document.getElementById('activity-id').value;
    const title = document.getElementById('activity-title').value.trim();
    const description = document.getElementById('activity-description').value.trim();
    const location = document.getElementById('activity-location').value.trim();
    const maxParticipants = parseInt(document.getElementById('activity-max-participants').value) || 0;
    const startTime = document.getElementById('activity-start-time').value;
    const endTime = document.getElementById('activity-end-time').value;
    const registrationStartTime = document.getElementById('registration-start-time').value;
    const registrationEndTime = document.getElementById('registration-end-time').value;
    const coverImage = document.getElementById('activity-cover').value;
    const contentImages = JSON.parse(document.getElementById('activity-content-images').value || '[]');
    
    if (!title) {
        alert('请输入活动标题');
        return;
    }
    if (!startTime || !endTime) {
        alert('请选择开始和结束时间');
        return;
    }
    
    const payload = {
        title,
        description,
        location,
        max_participants: maxParticipants,
        start_time: startTime,
        end_time: endTime,
        registration_start_time: registrationStartTime,
        registration_end_time: registrationEndTime,
        cover_image: coverImage,
        content_images: contentImages,
        status
    };
    
    const token = localStorage.getItem('token');
    
    try {
        let url = '/api/activities';
        let method = 'POST';
        
        if (id) {
            url = `/api/activities/${id}`;
            method = 'PUT';
        }
        
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (data.ok) {
            alert(id ? '活动更新成功' : '活动创建成功');
            closeModal('modal-activity');
            loadActivities();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('保存失败');
    }
}

async function saveChanges() {
    const id = document.getElementById('activity-id').value;
    const title = document.getElementById('activity-title').value.trim();
    const description = document.getElementById('activity-description').value.trim();
    const location = document.getElementById('activity-location').value.trim();
    const maxParticipants = parseInt(document.getElementById('activity-max-participants').value) || 0;
    const startTime = document.getElementById('activity-start-time').value;
    const endTime = document.getElementById('activity-end-time').value;
    const registrationStartTime = document.getElementById('registration-start-time').value;
    const registrationEndTime = document.getElementById('registration-end-time').value;
    const coverImage = document.getElementById('activity-cover').value;
    const contentImages = JSON.parse(document.getElementById('activity-content-images').value || '[]');
    
    if (!title) {
        alert('请输入活动标题');
        return;
    }
    if (!startTime || !endTime) {
        alert('请选择开始和结束时间');
        return;
    }
    
    const payload = {
        title,
        description,
        location,
        max_participants: maxParticipants,
        start_time: startTime,
        end_time: endTime,
        registration_start_time: registrationStartTime,
        registration_end_time: registrationEndTime,
        cover_image: coverImage,
        content_images: contentImages
    };
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/activities/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (data.ok) {
            alert('活动更新成功');
            closeModal('modal-activity');
            loadActivities();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('保存失败');
    }
}

async function deleteActivity(id, title, status) {
    let confirmMsg = '确定要删除这个活动吗？';
    if (status !== 'draft') {
        confirmMsg = `活动"${title}"已${status === 'published' ? '发布' : status === 'ongoing' ? '进行中' : '结束'}，删除将清除所有报名记录、帖子、评论等关联数据，且不可恢复！\n\n确定要删除吗？`;
    }
    
    if (!confirm(confirmMsg)) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/activities/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('活动已删除');
            loadActivities();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('删除失败');
    }
}

async function endActivity(id) {
    if (!confirm('确定要结束这个活动吗？')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/activities/${id}/end`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('活动已结束');
            loadActivities();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('操作失败');
    }
}

function viewActivity(id) {
    window.location.href = `activity-detail.html?id=${id}&admin=1`;
}

async function showRegistrations(activityId, title) {
    currentActivityId = activityId;
    document.getElementById('activity-title-display').textContent = title;
    document.getElementById('reg-filter-status').value = '';
    await loadRegistrations();
    openModal('modal-registrations');
}

async function loadRegistrations() {
    const container = document.getElementById('registrations-list');
    const status = document.getElementById('reg-filter-status').value;
    
    container.innerHTML = '<div class="loading-placeholder">加载中...</div>';
    
    const token = localStorage.getItem('token');
    if (!token) {
        container.innerHTML = '<div class="error-message">请先登录</div>';
        return;
    }
    
    try {
        let url = `/api/activities/${currentActivityId}/registrations`;
        if (status) url += `?status=${status}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const approvedCount = data.registrations.filter(r => r.status === 'approved').length;
            document.getElementById('approved-count').textContent = approvedCount;
            
            let checkedInCount = 0;
            data.registrations.forEach(reg => {
                if (reg.status === 'approved' && reg.check_in_status === 'checked_in') {
                    checkedInCount++;
                }
            });
            document.getElementById('checked-in-count').textContent = checkedInCount;
            
            if (data.registrations.length === 0) {
                container.innerHTML = '<div class="empty-state">暂无报名记录</div>';
                return;
            }
            
            container.innerHTML = data.registrations.map(reg => {
                const regTime = reg.registered_at ? new Date(reg.registered_at).toLocaleString('zh-CN') : '-';
                const avatar = reg.user_avatar 
                    ? `<img src="${reg.user_avatar}" alt="头像">`
                    : (reg.user_name || 'U').charAt(0).toUpperCase();
                
                const statusText = {
                    'pending': '待审核',
                    'approved': '已通过',
                    'rejected': '已拒绝'
                }[reg.status] || reg.status;
                
                const checkInText = reg.status === 'approved' 
                    ? (reg.check_in_status === 'checked_in' ? '已签到' : '未签到')
                    : '';
                const checkInClass = reg.check_in_status === 'checked_in' ? 'checked-in' : 'not-checked-in';
                
                return `
                    <div class="registration-item" data-reg-id="${reg.registration_id}">
                        <input type="checkbox" class="reg-checkbox" data-reg-id="${reg.registration_id}" 
                               ${reg.status !== 'approved' || reg.check_in_status === 'checked_in' ? 'disabled' : ''}
                               onchange="updateRegBatchBar()">
                        <div class="user-avatar">${avatar}</div>
                        <div class="user-info">
                            <div class="user-name">${reg.user_name || '未知用户'}</div>
                            <div class="register-time">报名时间: ${regTime}</div>
                            ${reg.check_in_time ? `<div class="check-in-time">签到时间: ${new Date(reg.check_in_time).toLocaleString('zh-CN')}</div>` : ''}
                        </div>
                        <span class="reg-status ${reg.status}">${statusText}</span>
                        ${reg.status === 'approved' ? `<span class="check-in-status ${checkInClass}">${checkInText}</span>` : ''}
                        <div class="reg-actions">
                            ${reg.status === 'pending' ? `
                                <button class="btn-approve" onclick="approveRegistration(${reg.registration_id}, 'approve')">通过</button>
                                <button class="btn-reject" onclick="approveRegistration(${reg.registration_id}, 'reject')">拒绝</button>
                            ` : ''}
                            ${reg.status === 'approved' && reg.check_in_status !== 'checked_in' ? `
                                <button class="btn-check-in" onclick="checkInUser(${reg.registration_id})">签到</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            updateRegBatchBar();
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="error-message">加载失败</div>';
    }
}

function updateRegBatchBar() {
    const checkboxes = document.querySelectorAll('.reg-checkbox:not(:disabled):checked');
    const count = checkboxes.length;
    const bar = document.getElementById('reg-batch-bar');
    const countEl = document.getElementById('reg-selected-count');
    const selectAllCb = document.getElementById('reg-select-all');
    
    const totalCheckboxes = document.querySelectorAll('.reg-checkbox:not(:disabled)');
    if (selectAllCb) {
        selectAllCb.checked = count > 0 && count === totalCheckboxes.length;
    }
    
    if (count > 0) {
        bar.style.display = 'flex';
        countEl.textContent = count;
    } else {
        bar.style.display = 'none';
    }
}

function toggleRegSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.reg-checkbox:not(:disabled)');
    checkboxes.forEach(cb => {
        cb.checked = checked;
    });
    updateRegBatchBar();
}

async function checkInUser(registrationId) {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/activities/${currentActivityId}/check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ registration_id: registrationId })
        });
        
        const data = await res.json();
        
        if (data.ok) {
            loadRegistrations();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('签到失败');
    }
}

async function batchCheckIn() {
    const checkboxes = document.querySelectorAll('.reg-checkbox:not(:disabled):checked');
    const regIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.regId));
    
    if (regIds.length === 0) {
        alert('请选择要签到的用户');
        return;
    }
    
    if (!confirm(`确定为选中的 ${regIds.length} 位用户签到？`)) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/activities/${currentActivityId}/batch-check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ registration_ids: regIds })
        });
        
        const data = await res.json();
        
        if (data.ok) {
            alert(data.message);
            loadRegistrations();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('批量签到失败');
    }
}

function exportParticipants() {
    window.location.href = `/api/activities/${currentActivityId}/participants/export?token=${localStorage.getItem('token')}`;
}

async function approveRegistration(regId, action) {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/activities/${currentActivityId}/registrations/${regId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action })
        });
        
        const data = await res.json();
        
        if (data.ok) {
            loadRegistrations();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('操作失败');
    }
}

function showSummaryModal(activityId) {
    currentActivityId = activityId;
    document.getElementById('summary-content').value = '';
    document.getElementById('summary-images').value = '[]';
    document.getElementById('summary-images-preview').innerHTML = '<div class="add-image-btn"><i class="fas fa-plus"></i><span>添加图片</span></div>';
    openModal('modal-summary');
}

async function submitSummary() {
    const content = document.getElementById('summary-content').value.trim();
    const images = JSON.parse(document.getElementById('summary-images').value || '[]');
    
    if (!content) {
        alert('请输入活动总结内容');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/activities/${currentActivityId}/summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content, images })
        });
        
        const data = await res.json();
        
        if (data.ok) {
            alert('活动总结发布成功');
            closeModal('modal-summary');
            loadActivities();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('发布失败');
    }
}

async function uploadCover(input) {
    if (!input.files || !input.files[0]) return;
    
    const token = localStorage.getItem('token');
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const res = await fetch('/api/upload/image', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.ok) {
            document.getElementById('activity-cover').value = data.url;
            document.getElementById('cover-preview').innerHTML = `<img src="${data.url}" alt="封面">`;
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('上传失败');
    }
}

async function uploadContentImages(input) {
    if (!input.files || input.files.length === 0) return;
    
    const token = localStorage.getItem('token');
    const existingImages = JSON.parse(document.getElementById('activity-content-images').value || '[]');
    
    for (const file of input.files) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await fetch('/api/upload/image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            const data = await res.json();
            
            if (data.ok) {
                existingImages.push(data.url);
            }
        } catch (err) {
            console.error(err);
        }
    }
    
    document.getElementById('activity-content-images').value = JSON.stringify(existingImages);
    updateContentImagesPreview(existingImages);
}

function updateContentImagesPreview(images) {
    const previewHtml = images.map((img, idx) => `
        <div class="image-item">
            <img src="${img}" alt="图片${idx + 1}">
            <button type="button" class="remove-btn" onclick="removeContentImage(${idx})">&times;</button>
        </div>
    `).join('') + '<div class="add-image-btn"><i class="fas fa-plus"></i><span>添加图片</span></div>';
    document.getElementById('content-images-preview').innerHTML = previewHtml;
}

function removeContentImage(index) {
    const images = JSON.parse(document.getElementById('activity-content-images').value || '[]');
    images.splice(index, 1);
    document.getElementById('activity-content-images').value = JSON.stringify(images);
    updateContentImagesPreview(images);
}

async function uploadSummaryImages(input) {
    if (!input.files || input.files.length === 0) return;
    
    const token = localStorage.getItem('token');
    const existingImages = JSON.parse(document.getElementById('summary-images').value || '[]');
    
    for (const file of input.files) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await fetch('/api/upload/image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            const data = await res.json();
            
            if (data.ok) {
                existingImages.push(data.url);
            }
        } catch (err) {
            console.error(err);
        }
    }
    
    document.getElementById('summary-images').value = JSON.stringify(existingImages);
    updateSummaryImagesPreview(existingImages);
}

function updateSummaryImagesPreview(images) {
    const previewHtml = images.map((img, idx) => `
        <div class="image-item">
            <img src="${img}" alt="图片${idx + 1}">
            <button type="button" class="remove-btn" onclick="removeSummaryImage(${idx})">&times;</button>
        </div>
    `).join('') + '<div class="add-image-btn"><i class="fas fa-plus"></i><span>添加图片</span></div>';
    document.getElementById('summary-images-preview').innerHTML = previewHtml;
}

function removeSummaryImage(index) {
    const images = JSON.parse(document.getElementById('summary-images').value || '[]');
    images.splice(index, 1);
    document.getElementById('summary-images').value = JSON.stringify(images);
    updateSummaryImagesPreview(images);
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

let selectedAddUsers = new Set();

async function showAddUserModal() {
    selectedAddUsers.clear();
    document.getElementById('add-user-search').value = '';
    document.getElementById('add-user-type').value = '';
    document.getElementById('batch-add-bar').style.display = 'none';
    document.getElementById('batch-add-result').style.display = 'none';
    document.getElementById('add-selected-count').textContent = '0';
    openModal('modal-add-users');
    await loadUsersForAdd();
}

async function loadUsersForAdd(search = '') {
    const token = localStorage.getItem('token');
    const container = document.getElementById('users-select-list');
    const userType = document.getElementById('add-user-type').value;
    
    container.innerHTML = '<div class="loading-placeholder">加载中...</div>';
    
    try {
        let url = '/api/admin/users?page=1&page_size=100&status=active';
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            let users = data.users;
            
            if (userType === 'phone') {
                users = users.filter(u => /^1[3-9]\d{9}$/.test(u.phone));
            } else if (userType === 'education') {
                users = users.filter(u => !/^1[3-9]\d{9}$/.test(u.phone));
            }
            
            if (users.length === 0) {
                container.innerHTML = '<div class="empty-state">暂无可添加的用户</div>';
                return;
            }
            
            container.innerHTML = users.map(user => {
                const isPhone = /^1[3-9]\d{9}$/.test(user.phone);
                const typeLabel = isPhone ? '<span class="user-type-label phone">手机号</span>' : '<span class="user-type-label education">教育号</span>';
                return `
                <div class="user-select-item" data-id="${user.user_id}" onclick="toggleAddUser(${user.user_id}, this)">
                    <input type="checkbox" class="add-user-checkbox" ${selectedAddUsers.has(user.user_id) ? 'checked' : ''}>
                    <div class="user-info">
                        <span class="user-phone">${user.phone || '-'}</span>
                        ${typeLabel}
                        <span class="user-school">${user.school || ''}</span>
                    </div>
                </div>
            `}).join('');
        } else {
            container.innerHTML = `<div class="error-message">${data.message}</div>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="error-message">加载失败</div>';
    }
}

async function searchUsersForAdd() {
    const search = document.getElementById('add-user-search').value.trim();
    await loadUsersForAdd(search);
}

function toggleAddUser(userId, element) {
    const checkbox = element.querySelector('.add-user-checkbox');
    
    if (selectedAddUsers.has(userId)) {
        selectedAddUsers.delete(userId);
        checkbox.checked = false;
        element.classList.remove('selected');
    } else {
        selectedAddUsers.add(userId);
        checkbox.checked = true;
        element.classList.add('selected');
    }
    
    document.getElementById('add-selected-count').textContent = selectedAddUsers.size;
    document.getElementById('batch-add-bar').style.display = selectedAddUsers.size > 0 ? 'flex' : 'none';
}

async function confirmBatchAdd() {
    if (selectedAddUsers.size === 0) {
        alert('请先选择要添加的用户');
        return;
    }
    
    if (!confirm(`确定为选中的 ${selectedAddUsers.size} 位用户报名此活动吗？`)) return;
    
    const token = localStorage.getItem('token');
    const userIds = Array.from(selectedAddUsers);
    
    try {
        const res = await fetch(`/api/activities/${currentActivityId}/admin-register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_ids: userIds })
        });
        
        const data = await res.json();
        
        const resultDiv = document.getElementById('batch-add-result');
        resultDiv.style.display = 'block';
        
        if (data.ok) {
            resultDiv.innerHTML = `
                <div style="padding: 10px; background: #f0f9eb; border-radius: 4px;">
                    ${data.message}
                    ${data.errors && data.errors.length > 0 ? `<br><small style="color: #e6a23c;">${data.errors.join('、')}</small>` : ''}
                </div>
            `;
            
            selectedAddUsers.clear();
            document.getElementById('batch-add-bar').style.display = 'none';
            document.getElementById('add-selected-count').textContent = '0';
            
            loadRegistrations();
        } else {
            resultDiv.innerHTML = `
                <div style="padding: 10px; background: #fef0f0; border-radius: 4px; color: red;">
                    ${data.message}
                </div>
            `;
        }
    } catch (err) {
        console.error(err);
        document.getElementById('batch-add-result').style.display = 'block';
        document.getElementById('batch-add-result').innerHTML = `
            <div style="padding: 10px; background: #fef0f0; border-radius: 4px; color: red;">
                操作失败，请检查网络连接
            </div>
        `;
    }
}