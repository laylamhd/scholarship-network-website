// Client-only: render the first page of a PDF to a JPEG blob, so a
// presentation gets a real cover thumbnail instead of a blank icon.
// pdf.js runs only at upload time (admin) — viewers never load it.

export async function generatePdfThumbnail(file: File, maxWidth = 900): Promise<Blob | null> {
  const pdfjs = await import("pdfjs-dist");
  // Worker matched to the installed version (loaded once, at upload time).
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);

  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, maxWidth / base.width);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
}
