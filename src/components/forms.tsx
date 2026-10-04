import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Modal, SelectField, SubmitButton, TextArea, TextField } from "@/components/modal";
import { qk, useRpc, useSuppliers, useUnits } from "@/lib/db";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHODS,
  formatMoney,
  formatQty,
  num,
} from "@/lib/format";
import { DEFAULT_UNITS, SERVICE_UNITS } from "@/lib/units";
import {
  COST_FIELDS,
  PRODUCT_TYPES,
  availableStock,
  computeCosts,
  formatPct,
  profitability,
  type CostBreakdown,
} from "@/lib/costing";

/* ----------------------------- CLIENT ----------------------------- */
export interface CustomerRecord {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  note: string | null;
}

export function CustomerDialog({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer?: CustomerRecord | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? "");
    setPhone(customer?.phone ?? "");
    setWhatsapp(customer?.whatsapp ?? "");
    setAddress(customer?.address ?? "");
    setNote(customer?.note ?? "");
  }, [open, customer]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Le nom du client est obligatoire"); return; }
    setLoading(true);
    const payload = {
      name: name.trim(),
      phone: phone || null,
      whatsapp: whatsapp || null,
      address: address || null,
      note: note || null,
    };
    const { error } = customer
      ? await supabase.from("customers").update(payload).eq("id", customer.id)
      : await supabase.from("customers").insert(payload);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(customer ? "Client mis à jour" : "Client ajouté");
    qc.invalidateQueries({ queryKey: qk.customers });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={customer ? "Modifier le client" : "Nouveau client"}>
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Nom complet" value={name} onChange={setName} required placeholder="Marie Pierre" />
        <TextField label="Téléphone" value={phone} onChange={setPhone} inputMode="tel" placeholder="+509 0000 0000" />
        <TextField label="WhatsApp" value={whatsapp} onChange={setWhatsapp} inputMode="tel" />
        <TextField label="Adresse (facultatif)" value={address} onChange={setAddress} />
        <TextArea label="Note" value={note} onChange={setNote} />
        <SubmitButton loading={loading}>{customer ? "Enregistrer" : "Ajouter le client"}</SubmitButton>
      </form>
    </Modal>
  );
}

/* ----------------------------- PRODUIT ----------------------------- */
export interface ProductRecord {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  cost_price: number | string;
  sale_price: number | string;
  stock: number | string;
  min_stock: number | string;
  track_stock: boolean;
  unit: string;
  supplier_id: string | null;
  status: string;
  product_type?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  barcode?: string | null;
  reference_unit?: string | null;
  max_stock?: number | string | null;
  location?: string | null;
  reserved_stock?: number | string | null;
  wholesale_price?: number | string | null;
  promo_price?: number | string | null;
  min_price?: number | string | null;
  purchase_price?: number | string | null;
  purchase_qty?: number | string | null;
  cost_breakdown?: Record<string, number> | null;
  estimated_time?: string | null;
}

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-input">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
        {title}
        <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </details>
  );
}

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const optNum = (v: string) => (v.trim() === "" ? null : num(v));

export function ProductDialog({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product?: ProductRecord | null;
}) {
  const qc = useQueryClient();
  const [stockReason, setStockReason] = useState("");
  const { data: suppliers = [] } = useSuppliers();
  const { data: customUnits = [] } = useUnits();
  const empty = {
    name: "", product_type: "resale", category: "", subcategory: "", description: "", brand: "",
    sku: "", barcode: "", status: "active", unit: "unité", reference_unit: "",
    purchase_price: "", purchase_qty: "", cost_price: "", sale_price: "", wholesale_price: "",
    promo_price: "", min_price: "", stock: "", min_stock: "", max_stock: "", reserved_stock: "",
    location: "", supplier_id: "", track_stock: true, estimated_time: "",
    costs: {} as Record<string, string>,
  };
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const set = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!open) return;
    if (!product) { setForm(empty); setStockReason(""); return; }
    const cb = product.cost_breakdown ?? {};
    setForm({
      name: product.name, product_type: product.product_type ?? "resale",
      category: s(product.category), subcategory: s(product.subcategory), description: s(product.description),
      brand: s(product.brand), sku: s(product.sku), barcode: s(product.barcode), status: product.status ?? "active",
      unit: product.unit ?? "unité", reference_unit: s(product.reference_unit),
      purchase_price: s(product.purchase_price), purchase_qty: s(product.purchase_qty),
      cost_price: String(num(product.cost_price)), sale_price: String(num(product.sale_price)),
      wholesale_price: s(product.wholesale_price), promo_price: s(product.promo_price), min_price: s(product.min_price),
      stock: String(num(product.stock)), min_stock: String(num(product.min_stock)), max_stock: s(product.max_stock),
      reserved_stock: s(product.reserved_stock), location: s(product.location), supplier_id: s(product.supplier_id),
      track_stock: product.track_stock, estimated_time: s(product.estimated_time),
      costs: Object.fromEntries(Object.entries(cb).map(([k, v]) => [k, String(v)])),
    });
    setStockReason("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const isService = form.product_type === "service";
  const hasDetailedCosts = form.purchase_price.trim() !== "";
  const breakdown: CostBreakdown = Object.fromEntries(
    Object.entries(form.costs).filter(([, v]) => v !== "").map(([k, v]) => [k, num(v)]),
  );
  const detailed = computeCosts(num(form.purchase_price), num(form.purchase_qty), breakdown);
  const unitCost = hasDetailedCosts ? detailed.unitCost : num(form.cost_price);
  const prof = profitability(unitCost ?? 0, num(form.sale_price));
  const trackStock = !isService && form.track_stock;
  const unitOptions = Array.from(
    new Set([...(isService ? SERVICE_UNITS : DEFAULT_UNITS), ...customUnits.map((u: { name: string }) => u.name), form.unit]),
  ).filter(Boolean);

  const stockChanged =
    !!product && form.stock !== "" && Math.round(num(form.stock) * 1e6) !== Math.round(num(product.stock) * 1e6);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Le nom du produit est obligatoire"); return; }
    const prices = [form.sale_price, form.cost_price, form.purchase_price, form.wholesale_price, form.promo_price, form.min_price];
    if (prices.some((p) => p !== "" && num(p) < 0)) { toast.error("Les prix ne peuvent pas être négatifs"); return; }
    if (Object.values(form.costs).some((v) => v !== "" && num(v) < 0)) { toast.error("Les coûts ne peuvent pas être négatifs"); return; }
    if (hasDetailedCosts && !(num(form.purchase_qty) > 0)) {
      toast.error("Indiquez la quantité réellement obtenue pour calculer le coût unitaire"); return;
    }
    if (trackStock && (num(form.stock) < 0 || num(form.min_stock) < 0 || num(form.reserved_stock) < 0)) {
      toast.error("Les quantités de stock ne peuvent pas être négatives"); return;
    }
    if (form.min_price && num(form.sale_price) > 0 && num(form.min_price) > num(form.sale_price)) {
      toast.error("Le prix minimum dépasse le prix de vente"); return;
    }
    setLoading(true);
    const payload = {
      name: form.name.trim(), product_type: form.product_type,
      sku: form.sku || null, barcode: form.barcode || null, brand: form.brand || null,
      category: form.category || null, subcategory: form.subcategory || null, description: form.description || null,
      status: form.status, unit: form.unit || "unité", reference_unit: form.reference_unit || null,
      cost_price: unitCost ?? 0, sale_price: num(form.sale_price),
      wholesale_price: optNum(form.wholesale_price), promo_price: optNum(form.promo_price), min_price: optNum(form.min_price),
      purchase_price: optNum(form.purchase_price), purchase_qty: optNum(form.purchase_qty),
      cost_breakdown: breakdown,
      min_stock: trackStock ? num(form.min_stock) : 0, max_stock: trackStock ? optNum(form.max_stock) : null,
      reserved_stock: trackStock ? num(form.reserved_stock) : 0, location: form.location || null,
      supplier_id: form.supplier_id || null, track_stock: trackStock,
      estimated_time: isService ? form.estimated_time || null : null,
    };
    let error;
    if (product) {
      ({ error } = await supabase.from("products").update(payload).eq("id", product.id));
      if (!error && trackStock && stockChanged) {
        ({ error } = await supabase.rpc("adjust_stock", {
          p_product_id: product.id, p_new_stock: num(form.stock), p_reason: stockReason.trim(),
        }));
      }
    } else {
      ({ error } = await supabase.from("products").insert({ ...payload, stock: trackStock ? num(form.stock) : 0 }));
    }
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(product ? "Produit mis à jour" : "Produit ajouté");
    qc.invalidateQueries({ queryKey: qk.products });
    qc.invalidateQueries({ queryKey: qk.stock });
    onClose();
  }

  const money = (label: string, key: keyof typeof empty, hint?: string) => (
    <TextField label={label} value={form[key] as string} onChange={(v) => set({ [key]: v } as Partial<typeof empty>)}
      inputMode="decimal" type="number" step="any" hint={hint} />
  );

  return (
    <Modal open={open} onClose={onClose} title={product ? "Modifier le produit" : "Nouveau produit"}>
      <form onSubmit={submit} className="space-y-3">
        <TextField label="Nom du produit *" value={form.name} onChange={(v) => set({ name: v })} required />
        <SelectField label="Type de produit *" value={form.product_type} onChange={(v) => set({ product_type: v })}
          options={PRODUCT_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
        <SelectField label={isService ? "Unité de facturation" : "Unité de vente"} value={form.unit}
          onChange={(v) => set({ unit: v })} options={unitOptions.map((u) => ({ value: u, label: u }))} />

        <Section title="Informations">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Catégorie" value={form.category} onChange={(v) => set({ category: v })} />
            <TextField label="Sous-catégorie" value={form.subcategory} onChange={(v) => set({ subcategory: v })} />
            <TextField label="Marque" value={form.brand} onChange={(v) => set({ brand: v })} />
            <TextField label="Référence / SKU" value={form.sku} onChange={(v) => set({ sku: v })} />
          </div>
          <TextField label="Code-barres" value={form.barcode} onChange={(v) => set({ barcode: v })} inputMode="numeric" />
          <TextArea label="Description" value={form.description} onChange={(v) => set({ description: v })} />
          <SelectField label="Statut" value={form.status} onChange={(v) => set({ status: v })}
            options={[{ value: "active", label: "Actif" }, { value: "inactive", label: "Inactif" }]} />
          {!isService ? (
            <SelectField label="Unité de référence (calculs internes)" value={form.reference_unit}
              onChange={(v) => set({ reference_unit: v })}
              options={[{ value: "", label: "Même que l'unité de vente" }, ...unitOptions.map((u) => ({ value: u, label: u }))]} />
          ) : null}
        </Section>

        <Section title="Coûts" defaultOpen>
          {!hasDetailedCosts ? money(isService ? "Coût du service" : "Coût unitaire", "cost_price",
            "Ou détaillez ci-dessous : prix d'achat, quantité et frais.") : null}
          <div className="grid grid-cols-2 gap-3">
            {money("Prix d'achat total", "purchase_price")}
            <TextField label={`Quantité obtenue (${form.unit})`} value={form.purchase_qty}
              onChange={(v) => set({ purchase_qty: v })} inputMode="decimal" type="number" step="any" />
          </div>
          {hasDetailedCosts ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {COST_FIELDS.map((f) => (
                  <TextField key={f.key} label={f.label} value={form.costs[f.key] ?? ""} inputMode="decimal" type="number" step="any"
                    onChange={(v) => set({ costs: { ...form.costs, [f.key]: v } })} />
                ))}
              </div>
              <div className="space-y-1 rounded-2xl bg-muted px-4 py-3 text-xs tabular">
                <p>Coût d'acquisition : <strong>{formatMoney(detailed.acquisition)}</strong></p>
                <p>Coût de revient total : <strong>{formatMoney(detailed.total)}</strong></p>
                <p>Coût unitaire : <strong>{detailed.unitCost === null ? "quantité requise" : formatMoney(detailed.unitCost)}</strong></p>
              </div>
            </>
          ) : null}
          {isService ? (
            <TextField label="Temps estimé" value={form.estimated_time} onChange={(v) => set({ estimated_time: v })} placeholder="Ex. 2 h" />
          ) : null}
        </Section>

        <Section title="Prix de vente" defaultOpen>
          {money("Prix de vente standard", "sale_price")}
          <div className="grid grid-cols-3 gap-3">
            {money("Gros", "wholesale_price")}
            {money("Promo", "promo_price")}
            {money("Minimum", "min_price")}
          </div>
        </Section>

        {!isService ? (
          <Section title="Stock" defaultOpen={!product}>
            <label className="flex items-center justify-between rounded-2xl border border-input px-4 py-3">
              <span className="text-sm font-medium">Gérer le stock</span>
              <input type="checkbox" checked={form.track_stock} onChange={(e) => set({ track_stock: e.target.checked })}
                className="size-5 accent-[var(--color-primary)]" />
            </label>
            {form.track_stock ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label={product ? "Stock actuel" : "Stock initial"} value={form.stock} onChange={(v) => set({ stock: v })} inputMode="decimal" type="number" step="any" />
                  <TextField label="Stock réservé" value={form.reserved_stock} onChange={(v) => set({ reserved_stock: v })} inputMode="decimal" type="number" step="any" />
                  <TextField label="Stock minimum" value={form.min_stock} onChange={(v) => set({ min_stock: v })} inputMode="decimal" type="number" step="any" />
                  <TextField label="Stock maximum" value={form.max_stock} onChange={(v) => set({ max_stock: v })} inputMode="decimal" type="number" step="any" />
                </div>
                <TextField label="Emplacement" value={form.location} onChange={(v) => set({ location: v })} placeholder="Boutique, dépôt…" />
                <p className="text-xs text-muted-foreground">
                  Disponible : {formatQty(availableStock(form.stock, form.reserved_stock))} {form.unit}
                  {num(form.stock) <= num(form.min_stock) && form.stock !== "" ? " · ⚠ sous le minimum" : ""}
                </p>
              </>
            ) : null}
            {product && form.track_stock && stockChanged ? (
              <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">
                  Correction : {formatQty(product.stock)} → {formatQty(form.stock)}. Elle sera conservée dans l'historique.
                </p>
                <TextField label="Raison de la correction" value={stockReason} onChange={setStockReason} placeholder="Ex. erreur de comptage" />
              </div>
            ) : null}
            <SelectField label="Fournisseur principal" value={form.supplier_id} onChange={(v) => set({ supplier_id: v })}
              options={[{ value: "", label: "Aucun" }, ...suppliers.map((x: { id: string; name: string }) => ({ value: x.id, label: x.name }))]} />
          </Section>
        ) : null}

        {form.product_type === "manufactured" || form.product_type === "composite" ? (
          <p className="rounded-2xl border border-dashed border-input px-4 py-3 text-xs text-muted-foreground">
            Recette et lots de production : pas encore disponibles, prévus à la phase 3.
          </p>
        ) : null}

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-accent p-3 text-center text-accent-foreground">
          {[
            ["Coût unitaire", unitCost === null ? "—" : formatMoney(unitCost)],
            ["Prix", formatMoney(form.sale_price)],
            ["Bénéfice", formatMoney(prof.profit)],
            ["Marge", formatPct(prof.marginPct)],
            ["Markup", formatPct(prof.markupPct)],
            ["Stock", trackStock ? `${formatQty(form.stock)} ${form.unit}` : "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[10px] uppercase tracking-wide opacity-70">{k}</p>
              <p className="text-sm font-semibold tabular">{v}</p>
            </div>
          ))}
        </div>
        <SubmitButton loading={loading}>{product ? "Enregistrer" : "Ajouter le produit"}</SubmitButton>
      </form>
    </Modal>
  );
}

/* ---------------------------- FOURNISSEUR ---------------------------- */
export function SupplierDialog({
  open,
  onClose,
  supplier,
}: {
  open: boolean;
  onClose: () => void;
  supplier?: { id: string; name: string; phone: string | null; whatsapp: string | null; address: string | null; note: string | null } | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? "");
    setPhone(supplier?.phone ?? "");
    setWhatsapp(supplier?.whatsapp ?? "");
    setAddress(supplier?.address ?? "");
    setNote(supplier?.note ?? "");
  }, [open, supplier]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Le nom est obligatoire"); return; }
    setLoading(true);
    const payload = {
      name: name.trim(),
      phone: phone || null,
      whatsapp: whatsapp || null,
      address: address || null,
      note: note || null,
    };
    const { error } = supplier
      ? await supabase.from("suppliers").update(payload).eq("id", supplier.id)
      : await supabase.from("suppliers").insert(payload);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(supplier ? "Fournisseur mis à jour" : "Fournisseur ajouté");
    qc.invalidateQueries({ queryKey: qk.suppliers });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={supplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}>
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Nom" value={name} onChange={setName} required />
        <TextField label="Téléphone" value={phone} onChange={setPhone} inputMode="tel" />
        <TextField label="WhatsApp" value={whatsapp} onChange={setWhatsapp} inputMode="tel" />
        <TextField label="Adresse" value={address} onChange={setAddress} />
        <TextArea label="Note" value={note} onChange={setNote} />
        <SubmitButton loading={loading}>Enregistrer</SubmitButton>
      </form>
    </Modal>
  );
}

/* ----------------------------- DÉPENSE ----------------------------- */
export function ExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rpc = useRpc<Record<string, unknown>>("create_expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("autres");
  const [method, setMethod] = useState("especes");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setDescription("");
      setAmount("");
      setCategory("autres");
      setMethod("especes");
      setNote("");
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { toast.error("Décrivez la dépense"); return; }
    if (num(amount) <= 0) { toast.error("Le montant doit être supérieur à zéro"); return; }
    try {
      await rpc.mutateAsync({
        p_description: description.trim(),
        p_amount: num(amount),
        p_category: category,
        p_method: method,
        p_note: note || null,
      });
      toast.success("Dépense enregistrée");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle dépense">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Description" value={description} onChange={setDescription} required placeholder="Transport marchandise" />
        <TextField label="Montant (HTG)" value={amount} onChange={setAmount} type="number" step="0.01" inputMode="decimal" required />
        <SelectField
          label="Catégorie"
          value={category}
          onChange={setCategory}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] ?? c }))}
        />
        <SelectField label="Mode de paiement" value={method} onChange={setMethod} options={[...PAYMENT_METHODS]} />
        <TextArea label="Note" value={note} onChange={setNote} />
        <SubmitButton loading={rpc.isPending}>Enregistrer la dépense</SubmitButton>
      </form>
    </Modal>
  );
}

/* ----------------------------- PAIEMENT ----------------------------- */
export function PaymentDialog({
  open,
  onClose,
  direction,
  customerId,
  supplierId,
  saleId,
  purchaseId,
  remaining,
  title,
}: {
  open: boolean;
  onClose: () => void;
  direction: "in" | "out";
  customerId?: string | null;
  supplierId?: string | null;
  saleId?: string | null;
  purchaseId?: string | null;
  remaining?: number;
  title?: string;
}) {
  const rpc = useRpc<Record<string, unknown>>("record_payment");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("especes");
  const [note, setNote] = useState("");
  const [confirmOverpay, setConfirmOverpay] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(remaining && remaining > 0 ? String(remaining) : "");
      setMethod("especes");
      setNote("");
      setConfirmOverpay(false);
    }
  }, [open, remaining]);

  const over = remaining !== undefined && num(amount) > remaining;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (num(amount) <= 0) { toast.error("Le montant doit être supérieur à zéro"); return; }
    if (over && !confirmOverpay) {
      { toast.error("Le montant dépasse le reste à payer. Cochez la confirmation pour continuer."); return; }
    }
    try {
      await rpc.mutateAsync({
        p_direction: direction,
        p_amount: num(amount),
        p_method: method,
        p_customer_id: customerId ?? null,
        p_supplier_id: supplierId ?? null,
        p_sale_id: saleId ?? null,
        p_purchase_id: purchaseId ?? null,
        p_note: note || null,
        p_allow_overpay: confirmOverpay,
      });
      toast.success("Paiement enregistré");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title ?? (direction === "in" ? "Encaisser un paiement" : "Payer un fournisseur")}>
      <form onSubmit={submit} className="space-y-4">
        {remaining !== undefined ? (
          <div className="rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            Reste à payer : <strong className="tabular">{formatMoney(remaining)}</strong>
          </div>
        ) : null}
        <TextField label="Montant (HTG)" value={amount} onChange={setAmount} type="number" step="0.01" inputMode="decimal" required />
        <SelectField label="Méthode" value={method} onChange={setMethod} options={[...PAYMENT_METHODS]} />
        <TextArea label="Note" value={note} onChange={setNote} />
        {over ? (
          <label className="flex items-start gap-3 rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={confirmOverpay}
              onChange={(e) => setConfirmOverpay(e.target.checked)}
              className="mt-0.5 size-5 accent-[var(--color-primary)]"
            />
            <span>Je confirme un paiement supérieur au reste à payer.</span>
          </label>
        ) : null}
        <SubmitButton loading={rpc.isPending}>Enregistrer le paiement</SubmitButton>
      </form>
    </Modal>
  );
}
