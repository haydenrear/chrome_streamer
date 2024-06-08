import {BrowserWindow, desktopCapturer, ipcRenderer} from 'electron';
import {restoreOrCreateWindow} from '../vite/mainWindow';
import {injectable, multiInject, unmanaged} from 'inversify';
import {IpcDomEvent, KeyboardIpcEvent, MouseIpcEvent, MouseWheelIpcEvent} from '../monitor-event-source/domEvents';
import "reflect-metadata"

@injectable()
export abstract class CaptureEventSourceInitializer {
    abstract start(): void;
}

@injectable()
export abstract class BaseDelegatingEventSourceInitializer<T extends CaptureEventSourceInitializer> extends CaptureEventSourceInitializer {
    eventSources: Array<T>

    constructor(
      @multiInject("IpcRenderThreadInitializer") eventSources: T[]
    ) {
        super();
        this.eventSources = eventSources
        console.log("Constructing event source with", this.eventSources.length, "event sources.");
    }

    start(): void {
        console.log("Initializing event source with", this.eventSources.length, "event sources.");
        this.eventSources.forEach(e => {
            console.log("Starting event capture source initializer", e);
            try {
                e.start();
            } catch (ex) {
                console.log("Failed to initialize", e, "with exception", ex);
            }
        });
    }
}

@injectable()
export abstract class IpcRenderThreadInitializer extends CaptureEventSourceInitializer{
}

@injectable()
export class NoOp extends IpcRenderThreadInitializer {
    start(): void {
    }

}

@injectable()
export class DesktopCaptureEventSource extends IpcRenderThreadInitializer {

    private win: Electron.BrowserWindow | undefined;

    start() : void {
        console.log("Initializing desktop capture event source.");
        this.initialize()
          .then(_ => setInterval(this.doAddRemoveSources.bind(this), 3000))
          .catch(err => console.log("Failed to initialize desktop capture source with err", err));
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
        this.initialize().then(_ => {
            desktopCapturer.getSources({types: ['window', 'screen']})
              .then(source => source?.forEach(
                nextSources => this.doNext(nextSources))
              )
              .catch(err => console.log("Error adding/removing sources", err));
        })
    }

}

@injectable()
export abstract class WindowEventListenerEventSource<T extends Event> extends CaptureEventSourceInitializer {

    channel: string
    event: string


    constructor(@unmanaged() channel: string, @unmanaged() event: string) {
        super();
        this.channel = channel
        this.event = event
    }

    start(){
        console.log("Initializing window event source initializer for channel", this.channel, "and event", this.event)
        window.addEventListener(
          this.event,
          event => ipcRenderer.send(this.channel, this.createEvent(event as T)),
        )
    }

    abstract createEvent(event: T): IpcDomEvent;

}

@injectable()
export class MouseEventListenerEventSource extends WindowEventListenerEventSource<MouseEvent> {

    constructor() {
        super('user-input', 'mousedown');
    }

    createEvent(event: MouseEvent): IpcDomEvent {
        console.log("Received mouse event.")
        return new MouseIpcEvent(event.type, event.button.toString());
        //   {
        //     type: 'mouse',
        //     button: event.button
        // }
    }
}

@injectable()
export class KeyboardEventListenerEventSource extends WindowEventListenerEventSource<KeyboardEvent> {

    constructor() {
        super('user-input', 'keydown');
    }

    createEvent(event: KeyboardEvent): IpcDomEvent {
        console.log("Received keyboard event. Creating keyboard ipc event.")
        return new KeyboardIpcEvent(
            'keyboard',
            event.key
        )
    }
}

@injectable()
export class WheelEventListenerEventSource extends WindowEventListenerEventSource<WheelEvent> {

    constructor() {
        super('user-input', 'wheel');
    }

    createEvent(event: WheelEvent): IpcDomEvent {
        return new MouseWheelIpcEvent(event.type, event.button.toString());
        // return {
        //     type: 'wheel',
        //     deltaX: event.deltaX,
        //     deltaY: event.deltaY,
        //     deltaZ: event.deltaZ
        // }
    }
}

@injectable()
export class IpcRenderEventSourceInitializer extends BaseDelegatingEventSourceInitializer<IpcRenderThreadInitializer> {

    constructor(
      @multiInject("IpcRenderThreadInitializer") eventSources: IpcRenderThreadInitializer[]
    ) {
        super(eventSources);
        console.log("Constructing event source with", this.eventSources.length, "event sources.");
    }

}

@injectable()
export class EventListenerEventSourceInitializer extends BaseDelegatingEventSourceInitializer<WindowEventListenerEventSource<Event>> {

    constructor(
      @multiInject("WindowEventListenerEventSource") eventSources: WindowEventListenerEventSource<Event>[]
    ) {
        super(eventSources);
        console.log("Constructing event source with", this.eventSources.length, "event sources.");
    }

}
