const settingsForm = document.getElementById('settings-form');

async function loadUserSettings() {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) return;
    const userId = user.user_id || user.id;
    if (!userId) return;

    try {
        const res = await fetch(`/api/settings?user_id=${userId}`);
        const data = await res.json();
        if (res.ok && data.ok) {
            const s = data.settings || data.data || {};
            document.getElementById('settings-phone').value = s.phone || user.phone || '';
            document.getElementById('settings-birthday').value = s.birthday ? new Date(s.birthday).toISOString().split('T')[0] : '';
            document.getElementById('settings-school').value = s.school || '';
            const hobbiesVal = s.hobbies ? (Array.isArray(s.hobbies) ? s.hobbies.join('、') : (typeof s.hobbies === 'string' ? s.hobbies : JSON.stringify(s.hobbies))) : '';
            document.getElementById('settings-hobbies').value = hobbiesVal;
        }
    } catch (err) {
        console.error('加载设置失败', err);
    }
}

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!user) { alert('请先登录'); return; }
    const userId = user.user_id || user.id;
    if (!userId) { alert('无法识别用户'); return; }

    const newPhone = document.getElementById('settings-phone').value.trim();
    const oldPassword = document.getElementById('settings-old-password').value;
    const newPassword = document.getElementById('settings-new-password').value;
    const confirmPassword = document.getElementById('settings-confirm-password').value;

    if (newPhone && !/^\d{11}$/.test(newPhone)) {
        alert('手机号必须是11位数字');
        return;
    }

    if (newPassword || confirmPassword || oldPassword) {
        if (!oldPassword) {
            alert('修改密码需要输入旧密码');
            return;
        }
        if (!newPassword) {
            alert('请输入新密码');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('两次输入的新密码不一致');
            return;
        }
    }

    const payload = {
        user_id: userId,
        birthday: document.getElementById('settings-birthday').value || null,
        hobbies: (document.getElementById('settings-hobbies').value || '').split(/[、,，]/).map(s=>s.trim()).filter(Boolean),
        school: document.getElementById('settings-school').value || null,
        avatar_url: null
    };

    try {
        const { res, data: d } = await fetchJson('/api/settings', { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        
        if (!res || !res.ok || !d || !d.ok) {
            alert((d && d.message) || '保存基本信息失败');
            return;
        }

        if (newPhone && newPhone !== user.phone) {
            const { res: phoneRes, data: phoneData } = await fetchJson('/api/change_phone', {
                method: 'POST',
                body: JSON.stringify({ new_phone: newPhone })
            });
            if (phoneRes && phoneRes.ok && phoneData && phoneData.ok) {
                user.phone = newPhone;
            } else {
                alert((phoneData && phoneData.message) || '手机号修改失败');
                return;
            }
        }

        if (newPassword) {
            const { res: pwdRes, data: pwdData } = await fetchJson('/api/change_password', {
                method: 'POST',
                body: JSON.stringify({ 
                    old_password: oldPassword, 
                    new_password: newPassword 
                })
            });
            if (!pwdRes || !pwdRes.ok || !pwdData || !pwdData.ok) {
                alert((pwdData && pwdData.message) || '密码修改失败');
                return;
            }
            document.getElementById('settings-old-password').value = '';
            document.getElementById('settings-new-password').value = '';
            document.getElementById('settings-confirm-password').value = '';
        }

        if (payload.school) { user.school = payload.school; }
        if (payload.birthday) { user.birthday = payload.birthday; }
        if (payload.hobbies) { user.hobbies = payload.hobbies; }
        localStorage.setItem('user', JSON.stringify(user));

        alert('设置已保存');
    } catch (err) {
        console.error('保存设置失败', err);
        alert('请求失败，请检查后端');
    }
});

window.addEventListener('DOMContentLoaded', loadUserSettings);