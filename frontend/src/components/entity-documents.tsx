'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, openBinary, tokenStore } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
type Attachment = {id:string;filename:string;sizeBytes:number;uploadedById:string};
export function EntityDocuments({entityType,entityId}:{entityType:'booking'|'employee';entityId:string}) {
  const [files,setFiles]=useState<Attachment[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);
    try { setFiles(await api.get<Attachment[]>(`/uploads/${entityType}/${entityId}`)); }
    catch(e) {setError(e instanceof Error?e.message:'Could not load documents.');}
    finally {setLoading(false);}
  },[entityType,entityId]);
  useEffect(()=>{void load();},[load]);
  async function action(work:()=>Promise<unknown>) {
    setError('');setBusy(true);
    try{await work();await load();}catch(e){setError(e instanceof Error?e.message:'Document action failed.');}finally{setBusy(false);}
  }
  const user=tokenStore.user();
  return <Panel className="mb-4">
    <PanelHeader><PanelTitle>Protected documents</PanelTitle></PanelHeader>
    <PanelBody>
      <p className="mb-3 text-sm text-ink-400">Only authorised staff can download these files. Maximum 12 MB per file.</p>
      {error && <p role="alert" className="mb-3 text-loss-500">{error}</p>}
      <label className="block text-sm">Upload document
        <input type="file" disabled={busy} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv" className="mt-2 block max-w-full" onChange={event=>{
          const file=event.target.files?.[0];event.target.value='';if(!file)return;
          if(file.size>12*1024*1024){setError('File exceeds 12 MB.');return;}
          const form=new FormData();form.set('file',file);form.set('entityType',entityType);form.set('entityId',entityId);
          void action(()=>api.upload('/uploads',form));
        }}/>
      </label>
      {loading ? <p className="mt-3 text-sm">Loading documents...</p> : <ul className="mt-4 space-y-3">
        {files.map(file=><li key={file.id} className="flex flex-wrap justify-between gap-3 border-t border-ink-700 pt-3 text-sm">
          <span className="break-all">{file.filename} ({Math.ceil(file.sizeBytes/1024)} KB)</span>
          <span className="flex gap-4"><button disabled={busy} className="underline" onClick={()=>void action(()=>openBinary(`/uploads/${file.id}/content`,file.filename))}>Download</button>
          {(file.uploadedById===user?.id || ['OWNER','SUPER_ADMIN'].includes(user?.role??'')) && <button disabled={busy} className="text-loss-500 underline" onClick={()=>{if(window.confirm(`Delete ${file.filename} permanently?`))void action(()=>api.del(`/uploads/${file.id}`));}}>Delete</button>}</span>
        </li>)}
        {!files.length && !error && <li className="text-ink-400">No documents uploaded.</li>}
      </ul>}
    </PanelBody>
  </Panel>;
}
