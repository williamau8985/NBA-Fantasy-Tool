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

export interface StatisticsData {
  totalPlayers: number
  meanScore: number
  medianScore: number
  scoreRange: [number, number]
  meanGames: number
  availabilityStats: {
    mean: number
    highAvailability: number
    mediumAvailability: number
    lowAvailability: number
  }
}