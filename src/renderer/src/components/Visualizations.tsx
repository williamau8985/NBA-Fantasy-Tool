import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
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
import { useNBAStore } from '../store/nbaStore'
import { BarChart3, Zap, Grid3X3 } from 'lucide-react'

type VisualizationType = 'distribution' | 'scatter' | 'heatmap' | null

export function Visualizations() {
  const { filteredPlayers } = useNBAStore()
  const [activeViz, setActiveViz] = useState<VisualizationType>(null)

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

  const getScatterData = () => {
    return filteredPlayers.map(player => ({
      name: player.PLAYER_NAME,
      gamesPlayed: player.GP,
      totalScore: player.total_score,
      availability: player.availability_rate,
      availabilityPercent: Math.round(player.availability_rate * 100)
    }))
  }

  const getTopPlayersData = () => {
    const topPlayers = filteredPlayers.slice(0, 15)
    const zColumns = Object.keys(filteredPlayers[0] || {}).filter(col => col.startsWith('z_'))
    
    return topPlayers.map(player => {
      const playerData: any = { name: player.PLAYER_NAME.substring(0, 15) }
      zColumns.forEach(col => {
        const category = col.replace('z_', '').toUpperCase()
        playerData[category] = player[col]
      })
      return playerData
    })
  }

  const getAvailabilityColor = (availability: number) => {
    if (availability >= 0.8) return '#22c55e'
    if (availability >= 0.6) return '#eab308'
    return '#ef4444'
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
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const renderScatterChart = () => {
    const data = getScatterData()
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey="gamesPlayed" 
            name="Games Played"
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <YAxis 
            type="number" 
            dataKey="totalScore" 
            name="Total Score"
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm">Games: {data.gamesPlayed}</p>
                    <p className="text-sm">Score: {data.totalScore.toFixed(2)}</p>
                    <p className="text-sm">Availability: {data.availabilityPercent}%</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Scatter dataKey="totalScore">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getAvailabilityColor(entry.availability)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  const renderHeatmapView = () => {
    const data = getTopPlayersData()
    const zColumns = Object.keys(filteredPlayers[0] || {}).filter(col => col.startsWith('z_'))
    const categories = zColumns.map(col => col.replace('z_', '').toUpperCase())

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
            variant={activeViz === 'scatter' ? 'default' : 'outline'}
            onClick={() => setActiveViz('scatter')}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Games vs Score
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

        {activeViz === 'scatter' && (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Games Played vs Total Score</CardTitle>
              <CardDescription>
                Each point represents a player. Color indicates availability rate.
                <div className="flex gap-2 mt-2">
                  <Badge className="availability-high">High Availability</Badge>
                  <Badge className="availability-medium">Medium Availability</Badge>
                  <Badge className="availability-low">Low Availability</Badge>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {renderScatterChart()}
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