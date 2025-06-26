import { create } from 'zustand'
import Papa from 'papaparse'

export interface Player {
  PLAYER_NAME: string
  GP: number
  availability_rate: number
  total_score: number
  [key: `z_${string}`]: number
}

export interface Filters {
  punts: string[]
  minGames: string
  minAvail: string
  minScore: string
  searchTerm: string
  view: 'all' | 'top20' | 'top50'
}

interface NBAState {
  // Data
  originalData: Player[]
  filteredPlayers: Player[]
  selectedPlayer: Player | null
  csvFile: string | null
  
  // UI State
  isLoading: boolean
  error: string | null
  
  // Filters
  filters: Filters
  availableCategories: string[]
  
  // Actions
  loadCSV: (file: File) => Promise<void>
  applyFilters: (newFilters: Partial<Filters>) => void
  selectPlayer: (player: Player) => void
  getPlayerRank: (playerName: string) => number
  getStatistics: () => string
  exportFilteredData: () => void
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
  originalData: [],
  filteredPlayers: [],
  selectedPlayer: null,
  csvFile: null,
  isLoading: false,
  error: null,
  filters: initialFilters,
  availableCategories: [],

  // Load CSV file
  loadCSV: async (file: File) => {
    set({ isLoading: true, error: null })
    
    try {
      const text = await file.text()
      
      Papa.parse<Player>(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            set({ error: `CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`, isLoading: false })
            return
          }
          
          const data = results.data.filter(row => row.PLAYER_NAME) // Filter out empty rows
          const zColumns = Object.keys(data[0] || {}).filter(col => col.startsWith('z_'))
          
          // Calculate initial total scores
          const dataWithScores = data.map(player => ({
            ...player,
            total_score: zColumns.reduce((sum, col) => sum + (player[col] || 0), 0)
          }))
          
          // Sort by total score
          dataWithScores.sort((a, b) => b.total_score - a.total_score)
          
          set({
            originalData: dataWithScores,
            filteredPlayers: dataWithScores,
            availableCategories: zColumns,
            csvFile: file.name,
            isLoading: false,
            filters: initialFilters
          })
        },
        error: (error) => {
          set({ error: `Failed to parse CSV: ${error.message}`, isLoading: false })
        }
      })
    } catch (error) {
      set({ error: `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`, isLoading: false })
    }
  },

  // Apply filters
  applyFilters: (newFilters: Partial<Filters>) => {
    const { originalData, filters } = get()
    const updatedFilters = { ...filters, ...newFilters }
    
    if (originalData.length === 0) return
    
    // Step 1: Recalculate scores with punts
    const zColumns = Object.keys(originalData[0]).filter(col => col.startsWith('z_'))
    const nonPuntedCols = zColumns.filter(col => !updatedFilters.punts.includes(col))
    
    let processedData = originalData.map(player => ({
      ...player,
      total_score: nonPuntedCols.reduce((sum, col) => sum + (player[col] || 0), 0)
    }))
    
    // Sort by new total score
    processedData.sort((a, b) => b.total_score - a.total_score)
    
    // Step 2: Apply filters
    let filteredData = processedData
    
    if (updatedFilters.minGames) {
      const minGames = parseInt(updatedFilters.minGames)
      if (!isNaN(minGames)) {
        filteredData = filteredData.filter(p => p.GP >= minGames)
      }
    }
    
    if (updatedFilters.minAvail) {
      const minAvail = parseFloat(updatedFilters.minAvail) / 100
      if (!isNaN(minAvail)) {
        filteredData = filteredData.filter(p => p.availability_rate >= minAvail)
      }
    }
    
    if (updatedFilters.minScore) {
      const minScore = parseFloat(updatedFilters.minScore)
      if (!isNaN(minScore)) {
        filteredData = filteredData.filter(p => p.total_score >= minScore)
      }
    }
    
    if (updatedFilters.searchTerm) {
      const searchTerm = updatedFilters.searchTerm.toLowerCase().trim()
      filteredData = filteredData.filter(p => 
        p.PLAYER_NAME.toLowerCase().includes(searchTerm)
      )
    }
    
    // Step 3: Apply view limit
    if (updatedFilters.view === 'top20') {
      filteredData = filteredData.slice(0, 20)
    } else if (updatedFilters.view === 'top50') {
      filteredData = filteredData.slice(0, 50)
    }
    
    set({
      filters: updatedFilters,
      filteredPlayers: filteredData
    })
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

  // Get statistics
  getStatistics: () => {
    const { filteredPlayers, csvFile } = get()
    
    if (filteredPlayers.length === 0) return "No data available."
    
    const stats: string[] = []
    stats.push("📊 NBA DRAFT RANKING STATISTICS")
    stats.push("========================================")
    stats.push(`Displaying statistics for ${filteredPlayers.length} players.`)
    stats.push(`Data Source: ${csvFile || 'Unknown'}\n`)
    
    // Total Score Statistics
    const scores = filteredPlayers.map(p => p.total_score)
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const sortedScores = [...scores].sort((a, b) => a - b)
    const medianScore = sortedScores[Math.floor(sortedScores.length / 2)]
    const minScore = Math.min(...scores)
    const maxScore = Math.max(...scores)
    
    stats.push("🏆 TOTAL SCORE STATISTICS")
    stats.push("----------------------------------------")
    stats.push(`Mean Score: ${meanScore.toFixed(2)}`)
    stats.push(`Median Score: ${medianScore.toFixed(2)}`)
    stats.push(`Range: ${minScore.toFixed(2)} to ${maxScore.toFixed(2)}\n`)
    
    // Games Played Statistics
    const games = filteredPlayers.map(p => p.GP)
    const meanGames = games.reduce((a, b) => a + b, 0) / games.length
    const players70Plus = filteredPlayers.filter(p => p.GP >= 70).length
    const players50Plus = filteredPlayers.filter(p => p.GP >= 50).length
    const playersUnder30 = filteredPlayers.filter(p => p.GP < 30).length
    
    stats.push("🏀 GAMES PLAYED STATISTICS")
    stats.push("----------------------------------------")
    stats.push(`Mean Games: ${meanGames.toFixed(1)}`)
    stats.push(`Players with 70+ games: ${players70Plus}`)
    stats.push(`Players with 50+ games: ${players50Plus}`)
    stats.push(`Players with <30 games: ${playersUnder30}\n`)
    
    // Availability Statistics
    const availability = filteredPlayers.map(p => p.availability_rate)
    const meanAvail = availability.reduce((a, b) => a + b, 0) / availability.length
    const players90Plus = filteredPlayers.filter(p => p.availability_rate >= 0.9).length
    const players80Plus = filteredPlayers.filter(p => p.availability_rate >= 0.8).length
    const playersUnder60 = filteredPlayers.filter(p => p.availability_rate < 0.6).length
    
    stats.push("📈 AVAILABILITY STATISTICS")
    stats.push("----------------------------------------")
    stats.push(`Mean Availability: ${(meanAvail * 100).toFixed(1)}%`)
    stats.push(`Players with 90%+ availability: ${players90Plus}`)
    stats.push(`Players with 80%+ availability: ${players80Plus}`)
    stats.push(`Players with <60% availability: ${playersUnder60}`)
    
    return stats.join('\n')
  },

  // Export filtered data
  exportFilteredData: () => {
    const { filteredPlayers } = get()
    
    if (filteredPlayers.length === 0) {
      alert('No data to export')
      return
    }
    
    const csv = Papa.unparse(filteredPlayers)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', 'nba_draft_filtered.csv')
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}))