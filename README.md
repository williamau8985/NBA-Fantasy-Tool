# 🏀 NBA Fantasy Draft Tool

A modern Electron application built with React, TypeScript, and shadcn/ui for analyzing NBA draft prospects and fantasy rankings.

## ✨ Features

- **Data Import**: Load CSV files with player statistics and Z-scores
- **Advanced Filtering**: Filter by games played, availability rate, total score, and player name
- **Punting Strategy**: Exclude specific statistical categories from rankings
- **Interactive Visualizations**: 
  - Score distribution histograms
  - Scatter plots (Games vs Score with availability color coding)
  - Category heatmaps for top players
- **Player Analysis**: Detailed breakdown of individual player statistics and percentiles
- **Export Functionality**: Save filtered data to CSV
- **Responsive Dark Theme**: Modern UI with shadcn/ui components

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd nba-fantasy-tool
npm install
```

2. **Install shadcn/ui and additional dependencies:**
```bash
# Install required dependencies
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install recharts papaparse @types/papaparse zustand

# Install development dependencies
npm install -D tailwindcss autoprefixer @tailwindcss/typography

# Initialize shadcn/ui (choose your preferences when prompted)
npx shadcn@latest init

# Add required shadcn components
npx shadcn@latest add button input table tabs card checkbox dialog select separator scroll-area badge
```

3. **Run in development mode:**
```bash
npm run dev
```

4. **Build for production:**
```bash
# For your current platform
npm run build

# Platform-specific builds
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux
```

## 📊 CSV Data Format

Your CSV file should include the following columns:

### Required Columns:
- `PLAYER_NAME`: Player's full name
- `GP`: Games played
- `availability_rate`: Decimal between 0-1 (e.g., 0.85 for 85%)

### Z-Score Columns:
Include columns starting with `z_` for each statistical category:
- `z_pts`: Points Z-score
- `z_reb`: Rebounds Z-score  
- `z_ast`: Assists Z-score
- `z_stl`: Steals Z-score
- `z_blk`: Blocks Z-score
- `z_fg_pct`: Field Goal % Z-score
- `z_ft_pct`: Free Throw % Z-score
- `z_3pm`: Three-pointers made Z-score
- (Add any other categories you want to analyze)

### Example CSV Structure:
```csv
PLAYER_NAME,GP,availability_rate,z_pts,z_reb,z_ast,z_stl,z_blk,z_fg_pct,z_ft_pct,z_3pm
Victor Wembanyama,71,0.87,2.1,1.8,0.5,1.2,3.2,0.8,-0.5,0.3
Scoot Henderson,62,0.76,1.2,0.3,2.1,1.1,0.2,0.1,0.8,0.9
```

## 🎯 How to Use

### 1. Loading Data
- Click "Load CSV File" in the File Operations section
- Select your CSV file with player statistics
- The app will automatically calculate total scores and rankings

### 2. Filtering Players
- **View Options**: Show all players, top 20, or top 50
- **Games Filter**: Set minimum games played
- **Availability Filter**: Set minimum availability percentage
- **Score Filter**: Set minimum total score threshold
- **Search**: Type player names to find specific players

### 3. Punting Categories
- Check categories you want to exclude from total score calculations
- Rankings will automatically update to reflect your punting strategy
- Useful for fantasy basketball draft strategies

### 4. Analyzing Players
- Click any player in the list to view detailed analysis
- See Z-scores, percentiles, and category breakdowns
- Visual progress bars show relative performance

### 5. Visualizations
- **Score Distribution**: See how scores are distributed across players
- **Games vs Score**: Scatter plot with availability color coding
- **Category Heatmap**: Visual comparison of top players across all categories

### 6. Exporting Data
- Click "Export Filtered Data" to save current filtered results
- Exports as CSV with all original columns plus calculated total_score

## 🏗️ Project Structure

```
src/
├── main/                    # Electron main process
│   └── index.ts            # Main process entry point
├── preload/                # Electron preload scripts  
│   ├── index.ts           # Preload script
│   └── index.d.ts         # Preload type definitions
└── renderer/              # React frontend
    └── src/
        ├── components/     # React components
        │   ├── ui/        # shadcn/ui components
        │   ├── ControlPanel.tsx
        │   ├── PlayerList.tsx
        │   ├── PlayerDetails.tsx
        │   └── Visualizations.tsx
        ├── store/         # Zustand state management
        │   └── nbaStore.ts
        ├── lib/           # Utility functions
        │   └── utils.ts
        ├── types/         # TypeScript type definitions
        │   └── index.ts
        ├── App.tsx        # Main App component
        ├── main.tsx       # React entry point
        └── globals.css    # Global styles + shadcn setup
```

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript
- **Desktop**: Electron
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Visualization**: Recharts
- **CSV Parsing**: PapaParse
- **Build Tool**: Vite + electron-vite

## 🎨 Features Deep Dive

### Advanced Filtering System
The filtering system works in multiple stages:
1. **Punting Calculation**: Recalculates total scores excluding punted categories
2. **Statistical Filters**: Applies min games, availability, and score thresholds  
3. **Text Search**: Filters by player name
4. **View Limits**: Applies top N restrictions

### Z-Score Analysis
- Z-scores represent standard deviations from the mean
- Color-coded performance levels:
  - 🟢 Elite (>1.5): Top tier performance
  - 🟡 Above Average (0.5-1.5): Good performance  
  - ⚪ Average (-0.5 to 0.5): League average
  - 🟠 Below Average (-1.5 to -0.5): Below average
  - 🔴 Poor (<-1.5): Bottom tier performance

### Punting Strategy
Fantasy basketball strategy where you intentionally ignore certain categories to maximize others:
- Select categories to punt (exclude from rankings)
- Rankings automatically recalculate
- Find players who excel in your chosen categories

## 🔧 Development

### Adding New Features
1. **New Components**: Add to `src/renderer/src/components/`
2. **State Changes**: Modify `src/renderer/src/store/nbaStore.ts`
3. **Types**: Update `src/renderer/src/types/index.ts`
4. **Styling**: Use Tailwind classes and shadcn components

### Building and Distribution
- Development: `npm run dev`
- Production build: `npm run build`
- Platform-specific: `npm run build:win|mac|linux`

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable  
5. Submit a pull request

## 🐛 Troubleshooting

### Common Issues:
1. **CSV won't load**: Check that all required columns are present
2. **Blank visualizations**: Ensure you have data loaded and filtered
3. **Performance issues**: Try filtering to fewer players for large datasets
4. **Build errors**: Make sure all dependencies are installed correctly

### Getting Help:
- Check the console for error messages
- Verify your CSV format matches the expected structure
- Ensure all required dependencies are installed

---

Built with ❤️ for the fantasy basketball community