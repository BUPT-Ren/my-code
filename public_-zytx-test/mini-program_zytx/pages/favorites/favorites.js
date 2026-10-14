const app = getApp();

Page({
  data: {
    favorites: [],
    loading: true,
    coverColors: [
      '#5B8DEF', '#7BA3F5', '#5BCCF4', '#6BD8FF', '#5BDA95',
      '#6BE5A5', '#A8C4E8', '#8BB8F5', '#7BA3F5', '#9BC5F5'
    ]
  },

  onLoad() {
    this.loadFavorites();
  },

  onShow() {
    this.loadFavorites();
  },

  onPullDownRefresh() {
    this.loadFavorites();
  },

  loadFavorites() {
    const userId = app.getUserId();
    
    if (!userId) {
      this.setData({ 
        loading: false,
        favorites: []
      });
      return;
    }

    const that = this;
    that.setData({ loading: true });

    app.request({
      url: '/api/favorites?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.favorites) {
          const favorites = res.favorites.map(function(item, index) {
            return {
              book_id: item.book_id || item.id,
              title: item.title,
              author: item.author,
              cover_url: item.cover_url,
              isbn: item.isbn,
              publisher: item.publisher,
              introduction: item.introduction,
              available: item.available_copies !== undefined ? item.available_copies : item.available,
              coverColor: that.data.coverColors[index % that.data.coverColors.length]
            };
          });
          
          that.setData({
            favorites: favorites,
            loading: false
          });
        } else {
          that.setData({
            favorites: [],
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

  onBookTap(e) {
    const bookId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/book-detail/book-detail?id=' + bookId
    });
  },

  onCancelFavorite(e) {
    const that = this;
    const bookId = e.currentTarget.dataset.id;
    const bookTitle = e.currentTarget.dataset.title;
    const userId = app.getUserId();

    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏《' + bookTitle + '》吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          app.request({
            url: '/api/favorites',
            method: 'DELETE',
            data: {
              user_id: userId,
              book_id: bookId
            },
            success: function(r) {
              if (r.ok) {
                wx.showToast({
                  title: '已取消收藏',
                  icon: 'success'
                });
                that.loadFavorites();
              } else {
                wx.showToast({
                  title: r.message || '取消失败',
                  icon: 'none'
                });
              }
            },
            fail: function() {
              wx.showToast({
                title: '请求失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  onBorrow(e) {
    const bookId = e.currentTarget.dataset.id;
    const available = e.currentTarget.dataset.available;
    
    if (!available) {
      wx.showToast({
        title: '该书暂不可借',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/book-detail/book-detail?id=' + bookId + '&action=borrow'
    });
  },

  goBack() {
    wx.navigateBack();
  }
});