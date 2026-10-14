const app = getApp();

Page({
  data: {
    notifications: [],
    loading: true,
    unreadCount: 0
  },

  onLoad() {
    this.loadNotifications();
  },

  onShow() {
    this.loadNotifications();
  },

  onPullDownRefresh() {
    this.loadNotifications();
  },

  loadNotifications() {
    const userId = app.getUserId();
    
    if (!userId) {
      this.setData({ 
        loading: false,
        notifications: []
      });
      return;
    }

    const that = this;
    that.setData({ loading: true });

    app.request({
      url: '/api/notifications?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.notifications) {
          const notifications = res.notifications.map(function(item) {
            return {
              notification_id: item.notification_id || item.id,
              title: item.title,
              content: item.content || item.message,
              type: item.type,
              is_read: item.is_read || item.read,
              created_at: item.created_at || item.time,
              related_id: item.related_id,
              related_type: item.related_type
            };
          });
          
          const unreadCount = notifications.filter(function(n) {
            return !n.is_read;
          }).length;
          
          that.setData({
            notifications: notifications,
            unreadCount: unreadCount,
            loading: false
          });
        } else {
          that.setData({
            notifications: [],
            unreadCount: 0,
            loading: false
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

  onNotificationTap(e) {
    const that = this;
    const notificationId = e.currentTarget.dataset.id;
    const notification = this.data.notifications.find(function(n) {
      return n.notification_id === notificationId;
    });

    if (!notification) return;

    if (!notification.is_read) {
      app.request({
        url: '/api/notifications/' + notificationId + '/read',
        method: 'POST',
        success: function(res) {
          if (res.ok) {
            const notifications = that.data.notifications.map(function(n) {
              if (n.notification_id === notificationId) {
                n.is_read = true;
              }
              return n;
            });
            const unreadCount = that.data.unreadCount - 1;
            that.setData({
              notifications: notifications,
              unreadCount: unreadCount
            });
          }
        }
      });
    }

    if (notification.related_type === 'book' && notification.related_id) {
      wx.navigateTo({
        url: '/pages/book-detail/book-detail?id=' + notification.related_id
      });
    } else if (notification.related_type === 'activity' && notification.related_id) {
      wx.navigateTo({
        url: '/pages/activity-detail/activity-detail?id=' + notification.related_id
      });
    }
  },

  onMarkAllRead() {
    const that = this;
    const userId = app.getUserId();

    if (!userId) return;

    wx.showModal({
      title: '全部已读',
      content: '确定将所有通知标记为已读吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          const notifications = that.data.notifications.map(function(n) {
            return {
              ...n,
              is_read: true
            };
          });

          that.setData({
            notifications: notifications,
            unreadCount: 0
          });

          wx.showToast({
            title: '已全部标记',
            icon: 'success'
          });
        }
      }
    });
  },

  getNotificationIcon(type) {
    const iconMap = {
      'borrow': '📚',
      'return': '📤',
      'activity': '📅',
      'system': '🔔',
      'reminder': '⏰'
    };
    return iconMap[type] || '📢';
  },

  goBack() {
    wx.navigateBack();
  }
});