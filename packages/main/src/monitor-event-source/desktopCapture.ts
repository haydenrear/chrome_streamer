import {desktopCapturer, ipcRenderer} from 'electron';
import {Publisher, Subscriber} from '/@/publisher';
import {restoreOrCreateWindow} from '/@/vite/mainWindow';

interface EventSourceInit {
    start: () => void;
}

class DesktopCaptureEventSource implements EventSourceInit {

    private win: Electron.BrowserWindow | undefined;

    start() {
        setInterval(this.doAddRemoveSources.bind(this), 3000);
    }

    async initialize() {
        if (!this.win) {
            this.win = await restoreOrCreateWindow();
        }
    }

    async doNext(source: Electron.DesktopCapturerSource): Promise<void> {
        await this.initialize();
        console.assert(this.win != undefined);
        this.win?.webContents.send('SOURCES', source);
    }

    private doAddRemoveSources() {
        desktopCapturer.getSources({types: ['window', 'screen']})
          .then(source => source?.forEach(
            nextSources => this.doNext(nextSources))
          )
          .catch(err => console.log("Error adding/removing sources", err));
    }

}

abstract class EventListenerEventSource<T extends Event> implements EventSourceInit {

    channel: string
    event: string

    constructor(channel: string, event: string) {
        this.channel = channel
        this.event = event
    }

    start(): void {
        window.addEventListener(
          this.event,
            event => ipcRenderer.send(this.channel, this.createEvent(event as T))
        )
    }

    abstract createEvent(event: T): any;

}

class MouseEventListenerEventSource extends EventListenerEventSource<MouseEvent> {
    createEvent(event: MouseEvent): any {
        return {
            type: 'mouse',
            button: event.button
        }
    }
}

class KeyboardEventListenerEventSource extends EventListenerEventSource<KeyboardEvent> {
    createEvent(event: KeyboardEvent): any {
        return {
            type: 'keyboard',
            key: event.key
        }
    }
}

class WheelEventListenerEventSource extends EventListenerEventSource<WheelEvent> {
    createEvent(event: WheelEvent): any {
        return {
            type: 'wheel',
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaZ: event.deltaZ
        }
    }
}

export class EventSourceInitializer implements EventSourceInit{
    eventSources: Array<EventSourceInit>

    constructor(eventSources: Array<EventSourceInit>) {
        this.eventSources = eventSources
    }

    start(): void {
        this.eventSources.forEach(e => e.start());
    }

}
