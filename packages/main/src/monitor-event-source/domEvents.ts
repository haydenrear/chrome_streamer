export interface IpcDomEvent {
  type: string
}

export class KeyboardIpcEvent implements IpcDomEvent{
  type: string;
  key: string;
  constructor(type: string, key: string) {
    this.type = type;
    this.key = key
  }

}
export class MouseIpcEvent implements IpcDomEvent{
  type: string;
  key: string;
  constructor(type: string, key: string) {
    this.type = type;
    this.key = key
  }
}
export class MouseWheelIpcEvent implements IpcDomEvent{
  type: string;
  key: string;
  constructor(type: string, key: string) {
    this.type = type;
    this.key = key
  }

}
