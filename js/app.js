const App = {
    API_URL: "https://script.google.com/macros/s/AKfycbwZW7Ag6XEZSRA8hUP-GnqBMTZauqqh7riffcanAe1HsFjV_srR9iFvlPTld3VrDgFtdw/exec",
    user: null,
    state: {}, // Cache for data

    async init() {
        // Check LocalStorage
        const savedUser = localStorage.getItem('dreams_user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
            this.loadDashboard();
        } else {
            document.getElementById('view-login').classList.remove('hidden');
        }

        // Register Service Worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
        }
    },

    reload() { location.reload(); },

    async call(action, payload = {}) {
        try {
            const fd = new FormData();
            fd.append('action', action);
            fd.append('payload', JSON.stringify(payload));

            const res = await fetch(this.API_URL, { method: 'POST', body: fd });
            const json = await res.json();
            return json;
        } catch (e) {
            throw new Error("فشل الاتصال بالخادم. تأكد من الانترنت.");
        }
    },

    loadDashboard() {
        // 1. Hide Login, Show Dash
        document.getElementById('view-login').classList.add('hidden');
        const dash = document.getElementById('view-dashboard');
        dash.classList.remove('hidden');

        // 2. Setup Headers
        document.getElementById('topNav').classList.remove('hidden');
        if (window.innerWidth < 768) document.getElementById('bottomNav').classList.remove('hidden');

        // 3. User Info
        if (this.user.phone === '01550117880') {
            document.getElementById('dashWelcome').innerText = `${UI.formatName(this.user.name)}`;
        } else {
            document.getElementById('dashWelcome').innerText = `${UI.formatName(this.user.name)}`;
        }
        const roleMap = { 'Admin': 'الإدارة', 'Teacher': 'هيئة التدريس', 'Parent': 'ولي أمر', 'Supervisor': 'مشرف' };
        document.getElementById('dashRole').innerText = roleMap[this.user.role] || this.user.role;

        // 4. Load Role-Specific Content
        if (this.user.role === 'Admin') Admin.init(false);
        else if (this.user.role === 'Supervisor') Admin.init(true);
        else if (this.user.role === 'Teacher') Teacher.init();
        else if (this.user.role === 'Parent') Parent.init();
        else {
            alert("Role not recognized: " + this.user.role);
            document.getElementById('dashboardContent').innerHTML = '<div class="p-10 text-center">Invalid User Role</div>';
            return;
        }
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => App.init());
