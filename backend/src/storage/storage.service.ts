import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class StorageService {
  private readonly storage = new Storage();
  private readonly bucketName = process.env.GCS_BUCKET_NAME!;

  async uploadStatement(
    userId: string,
    dealId: string,
    fileName: string,
    content: string,
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);

    const storagePath = `deals/${userId}/${dealId}/${fileName}`;

    const file = bucket.file(storagePath);

    await file.save(Buffer.from(content, 'utf-8'), {
      resumable: false,
      contentType: this.getContentType(fileName),
    });

    return storagePath;
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'json') {
      return 'application/json';
    }

    if (extension === 'html' || extension === 'htm') {
      return 'text/html';
    }

    return 'application/octet-stream';
  }
}
