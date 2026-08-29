(function () {
  function truthy(value) {
    return value === "true" || value === "1" || value === "yes";
  }

  function readParam(name) {
    var search = new URLSearchParams(window.location.search);
    if (search.has(name)) {
      return search.get(name);
    }
    var hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      var hashParams = new URLSearchParams(hash);
      if (hashParams.has(name)) {
        return hashParams.get(name);
      }
    }
    return null;
  }

  function stripAutoOpenPageMode() {
    var rawHash = window.location.hash.replace(/^#/, "");
    if (!rawHash || rawHash.indexOf("pagemode=") === -1) {
      return;
    }
    var params = new URLSearchParams(rawHash);
    var mode = params.get("pagemode");
    if (!mode || mode === "none") {
      return;
    }
    params.set("pagemode", "none");
    var nextHash = params.toString();
    history.replaceState(null, "", window.location.pathname + window.location.search + (nextHash ? "#" + nextHash : ""));
  }

  stripAutoOpenPageMode();

  function revealLabel(button, fallback) {
    if (!button) {
      return;
    }
    var label = button.querySelector("span");
    if (label && !label.textContent.trim()) {
      label.textContent = fallback;
    }
  }

  function showToolsEnabled() {
    return truthy(readParam("showtools"));
  }

  document.documentElement.classList.add("kk-compact");
  if (document.body) {
    document.body.classList.add("kk-compact");
  }

  if (showToolsEnabled()) {
    document.documentElement.classList.add("kk-show-tools");
    if (document.body) {
      document.body.classList.add("kk-show-tools");
    }
  }

  function relocate() {
    if (document.getElementById("kkBottomNav")) {
      return;
    }

    document.body.classList.add("kk-compact");
    if (document.documentElement.classList.contains("kk-show-tools")) {
      document.body.classList.add("kk-show-tools");
    }

    var prev = document.getElementById("previous");
    var next = document.getElementById("next");
    var pageNumber = document.getElementById("pageNumber");
    var findButton = document.getElementById("viewFindButton");
    var middle = document.getElementById("toolbarViewerMiddle");
    var right = document.getElementById("toolbarViewerRight");
    var toggle = document.getElementById("viewsManagerToggleButton");

    if (!prev || !next || !pageNumber || !findButton || !middle || !right) {
      return;
    }

    revealLabel(toggle, "目录");
    revealLabel(prev, "上一页");
    revealLabel(next, "下一页");
    revealLabel(findButton, "搜索");

    var pagerGroup = prev.parentElement;
    if (pagerGroup) {
      pagerGroup.classList.remove("hiddenSmallView");
    }

    var pageGroup = document.getElementById("numPages");
    pageGroup = pageGroup ? pageGroup.parentElement : pageNumber.closest(".loadingInput").parentElement;
    var findGroup = findButton.closest(".toolbarButtonWithContainer");
    var separator = pagerGroup && pagerGroup.querySelector(".splitToolbarButtonSeparator");
    if (separator) {
      separator.remove();
    }

    var nav = document.createElement("div");
    nav.id = "kkBottomNav";
    nav.setAttribute("role", "toolbar");
    nav.setAttribute("aria-label", "页面导航");
    nav.append(prev, pageGroup, next, findGroup);
    document.body.append(nav);

    var fab = document.createElement("button");
    fab.id = "kkToolsFab";
    fab.type = "button";
    fab.title = "更多工具";
    fab.setAttribute("aria-label", "更多工具");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", "kkToolsPanel");
    fab.innerHTML = '<span class="kk-fab-icon" aria-hidden="true"></span>';

    var panel = document.createElement("div");
    panel.id = "kkToolsPanel";
    panel.setAttribute("role", "toolbar");
    panel.setAttribute("aria-label", "阅读工具");
    panel.append(middle, right);

    document.body.append(fab, panel);

    function setOpen(open) {
      document.body.classList.toggle("kk-tools-open", open);
      document.documentElement.classList.toggle("kk-tools-open", open);
      fab.setAttribute("aria-expanded", String(open));
    }

    fab.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(!document.body.classList.contains("kk-tools-open"));
    });

    document.addEventListener("click", function (event) {
      if (!document.body.classList.contains("kk-tools-open")) {
        return;
      }
      if (panel.contains(event.target) || fab.contains(event.target)) {
        return;
      }
      setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });

    bindEdgeReveal();
  }

  var edgeRevealBound = false;

  function bindEdgeReveal() {
    if (edgeRevealBound) {
      return;
    }
    var toggle = document.getElementById("viewsManagerToggleButton");
    var nav = document.getElementById("kkBottomNav");
    if (!toggle || !nav) {
      return;
    }
    edgeRevealBound = true;

    var hideLeftTimer = 0;
    var hideBottomTimer = 0;
    var nearLeft = 72;
    var hideDelay = 180;

    function setNear(side, on) {
      document.documentElement.classList.toggle("kk-near-" + side, on);
      if (document.body) {
        document.body.classList.toggle("kk-near-" + side, on);
      }
    }

    function sidebarOpen() {
      var outer = document.getElementById("outerContainer");
      return (outer && outer.classList.contains("viewsManagerOpen")) || toggle.classList.contains("toggled");
    }

    function findOpen() {
      var findButton = document.getElementById("viewFindButton");
      return !!(findButton && findButton.classList.contains("toggled"));
    }

    function updateFromPoint(x, y) {
      var leftOn = x <= nearLeft || toggle.matches(":hover") || sidebarOpen();

      if (leftOn) {
        window.clearTimeout(hideLeftTimer);
        setNear("left", true);
      } else {
        window.clearTimeout(hideLeftTimer);
        hideLeftTimer = window.setTimeout(function () {
          if (!sidebarOpen()) {
            setNear("left", false);
          }
        }, hideDelay);
      }
    }

    document.addEventListener("mousemove", function (event) {
      updateFromPoint(event.clientX, event.clientY);
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", function () {
      if (!sidebarOpen()) {
        setNear("left", false);
      }
      if (!findOpen()) {
        setNear("bottom", false);
      }
    });

    toggle.addEventListener("focusin", function () {
      setNear("left", true);
    });

    nav.addEventListener("mouseenter", function () {
      window.clearTimeout(hideBottomTimer);
      setNear("bottom", true);
    });
    nav.addEventListener("mouseleave", function () {
      window.clearTimeout(hideBottomTimer);
      hideBottomTimer = window.setTimeout(function () {
        if (!findOpen()) {
          setNear("bottom", false);
        }
      }, hideDelay);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", relocate);
  } else {
    relocate();
  }

  var fittingWidePages = false;
  var PDF_TO_CSS = 96 / 72;
  var PAGE_H_CHROME = 20;
  var SCALE_EPS = 0.0005;

  function pageRawDisplayWidth(pageView) {
    var viewport = pageView && pageView.viewport;
    var dims = viewport && viewport.rawDims;
    if (!dims) {
      return 0;
    }
    var rot = viewport.rotation || 0;
    return rot % 180 === 0 ? dims.pageWidth : dims.pageHeight;
  }

  function fitOnePageView(pageView, avail, globalFactor) {
    if (!pageView || !pageView.pdfPage || !pageView.div) {
      return false;
    }
    var rawW = pageRawDisplayWidth(pageView);
    if (!rawW) {
      return false;
    }
    var userUnit = pageView.viewport.userUnit || 1;
    var widthAtGlobal = globalFactor * userUnit * rawW;
    var div = pageView.div;
    if (widthAtGlobal <= avail + 0.5) {
      if (!div.style.getPropertyValue("--scale-factor")) {
        return false;
      }
      div.style.removeProperty("--scale-factor");
      return true;
    }
    var targetFactor = avail / (userUnit * rawW);
    var currentFactor = div.style.getPropertyValue("--scale-factor");
    if (currentFactor && Math.abs(parseFloat(currentFactor) - targetFactor) < SCALE_EPS) {
      return false;
    }
    div.style.setProperty("--scale-factor", String(targetFactor));
    return true;
  }

  function fitWidePageViews(app, relayout) {
    var pdfViewer = app && app.pdfViewer;
    if (fittingWidePages || !pdfViewer || !pdfViewer._pages || !pdfViewer._pages.length) {
      return;
    }
    var avail = pdfViewer.container.clientWidth - PAGE_H_CHROME;
    if (avail <= 0) {
      return;
    }
    var globalScale = pdfViewer.currentScale;
    if (!globalScale) {
      return;
    }
    var globalFactor = globalScale * PDF_TO_CSS;
    fittingWidePages = true;
    var changed = false;
    try {
      pdfViewer._pages.forEach(function (pageView) {
        if (fitOnePageView(pageView, avail, globalFactor)) {
          changed = true;
        }
      });
      if (changed && relayout) {
        pdfViewer.update();
      }
    } finally {
      fittingWidePages = false;
    }
  }

  function bindFitWidePages(app) {
    var timer = 0;
    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        fitWidePageViews(app, true);
      }, 60);
    }
    function fitRenderedPage(evt) {
      var pdfViewer = app.pdfViewer;
      if (fittingWidePages || !pdfViewer || !evt || !evt.pageNumber) {
        return;
      }
      var avail = pdfViewer.container.clientWidth - PAGE_H_CHROME;
      var globalScale = pdfViewer.currentScale;
      if (avail <= 0 || !globalScale) {
        return;
      }
      fitOnePageView(pdfViewer._pages[evt.pageNumber - 1], avail, globalScale * PDF_TO_CSS);
    }
    if (app.eventBus) {
      app.eventBus.on("pagesloaded", schedule);
      app.eventBus.on("scalechanging", schedule);
      app.eventBus.on("rotationchanging", schedule);
      app.eventBus.on("pagerender", fitRenderedPage);
      app.eventBus.on("pagerendered", function (evt) {
        fitRenderedPage(evt);
        schedule();
      });
    }
    window.addEventListener("resize", schedule);
    schedule();
  }

  function whenViewerReady(callback) {
    var tries = 0;
    function attach() {
      var app = window.PDFViewerApplication;
      if (!app || !app.initializedPromise) {
        return false;
      }
      app.initializedPromise.then(function () {
        callback(app);
      });
      return true;
    }
    if (attach()) {
      return;
    }
    document.addEventListener("webviewerloaded", function () {
      attach();
    });
    var timer = window.setInterval(function () {
      tries += 1;
      if (attach() || tries > 80) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  function collapseOutlineToTopLevel() {
    var view = document.getElementById("outlinesView");
    if (!view) {
      return;
    }
    view.querySelectorAll(".treeItemToggler").forEach(function (el) {
      el.classList.add("treeItemsHidden");
    });
  }

  function bindKeepOutlineClosed(app) {
    var userOpened = false;
    var toggle = document.getElementById("viewsManagerToggleButton");
    if (toggle) {
      toggle.addEventListener("click", function () {
        userOpened = true;
      });
    }

    function closeAutoOpened() {
      if (userOpened) {
        return;
      }
      try {
        if (window.PDFViewerApplicationOptions) {
          window.PDFViewerApplicationOptions.set("sidebarViewOnLoad", 0);
        }
      } catch (e) {}
      if (app.viewsManager && app.viewsManager.isOpen) {
        app.viewsManager.close();
      }
    }

    closeAutoOpened();
    if (app.eventBus) {
      app.eventBus.on("documentinit", closeAutoOpened);
      app.eventBus.on("pagesloaded", closeAutoOpened);
      app.eventBus.on("outlineloaded", function () {
        collapseOutlineToTopLevel();
        closeAutoOpened();
      });
    }
    [0, 50, 200, 800].forEach(function (ms) {
      window.setTimeout(closeAutoOpened, ms);
    });
  }

  function bindOutlineNavigation(app) {
    var view = document.getElementById("outlinesView");
    var linkService = app && (app.pdfLinkService || app.linkService);
    if (!view || !linkService || view.dataset.kkOutlineNav === "1") {
      return;
    }
    view.dataset.kkOutlineNav = "1";
    // Capture phase so we still navigate even when legacy onclick returns false.
    view.addEventListener("click", function (event) {
      if (event.target.closest && event.target.closest(".treeItemToggler")) {
        return;
      }
      var anchor = event.target.closest ? event.target.closest("a") : null;
      if (!anchor || !view.contains(anchor)) {
        return;
      }
      var href = anchor.getAttribute("href") || "";
      if (!href || href.charAt(0) !== "#") {
        return;
      }
      var hash = href.slice(1);
      if (!hash || typeof linkService.setHash !== "function") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      try {
        var treeItem = anchor.parentNode;
        if (treeItem && treeItem.classList && treeItem.classList.contains("treeItem")) {
          view.querySelectorAll(".treeItem.selected").forEach(function (el) {
            el.classList.remove("selected");
          });
          treeItem.classList.add("selected");
        }
        linkService.setHash(hash);
      } catch (err) {}
    }, true);
  }

  whenViewerReady(function (app) {
    bindKeepOutlineClosed(app);
    bindOutlineNavigation(app);
    bindEdgeReveal();
    bindFitWidePages(app);
    bindRegionSelect(app);
  });

  var REGION_START = "kk-start-region-select";
  var REGION_CANCEL = "kk-cancel-region-select";
  var REGION_SELECTED = "kk-region-selected";
  var REGION_BOX_CLASS = "kk-region-box";
  var REGION_HINT_ID = "kkRegionHint";
  var MIN_BOX_PX = 4;

  function bindRegionSelect(app) {
    var selecting = false;
    var drag = null;
    var lastRegion = null;
    var hint = null;

    function getScaleFactor(pageEl) {
      var raw = window.getComputedStyle(pageEl).getPropertyValue("--scale-factor");
      var scale = parseFloat(raw);
      return scale > 0 ? scale : 1;
    }

    function pageNumberOf(pageEl) {
      var n = Number(pageEl.getAttribute("data-page-number"));
      return n > 0 ? n : 1;
    }

    function cssToPdf(pageEl, clientX, clientY) {
      var rect = pageEl.getBoundingClientRect();
      var scale = getScaleFactor(pageEl);
      var x = (clientX - rect.left - pageEl.clientLeft) / scale;
      var y = (clientY - rect.top - pageEl.clientTop) / scale;
      var maxX = pageEl.clientWidth / scale;
      var maxY = pageEl.clientHeight / scale;
      return {
        x: Math.min(Math.max(0, x), maxX),
        y: Math.min(Math.max(0, y), maxY)
      };
    }

    function round2(n) {
      return Math.round(n * 100) / 100;
    }

    function layoutBox(box, x0, y0, x1, y1) {
      var left = Math.min(x0, x1);
      var top = Math.min(y0, y1);
      var width = Math.abs(x1 - x0);
      var height = Math.abs(y1 - y0);
      box.style.left = "calc(var(--scale-factor) * " + left + "px)";
      box.style.top = "calc(var(--scale-factor) * " + top + "px)";
      box.style.width = "calc(var(--scale-factor) * " + width + "px)";
      box.style.height = "calc(var(--scale-factor) * " + height + "px)";
    }

    function clearBoxes() {
      document.querySelectorAll("." + REGION_BOX_CLASS).forEach(function (el) {
        el.remove();
      });
    }

    function ensureHint() {
      if (hint && hint.isConnected) {
        return hint;
      }
      hint = document.getElementById(REGION_HINT_ID);
      if (!hint) {
        hint = document.createElement("div");
        hint.id = REGION_HINT_ID;
        hint.setAttribute("role", "status");
        hint.textContent = "请框选区域";
        document.body.append(hint);
      }
      return hint;
    }

    function paintRegion(region) {
      clearBoxes();
      if (!region) {
        return;
      }
      var pageEl = document.querySelector('.page[data-page-number="' + region[0] + '"]');
      if (!pageEl) {
        return;
      }
      var box = document.createElement("div");
      box.className = REGION_BOX_CLASS;
      layoutBox(box, region[1], region[3], region[2], region[4]);
      pageEl.append(box);
    }

    function setSelecting(on) {
      selecting = on;
      document.documentElement.classList.toggle("kk-region-selecting", on);
      if (document.body) {
        document.body.classList.toggle("kk-region-selecting", on);
      }
      if (on) {
        ensureHint();
      }
    }

    function startSelect() {
      drag = null;
      lastRegion = null;
      clearBoxes();
      setSelecting(true);
    }

    function cancelSelect() {
      drag = null;
      lastRegion = null;
      clearBoxes();
      setSelecting(false);
    }

    function finishDrag(clientX, clientY) {
      if (!drag) {
        return;
      }
      var pdf = cssToPdf(drag.pageEl, clientX, clientY);
      var x0 = Math.min(drag.startX, pdf.x);
      var x1 = Math.max(drag.startX, pdf.x);
      var y0 = Math.min(drag.startY, pdf.y);
      var y1 = Math.max(drag.startY, pdf.y);
      var scale = getScaleFactor(drag.pageEl);
      if ((x1 - x0) * scale < MIN_BOX_PX || (y1 - y0) * scale < MIN_BOX_PX) {
        drag.box.remove();
        drag = null;
        return;
      }
      lastRegion = [drag.page, round2(x0), round2(x1), round2(y0), round2(y1)];
      layoutBox(drag.box, lastRegion[1], lastRegion[3], lastRegion[2], lastRegion[4]);
      drag = null;
      try {
        parent.postMessage({
          type: REGION_SELECTED,
          data: [lastRegion]
        }, "*");
      } catch (e) {}
    }

    document.addEventListener("pointerdown", function (event) {
      if (!selecting || event.button !== 0) {
        return;
      }
      var pageEl = event.target && event.target.closest && event.target.closest("#viewer .page");
      if (!pageEl) {
        return;
      }
      event.preventDefault();
      var pdf = cssToPdf(pageEl, event.clientX, event.clientY);
      clearBoxes();
      var box = document.createElement("div");
      box.className = REGION_BOX_CLASS;
      layoutBox(box, pdf.x, pdf.y, pdf.x, pdf.y);
      pageEl.append(box);
      drag = {
        pageEl: pageEl,
        page: pageNumberOf(pageEl),
        startX: pdf.x,
        startY: pdf.y,
        box: box
      };
    });

    window.addEventListener("pointermove", function (event) {
      if (!drag) {
        return;
      }
      event.preventDefault();
      var pdf = cssToPdf(drag.pageEl, event.clientX, event.clientY);
      layoutBox(drag.box, drag.startX, drag.startY, pdf.x, pdf.y);
    });

    window.addEventListener("pointerup", function (event) {
      if (!drag) {
        return;
      }
      finishDrag(event.clientX, event.clientY);
    });

    window.addEventListener("pointercancel", function () {
      if (!drag) {
        return;
      }
      drag.box.remove();
      drag = null;
    });

    window.addEventListener("message", function (event) {
      if (event.source !== window.parent) {
        return;
      }
      var msg = event.data;
      if (!msg || !msg.type) {
        return;
      }
      if (msg.type === REGION_START) {
        startSelect();
        return;
      }
      if (msg.type === REGION_CANCEL) {
        cancelSelect();
      }
    });

    if (app.eventBus) {
      app.eventBus.on("pagerendered", function (evt) {
        if (!lastRegion || !evt || evt.pageNumber !== lastRegion[0]) {
          return;
        }
        paintRegion(lastRegion);
      });
    }
  }
})();
