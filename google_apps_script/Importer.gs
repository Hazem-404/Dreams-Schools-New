/**
 * Dreams Schools - Data Importer (Optimized & Clean)
 * Automatically clears OLD data, then imports new data.
 * Uses batch processing.
 * 
 * Instructions:
 * 1. Create a sheet named "Import_Source".
 * 2. Header Row must be: StudentName | Branch | Grade | Class | DOB | FatherName | Job | Phone | Address
 * 3. Paste your data.
 * 4. Run `importStudentsAndParents`.
 */

function importStudentsAndParents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("Import_Source");
  if (!sourceSheet) {
    SpreadsheetApp.getUi().alert("Please create a sheet named 'Import_Source' first!");
    return;
  }

  // Target Sheets
  const sheetUsers = ss.getSheetByName("Users");
  const sheetStudents = ss.getSheetByName("Students");
  const sheetEnrollments = ss.getSheetByName("Enrollments");
  const sheetClasses = ss.getSheetByName("Classes");

  // --- 0. CLEANUP OLD DATA ---
  // Clear Sheets (Use clear() instead of deleteRows to avoid 'non-frozen rows' error)
  
  // Clear Students, Enrollments (Fresh Start for Students)
  if (sheetStudents.getLastRow() > 1) {
    sheetStudents.getRange(2, 1, sheetStudents.getLastRow() - 1, sheetStudents.getLastColumn()).clear();
  }
  if (sheetEnrollments.getLastRow() > 1) {
    sheetEnrollments.getRange(2, 1, sheetEnrollments.getLastRow() - 1, sheetEnrollments.getLastColumn()).clear();
  }
  
  // NOTE: We DO NOT clear Classes because they might be linked to Teachers/Subjects already.
  // We will only append NEW classes if they don't exist.
  // if (sheetClasses.getLastRow() > 1) { ... }
  
  // --- 4. PRESERVE USERS (Teachers/Admins) ---
  // We do NOT clear users anymore.
  // if (sheetUsers.getLastRow() > 1) {
  //   sheetUsers.getRange(2, 1, sheetUsers.getLastRow() - 1, sheetUsers.getLastColumn()).clear();
  // }

  // Restore Default Admin (Only if strictly empty, but likely users exist now)
  const usersData = sheetUsers.getDataRange().getValues();
  if (usersData.length <= 1) { // No admin found
    sheetUsers.appendRow(["U_001", "System Admin", "admin", "01000000000", "123456", "TRUE", new Date()]);
  }

  // --- 1. START IMPORT ---
  // Get Data (assuming row 1 is header)
  const data = sourceSheet.getDataRange().getValues();
  // Remove header
  data.shift();

  // Cache existing data (should be empty now except Admin)
  const existingUsers = getColumnMap(sheetUsers, 3); // Phone is col 4 (index 3)
  const existingClasses = getClassMap(sheetClasses); // Key: "Grade-Class"

  // Config
  const currentById = "Y_2024"; // Default Year ID
  const defaultPass = "123456";

  // Arrays for batch writing
  const newUsers = [];
  const newStudents = [];
  const newEnrollments = [];

  // Temporary caches for newly created items
  const tempNewUsers = {};
  // const tempNewClasses = {}; // No longer creating classes

  data.forEach(row => {
    // 0:Name, 1:Branch, 2:Grade, 3:Class, 4:DOB, 5:FatherName, 6:Job, 7:Phone, 8:Address
    const sName = row[0];
    const sGrade = row[2];
    const sClassVal = row[3];
    const sDOB = row[4];
    const pName = row[5];
    let pPhone = String(row[7]).trim(); 
    const pAddress = row[8];
    
    if (!sName || !pPhone) return; // Skip invalid rows

    pPhone = pPhone.replace(/[\s-]/g, '');

    // --- Class ---
    const classKey = sGrade + "_" + sClassVal; 
    // STRICT LOOKUP: Only use existing classes.
    let classId = existingClasses[classKey]; 
    
    if (!classId) {
      // Option: Skip or Log. User asked not to create classes.
      // We will skip this student assignment to avoid broken links.
      console.log(`Skipping student ${sName}: Class ${classKey} not found.`);
      return; 
    }

    // --- Parent (User) ---
    // Check if user exists (Admin or previously added parent)
    let userId = existingUsers[pPhone] || tempNewUsers[pPhone];    
    
    if (!userId) {
      userId = "P_" + pPhone.substring(Math.max(0, pPhone.length - 6)); 
      newUsers.push([
        userId, 
        pName, 
        "Parent", 
        pPhone, 
        defaultPass, 
        "TRUE", 
        new Date()
      ]);
      tempNewUsers[pPhone] = userId;
    }

    // --- Student ---
    const studentId = "S_" + Math.floor(Math.random() * 1000000);
    newStudents.push([
      studentId,
      sName,
      pPhone, 
      sDOB,
      "", 
      pAddress
    ]);

    // --- Enrollment ---
    const enrollId = "E_" + Math.floor(Math.random() * 1000000);
    newEnrollments.push([
      enrollId,
      studentId,
      classId,
      currentById
    ]);
  });

  // --- Batch Write to Sheets ---
  // if (newClasses.length > 0) appendData(sheetClasses, newClasses); // Disabled Class Creation
  if (newUsers.length > 0) appendData(sheetUsers, newUsers);
  if (newStudents.length > 0) appendData(sheetStudents, newStudents);
  if (newEnrollments.length > 0) appendData(sheetEnrollments, newEnrollments);

  SpreadsheetApp.getUi().alert("Cleared old data & Import Complete! Processed " + data.length + " rows.");
}

// Helpers
function getColumnMap(sheet, colIndex) {
  const map = {};
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return map; 
  for (let i = 1; i < data.length; i++) { 
    map[String(data[i][colIndex]).trim()] = data[i][0]; 
  }
  return map;
}

function getClassMap(sheet) {
  const map = {};
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return map;
  for (let i = 1; i < data.length; i++) {
    const key = data[i][2] + "_" + data[i][1]; 
    map[key] = data[i][0]; 
  }
  return map;
}

function appendData(sheet, dataArray) {
  if (dataArray.length === 0) return;
  const startRow = sheet.getLastRow() + 1;
  const numRows = dataArray.length;
  const numCols = dataArray[0].length;
  sheet.getRange(startRow, 1, numRows, numCols).setValues(dataArray);
}

