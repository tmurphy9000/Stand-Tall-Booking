(function () {
  var script = document.currentScript;
  var shop = script && script.getAttribute("data-shop");
  if (!shop) {
    console.warn("[Stand Tall Booking] embed.js: missing data-shop attribute.");
    return;
  }

  var iframe = document.createElement("iframe");
  iframe.src = "https://standtallbooking.com/book/" + encodeURIComponent(shop) + "?embed=true";
  iframe.width = "100%";
  iframe.height = "700";
  iframe.frameBorder = "0";
  iframe.style.cssText = "border:none;border-radius:12px;display:block;";
  iframe.allow = "payment";
  iframe.title = "Book an appointment";

  script.parentNode.insertBefore(iframe, script.nextSibling);
})();
