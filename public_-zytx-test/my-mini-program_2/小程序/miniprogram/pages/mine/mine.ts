Page({
  data: {
    avatarUrl: '/images/avatar.png', // 默认头像
    userName: '爱饼麻子★',          // 默认用户名
    showNameDialog: false,           // 弹窗显示状态
    tempUserName: '',                // 临时用户名
    // 活动列表数据
    myActivityList: [
      {
        id: 1,
        img: "/images/activity1.jpg",
        title: "2021新年日程计划",
        desc: "2021新年计划，牛年大吉！",
        count: 311
      }
    ]
  },

  // 页面加载读取本地存储
  onLoad() {
    const savedAvatar = wx.getStorageSync('avatarUrl')
    const savedName = wx.getStorageSync('userName')
    if (savedAvatar) this.setData({ avatarUrl: savedAvatar })
    if (savedName) this.setData({ userName: savedName })
  },

  // 选择微信头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({ avatarUrl })
    wx.setStorageSync('avatarUrl', avatarUrl) // 持久化保存
  },

  // 打开用户名弹窗
  openNameDialog() {
    this.setData({
      showNameDialog: true,
      tempUserName: this.data.userName
    })
  },

  // 关闭弹窗
  closeNameDialog() {
    this.setData({ showNameDialog: false })
  },

  // 监听用户名输入
  onNameInput(e) {
    this.setData({ tempUserName: e.detail.value })
  },

  // 保存用户名
  saveUserName() {
    const { tempUserName } = this.data
    if (!tempUserName.trim()) {
      wx.showToast({ title: '用户名不能为空', icon: 'none' })
      return
    }
    this.setData({ userName: tempUserName, showNameDialog: false })
    wx.setStorageSync('userName', tempUserName)
    wx.showToast({ title: '修改成功' })
  }
})