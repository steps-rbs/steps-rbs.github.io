/* STEPS project page: shared helpers, number binding, navigation. */
(function () {
  "use strict";
  var D = window.STEPS_DATA;
  var S = (window.STEPS = window.STEPS || {});

  S.esc = function (value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  S.get = function (path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, D.numbers);
  };
  S.pct = function (pair, digits) {
    return (pair[0] / pair[1] * 100).toFixed(digits == null ? 0 : digits) + "%";
  };
  S.format = function (value, fmt) {
    if (Array.isArray(value)) {
      if (fmt === "num") return String(value[0]);
      if (fmt === "den") return String(value[1]);
      if (fmt === "pct") return S.pct(value, 0);
      if (fmt === "pct1") return S.pct(value, 1);
      return value[0] + "/" + value[1];
    }
    if (fmt === "title") return String(value).replace(/^STEPS:\s*/, "");
    return String(value);
  };
  S.wilson = function (k, n) {
    var z = 1.959964, p = k / n, d = 1 + z * z / n;
    var c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
    return [Math.max(0, c - h), Math.min(1, c + h)];
  };
  S.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Bind paper numbers into static copy.
  document.querySelectorAll("[data-n]").forEach(function (el) {
    var value = S.get(el.getAttribute("data-n"));
    if (value == null) { console.warn("missing number", el.getAttribute("data-n")); return; }
    el.textContent = S.format(value, el.getAttribute("data-f"));
  });

  // Shared tooltip: values lead, labels follow; content built with textContent.
  var tip = document.getElementById("tip");
  S.tip = {
    show: function (event, head, rows) {
      tip.textContent = "";
      var h = document.createElement("div"); h.className = "t-head"; h.textContent = head; tip.appendChild(h);
      rows.forEach(function (r) {
        var row = document.createElement("div"); row.className = "t-row";
        var key = document.createElement("span"); key.className = "t-key";
        if (r.color) { var i = document.createElement("i"); i.style.background = r.color; key.appendChild(i); }
        key.appendChild(document.createTextNode(r.label));
        var b = document.createElement("b"); b.textContent = r.value;
        row.appendChild(b); row.appendChild(key); tip.appendChild(row);
      });
      tip.classList.add("show");
      S.tip.move(event);
    },
    move: function (event) {
      var x = event.clientX + 16, y = event.clientY + 14, w = tip.offsetWidth, h = tip.offsetHeight;
      if (x + w > window.innerWidth - 8) x = event.clientX - w - 16;
      if (y + h > window.innerHeight - 8) y = event.clientY - h - 14;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    },
    hide: function () { tip.classList.remove("show"); }
  };

  // Navigation: solid bar after the hero, scroll progress, scroll spy.
  var nav = document.getElementById("nav"), bar = document.getElementById("progress");
  var hero = document.getElementById("top");
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav-links a[href^='#']"));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  function onScroll() {
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? y / max * 100 : 0) + "%";
    nav.classList.toggle("solid", y > hero.offsetHeight - 80);
    var current = -1;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top < window.innerHeight * 0.35) current = i; });
    links.forEach(function (a, i) { a.classList.toggle("active", i === current); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Reveal on scroll.
  if ("IntersectionObserver" in window && !S.reducedMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  // Hero loop: pause off-screen and for reduced motion.
  var heroVideo = document.getElementById("hero-video");
  if (S.reducedMotion) { heroVideo.removeAttribute("autoplay"); heroVideo.pause(); }
  else if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { heroVideo.play().catch(function () {}); } else { heroVideo.pause(); } });
    }).observe(hero);
  }

  // Table-view toggles for charts.
  document.querySelectorAll(".table-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var t = document.getElementById(btn.getAttribute("data-table"));
      var show = !t.classList.contains("show");
      t.classList.toggle("show", show);
      btn.textContent = show ? "Hide table" : "Table view";
    });
  });

  // BibTeX copy.
  var copy = document.getElementById("bibtex-copy");
  copy.addEventListener("click", function () {
    var text = document.getElementById("bibtex").textContent.replace(/^Copy/, "").trim();
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
      copy.textContent = "Copied";
    }, function () { copy.textContent = "Select & copy"; });
    setTimeout(function () { copy.textContent = "Copy"; }, 1800);
  });

  // Optional links point outside the page folder; over HTTP, hide any the server does not provide.
  if (location.protocol.indexOf("http") === 0) {
    document.querySelectorAll("a[data-optional]").forEach(function (a) {
      fetch(a.getAttribute("href"), { method: "HEAD" }).then(function (r) { if (!r.ok) a.remove(); }, function () { a.remove(); });
    });
  }

  // Lazy autoplay for small looping clips once visible.
  S.observeClips = function (root) {
    var vids = root.querySelectorAll("video[data-autoplay]");
    if (!("IntersectionObserver" in window) || S.reducedMotion) return;
    var ob = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.src && v.dataset.src) v.src = v.dataset.src;
          if (v.dataset.rate) v.playbackRate = parseFloat(v.dataset.rate);
          v.play().catch(function () {});
        } else { v.pause(); }
      });
    }, { rootMargin: "120px" });
    vids.forEach(function (v) { ob.observe(v); });
  };
})();
