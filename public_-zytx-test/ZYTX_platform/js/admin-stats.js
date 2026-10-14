let borrowTrendChart = null;
let categoryChart = null;
let userGrowthChart = null;
let borrowHourChart = null;
let currentTrendDays = 7;

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
        const res = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const stats = data.stats;
            document.getElementById('stat-total-books').textContent = stats.total_books || 0;
            document.getElementById('stat-total-users').textContent = stats.total_users || 0;
            document.getElementById('stat-total-borrows').textContent = stats.total_borrows || 0;
            document.getElementById('stat-today-borrows').textContent = stats.today_borrows || 0;
            
            if (stats.pending_requests > 0) {
                const pendingEl = document.getElementById('stat-pending-requests');
                pendingEl.style.display = 'flex';
                pendingEl.classList.add('urgent');
                pendingEl.querySelector('span').textContent = stats.pending_requests;
            }
        }
    } catch (err) {
        console.error('加载统计数据失败:', err);
    }
}

async function loadBorrowTrendChart() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/stats/borrow-trend?days=${currentTrendDays}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const labels = data.trend.map(item => item.date);
            const values = data.trend.map(item => item.count);
            
            const ctx = document.getElementById('borrowTrendChart').getContext('2d');
            
            if (borrowTrendChart) {
                borrowTrendChart.destroy();
            }
            
            borrowTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '借阅次数',
                        data: values,
                        borderColor: '#3182CE',
                        backgroundColor: 'rgba(49, 130, 206, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#3182CE',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('加载借阅趋势失败:', err);
    }
}

function switchTrendDays(days) {
    currentTrendDays = days;
    document.querySelectorAll('.chart-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    loadBorrowTrendChart();
}

async function loadCategoryChart() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/stats/category-distribution', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const categories = data.categories || [];
            const labels = categories.map(item => item.name);
            const values = categories.map(item => item.count);
            
            const colors = [
                '#3182CE', '#48BB78', '#ED8936', '#E53E3E',
                '#9F7AEA', '#38B2AC', '#ED64A6', '#667EEA'
            ];
            
            const ctx = document.getElementById('categoryChart').getContext('2d');
            
            if (categoryChart) {
                categoryChart.destroy();
            }
            
            categoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.slice(0, categories.length),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { boxWidth: 12, padding: 10 }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('加载分类占比失败:', err);
    }
}

async function loadUserGrowthChart() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/stats/user-growth', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const labels = data.growth.map(item => item.month);
            const values = data.growth.map(item => item.count);
            
            const ctx = document.getElementById('userGrowthChart').getContext('2d');
            
            if (userGrowthChart) {
                userGrowthChart.destroy();
            }
            
            userGrowthChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '新增用户',
                        data: values,
                        borderColor: '#48BB78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#48BB78',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('加载用户增长趋势失败:', err);
    }
}

async function loadBorrowHourChart() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/stats/borrow-by-hour', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const labels = data.hours.map(item => `${item.hour}:00`);
            const values = data.hours.map(item => item.count);
            
            const ctx = document.getElementById('borrowHourChart').getContext('2d');
            
            if (borrowHourChart) {
                borrowHourChart.destroy();
            }
            
            borrowHourChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '借阅次数',
                        data: values,
                        backgroundColor: '#ED8936',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        },
                        x: {
                            ticks: {
                                maxRotation: 0,
                                callback: function(value, index) {
                                    return index % 3 === 0 ? this.getLabelForValue(value) : '';
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('加载借阅时段分布失败:', err);
    }
}

async function loadPopularBooks() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/stats/popular-books?limit=10', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const tbody = document.getElementById('popular-books-list');
            
            if (!data.books || data.books.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">暂无数据</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.books.map((book, index) => `
                <tr>
                    <td class="rank-cell">
                        <span class="rank-badge ${index < 3 ? 'top-' + (index + 1) : ''}">${index + 1}</span>
                    </td>
                    <td class="book-title-cell">${book.title || '-'}</td>
                    <td>${book.author || '-'}</td>
                    <td class="count-cell">${book.borrow_count}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('加载热门图书失败:', err);
    }
}

async function loadActiveUsers() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch('/api/admin/stats/active-users?limit=10', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const tbody = document.getElementById('active-users-list');
            
            if (!data.users || data.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">暂无数据</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.users.map((user, index) => `
                <tr>
                    <td class="rank-cell">
                        <span class="rank-badge ${index < 3 ? 'top-' + (index + 1) : ''}">${index + 1}</span>
                    </td>
                    <td>${user.phone || '-'}</td>
                    <td>${user.school || '-'}</td>
                    <td class="count-cell">${user.borrow_count}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('加载活跃用户失败:', err);
    }
}

function exportAllStats() {
    const stats = {
        '总藏书量': document.getElementById('stat-total-books').textContent,
        '注册用户': document.getElementById('stat-total-users').textContent,
        '总借阅次数': document.getElementById('stat-total-borrows').textContent,
        '今日借阅': document.getElementById('stat-today-borrows').textContent
    };
    
    let csv = '\uFEFF数据统计报表\n';
    csv += '生成时间,' + new Date().toLocaleString() + '\n\n';
    
    csv += '指标,数值\n';
    for (const [key, value] of Object.entries(stats)) {
        csv += `${key},${value}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `数据统计_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

document.addEventListener('DOMContentLoaded', async () => {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return;
    
    loadAdminInfo();
    loadStats();
    loadBorrowTrendChart();
    loadCategoryChart();
    loadUserGrowthChart();
    loadBorrowHourChart();
    loadPopularBooks();
    loadActiveUsers();
});