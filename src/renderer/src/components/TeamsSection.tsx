import { useEffect, useMemo, useState } from 'react'
import { Users, UserPlus, Trophy, Edit, Trash2 } from 'lucide-react'
import { useNBAStore, Team } from '../store/nbaStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'

export function TeamsSection() {
  const teams = useNBAStore(state => state.teams)
  const teamsLoading = useNBAStore(state => state.teamsLoading)
  const allPlayers = useNBAStore(state => state.allPlayers)
  const loadTeams = useNBAStore(state => state.loadTeams)
  const createTeam = useNBAStore(state => state.createTeam)
  const updateTeam = useNBAStore(state => state.updateTeam)
  const deleteTeam = useNBAStore(state => state.deleteTeam)
  const assignPlayerToTeam = useNBAStore(state => state.assignPlayerToTeam)
  const removePlayerFromTeam = useNBAStore(state => state.removePlayerFromTeam)

  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamManager, setNewTeamManager] = useState('')
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<{ name: string; manager: string }>({ name: '', manager: '' })
  const [teamSelections, setTeamSelections] = useState<Record<number, string>>({})
  const [playerSelections, setPlayerSelections] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!teamsLoading && teams.length === 0) {
      loadTeams()
    }
  }, [teams.length, teamsLoading, loadTeams])

  const assignedCount = useMemo(() => allPlayers.filter(player => !!player.team_id).length, [allPlayers])
  const unassignedPlayers = useMemo(
    () =>
      allPlayers
        .filter(player => !player.team_id && player.id)
        .sort((a, b) => a.PLAYER_NAME.localeCompare(b.PLAYER_NAME)),
    [allPlayers]
  )

  const handleCreateTeam = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = newTeamName.trim()
    const manager = newTeamManager.trim()

    if (!name) {
      return
    }

    await createTeam({ name, manager: manager || null })
    setNewTeamName('')
    setNewTeamManager('')
  }

  const startEditing = (team: Team) => {
    setEditingTeamId(team.id)
    setEditValues({ name: team.name, manager: team.manager || '' })
  }

  const cancelEditing = () => {
    setEditingTeamId(null)
    setEditValues({ name: '', manager: '' })
  }

  const handleUpdateTeam = async (team: Team) => {
    const name = editValues.name.trim()
    const manager = editValues.manager.trim()

    const updates: Partial<Team> = {}
    if (name && name !== team.name) {
      updates.name = name
    }
    if (manager !== (team.manager || '')) {
      updates.manager = manager || null
    }

    if (Object.keys(updates).length > 0) {
      await updateTeam(team.id, updates)
    }
    cancelEditing()
  }

  const handleDeleteTeam = async (team: Team) => {
    const confirmed = window.confirm(`Delete team "${team.name}"? Players will become unassigned.`)
    if (confirmed) {
      await deleteTeam(team.id)
    }
  }

  const handleAssignSelection = async (selection: string) => {
    const [teamIdValue, playerIdValue] = selection.split(':')
    const teamId = Number(teamIdValue)
    const playerId = Number(playerIdValue)

    if (!Number.isNaN(teamId) && !Number.isNaN(playerId)) {
      await assignPlayerToTeam(teamId, playerId)
    }
  }

  const handleRemovePlayer = async (playerId: number) => {
    await removePlayerFromTeam(playerId)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4" />
              Teams
            </CardTitle>
            <CardDescription>Total active teams in the league</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{teams.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Trophy className="h-4 w-4" />
              Players Assigned
            </CardTitle>
            <CardDescription>Prospects that are currently on a roster</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{assignedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <UserPlus className="h-4 w-4" />
              Available Players
            </CardTitle>
            <CardDescription>Prospects not yet assigned to a team</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{unassignedPlayers.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Create a Team</CardTitle>
            <CardDescription>Set up a manager and start drafting players to their roster.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Name</label>
                <Input
                  placeholder="e.g. Downtown Shooters"
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Manager</label>
                <Input
                  placeholder="Owner or manager name (optional)"
                  value={newTeamManager}
                  onChange={(event) => setNewTeamManager(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!newTeamName.trim()}>
                Create Team
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unassigned Players</CardTitle>
            <CardDescription>Select a team to draft a player directly from here.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-48">
              <div className="p-4 space-y-2">
                {unassignedPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All players have been assigned to teams.</p>
                ) : (
                  unassignedPlayers.map(player => (
                    <div key={player.id ?? player.PLAYER_NAME} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{player.PLAYER_NAME}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.positions && player.positions.length > 0 ? player.positions.join(' / ') : 'No position'}
                        </p>
                      </div>
                      <Select
                        value={player.id ? playerSelections[player.id] : undefined}
                        onValueChange={async (value) => {
                          if (!player.id) return
                          setPlayerSelections(prev => ({ ...prev, [player.id as number]: value }))
                          await handleAssignSelection(value)
                          setPlayerSelections(prev => {
                            const updated = { ...prev }
                            delete updated[player.id as number]
                            return updated
                          })
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Assign to team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map(team => (
                            <SelectItem
                              key={team.id}
                              value={`${team.id}:${player.id}`}
                              disabled={!player.id}
                            >
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-2">
          <div className="space-y-4">
            {teamsLoading && teams.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Loading teams...
                </CardContent>
              </Card>
            ) : teams.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No teams yet. Create one to start the draft!
                </CardContent>
              </Card>
            ) : (
              teams.map(team => {
                const assignablePlayers = allPlayers
                  .filter(player => (!!player.id && (!player.team_id || player.team_id === team.id)))
                  .sort((a, b) => a.PLAYER_NAME.localeCompare(b.PLAYER_NAME))

                const selectionValue = teamSelections[team.id]

                return (
                  <Card key={team.id}>
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        {editingTeamId === team.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editValues.name}
                              onChange={(event) => setEditValues(prev => ({ ...prev, name: event.target.value }))}
                              placeholder="Team name"
                            />
                            <Input
                              value={editValues.manager}
                              onChange={(event) => setEditValues(prev => ({ ...prev, manager: event.target.value }))}
                              placeholder="Manager"
                            />
                          </div>
                        ) : (
                          <>
                            <CardTitle className="text-xl">{team.name}</CardTitle>
                            <CardDescription>
                              {team.manager ? `Managed by ${team.manager}` : 'Manager not set'}
                            </CardDescription>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingTeamId === team.id ? (
                          <>
                            <Button variant="secondary" size="sm" onClick={() => handleUpdateTeam(team)}>
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEditing}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="icon" onClick={() => startEditing(team)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDeleteTeam(team)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {team.players.length} player{team.players.length === 1 ? '' : 's'} on this roster
                          </p>
                        </div>
                        <Select
                          value={selectionValue}
                          onValueChange={async (value) => {
                            setTeamSelections(prev => ({ ...prev, [team.id]: value }))
                            await handleAssignSelection(value)
                            setTeamSelections(prev => {
                              const updated = { ...prev }
                              delete updated[team.id]
                              return updated
                            })
                          }}
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="Draft player to team" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignablePlayers.map(player => (
                              <SelectItem key={player.id ?? player.PLAYER_NAME} value={`${team.id}:${player.id}`}>
                                {player.PLAYER_NAME}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {team.players.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No players drafted yet.</p>
                      ) : (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead>Positions</TableHead>
                                <TableHead className="text-right">Score</TableHead>
                                <TableHead className="text-right">Games</TableHead>
                                <TableHead className="w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {team.players.map(player => (
                                <TableRow key={player.id ?? player.PLAYER_NAME}>
                                  <TableCell className="font-medium">{player.PLAYER_NAME}</TableCell>
                                  <TableCell>
                                    {player.positions && player.positions.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {player.positions.map(position => (
                                          <Badge key={position} variant={['PG', 'SG'].includes(position) ? 'default' : 'secondary'}>
                                            {position}
                                          </Badge>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No position</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">
                                    {player.total_score.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">{player.GP}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => player.id && handleRemovePlayer(player.id)}
                                      title="Remove from team"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
