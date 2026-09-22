'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
import { Panel, PanelHeader, PanelTitle, PanelBody } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

export function InvoicesPanel({ leadId }: { leadId: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form State.
  // Seeded from PricingSettings rather than hardcoded: tour packages carry 5%,
  // and defaulting to 18% quietly billed the wrong slab. null until loaded so
  // we never post a rate the operator did not see.
  const [gstRate, setGstRate] = useState<number | null>(null);
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);

  const loadInvoices = async () => {
    try {
      const res: any = await api.get(`/invoices/lead/${leadId}`);
      setInvoices(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [leadId]);

  // Pull the configured GST slab once. If settings are unreachable we leave the
  // field empty and omit gstRate on submit, so the backend applies the same
  // configured rate rather than the form guessing one.
  useEffect(() => {
    api
      .get<{ gstPercent: number }>('/settings/pricing')
      .then((s) => setGstRate(s.gstPercent))
      .catch(() => {});
  }, []);

  const addLine = () => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, val: any) => {
    const newItems = [...lineItems];
    (newItems[i] as any)[field] = val;
    setLineItems(newItems);
  };

  const submitInvoice = async () => {
    if (lineItems.some(item => !item.description.trim() || item.quantity < 1 || item.unitPrice < 0)) {
      return alert('Please fill all line items properly.');
    }
    setCreating(true);
    try {
      await api.post('/invoices', {
        leadId,
        // Omitted when settings have not loaded — the backend then uses the
        // configured rate instead of a hardcoded default.
        ...(gstRate === null ? {} : { gstRate }),
        lineItems,
      });
      setShowForm(false);
      setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      await loadInvoices();
    } catch (e) {
      alert('Failed to generate invoice');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Panel>
      <PanelHeader className="flex justify-between items-center">
        <PanelTitle>Billing & Invoices</PanelTitle>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Invoice'}
        </Button>
      </PanelHeader>
      <PanelBody className="pt-2">
        {showForm && (
          <div className="bg-muted/30 p-4 rounded-md border mb-4 space-y-4">
            <h4 className="font-semibold text-sm">Generate GST Invoice</h4>
            <div className="space-y-3">
              {lineItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input 
                      placeholder="Description (e.g., Flight Tickets)" 
                      value={item.description}
                      onChange={(e) => updateLine(i, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-20">
                    <Input 
                      type="number" min="1" 
                      value={item.quantity}
                      onChange={(e) => updateLine(i, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-28">
                    <Input 
                      type="number" min="0" 
                      value={item.unitPrice}
                      onChange={(e) => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lineItems.length === 1}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addLine} className="text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Line
              </Button>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <div className="w-32">
                <label className="text-sm font-medium">GST Slab (%)</label>
                <Select
                  value={gstRate === null ? '' : gstRate.toString()}
                  onChange={(e) => setGstRate(parseInt(e.target.value))}
                >
                  <option value="" disabled>
                    Loading…
                  </option>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </Select>
              </div>
              <div className="flex-1 flex justify-end items-end pb-1">
                <Button onClick={submitInvoice} disabled={creating}>
                  {creating ? 'Generating...' : 'Generate Invoice'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices generated yet.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{formatCurrency(inv.total)}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
