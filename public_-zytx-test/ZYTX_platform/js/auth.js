// 用户类型切换处理
const userTypeRadios = document.querySelectorAll('input[name="user-type"]');
const adminKeyGroup = document.getElementById('admin-key-group');
const adminKeyInput = document.getElementById('admin-key');

if (userTypeRadios.length > 0) {
  userTypeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'admin') {
        adminKeyGroup.style.display = 'block';
        adminKeyInput.required = true;
      } else {
        adminKeyGroup.style.display = 'none';
        adminKeyInput.required = false;
        adminKeyInput.value = '';
      }
    });
  });
}

// 登录表单提交
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;

    if (!identifier || !password) {
      alert('请输入完整信息');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        const user = data.user || null;
        if (user) localStorage.setItem('user', JSON.stringify(user));
        
        // 检查是否为管理员并跳转
        const isAdmin = await checkAdminStatus();
        if (isAdmin) {
          alert('登录成功');
          window.location.href = '/admin.html';
        } else {
          alert('登录成功');
          window.location.href = '/index.html';
        }
      } else {
        alert(data.message || '登录失败');
      }
    } catch (err) {
      console.error(err);
      alert('请求失败，请检查后端是否启动');
    }
  });
}

// 注册表单提交
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const identifier = document.getElementById('register-identifier').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const agree = document.getElementById('agree').checked;
    const birthday = document.getElementById('register-birthday')?.value || null;
    const school = document.getElementById('register-school')?.value || null;
    const hobbies = document.getElementById('register-hobbies')?.value || null;
    
    // 获取用户类型
    const userType = document.querySelector('input[name="user-type"]:checked')?.value || 'user';
    const adminKey = adminKeyInput?.value || '';

    if (!identifier || !password || !confirm) {
      alert('请填写完整信息');
      return;
    }
    if (password !== confirm) {
      alert('两次密码输入不一致');
      return;
    }
    if (password.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }
    if (!agree) {
      alert('请先同意用户协议和隐私政策');
      return;
    }
    
    // 管理员注册需要密钥
    if (userType === 'admin' && !adminKey) {
      alert('请输入管理员密钥');
      return;
    }

    // 准备请求数据
    const requestData = { 
      identifier, 
      password,
      birthday,
      school,
      hobbies: hobbies ? hobbies.split(/[,，、\s]+/).filter(h => h.trim()) : []
    };
    
    // 根据用户类型选择 API
    const apiEndpoint = userType === 'admin' ? '/api/auth/register-admin' : '/api/auth/register';
    if (userType === 'admin') {
      requestData.admin_key = adminKey;
    }

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        const user = data.user || null;
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          alert(userType === 'admin' ? '管理员账号注册成功，已登录' : '注册成功，已登录');
          // 管理员跳转到管理页面，普通用户跳转到首页
          window.location.href = userType === 'admin' ? '/admin.html' : '/index.html';
        } else {
          alert('注册成功，请登录');
          window.location.href = '/login.html';
        }
      } else {
        alert(data.message || '注册失败');
      }
    } catch (err) {
      console.error(err);
      alert('请求失败，请检查后端是否启动');
    }
  });
}

// 检查是否为管理员
async function checkAdminStatus() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const res = await fetch('/api/auth/check-admin', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    return data.ok && data.is_admin;
  } catch (err) {
    console.error('检查管理员状态失败:', err);
    return false;
  }
}

// 获取Token
function getToken() {
  return localStorage.getItem('token');
}

// 检查是否已登录
function isLoggedIn() {
  return !!getToken();
}

// 登出
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

// 显示忘记密码弹窗
function showForgotPasswordModal() {
  document.getElementById('forgot-phone').value = '';
  document.getElementById('forgot-reason').value = '';
  document.getElementById('modal-forgot-password').classList.add('show');
}

// 关闭弹窗
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// 点击弹窗外部关闭
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('show');
    }
  });
});

// 提交忘记密码申请
async function submitForgotPassword() {
  const phone = document.getElementById('forgot-phone').value.trim();
  const reason = document.getElementById('forgot-reason').value.trim();
  
  if (!phone) {
    alert('请输入手机号');
    return;
  }
  
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    alert('请输入正确的手机号');
    return;
  }
  
  try {
    const res = await fetch('/api/auth/password-reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, reason })
    });
    const data = await res.json();
    
    if (data.ok) {
      alert('申请已提交，请等待管理员处理');
      closeModal('modal-forgot-password');
    } else {
      alert(data.message || '提交失败');
    }
  } catch (err) {
    console.error(err);
    alert('请求失败，请稍后重试');
  }
}