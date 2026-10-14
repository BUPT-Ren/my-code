const app = getApp();

Page({
  data: {
    userInfo: null,
    settings: {
      nickname: '',
      phone: '',
      school: '',
      birthday: '',
      hobbies: [],
      avatar_url: ''
    },
    hobbyOptions: ['文学', '历史', '科技', '心理学', '经济', '哲学', '艺术', '其他'],
    loading: false,
    saving: false
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const user = wx.getStorageSync('user');
    const userId = app.getUserId();

    if (!user || !userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(function() {
        wx.navigateBack();
      }, 1500);
      return;
    }

    const that = this;
    that.setData({ loading: true });

    app.request({
      url: '/api/profile',
      success: function(res) {
        if (res.ok && (res.profile || res.user)) {
          const profile = res.profile || res.user;
          let hobbies = profile.hobbies || [];
          if (typeof hobbies === 'string') {
            try {
              hobbies = JSON.parse(hobbies);
            } catch (e) {
              hobbies = [];
            }
          }

          that.setData({
            userInfo: user,
            settings: {
              nickname: profile.nickname || user.phone || '',
              phone: profile.phone || user.phone || '',
              school: profile.school || '',
              birthday: profile.birthday || '',
              hobbies: hobbies,
              avatar_url: profile.avatar_url || ''
            },
            loading: false
          });
        } else {
          that.setData({
            userInfo: user,
            settings: {
              nickname: user.phone || '',
              phone: user.phone || '',
              school: '',
              birthday: '',
              hobbies: [],
              avatar_url: ''
            },
            loading: false
          });
        }
      },
      fail: function() {
        that.setData({
          userInfo: user,
          settings: {
            nickname: user.phone || '',
            phone: user.phone || '',
            school: '',
            birthday: '',
            hobbies: [],
            avatar_url: ''
          },
          loading: false
        });
      }
    });
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      ['settings.' + field]: value
    });
  },

  onHobbyChange(e) {
    const hobby = e.currentTarget.dataset.hobby;
    let hobbies = this.data.settings.hobbies.slice();
    
    const index = hobbies.indexOf(hobby);
    if (index > -1) {
      hobbies.splice(index, 1);
    } else {
      if (hobbies.length < 5) {
        hobbies.push(hobby);
      } else {
        wx.showToast({
          title: '最多选择5个偏好',
          icon: 'none'
        });
        return;
      }
    }

    this.setData({
      'settings.hobbies': hobbies
    });
  },

  onBirthdayChange(e) {
    this.setData({
      'settings.birthday': e.detail.value
    });
  },

  onChooseAvatar() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePath = res.tempFilePaths[0];
        that.uploadAvatar(tempFilePath);
      }
    });
  },

  uploadAvatar(filePath) {
    const that = this;
    const token = wx.getStorageSync('token');

    wx.uploadFile({
      url: app.globalData.API_BASE_URL + '/api/upload/avatar',
      filePath: filePath,
      name: 'avatar',
      header: {
        'Authorization': 'Bearer ' + token
      },
      success: function(res) {
        const data = JSON.parse(res.data);
        if (data.ok && data.url) {
          that.setData({
            'settings.avatar_url': data.url
          });
          wx.showToast({
            title: '头像已更新',
            icon: 'success'
          });
        }
      },
      fail: function() {
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        });
      }
    });
  },

  onSave() {
    const that = this;
    const userId = app.getUserId();

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ saving: true });

    const data = {
      school: this.data.settings.school,
      birthday: this.data.settings.birthday,
      hobbies: this.data.settings.hobbies,
      avatar_url: this.data.settings.avatar_url
    };

    app.request({
      url: '/api/settings',
      method: 'POST',
      data: data,
      success: function(res) {
        that.setData({ saving: false });
        if (res.ok) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          
          const user = wx.getStorageSync('user') || {};
          user.avatar_url = data.avatar_url;
          wx.setStorageSync('user', user);
          
          setTimeout(function() {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.message || '保存失败',
            icon: 'none'
          });
        }
      },
      fail: function() {
        that.setData({ saving: false });
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  },

  goBack() {
    wx.navigateBack();
  }
});