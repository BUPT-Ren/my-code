const app = getApp();

Page({
  data: {
    activities: [],
    activeType: 'all',
    activityTypes: [
      { id: 'all', name: '全部' },
      { id: 'published', name: '报名中' },
      { id: 'ongoing', name: '进行中' },
      { id: 'ended', name: '已结束' }
    ],
    registeredStatus: {},
    page: 1,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadActivities();
  },

  onShow() {
    this.loadActivities();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, activities: [] });
    this.loadActivities();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadActivities(true);
    }
  },

  loadActivities(loadMore) {
    if (typeof loadMore === 'undefined') {
      loadMore = false;
    }
    
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    const that = this;
    const status = this.data.activeType === 'all' ? '' : this.data.activeType;
    
    app.request({
      url: '/api/activities?status=' + status + '&page=' + this.data.page + '&per_page=10',
      success: function(res) {
        if (res.ok) {
          let activities = res.activities || [];
          
          activities = activities.map(function(a) {
            return {
              activity_id: a.activity_id,
              title: a.title,
              description: a.description,
              cover_image: a.cover_image,
              start_time: that.formatDateTime(a.start_time),
              end_time: that.formatDateTime(a.end_time),
              location: a.location,
              max_participants: a.max_participants,
              approved_count: a.approved_count || 0,
              status: a.status,
              registration_start_time: that.formatDateTime(a.registration_start_time),
              registration_end_time: that.formatDateTime(a.registration_end_time)
            };
          });
          
          if (loadMore) {
            that.setData({
              activities: that.data.activities.concat(activities),
              loading: false,
              hasMore: activities.length >= 10
            });
          } else {
            that.setData({
              activities: activities,
              loading: false,
              hasMore: activities.length >= 10
            });
          }
          
          that.loadMyRegistrations();
        } else {
          that.setData({ loading: false });
          wx.showToast({ title: res.message || '加载失败', icon: 'none' });
        }
      },
      fail: function() {
        that.setData({ loading: false });
      }
    });
  },

  loadMyRegistrations() {
    const userId = app.getUserId();
    if (!userId) return;
    
    const that = this;
    const activities = this.data.activities;
    const registeredStatus = {};
    
    activities.forEach(function(activity) {
      app.request({
        url: '/api/activities/' + activity.activity_id + '/my-registration',
        success: function(res) {
          if (res.ok && res.registered && res.registration) {
            registeredStatus[activity.activity_id] = res.registration.status;
            that.setData({
              registeredStatus: Object.assign({}, that.data.registeredStatus, registeredStatus)
            });
          }
        }
      });
    });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return month + '-' + day + ' ' + hour + ':' + minute;
    } catch (e) {
      return dateStr;
    }
  },

  onTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ 
      activeType: type,
      page: 1,
      activities: []
    });
    this.loadActivities();
  },

  onRegister(e) {
    const activityId = e.currentTarget.dataset.id;
    const activity = this.data.activities.find(function(a) { 
      return a.activity_id === activityId; 
    });
    
    if (!activity) return;

    if (this.data.registeredStatus[activityId]) {
      wx.showToast({ title: '已报名', icon: 'none' });
      return;
    }

    if (!app.checkLogin()) {
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
      content: '确定要报名「' + activity.title + '」吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          that.registerActivity(activity);
        }
      }
    });
  },

  registerActivity(activity) {
    const that = this;
    
    app.request({
      url: '/api/activities/' + activity.activity_id + '/register',
      method: 'POST',
      success: function(res) {
        if (res.ok) {
          wx.showToast({ title: '报名成功', icon: 'success' });
          var registeredStatus = that.data.registeredStatus;
          registeredStatus[activity.activity_id] = 'pending';
          that.setData({ registeredStatus: registeredStatus });
        } else {
          wx.showToast({ title: res.message || '报名失败', icon: 'none' });
        }
      },
      fail: function() {
        wx.showToast({ title: '报名失败', icon: 'none' });
      }
    });
  },

  onCancelRegister(e) {
    const activityId = e.currentTarget.dataset.id;
    const that = this;

    wx.showModal({
      title: '取消报名',
      content: '确定要取消报名吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          that.cancelRegistration(activityId);
        }
      }
    });
  },

  cancelRegistration(activityId) {
    const that = this;
    
    app.request({
      url: '/api/activities/' + activityId + '/cancel',
      method: 'POST',
      success: function(res) {
        if (res.ok) {
          wx.showToast({ title: '已取消报名', icon: 'success' });
          var registeredStatus = that.data.registeredStatus;
          registeredStatus[activityId] = 'cancelled';
          that.setData({ registeredStatus: registeredStatus });
        } else {
          wx.showToast({ title: res.message || '取消失败', icon: 'none' });
        }
      },
      fail: function() {
        wx.showToast({ title: '取消失败', icon: 'none' });
      }
    });
  },

  onViewDetail(e) {
    const activityId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/activity-detail/activity-detail?id=' + activityId
    });
  }
});