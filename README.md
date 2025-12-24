# HOSTX Coin - Incremental Web Game

A feature-rich incremental (idle) game built with vanilla JavaScript, HTML, and CSS. Earn HOSTX coins by clicking, buying servers, generating power, and unlocking achievements!

## Features

### 🪙 HOSTX Coin Tab (Clicker Game)
- Click the golden HOSTX coin to earn coins
- Purchase click upgrades:
  - **Better Click**: Increase earnings per click
  - **Click Bonus**: 10% bonus to each click
  - **Double Click**: Earn server mining rewards per click
- Real-time earnings display

### 🖥️ Servers Tab (Idle Mining)
- Buy and manage 4 server tiers:
  - Basic Server: $50, 0.5 coins/sec
  - Standard Server: $500, 5 coins/sec
  - Advanced Server: $5K, 50 coins/sec
  - Quantum Server: $100K, 500 coins/sec
- Exponential cost scaling with each purchase
- Watch your passive income grow!

### ⚡ Power Generation Tab
- Place power generators on a 4x4 grid (16 slots)
- 4 generator types:
  - ☀️ Solar Panel: 10 power for 500 coins
  - 💨 Wind Turbine: 15 power for 750 coins
  - 💧 Hydro Plant: 25 power for 1500 coins
  - ☢️ Nuclear Plant: 50 power for 2000 coins
- Each server consumes 2 power
- Insufficient power reduces production by 50%
- Click generators to remove and get 50% refund

### 🏆 Achievements Tab
- 10 unlockable achievements:
  - First Click
  - Centillionaire (100 coins)
  - Millionaire (1,000 coins)
  - Billionaire (1,000,000 coins)
  - Server Master (Buy 1 server)
  - Server Farm (Own 10 servers)
  - Power User (Place 1 generator)
  - Power Overload (Fill all 16 slots)
  - Upgrade Addict (Buy 5 upgrades)
  - Achievement Collector (Unlock 10 achievements)
- Achievement bonuses increase prestige point gains

### ✨ Prestige Tab (Endgame Content)
- Reset progress to gain permanent bonuses
- Prestige points are earned from square root of coins
- Prestige upgrades:
  - +1% Click Power per Prestige Point
  - +2% Server Output per Prestige Point
  - +1 Power per Generator
  - Earn 1% of mined coins as bonus
- Permanent multipliers stack across resets

## Game Mechanics

### Progression
1. **Early Game**: Click the coin and buy basic upgrades
2. **Mid Game**: Purchase servers for passive income
3. **Late Game**: Optimize power generation and server balance
4. **Endgame**: Prestige to unlock permanent bonuses and chase achievements

### Economy
- Costs scale exponentially with each purchase (1.15x - 1.25x multiplier)
- Prestige gives permanent % bonuses to click power and server output
- Achievement bonuses increase prestige point gain by up to 13%
- Power constraints create strategic placement decisions

### Save System
- Game auto-saves every 5 seconds to browser localStorage
- All progress persists across browser sessions
- Load your save automatically on game start

## How to Play

1. Open `index.html` in a modern web browser
2. Click the golden coin to start earning HOSTX coins
3. Buy click upgrades to increase per-click earnings
4. Purchase servers to earn coins passively
5. Balance power generation with server needs
6. Unlock achievements for various milestones
7. When ready, prestige to gain permanent bonuses

## Tips for Optimal Progression

- **Early**: Focus on click upgrades until you can afford basic servers
- **Mid**: Balance server purchases with power generation upgrades
- **Late**: Aim for full power grid (16 generators) before prestige
- **Endgame**: Grind coin count before prestige for maximum points
- **Strategy**: First prestige reset is the hardest; subsequent ones are faster

## Technical Details

### Technologies
- **HTML5**: Semantic structure and SVG graphics
- **CSS3**: Gradient backgrounds, animations, and responsive design
- **JavaScript (Vanilla)**: Game engine, state management, and DOM manipulation

### Architecture
- `game.js`: Core game logic and state management
- `ui.js`: User interface updates and event handling
- `style.css`: Styling and animations
- `index.html`: Page structure

### Browser Compatibility
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (optimized with responsive design)

## Game Balance

All costs and production values have been carefully tuned for:
- ✅ Smooth progression without long grinding sessions
- ✅ Multiple viable upgrade paths
- ✅ Meaningful prestige incentive
- ✅ Satisfying exponential growth curve
- ✅ Engaging endgame content

## Customization

You can modify these constants in `game.js` for different difficulty:
- `CLICK_UPGRADES`: Change costs, multipliers, and effects
- `SERVERS`: Adjust base costs and production values
- `GENERATORS`: Modify power output and costs
- `CONFIG.TICK_RATE`: Change game update frequency (default: 100ms)
- `CONFIG.SAVE_INTERVAL`: Change save frequency (default: 5000ms)

## License

This is a free, open-source game. Feel free to modify and share!

---

**Enjoy earning HOSTX coins! 🪙✨**
