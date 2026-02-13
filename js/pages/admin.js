const Admin = {
    currentTab: 'Stats',
    isSupervisor: false,
    cache: {},
    lookups: { teachers: [], classes: [], subjects: [], students: [] },

    async init(isSupervisor = false) {
        this.isSupervisor = isSupervisor;
        document.getElementById('adminTabs').classList.remove('hidden');

        // Reset all tabs
        document.querySelectorAll('#adminTabs button').forEach(b => b.classList.remove('hidden'));

        // Supervisor Restrictions
        // Only: Allocations (Monitoring via button if exists, wait, Supervisor needs Monitoring too)
        // Supervisor sees: Allocations, Monitoring. 
        // Hides: Stats, Users, Classes, Subjects, Enrollments
        if (this.isSupervisor) {
            ['Stats', 'Users', 'Classes', 'Subjects', 'Enrollments'].forEach(t => {
                const btn = document.querySelector(`button[data-tab="${t}"]`);
                if (btn) btn.classList.add('hidden');
            });
            this.switchTab('Allocations');
        } else {
            this.switchTab('Stats');
        }

        try {
            const res = await App.call('getAdminLookups');
            if (res.success) {
                this.lookups = res;
                // Pre-format Class Names to include Number
                this.lookups.classes.forEach(c => {
                    c.displayName = `${c.name} ${c.number ? '- ' + c.number : ''}`;
                });
                // Format Names in Lookups
                this.lookups.teachers.forEach(t => t.name = UI.formatName(t.name));
                this.lookups.students.forEach(s => s.name = UI.formatName(s.name));
            }
        } catch (e) { console.error("Failed to load lookups", e); }
    },

    allData: [], // Store raw data for filtering
    currentHeader: [],

    async switchTab(tab) {
        this.currentTab = tab;
        // Update UI tabs
        document.querySelectorAll('#adminTabs button').forEach(b => {
            b.classList.remove('bg-emerald-50', 'text-emerald-600', 'border-emerald-200');
            if (b.dataset.tab === tab) b.classList.add('bg-emerald-50', 'text-emerald-600', 'border-emerald-200');
        });

        const content = document.getElementById('dashboardContent');
        content.innerHTML = '<div class="text-center p-10"><div class="spinner mx-auto border-gray-300 border-t-emerald-500"></div></div>';

        if (tab === 'Stats') return this.loadStats();
        if (tab === 'Monitoring') return this.renderMonitoring();
        if (tab === 'ClassControl') return this.renderClassControl();

        // Load Data Table
        try {
            let res;
            try {
                res = await App.call('adminGetData', { type: tab });
                if (!res.success) throw new Error(res.message);
            } catch (err) {
                console.warn("Backend unavailable, returning empty list", err);
                // Mock Data Fallback for Tables
                res = { success: true, header: ['Info'], data: [['Backend Not Deployed']] };
                if (tab === 'Subjects') res.header = ['المعرف', 'اسم المادة'], res.data = [];
                if (tab === 'Users') res.header = ['المعرف', 'الاسم', 'الدور', 'الهاتف', 'كلمة المرور', 'نشط'], res.data = [];
            }

            this.allData = res.data || [];
            this.currentHeader = res.header;

            // Render Filters & Table
            this.renderFilters(tab);
            this.applyFilters();

        } catch (e) {
            content.innerHTML = `<div class="bg-red-100 text-red-600 p-4 rounded-xl text-center">${e.message}</div>`;
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
                res = { success: true, stats: { students: 0, teachers: 0, parents: 0, classes: 0 } };
            }

            const html = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div class="text-slate-500 text-xs font-bold mb-1">الطلاب</div>
                        <div class="text-3xl font-bold text-emerald-600">${res.stats.students}</div>
                    </div>
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div class="text-slate-500 text-xs font-bold mb-1">المعلمين</div>
                        <div class="text-3xl font-bold text-blue-600">${res.stats.teachers}</div>
                    </div>
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div class="text-slate-500 text-xs font-bold mb-1">أولياء الأمور</div>
                        <div class="text-3xl font-bold text-orange-600">${res.stats.parents || 0}</div>
                    </div>
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div class="text-slate-500 text-xs font-bold mb-1">الفصول</div>
                        <div class="text-3xl font-bold text-purple-600">${res.stats.classes}</div>
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white mb-6">
                    <h3 class="font-bold text-lg mb-2">مرحباً بك في لوحة التحكم</h3>
                    <p class="opacity-90 text-sm">استخدم علامات التبويب في الأعلى لإدارة النظام، أو انتقل إلى تبويب "المتابعة" لمراقبة سير العملية التعليمية.</p>
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
                <table class="w-full text-right">
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
                        <option value="ALL" class="font-bold text-emerald-600">📌 كل الفصول (متابعة شاملة)</option>
                        ${this.lookups.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
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

    closeDynamicModal() {
        const m = document.getElementById('modal-dynamic');
        if (m) m.remove();
    }
};
