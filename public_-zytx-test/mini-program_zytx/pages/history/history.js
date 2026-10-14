const app = getApp();

Page({
  data: {
    historyList: [],
    loading: true,
    page: 1,
    hasMore: true,
    coverColors: [
      '#5B8DEF', '#7BA3F5', '#5BCCF4', '#6BD8FF', '#5BDA95',
      '#6BE5A5', '#A8C4E8', '#8BB8F5', '#7BA3F5', '#9BC5F5'
    ]
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    if (this.data.historyList.length === 0) {
      this.loadHistory();
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, historyList: [], hasMore: true });
    this.loadHistory();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadHistory(true);
    }
  },

  loadHistory(append) {
    if (typeof append === 'undefined') {
      append = false;
    }
    
    const userId = app.getUserId();
    
    if (!userId) {
      this.setData({ 
        loading: false,
        historyList: []
      });
      return;
    }

    if (this.data.loading && append) return;
    
    this.setData({ loading: true });

    const that = this;

    app.request({
      url: '/api/history?user_id=' + userId + '&page=' + this.data.page + '&page_size=20',
      success: function(res) {
        if (res.ok && res.history) {
          const historyList = res.history.map(function(item, index) {
            return {
              record_id: item.record_id || item.id,
              book_id: item.book_id,
              title: item.title || item.book_title,
              author: item.author,
              cover_url: item.cover_url,
              borrow_time: item.borrow_time,
              return_time: item.return_time || item.actual_return_time,
              due_time: item.due_time,
              status: item.status,
              coverColor: that.data.coverColors[(that.data.historyList.length + index) % that.data.coverColors.length]
            };
          });
          
          if (append) {
            that.setData({
              historyList: that.data.historyList.concat(historyList),
              loading: false,
              hasMore: historyList.length >= 20
            });
          } else {
            that.setData({
              historyList: historyList,
              loading: false,
              hasMore: historyList.length >= 20
            });
          }
        } else {
          that.setData({
            loading: false,
            hasMore: false
          });
        }
        wx.stopPullDownRefresh();
      },
      fail: function() {
        that.setData({ loading: false });
        wx.stopPullDownRefresh();
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    });
  },

  onBookTap(e) {
    const bookId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/book-detail/book-detail?id=' + bookId
    });
  },

  getStatusText(status) {
    const statusMap = {
      'returned': '已归还',
      'borrowed': '借阅中',
      'overdue': '已逾期'
    };
    return statusMap[status] || status;
  },

  goBack() {
    wx.navigateBack();
  }
});