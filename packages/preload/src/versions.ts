import * as path from 'path';
import {writeStreamData} from './index';

export {versions} from 'node:process';


const {ipcRenderer} = require('electron');

ipcRenderer.on('SOURCES', async (event, sources) => {
  console.log('Found sources.');
  console.log('Received sources in preload.', sources);
  for (const sourceId in sources) {
    try {
      const source = sources[sourceId];
      console.log('Source', source);
      console.log('Creating source with id ', source.id);
      console.log('Received sources in preload.');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          },
        },
      });
      console.log('Created stream ', stream);
      handleStream(stream, source.id);
    } catch (e) {
      handleError('Error retrieving user media: ', e);
    }
  }
});

function handleStream(stream, id) {
  const outDirectory = import.meta.env.VITE_OUT_DIR;
  const recorder = new MediaRecorder(stream, {mimeType: 'video/webm'});
  console.log('Handling stream', stream, 'with out directory', outDirectory);
  try {
    const outDir = `${outDirectory}/${id.replaceAll(':', '')}.webm`;
    console.log('Writing stream to ', outDir);
    recorder.ondataavailable = async (event) => {
      console.log(`Writing event data for ${outDir}!`);
      writeStreamData(outDir, event);
    };
    console.log('Starting recorder');
    recorder.start();
  } catch (e) {
    console.log('Exception: ', e) ;
  }
}

function handleError(e) {
  console.log(e);
}
