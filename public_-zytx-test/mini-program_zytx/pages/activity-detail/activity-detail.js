const app = getApp();

Page({
  data: {
    activity: null,
    loading: true,
    registration: null,
    isLoggedIn: false,
    activityId: null
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ activityId: options.id });
      this.loadActivityDetail(options.id);
    }
  },

  onShow() {
    const isLoggedIn = app.checkLogin();
    this.setData({ isLoggedIn: isLoggedIn });
    
    if (this.data.activityId) {
      this.loadActivityDetail(this.data.activityId);
    }
  },

  loadActivityDetail(activityId) {
    const that = this;
    
    this.setData({ loading: true });
    
    app.request({
      url: '/api/activities/' + activityId,
      success: function(res) {
        if (res.ok && res.activity) {
          const activity = res.activity;
          
          activity.start_time_str = that.formatDateTime(activity.start_time);
          activity.end_time_str = that.formatDateTime(activity.end_time);
          activity.registration_start_time_str = that.formatDateTime(activity.registration_start_time);
          activity.registration_end_time_str = that.formatDateTime(activity.registration_end_time);
          
          that.setData({
            activity: activity,
            loading: false
          });
          
          if (that.data.isLoggedIn) {
            that.loadMyRegistration(activityId);
          }
        } else {
          that.setData({ loading: false });
          wx.showToast({ title: '加载失败', icon: 'none' });
        }
      },
      fail: function() {
        that.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });
  },

  loadMyRegistration(activityId) {
    const that = this;
    
    app.request({
      url: '/api/activities/' + activityId + '/my-registration',
      success: function(res) {
        if (res.ok && res.registered && res.registration) {
          that.setData({ registration: res.registration });
        } else {
          that.setData({ registration: null });
        }
      },
      fail: function() {
        that.setData({ registration: null });
      }
    });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
    } catch (e) {
      return dateStr;
    }
  },

  onRegister() {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再报名',
        confirmText: '去登录',
        success: function(res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }

    const that = this;
    wx.showModal({
      title: '确认报名',
      content: '确定要报名「' + this.data.activity.title + '」吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          that.registerActivity();
        }
      }
    });
  },

  registerActivity() {
    const that = this;
    
    wx.showLoading({ title: '提交中...' });
    
    app.request({
      url: '/api/activities/' + this.data.activity.activity_id + '/register',
      method: 'POST',
      success: function(res) {
        wx.hideLoading();
        if (res.ok) {
          wx.showToast({ title: '报名成功', icon: 'success' });
          that.setData({ registration: { status: 'pending' } });
          that.loadActivityDetail(that.data.activity.activity_id);
        } else {
          wx.showToast({ title: res.message || '报名失败', icon: 'none' });
        }
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({ title: '报名失败', icon: 'none' });
      }
    });
  },

  onCancelRegister() {
    const that = this;
    
    wx.showModal({
      title: '取消报名',
      content: '确定要取消报名吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          that.cancelRegistration();
        }
      }
    });
  },

  cancelRegistration() {
    const that = this;
    
    wx.showLoading({ title: '处理中...' });
    
    app.request({
      url: '/api/activities/' + this.data.activity.activity_id + '/cancel',
      method: 'POST',
      success: function(res) {
        wx.hideLoading();
        if (res.ok) {
          wx.showToast({ title: '已取消报名', icon: 'success' });
          that.setData({ registration: null });
          that.loadActivityDetail(that.data.activity.activity_id);
        } else {
          wx.showToast({ title: res.message || '取消失败', icon: 'none' });
        }
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({ title: '取消失败', icon: 'none' });
      }
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.activity ? this.data.activity.title : '智阅同行活动',
      path: '/pages/activity-detail/activity-detail?id=' + (this.data.activity ? this.data.activity.activity_id : '')
    };
  }
});