const API_BASE_URL = 'https://www.zhiyuetongxing.cn';

App({
  onLaunch: function() {
    this.initStorage();
  },

  initStorage() {
    const user = wx.getStorageSync('user');
    if (!user) {
      wx.setStorageSync('user', null);
    }
    
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.setStorageSync('token', '');
    }

    const favorites = wx.getStorageSync('favorites');
    if (!favorites) {
      wx.setStorageSync('favorites', []);
    }

    const borrowRecords = wx.getStorageSync('borrowRecords');
    if (!borrowRecords) {
      wx.setStorageSync('borrowRecords', []);
    }

    const chatHistory = wx.getStorageSync('chatHistory');
    if (!chatHistory) {
      wx.setStorageSync('chatHistory', []);
    }

    const readingStats = wx.getStorageSync('readingStats');
    if (!readingStats) {
      wx.setStorageSync('readingStats', {
        totalBooks: 12,
        monthlyData: [
          { month: '1月', count: 2 },
          { month: '2月', count: 1 },
          { month: '3月', count: 3 }
        ],
        categoryPref: {
          '小说': 5,
          '历史': 3,
          '心理学': 2,
          '散文': 1,
          '童话': 1
        },
        readingTime: 48,
        avgSpeed: 2.5
      });
    }

    const activities = wx.getStorageSync('activities');
    if (!activities) {
      wx.setStorageSync('activities', []);
    }
  },

  globalData: {
    API_BASE_URL: API_BASE_URL,
    colors: {
      primary: '#5B8DEF',
      secondary: '#F5F8FA',
      accent: '#5BCCF4',
      textMain: '#2D2D2D',
      textSecondary: '#6B6B6B',
      border: '#E8EEF5',
      success: '#5BDA95',
      warning: '#FFB55B'
    }
  },

  request(options) {
    const token = wx.getStorageSync('token');
    
    const defaultOptions = {
      url: API_BASE_URL + options.url,
      method: options.method || 'GET',
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      },
      data: options.data,
      success: function(res) {
        if (options.success) {
          options.success(res.data);
        }
      },
      fail: function(err) {
        if (options.fail) {
          options.fail(err);
        } else {
          wx.showToast({
            title: '网络请求失败',
            icon: 'none'
          });
        }
      }
    };
    
    if (options.complete) {
      defaultOptions.complete = options.complete;
    }
    
    wx.request(defaultOptions);
  },

  checkLogin() {
    const user = wx.getStorageSync('user');
    const token = wx.getStorageSync('token');
    if (!user || !token) {
      return false;
    }
    return true;
  },

  getUserId() {
    const user = wx.getStorageSync('user');
    return user ? (user.user_id || user.id) : null;
  },

  mockBooks: [
    { id: 1, title: "解忧杂货店", author: "东野圭吾", cover: "https://picsum.photos/seed/book1/300/400", summary: "一家名为解忧杂货店的神秘店铺...", category: "小说", available: 3 },
    { id: 2, title: "追风筝的人", author: "卡勒德·胡赛尼", cover: "https://picsum.photos/seed/book2/300/400", summary: "12岁的阿富汗富家少爷...", category: "小说", available: 2 },
    { id: 3, title: "人类简史", author: "尤瓦尔·赫拉利", cover: "https://picsum.photos/seed/book3/300/400", summary: "从十万年前有生命迹象开始...", category: "历史", available: 5 },
    { id: 4, title: "小王子", author: "安托万·德·圣埃克苏佩里", cover: "https://picsum.photos/seed/book4/300/400", summary: "一个来自B-612星球的小王子...", category: "童话", available: 8 },
    { id: 5, title: "活着", author: "余华", cover: "https://picsum.photos/seed/book5/300/400", summary: "讲述了农村人福贵悲惨的人生...", category: "小说", available: 4 },
    { id: 6, title: "思考，快与慢", author: "丹尼尔·卡尼曼", cover: "https://picsum.photos/seed/book6/300/400", summary: "诺贝尔经济学奖得主卡尼曼...", category: "心理学", available: 3 }
  ],

  mockActivities: [
    { id: 1, title: "春季读书分享会", date: "2024-03-25", time: "14:00-16:00", location: "图书馆报告厅", type: "offline", participants: 45, maxParticipants: 60 },
    { id: 2, title: "《解忧杂货店》线上共读", date: "2024-03-28", time: "20:00-21:30", location: "线上", type: "online", participants: 128, maxParticipants: 200 },
    { id: 3, title: "作家见面会：余华", date: "2024-04-05", time: "19:00-21:00", location: "学生活动中心", type: "offline", participants: 180, maxParticipants: 300 }
  ]
});