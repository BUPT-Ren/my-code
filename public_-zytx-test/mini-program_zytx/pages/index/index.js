const app = getApp();

Page({
  data: {
    searchValue: '',
    categories: ['全部'],
    activeCategory: 0,
    books: [],
    hotBooks: [],
    banners: [
      { id: 1, title: '新书上新', desc: '发现更多好书' },
      { id: 2, title: '读书活动', desc: '参与赢好礼' }
    ],
    loading: false,
    page: 1,
    hasMore: true,
    coverColors: [
      '#5B8DEF', '#7BA3F5', '#5BCCF4', '#6BD8FF', '#5BDA95',
      '#6BE5A5', '#A8C4E8', '#8BB8F5', '#7BA3F5', '#9BC5F5'
    ]
  },

  onLoad() {
    this.loadCategories();
    this.loadBooks();
    this.loadHotBooks();
  },

  onShow() {
    this.updateFavoriteStatus();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, books: [] });
    this.loadBooks();
    this.loadHotBooks();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadBooks(true);
    }
  },

  loadCategories() {
    const that = this;
    app.request({
      url: '/api/genres',
      success: function(res) {
        if (res.ok && res.genres) {
          const categories = ['全部'].concat(res.genres);
          that.setData({ categories: categories });
        }
      }
    });
  },

  loadHotBooks() {
    const that = this;
    app.request({
      url: '/api/popular',
      success: function(res) {
        if (res.ok && res.books) {
          const hotBooks = res.books.slice(0, 4).map(function(b, index) {
            return {
              book_id: b.book_id,
              title: b.title,
              author: b.author,
              cover: b.cover_url,
              available: b.available_copies,
              coverColor: that.data.coverColors[index % that.data.coverColors.length]
            };
          });
          that.setData({ hotBooks: hotBooks });
        }
      }
    });
  },

  loadBooks(loadMore) {
    if (typeof loadMore === 'undefined') {
      loadMore = false;
    }
    
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    const that = this;
    const q = this.data.searchValue || '';
    const genre = this.data.activeCategory > 0 ? this.data.categories[this.data.activeCategory] : '';
    
    let url = '/api/books?page=' + this.data.page + '&page_size=10';
    if (q) {
      url += '&q=' + encodeURIComponent(q);
    }
    if (genre) {
      url += '&genre=' + encodeURIComponent(genre);
    }
    
    app.request({
      url: url,
      success: function(res) {
        if (res.ok && res.books) {
          let books = res.books.map(function(b, index) {
            return {
              book_id: b.book_id,
              id: b.book_id,
              title: b.title,
              author: b.author,
              cover: b.cover_url,
              cover_url: b.cover_url,
              summary: b.introduction || b.summary,
              category: (b.genres && b.genres[0]) || b.category || '未分类',
              available: b.available_copies,
              rating: '4.' + (Math.floor(Math.random() * 9) + 1),
              coverColor: that.data.coverColors[(that.data.books.length + index) % that.data.coverColors.length]
            };
          });
          
          if (loadMore) {
            that.setData({
              books: that.data.books.concat(books),
              loading: false,
              hasMore: books.length >= 10
            });
          } else {
            that.setData({
              books: books,
              loading: false,
              hasMore: books.length >= 10
            });
          }
          
          that.updateFavoriteStatus();
        } else {
          that.setData({ loading: false });
          if (!loadMore) {
            that.useMockData();
          }
        }
      },
      fail: function() {
        that.setData({ loading: false });
        if (!loadMore) {
          that.useMockData();
        }
      }
    });
  },

  useMockData() {
    const books = app.mockBooks.map(function(book, index) {
      return {
        ...book,
        book_id: book.id,
        rating: '4.' + (Math.floor(Math.random() * 9) + 1),
        coverColor: this.data.coverColors[index % this.data.coverColors.length]
      };
    }.bind(this));
    this.setData({
      books: books,
      hotBooks: books.slice(0, 4)
    });
  },

  updateFavoriteStatus() {
    const userId = app.getUserId();
    if (!userId) return;

    const that = this;
    app.request({
      url: '/api/favorites?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.favorites) {
          const favoriteIds = res.favorites.map(function(f) {
            return f.book_id || f.id;
          });
          
          const books = that.data.books.map(function(book) {
            return {
              ...book,
              isFavorited: favoriteIds.indexOf(book.book_id || book.id) > -1
            };
          });
          
          that.setData({ books: books });
        }
      }
    });
  },

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value });
  },

  onSearchConfirm() {
    this.setData({ page: 1, books: [] });
    this.loadBooks();
  },

  onSearchClear() {
    this.setData({ searchValue: '', page: 1, books: [] });
    this.loadBooks();
  },

  onCategoryTap(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeCategory: index, page: 1, books: [] });
    this.loadBooks();
  },

  onBookTap(e) {
    const bookId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/book-detail/book-detail?id=' + bookId
    });
  },

  onQuickFavorite(e) {
    const bookId = e.currentTarget.dataset.id;
    const book = this.data.books.find(function(b) {
      return (b.book_id || b.id) === bookId;
    });
    if (!book) return;
    
    const that = this;
    const userId = app.getUserId();
    
    if (!userId) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: function(res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }
    
    const isFavorited = book.isFavorited;
    
    app.request({
      url: '/api/favorites',
      method: isFavorited ? 'DELETE' : 'POST',
      data: {
        user_id: userId,
        book_id: book.book_id || book.id
      },
      success: function(res) {
        if (res.ok) {
          that.updateFavoriteStatus();
          wx.showToast({
            title: isFavorited ? '已取消' : '已收藏',
            icon: 'success'
          });
        }
      }
    });
  },

  goToActivity() {
    wx.switchTab({ url: '/pages/activity/activity' });
  }
});