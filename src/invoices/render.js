// Standalone HTML invoice / receipt renderer.
//
// Source design (canonical layout):
//   https://claude.ai/design/p/5e517895-c802-42f4-82a2-33d82ec3e30a?file=CVPassport+Invoice.html
//
// The design's <style> block is reused byte-for-byte for the layout CSS.
// The bundler-shipped @font-face rules (which point to runtime UUIDs) are
// replaced here with a single Google Fonts <link> — same IBM Plex Sans +
// Mono families the design renders with.
//
// Two variants:
//   * kind='invoice' (IN entity, Razorpay/INR) — full layout, seller block
//     with PAN, totals row (tax row hidden when tax_amount === 0).
//   * kind='receipt' (AE entity, Ziina/AED)   — minimal: PAYMENT RECEIPT
//     title, single amount line, fixed CVPassport seller, brief footer.
//
// Pure function. No env reads, no DB reads — everything comes from the
// invoice object that was snapshotted at insert time.

const FONTS_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">';

// SVG mark — byte-for-byte from the design.
const MARK_SVG = `<svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M3 3.5L8.5 8.5L3 13.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 3.5L14.5 8.5L9 13.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"></path></svg>`;

// Layout CSS — byte-for-byte from the second <style> block of the source
// design (the first <style> block holds @font-face rules and is replaced
// by FONTS_LINK above).
const STYLES = `
  :root {
    --ink:        #16130f;
    --ink-soft:   #514c44;
    --ink-mute:   #8a8378;
    --hair:       rgba(22,19,15,0.12);
    --hair-soft:  rgba(22,19,15,0.07);
    --paper:      #ffffff;
    --accent:     #C2691A;
    --accent-ink: #9a5212;
    --pos:        #1f7a4d;
    --pos-bg:     rgba(31,122,77,0.10);
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #d9d6d0;
    color: var(--ink);
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .num  { font-variant-numeric: tabular-nums; }

  .stack {
    max-width: 820px;
    margin: 0 auto;
    padding: 40px 20px 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 36px;
  }

  .invoice {
    width: 210mm;
    min-height: 297mm;
    background: var(--paper);
    color: var(--ink);
    padding: 20mm 18mm 16mm;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 14px 40px rgba(0,0,0,0.10);
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 30px; }
  .brand-row { display: flex; align-items: center; gap: 11px; }
  .mark { width: 34px; height: 34px; border-radius: 9px; background: var(--accent); display: grid; place-items: center; flex-shrink: 0; }
  .mark svg { display: block; }
  .wordmark { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .wordmark b { color: var(--accent-ink); font-weight: 700; }

  .seller { margin-top: 18px; font-size: 11.5px; line-height: 1.65; color: var(--ink-soft); max-width: 62%; }
  .seller .legal { color: var(--ink); font-weight: 600; font-size: 12.5px; }
  .seller a { color: var(--ink-soft); text-decoration: none; }
  .seller .tax-ids { margin-top: 6px; color: var(--ink); }
  .seller .tax-ids span { margin-right: 14px; }

  .doc-meta { text-align: right; min-width: 200px; }
  .doc-title { font-size: 30px; font-weight: 700; letter-spacing: 0.16em; margin: 0 0 16px; color: var(--ink); }
  .doc-title.receipt { font-size: 24px; letter-spacing: 0.14em; }
  .meta-row { display: flex; justify-content: flex-end; gap: 18px; font-size: 11.5px; line-height: 1.5; padding: 4px 0; }
  .meta-row .k { color: var(--ink-mute); }
  .meta-row .v { color: var(--ink); font-weight: 500; min-width: 96px; text-align: right; }

  .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 999px; background: var(--pos-bg); color: var(--pos); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; }
  .badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--pos); }

  .rule { height: 1px; background: var(--hair); border: 0; margin: 26px 0; }
  .rule.soft { background: var(--hair-soft); }

  .billto { display: flex; flex-direction: column; gap: 7px; }
  .label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-mute); font-weight: 600; }
  .billto .who { font-size: 14px; font-weight: 600; }
  .billto .meta { font-size: 12px; color: var(--ink-soft); display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-mute); display: inline-block; }

  table { width: 100%; border-collapse: collapse; }
  thead th { font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--ink-mute); font-weight: 600; text-align: right; padding: 0 0 11px; border-bottom: 1px solid var(--hair); }
  thead th.l { text-align: left; }
  tbody td { font-size: 12.5px; padding: 15px 0; border-bottom: 1px solid var(--hair-soft); text-align: right; color: var(--ink-soft); vertical-align: top; }
  tbody td.l { text-align: left; }
  tbody .desc { color: var(--ink); font-weight: 500; font-size: 13px; }
  tbody .desc small { display: block; color: var(--ink-mute); font-weight: 400; font-size: 11.5px; margin-top: 3px; }
  .amt { color: var(--ink); font-weight: 500; }

  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 22px; }
  .totals { width: 300px; }
  .trow { display: flex; justify-content: space-between; align-items: baseline; font-size: 12.5px; padding: 9px 0; color: var(--ink-soft); }
  .trow .tlabel small { color: var(--ink-mute); font-size: 10.5px; display: block; }
  .trow .tval { font-weight: 500; color: var(--ink); }
  .trow.muted .tval, .trow.muted .tlabel { color: var(--ink-mute); font-style: italic; }
  .trow.grand { border-top: 1.5px solid var(--ink); margin-top: 6px; padding-top: 14px; font-size: 15px; }
  .trow.grand .tlabel { font-weight: 700; color: var(--ink); }
  .trow.grand .tval { font-weight: 700; font-size: 19px; }

  .pay { margin-top: auto; padding-top: 26px; }
  .pay-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px 22px; padding: 16px 18px; background: #faf8f4; border: 1px solid var(--hair-soft); border-radius: 10px; }
  .pay-grid .cell .k { font-size: 9.5px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--ink-mute); font-weight: 600; }
  .pay-grid .cell .v { font-size: 12.5px; color: var(--ink); margin-top: 4px; font-weight: 500; }

  .foot { margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--hair-soft); display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; font-size: 11px; color: var(--ink-mute); line-height: 1.6; }
  .foot .thanks { font-size: 12.5px; color: var(--ink); font-weight: 600; }
  .foot a { color: var(--ink-soft); text-decoration: none; }
  .foot .right { text-align: right; max-width: 50%; }

  @page { size: A4; margin: 0; }
  @media print {
    html, body { background: #fff; }
    .stack { padding: 0; gap: 0; max-width: none; }
    .invoice { box-shadow: none; width: 210mm; min-height: 297mm; page-break-after: always; margin: 0; }
    .invoice:last-child { page-break-after: auto; }
    .pay-grid { background: #faf8f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatMoney(currency, n) {
  const v = Number(n || 0).toFixed(2);
  if (currency === 'INR') return `₹${v}`;
  if (currency === 'AED') return `AED ${v}`;
  return `${currency} ${v}`;
}

function currencyDisplay(currency) {
  if (currency === 'INR') return 'INR (₹)';
  if (currency === 'AED') return 'AED (د.إ)';
  return currency || '';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function gatewayDisplay(gw) {
  if (gw === 'razorpay') return 'Razorpay';
  if (gw === 'ziina') return 'Ziina';
  return gw || '';
}

// IN-entity invoice section. Sample-C shape (Indian sole proprietor):
// seller name + address + optional PAN, no GSTIN, no licence. Tax row is
// kept in the markup but hidden when tax_amount === 0 so future GST
// registration is a data flip, not a markup change.
function renderInvoiceSection(inv) {
  const sellerEmail = inv.seller_email || 'billing@mycvpassport.com';
  const supportEmail = inv.seller_support_email || sellerEmail;
  const taxIdLine = (inv.seller_tax_id && inv.seller_tax_id_label)
    ? `<div class="tax-ids"><span>${esc(inv.seller_tax_id_label)}: ${esc(inv.seller_tax_id)}</span></div>`
    : '';
  const accessLine = inv.access_days
    ? `${inv.access_days}-day Pro access`
    : 'Permanent unlock';
  const hasTax = Number(inv.tax_amount || 0) > 0;
  const taxRow = `<div class="trow"${hasTax ? '' : ' style="display:none;"'}><span class="tlabel">Tax</span><span class="tval mono">${formatMoney(inv.currency, inv.tax_amount || 0)}</span></div>`;

  return `
<section class="invoice">
  <div class="head">
    <div>
      <div class="brand-row"><div class="mark">${MARK_SVG}</div><div class="wordmark">CV<b>Passport</b></div></div>
      <div class="seller">
        <div class="legal">${esc(inv.seller_name || 'CVPassport')}</div>
        ${inv.seller_address ? `<div>${esc(inv.seller_address)}</div>` : ''}
        <div><a href="mailto:${esc(sellerEmail)}">${esc(sellerEmail)}</a> · mycvpassport.com</div>
        ${taxIdLine}
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">INVOICE</div>
      <div class="meta-row"><span class="k">Invoice no.</span><span class="v mono">${esc(inv.invoice_number)}</span></div>
      <div class="meta-row"><span class="k">Issue date</span><span class="v">${esc(formatDate(inv.issued_at))}</span></div>
      <div class="meta-row" style="align-items:center;"><span class="k">Status</span><span class="v"><span class="badge">PAID</span></span></div>
      <div class="meta-row"><span class="k">Payment ID</span><span class="v mono">${esc(inv.payment_id)}</span></div>
    </div>
  </div>

  <hr class="rule">

  <div class="billto">
    <div class="label">Bill to</div>
    <div class="who">${esc(inv.customer_name || '—')}</div>
    <div class="meta"><span>${esc(inv.customer_email || '')}</span><span class="dot"></span><span>${esc(inv.customer_country || '')}</span></div>
  </div>

  <hr class="rule">

  <table>
    <thead>
      <tr>
        <th class="l">Description</th>
        <th>Qty</th>
        <th>Unit price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="l desc">${esc(inv.description || '')}<small>${esc(accessLine)}</small></td>
        <td class="num">1</td>
        <td class="num mono">${formatMoney(inv.currency, inv.subtotal)}</td>
        <td class="num mono amt">${formatMoney(inv.currency, inv.subtotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="trow"><span class="tlabel">Subtotal <small>taxable value</small></span><span class="tval mono">${formatMoney(inv.currency, inv.subtotal)}</span></div>
      ${taxRow}
      <div class="trow grand"><span class="tlabel">Total</span><span class="tval mono">${formatMoney(inv.currency, inv.total)}</span></div>
    </div>
  </div>

  <div class="pay">
    <div class="label" style="margin-bottom:10px;">Payment details</div>
    <div class="pay-grid">
      <div class="cell"><div class="k">Method</div><div class="v">${esc(gatewayDisplay(inv.gateway))}</div></div>
      <div class="cell"><div class="k">Payment ID</div><div class="v mono">${esc(inv.payment_id)}</div></div>
      <div class="cell"><div class="k">Paid date</div><div class="v">${esc(formatDate(inv.issued_at))}</div></div>
      <div class="cell"><div class="k">Currency</div><div class="v">${esc(currencyDisplay(inv.currency))}</div></div>
    </div>
  </div>

  <div class="foot">
    <div>
      <div class="thanks">Thank you for using CVPassport.</div>
      <div>Support · <a href="mailto:${esc(supportEmail)}">${esc(supportEmail)}</a></div>
    </div>
    <div class="right">
      This is a computer-generated invoice and does not require a signature.
    </div>
  </div>
</section>`;
}

// AE-entity receipt section. Minimal per brief:
//   * Title "PAYMENT RECEIPT"
//   * Single AED amount line (no tax row, no subtotal/tax split)
//   * Seller block: "CVPassport · mycvpassport.com · billing@mycvpassport.com" only
//   * Footer: "This receipt confirms payment received. Thank you."
function renderReceiptSection(inv) {
  const accessTail = inv.access_days ? `<small>${inv.access_days}-day Pro access</small>` : '';
  return `
<section class="invoice">
  <div class="head">
    <div>
      <div class="brand-row"><div class="mark">${MARK_SVG}</div><div class="wordmark">CV<b>Passport</b></div></div>
      <div class="seller">
        <div class="legal">CVPassport</div>
        <div>mycvpassport.com · <a href="mailto:billing@mycvpassport.com">billing@mycvpassport.com</a></div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title receipt">PAYMENT RECEIPT</div>
      <div class="meta-row"><span class="k">Receipt no.</span><span class="v mono">${esc(inv.invoice_number)}</span></div>
      <div class="meta-row"><span class="k">Issue date</span><span class="v">${esc(formatDate(inv.issued_at))}</span></div>
      <div class="meta-row" style="align-items:center;"><span class="k">Status</span><span class="v"><span class="badge">PAID</span></span></div>
      <div class="meta-row"><span class="k">Payment ID</span><span class="v mono">${esc(inv.payment_id)}</span></div>
    </div>
  </div>

  <hr class="rule">

  <div class="billto">
    <div class="label">Received from</div>
    <div class="who">${esc(inv.customer_name || '—')}</div>
    <div class="meta"><span>${esc(inv.customer_email || '')}</span><span class="dot"></span><span>${esc(inv.customer_country || '')}</span></div>
  </div>

  <hr class="rule">

  <table>
    <thead>
      <tr>
        <th class="l">Description</th>
        <th>Amount paid</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="l desc">${esc(inv.description || '')}${accessTail}</td>
        <td class="num mono amt">${formatMoney(inv.currency, inv.total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="pay">
    <div class="label" style="margin-bottom:10px;">Payment details</div>
    <div class="pay-grid">
      <div class="cell"><div class="k">Method</div><div class="v">${esc(gatewayDisplay(inv.gateway))}</div></div>
      <div class="cell"><div class="k">Payment ID</div><div class="v mono">${esc(inv.payment_id)}</div></div>
      <div class="cell"><div class="k">Paid date</div><div class="v">${esc(formatDate(inv.issued_at))}</div></div>
      <div class="cell"><div class="k">Currency</div><div class="v">${esc(currencyDisplay(inv.currency))}</div></div>
    </div>
  </div>

  <div class="foot">
    <div>
      <div class="thanks">This receipt confirms payment received. Thank you.</div>
    </div>
  </div>
</section>`;
}

export function renderInvoiceHTML(invoice) {
  const inner = invoice.kind === 'receipt' ? renderReceiptSection(invoice) : renderInvoiceSection(invoice);
  const docKind = invoice.kind === 'receipt' ? 'Receipt' : 'Invoice';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CVPassport ${docKind} — ${esc(invoice.invoice_number)}</title>
${FONTS_LINK}
<style>${STYLES}</style>
</head>
<body>
<div class="stack">
${inner}
</div>
</body>
</html>`;
}
