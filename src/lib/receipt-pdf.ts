/** Génération du reçu PDF professionnel (LIKID LAKAY) à partir d'une vente. */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import logoUrl from "@/assets/logo-likid-lakay.png";
import { formatDateTime, formatMoney, formatQty, num, paymentMethodLabel } from "./format";

export const BUSINESS_NAME = "LIKID LAKAY";

export interface ReceiptItem {
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
}

export interface ReceiptData {
  /** Numéro de reçu unique : RECU-AAAA-000001 */
  number: string;
  /** Numéro de la vente (référence de transaction) */
  saleNumber?: string;
  saleId?: string;
  date: string;
  businessAddress?: string;
  businessPhone?: string;
  sellerName?: string;
  customerName: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  fee: number;
  total: number;
  paid: number;
  due: number;
  method?: string | null;
  note?: string | null;
}

export type ReceiptStatus = "paid" | "partial" | "unpaid";

export function receiptStatus(data: { total: number; paid: number; due: number }): {
  key: ReceiptStatus;
  label: string;
  rgb: [number, number, number];
} {
  if (data.due <= 0.009 && data.paid > 0) return { key: "paid", label: "PAYÉ", rgb: [22, 125, 90] };
  if (data.paid > 0) return { key: "partial", label: "PARTIELLEMENT PAYÉ", rgb: [176, 118, 14] };
  return { key: "unpaid", label: "IMPAYÉ", rgb: [178, 44, 44] };
}

export function verifyUrl(data: ReceiptData): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/verifier/${encodeURIComponent(data.number)}`;
}

let logoCache: string | null = null;
async function loadLogo(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    logoCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("logo"));
      reader.readAsDataURL(blob);
    });
    return logoCache;
  } catch {
    return null;
  }
}

const TEAL: [number, number, number] = [16, 110, 104];

async function buildDoc(data: ReceiptData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const W = 148;
  const M = 12;
  let y = 14;

  const logo = await loadLogo();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", M, y - 3, 22, 22);
    } catch {
      /* logo optionnel */
    }
  }

  const textX = logo ? M + 26 : M;
  doc.setTextColor(...TEAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(BUSINESS_NAME, textX, y + 5);
  doc.setTextColor(90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let hy = y + 10;
  if (data.businessAddress) {
    doc.text(data.businessAddress, textX, hy);
    hy += 4;
  }
  if (data.businessPhone) {
    doc.text(`Tél / WhatsApp : ${data.businessPhone}`, textX, hy);
    hy += 4;
  }

  y = Math.max(hy, y + 21);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);
  doc.setLineWidth(0.2);
  y += 7;

  // Reçu + statut
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`REÇU ${data.number}`, M, y);

  const status = receiptStatus(data);
  doc.setFillColor(...status.rgb);
  const badgeW = doc.getTextWidth(status.label) * 0.72 + 8;
  doc.roundedRect(W - M - badgeW, y - 5, badgeW, 7, 2, 2, "F");
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.text(status.label, W - M - badgeW / 2, y - 0.3, { align: "center" });

  y += 5;
  doc.setTextColor(90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Émis le ${formatDateTime(data.date)}`, M, y);
  y += 8;

  // Client
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CLIENT", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerName, M + 22, y);
  if (data.customerPhone) {
    y += 4.5;
    doc.setTextColor(90);
    doc.setFontSize(8.5);
    doc.text(data.customerPhone, M + 22, y);
  }
  y += 7;

  // Tableau
  doc.setFillColor(238, 244, 243);
  doc.rect(M, y - 4.5, W - 2 * M, 7, "F");
  doc.setTextColor(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("PRODUIT", M + 2, y);
  doc.text("QTÉ", W - M - 56, y, { align: "right" });
  doc.text("P. UNIT.", W - M - 28, y, { align: "right" });
  doc.text("TOTAL", W - M - 2, y, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(25);
  for (const item of data.items) {
    const lines = doc.splitTextToSize(item.product_name, 55) as string[];
    doc.text(lines, M + 2, y);
    doc.text(formatQty(item.quantity), W - M - 56, y, { align: "right" });
    doc.text(formatMoney(item.unit_price), W - M - 28, y, { align: "right" });
    doc.text(formatMoney(item.line_total), W - M - 2, y, { align: "right" });
    y += Math.max(lines.length * 4, 5) + 1.5;
    doc.setDrawColor(228);
    doc.line(M, y - 2.5, W - M, y - 2.5);
  }

  y += 2;
  const labelX = W - M - 46;
  const valueX = W - M - 2;
  const totalsRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    doc.text(label, labelX, y, { align: "right" });
    doc.text(value, valueX, y, { align: "right" });
    y += bold ? 6.5 : 5;
  };
  totalsRow("Sous-total", formatMoney(data.subtotal));
  if (data.discount > 0) totalsRow("Réduction", `− ${formatMoney(data.discount)}`);
  if (data.fee > 0) totalsRow("Frais / livraison", formatMoney(data.fee));
  doc.setDrawColor(...TEAL);
  doc.line(labelX - 24, y - 3, valueX, y - 3);
  y += 1.5;
  totalsRow("TOTAL À PAYER", formatMoney(data.total), true);
  totalsRow("Montant payé", formatMoney(data.paid));
  totalsRow("Montant restant", formatMoney(data.due), true);

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  doc.text(`Mode de paiement : ${paymentMethodLabel(data.method)}`, M, y);
  y += 4.5;
  if (data.saleNumber) {
    doc.text(`Référence de transaction : ${data.saleNumber}`, M, y);
    y += 4.5;
  }
  if (data.note) {
    const noteLines = doc.splitTextToSize(`Note : ${data.note}`, W - 2 * M - 30) as string[];
    doc.text(noteLines, M, y);
    y += noteLines.length * 4;
  }

  // QR de vérification
  try {
    const qr = await QRCode.toDataURL(verifyUrl(data), { margin: 0, width: 200 });
    doc.addImage(qr, "PNG", W - M - 22, y - 12, 22, 22);
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    doc.text("Vérifier ce reçu", W - M - 11, y + 13, { align: "center" });
  } catch {
    /* QR optionnel */
  }

  y += 22;
  doc.setDrawColor(210);
  doc.line(M, y, M + 40, y);
  doc.line(W - M - 40, y, W - M, y);
  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(110);
  doc.text(data.sellerName ? `Vendeur : ${data.sellerName}` : "Signature du vendeur", M, y);
  doc.text("Signature du client", W - M, y, { align: "right" });

  y += 8;
  doc.setTextColor(...TEAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Merci pour votre achat !", W / 2, y, { align: "center" });
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text(
    status.key === "paid"
      ? "Ce reçu constitue une preuve de paiement."
      : "Ce reçu atteste de la commande ; le solde restant est dû.",
    W / 2,
    y,
    { align: "center" },
  );

  return doc;
}

export function receiptFileName(data: ReceiptData) {
  return `${data.number}.pdf`;
}

export async function downloadReceiptPdf(data: ReceiptData) {
  (await buildDoc(data)).save(receiptFileName(data));
}

export async function printReceiptPdf(data: ReceiptData) {
  const doc = await buildDoc(data);
  const url = doc.output("bloburl");
  const win = window.open(String(url), "_blank");
  if (win) win.addEventListener("load", () => win.print());
}

export function receiptShareText(data: ReceiptData): string {
  const status = receiptStatus(data);
  const lines = [
    `*${BUSINESS_NAME}* — Reçu ${data.number}`,
    `Client : ${data.customerName}`,
    ...data.items.map(
      (it) => `• ${it.product_name} ${formatQty(it.quantity)} × ${formatMoney(it.unit_price)}`,
    ),
    `Total : ${formatMoney(data.total)}`,
    `Payé : ${formatMoney(data.paid)} — Reste : ${formatMoney(data.due)}`,
    `Statut : ${status.label}`,
    `Merci pour votre achat !`,
  ];
  return lines.join("\n");
}

export async function shareReceiptPdf(data: ReceiptData): Promise<"shared" | "downloaded"> {
  const doc = await buildDoc(data);
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
      text: receiptShareText(data),
    });
    return "shared";
  }
  doc.save(receiptFileName(data));
  return "downloaded";
}

/** Numéro de téléphone au format international pour WhatsApp (Haïti par défaut). */
export function whatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.startsWith("509")) return digits;
  if (digits.length === 8) return `509${digits}`;
  return digits;
}

/** Ouvre WhatsApp avec le récapitulatif du reçu (et télécharge le PDF à joindre). */
export async function shareReceiptWhatsApp(
  data: ReceiptData,
  phone?: string | null,
): Promise<"shared" | "whatsapp"> {
  const nav = navigator as Navigator & {
    canShare?: (d: { files?: File[] }) => boolean;
    share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };
  const doc = await buildDoc(data);
  const blob = doc.output("blob") as Blob;
  const file = new File([blob], receiptFileName(data), { type: "application/pdf" });
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: `Reçu ${data.number}`, text: receiptShareText(data) });
    return "shared";
  }
  doc.save(receiptFileName(data));
  const to = whatsappNumber(phone);
  const url = `https://wa.me/${to ?? ""}?text=${encodeURIComponent(receiptShareText(data))}`;
  window.open(url, "_blank");
  return "whatsapp";
}

interface SaleLikeReceipt {
  id?: string;
  number: string;
  receipt_number?: string | null;
  sale_date: string;
  subtotal?: number | string;
  discount?: number | string;
  fee?: number | string;
  total: number | string;
  paid?: number | string;
  refunded?: number | string;
  payment_method?: string | null;
  note?: string | null;
  customers?: { name?: string | null; phone?: string | null; whatsapp?: string | null } | null;
  sale_items?: Array<Record<string, unknown>>;
}

interface ProfileLike {
  business_name?: string | null;
  business_address?: string | null;
  business_whatsapp?: string | null;
  phone?: string | null;
  full_name?: string | null;
}

export function receiptFromSale(sale: SaleLikeReceipt, profile?: ProfileLike | null): ReceiptData {
  const total = num(sale.total);
  const paid = num(sale.paid);
  return {
    number: sale.receipt_number ?? sale.number,
    saleNumber: sale.number,
    ...(sale.id ? { saleId: sale.id } : {}),
    date: sale.sale_date,
    businessAddress: profile?.business_address ?? "",
    businessPhone: profile?.business_whatsapp || profile?.phone || "",
    sellerName: profile?.full_name ?? "",
    customerName: sale.customers?.name ?? "Client de passage",
    customerPhone: sale.customers?.whatsapp || sale.customers?.phone || "",
    subtotal: num(sale.subtotal ?? sale.total),
    discount: num(sale.discount),
    fee: num(sale.fee),
    total,
    paid,
    due: Math.max(0, Math.round((total - paid - num(sale.refunded)) * 100) / 100),
    method: sale.payment_method ?? null,
    note: sale.note ?? null,
    items: (sale.sale_items ?? []).map((it) => ({
      product_name: String(it["product_name"] ?? ""),
      quantity: num(it["quantity"]),
      unit_price: num(it["unit_price"]),
      line_total: num(it["line_total"]),
    })),
  };
}
