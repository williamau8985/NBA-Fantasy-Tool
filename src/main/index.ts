import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { DatabaseService } from './database'
import Papa from 'papaparse'
import fs from 'fs'

let dbService: DatabaseService

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    show: false,
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#0f172a', // Dark background color
    titleBarStyle: process.platform === 'darwin' ? 'default' : 'default',
    vibrancy: process.platform === 'darwin' ? 'appearance-based' : undefined,
    webSecurity: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Database initialization
async function initializeDatabase() {
  dbService = new DatabaseService()
  try {
    await dbService.initialize()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
}

// IPC handlers for file operations
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (!canceled && filePaths.length > 0) {
    return filePaths[0]
  }
  return null
})

ipcMain.handle('dialog:saveFile', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: 'nba_draft_filtered.csv'
  })
  
  if (!canceled && filePath) {
    return filePath
  }
  return null
})

// Database IPC handlers
ipcMain.handle('db:importCsv', async (_, filePath: string) => {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf8')
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`))
            return
          }
          
          try {
            const data = results.data.filter((row: any) => row.PLAYER_NAME)
            const zColumns = ['z_pts', 'z_ast', 'z_reb', 'z_stl', 'z_blk', 'z_fg_pct', 'z_ft_pct', 'z_fg3m', 'z_tov']
            
            // Calculate total scores
            const dataWithScores = data.map((player: any) => ({
              ...player,
              total_score: zColumns.reduce((sum, col) => sum + (player[col] || 0), 0)
            }))
            
            await dbService.importFromCSV(dataWithScores)
            resolve({ success: true, count: dataWithScores.length })
          } catch (error) {
            reject(error)
          }
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`))
        }
      })
    })
  } catch (error) {
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:getAllPlayers', async () => {
  try {
    return await dbService.getAllPlayers()
  } catch (error) {
    throw new Error(`Failed to get players: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:getPlayersWithFilters', async (_, filters) => {
  try {
    return await dbService.getPlayersWithFilters(filters)
  } catch (error) {
    throw new Error(`Failed to get filtered players: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:getPlayerByName', async (_, name: string) => {
  try {
    return await dbService.getPlayerByName(name)
  } catch (error) {
    throw new Error(`Failed to get player: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:getStatistics', async () => {
  try {
    return await dbService.getStatistics()
  } catch (error) {
    throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:updatePlayer', async (_, id: number, updates) => {
  try {
    await dbService.updatePlayer(id, updates)
    return { success: true }
  } catch (error) {
    throw new Error(`Failed to update player: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:deletePlayer', async (_, id: number) => {
  try {
    await dbService.deletePlayer(id)
    return { success: true }
  } catch (error) {
    throw new Error(`Failed to delete player: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('db:getZColumns', () => {
  return dbService.getZColumns()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.nba.fantasy.tool')

  // Initialize database
  await initializeDatabase()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  // Close database connection
  if (dbService) {
    await dbService.close()
  }
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  // Close database connection
  if (dbService) {
    await dbService.close()
  }
})