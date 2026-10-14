const app = getApp();

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    stats: {
      favorites: 0,
      borrowed: 0,
      notifications: 0
    },
    loading: false
  },

  onShow() {
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const isLoggedIn = app.checkLogin();
    const user = wx.getStorageSync('user');
    
    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: user
    });
    
    if (isLoggedIn) {
      this.loadUserStats();
    }
  },

  loadUserStats() {
    const userId = app.getUserId();
    if (!userId) return;
    
    const that = this;
    
    app.request({
      url: '/api/favorites?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.favorites) {
          that.setData({
            'stats.favorites': res.favorites.length
          });
        }
      }
    });
    
    app.request({
      url: '/api/borrowed?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.borrowed) {
          that.setData({
            'stats.borrowed': res.borrowed.length
          });
        }
      }
    });
    
    app.request({
      url: '/api/notifications?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.notifications) {
          const unreadCount = res.notifications.filter(function(n) {
            return !n.is_read && !n.read;
          }).length;
          that.setData({
            'stats.notifications': unreadCount
          });
        }
      }
    });
  },

  goToPage(e) {
    const page = e.currentTarget.dataset.page;
    
    if (!this.data.isLoggedIn && page !== '/pages/login/login') {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    
    wx.navigateTo({ url: page });
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onLogout() {
    const that = this;
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          wx.removeStorageSync('user');
          wx.removeStorageSync('token');
          that.setData({
            isLoggedIn: false,
            userInfo: null,
            stats: { favorites: 0, borrowed: 0, notifications: 0 }
          });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  }
});