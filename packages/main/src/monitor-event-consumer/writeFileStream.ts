import {open} from 'node:fs/promises';
import * as path from 'path';
import * as stream from 'stream';

export class FileStreamWriterHolder {

  outFile: stream.Writable | undefined;
  filePath: string;

  constructor(filepath: string) {
    this.filePath = filepath;
  }

  async initialize() {
    if (!this.outFile) {
      const openedFile = await open(this.filePath, 'a');
      this.outFile = openedFile.createWriteStream();
    }
  }

  end() {
    this.outFile?.end();
  }

  async addData(event: () => Promise<ReadableStream<Uint8Array> | undefined>): Promise<void> {
    await this.initialize();
    const readData = await event();
    if (readData) {
      console.assert(this.outFile != undefined);
      const data = await readData.getReader().read();
      try {
        this.outFile?.write(data.value);
      } catch (e) {
        console.log('Failed to write event to', path, 'Attempting to reinitialize the file handle and write one more time.');
        await this.initialize();
        this.outFile?.write(data.value);
      }
    }
  }

}
