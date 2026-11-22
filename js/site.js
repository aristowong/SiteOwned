(function () {
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");
  var menu = document.querySelector("[data-nav-check]");

  function setOpen(open) {
    if (!menu || !toggle) return;
    menu.checked = open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (toggle && menu && nav) {
    menu.addEventListener("change", function () {
      toggle.setAttribute("aria-expanded", menu.checked ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 900px)").matches) setOpen(false);
    });
  }

  document.querySelectorAll("form[data-mailto]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var address = form.getAttribute("data-mailto");
      var subject = form.getAttribute("data-subject") || "SiteOwned";
      var lines = [];
      new FormData(form).forEach(function (value, key) {
        var text = String(value).trim();
        if (text) lines.push(key + ": " + text);
      });
      window.location.href =
        "mailto:" +
        address +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(lines.join("\n\n"));
    });
  });
})();
