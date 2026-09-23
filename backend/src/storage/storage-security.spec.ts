import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

describe('Protected documents', () => {
  const actor = { id:'sales-1', role:'SALES_EXEC' } as const;
  it('encrypts stored bytes, round trips through authenticated decryption and deletes the object', async () => {
    const values: Record<string,string> = { AWS_ENDPOINT_URL_S3:'https://storage.example', AWS_ACCESS_KEY_ID:'test', AWS_SECRET_ACCESS_KEY:'test', INTEGRATION_KEY:'test-document-key' };
    const service = new StorageService({get:(key:string) => values[key]} as any);
    let stored: Buffer;
    const send = jest.fn(async (command:any) => {
      if (command instanceof PutObjectCommand) { stored=command.input.Body as Buffer; return {}; }
      if (command instanceof GetObjectCommand) return {Body:{transformToByteArray:async () => stored}};
      return {};
    });
    (service as any).client = {send};
    const original=Buffer.from('%PDF-1.7 sensitive document');
    const ref=await service.uploadPrivate(original,'passport.pdf');
    expect(ref).toMatch(/^private:v1:private\//);
    expect(stored!.includes(original)).toBe(false);
    expect(await service.readPrivate(ref)).toEqual(original);
    stored![stored!.length-1] ^= 1;
    await expect(service.readPrivate(ref)).rejects.toThrow();
    await service.remove(ref);
    expect(send.mock.calls.at(-1)?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });
  it('rejects oversized and active-content uploads before storage', async () => {
    const service=new StorageService({get:()=>undefined} as any);
    await expect(service.uploadPrivate(Buffer.alloc(12*1024*1024+1),'large.pdf')).rejects.toThrow('12 MB');
    await expect(service.uploadPrivate(Buffer.from('<script>'),'payload.html')).rejects.toThrow('Unsupported');
  });
  it('does not read another salesperson document or any HR document', async () => {
    const storage={readPrivate:jest.fn()};
    const db={attachment:{findUnique:jest.fn().mockResolvedValue({entityType:'lead',entityId:'lead-2',uploadedById:'sales-2'})},lead:{findUnique:jest.fn().mockResolvedValue({assignedToId:'sales-2'})}};
    const controller=new StorageController(storage as any,db as any);
    await expect(controller.content('doc',actor,{} as any)).rejects.toThrow('Attachment not found');
    db.attachment.findUnique.mockResolvedValue({entityType:'employee',entityId:'emp',uploadedById:'sales-1'});
    await expect(controller.content('doc',actor,{} as any)).rejects.toThrow('Attachment not found');
    expect(storage.readPrivate).not.toHaveBeenCalled();
  });
  it('does not delete a database record when object removal fails', async () => {
    const db={attachment:{findUnique:jest.fn().mockResolvedValue({id:'doc',entityType:null,entityId:null,uploadedById:actor.id,url:'private:v1:private/key'}),delete:jest.fn()}};
    const controller=new StorageController({remove:jest.fn().mockRejectedValue(new Error('storage down'))} as any,db as any);
    await expect(controller.remove('doc',actor)).rejects.toThrow('storage down');
    expect(db.attachment.delete).not.toHaveBeenCalled();
  });
});
