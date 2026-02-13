/**
 * Dreams Schools - Debug Utilities
 * Use these functions to quickly populate test data.
 */

function createTestTeacherAndAllocation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Create Teacher User
  const usersSheet = ss.getSheetByName("Users");
  const teacherPhone = "01011112222";
  const teacherId = "T_DEMO_01";
  
  // Check if exists
  const textFinder = usersSheet.createTextFinder(teacherPhone);
  if (!textFinder.findNext()) {
    usersSheet.appendRow([
      teacherId,
      "أستاذ تجريبي (Demo Teacher)",
      "Teacher",
      teacherPhone,
      "123456", // Password
      "TRUE",
      new Date()
    ]);
    Logger.log("Teacher Created: " + teacherPhone);
  } else {
    Logger.log("Teacher already exists.");
  }

  // 2. Ensure we have a Class and Subject
  const classSheet = ss.getSheetByName("Classes");
  let classId = "";
  if (classSheet.getLastRow() > 1) {
    classId = classSheet.getRange(2, 1).getValue(); // Pick first class
  } else {
    classId = "C_TEST";
    classSheet.appendRow([classId, "1/A", "Primary"]);
  }

  const subSheet = ss.getSheetByName("Subjects");
  let subId = "";
  if (subSheet.getLastRow() > 1) {
    subId = subSheet.getRange(2, 1).getValue(); // Pick first subject
  } else {
    subId = "SUB_MATH";
    subSheet.appendRow([subId, "الرياضيات (Math)", "Math"]);
  }

  // 3. Allocate Teacher to Class/Subject
  const allocSheet = ss.getSheetByName("Teacher_Allocations");
  allocSheet.appendRow([
    "ALL_" + Math.floor(Math.random() * 1000),
    teacherId,
    classId,
    subId,
    "Y_2024"
  ]);
  
  Logger.log("Allocation Created! Teacher can now see Class " + classId);
  return "Done! Login with Phone: " + teacherPhone + " / Pass: 123456";
}

