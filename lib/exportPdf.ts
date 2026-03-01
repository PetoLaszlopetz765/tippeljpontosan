export async function exportElementToPdf(element: HTMLElement, fileName: string) {
  const [jspdfModule, html2canvasModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const JsPdfCtor = (jspdfModule as any).jsPDF || (jspdfModule as any).default;
  const html2canvasFn = (html2canvasModule as any).default || html2canvasModule;

  if (!JsPdfCtor || typeof JsPdfCtor !== "function") {
    throw new Error("A jsPDF modul nem tölthető be.");
  }

  if (!html2canvasFn || typeof html2canvasFn !== "function") {
    throw new Error("A html2canvas modul nem tölthető be.");
  }

  const canvas = await html2canvasFn(element, {
    scale: 2,
    useCORS: true,
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
