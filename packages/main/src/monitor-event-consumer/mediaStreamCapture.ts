import {inject, injectable} from 'inversify';
import {AbstractPublisher, Subscriber} from '/@/publisher';
import {
  CaptureSourceClosedEvent,
  CaptureSourceStartEvent,
  DataCaptureEvent, DomDataCaptureEvent,
  RequestDataEvent,
} from '../monitor-event-consumer/captureEvents';
import {DataCaptureScanner} from '../monitor-event-consumer/mediaStreamDataCaptureScanner';
import {FileStreamWriterHolder} from '../monitor-event-consumer/writeFileStream';
import {createPath} from '../utils/ioUtils';
import {EventListenerProperties} from '/@/utils/properties';
import {EventListenerEventSerializer} from '/@/monitor-event-consumer/eventListenerEventCaptureSubscriber';

interface SerializeStartEvent {
  id: string;
  startTime: number;
}

interface SerializeEndEvent {
  id: string;
  endTime: number;
}

@injectable()
export class MediaStreamDataCaptureScanner
  extends DataCaptureScanner<DataCaptureEvent, MediaStreamCaptureSubscriber>
  implements Subscriber<DataCaptureEvent>{

  eventListenerProperties: EventListenerProperties

  constructor(
    @inject("EventListenerProperties") eventListenerProperties: EventListenerProperties
  ) {
    super();
    this.eventListenerProperties = eventListenerProperties;
    this.start();
  }

  start() {
    setInterval(this.doScan.bind(this), 3000);
  }

  private doScan() {
    console.log("Performing next data event.")
    this.nextValue(new RequestDataEvent());
  }

  subscribe(subscriber: MediaStreamCaptureSubscriber): void {
    if (!this.subscribers.find(s => s.id === subscriber.id)) {
      console.log('Subscribing data event subscriber', subscriber.id);
      // idempotent subscriber - if stream already exists then it won't again.
      subscriber.recorder.onstop = async () => {
        let closeEvent = new CaptureSourceClosedEvent(subscriber.id);
        this.nextValue(closeEvent);
        this.doNext(closeEvent);
      };
      subscriber.doNext(new CaptureSourceStartEvent(subscriber.id))
        .then(_ => super.subscribe(subscriber));
    } else {
      console.log(`Skipped subscriber ${subscriber.id}. Already existed.`);
    }
  }


  doNext(value: DataCaptureEvent): void {
    if (value instanceof CaptureSourceClosedEvent) {
      console.log('Removing subscriber', value.id, 'from publisher.');
      this.subscribers = this.subscribers
        .filter((v, _) => v.id != value.id);
    }
  }

  matches(value: Subscriber<DataCaptureEvent>): boolean {
    return value instanceof MediaStreamCaptureSubscriber;
  }

  matchesEvent(event: DataCaptureEvent): boolean {
    return !(event instanceof DomDataCaptureEvent);
  }
}

export class MediaStreamCaptureSubscriber implements Subscriber<DataCaptureEvent> {

  outFile: FileStreamWriterHolder;
  path: string;
  recorder: MediaRecorder;
  id: string;
  eventListenerProperties: EventListenerProperties;

  constructor(mediaStream: MediaStream, id: string, eventListenerProperties: EventListenerProperties) {
    this.eventListenerProperties = eventListenerProperties;
    this.id = id;
    this.path = import.meta.env.VITE_OUT_DIR;
    this.outFile = new FileStreamWriterHolder(createPath(this.path, this.id))
    this.recorder = new MediaRecorder(mediaStream, {mimeType: 'video/webm'});
    this.recorder.ondataavailable = this.addData.bind(this);
  }

  async doNext(captureEvent: DataCaptureEvent) {
    if (captureEvent instanceof RequestDataEvent) {
      console.log("Requesting data for", this.id);
      this.recorder.requestData();
    } else if (captureEvent instanceof CaptureSourceClosedEvent) {
      console.log(`Closing ${this.path} for ${this.id}.`);
      await this.writeEndEvent();
      this.outFile?.end();
    } else if (captureEvent instanceof CaptureSourceStartEvent) {
      console.log("Starting capture for", this.id);
      await this.writeStartEvent();
      this.recorder.start();
    }
  }

  private async writeEndEvent() {
    const endTime = new Date().getMilliseconds();
    console.log("Writing start event for", this.id, "with start time", endTime);
    await this.writeEvent('start', {endTime: endTime, id: this.id} as SerializeEndEvent);
  }

  private async writeStartEvent() {
    const startTime = new Date().getMilliseconds();
    console.log("Writing start event for", this.id, "with start time", startTime);
    await this.writeEvent('start', {startTime: startTime, id: this.id} as SerializeStartEvent);
  }

  private async writeEvent<T>(prefix: string, event: T) {
    const startEventFile = new FileStreamWriterHolder(createPath(
      this.eventListenerProperties.messageDirectory, `${prefix}_${this.id}`, '.metadata'));
    await startEventFile?.addSerializeData(event);
    startEventFile?.end();
  }

  async addData(event: BlobEvent): Promise<void> {
    const read = event.data.stream();
    await this.outFile?.addData(async () => read);
  }

}
