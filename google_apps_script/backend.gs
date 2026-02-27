/**
 * Dreams Schools - Final Backend System v4.0 (Robust Edition)
 * Features: Auth, PWA Support, Full Admin CRUD, Teacher/Parent Portals
 */

function doPost(e) {
  var result = { success: false, message: "Server Error" };
  try {
    if (!e || !e.parameter) throw new Error("No parameters");
    var action = e.parameter.action;
    var payload = {};
    if (e.parameter.payload) payload = JSON.parse(e.parameter.payload);

    // --- ROUTING ---
    if (action === "login") result = apiLogin(payload.phone, payload.password);
    else if (action === "changePassword") result = changePassword(payload.userId, payload.newPass);
    
    // Parent
    else if (action === "getDashboardData") result = getDashboardData(payload.userId, payload.role, payload.phone);
    else if (action === "getStudentReport") result = getStudentReport(payload.studentId, payload.date);
    
    // Teacher
    else if (action === "getTeacherClasses") result = getTeacherClasses(payload.userId);
    else if (action === "getClassStudents") result = getClassStudents(payload.classId);
    else if (action === "saveDailyLog") result = saveDailyLog(payload);
    else if (action === "getTeacherLogHistory") result = getTeacherLogHistory(payload.userId);
    else if (action === "getStudentRecentActivity") result = getStudentRecentActivity(payload.studentId);
    
    // Admin CRUD
    else if (action === "adminGetData") result = adminGetData(payload.type); 
    else if (action === "adminSaveData") result = adminSaveData(payload.type, payload.data);
    else if (action === "adminUpdateData") result = adminUpdateData(payload.type, payload.id, payload.data);
    else if (action === "adminDeleteData") result = adminDeleteData(payload.type, payload.id);
    else if (action === "adminBulkUpdateEnrollments") result = adminBulkUpdateEnrollments(payload);

    else if (action === "getAdminActivity") result = getAdminActivity(payload.classId, payload.date);
    // Cached Lookups
    else if (action === "getAdminLookups") result = getAdminLookupsCached();
    
    // Admin Stats
    else if (action === "getAdminStats") result = getAdminStatsCached();
    
    // Supervisor Review
    else if (action === "getPendingLogs") result = getPendingLogs();
    else if (action === "reviewLog") result = reviewLog(payload);
    
    // Student & Parent Management
    else if (action === "getStudentsManagement") result = getStudentsManagement();
    else if (action === "getParentsManagement") result = getParentsManagement();
    else if (action === "updateStudent") result = updateStudent(payload.studentId, payload.name, payload.parentPhone);
    else if (action === "deleteStudent") result = deleteStudent(payload.studentId);
    else if (action === "linkParentToStudent") result = linkParentToStudent(payload.studentId, payload.parentPhone);
    else if (action === "unlinkParentFromStudent") result = unlinkParentFromStudent(payload.studentId);
    else if (action === "reassignParent") result = reassignParent(payload.studentId, payload.newParentPhone);
    else if (action === "updateParent") result = updateParent(payload.currentPhone, payload.newName, payload.newPhone, payload.newPassword);
    
    // Announcement & Exams (REMOVED)
    // kept as placeholders if needed, but logic removed to optimize script size/load
    
    // Supervisor Permissions
    else if (action === "getSupervisorData") result = getSupervisorData(payload.userId);
    else if (action === "getSupervisorPermissions") result = getSupervisorPermissions(payload.userId);
    else if (action === "saveSupervisorPermissions") result = saveSupervisorPermissions(payload.userId, payload.permissions);

    // Warnings Module
    else if (action === "addWarning") result = addWarning(payload);
    else if (action === "getStudentWarnings") result = getStudentWarnings(payload.studentId);
    else if (action === "deleteWarning") result = deleteWarning(payload.warningId);

    else if (action === "getAnnouncements") result = { success: true, news: [] };
    else if (action === "createExam") result = { success: false, message: "Feature Disabled" };
    
    else result = { success: false, message: "Unknown Action: " + action };
    
  } catch (err) {
    result = { success: false, message: "Error: " + err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Dreams Schools System')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==========================================
// 1. AUTHENTICATION & USER MANAGEMENT
// ==========================================

function apiLogin(phone, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = ss.getSheetByName("Users").getDataRange().getValues();
  const inputPhone = normalizePhone(phone);
  
  for (let i = 1; i < data.length; i++) {
    // Users Schema: [ID, Name, Role, Phone, Password, Active]
    const rowPhone = normalizePhone(data[i][3]);
    const rowPass = String(data[i][4]);
    
    if (rowPhone === inputPhone && rowPass === String(password)) {
       return { 
         success: true, 
         userId: data[i][0], 
         name: data[i][1], 
         role: data[i][2], 
         phone: data[i][3] 
       };
    }
  }
  return { success: false, message: "بيانات الدخول غير صحيحة" };
}

function changePassword(userId, newPass) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      sheet.getRange(i + 1, 5).setValue(newPass); // Column 5 is Password
      return { success: true, message: "تم تحديث كلمة المرور بنجاح" };
    }
  }
  return { success: false, message: "المستخدم غير موجود" };
}

// ==========================================
// 2. PARENT MODULE
// ==========================================

function getDashboardData(userId, role, phone) {
  const cacheKey = "dash_" + userId + "_" + role;
  const cached = _getFromCache(cacheKey);
  if (cached) return cached;
  
  if (role !== "Parent") return { success: false, message: "Invalid Role" };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Batch Load: قراءة كل الشيتات مرة واحدة
  const classMap = {};
  ss.getSheetByName("Classes").getDataRange().getValues().forEach(r => classMap[r[0]] = r[1]);
  
  // 2. Load Enrollments once
  const enrollData = ss.getSheetByName("Enrollments").getDataRange().getValues();
  const studToClassId = {};
  enrollData.forEach(r => studToClassId[r[1]] = r[2]);
    
  // 3. قراءة Logs و Attendance مرة واحدة ونمررهم للـ helper
  const logData = ss.getSheetByName("Daily_Logs").getDataRange().getValues();
  const attData = ss.getSheetByName("Attendance").getDataRange().getValues();

  const studs = ss.getSheetByName("Students").getDataRange().getValues();

  const warnSheet = ss.getSheetByName("Warnings");
  const warnData = warnSheet ? warnSheet.getDataRange().getValues() : [];
  const warnMap = {};
  for (let w = 1; w < warnData.length; w++) {
      const sId = warnData[w][1];
      warnMap[sId] = (warnMap[sId] || 0) + 1;
  }

  const pPhone = normalizePhone(phone);
  const kids = [];
  
  for (let i = 1; i < studs.length; i++) {
    if (normalizePhone(String(studs[i][2])) === pPhone) {
      const sId = studs[i][0];
      const sClassId = studToClassId[sId];
      
      // تمرير البيانات المقروءة مسبقاً بدل إعادة قراءة الشيتات
      const activity = _getStudentActivityHelper(sId, sClassId, logData, attData);
      
      kids.push({ 
        id: sId, 
        name: studs[i][1], 
        className: classMap[sClassId] || "غير مسجل",
        notificationCount: activity.length,
        warningCount: warnMap[sId] || 0
      });
    }
  }
  
  const res = { success: true, children: kids };
  _saveToCache(cacheKey, res, 1800); // FIX: same key as read
  return res;
}

// Helper - يقبل البيانات مباشرة بدل قراءة الشيتات من جديد
function _getStudentActivityHelper(studentId, classId, logData, attData) {
    if (!classId) return [];
    
    const datesMap = {};
    const logIdMap = {};
    const sClassId = String(classId);
    
    // Scan Logs (البيانات ممررة من الخارج - لا قراءة هنا)
    for (let i = 1; i < logData.length; i++) {
        const r = logData[i];
        if (String(r[2]) === sClassId && (r[10] === 'Approved' || !r[10])) {
            try {
                const d = new Date(r[1]).toISOString().split('T')[0];
                logIdMap[r[0]] = d;
                if (!datesMap[d]) datesMap[d] = { date: d };
            } catch (e) {}
        }
    }
    
    // Scan Attendance (البيانات ممررة من الخارج - لا قراءة هنا)
    const sStudId = String(studentId);
    for (let i = 1; i < attData.length; i++) {
        if (String(attData[i][2]) === sStudId) {
            const d = logIdMap[attData[i][1]];
            if (d && !datesMap[d]) datesMap[d] = { date: d };
        }
    }
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    
    return Object.keys(datesMap).filter(d => new Date(d) >= cutoff);
}

function getStudentReport(studentId, dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Determine Class
  const enrolls = ss.getSheetByName("Enrollments").getDataRange().getValues();
  let classId = null;
  for(let i=enrolls.length-1; i>=1; i--) {
    if(enrolls[i][1] == studentId) { classId = enrolls[i][2]; break; }
  }
  if (!classId) return { success: false, message: "الطالب غير مسجل في أي فصل" };

  // 2. Metadata (Subjects)
  const subMap = {};
  ss.getSheetByName("Subjects").getDataRange().getValues().forEach(r => subMap[r[0]] = r[1]);

  // 3. Get Logs for Date
  const logs = ss.getSheetByName("Daily_Logs").getDataRange().getValues();
  const att = ss.getSheetByName("Attendance").getDataRange().getValues();
  
  const attMap = {}; // logId -> {status, note}
  for(let i=1; i<att.length; i++) {
     if(att[i][2] == studentId) {
       attMap[att[i][1]] = { status: att[i][3], note: att[i][4] || "" };
     }
  }

  const report = [];
  const queryDate = new Date(dateStr); queryDate.setHours(0,0,0,0);
  
  for(let i=1; i<logs.length; i++) {
    const r = logs[i];
    // Logs Schema: [LogID, Date, ClassID, SubID, TeacherID, Term, Content, HW, Notes, Timestamp, STATUS]
    if(r[2] != classId) continue;
    
    // FILTER: Only show Approved logs (or logs with no status for backward compatibility)
    const status = r[10];
    if (status && status !== 'Approved') continue; 
    
    const logDate = new Date(r[1]); logDate.setHours(0,0,0,0);
    
    if(logDate.getTime() === queryDate.getTime()) {
      const attInfo = attMap[r[0]] || { status: "Present", note: "" };
      report.push({
        subject: subMap[r[3]] || "مادة غير معروفة",
        content: r[6],
        homework: r[7],
        notes: r[8],         // General Class Note
        privateNote: attInfo.note, // Private Student Note
        status: attInfo.status
      });
    }
  }
   // Sort desc
  return { success: true, report: report.sort((a,b) => b.timestamp - a.timestamp) };
}

function getStudentRecentActivity(studentId) {
  const cacheKey = "stud_act_" + studentId;
  const cached = _getFromCache(cacheKey);
  if (cached) return cached;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sStudId = String(studentId);
  
  // 1. Get Class ID from Enrollments
  const enrolls = ss.getSheetByName("Enrollments").getDataRange().getValues();
  let classId = null;
  for (let i = 1; i < enrolls.length; i++) {
      if (String(enrolls[i][1]) === sStudId) {
          classId = enrolls[i][2];
          break;
      }
  }
  
  if (!classId) return { success: true, activity: [] };
  
  const datesMap = {};
  const logIdToDate = {};
  const sClassId = String(classId);
  
  // 2. Scan Daily Logs
  const logData = ss.getSheetByName("Daily_Logs").getDataRange().getValues();
  
  for (let i = 1; i < logData.length; i++) {
    const r = logData[i];
    if (String(r[2]) === sClassId && (r[10] === 'Approved' || !r[10])) {
        try {
            const d = new Date(r[1]).toISOString().split('T')[0];
            logIdToDate[r[0]] = d;
            if (!datesMap[d]) datesMap[d] = { date: d, count: 0, alerts: [] };
            datesMap[d].count++;
        } catch(e) {}
    }
  }
  
  // 3. Scan Attendance
  const attData = ss.getSheetByName("Attendance").getDataRange().getValues();
  
  for (let i = 1; i < attData.length; i++) {
      if (String(attData[i][2]) === sStudId) {
          const d = logIdToDate[attData[i][1]];
          if (d && datesMap[d]) {
              const status = attData[i][3];
              const note = attData[i][4];
              if (status === 'Absent') datesMap[d].alerts.push('غائب');
              else if (status === 'Late') datesMap[d].alerts.push('تأخر');
              if (note) datesMap[d].alerts.push('ملاحظة');
          }
      }
  }
  
  const activity = Object.values(datesMap).sort((a,b) => new Date(b.date) - new Date(a.date));
  const res = { success: true, activity: activity.slice(0, 15) };
  _saveToCache(cacheKey, res, 300); // 5 mins cache
  return res;
}

// ==========================================
// 3. TEACHER MODULE
// ==========================================

function getTeacherClasses(userId) {
  const cacheKey = "t_classes_" + userId;
  const cached = _getFromCache(cacheKey);
  if (cached) return cached;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allocs = ss.getSheetByName("Teacher_Allocations").getDataRange().getValues();
  const classes = ss.getSheetByName("Classes").getDataRange().getValues();
  const subs = ss.getSheetByName("Subjects").getDataRange().getValues();
  
  const cMap = {}; classes.forEach(r => cMap[r[0]] = r[1] + (r[2] ? " - " + r[2] : ""));
  const sMap = {}; subs.forEach(r => sMap[r[0]] = r[1]);
  
  const list = [];
  allocs.forEach((r, i) => {
    // Allocations: [AllocID, TeacherID, ClassID, SubjectID]
    if (i > 0 && String(r[1]) === String(userId)) {
      list.push({ 
        classId: r[2], 
        className: cMap[r[2]] || r[2], 
        subjectId: r[3], 
        subjectName: sMap[r[3]] || r[3] 
      });
    }
  });
  
  const res = { success: true, classes: list };
  // Cache for 1 hour
  _saveToCache(cacheKey, res, 3600);
  return res;
}

function getClassStudents(classId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const enroll = ss.getSheetByName("Enrollments").getDataRange().getValues();
  const studs = ss.getSheetByName("Students").getDataRange().getValues();
  
  // FIX: استخدام Set بدل includes() لتحسين البحث من O(N²) إلى O(N)
  const sIdSet = new Set();
  for (let i = 1; i < enroll.length; i++) {
    if (String(enroll[i][2]) === String(classId)) sIdSet.add(String(enroll[i][1]));
  }
  
  const result = [];
  for (let i = 1; i < studs.length; i++) {
    if (sIdSet.has(String(studs[i][0]))) result.push({ id: studs[i][0], name: studs[i][1] });
  }
    
  return { success: true, students: result };
}

function saveDailyLog(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("Daily_Logs");
  const attSheet = ss.getSheetByName("Attendance");
  
  let logId = payload.logId;
  
  // EDIT MODE: Update existing log if logId provided
  if (logId) {
    const data = logSheet.getDataRange().getValues();
    let foundIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(logId)) {
            foundIndex = i;
            break;
        }
    }
    
    if (foundIndex !== -1) {
        // FIX: كتابة الحقول كلها في batch واحد بدل 4 كتابات منفردة
        const row = data[foundIndex];
        logSheet.getRange(foundIndex + 1, 1, 1, 11).setValues([[
          row[0], // ID (محفوظ)
          payload.date ? new Date(payload.date) : row[1],
          row[2], row[3], row[4], row[5], // Class, Subj, Teacher, Term (محفوظة)
          payload.content !== undefined ? payload.content : row[6],
          payload.homework !== undefined ? payload.homework : row[7],
          payload.notes !== undefined ? payload.notes : row[8],
          row[9], // Timestamp (محفوظ)
          "Pending" // Reset Status
        ]]);
    } else {
        return { success: false, message: "Log not found for update" };
    }
  } else {
      // NEW MODE
      logId = "L_" + Date.now() + "_" + Math.floor(Math.random()*1000);
      
      // Append Log
      logSheet.appendRow([
        logId, 
        new Date(payload.date), 
        payload.classId, 
        payload.subjectId, 
        payload.teacherId, 
        "Term1", 
        payload.content || "", 
        payload.homework || "", 
        payload.notes || "", 
        new Date(),
        "Pending", // Default Status
        "" // Supervisor Note
      ]);
  }
  
  // Save Attendance & Private Notes (Upsert Logic)
  if (logId && payload.studentsStatus && payload.studentsStatus.length > 0) {
     const attData = attSheet.getDataRange().getValues();
     // Map of StudentID -> RowIndex for this LogID
     const existingMap = {};
     for (let i = 1; i < attData.length; i++) {
         if (String(attData[i][1]) === String(logId)) {
             existingMap[attData[i][2]] = i + 1; // Store 1-based Row Index
         }
     }
     
     const newRows = [];
     
     const now = new Date();
     // FIX: جمع كل التحديثات أولاً ثم كتابة batch واحد
     const updateRanges = []; // { rowIndex, values }
     
     payload.studentsStatus.forEach(s => {
         const rowIndex = existingMap[s.id];
         if (rowIndex) {
             // تجميع updates بدل كتابتها فوراً
             updateRanges.push({ rowIndex, values: [s.status || "Present", s.note || "", now] });
         } else {
             if ((s.status === 'Present' || !s.status) && !s.note) return;
             newRows.push([
                "A_" + Math.floor(Math.random()*1000000),
                logId, 
                s.id, 
                s.status || "Present", 
                s.note || "", 
                now
             ]);
         }
     });
     
     // FIX: كتابة كل update في Range واحد بدل 3 setValue() لكل طالب
     updateRanges.forEach(u => {
       attSheet.getRange(u.rowIndex, 4, 1, 3).setValues([u.values]);
     });
     
     // Append new rows in batch
     if (newRows.length > 0) {
        if(attSheet.getLastColumn() < 6 && attSheet.getLastRow() === 0) {
            attSheet.appendRow(["Att_ID", "Log_ID", "Student_ID", "Status", "Note", "Timestamp"]);
        }
        attSheet.getRange(attSheet.getLastRow()+1, 1, newRows.length, newRows[0].length).setValues(newRows);
     }
  }
  return { success: true };
}

function getTeacherLogHistory(userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logsSheet = ss.getSheetByName("Daily_Logs");
  const data = logsSheet.getDataRange().getValues();
  
  // Helpers
  const classMap = {}; 
  ss.getSheetByName("Classes").getDataRange().getValues().forEach(r => {
      // Classes Schema: [ID, Name, Number, ...]
      // We want "Name - Number"
      classMap[r[0]] = (r[2]) ? `${r[1]} - ${r[2]}` : r[1];
  });
  const subMap = {}; ss.getSheetByName("Subjects").getDataRange().getValues().forEach(r => subMap[r[0]] = r[1]);
  
  const history = [];
  
  // Iterate backwards to show newest first
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    // Logs Schema: [0:ID, 1:Date, 2:Class, 3:Subj, 4:Teacher, ..., 10:Status]
    if (String(row[4]) === String(userId)) {
      try {
          history.push({
            id: row[0],
            date: new Date(row[1]).toISOString().split('T')[0],
            classId: row[2], // Add ID for robust matching
            subjectId: row[3], // Add ID for robust matching
            className: classMap[row[2]] || row[2],
            subjectName: subMap[row[3]] || row[3],
            content: row[6],
            status: row[10] || "Approved", // Default to Approved if empty
            supervisorNote: row[11] || "" // New Column for Supervisor Note
          });
      } catch (e) {
          // Skip invalid rows
      }
    }
  }
  
  return { success: true, history: history };
}

// ==========================================
// 4. ADMIN MODULE (FULL CRUD)
// ==========================================

// CACHED VERSION - 30 minute cache for lookups (invalidated on writes via _invalidateCache)
function getAdminLookupsCached() {
  const cached = _getFromCache("admin_lookups_v2");
  if (cached) return cached;
  const res = getAdminLookups();
  _saveToCache("admin_lookups_v2", res, 1800); // 30 minutes
  return res;
}

function getAdminLookups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Teachers
  const users = ss.getSheetByName("Users").getDataRange().getValues();
  const teachers = users.filter(r => r[2] === 'Teacher').map(r => ({ id: r[0], name: r[1] }));
  
  // Classes
  const classes = ss.getSheetByName("Classes").getDataRange().getValues();
  const classList = classes.slice(1).map(r => ({ id: r[0], name: r[1], number: r[2] }));
  
  // Subjects
  const subs = ss.getSheetByName("Subjects").getDataRange().getValues();
  const subList = subs.slice(1).map(r => ({ id: r[0], name: r[1] }));

  // Students (For Enrollments)
  const studs = ss.getSheetByName("Students").getDataRange().getValues();
  const studList = studs.slice(1).map(r => ({ id: r[0], name: r[1] }));
  
  return { success: true, teachers, classes: classList, subjects: subList, students: studList };
}

function getAdminStatsCached() {
    const cached = _getFromCache("admin_stats");
    if (cached) return cached;
    const res = getAdminStats();
    _saveToCache("admin_stats", res, 600); // 10 mins
    return res;
}

function getAdminStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const count = (name) => {
      const s = ss.getSheetByName(name);
      return s ? Math.max(0, s.getLastRow() - 1) : 0;
    };
    
    // Count Teachers accurately
    const sheet = ss.getSheetByName("Users");
    const users = sheet ? sheet.getDataRange().getValues() : [];
    const teacherCount = users.filter(r => r[2] === 'Teacher').length;

    // Count Parents
    const parentCount = users.filter(r => r[2] === 'Parent').length;

    return { 
      success: true, 
      stats: { 
        students: count("Students"), 
        teachers: teacherCount, 
        parents: parentCount,
        classes: count("Classes") 
      }
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getAdminActivity(classId, dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logsSheet = ss.getSheetByName("Daily_Logs");
  const attSheet = ss.getSheetByName("Attendance");
  
  if (!logsSheet || !attSheet) return { success: true, logs: [], notes: [] };

  const targetDate = new Date(dateStr).toDateString();
  
  // Helpers/Lookups
  const userMap = {}; ss.getSheetByName("Users").getDataRange().getValues().forEach(r => userMap[r[0]] = r[1]);
  const subMap = {}; ss.getSheetByName("Subjects").getDataRange().getValues().forEach(r => subMap[r[0]] = r[1]);
  const studMap = {}; ss.getSheetByName("Students").getDataRange().getValues().forEach(r => studMap[r[0]] = r[1]);
  const classMap = {}; ss.getSheetByName("Classes").getDataRange().getValues().forEach(r => classMap[r[0]] = r[1]);

  // 1. Get Logs for Class & Date (or ALL classes)
  const allLogs = logsSheet.getDataRange().getValues();
  let classLogs = [];
  
  if (classId === "ALL") {
     classLogs = allLogs.filter(r => new Date(r[1]).toDateString() === targetDate);
  } else {
     classLogs = allLogs.filter(r => r[2] == classId && new Date(r[1]).toDateString() === targetDate);
  }
  
  const logCtx = {}; // LogID -> {Teacher, Class, Subject}

  const mappedLogs = classLogs.map(r => {
    const ctx = {
      teacher: userMap[r[4]] || r[4],
      className: classMap[r[2]] || r[2],
      subject: subMap[r[3]] || r[3]
    };
    logCtx[r[0]] = ctx;

    return {
      id: r[0],
      subject: r[3], 
      teacher: ctx.teacher,
      className: ctx.className, 
      content: r[6],
      homework: r[7]
    };
  });

  // 2. Get Notes/Attendance for these logs
  const logIds = mappedLogs.map(l => l.id);
  const allAtt = attSheet.getDataRange().getValues();
  
  // Filter attendance for these logs, specifically looking for:
  // - Absentees (Status = Absent)
  // - Students with Notes
  const notes = allAtt
    .filter(r => logIds.includes(r[1]) && (r[3] === 'Absent' || (r[4] && r[4] !== "")))
    .map(r => {
      const ctx = logCtx[r[1]] || {};
      return {
        studentId: r[2], 
        studentName: studMap[r[2]] || "Unknown Student",
        status: r[3],
        note: r[4],
        logId: r[1],
        // Context for Global View
        teacherName: ctx.teacher,
        className: ctx.className,
        subjectName: ctx.subject
      };
    });

  return { success: true, logs: mappedLogs, notes: notes };
}

function getPendingLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logsSheet = ss.getSheetByName("Daily_Logs");
  const data = logsSheet.getDataRange().getValues();
  
  // Helpers
  const userMap = {}; ss.getSheetByName("Users").getDataRange().getValues().forEach(r => userMap[r[0]] = r[1]);
  const classMap = {}; ss.getSheetByName("Classes").getDataRange().getValues().forEach(r => classMap[r[0]] = r[1]);
  const subMap = {}; ss.getSheetByName("Subjects").getDataRange().getValues().forEach(r => subMap[r[0]] = r[1]);

  const pending = [];
  
  // 1. Get Pending Logs
  // Start from 1 to skip header
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Logs Schema: [0:ID, 1:Date, 2:Class, 3:Subj, 4:Teacher, 5:Term, 6:Content, 7:HW, 8:Notes, 9:Time, 10:Status]
    if (row[10] === 'Pending') {
      pending.push({
        id: row[0],
        date: new Date(row[1]).toISOString().split('T')[0],
        classId: row[2], // Added ID for editing
        className: classMap[row[2]] || row[2],
        subjectName: subMap[row[3]] || row[3],
        teacherName: userMap[row[4]] || row[4],
        content: row[6],
        homework: row[7],
        notes: row[8],
        attendance: [] // Populated below
      });
    }
  }

  // 2. Attach Attendance Data
  if (pending.length > 0) {
      const attSheet = ss.getSheetByName("Attendance");
      const attData = attSheet.getDataRange().getValues();
      const studMap = {}; ss.getSheetByName("Students").getDataRange().getValues().forEach(r => studMap[r[0]] = r[1]);

      const logIds = pending.map(p => p.id);
      
      // Iterate Attendance
      for (let i = 1; i < attData.length; i++) {
        // Att Schema: [AttID, LogID, StudID, Status, Note, Time]
        const lId = attData[i][1];
        if (logIds.includes(lId)) {
           const pLog = pending.find(p => p.id === lId);
           if (pLog) {
             // Only add if interesting (Absent or Note) OR we might want ALL for editing?
             // User wants to edit "everything". Let's send non-Present items or just fetch all?
             // Fetching ALL for editing is safer but heavier. 
             // Let's send items that exist in Attendance table. 
             // Note: Attendance table usually only has rows for exceptions if we optimized? 
             // Current saveDailyLog saves for submitted students.
             
             pLog.attendance.push({
               attId: attData[i][0],
               studentId: attData[i][2],
               studentName: studMap[attData[i][2]] || "Unknown",
               status: attData[i][3],
               note: attData[i][4]
             });
           }
        }
      }
  }
  
  return { success: true, logs: pending };
}

function reviewLog(payload) {
  // payload: { logId, status, supervisorNote, content, homework, notes, updates }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Daily_Logs");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.logId)) {
      
      // FIX: كتابة Status + SupervisorNote في كتابة واحدة (Col 11 + 12)
      sheet.getRange(i + 1, 11, 1, 2).setValues([
        [payload.status, payload.supervisorNote !== undefined ? payload.supervisorNote : (data[i][11] || "")]
      ]);
      
      // FIX: كتابة Content + HW + Notes في كتابة واحدة (Col 7,8,9)
      if (payload.content !== undefined || payload.homework !== undefined || payload.notes !== undefined) {
        sheet.getRange(i + 1, 7, 1, 3).setValues([[
          payload.content !== undefined ? payload.content : data[i][6],
          payload.homework !== undefined ? payload.homework : data[i][7],
          payload.notes !== undefined ? payload.notes : data[i][8]
        ]]);
      }
        
      // Update Attendance if provided
      if (payload.updates && payload.updates.length > 0) {
           const attSheet = ss.getSheetByName("Attendance");
           const attData = attSheet.getDataRange().getValues();
           
           // FIX: بناء index أولاً بدل البحث المتكرر داخل forEach
           const attIndex = {}; // "logId_studId" -> rowIndex
           for (let k = 1; k < attData.length; k++) {
             attIndex[attData[k][1] + "_" + attData[k][2]] = k + 1; // 1-based
           }
           
           const newAttRows = [];
           
           payload.updates.forEach(upd => {
             const key = String(payload.logId) + "_" + String(upd.studentId);
             const existingRow = attIndex[key];
             
             if (existingRow) {
                // FIX: كتابة الحقلين في Range واحد
                attSheet.getRange(existingRow, 4, 1, 2).setValues([[upd.status, upd.note || ""]]);
             } else {
                newAttRows.push([
                  "A_" + Math.floor(Math.random()*1000000),
                  payload.logId,
                  upd.studentId,
                  upd.status,
                  upd.note || "",
                  new Date()
                ]);
             }
           });
           
           // Batch append new rows
           if (newAttRows.length > 0) {
             attSheet.getRange(attSheet.getLastRow()+1, 1, newAttRows.length, newAttRows[0].length).setValues(newAttRows);
           }
      }
      
      return { success: true, message: "Log " + payload.status };
    }
  }
  return { success: false, message: "Log not found" };
}

function _getSheetName(type) {
  if (type === "Users") return "Users";
  if (type === "Classes") return "Classes";
  if (type === "Allocations") return "Teacher_Allocations";
  if (type === "Subjects") return "Subjects";
  if (type === "Students") return "Students";
  if (type === "Enrollments") return "Enrollments";
  return null;
}

function adminGetData(type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = _getSheetName(type);
  if (!sheetName) return { success: false, message: "Invalid Type" };
  
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: true, header: [], data: [] }; // Handle missing sheet gracefully
  if (sheet.getLastRow() === 0) return { success: true, header: [], data: [] };
  
  const rows = sheet.getDataRange().getValues();
  return { success: true, header: rows[0], data: rows.slice(1) };
}

function adminSaveData(type, rowData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = _getSheetName(type);
  const sheet = ss.getSheetByName(sheetName);
  
  // 1. ID Generation (Col 0)
  if (!rowData[0] || rowData[0] === "AUTO") {
    const prefix = {
      'Users': 'U_', 'Classes': 'C_', 'Subjects': 'SUB_', 'Allocations': 'AL_', 'Enrollments': 'E_'
    }[type] || 'ID_';
    rowData[0] = prefix + Date.now();
  }

  // 2. Specialized Logic
  if (type === "Subjects") {
    // Row: [ID, ArabicName, EnglishName]
    // If English Name (Col 2) is empty, generate it
    if (!rowData[2]) {
      try {
        rowData[2] = LanguageApp.translate(rowData[1], 'ar', 'en');
      } catch (e) {
        rowData[2] = rowData[1]; // Fallback
      }
    }
  }

  if (type === "Allocations") {
    // Row: [ID, Teacher, Class, Subject, Year]
    // Set Year (Col 4) if empty
    if (!rowData[4]) rowData[4] = new Date().getFullYear();
  }
  
  if (type === "Classes") {
      // Ensure we have enough columns for [ID, Name, Number]
      // If user sends less, fill with empty
      while(rowData.length < 3) rowData.push("");
  }

  sheet.appendRow(rowData);

  // Invalidate teacher class cache if this is an Allocation
  if (type === "Allocations" && rowData[1]) {
    try {
      const cache = CacheService.getScriptCache();
      cache.remove("t_classes_" + String(rowData[1]));
    } catch(e) {}
  }

  _invalidateDataCaches();
  return { success: true, message: "تم الحفظ بنجاح" };
}

function adminUpdateData(type, id, newData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = _getSheetName(type);
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      // Update the row. Ensure we don't overwrite ID if not intended, but usually we prefer overwriting whole row.
      // newData should correspond to columns.
      // NOTE: newData array length must match sheet columns theoretically.
      // We assume newData is full row array except maybe ID, or includes ID.
      
      const range = sheet.getRange(i + 1, 1, 1, newData.length);
      range.setValues([newData]);
      return { success: true, message: "تم التعديل بنجاح" };
    }
  }
  return { success: false, message: "العنصر غير موجود" };
}

function adminDeleteData(type, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = _getSheetName(type);
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      // Save teacherId before deleting (for cache invalidation)
      const teacherId = (type === "Allocations") ? String(data[i][1]) : null;
      sheet.deleteRow(i + 1);

      // Invalidate teacher class cache if this is an Allocation
      if (teacherId) {
        try {
          const cache = CacheService.getScriptCache();
          cache.remove("t_classes_" + teacherId);
        } catch(e) {}
      }

      _invalidateDataCaches();
      return { success: true, message: "تم الحذف بنجاح" };
    }
  }
  return { success: false, message: "العنصر غير موجود" };
}

function adminBulkUpdateEnrollments(payload) {
  // payload: { enrollmentIds: ['E_123', 'E_456'], newClassId: 'C_789' }
  const ids = payload.enrollmentIds;
  const newClassId = payload.newClassId;
  
  if (!ids || !ids.length || !newClassId) return { success: false, message: "بيانات غير مكتملة" };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Enrollments");
  if (!sheet) return { success: false, message: "جدول التسجيل غير موجود" };

  const data = sheet.getDataRange().getValues();
  // Col 0: ID
  // Col 1: Student
  // Col 2: Class
  
  // Optimized Bulk Update: O(N) Read -> O(1) Write
  // Instead of updating row by row, we update the entire column in one go.
  // This is much faster for large datasets.
  
  const range = sheet.getRange(2, 3, data.length - 1, 1); // Get all Class IDs (Col 3, excluding header)
  const currentClasses = range.getValues();
  
  let updateCount = 0;
  
  // Transform IDs array to a Set for O(1) lookup
  const targetIds = new Set(ids);
  
  // Iterate through all rows in memory
  for (let i = 0; i < data.length - 1; i++) {
    const rowId = String(data[i + 1][0]); // data includes header, so +1
    if (targetIds.has(rowId)) {
      currentClasses[i][0] = newClassId;
      updateCount++;
    }
  }

  if (updateCount > 0) {
    range.setValues(currentClasses); // Batch Write
  }

  return { success: true, message: `تم تحديث ${updateCount} طالب بنجاح` };
}

/**
 * AUTO-ARCHIVE SYSTEM
 * Moves logs older than 7 days to 'Archive_Logs' sheet.
 * Should be triggered by a Time-Driven Trigger (Weekly or Daily).
 */
function archiveOldLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheetName = "DailyLogs"; // Ensure this matches your log sheet name
  const archiveSheetName = "Archive_Logs";
  
  const mainSheet = ss.getSheetByName(mainSheetName);
  if (!mainSheet) return "No DailyLogs Sheet";
  
  let archiveSheet = ss.getSheetByName(archiveSheetName);
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet(archiveSheetName);
    // Copy header
    const header = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues();
    archiveSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).setValues(header);
  }
  
  const data = mainSheet.getDataRange().getValues();
  if (data.length <= 1) return "No data to archive";
  
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 Days ago
  
  const rowsToArchive = [];
  const rowsToKeep = [data[0]]; // Header
  
  // DailyLogs Structure: [LogID (0), Date (1), Class (2), Subj (3), Teacher (4), ...]
  // So Date is Index 1.
  
  for (let i = 1; i < data.length; i++) {
    const rowDate = new Date(data[i][1]);
    if (rowDate < cutoffDate) {
      rowsToArchive.push(data[i]);
    } else {
      rowsToKeep.push(data[i]);
    }
  }

  // Batch Operations
  if (rowsToArchive.length > 0) {
    // 1. Append to Archive
    archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, rowsToArchive.length, rowsToArchive[0].length)
                .setValues(rowsToArchive);
                
    // 2. Clear Main Sheet and Rewrite Kept Rows
    // We rewrite the whole sheet because deleting random rows is slow and complex (indices shift)
    // Writing optimal for vacuuming.
    mainSheet.clearContents();
    mainSheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
    
    return `Archived ${rowsToArchive.length} logs. Kept ${rowsToKeep.length - 1} logs.`;
  }

  return "No old logs found to archive.";
}



// ==========================================
// 5. STUDENT & PARENT MANAGEMENT MODULE
// ==========================================

/**
 * Get comprehensive student list with parent and class information
 * Returns all students with their enrollment and parent details
 */
function getStudentsManagement() {
  const cached = _getFromCache("stud_mgmt");
  if (cached) return cached;
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentsSheet = ss.getSheetByName("Students");
    const enrollmentsSheet = ss.getSheetByName("Enrollments");
    const classesSheet = ss.getSheetByName("Classes");
    
    if (!studentsSheet) return { success: false, message: "Students sheet not found" };
    
    const studentsData = studentsSheet.getDataRange().getValues();
    const enrollmentsData = enrollmentsSheet ? enrollmentsSheet.getDataRange().getValues() : [];
    const classesData = classesSheet ? classesSheet.getDataRange().getValues() : [];
    
    // Build class map: classId -> className
    const classMap = {};
    for (let i = 1; i < classesData.length; i++) {
      const classId = classesData[i][0];
      const className = classesData[i][1];
      const classNumber = classesData[i][2];
      classMap[classId] = className + (classNumber ? " - " + classNumber : "");
    }
    
    // Build enrollment map: studentId -> { classId, className, enrollmentId }
    const enrollmentMap = {};
    for (let i = 1; i < enrollmentsData.length; i++) {
      const enrollmentId = enrollmentsData[i][0];
      const studentId = enrollmentsData[i][1];
      const classId = enrollmentsData[i][2];
      enrollmentMap[studentId] = {
        enrollmentId: enrollmentId,
        classId: classId,
        className: classMap[classId] || "غير مسجل"
      };
    }
    
    // Build student list
    const students = [];
    for (let i = 1; i < studentsData.length; i++) {
      const studentId = studentsData[i][0];
      const studentName = studentsData[i][1];
      const parentPhone = studentsData[i][2] || "";
      
      const enrollment = enrollmentMap[studentId] || { enrollmentId: "", classId: "", className: "غير مسجل" };
      
      students.push({
        id: studentId,
        name: studentName,
        parentPhone: parentPhone,
        className: enrollment.className,
        classId: enrollment.classId,
        enrollmentId: enrollment.enrollmentId
      });
    }
    
    const res = { success: true, students: students };
    _saveToCache("stud_mgmt", res, 300); // 5 minutes
    return res;
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

/**
 * Get parent list with all linked students
 * Aggregates students by parent phone number
 */
function getParentsManagement() {
  const cached = _getFromCache("par_mgmt");
  if (cached) return cached;
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentsSheet = ss.getSheetByName("Students");
    const usersSheet = ss.getSheetByName("Users");
    
    if (!studentsSheet) return { success: false, message: "Students sheet not found" };
    
    const studentsData = studentsSheet.getDataRange().getValues();
    const usersData = usersSheet ? usersSheet.getDataRange().getValues() : [];
    
    // Build parent name map: phone -> name  
    const parentNameMap = {};
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][2] === "Parent") {
        const phone = normalizePhone(usersData[i][3]);
        const name = usersData[i][1];
        parentNameMap[phone] = name;
      }
    }
    
    // Aggregate students by parent phone
    const parentStudentsMap = {};
    for (let i = 1; i < studentsData.length; i++) {
      const studentId = studentsData[i][0];
      const studentName = studentsData[i][1];
      const parentPhone = studentsData[i][2];
      
      if (parentPhone && parentPhone !== "") {
        const normalizedPhone = normalizePhone(parentPhone);
        if (!parentStudentsMap[normalizedPhone]) {
          parentStudentsMap[normalizedPhone] = {
            phone: parentPhone,
            normalizedPhone: normalizedPhone,
            name: parentNameMap[normalizedPhone] || "ولي أمر",
            students: []
          };
        }
        parentStudentsMap[normalizedPhone].students.push({
          id: studentId,
          name: studentName
        });
      }
    }
    
    const parents = Object.values(parentStudentsMap);
    const res = { success: true, parents: parents };
    _saveToCache("par_mgmt", res, 300); // 5 minutes
    return res;
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

/**
 * Update student profile information
 * Updates name and parent phone in Students sheet
 */
function updateStudent(studentId, name, parentPhone) {
  try {
    if (!studentId || !name) {
      return { success: false, message: "Student ID and name are required" };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Students");
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(studentId)) {
        // FIX: كتابة Name + ParentPhone في batch واحد بدل setValue منفردة
        const newPhone = parentPhone !== undefined ? (parentPhone || "") : data[i][2];
        sheet.getRange(i + 1, 2, 1, 2).setValues([[name, newPhone]]);
        _invalidateDataCaches();
        return { success: true, message: "تم تحديث بيانات الطالب بنجاح" };
      }
    }
    
    return { success: false, message: "الطالب غير موجود" };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

/**
 * Delete student record
 * Removes student from Students sheet and cascades to Enrollments
 */
function deleteStudent(studentId) {
  try {
    if (!studentId) return { success: false, message: "Student ID is required" };
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentsSheet = ss.getSheetByName("Students");
    const enrollmentsSheet = ss.getSheetByName("Enrollments");
    
    const studentsData = studentsSheet.getDataRange().getValues();
    let studentFound = false;
    for (let i = 1; i < studentsData.length; i++) {
      if (String(studentsData[i][0]) === String(studentId)) {
        studentsSheet.deleteRow(i + 1);
        studentFound = true;
        break;
      }
    }
    
    if (!studentFound) return { success: false, message: "الطالب غير موجود" };
    
    // Cascade delete from Enrollments
    if (enrollmentsSheet) {
      const enrollmentsData = enrollmentsSheet.getDataRange().getValues();
      for (let i = enrollmentsData.length - 1; i >= 1; i--) {
        if (String(enrollmentsData[i][1]) === String(studentId)) {
          enrollmentsSheet.deleteRow(i + 1);
        }
      }
    }
    
    _invalidateDataCaches();
    return { success: true, message: "تم حذف الطالب بنجاح" };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

/**
 * Link a parent to a student
 * Updates student's parent phone and optionally creates parent user
 */
function linkParentToStudent(studentId, parentPhone) {
  try {
    if (!studentId || !parentPhone) {
      return { success: false, message: "Student ID and parent phone are required" };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentsSheet = ss.getSheetByName("Students");
    const usersSheet = ss.getSheetByName("Users");
    
    const studentsData = studentsSheet.getDataRange().getValues();
    let studentFound = false;
    for (let i = 1; i < studentsData.length; i++) {
      if (String(studentsData[i][0]) === String(studentId)) {
        studentsSheet.getRange(i + 1, 3).setValue(parentPhone);
        studentFound = true;
        break;
      }
    }
    
    if (!studentFound) return { success: false, message: "الطالب غير موجود" };
    
    // Check if parent user exists, if not create one
    const normalizedPhone = normalizePhone(parentPhone);
    const usersData = usersSheet.getDataRange().getValues();
    let parentExists = false;
    for (let i = 1; i < usersData.length; i++) {
      if (normalizePhone(usersData[i][3]) === normalizedPhone) {
        parentExists = true;
        break;
      }
    }
    
    if (!parentExists) {
      const newParentId = "U_" + Date.now();
      usersSheet.appendRow([newParentId, "ولي أمر", "Parent", parentPhone, "123456", "Yes"]);
    }
    
    _invalidateDataCaches();
    return { success: true, message: "تم ربط ولي الأمر بالطالب بنجاح" };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

/**
 * Unlink parent from student
 * Removes parent phone from student record
 */
function unlinkParentFromStudent(studentId) {
  try {
    if (!studentId) {
      return { success: false, message: "Student ID is required" };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Students");
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(studentId)) {
        sheet.getRange(i + 1, 3).setValue(""); // Clear ParentPhone
        return { success: true, message: "تم إلغاء ربط ولي الأمر بنجاح" };
      }
    }
    
    return { success: false, message: "الطالب غير موجود" };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

/**
 * Reassign student to a different parent
 * Updates student's parent phone to new parent
 */
function reassignParent(studentId, newParentPhone) {
  try {
    if (!studentId || !newParentPhone) {
      return { success: false, message: "Student ID and new parent phone are required" };
    }
    
    // Reuse linkParentToStudent logic
    return linkParentToStudent(studentId, newParentPhone);
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

/**
 * Update parent profile information
 * Updates name and phone in Users sheet (and optionally password if needed, but here just basic info)
 */
function updateParent(currentPhone, newName, newPhone, newPassword) {
  try {
    if (!currentPhone || !newName || !newPhone) {
      return { success: false, message: "Missing required fields" };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Users");
    const data = sheet.getDataRange().getValues();
    
    const normalizedCurrent = normalizePhone(currentPhone);
    const normalizedNew = normalizePhone(newPhone);
    
    if (normalizedCurrent !== normalizedNew) {
       for (let i = 1; i < data.length; i++) {
         if (normalizePhone(data[i][3]) === normalizedNew && data[i][2] === 'Parent') {
           return { success: false, message: "رقم الهاتف الجديد مستخدم بالفعل لولي أمر آخر" };
         }
       }
    }
    
    let parentFound = false;
    for (let i = 1; i < data.length; i++) {
      if (normalizePhone(data[i][3]) === normalizedCurrent && data[i][2] === 'Parent') {
        // FIX: كتابة Name + Phone (و Password إذا طلب) في batch
        const newPass = (newPassword && newPassword.trim() !== "") ? newPassword : data[i][4];
        // Cols: 1=ID, 2=Name, 3=Role, 4=Phone, 5=Pass, 6=Active
        // setValues for cols 2-5 (Name, Role, Phone, Pass)
        sheet.getRange(i + 1, 2, 1, 4).setValues([[newName, data[i][2], newPhone, newPass]]);
        
        if (normalizedCurrent !== normalizedNew) {
           const studSheet = ss.getSheetByName("Students");
           const studs = studSheet.getDataRange().getValues();
           // تجميع الصفوف التي تحتاج تحديث وعمل batch update
           const studUpdates = [];
           for (let j = 1; j < studs.length; j++) {
              if (normalizePhone(studs[j][2]) === normalizedCurrent) {
                studUpdates.push({ rowIndex: j + 1 });
              }
           }
           studUpdates.forEach(u => {
             studSheet.getRange(u.rowIndex, 3).setValue(newPhone);
           });
        }
        parentFound = true;
        break;
      }
    }
    
    if (!parentFound) return { success: false, message: "ولي الأمر غير موجود" };
    
    _invalidateDataCaches();
    return { success: true, message: "تم تحديث بيانات ولي الأمر بنجاح" };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

// ==========================================
// 6. ANNOUNCEMENTS MODULE
// ==========================================

// function getStudentReportCard(studentId) { ... } // Reverted

// ==========================================
// 7. HELPERS
// ==========================================

function normalizePhone(p) {
  if (!p) return "";
  let s = String(p).trim().replace(/[\s-]/g, '');
  // Egypt specific: remove +20 or 0020
  if (s.startsWith("+20")) s = s.substring(3);
  if (s.startsWith("0020")) s = s.substring(4);
  // Remove leading zero if exists and len > 10
  if (s.length === 11 && s.startsWith("0")) s = s.substring(1);
  return s; 
}

// ---------------------------
// CACHE HELPERS
// ---------------------------
function _saveToCache(key, data, seconds) {
  try {
    const cache = CacheService.getScriptCache();
    // CacheService value limit is 100KB. Data might be large.
    // If large, we might skip caching or chunk it. For now simple JSON.
    const val = JSON.stringify(data);
    if (val.length < 100000) {
       cache.put(key, val, seconds);
    }
  } catch (e) {
    console.error("Cache Put Error", e);
  }
}

function _getFromCache(key) {
  try {
    const cache = CacheService.getScriptCache();
    const json = cache.get(key);
    if (json) {
      return JSON.parse(json);
    }
  } catch (e) {
    console.error("Cache Get Error", e);
  }
  return null;
}

/**
 * Invalidate data caches after write operations.
 * Call this after any function that modifies Students, Users, Enrollments, or Permissions.
 */
function _invalidateDataCaches() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll([
      "stud_mgmt",
      "par_mgmt",
      "admin_stats",
      "admin_lookups_v2"
    ]);
  } catch (e) {
    console.error("Cache Invalidation Error", e);
  }
}

// ==========================================
// 5. WARNINGS MODULE
// ==========================================

function addWarning(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Warnings");
  if (!sheet) {
    sheet = ss.insertSheet("Warnings");
    sheet.appendRow(["WarningID", "StudentID", "Type", "Details", "Date", "CreatedBy"]);
  }
  
  const id = "W_" + Date.now();
  const date = new Date();
  
  sheet.appendRow([
    id,
    payload.studentId,
    payload.type,
    payload.details,
    date,
    payload.createdBy || "Admin"
  ]);
  
  return { success: true, warningId: id };
}

function getStudentWarnings(studentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Warnings");
  if (!sheet) return { success: true, warnings: [] };
  
  const data = sheet.getDataRange().getValues();
  const list = [];
  
  // Iterate backwards for newest first
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(studentId)) {
      list.push({
        id: data[i][0],
        studentId: data[i][1],
        type: data[i][2],
        details: data[i][3],
        date: new Date(data[i][4]).toISOString().split('T')[0],
        createdBy: data[i][5]
      });
    }
  }
  
  return { success: true, warnings: list };
}

function deleteWarning(warningId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Warnings");
  if (!sheet) return { success: false, message: "No warnings sheet" };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(warningId)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "Warning not found" };
}

// ==========================================
// SUPERVISOR PERMISSIONS
// ==========================================

function getSupervisorPermissions(userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Supervisor_Permissions");
  if (!sheet) {
    sheet = ss.insertSheet("Supervisor_Permissions");
    sheet.appendRow(["SupervisorID", "Type", "TargetID", "CreatedAt"]); // Header
  }
  
  const data = sheet.getDataRange().getValues();
  const perms = [];
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      perms.push({ type: data[i][1], targetId: data[i][2] });
    }
  }
  
  return { success: true, permissions: perms };
}

function saveSupervisorPermissions(userId, permissions) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Supervisor_Permissions");
  if (!sheet) {
    sheet = ss.insertSheet("Supervisor_Permissions");
    sheet.appendRow(["SupervisorID", "Type", "TargetID", "CreatedAt"]);
  }
  
  // Filter out existing for this user
  const data = sheet.getDataRange().getValues();
  const keep = [];
  
  // Header - Always enforce consistent header
  keep.push(["SupervisorID", "Type", "TargetID", "CreatedAt"]);
  
  // Process existing rows (skip header)
  for (let i = 1; i < data.length; i++) {
    // If not the user we are updating, keep the row
    if (String(data[i][0]) !== String(userId)) {
      // Ensure row has exactly 4 columns to avoid "row validation" errors
      const row = [
        data[i][0], 
        data[i][1], 
        data[i][2], 
        data[i][3] || ""
      ];
      keep.push(row);
    }
  }
  
  // Add New Permissions for this user
  const now = new Date();
  permissions.forEach(p => {
    keep.push([userId, p.type, p.targetId, now]);
  });
  
  // Write back to sheet
  sheet.clear();
  if (keep.length > 0)
    sheet.getRange(1, 1, keep.length, 4).setValues(keep);
    
  return { success: true };
}

function getSupervisorData(userId) {
  // 1. Get Permissions (includes module permissions too)
  const pRes = getSupervisorPermissions(userId);
  const perms = pRes.permissions || [];
  
  const classIds = perms.filter(p => p.type === 'Class').map(p => String(p.targetId));
  const teacherIds = perms.filter(p => p.type === 'Teacher').map(p => String(p.targetId));
  
  // 2. Batch Fetch: read all sheets at once
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const classSheet = ss.getSheetByName("Classes");
  const userSheet = ss.getSheetByName("Users");
  const subSheet = ss.getSheetByName("Subjects");
  
  const allClasses = classSheet ? classSheet.getDataRange().getValues().slice(1)
    .map(r => ({ id: r[0], name: r[1], number: r[2] })) : [];
    
  const allTeachers = userSheet ? userSheet.getDataRange().getValues().slice(1)
    .filter(r => r[2] === 'Teacher')
    .map(r => ({ id: r[0], name: r[1] })) : [];
    
  const subjects = subSheet ? subSheet.getDataRange().getValues().slice(1)
    .map(r => ({ id: r[0], name: r[1] })) : [];

  // Filter to assigned only
  const myClasses = classIds.length > 0 ? allClasses.filter(c => classIds.includes(String(c.id))) : allClasses;
  const myTeachers = teacherIds.length > 0 ? allTeachers.filter(t => teacherIds.includes(String(t.id))) : allTeachers;
  
  return {
    success: true,
    classes: myClasses,
    teachers: myTeachers,
    subjects: subjects,
    permissions: perms, // ← Return ALL permissions (including Module type) for frontend use
    stats: {
        classes: myClasses.length,
        teachers: myTeachers.length
    }
  };
}
