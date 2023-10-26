import {DataCaptureEvent} from './captureEvents';
import {AbstractPublisher, Publisher, Subscriber} from '../publisher';
import {injectable, multiInject} from 'inversify';

export abstract class DataCaptureScanner<D extends DataCaptureEvent, S extends Subscriber<D>>
  extends AbstractPublisher<D, S> {
    abstract start(): void;
    abstract matches(subscriber: Subscriber<DataCaptureEvent>): boolean;
    abstract matchesEvent(event: DataCaptureEvent): boolean;
}

@injectable()
export class DataCaptureProcessor implements Publisher<DataCaptureEvent, Subscriber<DataCaptureEvent>> {

    dataCaptureScanner: DataCaptureScanner<DataCaptureEvent, Subscriber<DataCaptureEvent>>[]

    constructor(
      @multiInject("DataCaptureScanner") dataCaptureScanner: DataCaptureScanner<DataCaptureEvent, Subscriber<DataCaptureEvent>>[],
    ) {
        this.dataCaptureScanner = dataCaptureScanner;
    }

    nextValue(nextValue: DataCaptureEvent): void {
        this.dataCaptureScanner
          .filter(d => d.matchesEvent(nextValue))
          .map(scanner => scanner.nextValue(nextValue));
    }

    subscribe(subscriber: Subscriber<DataCaptureEvent>): void {
        const subscribe = this.dataCaptureScanner
          .find(s => s.matches(subscriber));
        subscribe?.subscribe(subscriber);
        if (!subscribe) {
            console.log("Could not find subscriber from", this.dataCaptureScanner.length, "scanners for", subscriber);
        } else {
            console.log("Did subscription", subscribe, "for", subscriber);
        }
    }

}

