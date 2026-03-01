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

  const touchedOverflowElements: Array<{
    el: HTMLElement;
    overflowX: string;
    overflowY: string;
  }> = [];

  const exportStyle = document.createElement("style");
  exportStyle.setAttribute("data-pdf-export-style", "true");
  exportStyle.textContent = `
    .pdf-exporting, .pdf-exporting * {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .pdf-exporting *::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
  `;

  const allElements = [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))];

  try {
    document.head.appendChild(exportStyle);
    element.classList.add("pdf-exporting");

    for (const el of allElements) {
      const computed = window.getComputedStyle(el);
      if (computed.overflowX === "auto" || computed.overflowX === "scroll") {
        touchedOverflowElements.push({
          el,
          overflowX: el.style.overflowX,
          overflowY: el.style.overflowY,
        });
        el.style.overflowX = "visible";
      }
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
  } finally {
    for (const item of touchedOverflowElements) {
      item.el.style.overflowX = item.overflowX;
      item.el.style.overflowY = item.overflowY;
    }

    element.classList.remove("pdf-exporting");
    if (exportStyle.parentNode) {
      exportStyle.parentNode.removeChild(exportStyle);
    }
  }
}
