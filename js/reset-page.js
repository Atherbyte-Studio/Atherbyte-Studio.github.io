/*
  reset-page.js: the behaviour of /account/reset/ (choose a new password from an email link).
  Needs js/site-config.js and js/atherbyte-account.js first. The link carries a short-lived token after "#".
  The token is read once, removed from the address bar at once, kept only in memory (never in storage), and checked
  with the server before the form is shown. All text is inserted as plain text.
*/
(function () {
  "use strict";

  var A = window.AtherbyteAccount;
  function $(id) { return document.getElementById(id); }
  if (!A || !$("reset-form")) { return; }

  var client = A.get();
  var notice = $("acc-notice");
  var views = { checking: $("view-checking"), form: $("reset-form"), invalid: $("view-invalid"), done: $("view-done") };
  function show(name) { Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; }); }
  function say(kind, text) {
    if (!text) { notice.hidden = true; notice.textContent = ""; return; }
    notice.className = "notice notice-" + kind;
    notice.textContent = text;
    notice.hidden = false;
  }
  function formError(text) {
    var p = views.form.querySelector(".form-error");
    p.textContent = text || "";
    p.hidden = !text;
  }

  // Read the link once, then take it out of the address bar and the history entry.
  var fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  var token = fragment.get("access_token") || "";
  var linkType = fragment.get("type") || "";
  var linkFailed = fragment.has("error") || fragment.has("error_code");
  try { window.history.replaceState(null, "", window.location.pathname); } catch (e) { /* ignore */ }
  fragment = null;

  var username = "";

  Array.prototype.forEach.call(document.querySelectorAll("[data-toggle-for]"), function (btn) {
    btn.addEventListener("click", function () {
      var input = $(btn.getAttribute("data-toggle-for"));
      var visible = input.type === "password";
      input.type = visible ? "text" : "password";
      btn.textContent = visible ? "Hide" : "Show";
      btn.setAttribute("aria-pressed", String(visible));
    });
  });

  views.form.addEventListener("submit", function (e) {
    e.preventDefault();
    formError("");
    var p1 = $("new-password").value, p2 = $("new-password2").value;
    if (p1 !== p2) { formError("The two passwords are not the same."); $("new-password2").focus(); return; }
    var button = views.form.querySelector('button[type="submit"]'), label = button.querySelector(".btn-label");
    var before = label.textContent;
    button.disabled = true; label.textContent = "Saving…"; button.setAttribute("aria-busy", "true");
    client.resetPassword(token, p1, username).then(function (r) {
      button.disabled = false; label.textContent = before; button.setAttribute("aria-busy", "false");
      if (r.ok) {
        token = "";
        $("new-password").value = ""; $("new-password2").value = "";
        say("", "");
        show("done");
        return;
      }
      if (r.code === "invalid_reset_link" || r.code === "unauthorized") { token = ""; say("", ""); show("invalid"); return; }
      formError(r.message);
    });
  });

  function start() {
    if (!client.isConfigured()) { say("warn", A.messageFor("not_configured_client")); show("invalid"); return; }
    // Only a recovery link is accepted here. A missing token, an error in the link, or another kind of link: not valid.
    if (linkFailed || !token || (linkType && linkType !== "recovery")) { show("invalid"); return; }
    show("checking");
    client.checkResetToken(token).then(function (r) {
      if (r.ok) {
        username = r.username;
        $("reset-for").textContent = "Choose a new password for " + username + ".";
        show("form");
        $("new-password").focus();
        return;
      }
      if (r.code === "invalid_reset_link") { show("invalid"); return; }
      say("warn", r.message);
      show("invalid");
    });
  }
  start();
})();
