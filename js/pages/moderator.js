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
                // If no module permissions saved, allow all (backward compatible)
                this.allowedModules = modulePerms.length > 0 ? modulePerms : ['module_supervision', 'module_academic', 'module_people'];

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

        // Build tabs dynamically based on module access
        // Monitoring & Reviews → module_supervision
        // Allocations → module_academic
        // ClassControl → module_supervision
        const tabs = [];
        if (allowed.includes('module_supervision')) {
            tabs.push(`<button onclick="Moderator.switchTab('Monitoring')" class="tab-btn bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition" data-tab="Monitoring">
                <i class="fas fa-chart-bar ml-2"></i>المتابعة اليومية
            </button>`);
            tabs.push(`<button onclick="Moderator.switchTab('Reviews')" class="tab-btn bg-white text-gray-600 hover:bg-emerald-50 px-4 py-2 rounded-lg font-bold transition" data-tab="Reviews">
                <i class="fas fa-check-double ml-2"></i>مراجعة السجلات
            </button>`);
            tabs.push(`<button onclick="Moderator.switchTab('ClassControl')" class="tab-btn bg-white text-gray-600 hover:bg-emerald-50 px-4 py-2 rounded-lg font-bold transition" data-tab="ClassControl">
                <i class="fas fa-edit ml-2"></i>تسجيل الحصص
            </button>`);
        }
        if (allowed.includes('module_academic')) {
            tabs.push(`<button onclick="Moderator.switchTab('Allocations')" class="tab-btn bg-white text-gray-600 hover:bg-emerald-50 px-4 py-2 rounded-lg font-bold transition" data-tab="Allocations">
                <i class="fas fa-chalkboard-teacher ml-2"></i>توزيع المدرسين
            </button>`);
        }

        if (tabs.length === 0) {
            content.innerHTML = `<div class="p-10 text-center text-gray-400"><i class="fas fa-lock text-4xl mb-4 opacity-30 block"></i><p class="font-bold">ليس لديك صلاحية الوصول لأي قسم حالياً.</p><p class="text-sm mt-1">تواصل مع المدير لتفعيل صلاحياتك.</p></div>`;
            return;
        }

        const html = `
            <!-- Tabs -->
            <div class="flex flex-wrap gap-2 mb-6 border-b pb-2">
                ${tabs.join('')}
            </div>

            <!-- Content Area -->
            <div id="modContent"></div>
        `;
        content.innerHTML = html;

        // Switch to first available tab
        const firstTab = document.querySelector('.tab-btn[data-tab]');
        if (firstTab) this.switchTab(firstTab.dataset.tab);
    },

    switchTab(tab) {
        // Update Active State
        document.querySelectorAll('.tab-btn').forEach(b => {
            if (b.dataset.tab === tab) {
                b.classList.remove('bg-white', 'text-gray-600');
                b.classList.add('bg-emerald-600', 'text-white', 'shadow-md');
            } else {
                b.classList.add('bg-white', 'text-gray-600');
                b.classList.remove('bg-emerald-600', 'text-white', 'shadow-md');
            }
        });

        if (tab === 'Monitoring') this.renderMonitoring();
        else if (tab === 'Reviews') this.renderReviews();
        else if (tab === 'Allocations') this.renderAllocations();
        else if (tab === 'ClassControl') this.renderClassControl();
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

        const resDiv = document.getElementById('modResults');
        resDiv.innerHTML = UI.spinner();

        try {
            const res = await App.call('getAdminActivity', { classId, date });
            if (res.success) {
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
                                        <span class="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded font-bold self-start">${l.subject}</span>
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
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden fade-in mt-6">
                        <div class="bg-gray-50 p-3 border-b flex justify-between items-center">
                            <h3 class="font-bold text-gray-700"><i class="fas fa-user-graduate text-red-500 ml-2"></i>المتابعة</h3>
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
                // Filter Client Side
                const myClassIds = this.lookups.classes.map(c => String(c.id));

                const myLogs = res.logs.filter(l => myClassIds.includes(String(l.classId)));

                if (myLogs.length === 0) {
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

                const html = `
                    <div class="space-y-4 animate-fadeIn">
                        <h3 class="font-bold text-gray-700 text-lg mb-4 flex items-center">
                            <i class="fas fa-clipboard-check text-emerald-600 ml-2"></i>سجلات بانتظار المراجعة
                            <span class="mr-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full border border-emerald-200">${myLogs.length}</span>
                        </h3>
                        <div class="grid gap-4">
                            ${myLogs.map(log => `
                                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                                    <div class="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 class="font-bold text-gray-800 text-lg">${log.className} - ${log.subjectName}</h4>
                                            <p class="text-sm text-gray-500 font-bold"><i class="fas fa-user ml-1"></i> ${UI.formatName(log.teacherName)}</p>
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
                                            <span class="bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-bold">
                                                غياب: ${log.attendance.filter(a => a.status === 'Absent').length}
                                            </span>
                                            <span class="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded font-bold">
                                                ملاحظات طلاب: ${log.attendance.filter(a => a.note).length}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="flex gap-3 mt-4">
                                        <button onclick="Moderator.submitReview('${log.id}', 'Approved')" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm">
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
                            `).join('')}
                        </div>
                    </div>
                `;
                container.innerHTML = html;
            } else {
                container.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">${res.message}</div>`;
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">حدث خطأ: ${e.message}</div>`;
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
                    Moderator.submitReview(logId, 'Approved', newContent, newHW, newNotes, updates, supNote);
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
                this.renderReviews();
            } else {
                alert(res.message);
            }
        } catch (e) { alert(e.message); }
        UI.loader(false);
    }
};
