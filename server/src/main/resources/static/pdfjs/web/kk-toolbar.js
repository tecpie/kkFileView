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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", relocate);
  } else {
    relocate();
  }
})();
