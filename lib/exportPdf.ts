export async function exportElementToPdf(element: HTMLElement, fileName: string) {
  const [jspdfModule, htmlToImageModule] = await Promise.all([
    import("jspdf"),
    import("html-to-image"),
  ]);

  const JsPdfCtor = (jspdfModule as any).jsPDF || (jspdfModule as any).default;
  const toCanvasFn = (htmlToImageModule as any).toCanvas;

  if (!JsPdfCtor || typeof JsPdfCtor !== "function") {
    throw new Error("A jsPDF modul nem tölthető be.");
  }

  if (!toCanvasFn || typeof toCanvasFn !== "function") {
    throw new Error("A html-to-image modul nem tölthető be.");
  }

  const canvas = await toCanvasFn(element, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
  });

  if (!canvas.width || !canvas.height) {
    throw new Error("A kiválasztott tartalom nem renderelhető PDF-be.");
  }

  const imgData = canvas.toDataURL("image/png");
  const pdf = new JsPdfCtor("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const imageHeight = (canvas.height * printableWidth) / canvas.width;
  let remainingHeight = imageHeight;
  let currentTop = margin;

  pdf.addImage(imgData, "PNG", margin, currentTop, printableWidth, imageHeight);
  remainingHeight -= printableHeight;

  while (remainingHeight > 0) {
    pdf.addPage();
    currentTop = margin - (imageHeight - remainingHeight);
    pdf.addImage(imgData, "PNG", margin, currentTop, printableWidth, imageHeight);
    remainingHeight -= printableHeight;
  }

  pdf.save(fileName);
}
