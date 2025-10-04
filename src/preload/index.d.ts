import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFileDialog: () => Promise<string | null>
      saveFileDialog: () => Promise<string | null>
      db: {
        importCsv: (filePath: string) => Promise<{ success: boolean; count: number }>
        getAllPlayers: () => Promise<any[]>
        getPlayersWithFilters: (filters: any) => Promise<any[]>
        getPlayerByName: (name: string) => Promise<any | null>
        getStatistics: () => Promise<any>
        updatePlayer: (id: number, updates: any) => Promise<{ success: boolean }>
        deletePlayer: (id: number) => Promise<{ success: boolean }>
        getZColumns: () => Promise<string[]>
        getTeams: () => Promise<any[]>
        createTeam: (team: any) => Promise<any>
        updateTeam: (id: number, updates: any) => Promise<{ success: boolean }>
        deleteTeam: (id: number) => Promise<{ success: boolean }>
        assignPlayerToTeam: (teamId: number, playerId: number) => Promise<{ success: boolean }>
        removePlayerFromTeam: (playerId: number) => Promise<{ success: boolean }>
        updatePlayerPositions: (id: number, positions: string[]) => Promise<{ success: boolean }>
        bulkUpdatePositions: (updates: { id: number, positions: string[] }[]) => Promise<{ success: boolean; count: number }>
        getPositions: () => Promise<string[]>
      }
    }
  }
}