Page({
  // 页面数据
  data: {
    activityList: [
      {
        id: 1,
        img: "/images/activity.png",
        title: "2021新年日程计划",
        desc: "2021新年计划，牛年大吉！",
        count: 311
      },
      {
        id: 2,
        img: "/images/activity.png",
        title: "2021新年日程计划",
        desc: "2021新年计划，牛年大吉！",
        count: 311
      }
    ]
  },

  // 报名按钮点击事件
  handleSignUp(e) {
    wx.showToast({
      title: "报名成功",
      icon: "success"
    })
  }
})