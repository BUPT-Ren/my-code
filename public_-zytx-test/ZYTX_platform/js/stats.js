// 从后端获取统计数据并渲染图表
async function loadStats() {
    try {
        const { res, data } = await fetchJson('/api/stats');
        const stats = (res && res.ok && data && data.ok && data.data) ? data.data : {
            total_books: 0,
            borrowed_this_month: 0,
            favorite_category: '',
            borrow_trend: [0,0,0,0,0,0],
            categories: {}
        };

        const totalEl = document.getElementById('total-books');
        if (totalEl) totalEl.textContent = stats.total_books || 0;
        
        const monthEl = document.getElementById('borrowed-this-month');
        if (monthEl) monthEl.textContent = stats.borrowed_this_month || 0;
        
        const favEl = document.getElementById('favorite-category');
        if (favEl) favEl.textContent = stats.favorite_category || '暂无';

        // 借书趋势图
        const ctxTrend = document.getElementById('borrowTrendChart').getContext('2d');
        new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: stats.borrow_trend_labels || ['10月','11月','12月','1月','2月','3月'],
                datasets: [{
                    label: '借阅量',
                    data: stats.borrow_trend || [0,0,0,0,0,0],
                    borderColor: '#4A86E8',
                    backgroundColor: 'rgba(74, 134, 232, 0.2)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });

        // 偏好分类饼图
        const ctxCategory = document.getElementById('categoryChart').getContext('2d');
        new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.categories || {}),
                datasets: [{ data: Object.values(stats.categories || {}), backgroundColor: ['#4A86E8','#38A169','#D69E2E','#E53E3E','#805AD5'], hoverOffset: 10 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });

    } catch (err) {
        console.error('加载统计数据失败', err);
    }
}

document.addEventListener('DOMContentLoaded', loadStats);