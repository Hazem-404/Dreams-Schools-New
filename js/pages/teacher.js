const Teacher = {
    isSupervisor: false,
    classes: [],
    currentClass: null,
    currentSubject: null,
    currentTab: 'Log',

    async init() {
        UI.loader(true);
        try {
            const res = await App.call('getTeacherClasses', { userId: App.user.userId });
            if (!res.success) throw new Error(res.message);

            if (res.classes.length === 0) {
                document.getElementById('dashboardContent').innerHTML = '<div class="bg-white p-8 rounded-xl text-center shadow">لا توجد فصول مسندة إليك</div>';
                return;
            }

            this.classes = res.classes;

            // ✨ Special welcome for the special one ✨
            const phone = String(App.user.phone || '').replace(/\D/g, '');
            if (phone.endsWith('1550117880') || phone === '01550117880') {
                this._showSpecialWelcome(App.user.name);
                return;
            }

            this.renderTabs();
        } catch (e) { UI.showError(e.message); }
        UI.loader(false);
    },

    // ╔══════════════════════════════════════════════════════════════╗
    // ║   ✨ SPECIAL EASTER EGG — أشطر كابتن في المدرسة 🌹          ║
    // ║   لتغيير الرقم: ابحث عن '1550117880' وغيّره                 ║
    // ╚══════════════════════════════════════════════════════════════╝
    _showSpecialWelcome(name) {
        UI.loader(false);
        const displayName = UI.formatName ? UI.formatName(name) : name;

        // ✨ Pink the page background
        document.body.style.background = 'linear-gradient(135deg, #fff0f6 0%, #ffd6e7 50%, #ffb3d1 100%)';

        // ✨ Pink the green welcome card (the one with the name on top)
        this._applyPinkTheme(displayName);

        const content = document.getElementById('dashboardContent');
        content.innerHTML = `
            <style>
                @keyframes floatRose {
                    0%   { transform: translateY(100vh) rotate(0deg); opacity: 0; }
                    10%  { opacity: 1; }
                    90%  { opacity: 0.9; }
                    100% { transform: translateY(-120px) rotate(720deg); opacity: 0; }
                }
                @keyframes pulseGlow {
                    0%, 100% { text-shadow: 0 0 20px #ff69b4, 0 0 40px #ff1493, 0 0 80px #ff69b4; }
                    50%       { text-shadow: 0 0 40px #ff1493, 0 0 80px #ff69b4, 0 0 120px #ff1493; }
                }
                @keyframes bounceIn {
                    0%   { transform: scale(0.3); opacity: 0; }
                    60%  { transform: scale(1.1); opacity: 1; }
                    80%  { transform: scale(0.95); }
                    100% { transform: scale(1); }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .rose-particle {
                    position: fixed; bottom: -60px; font-size: 2rem;
                    animation: floatRose linear infinite;
                    pointer-events: none; z-index: 9999; user-select: none;
                }
                .special-title { animation: pulseGlow 2s ease-in-out infinite, bounceIn 0.8s ease-out; }
                .name-shimmer {
                    background: linear-gradient(90deg, #ff1493, #fff, #ff69b4, #fff, #ff1493);
                    background-size: 200% auto;
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    animation: shimmer 2s linear infinite, bounceIn 1.2s ease-out;
                    display: inline-block;
                }
            </style>

            <div id="roseContainer"></div>

            <div class="min-h-[60vh] flex items-center justify-center">
                <div class="text-center p-10 rounded-3xl shadow-2xl border-4 border-pink-300 relative overflow-hidden"
                    style="background: linear-gradient(135deg, #fff0f6, #ffe4f0, #ffd6e7, #ffb3d1); max-width: 500px; width: 100%;">
                    <div class="absolute top-0 left-0 w-28 h-28 rounded-full opacity-20" style="background: radial-gradient(circle, #ff69b4, transparent); transform: translate(-30%,-30%)"></div>
                    <div class="absolute bottom-0 right-0 w-36 h-36 rounded-full opacity-20" style="background: radial-gradient(circle, #ff1493, transparent); transform: translate(30%,30%)"></div>

                    <div class="text-4xl mb-4 animate-bounce">🌸🌸🌸</div>
                    <div class="special-title text-3xl font-black mb-2" style="color: #ff1493; font-family: 'Cairo', sans-serif;">
                        أشطر كابتن 🌟
                    </div>
                    <div class="name-shimmer text-4xl font-black mb-6" style="font-family: 'Cairo', sans-serif;">
                        ${displayName}
                    </div>
                    <div class="text-2xl mb-6">💗 💕 💗</div>
                    <p class="text-pink-600 font-bold text-lg mb-8" style="font-family: 'Cairo', sans-serif;">
                        أهلاً وسهلاً يا نجمة المدرسة! ✨<br>
                        <span class="text-sm text-pink-400">يلا يا كابتن، الطلاب بينتظروك 🎀</span>
                    </p>
                    <button onclick="Teacher._continueFromWelcome()"
                        class="px-8 py-3 rounded-full font-black text-white text-lg shadow-lg transition transform hover:scale-105 active:scale-95"
                        style="background: linear-gradient(135deg, #ff1493, #ff69b4); box-shadow: 0 4px 15px rgba(255,20,147,0.4);">
                        <i class="fas fa-heart ml-2"></i>يلا نبدأ! 🌹
                    </button>
                </div>
            </div>
        `;

        this._specialName = displayName; // ✨ Store for later

        // ✨ Spawn floating roses
        const roses = ['🌸', '🌸', '🌺', '💮', '🏵️', '💐', '🌷'];
        const container = document.getElementById('roseContainer');
        let count = 0;
        const spawnRose = () => {
            if (count > 80) return;
            const rose = document.createElement('span');
            rose.className = 'rose-particle';
            rose.textContent = roses[Math.floor(Math.random() * roses.length)];
            rose.style.left = Math.random() * 100 + 'vw';
            rose.style.fontSize = (1.5 + Math.random() * 2) + 'rem';
            const dur = 4 + Math.random() * 5;
            rose.style.animationDuration = dur + 's';
            rose.style.animationDelay = Math.random() * 2 + 's';
            container.appendChild(rose);
            count++;
            setTimeout(() => rose.remove(), (dur + 2) * 1000);
        };
        for (let i = 0; i < 30; i++) setTimeout(spawnRose, i * 200);
        const interval = setInterval(spawnRose, 600);
        setTimeout(() => clearInterval(interval), 20000);
    },

    // ✨ Applies/re-applies the pink theme to the green welcome card + page
    _applyPinkTheme(name) {
        name = name || this._specialName || '';
        document.body.style.background = 'linear-gradient(135deg, #fff0f6 0%, #ffd6e7 50%, #ffb3d1 100%)';

        // Pink the green dashboard banner card
        const welcomeCard = document.getElementById('dashWelcome')?.closest('div[class*="bg-gradient"]') ||
            document.querySelector('#view-dashboard > .space-y-6 > div:first-child') ||
            document.querySelector('.bg-gradient-to-l.from-emerald-600');
        if (welcomeCard) {
            welcomeCard.style.background = 'linear-gradient(135deg, #ff1493, #ff69b4, #ffb3d1)';
            welcomeCard.style.boxShadow = '0 8px 30px rgba(255,20,147,0.35)';
            welcomeCard.style.borderBottom = '3px solid rgba(255,255,255,0.3)';
        }

        // Update the welcome text
        const welcomeEl = document.getElementById('dashWelcome');
        if (welcomeEl) {
            welcomeEl.textContent = '🌸 أشطر كابتن 🌸' + name;
            welcomeEl.style.color = 'white';
        }
        const roleEl = document.getElementById('dashRole');
        if (roleEl) {
            roleEl.textContent = '🌸 نجمة المدرسة الأولى 🌸';
            roleEl.style.color = 'rgba(255,255,255,0.9)';
        }
    },

    _continueFromWelcome() {
        // ✨ Remove welcome roses
        document.querySelectorAll('.rose-particle').forEach(r => r.remove());

        // ✨ Render normal tab UI first (so dashWelcome card appears in DOM)
        this.renderTabs();

        // ✨ Re-apply pink theme after render (slight delay so DOM updates)
        setTimeout(() => this._applyPinkTheme(this._specialName), 50);

        // ✨ Spawn soft background roses during work session
        const roses = ['🌸', '🌸', '🌸'];
        const spawnBg = () => {
            const rose = document.createElement('span');
            rose.className = 'rose-particle';
            rose.textContent = roses[Math.floor(Math.random() * roses.length)];
            rose.style.left = Math.random() * 100 + 'vw';
            rose.style.fontSize = (0.8 + Math.random() * 1) + 'rem';
            rose.style.opacity = '0.4';
            const dur = 8 + Math.random() * 6;
            rose.style.animationDuration = dur + 's';
            document.body.appendChild(rose);
            setTimeout(() => rose.remove(), (dur + 1) * 1000);
        };
        const bgInterval = setInterval(spawnBg, 4000);
        setTimeout(() => clearInterval(bgInterval), 30 * 60 * 1000); // ✨ 30 دقيقة
    },
    // ╔══════════════════════════════════════════════════════════════╗
    // ║   ✨ END OF SPECIAL EASTER EGG                              ║
    // ╚══════════════════════════════════════════════════════════════╝


    renderTabs() {
        const html = `
            <div class="flex justify-center mb-6 bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-fit mx-auto flex-wrap gap-1">
                <button onclick="Teacher.switchTab('Log')" id="tab_Log" class="px-5 py-2 rounded-lg font-bold text-sm transition ${this.currentTab === 'Log' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}">
                    <i class="fas fa-edit mr-2"></i>تسجيل حصة
                </button>
                <button onclick="Teacher.switchTab('History')" id="tab_History" class="px-5 py-2 rounded-lg font-bold text-sm transition ${this.currentTab === 'History' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}">
                    <i class="fas fa-history mr-2"></i>سجل الحصص
                </button>
                <button onclick="Teacher.switchTab('Assessments')" id="tab_Assessments" class="px-5 py-2 rounded-lg font-bold text-sm transition ${this.currentTab === 'Assessments' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}">
                    <i class="fas fa-star mr-2"></i>التقييمات
                </button>
            </div>
            <div id="teacherContentArea"></div>
        `;
        document.getElementById('dashboardContent').innerHTML = html;
        this.switchTab(this.currentTab);
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.getElementById('tab_Log').className = `px-5 py-2 rounded-lg font-bold text-sm transition ${tab === 'Log' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`;
        document.getElementById('tab_History').className = `px-5 py-2 rounded-lg font-bold text-sm transition ${tab === 'History' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`;
        document.getElementById('tab_Assessments').className = `px-5 py-2 rounded-lg font-bold text-sm transition ${tab === 'Assessments' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`;

        const content = document.getElementById('teacherContentArea');

        if (tab === 'Log') {
            this.renderLogInterface(content);
        } else if (tab === 'History') {
            this.renderHistory(content);
        } else if (tab === 'Assessments') {
            this.renderAssessmentsInterface(content);
        }
    },

    renderLogInterface(container) {
        container.innerHTML = `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6" id="teacherClassSelect">
                <label class="block text-gray-500 text-sm font-bold mb-2">اختر الفصل / المادة</label>
                <div class="relative">
                    <select onchange="Teacher.loadLogForm(this.value)" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-bold text-gray-700">
                        <option value="">-- اضغط للاختيار --</option>
                        ${this.classes.map((c, i) => `<option value="${i}">${c.className} - ${c.subjectName}</option>`).join('')}
                    </select>
                    <div class="absolute left-4 top-4 text-emerald-600 pointer-events-none"><i class="fas fa-chevron-down"></i></div>
                </div>
            </div>
            <div id="teacherWorkArea" class="min-h-[400px]"></div>
        `;
    },

    async renderHistory(container) {
        container.innerHTML = '<div class="spinner mx-auto mt-10"></div>';
        try {
            const res = await App.call('getTeacherLogHistory', { userId: App.user.userId });
            if (!res.success) throw new Error(res.message);

            if (res.history.length === 0) {
                container.innerHTML = '<div class="text-center p-10 text-gray-400 font-bold">لا توجد سجلات سابقة</div>';
                return;
            }

            // Build unique subjects list for filter
            const subjects = [...new Set(res.history.map(r => r.subjectName).filter(Boolean))];

            // Store full history for filtering
            this._historyData = res.history;

            const filterBar = `
                <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-3 items-center">
                    <div class="relative flex-grow min-w-[160px]">
                        <i class="fas fa-search absolute right-3 top-3 text-gray-400 text-sm"></i>
                        <input type="text" id="histSearch" oninput="Teacher._applyHistoryFilters()" placeholder="بحث..." 
                            class="w-full pr-9 pl-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500 bg-gray-50">
                    </div>
                    <select id="histSubject" onchange="Teacher._applyHistoryFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                        <option value="">كل المواد</option>
                        ${subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                    <select id="histStatus" onchange="Teacher._applyHistoryFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                        <option value="">كل الحالات</option>
                        <option value="Pending">قيد المراجعة</option>
                        <option value="Approved">مقبول</option>
                        <option value="Rejected">مرفوض</option>
                    </select>
                    <span id="histCount" class="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">${res.history.length} سجل</span>
                </div>
                <div id="histTableContainer"></div>
            `;
            container.innerHTML = filterBar;
            this._renderHistoryTable(res.history);
        } catch (e) {
            container.innerHTML = `<div class="text-red-500 text-center p-10">${e.message}</div>`;
        }
    },

    _applyHistoryFilters() {
        if (!this._historyData) return;
        const q = (document.getElementById('histSearch')?.value || '').toLowerCase();
        const sub = document.getElementById('histStatus')?.value || '';  // note: swapped below
        const subjectFilter = document.getElementById('histSubject')?.value || '';
        const statusFilter = document.getElementById('histStatus')?.value || '';
        let data = this._historyData;
        if (subjectFilter) data = data.filter(r => r.subjectName === subjectFilter);
        if (statusFilter) data = data.filter(r => r.status === statusFilter);
        if (q) data = data.filter(r =>
            (r.className || '').toLowerCase().includes(q) ||
            (r.subjectName || '').toLowerCase().includes(q) ||
            (r.content || '').toLowerCase().includes(q)
        );
        const countEl = document.getElementById('histCount');
        if (countEl) countEl.textContent = `${data.length} سجل`;
        this._renderHistoryTable(data);
    },

    _renderHistoryTable(records) {
        const container = document.getElementById('histTableContainer');
        if (!container) return;
        if (!records.length) {
            container.innerHTML = '<div class="text-center p-8 text-gray-400">لا توجد نتائج</div>';
            return;
        }
        const html = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-right min-w-[600px]">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                        <tr>
                            <th class="p-4">التاريخ</th>
                            <th class="p-4">الفصل / المادة</th>
                            <th class="p-4">المحتوى</th>
                            <th class="p-4">الحالة</th>
                            <th class="p-4">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${records.map(row => {
            let statusColor = 'bg-gray-100 text-gray-600';
            let statusText = row.status;
            if (row.status === 'Approved') { statusColor = 'bg-emerald-100 text-emerald-700'; statusText = 'مقبول'; }
            else if (row.status === 'Pending') { statusColor = 'bg-yellow-100 text-yellow-700'; statusText = 'قيد المراجعة'; }
            else if (row.status === 'Rejected') { statusColor = 'bg-red-100 text-red-700'; statusText = 'مرفوض'; }
            return `
                        <tr class="hover:bg-gray-50 transition">
                            <td class="p-4 font-bold text-gray-700 whitespace-nowrap">${row.date}</td>
                            <td class="p-4">
                                <div class="font-bold text-gray-800">${row.className}</div>
                                <div class="text-xs text-gray-500">${row.subjectName}</div>
                            </td>
                            <td class="p-4 text-sm text-gray-600 max-w-xs truncate" title="${row.content || ''}">${row.content || '-'}</td>
                            <td class="p-4">
                                <div class="flex flex-col gap-1">
                                    <span class="${statusColor} px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-opacity-10 w-fit">
                                        ${statusText}
                                    </span>
                                    ${row.supervisorNote ? `<span class="text-purple-600 text-xs font-bold bg-purple-50 px-2 py-1 rounded border border-purple-100" title="ملاحظة المشرف">🔔 ${row.supervisorNote}</span>` : ''}
                                </div>
                            </td>
                            <td class="p-4">
                                ${row.status === 'Pending' ? `
                                    <button onclick='Teacher.editLog(${JSON.stringify(row)})' class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition" title="تعديل">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                        `;
        }).join('')}
                    </tbody>
                    </table>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    // Switch to Edit Mode
    async editLog(log) {
        // 1. Switch Tab
        this.switchTab('Log');

        // 2. Load Form for this Class
        // Find Class Index by ID (Robust)
        const classIdx = this.classes.findIndex(c => String(c.classId) === String(log.classId) && String(c.subjectId) === String(log.subjectId));
        if (classIdx === -1) return alert("الفصل غير موجود: ربما تم تغيير الجدول؟");

        // Set Select Value
        setTimeout(() => {
            const sel = document.querySelector('#teacherClassSelect select');
            if (sel) {
                sel.value = classIdx;
                sel.dispatchEvent(new Event('change'));

                // 3. Wait for Form Load then Fill
                // We use a one-time listener or just a delay for simplicity in this architecture
                const checkExist = setInterval(() => {
                    if (document.getElementById('logContent')) {
                        clearInterval(checkExist);

                        // Fill Data
                        document.getElementById('logDate').value = log.date;
                        document.getElementById('logContent').value = log.content || '';
                        // Note: log.homework is not always returned in history summary unless we added it?
                        // We did NOT add 'homework' to getTeacherLogHistory. 
                        // Either we add it now, or we re-fetch 'getAdminActivity' for that date.
                        // Re-fetching is safer and gets ATTENDANCE too.

                        // Trigger Date Change to load details (Attendance & Homework)
                        Teacher.loadLogForDate();

                        // Set Edit ID
                        Teacher.editingLogId = log.id;
                        UI.showError("جاري تعديل سجل: " + log.date, "blue");
                    }
                }, 500);
            }
        }, 100);
    },

    async loadLogForm(idxOrObj, targetId = 'teacherWorkArea') {
        // Determine Mode: Teacher (Index) or Admin (Object)
        let cls;
        if (typeof idxOrObj === 'object') {
            cls = idxOrObj; // Admin Mode
        } else {
            if (idxOrObj === "") { document.getElementById(targetId).innerHTML = ""; return; }
            cls = this.classes[idxOrObj]; // Teacher Mode
        }

        this.currentClass = cls;
        this.currentTargetId = targetId; // Save for submitLog cleanup

        const area = document.getElementById(targetId);
        if (!area) return console.error("Target area not found: " + targetId);

        area.innerHTML = '<div class="spinner mx-auto"></div>';

        try {
            const res = await App.call('getClassStudents', { classId: cls.classId });

            // Build Student List (Attendance)
            const studentsHtml = res.students.map(s => `
                <div class="flex items-center justify-between p-3 bg-white border-b last:border-0 hover:bg-gray-50 transition">
                    <div class="flex items-center gap-3">
                        <input type="checkbox" id="chk_${s.id}" class="w-6 h-6 accent-emerald-600 cursor-pointer rounded transition-transform transform active:scale-95" checked>
                        <label for="chk_${s.id}" class="font-bold text-gray-700 cursor-pointer select-none">${UI.formatName(s.name)}</label>
                    </div>
                    <input type="text" id="note_${s.id}" placeholder="ملاحظة..." class="text-xs p-2 border border-gray-200 rounded-lg w-1/3 bg-gray-50 focus:bg-white focus:border-emerald-500 outline-none transition">
                </div>
             `).join('');

            const today = new Date().toISOString().split('T')[0];

            area.innerHTML = `
                <div class="grid lg:grid-cols-2 gap-6 animate-fadeIn">
                    <!-- Header with Date Picker -->
                    <div class="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div class="font-bold text-gray-700">
                             <i class="fas fa-calendar-alt text-emerald-600 ml-2"></i>تاريخ الحصة
                        </div>
                        <input type="date" id="logDate" value="${today}" onchange="Teacher.loadLogForDate()" class="p-2 border rounded-lg font-bold text-gray-700 outline-none focus:border-emerald-500 bg-gray-50">
                    </div>

                    <!-- Left: Log Content -->
                    <div class="space-y-4">
                        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div class="flex items-center gap-2 mb-2 text-emerald-700 font-bold"><i class="fas fa-chalkboard-teacher"></i> محتوى الحصة</div>
                            <textarea id="logContent" class="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="ماذا تم شرحه اليوم؟"></textarea>
                        </div>
                        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div class="flex items-center gap-2 mb-2 text-orange-600 font-bold"><i class="fas fa-home"></i> الواجب المنزلي</div>
                            <textarea id="logHW" class="w-full h-24 p-3 bg-orange-50 border border-orange-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 resize-none" placeholder="تفاصيل الواجب..."></textarea>
                        </div>
                    </div>
                    
                    <!-- Right: Attendance -->
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
                        <div class="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <div class="font-bold text-gray-700"><i class="fas fa-user-check text-emerald-600"></i> القائمة</div>
                            <button onclick="Teacher.toggleAll()" class="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg hover:bg-emerald-200 transition">تحديد الكل (حاضر)</button>
                        </div>
                        <div class="overflow-y-auto flex-grow p-1 custom-scrollbar">
                            ${res.students.length ? studentsHtml : '<div class="p-10 text-center text-gray-400">لا يوجد طلاب في هذا الفصل</div>'}
                        </div>
                        <div class="p-4 border-t bg-gray-50">
                            <button onclick="Teacher.submitLog()" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-emerald-700 transition transform active:scale-95">
                                <i class="fas fa-save ml-2"></i> حفظ التقرير
                            </button>
                        </div>
                    </div>
                </div>
             `;
        } catch (e) { area.innerHTML = `<div class="text-red-500 text-center p-10">${e.message}</div>`; }
    },

    async loadLogForDate() {
        const date = document.getElementById('logDate').value;
        if (!date) return;

        // Visual Feedback
        const contentBox = document.getElementById('logContent');
        const originalPlaceholder = contentBox.placeholder;
        contentBox.placeholder = "جاري التحميل...";
        contentBox.classList.add('bg-gray-100');

        try {
            const res = await App.call('getAdminActivity', { classId: this.currentClass.classId, date });

            // 1. Reset Form
            document.getElementById('logContent').value = '';
            document.getElementById('logHW').value = '';
            document.querySelectorAll('[id^="chk_"]').forEach(c => c.checked = true);
            document.querySelectorAll('[id^="note_"]').forEach(n => n.value = '');

            if (res.success && res.logs.length > 0) {
                // Find Log for Current Subject (and Teacher maybe? stricter is better)
                // In Admin mode (Class Control), we want log for THIS Subject regardless of teacher
                // In Teacher mode, same.
                const log = res.logs.find(l => String(l.subject) === String(this.currentClass.subjectId));

                if (log) {
                    document.getElementById('logContent').value = log.content || '';
                    document.getElementById('logHW').value = log.homework || '';

                    // Apply Attendance
                    // res.notes contains EXCEPTIONS (Absent or Note)
                    // Everyone else is Present
                    res.notes.forEach(n => {
                        // Check if note belongs to this log (Subject match derived from logic or filtered)
                        // getAdminActivity returns notes for ALL logs of that class/date.
                        // We need to match logId.
                        if (String(n.logId) === String(log.id)) {
                            const chk = document.getElementById(`chk_${n.studentId}`);
                            const noteInput = document.getElementById(`note_${n.studentId}`);

                            if (chk) {
                                if (n.status === 'Absent') chk.checked = false;
                            }
                            if (noteInput && n.note) {
                                noteInput.value = n.note;
                            }
                        }
                    });
                    UI.showError("تم تحميل السجل السابق", "blue");
                }
            }
        } catch (e) {
            console.error(e);
            UI.showError("لم يتم العثور على بيانات لهذا التاريخ");
        } finally {
            contentBox.classList.remove('bg-gray-100');
            contentBox.placeholder = originalPlaceholder;
        }
    },

    toggleAll() {
        const checkboxes = document.querySelectorAll('[id^="chk_"]');
        const allChecked = Array.from(checkboxes).every(c => c.checked);
        checkboxes.forEach(c => c.checked = !allChecked);
    },

    async submitLog() {
        const content = document.getElementById('logContent').value;
        const hw = document.getElementById('logHW').value;
        const date = document.getElementById('logDate').value; // Get selected date

        // Collect Status
        const studentsStatus = [];
        document.querySelectorAll('[id^="chk_"]').forEach(chk => {
            const sid = chk.id.replace('chk_', '');
            const note = document.getElementById(`note_${sid}`).value;
            const isPresent = chk.checked;
            studentsStatus.push({
                id: sid,
                status: isPresent ? 'Present' : 'Absent',
                note: note.trim()
            });
        });

        if (!content && !hw) return alert("الرجاء كتابة محتوى الحصة أو الواجب");

        // OPTIMISTIC UI: Show success immediately
        UI.showError("تم الحفظ بنجاح (جاري المزامنة...)", "green");

        // Clear Form immediately
        document.getElementById('logContent').value = '';
        document.getElementById('logHW').value = '';
        // Reset Checkboxes (Default Checked/Present)
        document.querySelectorAll('[id^="chk_"]').forEach(c => c.checked = true);
        document.querySelectorAll('[id^="note_"]').forEach(n => n.value = '');

        // Send in background without blocking UI
        const payload = {
            teacherId: App.user.userId,
            classId: this.currentClass.classId,
            subjectId: this.currentClass.subjectId,
            date: date || new Date(),
            content,
            homework: hw,
            studentsStatus
        };

        if (this.editingLogId) {
            payload.logId = this.editingLogId;
        }

        App.call('saveDailyLog', payload).then(res => {
            if (!res.success) {
                alert("فشل الحفظ في الخلفية! يرجى المحاولة مرة أخرى: " + res.message);
            } else {
                if (this.editingLogId) {
                    this.editingLogId = null; // Clear Edit Mode
                    UI.showError("تم تحديث السجل بنجاح", "green");
                }
            }
        }).catch(e => {
            console.error(e);
            alert("خطأ في الشبكة أثناء الحفظ");
        });

        // Reset Select if in Teacher Mode
        const sel = document.getElementById('teacherClassSelect');
        if (sel && !sel.classList.contains('hidden')) {
            const selectEl = sel.querySelector('select');
            if (selectEl) selectEl.value = "";
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ============================================
    // ASSESSMENTS MODULE
    // ============================================

    renderAssessmentsInterface(container) {
        const today = new Date().toISOString().split('T')[0];
        container.innerHTML = `
            <div class="space-y-6 animate-fadeIn">
                <!-- Sub-tabs -->
                <div class="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-fit mx-auto">
                    <button onclick="Teacher._showAssessSubTab('enter')" id="asub_enter" class="px-5 py-2 rounded-lg font-bold text-sm bg-purple-100 text-purple-700 transition">
                        <i class="fas fa-pen ml-1"></i>تسجيل تقييم
                    </button>
                    <button onclick="Teacher._showAssessSubTab('history')" id="asub_history" class="px-5 py-2 rounded-lg font-bold text-sm text-gray-500 hover:bg-gray-50 transition">
                        <i class="fas fa-list ml-1"></i>سجل التقييمات
                    </button>
                </div>

                <!-- Entry Form -->
                <div id="assessEntry">
                    <!-- Class/Subject Selector -->
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
                        <label class="block text-gray-500 text-sm font-bold mb-2">اختر الفصل / المادة</label>
                        <div class="relative">
                            <select id="assessClassSelect" onchange="Teacher._loadAssessStudents(this.value)" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-purple-500 text-lg font-bold text-gray-700">
                                <option value="">-- اضغط للاختيار --</option>
                                ${this.classes.map((c, i) => `<option value="${i}">${c.className} - ${c.subjectName}</option>`).join('')}
                            </select>
                            <div class="absolute left-4 top-4 text-purple-600 pointer-events-none"><i class="fas fa-chevron-down"></i></div>
                        </div>
                    </div>

                    <!-- Assessment Details -->
                    <div id="assessDetails" class="hidden">
                        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-gray-500 text-xs font-bold mb-1">عنوان التقييم <span class="text-red-400">*</span></label>
                                    <input type="text" id="assessTitle" placeholder="مثال: الأسبوع الأول" class="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 font-bold text-gray-700">
                                </div>
                                <div>
                                    <label class="block text-gray-500 text-xs font-bold mb-1">التاريخ <span class="text-red-400">*</span></label>
                                    <input type="date" id="assessDate" value="${today}" class="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 font-bold text-gray-700">
                                </div>
                                <div>
                                    <label class="block text-gray-500 text-xs font-bold mb-1">الدرجة الكاملة <span class="text-red-400">*</span></label>
                                    <input type="number" id="assessMaxScore" min="1" max="100" value="10" class="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 font-bold text-gray-700">
                                </div>
                            </div>
                        </div>

                        <!-- Student Grades -->
                        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div class="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                                <div class="font-bold text-purple-800"><i class="fas fa-users ml-2"></i>درجات الطلاب</div>
                                <button onclick="Teacher._fillAllScores()" class="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200 transition">تعبئة الكل بالدرجة الكاملة</button>
                            </div>
                            <div id="assessStudentList" class="divide-y divide-gray-100 max-h-[420px] overflow-y-auto custom-scrollbar"></div>
                            <div class="p-4 border-t bg-gray-50">
                                <button onclick="Teacher.submitAssessments()" class="w-full bg-purple-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-purple-700 transition transform active:scale-95">
                                    <i class="fas fa-save ml-2"></i> حفظ التقييمات
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- History -->
                <div id="assessHistory" class="hidden">
                    <div class="text-center py-10"><div class="spinner mx-auto border-gray-300 border-t-purple-600"></div></div>
                </div>
            </div>
        `;
    },

    _showAssessSubTab(tab) {
        document.getElementById('asub_enter').className = `px-5 py-2 rounded-lg font-bold text-sm transition ${tab === 'enter' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`;
        document.getElementById('asub_history').className = `px-5 py-2 rounded-lg font-bold text-sm transition ${tab === 'history' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`;
        document.getElementById('assessEntry').classList.toggle('hidden', tab !== 'enter');
        document.getElementById('assessHistory').classList.toggle('hidden', tab !== 'history');
        if (tab === 'history') this._loadAssessHistory();
    },

    async _loadAssessStudents(idx) {
        const detailsArea = document.getElementById('assessDetails');
        const listArea = document.getElementById('assessStudentList');
        if (idx === "") { detailsArea.classList.add('hidden'); return; }

        const cls = this.classes[idx];
        this.currentAssessClass = cls;

        detailsArea.classList.remove('hidden');
        listArea.innerHTML = '<div class="p-8 text-center"><div class="spinner mx-auto border-gray-300 border-t-purple-600"></div></div>';

        try {
            const res = await App.call('getClassStudents', { classId: cls.classId });
            if (!res.success) throw new Error(res.message);
            this._assessStudents = res.students;

            const maxScore = parseFloat(document.getElementById('assessMaxScore').value) || 10;

            listArea.innerHTML = res.students.length ? res.students.map(s => `
                <div class="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
                    <div class="flex-1 font-bold text-gray-800 text-sm">${UI.formatName(s.name)}</div>
                    <div class="flex items-center gap-2">
                        <input type="number" id="ascore_${s.id}" min="0" max="${maxScore}" placeholder="-"
                            class="w-20 p-2 border border-gray-200 rounded-lg text-center font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-sm">
                        <span class="text-gray-400 text-xs font-bold">/ ${maxScore}</span>
                    </div>
                    <input type="text" id="acomment_${s.id}" placeholder="تعليق..." class="w-32 p-2 border border-gray-200 rounded-lg text-xs bg-gray-50 outline-none focus:ring-2 focus:ring-purple-400">
                </div>
            `).join('') : '<div class="p-10 text-center text-gray-400">لا يوجد طلاب</div>';
        } catch (e) {
            listArea.innerHTML = `<div class="p-8 text-center text-red-500">${e.message}</div>`;
        }
    },

    _fillAllScores() {
        const max = document.getElementById('assessMaxScore').value;
        document.querySelectorAll('[id^="ascore_"]').forEach(inp => inp.value = max);
    },

    async submitAssessments() {
        const title = document.getElementById('assessTitle').value.trim();
        const date = document.getElementById('assessDate').value;
        const maxScore = parseFloat(document.getElementById('assessMaxScore').value);

        if (!title) return alert("الرجاء كتابة عنوان التقييم");
        if (!date) return alert("الرجاء تحديد التاريخ");
        if (!maxScore || maxScore <= 0) return alert("الرجاء تحديد الدرجة الكاملة");
        if (!this.currentAssessClass) return alert("الرجاء اختيار الفصل والمادة");
        if (!this._assessStudents || !this._assessStudents.length) return alert("لا يوجد طلاب في هذا الفصل");

        const students = this._assessStudents.map(s => {
            const scoreEl = document.getElementById(`ascore_${s.id}`);
            const commentEl = document.getElementById(`acomment_${s.id}`);
            return {
                id: s.id,
                score: scoreEl ? scoreEl.value : "",
                comment: commentEl ? commentEl.value.trim() : ""
            };
        });

        UI.showError("جاري الحفظ...", "blue");

        try {
            const res = await App.call('saveAssessments', {
                teacherId: App.user.userId,
                classId: this.currentAssessClass.classId,
                subjectId: this.currentAssessClass.subjectId,
                title,
                date,
                maxScore,
                students
            });

            if (res.success) {
                UI.showError("تم حفظ التقييمات بنجاح ✓", "green");
                // Reset form
                document.getElementById('assessTitle').value = '';
                document.getElementById('assessClassSelect').value = '';
                document.getElementById('assessDetails').classList.add('hidden');
                this.currentAssessClass = null;
                this._assessStudents = null;
            } else {
                alert("فشل الحفظ: " + res.message);
            }
        } catch (e) {
            alert("خطأ: " + e.message);
        }
    },

    async _loadAssessHistory() {
        const container = document.getElementById('assessHistory');
        container.innerHTML = '<div class="text-center py-10"><div class="spinner mx-auto border-gray-300 border-t-purple-600"></div></div>';

        try {
            const res = await App.call('getTeacherAssessmentHistory', { userId: App.user.userId });
            if (!res.success) throw new Error(res.message);

            if (!res.batches.length) {
                container.innerHTML = '<div class="text-center p-10 text-gray-400 font-bold bg-white rounded-xl border border-gray-100">لا توجد تقييمات مسجلة بعد</div>';
                return;
            }

            const statusColors = { Approved: 'bg-emerald-100 text-emerald-700', Pending: 'bg-yellow-100 text-yellow-700', Rejected: 'bg-red-100 text-red-700' };
            const statusLabels = { Approved: 'معتمد', Pending: 'قيد المراجعة', Rejected: 'مرفوض' };

            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="overflow-x-auto custom-scrollbar">
                        <table class="w-full text-right min-w-[500px]">
                            <thead class="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                <tr>
                                    <th class="p-4">التاريخ</th>
                                    <th class="p-4">الفصل / المادة</th>
                                    <th class="p-4">العنوان</th>
                                    <th class="p-4">عدد الطلاب</th>
                                    <th class="p-4">الحالة</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                ${res.batches.map(b => `
                                    <tr class="hover:bg-gray-50 transition">
                                        <td class="p-4 font-bold text-gray-700 whitespace-nowrap">${b.date}</td>
                                        <td class="p-4">
                                            <div class="font-bold text-gray-800 text-sm">${b.className}</div>
                                            <div class="text-xs text-gray-500">${b.subjectName}</div>
                                        </td>
                                        <td class="p-4 text-sm text-gray-700 font-bold">${b.title}</td>
                                        <td class="p-4 text-center">
                                            <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold text-xs">${b.studentCount} طالب</span>
                                        </td>
                                        <td class="p-4">
                                            <span class="${statusColors[b.status] || 'bg-gray-100 text-gray-600'} px-3 py-1 rounded-full text-xs font-bold">
                                                ${statusLabels[b.status] || b.status}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (e) {
            container.innerHTML = `<div class="text-red-500 text-center p-10">${e.message}</div>`;
        }
    }
};
