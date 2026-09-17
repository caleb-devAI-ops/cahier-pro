/** Génération du reçu PDF (LIKID LAKAY) à partir d'une vente. */
import { jsPDF } from "jspdf";
import { formatDate, formatMoney, formatQty, num } from "./format";

export const BUSINESS_NAME = "LIKID LAKAY";

export interface ReceiptItem {
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
}

export interface ReceiptData {
  number: string;
  date: string;
  customerName: string;
  items: ReceiptItem[];
  total: number;
}

function buildDoc(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] });
  const W = 80;
  let y = 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(BUSINESS_NAME, W / 2, y, { align: "center" });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Reçu ${data.number}`, W / 2, y, { align: "center" });
  y += 5;
  doc.text(`Date : ${formatDate(data.date)}`, W / 2, y, { align: "center" });

  y += 7;
  doc.setFontSize(10);
  doc.text(`Client : ${data.customerName}`, 6, y);

  y += 4;
  doc.line(6, y, W - 6, y);
  y += 5;

  doc.setFontSize(9);
  for (const item of data.items) {
    const lines = doc.splitTextToSize(item.product_name, 48) as string[];
    doc.text(lines, 6, y);
    doc.text(formatMoney(item.line_total), W - 6, y, { align: "right" });
    y += lines.length * 4;
    doc.setTextColor(110);
    doc.text(`${formatQty(item.quantity)} × ${formatMoney(item.unit_price)}`, 6, y);
    doc.setTextColor(0);
    y += 6;
  }

  doc.line(6, y, W - 6, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", 6, y);
  doc.text(formatMoney(data.total), W - 6, y, { align: "right" });

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Merci pour votre confiance !", W / 2, y, { align: "center" });

  return doc;
}

export function receiptFileName(data: ReceiptData) {
  return `Recu-${data.number}.pdf`;
}

export function downloadReceiptPdf(data: ReceiptData) {
  buildDoc(data).save(receiptFileName(data));
}

export function printReceiptPdf(data: ReceiptData) {
  const doc = buildDoc(data);
  const url = doc.output("bloburl");
  const win = window.open(String(url), "_blank");
  if (win) {
    win.addEventListener("load", () => win.print());
  }
}

export async function shareReceiptPdf(data: ReceiptData): Promise<"shared" | "downloaded"> {
  const doc = buildDoc(data);
  const blob = doc.output("blob") as Blob;
  const file = new File([blob], receiptFileName(data), { type: "application/pdf" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files?: File[] }) => boolean;
    share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({
      files: [file],
      title: `Reçu ${data.number}`,
      text: `${BUSINESS_NAME} — reçu ${data.number} — ${formatMoney(data.total)}`,
    });
    return "shared";
  }
  doc.save(receiptFileName(data));
  return "downloaded";
}

export function receiptFromSale(sale: {
  number: string;
  sale_date: string;
  total: number | string;
  customers?: { name?: string | null } | null;
  sale_items?: Array<Record<string, unknown>>;
}): ReceiptData {
  return {
    number: sale.number,
    date: sale.sale_date,
    customerName: sale.customers?.name ?? "Client de passage",
    total: num(sale.total),
    items: (sale.sale_items ?? []).map((it) => ({
      product_name: String(it["product_name"] ?? ""),
      quantity: num(it["quantity"]),
      unit_price: num(it["unit_price"]),
      line_total: num(it["line_total"]),
    })),
  };
}
