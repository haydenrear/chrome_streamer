/**
 * @module preload
 */

export {sha256sum} from './nodeCrypto';
export {versions} from './versions';
import { open } from 'node:fs/promises';


export async function writeStreamData(filePath, event: BlobEvent) {
    const openedFile = await open(filePath, 'a');
    const writeStream = openedFile.createWriteStream();
    const read = await event.data.stream().getReader().read();
    writeStream.write(read.value);
}
