// The Google Apps Script an admin pastes into the Google Sheet that their Google
// Form saves responses to (Sheet -> Extensions -> Apps Script). One paste, then
// run `setup` once — it installs a spreadsheet "on form submit" trigger. Each new
// response row is matched to name / phone / email / notes by its column header
// and sent to the institute's lead webhook (which dedupes by phone number).
//
// This runs from the response Sheet, not the Form itself: creating a trigger
// from the Form's own script editor fails for many accounts.
export const formScript = (webhookUrl: string) => `// InstituteSathi - Google Form -> Leads sync
// Paste this in the Google Sheet that receives your form responses
// (Sheet -> Extensions -> Apps Script).
// 1) Save.  2) Pick "setup" in the toolbar and press Run (only once).
// 3) Click Allow when Google asks.  Done - every new form response becomes a lead.

var WEBHOOK_URL = "${webhookUrl}";
var SOURCE = "Google Form";

// Supported column header names (any capitalisation)
var ALIASES = {
  name: ["name", "full name", "fullname", "your name", "lead name", "student name", "customer name"],
  first: ["first name", "firstname", "first"],
  last: ["last name", "lastname", "surname", "last"],
  phone: ["phone", "mobile", "phone number", "mobile number", "contact", "contact number", "whatsapp", "whatsapp number", "your phone number"],
  email: ["email", "e-mail", "email address", "email id", "your email"],
  notes: ["notes", "note", "remarks", "remark", "comment", "comments", "message", "course", "interested course", "course interested in"]
};

// Run setup() once from the linked Google Sheet project.
function setup() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Open Apps Script from your Google response Sheet.");
  }

  // Remove duplicate triggers for this handler.
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "onFormSubmit") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Install the spreadsheet form-submit trigger.
  ScriptApp.newTrigger("onFormSubmit").forSpreadsheet(spreadsheet).onFormSubmit().create();

  Logger.log("Setup complete. New form responses will now sync as leads.");
}

// Runs automatically when a Google Form response is added to the Sheet.
function onFormSubmit(e) {
  if (!e || !e.range) {
    throw new Error("Missing spreadsheet event. Test by submitting the actual Google Form.");
  }

  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  var values = sheet.getRange(row, 1, 1, lastColumn).getDisplayValues()[0];

  var fields = {};
  headers.forEach(function (header, index) {
    var title = String(header).trim().toLowerCase();
    var value = String(values[index] || "").trim();
    Object.keys(ALIASES).forEach(function (key) {
      if (ALIASES[key].indexOf(title) !== -1 && fields[key] === undefined) {
        fields[key] = value;
      }
    });
  });

  var name = fields.name || ((fields.first || "") + " " + (fields.last || "")).trim();
  var phone = fields.phone || "";
  if (!name || !phone) {
    throw new Error("Name or Phone column not found, or the response is empty. Check row 1 column headers.");
  }

  var result = post_({
    name: name,
    phone: phone,
    email: fields.email || "",
    notes: fields.notes || "",
    source: SOURCE
  });
  if (!result.ok) {
    throw new Error("Lead sync failed: " + result.message);
  }
  console.log("Lead sync successful for row " + row + ", phone " + phone);
}

// Sends the lead, retrying temporary failures.
function post_(payload) {
  var lastError = "";
  for (var attempt = 0; attempt < 3; attempt++) {
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
      lastError = body.message || "HTTP " + code;

      // Retry only rate limits or temporary server errors.
      if (code !== 429 && code < 500) break;
    } catch (err) {
      lastError = "Connection error: " + err.message;
    }
    if (attempt < 2) Utilities.sleep(attempt === 0 ? 500 : 1500);
  }
  return { ok: false, message: lastError || "Unknown webhook error" };
}`;
