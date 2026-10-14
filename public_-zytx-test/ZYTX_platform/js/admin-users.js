let userPage = 1;
let pageSize = 10;
let currentUserId = null;
let selectedUsers = new Set();
let currentUsers = [];
let filteredTotal = 0;
let isAllSelected = false;
let userFilters = { search: '', status: '' };
let isSuperAdmin = false;

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
        isSuperAdmin = data.is_super || false;
        return true;
    } catch (err) {
        console.error('权限检查失败:', err);
        window.location.href = '/login.html';
        return false;
    }
}

async function loadUsers(page = 1) {
    userPage = page;
    const token = localStorage.getItem('token');
    const search = document.getElementById('search-input').value;
    const status = document.getElementById('filter-status').value;
    const userType = document.getElementById('filter-user-type').value;
    
    userFilters = { search, status, userType };
    
    const tbody = document.getElementById('users-list');
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>';
    
    try {
        let url = `/api/admin/users?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status) url += `&status=${status}`;
        if (userType) url += `&user_type=${userType}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            filteredTotal = data.pagination.total;
            renderUsers(data.users);
            renderPagination(data.pagination);
            updateBatchBar();
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">加载失败: ${data.message}</td></tr>`;
        }
    } catch (err) {
        console.error('加载用户失败:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">加载失败</td></tr>';
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-list');
    currentUsers = users;
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell"><i class="fas fa-inbox"></i> 暂无用户记录</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const isAdmin = user.is_admin;
        const isSuper = user.phone === '18786898944';
        const canManageAdmin = isSuperAdmin && !isSuper;
        
        return `
        <tr data-id="${user.user_id}">
            <td class="col-checkbox">
                <input type="checkbox" class="user-checkbox" data-id="${user.user_id}"
                    ${selectedUsers.has(user.user_id) ? 'checked' : ''}
                    ${isAdmin && !isSuperAdmin ? 'disabled title="不能选择管理员"' : ''}
                    onchange="toggleSelectUser(${user.user_id}, this.checked)">
            </td>
            <td class="col-avatar">
                <div class="table-avatar">${user.phone ? user.phone.slice(-2) : 'U'}</div>
            </td>
            <td class="col-user">
                <div class="user-cell">
                    <span class="user-phone">${user.phone || '-'}</span>
                    ${isSuper ? '<span class="super-admin-tag"><i class="fas fa-crown"></i> 超级管理员</span>' : isAdmin ? '<span class="admin-tag"><i class="fas fa-shield-alt"></i> 管理员</span>' : ''}
                </div>
            </td>
            <td class="col-school">${user.school || '-'}</td>
            <td class="col-borrow">
                <span class="borrow-stat">
                    <span class="active">${user.active_borrow_count || 0}</span> 在借 / 
                    <span class="total">${user.borrow_count || 0}</span> 总计
                </span>
            </td>
            <td class="col-date">${formatDate(user.created_at)}</td>
            <td class="col-status">
                <span class="status-badge ${user.status}">${getStatusText(user.status)}</span>
            </td>
            <td class="col-actions">
                <div class="table-actions">
                    <button class="btn-view" onclick="showUserDetail(${user.user_id})" title="详情"><i class="fas fa-eye"></i></button>
                    ${canManageAdmin || !isAdmin ? `
                        <button class="btn-edit" onclick="editUser(${user.user_id})" title="编辑"><i class="fas fa-edit"></i></button>
                        <button class="btn-toggle ${user.status === 'active' ? 'btn-disable' : 'btn-enable'}" 
                                onclick="toggleUserStatus(${user.user_id}, '${user.status}', ${isAdmin})"
                                title="${user.status === 'active' ? '禁用' : '启用'}">
                            <i class="fas ${user.status === 'active' ? 'fa-ban' : 'fa-check-circle'}"></i>
                        </button>
                        <button class="btn-key" onclick="showResetPasswordModal(${user.user_id}, '${user.phone || ''}', ${isAdmin})" title="重置密码"><i class="fas fa-key"></i></button>
                        <button class="btn-delete" onclick="showDeleteModal(${user.user_id}, '${user.phone || ''}', ${isAdmin})" title="删除"><i class="fas fa-trash"></i></button>
                    ` : ''}
                    ${canManageAdmin && isAdmin ? `
                        <button class="btn-remove-admin" onclick="removeAdmin(${user.user_id}, '${user.phone || ''}')" title="移除管理员"><i class="fas fa-user-minus"></i></button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `}).join('');
    
    updateBatchBar();
}

function getStatusText(status) {
    const texts = {
        'active': '正常',
        'suspended': '已禁用',
        'deleted': '已删除'
    };
    return texts[status] || status;
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
        container.innerHTML = `<span class="pagination-info">共 ${total} 人</span>`;
        return;
    }
    
    let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="loadUsers(${page - 1})">上一页</button>`;
    
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    if (startPage > 1) html += `<button onclick="loadUsers(1)">1</button>`;
    if (startPage > 2) html += '<span>...</span>';
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="loadUsers(${i})">${i}</button>`;
    }
    
    if (endPage < pages - 1) html += '<span>...</span>';
    if (endPage < pages) html += `<button onclick="loadUsers(${pages})">${pages}</button>`;
    
    html += `<button ${page >= pages ? 'disabled' : ''} onclick="loadUsers(${page + 1})">下一页</button>`;
    html += `<span class="pagination-info">共 ${total} 人</span>`;
    
    container.innerHTML = html;
}

async function showUserDetail(userId) {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const user = data.user;
            document.getElementById('modal-detail-content').innerHTML = `
                <div class="detail-section">
                    <div class="detail-row">
                        <span class="detail-label">手机号</span>
                        <span class="detail-value">${user.phone || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">学校</span>
                        <span class="detail-value">${user.school || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">生日</span>
                        <span class="detail-value">${user.birthday || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">状态</span>
                        <span class="detail-value"><span class="status-badge ${user.status}">${getStatusText(user.status)}</span></span>
                    </div>
                    ${user.is_admin ? `
                    <div class="detail-row">
                        <span class="detail-label">管理员</span>
                        <span class="detail-value"><span class="admin-tag"><i class="fas fa-shield-alt"></i> ${user.admin_level === 'super' ? '超级管理员' : '普通管理员'}</span></span>
                    </div>
                    ` : ''}
                </div>
                <div class="detail-section">
                    <div class="detail-section-title">借阅统计</div>
                    <div class="detail-row">
                        <span class="detail-label">正在借阅</span>
                        <span class="detail-value">${user.current_borrowed || 0} 本</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">历史借阅</span>
                        <span class="detail-value">${user.total_borrowed || 0} 本</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">收藏数量</span>
                        <span class="detail-value">${user.favorite_count || 0} 本</span>
                    </div>
                </div>
            `;
            document.getElementById('modal-detail').classList.add('show');
        } else {
            alert('获取用户详情失败');
        }
    } catch (err) {
        console.error('获取用户详情失败:', err);
        alert('操作失败');
    }
}

async function editUser(userId) {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const user = data.user;
            currentUserId = userId;
            document.getElementById('edit-user-id').value = userId;
            document.getElementById('edit-phone').value = user.phone || '';
            document.getElementById('edit-school').value = user.school || '';
            document.getElementById('edit-birthday').value = user.birthday || '';
            document.getElementById('modal-edit').classList.add('show');
        } else {
            alert('获取用户信息失败');
        }
    } catch (err) {
        console.error('获取用户信息失败:', err);
        alert('操作失败');
    }
}

async function saveUser() {
    const token = localStorage.getItem('token');
    
    const userData = {
        school: document.getElementById('edit-school').value.trim(),
        birthday: document.getElementById('edit-birthday').value
    };
    
    try {
        const res = await fetch(`/api/admin/users/${currentUserId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('用户信息更新成功');
            closeModal('modal-edit');
            loadUsers(userPage);
        } else {
            alert(data.message || '更新失败');
        }
    } catch (err) {
        console.error('更新用户失败:', err);
        alert('操作失败');
    }
}

async function toggleUserStatus(userId, currentStatus, isAdmin = false) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? '禁用' : '启用';
    const userType = isAdmin ? '管理员' : '用户';
    
    if (!confirm(`确定要${action}该${userType}吗？`)) return;
    
    const token = localStorage.getItem('token');
    
    try {
        let url, body;
        if (isAdmin) {
            const res = await fetch(`/api/admin/admins?phone=`, { headers: { 'Authorization': `Bearer ${token}` } });
            const adminsData = await res.json();
            const admin = adminsData.admins?.find(a => a.user_id === userId);
            if (!admin) {
                alert('找不到该管理员');
                return;
            }
            url = `/api/admin/admins/${admin.admin_id}/status`;
        } else {
            url = `/api/admin/users/${userId}/status`;
        }
        
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(`${userType}已${action}`);
            loadUsers(userPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('修改状态失败:', err);
        alert('操作失败');
    }
}

function showResetPasswordModal(userId, phone, isAdmin = false) {
    currentUserId = userId;
    currentIsAdmin = isAdmin;
    document.getElementById('reset-user-name').textContent = phone;
    document.getElementById('new-password').value = '123456';
    document.getElementById('modal-password').classList.add('show');
}

let currentIsAdmin = false;

async function confirmResetPassword() {
    const token = localStorage.getItem('token');
    const newPassword = document.getElementById('new-password').value;
    
    if (newPassword.length < 6) {
        alert('密码长度不能少于6位');
        return;
    }
    
    try {
        let url;
        if (currentIsAdmin) {
            const res = await fetch('/api/admin/admins', { headers: { 'Authorization': `Bearer ${token}` } });
            const adminsData = await res.json();
            const admin = adminsData.admins?.find(a => a.user_id === currentUserId);
            if (!admin) {
                alert('找不到该管理员');
                return;
            }
            url = `/api/admin/admins/${admin.admin_id}/reset-password`;
        } else {
            url = `/api/admin/users/${currentUserId}/reset-password`;
        }
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ new_password: newPassword })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('密码重置成功');
            closeModal('modal-password');
        } else {
            alert(data.message || '重置失败');
        }
    } catch (err) {
        console.error('重置密码失败:', err);
        alert('操作失败');
    }
}

function showDeleteModal(userId, phone, isAdmin = false) {
    currentUserId = userId;
    currentIsAdmin = isAdmin;
    const userType = isAdmin ? '管理员' : '用户';
    document.getElementById('delete-user-name').textContent = phone;
    document.getElementById('modal-delete').querySelector('.modal-body p').textContent = `确定要删除${userType} "`;
    document.getElementById('modal-delete').classList.add('show');
}

async function confirmDelete() {
    const token = localStorage.getItem('token');
    
    try {
        if (currentIsAdmin) {
            const res = await fetch('/api/admin/admins', { headers: { 'Authorization': `Bearer ${token}` } });
            const adminsData = await res.json();
            const admin = adminsData.admins?.find(a => a.user_id === currentUserId);
            if (admin) {
                await fetch(`/api/admin/admins/${admin.admin_id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        }
        
        const res = await fetch(`/api/admin/users/${currentUserId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('删除成功');
            closeModal('modal-delete');
            loadUsers(userPage);
        } else {
            alert(data.message || '删除失败');
        }
    } catch (err) {
        console.error('删除失败:', err);
        alert('操作失败');
    }
}

async function removeAdmin(userId, phone) {
    if (!confirm(`确定要移除 "${phone}" 的管理员身份吗？\n该用户将失去管理员权限，但账号仍可正常使用。`)) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/admins', { headers: { 'Authorization': `Bearer ${token}` } });
        const adminsData = await res.json();
        
        if (!adminsData.ok) {
            alert('获取管理员列表失败');
            return;
        }
        
        const admin = adminsData.admins?.find(a => a.user_id === userId);
        if (!admin) {
            alert('找不到该管理员');
            return;
        }
        
        const deleteRes = await fetch(`/api/admin/admins/${admin.admin_id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await deleteRes.json();
        
        if (data.ok) {
            alert('已移除管理员身份');
            loadUsers(userPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('移除管理员失败:', err);
        alert('操作失败');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

document.addEventListener('DOMContentLoaded', async () => {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return;
    
    loadAdminInfo();
    loadUsers(1);
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });
});

document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loadUsers(1);
    }
});

function toggleSelectUser(userId, checked) {
    if (checked) {
        selectedUsers.add(userId);
    } else {
        selectedUsers.delete(userId);
    }
    updateBatchBar();
}

function toggleSelectAll(checked) {
    if (isAllSelected) {
        clearSelection();
        return;
    }
    
    const checkboxes = document.querySelectorAll('.user-checkbox:not(:disabled)');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        const id = parseInt(cb.dataset.id);
        if (checked) {
            selectedUsers.add(id);
        } else {
            selectedUsers.delete(id);
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
    const { search, status } = userFilters;
    
    try {
        let url = '/api/admin/users/ids?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (status) url += `status=${status}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            selectedUsers = new Set(data.user_ids);
            isAllSelected = true;
            
            const checkboxes = document.querySelectorAll('.user-checkbox:not(:disabled)');
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
    selectedUsers.clear();
    isAllSelected = false;
    
    const checkboxes = document.querySelectorAll('.user-checkbox:not(:disabled)');
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
    
    if (selectedUsers.size > 0 || isAllSelected) {
        bar.style.display = 'flex';
        countEl.textContent = selectedUsers.size;
        
        if (totalInfo) {
            totalInfo.textContent = `（共 ${filteredTotal} 条符合条件）`;
        }
        
        if (selectAllBtn) {
            if (isAllSelected) {
                selectAllBtn.textContent = '清除选择';
                selectAllBtn.onclick = clearSelection;
            } else if (selectedUsers.size < filteredTotal) {
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

async function batchEnableUsers() {
    if (selectedUsers.size === 0) {
        alert('请先选择要启用的用户');
        return;
    }
    
    const ids = Array.from(selectedUsers);
    
    if (!confirm(`确定要启用选中的 ${ids.length} 个用户吗？`)) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/users/batch-status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_ids: ids, status: 'active' })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(`成功启用 ${data.updated_count || ids.length} 个用户`);
            selectedUsers.clear();
            isAllSelected = false;
            loadUsers(userPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批量启用失败:', err);
        alert('操作失败');
    }
}

async function batchDisableUsers() {
    if (selectedUsers.size === 0) {
        alert('请先选择要禁用的用户');
        return;
    }
    
    const ids = Array.from(selectedUsers);
    
    if (!confirm(`确定要禁用选中的 ${ids.length} 个用户吗？`)) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/users/batch-status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_ids: ids, status: 'suspended' })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(`成功禁用 ${data.updated_count || ids.length} 个用户`);
            selectedUsers.clear();
            isAllSelected = false;
            loadUsers(userPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批量禁用失败:', err);
        alert('操作失败');
    }
}

function exportUsers() {
    if (!currentUsers || currentUsers.length === 0) {
        alert('暂无数据可导出');
        return;
    }
    
    let csv = '\uFEFF用户ID,手机号,学校,在借数量,总借阅数,注册时间,状态\n';
    
    currentUsers.forEach(user => {
        const id = user.user_id || '';
        const phone = user.phone || '';
        const school = (user.school || '').replace(/"/g, '""');
        const activeBorrow = user.active_borrow_count || 0;
        const totalBorrow = user.borrow_count || 0;
        const date = formatDate(user.created_at);
        const status = getStatusText(user.status);
        
        csv += `${id},${phone},"${school}",${activeBorrow},${totalBorrow},${date},${status}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `用户列表_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

let selectedImportFile = null;

function showImportModal() {
    selectedImportFile = null;
    document.getElementById('import-file').value = '';
    document.getElementById('import-file-name').textContent = '';
    document.getElementById('import-result').style.display = 'none';
    document.getElementById('btn-import').disabled = true;
    document.getElementById('modal-import').classList.add('show');
}

function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const fileName = file.name.toLowerCase();
        
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
            alert('请选择 Excel (.xlsx, .xls) 或 CSV 文件');
            input.value = '';
            return;
        }
        
        selectedImportFile = file;
        document.getElementById('import-file-name').textContent = file.name;
        document.getElementById('btn-import').disabled = false;
        document.getElementById('import-result').style.display = 'none';
    }
}

async function submitImport() {
    if (!selectedImportFile) {
        alert('请先选择文件');
        return;
    }
    
    const btn = document.getElementById('btn-import');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导入中...';
    
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', selectedImportFile);
    
    try {
        const res = await fetch('/api/admin/users/batch-import', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await res.json();
        
        const resultDiv = document.getElementById('import-result');
        resultDiv.style.display = 'block';
        
        if (data.ok) {
            let resultHtml = `
                <div class="import-stats" style="padding: 10px; background: #f0f9eb; border-radius: 4px; margin-bottom: 10px;">
                    <strong>导入结果：</strong>
                    成功 <span style="color: green;">${data.success_count}</span> 条，
                    失败 <span style="color: red;">${data.failed_count}</span> 条
                </div>
            `;
            
            if (data.errors && data.errors.length > 0) {
                resultHtml += `
                    <div class="import-errors" style="padding: 10px; background: #fef0f0; border-radius: 4px;">
                        <strong>错误详情：</strong>
                        <ul style="margin: 5px 0 0 20px; font-size: 12px;">
                            ${data.errors.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            resultDiv.innerHTML = resultHtml;
            
            if (data.success_count > 0) {
                loadUsers(1);
            }
        } else {
            resultDiv.innerHTML = `
                <div style="padding: 10px; background: #fef0f0; border-radius: 4px; color: red;">
                    ${data.message}
                </div>
            `;
        }
    } catch (err) {
        console.error('导入失败:', err);
        document.getElementById('import-result').style.display = 'block';
        document.getElementById('import-result').innerHTML = `
            <div style="padding: 10px; background: #fef0f0; border-radius: 4px; color: red;">
                导入失败，请检查网络连接
            </div>
        `;
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-upload"></i> 开始导入';
}

const dropZone = document.getElementById('import-drop-zone');
if (dropZone) {
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#409eff';
        this.style.background = '#f0f7ff';
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ddd';
        this.style.background = '#fafafa';
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ddd';
        this.style.background = '#fafafa';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('import-file').files = files;
            handleFileSelect(document.getElementById('import-file'));
        }
    });
}