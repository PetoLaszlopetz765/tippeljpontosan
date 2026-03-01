export async function exportElementToPdf(element: HTMLElement, fileName: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");

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
