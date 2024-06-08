import {AbstractPublisher, Subscriber} from '/@/publisher';
import {
  DataCaptureEvent,
  DomDataCaptureEvent,
  KeydownCaptureEvent,
  MouseCaptureEvent, MouseWheelCaptureEvent,
} from './captureEvents';
import {FileStreamWriterHolder} from './writeFileStream';
import {DataCaptureScanner} from './mediaStreamDataCaptureScanner';
import {createPath, createStream} from '../utils/ioUtils';
import {IpcDomEvent, KeyboardIpcEvent, MouseIpcEvent, MouseWheelIpcEvent} from '../monitor-event-source/domEvents';
import {inject, injectable, multiInject} from 'inversify';
import {EventListenerProperties} from '../utils/properties';

@injectable()
export class EventListenerCaptureScanner extends DataCaptureScanner<DomDataCaptureEvent<IpcDomEvent>, Subscriber<DomDataCaptureEvent<IpcDomEvent>>>{

  constructor(@inject("EventListenerCaptureSubscriber")  writeDomEventsToFileSubscriber: EventListenerCaptureSubscriber){
    super();
    this.start();
    this.subscribe(writeDomEventsToFileSubscriber);
  }

  matchesEvent(event: DataCaptureEvent): boolean {
    return event instanceof DomDataCaptureEvent;
  }

  matches(subscriber: Subscriber<DataCaptureEvent>): boolean {
    return subscriber instanceof EventListenerCaptureSubscriber;
  }

  start(): void {
  }

}


@injectable()
export class EventListenerCaptureSubscriber implements Subscriber<DomDataCaptureEvent<IpcDomEvent>> {

  outFile: FileStreamWriterHolder;
  eventListenerSerializers: EventListenerEventSerializer<DomDataCaptureEvent<IpcDomEvent>, IpcDomEvent>[]
  path: string;
  eventListenerProperties: EventListenerProperties;

  constructor(@multiInject("EventListenerEventSerializer")
                eventListenerSerializers: EventListenerEventSerializer<DomDataCaptureEvent<IpcDomEvent>, IpcDomEvent>[],
              @inject("EventListenerProperties") eventListenerProperties: EventListenerProperties
  ) {
    this.eventListenerSerializers = eventListenerSerializers;
    this.eventListenerProperties = eventListenerProperties;
    this.path = eventListenerProperties.outDirectory;
    this.outFile = new FileStreamWriterHolder(createPath(this.path, eventListenerProperties.eventListenerLog, 'log'))
  }

  doNext(captureEvent: DomDataCaptureEvent<IpcDomEvent>) {
    const eventToWrite = this.writeEvent(captureEvent);
    this.outFile?.addData(async () => eventToWrite)
  }

  writeEvent(dataCaptureEvent: DomDataCaptureEvent<IpcDomEvent>): ReadableStream<Uint8Array> | undefined {
    const serializer = this.eventListenerSerializers
      .find(d => d.matches(dataCaptureEvent))
    if (serializer) {
      return serializer.writeEvent(dataCaptureEvent);
    } else {
      console.log("Did not contain serializer for", dataCaptureEvent);
    }
  }

}

@injectable()
export abstract class EventListenerEventSerializer<D extends DomDataCaptureEvent<U>, U extends IpcDomEvent> {
  abstract writeEvent(dataCaptureEvent: D): ReadableStream<Uint8Array>;
  abstract matches(dataCaptureEvent: DomDataCaptureEvent<IpcDomEvent>): boolean;
}

@injectable()
export class EventListenerMouseCaptureSerializer extends EventListenerEventSerializer<MouseCaptureEvent, MouseIpcEvent> {
  writeEvent(dataCaptureEvent: MouseCaptureEvent): ReadableStream<Uint8Array> {
    return createStream("")
  }

  matches(dataCaptureEvent: DomDataCaptureEvent<IpcDomEvent>): boolean {
    return dataCaptureEvent instanceof MouseCaptureEvent;
  }
}

@injectable()
export class EventListenerKeyboardCaptureSerializer extends EventListenerEventSerializer<KeydownCaptureEvent, KeyboardIpcEvent> {
  writeEvent(dataCaptureEvent: KeydownCaptureEvent): ReadableStream<Uint8Array> {
    const capture = dataCaptureEvent.t.key;
    return createStream(capture);
  }

  matches(dataCaptureEvent: DomDataCaptureEvent<IpcDomEvent>): boolean {
    return dataCaptureEvent instanceof KeydownCaptureEvent;
  }
}

@injectable()
export class EventListenerMouseWheelCaptureSerializer extends EventListenerEventSerializer<MouseWheelCaptureEvent, MouseWheelIpcEvent> {
  writeEvent(dataCaptureEvent: KeydownCaptureEvent): ReadableStream<Uint8Array> {
    const capture = dataCaptureEvent.t.key;
    return createStream(capture);
  }

  matches(dataCaptureEvent: DomDataCaptureEvent<IpcDomEvent>): boolean {
    return dataCaptureEvent instanceof MouseWheelCaptureEvent;
  }
}
