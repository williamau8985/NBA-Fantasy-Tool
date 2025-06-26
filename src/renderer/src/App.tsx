import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ControlPanel } from './components/ControlPanel'
import { PlayerList } from './components/PlayerList'
import { PlayerDetails } from './components/PlayerDetails'
import { Visualizations } from './components/Visualizations'
import { useNBAStore } from './store/nbaStore'
import './globals.css'

function App() {
  const { selectedPlayer, filteredPlayers } = useNBAStore()
  const [activeTab, setActiveTab] = useState('players')

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Panel - Controls */}
      <div className="w-1/3 border-r border-border p-4 overflow-y-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🏀 NBA Draft Ranking Tool
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyze and rank NBA draft prospects
          </p>
        </div>
        <ControlPanel />
      </div>

      {/* Right Panel - Data Display */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
            <TabsTrigger value="players">Player List ({filteredPlayers.length})</TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedPlayer}>
              Player Details
            </TabsTrigger>
            <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
          </TabsList>

          <div className="flex-1 p-4 pt-2 overflow-hidden">
            <TabsContent value="players" className="h-full">
              <PlayerList onPlayerSelect={() => setActiveTab('details')} />
            </TabsContent>

            <TabsContent value="details" className="h-full">
              <PlayerDetails />
            </TabsContent>

            <TabsContent value="visualizations" className="h-full">
              <Visualizations />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default App