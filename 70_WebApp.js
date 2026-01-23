/**
 * @fileoverview Web app entry points and HMAC validation helpers
 * @description Provides GET UI + POST import flow with signed parameters.
 */

var WEBAPP_AUDIENCE = 'g2n-import';
var WEBAPP_HMAC_KEY_PROPERTY = 'G2N_HMAC_KEY_V1';
var WEBAPP_HMAC_KEY_PROPERTY_V0 = 'G2N_HMAC_KEY_V0';
var WEBAPP_MAX_AGE_SECONDS = 3600;
var WEBAPP_CLOCK_SKEW_SECONDS = 300;
var WEBAPP_SIGN_VERSION = '1';
var WEBAPP_ROTATE_CONFIRM_TTL_MS = 10 * 60 * 1000;

/**
 * Web app GET: validate signed params and render UI only.
 * @param {Object} e - doGet event
 * @returns {HtmlOutput}
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.settings === '1' || params.settings === 'true') {
    if (!isAdminUser_() && !isDevMode_()) {
      return _buildErrorHtml_('Unauthorized.');
    }
    return _buildWebSettingsHtml_();
  }
  if (params.action) {
    delete params.action;
  }
  var verification = _verifySignedRequest(params, { consumeNonce: false });
  if (!verification.ok) {
    var friendly = _friendlyErrorMessage_(verification.code, verification.error || 'Invalid or expired link.');
    return _buildErrorHtml_(friendly);
  }

  var serviceUrl = ScriptApp.getService().getUrl();
  var signedPayload = {
    messageId: params.messageId || '',
    iat: params.iat || '',
    nonce: params.nonce || '',
    aud: params.aud || '',
    ver: params.ver || '',
    sig: params.sig || ''
  };
  return _buildPreviewHtml_(serviceUrl, signedPayload);
}

/**
 * Web app POST: verify signature and perform import action.
 * @param {Object} e - doPost event
 * @returns {TextOutput}
 */
function doPost(e) {
  var payload = _parseJsonBody_(e);
  if (!payload) {
    return _jsonResponse_({ ok: false, code: 'BAD_JSON', error: 'Invalid JSON payload.' });
  }

  var params = payload || {};
  var verification = _verifySignedRequest(params, { consumeNonce: true });
  if (!verification.ok) {
    return _jsonResponse_({
      ok: false,
      code: verification.code || 'UNAUTHORIZED',
      error: verification.error || 'Unauthorized.'
    });
  }

  var action = String(params.action || '').toLowerCase();
  var messageId = String(params.messageId || '').trim();
  if (!messageId) {
    return _jsonResponse_({ ok: false, code: 'MISSING_MESSAGE_ID', error: 'Missing messageId.' });
  }

  if (action === 'preview') {
    try {
      var preview = _buildPreviewData_(messageId);
      return _jsonResponse_({ ok: true, data: preview });
    } catch (error) {
      return _jsonResponse_({
        ok: false,
        code: 'PREVIEW_FAILED',
        error: error && error.message ? error.message : 'Preview failed.'
      });
    }
  }

  if (action !== 'import') {
    return _jsonResponse_({ ok: false, code: 'BAD_ACTION', error: 'Unsupported action.' });
  }

  try {
    if (Array.isArray(params.selectedNames)) {
      var selectionList = params.selectedNames.map(function(name) {
        return String(name || '').trim();
      }).filter(Boolean);
      var container = getApp().getContainer();
      var attachmentService = container.resolve('attachmentService');
      attachmentService.setSelectedAttachmentNames(messageId, selectionList);
      var allAttachments = attachmentService.getAttachmentsForMessage(messageId);
      var totalCount = Array.isArray(allAttachments) ? allAttachments.length : selectionList.length;
      attachmentService.setLastSelectionSummary(messageId, selectionList.length, totalCount);
    }
    var app = getApp();
    var result = app.saveEmail(messageId);
    var resultObj = result && typeof result.toObject === 'function' ? result.toObject() : result;
    var nextAction = null;
    if (resultObj && resultObj.data && resultObj.data.pageUrl) {
      nextAction = {
        label: 'Open Notion page',
        url: resultObj.data.pageUrl
      };
    }
    return _jsonResponse_({
      ok: true,
      result: resultObj,
      message: resultObj && resultObj.message ? resultObj.message : 'Import complete.',
      nextAction: nextAction
    });
  } catch (error) {
    return _jsonResponse_({
      ok: false,
      code: 'IMPORT_FAILED',
      error: error && error.message ? error.message : 'Import failed.'
    });
  }
}

function _buildPreviewHtml_(serviceUrl, signedPayload) {
  var html =
    '<!doctype html>' +
    '<html>' +
    '<head>' +
    '  <meta charset="utf-8">' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">' +
    '  <meta name="referrer" content="no-referrer">' +
    '  <title>G2N Preview</title>' +
    '  <style>' +
    '    body{font-family:Arial,sans-serif;margin:24px;background:#f6f8fb;color:#1f2937;}' +
    '    .card{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:20px;' +
    '    box-shadow:0 10px 30px rgba(0,0,0,.08);}' +
    '    h1{font-size:20px;margin:0 0 12px;}' +
    '    p{margin:0 0 16px;line-height:1.4;}' +
    '    button{background:#0f9d58;color:#fff;border:0;border-radius:6px;padding:10px 14px;' +
    '    cursor:pointer;font-size:14px;}' +
    '    button:disabled{opacity:.6;cursor:default;}' +
    '    #status{margin-top:12px;font-size:13px;color:#374151;}' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <div class="card">' +
    '    <h1>G2N Import</h1>' +
    '    <p>This link is signed and expires. Click below to import the email to Notion.</p>' +
    '    <div id="preview" style="margin:12px 0;font-size:13px;color:#374151;"></div>' +
    '    <div id="attachments" style="margin:12px 0;font-size:13px;color:#374151;"></div>' +
    '    <div id="mappings" style="margin:12px 0;font-size:13px;color:#374151;"></div>' +
    '    <button id="importBtn" disabled>Import</button>' +
    '    <div id="status"></div>' +
    '    <div id="details" style="margin-top:10px;font-size:13px;color:#4b5563;"></div>' +
    '  </div>' +
    '  <script>' +
    '    (function(){' +
    '      var signed = ' + JSON.stringify(signedPayload) + ';' +
    '      var errorMessages = {' +
    '        "EXPIRED_LINK":"This link has expired. Open the add-on again to get a fresh link.",' +
    '        "REPLAYED_NONCE":"This link was already used. Open the add-on to generate a new one.",' +
    '        "BAD_SIG":"This link is invalid. Open the add-on to generate a new one.",' +
    '        "MISSING_PARAMS":"The link is missing required data. Open the add-on again.",' +
    '        "HMAC_NOT_CONFIGURED":"Web import is not configured. Set G2N_HMAC_KEY_V1 in Script Properties.",' +
    '        "INVALID_TIMESTAMP":"This link has an invalid timestamp. Open the add-on again.",' +
    '        "INVALID_VER":"This link has an unsupported version. Open the add-on again.",' +
    '        "INVALID_NONCE":"This link has an invalid nonce. Open the add-on again."' +
    '      };' +
    '      var btn = document.getElementById("importBtn");' +
    '      var statusEl = document.getElementById("status");' +
    '      var detailsEl = document.getElementById("details");' +
    '      var previewEl = document.getElementById("preview");' +
    '      var attachmentsEl = document.getElementById("attachments");' +
    '      var attachmentSelection = [];' +
    '      var attachmentTotal = 0;' +
    '      var selectionStatusEl = null;' +
    '      var mappingsEl = document.getElementById("mappings");' +
    '      function updateSelectionStatus(){' +
    '        if (!selectionStatusEl) return;' +
    '        selectionStatusEl.textContent = "Selected " + attachmentSelection.length + " of " + attachmentTotal;' +
    '      }' +
    '      function formatBytes(bytes){' +
    '        var size = Number(bytes || 0);' +
    '        if (size < 1024) return size + " B";' +
    '        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";' +
    '        return (size / (1024 * 1024)).toFixed(1) + " MB";' +
    '      }' +
    '      function renderPreview(data){' +
    '        previewEl.textContent = "";' +
    '        attachmentsEl.textContent = "";' +
    '        mappingsEl.textContent = "";' +
    '        attachmentSelection = [];' +
    '        attachmentTotal = 0;' +
    '        selectionStatusEl = null;' +
    '        if (!data || !data.email) {' +
    '          previewEl.textContent = "Preview unavailable.";' +
    '          return;' +
    '        }' +
    '        var email = data.email || {};' +
    '        var lines = [];' +
    '        lines.push("Subject: " + (email.subject || ""));' +
    '        lines.push("From: " + (email.from || ""));' +
    '        lines.push("To: " + (email.to || ""));' +
    '        if (email.date) lines.push("Date: " + email.date);' +
    '        if (email.gmailLinkUrl) lines.push("Gmail link: " + email.gmailLinkUrl);' +
    '        lines.forEach(function(text){' +
    '          var div = document.createElement("div");' +
    '          div.textContent = text;' +
    '          previewEl.appendChild(div);' +
    '        });' +
    '        if (email.gmailLinkUrl) {' +
    '          var link = document.createElement("a");' +
    '          link.href = email.gmailLinkUrl;' +
    '          link.target = "_blank";' +
    '          link.rel = "noopener";' +
    '          link.textContent = "Open in Gmail";' +
    '          previewEl.appendChild(link);' +
    '        }' +
    '        renderMappings(data.mappings || {});' +
    '        var items = (data.attachments && data.attachments.items) ? data.attachments.items : [];' +
    '        if (!items.length) {' +
    '          attachmentTotal = 0;' +
    '          selectionStatusEl = document.createElement("div");' +
    '          selectionStatusEl.textContent = "Selected 0 of 0";' +
    '          attachmentsEl.appendChild(selectionStatusEl);' +
    '          attachmentsEl.appendChild(document.createTextNode("Attachments: none"));' +
    '          return;' +
    '        }' +
    '        attachmentTotal = items.length;' +
    '        var title = document.createElement("div");' +
    '        title.textContent = "Attachments (" + items.length + "):";' +
    '        attachmentsEl.appendChild(title);' +
    '        selectionStatusEl = document.createElement("div");' +
    '        selectionStatusEl.style.margin = "6px 0";' +
    '        attachmentsEl.appendChild(selectionStatusEl);' +
    '        var actions = document.createElement("div");' +
    '        actions.style.margin = "6px 0";' +
    '        var selectAll = document.createElement("button");' +
    '        selectAll.type = "button";' +
    '        selectAll.textContent = "Select all";' +
    '        selectAll.style.marginRight = "6px";' +
    '        var selectNone = document.createElement("button");' +
    '        selectNone.type = "button";' +
    '        selectNone.textContent = "Select none";' +
    '        actions.appendChild(selectAll);' +
    '        actions.appendChild(selectNone);' +
    '        attachmentsEl.appendChild(actions);' +
    '        var list = document.createElement("ul");' +
    '        list.style.paddingLeft = "18px";' +
    '        var checkboxes = [];' +
    '        items.forEach(function(item){' +
    '          var li = document.createElement("li");' +
    '          var label = document.createElement("label");' +
    '          var checkbox = document.createElement("input");' +
    '          checkbox.type = "checkbox";' +
    '          checkbox.checked = !!item.selected;' +
    '          checkbox.setAttribute("data-name", item.name);' +
    '          checkbox.addEventListener("change", function(){' +
    '            var name = this.getAttribute("data-name");' +
    '            if (this.checked) {' +
    '              if (attachmentSelection.indexOf(name) === -1) attachmentSelection.push(name);' +
    '            } else {' +
    '              attachmentSelection = attachmentSelection.filter(function(n){ return n !== name; });' +
    '            }' +
    '            updateSelectionStatus();' +
    '          });' +
    '          if (item.selected) attachmentSelection.push(item.name);' +
    '          label.appendChild(checkbox);' +
    '          var text = document.createElement("span");' +
    '          text.textContent = " " + item.name + " (" + formatBytes(item.size) + ")";' +
    '          label.appendChild(text);' +
    '          li.appendChild(label);' +
    '          list.appendChild(li);' +
    '          checkboxes.push(checkbox);' +
    '        });' +
    '        attachmentsEl.appendChild(list);' +
    '        selectAll.addEventListener("click", function(){' +
    '          attachmentSelection = [];' +
    '          checkboxes.forEach(function(cb){ cb.checked = true; attachmentSelection.push(cb.getAttribute("data-name")); });' +
    '          updateSelectionStatus();' +
    '        });' +
    '        selectNone.addEventListener("click", function(){' +
    '          attachmentSelection = [];' +
    '          checkboxes.forEach(function(cb){ cb.checked = false; });' +
    '          updateSelectionStatus();' +
    '        });' +
    '        updateSelectionStatus();' +
    '      }' +
    '      function renderMappings(mappings){' +
    '        mappingsEl.textContent = "";' +
    '        if (!mappings) return;' +
    '        var sections = [];' +
    '        if (mappings.email && mappings.email.items && mappings.email.items.length) {' +
    '          sections.push({ title: "Email mappings", db: mappings.email.databaseName || "Email DB", items: mappings.email.items });' +
    '        }' +
    '        if (mappings.attachments && mappings.attachments.items && mappings.attachments.items.length) {' +
    '          sections.push({ title: "Attachment mappings", db: mappings.attachments.databaseName || "Attachment DB", items: mappings.attachments.items });' +
    '        }' +
    '        if (!sections.length) {' +
    '          mappingsEl.textContent = "Mappings: none";' +
    '          return;' +
    '        }' +
    '        sections.forEach(function(section){' +
    '          var header = document.createElement("div");' +
    '          header.textContent = section.title + " (Database: " + section.db + ")";' +
    '          header.style.marginTop = "8px";' +
    '          mappingsEl.appendChild(header);' +
    '          var list = document.createElement("ul");' +
    '          list.style.paddingLeft = "18px";' +
    '          section.items.forEach(function(item){' +
    '            var li = document.createElement("li");' +
    '            li.textContent = item.target + " <- " + item.source;' +
    '            list.appendChild(li);' +
    '          });' +
    '          mappingsEl.appendChild(list);' +
    '        });' +
    '      }' +
    '      (function loadPreview(){' +
    '        var params = Object.assign({ action: "preview" }, signed);' +
    '        fetch(' + JSON.stringify(serviceUrl) + ', {' +
    '          method: "POST",' +
    '          headers: {"Content-Type": "application/json"},' +
    '          body: JSON.stringify(params)' +
    '        }).then(function(res){return res.json();}).then(function(data){' +
    '          if (data && data.ok && data.data) {' +
    '            renderPreview(data.data);' +
    '            btn.disabled = false;' +
    '          } else {' +
    '            previewEl.textContent = "Preview unavailable.";' +
    '            btn.disabled = true;' +
    '          }' +
    '        }).catch(function(){' +
    '          previewEl.textContent = "Preview unavailable.";' +
    '          btn.disabled = true;' +
    '        });' +
    '      })();' +
    '      btn.addEventListener("click", function(){' +
    '        btn.disabled = true;' +
    '        statusEl.textContent = "Importing...";' +
    '        detailsEl.textContent = "";' +
    '        var params = Object.assign({ action: "import", selectedNames: attachmentSelection }, signed);' +
    '        fetch(' + JSON.stringify(serviceUrl) + ', {' +
    '          method: "POST",' +
    '          headers: {"Content-Type": "application/json"},' +
    '          body: JSON.stringify(params)' +
    '        }).then(function(res){return res.json();}).then(function(data){' +
    '          if (data && data.ok) {' +
    '            statusEl.textContent = data.message || "Import complete.";' +
    '            if (data.result && data.result.data) {' +
    '              var info = data.result.data;' +
    '              var url = info.pageUrl ? ("<a href=\\"" + info.pageUrl + "\\" target=\\"_blank\\" rel=\\"noopener\\">Open Notion Page</a>") : "";' +
    '              var saved = (info.attachmentsSaved != null) ? ("Attachments saved: " + info.attachmentsSaved) : "";' +
    '              detailsEl.innerHTML = [url, saved].filter(Boolean).join(" · ");' +
    '            } else if (data.nextAction && data.nextAction.url) {' +
    '              detailsEl.innerHTML = "<a href=\\"" + data.nextAction.url + "\\" target=\\"_blank\\" rel=\\"noopener\\">" + (data.nextAction.label || "Open link") + "</a>";' +
    '            }' +
    '          } else {' +
    '            var friendly = (data && data.code && errorMessages[data.code]) ? errorMessages[data.code] : null;' +
    '            statusEl.textContent = friendly || ((data && data.error) ? data.error : "Import failed.");' +
    '            btn.disabled = false;' +
    '          }' +
    '        }).catch(function(err){' +
    '          statusEl.textContent = "Request failed.";' +
    '          detailsEl.textContent = "";' +
    '          btn.disabled = false;' +
    '        });' +
    '      });' +
    '    })();' +
    '  </script>' +
    '</body>' +
    '</html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('G2N Preview')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DENY);
}

function _buildWebSettingsHtml_() {
  var gate = getAdminGateStatus_();
  var hmac = getHmacKeyStatus_();
  var serviceUrl = ScriptApp.getService().getUrl();
  var html =
    '<!doctype html>' +
    '<html>' +
    '<head>' +
    '  <meta charset="utf-8">' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">' +
    '  <title>G2N Web Settings</title>' +
    '  <style>' +
    '    body{font-family:Arial,sans-serif;margin:24px;background:#f6f8fb;color:#1f2937;}' +
    '    .card{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:20px;' +
    '    box-shadow:0 10px 30px rgba(0,0,0,.08);}' +
    '    h1{font-size:20px;margin:0 0 12px;}' +
    '    .row{margin:6px 0;font-size:13px;color:#374151;}' +
    '    code{background:#f3f4f6;padding:2px 4px;border-radius:4px;}' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <div class="card">' +
    '    <h1>G2N Web Settings</h1>' +
    '    <div class="row"><b>Service URL:</b> <code>' + _escapeHtml_(serviceUrl) + '</code></div>' +
    '    <div class="row"><b>Caller:</b> ' + _escapeHtml_(gate.email || 'unknown') + '</div>' +
    '    <div class="row"><b>Admin:</b> ' + (gate.isAdmin ? 'yes' : 'no') + '</div>' +
    '    <div class="row"><b>Dev mode:</b> ' + (gate.devMode ? 'true' : 'false') + '</div>' +
    '    <div class="row"><b>HMAC V1:</b> ' + (hmac.hasV1 ? 'set' : 'missing') + '</div>' +
    '    <div class="row"><b>HMAC V0:</b> ' + (hmac.hasV0 ? 'set' : 'missing') + '</div>' +
    '    <div class="row"><b>Last rotated:</b> ' + _escapeHtml_(hmac.rotatedAt || 'n/a') + '</div>' +
    '  </div>' +
    '</body>' +
    '</html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('G2N Web Settings')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DENY);
}

function _buildErrorHtml_(message) {
  var html =
    '<!doctype html>' +
    '<html>' +
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>G2N Error</title></head>' +
    '<body style="font-family:Arial,sans-serif;margin:24px;color:#1f2937;">' +
    '<h1>Link Error</h1>' +
    '<p>' + _escapeHtml_(message || 'Invalid link.') + '</p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('G2N Error')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DENY);
}

function _friendlyErrorMessage_(code, fallback) {
  var map = {
    EXPIRED_LINK: 'This link has expired. Open the add-on again to get a fresh link.',
    REPLAYED_NONCE: 'This link was already used. Open the add-on to generate a new one.',
    BAD_SIG: 'This link is invalid. Open the add-on to generate a new one.',
    MISSING_PARAMS: 'The link is missing required data. Open the add-on again.',
    HMAC_NOT_CONFIGURED: 'Web import is not configured. Set G2N_HMAC_KEY_V1 in Script Properties.',
    INVALID_TIMESTAMP: 'This link has an invalid timestamp. Open the add-on again.',
    INVALID_VER: 'This link has an unsupported version. Open the add-on again.',
    INVALID_NONCE: 'This link has an invalid nonce. Open the add-on again.'
  };
  return map[code] || fallback || 'Invalid or expired link.';
}

function isDevMode_() {
  var props = PropertiesService.getScriptProperties();
  return String(props.getProperty('G2N_DEV_MODE') || '').toLowerCase() === 'true';
}

function getCallerEmail_() {
  var email = '';
  try {
    email = (Session.getEffectiveUser().getEmail() || '').trim();
  } catch (e) {}
  if (!email) {
    try {
      email = (Session.getActiveUser().getEmail() || '').trim();
    } catch (e2) {}
  }
  return String(email || '').toLowerCase();
}

function isAdminUser_() {
  var props = PropertiesService.getScriptProperties();
  var allowList = String(props.getProperty('G2N_ADMIN_EMAILS') || '').trim();
  if (!allowList) return false;

  var email = getCallerEmail_();
  if (!email) return false;

  var allowed = allowList.split(',')
    .map(function(item) { return String(item || '').trim().toLowerCase(); })
    .filter(Boolean);

  return allowed.indexOf(email) !== -1;
}

function getAdminGateStatus_() {
  var email = getCallerEmail_();
  return {
    email: email || '(unresolved)',
    isAdmin: Boolean(isAdminUser_()),
    devMode: Boolean(isDevMode_())
  };
}

function getHmacKeyStatus_() {
  var props = PropertiesService.getScriptProperties();
  var v1 = props.getProperty(WEBAPP_HMAC_KEY_PROPERTY);
  var v0 = props.getProperty(WEBAPP_HMAC_KEY_PROPERTY_V0);
  return {
    hasV1: Boolean(v1),
    v1Suffix: v1 ? v1.slice(-6) : '',
    hasV0: Boolean(v0),
    v0Suffix: v0 ? v0.slice(-6) : '',
    rotatedAt: props.getProperty('G2N_HMAC_ROTATED_AT') || ''
  };
}

function getRotateConfirmState_() {
  var props = PropertiesService.getUserProperties();
  var raw = props.getProperty('G2N_ROTATE_CONFIRM_AT');
  if (!raw) return null;
  var ts = parseInt(raw, 10);
  if (!ts) {
    props.deleteProperty('G2N_ROTATE_CONFIRM_AT');
    return null;
  }
  if (Date.now() - ts > WEBAPP_ROTATE_CONFIRM_TTL_MS) {
    props.deleteProperty('G2N_ROTATE_CONFIRM_AT');
    return null;
  }
  return { pending: true, requestedAt: new Date(ts).toISOString() };
}

function setRotateConfirmState_(enabled) {
  var props = PropertiesService.getUserProperties();
  if (enabled) {
    props.setProperty('G2N_ROTATE_CONFIRM_AT', String(Date.now()));
  } else {
    props.deleteProperty('G2N_ROTATE_CONFIRM_AT');
  }
}

function _parseJsonBody_(e) {
  try {
    var contents = e && e.postData && e.postData.contents;
    if (!contents) return null;
    return JSON.parse(contents);
  } catch (error) {
    return null;
  }
}

function _verifySignedRequest(params, options) {
  var opts = options || {};
  var required = ['messageId', 'iat', 'nonce', 'aud', 'ver', 'sig'];
  for (var i = 0; i < required.length; i++) {
    if (!params || !params[required[i]] || String(params[required[i]]).trim() === '') {
      return { ok: false, code: 'MISSING_PARAMS', error: 'Missing signed parameters.' };
    }
  }

  var aud = String(params.aud || '');
  if (aud !== WEBAPP_AUDIENCE) {
    return { ok: false, code: 'INVALID_AUD', error: 'Invalid audience.' };
  }

  var ver = String(params.ver || '');
  if (ver !== '1' && ver !== '0') {
    return { ok: false, code: 'INVALID_VER', error: 'Invalid version.' };
  }

  var iat = parseInt(params.iat, 10);
  if (!iat || isNaN(iat)) {
    return { ok: false, code: 'INVALID_TIMESTAMP', error: 'Invalid timestamp.' };
  }

  var now = Math.floor(new Date().getTime() / 1000);
  if (iat > now + WEBAPP_CLOCK_SKEW_SECONDS) {
    return { ok: false, code: 'FUTURE_TIMESTAMP', error: 'Timestamp is in the future.' };
  }
  if (now - iat > WEBAPP_MAX_AGE_SECONDS) {
    return { ok: false, code: 'EXPIRED_LINK', error: 'Link expired.' };
  }

  var messageId = String(params.messageId || '').trim();
  if (!/^[A-Za-z0-9_\-]+$/.test(messageId) || messageId.length > 200) {
    return { ok: false, code: 'INVALID_MESSAGE_ID', error: 'Invalid messageId.' };
  }

  var nonce = String(params.nonce || '').trim();
  if (!/^[A-Za-z0-9_\-]{16,128}$/.test(nonce)) {
    return { ok: false, code: 'INVALID_NONCE', error: 'Invalid nonce.' };
  }

  var canonical = _canonicalizeSignedParams_({
    aud: aud,
    iat: String(iat),
    messageId: messageId,
    nonce: nonce,
    ver: ver
  });

  var primaryKey = _getHmacKey_(ver);
  var fallbackKey = ver === '1' ? _getHmacKey_('0') : _getHmacKey_('1');
  if (!primaryKey && !fallbackKey) {
    return { ok: false, code: 'HMAC_NOT_CONFIGURED', error: 'HMAC key not configured.' };
  }

  var expectedSig = primaryKey ? _signHmac_(canonical, primaryKey) : null;
  var providedSig = String(params.sig || '');
  var sigOk = expectedSig ? _timingSafeEqual_(expectedSig, providedSig) : false;
  if (!sigOk && fallbackKey) {
    var fallbackSig = _signHmac_(canonical, fallbackKey);
    sigOk = _timingSafeEqual_(fallbackSig, providedSig);
  }
  if (!sigOk) {
    return { ok: false, code: 'BAD_SIG', error: 'Signature mismatch.' };
  }

  if (opts.consumeNonce) {
    var cache = CacheService.getScriptCache();
    var nonceKey = 'g2n:' + ver + ':nonce:' + nonce;
    var existing = cache.get(nonceKey);
    if (existing) {
      return { ok: false, code: 'REPLAYED_NONCE', error: 'Link already used.' };
    }
    cache.put(nonceKey, '1', WEBAPP_MAX_AGE_SECONDS);
  }

  return { ok: true };
}

function _canonicalizeSignedParams_(payload) {
  var parts = [
    'aud=' + encodeURIComponent(payload.aud),
    'iat=' + encodeURIComponent(payload.iat),
    'messageId=' + encodeURIComponent(payload.messageId),
    'nonce=' + encodeURIComponent(payload.nonce),
    'ver=' + encodeURIComponent(payload.ver)
  ];
  return parts.join('&');
}

function _signHmac_(canonical, key) {
  var bytes = Utilities.computeHmacSha256Signature(canonical, key);
  return Utilities.base64EncodeWebSafe(bytes);
}

function _timingSafeEqual_(a, b) {
  a = String(a || '');
  b = String(b || '');
  var maxLen = Math.max(a.length, b.length);
  var mismatch = a.length ^ b.length;
  for (var i = 0; i < maxLen; i++) {
    var ac = i < a.length ? a.charCodeAt(i) : 0;
    var bc = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= ac ^ bc;
  }
  return mismatch === 0;
}

function _jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function _escapeHtml_(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build a signed preview URL for the web app.
 * @param {string} messageId
 * @returns {string}
 */
function buildSignedPreviewUrl(messageId) {
  var id = String(messageId || '').trim();
  if (!id) {
    throw new Error('messageId is required');
  }

  var ver = WEBAPP_SIGN_VERSION;
  var key = _getHmacKey_(ver);
  if (!key) {
    throw new Error('HMAC key not configured');
  }

  var iat = Math.floor(new Date().getTime() / 1000);
  var nonce = Utilities.getUuid();
  var payload = {
    aud: WEBAPP_AUDIENCE,
    iat: String(iat),
    messageId: id,
    nonce: nonce,
    ver: ver
  };

  var canonical = _canonicalizeSignedParams_(payload);
  var sig = _signHmac_(canonical, key);
  var serviceUrl = ScriptApp.getService().getUrl();
  var query =
    'messageId=' + encodeURIComponent(id) +
    '&iat=' + encodeURIComponent(payload.iat) +
    '&nonce=' + encodeURIComponent(nonce) +
    '&aud=' + encodeURIComponent(payload.aud) +
    '&ver=' + encodeURIComponent(payload.ver) +
    '&sig=' + encodeURIComponent(sig);

  return serviceUrl + '?' + query;
}

function _getHmacKey_(ver) {
  var props = PropertiesService.getScriptProperties();
  if (ver === '0') {
    return props.getProperty(WEBAPP_HMAC_KEY_PROPERTY_V0);
  }
  return props.getProperty(WEBAPP_HMAC_KEY_PROPERTY);
}

function _buildPreviewData_(messageId) {
  var app = getApp();
  var container = app.getContainer();
  var emailService = container.resolve('emailService');
  var attachmentService = container.resolve('attachmentService');
  var mappingRepo = container.resolve('mappingRepo');
  var attachmentMappingRepo = container.resolve('attachmentMappingRepo');
  var fieldRegistry = container.resolve('fieldRegistry');
  var attachmentFieldRegistry = container.resolve('attachmentFieldRegistry');
  var configRepo = container.resolve('configRepo');
  var config = configRepo.getAll();
  var emailData = emailService.extractById(messageId);
  if (!emailData) {
    throw new Error('Email not found');
  }

  var attachments = attachmentService.getAttachmentsForMessage(messageId, emailData.attachments || []);
  var selectedNames = attachmentService.getSelectedAttachmentNames(messageId);
  var items = (attachments || []).map(function(att, index) {
    var name = att && att.getName ? att.getName() : 'Attachment';
    var size = att && att.getSize ? att.getSize() : 0;
    var type = att && att.getContentType ? att.getContentType() : '';
    var selected = selectedNames === null ? true : selectedNames.indexOf(name) !== -1;
    return {
      id: String(index),
      name: name,
      size: size,
      type: type,
      selected: selected
    };
  });

  return {
    messageId: emailData.messageId,
    email: {
      subject: emailData.subject,
      from: emailData.from,
      to: emailData.to,
      date: emailData.date ? emailData.date.toISOString() : '',
      snippet: emailData.snippet,
      gmailLinkUrl: emailData.gmailLinkUrl
    },
    attachments: {
      total: items.length,
      items: items
    },
    mappings: _buildMappingSummary_({
      mappingRepo: mappingRepo,
      attachmentMappingRepo: attachmentMappingRepo,
      fieldRegistry: fieldRegistry,
      attachmentFieldRegistry: attachmentFieldRegistry,
      config: config
    })
  };
}

function _buildMappingSummary_(deps) {
  var mappingRepo = deps.mappingRepo;
  var attachmentMappingRepo = deps.attachmentMappingRepo;
  var fieldRegistry = deps.fieldRegistry;
  var attachmentFieldRegistry = deps.attachmentFieldRegistry;
  var config = deps.config || {};

  var emailMappings = mappingRepo ? mappingRepo.getEnabled() : {};
  var attachmentMappings = attachmentMappingRepo ? attachmentMappingRepo.getEnabled() : {};

  return {
    email: {
      databaseName: config.databaseName || '',
      items: _buildMappingItems_(emailMappings, fieldRegistry, 'Email ')
    },
    attachments: {
      databaseName: config.attachmentDatabaseName || config.databaseName || '',
      items: _buildMappingItems_(attachmentMappings, attachmentFieldRegistry, 'Attachment ')
    }
  };
}

function _buildMappingItems_(enabledMappings, registry, prefix) {
  var items = [];
  Object.keys(enabledMappings || {}).forEach(function(id) {
    var mapping = enabledMappings[id] || {};
    if (!mapping.notionPropertyName) return;
    var source = '';
    if (mapping.isStaticOption) {
      source = mapping.selectedOption || 'Value';
    } else {
      source = _formatMappingSourceLabelWeb_(mapping.emailField || '', registry, prefix);
    }
    items.push({
      target: mapping.notionPropertyName,
      source: source
    });
  });
  return items;
}

function _formatMappingSourceLabelWeb_(fieldValue, registry, prefix) {
  if (!fieldValue) return 'Value';
  var fields = registry && typeof registry.getAllFields === 'function'
    ? registry.getAllFields()
    : [];
  var match = fields.find(function(f) { return f.value === fieldValue; });
  if (match && match.label) {
    var label = String(match.label).replace(/^[^\\w]+/g, '').trim();
    return (prefix || '') + label;
  }
  return (prefix || '') + fieldValue;
}

/**
 * Rotate HMAC keys: V1 -> V0, generate new V1.
 * @returns {{ok: boolean, rotatedAt: string}}
 */
function rotateHmacKeys_() {
  var props = PropertiesService.getScriptProperties();
  var v1 = props.getProperty(WEBAPP_HMAC_KEY_PROPERTY);
  if (v1) {
    props.setProperty(WEBAPP_HMAC_KEY_PROPERTY_V0, v1);
  }

  var newKey = _generateHmacKey_();
  props.setProperty(WEBAPP_HMAC_KEY_PROPERTY, newKey);
  props.setProperty('G2N_HMAC_ROTATED_AT', new Date().toISOString());

  return { ok: true, rotatedAt: props.getProperty('G2N_HMAC_ROTATED_AT') };
}

/**
 * Generate a base64url-encoded 256-bit key.
 * @returns {string}
 */
function _generateHmacKey_() {
  var seed = [
    Utilities.getUuid(),
    Utilities.getUuid(),
    Utilities.getUuid(),
    String(new Date().getTime()),
    String(Math.random())
  ].join(':');
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(raw);
}

function clearHmacKeyV0_() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(WEBAPP_HMAC_KEY_PROPERTY_V0);
}
