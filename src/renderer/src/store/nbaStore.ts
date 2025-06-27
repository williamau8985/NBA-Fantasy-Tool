import { create } from 'zustand'

export interface Player {
  id?: number
  PLAYER_NAME: string
  GP: number
  availability_rate: number
  FT_PCT?: number
  total_score: number
  z_pts: number
  z_ast: number
  z_reb: number
  z_stl: number
  z_blk: number
  z_fg_pct: number
  z_ft_pct: number
  z_fg3m: number
  z_tov: number
}

export interface Filters {
  punts: string[]
  minGames: string
  minAvail: string
  minScore: string
  searchTerm: string
  view: 'all' | 'top20' | 'top50' | 'top100' | 'top150' | 'top200'
}

interface NBAState {
  // Data
  filteredPlayers: Player[]
  selectedPlayer: Player | null
  
  // UI State
  isLoading: boolean
  error: string | null
  
  // Filters
  filters: Filters
  availableCategories: string[]
  
  // Actions
  applyFilters: (newFilters: Partial<Filters>) => Promise<void>
  selectPlayer: (player: Player) => void
  getPlayerRank: (playerName: string) => number
  getStatistics: () => Promise<string>
  exportFilteredData: () => void
  loadInitialData: () => Promise<void>
  updatePlayer: (id: number, updates: Partial<Player>) => Promise<void>
  deletePlayer: (id: number) => Promise<void>
}

const initialFilters: Filters = {
  punts: [],
  minGames: '',
  minAvail: '',
  minScore: '',
  searchTerm: '',
  view: 'all'
}

export const useNBAStore = create<NBAState>((set, get) => ({
  // Initial state
  filteredPlayers: [],
  selectedPlayer: null,
  isLoading: false,
  error: null,
  filters: initialFilters,
  availableCategories: [],

  // Load initial data from database
  loadInitialData: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Get available z columns
      const zColumns = await window.api.db.getZColumns()
      set({ availableCategories: zColumns })
      
      // Load all players
      const players = await window.api.db.getAllPlayers()
      set({ 
        filteredPlayers: players,
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      })
    }
  },

  // Apply filters using database queries
  applyFilters: async (newFilters: Partial<Filters>) => {
    const { filters } = get()
    const updatedFilters = { ...filters, ...newFilters }
    
    set({ isLoading: true, filters: updatedFilters })
    
    try {
      // Convert filters to database format
      const dbFilters: any = {}
      
      if (updatedFilters.punts.length > 0) {
        dbFilters.punts = updatedFilters.punts
      }
      
      if (updatedFilters.minGames) {
        const minGames = parseInt(updatedFilters.minGames)
        if (!isNaN(minGames)) {
          dbFilters.minGames = minGames
        }
      }
      
      if (updatedFilters.minAvail) {
        const minAvail = parseFloat(updatedFilters.minAvail) / 100
        if (!isNaN(minAvail)) {
          dbFilters.minAvail = minAvail
        }
      }
      
      if (updatedFilters.minScore) {
        const minScore = parseFloat(updatedFilters.minScore)
        if (!isNaN(minScore)) {
          dbFilters.minScore = minScore
        }
      }
      
      if (updatedFilters.searchTerm) {
        dbFilters.searchTerm = updatedFilters.searchTerm.trim()
      }
      
      // Apply view limit
      if (updatedFilters.view === 'top20') {
        dbFilters.limit = 20
      } else if (updatedFilters.view === 'top50') {
        dbFilters.limit = 50
      } else if (updatedFilters.view === 'top100') {
        dbFilters.limit = 100
      } else if (updatedFilters.view === 'top150') {
        dbFilters.limit = 150
      } else if (updatedFilters.view === 'top200') {
        dbFilters.limit = 200
      }
      
      const players = await window.api.db.getPlayersWithFilters(dbFilters)
      
      set({ 
        filteredPlayers: players,
        isLoading: false 
      })
      
    } catch (error) {
      set({ 
        error: `Failed to apply filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      })
    }
  },

  // Select player
  selectPlayer: (player: Player) => {
    set({ selectedPlayer: player })
  },

  // Get player rank
  getPlayerRank: (playerName: string) => {
    const { filteredPlayers } = get()
    const index = filteredPlayers.findIndex(p => p.PLAYER_NAME === playerName)
    return index + 1
  },

  // Get statistics from database
  getStatistics: async () => {
    try {
      const stats = await window.api.db.getStatistics()
      
      const statLines: string[] = []
      statLines.push("📊 NBA DRAFT RANKING STATISTICS")
      statLines.push("========================================")
      statLines.push(`Total Players: ${stats.total_players}`)
      statLines.push(`Data Source: SQLite Database\n`)
      
      // Total Score Statistics
      statLines.push("🏆 TOTAL SCORE STATISTICS")
      statLines.push("----------------------------------------")
      statLines.push(`Mean Score: ${stats.avg_score?.toFixed(2) || 'N/A'}`)
      statLines.push(`Range: ${stats.min_score?.toFixed(2) || 'N/A'} to ${stats.max_score?.toFixed(2) || 'N/A'}\n`)
      
      // Games Played Statistics
      statLines.push("🏀 GAMES PLAYED STATISTICS")
      statLines.push("----------------------------------------")
      statLines.push(`Mean Games: ${stats.avg_games?.toFixed(1) || 'N/A'}`)
      statLines.push(`Players with 70+ games: ${stats.players_70_plus_games || 0}`)
      statLines.push(`Players with 50+ games: ${stats.players_50_plus_games || 0}`)
      statLines.push(`Players with <30 games: ${stats.players_under_30_games || 0}\n`)
      
      // Availability Statistics
      statLines.push("📈 AVAILABILITY STATISTICS")
      statLines.push("----------------------------------------")
      statLines.push(`Mean Availability: ${((stats.avg_availability || 0) * 100).toFixed(1)}%`)
      statLines.push(`Players with 90%+ availability: ${stats.players_90_plus_avail || 0}`)
      statLines.push(`Players with 80%+ availability: ${stats.players_80_plus_avail || 0}`)
      statLines.push(`Players with <60% availability: ${stats.players_under_60_avail || 0}`)
      
      return statLines.join('\n')
    } catch (error) {
      return `Error loading statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },

  // Export filtered data
  exportFilteredData: () => {
    const { filteredPlayers } = get()
    
    if (filteredPlayers.length === 0) {
      alert('No data to export')
      return
    }
    
    // Convert to CSV format
    const headers = Object.keys(filteredPlayers[0]).filter(key => key !== 'id')
    const csvContent = [
      headers.join(','),
      ...filteredPlayers.map(player => 
        headers.map(header => {
          const value = (player as any)[header]
          return typeof value === 'string' ? `"${value}"` : value
        }).join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', 'nba_draft_filtered.csv')
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  // Update player in database
  updatePlayer: async (id: number, updates: Partial<Player>) => {
    set({ isLoading: true })
    
    try {
      await window.api.db.updatePlayer(id, updates)
      
      // Refresh the filtered players list
      await get().applyFilters({})
      
      // Update selected player if it's the one being updated
      const { selectedPlayer } = get()
      if (selectedPlayer && selectedPlayer.id === id) {
        const updatedPlayer = await window.api.db.getPlayerByName(selectedPlayer.PLAYER_NAME)
        if (updatedPlayer) {
          set({ selectedPlayer: updatedPlayer })
        }
      }
      
    } catch (error) {
      set({ 
        error: `Failed to update player: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      })
    }
  },

  // Delete player from database
  deletePlayer: async (id: number) => {
    set({ isLoading: true })
    
    try {
      await window.api.db.deletePlayer(id)
      
      // Clear selected player if it was deleted
      const { selectedPlayer } = get()
      if (selectedPlayer && selectedPlayer.id === id) {
        set({ selectedPlayer: null })
      }
      
      // Refresh the filtered players list
      await get().applyFilters({})
      
    } catch (error) {
      set({ 
        error: `Failed to delete player: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false 
      })
    }
  }
}))