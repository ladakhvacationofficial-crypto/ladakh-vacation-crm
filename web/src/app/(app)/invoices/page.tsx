'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
import { FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function InvoicesDashboard() {
    const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    api.get('/invoices').then((res: any) => setInvoices(res.data)).catch(console.error);
  }, []);

  const handleMarkPaid = async (id: string) => {
    if (!confirm('Mark this invoice as PAID?')) return;
    try {
      await api.post(`/invoices/${id}/paid`);
      setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: 'PAID' } : inv));
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoices & Billing</h1>
        <p className="text-muted-foreground">Manage all GST invoices across leads.</p>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">Invoice #</th>
              <th className="p-3 font-medium">Lead</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Total (Inc. GST)</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  No invoices found.
                </td>
              </tr>
            ) : invoices.map(invoice => (
              <tr key={invoice.id} className="hover:bg-muted/50">
                <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                <td className="p-3">
                  <Link href={`/leads/${invoice.leadId}`} className="hover:underline text-blue-600">
                    {invoice.lead?.name || 'Unknown'}
                  </Link>
                </td>
                <td className="p-3">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                <td className="p-3 font-medium">{formatCurrency(invoice.total)}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    invoice.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                    invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {invoice.status !== 'PAID' && (
                    <button 
                      onClick={() => handleMarkPaid(invoice.id)}
                      className="text-xs inline-flex items-center gap-1 text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="w-3 h-3" /> Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
