// Client-side check and preview of a MetaPhlAn merged taxonomy table.
// Plain JavaScript, no libraries. The file is read in the browser and never sent anywhere.
(function () {
  "use strict";

  var MAX_BYTES = 20 * 1024 * 1024; // 20 MB
  var MAX_ROWS = 50;
  var MAX_COLS = 20;

  var input = document.getElementById("file-input");
  if (!input) return; // not on a page with the upload form

  var form = document.getElementById("upload-form");
  var info = document.getElementById("file-info");
  var check = document.getElementById("check");
  var preview = document.getElementById("preview");
  var zone = document.querySelector(".dropzone");

  function setInfo(msg, isError) {
    info.textContent = msg;
    info.classList.toggle("error", !!isError);
  }

  function el(tag, text) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text; // textContent: no HTML injection
    return e;
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

  // Checks the MetaPhlAn merged-table layout and reports what it finds.
  function validate(rows, nRows) {
    check.innerHTML = "";
    var problems = [], notes = [];
    var header = rows[0];

    if (header[0] !== "clade_name") {
      problems.push("The first column header should be <code>clade_name</code>.");
    }
    if (header.length < 2) {
      problems.push("No sample columns found after <code>clade_name</code>.");
    }

    var species = 0, strains = 0, badNumbers = 0, rowsWithoutSpecies = 0;
    for (var i = 1; i < rows.length; i++) {
      var clade = rows[i][0] || "";
      if (clade.indexOf("|s__") !== -1 && clade.indexOf("|t__") === -1) species++;
      if (clade.indexOf("|t__") !== -1) strains++;
      if (clade.indexOf("|s__") === -1 && clade.indexOf("|t__") === -1) rowsWithoutSpecies++;
      for (var j = 1; j < rows[i].length; j++) {
        var v = rows[i][j];
        if (v !== "" && isNaN(Number(v))) badNumbers++;
      }
    }

    if (species === 0) problems.push("No species-level rows found (expected <code>|s__</code> in clade names).");
    if (badNumbers > 0) problems.push(badNumbers + " abundance value(s) are not numbers.");

    if (problems.length === 0) {
      var ok = el("p"); ok.className = "ok";
      ok.textContent = "Looks like a MetaPhlAn table: " + species + " species-level rows, " + (header.length - 1) + " samples.";
      check.appendChild(ok);
    }
    if (strains > 0) notes.push(strains + " strain-level rows (<code>|t__</code>) will be ignored for species counts.");
    if (rowsWithoutSpecies > 0) notes.push(rowsWithoutSpecies + " rows above species level (kingdom, phylum, etc.) are kept for display only.");

    if (problems.length || notes.length) {
      var wrap = el("div"); wrap.className = problems.length ? "warn" : "";
      problems.forEach(function (p) { var d = el("p"); d.className = "warn"; d.innerHTML = "&#9888; " + p; wrap.appendChild(d); });
      notes.forEach(function (n) { var d = el("p"); d.className = "muted"; d.innerHTML = n; wrap.appendChild(d); });
      check.appendChild(wrap);
    }
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
    if (file.size > MAX_BYTES) { setInfo("File is larger than 20 MB; check skipped.", true); return; }
    var reader = new FileReader();
    reader.onload = function () {
      // MetaPhlAn output may start with '#' comment lines (e.g. the database version); drop them.
      var text = String(reader.result).split(/\r?\n/).filter(function (l) { return l.charAt(0) !== "#"; }).join("\n");
      var firstLine = text.split("\n", 1)[0] || "";
      var delim = firstLine.split("\t").length >= firstLine.split(",").length ? "\t" : ",";
      var rows = parse(text, delim);
      if (rows.length < 2) { setInfo("Could not find a header and at least one data row.", true); preview.innerHTML = ""; check.innerHTML = ""; return; }
      var nRows = rows.length - 1, nCols = rows[0].length;
      setInfo(file.name + ": " + nRows + " clades × " + (nCols - 1) + " samples (" + (delim === "\t" ? "tab" : "comma") + "-separated).", false);
      validate(rows, nRows);
      render(rows);
    };
    reader.onerror = function () { setInfo("Could not read the file.", true); };
    reader.readAsText(file);
  }

  input.addEventListener("change", function () { handle(input.files[0]); });
  form.addEventListener("reset", function () { setInfo("", false); preview.innerHTML = ""; check.innerHTML = ""; });

  ["dragenter", "dragover"].forEach(function (ev) {
    zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove("dragover"); });
  });
  zone.addEventListener("drop", function (e) { handle(e.dataTransfer.files[0]); });
})();
