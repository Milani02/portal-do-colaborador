/* Miniatura da 1ª página de um PDF, desenhada no navegador com PDF.js.
   O PDF.js (~1 MB) só é baixado na primeira vez que um PDF aparece no mural. */

const cache = new Map(); // url → Promise<dataURL>

async function carregarPdfjs() {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

export function miniaturaPdf(chave, url, largura = 520) {
  if (!cache.has(chave)) {
    const p = (async () => {
      const pdfjs = await carregarPdfjs();
      const tarefa = pdfjs.getDocument({ url });
      const doc = await tarefa.promise;
      try {
        const pagina = await doc.getPage(1);
        const base = pagina.getViewport({ scale: 1 });
        const viewport = pagina.getViewport({ scale: largura / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await pagina.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
        return canvas.toDataURL('image/jpeg', 0.85);
      } finally {
        tarefa.destroy();
      }
    })();
    // Falhou? Tira do cache para tentar de novo numa próxima carga.
    p.catch(() => cache.delete(chave));
    cache.set(chave, p);
  }
  return cache.get(chave);
}
