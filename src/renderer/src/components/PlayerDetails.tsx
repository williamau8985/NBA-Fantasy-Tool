import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { Progress } from './ui/progress'
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
    // Use filtered players for percentile calculation
    // In a real implementation, you might want to get all players from database
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
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Score</p>
                <p className="text-2xl font-bold">{selectedPlayer.total_score.toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Games Played</p>
                <p className="text-2xl font-bold">{selectedPlayer.GP}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Availability Rate</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{(selectedPlayer.availability_rate * 100).toFixed(1)}%</p>
                  <Badge className={availabilityInfo.className}>
                    {availabilityInfo.level}
                  </Badge>
                </div>
                <Progress 
                  value={selectedPlayer.availability_rate * 100} 
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Z-Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Category Z-Scores</CardTitle>
            <CardDescription>
              Statistical performance relative to other players (higher is better)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {zColumns.map(column => {
                const category = column.replace('z_', '').toUpperCase()
                const score = selectedPlayer[column as keyof typeof selectedPlayer] as number
                const percentile = getPercentile(column, score)
                const scoreInfo = getZScoreInfo(score)

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
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.max(0, Math.min(100, ((score + 3) / 6) * 100))} 
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        {percentile}th %ile
                      </span>
                    </div>
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
                const category = column.replace('z_', '').toUpperCase()
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