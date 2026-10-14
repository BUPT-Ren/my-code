const app = getApp();

Page({
  data: {
    activeTab: 'borrowing',
    borrowedBooks: [],
    pendingRequests: [],
    pendingStatus: {},
    loading: false,
    coverColors: [
      '#5B8DEF', '#7BA3F5', '#5BCCF4', '#6BD8FF', '#5BDA95',
      '#6BE5A5', '#A8C4E8', '#8BB8F5', '#7BA3F5', '#9BC5F5'
    ]
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData();
  },

  loadData() {
    this.loadBorrowed();
    this.loadPendingRequests();
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  loadBorrowed() {
    const userId = app.getUserId();
    
    if (!userId) {
      this.setData({ 
        borrowedBooks: [],
        loading: false
      });
      return;
    }

    const that = this;
    that.setData({ loading: true });

    app.request({
      url: '/api/borrowed?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.borrowed) {
          const borrowedBooks = res.borrowed.map(function(item, index) {
            return {
              record_id: item.record_id || item.id,
              book_id: item.book_id,
              title: item.title || item.book_title,
              author: item.author,
              cover_url: item.cover_url,
              borrow_time: item.borrow_time,
              due_time: item.due_time || item.due_date,
              status: item.status,
              daysLeft: that.calculateDaysLeft(item.due_time || item.due_date),
              coverColor: that.data.coverColors[index % that.data.coverColors.length]
            };
          });
          
          that.setData({
            borrowedBooks: borrowedBooks,
            loading: false
          });
        } else {
          that.setData({
            borrowedBooks: [],
            loading: false
          });
        }
        wx.stopPullDownRefresh();
      },
      fail: function() {
        that.setData({ loading: false });
        wx.stopPullDownRefresh();
      }
    });
  },

  loadPendingRequests() {
    const userId = app.getUserId();
    if (!userId) return;

    const that = this;

    app.request({
      url: '/api/borrow/requests?status=pending',
      success: function(res) {
        if (res.ok && res.requests) {
          const pendingStatus = {};
          res.requests.forEach(function(req) {
            if (req.record_id) {
              pendingStatus[req.record_id] = req;
            }
          });
          
          that.setData({
            pendingRequests: res.requests,
            pendingStatus: pendingStatus
          });
        }
      }
    });
  },

  calculateDaysLeft(dueTime) {
    if (!dueTime) return 0;
    const now = new Date();
    const due = new Date(dueTime);
    const diff = due - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  },

  onBookTap(e) {
    const bookId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/book-detail/book-detail?id=' + bookId
    });
  },

  onRequestReturn(e) {
    const recordId = e.currentTarget.dataset.recordId;
    const bookTitle = e.currentTarget.dataset.title;

    wx.showModal({
      title: '归还申请',
      content: '归还书籍需要管理员审核，确定要提交归还申请吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          that.submitReturnRequest(recordId, bookTitle);
        }
      }
    });

    const that = this;
    that.currentRecordId = recordId;
    that.currentBookTitle = bookTitle;
  },

  submitReturnRequest(recordId, bookTitle) {
    const that = this;
    
    wx.showLoading({ title: '提交中...' });
    
    app.request({
      url: '/api/return/request',
      method: 'POST',
      data: {
        record_id: recordId
      },
      success: function(r) {
        wx.hideLoading();
        if (r.ok) {
          wx.showToast({
            title: '申请已提交',
            icon: 'success'
          });
          that.loadData();
        } else {
          wx.showToast({
            title: r.message || '申请失败',
            icon: 'none'
          });
        }
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({
          title: '请求失败',
          icon: 'none'
        });
      }
    });
  },

  onRequestRenew(e) {
    const recordId = e.currentTarget.dataset.recordId;
    const bookTitle = e.currentTarget.dataset.title;

    wx.showModal({
      title: '续借申请',
      content: '续借申请需要管理员审核，确定要申请续借《' + bookTitle + '》吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          that.submitRenewRequest(recordId);
        }
      }
    });

    const that = this;
    that.currentRecordId = recordId;
  },

  submitRenewRequest(recordId) {
    const that = this;
    
    wx.showLoading({ title: '提交中...' });
    
    app.request({
      url: '/api/renew/request',
      method: 'POST',
      data: {
        record_id: recordId,
        duration: 15,
        reason: '需要更多时间阅读'
      },
      success: function(r) {
        wx.hideLoading();
        if (r.ok) {
          wx.showToast({
            title: '续借申请已提交',
            icon: 'success'
          });
          that.loadData();
        } else {
          wx.showToast({
            title: r.message || '申请失败',
            icon: 'none'
          });
        }
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({
          title: '请求失败',
          icon: 'none'
        });
      }
    });
  },

  onCancelRequest(e) {
    const that = this;
    const requestId = e.currentTarget.dataset.id;
    const bookTitle = e.currentTarget.dataset.title;

    wx.showModal({
      title: '撤销申请',
      content: '确定要撤销《' + bookTitle + '》的申请吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          
          app.request({
            url: '/api/borrow/requests/' + requestId + '/cancel',
            method: 'POST',
            success: function(r) {
              wx.hideLoading();
              if (r.ok) {
                wx.showToast({
                  title: '已撤销',
                  icon: 'success'
                });
                that.loadData();
              } else {
                wx.showToast({
                  title: r.message || '撤销失败',
                  icon: 'none'
                });
              }
            },
            fail: function() {
              wx.hideLoading();
              wx.showToast({
                title: '请求失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  getRequestTypeText(type) {
    const typeMap = {
      'borrow': '借阅申请',
      'return': '还书申请',
      'renew': '续借申请',
      'lost': '挂失申请'
    };
    return typeMap[type] || '未知申请';
  },

  goBack() {
    wx.navigateBack();
  }
});