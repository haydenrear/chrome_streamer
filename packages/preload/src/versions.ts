
import {ipcRenderer} from 'electron';
import {DataCaptureProcessor} from '../../main/src/monitor-event-consumer/dataCaptureScanner';
import {CaptureSourceConsumer} from '../../main/src/monitor-event-consumer/monitorCapture';
import ipcMain = Electron.ipcMain;

export {versions} from 'node:process';


class IpcRenderCommand {
  captureConsumer: CaptureSourceConsumer

  constructor(captureConsumer: CaptureSourceConsumer) {
    this.captureConsumer = captureConsumer
  }

  doIpcRender(channel: string) {
    ipcRenderer.on(channel,
      async (event: any, sources: any) => this.captureConsumer.consumeCapture(
        event, sources, channel)
    );
  }

  doMainIpcRender(channel: string) {
    ipcMain.on(channel,
      async (event: any, sources: any) => this.captureConsumer.consumeCapture(
        event, sources, channel)
    );
  }

}

function begin() {
  const ipcRenderCommands = new IpcRenderCommand(new CaptureSourceConsumer([]));
  const ipc = import.meta.env.VITE_IPC_RENDER_SOURCES as string;
  ipc.split(',').forEach(ipcChannelSource => ipcRenderCommands.doIpcRender(ipcChannelSource));
  const main = import.meta.env.VITE_MAIN_SOURCES as string;
  main.split(',').forEach(ipcChannelSource => ipcRenderCommands.doMainIpcRender(ipcChannelSource));
}

begin();
