import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { UtgRow } from "./types";

const COLORS = {
  ink: "#172033",
  header: "#1769C2",
  line: "#CBD5E1",
  alternate: "#F5F8FC",
};

const valueOrDash = (value?: string) => value?.trim() || "-";

export function buildUtgPdfDefinition(rows: UtgRow[]): TDocumentDefinitions {
  const body = [
    [
      { text: "Sr. No.", style: "tableHeader", alignment: "center" as const },
      { text: "Image Text", style: "tableHeader" },
      { text: "Description", style: "tableHeader" },
    ],
    ...rows.map(row => [
      { text: String(row.serial), style: "serial", alignment: "center" as const },
      { text: valueOrDash(row.imageText), style: "imageText" },
      { text: valueOrDash(row.description), style: "description" },
    ]),
  ];

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [24, 24, 24, 24],
    info: {
      title: "Upgraded Text Generator Export",
      creator: "CanvasCodex - Upgraded Text Generator",
    },
    content: [{
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [42, 205, "*"],
        body,
      },
      layout: {
        fillColor: (rowIndex) => rowIndex === 0 ? COLORS.header : rowIndex % 2 === 0 ? COLORS.alternate : null,
        hLineColor: () => COLORS.line,
        vLineColor: () => COLORS.line,
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        paddingLeft: () => 7,
        paddingRight: () => 7,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
    }],
    defaultStyle: { font: "Roboto", fontSize: 9, color: COLORS.ink, lineHeight: 1.2 },
    styles: {
      tableHeader: { fontSize: 9, bold: true, color: "#FFFFFF" },
      serial: { fontSize: 9, bold: true, color: COLORS.ink },
      imageText: { fontSize: 9, bold: true, color: COLORS.ink, lineHeight: 1.2 },
      description: { fontSize: 9, color: COLORS.ink, lineHeight: 1.25 },
    },
  };
}

export async function exportPDF(rows: UtgRow[]) {
  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = (pdfMakeModule as unknown as { default?: typeof pdfMakeModule }).default || pdfMakeModule;
  const pdfFonts = (pdfFontsModule as unknown as { default?: unknown }).default || pdfFontsModule;
  pdfMake.addVirtualFileSystem(pdfFonts as Parameters<typeof pdfMake.addVirtualFileSystem>[0]);
  pdfMake.createPdf(buildUtgPdfDefinition(rows)).download(`utg-export-${Date.now()}.pdf`);
}
