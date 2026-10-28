/* Task gallery: 105 generated tasks with filters, hover replays and a detail modal. */
(function () {
  "use strict";
  var D = window.STEPS_DATA, S = window.STEPS, esc = S.esc;
  var TYPE_LABEL = { goal_subtask: "Goal subtask", component_probe: "Component probe", constraint_probe: "Constraint probe", full_goal: "Full goal" };
  var TYPE_HELP = {
    goal_subtask: "Every successful L5 solution also satisfies this task's relations, so a library that has the goal's capabilities should solve it.",
    component_probe: "Exercises a capability that L5 solutions use but whose success the L5 score does not reveal.",
    constraint_probe: "Adds a preservation or geometry requirement that the full goal does not impose.",
    full_goal: "The complete human-specified goal; the library was developed on this task before being frozen."
  };
  var ROOM = {};
  D.rooms.forEach(function (r) { ROOM[r.id] = r; });
  var state = { room: "all", level: "all", type: "all", outcome: "all", query: "", page: 0 };
  var grid = document.getElementById("task-grid");
  var filtered = [];

  function pageSize() { return window.matchMedia("(max-width: 640px)").matches ? 8 : window.matchMedia("(max-width: 1100px)").matches ? 9 : 12; }
  function outcomeClass(t) { return t.successes === t.n ? "s-all" : t.successes === 0 ? "s-none" : "s-some"; }
  function outcomeIcon(t) { return t.successes === t.n ? "✓" : t.successes === 0 ? "✕" : "◐"; }
  function bestReplay(t) { return t.replays.length ? t.replays[0] : null; }

  // ---------------------------------------------------------------- filters
  function chip(group, value, label, extra) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip" + (state[group] === value ? " active" : "");
    b.dataset.group = group; b.dataset.value = value;
    b.innerHTML = (extra || "") + esc(label);
    b.addEventListener("click", function () { state[group] = value; state.page = 0; sync(); });
    return b;
  }
  function buildFilters() {
    var lv = document.getElementById("f-level");
    [["all", "All"], ["L1", "L1"], ["L2", "L2"], ["L3", "L3"], ["L4", "L4"], ["L5", "L5"]].forEach(function (x) { lv.appendChild(chip("level", x[0], x[1])); });
    var ty = document.getElementById("f-type");
    ty.appendChild(chip("type", "all", "All"));
    ["goal_subtask", "component_probe", "constraint_probe", "full_goal"].forEach(function (k) {
      ty.appendChild(chip("type", k, TYPE_LABEL[k], '<span class="dot t-' + k + '"></span>'));
    });
    var oc = document.getElementById("f-outcome");
    [["all", "All"], ["all5", "5/5"], ["some", "1–4/5"], ["none", "0/5"], ["replay", "▶ Replay"]].forEach(function (x) { oc.appendChild(chip("outcome", x[0], x[1])); });
    var rc = document.getElementById("room-cards");
    rc.appendChild(roomCard({ id: "all", label: "All rooms", goal: "Five human goals", still: D.rooms[2].still }));
    D.rooms.forEach(function (r) { rc.appendChild(roomCard(r)); });
    var search = document.getElementById("gallery-search");
    search.addEventListener("input", function () { state.query = search.value.trim().toLowerCase(); state.page = 0; render(); });
    document.getElementById("pg-prev").addEventListener("click", function () { state.page--; render(true); });
    document.getElementById("pg-next").addEventListener("click", function () { state.page++; render(true); });
  }
  function roomCard(r) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "room-card"; b.dataset.room = r.id; b.setAttribute("role", "tab");
    var l5 = r.id === "all" ? null : D.tasks.filter(function (t) { return t.room === r.id && t.level === "L5"; })[0];
    b.innerHTML = '<img src="' + esc(r.still) + '" alt="" loading="lazy"><div class="rc-text"><strong>' + esc(r.label) + "</strong><span>" +
      esc(r.id === "all" ? r.goal : "“" + r.goal + "” · L5 " + l5.successes + "/" + l5.n) + "</span></div>";
    b.addEventListener("click", function () { state.room = r.id; state.page = 0; sync(); });
    return b;
  }
  function sync() {
    document.querySelectorAll(".chip[data-group]").forEach(function (c) { c.classList.toggle("active", state[c.dataset.group] === c.dataset.value); });
    document.querySelectorAll(".room-card").forEach(function (c) {
      var on = c.dataset.room === state.room; c.classList.toggle("active", on); c.setAttribute("aria-selected", on);
    });
    render();
  }
  function matches(t) {
    if (state.room !== "all" && t.room !== state.room) return false;
    if (state.level !== "all" && t.level !== state.level) return false;
    if (state.type !== "all" && t.type !== state.type) return false;
    if (state.outcome === "all5" && t.successes !== t.n) return false;
    if (state.outcome === "some" && (t.successes === 0 || t.successes === t.n)) return false;
    if (state.outcome === "none" && t.successes !== 0) return false;
    if (state.outcome === "replay" && !t.replays.length) return false;
    if (state.query) {
      var hay = (t.title + " " + t.instruction + " " + t.objects.join(" ") + " " + ROOM[t.room].label + " " + t.level).toLowerCase();
      if (hay.indexOf(state.query) < 0) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- grid
  function card(t) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "task-card"; b.dataset.id = t.id;
    b.setAttribute("aria-label", t.level + " " + TYPE_LABEL[t.type] + ": " + t.title + ", " + t.successes + " of " + t.n + " trials succeeded");
    var rep = bestReplay(t);
    b.innerHTML = '<div class="tc-media"><img src="' + esc(t.still) + '" alt="" loading="lazy">' +
      (rep ? '<video muted loop playsinline preload="none"></video>' : "") +
      '<div class="tc-badges"><span class="lvl lvl-' + t.level + '">' + t.level + '</span><span class="score ' + outcomeClass(t) + '"><i>' +
      outcomeIcon(t) + "</i>" + t.successes + "/" + t.n + "</span></div>" +
      (rep ? '<span class="tc-replay">▶ replay</span>' : "") + "</div>" +
      '<div class="tc-body"><div class="tc-title">' + esc(t.title) + '</div><div class="tc-meta"><span class="type-tag"><span class="dot t-' + t.type + '"></span>' +
      esc(TYPE_LABEL[t.type]) + "</span><span>" + esc(ROOM[t.room].label) + "</span></div></div>";
    if (rep && !S.reducedMotion) {
      var v = b.querySelector("video");
      b.addEventListener("mouseenter", function () {
        if (!v.src) v.src = rep.video;
        v.play().then(function () { b.classList.add("playing"); }).catch(function () {});
      });
      b.addEventListener("mouseleave", function () { v.pause(); b.classList.remove("playing"); });
    }
    b.addEventListener("click", function () { openModal(t.id); });
    return b;
  }
  function render(scroll) {
    filtered = D.tasks.filter(matches);
    var size = pageSize(), pages = Math.max(1, Math.ceil(filtered.length / size));
    state.page = Math.min(Math.max(0, state.page), pages - 1);
    grid.textContent = "";
    var slice = filtered.slice(state.page * size, state.page * size + size);
    if (!slice.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1">No task matches these filters.</div>';
    }
    slice.forEach(function (t) { grid.appendChild(card(t)); });
    var solved = filtered.reduce(function (a, t) { return a + t.successes; }, 0), trials = filtered.reduce(function (a, t) { return a + t.n; }, 0);
    document.getElementById("gallery-count").textContent = filtered.length + " of " + D.tasks.length + " tasks" +
      (trials ? " · main batch " + solved + "/" + trials + " (" + Math.round(solved / trials * 100) + "%)" : "");
    document.getElementById("pg-label").textContent = "Page " + (state.page + 1) + " of " + pages;
    document.getElementById("pg-prev").disabled = state.page === 0;
    document.getElementById("pg-next").disabled = state.page >= pages - 1;
    if (scroll) document.getElementById("gallery-toolbar").scrollIntoView({ behavior: S.reducedMotion ? "auto" : "smooth", block: "start" });
  }

  // ---------------------------------------------------------------- modal
  var modal = document.getElementById("task-modal"), current = null, lastFocus = null;
  function media(t, replay) {
    var box = document.getElementById("m-media");
    box.textContent = "";
    if (replay) {
      var v = document.createElement("video");
      v.controls = true; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
      v.poster = replay.poster; v.src = replay.video;
      box.appendChild(v);
    } else {
      var img = document.createElement("img"); img.src = t.still; img.alt = "Path-traced start state of " + t.title; box.appendChild(img);
    }
    var sw = document.createElement("div"); sw.className = "trial-switch";
    var still = document.createElement("button"); still.type = "button"; still.className = "chip" + (replay ? "" : " active"); still.textContent = "Start state";
    still.addEventListener("click", function () { media(t, null); });
    sw.appendChild(still);
    t.replays.forEach(function (r) {
      var b = document.createElement("button"); b.type = "button"; b.className = "chip" + (replay === r ? " active" : "");
      b.textContent = "▶ Replay · seed " + r.seed + (r.success ? " ✓" : " ✕");
      b.addEventListener("click", function () { media(t, r); });
      sw.appendChild(b);
    });
    box.appendChild(sw);
  }
  function side(t) {
    var room = ROOM[t.room];
    var objs = t.objects.map(function (o) {
      var cls = t.members.indexOf(o) >= 0 ? " member" : t.keep.indexOf(o) >= 0 ? " keep" : "";
      return '<span class="obj' + cls + '">' + esc(o) + "</span>";
    }).join("");
    var dots = t.trials.map(function (r) {
      return '<span class="trial-dot ' + (r.success ? "ok" : "no") + '"><b>' + (r.success ? "✓" : "✕") + "</b>" + r.seed + "</span>";
    }).join("");
    var rep = t.replays.length ? '<p class="m-note">Replays: saved-program replays of evolution-route trials on this task (paper appendix), path-traced with a fixed tabletop camera; the replay reproduces the recorded outcome.</p>' : "";
    document.getElementById("m-side").innerHTML =
      '<div class="m-kicker"><span class="room-tag rt-' + t.room + '">' + esc(room.label) + '</span><span class="lvl lvl-' + t.level + '">' + t.level +
      '</span><span class="type-tag"><span class="dot t-' + t.type + '"></span>' + esc(TYPE_LABEL[t.type]) + "</span></div>" +
      '<h3 class="m-title" id="m-title">' + esc(t.title) + "</h3>" +
      '<div class="m-section"><h4>Instruction</h4><div class="m-instruction">' + esc(t.instruction) + "</div></div>" +
      '<div class="m-section"><h4>Main batch · frozen library · ' + t.successes + "/" + t.n + "</h4><div class=\"trial-dots\">" + dots + "</div>" +
      (t.revised ? '<p class="m-note" style="margin-top:8px">Dining L4/L5 use the controller-state-fix rerun, as in Table 2.</p>' : "") + "</div>" +
      '<div class="m-section"><h4>Why this is a ' + esc(TYPE_LABEL[t.type].toLowerCase()) + "</h4><p class=\"m-note\" style=\"color:#c7d6cf\">" + esc(TYPE_HELP[t.type]) + "</p></div>" +
      '<div class="m-section"><h4>Objects in the scene</h4><div class="obj-chips">' + objs + '</div><p class="m-note" style="margin-top:6px">' +
      (t.members.length ? "Green: manipulated. " : "") + (t.keep.length ? "Orange: must stay within 5 cm. " : "") + "All objects start from their L5 poses.</p></div>" +
      rep + '<div class="modal-nav"><button type="button" data-step="-1">← Previous</button><button type="button" data-step="1">Next →</button></div>';
    document.querySelectorAll("#m-side [data-step]").forEach(function (b) {
      b.addEventListener("click", function () { step(parseInt(b.dataset.step, 10)); });
    });
  }
  function openModal(id) {
    var t = D.tasks.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    current = t;
    if (!modal.classList.contains("open")) lastFocus = document.activeElement;
    media(t, bestReplay(t));
    side(t);
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    modal.querySelector(".modal-close").focus();
    history.replaceState(null, "", "#task=" + id);
  }
  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    document.getElementById("m-media").textContent = "";
    history.replaceState(null, "", "#gallery");
    if (lastFocus) lastFocus.focus();
  }
  function step(dir) {
    var list = filtered.length ? filtered : D.tasks;
    var i = list.indexOf(current);
    openModal(list[(i + dir + list.length) % list.length].id);
  }
  modal.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", closeModal); });
  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  buildFilters();
  sync();
  var resizeTimer;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { render(); }, 200); });
  var m = /^#task=(.+)$/.exec(location.hash);
  if (m) openModal(decodeURIComponent(m[1]));
})();
