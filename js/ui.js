const UI = {
    loader(show) {
        const el = document.getElementById('globalLoader');
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    },

    showError(msg) {
        // Simple Toast implementation
        const toast = document.createElement('div');
        toast.className = "fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-[100] text-sm font-bold flex items-center gap-2 fade-in";
        toast.innerHTML = `<i class="fas fa-info-circle text-yellow-400"></i> ${msg}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    toggleChangePass(show = true) {
        const m = document.getElementById('modal-pass');
        const c = document.getElementById('modal-pass-content');
        if (show) {
            m.classList.remove('hidden');
            setTimeout(() => { c.classList.remove('scale-95', 'opacity-0') }, 10);
        } else {
            c.classList.add('scale-95', 'opacity-0');
            setTimeout(() => { m.classList.add('hidden') }, 300);
        }
    },

    closeReport() {
        const m = document.getElementById('modal-report');
        m.classList.remove('translate-y-0');
        m.classList.add('translate-y-full');
        setTimeout(() => m.classList.add('hidden'), 300);
    },

    openReport() {
        const m = document.getElementById('modal-report');
        m.classList.remove('hidden');
        // Force reflow
        void m.offsetWidth;
        m.classList.remove('translate-y-full');
        m.classList.add('translate-y-0');
    },

    formatName(fullName) {
        if (!fullName) return "";
        const parts = fullName.trim().split(/\s+/);
        if (parts.length <= 3) return fullName;
        return `${parts[0]} ${parts[1]} ${parts[2]}`;
    }
};
