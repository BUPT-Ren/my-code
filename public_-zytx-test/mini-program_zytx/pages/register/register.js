const app = getApp();

Page({
  data: {
    identifier: '',
    password: '',
    confirmPassword: '',
    loading: false,
    showPassword: false,
    agreed: false
  },

  onIdentifierInput(e) {
    this.setData({ identifier: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  onTogglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  onAgreeChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 });
  },

  onRegister() {
    const identifier = this.data.identifier.trim();
    const password = this.data.password;
    const confirmPassword = this.data.confirmPassword;

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

    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    if (!this.data.agreed) {
      wx.showToast({ title: '请阅读并同意用户协议', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    const that = this;
    app.request({
      url: '/api/auth/register',
      method: 'POST',
      data: {
        identifier: identifier,
        password: password
      },
      success: function(res) {
        if (res.ok) {
          const user = res.user || (res.data && res.data.user);
          const token = res.token || (res.data && res.data.token);
          
          if (user && token) {
            wx.setStorageSync('user', user);
            wx.setStorageSync('token', token);
          }
          
          wx.showToast({ title: '注册成功', icon: 'success' });
          
          setTimeout(function() {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({ title: res.message || '注册失败', icon: 'none' });
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

  onGoToLogin() {
    wx.navigateBack();
  }
});