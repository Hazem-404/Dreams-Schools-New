/**
 * Dreams Schools - Database Setup Script
 * Use this script to assume control of a blank Google Sheet and build the database structure.
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into Code.gs.
 * 4. Run the function 'setupDatabase'.
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Settings & Config
  createSheet(ss, "Config", ["Key", "Value", "Description"]);
  createSheet(ss, "Academic_Years", ["year_id", "name", "start_date", "end_date", "is_active"]);
  createSheet(ss, "Terms", ["term_id", "year_id", "name", "start_date", "end_date"]);

  // 2. People & Auth
  createSheet(ss, "Users", ["user_id", "full_name", "role", "username_phone", "password", "is_active", "created_at"]);
  createSheet(ss, "Students", ["student_id", "full_name", "parent_phone", "dob", "gender", "notes"]);
  
  // 3. Academic Structure
  createSheet(ss, "Classes", ["class_id", "class_name", "grade_level"]);
  createSheet(ss, "Subjects", ["subject_id", "subject_name_ar", "subject_name_en"]);
  
  // 4. Relationships (The Glue)
  createSheet(ss, "Enrollments", ["enrollment_id", "student_id", "class_id", "year_id"]); // Links Student -> Class per Year
  createSheet(ss, "Teacher_Allocations", ["allocation_id", "teacher_user_id", "class_id", "subject_id", "year_id"]);

  // 5. Daily Operations (Transactional)
  createSheet(ss, "Daily_Logs", ["log_id", "date", "class_id", "subject_id", "teacher_id", "term_id", "biography", "homework", "notes", "timestamp"]);
  createSheet(ss, "Attendance", ["attendance_id", "log_id", "student_id", "status", "timestamp"]); // Status: Present, Absent, Late
  createSheet(ss, "Behavior", ["behavior_id", "student_id", "date", "type", "description", "teacher_id"]); // Type: Positive, Negative

  // 6. Future Modules (Grading)
  createSheet(ss, "Exam_Definitions", ["exam_id", "title", "term_id", "subject_id", "max_score"]);
  createSheet(ss, "Grades", ["grade_id", "student_id", "exam_id", "score", "teacher_comment"]);

  // 7. System Lists (Dropdowns helper)
  createSheet(ss, "Lists", ["Type", "Value"]); // e.g., Grade Levels, Behavior Types

  Logger.log("Database Setup Complete!");
}

/**
 * Helper to create a sheet if it doesn't exist, and set the header row.
 */
function createSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  } else {
    sheet.clear(); // Safety: Clear if exists to reset structure (Use with caution in production!)
  }
  
  // Set Headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Formatting
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#EFEFEF");
  sheet.setFrozenRows(1);
}

/**
 * OPTIONAL: Populate some dummy data for testing
 */
function populateDummyData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Config
  const config = ss.getSheetByName("Config");
  config.appendRow(["School_Name", "Dreams Schools", "System Name"]);
  
  // Year
  const years = ss.getSheetByName("Academic_Years");
  years.appendRow(["Y_2024", "2023-2024", "2023-09-01", "2024-06-30", "TRUE"]);
  
  // Users (Admin)
  const users = ss.getSheetByName("Users");
  users.appendRow(["U_001", "System Admin", "admin", "01000000000", "123456", "TRUE", new Date()]);
  
  // Classes
  const classes = ss.getSheetByName("Classes");
  classes.appendRow(["C_1A", "1/A", "Grade 1"]);
  classes.appendRow(["C_1B", "1/B", "Grade 1"]);
}

