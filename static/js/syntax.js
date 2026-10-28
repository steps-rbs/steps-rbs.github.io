/* Minimal Python highlighter for the skill reader (escapes before tagging). */
(function () {
  "use strict";
  var S = window.STEPS;
  var KW = /^(def|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|import|from|as|raise|try|except|finally|with|lambda|pass|break|continue|global|class|yield|assert)$/;
  var BI = /^(np|range|len|max|min|abs|float|int|print|list|dict|tuple|set|sum|sorted|enumerate|zip|round|any|all|ValueError|RuntimeError|Exception|isinstance)$/;
  var TOKEN = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#.*$)|(\b\d+(?:\.\d+)?(?:e[-+]?\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/gm;

  S.highlightLine = function (line) {
    var out = "", last = 0, m, prev = "";
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(line))) {
      out += S.esc(line.slice(last, m.index));
      var text = S.esc(m[0]);
      if (m[1]) out += '<span class="tok-str">' + text + "</span>";
      else if (m[2]) out += '<span class="tok-com">' + text + "</span>";
      else if (m[3]) out += '<span class="tok-num">' + text + "</span>";
      else if (KW.test(m[4])) out += '<span class="tok-kw">' + text + "</span>";
      else if (prev === "def") out += '<span class="tok-def">' + text + "</span>";
      else if (BI.test(m[4])) out += '<span class="tok-bi">' + text + "</span>";
      else if (line.charAt(TOKEN.lastIndex) === "(") out += '<span class="tok-fn">' + text + "</span>";
      else out += text;
      prev = m[4] || "";
      last = TOKEN.lastIndex;
    }
    return out + S.esc(line.slice(last));
  };

  // Render code with line numbers; lines outside [start, end] are dimmed when a range is given.
  // Docstrings span lines, so triple-quote state is carried across lines.
  S.renderCode = function (code, range) {
    var lines = String(code).replace(/\s+$/, "").split("\n"), inDoc = false;
    return lines.map(function (line, i) {
      var n = i + 1, cls = "ln", html;
      if (range) cls += (n >= range[0] && n <= range[1]) ? " hl" : " dim";
      var quotes = (line.match(/"""/g) || []).length;
      if (inDoc) {
        var close = line.indexOf('"""');
        if (close < 0) html = '<span class="tok-str">' + S.esc(line) + "</span>";
        else { html = '<span class="tok-str">' + S.esc(line.slice(0, close + 3)) + "</span>" + S.highlightLine(line.slice(close + 3)); inDoc = false; }
      } else if (quotes % 2 === 1) {
        var open = line.indexOf('"""');
        html = S.highlightLine(line.slice(0, open)) + '<span class="tok-str">' + S.esc(line.slice(open)) + "</span>";
        inDoc = true;
      } else {
        html = S.highlightLine(line);
      }
      return '<div class="' + cls + '" data-line="' + n + '"><span>' + n + "</span><span>" + (html || " ") + "</span></div>";
    }).join("");
  };
})();
