import {DesktopCapturerSource, KeyboardInputEvent, MouseInputEvent, MouseWheelInputEvent} from 'electron';
import * as Electron from 'electron';
import {DataCaptureProcessor} from './mediaStreamDataCaptureScanner';
import {inject, injectable, multiInject} from 'inversify';
import {MediaStreamCaptureSubscriber} from '../monitor-event-consumer/mediaStreamCapture';
import {DataCaptureEvent, KeydownCaptureEvent} from '../monitor-event-consumer/captureEvents';
import {KeyboardIpcEvent} from '../monitor-event-source/domEvents';
import * as console from 'console';

export abstract class MonitorCaptureSource<T> {
  underlying: T;

  constructor(t: T) {
    this.underlying = t;
  }

  toCaptureEvent(): DataCaptureEvent | undefined {
    return undefined;
  }

}

class KeydownCaptureSource extends MonitorCaptureSource<KeyboardInputEvent> {

  toCaptureEvent(): DataCaptureEvent | undefined {
    return new KeydownCaptureEvent(new KeyboardIpcEvent(this.underlying.type, this.underlying.keyCode));
  }

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

export abstract class MatchingMonitorCaptureProcess<T extends MonitorCaptureSource<U>, U> implements MonitoringCaptureProcess<T, U> {

  abstract matches<MatchT extends MonitorCaptureSource<any>>(t: MatchT): boolean;

  abstract monitorCapture(monitorSource: T): void;

}

@injectable()
export class CaptureSourceConsumer {

  sources: MatchingMonitorCaptureProcess<MonitorCaptureSource<any>, any>[]

  constructor(
    @multiInject("MatchingMonitorCaptureProcess") sources: MatchingMonitorCaptureProcess<any, any>[]
  ) {
    this.sources = sources;
  }

  async consumeCapture<EventT extends Electron.Event>(event: EventT, source: any[], channel: string) {
    console.log("Consume capture for channel", channel);
    if (source instanceof Array) {
      await Promise.all(
        source.map(async val => await this.singleSource(event, val, channel)))
        .catch(err => console.log("Error consuming captures", err));
    } else {
      await this.singleSource(event, source, channel);
      console.log("Received event", event, "with source", source);
    }
  }

  private async singleSource<EventT extends Electron.Event>(event: EventT, val: any, channel: string) {
    return await this.createMonitorCaptureSource(event, val, channel)
      ?.then(capture => {
          console.log('Created capture', capture);
          if (capture)
            this.sources
              ?.find(s => s?.matches(capture))
              ?.monitorCapture(capture);
        },
      )
      .catch(err => console.log('Error consuming capture', err));
  }

  async createMonitorCaptureSource<EventT extends Electron.Event>(event: EventT, source: any, channel: string) {
    console.log("Found event", channel, source);
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

@injectable()
export class CaptureDisplaySource implements MatchingMonitorCaptureProcess<DisplayMonitorCaptureSource, DesktopCapturerSource> {

  dataCaptureProcessor: DataCaptureProcessor;

  constructor(@inject("DataCaptureProcessor") dataCaptureProcessor: DataCaptureProcessor) {
    this.dataCaptureProcessor = dataCaptureProcessor;
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

  handleStream(stream: MediaStream, id: any) {
    this.dataCaptureProcessor.subscribe(new MediaStreamCaptureSubscriber(stream, id));
  }

  matches<MatchT extends MonitorCaptureSource<any>>(t: MatchT): boolean {
    return t instanceof DisplayMonitorCaptureSource;
  }

}

@injectable()
abstract class CaptureEventListenerSource<M extends MonitorCaptureSource<T>, T> extends MatchingMonitorCaptureProcess<M, T> {

  dataCaptureProcessor: DataCaptureProcessor;

  constructor(
    @inject("DataCaptureProcessor") dataCaptureProcessor: DataCaptureProcessor,
  ) {
    super();
    this.dataCaptureProcessor = dataCaptureProcessor;
  }

  async monitorCapture(monitorSource: M) {
    // idempotent subscribe event
    const dataCaptureEvent = monitorSource.toCaptureEvent();
    if (dataCaptureEvent)
      this.dataCaptureProcessor.nextValue(dataCaptureEvent);
    else console.log("Failed to create capture event for monitor source", monitorSource);
  }


}

@injectable()
export class CaptureKeyboardSource extends CaptureEventListenerSource<KeydownCaptureSource, KeyboardInputEvent> {

  matches<MatchT>(t: MatchT): boolean {
    return t instanceof KeydownCaptureSource;
  }

}

@injectable()
export class CaptureMouseSource extends CaptureEventListenerSource<MouseDownCaptureSource, MouseInputEvent> {

  matches<MatchT>(t: MatchT): boolean {
    return t instanceof MouseDownCaptureSource;
  }

}

@injectable()
export class CaptureMouseWheelInputEvent extends CaptureEventListenerSource<MouseWheelCaptureSource, MouseWheelInputEvent> {

  matches<MatchT>(t: MatchT): boolean {
    return t instanceof MouseDownCaptureSource;
  }

}
