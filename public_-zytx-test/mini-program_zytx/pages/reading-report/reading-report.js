const app = getApp();

Page({
  data: {
    stats: {
      totalBooks: 0,
      readingTime: 0,
      avgSpeed: 0,
      borrowedThisMonth: 0,
      favoriteCategory: ''
    },
    categoryData: [],
    radarData: [],
    monthlyData: [],
    readingInsights: '',
    recommendations: [],
    loading: true,
    coverColors: [
      '#5B8DEF', '#7BA3F5', '#5BCCF4', '#6BD8FF', '#5BDA95',
      '#6BE5A5', '#A8C4E8', '#8BB8F5', '#7BA3F5', '#9BC5F5'
    ]
  },

  onLoad() {
    this.loadReadingStats();
  },

  onShow() {
    this.loadReadingStats();
  },

  onPullDownRefresh() {
    this.loadReadingStats();
  },

  loadReadingStats() {
    const userId = app.getUserId();
    const that = this;

    that.setData({ loading: true });

    if (!userId) {
      that.useDefaultData();
      return;
    }

    app.request({
      url: '/api/stats?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.stats) {
          const stats = res.stats;
          
          that.setData({
            'stats.totalBooks': stats.total_books || 0,
            'stats.borrowedThisMonth': stats.borrowed_this_month || 0,
            'stats.favoriteCategory': stats.favorite_category || '',
            'stats.readingTime': Math.round((stats.total_books || 0) * 4),
            'stats.avgSpeed': Math.round((stats.borrowed_this_month || 0) / 4 * 10) / 10
          });

          that.processCategoryData(stats.categories || stats.category_distribution || {});
          that.processRadarData(stats.categories || stats.category_distribution || {});
          that.generateInsights(stats);
          that.loadRecommendations();
        } else {
          that.useDefaultData();
        }
        that.setData({ loading: false });
        wx.stopPullDownRefresh();
      },
      fail: function() {
        that.useDefaultData();
        that.setData({ loading: false });
        wx.stopPullDownRefresh();
      }
    });
  },

  processCategoryData(categories) {
    const total = Object.values(categories).reduce(function(a, b) { return a + b; }, 0) || 1;
    
    const categoryData = Object.entries(categories).map(function(entry) {
      return {
        name: entry[0],
        value: entry[1],
        percentage: Math.round((entry[1] / total) * 100)
      };
    }).sort(function(a, b) { return b.value - a.value; });

    this.setData({ categoryData: categoryData });
  },

  processRadarData(categories) {
    const total = Object.values(categories).reduce(function(a, b) { return a + b; }, 0) || 1;
    
    const allCategories = ['小说', '历史', '心理学', '散文', '童话', '科技', '经济', '哲学'];
    
    const radarData = allCategories.map(function(cat) {
      const count = categories[cat] || 0;
      return {
        name: cat,
        value: Math.round((count / total) * 100)
      };
    });

    this.setData({ radarData: radarData });
  },

  generateInsights(stats) {
    const categories = stats.categories || stats.category_distribution || {};
    const totalBooks = stats.total_books || 0;
    const borrowedThisMonth = stats.borrowed_this_month || 0;
    
    const sortedCategories = Object.entries(categories)
      .sort(function(a, b) { return b[1] - a[1]; });
    
    const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : '小说';
    const topCount = sortedCategories.length > 0 ? sortedCategories[0][1] : 0;

    let insight = '📊 阅读分析报告\n\n';

    if (totalBooks === 0) {
      insight += '暂无借阅记录，快去发现好书吧！\n\n';
      insight += '建议：浏览首页推荐，找到感兴趣的书籍开始阅读之旅～';
    } else {
      insight += '你是一个热爱' + topCategory + '的读者！\n\n';
      
      if (topCount >= totalBooks * 0.5) {
        insight += '阅读偏好非常明显，你对' + topCategory + '类书籍有着浓厚的兴趣。这类书籍能带给你深层次的思考。\n\n';
      }
      
      if (borrowedThisMonth > 0) {
        insight += '本月已借阅 ' + borrowedThisMonth + ' 本书，保持得不错！\n\n';
      }
      
      insight += '💡 建议：尝试阅读不同类型的书籍，拓宽视野。';
    }

    this.setData({ readingInsights: insight });
  },

  loadRecommendations() {
    const userId = app.getUserId();
    const that = this;

    app.request({
      url: '/api/recommend?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.recommendations && res.recommendations.length > 0) {
          const recommendations = res.recommendations.slice(0, 3).map(function(book, index) {
            return {
              id: book.book_id || book.id,
              title: book.title,
              author: book.author,
              coverColor: that.data.coverColors[index % that.data.coverColors.length],
              rating: '4.' + (Math.floor(Math.random() * 9) + 1)
            };
          });
          that.setData({ recommendations: recommendations });
        } else {
          that.useMockRecommendations();
        }
      },
      fail: function() {
        that.useMockRecommendations();
      }
    });
  },

  useMockRecommendations() {
    const recommendations = app.mockBooks.slice(0, 3).map(function(book, index) {
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        coverColor: this.data.coverColors[index % this.data.coverColors.length],
        rating: '4.' + (Math.floor(Math.random() * 9) + 1)
      };
    }.bind(this));

    this.setData({ recommendations: recommendations });
  },

  useDefaultData() {
    this.setData({
      'stats.totalBooks': 0,
      'stats.readingTime': 0,
      'stats.avgSpeed': 0,
      categoryData: [],
      radarData: [
        { name: '小说', value: 0 },
        { name: '历史', value: 0 },
        { name: '心理学', value: 0 },
        { name: '散文', value: 0 },
        { name: '童话', value: 0 },
        { name: '科技', value: 0 }
      ],
      readingInsights: '📊 阅读分析报告\n\n暂无借阅记录，快去发现好书吧！\n\n建议：浏览首页推荐，找到感兴趣的书籍开始阅读之旅～',
      loading: false
    });

    this.useMockRecommendations();
  },

  onBookTap(e) {
    const bookId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/book-detail/book-detail?id=' + bookId
    });
  }
});