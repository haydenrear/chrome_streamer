
import {container} from '../../main/src/bindings';

export {versions} from 'node:process';
import 'reflect-metadata';
import {IpcRenderCommand} from '../../main/src/ipc-render-command/renderCommands';


const ipcRenderCommands = container.get<IpcRenderCommand>("IpcRenderCommand");
ipcRenderCommands.doStartRendering();
