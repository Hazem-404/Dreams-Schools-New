const Admin = {
    currentTab: 'Stats',
    // isSupervisor removed
    cache: {},          // Tab-level data cache: { key: { data, ts } }
    _cacheMs: 180000,   // 3 minutes client-side cache TTL
    lookups: { teachers: [], classes: [], subjects: [], students: [] },

    async init() {
        document.getElementById('adminTabs').classList.remove('hidden');

        // Reset visibility
        document.querySelectorAll('#adminTabs .group, #adminTabs button').forEach(el => el.classList.remove('hidden'));

        this.switchTab('Users'); // Default to Users for now as requested? Or keep Stats. Keep Stats.
        this.switchTab('Stats');

        try {
            const res = await App.call('getAdminLookups');
            if (res.success) {
                this.lookups = res;
                this.lookups.classes.forEach(c => {
                    c.displayName = `${c.name} ${c.number ? '- ' + c.number : ''}`;
                });
                this.lookups.teachers.forEach(t => t.name = UI.formatName(t.name));
                this.lookups.students.forEach(s => s.name = UI.formatName(s.name));
            }
        } catch (e) { console.error("Failed to load lookups", e); }
    },

    allData: [],
    currentHeader: [],

    async switchTab(tab) {
        this.currentTab = tab;

        // Reset Styles
        document.querySelectorAll('#adminTabs button').forEach(b => {
            b.classList.remove('bg-emerald-50', 'text-emerald-600', 'border-emerald-200');
            // Reset Dropdown Triggers
            if (!b.hasAttribute('data-tab')) {
                b.classList.remove('bg-emerald-50', 'text-emerald-600');
                b.classList.add('text-gray-700');
            }
        });

        // Highlight Active Tab
        const btn = document.querySelector(`button[data-tab="${tab}"]`);
        if (btn) {
            btn.classList.add('bg-emerald-50', 'text-emerald-600');
            // Highlight Parent Group
            const group = btn.closest('.group');
            if (group) {
                const trigger = group.querySelector('button');
                if (trigger) {
                    trigger.classList.remove('text-gray-700');
                    trigger.classList.add('bg-emerald-50', 'text-emerald-600');
                }
            }
        }

        const content = document.getElementById('dashboardContent');
        content.innerHTML = '<div class="text-center p-10"><div class="spinner mx-auto border-gray-300 border-t-emerald-500"></div></div>';

        if (tab === 'Stats') return this.loadStats();
        if (tab === 'Monitoring') return this.renderMonitoring();
        if (tab === 'Reviews') return this.renderReviews();
        if (tab === 'ClassControl') return this.renderClassControl();
        if (tab === 'Warnings') return this.renderWarnings();
        if (tab === 'StudentsManagement') return this.renderStudentsManagement();
        if (tab === 'ParentsManagement') return this.renderParentsManagement();

        // Load Data Table with client-side cache
        try {
            const cacheKey = 'tab_' + tab;
            const now = Date.now();
            let res;

            if (this.cache[cacheKey] && (now - this.cache[cacheKey].ts) < this._cacheMs) {
                res = this.cache[cacheKey].data;
            } else {
                try {
                    res = await App.call('adminGetData', { type: tab });
                    if (!res.success) throw new Error(res.message);
                    this.cache[cacheKey] = { data: res, ts: now };
                } catch (err) {
                    console.warn("Backend unavailable, returning empty list", err);
                    res = { success: true, header: ['Info'], data: [['Backend Not Deployed']] };
                    if (tab === 'Subjects') res.header = ['المعرف', 'اسم المادة'], res.data = [];
                    if (tab === 'Users') res.header = ['المعرف', 'الاسم', 'الدور', 'الهاتف', 'كلمة المرور', 'نشط'], res.data = [];
                }
            }

            this.allData = res.data || [];
            this.currentHeader = res.header;

            this.renderFilters(tab);
            this.applyFilters();

        } catch (e) {
            content.innerHTML = `<div class="bg-red-100 text-red-600 p-4 rounded-xl text-center">${e.message}</div>`;
        }
    },

    // Clear specific or all client-side caches (call after write operations)
    _clearAdminCache(key = null) {
        if (key) {
            delete this.cache[key];
        } else {
            this.cache = {}; // Nuclear: clear all
        }
    },

    renderFilters(tab) {
        const content = document.getElementById('dashboardContent');
        let filterHtml = '';

        if (tab === 'Users') {
            filterHtml = `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex gap-4 items-center">
                    <span class="font-bold text-gray-700 text-sm"><i class="fas fa-filter text-emerald-500 ml-2"></i>تصفية حسب:</span>
                    <select id="filterStart" onchange="Admin.applyFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                        <option value="">كل الأدوار</option>
                        <option value="Teacher">معلم</option>
                        <option value="Parent">ولي أمر</option>
                        <option value="Supervisor">مشرف</option>
                        <option value="Admin">إدارة</option>
                    </select>
                </div>
                <div id="tableContainer"></div>
            `;
        } else if (tab === 'Allocations') {
            // Allocations: [ID, TeacherID, ClassID, SubjectID]
            filterHtml = `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-4 items-center">
                    <span class="font-bold text-gray-700 text-sm"><i class="fas fa-filter text-emerald-500 ml-2"></i>تصفية حسب:</span>
                    
                    <select id="filterClass" onchange="Admin.applyFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                        <option value="">كل الفصول</option>
                        ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                    </select>

                    <select id="filterSubject" onchange="Admin.applyFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                        <option value="">كل المواد</option>
                        ${this.lookups.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>

                    <select id="filterTeacher" onchange="Admin.applyFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                        <option value="">كل المعلمين</option>
                        ${this.lookups.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                </div>
                </div>
                <div id="tableContainer"></div>
            `;
        } else if (tab === 'Enrollments') {
            filterHtml = `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-4 items-center">
                    <span class="font-bold text-gray-700 text-sm"><i class="fas fa-filter text-emerald-500 ml-2"></i>تصفية حسب:</span>
                    <select id="filterClass" onchange="Admin.applyFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                        <option value="">كل الفصول</option>
                        ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                    </select>
                </div>
                <div id="tableContainer"></div>
            `;
        } else {
            filterHtml = `<div id="tableContainer"></div>`;
        }

        // Add Bulk Action Bar (Hidden by default)
        filterHtml += `
            <div id="bulkActionBar" class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 hidden transition-all duration-300 border border-gray-700">
                <span class="font-bold text-sm text-emerald-400"><span id="selectedCount" class="text-white">0</span> طالب محدد</span>
                <div class="h-4 w-px bg-gray-700"></div>
                <button onclick="Admin.openBulkMove()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-full font-bold text-xs transition flex items-center shadow-lg shadow-emerald-900/50">
                    <i class="fas fa-exchange-alt ml-2"></i>نقل الفصل
                </button>
                <button onclick="Admin.clearSelection()" class="text-gray-400 hover:text-white transition p-1"><i class="fas fa-times"></i></button>
            </div>
        `;

        content.innerHTML = filterHtml;
    },

    applyFilters() {
        const tab = this.currentTab;
        let filtered = this.allData;

        if (tab === 'Users') {
            const role = document.getElementById('filterStart') ? document.getElementById('filterStart').value : '';
            if (role) {
                // Role is at Index 2
                filtered = filtered.filter(row => row[2] === role);
            }
        } else if (tab === 'Allocations') {
            const classId = document.getElementById('filterClass') ? document.getElementById('filterClass').value : '';
            const subId = document.getElementById('filterSubject') ? document.getElementById('filterSubject').value : '';
            const teacherId = document.getElementById('filterTeacher') ? document.getElementById('filterTeacher').value : '';


            // Allocations: [ID, TeacherID, ClassID, SubjectID, Year]
            if (classId) filtered = filtered.filter(row => String(row[2]) === String(classId));
            if (subId) filtered = filtered.filter(row => String(row[3]) === String(subId));
            if (teacherId) filtered = filtered.filter(row => String(row[1]) === String(teacherId));
        } else if (tab === 'Enrollments') {
            const classId = document.getElementById('filterClass') ? document.getElementById('filterClass').value : '';
            // Enrollments: [ID, StudentID, ClassID]
            if (classId) filtered = filtered.filter(row => String(row[2]) === String(classId));
        }

        this.renderTable(tab, this.currentHeader, filtered);
    },

    async loadStats() {
        try {
            let res;
            try {
                res = await App.call('getAdminStats');
                if (!res.success) throw new Error(res.message);
            } catch (err) {
                console.warn("Backend unavailable, using mock data", err);
                res = { success: true, stats: { students: 0, teachers: 0, parents: 0, classes: 0, enrollments: 0 } };
            }

            const now = new Date().toLocaleString('ar-EG');
            const s = res.stats;

            const html = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1">
                        <div class="flex items-center justify-between">
                            <div class="text-slate-500 text-xs font-bold">الطلاب</div>
                            <div class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center"><i class="fas fa-user-graduate text-emerald-500 text-xs"></i></div>
                        </div>
                        <div class="text-3xl font-bold text-emerald-600">${s.students || 0}</div>
                        ${s.enrollments != null ? `<div class="text-xs text-gray-400">${s.enrollments} قيد في الفصول</div>` : ''}
                    </div>
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1">
                        <div class="flex items-center justify-between">
                            <div class="text-slate-500 text-xs font-bold">المعلمين</div>
                            <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><i class="fas fa-chalkboard-teacher text-blue-500 text-xs"></i></div>
                        </div>
                        <div class="text-3xl font-bold text-blue-600">${s.teachers || 0}</div>
                    </div>
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1">
                        <div class="flex items-center justify-between">
                            <div class="text-slate-500 text-xs font-bold">أولياء الأمور</div>
                            <div class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center"><i class="fas fa-user-friends text-orange-500 text-xs"></i></div>
                        </div>
                        <div class="text-3xl font-bold text-orange-600">${s.parents || 0}</div>
                    </div>
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1">
                        <div class="flex items-center justify-between">
                            <div class="text-slate-500 text-xs font-bold">الفصول</div>
                            <div class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center"><i class="fas fa-chalkboard text-purple-500 text-xs"></i></div>
                        </div>
                        <div class="text-3xl font-bold text-purple-600">${s.classes || 0}</div>
                    </div>
                </div>

                <div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white mb-6">
                    <h3 class="font-bold text-lg mb-2">مرحباً بك في لوحة التحكم</h3>
                    <p class="opacity-90 text-sm">استخدم علامات التبويب في الأعلى لإدارة النظام، أو انتقل إلى تبويب "المتابعة" لمراقبة سير العملية التعليمية.</p>
                    <p class="text-emerald-100 text-xs mt-3 border-t border-white/20 pt-2"><i class="fas fa-clock ml-1"></i>آخر تحديث: ${now}</p>
                </div>
             `;
            document.getElementById('dashboardContent').innerHTML = html;
        } catch (e) {
            document.getElementById('dashboardContent').innerHTML = `<div class="text-red-500 text-center p-4">Error loading stats: ${e.message}</div>`;
        }
    },

    renderTable(type, header, data) {
        this.cache[type] = { header, data: data || [] }; // Store for edit

        // Arabic Headers Map
        const headerMap = {
            'Users': ['المعرف', 'الاسم', 'الدور', 'الهاتف', 'كلمة المرور', 'نشط'],
            'Classes': ['معرف الفصل', 'اسم الفصل', 'رقم الفصل'], // Modified: No Supervisor, No Notes
            'Subjects': ['المعرف', 'اسم المادة', 'الاسم الانجليزي'],
            'Allocations': ['معرف التوزيع', 'المعلم', 'الفصل', 'المادة', 'السنة'],
            'Enrollments': ['معرف القيد', 'الطالب', 'الفصل']
        };
        const displayHeader = headerMap[type] || header;

        // Helper to resolve IDs to Names
        const resolveCell = (val, colIndex) => {
            const format = (v) => UI.formatName(v);

            if (type === 'Users' && colIndex === 1) return format(val); // Name
            if (type === 'Users' && colIndex === 2) { // Role
                const map = { 'Admin': 'مدير', 'Teacher': 'معلم', 'Parent': 'ولي أمر', 'Supervisor': 'مشرف' };
                return map[val] || val;
            }
            if (type === 'Allocations') {
                if (colIndex === 1) return this.getName(this.lookups.teachers, val); // Teacher
                if (colIndex === 2) return this.getName(this.lookups.classes, val); // Class
                if (colIndex === 3) return this.getName(this.lookups.subjects, val); // Subject
            }
            if (type === 'Enrollments') {
                if (colIndex === 1) return this.getName(this.lookups.students, val); // Student
                if (colIndex === 2) return this.getName(this.lookups.classes, val); // Class
            }
            return val;
        };

        const safeData = data || [];
        const tableRows = safeData.map((row, rIndex) => `
            <tr class="hover:bg-gray-50 border-b last:border-0 transition">
                ${type === 'Enrollments' ? `<td class="p-3"><input type="checkbox" class="row-checkbox w-4 h-4 accent-emerald-600" value="${row[0]}" onchange="Admin.updateSelection()"></td>` : ''}
                ${row.map((cell, cIndex) => {
            if (cIndex === 0) return ''; // Hide ID Column
            if (type === 'Allocations' && cIndex === 4) return ''; // Hide Year
            if (type === 'Subjects' && cIndex === 2) return ''; // Hide English Name (Auto)

            return `
                        <td class="p-3 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs" title="${cell}">
                            ${resolveCell(cell, cIndex)}
                        </td>
                    `;
        }).join('')}
                <td class="p-3 flex gap-2 justify-end">
                    ${(type === 'Users' && row[2] === 'Supervisor') ?
                `<button onclick="Admin.openPermissions('${row[0]}', '${row[1]}')" class="text-purple-500 hover:bg-purple-50 p-2 rounded" title="الصلاحيات"><i class="fas fa-key"></i></button>`
                : ''}
                    <button onclick="Admin.openEdit('${type}', ${rIndex})" class="text-blue-500 hover:bg-blue-50 p-2 rounded"><i class="fas fa-edit"></i></button>
                    <button onclick="Admin.deleteItem('${type}', '${row[0]}')" class="text-red-500 hover:bg-red-50 p-2 rounded"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        const html = `
            <div class="mb-4 flex justify-between items-center">
                <h3 class="font-bold text-lg text-gray-700">إدارة ${type === 'Allocations' ? 'توزيع المعلمين' : (headerMap[type] ? displayHeader[1] : type)}</h3> <!-- Use 2nd col name as loose title if avail -->
                <button onclick="Admin.openEdit('${type}', -1)" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-emerald-700 transition">
                    <i class="fas fa-plus ml-2"></i>إضافة
                </button>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table class="w-full text-right min-w-[600px]">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                        <tr>
                            ${type === 'Enrollments' ? '<th class="p-3 w-10"><input type="checkbox" onchange="Admin.toggleSelectAll(this)" class="w-4 h-4 accent-emerald-600"></th>' : ''}
                            ${(displayHeader || []).map((h, i) => {
            if (i === 0) return '';
            if (type === 'Allocations' && i === 4) return '';
            if (type === 'Subjects' && i === 2) return '';
            return `<th class="p-3 whitespace-nowrap">${h}</th>`;
        }).join('')}
                            <th class="p-3 w-20">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${tableRows.length ? tableRows : '<tr><td colspan="100" class="p-8 text-center text-gray-400">لا توجد بيانات</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        const container = document.getElementById('tableContainer') || document.getElementById('dashboardContent');
        container.innerHTML = html;
    },

    getName(list, id) {
        const item = list.find(i => String(i.id) === String(id));
        return item ? (item.displayName || item.name) : id;
    },

    openEdit(type, rowIndex) {
        const isNew = rowIndex === -1;
        const header = this.cache[type].header;
        const row = isNew ? header.map(() => "") : this.cache[type].data[rowIndex];

        this.tempEdit = { type, id: row[0], isNew }; // Save context

        document.getElementById('adminEditTitle').innerText = isNew ? `إضافة` : `تعديل`;

        // INPUT BUILDER
        const formHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${header.map((h, i) => {
            const isReadOnly = (i === 0 && !isNew); // ID is readonly on edit
            let inputField = '';

            // 1. Users Role Dropdown (Column Index 2)
            if (type === 'Users' && i === 2) {
                inputField = `
                        <div class="relative">
                            <select id="edit_f_${i}" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-gray-700 font-bold">
                                <option value="Teacher" ${row[i] === 'Teacher' ? 'selected' : ''}>معلم</option>
                                <option value="Parent" ${row[i] === 'Parent' ? 'selected' : ''}>ولي أمر</option>
                                <option value="Admin" ${row[i] === 'Admin' ? 'selected' : ''}>إدارة</option>
                                <option value="Supervisor" ${row[i] === 'Supervisor' ? 'selected' : ''}>مشرف</option>
                            </select>
                            <div class="absolute left-3 top-3.5 text-gray-400 pointer-events-none"><i class="fas fa-chevron-down"></i></div>
                        </div>
                    `;
            }
            // 2. Allocations - Teacher (Col 1)
            else if (type === 'Allocations' && i === 1) {
                inputField = this.buildSelect(i, this.lookups.teachers, row[i]);
            }
            // 3. Allocations - Class (Col 2)
            else if (type === 'Allocations' && i === 2) {
                inputField = this.buildSelect(i, this.lookups.classes, row[i]);
            }
            // 4. Allocations - Subject (Col 3)
            else if (type === 'Allocations' && i === 3) {
                inputField = this.buildSelect(i, this.lookups.subjects, row[i]);
            }
            // 5. Enrollments - Student (Col 1)
            else if (type === 'Enrollments' && i === 1) {
                inputField = this.buildSelect(i, this.lookups.students, row[i]);
            }
            // 6. Enrollments - Class (Col 2)
            else if (type === 'Enrollments' && i === 2) {
                inputField = this.buildSelect(i, this.lookups.classes, row[i]);
            }
            // Default Text Input
            else {
                inputField = isReadOnly ?
                    `<div class="bg-gray-100 p-3 rounded-xl border border-gray-200 text-gray-500 font-mono text-sm select-all">${row[i]}</div><input type="hidden" id="edit_f_${i}" value="${row[i]}">` :
                    `<input type="text" id="edit_f_${i}" value="${row[i]}" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition font-bold text-gray-700 placeholder-gray-300" placeholder="${h}">`;
            }

            // Show Arabic Label if available
            const headerMap = {
                'Users': ['المعرف', 'الاسم', 'الدور', 'الهاتف', 'كلمة المرور', 'نشط'],
                'Classes': ['معرف الفصل', 'اسم الفصل', 'رقم الفصل'],
                'Subjects': ['المعرف', 'اسم المادة', 'الاسم الانجليزي'],
                'Allocations': ['معرف التوزيع', 'المعلم', 'الفصل', 'المادة', 'السنة'],
                'Enrollments': ['معرف القيد', 'الطالب', 'الفصل']
            };
            const label = (headerMap[type] && headerMap[type][i]) ? headerMap[type][i] : h;

            // HIDE AUTO/SYSTEM FIELDS
            // 0: ID (All)
            // 2: English Name (Subjects - Auto)
            // 4: Year (Allocations - Auto)
            if (i === 0 || (type === 'Subjects' && i === 2) || (type === 'Allocations' && i === 4)) {
                return isReadOnly ? `<div class="hidden">${inputField}</div>` : ''; // Just hidden input for ID
            }

            return `
                    <div class="col-span-1">
                        <label class="block text-gray-700 text-sm font-bold mb-2 ml-1">${label}</label>
                        ${inputField}
                    </div>
                 `;
        }).join('')}
            </div>
        `;

        document.getElementById('adminEditForm').innerHTML = formHtml;
        document.getElementById('modal-admin-edit').classList.remove('hidden');
    },

    buildSelect(idx, list, selectedVal) {
        return `
            <div class="relative">
                <select id="edit_f_${idx}" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-gray-700 font-bold" required>
                    <option value="">-- اختر --</option>
                    ${list.map(item => `<option value="${item.id}" ${String(item.id) === String(selectedVal) ? 'selected' : ''}>${item.displayName || item.name}</option>`).join('')}
                </select>
                <div class="absolute left-3 top-3.5 text-gray-400 pointer-events-none"><i class="fas fa-chevron-down"></i></div>
            </div>
        `;
    },

    closeEdit() {
        document.getElementById('modal-admin-edit').classList.add('hidden');
    },

    async saveData() {
        const { type, id, isNew } = this.tempEdit;
        const header = this.cache[type].header;
        const newData = header.map((_, i) => document.getElementById(`edit_f_${i}`).value);

        UI.loader(true);
        try {
            let res;
            if (isNew) {
                res = await App.call('adminSaveData', { type, data: newData });
            } else {
                res = await App.call('adminUpdateData', { type, id, data: newData });
                // Refresh Lookups if we modified lookup tables
                if (['Users', 'Classes', 'Subjects'].includes(type)) {
                    const l = await App.call('getAdminLookups');
                    if (l.success) this.lookups = l;
                }
            }

            if (res.success) {
                UI.showError("تم الحفظ بنجاح");
                this.closeEdit();
                this._clearAdminCache('tab_' + type); // Invalidate this tab's cache
                this.switchTab(type); // Reload UI
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    async deleteItem(type, id) {
        if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع.')) return;

        UI.loader(true);
        try {
            const res = await App.call('adminDeleteData', { type, id });
            if (res.success) {
                UI.showError("تم الحذف");
                // Refresh Lookups
                if (['Users', 'Classes', 'Subjects'].includes(type)) {
                    const l = await App.call('getAdminLookups');
                    if (l.success) this.lookups = l;
                }
                this._clearAdminCache('tab_' + type); // Invalidate this tab's cache
                this.switchTab(type);
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    async renderMonitoring() {
        const content = document.getElementById('dashboardContent');

        const html = `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end animate-fadeIn">
                <div class="flex-grow w-full">
                    <label class="block text-gray-500 text-sm font-bold mb-2">اختر الفصل</label>
                    <select id="monitorClass" class="w-full p-2 border rounded-lg outline-none focus:border-emerald-500 bg-gray-50 font-bold text-gray-700">
                        <option value="">-- اختر الفصل --</option>
                        <option value="ALL" class="font-bold text-center text-emerald-600 bg-emerald-50 py-2">📌 كل الفصول (متابعة شاملة)</option>
                        ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                    </select>
                </div>
                <div class="w-full md:w-48">
                    <label class="block text-gray-500 text-sm font-bold mb-2">التاريخ</label>
                    <input type="date" id="monitorDate" class="w-full p-2 border rounded-lg outline-none focus:border-emerald-500 bg-gray-50 font-bold text-gray-700">
                </div>
                <button onclick="Admin.fetchMonitoringSeries()" class="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-emerald-700 w-full md:w-auto transition active:scale-95">
                    <i class="fas fa-search ml-2"></i>عرض
                </button>
            </div>
            <div id="monitoringResults" class="space-y-6 min-h-[300px]">
                <div class="text-center text-gray-400 mt-10">
                    <i class="fas fa-search text-4xl mb-2 opacity-20"></i>
                    <p>اختر الفصل والتاريخ للمتابعة</p>
                </div>
            </div>
        `;
        content.innerHTML = html;
        document.getElementById('monitorDate').value = new Date().toISOString().split('T')[0];
    },

    async fetchMonitoringSeries() {
        const classId = document.getElementById('monitorClass').value;
        const date = document.getElementById('monitorDate').value;
        if (!classId) return UI.showError("اختر الفصل أولاً");

        const resDiv = document.getElementById('monitoringResults');
        resDiv.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-emerald-600 mt-10"></div>';

        try {
            const res = await App.call('getAdminActivity', { classId, date });
            if (!res.success) throw new Error(res.message);

            // GLOBAL VIEW (ALL CLASSES)
            if (classId === 'ALL') {
                const notesHtml = `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-in">
                        <div class="bg-gray-50 p-3 border-b flex justify-between items-center">
                            <h3 class="font-bold text-gray-700"><i class="fas fa-globe text-blue-500 ml-2"></i>المتابعة الشاملة (كل الفصول)</h3>
                            <span class="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">${res.notes.length} سجل</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right text-sm">
                                <thead class="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                    <tr>
                                        <th class="p-3">الطالب</th>
                                        <th class="p-3">الحالة</th>
                                        <th class="p-3">الفصل</th>
                                        <th class="p-3">المعلم</th>
                                        <th class="p-3 w-1/3">الملاحظة</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    ${res.notes.length ? res.notes.map(n => `
                                        <tr class="hover:bg-gray-50 transition">
                                            <td class="p-3 font-bold text-gray-800">${UI.formatName(n.studentName)}</td>
                                            <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold ${n.status === 'Absent' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-800'}">${n.status === 'Absent' ? 'غائب' : 'ملاحظة'}</span></td>
                                            <td class="p-3 text-gray-600">${n.className}</td>
                                            <td class="p-3 text-gray-600">${UI.formatName(n.teacherName)}</td>
                                            <td class="p-3 text-gray-600 italic break-all">${n.note || '-'}</td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="5" class="p-8 text-center text-gray-400">لا توجد سجلات لهذا اليوم</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                resDiv.innerHTML = notesHtml;
                return;
            }

            // SINGLE CLASS VIEW
            // 1. Teachers Section
            let teachersHtml = `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-in">
                    <h3 class="bg-gray-50 p-3 font-bold text-gray-700 border-b flex justify-between items-center">
                        <span><i class="fas fa-chalkboard-teacher text-emerald-600 ml-2"></i>نشاط المعلمين</span>
                        <span class="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">${res.logs.length} حصص</span>
                    </h3>
                    <div class="divide-y divide-gray-100">
                        ${res.logs.length ? res.logs.map(l => `
                            <div class="p-4 hover:bg-gray-50 transition">
                                <div class="flex justify-between mb-3">
                                    <span class="font-bold text-emerald-700 text-lg">${UI.formatName(l.teacher)}</span>
                                    <span class="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded font-bold self-start">${this.getName(this.lookups.subjects, l.subject)}</span>
                                </div>
                                <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                                    <p class="text-gray-500 text-xs font-bold mb-1">المحتوى:</p>
                                    <p class="text-gray-800 text-sm leading-relaxed">${l.content || '-'}</p>
                                </div>
                                <div class="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                    <p class="text-orange-800 text-xs font-bold mb-1">الواجب:</p>
                                    <p class="text-gray-800 text-sm leading-relaxed">${l.homework || '-'}</p>
                                </div>
                            </div>
                        `).join('') : '<div class="p-10 text-center text-gray-400">لا يوجد نشاط مسجل للمعلمين في هذا اليوم</div>'}
                    </div>
                </div>
            `;

            // 2. Students Section
            let studentsHtml = `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-in">
                    <div class="bg-gray-50 p-3 border-b flex justify-between items-center flex-wrap gap-2">
                        <h3 class="font-bold text-gray-700"><i class="fas fa-user-graduate text-red-500 ml-2"></i>المتابعة (غياب / ملاحظات)</h3>
                        <div class="relative">
                            <select onchange="Admin.filterMonitoring(this.value)" class="text-xs p-2 pl-8 border rounded-lg bg-white outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                                <option value="all">عرض الكل</option>
                                <option value="Absent">غياب فقط</option>
                                <option value="Note">ملاحظات فقط</option>
                            </select>
                            <div class="absolute left-2 top-2 text-gray-400 pointer-events-none text-xs"><i class="fas fa-filter"></i></div>
                        </div>
                    </div>
                    <div id="monStudentsList" class="divide-y divide-gray-100 max-h-96 overflow-y-auto custom-scrollbar">
                        ${res.notes.length ? res.notes.map(n => `
                            <div class="p-3 flex items-start gap-3 hover:bg-gray-50 transition" data-status="${n.status}" data-hasnote="${!!n.note}">
                                <div class="w-1.5 h-full min-h-[40px] ${n.status === 'Absent' ? 'bg-red-500 shadow-sm shadow-red-200' : 'bg-yellow-400 shadow-sm shadow-yellow-200'} rounded-full"></div>
                                <div class="flex-grow">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="font-bold text-gray-800">${UI.formatName(n.studentName)}</span>
                                        <span class="text-xxs font-bold px-2 py-0.5 rounded-full ${n.status === 'Absent' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-800'}">
                                            ${n.status === 'Absent' ? 'غائب' : 'سلوك'}
                                        </span>
                                    </div>
                                    ${n.note ? `<p class="text-sm text-gray-600 bg-yellow-50 p-2 rounded-lg border border-yellow-100 mt-1"><i class="fas fa-comment-dots ml-1 text-yellow-500"></i>${n.note}</p>` : ''}
                                </div>
                            </div>
                        `).join('') : '<div class="p-10 text-center text-gray-400"><i class="far fa-smile text-2xl mb-2 block"></i>لا توجد ملاحظات أو غياب</div>'}
                    </div>
                </div>
            `;

            resDiv.innerHTML = teachersHtml + studentsHtml;

        } catch (e) {
            resDiv.innerHTML = `<div class="text-red-500 text-center p-4 bg-red-50 rounded-xl border border-red-100">${e.message}</div>`;
        }
    },

    filterMonitoring(filter) {
        const list = document.getElementById('monStudentsList');
        if (!list) return;
        Array.from(list.children).forEach(el => {
            const status = el.dataset.status;
            const hasNote = el.dataset.hasnote === 'true';

            if (filter === 'all') el.style.display = 'flex';
            else if (filter === 'Absent') el.style.display = (status === 'Absent') ? 'flex' : 'none';
            else if (filter === 'Note') el.style.display = (hasNote) ? 'flex' : 'none';
        });
    },

    async renderClassControl() {
        const html = `
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-2xl mx-auto animate-fadeIn">
                <div class="text-center mb-6">
                    <div class="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                        <i class="fas fa-chalkboard-teacher text-3xl"></i>
                    </div>
                    <h3 class="font-bold text-xl text-gray-800">متابعة الفصول (تسجيل الحصص)</h3>
                    <p class="text-gray-500 text-sm">حدد الفصل والمادة لفتح سجل المتابعة اليومي</p>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 font-bold mb-2">الفصل</label>
                        <select id="ctrlClass" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-bold">
                            <option value="">-- اختر الفصل --</option>
                            ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName || c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 font-bold mb-2">المادة</label>
                        <select id="ctrlSubject" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-bold">
                            <option value="">-- اختر المادة --</option>
                            ${this.lookups.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="Admin.openClassLog()" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-emerald-700 transition transform active:scale-[0.98]">
                        <i class="fas fa-arrow-left ml-2"></i>فتح السجل
                    </button>
                </div>
            </div>
            <div id="adminLogArea" class="mt-8"></div>
        `;
        document.getElementById('dashboardContent').innerHTML = html;
    },

    openClassLog() {
        const classId = document.getElementById('ctrlClass').value;
        const subjectId = document.getElementById('ctrlSubject').value;

        if (!classId || !subjectId) return UI.showError("يرجى اختيار الفصل والمادة");

        const className = this.getName(this.lookups.classes, classId);
        const subjectName = this.getName(this.lookups.subjects, subjectId);

        // Prepare Data object for Teacher module
        const classObj = {
            classId: classId,
            className: className,
            subjectId: subjectId,
            subjectName: subjectName
        };

        // Render Teacher Log Form into adminLogArea
        Teacher.loadLogForm(classObj, 'adminLogArea');
    },

    // --- BULK ACTIONS ---
    toggleSelectAll(source) {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(c => c.checked = source.checked);
        this.updateSelection();
    },

    updateSelection() {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        const count = checkboxes.length;
        const bar = document.getElementById('bulkActionBar');

        if (count > 0) {
            bar.classList.remove('hidden');
            document.getElementById('selectedCount').innerText = count;
        } else {
            bar.classList.add('hidden');
            // Uncheck header if exists
            const headerChk = document.querySelector('thead input[type="checkbox"]');
            if (headerChk) headerChk.checked = false;
        }
    },

    clearSelection() {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(c => c.checked = false);
        const headerChk = document.querySelector('thead input[type="checkbox"]');
        if (headerChk) headerChk.checked = false;
        this.updateSelection();
    },

    openBulkMove() {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        const ids = Array.from(checkboxes).map(c => c.value);
        if (ids.length === 0) return;

        // Create Modal Dynamically
        const modalParams = {
            title: `نقل ${ids.length} طالب`,
            content: `
                <div class="mb-4">
                    <label class="block text-gray-500 text-sm font-bold mb-2">اختر الفصل الجديد</label>
                    <select id="bulkNewClass" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 font-bold">
                        <option value="">-- اختر الفصل --</option>
                        ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName || c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-yellow-800 text-sm mb-4">
                    <i class="fas fa-exclamation-triangle ml-1"></i> سيتم نقل الطلاب المحددين فوراً.
                </div>
            `,
            onConfirm: () => Admin.confirmBulkMove(ids)
        };

        this.showDynamicModal(modalParams);
    },

    async confirmBulkMove(ids) {
        const newClassId = document.getElementById('bulkNewClass').value;
        if (!newClassId) return UI.showError("اختر الفصل الجديد");

        UI.loader(true);
        try {
            const res = await App.call('adminBulkUpdateEnrollments', { enrollmentIds: ids, newClassId });
            if (res.success) {
                UI.showError(res.message);
                this.closeDynamicModal();
                this.switchTab('Enrollments'); // Refresh
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    // Helper for dynamic modals (since we don't have a generic one yet, we'll quickly create one or reuse adminEdit)
    // Let's create a temporary one or append to body
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

    // --- REVIEWS MODULE ---
    async renderReviews() {
        const content = document.getElementById('dashboardContent');
        content.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-emerald-600 mt-10"></div>';

        try {
            const res = await App.call('getPendingLogs');
            if (!res.success) throw new Error(res.message);

            if (res.logs.length === 0) {
                content.innerHTML = `
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

            const html = `
                <div class="space-y-4 animate-fadeIn">
                    <h3 class="font-bold text-gray-700 text-lg mb-4 flex items-center">
                        <i class="fas fa-clipboard-check text-emerald-600 ml-2"></i>سجلات بانتظار المراجعة
                        <span class="mr-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full border border-emerald-200">${res.logs.length}</span>
                    </h3>
                    <div class="grid gap-4">
                        ${res.logs.map(log => `
                            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 class="font-bold text-gray-800 text-lg">${log.className} - ${log.subjectName}</h4>
                                        <p class="text-sm text-gray-500 font-bold"><i class="fas fa-user ml-1"></i> ${log.teacherName}</p>
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
                                    ${log.notes ? `
                                    <div class="border-t border-gray-200 pt-2">
                                        <span class="text-xs font-bold text-gray-600 block mb-1">ملاحظات:</span>
                                        <p class="text-sm text-gray-800">${log.notes}</p>
                                    </div>` : ''}
                                    
                                    <!-- Attendance Summary -->
                                    <div class="border-t border-gray-200 pt-2 flex gap-2">
                                        <span class="bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-bold">
                                            غياب: ${log.attendance.filter(a => a.status === 'Absent').length}
                                        </span>
                                        <span class="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded font-bold">
                                            ملاحظات طلاب: ${log.attendance.filter(a => a.note).length}
                                        </span>
                                    </div>
                                </div>
                                <div class="flex gap-3 mt-4">
                                    <button onclick="Admin.submitReview('${log.id}', 'Approved')" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm">
                                        <i class="fas fa-check ml-2"></i>موافقة
                                    </button>
                                    <button onclick="Admin.openReviewModal('${log.id}')" class="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-bold hover:bg-blue-100 transition border border-blue-200">
                                        <i class="fas fa-edit ml-2"></i>تعديل
                                    </button>
                                    <button onclick="Admin.submitReview('${log.id}', 'Rejected')" class="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold hover:bg-red-100 transition border border-red-200">
                                        <i class="fas fa-times ml-2"></i>رفض
                                    </button>
                                </div>
                                <!-- Hidden Data for Edit -->
                                <textarea id="raw_data_${log.id}" class="hidden">${JSON.stringify(log)}</textarea>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            content.innerHTML = html;

        } catch (e) {
            content.innerHTML = `<div class="text-red-500 text-center p-10">${e.message}</div>`;
        }
    },

    async openReviewModal(logId) {
        UI.loader(true);
        try {
            const logData = JSON.parse(document.getElementById(`raw_data_${logId}`).value);

            // 1. Fetch ALL Students for this Class
            const res = await App.call('getClassStudents', { classId: logData.classId });
            if (!res.success) throw new Error("فشل تحميل قائمة الطلاب");

            // 2. Map Existing Statuses
            const statusMap = {};
            const noteMap = {};
            logData.attendance.forEach(a => {
                statusMap[a.studentId] = a.status;
                noteMap[a.studentId] = a.note;
            });

            // 3. Build Combined List
            // We use the fetched Class List as the base
            const attRows = res.students.map(s => {
                const status = statusMap[s.id] || 'Present'; // Default to Present
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

                    // Collect Attendance Updates (ONLY send what changed or send ALL?)
                    // Backend now supports Upsert for ALL provided. 
                    // Best to send ALL to ensure state is consistent with what Supervisor sees.
                    const updates = [];
                    document.querySelectorAll('.student-review-row').forEach(row => {
                        updates.push({
                            studentId: row.dataset.id,
                            status: row.querySelector('.rev-status').value,
                            note: row.querySelector('.rev-note').value
                        });
                    });

                    Admin.submitReview(logId, 'Approved', newContent, newHW, newNotes, updates, supNote);
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
                UI.showError(status === 'Approved' ? "تمت الموافقة بنجاح" : "تم الرفض", "green");
                this.closeDynamicModal();
                this.renderReviews(); // Refresh list
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    closeDynamicModal() {
        const m = document.getElementById('modal-dynamic');
        if (m) m.remove();
    },

    // ==========================================
    // STUDENT & PARENT MANAGEMENT
    // ==========================================

    /**
     * Render Students Management Tab
     * Shows comprehensive list of all students with parent and class info
     */
    async renderStudentsManagement() {
        const content = document.getElementById('dashboardContent');
        content.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-emerald-600 mt-10"></div>';

        try {
            const res = await App.call('getStudentsManagement');
            if (!res.success) throw new Error(res.message);

            const students = res.students || [];

            // Filter UI
            const filterHtml = `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-4 items-center">
                    <span class="font-bold text-gray-700 text-sm"><i class="fas fa-filter text-emerald-500 ml-2"></i>تصفية حسب:</span>
                    <select id="filterStudentClass" onchange="Admin.applyStudentFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                        <option value="">كل الفصول</option>
                        ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                    </select>
                    <select id="filterParentStatus" onchange="Admin.applyStudentFilters()" class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500">
                        <option value="">الكل</option>
                        <option value="hasParent">لديه ولي أمر</option>
                        <option value="noParent">بدون ولي أمر</option>
                    </select>
                    <input type="text" id="searchStudent" onkeyup="Admin.applyStudentFilters()" placeholder="بحث بالاسم..." class="p-2 border rounded-lg text-sm outline-none focus:border-emerald-500 flex-grow">
                </div>
            `;

            content.innerHTML = filterHtml + '<div id="studentsTableContainer"></div>';

            // Store data for filtering
            this.allStudentsData = students;
            this.applyStudentFilters();

        } catch (e) {
            content.innerHTML = `<div class="bg-red-100 text-red-600 p-4 rounded-xl text-center">${e.message}</div>`;
        }
    },

    applyStudentFilters() {
        let filtered = this.allStudentsData || [];

        const classFilter = document.getElementById('filterStudentClass')?.value || '';
        const parentFilter = document.getElementById('filterParentStatus')?.value || '';
        const searchTerm = document.getElementById('searchStudent')?.value.toLowerCase() || '';

        if (classFilter) filtered = filtered.filter(s => String(s.classId) === String(classFilter));
        if (parentFilter === 'hasParent') filtered = filtered.filter(s => s.parentPhone && s.parentPhone !== '');
        if (parentFilter === 'noParent') filtered = filtered.filter(s => !s.parentPhone || s.parentPhone === '');
        if (searchTerm) filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm));

        this.renderStudentsTable(filtered);
    },

    renderStudentsTable(students) {
        const html = `
            <div class="mb-4 flex justify-between items-center">
                <h3 class="font-bold text-lg text-gray-700">إدارة الطلاب (${students.length} طالب)</h3>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table class="w-full text-right min-w-[600px]">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                        <tr>
                            <th class="p-3">اسم الطالب</th>
                            <th class="p-3">الفصل</th>
                            <th class="p-3">ولي الأمر</th>
                            <th class="p-3 w-32">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${students.length ? students.map(s => `
                            <tr class="hover:bg-gray-50 transition">
                                <td class="p-3 font-bold text-gray-800">${UI.formatName(s.name)}</td>
                                <td class="p-3 text-sm text-gray-600">${s.className}</td>
                                <td class="p-3 text-sm ${s.parentPhone ? 'text-emerald-600' : 'text-gray-400'}">
                                    ${s.parentPhone || 'لا يوجد'}
                                </td>
                                <td class="p-3 flex gap-2">
                                    <button onclick="Admin.openStudentEditModal('${s.id}', '${s.name}', '${s.parentPhone || ''}')" 
                                        class="text-blue-500 hover:bg-blue-50 p-2 rounded" title="تعديل">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="Admin.openParentLinkModal('${s.id}', '${s.name}', '${s.parentPhone || ''}')" 
                                        class="text-emerald-500 hover:bg-emerald-50 p-2 rounded" title="إدارة ولي الأمر">
                                        <i class="fas fa-user-tie"></i>
                                    </button>
                                    <button onclick="Admin.deleteStudentConfirm('${s.id}', '${s.name}')" 
                                        class="text-red-500 hover:bg-red-50 p-2 rounded" title="حذف">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" class="p-8 text-center text-gray-400">لا توجد بيانات</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('studentsTableContainer').innerHTML = html;
    },

    /**
     * Open student edit modal
     */
    openStudentEditModal(studentId, studentName, parentPhone) {
        const modalParams = {
            title: `تعديل اسم الطالب`,
            content: `
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 font-bold mb-2">اسم الطالب</label>
                        <input type="text" id="editStudentName" value="${studentName}" 
                            class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold">
                    </div>
                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                        <i class="fas fa-info-circle ml-1"></i>
                        لتغيير ولي الأمر المرتبط، استخدم زر <strong>ربط ولي الأمر</strong> <i class="fas fa-user-tie"></i> بجانب الطالب.
                    </div>
                </div>
            `,
            onConfirm: () => Admin.saveStudentEdit(studentId)
        };
        this.showDynamicModal(modalParams);
    },

    async saveStudentEdit(studentId) {
        const name = document.getElementById('editStudentName').value.trim();

        if (!name) return UI.showError("الرجاء إدخال اسم الطالب");

        UI.loader(true);
        try {
            const res = await App.call('updateStudent', { studentId, name });
            if (res.success) {
                UI.showError(res.message);
                this.closeDynamicModal();
                this.renderStudentsManagement();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    /**
     * Delete student with confirmation
     */
    async deleteStudentConfirm(studentId, studentName) {
        if (!confirm(`هل أنت متأكد من حذف الطالب "${studentName}"؟\n\nسيتم حذف جميع بيانات التسجيل والحضور المرتبطة بهذا الطالب.\n\nلا يمكن التراجع عن هذا الإجراء.`)) return;

        UI.loader(true);
        try {
            const res = await App.call('deleteStudent', { studentId });
            if (res.success) {
                UI.showError(res.message);
                this.renderStudentsManagement();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    /**
     * Build filtered parent list HTML for the search modal
     */
    _buildParentSearchResults(parents, query) {
        const q = (query || '').trim().toLowerCase();
        const filtered = q ? parents.filter(p => p.name.toLowerCase().includes(q) || p.phone.includes(q)) : parents;
        if (!filtered.length) return `<div class="text-center text-gray-400 text-xs py-3">لا توجد نتائج</div>`;
        return filtered.map(p => `
            <div onclick="Admin._selectParent('${p.phone}', '${p.name}')"
                class="flex items-center gap-3 p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 transition rounded-lg group">
                <div class="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flexshrink-0">${p.name[0]}</div>
                <div>
                    <p class="font-bold text-gray-800 text-sm">${UI.formatName(p.name)}</p>
                    <p class="text-xs text-gray-500 font-mono">${p.phone}</p>
                </div>
                <i class="fas fa-check-circle text-emerald-500 mr-auto hidden group-hover:block"></i>
            </div>
        `).join('');
    },

    _selectParent(phone, name) {
        document.getElementById('selectedParentPhone').value = phone;
        document.getElementById('selectedParentDisplay').textContent = `${UI.formatName(name)} — ${phone}`;
        document.getElementById('selectedParentDisplay').parentElement.classList.remove('hidden');
        document.getElementById('parentSearchInput').value = '';
        document.getElementById('parentSearchResults').innerHTML = '';
    },

    /**
     * Open parent link management modal
     */
    async openParentLinkModal(studentId, studentName, currentParentPhone) {
        UI.loader(true);
        const parentsRes = await App.call('getParentsManagement');
        const parents = parentsRes.success ? parentsRes.parents : [];
        UI.loader(false);

        const hasParent = currentParentPhone && currentParentPhone !== '';

        const modalParams = {
            title: `إدارة ولي أمر: ${studentName}`,
            content: `
                <div class="space-y-4">
                    ${hasParent ? `
                        <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex justify-between items-center">
                            <div>
                                <p class="text-xs text-emerald-700 font-bold mb-0.5">ولي الأمر الحالي</p>
                                <p class="text-emerald-900 font-bold font-mono">${currentParentPhone}</p>
                            </div>
                            <button onclick="Admin.unlinkParentAction('${studentId}')" 
                                class="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg font-bold text-sm transition">
                                <i class="fas fa-unlink ml-1"></i>إلغاء الربط
                            </button>
                        </div>
                        <p class="text-sm text-gray-500 font-bold">تغيير إلى ولي أمر آخر:</p>
                    ` : `
                        <p class="text-sm text-gray-600">ابحث عن ولي الأمر بالاسم لربطه بهذا الطالب:</p>
                    `}

                    <!-- Name Search Input -->
                    <div>
                        <div class="relative">
                            <i class="fas fa-search absolute right-3 top-3.5 text-gray-400 text-sm"></i>
                            <input type="text" id="parentSearchInput"
                                placeholder="ابحث باسم ولي الأمر..."
                                class="w-full pr-10 pl-4 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                                oninput="document.getElementById('parentSearchResults').innerHTML = Admin._buildParentSearchResults(Admin._cachedParents, this.value)">
                        </div>
                        <div id="parentSearchResults" class="mt-1 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-50">
                            ${this._buildParentSearchResults(parents, '')}
                        </div>
                    </div>

                    <!-- Selected Parent Display -->
                    <div id="selectedParentDisplay-wrapper" class="hidden">
                        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                            <i class="fas fa-user-check text-emerald-600"></i>
                            <span class="font-bold text-emerald-800 text-sm" id="selectedParentDisplay"></span>
                        </div>
                    </div>

                    <input type="hidden" id="selectedParentPhone">

                    <div class="border-t pt-3">
                        <p class="text-xs text-gray-500 font-bold mb-1">أو أدخل رقم ولي أمر جديد مباشرة:</p>
                        <input type="tel" id="newParentPhone" placeholder="رقم الهاتف (اختياري)"
                            class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm">
                    </div>
                </div>
            `,
            onConfirm: () => Admin.linkParentAction(studentId)
        };
        // Store parents for live search
        this._cachedParents = parents;
        this.showDynamicModal(modalParams);
    },

    async linkParentAction(studentId) {
        const selectedPhone = document.getElementById('selectedParentPhone')?.value || '';
        const newPhone = document.getElementById('newParentPhone').value.trim();
        const parentPhone = newPhone || selectedPhone;

        if (!parentPhone) return UI.showError("الرجاء اختيار ولي الأمر من القائمة أو إدخال رقم هاتف");

        UI.loader(true);
        try {
            const res = await App.call('linkParentToStudent', { studentId, parentPhone });
            if (res.success) {
                UI.showError(res.message);
                this.closeDynamicModal();
                this.renderStudentsManagement();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    async unlinkParentAction(studentId) {
        if (!confirm('هل أنت متأكد من إلغاء ربط ولي الأمر؟')) return;

        UI.loader(true);
        try {
            const res = await App.call('unlinkParentFromStudent', { studentId });
            if (res.success) {
                UI.showError(res.message);
                this.closeDynamicModal();
                this.renderStudentsManagement();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    /**
     * Render Parents Management Tab
     * Shows all parents with their linked students
     */
    async renderParentsManagement() {
        const content = document.getElementById('dashboardContent');
        content.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-emerald-600 mt-10"></div>';

        try {
            const res = await App.call('getParentsManagement');
            if (!res.success) throw new Error(res.message);

            const parents = res.parents || [];

            const html = `
                <div class="mb-4 flex justify-between items-center">
                    <h3 class="font-bold text-lg text-gray-700">إدارة أولياء الأمور (${parents.length} ولي أمر)</h3>
                </div>
                <div class="space-y-3">
                    ${parents.length ? parents.map(p => `
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    <h4 class="font-bold text-gray-800 text-lg">${UI.formatName(p.name)}</h4>
                                    <p class="text-emerald-600 text-sm font-bold">${p.phone}</p>
                                </div>
                                <span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                                    ${p.students.length} طالب
                                </span>
                            </div>
                            <div class="border-t pt-3 mb-3">
                                <p class="text-gray-500 text-xs font-bold mb-2">الطلاب المرتبطين:</p>
                                <div class="flex flex-wrap gap-2">
                                    ${p.students.map(s => `
                                        <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-bold border border-gray-200">
                                            ${UI.formatName(s.name)}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="flex justify-end border-t pt-2">
                                <button onclick="Admin.openParentEditModal('${p.phone}', '${p.name}')" 
                                    class="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-bold flex items-center transition">
                                    <i class="fas fa-edit ml-1"></i>تعديل
                                </button>
                            </div>
                        </div>
                    `).join('') : '<div class="text-center p-10 text-gray-400">لا توجد بيانات لأولياء الأمور</div>'}
                </div>
            `;

            content.innerHTML = html;

        } catch (e) {
            content.innerHTML = `<div class="bg-red-100 text-red-600 p-4 rounded-xl text-center">${e.message}</div>`;
        }
    },

    /**
     * Open Parent Edit Modal
     */
    openParentEditModal(phone, name) {
        const modalParams = {
            title: `تعديل ولي الأمر: ${name}`,
            content: `
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 font-bold mb-2">الاسم</label>
                        <input type="text" id="editParentName" value="${name}" 
                            class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold">
                    </div>
                    <div>
                        <label class="block text-gray-700 font-bold mb-2">رقم الهاتف (اسم المستخدم)</label>
                        <input type="tel" id="editParentPhone" value="${phone}" 
                            class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold">
                        <p class="text-xs text-red-500 mt-1">تنبيه: تغيير رقم الهاتف سيحدثه لجميع الطلاب المرتبطين.</p>
                    </div>
                    <div>
                        <label class="block text-gray-700 font-bold mb-2">كلمة المرور الجديدة</label>
                        <input type="text" id="editParentPassword" placeholder="اتركه فارغاً للاحتفاظ بالحالية" 
                            class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold">
                    </div>
                </div>
            `,
            onConfirm: () => Admin.saveParentEdit(phone) // Pass current phone as ID
        };
        this.showDynamicModal(modalParams);
    },

    async saveParentEdit(currentPhone) {
        const newName = document.getElementById('editParentName').value.trim();
        const newPhone = document.getElementById('editParentPhone').value.trim();
        const newPassword = document.getElementById('editParentPassword').value.trim();

        if (!newName || !newPhone) return UI.showError("الاسم ورقم الهاتف مطلوبان");

        UI.loader(true);
        try {
            const res = await App.call('updateParent', { currentPhone, newName, newPhone, newPassword });
            if (res.success) {
                alert(res.message);
                this.closeDynamicModal();
                this.renderParentsManagement();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    // --- Warnings Module ---

    renderWarnings() {
        const content = document.getElementById('dashboardContent');
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
                                <select id="warnClassSelect" onchange="Admin.loadWarnStudents(this.value)" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700">
                                    <option value="">اختر الفصل...</option>
                                    ${this.lookups.classes.map(c => `<option value="${c.id}">${c.displayName}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">الطالب</label>
                                <select id="warnStudentSelect" onchange="Admin.loadStudentWarnings(this.value)" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700" disabled>
                                    <option value="">اختر الفصل أولاً...</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Add Warning Form -->
                    <div id="addWarningForm" class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hidden border-t-4 border-t-red-500">
                        <h3 class="font-bold text-red-600 mb-4 flex items-center"><i class="fas fa-exclamation-circle ml-2"></i>إصدار إنذار جديد</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">نوع الإنذار</label>
                                <select id="warnType" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-gray-700">
                                    <option value="Behavior">سلوك (Behavior)</option>
                                    <option value="Attendance">غياب (Attendance)</option>
                                    <option value="Academic">أكاديمي (Academic)</option>
                                    <option value="Dismissal">فصل (Dismissal)</option>
                                    <option value="Other">أخرى (Other)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">التفاصيل / ملاحظات</label>
                                <textarea id="warnDetails" rows="4" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 placeholder-gray-400 font-medium" placeholder="اكتب تفاصيل المخالفة هنا..."></textarea>
                            </div>
                            <button onclick="Admin.submitWarning()" class="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition shadow-md flex justify-center items-center gap-2">
                                <i class="fas fa-paper-plane"></i> إصدار الإنذار
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main: Warnings List -->
                <div class="md:col-span-2">
                    <div id="warningsList" class="space-y-4">
                        <div class="text-center text-gray-400 py-20 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                            <i class="fas fa-user-slash text-4xl mb-4 opacity-50"></i>
                            <p class="font-bold">يرجى اختيار طالب لعرض سجل الإنذارات</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        content.innerHTML = html;
    },

    async loadWarnStudents(classId) {
        const studentSelect = document.getElementById('warnStudentSelect');
        const form = document.getElementById('addWarningForm');

        // Reset
        studentSelect.innerHTML = '<option value="">جاري التحميل...</option>';
        studentSelect.disabled = true;
        form.classList.add('hidden');
        document.getElementById('warningsList').innerHTML = '<div class="text-center text-gray-400 py-20">...</div>';

        if (!classId) {
            studentSelect.innerHTML = '<option value="">اختر الفصل أولاً...</option>';
            return;
        }

        try {
            const res = await App.call('getClassStudents', { classId });
            if (res.success) {
                studentSelect.innerHTML = '<option value="">اختر الطالب...</option>' +
                    res.students.map(s => `<option value="${s.id}">${UI.formatName(s.name)}</option>`).join('');
                studentSelect.disabled = false;
            } else {
                studentSelect.innerHTML = '<option value="">فشل التحميل</option>';
            }
        } catch (e) { console.error(e); }
    },

    async loadStudentWarnings(studentId) {
        const listContainer = document.getElementById('warningsList');
        const form = document.getElementById('addWarningForm');

        if (!studentId) {
            form.classList.add('hidden');
            listContainer.innerHTML = '';
            return;
        }

        form.classList.remove('hidden');
        listContainer.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-red-600"></div>';

        try {
            const res = await App.call('getStudentWarnings', { studentId });
            if (res.success) {
                this.renderWarningsList(res.warnings);
            } else {
                listContainer.innerHTML = `<div class="text-red-500">${res.message}</div>`;
            }
        } catch (e) {
            listContainer.innerHTML = `<div class="text-red-500">${e.message}</div>`;
        }
    },

    renderWarningsList(warnings) {
        const container = document.getElementById('warningsList');
        if (!warnings || warnings.length === 0) {
            container.innerHTML = `
                <div class="text-center text-emerald-500 py-10 bg-emerald-50 rounded-xl border border-emerald-100">
                    <i class="fas fa-check-circle text-4xl mb-3"></i>
                    <p class="font-bold">سجل الطالب نظيف! لا توجد إنذارات.</p>
                </div>
            `;
            return;
        }

        const typeColors = {
            'Behavior': 'bg-orange-100 text-orange-700 border-orange-200',
            'Attendance': 'bg-blue-100 text-blue-700 border-blue-200',
            'Dismissal': 'bg-red-100 text-red-700 border-red-200',
            'Academic': 'bg-purple-100 text-purple-700 border-purple-200',
            'Other': 'bg-gray-100 text-gray-700 border-gray-200'
        };

        const typeLabels = {
            'Behavior': 'سلوك',
            'Attendance': 'غياب',
            'Dismissal': 'فصل',
            'Academic': 'أكاديمي',
            'Other': 'أخرى'
        };

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
                                <span class="${typeColors[w.type] || typeColors['Other']} px-2 py-1 rounded text-xs font-bold border">
                                    ${typeLabels[w.type] || w.type}
                                </span>
                                <span class="text-gray-400 text-xs font-bold"><i class="far fa-calendar-alt ml-1"></i>${w.date}</span>
                            </div>
                            <button onclick="Admin.deleteWarning('${w.id}')" class="text-red-400 hover:text-red-600 p-1 md:hidden">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <p class="text-gray-800 font-bold text-sm mt-2 leading-relaxed">${w.details}</p>
                        <div class="mt-2 text-xs text-gray-400">حرره: ${w.createdBy}</div>
                    </div>
                    
                    <div class="hidden md:block">
                         <button onclick="Admin.deleteWarning('${w.id}')" class="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition" title="حذف الإنذار">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        `;
    },

    async submitWarning() {
        const studentId = document.getElementById('warnStudentSelect').value;
        const type = document.getElementById('warnType').value;
        const details = document.getElementById('warnDetails').value.trim();

        if (!studentId) return alert('يرجى اختيار طالب');
        if (!details) return alert('يرجى كتابة التفاصيل');

        if (!confirm('هل أنت متأكد من إصدار هذا الإنذار؟ سيظهر لولي الأمر فوراً.')) return;

        UI.loader(true);
        try {
            const res = await App.call('addWarning', {
                studentId,
                type,
                details,
                createdBy: 'Admin'
            });

            if (res.success) {
                document.getElementById('warnDetails').value = ''; // Reset form
                this.loadStudentWarnings(studentId); // Reload list
                // Optional: Show success toast
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    async deleteWarning(warningId) {
        if (!confirm('هل أنت متأكد من حذف هذا الإنذار؟')) return;

        UI.loader(true);
        try {
            const res = await App.call('deleteWarning', { warningId });
            if (res.success) {
                // Reload list
                const studentId = document.getElementById('warnStudentSelect').value;
                this.loadStudentWarnings(studentId);
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    },

    // ==========================================
    // SUPERVISOR PERMISSIONS
    // ==========================================
    async openPermissions(userId, userName) {
        UI.loader(true);
        try {
            const res = await App.call('getSupervisorPermissions', { userId });
            if (!res.success) throw new Error(res.message);

            this.renderPermissionsModal(userId, userName, res.permissions);
        } catch (e) {
            UI.showError(e.message);
        }
        UI.loader(false);
    },

    renderPermissionsModal(userId, userName, permissions) {
        // permissions = [{ type: 'Class'|'Teacher'|'Module', targetId: '...' }]
        const assignedClasses = permissions.filter(p => p.type === 'Class').map(p => String(p.targetId));
        const assignedTeachers = permissions.filter(p => p.type === 'Teacher').map(p => String(p.targetId));
        const assignedModules = permissions.filter(p => p.type === 'Module').map(p => String(p.targetId));
        // If no module permissions saved yet, default to all enabled
        const hasModulePerms = assignedModules.length > 0;

        const modules = [
            { id: 'module_academic', label: 'شؤون تعليمية', icon: 'fa-university', color: 'emerald' },
            { id: 'module_people', label: 'الأفراد (مستخدمين / طلاب)', icon: 'fa-users', color: 'blue' },
            { id: 'module_supervision', label: 'الإشراف والمتابعة', icon: 'fa-eye', color: 'purple' },
        ];

        const content = `
            <div class="space-y-5 max-h-[75vh] overflow-y-auto px-2">
                <p class="text-sm text-gray-500">حدد الصلاحيات لـ <b>${userName}</b>.</p>

                <!-- Module Access Toggles -->
                <div class="bg-purple-50 p-4 rounded-xl border border-purple-200">
                    <h4 class="font-bold text-purple-700 flex items-center mb-3">
                        <i class="fas fa-toggle-on text-purple-600 ml-2"></i>الوصول إلى الأقسام
                    </h4>
                    <div class="space-y-2">
                        ${modules.map(m => `
                            <label class="flex items-center justify-between p-3 bg-white rounded-xl border border-purple-100 cursor-pointer hover:border-purple-300 transition">
                                <span class="font-bold text-gray-700 flex items-center gap-2 text-sm">
                                    <i class="fas ${m.icon} text-${m.color}-500"></i>${m.label}
                                </span>
                                <input type="checkbox" class="perm-check-module accent-purple-600 w-5 h-5" value="${m.id}"
                                    ${!hasModulePerms || assignedModules.includes(m.id) ? 'checked' : ''}>
                            </label>
                        `).join('')}
                    </div>
                    <p class="text-xs text-purple-500 mt-2"><i class="fas fa-info-circle ml-1"></i>إلغاء تحديد قسم يخفيه من واجهة المشرف كلياً.</p>
                </div>

                <!-- Classes -->
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-bold text-gray-700 flex items-center">
                            <i class="fas fa-chalkboard text-emerald-600 ml-2"></i>الفصول المسندة
                        </h4>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" onchange="document.querySelectorAll('.perm-check-class').forEach(c => c.checked = this.checked)" class="accent-emerald-600 w-4 h-4">
                            <span class="text-xs font-bold text-gray-500 select-none">تحديد الكل</span>
                        </label>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        ${this.lookups.classes.map(c => `
                            <label class="flex items-center gap-2 p-2 bg-white rounded border border-gray-100 cursor-pointer hover:border-emerald-300 transition">
                                <input type="checkbox" class="perm-check-class accent-emerald-600 w-4 h-4" value="${c.id}" ${assignedClasses.includes(String(c.id)) ? 'checked' : ''}>
                                <span class="font-bold text-gray-700 select-none">${c.displayName}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <!-- Teachers -->
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-bold text-gray-700 flex items-center">
                            <i class="fas fa-chalkboard-teacher text-blue-600 ml-2"></i>المعلمين المسندين
                        </h4>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" onchange="document.querySelectorAll('.perm-check-teacher').forEach(c => c.checked = this.checked)" class="accent-blue-600 w-4 h-4">
                            <span class="text-xs font-bold text-gray-500 select-none">تحديد الكل</span>
                        </label>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        ${[...this.lookups.teachers].sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(t => `
                            <label class="flex items-center gap-2 p-2 bg-white rounded border border-gray-100 cursor-pointer hover:border-blue-300 transition">
                                <input type="checkbox" class="perm-check-teacher accent-blue-600 w-4 h-4" value="${t.id}" ${assignedTeachers.includes(String(t.id)) ? 'checked' : ''}>
                                <span class="font-bold text-gray-700 select-none">${t.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        const modalParams = {
            title: `صلاحيات المشرف: ${userName}`,
            content: content,
            onConfirm: () => Admin.savePermissions(userId)
        };
        this.showDynamicModal(modalParams);
    },

    async savePermissions(userId) {
        const classChecks = document.querySelectorAll('.perm-check-class:checked');
        const teacherChecks = document.querySelectorAll('.perm-check-teacher:checked');
        const moduleChecks = document.querySelectorAll('.perm-check-module:checked');

        const permissions = [];
        classChecks.forEach(c => permissions.push({ type: 'Class', targetId: c.value }));
        teacherChecks.forEach(t => permissions.push({ type: 'Teacher', targetId: t.value }));
        moduleChecks.forEach(m => permissions.push({ type: 'Module', targetId: m.value }));

        UI.loader(true);
        try {
            const res = await App.call('saveSupervisorPermissions', { userId, permissions });
            if (res.success) {
                UI.showError("تم حفظ الصلاحيات بنجاح", "green");
                this.closeDynamicModal();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    }
};
