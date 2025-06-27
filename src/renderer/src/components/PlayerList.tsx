import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useNBAStore } from '../store/nbaStore'
import type { Player } from '../store/nbaStore'

interface PlayerListProps {
  onPlayerSelect?: () => void
}

export function PlayerList({ onPlayerSelect }: PlayerListProps) {
  const { filteredPlayers, selectPlayer, selectedPlayer, filters, applyFilters } = useNBAStore()

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

  const handleSearchChange = (value: string) => {
    applyFilters({ searchTerm: value })
  }

  if (filteredPlayers.length === 0 && !filters.searchTerm) {
    return (
      <div className="h-full flex flex-col">
        {/* Search Bar */}
        <div className="mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Player Rankings</h2>
              <p className="text-sm text-muted-foreground">Search and filter NBA draft prospects</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search player name..."
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">No players found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or load a CSV file</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Player Rankings</h2>
            <p className="text-sm text-muted-foreground">
              {filters.searchTerm ? (
                <>Showing {filteredPlayers.length} results for "{filters.searchTerm}"</>
              ) : (
                <>Showing {filteredPlayers.length} players</>
              )}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search player name..."
            value={filters.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      {filteredPlayers.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">No players found</p>
            <p className="text-sm text-muted-foreground">
              {filters.searchTerm ? (
                <>No players match "{filters.searchTerm}". Try a different search term.</>
              ) : (
                <>Try adjusting your filters or load a CSV file</>
              )}
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Player Name</TableHead>
                <TableHead>Position</TableHead>
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
                  <TableCell>
                    {player.position ? (
                      <Badge variant={
                        ['PG', 'SG'].includes(player.position) ? 'default' : 'secondary'
                      }>
                        {player.position}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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
      )}
    </div>
  )
}