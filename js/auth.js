const Auth = {
    async login(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const originalText = btn.innerHTML;

        // UI Loading
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        btn.disabled = true;
        document.getElementById('loginError').classList.add('hidden');

        try {
            const phone = document.getElementById('loginPhone').value;
            const pass = document.getElementById('loginPass').value;
            const res = await App.call('login', { phone, password: pass });

            if (res.success) {
                App.user = res;
                localStorage.setItem('dreams_user', JSON.stringify(res));
                App.loadDashboard();
            } else {
                document.getElementById('loginError').innerText = res.message;
                document.getElementById('loginError').classList.remove('hidden');
            }
        } catch (err) {
            document.getElementById('loginError').innerText = err.message;
            document.getElementById('loginError').classList.remove('hidden');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    logout() {
        localStorage.removeItem('dreams_user');
        location.reload();
    },

    async changePassword() {
        const newPass = document.getElementById('newPass').value;
        if (!newPass) return UI.showError("ادخل كلمة المرور الجديدة");

        UI.loader(true);
        try {
            const res = await App.call('changePassword', { userId: App.user.userId, newPass });
            UI.showError(res.message);
            if (res.success) {
                UI.toggleChangePass(false);
                document.getElementById('newPass').value = '';
            }
        } catch (e) { UI.showError(e.message); }
        UI.loader(false);
    }
};
