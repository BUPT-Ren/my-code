const app = getApp();

Page({
  data: {
    phone: '',
    reason: '',
    loading: false
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onReasonInput(e) {
    this.setData({ reason: e.detail.value });
  },

  onSubmit() {
    const phone = this.data.phone.trim();
    const reason = this.data.reason.trim();

    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    const that = this;
    app.request({
      url: '/api/auth/password-reset-request',
      method: 'POST',
      data: {
        phone: phone,
        reason: reason
      },
      success: function(res) {
        if (res.ok) {
          wx.showModal({
            title: '提交成功',
            content: '您的密码重置申请已提交，请等待管理员处理。',
            showCancel: false,
            success: function() {
              wx.navigateBack();
            }
          });
        } else {
          wx.showToast({ title: res.message || '提交失败', icon: 'none' });
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

  goBack() {
    wx.navigateBack();
  }
});