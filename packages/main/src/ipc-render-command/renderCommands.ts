import {inject, injectable} from 'inversify';
import {InjectableProperties} from '../utils/properties';
import {CaptureSourceConsumer} from '/@/monitor-event-consumer/monitorCapture';
import {ipcMain, ipcRenderer} from 'electron';
import {
  EventListenerEventSourceInitializer,
  IpcRenderEventSourceInitializer,
} from '/@/monitor-event-source/desktopCapture';


@injectable()
export class IpcRenderProperties extends InjectableProperties {
  constructor() {
    super(['IPC_RENDER_SOURCES', 'MAIN_SOURCES']);
  }
}

@injectable()
export class IpcRenderCommand {
  captureConsumer: CaptureSourceConsumer
  renderProperties: IpcRenderProperties
  mainProperties: string[]
  ipcProperties: string[]
  sourceInitializer: IpcRenderEventSourceInitializer

  constructor(
    @inject("CaptureSourceConsumer") captureConsumer: CaptureSourceConsumer,
    @inject("IpcRenderProperties") renderProperties: IpcRenderProperties,
    @inject("EventListenerEventSourceInitializer") sourceInitializer: EventListenerEventSourceInitializer
  ) {
    console.log(captureConsumer, "is capture consumer and", renderProperties, "are render properties.");
    this.captureConsumer = captureConsumer;
    this.renderProperties = renderProperties;
    this.ipcProperties = this.renderProperties.ipcRenderSources.split(",")
    this.mainProperties = this.renderProperties.mainSources.split(",")
    this.sourceInitializer = sourceInitializer
  }

  public doStartRendering() {
    this.ipcProperties.forEach(this.doIpcRender.bind(this));
    this.mainProperties.forEach(this.doMainIpcRender.bind(this));
    this.doWindowInitializer();
  }

  doMainIpcRender(channel: string) {
    if (channel && ipcMain && this.captureConsumer) {
      console.log('Loading ipc main for', channel);
      ipcMain.on(channel,
        async (event: any, sources: any) => {
          if (this && this.captureConsumer) {
            await this.captureConsumer.consumeCapture(event, sources, channel);
          } else {
            console.log('Error capture consumer was None.');
          }
        },
      );

    } else if (!ipcMain)
      console.log('Failed to load main ipc on channel', channel, ipcMain);
  }

  doIpcRender(channel: string) {
    if (channel && ipcRenderer){
      console.log("Loading ipc renderer for", channel);
      ipcRenderer.on(channel,
        async (event: any, sources: any) => {

          if (this && this.captureConsumer) {
            await this.captureConsumer.consumeCapture(event, sources, channel);
          } else {
            console.log('Error capture consumer was none in ipc render.');
          }
        });
    }
    else
      console.log("Failed to load ipc renderer on channel", channel, ipcRenderer);
  }

  doWindowInitializer() {
    this.sourceInitializer.start();
  }

}

