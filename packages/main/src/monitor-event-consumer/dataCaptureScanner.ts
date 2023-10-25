import * as path from 'path';
import {open} from 'node:fs/promises';
import * as stream from 'node:stream';
import {RequestDataEvent, DataCaptureEvent, CaptureSourceClosedEvent} from './captureEvents';
import {Publisher, Subscriber} from "../publisher";


export class DataCaptureScanner
  extends Publisher<DataCaptureEvent, DataCapturerSubscriber>
  implements Subscriber<DataCaptureEvent> {


    constructor() {
        super()
    }

    start() {
        setInterval(this.doScan.bind(this),  3000)
    }

    private doScan() {
        this.nextValue(new RequestDataEvent());
    }

    subscribe(subscriber: DataCapturerSubscriber) {
        if (!this.subscribers.find(s => s.id === subscriber.id)) {
            console.log("Subscribing data event subscriber", subscriber.id);
            subscriber.recorder.onstop = async () => {
                let closeEvent = new CaptureSourceClosedEvent(subscriber.id);
                this.nextValue(closeEvent);
                this.doNext(closeEvent);
            }
            super.subscribe(subscriber);
        } else {
            console.log(`Skipped subscriber ${subscriber.id}. Already existed.`)
        }
    }

    doNext(value: DataCaptureEvent): void {
        if (value instanceof CaptureSourceClosedEvent) {
            console.log("Removing subscriber", value.id, "from publisher.")
            this.subscribers = this.subscribers
                .filter((v, _) => v.id != value.id )
        }
    }
}

export function createPath(directory: string, id: string) {
    return path.join(directory, `${id}.webm`)
}

export class DataCapturerSubscriber implements Subscriber<DataCaptureEvent> {

    outFile: stream.Writable | undefined
    path: string
    recorder: MediaRecorder
    id: string

    constructor(path: string, recorder: MediaRecorder, id: string) {
        this.path = path
        this.recorder = recorder
        this.id = id;
        this.recorder.ondataavailable = this.addData.bind(this)
    }

    async initialize() {
        if (!this.outFile) {
            const openedFile = await open(createPath(this.path, this.id), 'a')
            this.outFile = openedFile.createWriteStream();
        }
    }

    async doNext(captureEvent: DataCaptureEvent) {
        if (captureEvent instanceof RequestDataEvent) {
            this.recorder.requestData();
        } else if (captureEvent instanceof CaptureSourceClosedEvent) {
            console.log(`Closing ${this.path} for ${this.id}.`)
            this.outFile?.end();
        }
    }

    async addData(event: BlobEvent): Promise<void> {
        await this.initialize();
        console.assert(this.outFile != undefined);
        const read = await event.data.stream().getReader().read();
        try {
            this.outFile?.write(read?.value);
        } catch (e) {
            console.log("Failed to write event to", path, "Attempting to reinitialize the file handle and write one more time.")
            await this.initialize();
            this.outFile?.write(read?.value);
        }
    }

}

export class DataCaptureProcessor {

    dataCaptureScanner: DataCaptureScanner

    constructor() {
        this.dataCaptureScanner = new DataCaptureScanner();
        this.start()
    }

    public subscribe(path: string, id: string, recorder: MediaRecorder) {
        this.dataCaptureScanner.subscribe(new DataCapturerSubscriber(path, recorder, id));
    }

    public start() {
        this.dataCaptureScanner.start();
    }

}

