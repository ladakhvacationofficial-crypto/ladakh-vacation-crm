'use client';
import { useState, useRef } from 'react';
import { api, tokenStore } from '@/lib/api';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileUp } from 'lucide-react';

export function ImportLeadsDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = tokenStore.user();
  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';

  if (!isOwner) return null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = tokenStore.get();
      const res = await fetch('http://localhost:3000/api/leads/bulk-import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const json = await res.json();
      alert(`Successfully imported ${json.updated} leads.`);
      setOpen(false);
      onImported();
    } catch (err) {
      console.error(err);
      alert('Failed to import leads.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Upload className="mr-2 size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent title="Bulk Import Leads" description="Upload a CSV file with lead data.">
        <div className="p-5 flex flex-col items-center justify-center space-y-4">
          <Button 
            variant="secondary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <FileUp className="mr-2 size-4" />
            {loading ? 'Uploading...' : 'Select CSV File'}
          </Button>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleUpload} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
