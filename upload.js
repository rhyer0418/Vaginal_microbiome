// Client-side preview of an uploaded CSV/TSV. Plain JavaScript, no libraries.
// GitHub Pages is static hosting: the file is read in the browser and never sent anywhere.
(function () {
  "use strict";

  var MAX_BYTES = 20 * 1024 * 1024; // 20 MB
  var MAX_ROWS = 50;
  var MAX_COLS = 20;

  var input = document.getElementById("file-input");
  var form = document.getElementById("upload-form");
  var info = document.getElementById("file-info");
  var preview = document.getElementById("preview");
  var zone = document.querySelector(".dropzone");

  function setInfo(msg, isError) {
    info.textContent = msg;
    info.classList.toggle("error", !!isError);
  }

  // Minimal delimited-text parser that handles quoted fields.
  function parse(text, delim) {
    var rows = [], row = [], field = "", inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
        } else { field += c; }
      } else if (c === '"') { inQuotes = true; }
      else if (c === delim) { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else { field += c; }
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function el(tag, text) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text; // textContent: no HTML injection
    return e;
  }

  function render(rows) {
    preview.innerHTML = "";
    if (!rows.length) return;
    var nCols = Math.min(rows[0].length, MAX_COLS);
    var table = el("table");
    var thead = el("thead"), tr = el("tr");
    for (var j = 0; j < nCols; j++) {
      var th = el("th", rows[0][j]); th.scope = "col"; tr.appendChild(th);
    }
    thead.appendChild(tr); table.appendChild(thead);
    var tbody = el("tbody");
    for (var i = 1; i < Math.min(rows.length, MAX_ROWS + 1); i++) {
      var r = el("tr");
      for (var k = 0; k < nCols; k++) {
        var v = rows[i][k] === undefined ? "" : rows[i][k];
        var td = el("td", v);
        if (k > 0 && v !== "" && !isNaN(Number(v))) td.className = "num";
        r.appendChild(td);
      }
      tbody.appendChild(r);
    }
    table.appendChild(tbody);
    preview.appendChild(table);
  }

  function handle(file) {
    if (!file) return;
    if (file.size > MAX_BYTES) { setInfo("File is larger than 20 MB; preview skipped.", true); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      var firstLine = text.split(/\r?\n/, 1)[0];
      var delim = /\.tsv$/i.test(file.name) || firstLine.split("\t").length > firstLine.split(",").length ? "\t" : ",";
      var rows = parse(text, delim);
      if (rows.length < 2) { setInfo("Could not find a header and at least one data row.", true); preview.innerHTML = ""; return; }
      var nRows = rows.length - 1, nCols = rows[0].length;
      var msg = file.name + ": " + nRows + " rows × " + nCols + " columns (" + (delim === "\t" ? "tab" : "comma") + "-separated).";
      if (nRows > MAX_ROWS || nCols > MAX_COLS) msg += " Showing the first " + Math.min(nRows, MAX_ROWS) + " rows and " + Math.min(nCols, MAX_COLS) + " columns.";
      setInfo(msg, false);
      render(rows);
    };
    reader.onerror = function () { setInfo("Could not read the file.", true); };
    reader.readAsText(file);
  }

  input.addEventListener("change", function () { handle(input.files[0]); });
  form.addEventListener("reset", function () { setInfo("", false); preview.innerHTML = ""; });

  ["dragenter", "dragover"].forEach(function (ev) {
    zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove("dragover"); });
  });
  zone.addEventListener("drop", function (e) { handle(e.dataTransfer.files[0]); });
})();
