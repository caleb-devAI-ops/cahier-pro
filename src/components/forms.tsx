import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Modal, SelectField, SubmitButton, TextArea, TextField } from "@/components/modal";
import { qk, useRpc, useSuppliers } from "@/lib/db";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHODS,
  formatMoney,
  num,
} from "@/lib/format";

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
    if (error) return toast.error(error.message);
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
}

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
  const { data: suppliers = [] } = useSuppliers();
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    cost_price: "",
    sale_price: "",
    stock: "",
    min_stock: "",
    unit: "unité",
    supplier_id: "",
    track_stock: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      category: product?.category ?? "",
      description: product?.description ?? "",
      cost_price: product ? String(num(product.cost_price)) : "",
      sale_price: product ? String(num(product.sale_price)) : "",
      stock: product ? String(num(product.stock)) : "",
      min_stock: product ? String(num(product.min_stock)) : "",
      unit: product?.unit ?? "unité",
      supplier_id: product?.supplier_id ?? "",
      track_stock: product?.track_stock ?? true,
    });
  }, [open, product]);

  const margin = num(form.sale_price) - num(form.cost_price);
  const marginPct = num(form.sale_price) > 0 ? (margin / num(form.sale_price)) * 100 : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Le nom du produit est obligatoire"); return; }
    setLoading(true);
    const payload = {
      name: form.name.trim(),
      sku: form.sku || null,
      category: form.category || null,
      description: form.description || null,
      cost_price: num(form.cost_price),
      sale_price: num(form.sale_price),
      min_stock: num(form.min_stock),
      unit: form.unit || "unité",
      supplier_id: form.supplier_id || null,
      track_stock: form.track_stock,
    };
    let error;
    if (product) {
      ({ error } = await supabase.from("products").update(payload).eq("id", product.id));
    } else {
      ({ error } = await supabase
        .from("products")
        .insert({ ...payload, stock: form.track_stock ? num(form.stock) : 0 }));
    }
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(product ? "Produit mis à jour" : "Produit ajouté");
    qc.invalidateQueries({ queryKey: qk.products });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? "Modifier le produit" : "Nouveau produit"}>
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Référence / SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
          <TextField label="Catégorie" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Prix d'achat"
            value={form.cost_price}
            onChange={(v) => setForm({ ...form, cost_price: v })}
            inputMode="decimal"
            type="number"
            step="0.01"
          />
          <TextField
            label="Prix de vente"
            value={form.sale_price}
            onChange={(v) => setForm({ ...form, sale_price: v })}
            inputMode="decimal"
            type="number"
            step="0.01"
          />
        </div>
        <div className="rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
          Marge unitaire : <strong className="tabular">{formatMoney(margin)}</strong>
          {num(form.sale_price) > 0 ? ` (${marginPct.toFixed(1)} %)` : ""}
        </div>

        <label className="flex items-center justify-between rounded-2xl border border-input px-4 py-3">
          <span className="text-sm font-medium">Gérer le stock</span>
          <input
            type="checkbox"
            checked={form.track_stock}
            onChange={(e) => setForm({ ...form, track_stock: e.target.checked })}
            className="size-5 accent-[var(--color-primary)]"
          />
        </label>

        {form.track_stock ? (
          <div className="grid grid-cols-3 gap-3">
            {!product ? (
              <TextField
                label="Stock initial"
                value={form.stock}
                onChange={(v) => setForm({ ...form, stock: v })}
                inputMode="decimal"
                type="number"
              />
            ) : null}
            <TextField
              label="Stock min."
              value={form.min_stock}
              onChange={(v) => setForm({ ...form, min_stock: v })}
              inputMode="decimal"
              type="number"
            />
            <TextField label="Unité" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
          </div>
        ) : null}

        <SelectField
          label="Fournisseur"
          value={form.supplier_id}
          onChange={(v) => setForm({ ...form, supplier_id: v })}
          options={[
            { value: "", label: "Aucun" },
            ...suppliers.map((s: { id: string; name: string }) => ({ value: s.id, label: s.name })),
          ]}
        />
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
    if (error) return toast.error(error.message);
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
