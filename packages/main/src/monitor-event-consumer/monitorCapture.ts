import {DesktopCapturerSource, KeyboardInputEvent, MouseInputEvent, MouseWheelInputEvent} from 'electron';
import * as Electron from 'electron';
import {DataCaptureProcessor} from '/@/monitor-event-consumer/dataCaptureScanner';

export abstract class MonitorCaptureSource<T> {
  underlying: T;

  constructor(t: T) {
    this.underlying = t;
  }

}

class KeydownCaptureSource extends MonitorCaptureSource<KeyboardInputEvent> {
}

class MouseDownCaptureSource extends MonitorCaptureSource<MouseInputEvent> {

}

class MouseWheelCaptureSource extends MonitorCaptureSource<MouseWheelInputEvent> {

}

class DisplayMonitorCaptureSource extends MonitorCaptureSource<DesktopCapturerSource> {

}

interface MonitoringCaptureProcess<T extends MonitorCaptureSource<U>, U> {
  monitorCapture: (monitorSource: T) => void;
}

abstract class MatchingMonitorCaptureProcess<T extends MonitorCaptureSource<U>, U> implements MonitoringCaptureProcess<T, U> {

  abstract matches<MatchT extends MonitorCaptureSource<any>>(t: MatchT): boolean;

  abstract monitorCapture(monitorSource: T): void;

}

export class CaptureSourceConsumer {

  sources: Array<MatchingMonitorCaptureProcess<any, any>>

  constructor(sources: Array<MatchingMonitorCaptureProcess<any, any>>) {
    this.sources = sources;
  }

  async consumeCapture<EventT extends Electron.Event>(event: EventT, source: any[], channel: string) {
    for (const val of source) {
      const capture = await this.createMonitorCaptureSource(event, val, channel);
      if (capture)  {
        let foundToCapture = this.sources
          .find(s => s.matches(capture));
        await foundToCapture?.monitorCapture(capture);
      }
    }
  }

  async createMonitorCaptureSource<EventT extends Electron.Event>(event: EventT, source: any, channel: string) {
    switch (channel) {
      case 'SOURCES':
        return new DisplayMonitorCaptureSource(source as DesktopCapturerSource);
      case 'keydown':
        return new KeydownCaptureSource(source as KeyboardInputEvent);
      case 'mousedown':
        return new MouseDownCaptureSource(source as MouseInputEvent);
      case 'wheel':
        return new MouseWheelCaptureSource(source as MouseWheelInputEvent);
      default:
        console.log(`Found undetermined event: ${event} from source ${source} on channel ${channel}.`);
    }
  }
}


class CaptureDisplaySource implements MatchingMonitorCaptureProcess<DisplayMonitorCaptureSource, DesktopCapturerSource> {

  dataCaptureProcessor: DataCaptureProcessor;

  constructor() {
    this.dataCaptureProcessor = new DataCaptureProcessor();
  }

  async monitorCapture(monitorSource: MonitorCaptureSource<DesktopCapturerSource>) {
    const source = monitorSource.underlying;
    console.log('Creating source with id ', source.id);
    const stream = await navigator.mediaDevices.getUserMedia(this.getMediaConstraints(source));
    console.log('Created stream ', stream);
    this.handleStream(stream, source.id);
  }

  private getMediaConstraints(source: Electron.DesktopCapturerSource) {
    return {
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id,
        },
      },
    } as MediaStreamConstraints;
  }

  handleStream(stream: any, id: any) {
    const outDirectory = import.meta.env.VITE_OUT_DIR;
    const recorder = new MediaRecorder(stream, {mimeType: 'video/webm'});
    this.dataCaptureProcessor.subscribe(outDirectory, id, recorder);
  }

  matches<MatchT extends MonitorCaptureSource<any>>(t: MatchT): boolean {
    return t instanceof DisplayMonitorCaptureSource;
  }

}
