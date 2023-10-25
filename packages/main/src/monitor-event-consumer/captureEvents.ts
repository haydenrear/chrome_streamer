export class DataCaptureEvent {
}

export class CaptureSourceClosedEvent extends DataCaptureEvent {
    id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }
}

export class RequestDataEvent extends DataCaptureEvent {
}
