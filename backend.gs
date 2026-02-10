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
    
    // Admin CRUD
    else if (action === "adminGetData") result = adminGetData(payload.type); 
    else if (action === "adminSaveData") result = adminSaveData(payload.type, payload.data);
    else if (action === "adminUpdateData") result = adminUpdateData(payload.type, payload.id, payload.data);
    else if (action === "adminDeleteData") result = adminDeleteData(payload.type, payload.id);

    else if (action === "getAdminActivity") result = getAdminActivity(payload.classId, payload.date);
    // Cached Lookups
    else if (action === "getAdminLookups") result = getAdminLookupsCached();
    
    // Admin Stats
    else if (action === "getAdminStats") result = getAdminStatsCached();
    
    // Announcement & Exams (REMOVED)
    // kept as placeholders if needed, but logic removed to optimize script size/load
    
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
  
  // 1. Load Classes Map
  const classMap = {};
  ss.getSheetByName("Classes").getDataRange().getValues().forEach(r => classMap[r[0]] = r[1]);
  
  // 2. Load Student Allocations (Enrollments)
  const studClassMap = {};
  ss.getSheetByName("Enrollments").getDataRange().getValues().forEach(r => studClassMap[r[1]] = classMap[r[2]]);

  // 3. Find Children by Phone
  const studs = ss.getSheetByName("Students").getDataRange().getValues();
  const kids = [];
  const pPhone = normalizePhone(phone);
  
  for (let i = 1; i < studs.length; i++) {
    // Students Schema: [ID, Name, ParentPhone, ...]
    if (normalizePhone(studs[i][2]) === pPhone) {
      kids.push({ 
        id: studs[i][0], 
        name: studs[i][1], 
        className: studClassMap[studs[i][0]] || "غير مسجل" 
      });
    }
  }
  
  const res = { success: true, children: kids };
  _saveToCache(cacheKey, res, 1800); // 30 mins
  return res;
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
    // Logs Schema: [LogID, Date, ClassID, SubID, TeacherID, Term, Content, HW, Notes, Timestamp]
    if(r[2] != classId) continue;
    
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
  return { success: true, report: report };
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
  
  const cMap = {}; classes.forEach(r => cMap[r[0]] = r[1]);
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
  
  const sIds = enroll.filter(r => r[2] == classId).map(r => r[1]);
  const result = studs
    .filter(r => sIds.includes(r[0]))
    .map(r => ({ id: r[0], name: r[1] }));
    
  return { success: true, students: result };
}

function saveDailyLog(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("Daily_Logs");
  const attSheet = ss.getSheetByName("Attendance");
  
  const logId = "L_" + Date.now() + "_" + Math.floor(Math.random()*1000);
  
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
    new Date()
  ]);
  
  // Save Attendance & Private Notes
  if (payload.studentsStatus && payload.studentsStatus.length > 0) {
    const rows = payload.studentsStatus.map(s => [
      "A_" + Math.floor(Math.random()*1000000),
      logId, 
      s.id, 
      s.status || "Present", 
      s.note || "", 
      new Date()
    ]);
    
    // Ensure header if empty
    if(attSheet.getLastColumn() < 6 && attSheet.getLastRow() === 0) {
        attSheet.appendRow(["Att_ID", "Log_ID", "Student_ID", "Status", "Note", "Timestamp"]);
    }
    
    if (rows.length > 0) {
       attSheet.getRange(attSheet.getLastRow()+1, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
  return { success: true };
}

// ==========================================
// 4. ADMIN MODULE (FULL CRUD)
// ==========================================

// CACHED VERSION
function getAdminLookupsCached() {
  const cached = _getFromCache("admin_lookups");
  if (cached) return cached;
  
  const res = getAdminLookups();
  _saveToCache("admin_lookups", res, 21600); // 6 Hours
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
  
  return { success: true, teachers, classes: classList, subjects: subList };
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

function _getSheetName(type) {
  if (type === "Users") return "Users";
  if (type === "Classes") return "Classes";
  if (type === "Allocations") return "Teacher_Allocations";
  if (type === "Subjects") return "Subjects";
  if (type === "Students") return "Students";
  return null;
}

function adminGetData(type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = _getSheetName(type);
  if (!sheetName) return { success: false, message: "Invalid Type" };
  
  const sheet = ss.getSheetByName(sheetName);
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
      'Users': 'U_', 'Classes': 'C_', 'Subjects': 'SUB_', 'Allocations': 'AL_'
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
      sheet.deleteRow(i + 1);
      return { success: true, message: "تم الحذف بنجاح" };
    }
  }
  return { success: false, message: "العنصر غير موجود" };
}

// ==========================================
// 5. ANNOUNCEMENTS MODULE
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
