let bookPage = 1;
let pageSize = 10;
let currentBookId = null;
let selectedGenres = [];
let selectedBooks = new Set();
let currentBooks = [];
let filteredTotal = 0;
let isAllSelected = false;
let bookFilters = { search: '', genre: '', status: '' };
let previewData = null;
let importFile = null;

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

async function loadGenres() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/genres', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok && data.genres) {
            const select = document.getElementById('filter-genre');
            data.genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error('加载分类失败:', err);
    }
}

async function loadBooks(page = 1) {
    bookPage = page;
    const token = localStorage.getItem('token');
    const search = document.getElementById('search-input').value;
    const genre = document.getElementById('filter-genre').value;
    const status = document.getElementById('filter-status').value;
    
    bookFilters = { search, genre, status };
    
    const tbody = document.getElementById('books-list');
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> 加载中...</td></tr>';
    
    try {
        let url = `/api/admin/books?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (genre) url += `&genre=${encodeURIComponent(genre)}`;
        if (status) url += `&status=${status}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            filteredTotal = data.pagination.total;
            renderBooks(data.books);
            renderPagination(data.pagination);
            updateBatchBar();
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">加载失败: ${data.message}</td></tr>`;
        }
    } catch (err) {
        console.error('加载图书失败:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">加载失败</td></tr>';
    }
}

function renderBooks(books) {
    const tbody = document.getElementById('books-list');
    currentBooks = books;
    
    if (!books || books.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-cell"><i class="fas fa-inbox"></i> 暂无图书记录</td></tr>';
        return;
    }
    
    tbody.innerHTML = books.map(book => `
        <tr data-id="${book.book_id}">
            <td class="col-checkbox">
                <input type="checkbox" class="book-checkbox" data-id="${book.book_id}"
                    ${selectedBooks.has(book.book_id) ? 'checked' : ''}
                    onchange="toggleSelectBook(${book.book_id}, this.checked)">
            </td>
            <td class="col-cover">
                <img class="table-cover" src="${book.cover_url || 'https://via.placeholder.com/40x56?text=Book'}" alt="cover">
            </td>
            <td class="col-title">${book.title || '-'}</td>
            <td class="col-author">${book.author || '-'}</td>
            <td class="col-isbn">${book.isbn || '-'}</td>
            <td class="col-genre">${formatGenres(book.genres)}</td>
            <td class="col-stock">
                <div class="stock-edit">
                    <input type="number" id="stock-${book.book_id}" value="${book.available_copies}" min="0"
                           onchange="quickUpdateStock(${book.book_id}, this.value)">
                    <span>/ ${book.total_copies}</span>
                </div>
            </td>
            <td class="col-status">
                <span class="status-badge ${book.available_copies > 0 ? 'available' : 'unavailable'}">
                    ${book.available_copies > 0 ? '可借' : '已借完'}
                </span>
            </td>
            <td class="col-actions">
                <div class="table-actions">
                    <button class="btn-edit" onclick="editBook(${book.book_id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="showDeleteModal(${book.book_id}, '${(book.title || '').replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updateBatchBar();
}

function formatGenres(genres) {
    if (!genres || genres.length === 0) return '-';
    return genres.slice(0, 2).join(', ') + (genres.length > 2 ? '...' : '');
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, pages, total } = pagination;
    
    if (pages <= 1) {
        container.innerHTML = `<span class="pagination-info">共 ${total} 本</span>`;
        return;
    }
    
    let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="loadBooks(${page - 1})">上一页</button>`;
    
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    if (startPage > 1) html += `<button onclick="loadBooks(1)">1</button>`;
    if (startPage > 2) html += '<span>...</span>';
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="loadBooks(${i})">${i}</button>`;
    }
    
    if (endPage < pages - 1) html += '<span>...</span>';
    if (endPage < pages) html += `<button onclick="loadBooks(${pages})">${pages}</button>`;
    
    html += `<button ${page >= pages ? 'disabled' : ''} onclick="loadBooks(${page + 1})">下一页</button>`;
    html += `<span class="pagination-info">共 ${total} 本</span>`;
    
    container.innerHTML = html;
}

function showAddModal() {
    currentBookId = null;
    selectedGenres = [];
    document.getElementById('modal-book-title').innerHTML = '<i class="fas fa-plus"></i> 新增图书';
    document.getElementById('book-form').reset();
    document.querySelectorAll('.genre-tag').forEach(tag => tag.classList.remove('active'));
    closeModal('modal-book');
    setTimeout(() => document.getElementById('modal-book').classList.add('show'), 10);
}

async function editBook(bookId) {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/books/${bookId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            const book = data.book;
            currentBookId = bookId;
            selectedGenres = book.genres || [];
            
            document.getElementById('modal-book-title').innerHTML = '<i class="fas fa-edit"></i> 编辑图书';
            document.getElementById('book-id').value = book.book_id;
            document.getElementById('book-isbn').value = book.isbn || '';
            document.getElementById('book-title').value = book.title || '';
            document.getElementById('book-author').value = book.author || '';
            document.getElementById('book-publish-date').value = book.publish_date || '';
            document.getElementById('book-total-copies').value = book.total_copies || 1;
            document.getElementById('book-cover-url').value = book.cover_url || '';
            document.getElementById('book-introduction').value = book.introduction || '';
            document.getElementById('book-douban-link').value = book.douban_link || '';
            document.getElementById('book-video-link').value = book.video_link || '';
            
            document.querySelectorAll('.genre-tag').forEach(tag => {
                if (selectedGenres.includes(tag.dataset.genre)) {
                    tag.classList.add('active');
                } else {
                    tag.classList.remove('active');
                }
            });
            
            document.getElementById('modal-book').classList.add('show');
        } else {
            alert('获取图书信息失败');
        }
    } catch (err) {
        console.error('获取图书失败:', err);
        alert('操作失败');
    }
}

function toggleGenre(element) {
    const genre = element.dataset.genre;
    element.classList.toggle('active');
    
    if (element.classList.contains('active')) {
        if (!selectedGenres.includes(genre)) {
            selectedGenres.push(genre);
        }
    } else {
        selectedGenres = selectedGenres.filter(g => g !== genre);
    }
}

async function saveBook() {
    const token = localStorage.getItem('token');
    
    const bookData = {
        isbn: document.getElementById('book-isbn').value.trim(),
        title: document.getElementById('book-title').value.trim(),
        author: document.getElementById('book-author').value.trim(),
        publish_date: document.getElementById('book-publish-date').value,
        total_copies: parseInt(document.getElementById('book-total-copies').value) || 1,
        cover_url: document.getElementById('book-cover-url').value.trim(),
        introduction: document.getElementById('book-introduction').value.trim(),
        douban_link: document.getElementById('book-douban-link').value.trim(),
        video_link: document.getElementById('book-video-link').value.trim(),
        genres: selectedGenres
    };
    
    if (!bookData.isbn) {
        alert('请输入ISBN');
        return;
    }
    if (!bookData.title) {
        alert('请输入书名');
        return;
    }
    
    try {
        const url = currentBookId 
            ? `/api/admin/books/${currentBookId}` 
            : '/api/admin/books';
        const method = currentBookId ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookData)
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(currentBookId ? '图书更新成功' : '图书添加成功');
            closeModal('modal-book');
            loadBooks(bookPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('保存图书失败:', err);
        alert('操作失败');
    }
}

function showDeleteModal(bookId, title) {
    currentBookId = bookId;
    document.getElementById('delete-book-title').textContent = title;
    document.getElementById('modal-delete').classList.add('show');
}

async function confirmDelete() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/admin/books/${currentBookId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            alert('图书删除成功');
            closeModal('modal-delete');
            loadBooks(bookPage);
        } else {
            alert(data.message || '删除失败');
        }
    } catch (err) {
        console.error('删除图书失败:', err);
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
    loadGenres();
    loadBooks(1);
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });
});

function toggleSelectBook(bookId, checked) {
    if (checked) {
        selectedBooks.add(bookId);
    } else {
        selectedBooks.delete(bookId);
    }
    updateBatchBar();
}

function toggleSelectAll(checked) {
    if (isAllSelected) {
        clearSelection();
        return;
    }
    
    const checkboxes = document.querySelectorAll('.book-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        const id = parseInt(cb.dataset.id);
        if (checked) {
            selectedBooks.add(id);
        } else {
            selectedBooks.delete(id);
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
    const { search, genre, status } = bookFilters;
    
    try {
        let url = '/api/admin/books/ids?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (genre) url += `genre=${encodeURIComponent(genre)}&`;
        if (status) url += `status=${status}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            selectedBooks = new Set(data.book_ids);
            isAllSelected = true;
            
            const checkboxes = document.querySelectorAll('.book-checkbox');
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
    selectedBooks.clear();
    isAllSelected = false;
    
    const checkboxes = document.querySelectorAll('.book-checkbox');
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
    
    if (selectedBooks.size > 0 || isAllSelected) {
        bar.style.display = 'flex';
        countEl.textContent = selectedBooks.size;
        
        if (totalInfo) {
            totalInfo.textContent = `（共 ${filteredTotal} 条符合条件）`;
        }
        
        if (selectAllBtn) {
            if (isAllSelected) {
                selectAllBtn.textContent = '清除选择';
                selectAllBtn.onclick = clearSelection;
            } else if (selectedBooks.size < filteredTotal) {
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

async function batchDeleteBooks() {
    if (selectedBooks.size === 0) {
        alert('请先选择要删除的图书');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedBooks.size} 本图书吗？此操作不可恢复！`)) return;
    
    const token = localStorage.getItem('token');
    const ids = Array.from(selectedBooks);
    
    try {
        const res = await fetch('/api/admin/books/batch-delete', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ book_ids: ids })
        });
        const data = await res.json();
        
        if (data.ok) {
            alert(`成功删除 ${data.deleted_count || ids.length} 本图书`);
            selectedBooks.clear();
            isAllSelected = false;
            loadBooks(bookPage);
        } else {
            alert(data.message || '删除失败');
        }
    } catch (err) {
        console.error('批量删除失败:', err);
        alert('操作失败');
    }
}

async function quickUpdateStock(bookId, newStock) {
    const token = localStorage.getItem('token');
    const stock = parseInt(newStock) || 0;
    
    try {
        const res = await fetch(`/api/admin/books/${bookId}/stock`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ available_copies: stock })
        });
        const data = await res.json();
        
        if (data.ok) {
            const row = document.querySelector(`tr[data-id="${bookId}"]`);
            if (row) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = `status-badge ${stock > 0 ? 'available' : 'unavailable'}`;
                    statusBadge.textContent = stock > 0 ? '可借' : '已借完';
                }
                const stockSpan = row.querySelector('.stock-edit span');
                if (stockSpan && data.book) {
                    stockSpan.textContent = `/ ${data.book.total_copies}`;
                }
            }
        } else {
            alert(data.message || '更新失败');
        }
    } catch (err) {
        console.error('更新库存失败:', err);
        alert('操作失败');
    }
}

async function exportBooks() {
    const token = localStorage.getItem('token');
    const { search, genre, status } = bookFilters;
    
    try {
        let url = '/api/admin/books/export?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (genre) url += `genre=${encodeURIComponent(genre)}&`;
        if (status) url += `status=${status}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            alert('导出失败');
            return;
        }
        
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `图书列表_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    } catch (err) {
        console.error('导出失败:', err);
        alert('导出失败');
    }
}

document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loadBooks(1);
    }
});

function showBatchStockModal() {
    if (selectedBooks.size === 0) {
        alert('请先选择要调整库存的图书');
        return;
    }
    document.getElementById('batch-stock-count').textContent = selectedBooks.size;
    document.getElementById('batch-stock-operation').value = 'add';
    document.getElementById('batch-stock-amount').value = 1;
    updateBatchStockHint();
    document.getElementById('modal-batch-stock').classList.add('show');
}

function updateBatchStockHint() {
    const operation = document.getElementById('batch-stock-operation').value;
    const hint = document.getElementById('batch-stock-hint');
    if (operation === 'add') {
        hint.textContent = '将增加选中图书的可借数量和总库存';
    } else {
        hint.textContent = '将减少选中图书的可借数量和总库存，库存不足的图书将被跳过';
    }
}

document.getElementById('batch-stock-operation')?.addEventListener('change', updateBatchStockHint);

async function confirmBatchStock() {
    const token = localStorage.getItem('token');
    const operation = document.getElementById('batch-stock-operation').value;
    const amount = parseInt(document.getElementById('batch-stock-amount').value) || 0;
    
    if (amount <= 0) {
        alert('请输入有效的数量');
        return;
    }
    
    const actionText = operation === 'add' ? '增加' : '减少';
    if (!confirm(`确定要为选中的 ${selectedBooks.size} 本图书${actionText} ${amount} 本库存吗？`)) {
        return;
    }
    
    try {
        const res = await fetch('/api/admin/books/batch-stock', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                book_ids: Array.from(selectedBooks),
                operation: operation,
                amount: amount
            })
        });
        const data = await res.json();
        
        if (data.ok) {
            let message = `成功调整 ${data.success_count} 本图书库存`;
            if (data.errors && data.errors.length > 0) {
                message += `\n跳过 ${data.errors.length} 本: ${data.errors.map(e => e.title || e.book_id).join(', ')}`;
            }
            alert(message);
            closeModal('modal-batch-stock');
            selectedBooks.clear();
            isAllSelected = false;
            loadBooks(bookPage);
        } else {
            alert(data.message || '操作失败');
        }
    } catch (err) {
        console.error('批量调整库存失败:', err);
        alert('操作失败');
    }
}

function showImportModal() {
    previewData = null;
    importFile = null;
    document.getElementById('import-step-1').style.display = 'block';
    document.getElementById('import-step-2').style.display = 'none';
    document.getElementById('import-step-3').style.display = 'none';
    document.getElementById('btn-import-preview').style.display = 'none';
    document.getElementById('import-file').value = '';
    document.getElementById('modal-import').classList.add('show');
}

const fileDropZone = document.getElementById('file-drop-zone');
const fileInput = document.getElementById('import-file');

if (fileDropZone && fileInput) {
    fileDropZone.addEventListener('click', () => fileInput.click());
    
    fileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropZone.classList.add('dragover');
    });
    
    fileDropZone.addEventListener('dragleave', () => {
        fileDropZone.classList.remove('dragover');
    });
    
    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImportFile(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImportFile(e.target.files[0]);
        }
    });
}

async function handleImportFile(file) {
    importFile = file;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'preview');
    
    try {
        document.getElementById('import-step-1').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 正在解析文件...</div>';
        
        const res = await fetch('/api/admin/books/import', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        
        if (data.ok) {
            previewData = data.preview;
            
            const newCountEl = document.getElementById('preview-new');
            const updateCountEl = document.getElementById('preview-update');
            const invalidCountEl = document.getElementById('preview-invalid');
            if (newCountEl) newCountEl.textContent = data.new_count || 0;
            if (updateCountEl) updateCountEl.textContent = data.update_count || 0;
            if (invalidCountEl) invalidCountEl.textContent = data.invalid_count || 0;
            
            const tbody = document.getElementById('preview-tbody');
            tbody.innerHTML = data.preview.map(item => {
                const intro = (item.introduction || '').substring(0, 30) + ((item.introduction || '').length > 30 ? '...' : '');
                const genres = (item.genres || []).join(', ') || '-';
                const statusHtml = item.valid 
                    ? (item.is_update 
                        ? '<span class="status-update"><i class="fas fa-sync-alt"></i> 将更新</span>'
                        : '<span class="status-valid"><i class="fas fa-plus"></i> 新增</span>')
                    : `<span class="status-invalid"><i class="fas fa-times"></i> ${item.errors.join(', ')}</span>`;
                
                const actionHtml = item.is_update 
                    ? `<label class="update-stock-label"><input type="checkbox" class="update-stock-check" data-row="${item.row}"> 更新库存</label>`
                    : '';
                
                return `
                    <tr class="${item.valid ? (item.is_update ? 'update-row' : '') : 'invalid-row'}">
                        <td>${item.row}</td>
                        <td>${item.isbn || '-'}</td>
                        <td>${item.title || '-'}</td>
                        <td>${item.author || '-'}</td>
                        <td title="${item.introduction || ''}">${intro || '-'}</td>
                        <td>${genres}</td>
                        <td>${item.total_copies}/${item.available_copies}</td>
                        <td>${statusHtml}</td>
                        <td>${actionHtml}</td>
                    </tr>
                `;
            }).join('');
            
            document.getElementById('import-step-1').style.display = 'none';
            document.getElementById('import-step-2').style.display = 'block';
            
            if (data.valid_count > 0) {
                document.getElementById('btn-import-preview').style.display = 'inline-flex';
            }
        } else {
            alert(data.message || '解析文件失败');
            document.getElementById('import-step-1').innerHTML = `
                <div class="file-upload-area" id="file-drop-zone">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>拖拽文件到此处，或点击选择文件</p>
                    <p class="file-types">支持 CSV、JSON、Excel (.xlsx/.xls) 格式</p>
                    <input type="file" id="import-file" accept=".csv,.json,.xlsx,.xls" hidden>
                </div>
                <div class="import-actions">
                    <a href="javascript:void(0)" class="download-template-link" onclick="downloadImportTemplate()">
                        <i class="fas fa-download"></i> 下载导入模板
                    </a>
                </div>
            `;
            const newFileDropZone = document.getElementById('file-drop-zone');
            const newFileInput = document.getElementById('import-file');
            newFileDropZone.addEventListener('click', () => newFileInput.click());
            newFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) handleImportFile(e.target.files[0]);
            });
        }
    } catch (err) {
        console.error('预览文件失败:', err);
        alert('解析文件失败');
    }
}

async function executeImport() {
    if (!previewData || !importFile) {
        alert('请先选择文件');
        return;
    }
    
    const token = localStorage.getItem('token');
    const file = importFile;
    
    const updateStockRows = [];
    document.querySelectorAll('.update-stock-check:checked').forEach(cb => {
        updateStockRows.push(parseInt(cb.dataset.row));
    });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'import');
    formData.append('update_stock_rows', JSON.stringify(updateStockRows));
    
    try {
        document.getElementById('btn-import-preview').disabled = true;
        document.getElementById('btn-import-preview').innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导入中...';
        
        const res = await fetch('/api/admin/books/import', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        
        if (data.ok) {
            const resultText = `新增 ${data.imported_count} 本，更新 ${data.updated_count} 本`;
            document.getElementById('import-success-count').textContent = data.imported_count;
            document.getElementById('import-updated-count').textContent = data.updated_count;
            document.getElementById('import-result-text').textContent = resultText;
            document.getElementById('import-skip-info').textContent = data.skipped_count > 0 ? `跳过 ${data.skipped_count} 条无效数据` : '';
            
            document.getElementById('import-step-2').style.display = 'none';
            document.getElementById('import-step-3').style.display = 'block';
            document.getElementById('btn-import-preview').style.display = 'none';
            
            loadBooks(1);
        } else {
            alert(data.message || '导入失败');
            document.getElementById('btn-import-preview').disabled = false;
            document.getElementById('btn-import-preview').innerHTML = '<i class="fas fa-upload"></i> 确认导入';
        }
    } catch (err) {
        console.error('导入失败:', err);
        alert('导入失败');
        document.getElementById('btn-import-preview').disabled = false;
        document.getElementById('btn-import-preview').innerHTML = '<i class="fas fa-upload"></i> 确认导入';
    }
}

async function downloadImportTemplate() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/admin/books/import-template', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'books_import_template.csv';
        link.click();
    } catch (err) {
        console.error('下载模板失败:', err);
        alert('下载模板失败');
    }
}