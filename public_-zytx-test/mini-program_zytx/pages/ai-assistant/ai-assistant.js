const app = getApp();

Page({
  data: {
    messages: [],
    inputValue: '',
    isTyping: false,
    scrollIntoView: '',
    quickQuestions: [
      { id: 1, question: '推荐几本治愈系书籍' },
      { id: 2, question: '如何培养阅读习惯' },
      { id: 3, question: '我想读历史，有什么好书' },
      { id: 4, question: '快速了解一本好书的方法' }
    ]
  },

  onLoad() {
    this.loadChatHistory();
    
    if (this.data.messages.length === 0) {
      this.addMessage('assistant', '你好呀！我是你的 AI 阅读助手 📚\n\n我可以帮你：\n• 推荐好书\n• 制定阅读计划\n• 解答阅读相关问题\n• 提取书摘笔记\n\n有什么想聊的吗？');
    }
  },

  onShow() {
    this.scrollToBottom();
  },

  loadChatHistory() {
    const userId = app.getUserId();
    if (!userId) {
      const history = wx.getStorageSync('chatHistory') || [];
      this.setData({ messages: history });
      return;
    }

    const that = this;
    app.request({
      url: '/api/ai/history?user_id=' + userId,
      success: function(res) {
        if (res.ok && res.history && res.history.length > 0) {
          const messages = res.history.map(function(item) {
            return {
              id: Date.now() + Math.random(),
              type: item.role === 'user' ? 'user' : 'assistant',
              content: item.content,
              time: that.formatTime(item.created_at || new Date())
            };
          });
          that.setData({ messages: messages });
        }
      }
    });
  },

  saveChatHistory() {
    wx.setStorageSync('chatHistory', this.data.messages);
  },

  addMessage(type, content) {
    const messages = this.data.messages.concat([{
      id: Date.now(),
      type: type,
      content: content,
      time: this.formatTime(new Date())
    }]);
    this.setData({ messages: messages });
    this.saveChatHistory();
    this.scrollToBottom();
  },

  formatTime(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + ':' + minutes;
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  onSendMessage() {
    const content = this.data.inputValue.trim();
    if (!content || this.data.isTyping) return;

    this.addMessage('user', content);
    this.setData({ inputValue: '', isTyping: true });

    this.sendToAI(content);
  },

  sendToAI(message) {
    const that = this;
    const userId = app.getUserId();

    if (!userId) {
      setTimeout(function() {
        const reply = that.generateLocalReply(message);
        that.setData({ isTyping: false });
        that.addMessage('assistant', reply);
      }, 1000);
      return;
    }

    app.request({
      url: '/api/ai/chat',
      method: 'POST',
      data: {
        message: message
      },
      success: function(res) {
        that.setData({ isTyping: false });
        if (res.ok && res.content) {
          that.addMessage('assistant', res.content);
        } else {
          const reply = that.generateLocalReply(message);
          that.addMessage('assistant', reply);
        }
      },
      fail: function() {
        that.setData({ isTyping: false });
        const reply = that.generateLocalReply(message);
        that.addMessage('assistant', reply);
      }
    });
  },

  generateLocalReply(question) {
    const q = question.toLowerCase();
    
    if (q.includes('治愈') || q.includes('温暖') || q.includes('安慰')) {
      return '治愈系书籍推荐 📖：\n\n1. 《解忧杂货店》- 东野圭吾\n   温暖人心的故事，帮助你找到内心的答案\n\n2. 《小王子》- 圣埃克苏佩里\n   纯真的哲理，成年人也需要读的童话\n\n3. 《追风筝的人》- 卡勒德·胡赛尼\n   感人至深的友情与救赎\n\n这些书都很适合在疲惫的时候阅读～ ✨';
    }
    
    if (q.includes('历史')) {
      return '历史类好书推荐 📜：\n\n1. 《人类简史》- 尤瓦尔·赫拉利\n   宏观视角看人类发展史\n\n2. 《万历十五年》- 黄仁宇\n   从微观事件看明朝兴衰\n\n3. 《明朝那些事儿》- 当年明月\n   用轻松语言讲述沉重历史\n\n读历史可以明智，以史为鉴可以知兴衰。';
    }
    
    if (q.includes('阅读习惯') || q.includes('培养')) {
      return '培养阅读习惯的小建议 📝：\n\n1. 设定小目标：每天只需读 10-15 分钟\n2. 固定时间：比如睡前或早起后\n3. 随身带书：碎片时间也可以阅读\n4. 远离手机：阅读时关闭社交媒体\n5. 从感兴趣的开始：不要强迫自己\n\n最重要的是：开始就好，不必追求完美！💪';
    }
    
    if (q.includes('快速了解') || q.includes('书评')) {
      return '快速了解一本书的方法 🔍：\n\n1. 先看目录：了解书籍结构\n2. 读序言/前言：了解作者写作目的\n3. 看评论：豆瓣、京东上有评价\n4. 搜索书评：知乎、豆瓣有详细分析\n5. 只看前几章：判断是否值得深入阅读\n\n如果遇到特别喜欢的书，可以做笔记加深印象～';
    }
    
    if (q.includes('推荐')) {
      return '根据你的阅读偏好，推荐以下类型的好书：\n\n• 小说类：《活着》《平凡的世界》《百年孤独》\n• 历史类：《人类简史》《万历十五年》\n• 心理学：《思考，快与慢》《乌合之众》\n• 散文类：《我们仨》《瓦尔登湖》\n\n你最近在读什么书呢？我可以给你更有针对性的推荐～ 📚';
    }
    
    return '感谢你的提问！😊\n\n我是 AI 阅读助手，可以帮你：\n• 📚 书籍推荐 - 根据你的喜好推荐好书\n• 📝 阅读建议 - 制定阅读计划、养成习惯\n• 📖 书籍介绍 - 快速了解一本书的内容\n• 💡 读书笔记 - 帮你整理书摘和心得\n\n请告诉我你想了解什么～';
  },

  onQuickQuestion(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ inputValue: question });
    this.onSendMessage();
  },

  scrollToBottom() {
    const that = this;
    setTimeout(function() {
      that.setData({
        scrollIntoView: 'msg-' + Date.now()
      });
    }, 100);
  },

  onClearHistory() {
    const that = this;
    const userId = app.getUserId();

    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有聊天记录吗？',
      confirmColor: '#5B8DEF',
      success: function(res) {
        if (res.confirm) {
          that.setData({ messages: [] });
          wx.removeStorageSync('chatHistory');
          
          if (userId) {
            app.request({
              url: '/api/ai/history/clear',
              method: 'POST',
              success: function() {}
            });
          }
          
          that.addMessage('assistant', '聊天记录已清空。有什么想聊的吗？');
          
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  }
});