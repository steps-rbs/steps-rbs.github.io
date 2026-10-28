/* Skill library atlas: frozen bundles, geometry cards, distilled skills. */
(function () {
  "use strict";
  var D = window.STEPS_DATA, S = window.STEPS, esc = S.esc, K = D.skills;
  var ROOM = {};
  D.rooms.forEach(function (r) { ROOM[r.id] = r; });
  var bundleOf = {};
  K.bundles.forEach(function (b) { bundleOf[b.room] = b; });
  var stage = S.get("prose.q3.stage_records.value");

  // Flatten each collection into list entries.
  var items = { bundles: [], cards: [], distilled: [] };
  K.bundles.forEach(function (b) {
    b.functions.slice().sort(function (x, y) { return (x.kind === "skill" ? 0 : 1) - (y.kind === "skill" ? 0 : 1) || x.start - y.start; })
      .forEach(function (f) {
        var sec = f.sections[0];
        items.bundles.push({ key: "b:" + b.room + ":" + f.name, room: b.room, name: f.name, kind: f.kind, bundle: b, fn: f,
          summary: sec ? sec.trigger : (f.doc || "Internal helper of the " + ROOM[b.room].label.toLowerCase() + " bundle."), search: f.signature });
      });
  });
  K.cards.forEach(function (c) {
    items.cards.push({ key: "c:" + c.id, room: c.room, name: c.id, kind: "card", card: c,
      summary: c.atoms.join(" · "), search: c.steps.join(" ") + " " + c.targets.join(" ") });
  });
  K.distilled.forEach(function (d) {
    var when = (d.text.split(/##\s*\w+/)[1] || d.text).trim().split("\n")[0];
    items.distilled.push({ key: "d:" + d.name, room: d.room, name: d.name, kind: d.level, skill: d, summary: when, search: d.signature });
  });

  var state = { tab: "bundles", query: "", active: null };
  var list = document.getElementById("skill-list"), reader = document.getElementById("skill-reader");

  function stats() {
    var nSkills = items.bundles.filter(function (i) { return i.kind === "skill"; }).length;
    var nHelpers = items.bundles.length - nSkills;
    var tiles = [
      [K.bundles.length, "frozen executable bundles, one per goal, SHA-256 pinned"],
      [nSkills, "exported skills, plus " + nHelpers + " internal helpers"],
      [K.cards.length, "geometry cards carried to RoboSuite and LIBERO"],
      [K.primitives.length, "primitives the cards are written over"],
      [K.distilled.length, "skills distilled from L1–L4 on one evolution route; executed in " + stage.executed[0] + " of " + stage.executed[1] + " L5 trials"]
    ];
    document.getElementById("skill-stats").innerHTML = tiles.map(function (t) {
      return '<div class="skill-stat"><strong>' + t[0] + "</strong><span>" + esc(t[1]) + "</span></div>";
    }).join("");
  }
  function tabs() {
    var el = document.getElementById("skill-tabs");
    [["bundles", "Executable bundles"], ["cards", "Geometry cards"], ["distilled", "Distilled skills"]].forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "tab"; b.dataset.tab = t[0]; b.setAttribute("role", "tab");
      b.textContent = t[1] + " · " + items[t[0]].length;
      b.addEventListener("click", function () { select(t[0], null); });
      el.appendChild(b);
    });
    var search = document.getElementById("skill-search");
    search.addEventListener("input", function () { state.query = search.value.trim().toLowerCase(); renderList(); });
  }
  function visible() {
    return items[state.tab].filter(function (i) {
      if (!state.query) return true;
      return (i.name + " " + i.summary + " " + i.search + " " + ROOM[i.room].label).toLowerCase().indexOf(state.query) >= 0;
    });
  }
  function renderList() {
    var rows = visible(), html = "", lastRoom = null;
    rows.forEach(function (i) {
      if (state.tab === "bundles" && i.room !== lastRoom) {
        html += '<div class="kind" style="margin:10px 2px 2px">' + esc(ROOM[i.room].label) + " · " + esc(i.bundle.id) + "</div>";
        lastRoom = i.room;
      }
      var badge = i.kind === "helper" ? '<span class="kind">helper</span>' : i.kind === "skill" ? '<span class="kind" style="color:var(--lime)">skill</span>'
        : i.kind === "card" ? '<span class="room-tag rt-' + i.room + '">' + esc(i.room) + "</span>"
        : '<span class="room-tag rt-' + i.room + '">' + esc(i.room) + " " + esc(i.kind) + "</span>";
      var exec = i.skill && i.skill.executed_at_l5 ? ' <span class="status ok">executed at L5 ×' + i.skill.executed_at_l5 + "</span>" : "";
      html += '<button type="button" class="skill-item' + (state.active === i.key ? " active" : "") + '" data-key="' + esc(i.key) + '" role="option">' +
        '<div class="si-top"><code>' + esc(i.name) + "</code>" + badge + "</div><p>" + esc(trim(i.summary, 120)) + exec + "</p></button>";
    });
    list.innerHTML = html || '<div class="empty">No skill matches.</div>';
    list.querySelectorAll(".skill-item").forEach(function (b) {
      b.addEventListener("click", function () { select(state.tab, b.dataset.key); });
    });
  }
  function trim(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function kv(rows) {
    return '<dl class="kv">' + rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>";
  }
  function codeBlock(code, range, id) {
    return '<div class="code-tools"><h4 style="margin:0">Source</h4>' + (range ? '<button class="mini-btn" type="button" data-toggle-dim>Show whole bundle</button>' : "") +
      '</div><pre class="code" id="' + id + '">' + S.renderCode(code, range) + "</pre>";
  }
  // Skill cards are short markdown: headings, bullet lists, paragraphs. Fenced code is dropped
  // here because the full source is shown in the code block below.
  function markdown(text) {
    var body = String(text).replace(/```[\s\S]*?```/g, "");
    var inline = function (s) { return esc(s).replace(/`([^`]+)`/g, '<code class="mono">$1</code>'); };
    var blocks = body.split(/\n{2,}/).map(function (x) { return x.trim(); }).filter(Boolean);
    blocks = blocks.filter(function (x, i) { return !/^#{2,}\s/.test(x) || (blocks[i + 1] && !/^#{2,}\s/.test(blocks[i + 1])); });
    return blocks.map(function (block) {
      block = block.trim();
      if (!block) return "";
      var h = /^#{2,}\s+(.*)$/.exec(block);
      if (h) return "<h4>" + esc(h[1]) + "</h4>";
      var lines = block.split("\n");
      if (lines.every(function (l) { return /^\s*[-*]\s+/.test(l); })) {
        return "<ul>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\s*[-*]\s+/, "")) + "</li>"; }).join("") + "</ul>";
      }
      return "<p>" + inline(block).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }
  function readBundle(i) {
    var f = i.fn, b = i.bundle;
    var secs = f.sections.map(function (s) {
      return "<div><h4>" + esc(s.title) + "</h4><p>" + esc(s.trigger) + "</p>" + (s.evidence ? '<p class="m-note" style="margin-top:6px">Evidence: ' + esc(s.evidence) + "</p>" : "") + "</div>";
    }).join("");
    var usage = '<div><h4>Use in main-batch programs (' + esc(ROOM[b.room].label) + ")</h4><div class=\"usage\"><div><strong>" + f.used_l5 + "/" + b.programs.L5 +
      "</strong><span>L5 programs calling it</span></div><div><strong>" + f.used_lower + "/" + b.programs["L1-L4"] + "</strong><span>L1–L4 programs calling it</span></div></div></div>";
    reader.innerHTML = '<div class="reader-head"><div class="m-kicker"><span class="room-tag rt-' + b.room + '">' + esc(ROOM[b.room].label) + '</span><span class="kind">' +
      esc(f.kind) + " · " + esc(b.platform) + " base</span></div><h3>" + esc(f.name) + '</h3><div class="sig">' + esc(f.signature) + "</div></div>" +
      '<div class="reader-body">' + (secs || "<p>Internal helper: called by the exported skills of this bundle, not offered to the policy directly.</p>") + usage +
      codeBlock(b.source, [f.start, f.end], "code-view") +
      kv([["Bundle", esc(b.id)], ["Source SHA-256", '<span class="mono">' + esc(b.source_sha256) + "</span>"],
          ["Bundle SHA-256", '<span class="mono">' + esc(b.file_sha256) + "</span>"], ["Exports", esc(b.exports.join(", "))],
          ["APIs used", esc(b.required_apis.join(", "))]]) + "</div>";
    var pre = document.getElementById("code-view"), first = pre.querySelector('[data-line="' + f.start + '"]');
    if (first) pre.scrollTop = Math.max(0, first.offsetTop - 12);
    var toggle = reader.querySelector("[data-toggle-dim]");
    if (toggle) toggle.addEventListener("click", function () {
      var dimmed = pre.querySelectorAll(".ln.dim").length > 0;
      pre.innerHTML = S.renderCode(b.source, dimmed ? null : [f.start, f.end]);
      toggle.textContent = dimmed ? "Highlight function" : "Show whole bundle";
    });
  }
  function readCard(i) {
    var c = i.card, src = bundleOf[c.room];
    reader.innerHTML = '<div class="reader-head"><div class="m-kicker"><span class="room-tag rt-' + c.room + '">from ' + esc(ROOM[c.room].label) +
      '</span><span class="kind">geometry card</span></div><h3>' + esc(c.id) + '</h3><div class="target-chips">' +
      c.atoms.map(function (a) { return '<span class="obj member">' + esc(a) + "</span>"; }).join("") + "</div></div>" +
      '<div class="reader-body"><div><h4>Pseudocode over the primitive interface</h4><ol>' +
      c.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></div>" +
      "<div><h4>Injected into (RoboSuite batches)</h4><div class=\"target-chips\">" +
      (c.targets.length ? c.targets.map(function (t) { return '<span class="obj">' + esc(t) + "</span>"; }).join("") : '<span class="m-note">Not part of a reported RoboSuite batch plan.</span>') +
      "</div></div>" +
      kv([["Abstracted from", '<button class="mini-btn" type="button" data-jump="b:' + c.room + ":" + esc(firstExport(c)) + '">' + esc(c.source_skill_id) + " →</button>"],
          ["Source SHA-256", '<span class="mono">' + esc(c.source_sha256) + "</span>"], ["Cards file SHA-256", '<span class="mono">' + esc(K.cards_sha256) + "</span>"],
          ["Primitives", esc(K.primitives.join(", "))]]) + "</div>";
    var jump = reader.querySelector("[data-jump]");
    jump.addEventListener("click", function () { select("bundles", jump.dataset.jump); });
  }
  function firstExport(c) { return bundleOf[c.room].exports[0]; }
  function readDistilled(i) {
    var d = i.skill;
    var status = d.executed_at_l5 ? '<span class="status ok">Executed unmodified in ' + d.executed_at_l5 + " L5 trials</span>"
      : '<span class="status neutral">Offered at L5, not executed unmodified</span>';
    reader.innerHTML = '<div class="reader-head"><div class="m-kicker"><span class="room-tag rt-' + d.room + '">' + esc(ROOM[d.room].label) + '</span><span class="kind">distilled from ' +
      esc(d.level) + " practice</span>" + status + "</div><h3>" + esc(d.name) + '</h3><div class="sig">' + esc(d.signature) + "</div></div>" +
      '<div class="reader-body">' + markdown(d.text) + codeBlock(d.code, null, "code-view") +
      kv([["Card SHA-256", '<span class="mono">' + esc(d.sha256) + "</span>"], ["Source episodes", esc(d.source_runs.join(", ") || "—")],
          ["Stage record", esc("Retained after validation on held-out episodes of its source task; offered in all " + stage.offered[1] + " L5 trials of the route.")]]) + "</div>";
  }

  function select(tab, key) {
    if (tab !== state.tab) { state.tab = tab; state.query = ""; document.getElementById("skill-search").value = ""; }
    var pool = visible();
    var item = pool.filter(function (i) { return i.key === key; })[0] || pool[0];
    state.active = item ? item.key : null;
    document.querySelectorAll("#skill-tabs .tab").forEach(function (b) {
      var on = b.dataset.tab === state.tab; b.classList.toggle("active", on); b.setAttribute("aria-selected", on);
    });
    renderList();
    if (!item) { reader.innerHTML = ""; return; }
    if (item.fn) readBundle(item); else if (item.card) readCard(item); else readDistilled(item);
    var el = list.querySelector('[data-key="' + CSS.escape(item.key) + '"]');
    if (el && key) el.scrollIntoView({ block: "nearest" });
  }

  stats();
  tabs();
  select("bundles", "b:kitchen:push_jar");
})();
