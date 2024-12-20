import "reflect-metadata"
import type {Mocked, MockedClass, MockedObject} from 'vitest';
import {beforeEach, expect, test, vi} from 'vitest';
import {restoreOrCreateWindow} from '../src/vite/mainWindow';

import {BrowserWindow, desktopCapturer, DesktopCapturerSource} from 'electron';

import {DataCaptureProcessor} from '../src/monitor-event-consumer/mediaStreamDataCaptureScanner';
import * as fs from 'fs';
import * as path from 'path';
import {MonitorCaptureSource} from '../src/monitor-event-consumer/monitorCapture';
import exp = require('constants');
import {
  CaptureEventSourceInitializer, EventListenerEventSourceInitializer,
  IpcRenderEventSourceInitializer,
  IpcRenderThreadInitializer, WindowEventListenerEventSource,
} from '../src/monitor-event-source/desktopCapture';
import {container} from '../src/bindings';
import {
  MediaStreamCaptureSubscriber,
  MediaStreamDataCaptureScanner,
} from '../src/monitor-event-consumer/mediaStreamCapture';
import {createPath} from '../src/utils/ioUtils';
import {
  EventListenerCaptureSubscriber,
  EventListenerEventSerializer,
} from '../src/monitor-event-consumer/eventListenerEventCaptureSubscriber';
import {IpcRenderCommand} from '../../preload/src/versions';
import {pathToFileURL} from 'url';
import {openAsBlob, openSync, readFileSync} from 'fs';
import * as wasi from 'wasi';

/**
 * Mock real electron BrowserWindow API
 */
vi.mock('electron', () => {
  // Use "as unknown as" because vi.fn() does not have static methods
  const bw = vi.fn() as unknown as MockedClass<typeof BrowserWindow>;
  bw.getAllWindows = vi.fn(() => bw.mock.instances);
  bw.prototype.loadURL = vi.fn((_: string, __?: Electron.LoadURLOptions) => Promise.resolve());
  bw.prototype.loadFile = vi.fn((_: string, __?: Electron.LoadFileOptions) => Promise.resolve());
  // Use "any" because the on function is overloaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bw.prototype.on = vi.fn<any>();
  bw.prototype.destroy = vi.fn();
  bw.prototype.isDestroyed = vi.fn();
  bw.prototype.isMinimized = vi.fn();
  bw.prototype.focus = vi.fn();
  bw.prototype.restore = vi.fn();

  const app: Pick<Electron.App, 'getAppPath'> = {
    getAppPath(): string {
      return '';
    },
  };

  const ds = vi.fn() as unknown as Mocked<Electron.DesktopCapturer>;
  const sources = vi.fn() as unknown as Mocked<Electron.DesktopCapturerSource>;
  ds.getSources = vi.fn(opts => new Promise((resolve, reject) => resolve([sources])));

  return {BrowserWindow: bw, desktopCapturer: ds, app};
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('Should create a new window', async () => {
  const {mock} = vi.mocked(BrowserWindow);
  expect(mock.instances).toHaveLength(0);

  await restoreOrCreateWindow();
  expect(mock.instances).toHaveLength(1);
  const instance = mock.instances[0] as MockedObject<BrowserWindow>;
  const loadURLCalls = instance.loadURL.mock.calls.length;
  const loadFileCalls = instance.loadFile.mock.calls.length;
  expect(loadURLCalls + loadFileCalls).toBe(1);
  if (loadURLCalls === 1) {
    expect(instance.loadURL).toHaveBeenCalledWith(expect.stringMatching(/index\.html$/));
  } else {
    expect(instance.loadFile).toHaveBeenCalledWith(expect.stringMatching(/index\.html$/));
  }
});

test('Should restore an existing window', async () => {
  const {mock} = vi.mocked(BrowserWindow);

  // Create a window and minimize it.
  await restoreOrCreateWindow();
  expect(mock.instances).toHaveLength(1);
  const appWindow = vi.mocked(mock.instances[0]);
  appWindow.isMinimized.mockReturnValueOnce(true);

  await restoreOrCreateWindow();
  expect(mock.instances).toHaveLength(1);
  expect(appWindow.restore).toHaveBeenCalledOnce();
});

test('Should create a new window if the previous one was destroyed', async () => {
  const {mock} = vi.mocked(BrowserWindow);

  // Create a window and destroy it.
  await restoreOrCreateWindow();
  expect(mock.instances).toHaveLength(1);
  const appWindow = vi.mocked(mock.instances[0]);
  appWindow.isDestroyed.mockReturnValueOnce(true);

  await restoreOrCreateWindow();
  expect(mock.instances).toHaveLength(2);
});


test('Desktop scanner sender should send sources every 3 seconds.', async () => {

  const {mock} = vi.mocked(BrowserWindow);
  const found = await restoreOrCreateWindow();

  expect(found).to.be.equal(mock.instances[0])

  const desktopScannerSender = new IpcRenderEventSourceInitializer([]);
  await desktopScannerSender.start();

  expect(desktopScannerSender['win']).to.not.be.equal(undefined);

  desktopScannerSender.start();

})

async function createMockMediaRecorder() {

  let mediaRecorderMock = vi.fn() as unknown as Mocked<MediaRecorder>;
  let blob = vi.fn() as unknown as Mocked<Blob>;
  blob.stream = vi.fn(() => {
    return new ReadableStream({
      start(controller) {
        return pump();

        function pump() {
          controller.enqueue(new Buffer('hello'));
        }
      },
    });
  });

  var out = blob.stream();
  var read = await out.getReader().read();
  var value = read?.value;
  var str = value.toString();
  expect(str).to.equal('hello');

  out = blob.stream();
  read = await out.getReader().read();
  value = read?.value;
  expect(value.toString()).to.equal('hello');

  let blobEvent = vi.fn() as unknown as Mocked<BlobEvent>;
  blobEvent['data'] = blob;
  mediaRecorderMock.requestData = vi.fn(() => mediaRecorderMock.ondataavailable(blobEvent));
  mediaRecorderMock.onstop = vi.fn();
  mediaRecorderMock.onstart = vi.fn();
  return mediaRecorderMock;

}

test('Data capture scanner.', async () => {

  const mediaRecorderMock = await createMockMediaRecorder();

  const outDirectory = import.meta.env.VITE_TEST_OUT_DIR;

  const dataCaptureScanner = new MediaStreamDataCaptureScanner();
  console.log(outDirectory)

  dataCaptureScanner.subscribe(new MediaStreamCaptureSubscriber(outDirectory, mediaRecorderMock, 'test_out'))
  dataCaptureScanner.start();

  await new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), 4000);
  });

  let testFile = createPath(outDirectory, 'test_out');
  expect(fs.existsSync(testFile)).to.equal(true);
  fs.unlinkSync(testFile)
  expect(fs.existsSync(testFile)).to.equal(false);

  // const desktopScannerSender = new DesktopScannerSender();
  // await desktopScannerSender.initialize();
  //
  // expect(desktopScannerSender['win']).to.not.be.equal(undefined);
  //
  // desktopScannerSender.start();

})


test('Test vite sources correct splitting.', () => {
  let comparison = (import.meta.env.VITE_MAIN_SOURCES as string).split(',');
  let compareTo = ['keydown', 'mousedown', 'wheel'];
  expect(comparison.length).not.to.equal(0);
  comparison.map((v, i) => expect(v).to.equal(compareTo[i]));
})


test('Test bindings', async () => {
  const ipcInitializer = container.getAll<IpcRenderThreadInitializer>("IpcRenderThreadInitializer");
  expect(ipcInitializer.length).to.equal(1);

  const windowInitializer = container.getAll<WindowEventListenerEventSource>("WindowEventListenerEventSource");
  expect(windowInitializer.length).to.equal(3);

  const ipcSourceInit = container.get<IpcRenderEventSourceInitializer>("IpcRenderEventSourceInitializer");
  expect(ipcSourceInit.eventSources.length).to.be.equal(1);

  const windowSourceInit = container.get<EventListenerEventSourceInitializer>("EventListenerEventSourceInitializer");
  expect(windowSourceInit.eventSources.length).to.be.equal(3);

  const processor = container.get<DataCaptureProcessor>("DataCaptureProcessor");
  expect(processor).not.to.be.equal(undefined);

  const eventListenerCapturer = container.get<EventListenerCaptureSubscriber>("EventListenerCaptureSubscriber");
  expect(eventListenerCapturer.eventListenerSerializers.length).to.be.equal(3);
  expect(eventListenerCapturer.eventListenerProperties.outDirectory).to.not.be.equal(undefined);

  const dataCaptureProcessor = container.get<DataCaptureProcessor>("DataCaptureProcessor");
  expect(dataCaptureProcessor.dataCaptureScanner.length).to.be.equal(2);

  const renderCommand = container.get<IpcRenderCommand>("IpcRenderCommand");
  expect(renderCommand.ipcProperties.length).not.to.be.equal(undefined);
  expect(renderCommand.mainProperties.length).not.to.be.equal(undefined);
  expect(renderCommand.ipcProperties.length).not.to.be.equal(0);
  expect(renderCommand.mainProperties.length).not.to.be.equal(0);

  const eventSerializers = container.getAll<EventListenerEventSerializer>("EventListenerEventSerializer");
  expect(eventSerializers.length).to.equal(3);
  const capture = container.get<EventListenerCaptureSubscriber>("EventListenerCaptureSubscriber");
  expect(capture.eventListenerSerializers.length).to.equal(3);
});


