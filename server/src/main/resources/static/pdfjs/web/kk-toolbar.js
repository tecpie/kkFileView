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

  whenViewerReady(function (app) {
    bindEdgeReveal();
    bindFitWidePages(app);
  });
})();
