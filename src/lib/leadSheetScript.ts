// The Google Apps Script an admin pastes into their Sheet (Extensions → Apps
// Script). One paste, then run `setup` once — it installs the on-edit trigger
// itself, so there is no Triggers screen to fiddle with.
//
// It reads each row, sends it to the institute's webhook, and writes the
// result into a "Lead Sync" column so a problem (bad phone number, wrong URL…)
// is visible right next to the row that caused it. Running onSheetEdit by hand
// (no edit event) is handled — it just sends every unsent row.
export const sheetScript = (webhookUrl: string) => `// InstituteSathi - Google Sheet -> Leads sync
// 1) Save this script.  2) Pick "setup" in the toolbar and press Run (only once).
// 3) Click Allow when Google asks.  Done - new and edited rows now sync by themselves.

var WEBHOOK_URL = "${webhookUrl}";
var SOURCE = "Google Sheets";
var STATUS_HEADER = "Lead Sync";

// Column headers we understand (any order, any capitalisation).
var ALIASES = {
  name: ["name", "full name", "fullname", "lead name", "student name", "customer name"],
  first: ["first name", "firstname", "first"],
  last: ["last name", "lastname", "surname", "last"],
  phone: ["phone", "mobile", "phone number", "mobile number", "contact", "contact number", "whatsapp", "whatsapp number"],
  email: ["email", "e-mail", "email address", "email id"],
  notes: ["notes", "note", "remarks", "remark", "comment", "comments", "message"]
};

// Run this once.
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onSheetEdit") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onSheetEdit").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  var n = sendAllNew();
  SpreadsheetApp.getActive().toast(
    "Connected! " + n + " existing row(s) sent. New and edited rows now sync automatically.",
    "InstituteSathi",
    10
  );
}

// Adds a "Leads" menu to the sheet.
function onOpen() {
  SpreadsheetApp.getUi().createMenu("Leads").addItem("Send all new rows now", "sendAllNew").addToUi();
}

// Runs automatically on every edit. If you press Run on this by hand there is
// no edit event (e is undefined), so it simply sends every row not sent yet.
function onSheetEdit(e) {
  if (!e || !e.range) {
    sendAllNew();
    return;
  }
  var r = e.range;
  sendRows_(r.getSheet(), r.getRow(), r.getLastRow(), true, r.getColumn(), r.getLastColumn());
}

// Sends every row that is not marked "Sent" yet.
function sendAllNew() {
  var sheet = SpreadsheetApp.getActiveSheet();
  return sendRows_(sheet, 2, sheet.getLastRow(), false);
}

function sendRows_(sheet, first, last, force, editFirstCol, editLastCol) {
  first = Math.max(first, 2); // row 1 is the header
  if (last < first) return 0;
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return 0;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var col = {};
  Object.keys(ALIASES).forEach(function (key) {
    for (var i = 0; i < headers.length; i++) {
      if (ALIASES[key].indexOf(headers[i]) !== -1) {
        col[key] = i;
        break;
      }
    }
  });
  if (col.phone === undefined || (col.name === undefined && col.first === undefined)) {
    SpreadsheetApp.getActive().toast('Row 1 needs "Name" and "Phone" headers.', "InstituteSathi", 8);
    return 0;
  }

  // The sync-result column is added automatically.
  var statusCol = headers.indexOf(STATUS_HEADER.toLowerCase());
  if (statusCol === -1) {
    statusCol = lastCol;
    sheet.getRange(1, statusCol + 1).setValue(STATUS_HEADER);
    lastCol++;
  }
  // Editing only the status column is not a lead change.
  if (editFirstCol && editFirstCol === editLastCol && editFirstCol === statusCol + 1) return 0;

  var values = sheet.getRange(first, 1, last - first + 1, lastCol).getValues();
  var sent = 0;
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    if (!force && String(row[statusCol]).indexOf("Sent") === 0) continue;

    var name = col.name !== undefined ? String(row[col.name]).trim() : "";
    if (!name && col.first !== undefined) {
      name = (String(row[col.first]).trim() + " " + (col.last !== undefined ? String(row[col.last]).trim() : "")).trim();
    }
    var phone = String(row[col.phone]).trim();
    if (!name && !phone) continue; // blank row

    var cell = sheet.getRange(first + r, statusCol + 1);
    if (!name || !phone) {
      cell.setValue("Skipped: name and phone are both needed");
      continue;
    }
    var result = post_({
      name: name,
      phone: phone,
      email: col.email !== undefined ? String(row[col.email]).trim() : "",
      notes: col.notes !== undefined ? String(row[col.notes]).trim() : "",
      source: SOURCE
    });
    if (result.ok) {
      sent++;
      cell.setValue("Sent \\u2713 " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMM HH:mm"));
    } else {
      cell.setValue("Error: " + result.message);
    }
  }
  return sent;
}

function post_(payload) {
  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    var body = {};
    try {
      body = JSON.parse(response.getContentText());
    } catch (err) {}
    if (code >= 200 && code < 300) return { ok: true };
    return { ok: false, message: body.message || "HTTP " + code };
  } catch (err) {
    return { ok: false, message: "Cannot reach the server (" + err.message + ")" };
  }
}`;
