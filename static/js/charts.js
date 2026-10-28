/* Benchmarks, comparison tables and media strips. Charts are plain SVG built from the paper numbers. */
(function () {
  "use strict";
  var D = window.STEPS_DATA, S = window.STEPS, esc = S.esc, N = D.numbers;
  var NS = "http://www.w3.org/2000/svg";
  var css = getComputedStyle(document.documentElement);
  var C = {
    STEPS: css.getPropertyValue("--s-steps").trim(), ASPIRE: css.getPropertyValue("--s-aspire").trim(),
    RATs: css.getPropertyValue("--s-rats").trim(), "CaP-Agent0": css.getPropertyValue("--s-cap").trim(),
    update: css.getPropertyValue("--s-update").trim()
  };
  var LEVELS = ["L1", "L2", "L3", "L4", "L5"];
  var ROOMS = [["total", "All rooms"]].concat(D.rooms.map(function (r) { return [r.id, r.label]; }));

  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function width(svg) { return Math.max(320, svg.parentNode.clientWidth - 2); }
  // Bar with a 4px rounded data end and a square baseline end.
  function vbar(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    if (h <= 0) return "";
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) +
      "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function hbar(x, y, w, h, r) {
    r = Math.min(r, h / 2, w);
    if (w <= 0) return "";
    return "M" + x + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h - r) +
      "Q" + (x + w) + "," + (y + h) + " " + (x + w - r) + "," + (y + h) + "H" + x + "Z";
  }
  function pctText(v, digits) { return (v * 100).toFixed(digits || 0) + "%"; }
  function frac(p) { return p[0] + "/" + p[1]; }
  function legend(id, series) {
    document.getElementById(id).innerHTML = series.map(function (s) {
      return '<span><i class="' + (s.ghost ? "ghost" : "") + '" style="background:' + s.color + '"></i>' + esc(s.label) + "</span>";
    }).join("");
  }
  function tabs(id, options, active, onChange) {
    var box = document.getElementById(id);
    box.textContent = "";
    options.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "tab" + (o[0] === active ? " active" : ""); b.textContent = o[1]; b.setAttribute("role", "tab");
      b.addEventListener("click", function () {
        box.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active"); onChange(o[0]);
      });
      box.appendChild(b);
    });
  }
  function onResize(fn) {
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(fn, 150); });
  }

  // Grouped columns: categories × series, one tooltip per category listing every series.
  function columns(svg, o) {
    clear(svg);
    var W = width(svg), H = o.height || 320, m = { t: 28, r: 6, b: o.sub ? 50 : 36, l: 42 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b, ns = o.series.length, band = pw / o.categories.length;
    var bw = Math.min(24, (band * 0.7 - 2 * (ns - 1)) / ns), gw = bw * ns + 2 * (ns - 1);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("height", H);
    var y = function (v) { return m.t + ph * (1 - v); };
    var grid = el("g", { "class": "grid" }, svg);
    [0, .25, .5, .75, 1].forEach(function (v) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), "class": v === 0 ? "baseline" : null }, grid);
      el("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end" }, grid, Math.round(v * 100) + "%");
    });
    o.categories.forEach(function (cat, i) {
      var g = el("g", {}, svg), x0 = m.l + band * i + (band - gw) / 2;
      if (cat.divider) el("line", { x1: m.l + band * i, x2: m.l + band * i, y1: m.t - 6, y2: m.t + ph, stroke: "#d4dbd7", "stroke-width": 1 }, g);
      o.series.forEach(function (s, j) {
        var v = o.value(cat, s), x = x0 + j * (bw + 2);
        var p = el("path", { d: vbar(x, y(v.rate), bw, ph * v.rate, 4), fill: s.color, "class": "bar" }, g);
        p.style.animationDelay = (i * 60 + j * 40) + "ms";
        if (o.whisker) {
          var ci = S.wilson(v.k, v.n), cx = x + bw / 2;
          el("line", { x1: cx, x2: cx, y1: y(ci[1]), y2: y(ci[0]), stroke: "#1d2f2b", "stroke-width": 1.5 }, g);
          [ci[0], ci[1]].forEach(function (c) { el("line", { x1: cx - 6, x2: cx + 6, y1: y(c), y2: y(c), stroke: "#1d2f2b", "stroke-width": 1.5 }, g); });
        }
        if (s.label === o.labelSeries || o.labelAll) {
          var top = o.whisker ? y(S.wilson(v.k, v.n)[1]) : y(v.rate);
          el("text", { x: x + bw / 2, y: top - 7, "text-anchor": "middle", "class": "val" }, g, o.labelText ? o.labelText(v) : pctText(v.rate));
        }
      });
      el("text", { x: m.l + band * (i + .5), y: m.t + ph + 18, "text-anchor": "middle", "class": "cat" }, g, cat.label);
      if (cat.sub && band >= 66) el("text", { x: m.l + band * (i + .5), y: m.t + ph + 34, "text-anchor": "middle", "class": "sub" }, g, cat.sub);
      var hit = el("rect", { x: m.l + band * i, y: m.t - 10, width: band, height: ph + 10, fill: "transparent" }, g);
      var rows = function () {
        return o.series.map(function (s) { var v = o.value(cat, s); return { label: s.label, color: s.color, value: o.tipValue ? o.tipValue(v) : pctText(v.rate, 1) }; });
      };
      hit.addEventListener("pointerenter", function (e) { g.classList.add("hot"); S.tip.show(e, o.tipHead ? o.tipHead(cat) : cat.label, rows()); });
      hit.addEventListener("pointermove", S.tip.move);
      hit.addEventListener("pointerleave", function () { g.classList.remove("hot"); S.tip.hide(); });
    });
  }

  function dataTable(id, head, rows) {
    document.getElementById(id).innerHTML = "<thead><tr>" + head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody>";
  }

  // ---------------------------------------------------------------- Table 1 (capability comparison)
  (function () {
    var t = N.table0_features, sys = t.systems;
    var groups = [["Benchmarks", 2], ["Scene generation", 2], ["Task generation", 2], ["Self-improving agents", 2], ["", 1]];
    var html = '<thead><tr class="grp"><th></th>' + groups.map(function (g) { return '<th colspan="' + g[1] + '">' + esc(g[0]) + "</th>"; }).join("") + "</tr><tr><th></th>" +
      sys.map(function (s) { return '<th class="' + (s === "STEPS" ? "ours" : "") + '">' + esc(s) + "</th>"; }).join("") + "</tr></thead><tbody>";
    var last = null;
    t.rows.forEach(function (r) {
      if (r.group !== last) { html += '<tr class="grp-row"><td colspan="' + (sys.length + 1) + '">' + esc(r.group) + "</td></tr>"; last = r.group; }
      html += "<tr><td>" + esc(r.feature) + "</td>" + sys.map(function (s) {
        var yes = r.provided[s];
        return '<td class="' + (s === "STEPS" ? "ours" : "") + '"><span class="' + (yes ? "mark-yes" : "mark-no") + '" aria-label="' + (yes ? "provided" : "not provided") + '">' + (yes ? "✓" : "✕") + "</span></td>";
      }).join("") + "</tr>";
    });
    document.getElementById("compare-table").innerHTML = html + "</tbody>";
  })();

  // ---------------------------------------------------------------- Table 2 (scene generation)
  (function () {
    var t = N.table1_scene_gen, rooms = Object.keys(t);
    var cols = [["realism", "Real."], ["functionality", "Func."], ["text_fidelity", "TF"], ["layout", "Lay."], ["completeness", "Comp."], ["collision", "Coll. %"], ["stability", "Stab. %"]];
    function draw(room) {
      var methods = Object.keys(t[room]);
      document.getElementById("sg-table").innerHTML = "<thead><tr><th>Method</th>" + cols.map(function (c) { return "<th>" + c[1] + "</th>"; }).join("") + "</tr></thead><tbody>" +
        methods.map(function (mth) {
          return '<tr class="' + (mth === "STEPS" ? "ours" : "") + '"><td>' + esc(mth === "STEPS" ? "STEPS (ours)" : mth) + "</td>" + cols.map(function (c) {
            var v = t[room][mth][c[0]];
            return '<td class="' + (v.best ? "best" : "") + '">' + v.mean.toFixed(2) + '<span class="sd">±' + v.sd.toFixed(2) + "</span></td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody>";
    }
    tabs("sg-tabs", rooms.map(function (r) { return [r, r.replace(/\b\w/g, function (c) { return c.toUpperCase(); })]; }), rooms[1], draw);
    draw(rooms[1]);
  })();

  // ---------------------------------------------------------------- STEPS benchmark (Table 2)
  (function () {
    var t = N.table2_bench, room = "total";
    var series = [{ label: "STEPS", key: "STEPS", color: C.STEPS }, { label: "ASPIRE", key: "ASPIRE", color: C.ASPIRE }, { label: "CaP-Agent0", key: "CaP-Agent0", color: C["CaP-Agent0"] }];
    var sub = { L1: "action", L2: "relation", L3: "composition", L4: "preservation", L5: "full goal", overall: "105 tasks" };
    legend("t2-legend", series);
    function draw() {
      var cats = LEVELS.concat(["overall"]).map(function (k) { return { key: k, label: k === "overall" ? "Overall" : k, sub: sub[k], divider: k === "overall" }; });
      var roomLabel = ROOMS.filter(function (r) { return r[0] === room; })[0][1];
      columns(document.getElementById("t2-chart"), {
        categories: cats, series: series, height: 330, sub: true, labelSeries: "STEPS",
        value: function (c, s) { var p = t[room][s.key][c.key]; return { k: p[0], n: p[1], rate: p[0] / p[1] }; },
        tipHead: function (c) { return roomLabel + " · " + c.label; },
        tipValue: function (v) { return v.k + "/" + v.n + " · " + pctText(v.rate, 1); }
      });
      dataTable("t2-table", ["Method"].concat(cats.map(function (c) { return c.label; })), series.map(function (s) {
        return [s.label].concat(cats.map(function (c) { var p = t[room][s.key][c.key]; return frac(p) + " (" + pctText(p[0] / p[1], 1) + ")"; }));
      }));
    }
    tabs("t2-tabs", ROOMS, room, function (r) { room = r; draw(); });
    draw();
    onResize(draw);
  })();

  // ---------------------------------------------------------------- perturbation (Fig. 4a) + fixed runtime (Table A1)
  (function () {
    var p = N.prose.q2.perturbation;
    var cats = [{ key: "original", label: "Original L5", sub: "practiced layout" },
                { key: "small", label: "Small", sub: p.ranges.small }, { key: "medium", label: "Medium", sub: p.ranges.medium }];
    function draw() {
      columns(document.getElementById("pert-chart"), {
        categories: cats, series: [{ label: "STEPS", color: C.STEPS }], height: 390, sub: true, whisker: true, labelAll: true,
        value: function (c) { var v = p.value[c.key]; return { k: v[0], n: v[1], rate: v[0] / v[1] }; },
        labelText: function (v) { return v.k + "/" + v.n; },
        tipValue: function (v) { var ci = S.wilson(v.k, v.n); return v.k + "/" + v.n + " · " + pctText(v.rate) + " [" + pctText(ci[0]) + ", " + pctText(ci[1]) + "]"; }
      });
    }
    draw(); onResize(draw);
    var a1 = N.tableA1_fixed_runtime, rows = Object.keys(a1.rows);
    var head = ["Room", "L5 full goal", "L3 restated goal", "L3 other subtasks", "L3 all subtasks"];
    var keys = ["l5", "l3_restated", "l3_other", "l3_all"];
    document.getElementById("a1-table").innerHTML = "<thead><tr>" + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) {
        var strong = r === "All five rooms";
        return "<tr" + (strong ? ' style="font-weight:700"' : "") + "><td>" + esc(r) + "</td>" + keys.map(function (k) { return "<td>" + frac(a1.rows[r][k]) + "</td>"; }).join("") + "</tr>";
      }).join("") +
      "<tr><td>Rate</td>" + a1.rate.map(function (v) { return "<td><b>" + v.toFixed(1) + "%</b></td>"; }).join("") + "</tr>" +
      '<tr><td class="sub">95% interval</td>' + a1.interval95.map(function (v) { return '<td style="color:var(--faint)">[' + v[0].toFixed(1) + ", " + v[1].toFixed(1) + "]</td>"; }).join("") + "</tr></tbody>";
  })();

  // ---------------------------------------------------------------- stage records funnel (Fig. 4b)
  (function () {
    var s = N.prose.q3.stage_records.value;
    var rows = [["Skills per practice task", null], ["Candidates generated", s.candidates, C.STEPS], ["Validated and retained", s.retained, C.STEPS],
                ["L5 trials of the route", null], ["Offered at L5", s.offered, C["CaP-Agent0"]], ["Cited in the program", s.cited, C["CaP-Agent0"]],
                ["Executed unmodified", s.executed, C["CaP-Agent0"]]];
    var box = document.getElementById("funnel");
    box.innerHTML = rows.map(function (r) {
      if (!r[1]) return '<div class="funnel-group">' + esc(r[0]) + "</div>";
      return '<div class="funnel-row"><span>' + esc(r[0]) + '</span><div class="track"><div class="fill" style="background:' + r[2] + ";transform:scaleX(0)\" data-w=\"" +
        (r[1][0] / r[1][1]) + '"></div></div><b>' + frac(r[1]) + "</b></div>";
    }).join("") + '<p class="note">L5 success on this route: ' + frac(s.l5_success) + " trials.</p>";
    var fills = box.querySelectorAll(".fill");
    function grow() { fills.forEach(function (f) { f.style.transform = "scaleX(" + f.dataset.w + ")"; }); }
    if ("IntersectionObserver" in window && !S.reducedMotion) {
      var ob = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { grow(); ob.disconnect(); } }, { threshold: .3 });
      ob.observe(box);
    } else grow();
  })();

  // ---------------------------------------------------------------- RoboSuite (Table 3)
  (function () {
    var t = N.table3_robosuite;
    legend("t3-legend", [{ label: "RATs", color: C.RATs }, { label: "STEPS (frozen cards)", color: C.STEPS }, { label: "after targeted update", color: C.update, ghost: true }]);
    function draw() {
      var svg = document.getElementById("t3-chart");
      clear(svg);
      var W = width(svg), lw = W < 560 ? 132 : 200, m = { t: 8, r: 70, b: 30, l: lw }, rowH = 32, gh = 26;
      var rows = [], last = null;
      t.forEach(function (r) {
        if (!r.subtotal && r.group !== last) { rows.push({ group: r.group }); last = r.group; }
        rows.push(r);
      });
      var H = m.t + m.b + rows.reduce(function (a, r) { return a + (r.group && !r.task ? gh : rowH + (r.subtotal ? 10 : 0)); }, 0);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("height", H);
      var pw = W - m.l - m.r, x = function (v) { return m.l + pw * v; };
      var grid = el("g", { "class": "grid" }, svg);
      [0, .25, .5, .75, 1].forEach(function (v) {
        el("line", { x1: x(v), x2: x(v), y1: m.t, y2: H - m.b, "class": v === 0 ? "baseline" : null }, grid);
        el("text", { x: x(v), y: H - m.b + 18, "text-anchor": "middle" }, grid, Math.round(v * 100) + "%");
      });
      var yy = m.t;
      rows.forEach(function (r, i) {
        if (r.group && !r.task) { el("text", { x: 0, y: yy + 17, "class": "grp-label" }, svg, r.group); yy += gh; return; }
        if (r.subtotal) { el("line", { x1: 0, x2: W - m.r, y1: yy + 4, y2: yy + 4, stroke: "#c3c9c6" }, svg); yy += 10; }
        var g = el("g", {}, svg), rate = function (p) { return p[0] / p[1]; };
        el("text", { x: 0, y: yy + rowH / 2 + 4, "class": "cat", style: r.subtotal ? "font-weight:800" : null }, g, r.task);
        var b1 = el("path", { d: hbar(x(0), yy + 4, pw * rate(r.RATs), 11, 4), fill: C.RATs, "class": "bar hb" }, g);
        var b2 = el("path", { d: hbar(x(0), yy + 17, pw * rate(r.STEPS), 11, 4), fill: C.STEPS, "class": "bar hb" }, g);
        b1.style.animationDelay = b2.style.animationDelay = (i * 35) + "ms";
        var end = rate(r.STEPS), label = frac(r.STEPS);
        if (r.STEPS_update[0] > r.STEPS[0]) {
          el("rect", { x: x(rate(r.STEPS)) + 1, y: yy + 17.75, width: Math.max(2, pw * (rate(r.STEPS_update) - rate(r.STEPS)) - 2), height: 9.5, rx: 3,
                       fill: "rgba(0,90,80,.12)", stroke: C.update, "stroke-width": 1.5 }, g);
          end = rate(r.STEPS_update); label = frac(r.STEPS) + " → " + r.STEPS_update[0];
        }
        el("text", { x: x(end) + 6, y: yy + 26.5, "class": "val" }, g, label);
        var hit = el("rect", { x: 0, y: yy, width: W, height: rowH, fill: "transparent" }, g);
        hit.addEventListener("pointerenter", function (e) {
          g.classList.add("hot");
          S.tip.show(e, r.task, [{ label: "RATs", color: C.RATs, value: frac(r.RATs) + " · " + pctText(rate(r.RATs), 1) },
            { label: "STEPS", color: C.STEPS, value: frac(r.STEPS) + " · " + pctText(rate(r.STEPS), 1) },
            { label: "STEPS (Update)", color: C.update, value: frac(r.STEPS_update) + " · " + pctText(rate(r.STEPS_update), 1) }]);
        });
        hit.addEventListener("pointermove", S.tip.move);
        hit.addEventListener("pointerleave", function () { g.classList.remove("hot"); S.tip.hide(); });
        yy += rowH;
      });
      dataTable("t3-table", ["Task", "RATs", "STEPS", "STEPS (Update)"], t.map(function (r) { return [r.task, frac(r.RATs), frac(r.STEPS), frac(r.STEPS_update)]; }));
    }
    draw(); onResize(draw);

    // Recorded clips with a success/failure filter.
    var clips = D.media.robosuite_clips, mode = "all";
    var filterBox = document.getElementById("clip-filter");
    [["all", "All"], ["ok", "Successes"], ["no", "Failures"]].forEach(function (f) {
      var b = document.createElement("button"); b.type = "button"; b.className = "pill-btn" + (f[0] === mode ? " active" : ""); b.textContent = f[1];
      b.addEventListener("click", function () { mode = f[0]; filterBox.querySelectorAll(".pill-btn").forEach(function (x) { x.classList.toggle("active", x === b); }); strip(); });
      filterBox.appendChild(b);
    });
    function strip() {
      var box = document.getElementById("robosuite-clips");
      box.innerHTML = clips.filter(function (c) { return mode === "all" || (mode === "ok") === c.success; }).map(function (c) {
        return '<figure class="clip"><video muted loop playsinline preload="none" data-autoplay data-src="' + esc(c.video) + '" poster="' + esc(c.poster) +
          '"></video><figcaption class="c-cap"><b>' + esc(c.task) + '</b><span class="status ' + (c.success ? "ok" : "no") + '">' + (c.success ? "✓ success" : "✕ failure") +
          "</span></figcaption></figure>";
      }).join("");
      S.observeClips(box);
    }
    strip();

    var rec = document.getElementById("recovery");
    rec.innerHTML = D.media.recovery.map(function (r) {
      return '<figure><video muted playsinline preload="metadata" data-autoplay data-src="' + esc(r.video) + '" poster="' + esc(r.poster) + '"></video><figcaption><b>' + esc(r.label) +
        '</b><span class="status ' + (r.success ? "ok" : "no") + '">' + (r.success ? "✓ success" : "✕ failure") + "</span></figcaption></figure>";
    }).join("") + '<p class="note" style="grid-column:1/-1">PickPlaceCan, identical initial state (same reset). A qualitative example; aggregate gains are in the chart above. <button class="mini-btn" type="button" id="rec-sync" style="color:var(--ink);border-color:var(--line)">↻ Replay both from the start</button></p>';
    S.observeClips(rec);
    var vids = rec.querySelectorAll("video");
    vids.forEach(function (v) { v.loop = false; v.addEventListener("ended", function () {
      if (Array.prototype.every.call(vids, function (x) { return x.ended; })) setTimeout(sync, 900);
    }); });
    function sync() { vids.forEach(function (v) { if (!v.src) v.src = v.dataset.src; v.currentTime = 0; v.play().catch(function () {}); }); }
    document.getElementById("rec-sync").addEventListener("click", sync);
  })();

  // ---------------------------------------------------------------- LIBERO-PRO (Table 4)
  (function () {
    var t = N.table4_libero_pro;
    var series = [{ label: "ASPIRE", key: "ASPIRE", color: C.ASPIRE }, { label: "RATs", key: "RATs", color: C.RATs }, { label: "STEPS", key: "STEPS", color: C.STEPS }];
    var cats = [["object_pos", "Object", "Pos."], ["object_task", "Object", "Task"], ["goal_pos", "Goal", "Pos."], ["goal_task", "Goal", "Task"],
                ["spatial_pos", "Spatial", "Pos."], ["spatial_task", "Spatial", "Task"], ["avg", "Avg.", "six splits"]]
      .map(function (c) { return { key: c[0], label: c[1], sub: c[2], divider: c[0] === "avg" }; });
    legend("t4-legend", series);
    function draw() {
      columns(document.getElementById("t4-chart"), {
        categories: cats, series: series, height: 320, sub: true, labelSeries: "STEPS",
        value: function (c, s) { return { rate: t[s.key][c.key] / 100 }; },
        labelText: function (v) { return (v.rate * 100).toFixed(1); },
        tipHead: function (c) { return c.label + " · " + c.sub; },
        tipValue: function (v) { return (v.rate * 100).toFixed(1) + "%"; }
      });
    }
    draw(); onResize(draw);
    dataTable("t4-table", ["Method"].concat(cats.map(function (c) { return c.label + " " + c.sub; })), series.map(function (s) {
      return [s.label].concat(cats.map(function (c) { return t[s.key][c.key].toFixed(1) + "%"; }));
    }));
    var box = document.getElementById("libero-clips");
    box.innerHTML = D.media.libero_clips.map(function (c) {
      return '<figure class="clip"><video muted loop playsinline preload="none" data-autoplay data-src="' + esc(c.video) + '" poster="' + esc(c.poster) +
        '"></video><figcaption class="c-cap" style="flex-direction:column;align-items:flex-start"><b>' + esc(c.split) + "</b><span style=\"color:var(--muted)\">" +
        esc(c.prompt) + "</span></figcaption></figure>";
    }).join("");
    S.observeClips(box);
  })();
})();
