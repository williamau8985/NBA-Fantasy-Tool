import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { Progress } from './ui/progress'
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Tooltip, 
  Legend,
  RadialBarChart,
  RadialBar,
  Label
} from 'recharts'
import { useNBAStore } from '../store/nbaStore'

export function PlayerDetails() {
  const { selectedPlayer, getPlayerRank, filteredPlayers } = useNBAStore()

  if (!selectedPlayer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No player selected</p>
          <p className="text-sm text-muted-foreground">Select a player from the list to view details</p>
        </div>
      </div>
    )
  }

  const rank = getPlayerRank(selectedPlayer.PLAYER_NAME)
  const zColumns = Object.keys(selectedPlayer).filter(col => col.startsWith('z_'))

  const getZScoreInfo = (score: number) => {
    if (score > 1.5) return { level: 'Elite', className: 'z-score-elite', color: 'bg-green-500' }
    if (score > 0.5) return { level: 'Above Avg', className: 'z-score-above-avg', color: 'bg-green-400' }
    if (score > -0.5) return { level: 'Average', className: 'z-score-average', color: 'bg-gray-400' }
    if (score > -1.5) return { level: 'Below Avg', className: 'z-score-below-avg', color: 'bg-orange-400' }
    return { level: 'Poor', className: 'z-score-poor', color: 'bg-red-400' }
  }

  const getPercentile = (column: string, score: number) => {
    if (!filteredPlayers.length) return 0
    const values = filteredPlayers.map(p => (p as any)[column] || 0).filter(v => !isNaN(v))
    if (values.length === 0) return 0
    const rank = values.filter(v => v <= score).length
    return Math.round((rank / values.length) * 100)
  }

  const getAvailabilityInfo = (rate: number) => {
    if (rate >= 0.8) return { level: 'High', className: 'availability-high' }
    if (rate >= 0.6) return { level: 'Medium', className: 'availability-medium' }
    return { level: 'Low', className: 'availability-low' }
  }

  const availabilityInfo = getAvailabilityInfo(selectedPlayer.availability_rate)

  // Get color based on availability percentage (red to green gradient)
  const getAvailabilityColor = (rate: number) => {
    // Convert 0-1 to 0-100 for calculation
    const percentage = rate * 100
    // Create hue from 0 (red) to 120 (green)
    const hue = (percentage / 100) * 120
    return `hsl(${hue}, 70%, 50%)`
  }

  // Prepare radial chart data for availability
  const availabilityData = [{
    name: 'Availability',
    value: selectedPlayer.availability_rate * 100,
    fill: getAvailabilityColor(selectedPlayer.availability_rate)
  }]

  // Calculate league averages for radar chart
  const getLeagueAverages = () => {
    if (!filteredPlayers.length) return {}
    
    const averages: any = {}
    zColumns.forEach(column => {
      const values = filteredPlayers.map(p => (p as any)[column] || 0).filter(v => !isNaN(v))
      averages[column] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    })
    return averages
  }

  const leagueAverages = getLeagueAverages()

  // Prepare radar chart data
  const radarData = zColumns.map(column => {
    let categoryName = column.replace('z_', '').toUpperCase()
    // Convert percentage categories to use % symbol
    if (categoryName === 'FT_PCT') categoryName = 'FT%'
    if (categoryName === 'FG_PCT') categoryName = 'FG%'
    
    const playerScore = selectedPlayer[column as keyof typeof selectedPlayer] as number
    const leagueAvg = leagueAverages[column] || 0
    
    return {
      category: categoryName,
      player: Math.max(-3, Math.min(3, playerScore)), // Clamp to -3 to 3 for better visualization
      league: Math.max(-3, Math.min(3, leagueAvg)),
      playerRaw: playerScore,
      leagueRaw: leagueAvg
    }
  })

  // Custom tooltip for radar chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-blue-400">
            Player: {data.playerRaw.toFixed(2)}
          </p>
          <p className="text-sm text-orange-400">
            League Avg: {data.leagueRaw.toFixed(2)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        {/* Player Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">👤 {selectedPlayer.PLAYER_NAME}</CardTitle>
                <CardDescription>NBA Draft Prospect Analysis</CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                Rank #{rank}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Score</p>
                <p className="text-2xl font-bold">{selectedPlayer.total_score.toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Position</p>
                <div>
                  {selectedPlayer.position ? (
                    <Badge variant={
                      ['PG', 'SG'].includes(selectedPlayer.position) ? 'default' : 'secondary'
                    } className="text-lg px-3 py-1">
                      {selectedPlayer.position}
                    </Badge>
                  ) : (
                    <span className="text-lg text-muted-foreground">Not assigned</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Games Played</p>
                <p className="text-2xl font-bold">{selectedPlayer.GP}</p>
              </div>
              <div className="space-y-2 flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground">Availability Rate</p>
                <div className="flex flex-col items-center gap-2">
                  <div className="h-28 w-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        data={availabilityData}
                        startAngle={90}
                        endAngle={90 + (360 * (selectedPlayer.availability_rate))}
                        innerRadius={35}
                        outerRadius={50}
                      >
                        <RadialBar 
                          dataKey="value" 
                          background={{ 
                            fill: 'hsl(var(--muted))',
                            stroke: 'hsl(var(--border))',
                            strokeWidth: 1
                          }}
                          cornerRadius={6}
                          fill={availabilityData[0].fill}
                          stroke={availabilityData[0].fill}
                          strokeWidth={2}
                        />
                        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                          <Label
                            content={({ viewBox }) => {
                              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                return (
                                  <text
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                  >
                                    <tspan
                                      x={viewBox.cx}
                                      y={(viewBox.cy || 0) - 4}
                                      className="fill-foreground text-lg font-bold"
                                    >
                                      {(selectedPlayer.availability_rate * 100).toFixed(1)}%
                                    </tspan>
                                  </text>
                                )
                              }
                            }}
                          />
                        </PolarRadiusAxis>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <Badge className={availabilityInfo.className}>
                    {availabilityInfo.level}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Z-Score Radar Charts */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Radar Chart</CardTitle>
            <CardDescription>
              Z-score comparison: Player performance vs League average
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                  <PolarGrid 
                    stroke="hsl(var(--border))" 
                    strokeOpacity={0.6}
                  />
                  <PolarAngleAxis 
                    dataKey="category" 
                    tick={{ 
                      fontSize: 12, 
                      fill: 'hsl(var(--foreground))' 
                    }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[-3, 3]} 
                    tick={{ 
                      fontSize: 10, 
                      fill: 'hsl(var(--muted-foreground))' 
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ 
                      color: 'hsl(var(--foreground))',
                      fontSize: '14px'
                    }}
                  />
                  <Radar
                    name="League Average"
                    dataKey="league"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name={selectedPlayer.PLAYER_NAME}
                    dataKey="player"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Z-Score Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Z-Score Analysis</CardTitle>
            <CardDescription>
              Statistical performance relative to other players
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {zColumns.map(column => {
                let category = column.replace('z_', '').toUpperCase()
                // Convert percentage categories to use % symbol
                if (category === 'FT_PCT') category = 'FT%'
                if (category === 'FG_PCT') category = 'FG%'
                
                const score = selectedPlayer[column as keyof typeof selectedPlayer] as number
                const percentile = getPercentile(column, score)
                const scoreInfo = getZScoreInfo(score)
                const leagueAvg = leagueAverages[column] || 0

                return (
                  <div key={column} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono ${scoreInfo.className}`}>
                          {score.toFixed(2)}
                        </span>
                        <Badge variant="outline" className={scoreInfo.className}>
                          {scoreInfo.level}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>League Avg: {leagueAvg.toFixed(2)}</span>
                      <span>•</span>
                      <span>{percentile}th percentile</span>
                    </div>
                    <Progress 
                      value={Math.max(0, Math.min(100, ((score + 3) / 6) * 100))} 
                      className="w-full"
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
            <CardDescription>
              How this player's total score is calculated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {zColumns.map(column => {
                let category = column.replace('z_', '').toUpperCase()
                // Convert percentage categories to use % symbol
                if (category === 'FT_PCT') category = 'FT%'
                if (category === 'FG_PCT') category = 'FG%'
                
                const score = selectedPlayer[column as keyof typeof selectedPlayer] as number
                const contribution = (score / selectedPlayer.total_score) * 100

                return (
                  <div key={column} className="flex items-center justify-between">
                    <span className="text-sm">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{score.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">
                        ({contribution.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )
              })}
              <Separator />
              <div className="flex items-center justify-between font-semibold">
                <span>Total Score</span>
                <span className="font-mono">{selectedPlayer.total_score.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}