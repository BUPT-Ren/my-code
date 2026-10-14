const app = getApp();

Page({
  data: {
    book: null,
    bookId: null,
    isFavorited: false,
    showBorrowModal: false,
    selectedDate: 0,
    contact: '',
    dates: ['今天', '明天', '后天'],
    currentTab: 'intro',
    comments: [],
    loading: true,
    hasPendingRequest: false,
    requestId: null,
    coverColors: [
      '#5B8DEF', '#7BA3F5', '#5BCCF4', '#6BD8FF', '#5BDA95',
      '#6BE5A5', '#A8C4E8', '#8BB8F5', '#7BA3F5', '#9BC5F5'
    ]
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ bookId: options.id });
      this.loadBookDetail(options.id);
    }
  },

  onShow() {
    if (this.data.bookId) {
      this.updateFavoriteStatus(this.data.bookId);
      this.checkPendingRequest(this.data.bookId);
    }
  },

  loadBookDetail(bookId) {
    const that = this;
    
    this.setData({ loading: true });
    
    app.request({
      url: '/api/books/' + bookId,
      success: function(res) {
        if (res.ok && res.book) {
          const b = res.book;
          
          const book = {
            book_id: b.book_id,
            title: b.title,
            author: b.author,
            publisher: b.publisher,
            isbn: b.isbn,
            cover: b.cover_url,
            cover_url: b.cover_url,
            introduction: b.introduction,
            genres: b.genres,
            available: b.available_copies,
            total_copies: b.total_copies,
            location: b.location,
            publish_date: b.publish_date,
            coverColor: that.data.coverColors[(parseInt(bookId) - 1) % that.data.coverColors.length]
          };
          
          that.setData({
            book: book,
            loading: false
          });
          
          that.updateFavoriteStatus(bookId);
          that.checkPendingRequest(bookId);
        } else {
          that.setData({ loading: false });
          that.loadFromMock(bookId);
        }
      },
      fail: function() {
        that.setData({ loading: false });
        that.loadFromMock(bookId);
      }
    });
  },

  loadFromMock(bookId) {
    const book = app.mockBooks.find(function(b) { 
      return b.id === parseInt(bookId); 
    });
    
    if (book) {
      book.coverColor = this.data.coverColors[(parseInt(bookId) - 1) % this.data.coverColors.length];
      book.book_id = book.id;
      this.setData({ book: book });
    }
  },

  updateFavoriteStatus(bookId) {
    const userId = app.getUserId();
    if (!userId) return;
    
    const that = this;
    
    app.request({
      url: '/api/favorites?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.favorites) {
          const isFavorited = res.favorites.some(function(f) {
            return (f.book_id || f.id) === parseInt(bookId);
          });
          that.setData({ isFavorited: isFavorited });
        }
      }
    });
  },

  checkPendingRequest(bookId) {
    const userId = app.getUserId();
    if (!userId) return;

    const that = this;
    app.request({
      url: '/api/borrow/pending-books',
      success: function(res) {
        if (res.ok && res.pending_books) {
          const pending = res.pending_books[bookId];
          if (pending) {
            that.setData({
              hasPendingRequest: true,
              requestId: pending
            });
          } else {
            that.setData({
              hasPendingRequest: false,
              requestId: null
            });
          }
        }
      }
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  onToggleFavorite() {
    const that = this;
    const userId = app.getUserId();
    const bookId = this.data.book.book_id;
    
    if (!userId) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: function(res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }
    
    const isFavorited = this.data.isFavorited;
    
    app.request({
      url: '/api/favorites',
      method: isFavorited ? 'DELETE' : 'POST',
      data: {
        user_id: userId,
        book_id: bookId
      },
      success: function(res) {
        if (res.ok) {
          that.setData({ isFavorited: !isFavorited });
          wx.showToast({
            title: isFavorited ? '已取消' : '已收藏',
            icon: 'success'
          });
        }
      }
    });
  },

  onOpenBorrowModal() {
    const userId = app.getUserId();
    if (!userId) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: function(res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }
    
    if (this.data.book.available <= 0) {
      wx.showToast({ title: '该书已借完', icon: 'none' });
      return;
    }

    if (this.data.hasPendingRequest) {
      wx.showToast({ title: '已有待审核的借阅申请', icon: 'none' });
      return;
    }

    this.setData({ showBorrowModal: true });
  },

  onCloseBorrowModal() {
    this.setData({ showBorrowModal: false, selectedDate: 0, contact: '' });
  },

  onDateSelect(e) {
    this.setData({ selectedDate: e.currentTarget.dataset.index });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  onConfirmBorrow() {
    const that = this;
    const userId = app.getUserId();
    const bookId = this.data.book.book_id;
    
    app.request({
      url: '/api/borrow/request',
      method: 'POST',
      data: {
        book_id: bookId
      },
      success: function(res) {
        if (res.ok) {
          that.setData({
            showBorrowModal: false,
            hasPendingRequest: true,
            requestId: res.request_id
          });
          
          wx.showToast({ title: '借阅申请已提交', icon: 'success' });
        } else {
          wx.showToast({ title: res.message || '申请失败', icon: 'none' });
        }
      },
      fail: function() {
        wx.showToast({ title: '申请失败', icon: 'none' });
      }
    });
  },

  onCancelRequest() {
    const that = this;
    
    if (!this.data.requestId) return;

    wx.showModal({
      title: '撤销申请',
      content: '确定要撤销借阅申请吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          app.request({
            url: '/api/borrow/requests/' + that.data.requestId + '/cancel',
            method: 'POST',
            success: function(r) {
              if (r.ok) {
                that.setData({
                  hasPendingRequest: false,
                  requestId: null
                });
                wx.showToast({ title: '已撤销', icon: 'success' });
              }
            }
          });
        }
      }
    });
  },

  onShareAppMessage() {
    const book = this.data.book;
    return {
      title: '推荐好书：《' + book.title + '》',
      path: '/pages/book-detail/book-detail?id=' + (book.book_id || book.id),
      imageUrl: book.cover
    };
  }
});