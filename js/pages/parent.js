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
                                 <button onclick="Parent.openReportModal('${child.id}', '${child.name}')" class="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-2 relative">
                                    <i class="fas fa-calendar-alt"></i> المتابعة اليومية
                                    ${child.notificationCount > 0 ? `<span class="absolute -top-2 -right-2 bg-emerald-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm font-bold animate-pulse">${child.notificationCount}</span>` : ''}
                                 </button>
                                 <button onclick="Parent.openWarningsModal('${child.id}', '${child.name}')" class="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition flex items-center justify-center gap-2 relative">
                                    <i class="fas fa-exclamation-triangle"></i> الإنذارات
                                    ${child.warningCount > 0 ? `<span class="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm font-bold animate-pulse">${child.warningCount}</span>` : ''}
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

        // Modal Layout
        const modal = document.createElement('div');
        modal.id = 'modal-report';
        modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in";
        modal.innerHTML = `
             <div class="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                 <!-- Header -->
                 <div class="p-4 bg-emerald-600 text-white flex justify-between items-center shadow-md z-10">
                     <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg">${name}</h3>
                            <p class="text-emerald-100 text-xs">المتابعة اليومية</p>
                        </div>
                     </div>
                     <button onclick="document.getElementById('modal-report').remove()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"><i class="fas fa-times"></i></button>
                 </div>
                 
                 <div class="flex flex-col md:flex-row h-full overflow-hidden">
                    <!-- Sidebar: Timeline (Mobile: Fixed Height / Desktop: Full Height) -->
                    <div class="w-full md:w-1/3 h-40 md:h-full bg-gray-50 border-b md:border-b-0 md:border-l border-gray-200 flex flex-col shrink-0">
                        <div class="p-3 border-b bg-white flex justify-between items-center sticky top-0 z-10">
                            <h4 class="font-bold text-gray-700 text-sm flex items-center gap-2">
                                <i class="fas fa-history text-emerald-500"></i> آخر التحديثات
                            </h4>
                            <span class="text-[10px] bg-gray-100 px-2 rounded-full md:hidden">اسحب لرؤية المزيد</span>
                        </div>
                        <div id="activityTimeline" class="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            <div class="spinner mx-auto mt-4"></div>
                        </div>
                    </div>

                    <!-- Main: Report Details -->
                    <div class="flex-1 flex flex-col bg-white overflow-hidden h-full">
                         <div class="p-4 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
                             <div class="flex items-center gap-2">
                                 <i class="fas fa-calendar-day text-gray-400"></i>
                                 <input type="date" id="reportDate" class="bg-transparent font-bold text-gray-700 outline-none" onchange="Parent.fetchReport()">
                             </div>
                         </div>
                         <div id="reportContent" class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
                             <!-- Report Cards Go Here -->
                         </div>
                    </div>
                 </div>
             </div>
        `;
        document.body.appendChild(modal);

        // Set Today
        document.getElementById('reportDate').value = new Date().toISOString().split('T')[0];

        // Load initial data
        this.fetchTimeline();
        this.fetchReport();
    },

    async fetchTimeline() {
        const container = document.getElementById('activityTimeline');
        try {
            const res = await App.call('getStudentRecentActivity', { studentId: this.currentStudentId });
            if (!res.success) throw new Error(res.message);

            if (res.activity.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-400 text-xs p-4">لا توجد نشاطات مسجلة مؤخراً</div>';
                return;
            }

            container.innerHTML = res.activity.map(item => {
                const dateObj = new Date(item.date);
                const dayName = dateObj.toLocaleDateString('ar-EG', { weekday: 'long' });
                const dateStr = dateObj.toLocaleDateString('en-GB'); // DD/MM/YYYY

                // Indicators
                let alertHtml = '';
                if (item.alerts && item.alerts.length > 0) {
                    alertHtml = item.alerts.map(a => `<span class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">${a}</span>`).join('');
                } else {
                    alertHtml = `<span class="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">${item.count} حصص</span>`;
                }

                return `
                <div onclick="Parent.setDateAndFetch('${item.date}')" class="bg-white p-3 rounded-xl border border-gray-100 hover:border-emerald-300 hover:shadow-sm cursor-pointer transition group">
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-gray-700 text-sm group-hover:text-emerald-700 transition">${dayName}</span>
                        <span class="text-[10px] text-gray-400 font-mono">${dateStr}</span>
                    </div>
                    <div class="flex flex-wrap gap-1 mt-1">
                        ${alertHtml}
                    </div>
                </div>
                `;
            }).join('');

        } catch (e) {
            container.innerHTML = `<div class="text-red-400 text-xs text-center p-2">${e.message}</div>`;
        }
    },

    setDateAndFetch(date) {
        document.getElementById('reportDate').value = date;
        this.fetchReport();
        // Highlight active (optional, simplified)
    },

    async fetchReport() {
        const date = document.getElementById('reportDate').value;
        const container = document.getElementById('reportContent');
        container.innerHTML = '<div class="spinner mx-auto border-gray-300 border-t-emerald-600 mt-10"></div>';

        try {
            const res = await App.call('getStudentReport', { studentId: this.currentStudentId, date });
            if (!res.success) throw new Error(res.message);

            if (res.report.length === 0) {
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full text-gray-400 pb-20">
                        <div class="bg-gray-100 p-6 rounded-full mb-4 text-emerald-200">
                             <i class="far fa-calendar-check text-4xl"></i>
                        </div>
                        <p class="font-bold text-gray-500">لا توجد سجلات لهذا اليوم</p>
                        <p class="text-xs text-gray-400 mt-1">اختر يوماً آخر من القائمة الجانبية</p>
                    </div>`;
                return;
            }

            container.innerHTML = res.report.map(r => `
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group">
                    <div class="flex justify-between items-start mb-3 pb-3 border-b border-gray-50">
                        <div class="flex items-center gap-3">
                             <div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold group-hover:bg-emerald-600 group-hover:text-white transition">
                                ${r.subject[0]}
                             </div>
                             <div>
                                 <h4 class="font-bold text-gray-800 text-lg leading-tight">${r.subject}</h4>
                                 <p class="text-xs text-gray-400">${r.teacher || 'المعلم'}</p>
                             </div>
                        </div>
                        <span class="text-xs font-bold px-3 py-1 rounded-full ${r.status === 'Absent' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}">
                            ${r.status === 'Absent' ? 'غائب' : 'حاضر'}
                        </span>
                    </div>
                    
                    <div class="space-y-3 pl-1">
                        <div>
                             <span class="text-xs font-bold text-gray-400 block mb-1">ما تم شرحه:</span>
                             <p class="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">${r.content || 'لا يوجد شرح مسجل'}</p>
                        </div>
                        
                        ${r.homework ? `
                        <div>
                             <span class="text-xs font-bold text-orange-400 block mb-1">الواجب المنزلي:</span>
                             <div class="bg-orange-50 p-3 rounded-lg border border-orange-100 text-orange-800 text-sm flex gap-2 items-start">
                                <i class="fas fa-home mt-1"></i>
                                <span>${r.homework}</span>
                             </div>
                        </div>` : ''}

                        ${r.notes ? `
                        <div class="mt-2">
                             <p class="text-gray-500 italic text-xs flex gap-1 items-center bg-yellow-50/50 p-2 rounded"><i class="fas fa-sticky-note text-yellow-400"></i> ${r.notes}</p>
                        </div>` : ''}
                        
                        ${r.privateNote ? `
                        <div class="bg-red-50 p-3 rounded-lg border border-red-100 text-red-800 mt-2 flex gap-2 items-start animate-fadeSlide">
                            <i class="fas fa-bell mt-1 text-red-500"></i> 
                            <div>
                                <strong class="block text-xs uppercase text-red-400 mb-1">ملاحظة خاصة من المعلم:</strong>
                                ${r.privateNote}
                            </div>
                        </div>` : ''}
                    </div>
                </div>
             `).join('');

        } catch (e) { container.innerHTML = `<div class="text-red-500 text-center p-10">${e.message}</div>`; }
    },

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
    },
    async openWarningsModal(studentId, name) {
        const modal = document.createElement('div');
        modal.id = 'modal-warnings';
        modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in";
        modal.innerHTML = `
             <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
                 <div class="p-4 bg-red-600 text-white flex justify-between items-center shadow-md z-10">
                     <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg">سجل الإنذارات والمخالفات</h3>
                            <p class="text-red-100 text-xs">الطالب: ${name}</p>
                        </div>
                     </div>
                     <button onclick="document.getElementById('modal-warnings').remove()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"><i class="fas fa-times"></i></button>
                 </div>
                 
                 <div id="warningsContent" class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
                     <div class="spinner mx-auto border-gray-300 border-t-red-600 mt-10"></div>
                 </div>
             </div>
        `;
        document.body.appendChild(modal);

        try {
            const res = await App.call('getStudentWarnings', { studentId });
            const container = document.getElementById('warningsContent');

            if (!res.success) throw new Error(res.message);

            if (res.warnings.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-emerald-600 py-10">
                        <i class="fas fa-check-circle text-5xl mb-4 opacity-50"></i>
                        <p class="font-bold">سجل الطالب نظيف! لا توجد مخالفات.</p>
                    </div>
                `;
                return;
            }

            const typeColors = {
                'Behavior': 'bg-orange-50 text-orange-700 border-orange-200',
                'Attendance': 'bg-blue-50 text-blue-700 border-blue-200',
                'Dismissal': 'bg-red-50 text-red-700 border-red-200',
                'Academic': 'bg-purple-50 text-purple-700 border-purple-200',
                'Other': 'bg-gray-50 text-gray-700 border-gray-200'
            };
            const typeLabels = {
                'Behavior': 'سلوك',
                'Attendance': 'غياب',
                'Dismissal': 'فصل',
                'Academic': 'أكاديمي',
                'Other': 'أخرى'
            };

            container.innerHTML = res.warnings.map(w => `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-start relative overflow-hidden">
                     <div class="absolute right-0 top-0 bottom-0 w-1 ${w.type === 'Dismissal' ? 'bg-red-500' : 'bg-orange-400'}"></div>
                     <div class="flex-1">
                        <div class="flex justify-between items-center mb-2">
                             <span class="${typeColors[w.type] || typeColors['Other']} px-2 py-1 rounded text-xs font-bold border">
                                ${typeLabels[w.type] || w.type}
                            </span>
                            <span class="text-xs text-gray-400 font-bold">${w.date}</span>
                        </div>
                        <p class="text-gray-800 font-bold text-sm leading-relaxed">${w.details}</p>
                     </div>
                </div>
            `).join('');

        } catch (e) {
            document.getElementById('warningsContent').innerHTML = `<div class="text-red-500 text-center p-4">${e.message}</div>`;
        }
    }
};
