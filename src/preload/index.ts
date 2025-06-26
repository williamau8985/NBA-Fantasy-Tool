import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: () => ipcRenderer.invoke('dialog:saveFile'),
  db: {
    importCsv: (filePath: string) => ipcRenderer.invoke('db:importCsv', filePath),
    getAllPlayers: () => ipcRenderer.invoke('db:getAllPlayers'),
    getPlayersWithFilters: (filters: any) => ipcRenderer.invoke('db:getPlayersWithFilters', filters),
    getPlayerByName: (name: string) => ipcRenderer.invoke('db:getPlayerByName', name),
    getStatistics: () => ipcRenderer.invoke('db:getStatistics'),
    updatePlayer: (id: number, updates: any) => ipcRenderer.invoke('db:updatePlayer', id, updates),
    deletePlayer: (id: number) => ipcRenderer.invoke('db:deletePlayer', id),
    getZColumns: () => ipcRenderer.invoke('db:getZColumns')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}