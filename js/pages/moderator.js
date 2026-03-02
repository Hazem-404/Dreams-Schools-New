const Moderator = {
    lookups: { classes: [], teachers: [], subjects: [] },

    async init() {
        // 1. Initialize UI
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
        document.getElementById('adminTabs').classList.add('hidden'); // Hide Admin Tabs if any

        // 2. Fetch Assigned Data
        await this.loadData();
    },

    async loadData() {
        UI.loader(true);
        try {
            const res = await App.call('getSupervisorData', { userId: App.user.userId });
            if (res.success) {
                this.lookups = res;
                // Format Names
                this.lookups.classes.forEach(c => c.displayName = `${c.name} ${c.number ? '- ' + c.number : ''}`);
                this.lookups.teachers.forEach(t => t.name = UI.formatName(t.name));

                // Extract module permissions
                // permissions array: [{ type: 'Module', targetId: 'module_supervision' }, ...]
                const allPerms = res.permissions || [];
                const modulePerms = allPerms.filter(p => p.type === 'Module').map(p => p.targetId);
                // Admin always gets all modules — supervisor gets only their assigned ones
                const isAdmin = App.user.role === 'Admin';
                if (isAdmin) {
                    this.allowedModules = ['module_supervision', 'module_academic', 'module_people', 'module_admin'];
                } else {
                    // If no module permissions saved, allow all (backward compatible)
                    this.allowedModules = modulePerms.length > 0 ? modulePerms : ['module_supervision', 'module_academic', 'module_people'];
                }

                // Render Dashboard
                this.renderDashboard();
            } else {
                document.getElementById('dashboardContent').innerHTML = `<div class="p-10 text-center text-red-500">${res.message}</div>`;
            }
        } catch (e) {
            console.error(e);
            document.getElementById('dashboardContent').innerHTML = `<div class="p-10 text-center text-red-500">Failed to load data</div>`;
        }
        UI.loader(false);
    },

    renderDashboard() {
        const content = document.getElementById('dashboardContent');
        const allowed = this.allowedModules || ['module_supervision', 'module_academic', 'module_people'];

        const hasSup = allowed.includes('module_supervision') || allowed.includes('module_admin');
        const hasAcad = allowed.includes('module_academic') || allowed.includes('module_admin');

        if (!hasSup && !hasAcad) {
            content.innerHTML = `<div class="p-10 text-center text-gray-400"><i class="fas fa-lock text-4xl mb-4 opacity-30 block"></i><p class="font-bold">\u0644\u064a\u0633 \u0644\u062f\u064a\u0643 \u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0623\u064a \u0642\u0633\u0645 \u062d\u0627\u0644\u064a\u0627\u064b.</p><p class="text-sm mt-1">\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u062f\u064a\u0631 \u0644\u062a\u0641\u0639\u064a\u0644 \u0635\u0644\u0627\u062d\u064a\u0627\u062a\u0643.</p></div>`;
            return;
        }

        let tabsHtml = '';

        if (hasSup || hasAcad) {

            // 1. التسجيل (Registration)
            if (hasSup) {
                tabsHtml += `
                    <div class="relative group" id="mod-grp-Registration">
                        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-teal-50 hover:text-teal-700 transition">
                            <i class="fas fa-edit text-teal-500"></i>
                            <span>التسجيل</span>
                            <i class="fas fa-chevron-down text-xs opacity-40 mr-1"></i>
                        </button>
                        <div class="absolute top-full right-0 pt-2 w-56 hidden group-[.active]:block group-hover:block z-50">
                            <div class="bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden p-1">
                                <button onclick="Moderator.switchTab('ClassControl'); Moderator._closeModMenu('mod-grp-Registration')" data-tab="ClassControl"
                                    class="tab-btn w-full text-right flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition">
                                    <i class="fas fa-edit w-4 text-teal-500"></i>تسجيل الحصص
                                </button>
                                <button onclick="Moderator.switchTab('AssessEntry'); Moderator._closeModMenu('mod-grp-Registration')" data-tab="AssessEntry"
                                    class="tab-btn w-full text-right flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition">
                                    <i class="fas fa-pen w-4 text-purple-500"></i>تسجيل التقييمات
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // 2. السجل (Logs & Monitoring)
            if (hasSup) {
                tabsHtml += `
                    <div class="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
                    <div class="relative group" id="mod-grp-Logs">
                        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition">
                            <i class="fas fa-history text-blue-500"></i>
                            <span>السجل</span>
                            <i class="fas fa-chevron-down text-xs opacity-40 mr-1"></i>
                        </button>
                        <div class="absolute top-full right-0 pt-2 w-56 hidden group-[.active]:block group-hover:block z-50">
                            <div class="bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden p-1">
                                <button onclick="Moderator.switchTab('LogsHistory'); Moderator._closeModMenu('mod-grp-Logs')" data-tab="LogsHistory"
                                    class="tab-btn w-full text-right flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition">
                                    <i class="fas fa-history w-4 text-blue-500"></i>سجل الحصص 
                                </button>
                                <button onclick="Moderator.switchTab('Monitoring'); Moderator._closeModMenu('mod-grp-Logs')" data-tab="Monitoring"
                                    class="tab-btn w-full text-right flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition">
                                    <i class="fas fa-chart-bar w-4 text-emerald-500"></i>المتابعة اليومية
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // 5. المراجعات (Reviews)
            if (hasSup) {
                tabsHtml += `
                    <div class="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
                    <div class="relative group" id="mod-grp-Reviews">
                        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition">
                            <i class="fas fa-check-double text-violet-500"></i>
                            <span>المراجعات</span>
                            <i class="fas fa-chevron-down text-xs opacity-40 mr-1"></i>
                        </button>
                        <div class="absolute top-full right-0 pt-2 w-56 hidden group-[.active]:block group-hover:block z-50">
                            <div class="bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden p-1">
                                <button onclick="Moderator.switchTab('AssessReviews'); Moderator._closeModMenu('mod-grp-Reviews')" data-tab="AssessReviews"
                                    class="tab-btn w-full text-right flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition">
                                    <i class="fas fa-star w-4 text-amber-500"></i>مراجعة التقييمات
                                </button>
                                <button onclick="Moderator.switchTab('Reviews'); Moderator._closeModMenu('mod-grp-Reviews')" data-tab="Reviews"
                                    class="tab-btn w-full text-right flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition">
                                    <i class="fas fa-check-double w-4 text-violet-500"></i>مراجعة السجلات
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // 4. توزيع المدرسين (Allocations - Standalone button)
            if (hasAcad) {
                tabsHtml += `
                    <div class="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
                    <button onclick="Moderator.switchTab('Allocations')" data-tab="Allocations"
                        class="tab-btn flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-sky-50 hover:text-sky-700 transition">
                        <i class="fas fa-chalkboard-teacher text-sky-500"></i><span>توزيع المدرسين</span>
                    </button>
                `;
            }

            // 3. الإنذارات (Warnings - Standalone button)
            if (hasSup) {
                tabsHtml += `
                    <div class="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
                    <button onclick="Moderator.switchTab('Warnings')" data-tab="Warnings"
                        class="tab-btn flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition sm:mr-auto">
                        <i class="fas fa-exclamation-triangle text-red-500"></i><span>الإنذارات</span>
                    </button>
                `;
            }
        }

        const html = `
            <!-- Moderator Tabs - Clean Nav Card -->
            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-2 flex flex-wrap gap-1 items-center mb-6">
                ${tabsHtml}
            </div>

            <!-- Content Area -->
            <div id="modContent"></div>
        `;
        content.innerHTML = html;

        // Mobile touch logic for dropdowns
        document.querySelectorAll('.relative.group > button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const group = btn.parentElement;
                const wasActive = group.classList.contains('active');
                document.querySelectorAll('.relative.group').forEach(g => g.classList.remove('active'));
                if (!wasActive) group.classList.add('active');
                e.stopPropagation();
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.relative.group').forEach(g => g.classList.remove('active'));
        });

        // Switch to Reviews tab first by default if available, else first available
        const defaultTab = document.querySelector('.tab-btn[data-tab="Reviews"]') || document.querySelector('.tab-btn[data-tab]');
        if (defaultTab) this.switchTab(defaultTab.dataset.tab);
    },

    _closeModMenu(groupId) {
        document.getElementById(groupId)?.classList.remove('active');
    },

    switchTab(tab) {
        // Update Active State
        document.querySelectorAll('.tab-btn').forEach(b => {
            if (b.dataset.tab === tab) {
                b.classList.remove('text-gray-600', 'hover:bg-violet-50', 'hover:text-violet-700', 'hover:bg-emerald-50', 'hover:text-emerald-700', 'hover:bg-teal-50', 'hover:text-teal-700', 'hover:bg-blue-50', 'hover:text-blue-700', 'hover:bg-purple-50', 'hover:text-purple-700', 'hover:bg-amber-50', 'hover:text-amber-700', 'hover:bg-sky-50', 'hover:text-sky-700', 'text-red-600', 'hover:bg-red-50', 'hover:text-red-700');
                b.classList.add('bg-violet-100', 'text-violet-700');
            } else {
                b.classList.remove('bg-violet-100', 'text-violet-700');
                if (b.dataset.tab === 'Warnings') {
                    b.classList.add('text-red-600', 'hover:bg-red-50', 'hover:text-red-700');
                } else {
                    b.classList.add('text-gray-600', 'hover:bg-gray-50');
                }
            }
        });

        if (tab === 'Monitoring') this.renderMonitoring();
        else if (tab === 'Reviews') this.renderReviews();
        else if (tab === 'LogsHistory') this.renderLogsHistory();
        else if (tab === 'Allocations') this.renderAllocations();
        else if (tab === 'ClassControl') this.renderClassControl();
        else if (tab === 'Warnings') this.renderWarnings();
        else if (tab === 'AssessReviews') this.renderAssessReviews();
        else if (tab === 'AssessEntry') this.renderAssessEntry();
    },

    renderMonitoring() {
        // Reuse Admin's Monitoring Logic but simplified/filtered
        // We can actually CALL Admin.renderMonitoring IF we inject our filtered lookups?
        // OR Re-implement to be cleaner. Let's Re-implement reuse Admin's styles.

        const container = document.getElementById('modContent');
        container.innerHTML = `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end animate-fadeIn">
                <div class="flex-grow w-full">
                    <label class="block text-gray-500 text-sm font-bold mb-2">اختر الفصل</label>
                    <select id="modClass" class="w-full p-2 border rounded-lg outline-none focus:border-emerald-500 bg-gray-50 font-bold text-gray-700">
                        <option value="">-- اختر الفصل --</option>
                        ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                    </select>
                </div>
                <div class="w-full md:w-48">
                    <label class="block text-gray-500 text-sm font-bold mb-2">التاريخ</label>
                    <input type="date" id="modDate" class="w-full p-2 border rounded-lg outline-none focus:border-emerald-500 bg-gray-50 font-bold text-gray-700">
                </div>
                <button onclick="Moderator.fetchMonitoring()" class="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-emerald-700 w-full md:w-auto transition">
                    <i class="fas fa-search ml-2"></i>عرض
                </button>
            </div>
            <div id="modResults" class="space-y-6 min-h-[300px]"></div>
        `;
        document.getElementById('modDate').value = new Date().toISOString().split('T')[0];
    },

    async fetchMonitoring() {
        const classId = document.getElementById('modClass').value;
        const date = document.getElementById('modDate').value;

        if (!classId) return UI.showError("اختر الفصل");
        if (!date) return UI.showError("اختر التاريخ");

        const resDiv = document.getElementById('modResults');
        resDiv.innerHTML = UI.spinner();

        // Build a subject id→name map from lookups
        const subjectMap = {};
        (this.lookups.subjects || []).forEach(s => subjectMap[String(s.id)] = s.name);

        try {
            const res = await App.call('getAdminActivity', { classId, date });
            if (res.success) {
                if (res.logs.length === 0 && res.notes.length === 0) {
                    resDiv.innerHTML = `<div class="p-10 text-center bg-white rounded-xl border border-gray-200">
                        <i class="fas fa-calendar-times text-4xl text-gray-300 mb-4"></i>
                        <p class="font-bold text-gray-500">لا توجد بيانات مسجلة لهذا اليوم</p>
                    </div>`;
                    return;
                }

                // 1. Teachers Section — resolve subject name from map
                let teachersHtml = `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-in">
                        <h3 class="bg-gray-50 p-3 font-bold text-gray-700 border-b flex justify-between items-center">
                            <span><i class="fas fa-chalkboard-teacher text-emerald-600 ml-2"></i>نشاط المعلمين</span>
                            <span class="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">${res.logs.length} حصص</span>
                        </h3>
                        <div class="divide-y divide-gray-100">
                            ${res.logs.length ? res.logs.map(l => {
                    const subjectName = subjectMap[String(l.subject)] || l.subject;
                    return `
                                <div class="p-4 hover:bg-gray-50 transition">
                                    <div class="flex justify-between mb-3">
                                        <span class="font-bold text-emerald-700 text-lg">${UI.formatName(l.teacher)}</span>
                                        <span class="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded font-bold self-start">${subjectName}</span>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                                        <p class="text-gray-500 text-xs font-bold mb-1">المحتوى:</p>
                                        <p class="text-gray-800 text-sm leading-relaxed">${l.content || '-'}</p>
                                    </div>
                                    <div class="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                        <p class="text-orange-800 text-xs font-bold mb-1">الواجب:</p>
                                        <p class="text-gray-800 text-sm leading-relaxed">${l.homework || '-'}</p>
                                    </div>
                                </div>`;
                }).join('') : '<div class="p-10 text-center text-gray-400">لا يوجد نشاط مسجل للمعلمين في هذا اليوم</div>'}
                        </div>
                    </div>
                `;

                // 2. Students Section
                let studentsHtml = `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-in mt-6">
                        <div class="bg-gray-50 p-3 border-b flex justify-between items-center">
                            <h3 class="font-bold text-gray-700"><i class="fas fa-user-graduate text-red-500 ml-2"></i>المتابعة</h3>
                            <span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full border border-red-200">${res.notes.length} ملاحظة</span>
                        </div>
                        <div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            ${res.notes.length ? res.notes.map(n => `
                                <div class="p-3 flex items-start gap-3 hover:bg-gray-50 transition">
                                    <div class="w-1.5 h-full min-h-[40px] ${n.status === 'Absent' ? 'bg-red-500' : 'bg-yellow-400'} rounded-full"></div>
                                    <div class="flex-grow">
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="font-bold text-gray-800">${UI.formatName(n.studentName)}</span>
                                            <span class="text-xxs font-bold px-2 py-0.5 rounded-full ${n.status === 'Absent' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-800'}">
                                                ${n.status === 'Absent' ? 'غائب' : 'سلوك'}
                                            </span>
                                        </div>
                                        ${n.note ? `<p class="text-sm text-gray-600 bg-yellow-50 p-2 rounded-lg border border-yellow-100 mt-1">${n.note}</p>` : ''}
                                    </div>
                                </div>
                            `).join('') : '<div class="p-10 text-center text-gray-400">لا توجد ملاحظات</div>'}
                        </div>
                    </div>
                `;

                resDiv.innerHTML = teachersHtml + studentsHtml;
            } else {
                resDiv.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">${res.message}</div>`;
            }
        } catch (e) {
            console.error(e);
            resDiv.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">حدث خطأ: ${e.message}</div>`;
        }
    },

    async renderReviews() {
        const container = document.getElementById('modContent');
        container.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-emerald-600 mt-10"></div>';

        try {
            const res = await App.call('getPendingLogs');
            if (res.success) {
                // Filter to supervisor's classes
                const myClassIds = this.lookups.classes.map(c => String(c.id));
                this._pendingLogs = res.logs.filter(l => myClassIds.includes(String(l.classId)));

                if (this._pendingLogs.length === 0) {
                    container.innerHTML = `
                        <div class="text-center p-10 bg-white rounded-xl shadow-sm border border-gray-200">
                            <div class="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                                <i class="fas fa-check text-4xl"></i>
                            </div>
                            <h3 class="font-bold text-gray-700 text-lg">لا توجد سجلات للمراجعة</h3>
                            <p class="text-gray-500 text-sm">كل شيء محدث!</p>
                        </div>
                    `;
                    return;
                }

                const uniqueClasses = [...new Map(this._pendingLogs.map(l => [l.classId, { id: l.classId, name: l.className }])).values()];

                container.innerHTML = `
                    <div class="space-y-4 animate-fadeIn">
                        <!-- Filter Bar -->
                        <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
                            <div class="relative flex-grow min-w-[160px]">
                                <i class="fas fa-search absolute right-3 top-3 text-gray-400 text-sm"></i>
                                <input type="text" id="reviewSearch" oninput="Moderator._filterReviews()" placeholder="بحث بالمعلم أو المحتوى..."
                                    class="w-full pr-9 pl-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500 bg-gray-50">
                            </div>
                            <select id="reviewClassFilter" onchange="Moderator._filterReviews()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                                <option value="">كل الفصول</option>
                                ${uniqueClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                            <span id="reviewCount" class="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">${this._pendingLogs.length} سجل</span>
                        </div>
                        <!-- Header + Batch Actions -->
                        <div class="flex flex-wrap justify-between items-center gap-3">
                            <h3 class="font-bold text-gray-700 text-lg flex items-center">
                                <i class="fas fa-clipboard-check text-emerald-600 ml-2"></i>سجلات بانتظار المراجعة
                            </h3>
                            <div class="flex gap-2 flex-wrap">
                                <label class="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 px-3 py-2 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-50 transition">
                                    <input type="checkbox" id="selectAllLogs" onchange="Moderator._toggleSelectAll(this)" class="w-4 h-4 accent-emerald-600">
                                    تحديد الكل
                                </label>
                                <button onclick="Moderator.batchReviewSelected('Approved')" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm text-sm">
                                    <i class="fas fa-check-double ml-1"></i>موافقة على المحدد
                                </button>
                                <button onclick="Moderator.batchReviewSelected('Rejected')" class="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition border border-red-200 text-sm">
                                    <i class="fas fa-times ml-1"></i>رفض المحدد
                                </button>
                            </div>
                        </div>
                        <div id="reviewLogsList" class="grid gap-4"></div>
                    </div>
                `;
                this._renderReviewCards(this._pendingLogs);
            } else {
                container.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">${res.message}</div>`;
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">حدث خطأ: ${e.message}</div>`;
        }
    },

    _filterReviews() {
        if (!this._pendingLogs) return;
        const q = (document.getElementById('reviewSearch')?.value || '').toLowerCase();
        const classId = document.getElementById('reviewClassFilter')?.value || '';
        let filtered = this._pendingLogs;
        if (classId) filtered = filtered.filter(l => String(l.classId) === String(classId));
        if (q) filtered = filtered.filter(l =>
            (l.teacherName || '').toLowerCase().includes(q) ||
            (l.className || '').toLowerCase().includes(q) ||
            (l.content || '').toLowerCase().includes(q)
        );
        const countEl = document.getElementById('reviewCount');
        if (countEl) countEl.textContent = `${filtered.length} سجل`;
        this._renderReviewCards(filtered);
    },

    _renderReviewCards(logs) {
        const list = document.getElementById('reviewLogsList');
        if (!list) return;
        if (!logs.length) {
            list.innerHTML = '<div class="text-center p-8 text-gray-400 bg-white rounded-xl border">لا توجد نتائج</div>';
            return;
        }
        list.innerHTML = logs.map(log => `
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition" id="logCard_${log.id}">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-start gap-3">
                        <input type="checkbox" class="log-select-cb w-5 h-5 mt-1 accent-emerald-600 rounded" data-log-id="${log.id}">
                        <div>
                            <h4 class="font-bold text-gray-800 text-lg">${log.className} - ${log.subjectName}</h4>
                            <p class="text-sm text-gray-500 font-bold"><i class="fas fa-user ml-1"></i> ${UI.formatName(log.teacherName)}</p>
                        </div>
                    </div>
                    <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold">${log.date}</span>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3 space-y-2">
                    <div>
                        <span class="text-xs font-bold text-purple-600 block mb-1">المحتوى:</span>
                        <p class="text-sm text-gray-800">${log.content || '-'}</p>
                    </div>
                    ${log.homework ? `
                    <div class="border-t border-gray-200 pt-2">
                        <span class="text-xs font-bold text-orange-600 block mb-1">الواجب:</span>
                        <p class="text-sm text-gray-800">${log.homework}</p>
                    </div>` : ''}
                    <div class="border-t border-gray-200 pt-2 flex gap-2">
                        <span class="bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-bold">غياب: ${log.attendance.filter(a => a.status === 'Absent').length}</span>
                        <span class="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded font-bold">ملاحظات: ${log.attendance.filter(a => a.note).length}</span>
                    </div>
                </div>
                <div class="flex gap-3 mt-4">
                    <button onclick="Moderator.submitReview('${log.id}', 'SupervisorApproved')" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm">
                        <i class="fas fa-check ml-2"></i>موافقة
                    </button>
                    <button onclick="Moderator.openReviewModal('${log.id}')" class="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-bold hover:bg-blue-100 transition border border-blue-200">
                        <i class="fas fa-edit ml-2"></i>تعديل
                    </button>
                    <button onclick="Moderator.submitReview('${log.id}', 'Rejected')" class="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold hover:bg-red-100 transition border border-red-200">
                        <i class="fas fa-times ml-2"></i>رفض
                    </button>
                </div>
                <textarea id="raw_data_${log.id}" class="hidden">${JSON.stringify(log)}</textarea>
            </div>
        `).join('');
    },

    _toggleSelectAll(source) {
        document.querySelectorAll('.log-select-cb').forEach(cb => cb.checked = source.checked);
    },

    async batchReviewSelected(status) {
        const selectedIds = [...document.querySelectorAll('.log-select-cb:checked')].map(cb => cb.dataset.logId);
        if (selectedIds.length === 0) return UI.showError('لم تقم باختيار أي سجل');

        const label = status === 'SupervisorApproved' ? 'الموافقة' : 'الرفض';
        if (!confirm(`هل أنت متأكد من ${label} على ${selectedIds.length} سجل؟`)) return;

        UI.loader(true);
        let successCount = 0;
        for (const logId of selectedIds) {
            try {
                const res = await App.call('reviewLog', { logId, status });
                if (res.success) {
                    successCount++;
                    // Remove card from UI immediately
                    const card = document.getElementById('logCard_' + logId);
                    if (card) card.remove();
                }
            } catch (e) { console.error(e); }
        }
        UI.loader(false);
        UI.showError(`تم ${label} على ${successCount} سجل بنجاح`, 'green');
        // If all done, reload
        if (document.querySelectorAll('.log-select-cb').length === 0) {
            this.renderReviews();
        }
    },

    async renderAllocations() {
        const container = document.getElementById('modContent');
        container.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-emerald-600 mt-10"></div>';

        try {
            // Get all allocations then filter
            const res = await App.call('adminGetData', { type: 'Allocations' });
            if (res.success) {
                const myTeacherIds = this.lookups.teachers.map(t => String(t.id));
                const myClassIds = this.lookups.classes.map(c => String(c.id));


                // Filter: Teacher must be assigned AND Class must be assigned
                const filtered = res.data.filter(r =>
                    myTeacherIds.includes(String(r[1])) && myClassIds.includes(String(r[2]))
                );

                // Helper to get names
                const getTName = (id) => { const t = this.lookups.teachers.find(x => String(x.id) === String(id)); return t ? t.name : 'Unknown'; };
                const getCName = (id) => { const c = this.lookups.classes.find(x => String(x.id) === String(id)); return c ? c.displayName : 'Unknown'; };
                const getSName = (id) => { const s = this.lookups.subjects.find(x => String(x.id) === String(id)); return s ? s.name : 'Unknown'; };

                container.innerHTML = `
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                        <h3 class="font-bold text-gray-700 mb-4 flex items-center">
                            <i class="fas fa-plus-circle text-emerald-600 ml-2"></i>إضافة توزيع جديد
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div>
                                <label class="block text-gray-500 text-xs font-bold mb-1">المعلم</label>
                                <select id="allocTeacher" class="w-full p-2 border rounded-lg bg-gray-50 text-sm">
                                    <option value="">-- اختر --</option>
                                    ${this.lookups.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-gray-500 text-xs font-bold mb-1">الفصل</label>
                                <select id="allocClass" class="w-full p-2 border rounded-lg bg-gray-50 text-sm">
                                    <option value="">-- اختر --</option>
                                    ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-gray-500 text-xs font-bold mb-1">المادة</label>
                                <select id="allocSubject" class="w-full p-2 border rounded-lg bg-gray-50 text-sm">
                                    <option value="">-- اختر --</option>
                                    ${this.lookups.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <button onclick="Moderator.saveAllocation()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition">بداية التوزيع</button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-right">
                                <thead class="bg-gray-50 text-gray-600 font-bold text-sm">
                                    <tr>
                                        <th class="p-4">المعلم</th>
                                        <th class="p-4">الفصل</th>
                                        <th class="p-4">المادة</th>
                                        <th class="p-4 text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    ${filtered.length ? filtered.map(row => `
                                        <tr class="hover:bg-gray-50 transition">
                                            <td class="p-4 font-bold text-gray-700">${getTName(row[1])}</td>
                                            <td class="p-4 text-gray-600">${getCName(row[2])}</td>
                                            <td class="p-4"><span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">${getSName(row[3])}</span></td>
                                            <td class="p-4 text-center">
                                                <button onclick="Moderator.deleteAllocation('${row[0]}')" class="text-red-400 hover:text-red-600 transition" title="حذف">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('') : `<tr><td colspan="4" class="p-8 text-center text-gray-400">لا توجد توزيعات مسجلة</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            container.innerHTML = `<div class="p-10 text-center text-red-500">${e.message}</div>`;
        }
    },

    async saveAllocation() {
        const teacherId = document.getElementById('allocTeacher').value;
        const classId = document.getElementById('allocClass').value;
        const subjectId = document.getElementById('allocSubject').value;

        if (!teacherId || !classId || !subjectId) return alert("يرجى ملء جميع الحقول");

        UI.loader(true);
        try {
            const rowData = ["AUTO", teacherId, classId, subjectId, new Date().getFullYear()];
            const res = await App.call('adminSaveData', { type: 'Allocations', data: rowData });
            if (res.success) {
                this.renderAllocations(); // Reload
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    async deleteAllocation(id) {
        if (!confirm("هل أنت متأكد من الحذف؟")) return;
        UI.loader(true);
        try {
            const res = await App.call('adminDeleteData', { type: 'Allocations', id });
            if (res.success) {
                this.renderAllocations();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    renderClassControl() {
        const container = document.getElementById('modContent');
        container.innerHTML = `
             <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-2xl mx-auto">
                <h3 class="font-bold text-xl text-gray-800 mb-6 text-center">تسجيل الحصص (كمشرف)</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 font-bold mb-2">الفصل</label>
                        <select id="ctrlClass" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-bold">
                            <option value="">-- اختر الفصل --</option>
                            ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 font-bold mb-2">المادة</label>
                        <select id="ctrlSubject" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-bold">
                            <option value="">-- اختر المادة --</option>
                            ${this.lookups.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="Admin.openClassLog()" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-emerald-700 transition">
                        فتح السجل
                    </button>
                </div>
            </div>
            <div id="adminLogArea" class="mt-8"></div>
        `;
    },

    // --- REVIEW FUNCTIONS (copied from Admin, self-contained) ---

    showDynamicModal(params) {
        let m = document.getElementById('modal-dynamic');
        if (!m) {
            m = document.createElement('div');
            m.id = 'modal-dynamic';
            m.className = "fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in";
            document.body.appendChild(m);
        }
        m.innerHTML = `
            <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 transform transition-all scale-100">
                <div class="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 class="font-bold text-lg">${params.title}</h3>
                    <button onclick="document.getElementById('modal-dynamic').remove()" class="text-gray-400 hover:text-red-500"><i class="fas fa-times"></i></button>
                </div>
                <div>${params.content}</div>
                <div class="mt-4 flex gap-3">
                    <button id="btnDynamicConfirm" class="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold hover:bg-emerald-700">تأكيد</button>
                    <button onclick="document.getElementById('modal-dynamic').remove()" class="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-bold">إلغاء</button>
                </div>
            </div>
        `;
        document.getElementById('btnDynamicConfirm').onclick = params.onConfirm;
    },

    closeDynamicModal() {
        const m = document.getElementById('modal-dynamic');
        if (m) m.remove();
    },

    async openReviewModal(logId) {
        UI.loader(true);
        try {
            const logData = JSON.parse(document.getElementById(`raw_data_${logId}`).value);

            const res = await App.call('getClassStudents', { classId: logData.classId });
            if (!res.success) throw new Error("فشل تحميل قائمة الطلاب");

            const statusMap = {};
            const noteMap = {};
            logData.attendance.forEach(a => {
                statusMap[a.studentId] = a.status;
                noteMap[a.studentId] = a.note;
            });

            const attRows = res.students.map(s => {
                const status = statusMap[s.id] || 'Present';
                const note = noteMap[s.id] || '';
                return `
                <div class="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 student-review-row" data-id="${s.id}">
                    <span class="text-sm font-bold w-1/3 truncate">${UI.formatName(s.name)}</span>
                    <select class="p-1 border rounded text-xs font-bold rev-status w-1/4 ${status === 'Absent' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}">
                        <option value="Present" ${status === 'Present' ? 'selected' : ''}>حضور</option>
                        <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>غياب</option>
                        <option value="Late" ${status === 'Late' ? 'selected' : ''}>تأخر</option>
                        <option value="Excused" ${status === 'Excused' ? 'selected' : ''}>عذر</option>
                    </select>
                    <input type="text" class="p-1 border rounded text-xs w-1/3 rev-note" value="${note}" placeholder="ملاحظة...">
                </div>
                `;
            }).join('');

            const modalParams = {
                title: 'تعديل السجل والموافقة',
                content: `
                    <div class="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                        <div>
                            <label class="block text-gray-700 text-sm font-bold mb-2">المحتوى</label>
                            <textarea id="revContent" class="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none">${logData.content || ''}</textarea>
                        </div>
                        <div>
                            <label class="block text-gray-700 text-sm font-bold mb-2">الواجب</label>
                            <textarea id="revHW" class="w-full h-20 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none">${logData.homework || ''}</textarea>
                        </div>
                        <div>
                            <label class="block text-gray-700 text-sm font-bold mb-2">ملاحظات لولي الأمر (عامة)</label>
                            <textarea id="revNotes" class="w-full h-16 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none">${logData.notes || ''}</textarea>
                        </div>
                        <div>
                            <label class="block text-gray-700 text-sm font-bold mb-2 text-purple-600">ملاحظة للمعلم (خاصة)</label>
                            <textarea id="revSupNote" class="w-full h-16 p-3 bg-purple-50 border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 resize-none" placeholder="سبب الرفض أو التعديل..."></textarea>
                        </div>
                        <div>
                            <label class="block text-gray-700 text-sm font-bold mb-2">الطلاب (${res.students.length})</label>
                            <div class="space-y-2 bg-gray-50 p-2 rounded-xl">
                                ${attRows}
                            </div>
                        </div>
                    </div>
                `,
                onConfirm: () => {
                    const newContent = document.getElementById('revContent').value;
                    const newHW = document.getElementById('revHW').value;
                    const newNotes = document.getElementById('revNotes').value;
                    const supNote = document.getElementById('revSupNote').value;
                    const updates = [];
                    document.querySelectorAll('.student-review-row').forEach(row => {
                        updates.push({
                            studentId: row.dataset.id,
                            status: row.querySelector('.rev-status').value,
                            note: row.querySelector('.rev-note').value
                        });
                    });
                    Moderator.submitReview(logId, 'SupervisorApproved', newContent, newHW, newNotes, updates, supNote);
                }
            };
            this.showDynamicModal(modalParams);
        } catch (e) {
            UI.showError(e.message);
        }
        UI.loader(false);
    },

    async submitReview(logId, status, content = null, homework = null, notes = null, updates = [], supervisorNote = null) {
        if (status === 'Rejected' && !confirm('هل أنت متأكد من رفض هذا السجل؟ لن يظهر لولي الأمر.')) return;

        UI.loader(true);
        try {
            const payload = { logId, status };
            if (content !== null) payload.content = content;
            if (homework !== null) payload.homework = homework;
            if (notes !== null) payload.notes = notes;
            if (supervisorNote !== null) payload.supervisorNote = supervisorNote;
            if (updates.length > 0) payload.updates = updates;

            const res = await App.call('reviewLog', payload);
            if (res.success) {
                UI.showError(status === 'Rejected' ? 'تم الرفض' : 'تم الإرسال للأدمن للموافقة النهائية', 'green');
                this.closeDynamicModal();
                this.renderReviews();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    // ==============================
    // WARNINGS MODULE (Supervisor)
    // ==============================

    renderWarnings() {
        const container = document.getElementById('modContent');
        const html = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                <!-- Sidebar: Selection & Form -->
                <div class="space-y-6">
                    <!-- Selection -->
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 class="font-bold text-gray-700 mb-4 border-b pb-2">1. اختيار الطالب</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">الفصل</label>
                                <select id="modWarnClass" onchange="Moderator._loadWarnStudents(this.value)" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700">
                                    <option value="">اختر الفصل...</option>
                                    ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">الطالب</label>
                                <select id="modWarnStudent" onchange="Moderator._loadStudentWarnings(this.value)" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700" disabled>
                                    <option value="">اختر الفصل أولاً...</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Add Warning Form -->
                    <div id="modAddWarningForm" class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hidden border-t-4 border-t-red-500">
                        <h3 class="font-bold text-red-600 mb-4 flex items-center"><i class="fas fa-exclamation-circle ml-2"></i>إصدار إنذار جديد</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">نوع الإنذار</label>
                                <select id="modWarnType" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-gray-700">
                                    <option value="Behavior">سلوك (Behavior)</option>
                                    <option value="Attendance">غياب (Attendance)</option>
                                    <option value="Academic">أكاديمي (Academic)</option>
                                    <option value="Dismissal">فصل (Dismissal)</option>
                                    <option value="Other">أخرى (Other)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">التفاصيل / ملاحظات</label>
                                <textarea id="modWarnDetails" rows="4" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 placeholder-gray-400 font-medium" placeholder="اكتب تفاصيل المخالفة هنا..."></textarea>
                            </div>
                            <button onclick="Moderator._submitWarning()" class="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition shadow-md flex justify-center items-center gap-2">
                                <i class="fas fa-paper-plane"></i> إصدار الإنذار
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main: Warnings List -->
                <div class="md:col-span-2">
                    <div id="modWarningsList" class="space-y-4">
                        <div class="text-center text-gray-400 py-20 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                            <i class="fas fa-user-slash text-4xl mb-4 opacity-50"></i>
                            <p class="font-bold">يرجى اختيار طالب لعرض سجل الإنذارات</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    async _loadWarnStudents(classId) {
        const sel = document.getElementById('modWarnStudent');
        const form = document.getElementById('modAddWarningForm');
        sel.innerHTML = '<option value="">جاري التحميل...</option>';
        sel.disabled = true;
        if (form) form.classList.add('hidden');
        document.getElementById('modWarningsList').innerHTML = '<div class="text-center text-gray-400 py-20">...</div>';

        if (!classId) {
            sel.innerHTML = '<option value="">اختر الفصل أولاً...</option>';
            return;
        }
        try {
            const res = await App.call('getClassStudents', { classId });
            if (res.success) {
                sel.innerHTML = '<option value="">اختر الطالب...</option>' +
                    res.students.map(s => `<option value="${s.id}">${UI.formatName(s.name)}</option>`).join('');
                sel.disabled = false;
            } else {
                sel.innerHTML = '<option value="">فشل التحميل</option>';
            }
        } catch (e) { console.error(e); }
    },

    async _loadStudentWarnings(studentId) {
        const listContainer = document.getElementById('modWarningsList');
        const form = document.getElementById('modAddWarningForm');
        if (!studentId) {
            if (form) form.classList.add('hidden');
            listContainer.innerHTML = '';
            return;
        }
        if (form) form.classList.remove('hidden');
        listContainer.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-red-600"></div>';
        try {
            const res = await App.call('getStudentWarnings', { studentId });
            if (res.success) {
                this._renderWarningsList(res.warnings);
            } else {
                listContainer.innerHTML = `<div class="text-red-500">${res.message}</div>`;
            }
        } catch (e) {
            listContainer.innerHTML = `<div class="text-red-500">${e.message}</div>`;
        }
    },

    _renderWarningsList(warnings) {
        const container = document.getElementById('modWarningsList');
        if (!warnings || warnings.length === 0) {
            container.innerHTML = `
                <div class="text-center text-emerald-500 py-10 bg-emerald-50 rounded-xl border border-emerald-100">
                    <i class="fas fa-check-circle text-4xl mb-3"></i>
                    <p class="font-bold">سجل الطالب نظيف! لا توجد إنذارات.</p>
                </div>
            `;
            return;
        }
        const typeColors = { 'Behavior': 'bg-orange-100 text-orange-700 border-orange-200', 'Attendance': 'bg-blue-100 text-blue-700 border-blue-200', 'Dismissal': 'bg-red-100 text-red-700 border-red-200', 'Academic': 'bg-purple-100 text-purple-700 border-purple-200', 'Other': 'bg-gray-100 text-gray-700 border-gray-200' };
        const typeLabels = { 'Behavior': 'سلوك', 'Attendance': 'غياب', 'Dismissal': 'فصل', 'Academic': 'أكاديمي', 'Other': 'أخرى' };
        container.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-bold text-gray-700">سجل الإنذارات (${warnings.length})</h3>
            </div>
            ${warnings.map(w => `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-center relative overflow-hidden group">
                    <div class="absolute right-0 top-0 bottom-0 w-1 ${w.type === 'Dismissal' ? 'bg-red-500' : 'bg-orange-400'}"></div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="${typeColors[w.type] || typeColors['Other']} px-2 py-1 rounded text-xs font-bold border">${typeLabels[w.type] || w.type}</span>
                                <span class="text-gray-400 text-xs font-bold"><i class="far fa-calendar-alt ml-1"></i>${w.date}</span>
                            </div>
                            <button onclick="Moderator._deleteWarning('${w.id}')" class="text-red-400 hover:text-red-600 p-1 md:hidden"><i class="fas fa-trash"></i></button>
                        </div>
                        <p class="text-gray-800 font-bold text-sm mt-2 leading-relaxed">${w.details}</p>
                        <div class="mt-2 text-xs text-gray-400">حرره: ${w.createdBy}</div>
                    </div>
                    <div class="hidden md:block">
                        <button onclick="Moderator._deleteWarning('${w.id}')" class="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition" title="حذف الإنذار"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('')}
        `;
    },

    async _submitWarning() {
        const studentId = document.getElementById('modWarnStudent').value;
        const type = document.getElementById('modWarnType').value;
        const details = document.getElementById('modWarnDetails').value.trim();
        if (!studentId) return alert('يرجى اختيار طالب');
        if (!details) return alert('يرجى كتابة التفاصيل');
        if (!confirm('هل أنت متأكد من إصدار هذا الإنذار؟ سيظهر لولي الأمر فوراً.')) return;
        UI.loader(true);
        try {
            const res = await App.call('addWarning', { studentId, type, details, createdBy: App.user.name || 'المشرف' });
            if (res.success) {
                document.getElementById('modWarnDetails').value = '';
                this._loadStudentWarnings(studentId);
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    async _deleteWarning(warningId) {
        if (!confirm('هل أنت متأكد من حذف هذا الإنذار نهائياً؟')) return;
        UI.loader(true);
        try {
            const res = await App.call('deleteWarning', { warningId });
            if (res.success) {
                UI.showError('تم الحذف بنجاح', 'green');
                const studentId = document.getElementById('modWarnStudent').value;
                if (studentId) this._loadStudentWarnings(studentId);
            } else { alert(res.message); }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },


    // ==============================
    // ASSESSMENT REVIEWS MODULE
    // ==============================

    async renderAssessReviews() {
        const container = document.getElementById('modContent');
        container.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-purple-600 mt-10"></div>';

        try {
            const myClassIds = this.lookups.classes.map(c => String(c.id));
            const res = await App.call('getAssessmentsForReview', { classIds: myClassIds });

            if (!res.success) throw new Error(res.message);

            if (!res.batches || res.batches.length === 0) {
                container.innerHTML = `
                    <div class="text-center p-10 bg-white rounded-xl shadow-sm border border-gray-200">
                        <div class="bg-purple-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-500">
                            <i class="fas fa-check text-4xl"></i>
                        </div>
                        <h3 class="font-bold text-gray-700 text-lg">لا توجد تقييمات للمراجعة</h3>
                        <p class="text-gray-500 text-sm">كل التقييمات تمت مراجعتها!</p>
                    </div>
                `;
                return;
            }

            const html = `
                <div class="space-y-4 animate-fadeIn">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-gray-700 text-lg flex items-center">
                            <i class="fas fa-star text-purple-600 ml-2"></i>تقييمات بانتظار المراجعة
                            <span class="mr-2 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full border border-purple-200">${res.batches.length}</span>
                        </h3>
                        <div class="flex gap-2">
                            <button onclick="Moderator._batchReviewAssessments('Approved')" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm text-sm">
                                <i class="fas fa-check-double ml-1"></i>موافقة على الكل
                            </button>
                        </div>
                    </div>

                    <div id="assessBatchList" class="grid gap-4">
                        ${res.batches.map(batch => {
                const scoredStudents = batch.students.filter(s => s.score !== '' && s.score !== null);
                const avg = scoredStudents.length ? (scoredStudents.reduce((sum, s) => sum + parseFloat(s.score), 0) / scoredStudents.length).toFixed(1) : '-';
                const pct = (avg !== '-' && batch.maxScore) ? Math.round((avg / batch.maxScore) * 100) : null;
                const pctColor = pct === null ? '' : pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600';

                return `
                            <div class="bg-white p-5 rounded-xl shadow-sm border border-purple-100 hover:shadow-md transition" id="assessCard_${CSS.escape(batch.batchKey)}">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 class="font-bold text-gray-800 text-lg">${batch.className} — ${batch.subjectName}</h4>
                                        <p class="text-sm text-gray-500">
                                            <i class="fas fa-user ml-1"></i>${UI.formatName(batch.teacherName)}
                                            <span class="mx-2">•</span>
                                            <i class="fas fa-tag ml-1 text-purple-500"></i><span class="text-purple-700 font-bold">${batch.title}</span>
                                        </p>
                                    </div>
                                    <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold whitespace-nowrap">${batch.date}</span>
                                </div>

                                <div class="flex gap-4 mb-4 bg-purple-50 p-3 rounded-xl">
                                    <div class="text-center">
                                        <div class="text-lg font-bold text-purple-700">${batch.students.length}</div>
                                        <div class="text-xs text-gray-500">طالب</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-lg font-bold ${pctColor}">${avg} / ${batch.maxScore}</div>
                                        <div class="text-xs text-gray-500">متوسط الدرجات</div>
                                    </div>
                                    ${pct !== null ? `<div class="text-center">
                                        <div class="text-lg font-bold ${pctColor}">${pct}%</div>
                                        <div class="text-xs text-gray-500">النسبة</div>
                                    </div>` : ''}
                                </div>

                                <!-- Student Preview (collapsed) -->
                                <details class="mb-4">
                                    <summary class="cursor-pointer text-xs font-bold text-purple-600 hover:underline">عرض درجات الطلاب</summary>
                                    <div class="mt-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        ${batch.students.map(s => `
                                            <div class="flex justify-between items-center p-2 border-b border-gray-50 text-sm">
                                                <span class="font-bold text-gray-700">${UI.formatName(s.studentName)}</span>
                                                <span class="font-bold ${parseFloat(s.score) >= batch.maxScore * 0.7 ? 'text-emerald-600' : 'text-red-500'}">
                                                    ${s.score !== '' && s.score !== null ? s.score + ' / ' + batch.maxScore : 'لم يُدخل'}
                                                </span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </details>

                                <div class="flex gap-3">
                                    <button onclick="Moderator._reviewAssessmentBatch('${batch.classId}','${batch.subjectId}','${batch.title.replace(/'/g, "\\'")}','${batch.date}','Approved')" 
                                        class="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm text-sm">
                                        <i class="fas fa-check ml-2"></i>موافقة
                                    </button>
                                    <button onclick="Moderator._reviewAssessmentBatch('${batch.classId}','${batch.subjectId}','${batch.title.replace(/'/g, "\\'")}','${batch.date}','Rejected')" 
                                        class="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold hover:bg-red-100 transition border border-red-200 text-sm">
                                        <i class="fas fa-times ml-2"></i>رفض
                                    </button>
                                </div>
                            </div>
                        `;
            }).join('')}
                    </div>
                </div>
            `;
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">${e.message}</div>`;
        }
    },

    async _reviewAssessmentBatch(classId, subjectId, title, date, status) {
        const label = status === 'Approved' ? 'الموافقة' : 'الرفض';
        if (!confirm(`هل أنت متأكد من ${label} على هذا التقييم؟`)) return;

        UI.loader(true);
        try {
            const res = await App.call('reviewAssessments', { classId, subjectId, title, date, status });
            if (res.success) {
                UI.showError(`تم ${label} على التقييم`, 'green');
                this.renderAssessReviews();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    async _batchReviewAssessments(status) {
        const label = status === 'Approved' ? 'الموافقة' : 'الرفض';
        if (!confirm(`هل أنت متأكد من ${label} على جميع التقييمات المعلقة؟`)) return;

        const cards = document.querySelectorAll('[id^="assessCard_"]');
        if (!cards.length) return;

        UI.loader(true);
        // Re-fetch list and approve all
        try {
            const myClassIds = this.lookups.classes.map(c => String(c.id));
            const res = await App.call('getAssessmentsForReview', { classIds: myClassIds });
            if (res.success) {
                for (const batch of res.batches) {
                    await App.call('reviewAssessments', { classId: batch.classId, subjectId: batch.subjectId, title: batch.title, date: batch.date, status });
                }
                UI.showError(`تم ${label} على ${res.batches.length} تقييم`, 'green');
                this.renderAssessReviews();
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    // ==========================================
    // LOGS HISTORY MODULE (Moderator/Supervisor)
    // ==========================================

    async renderLogsHistory() {
        const content = document.getElementById('modContent');
        content.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-emerald-500 mt-10"></div>';
        try {
            const res = await App.call('getAllLogsHistory');
            if (!res.success) throw new Error(res.message);

            // Filter to only classes/teachers this supervisor is assigned to
            const myClassNames = this.lookups.classes.map(c => c.displayName);
            const myTeacherNames = this.lookups.teachers.map(t => t.name);
            const filtered = res.history.filter(r =>
                myClassNames.includes(r.className) || myTeacherNames.includes(r.teacherName)
            );

            this._modLogsData = filtered;

            // Build filter options from the filtered set only
            const classes = [...new Set(filtered.map(r => r.className).filter(Boolean))].sort();
            const subjects = [...new Set(filtered.map(r => r.subjectName).filter(Boolean))].sort();
            const teachers = [...new Set(filtered.map(r => r.teacherName).filter(Boolean))].sort();

            const html = `
                <div class="space-y-4 animate-fadeIn">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="bg-blue-100 p-2 rounded-xl">
                            <i class="fas fa-history text-blue-600 text-xl"></i>
                        </div>
                        <div>
                            <h2 class="font-bold text-gray-800 text-lg">سجل الحصص</h2>
                            <p class="text-xs text-gray-500">حصص فصولك ومعلميك المخصصين</p>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div class="flex flex-wrap gap-3 items-center">
                            <div class="relative flex-grow min-w-[160px]">
                                <i class="fas fa-search absolute right-3 top-3 text-gray-400 text-sm"></i>
                                <input type="text" id="mlh_search" oninput="Moderator._applyModLogsFilters()"
                                    placeholder="بحث في المحتوى أو الفصل أو المادة..."
                                    class="w-full pr-9 pl-3 py-2 border rounded-lg text-sm outline-none focus:border-blue-400 bg-gray-50">
                            </div>
                            <select id="mlh_class" onchange="Moderator._applyModLogsFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-blue-400">
                                <option value="">كل الفصول</option>
                                ${classes.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                            <select id="mlh_subject" onchange="Moderator._applyModLogsFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-blue-400">
                                <option value="">كل المواد</option>
                                ${subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                            <select id="mlh_teacher" onchange="Moderator._applyModLogsFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-blue-400">
                                <option value="">كل المعلمين</option>
                                ${teachers.map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                            <select id="mlh_status" onchange="Moderator._applyModLogsFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-blue-400">
                                <option value="">كل الحالات</option>
                                <option value="Pending">قيد المراجعة</option>
                                <option value="Approved">مقبول</option>
                                <option value="Rejected">مرفوض</option>
                            </select>
                            <span id="mlh_count" class="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">${filtered.length} سجل</span>
                        </div>
                    </div>

                    <div id="mlh_table"></div>
                </div>
            `;
            content.innerHTML = html;
            this._renderModLogsTable(filtered);
        } catch (e) {
            content.innerHTML = `<div class="text-red-500 text-center p-10">${e.message}</div>`;
        }
    },

    _applyModLogsFilters() {
        if (!this._modLogsData) return;
        const q = (document.getElementById('mlh_search')?.value || '').toLowerCase();
        const cls = document.getElementById('mlh_class')?.value || '';
        const subject = document.getElementById('mlh_subject')?.value || '';
        const teacher = document.getElementById('mlh_teacher')?.value || '';
        const status = document.getElementById('mlh_status')?.value || '';

        let data = this._modLogsData;
        if (cls) data = data.filter(r => r.className === cls);
        if (subject) data = data.filter(r => r.subjectName === subject);
        if (teacher) data = data.filter(r => r.teacherName === teacher);
        if (status) data = data.filter(r => r.status === status);
        if (q) data = data.filter(r =>
            (r.className || '').toLowerCase().includes(q) ||
            (r.subjectName || '').toLowerCase().includes(q) ||
            (r.teacherName || '').toLowerCase().includes(q) ||
            (r.content || '').toLowerCase().includes(q)
        );

        const countEl = document.getElementById('mlh_count');
        if (countEl) countEl.textContent = `${data.length} سجل`;
        this._renderModLogsTable(data);
    },

    _renderModLogsTable(records) {
        const container = document.getElementById('mlh_table');
        if (!container) return;
        if (!records.length) {
            container.innerHTML = '<div class="text-center p-8 text-gray-400">لا توجد نتائج</div>';
            return;
        }
        const html = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-right min-w-[760px]">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                        <tr>
                            <th class="p-4">التاريخ</th>
                            <th class="p-4">الفصل / المادة</th>
                            <th class="p-4">المعلم</th>
                            <th class="p-4">المحتوى</th>
                            <th class="p-4">الحالة</th>
                            <th class="p-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${records.map(row => {
            let sc = 'bg-gray-100 text-gray-600', st = row.status;
            if (row.status === 'Approved') { sc = 'bg-emerald-100 text-emerald-700'; st = 'مقبول'; }
            else if (row.status === 'Pending') { sc = 'bg-yellow-100 text-yellow-700'; st = 'قيد المراجعة'; }
            else if (row.status === 'Rejected') { sc = 'bg-red-100 text-red-700'; st = 'مرفوض'; }
            return `
                            <tr class="hover:bg-gray-50 transition">
                                <td class="p-4 font-bold text-gray-700 whitespace-nowrap">${row.date}</td>
                                <td class="p-4">
                                    <div class="font-bold text-gray-800">${row.className}</div>
                                    <div class="text-xs text-gray-500">${row.subjectName}</div>
                                </td>
                                <td class="p-4">
                                    <div class="flex items-center gap-2">
                                        <div class="bg-blue-100 text-blue-700 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold">${(row.teacherName || '?')[0]}</div>
                                        <span class="text-sm font-bold text-gray-700">${row.teacherName || '-'}</span>
                                    </div>
                                </td>
                                <td class="p-4 text-sm text-gray-600 max-w-xs truncate" title="${row.content || ''}">${row.content || '-'}</td>
                                <td class="p-4">
                                    <span class="${sc} px-3 py-1 rounded-full text-xs font-bold w-fit block">${st}</span>
                                    ${row.supervisorNote ? `<span class="text-purple-600 text-xs font-bold bg-purple-50 px-2 py-1 rounded mt-1 block">🔔 ${row.supervisorNote}</span>` : ''}
                                </td>
                                <td class="p-4">
                                    <button onclick="Moderator._showLogDetail('${row.id}')"
                                        title="عرض تفاصيل الحصة"
                                        class="w-9 h-9 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full flex items-center justify-center transition border border-blue-200">
                                        <i class="fas fa-info-circle"></i>
                                    </button>
                                </td>
                            </tr>`;
        }).join('')}
                    </tbody>
                    </table>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    async _showLogDetail(logId) {
        document.getElementById('modal-log-detail')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'modal-log-detail';
        overlay.className = 'fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm';
        overlay.innerHTML = '<div class="spinner mx-auto border-white border-t-blue-400 mt-20"></div>';
        document.body.appendChild(overlay);

        try {
            const res = await App.call('getLogDetails', { logId });
            if (!res.success) throw new Error(res.message);
            const { log, attendance } = res;

            const statusMap = { 'Present': 'حاضر', 'Absent': 'غائب', 'Late': 'متأخر', 'Excused': 'بعذر' };
            const statusColor = { 'Present': 'bg-emerald-100 text-emerald-700', 'Absent': 'bg-red-100 text-red-700', 'Late': 'bg-yellow-100 text-yellow-800', 'Excused': 'bg-blue-100 text-blue-700' };

            const attRows = attendance.length ? attendance.map(a => `
                <div class="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <span class="font-bold text-gray-800 text-sm">${UI.formatName(a.studentName)}</span>
                    <div class="flex flex-col items-end gap-1">
                        <span class="${statusColor[a.status] || 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs font-bold">${statusMap[a.status] || a.status}</span>
                        ${a.note ? `<span class="text-yellow-700 bg-yellow-50 text-xs px-2 py-0.5 rounded border border-yellow-100">• ${a.note}</span>` : ''}
                    </div>
                </div>`).join('') : '<p class="text-gray-400 text-sm text-center py-4">لا توجد بيانات حضور</p>';

            const absCount = attendance.filter(a => a.status === 'Absent').length;
            const noteCount = attendance.filter(a => a.note).length;

            overlay.innerHTML = `
                <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="bg-gradient-to-l from-blue-600 to-indigo-600 p-5 text-white flex justify-between items-start">
                        <div>
                            <h3 class="font-bold text-xl">${log.className}</h3>
                            <p class="text-blue-100 text-sm">${log.subjectName} &bull; ${UI.formatName(log.teacherName)} &bull; ${log.date}</p>
                            <div class="flex gap-3 mt-2">
                                ${absCount > 0 ? `<span class="bg-red-500/30 text-white text-xs font-bold px-2 py-0.5 rounded-full"><i class="fas fa-user-times ml-1"></i>${absCount} غائب</span>` : ''}
                                ${noteCount > 0 ? `<span class="bg-yellow-400/30 text-white text-xs font-bold px-2 py-0.5 rounded-full"><i class="fas fa-comment-alt ml-1"></i>${noteCount} ملاحظة</span>` : ''}
                            </div>
                        </div>
                        <button onclick="document.getElementById('modal-log-detail').remove()" class="text-white/70 hover:text-white transition text-xl p-1 mt-1"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="overflow-y-auto custom-scrollbar flex-grow p-5 space-y-4">
                        ${log.content ? `<div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p class="text-gray-400 text-xs font-bold mb-2"><i class="fas fa-book-open ml-1 text-blue-500"></i>المحتوى</p>
                            <p class="text-gray-800 text-sm leading-relaxed">${log.content}</p>
                        </div>` : ''}
                        ${log.homework ? `<div class="bg-orange-50 p-4 rounded-xl border border-orange-200">
                            <p class="text-orange-500 text-xs font-bold mb-2"><i class="fas fa-pencil-alt ml-1"></i>الواجب</p>
                            <p class="text-gray-800 text-sm leading-relaxed">${log.homework}</p>
                        </div>` : ''}
                        ${log.supervisorNote ? `<div class="bg-purple-50 p-4 rounded-xl border border-purple-200">
                            <p class="text-purple-600 text-xs font-bold mb-2"><i class="fas fa-comment-dots ml-1"></i>ملاحظة المشرف</p>
                            <p class="text-gray-800 text-sm">${log.supervisorNote}</p>
                        </div>` : ''}
                        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h4 class="font-bold text-gray-700"><i class="fas fa-users ml-2 text-blue-500"></i>سجل الحضور</h4>
                                <span class="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">${attendance.length} طالب</span>
                            </div>
                            <div class="p-4 max-h-64 overflow-y-auto custom-scrollbar">${attRows}</div>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            overlay.innerHTML = `<div class="bg-white rounded-2xl p-8 text-red-500 font-bold text-center">${e.message}<br><button onclick="document.getElementById('modal-log-detail').remove()" class="mt-4 bg-gray-100 px-4 py-2 rounded-lg text-gray-700 text-sm font-bold">إغلاق</button></div>`;
        }
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    },

    // ============================================
    // ASSESSMENTS ENTRY
    // ============================================

    renderAssessEntry() {
        const today = new Date().toISOString().split('T')[0];
        const container = document.getElementById('modContent');
        const html = `
            <div class="space-y-6 animate-fadeIn max-w-4xl mx-auto">
                <!-- Header -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                    <div class="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600">
                        <i class="fas fa-pen text-3xl"></i>
                    </div>
                    <h3 class="font-bold text-xl text-gray-800">إدارة التقييمات</h3>
                    <p class="text-gray-500 text-sm">أدخل تقييمات الطلاب للفصول والمواد المسندة إليك واستعرض السجل</p>
                </div>

                <!-- Sub-tabs -->
                <div class="flex flex-wrap justify-center gap-2 bg-white p-2 text-center rounded-xl shadow-sm border border-gray-100 sm:w-fit sm:mx-auto">
                    <button onclick="Moderator._showAssessSubTab('enter')" id="mod_asub_enter" class="flex-1 min-w-[120px] px-3 py-2 rounded-lg font-bold text-sm bg-purple-100 text-purple-700 transition">
                        <i class="fas fa-pen ml-1"></i>تسجيل تقييم
                    </button>
                    <button onclick="Moderator._showAssessSubTab('history')" id="mod_asub_history" class="flex-1 min-w-[120px] px-3 py-2 rounded-lg font-bold text-sm text-gray-500 hover:bg-gray-50 transition">
                        <i class="fas fa-list ml-1"></i>سجل التقييمات
                    </button>
                </div>

                <!-- Entry Form -->
                <div id="modAssessEntryForm">
                    <!-- Class/Subject Selector -->
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-gray-500 text-sm font-bold mb-2">الفصل</label>
                            <div class="relative">
                                <select id="modAssessClassSelect" onchange="Moderator._loadAssessStudents(this.value)" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold text-gray-700">
                                    <option value="">-- اختر الفصل --</option>
                                    ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                                </select>
                                <div class="absolute left-4 top-4 text-purple-600 pointer-events-none"><i class="fas fa-chevron-down"></i></div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-gray-500 text-sm font-bold mb-2">المادة</label>
                            <div class="relative">
                                <select id="modAssessSubjectSelect" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold text-gray-700">
                                    <option value="">-- اختر المادة --</option>
                                    ${this.lookups.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                                <div class="absolute left-4 top-4 text-purple-600 pointer-events-none"><i class="fas fa-chevron-down"></i></div>
                            </div>
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
                                <button onclick="Moderator._fillAllScores()" class="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200 transition">تعبئة الكل بالدرجة الكاملة</button>
                            </div>
                            <div id="assessStudentList" class="divide-y divide-gray-100 max-h-[420px] overflow-y-auto custom-scrollbar"></div>
                            <div class="p-4 border-t bg-gray-50">
                                <button onclick="Moderator.submitAssessments()" class="w-full bg-purple-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-purple-700 transition transform active:scale-95">
                                    <i class="fas fa-save ml-2"></i> حفظ التقييمات
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- History -->
                <div id="modAssessHistory" class="hidden">
                    <div class="text-center py-10"><div class="spinner mx-auto border-gray-300 border-t-purple-600"></div></div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    },

    _showAssessSubTab(tab) {
        document.getElementById('mod_asub_enter').className = `px-5 py-2 rounded-lg font-bold text-sm transition ${tab === 'enter' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`;
        document.getElementById('mod_asub_history').className = `px-5 py-2 rounded-lg font-bold text-sm transition ${tab === 'history' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`;
        document.getElementById('modAssessEntryForm').classList.toggle('hidden', tab !== 'enter');
        document.getElementById('modAssessHistory').classList.toggle('hidden', tab !== 'history');
        if (tab === 'history') this._loadAssessHistory();
    },

    async _loadAssessHistory() {
        const container = document.getElementById('modAssessHistory');
        container.innerHTML = '<div class="text-center py-10"><div class="spinner mx-auto border-gray-300 border-t-purple-600"></div></div>';
        try {
            const classIds = this.lookups.classes.map(c => c.id);
            const res = await App.call('getSupervisorAssessmentHistory', { classIds });
            if (!res.success) throw new Error(res.message);

            if (!res.history || res.history.length === 0) {
                container.innerHTML = '<div class="p-10 text-center text-gray-400 bg-white rounded-xl shadow-sm font-bold">لا توجد تقييمات مسجلة بعد للفصول الموكلة إليك</div>';
                return;
            }

            container.innerHTML = '<div class="grid gap-4 md:grid-cols-2">' + res.history.map(b => {
                const cname = this.lookups.classes.find(c => c.id == b.classId)?.displayName || b.classId;
                const sname = this.lookups.subjects.find(s => s.id == b.subjectId)?.name || b.subjectId;
                const statusBadge = b.status === 'Approved' ? '<span class="px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-lg">معتمد</span>' :
                    b.status === 'Rejected' ? '<span class="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-lg">مرفوض</span>' :
                        '<span class="px-2 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-lg">قيد المراجعة</span>';
                return `
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-purple-300 transition">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h4 class="font-bold text-gray-800 text-lg">${b.title}</h4>
                                <div class="text-xs text-gray-500 mt-1"><i class="fas fa-calendar-alt ml-1"></i>${new Date(b.date).toLocaleDateString('ar-EG')}</div>
                            </div>
                            ${statusBadge}
                        </div>
                        <div class="bg-gray-50 p-2 rounded-lg text-sm mb-3">
                            <div class="flex justify-between mb-1"><span class="text-gray-500">الفصل:</span> <span class="font-bold text-gray-700">${cname}</span></div>
                            <div class="flex justify-between mb-1"><span class="text-gray-500">المادة:</span> <span class="font-bold text-gray-700">${sname}</span></div>
                            <div class="flex justify-between mb-1"><span class="text-gray-500">الطلاب المقيمين:</span> <span class="font-bold text-gray-700">${b.studentCount}</span></div>
                            <div class="flex justify-between"><span class="text-gray-500">الدرجة الكاملة:</span> <span class="font-bold text-gray-700">${b.maxScore}</span></div>
                        </div>
                        <button class="w-full py-2 text-sm font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition opacity-50 cursor-not-allowed">
                            تفاصيل التقييم (قريباً)
                        </button>
                    </div>
                `;
            }).join('') + '</div>';
        } catch (e) {
            container.innerHTML = `<div class="p-8 text-center text-red-500 bg-red-50 rounded-xl">${e.message}</div>`;
        }
    },

    async _loadAssessStudents(classId) {
        const detailsArea = document.getElementById('assessDetails');
        const listArea = document.getElementById('assessStudentList');

        if (!classId) {
            detailsArea.classList.add('hidden');
            this._assessStudents = null;
            return;
        }

        detailsArea.classList.remove('hidden');
        listArea.innerHTML = '<div class="p-8 text-center"><div class="spinner mx-auto border-gray-300 border-t-purple-600"></div></div>';

        try {
            const res = await App.call('getClassStudents', { classId: classId });
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
        const classId = document.getElementById('modAssessClassSelect').value;
        const subjectId = document.getElementById('modAssessSubjectSelect').value;

        if (!title) return alert("الرجاء كتابة عنوان التقييم");
        if (!date) return alert("الرجاء تحديد التاريخ");
        if (!maxScore || maxScore <= 0) return alert("الرجاء تحديد الدرجة الكاملة");
        if (!classId) return alert("الرجاء اختيار الفصل");
        if (!subjectId) return alert("الرجاء اختيار المادة");
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
                classId: classId,
                subjectId: subjectId,
                title,
                date,
                maxScore,
                students
            });

            if (res.success) {
                UI.showError("تم حفظ التقييمات بنجاح ✓", "green");
                // Reset form
                document.getElementById('assessTitle').value = '';
                document.getElementById('modAssessClassSelect').value = '';
                document.getElementById('modAssessSubjectSelect').value = '';
                document.getElementById('assessDetails').classList.add('hidden');
                this._assessStudents = null;
            } else {
                alert("فشل الحفظ: " + res.message);
            }
        } catch (e) {
            alert("خطأ: " + e.message);
        }
    }

};
