/* 
  CORRECTED GOOGLE APPS SCRIPT
  Copy this entire code into your Google Apps Script editor
  Important: Update the SHEET_ID to your actual Google Sheet ID
*/

const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE"; // ← REPLACE THIS
const SHEET_NAMES = {
  shoppingList: "ShoppingList",
  completed: "Completed",
  teamMembers: "TeamMembers",
  budget: "Budget"
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  if (action === "getData") {
    return ContentService.createTextOutput(JSON.stringify(getData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: "Smart Household Budget API running" 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const bodyText = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    const payloadParam = (e && e.parameter && e.parameter.payload) ? e.parameter.payload : "";
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
    let data = {};
    if (payloadParam) {
      data = JSON.parse(payloadParam);
    } else if (bodyText) {
      data = JSON.parse(bodyText);
    }

    Logger.log("Action: " + action);
    Logger.log("Data: " + JSON.stringify(data));

    let result = {};
    
    switch(action) {
      case 'getData':
        result = getData();
        break;
      case 'addShoppingItem':
        result = addShoppingItem(data);
        break;
      case 'completeItem':
        result = completeItem(data);
        break;
      case 'deleteItem':
        result = deleteItem(data);
        break;
      case 'updateShoppingItem':
        result = updateShoppingItem(data);
        break;
      case 'addMember':
        result = addMember(data);
        break;
      case 'renameMember':
        result = renameMember(data);
        break;
      case 'removeMember':
        result = removeMember(data);
        break;
      default:
        result = { success: false, error: "Unknown action" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    Logger.log("ERROR: " + e.toString());
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: e.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    const shoppingSheet = ss.getSheetByName(SHEET_NAMES.shoppingList);
    const completedSheet = ss.getSheetByName(SHEET_NAMES.completed);
    const membersSheet = ss.getSheetByName(SHEET_NAMES.teamMembers);
    const budgetSheet = ss.getSheetByName(SHEET_NAMES.budget);

    if (!shoppingSheet || !completedSheet || !membersSheet || !budgetSheet) {
      return { 
        success: false, 
        error: "One or more sheets not found. Expected: ShoppingList, Completed, TeamMembers, Budget" 
      };
    }

    const shoppingList = getSheetData(shoppingSheet);
    const completed = getSheetData(completedSheet);
    const teamMembers = getMembersData(membersSheet);
    const budget = getBudgetData(budgetSheet);

    return {
      success: true,
      data: {
        shoppingList: shoppingList,
        completed: completed,
        teamMembers: teamMembers,
        budget: budget
      }
    };
  } catch (e) {
    Logger.log("getData ERROR: " + e.toString());
    return { success: false, error: "getData failed: " + e.toString() };
  }
}

function addShoppingItem(item) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.shoppingList);
    
    if (!sheet) {
      return { success: false, error: "ShoppingList sheet not found" };
    }

    const row = [
      item.id || Date.now(),
      item.title || "",
      item.price || 0,
      item.buyer || "Unknown",
      item.category || "other",
      item.priority || "normal",
      item.addedBy || "System",
      new Date().toISOString(),
      item.isFavorite ? 1 : 0,
      item.recurring ? 1 : 0,
      "false", // done status
      item.photo || ""
    ];

    sheet.appendRow(row);
    Logger.log("Item added: " + item.title);
    
    return { success: true, message: "Item added successfully" };
  } catch (e) {
    Logger.log("addShoppingItem ERROR: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function completeItem(item) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Move to completed sheet
    const completedSheet = ss.getSheetByName(SHEET_NAMES.completed);
    if (!completedSheet) {
      return { success: false, error: "Completed sheet not found" };
    }

    const completedRow = [
      item.id,
      item.title,
      item.price,
      item.buyer,
      item.paidBy || item.buyer,
      item.quantity || 1,
      new Date().toISOString(),
      item.category || "other"
    ];

    completedSheet.appendRow(completedRow);
    
    // Delete from shopping list
    const shoppingSheet = ss.getSheetByName(SHEET_NAMES.shoppingList);
    const data = shoppingSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == item.id) {
        shoppingSheet.deleteRow(i + 1);
        break;
      }
    }

    Logger.log("Item completed: " + item.title);
    return { success: true, message: "Item marked as completed" };
  } catch (e) {
    Logger.log("completeItem ERROR: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function deleteItem(item) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.shoppingList);
    
    if (!sheet) {
      return { success: false, error: "ShoppingList sheet not found" };
    }

    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == item.id) {
        sheet.deleteRow(i + 1);
        Logger.log("Item deleted: " + item.id);
        return { success: true, message: "Item deleted" };
      }
    }

    return { success: false, error: "Item not found" };
  } catch (e) {
    Logger.log("deleteItem ERROR: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function updateShoppingItem(item) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.shoppingList);
    if (!sheet) return { success: false, error: "ShoppingList sheet not found" };
    const values = sheet.getDataRange().getValues();
    if (!values.length) return { success: false, error: "ShoppingList is empty" };
    const headers = values[0].map(h => String(h).toLowerCase());
    const rowIndex = values.findIndex((row, idx) => idx > 0 && String(row[0]) === String(item.id));
    if (rowIndex === -1) return { success: false, error: "Item not found" };
    const existing = values[rowIndex];
    const next = [];
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      next.push(item[key] !== undefined ? item[key] : existing[i]);
    }
    sheet.getRange(rowIndex + 1, 1, 1, next.length).setValues([next]);
    return { success: true, message: "Item updated" };
  } catch (e) {
    Logger.log("updateShoppingItem ERROR: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function addMember(payload) {
  try {
    const member = (payload.member || "").toString().trim();
    if (!member) return { success: false, error: "Member name required" };
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.teamMembers);
    if (!sheet) return { success: false, error: "TeamMembers sheet not found" };
    const names = getMembersData(sheet);
    if (names.indexOf(member) !== -1) return { success: true, message: "Member already exists" };
    sheet.appendRow([member]);
    return { success: true, message: "Member added" };
  } catch (e) {
    Logger.log("addMember ERROR: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function renameMember(payload) {
  try {
    const oldName = (payload.oldName || "").toString().trim();
    const newName = (payload.newName || "").toString().trim();
    if (!oldName || !newName) return { success: false, error: "Both oldName and newName are required" };
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const membersSheet = ss.getSheetByName(SHEET_NAMES.teamMembers);
    if (!membersSheet) return { success: false, error: "TeamMembers sheet not found" };
    const data = membersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === oldName) {
        membersSheet.getRange(i + 1, 1).setValue(newName);
        break;
      }
    }
    replaceMemberNameInSheet(ss.getSheetByName(SHEET_NAMES.shoppingList), oldName, newName, ["buyer", "addedby"]);
    replaceMemberNameInSheet(ss.getSheetByName(SHEET_NAMES.completed), oldName, newName, ["buyer", "paidby"]);
    return { success: true, message: "Member renamed" };
  } catch (e) {
    Logger.log("renameMember ERROR: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function removeMember(payload) {
  try {
    const member = (payload.member || "").toString().trim();
    if (!member) return { success: false, error: "Member name required" };
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const membersSheet = ss.getSheetByName(SHEET_NAMES.teamMembers);
    if (!membersSheet) return { success: false, error: "TeamMembers sheet not found" };
    const data = membersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === member) {
        membersSheet.deleteRow(i + 1);
        break;
      }
    }
    return { success: true, message: "Member removed" };
  } catch (e) {
    Logger.log("removeMember ERROR: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function replaceMemberNameInSheet(sheet, oldName, newName, columns) {
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  if (!values.length) return;
  const headers = values[0].map(h => String(h).toLowerCase());
  const columnIndexes = headers
    .map((h, i) => columns.indexOf(h) !== -1 ? i : -1)
    .filter(i => i !== -1);
  if (!columnIndexes.length) return;
  for (let row = 1; row < values.length; row++) {
    let changed = false;
    for (let c = 0; c < columnIndexes.length; c++) {
      const idx = columnIndexes[c];
      if (String(values[row][idx]).trim() === oldName) {
        values[row][idx] = newName;
        changed = true;
      }
    }
    if (changed) {
      sheet.getRange(row + 1, 1, 1, values[row].length).setValues([values[row]]);
    }
  }
}

function getSheetData(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) continue; // Skip empty rows
      
      const row = {};
      headers.forEach((header, idx) => {
        row[header.toLowerCase()] = data[i][idx];
      });
      rows.push(row);
    }

    return rows;
  } catch (e) {
    Logger.log("getSheetData ERROR: " + e.toString());
    return [];
  }
}

function getMembersData(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    const members = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        members.push(data[i][0]);
      }
    }

    return members;
  } catch (e) {
    Logger.log("getMembersData ERROR: " + e.toString());
    return [];
  }
}

function getBudgetData(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    
    if (data.length > 1) {
      return {
        total: parseFloat(data[1][0]) || 500,
        currency: data[1][1] || "EUR",
        month: data[1][2] || new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      };
    }

    return {
      total: 500,
      currency: "EUR",
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  } catch (e) {
    Logger.log("getBudgetData ERROR: " + e.toString());
    return { total: 500, currency: "EUR", month: "March 2024" };
  }
}

// SETUP FUNCTION - Run this once to create the sheet structure
function setupSheets() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Create ShoppingList sheet
    createSheetIfNotExists(ss, SHEET_NAMES.shoppingList, [
      "id", "title", "price", "buyer", "category", "priority", "addedBy", "date", "isFavorite", "recurring", "done", "photo"
    ]);
    
    // Create Completed sheet
    createSheetIfNotExists(ss, SHEET_NAMES.completed, [
      "id", "title", "price", "buyer", "paidBy", "quantity", "date", "category"
    ]);
    
    // Create TeamMembers sheet
    createSheetIfNotExists(ss, SHEET_NAMES.teamMembers, ["Member"]);
    
    // Create Budget sheet
    createSheetIfNotExists(ss, SHEET_NAMES.budget, ["Total", "Currency", "Month"]);
    
    Logger.log("Sheets setup complete!");
  } catch (e) {
    Logger.log("setupSheets ERROR: " + e.toString());
  }
}

function createSheetIfNotExists(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    Logger.log("Created sheet: " + sheetName);
  }
}
