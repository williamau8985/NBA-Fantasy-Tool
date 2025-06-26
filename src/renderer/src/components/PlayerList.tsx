import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNBAStore } from '../store/nbaStore'
import type { Player } from '../store/nbaStore'

interface PlayerListProps {
  onPlayerSelect?: () => void
}

export function PlayerList({ onPlayerSelect }: PlayerListProps) {
  const { filteredPlayers, selectPlayer, selectedPlayer } = useNBAStore()

  const getAvailabilityBadge = (rate: number) => {
    if (rate >= 0.8) {
      return <Badge className="availability-high">High ({(rate * 100).toFixed(0)}%)</Badge>
    } else if (rate >= 0.6) {
      return <Badge className="availability-medium">Medium ({(rate * 100).toFixed(0)}%)</Badge>
    } else {
      return <Badge className="availability-low">Low ({(rate * 100).toFixed(0)}%)</Badge>
    }
  }

  const handlePlayerClick = (player: Player) => {
    selectPlayer(player)
    onPlayerSelect?.()
  }

  if (filteredPlayers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No players found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or load a CSV file</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Player Rankings</h2>
        <p className="text-sm text-muted-foreground">
          Showing {filteredPlayers.length} players
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Player Name</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Games</TableHead>
              <TableHead>Availability</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.map((player, index) => (
              <TableRow
                key={player.PLAYER_NAME}
                className={`cursor-pointer hover:bg-muted/50 ${
                  selectedPlayer?.PLAYER_NAME === player.PLAYER_NAME ? 'bg-muted' : ''
                }`}
                onClick={() => handlePlayerClick(player)}
              >
                <TableCell className="font-medium">
                  <Badge variant="outline">#{index + 1}</Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {player.PLAYER_NAME}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {player.total_score.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {player.GP}
                </TableCell>
                <TableCell>
                  {getAvailabilityBadge(player.availability_rate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}