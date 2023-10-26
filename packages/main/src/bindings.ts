import {Container} from 'inversify';
import {
  CaptureEventSourceInitializer,
  DesktopCaptureEventSource,
  EventListenerEventSourceInitializer,
  IpcRenderEventSourceInitializer,
  IpcRenderThreadInitializer,
  KeyboardEventListenerEventSource,
  MouseEventListenerEventSource,
  WheelEventListenerEventSource,
  WindowEventListenerEventSource,
} from './monitor-event-source/desktopCapture';
import {
  MediaStreamDataCaptureScanner,
} from './monitor-event-consumer/mediaStreamCapture';
import {DataCaptureProcessor, DataCaptureScanner} from './monitor-event-consumer/mediaStreamDataCaptureScanner';
import {
  EventListenerCaptureScanner,
  EventListenerCaptureSubscriber, EventListenerEventSerializer, EventListenerKeyboardCaptureSerializer,
  EventListenerMouseCaptureSerializer, EventListenerMouseWheelCaptureSerializer,
} from './/monitor-event-consumer/eventListenerEventCaptureSubscriber';
import {EventListenerProperties} from './utils/properties';
import {
  CaptureDisplaySource,
  CaptureKeyboardSource, CaptureMouseSource,
  CaptureMouseWheelInputEvent, CaptureSourceConsumer, MatchingMonitorCaptureProcess, MonitorCaptureSource,
} from './monitor-event-consumer/monitorCapture';
import {IpcRenderCommand, IpcRenderProperties} from './ipc-render-command/renderCommands';
import {DataCaptureEvent, DomDataCaptureEvent} from '/@/monitor-event-consumer/captureEvents';
import {Subscriber} from '/@/publisher';
import {IpcDomEvent} from '/@/monitor-event-source/domEvents';


export const container = new Container({defaultScope: "Singleton"});

container.bind<IpcRenderThreadInitializer>("IpcRenderThreadInitializer").to(DesktopCaptureEventSource)
container.bind<IpcRenderEventSourceInitializer>("IpcRenderEventSourceInitializer").to(IpcRenderEventSourceInitializer);

container.bind<WindowEventListenerEventSource<Event>>("WindowEventListenerEventSource").to(WheelEventListenerEventSource);
container.bind<WindowEventListenerEventSource<Event>>("WindowEventListenerEventSource").to(MouseEventListenerEventSource);
container.bind<WindowEventListenerEventSource<Event>>("WindowEventListenerEventSource").to(KeyboardEventListenerEventSource);
container.bind<EventListenerEventSourceInitializer>("EventListenerEventSourceInitializer").to(EventListenerEventSourceInitializer);

container.bind<EventListenerProperties>("EventListenerProperties").to(EventListenerProperties);

container.bind<EventListenerEventSerializer<DomDataCaptureEvent<IpcDomEvent>, IpcDomEvent>>("EventListenerEventSerializer").to(EventListenerMouseWheelCaptureSerializer);
container.bind<EventListenerEventSerializer<DomDataCaptureEvent<IpcDomEvent>, IpcDomEvent>>("EventListenerEventSerializer").to(EventListenerKeyboardCaptureSerializer);
container.bind<EventListenerEventSerializer<DomDataCaptureEvent<IpcDomEvent>, IpcDomEvent>>("EventListenerEventSerializer").to(EventListenerMouseCaptureSerializer);
container.bind<EventListenerCaptureSubscriber>("EventListenerCaptureSubscriber").to(EventListenerCaptureSubscriber);

container.bind<DataCaptureScanner<DomDataCaptureEvent<IpcDomEvent>, Subscriber<DomDataCaptureEvent<IpcDomEvent>>>>("DataCaptureScanner")
  .to(EventListenerCaptureScanner);
container.bind<DataCaptureScanner<DataCaptureEvent, Subscriber<DataCaptureEvent>>>("DataCaptureScanner")
  .to(MediaStreamDataCaptureScanner);
container.bind<DataCaptureProcessor>("DataCaptureProcessor").to(DataCaptureProcessor);

container.bind<MatchingMonitorCaptureProcess<MonitorCaptureSource<any>, any>>("MatchingMonitorCaptureProcess").to(CaptureDisplaySource)
container.bind<MatchingMonitorCaptureProcess<MonitorCaptureSource<any>, any>>("MatchingMonitorCaptureProcess").to(CaptureKeyboardSource)
container.bind<MatchingMonitorCaptureProcess<MonitorCaptureSource<any>, any>>("MatchingMonitorCaptureProcess").to(CaptureMouseWheelInputEvent)
container.bind<MatchingMonitorCaptureProcess<MonitorCaptureSource<any>, any>>("MatchingMonitorCaptureProcess").to(CaptureMouseSource);

container.bind<CaptureSourceConsumer>("CaptureSourceConsumer").to(CaptureSourceConsumer);

container.bind<IpcRenderCommand>("IpcRenderCommand").to(IpcRenderCommand);
container.bind<IpcRenderProperties>("IpcRenderProperties").to(IpcRenderProperties);
