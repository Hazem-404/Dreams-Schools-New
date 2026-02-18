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
            this.renderTabs();
        } catch (e) { UI.showError(e.message); }
        UI.loader(false);
    },

    renderTabs() {
        const html = `
            <div class="flex justify-center mb-6 bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-fit mx-auto">
                <button onclick="Teacher.switchTab('Log')" id="tab_Log" class="px-6 py-2 rounded-lg font-bold text-sm transition ${this.currentTab === 'Log' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}">
                    <i class="fas fa-edit mr-2"></i>تسجيل حصة
                </button>
                <button onclick="Teacher.switchTab('History')" id="tab_History" class="px-6 py-2 rounded-lg font-bold text-sm transition ${this.currentTab === 'History' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}">
                    <i class="fas fa-history mr-2"></i>سجل الحصص
                </button>
            </div>
            <div id="teacherContentArea"></div>
        `;
        document.getElementById('dashboardContent').innerHTML = html;
        this.switchTab(this.currentTab);
    },

    switchTab(tab) {
        this.currentTab = tab;
        // Update Buttons
        document.getElementById('tab_Log').className = `px-6 py-2 rounded-lg font-bold text-sm transition ${tab === 'Log' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`;
        document.getElementById('tab_History').className = `px-6 py-2 rounded-lg font-bold text-sm transition ${tab === 'History' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`;

        const content = document.getElementById('teacherContentArea');

        if (tab === 'Log') {
            this.renderLogInterface(content);
        } else {
            this.renderHistory(content);
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
                            ${res.history.map(row => {
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
        } catch (e) {
            container.innerHTML = `<div class="text-red-500 text-center p-10">${e.message}</div>`;
        }
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
};
