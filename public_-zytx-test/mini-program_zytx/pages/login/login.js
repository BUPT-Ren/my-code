const app = getApp();

Page({
  data: {
    identifier: '',
    password: '',
    loading: false,
    showPassword: false
  },

  onLoad() {
    if (app.checkLogin()) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  onIdentifierInput(e) {
    this.setData({ identifier: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onTogglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  onLogin() {
    const identifier = this.data.identifier.trim();
    const password = this.data.password;

    if (!identifier) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(identifier)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    if (password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    const that = this;
    app.request({
      url: '/api/auth/login',
      method: 'POST',
      data: {
        identifier: identifier,
        password: password
      },
      success: function(res) {
        if (res.ok) {
          const user = res.user || (res.data && res.data.user);
          const token = res.token || (res.data && res.data.token);
          
          wx.setStorageSync('user', user);
          wx.setStorageSync('token', token || '');
          
          wx.showToast({ title: '登录成功', icon: 'success' });
          
          setTimeout(function() {
            wx.switchTab({ url: '/pages/index/index' });
          }, 1500);
        } else {
          wx.showToast({ title: res.message || '登录失败', icon: 'none' });
        }
      },
      fail: function() {
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      },
      complete: function() {
        that.setData({ loading: false });
      }
    });
  },

  onGoToRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  onForgotPassword() {
    wx.navigateTo({ url: '/pages/forgot-password/forgot-password' });
  }
});