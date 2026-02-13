const Parent = {
    async init() {
        UI.loader(true);
        try {
            const res = await App.call('getDashboardData', { userId: App.user.userId, role: 'Parent', phone: App.user.phone });
            if (!res.success) throw new Error(res.message);

            const html = res.children.length ? `
                <div class="grid md:grid-cols-2 gap-4">
                    ${res.children.map(child => `
                        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 group hover:shadow-md transition">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xl border border-emerald-200">${child.name[0]}</div>
                                    <div>
                                        <h3 class="font-bold text-gray-800 text-lg">${UI.formatName(child.name)}</h3>
                                        <p class="text-gray-500 text-sm">${child.className}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                                 <button onclick="Parent.openReportModal('${child.id}', '${child.name}')" class="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-2">
                                    <i class="fas fa-calendar-alt"></i> المتابعة اليومية
                                 </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
             ` : '<div class="text-center p-10 text-gray-500">لا يوجد طلاب مرتبطين لهذا الحساب</div>';

            document.getElementById('dashboardContent').innerHTML = html;
        } catch (e) { UI.showError(e.message); }
        UI.loader(false);
    },

    openReportModal(id, name) {
        this.currentStudentId = id;
        document.getElementById('reportTitle').innerText = name;
        document.getElementById('reportDate').value = new Date().toISOString().split('T')[0];
        UI.openReport();
        this.fetchReport();
    },

    async fetchReport() {
        const date = document.getElementById('reportDate').value;
        const container = document.getElementById('reportContent');
        container.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-emerald-600"></div>';

        try {
            const res = await App.call('getStudentReport', { studentId: this.currentStudentId, date });
            if (!res.success) throw new Error(res.message);

            if (res.report.length === 0) {
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-64 text-gray-400">
                        <i class="far fa-calendar-times text-4xl mb-2"></i>
                        <p>لا توجد سجلات لهذا اليوم</p>
                    </div>`;
                return;
            }

            container.innerHTML = res.report.map(r => `
                <div class="bg-white p-4 rounded-xl shadow-sm border-r-4 ${r.status === 'Absent' ? 'border-red-500' : 'border-emerald-500'}">
                    <div class="flex justify-between items-center mb-2 border-b pb-2">
                        <span class="font-bold text-gray-800">${r.subject}</span>
                        <span class="text-xs font-bold px-2 py-1 rounded ${r.status === 'Absent' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}">${r.status === 'Absent' ? 'غائب' : 'حاضر'}</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <p class="text-gray-700 flex gap-2"><i class="fas fa-book-open text-gray-400 mt-1"></i> <span>${r.content || 'لا يوجد شرح مسجل'}</span></p>
                        ${r.homework ? `<div class="bg-orange-50 p-2 rounded text-orange-800 border border-orange-100"><i class="fas fa-home ml-1"></i> <span class="font-bold">واجب:</span> ${r.homework}</div>` : ''}
                        ${r.notes ? `<p class="text-gray-500 italic text-xs"><i class="fas fa-sticky-note ml-1"></i> ${r.notes}</p>` : ''}
                        ${r.privateNote ? `<div class="bg-yellow-50 p-3 rounded border border-yellow-200 text-yellow-800 mt-2 animate-pulse"><i class="fas fa-bell ml-1"></i> <strong>ملاحظة خاصة:</strong> ${r.privateNote}</div>` : ''}
                    </div>
                </div>
             `).join('');

        } catch (e) { container.innerHTML = `<div class="text-red-500 text-center">${e.message}</div>`; }
    }
    ,

    async openGradesModal(id, name) {
        const modal = document.createElement('div');
        modal.id = 'modal-grades';
        modal.className = "fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in";
        modal.innerHTML = `
             <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                 <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                     <div>
                         <h3 class="font-bold text-lg text-emerald-800">شهادة الدرجات</h3>
                         <p class="text-sm text-gray-500">${name}</p>
                     </div>
                     <button onclick="document.getElementById('modal-grades').remove()" class="text-gray-400 hover:text-red-500 transition"><i class="fas fa-times text-xl"></i></button>
                 </div>
                 <div id="gradesContent" class="p-6 overflow-y-auto custom-scrollbar flex-grow">
                     <div class="spinner mx-auto border-gray-300 border-t-emerald-600"></div>
                 </div>
                 <div class="p-4 border-t bg-gray-50 rounded-b-2xl text-center">
                     <button onclick="window.print()" class="text-emerald-600 font-bold hover:underline"><i class="fas fa-print ml-2"></i>طباعة الشهادة</button>
                 </div>
             </div>
         `;
        document.body.appendChild(modal);

        try {
            const res = await App.call('getStudentReportCard', { studentId: id });
            const container = document.getElementById('gradesContent');

            if (!res.report || res.report.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-400 py-10">لا توجد درجات مسجلة بعد</div>';
                return;
            }

            container.innerHTML = `<div class="space-y-6">` + res.report.map(sub => `
                 <div class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                     <div class="bg-emerald-50 p-3 border-b border-emerald-100 flex justify-between items-center">
                         <h4 class="font-bold text-emerald-800">${sub.subject}</h4>
                         <span class="text-xs font-bold bg-white text-emerald-600 px-2 py-1 rounded border border-emerald-200">الإجمالي: ${sub.totalScore} / ${sub.totalMax}</span>
                     </div>
                     <div class="divide-y divide-gray-50">
                         ${sub.exams.length ? sub.exams.map(ex => `
                             <div class="p-3 flex justify-between items-center hover:bg-gray-50">
                                 <div>
                                     <p class="font-bold text-gray-700 text-sm">${ex.title}</p>
                                     ${ex.comment ? `<p class="text-xs text-gray-400 italic">${ex.comment}</p>` : ''}
                                 </div>
                                 <div class="flex items-center gap-2">
                                     <span class="font-bold text-gray-800">${ex.score}</span>
                                     <span class="text-xs text-gray-400">/ ${ex.max}</span>
                                 </div>
                             </div>
                         `).join('') : '<p class="text-xs text-gray-400 p-3 text-center">لا توجد اختبارات</p>'}
                     </div>
                 </div>
             `).join('') + `</div>`;

        } catch (e) {
            document.getElementById('gradesContent').innerHTML = `<div class="text-red-500 text-center">${e.message}</div>`;
        }
    }
};
