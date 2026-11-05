'use client';

import { toPng } from 'html-to-image';
import { flourishSvgMarkup } from './ornament';

const CARD_ID = 'printable-card';

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function slug(name) {
  return (name || 'table-card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'table-card';
}

/**
 * Prints the table card from a clean, standalone document. Printing the live
 * page relied on hiding everything else with CSS, which breaks inside modals,
 * transformed ancestors and mobile browsers (blank pages, clipped or tiny QR).
 */
export function printTableCard({ eventName, url }) {
  const svg = document.querySelector(`#${CARD_ID} svg`)?.outerHTML;
  if (!svg) return false;

  const origin = window.location.origin;
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return false; // popup blocked

  win.document.open();
  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(eventName)} — Table Card</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; background: #fff; font-family: Georgia, 'Times New Roman', serif; color: #25231f; }
  .sheet { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 12mm; }
  .card { width: 130mm; border: 0.6mm solid #16140f; border-radius: 8mm; padding: 11mm 10mm 9mm;
          text-align: center; background: #faf7f0; outline: 1.5mm solid #faf7f0; outline-offset: -3.2mm; }
  .logo { height: 16mm; width: auto; margin-bottom: 4mm; }
  .eyebrow { font: 600 8.5pt/1 Helvetica, Arial, sans-serif; letter-spacing: 0.28em; text-transform: uppercase; color: #9e2a22; }
  h1 { font-weight: 400; font-size: 26pt; line-height: 1.15; margin: 4mm 0 6mm; word-break: break-word; }
  .flourish { margin: -2mm 0 5mm; line-height: 0; }
  .qr { display: inline-block; background: #fff; padding: 5mm; border-radius: 5mm; border: 0.3mm solid #e8e2d3; }
  .qr svg { display: block; width: 80mm; height: 80mm; }
  .cta { font-size: 17pt; font-style: italic; margin: 7mm 0 2mm; line-height: 1.3; }
  .url { font: 8pt Helvetica, Arial, sans-serif; color: #77706a; word-break: break-all; margin: 0 4mm 5mm; }
  .foot { border-top: 0.3mm solid #d9cfbd; padding-top: 4mm; font: 600 7.5pt Helvetica, Arial, sans-serif;
          letter-spacing: 0.18em; text-transform: uppercase; color: #8b6f55; }
</style></head>
<body><div class="sheet"><div class="card">
  <img class="logo" id="logo" src="${origin}/logo.png" alt="Mehfil">
  <div class="eyebrow">&#9670;&nbsp; Scan to share your memory &nbsp;&#9670;</div>
  <h1>${esc(eventName || 'Our Celebration')}</h1>
  <div class="flourish">${flourishSvgMarkup({ color: '#9e2a22', width: '60mm', height: '6mm' })}</div>
  <div class="qr">${svg}</div>
  <div class="cta">Point your camera at the code.<br>Leave a candid moment for the room.</div>
  <div class="url">${esc(url)}</div>
  <div class="foot">Instant live wall &nbsp;•&nbsp; No app needed</div>
</div></div></body></html>`);
  win.document.close();

  let printed = false;
  const go = () => {
    if (printed) return;
    printed = true;
    win.focus();
    win.print();
  };
  const logo = win.document.getElementById('logo');
  if (logo && !logo.complete) {
    logo.onload = go;
    logo.onerror = go;
    setTimeout(go, 2000);
  } else {
    setTimeout(go, 150);
  }
  return true;
}

/** Saves the card as a high-resolution PNG (works on phones, where printing is awkward). */
export async function downloadTableCard(eventName) {
  const node = document.getElementById(CARD_ID);
  if (!node) throw new Error('Card not found');
  const dataUrl = await toPng(node, {
    pixelRatio: 4,
    cacheBust: true,
    skipFonts: true,
    backgroundColor: '#FAF7F0',
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${slug(eventName)}-qr-card.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
