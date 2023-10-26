import {KeyboardInputEvent, MouseInputEvent, MouseWheelInputEvent} from 'electron';
import {IpcDomEvent, KeyboardIpcEvent, MouseIpcEvent, MouseWheelIpcEvent} from '/@/monitor-event-source/domEvents';

export class DataCaptureEvent {
}

export class CaptureSourceClosedEvent extends DataCaptureEvent {
    id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }
}

export class CaptureSourceStartEvent extends DataCaptureEvent {
    id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }
}

export class RequestDataEvent extends DataCaptureEvent {
}

export class DomDataCaptureEvent<T extends IpcDomEvent> extends DataCaptureEvent {
    t: T
    constructor(t: T) {
        super();
        this.t = t;
    }
}

export class MouseCaptureEvent extends DomDataCaptureEvent<MouseIpcEvent> {
}

export class KeydownCaptureEvent extends DomDataCaptureEvent<KeyboardIpcEvent> {
}

export class MouseWheelCaptureEvent extends DomDataCaptureEvent<MouseWheelIpcEvent> {
}
