/* Gráficos leves em <canvas>, sem bibliotecas externas
   (evita depender de CDN — o sistema funciona 100% offline) */

const Charts = {
  barrasDuplas(canvas, labels, seriesA, seriesB, corA, corB) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 480;
    const h = canvas.clientHeight || 220;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padL = 34, padB = 26, padT = 10, padR = 8;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const maxVal = Math.max(1, ...seriesA, ...seriesB);

    // linhas de grade
    ctx.strokeStyle = '#e4e6ea';
    ctx.fillStyle = '#8b93a1';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padT + plotH - (plotH * i) / steps;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillText(Math.round((maxVal * i) / steps).toString(), padL - 6, y + 3);
    }

    const groupW = plotW / labels.length;
    const barW = Math.min(16, groupW * 0.28);

    labels.forEach((label, i) => {
      const cx = padL + groupW * i + groupW / 2;
      const hA = (seriesA[i] / maxVal) * plotH;
      const hB = (seriesB[i] / maxVal) * plotH;

      ctx.fillStyle = corA;
      roundRect(ctx, cx - barW - 3, padT + plotH - hA, barW, hA, 3);
      ctx.fill();

      ctx.fillStyle = corB;
      roundRect(ctx, cx + 3, padT + plotH - hB, barW, hB, 3);
      ctx.fill();

      ctx.fillStyle = '#8b93a1';
      ctx.textAlign = 'center';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText(label, cx, h - 8);
    });
  },

  pizza(canvas, dadosObj, cores) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 480;
    const h = canvas.clientHeight || 220;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const entradas = Object.entries(dadosObj).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const total = entradas.reduce((s, [, v]) => s + v, 0);

    const cx = h / 2, cy = h / 2, r = Math.min(cx, cy) - 10;
    if (total <= 0) {
      ctx.fillStyle = '#8b93a1';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sem dados de estoque', w / 2, h / 2);
      return;
    }

    let start = -Math.PI / 2;
    entradas.forEach(([, v], i) => {
      const slice = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = cores[i % cores.length];
      ctx.fill();
      start += slice;
    });

    // buraco central (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // legenda ao lado
    let legendX = h + 14, legendY = 24;
    ctx.textAlign = 'left';
    entradas.forEach(([label, v], i) => {
      ctx.fillStyle = cores[i % cores.length];
      roundRect(ctx, legendX, legendY - 8, 9, 9, 2); ctx.fill();
      ctx.fillStyle = '#171b21';
      ctx.font = '600 11px -apple-system, sans-serif';
      ctx.fillText(label.length > 16 ? label.slice(0, 16) + '…' : label, legendX + 14, legendY);
      ctx.fillStyle = '#8b93a1';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText(Fmt.moeda(v), legendX + 14, legendY + 12);
      legendY += 30;
    });
  },
};

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, Math.abs(h) / 2 || 0);
  ctx.beginPath();
  if (h < 0) { y += h; h = Math.abs(h); }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
