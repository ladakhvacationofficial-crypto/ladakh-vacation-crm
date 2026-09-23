'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  api,
  ApiError,
  type IntegrationRow,
  type ProviderCatalogEntry,
} from '@/lib/api';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

/**
 * Dynamic form driven by the provider registry. The parent chooses the
 * provider; we render one field per registry entry. Password fields render
 * blank on edit (the value is already on file) — the caller strips empty
 * strings server-side so a blank means "keep the old value".
 */
export function IntegrationDialog({
  provider,
  editing,
  onDone,
  trigger,
}: {
  provider: ProviderCatalogEntry;
  editing?: IntegrationRow | null;
  onDone: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [priority, setPriority] = useState('0');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLabel(editing?.label ?? '');
    setPriority(String(editing?.priority ?? 0));
    setValues(() => {
      const v: Record<string, string> = {};
      for (const f of provider.fields) v[f.key] = '';
      return v;
    });
    setError(null);
  }, [open, editing, provider]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const credentials: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v !== '') credentials[k] = v;
      }
      const body = {
        provider: provider.id,
        label: label.trim() || undefined,
        priority: Number(priority) || 0,
        credentials,
      };
      if (editing) {
        await api.patch(`/integrations/${editing.id}`, body);
      } else {
        // Guard: creating requires the required fields be filled.
        for (const f of provider.fields) {
          if (f.required && !credentials[f.key]) {
            throw new ApiError(`Missing required field: ${f.label}`, 400);
          }
        }
        if (provider.id === 'google_search_console') {
          if (values.authMethod === 'service_account' && !credentials.serviceAccountKey) {
            throw new ApiError('Missing required field: Service account JSON key', 400);
          }
          if (values.authMethod === 'oauth') {
            for (const k of ['clientId', 'clientSecret', 'refreshToken']) {
              if (!credentials[k]) {
                const spec = provider.fields.find((f) => f.key === k);
                throw new ApiError(`Missing required field: ${spec?.label ?? k}`, 400);
              }
            }
          }
        }
        await api.post('/integrations', body);
      }
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={editing ? `Edit ${provider.label}` : `Add ${provider.label}`}
        description={
          provider.docsUrl
            ? 'Credentials are encrypted at rest with AES-256-GCM.'
            : undefined
        }
      >
        <form onSubmit={submit} className="max-h-[80vh] overflow-y-auto p-5">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="i-label">Nickname</Label>
              <Input
                id="i-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`e.g. ${provider.label} (main)`}
              />
              <p className="text-[11px] text-ink-500">
                Shown in the integrations list. Optional — defaults to the provider name.
              </p>
            </div>

            {provider.category === 'AI' && (
              <div className="space-y-1">
                <Label htmlFor="i-priority">Failover priority</Label>
                <Input
                  id="i-priority"
                  type="number"
                  min={0}
                  max={100}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
                <p className="text-[11px] text-ink-500">
                  Higher tried first. Put free-tier providers highest so paid ones catch overflow.
                </p>
              </div>
            )}

            <div className="border-t border-ink-800 pt-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.09em] text-ink-500">
                Credentials
              </p>
              <div className="space-y-3">
                {provider.fields
                  .filter((f) => {
                    if (provider.id === 'google_search_console') {
                      const method = values.authMethod;
                      if (f.key === 'serviceAccountKey') {
                        return method === 'service_account';
                      }
                      if (['clientId', 'clientSecret', 'refreshToken'].includes(f.key)) {
                        return method === 'oauth';
                      }
                    }
                    return true;
                  })
                  .map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={`i-${f.key}`}>
                      {f.label}
                      {f.required && <span className="text-warn-500"> *</span>}
                    </Label>
                    {f.type === 'select' ? (
                      <Select
                        id={`i-${f.key}`}
                        value={values[f.key] ?? ''}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.key]: e.target.value }))
                        }
                      >
                        <option value="">Choose…</option>
                        {(f.options ?? []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </Select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        id={`i-${f.key}`}
                        rows={4}
                        value={values[f.key] ?? ''}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.key]: e.target.value }))
                        }
                        placeholder={
                          editing && editing.keysOnFile.includes(f.key)
                            ? '•••••• (leave blank to keep)'
                            : f.placeholder
                        }
                        spellCheck={false}
                        className="w-full rounded-md border border-ink-700 bg-ink-900/60 px-3 py-2 font-mono text-[12px] leading-relaxed text-ink-100 placeholder:text-ink-500 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
                      />
                    ) : (
                      <Input
                        id={`i-${f.key}`}
                        type={f.type === 'password' ? 'password' : 'text'}
                        value={values[f.key] ?? ''}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.key]: e.target.value }))
                        }
                        placeholder={
                          editing && editing.keysOnFile.includes(f.key)
                            ? '•••••• (leave blank to keep)'
                            : f.placeholder
                        }
                        autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                      />
                    )}
                    {f.help && (
                      <p className="text-[11px] text-ink-500">{f.help}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {provider.docsUrl && (
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-signal-600 hover:text-signal-500"
              >
                {provider.label} docs
                <ExternalLink className="size-3" strokeWidth={1.75} />
              </a>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add integration'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
