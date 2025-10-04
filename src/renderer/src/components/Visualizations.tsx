import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ScatterChart, 
  Scatter,
  Cell
} from 'recharts'
import { useNBAStore, type Player } from '../store/nbaStore'
import { BarChart3, Grid3X3, Target, TrendingUp } from 'lucide-react'

type VisualizationType = 'distribution' | 'bubble' | 'heatmap' | 'value' | null

export function Visualizations() {
  const { filteredPlayers } = useNBAStore()
  const [activeViz, setActiveViz] = useState<VisualizationType>(null)
  const [allPlayersForNormalization, setAllPlayersForNormalization] = useState<Player[]>([])

  // Load all players for consistent normalization when component mounts
  useEffect(() => {
    const loadAllPlayers = async () => {
      try {
        const allPlayers = await window.api.db.getAllPlayers()
        setAllPlayersForNormalization(allPlayers)
      } catch (error) {
        console.error('Failed to load all players for normalization:', error)
      }
    }
    loadAllPlayers()
  }, [])

  if (filteredPlayers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No data to visualize</p>
          <p className="text-sm text-muted-foreground">Load a CSV file and apply filters to see visualizations</p>
        </div>
      </div>
    )
  }

  const getScoreDistributionData = () => {
    const scores = filteredPlayers.map(p => p.total_score)
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const binCount = 10
    const binSize = (max - min) / binCount

    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * binSize).toFixed(1)} - ${(min + (i + 1) * binSize).toFixed(1)}`,
      count: 0,
      midpoint: min + (i + 0.5) * binSize
    }))

    scores.forEach(score => {
      const binIndex = Math.min(Math.floor((score - min) / binSize), binCount - 1)
      bins[binIndex].count++
    })

    return bins
  }

  const getValueScoreData = () => {
    // Use all players for normalization to ensure consistent value scores
    if (allPlayersForNormalization.length === 0) {
      return [] // Return empty if we haven't loaded the full dataset yet
    }
    
    // Calculate min/max from ALL players in database for consistent normalization
    const allScores = allPlayersForNormalization.map(p => p.total_score)
    const maxScore = Math.max(...allScores)
    const minScore = Math.min(...allScores)
    
    return filteredPlayers.map(player => {
      // Calculate combined value score (weighted combination of score and availability)
      const scoreWeight = 0.7 // 70% weight on performance
      const availabilityWeight = 0.3 // 30% weight on availability
      
      // Normalize total score to 0-100 scale using the FULL database range
      const normalizedScore = ((player.total_score - minScore) / (maxScore - minScore)) * 100
      
      // Availability is already 0-1, convert to 0-100
      const availabilityScore = player.availability_rate * 100
      
      // Calculate combined value score
      const valueScore = (normalizedScore * scoreWeight) + (availabilityScore * availabilityWeight)
      
      return {
        name: player.PLAYER_NAME,
        totalScore: player.total_score,
        availability: player.availability_rate * 100,
        valueScore: valueScore,
        gamesPlayed: player.GP,
        rank: 0 // Will be set after sorting
      }
    }).sort((a, b) => b.valueScore - a.valueScore)
     .map((player, index) => ({ ...player, rank: index + 1 }))
  }

  const getBubbleData = () => {
    return filteredPlayers.map(player => ({
      name: player.PLAYER_NAME,
      availability: player.availability_rate * 100, // Convert to percentage for X-axis
      totalScore: player.total_score,
      gamesPlayed: player.GP, // This will be bubble size
      availabilityRate: player.availability_rate // Keep original for color
    }))
  }

  const getTopPlayersData = () => {
    const topPlayers = filteredPlayers.slice(0, 15)
    const zColumns = Object.keys(filteredPlayers[0] || {}).filter(col => col.startsWith('z_'))
    
    return topPlayers.map(player => {
      const playerData: any = { name: player.PLAYER_NAME.substring(0, 15) }
      zColumns.forEach(col => {
        let category = col.replace('z_', '').toUpperCase()
        // Convert percentage categories to use % symbol
        if (category === 'FT_PCT') category = 'FT%'
        if (category === 'FG_PCT') category = 'FG%'
        playerData[category] = player[col]
      })
      return playerData
    })
  }

  const getAvailabilityColor = (availability: number) => {
    // Create smooth hue gradient from red (0°) to green (120°)
    const hue = availability * 120
    return `hsl(${hue}, 70%, 50%)`
  }

  const renderDistributionChart = () => {
    const data = getScoreDistributionData()
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="range" 
            angle={-45}
            textAnchor="end"
            height={100}
            fontSize={12}
          />
          <YAxis />
          <Tooltip 
            formatter={(value) => [value, 'Players']}
            labelFormatter={(label) => `Score Range: ${label}`}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              color: 'hsl(var(--foreground))'
            }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const renderValueChart = () => {
    const data = getValueScoreData() // Show all filtered players, not just top 20
    
    return (
      <ResponsiveContainer width="100%" height={500}>
        <BarChart data={data} margin={{ top: 20, right: 30, bottom: 100, left: 20 }}>
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={100}
            fontSize={8}
            interval={0}
          />
          <YAxis 
            label={{ value: 'Combined Value Score', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold">#{data.rank} {data.name}</p>
                    <p className="text-sm">Value Score: {data.valueScore.toFixed(1)}</p>
                    <p className="text-sm">Performance: {data.totalScore.toFixed(2)}</p>
                    <p className="text-sm">Availability: {data.availability.toFixed(1)}%</p>
                    <p className="text-sm">Games: {data.gamesPlayed}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="valueScore">
            {data.map((_entry, index) => {
              // Create gradient based on position in the filtered results
              const totalPlayers = data.length
              const percentile = (totalPlayers - index) / totalPlayers
              const hue = percentile * 120 // 0 (red) to 120 (green)
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`hsl(${hue}, 70%, 50%)`}
                />
              )
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const renderBubbleChart = () => {
    const data = getBubbleData()
    
    return (
      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey="availability" 
            name="Availability %"
            domain={[0, 100]}
            label={{ value: 'Availability Rate (%)', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            type="number" 
            dataKey="totalScore" 
            name="Total Score"
            label={{ value: 'Total Score', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm">Availability: {data.availability.toFixed(1)}%</p>
                    <p className="text-sm">Score: {data.totalScore.toFixed(2)}</p>
                    <p className="text-sm">Games: {data.gamesPlayed}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Scatter dataKey="totalScore">
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getAvailabilityColor(entry.availabilityRate)}
                r={Math.max(3, Math.min(12, entry.gamesPlayed / 7))} // Scale bubble size based on games played
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  const renderHeatmapView = () => {
    const data = getTopPlayersData()
    const zColumns = Object.keys(filteredPlayers[0] || {}).filter(col => col.startsWith('z_'))
    const categories = zColumns.map(col => {
      let category = col.replace('z_', '').toUpperCase()
      // Convert percentage categories to use % symbol
      if (category === 'FT_PCT') category = 'FT%'
      if (category === 'FG_PCT') category = 'FG%'
      return category
    })

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Top 15 Players - Category Heatmap</h3>
          <p className="text-sm text-muted-foreground">
            Color intensity represents Z-score strength (green = high, red = low)
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr>
                <th className="border border-border p-2 text-left bg-muted">Player</th>
                {categories.map(category => (
                  <th key={category} className="border border-border p-2 text-center bg-muted text-xs">
                    {category}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((player, playerIndex) => (
                <tr key={playerIndex}>
                  <td className="border border-border p-2 font-medium text-sm bg-muted">
                    {player.name}
                  </td>
                  {categories.map(category => {
                    const value = player[category]
                    const normalizedValue = Math.max(-2.5, Math.min(2.5, value))
                    const intensity = (normalizedValue + 2.5) / 5
                    const hue = intensity * 120
                    const bgColor = `hsl(${hue}, 70%, ${25 + intensity * 25}%)`
                    
                    return (
                      <td 
                        key={category}
                        className="border border-border p-2 text-center text-xs font-mono"
                        style={{ backgroundColor: bgColor }}
                      >
                        {value.toFixed(1)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-center">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-500 border"></div>
              <span>Poor (-2.5)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-500 border"></div>
              <span>Average (0)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-500 border"></div>
              <span>Elite (+2.5)</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Data Visualizations</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeViz === 'distribution' ? 'default' : 'outline'}
            onClick={() => setActiveViz('distribution')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Score Distribution
          </Button>
          <Button
            variant={activeViz === 'value' ? 'default' : 'outline'}
            onClick={() => setActiveViz('value')}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Combined Value
          </Button>
          <Button
            variant={activeViz === 'bubble' ? 'default' : 'outline'}
            onClick={() => setActiveViz('bubble')}
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Value Analysis
          </Button>
          <Button
            variant={activeViz === 'heatmap' ? 'default' : 'outline'}
            onClick={() => setActiveViz('heatmap')}
            className="flex items-center gap-2"
          >
            <Grid3X3 className="h-4 w-4" />
            Category Heatmap
          </Button>
        </div>
      </div>

      <div className="flex-1">
        {!activeViz && (
          <Card className="h-full flex items-center justify-center">
            <CardContent>
              <div className="text-center">
                <p className="text-lg text-muted-foreground mb-2">Select a visualization</p>
                <p className="text-sm text-muted-foreground">
                  Choose from the buttons above to display charts and analytics
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeViz === 'distribution' && (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Total Score Distribution</CardTitle>
              <CardDescription>
                Distribution of total scores across {filteredPlayers.length} players
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {renderDistributionChart()}
            </CardContent>
          </Card>
        )}

        {activeViz === 'value' && (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Combined Value Ranking</CardTitle>
              <CardDescription>
                Showing {filteredPlayers.length} players ranked by combined performance + availability score (70% performance, 30% availability). 
                Green bars = highest value, red bars = lowest value.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              {renderValueChart()}
            </CardContent>
          </Card>
        )}

        {activeViz === 'bubble' && (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Value Analysis: Availability vs Performance</CardTitle>
              <CardDescription>
                Bubble size represents games played. Color gradient from red (low availability) to green (high availability). 
                Sweet spot: top-right corner with large bubbles.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              {renderBubbleChart()}
            </CardContent>
          </Card>
        )}

        {activeViz === 'heatmap' && (
          <Card className="h-full">
            <CardContent className="pt-6">
              {renderHeatmapView()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}