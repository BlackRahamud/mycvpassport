/**
 * Inject a client-side markPageStarts() pass for templates
 * that do NOT participate in api/generate-pdf.js smart pagination.
 */
function markPageStarts(html, { PAGE_HEIGHT = 1027 } = {}) {
  const pageHeight = Number(PAGE_HEIGHT) || 1027;
  const script = `
<script>
(function () {
  function run() {
    var blocks = document.querySelectorAll('[data-block]');
    if (!blocks || !blocks.length) return;
    var PAGE_HEIGHT = ${pageHeight};
    for (var i = 0; i < blocks.length; i++) {
      var el = blocks[i];
      var rect = el.getBoundingClientRect();
      var pageIndex = Math.floor(rect.top / PAGE_HEIGHT);
      if (pageIndex > 0) {
        var distanceIntoPage = rect.top % PAGE_HEIGHT;
        if (distanceIntoPage < 20) {
          el.classList.add('cvp-new-page-start');
        }
      }
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(run, 0);
  } else {
    document.addEventListener('DOMContentLoaded', run);
  }
})();
</script>
`.trim();

  if (typeof html !== "string" || !html) return html;
  if (html.includes("cvp-new-page-start") && html.includes("markPageStarts")) return html;
  if (html.includes("</body>")) return html.replace("</body>", `${script}\n</body>`);
  return `${html}\n${script}`;
}

module.exports = { markPageStarts };

