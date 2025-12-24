/* Core game logic and state management */

const GAME = {
    // Internal guard to prevent duplicate win/lose triggers
    _battleOutcomeHandled: false,
    // Game State
    state: {
        // Game Mode
        darkMode: false, // Dark/Hard mode flag (legacy)
        gameMode: null, // null until player chooses: 'normal', 'dark', or 'crusader'
        
        // Currency
        coins: 0,
        totalCoinsEarned: 0,
        
        // Click upgrades
        clickPower: 1,
        clickUpgrades: {},
        
        // Servers & Rack
        servers: {},
        serverCorruption: {}, // Track corruption level per building (0-100)
        lastCorruptionTick: Date.now(),
        buildings: {
            '0': {
                id: '0',
                name: 'Headquarters',
                streetName: 'Main Street',
                isDefault: true,
                maxRackUnits: 1,
                placedServers: [],
                workers: 0,
                workerCostMultiplier: 1.5
            },
        },
        currentBuildingId: '0',
        nextBuildingId: 1,
        
        // Power
        powerGenerators: [],
        powerGrid: Array(0).fill(null), // Start with 0 slots
        generatorUpgrades: {}, // Track upgrade levels for upgradable generators
        gridSlotUpgrades: 0, // Number of grid slot upgrades purchased
        
        // Battery
        batteryCapacity: 10, // Total storage capacity in Watts
        batteryStored: 0, // Current energy stored
        batteryCapacityLevel: 0, // Upgrade level for battery capacity
        batteryChargeRate: 10, // Max watts per second to charge (10 W/s = 10W/tick at 100ms)
        batteryDischargeRate: 10, // Max watts per second to discharge
        batteryChargeRateLevel: 0, // Upgrade level for charge rate
        batteryDischargeRateLevel: 0, // Upgrade level for discharge rate
        // Network capacity: maximum total power the network can carry (Watts)
        networkCapacity: 100,
        
        // Research & Skills
        skillPoints: 10,
        totalSkillPointsEarned: 10,
        totalSkillPointsSpent: 0,
        unlockedResearch: new Set(),
        
        // Achievements
        unlockedAchievements: new Set(),
        
        // Guild
        guild: null,
        guildAchievements: new Set(),
        
        // Daily Rewards & Streaks
        lastLoginDate: null,
        dailyStreak: 0,
        longestDailyStreak: 0,
        dailyRewardsClaimed: new Set(),
        
        // Achievement Points (meta-currency)
        achievementPoints: 0,
        totalAchievementPointsEarned: 0,
        
        // Prestige Milestones
        prestigeMilestones: new Set(),
        
        // Prestige
        prestigePoints: 0,
        prestigeUpgrades: {},
        totalPrestigeEarned: 0,
        prestigeLevel: 0,
        
        // Ascension (Super-Prestige)
        ascensionLevel: 0,
        ascensionPoints: 0,
        totalAscensionEarned: 0,
        ascensionUpgrades: {},
        
        // Transcendence (Ultra-Prestige)
        transcendenceLevel: 0,
        transcendencePoints: 0,
        transcendenceUpgrades: {},
        
        // Unlockables
        unlockedContent: new Set(),
        milestones: {},

        // File integrity: 100% at start; reduced by Crusader AI defeats
        fileIntegrityPercent: 100,
        
        // Detailed Stats
        stats: {
            totalClicks: 0,
            totalPlayTime: 0,
            sessionStartTime: Date.now(),
            longestSession: 0,
            totalSessions: 0,
            highestCPS: 0,
            totalBuildingsBought: 0,
            totalUpgradesBought: 0,
            totalServersBought: 0,
            totalGeneratorsBought: 0,
            totalResearchCompleted: 0,
            peakCoins: 0,
            peakCoinsPerSecond: 0,
            fastestPrestige: Infinity,
            totalResets: 0
        },
        
        // Casino
        casinoTotalWagered: 0,
        casinoTotalWon: 0,
        casinoGamesPlayed: 0,
        casinoBiggestMultiplier: 0,
        casinoBiggestWin: 0,
        
        // VIP System
        vipXp: 0,
        vipLevel: 1,
        vipDailyClaimTime: null,
        vipFreeSpinsUsed: 0,
        vipFreeSpinsLastReset: null,
        
        // Jackpot System
        jackpotPool: 10000,
        jackpotTickets: 0,
        jackpotHistory: [],
        
        // Daily Challenges
        dailyChallenges: [],
        dailyChallengeDate: null,
        dailyChallengesCompleted: 0,
        dailyStreak: 0,
        dailyProgress: {},
        
        // Leaderboard
        playerName: '',
        personalBestCoins: 0,
        longestDailyStreak: 0,
        
        // Mini-games
        minigameCooldowns: {},
        minigameHistory: [],
        minigameStats: {
            clickFrenzyBest: 0,
            memoryMatchBest: Infinity,
            numberGuessBest: Infinity
        },
        nextWinMultiplier: 1,
        
        // Skill Trees
        skillPoints: 0,
        totalSkillPointsEarned: 0,
        skillTreeLevels: {},
        activeSkillEffects: {},
        
        // Boss Battles
        bossDefeated: 0,
        bossesKilled: [],
        currentBoss: null,
        bossWarningActive: false,
        
        // Dark Matter Corruption
        darkMatterCorruption: 0,
        darkMatterLastActivity: Date.now(),
        darkMatterActive: false,
        
        // Mining System
        mines: {
            darkium: { level: 0, mined: 0, stored: 0 },      // Dm - Dark Matter element
            antimatium: { level: 0, mined: 0, stored: 0 },   // Am - Antimatium (rare)
            lithium: { level: 0, mined: 0, stored: 0 },      // Li - Lithium (battery)
            galliumNitride: { level: 0, mined: 0, stored: 0 }, // GaN - Gallium Nitride
            siliconCarbide: { level: 0, mined: 0, stored: 0 }  // SiC - Silicon Carbide
        },
        // Global toggle to enable/disable all mine processing
        minesEnabled: true,
        // Attacks unlocked through Training (skill-point purchases)
        unlockedAttacks: [],
        turn: 'player', // start with player's turn
        battleLog: [],
        // Per-boss progression counters (defeats per boss for unlocking next tiers)
        fightingProgressCounts: {},
        // Set of bosses unlocked via progression (persists across loads)
        unlockedBosses: new Set(),
        // Count of random AI defeats (used to unlock Crude AI after set number of random spawns defeated)
        randomAIDefeats: 0,
        // Peak coins during current progression cycle (used for boss reward scaling)
        progressionPeakCoins: 0,
        // Recruitment system retired — equipment & inventory now define player combat
        // Inventory, Gear and Materials
        // Materials (acquired from Mines) used for forging
        materials: {
            iron: 0,
            copper: 0,
            gold: 0,
            platinium: 0,
            lerasium: 0,
            atium: 0,
            harmonium: 0,
            steel: 0,
            mythril: 0,
            wood: 0
        },
        // Inventory holds player-forged items
        inventory: [],
        // Active forge jobs (queued forging operations)
        forgeJobs: [],
        // Currently equipped items (slot -> itemId)
        equipped: {
            weapon: null, // swords/axes
            bow: null,
            helmet: null,
            chestplate: null,
            leggings: null,
            boots: null
        },
        // legacy gear structure not used; inventory + equipped are authoritative
        fightingStats: {
            battlesWon: 0,
            battlesLost: 0,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
            bossesDefeated: 0
        },
        
        // Last save time
        lastSaveTime: Date.now()
    },
    
    /**
     * Estimate coin reward for winning a given battle object.
     * Returns integer coin amount (does not modify state).
     */
    estimateBattleWin(battleObj) {
        try {
            // Prefer explicit arg, then engine runtime, then instance currentBattle,
            // then legacy BossBattle.currentBattle if present.
            const legacyBattle = (typeof BossBattle !== 'undefined' && BossBattle.currentBattle) ? BossBattle.currentBattle : (typeof window !== 'undefined' && window.BossBattle && window.BossBattle.currentBattle) ? window.BossBattle.currentBattle : null;
            const battle = battleObj || (this.state && this.state.currentBattle) || this.currentBattle || legacyBattle || null;
            if (!battle) return 0;
            const boss = battle.boss ? battle.boss : battle;
            if (!boss) return 0;

            const effects = this.getSkillEffects ? this.getSkillEffects() : {};
            let rewardMultiplier = 1;
            if (effects.bossRewardBonus) rewardMultiplier += effects.bossRewardBonus;
            if (effects.bossSlayer) rewardMultiplier *= 2;
            if (this.state && this.state.gameMode === 'crusader') rewardMultiplier *= this.CRUSADER_MODE_MULTIPLIERS.bossRewardMultiplier;

            const baseCoinReward = Math.floor((boss.maxHp || 0) * 10);
            const progressionPeak = (this.state && (this.state.progressionPeakCoins || (this.state.stats && this.state.stats.peakCoins))) ? (this.state.progressionPeakCoins || (this.state.stats && this.state.stats.peakCoins)) : (this.state.coins || 0);

            let coinReward = 0;
            if (boss.isRandomSpawn) {
                coinReward = Math.floor((5000 + Math.floor((progressionPeak || 0) * 0.10)) * rewardMultiplier);
            } else if (typeof boss.progressionRewardPct === 'number' && boss.progressionRewardPct > 0) {
                coinReward = Math.floor((progressionPeak || 0) * boss.progressionRewardPct * rewardMultiplier);
                if (coinReward < baseCoinReward) coinReward = Math.floor(baseCoinReward * rewardMultiplier);
            } else {
                coinReward = Math.floor(baseCoinReward * rewardMultiplier);
            }
            return Math.max(0, Math.floor(coinReward));
        } catch (e) {
            console.warn('estimateBattleWin error', e);
            return 0;
        }
    },

    // Progression-chain helper: unlock bosses in order when their prerequisites are met.
    // Chain order: random spawns -> crude_ai -> basic_ai -> advanced_ai -> master_ai -> selfaware_ai -> god_ai
        /* Lines 7572-9477 omitted */


    /**
     * Debug helper: simulate winning a boss by id (sets up a minimal battle and calls winBattle())
     * Useful for repro/testing without playing through rounds. Only used during debugging.
     */
    _debugSimulateWin(bossId, isRandomSpawn = false) {
        try {
            const bosses = (this && this.CONFIG && this.CONFIG.FIGHTING_BOSSES) ? this.CONFIG.FIGHTING_BOSSES : (GAME && GAME.CONFIG && GAME.CONFIG.FIGHTING_BOSSES) ? GAME.CONFIG.FIGHTING_BOSSES : [];
            const bossCfg = bosses.find(b => b.id === bossId);
            if (!bossCfg) { console.warn('_debugSimulateWin: boss not found', bossId); return false; }

            // Create a mock battle using the boss configuration
            const playerStats = (this && typeof this.calculatePlayerCombatStats === 'function') ? this.calculatePlayerCombatStats() : { attack: 100, defense: 50, maxHp: 1000 };
            const battle = {
                boss: { ...bossCfg, currentHp: bossCfg.health, maxHp: bossCfg.health, isRandomSpawn: !!isRandomSpawn },
                player: { ...playerStats, currentHp: playerStats.maxHp },
                battleLog: [],
                attacksUsed: [],
                startTime: Date.now(),
                timeLimit: (bossCfg.timeLimit || 30000)
            };

            // Attach to runtime state so handlers see it
            try { if (!this.state) this.state = {}; this.state.currentBattle = battle; } catch(e) { /* ignore */ }

            // Trigger victory handling using available handlers
            try {
                if (typeof this.winBattle === 'function') {
                    this.winBattle();
                } else if (typeof this.handleVictory === 'function') {
                    this.handleVictory();
                } else if (typeof BossBattle !== 'undefined' && typeof BossBattle.handleVictory === 'function') {
                    BossBattle.handleVictory();
                } else {
                    console.warn('_debugSimulateWin: no victory handler available to process simulated win');
                }
            } catch (e) { console.warn('_debugSimulateWin: victory handler failed', e); }

            return true;
        } catch (e) { console.warn('_debugSimulateWin failed', e); return false; }
    },

    /**
     * Debug: run a progression stress test by simulating `n` wins against a boss
     * and logging whether any unlocks occurred.
     */
    _debugRunProgressionTest(bossId, n = 10) {
        try {
            if (typeof n !== 'number' || n <= 0) n = 10;
            console.log(`_debugRunProgressionTest: simulating ${n} wins vs ${bossId}`);
            for (let i = 0; i < n; i++) {
                const before = (this.state.fightingProgressCounts && this.state.fightingProgressCounts[bossId]) ? this.state.fightingProgressCounts[bossId] : 0;
                this._debugSimulateWin(bossId, false);
                const after = (this.state.fightingProgressCounts && this.state.fightingProgressCounts[bossId]) ? this.state.fightingProgressCounts[bossId] : 0;
                console.log(`_debugRunProgressionTest: iter ${i+1}, count ${before} -> ${after}`);
                // allow a tiny delay to let any UI refresh/save happen
            }
            console.log('_debugRunProgressionTest: finished', { unlockedBosses: Array.isArray(this.state.unlockedBosses) ? this.state.unlockedBosses : (this.state.unlockedBosses ? Array.from(this.state.unlockedBosses) : []) });
            return true;
        } catch (e) { console.warn('_debugRunProgressionTest failed', e); return false; }
    },

    /**
     * Helper: simulate boss decision-making for testing/tuning.
     * Returns frequency map of chosen attack ids.
     */
    simulateBossDecision(bossId, iterations = 500) {
        try {
            const bossConfig = this.CONFIG.FIGHTING_BOSSES.find(b => b.id === bossId);
            if (!bossConfig) return null;
            const attacks = this.CONFIG.FIGHTING_ATTACKS || [];
            const sampleBattle = {
                boss: { ...bossConfig, currentHp: bossConfig.health, maxHp: bossConfig.health },
                player: { currentHp: 1000, maxHp: 1000 }
            };
            const counts = {};
            for (let i = 0; i < iterations; i++) {
                const chosen = this.selectBossAction(sampleBattle);
                const id = chosen && chosen.id ? chosen.id : String(chosen && chosen.actionCategory ? chosen.actionCategory : 'none');
                counts[id] = (counts[id] || 0) + 1;
            }
            // return summary frequencies
            const sorted = Object.keys(counts).map(k => ({ id: k, count: counts[k], pct: +((counts[k] / iterations) * 100).toFixed(1) })).sort((a, b) => b.count - a.count);
            console.log('Simulate Boss', bossId, 'iterations=', iterations, sorted);
            return sorted;
        } catch (e) {
            console.log('simulateBossDecision error', e);
            return null;
        }
    },

    // Dark Mode Multipliers
    DARK_MODE_MULTIPLIERS: {
        costMultiplier: 2.5,      // 2.5x all costs
        powerMultiplier: 2.0,     // 2x power requirements
        earningsMultiplier: 4,    // 4x earnings
        skillPointDivisor: 1.5    // 1.5x slower skill point rate
    },

    // Crusader Mode Multipliers (Hardest)
    CRUSADER_MODE_MULTIPLIERS: {
        costMultiplier: 5.0,        // 5x all costs
        powerMultiplier: 3.0,       // 3x power requirements
        earningsMultiplier: 10,     // 10x earnings
        skillPointDivisor: 3.0,     // 3x slower skill point rate
        corruptionMultiplier: 2.0,  // 2x corruption rate
        bossHealthMultiplier: 2.0,  // 2x boss health
        bossRewardMultiplier: 3.0   // 3x boss rewards
    },

    /**
     * Get current game mode multipliers
     */
    getModeMultipliers() {
        if (this.state.gameMode === 'crusader') return this.CRUSADER_MODE_MULTIPLIERS;
        if (this.state.gameMode === 'dark' || this.state.darkMode) return this.DARK_MODE_MULTIPLIERS;
        return { costMultiplier: 1, powerMultiplier: 1, earningsMultiplier: 1, skillPointDivisor: 1 };
    },

    /**
     * Get cost multiplier based on game mode
     */
    getCostMultiplier() {
        return this.getModeMultipliers().costMultiplier;
    },

    /**
     * Get power multiplier based on game mode
     */
    getPowerMultiplier() {
        return this.getModeMultipliers().powerMultiplier;
    },

    /**
     * Get earnings multiplier based on game mode
     */
    getEarningsMultiplier() {
        return this.getModeMultipliers().earningsMultiplier;
    },

    /**
     * Get skill point divisor based on game mode
     */
    getSkillPointDivisor() {
        return this.getModeMultipliers().skillPointDivisor || 1;
    },

    // Configuration
    CONFIG: {
        DEBUG: false, // Toggle developer debug UI features (turn on for testing)
        SAVE_INTERVAL: 5000, // 5 seconds
        TICK_RATE: 100, // 100ms per game tick
        
        CLICK_UPGRADES: {
            'betterclick': {
                name: 'Better Click',
                description: 'Increase earnings per click by 1',
                baseCost: 100,  // Nerfed from 15 to 100
                costMultiplier: 1.4,  // Nerfed from 1.18 to 1.4
                effect: (level) => ({ clickPower: level }),
                category: 'click'
            },
            'clickbonus': {
                name: 'Click Bonus',
                description: 'Add 10% bonus to each click',
                baseCost: 250,
                costMultiplier: 1.25,
                effect: (level) => ({ clickBonus: level * 0.1 }),
                category: 'click'
            },
            'doubleclick': {
                name: 'Double Click',
                description: 'Gain 5% of server earnings per click',
                baseCost: 1500,
                costMultiplier: 1.30,
                effect: (level) => ({ doubleClick: level * 0.05 }),
                category: 'passive'
            }
        },

        SERVERS: {
            // TIER 1: Budget Servers - Low Power, Entry Level CPUs
            'pentium_g6400': {
                name: 'Pentium G6400',
                cpu: 'Intel Pentium G6400',
                cpuBrand: 'pentium',
                ram: '4GB',
                baseCost: 75,
                costMultiplier: 1.12,
                baseProduction: 0.8,
                baseHashRate: 150,
                icon: '🔵',
                rackUnits: 1,
                tier: 1,
                powerDraw: 8
            },
            'celeron_g5900': {
                name: 'Celeron G5900',
                cpu: 'Intel Celeron G5900',
                cpuBrand: 'celeron',
                ram: '2GB',
                baseCost: 40,
                costMultiplier: 1.10,
                baseProduction: 0.5,
                baseHashRate: 100,
                icon: '🔵',
                rackUnits: 1,
                tier: 1,
                powerDraw: 6
            },
            'ryzen_3_4100': {
                name: 'Ryzen 3 4100',
                cpu: 'AMD Ryzen 3 4100',
                cpuBrand: 'ryzen3',
                ram: '4GB',
                baseCost: 100,
                costMultiplier: 1.12,
                baseProduction: 1.0,
                baseHashRate: 200,
                icon: '🔴',
                rackUnits: 1,
                tier: 1,
                powerDraw: 10
            },

            // TIER 2: Standard Servers - Medium Power, Consumer CPUs
            'i3_12400f': {
                name: 'Intel i3-12400F',
                cpu: 'Intel Core i3-12400F',
                cpuBrand: 'i3',
                ram: '8GB',
                baseCost: 750,
                costMultiplier: 1.15,
                baseProduction: 6,
                baseHashRate: 1200,
                icon: '🔵',
                rackUnits: 2,
                tier: 2,
                powerDraw: 18,
                requiresResearch: 'standard_server_unlock'
            },
            'i5_12400': {
                name: 'Intel i5-12400',
                cpu: 'Intel Core i5-12400',
                cpuBrand: 'i5',
                ram: '16GB',
                baseCost: 1200,
                costMultiplier: 1.15,
                baseProduction: 10,
                baseHashRate: 1800,
                icon: '🔵',
                rackUnits: 2,
                tier: 2,
                powerDraw: 22,
                requiresResearch: 'standard_server_unlock'
            },
            'i7_12700': {
                name: 'Intel i7-12700',
                cpu: 'Intel Core i7-12700',
                cpuBrand: 'i7',
                ram: '32GB',
                baseCost: 2000,
                costMultiplier: 1.15,
                baseProduction: 15,
                baseHashRate: 2800,
                icon: '🔵',
                rackUnits: 2,
                tier: 2,
                powerDraw: 30,
                requiresResearch: 'standard_server_unlock'
            },
            'i9_12900k': {
                name: 'Intel i9-12900K',
                cpu: 'Intel Core i9-12900K',
                cpuBrand: 'i9',
                ram: '64GB',
                baseCost: 3500,
                costMultiplier: 1.15,
                baseProduction: 25,
                baseHashRate: 4200,
                icon: '🔵',
                rackUnits: 2,
                tier: 2,
                powerDraw: 40,
                requiresResearch: 'standard_server_unlock'
            },
            'ryzen_5_5600x': {
                name: 'Ryzen 5 5600X',
                cpu: 'AMD Ryzen 5 5600X',
                cpuBrand: 'ryzen5',
                ram: '16GB',
                baseCost: 1000,
                costMultiplier: 1.15,
                baseProduction: 8,
                baseHashRate: 1700,
                icon: '🔴',
                rackUnits: 2,
                tier: 2,
                powerDraw: 24,
                requiresResearch: 'standard_server_unlock'
            },
            'ryzen_7_5800x': {
                name: 'Ryzen 7 5800X',
                cpu: 'AMD Ryzen 7 5800X',
                cpuBrand: 'ryzen7',
                ram: '32GB',
                baseCost: 1800,
                costMultiplier: 1.15,
                baseProduction: 14,
                baseHashRate: 2600,
                icon: '🔴',
                rackUnits: 2,
                tier: 2,
                powerDraw: 32,
                requiresResearch: 'standard_server_unlock'
            },
            'ryzen_9_5900x': {
                name: 'Ryzen 9 5900X',
                // No extra boss duplicates - selfaware and god AI are defined once above
                powerDraw: 90,
                requiresResearch: 'advanced_server_unlock'
            },
            'epyc_7313p': {
                name: 'EPYC 7313P',
                cpu: 'AMD EPYC 7313P',
                cpuBrand: 'epyc',
                ram: '128GB',
                baseCost: 12000,
                costMultiplier: 1.18,
                baseProduction: 65,
                baseHashRate: 7800,
                icon: '🔴',
                rackUnits: 3,
                tier: 3,
                powerDraw: 70,
                requiresResearch: 'advanced_server_unlock'
            },
            'epyc_7543p': {
                name: 'EPYC 7543P',
                cpu: 'AMD EPYC 7543P',
                cpuBrand: 'epyc',
                ram: '256GB',
                baseCost: 28000,
                costMultiplier: 1.18,
                baseProduction: 120,
                baseHashRate: 11500,
                icon: '🔴',
                rackUnits: 3,
                tier: 3,
                powerDraw: 85,
                requiresResearch: 'advanced_server_unlock'
            },

            // TIER 4: Datacenter Servers - Enterprise Grade
            'xeon_platinum_8490h': {
                name: 'Xeon Platinum 8490H',
                cpu: 'Intel Xeon Platinum 8490H',
                cpuBrand: 'xeon',
                ram: '512GB',
                baseCost: 150000,
                costMultiplier: 1.20,
                baseProduction: 800,
                baseHashRate: 45000,
                icon: '🔵',
                rackUnits: 4,
                tier: 4,
                powerDraw: 150,
                requiresResearch: 'datacenter_unlock'
            },
            'epyc_9534': {
                name: 'EPYC 9534',
                cpu: 'AMD EPYC 9534',
                cpuBrand: 'epyc',
                ram: '512GB',
                baseCost: 120000,
                costMultiplier: 1.20,
                baseProduction: 700,
                baseHashRate: 42000,
                icon: '🔴',
                rackUnits: 4,
                tier: 4,
                powerDraw: 140,
                requiresResearch: 'datacenter_unlock'
            },
            'epyc_9754': {
                name: 'EPYC 9754',
                cpu: 'AMD EPYC 9754',
                cpuBrand: 'epyc',
                ram: '768GB',
                baseCost: 250000,
                costMultiplier: 1.20,
                baseProduction: 1200,
                baseHashRate: 65000,
                icon: '🔴',
                rackUnits: 4,
                tier: 4,
                powerDraw: 200,
                requiresResearch: 'datacenter_unlock'
            },

            // TIER 5: AI Accelerated Servers - High Performance Computing
            'xeon_w9_3595x': {
                name: 'Xeon W9-3595X',
                cpu: 'Intel Xeon W9-3595X',
                cpuBrand: 'xeon',
                ram: '1024GB',
                baseCost: 2000000,
                costMultiplier: 1.22,
                baseProduction: 8000,
                baseHashRate: 250000,
                icon: '🔵',
                rackUnits: 5,
                tier: 5,
                powerDraw: 400,
                requiresResearch: 'ai_datacenter_unlock',
                materialCost: { galliumNitride: 10, lithium: 25 }
            },
            'epyc_9684x': {
                name: 'EPYC 9684X',
                cpu: 'AMD EPYC 9684X',
                cpuBrand: 'epyc',
                ram: '1024GB',
                baseCost: 1800000,
                costMultiplier: 1.22,
                baseProduction: 7500,
                baseHashRate: 240000,
                icon: '🔴',
                rackUnits: 5,
                tier: 5,
                powerDraw: 380,
                requiresResearch: 'ai_datacenter_unlock',
                materialCost: { siliconCarbide: 10, lithium: 25 }
            },

            // TIER 6: Quantum Servers - Cutting Edge
            'quantum_x1000': {
                name: 'Quantum X1000',
                cpu: 'Quantum X1000',
                cpuBrand: 'quantum',
                ram: '2048GB',
                baseCost: 25000000,
                costMultiplier: 1.25,
                baseProduction: 75000,
                baseHashRate: 5000000,
                icon: '⚛️',
                rackUnits: 6,
                tier: 6,
                powerDraw: 800,
                requiresResearch: 'quantum_server_unlock',
                materialCost: { galliumNitride: 50, siliconCarbide: 50, lithium: 100 }
            },

            // TIER 6: Antimatter Servers - Exotic Matter
            'antimatter_x5000': {
                name: 'Antimatter X5000',
                cpu: 'Antimatter X5000',
                cpuBrand: 'antimatter',
                ram: '4096GB',
                baseCost: 250000000,
                costMultiplier: 1.28,
                baseProduction: 500000,
                baseHashRate: 50000000,
                icon: '⚡',
                rackUnits: 6,
                tier: 6,
                powerDraw: 1500,
                requiresResearch: 'antimatter_server_unlock',
                materialCost: { antimatium: 3200, galliumNitride: 3200, siliconCarbide: 3200 }
            },

            // TIER 6: Dark Matter Servers - Ultimate Power
            'darkmatter_x9999': {
                name: 'Dark Matter X9999',
                cpu: 'Dark Matter X9999',
                cpuBrand: 'darkmatter',
                ram: '8192GB',
                baseCost: 2500000000,
                costMultiplier: 1.30,
                baseProduction: 5000000,
                baseHashRate: 500000000,
                icon: '🌌',
                rackUnits: 6,
                tier: 6,
                powerDraw: 3000,
                requiresResearch: 'darkmatter_server_unlock',
                materialCost: { darkium: 6400, antimatium: 6400, galliumNitride: 6400, siliconCarbide: 6400 }
            }
        },

        GENERATORS: {
            'solar': {
                name: 'Solar Panel',
                cost: 300,
                power: 12,
                emoji: '🔲',
                tier: 1,
                requiresResearch: 'solar_unlock'
            },
            'solarfarm': {
                name: 'Solar Farm',
                cost: 25000,
                power: 75,
                emoji: '🔳',
                tier: 2,
                requiresResearch: 'solarfarm_unlock',
                baseUpgradeCost: 10000,
                upgradable: true
            },
            'wind': {
                name: 'Wind Turbine',
                cost: 450,
                power: 15,
                emoji: '💨',
                tier: 1,
                requiresResearch: 'wind_unlock'
            },
            'windfarm': {
                name: 'Wind Farm',
                cost: 30000,
                power: 90,
                emoji: '💨🌪️',
                tier: 2,
                requiresResearch: 'windfarm_unlock',
                baseUpgradeCost: 12000,
                upgradable: true
            },
            'fossil': {
                name: 'Fossil Fuel Plant',
                cost: 1500,
                power: 35,
                emoji: '⛽',
                tier: 1,
                requiresResearch: 'fossil_unlock'
            },
            'coal': {
                name: 'Coal Power Plant',
                cost: 1800,
                power: 40,
                emoji: '🪨',
                tier: 1,
                requiresResearch: 'coal_unlock'
            },
            'hydro': {
                name: 'Hydropower Plant',
                cost: 2500,
                power: 50,
                emoji: '💧',
                tier: 1,
                requiresResearch: 'hydro_unlock'
            },
            'biomass': {
                name: 'Biomass Generator',
                cost: 1600,
                power: 32,
                emoji: '🌱',
                tier: 1,
                requiresResearch: 'biomass_unlock'
            },
            'geothermal': {
                name: 'Geothermal Generator',
                cost: 3000,
                power: 55,
                emoji: '🌋',
                tier: 1,
                requiresResearch: 'geothermal_unlock'
            },
            'biofuel': {
                name: 'Biofuel Generator',
                cost: 2000,
                power: 38,
                emoji: '🧪',
                tier: 1,
                requiresResearch: 'biofuel_unlock'
            },
            'naturalgas': {
                name: 'Natural Gas Plant',
                cost: 2200,
                power: 45,
                emoji: '🔥',
                tier: 1,
                requiresResearch: 'naturalgas_unlock'
            },
            'nuclear': {
                name: 'Nuclear Reactor',
                cost: 15000,
                power: 150,
                emoji: '☢️',
                tier: 2,
                requiresResearch: 'nuclear_unlock'
            },
            'fusion': {
                name: 'Fusion Reactor',
                cost: 100000,
                power: 400,
                emoji: '⚛️',
                tier: 3,
                requiresResearch: 'fusion_unlock'
            },
            'dyson': {
                name: 'Dyson Sphere',
                cost: 1000000,
                power: 2000,
                emoji: '🌐',
                tier: 3,
                requiresResearch: 'dyson_unlock',
                baseUpgradeCost: 250000,
                upgradable: true
            }
        },

        // Mining System Configuration
        MINES: {
            darkium: {
                name: 'Darkium',
                symbol: 'Dm',
                description: 'Exotic dark matter element used in Dark Matter X9999 servers',
                icon: '🌑',
                color: '#1a0a2e',
                baseCost: 50000000,
                costMultiplier: 2.5,
                baseRate: 0.1, // per second at level 1
                rateMultiplier: 1.5,
                requiresResearch: 'darkium_mining',
                powerDraw: 2500
            },
            antimatium: {
                name: 'Antimatium',
                symbol: 'Am',
                description: 'Antimatter particles stabilized for server cores',
                icon: '⚡',
                color: '#ff00ff',
                baseCost: 10000000,
                costMultiplier: 2.3,
                baseRate: 0.15,
                rateMultiplier: 1.45,
                requiresResearch: 'antimatium_mining',
                powerDraw: 2250
            },
            lithium: {
                name: 'Lithium',
                symbol: 'Li',
                description: 'Essential element for advanced battery technology',
                icon: '🔋',
                color: '#00ff88',
                baseCost: 500000,
                costMultiplier: 1.9,
                baseRate: 0.5,
                rateMultiplier: 1.3,
                requiresResearch: 'lithium_mining',
                powerDraw: 400
            },
            galliumNitride: {
                name: 'Gallium Nitride',
                symbol: 'GaN',
                description: 'Wide bandgap semiconductor for high-efficiency servers',
                icon: '💎',
                color: '#00ccff',
                baseCost: 2500000,
                costMultiplier: 2.1,
                baseRate: 0.25,
                rateMultiplier: 1.35,
                requiresResearch: 'gan_mining',
                powerDraw: 600
            },
            siliconCarbide: {
                name: 'Silicon Carbide',
                symbol: 'SiC',
                description: 'Advanced compound semiconductor for power electronics',
                icon: '🔷',
                color: '#6644ff',
                baseCost: 1500000,
                costMultiplier: 2.0,
                baseRate: 0.3,
                rateMultiplier: 1.35,
                requiresResearch: 'sic_mining',
                powerDraw: 500
            }
            ,
            // Basic materials for forging
            iron: {
                name: 'Iron Vein',
                symbol: 'Fe',
                description: 'Common iron ore used for basic weaponry and armor',
                icon: '⛏️',
                color: '#b0b0b0',
                baseCost: 100,
                costMultiplier: 1.15,
                baseRate: 2.5,
                rateMultiplier: 1.12,
                upgradable: false,
                requiresResearch: 'iron_mining',
                powerDraw: 300
            },
            wood: {
                name: 'Timber Grove',
                symbol: 'Wd',
                description: 'Forest groves providing wood used for bows and basic gear',
                icon: '🌲',
                color: '#8dbb6b',
                baseCost: 50,
                costMultiplier: 1.12,
                baseRate: 1.5,
                rateMultiplier: 1.12,
                powerDraw: 100
            },
            steel: {
                name: 'Steel Deposit',
                symbol: 'St',
                description: 'Alloy-rich veins used for higher tier gear',
                icon: '🔩',
                color: '#b36b3b',
                baseCost: 750,
                costMultiplier: 1.18,
                baseRate: 0.75,
                rateMultiplier: 1.2,
                powerDraw: 400
            },
            gold: {
                name: 'Gold Creek',
                symbol: 'Au',
                description: 'Gold deposits — rare and valuable material for advanced forges',
                icon: '🥇',
                color: '#ffd700',
                baseCost: 2000,
                costMultiplier: 1.25,
                baseRate: 0.25,
                rateMultiplier: 1.25,
                upgradable: false,
                requiresResearch: 'gold_mining',
                powerDraw: 500
            },
            copper: {
                name: 'Copper Vein',
                symbol: 'Cu',
                description: 'Common conductive metal used in many recipes',
                icon: '🟤',
                color: '#b87333',
                baseCost: 400,
                costMultiplier: 1.17,
                baseRate: 1.5,
                rateMultiplier: 1.15,
                requiresResearch: 'copper_mining',
                upgradable: false,
                powerDraw: 250
            },
            platinium: {
                name: 'Platinium Deposit',
                symbol: 'Pt',
                description: 'High-value metal used in advanced gear',
                icon: '⚪',
                color: '#d9d9d9',
                baseCost: 6000,
                costMultiplier: 1.28,
                baseRate: 0.2,
                rateMultiplier: 1.22,
                requiresResearch: 'platinium_mining',
                upgradable: false,
                powerDraw: 750
            },
            lerasium: {
                name: 'Lerasium Vein',
                symbol: 'Le',
                description: 'Exotic alloy used for elite axes',
                icon: '🔷',
                color: '#4dd0e1',
                baseCost: 25000,
                costMultiplier: 1.4,
                baseRate: 0.03,
                rateMultiplier: 1.3,
                requiresResearch: 'lerasium_mining',
                upgradable: false,
                powerDraw: 1000
            },
            atium: {
                name: 'Atium Outcrop',
                symbol: 'At',
                description: 'Rare material for master bows',
                icon: '✨',
                color: '#9b59b6',
                baseCost: 20000,
                costMultiplier: 1.38,
                baseRate: 0.04,
                rateMultiplier: 1.28,
                requiresResearch: 'atium_mining',
                upgradable: false,
                powerDraw: 900
            },
            harmonium: {
                name: 'Harmonium Field',
                symbol: 'Hn',
                description: 'Ultra-rare element for highest-tier armor',
                icon: '🔶',
                color: '#ff7f50',
                baseCost: 50000,
                costMultiplier: 1.5,
                baseRate: 0.02,
                rateMultiplier: 1.35,
                requiresResearch: 'harmonium_mining',
                upgradable: false,
                powerDraw: 1250
            },
            mythril: {
                name: 'Mythril Wells',
                symbol: 'My',
                description: 'Legendary material — needed for Godlike gear',
                icon: '🔮',
                color: '#66ccff',
                baseCost: 15000,
                costMultiplier: 1.6,
                baseRate: 0.05,
                rateMultiplier: 1.35,
                requiresResearch: 'mythril_mining',
                powerDraw: 1100
            }
        },

        RACK_UPGRADES: {
            'rackunit': {
                name: 'Rack Unit Expansion',
                description: 'Add 1U to the server rack (max 6U)',
                baseCost: 1000,
                costMultiplier: 1.4
            }
        },

        BUILDING_NAMES: {
            prefixes: ['Silicon', 'Cyber', 'Digital', 'Tech', 'Data', 'Cloud', 'Quantum', 'Neural', 'Nexus', 'Apex', 'Zephyr', 'Apex', 'Iron', 'Steel', 'Neon'],
            suffixes: ['Street', 'Avenue', 'Boulevard', 'Lane', 'Drive', 'Court', 'Plaza', 'Row', 'Park', 'Way', 'Alley', 'Terminal', 'Station', 'Hub', 'Tower']
        },

        BUILDING_PURCHASE: {
            baseCost: 50000,
            costMultiplier: 2.5,
            maxBuildings: 6
        },

        GRID_SLOT_UPGRADES: {
            'gridslots': {
                name: 'Grid Slot Expansion',
                description: 'Add 1 more slot to the power grid (max 25 slots)',
                baseCost: 5000,
                costMultiplier: 1.3
            }
        },

        BATTERY_UPGRADES: {
            'battery_capacity': {
                name: 'Battery Capacity Expansion',
                description: 'Increase battery storage capacity by 10 W',
                baseCost: 5000,
                costMultiplier: 1.25,
                capacityIncrease: 10
            },
            'battery_charge_rate': {
                name: 'Charge Rate Enhancement',
                description: 'Increase charge rate by 2 W/s',
                baseCost: 3000,
                costMultiplier: 1.2,
                rateIncrease: 2
            },
            'battery_discharge_rate': {
                name: 'Discharge Rate Enhancement',
                description: 'Increase discharge rate by 2 W/s',
                baseCost: 3000,
                costMultiplier: 1.2,
                rateIncrease: 2
            }
        },

        RESEARCH_UPGRADES: {
            'servers_tab_unlock': {
                name: 'Server Infrastructure',
                description: 'Unlock the Servers tab - Build and manage your server rack',
                skillPointCost: 8,
                researchTime: 0,
                category: 'core_systems'
            },
            'casino_unlock': {
                name: 'Casino License',
                description: 'Unlock the Casino tab - Gamble your coins for big wins!',
                skillPointCost: 40,
                researchTime: 0,
                category: 'core_systems'
            },
            // Casino Games Research
            'casino_dice_unlock': {
                name: 'Dice Gaming License',
                description: 'Unlock the Dice Roll game in Casino',
                skillPointCost: 8,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_slots_unlock': {
                name: 'Slot Machine License',
                description: 'Unlock the Slots game in Casino',
                skillPointCost: 15,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_blackjack_unlock': {
                name: 'Blackjack License',
                description: 'Unlock the Blackjack game in Casino',
                skillPointCost: 25,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_midas_unlock': {
                name: 'Foot of Zeus License',
                description: 'Unlock the Foot of Zeus game in Casino',
                skillPointCost: 200,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_wheel_unlock': {
                name: 'Prize Wheel License',
                description: 'Unlock the Wheel game in Casino',
                skillPointCost: 45,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_poker_unlock': {
                name: 'Video Poker License',
                description: 'Unlock the Poker game in Casino',
                skillPointCost: 60,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_plinko_unlock': {
                name: 'Plinko License',
                description: 'Unlock the Plinko game in Casino',
                skillPointCost: 80,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_mines_unlock': {
                name: 'Mines License',
                description: 'Unlock the Mines game in Casino',
                skillPointCost: 100,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_crash_unlock': {
                name: 'Crash License',
                description: 'Unlock the Crash game in Casino',
                skillPointCost: 125,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_dragon_unlock': {
                name: 'Dragon\'s Lair License',
                description: 'Unlock the Dragon\'s Lair game in Casino',
                skillPointCost: 150,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_cosmic_unlock': {
                name: 'Cosmic Fortune License',
                description: 'Unlock the Cosmic Fortune game in Casino',
                skillPointCost: 200,
                researchTime: 0,
                category: 'casino_games'
            },
            'casino_candy_unlock': {
                name: 'Candy Cascade License',
                description: 'Unlock the Candy Cascade game in Casino - Sweet Tumbling Wins!',
                skillPointCost: 250,
                researchTime: 0,
                category: 'casino_games'
            },
            'solar_unlock': {
                name: 'Solar Panel Technology',
                description: 'Unlock Solar Panel generators',
                skillPointCost: 12,
                researchTime: 0,
                category: 'power_generation'
            },
            'solarfarm_unlock': {
                name: 'Solar Farm Technology',
                description: 'Unlock Solar Farm generators (exponentially upgradable)',
                skillPointCost: 75,
                researchTime: 0,
                category: 'power_generation'
            },
            'wind_unlock': {
                name: 'Wind Turbine Technology',
                description: 'Unlock Wind Turbine generators',
                skillPointCost: 12,
                researchTime: 0,
                category: 'power_generation'
            },
            'windfarm_unlock': {
                name: 'Wind Farm Technology',
                description: 'Unlock Wind Farm generators (exponentially upgradable)',
                skillPointCost: 80,
                researchTime: 0,
                category: 'power_generation'
            },
            'fossil_unlock': {
                name: 'Fossil Fuel Technology',
                description: 'Unlock Fossil Fuel Plant generators',
                skillPointCost: 20,
                researchTime: 0,
                category: 'power_generation'
            },
            'coal_unlock': {
                name: 'Coal Power Technology',
                description: 'Unlock Coal Power Plant generators',
                skillPointCost: 22,
                researchTime: 0,
                category: 'power_generation'
            },
            'hydro_unlock': {
                name: 'Hydropower Technology',
                description: 'Unlock Hydropower Plant generators',
                skillPointCost: 30,
                researchTime: 0,
                category: 'power_generation'
            },
            'biomass_unlock': {
                name: 'Biomass Technology',
                description: 'Unlock Biomass Generator',
                skillPointCost: 22,
                researchTime: 0,
                category: 'power_generation'
            },
            'geothermal_unlock': {
                name: 'Geothermal Technology',
                description: 'Unlock Geothermal Generator',
                skillPointCost: 35,
                researchTime: 0,
                category: 'power_generation'
            },
            'biofuel_unlock': {
                name: 'Biofuel Technology',
                description: 'Unlock Biofuel Generator',
                skillPointCost: 25,
                researchTime: 0,
                category: 'power_generation'
            },
            'naturalgas_unlock': {
                name: 'Natural Gas Technology',
                description: 'Unlock Natural Gas Plant generators',
                skillPointCost: 28,
                researchTime: 0,
                category: 'power_generation'
            },
            'nuclear_unlock': {
                name: 'Nuclear Technology',
                description: 'Unlock Nuclear Reactor generators',
                skillPointCost: 120,
                researchTime: 0,
                category: 'power_generation'
            },
            'fusion_unlock': {
                name: 'Fusion Technology',
                description: 'Unlock Fusion Reactor generators',
                skillPointCost: 300,
                researchTime: 0,
                category: 'power_generation'
            },
            'dyson_unlock': {
                name: 'Dyson Sphere Technology',
                description: 'Unlock Dyson Sphere generators (exponentially upgradable)',
                skillPointCost: 750,
                researchTime: 0,
                category: 'power_generation'
            },
            'standard_server_unlock': {
                name: 'Standard Server Technology',
                description: 'Unlock Standard Server (2U) - Tier 2 CPUs',
                skillPointCost: 35,
                researchTime: 0,
                category: 'server_technology'
            },
            'advanced_server_unlock': {
                name: 'Advanced Server Technology',
                description: 'Unlock Advanced Server (3U) - Xeon/EPYC',
                skillPointCost: 100,
                researchTime: 0,
                category: 'server_technology'
            },
            'datacenter_unlock': {
                name: 'Datacenter Technology',
                description: 'Unlock Datacenter (4U) - Enterprise Grade',
                skillPointCost: 250,
                researchTime: 0,
                category: 'server_technology'
            },
            'ai_datacenter_unlock': {
                name: 'AI Accelerated Datacenter Technology',
                description: 'Unlock AI Accelerated Datacenter (5U) - HPC',
                skillPointCost: 600,
                researchTime: 0,
                category: 'server_technology'
            },
            'quantum_server_unlock': {
                name: 'Quantum Server Technology',
                description: 'Unlock Quantum Server (6U) - Cutting Edge',
                skillPointCost: 1500,
                researchTime: 0,
                category: 'server_technology'
            },
            'antimatter_server_unlock': {
                name: 'Antimatter Server Technology',
                description: 'Unlock Antimatter Server (6U) - Exotic Power',
                skillPointCost: 4000,
                researchTime: 0,
                category: 'server_technology'
            },
            'darkmatter_server_unlock': {
                name: 'Dark Matter Server Technology',
                description: 'Unlock Dark Matter Server (6U) - Ultimate Power',
                skillPointCost: 10000,
                researchTime: 0,
                category: 'server_technology'
            },
            
            // Mining Research
            'lithium_mining': {
                name: 'Lithium Mining',
                description: 'Unlock Lithium (Li) mining for advanced batteries',
                skillPointCost: 300,
                researchTime: 0,
                category: 'mining'
            },
            'gan_mining': {
                name: 'Gallium Nitride Extraction',
                description: 'Unlock Gallium Nitride (GaN) mining for high-efficiency servers',
                skillPointCost: 600,
                researchTime: 0,
                category: 'mining'
            },
            'sic_mining': {
                name: 'Silicon Carbide Synthesis',
                description: 'Unlock Silicon Carbide (SiC) mining for power electronics',
                skillPointCost: 800,
                researchTime: 0,
                category: 'mining'
            },
            'antimatium_mining': {
                name: 'Antimatium Harvesting',
                description: 'Unlock Antimatium (Am) mining for Antimatter servers',
                skillPointCost: 2500,
                researchTime: 0,
                category: 'mining'
            },
            'darkium_mining': {
                name: 'Darkium Extraction',
                description: 'Unlock Darkium (Dm) mining for Dark Matter servers',
                skillPointCost: 8000,
                researchTime: 0,
                category: 'mining'
            }
            ,
            'iron_mining': {
                name: 'Iron Mining',
                description: 'Unlock Iron (Fe) mining - common ore used in basic crafting',
                skillPointCost: 25,
                researchTime: 0,
                category: 'mining'
            },
            'gold_mining': {
                name: 'Gold Mining',
                description: 'Unlock Gold (Au) mining - valuable metal for advanced crafting',
                skillPointCost: 500,
                researchTime: 0,
                category: 'mining'
            },
            'copper_mining': {
                name: 'Copper Mining',
                description: 'Unlock Copper (Cu) mining - common conductive metal',
                skillPointCost: 100,
                researchTime: 0,
                category: 'mining'
            },
            'platinium_mining': {
                name: 'Platinium Mining',
                description: 'Unlock Platinium (Pt) mining for advanced gear',
                skillPointCost: 4500,
                researchTime: 0,
                category: 'mining'
            },
            'lerasium_mining': {
                name: 'Lerasium Mining',
                description: 'Unlock Lerasium (Le) mining for elite axes',
                skillPointCost: 12000,
                researchTime: 0,
                category: 'mining'
            },
            'atium_mining': {
                name: 'Atium Mining',
                description: 'Unlock Atium (At) mining for master bows',
                skillPointCost: 10000,
                researchTime: 0,
                category: 'mining'
            },
            'harmonium_mining': {
                name: 'Harmonium Mining',
                description: 'Unlock Harmonium (Hn) mining for top-tier armor',
                skillPointCost: 20000,
                researchTime: 0,
                category: 'mining'
            }
        },

        LUCKY_BLOCKS: {
            'common': {
                name: 'Common Block',
                chance: 0.70, // 70% chance
                miningTimeMultiplier: 1.0, // Normal time
                coinBonus: 1.0, // Normal coins
                icon: '⬜',
                color: '#888888'
            },
            'rare': {
                name: 'Rare Block',
                chance: 0.25, // 25% chance
                miningTimeMultiplier: 2.0, // 2x slower
                coinBonus: 5.0, // 5x bonus coins
                icon: '🟦',
                color: '#0099ff'
            },
            'epic': {
                name: 'Epic Block',
                chance: 0.04, // 4% chance
                miningTimeMultiplier: 4.0, // 4x slower
                coinBonus: 25.0, // 25x bonus coins
                icon: '🟪',
                color: '#9900ff'
            },
            'legendary': {
                name: 'Legendary Block',
                chance: 0.01, // 1% chance
                miningTimeMultiplier: 8.0, // 8x slower
                coinBonus: 100.0, // 100x bonus coins
                icon: '🟨',
                color: '#ffcc00'
            }
        },

        ACHIEVEMENTS: [
            // === CLICKING MILESTONES ===
            {
                id: 'first_click',
                name: 'First Click',
                description: 'Click the coin once',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1,
                reward: { prestigeBonus: 0.01, skillPoints: 1 }
            },
            {
                id: 'hundred_coins',
                name: 'Centillionaire',
                description: 'Earn 100 HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 100,
                reward: { prestigeBonus: 0.02, skillPoints: 3 }
            },
            {
                id: 'thousand_coins',
                name: 'Thousandaire',
                description: 'Earn 1,000 HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1000,
                reward: { prestigeBonus: 0.03, skillPoints: 5 }
            },
            {
                id: 'million_coins',
                name: 'Millionaire',
                description: 'Earn 1,000,000 HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1000000,
                reward: { prestigeBonus: 0.05, skillPoints: 10, achievementPoints: 5 }
            },
            {
                id: 'billion_coins',
                name: 'Billionaire',
                description: 'Earn 1,000,000,000 HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1000000000,
                reward: { prestigeBonus: 0.08, skillPoints: 20, achievementPoints: 10 }
            },
            {
                id: 'trillion_coins',
                name: 'Trillionaire',
                description: 'Earn 1 trillion HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1000000000000,
                reward: { prestigeBonus: 0.10, skillPoints: 50, achievementPoints: 25 }
            },
            
            // === SERVER MILESTONES ===
            {
                id: 'first_server',
                name: 'Server Starter',
                description: 'Buy your first server',
                category: 'servers',
                condition: (game) => {
                    return Object.values(game.state.servers).reduce((sum, server) => sum + (server.count || 0), 0) >= 1;
                },
                reward: { prestigeBonus: 0.01, skillPoints: 2 }
            },
            {
                id: 'ten_servers',
                name: 'Server Farm',
                description: 'Own 10 servers total',
                category: 'servers',
                condition: (game) => {
                    return Object.values(game.state.servers).reduce((sum, server) => sum + (server.count || 0), 0) >= 10;
                },
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            {
                id: 'fifty_servers',
                name: 'Data Center',
                description: 'Own 50 servers total',
                category: 'servers',
                condition: (game) => {
                    return Object.values(game.state.servers).reduce((sum, server) => sum + (server.count || 0), 0) >= 50;
                },
                reward: { prestigeBonus: 0.04, skillPoints: 10 }
            },
            {
                id: 'hundred_servers',
                name: 'Server Empire',
                description: 'Own 100 servers total',
                category: 'servers',
                condition: (game) => {
                    return Object.values(game.state.servers).reduce((sum, server) => sum + (server.count || 0), 0) >= 100;
                },
                reward: { prestigeBonus: 0.06, skillPoints: 20 }
            },
            
            // === POWER MILESTONES ===
            {
                id: 'first_generator',
                name: 'Power User',
                description: 'Place your first power generator',
                category: 'power',
                condition: (game) => game.state.powerGenerators.length >= 1,
                reward: { prestigeBonus: 0.01, skillPoints: 2 }
            },
            {
                id: 'five_generators',
                name: 'Power Grid',
                description: 'Place 5 power generators',
                category: 'power',
                condition: (game) => game.state.powerGenerators.length >= 5,
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            {
                id: 'full_grid',
                name: 'Power Overload',
                description: 'Fill 25 power grid slots',
                category: 'power',
                condition: (game) => game.state.powerGenerators.length >= 25,
                reward: { prestigeBonus: 0.03, skillPoints: 8 }
            },
            {
                id: 'power_100',
                name: 'Watt a Start',
                description: 'Generate 100W of power',
                category: 'power',
                condition: (game) => game.getPowerGeneration() >= 100,
                reward: { prestigeBonus: 0.02, skillPoints: 3 }
            },
            {
                id: 'power_1000',
                name: 'Kilowatt Club',
                description: 'Generate 1,000W of power',
                category: 'power',
                condition: (game) => game.getPowerGeneration() >= 1000,
                reward: { prestigeBonus: 0.04, skillPoints: 8 }
            },
            {
                id: 'power_10000',
                name: 'Megawatt Mania',
                description: 'Generate 10,000W of power',
                category: 'power',
                condition: (game) => game.getPowerGeneration() >= 10000,
                reward: { prestigeBonus: 0.06, skillPoints: 15 }
            },
            {
                id: 'generator_upgrade_10',
                name: 'Supercharged',
                description: 'Upgrade a single generator 10 times',
                category: 'power',
                condition: (game) => {
                    if (!game.state.generatorUpgrades) return false;
                    return Object.values(game.state.generatorUpgrades).some(level => level >= 10);
                },
                reward: { prestigeBonus: 0.03, skillPoints: 10 }
            },
            
            // === UPGRADE MILESTONES ===
            {
                id: 'five_upgrades',
                name: 'Upgrade Novice',
                description: 'Buy 5 click upgrades',
                category: 'upgrades',
                condition: (game) => {
                    const total = Object.values(game.state.clickUpgrades).reduce((sum, upg) => sum + (upg.level || 0), 0);
                    return total >= 5;
                },
                reward: { prestigeBonus: 0.01, skillPoints: 3 }
            },
            {
                id: 'twenty_upgrades',
                name: 'Upgrade Addict',
                description: 'Buy 20 click upgrades',
                category: 'upgrades',
                condition: (game) => {
                    const total = Object.values(game.state.clickUpgrades).reduce((sum, upg) => sum + (upg.level || 0), 0);
                    return total >= 20;
                },
                reward: { prestigeBonus: 0.03, skillPoints: 8 }
            },
            {
                id: 'fifty_upgrades',
                name: 'Upgrade Master',
                description: 'Buy 50 click upgrades',
                category: 'upgrades',
                condition: (game) => {
                    const total = Object.values(game.state.clickUpgrades).reduce((sum, upg) => sum + (upg.level || 0), 0);
                    return total >= 50;
                },
                reward: { prestigeBonus: 0.05, skillPoints: 15 }
            },
            
            // === SPECIFIC UPGRADE LEVELS ===
            {
                id: 'better_click_10',
                name: 'Click Champion',
                description: 'Upgrade Better Click to level 10',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.betterclick?.level || 0) >= 10,
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            {
                id: 'better_click_25',
                name: 'Click Warrior',
                description: 'Upgrade Better Click to level 25',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.betterclick?.level || 0) >= 25,
                reward: { prestigeBonus: 0.04, skillPoints: 10 }
            },
            {
                id: 'better_click_50',
                name: 'Click Master',
                description: 'Upgrade Better Click to level 50',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.betterclick?.level || 0) >= 50,
                reward: { prestigeBonus: 0.06, skillPoints: 15 }
            },
            {
                id: 'better_click_100',
                name: 'Click Legend',
                description: 'Upgrade Better Click to level 100',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.betterclick?.level || 0) >= 100,
                reward: { prestigeBonus: 0.10, skillPoints: 25 }
            },
            {
                id: 'click_bonus_10',
                name: 'Bonus Builder',
                description: 'Upgrade Click Bonus to level 10',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.clickbonus?.level || 0) >= 10,
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            {
                id: 'click_bonus_25',
                name: 'Bonus Booster',
                description: 'Upgrade Click Bonus to level 25',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.clickbonus?.level || 0) >= 25,
                reward: { prestigeBonus: 0.04, skillPoints: 10 }
            },
            {
                id: 'click_bonus_50',
                name: 'Bonus Baron',
                description: 'Upgrade Click Bonus to level 50',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.clickbonus?.level || 0) >= 50,
                reward: { prestigeBonus: 0.06, skillPoints: 15 }
            },
            {
                id: 'click_bonus_100',
                name: 'Bonus Emperor',
                description: 'Upgrade Click Bonus to level 100',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.clickbonus?.level || 0) >= 100,
                reward: { prestigeBonus: 0.10, skillPoints: 25 }
            },
            {
                id: 'double_click_10',
                name: 'Double Dipper',
                description: 'Upgrade Double Click to level 10',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.doubleclick?.level || 0) >= 10,
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            {
                id: 'double_click_25',
                name: 'Double Dealer',
                description: 'Upgrade Double Click to level 25',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.doubleclick?.level || 0) >= 25,
                reward: { prestigeBonus: 0.04, skillPoints: 10 }
            },
            {
                id: 'double_click_50',
                name: 'Double Dynamo',
                description: 'Upgrade Double Click to level 50',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.doubleclick?.level || 0) >= 50,
                reward: { prestigeBonus: 0.06, skillPoints: 15 }
            },
            {
                id: 'double_click_100',
                name: 'Double Dragon',
                description: 'Upgrade Double Click to level 100',
                category: 'upgrades',
                condition: (game) => (game.state.clickUpgrades.doubleclick?.level || 0) >= 100,
                reward: { prestigeBonus: 0.10, skillPoints: 25 }
            },
            
            // === BATTERY MILESTONES ===
            {
                id: 'battery_100',
                name: 'Power Reserve',
                description: 'Upgrade battery capacity to 100W',
                category: 'battery',
                condition: (game) => game.state.batteryCapacity >= 100,
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            {
                id: 'battery_1000',
                name: 'Energy Vault',
                description: 'Upgrade battery capacity to 1,000W',
                category: 'battery',
                condition: (game) => game.state.batteryCapacity >= 1000,
                reward: { prestigeBonus: 0.04, skillPoints: 10 }
            },
            {
                id: 'battery_full',
                name: 'Fully Charged',
                description: 'Fill your battery to capacity',
                category: 'battery',
                condition: (game) => game.state.batteryStored > 0 && game.state.batteryStored >= game.state.batteryCapacity,
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            
            // === BATTERY UPGRADE LEVELS ===
            {
                id: 'battery_capacity_10',
                name: 'Capacity Builder',
                description: 'Upgrade Battery Capacity to level 10',
                category: 'battery',
                condition: (game) => game.state.batteryCapacityLevel >= 10,
                reward: { prestigeBonus: 0.03, skillPoints: 8 }
            },
            {
                id: 'battery_capacity_25',
                name: 'Capacity Master',
                description: 'Upgrade Battery Capacity to level 25',
                category: 'battery',
                condition: (game) => game.state.batteryCapacityLevel >= 25,
                reward: { prestigeBonus: 0.05, skillPoints: 15 }
            },
            {
                id: 'battery_capacity_50',
                name: 'Capacity Legend',
                description: 'Upgrade Battery Capacity to level 50',
                category: 'battery',
                condition: (game) => game.state.batteryCapacityLevel >= 50,
                reward: { prestigeBonus: 0.08, skillPoints: 25 }
            },
            {
                id: 'battery_charge_10',
                name: 'Charge Champion',
                description: 'Upgrade Battery Charge Rate to level 10',
                category: 'battery',
                condition: (game) => game.state.batteryChargeRateLevel >= 10,
                reward: { prestigeBonus: 0.03, skillPoints: 8 }
            },
            {
                id: 'battery_charge_25',
                name: 'Charge Master',
                description: 'Upgrade Battery Charge Rate to level 25',
                category: 'battery',
                condition: (game) => game.state.batteryChargeRateLevel >= 25,
                reward: { prestigeBonus: 0.05, skillPoints: 15 }
            },
            {
                id: 'battery_charge_50',
                name: 'Charge Legend',
                description: 'Upgrade Battery Charge Rate to level 50',
                category: 'battery',
                condition: (game) => game.state.batteryChargeRateLevel >= 50,
                reward: { prestigeBonus: 0.08, skillPoints: 25 }
            },
            {
                id: 'battery_discharge_10',
                name: 'Discharge Dynamo',
                description: 'Upgrade Battery Discharge Rate to level 10',
                category: 'battery',
                condition: (game) => game.state.batteryDischargeRateLevel >= 10,
                reward: { prestigeBonus: 0.03, skillPoints: 8 }
            },
            {
                id: 'battery_discharge_25',
                name: 'Discharge Master',
                description: 'Upgrade Battery Discharge Rate to level 25',
                category: 'battery',
                condition: (game) => game.state.batteryDischargeRateLevel >= 25,
                reward: { prestigeBonus: 0.05, skillPoints: 15 }
            },
            {
                id: 'battery_discharge_50',
                name: 'Discharge Legend',
                description: 'Upgrade Battery Discharge Rate to level 50',
                category: 'battery',
                condition: (game) => game.state.batteryDischargeRateLevel >= 50,
                reward: { prestigeBonus: 0.08, skillPoints: 25 }
            },
            
            // === RESEARCH MILESTONES ===
            {
                id: 'first_research',
                name: 'Researcher',
                description: 'Complete your first research',
                category: 'research',
                condition: (game) => game.state.unlockedResearch.size >= 1,
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            {
                id: 'five_research',
                name: 'Scientist',
                description: 'Complete 5 researches',
                category: 'research',
                condition: (game) => game.state.unlockedResearch.size >= 5,
                reward: { prestigeBonus: 0.04, skillPoints: 10 }
            },
            {
                id: 'ten_research',
                name: 'Professor',
                description: 'Complete 10 researches',
                category: 'research',
                condition: (game) => game.state.unlockedResearch.size >= 10,
                reward: { prestigeBonus: 0.06, skillPoints: 20 }
            },
            
            // === PRESTIGE MILESTONES ===
            {
                id: 'first_prestige',
                name: 'New Beginning',
                description: 'Prestige for the first time',
                category: 'prestige',
                condition: (game) => (game.state.prestigeLevel || 0) >= 1,
                reward: { prestigeBonus: 0.05, skillPoints: 10, achievementPoints: 10 }
            },
            {
                id: 'five_prestiges',
                name: 'Veteran',
                description: 'Prestige 5 times',
                category: 'prestige',
                condition: (game) => (game.state.prestigeLevel || 0) >= 5,
                reward: { prestigeBonus: 0.10, skillPoints: 25, achievementPoints: 25 }
            },
            {
                id: 'ten_prestiges',
                name: 'Legend',
                description: 'Prestige 10 times',
                category: 'prestige',
                condition: (game) => (game.state.prestigeLevel || 0) >= 10,
                reward: { prestigeBonus: 0.15, skillPoints: 50, achievementPoints: 50 }
            },
            
            // === SPECIAL ACHIEVEMENTS ===
            {
                id: 'collector',
                name: 'Achievement Hunter',
                description: 'Unlock 15 achievements',
                category: 'special',
                condition: (game) => game.state.unlockedAchievements.size >= 15,
                reward: { prestigeBonus: 0.05, skillPoints: 15 }
            },
            {
                id: 'completionist',
                name: 'Completionist',
                description: 'Unlock 30 achievements',
                category: 'special',
                condition: (game) => game.state.unlockedAchievements.size >= 30,
                reward: { prestigeBonus: 0.10, skillPoints: 50 }
            },
            {
                id: 'skill_master',
                name: 'Skill Master',
                description: 'Spend 50 skill points',
                category: 'special',
                condition: (game) => (game.state.totalSkillPointsSpent || 0) >= 50,
                reward: { prestigeBonus: 0.05, skillPoints: 20 }
            },
            {
                id: 'dark_lord',
                name: 'Dark Lord',
                description: 'Complete 5 prestiges in Dark Mode',
                category: 'special',
                condition: (game) => game.state.darkMode && (game.state.prestigeLevel || 0) >= 5,
                reward: { prestigeBonus: 0.15, skillPoints: 30 }
            },
            {
                id: 'casino_unlocked',
                name: 'Reasonable Spending',
                description: 'Defeat the evil casino by unlocking it',
                category: 'special',
                condition: (game) => game.state.unlockedResearch.has('casino_unlock'),
                reward: { prestigeBonus: 0.03, skillPoints: 10 }
            },
            {
                id: 'servers_unlocked',
                name: 'Automation!',
                description: 'Unlock the Servers tab',
                category: 'special',
                condition: (game) => game.state.unlockedResearch.has('servers_tab_unlock'),
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            
            // === CASINO ACHIEVEMENTS ===
            {
                id: 'casino_first_bet',
                name: 'First Bet',
                description: 'Place your first casino bet',
                category: 'casino',
                condition: (game) => (game.state.casinoGamesPlayed || 0) >= 1,
                reward: { prestigeBonus: 0.01, skillPoints: 2 }
            },
            {
                id: 'casino_10_games',
                name: 'Getting Started',
                description: 'Play 10 casino games',
                category: 'casino',
                condition: (game) => (game.state.casinoGamesPlayed || 0) >= 10,
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            {
                id: 'casino_100_games',
                name: 'Regular',
                description: 'Play 100 casino games',
                category: 'casino',
                condition: (game) => (game.state.casinoGamesPlayed || 0) >= 100,
                reward: { prestigeBonus: 0.03, skillPoints: 10 }
            },
            {
                id: 'casino_1000_games',
                name: 'High Roller',
                description: 'Play 1,000 casino games',
                category: 'casino',
                condition: (game) => (game.state.casinoGamesPlayed || 0) >= 1000,
                reward: { prestigeBonus: 0.05, skillPoints: 25 }
            },
            {
                id: 'casino_wagered_10k',
                name: 'Big Spender',
                description: 'Wager 10,000 coins total',
                category: 'casino',
                condition: (game) => (game.state.casinoTotalWagered || 0) >= 10000,
                reward: { prestigeBonus: 0.02, skillPoints: 5 }
            },
            {
                id: 'casino_wagered_1m',
                name: 'Whale',
                description: 'Wager 1,000,000 coins total',
                category: 'casino',
                condition: (game) => (game.state.casinoTotalWagered || 0) >= 1000000,
                reward: { prestigeBonus: 0.05, skillPoints: 15 }
            },
            {
                id: 'casino_wagered_1b',
                name: 'Casino King',
                description: 'Wager 1 billion coins total',
                category: 'casino',
                condition: (game) => (game.state.casinoTotalWagered || 0) >= 1000000000,
                reward: { prestigeBonus: 0.08, skillPoints: 30 }
            },
            {
                id: 'casino_won_100k',
                name: 'Lucky Strike',
                description: 'Win 100,000 coins total from casino',
                category: 'casino',
                condition: (game) => (game.state.casinoTotalWon || 0) >= 100000,
                reward: { prestigeBonus: 0.03, skillPoints: 8 }
            },
            {
                id: 'casino_won_10m',
                name: 'Fortune Favors',
                description: 'Win 10 million coins total from casino',
                category: 'casino',
                condition: (game) => (game.state.casinoTotalWon || 0) >= 10000000,
                reward: { prestigeBonus: 0.06, skillPoints: 20 }
            },
            {
                id: 'casino_profitable',
                name: 'The House Loses',
                description: 'Have positive net casino profit',
                category: 'casino',
                condition: (game) => ((game.state.casinoTotalWon || 0) - (game.state.casinoTotalWagered || 0)) > 0,
                reward: { prestigeBonus: 0.05, skillPoints: 15 }
            },
            {
                id: 'casino_jackpot',
                name: 'Jackpot!',
                description: 'Win a single bet of 50x or more',
                category: 'casino',
                condition: (game) => (game.state.casinoBiggestMultiplier || 0) >= 50,
                reward: { prestigeBonus: 0.08, skillPoints: 25 }
            },
            
            // === HIGHER COIN MILESTONES ===
            {
                id: 'billion_coins',
                name: 'Billionaire',
                description: 'Earn 1 billion HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1000000000,
                reward: { prestigeBonus: 0.08, skillPoints: 40 }
            },
            {
                id: 'trillion_coins',
                name: 'Trillionaire',
                description: 'Earn 1 trillion HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1000000000000,
                reward: { prestigeBonus: 0.10, skillPoints: 60 }
            },
            {
                id: 'quadrillion_coins',
                name: 'Quadrillionaire',
                description: 'Earn 1 quadrillion HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1000000000000000,
                reward: { prestigeBonus: 0.12, skillPoints: 80 }
            },
            
            // === SERVER MILESTONES ===
            {
                id: 'fifty_servers',
                name: 'Server Farm',
                description: 'Own 50 servers total',
                category: 'servers',
                condition: (game) => {
                    const totalServers = Object.values(game.state.servers || {}).reduce((sum, s) => sum + (s.count || 0), 0);
                    return totalServers >= 50;
                },
                reward: { prestigeBonus: 0.04, skillPoints: 15 }
            },
            {
                id: 'hundred_servers',
                name: 'Data Center',
                description: 'Own 100 servers total',
                category: 'servers',
                condition: (game) => {
                    const totalServers = Object.values(game.state.servers || {}).reduce((sum, s) => sum + (s.count || 0), 0);
                    return totalServers >= 100;
                },
                reward: { prestigeBonus: 0.06, skillPoints: 25 }
            },
            {
                id: 'five_hundred_servers',
                name: 'Server Empire',
                description: 'Own 500 servers total',
                category: 'servers',
                condition: (game) => {
                    const totalServers = Object.values(game.state.servers || {}).reduce((sum, s) => sum + (s.count || 0), 0);
                    return totalServers >= 500;
                },
                reward: { prestigeBonus: 0.10, skillPoints: 50 }
            },
            
            // === GENERATOR MILESTONES ===
            {
                id: 'ten_generators',
                name: 'Power Grid',
                description: 'Own 10 power generators',
                category: 'power',
                condition: (game) => (game.state.powerGenerators || []).length >= 10,
                reward: { prestigeBonus: 0.03, skillPoints: 10 }
            },
            {
                id: 'twenty_five_generators',
                name: 'Power Station',
                description: 'Own 25 power generators',
                category: 'power',
                condition: (game) => (game.state.powerGenerators || []).length >= 25,
                reward: { prestigeBonus: 0.05, skillPoints: 20 }
            },
            {
                id: 'fifty_generators',
                name: 'Power Plant',
                description: 'Own 50 power generators',
                category: 'power',
                condition: (game) => (game.state.powerGenerators || []).length >= 50,
                reward: { prestigeBonus: 0.08, skillPoints: 35 }
            },
            
            // === VIP LEVEL ACHIEVEMENTS ===
            {
                id: 'vip_level_25',
                name: 'VIP Elite',
                description: 'Reach VIP Level 25',
                category: 'vip',
                condition: (game) => (game.state.vipLevel || 1) >= 25,
                reward: { prestigeBonus: 0.05, skillPoints: 20 }
            },
            {
                id: 'vip_level_30',
                name: 'VIP Supreme',
                description: 'Reach VIP Level 30',
                category: 'vip',
                condition: (game) => (game.state.vipLevel || 1) >= 30,
                reward: { prestigeBonus: 0.07, skillPoints: 30 }
            },
            {
                id: 'vip_level_35',
                name: 'VIP Ultimate',
                description: 'Reach VIP Level 35',
                category: 'vip',
                condition: (game) => (game.state.vipLevel || 1) >= 35,
                reward: { prestigeBonus: 0.09, skillPoints: 40 }
            },
            {
                id: 'casino_mega_jackpot',
                name: 'MEGA JACKPOT',
                description: 'Win a single bet of 100x or more',
                category: 'casino',
                condition: (game) => (game.state.casinoBiggestMultiplier || 0) >= 100,
                reward: { prestigeBonus: 0.15, skillPoints: 50 }
            },
            
            // === VIP ACHIEVEMENTS ===
            {
                id: 'vip_level_5',
                name: 'Silver VIP',
                description: 'Reach VIP Level 5',
                category: 'vip',
                condition: (game) => (game.state.vipLevel || 1) >= 5,
                reward: { prestigeBonus: 0.03, skillPoints: 10 }
            },
            {
                id: 'vip_level_10',
                name: 'Gold VIP',
                description: 'Reach VIP Level 10',
                category: 'vip',
                condition: (game) => (game.state.vipLevel || 1) >= 10,
                reward: { prestigeBonus: 0.05, skillPoints: 20 }
            },
            {
                id: 'vip_level_15',
                name: 'Platinum VIP',
                description: 'Reach VIP Level 15',
                category: 'vip',
                condition: (game) => (game.state.vipLevel || 1) >= 15,
                reward: { prestigeBonus: 0.08, skillPoints: 35 }
            },
            {
                id: 'vip_level_20',
                name: 'Diamond VIP',
                description: 'Reach VIP Level 20',
                category: 'vip',
                condition: (game) => (game.state.vipLevel || 1) >= 20,
                reward: { prestigeBonus: 0.12, skillPoints: 50 }
            },
            {
                id: 'jackpot_winner',
                name: 'Jackpot Winner',
                description: 'Win the Mega Jackpot',
                category: 'vip',
                condition: (game) => (game.state.jackpotHistory || []).length >= 1,
                reward: { prestigeBonus: 0.15, skillPoints: 75 }
            },
            
            // === PROGRESSION ACHIEVEMENTS ===
            {
                id: 'quadrillion_coins',
                name: 'Quadrillionaire',
                description: 'Earn 1 quadrillion HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1000000000000000,
                reward: { prestigeBonus: 0.15, skillPoints: 100 }
            },
            {
                id: 'quintillion_coins',
                name: 'Quintillionaire',
                description: 'Earn 1 quintillion HOSTX coins total',
                category: 'clicking',
                condition: (game) => game.state.totalCoinsEarned >= 1000000000000000000,
                reward: { prestigeBonus: 0.20, skillPoints: 200 }
            },
            {
                id: 'first_ascension',
                name: 'Ascended',
                description: 'Ascend for the first time',
                category: 'prestige',
                condition: (game) => (game.state.ascensionLevel || 0) >= 1,
                reward: { prestigeBonus: 0.10, skillPoints: 50 }
            },
            {
                id: 'five_ascensions',
                name: 'Celestial',
                description: 'Ascend 5 times',
                category: 'prestige',
                condition: (game) => (game.state.ascensionLevel || 0) >= 5,
                reward: { prestigeBonus: 0.15, skillPoints: 100 }
            },
            {
                id: 'first_transcendence',
                name: 'Transcendent',
                description: 'Transcend for the first time',
                category: 'prestige',
                condition: (game) => (game.state.transcendenceLevel || 0) >= 1,
                reward: { prestigeBonus: 0.20, skillPoints: 150 }
            },
            
            // === DAILY CHALLENGE ACHIEVEMENTS ===
            {
                id: 'daily_complete_1',
                name: 'Daily Starter',
                description: 'Complete your first daily challenge',
                category: 'daily',
                condition: (game) => (game.state.dailyChallengesCompleted || 0) >= 1,
                reward: { prestigeBonus: 0.01, skillPoints: 5 }
            },
            {
                id: 'daily_complete_10',
                name: 'Daily Regular',
                description: 'Complete 10 daily challenges',
                category: 'daily',
                condition: (game) => (game.state.dailyChallengesCompleted || 0) >= 10,
                reward: { prestigeBonus: 0.03, skillPoints: 15 }
            },
            {
                id: 'daily_complete_50',
                name: 'Daily Devotee',
                description: 'Complete 50 daily challenges',
                category: 'daily',
                condition: (game) => (game.state.dailyChallengesCompleted || 0) >= 50,
                reward: { prestigeBonus: 0.06, skillPoints: 30 }
            },
            {
                id: 'daily_streak_3',
                name: 'Three Day Streak',
                description: 'Maintain a 3 day daily challenge streak',
                category: 'daily',
                condition: (game) => (game.state.dailyStreak || 0) >= 3,
                reward: { prestigeBonus: 0.02, skillPoints: 10 }
            },
            {
                id: 'daily_streak_7',
                name: 'Week Warrior',
                description: 'Maintain a 7 day daily challenge streak',
                category: 'daily',
                condition: (game) => (game.state.dailyStreak || 0) >= 7,
                reward: { prestigeBonus: 0.05, skillPoints: 25 }
            },
            {
                id: 'daily_streak_30',
                name: 'Monthly Master',
                description: 'Maintain a 30 day daily challenge streak',
                category: 'daily',
                condition: (game) => (game.state.dailyStreak || 0) >= 30,
                reward: { prestigeBonus: 0.10, skillPoints: 75 }
            },
            
            // === SPEED ACHIEVEMENTS ===
            {
                id: 'speed_million',
                name: 'Speed Runner',
                description: 'Earn 1 million coins in under 10 minutes',
                category: 'special',
                condition: (game) => {
                    const sessionTime = (Date.now() - (game.state.stats?.sessionStartTime || Date.now())) / 1000 / 60;
                    return game.state.totalCoinsEarned >= 1000000 && sessionTime <= 10;
                },
                reward: { prestigeBonus: 0.05, skillPoints: 20 }
            },
            {
                id: 'power_50000',
                name: 'Power Plant',
                description: 'Generate 50,000W of power',
                category: 'power',
                condition: (game) => game.getPowerGeneration() >= 50000,
                reward: { prestigeBonus: 0.08, skillPoints: 25 }
            },
            {
                id: 'power_100000',
                name: 'Nuclear Facility',
                description: 'Generate 100,000W of power',
                category: 'power',
                condition: (game) => game.getPowerGeneration() >= 100000,
                reward: { prestigeBonus: 0.12, skillPoints: 40 }
            },
            
            // === BUILDING ACHIEVEMENTS ===
            {
                id: 'two_buildings',
                name: 'Expansion',
                description: 'Own 2 data center buildings',
                category: 'servers',
                condition: (game) => Object.keys(game.state.buildings || {}).length >= 2,
                reward: { prestigeBonus: 0.04, skillPoints: 15 }
            },
            {
                id: 'five_buildings',
                name: 'Real Estate Mogul',
                description: 'Own 5 data center buildings',
                category: 'servers',
                condition: (game) => Object.keys(game.state.buildings || {}).length >= 5,
                reward: { prestigeBonus: 0.08, skillPoints: 30 }
            },
            {
                id: 'hundred_upgrades',
                name: 'Upgrade Legend',
                description: 'Buy 100 click upgrades',
                category: 'upgrades',
                condition: (game) => {
                    const total = Object.values(game.state.clickUpgrades).reduce((sum, upg) => sum + (upg.level || 0), 0);
                    return total >= 100;
                },
                reward: { prestigeBonus: 0.08, skillPoints: 35 }
            },
            {
                id: 'twenty_prestiges',
                name: 'Eternal',
                description: 'Prestige 20 times',
                category: 'prestige',
                condition: (game) => (game.state.prestigeLevel || 0) >= 20,
                reward: { prestigeBonus: 0.20, skillPoints: 100 }
            },
            {
                id: 'fifty_prestiges',
                name: 'Immortal',
                description: 'Prestige 50 times',
                category: 'prestige',
                condition: (game) => (game.state.prestigeLevel || 0) >= 50,
                reward: { prestigeBonus: 0.30, skillPoints: 200 }
            },
            {
                id: 'achievement_master',
                name: 'Achievement Master',
                description: 'Unlock 50 achievements',
                category: 'special',
                condition: (game) => game.state.unlockedAchievements.size >= 50,
                reward: { prestigeBonus: 0.15, skillPoints: 100 }
            },
            {
                id: 'twenty_research',
                name: 'Nobel Prize',
                description: 'Complete 20 researches',
                category: 'research',
                condition: (game) => game.state.unlockedResearch.size >= 20,
                reward: { prestigeBonus: 0.10, skillPoints: 40 }
            },
            {
                id: 'skill_grandmaster',
                name: 'Skill Grandmaster',
                description: 'Spend 200 skill points',
                category: 'special',
                condition: (game) => (game.state.totalSkillPointsSpent || 0) >= 200,
                reward: { prestigeBonus: 0.10, skillPoints: 50 }
            },
            
            // === SECRET ACHIEVEMENTS ===
            {
                id: 'night_owl',
                name: 'Night Owl',
                description: 'Play between midnight and 4 AM',
                category: 'secret',
                condition: () => {
                    const hour = new Date().getHours();
                    return hour >= 0 && hour < 4;
                },
                reward: { prestigeBonus: 0.02, skillPoints: 10 }
            },
            {
                id: 'early_bird',
                name: 'Early Bird',
                description: 'Play between 5 AM and 7 AM',
                category: 'secret',
                condition: () => {
                    const hour = new Date().getHours();
                    return hour >= 5 && hour < 7;
                },
                reward: { prestigeBonus: 0.02, skillPoints: 10 }
            },
            {
                id: 'lucky_seven',
                name: 'Lucky Seven',
                description: 'Have exactly 7,777,777 coins',
                category: 'secret',
                condition: (game) => Math.floor(game.state.coins) === 7777777,
                reward: { prestigeBonus: 0.07, skillPoints: 77 }
            },
            
            // === BOSS BATTLE ACHIEVEMENTS ===
            {
                id: 'boss_first_kill',
                name: 'Virus Hunter',
                description: 'Defeat your first rogue AI',
                category: 'boss',
                condition: (game) => (game.state.bossDefeated || 0) >= 1,
                reward: { prestigeBonus: 0.05, skillPoints: 15 }
            },
            {
                id: 'boss_5_kills',
                name: 'AI Slayer',
                description: 'Defeat 5 rogue AIs',
                category: 'boss',
                condition: (game) => (game.state.bossDefeated || 0) >= 5,
                reward: { prestigeBonus: 0.08, skillPoints: 30 }
            },
            {
                id: 'boss_10_kills',
                name: 'Cyber Warrior',
                description: 'Defeat 10 rogue AIs',
                category: 'boss',
                condition: (game) => (game.state.bossDefeated || 0) >= 10,
                reward: { prestigeBonus: 0.12, skillPoints: 50 }
            },
            {
                id: 'boss_25_kills',
                name: 'Digital Destroyer',
                description: 'Defeat 25 rogue AIs',
                category: 'boss',
                condition: (game) => (game.state.bossDefeated || 0) >= 25,
                reward: { prestigeBonus: 0.18, skillPoints: 100 }
            },
            {
                id: 'boss_50_kills',
                name: 'Legendary Firewall',
                description: 'Defeat 50 rogue AIs',
                category: 'boss',
                condition: (game) => (game.state.bossDefeated || 0) >= 50,
                reward: { prestigeBonus: 0.25, skillPoints: 200 }
            },

            // === FIGHTING ACHIEVEMENTS ===
            {
                id: 'fighting_unlocked',
                name: 'Arena Champion',
                description: 'Unlock the fighting system',
                category: 'special',
                condition: (game) => game.state.fightingUnlocked,
                reward: { prestigeBonus: 0.03, skillPoints: 10, achievementPoints: 5 }
            },
            {
                id: 'first_boss_victory',
                name: 'First Victory',
                description: 'Win your first boss battle',
                category: 'special',
                condition: (game) => (game.state.fightingStats?.battlesWon || 0) >= 1,
                reward: { prestigeBonus: 0.05, skillPoints: 15, achievementPoints: 10 }
            },
            // recruitment_10 achievement removed (recruitment system retired)
            {
                id: 'fighting_master',
                name: 'Fighting Master',
                description: 'Win 50 boss battles',
                category: 'special',
                condition: (game) => (game.state.fightingStats?.battlesWon || 0) >= 50,
                reward: { prestigeBonus: 0.15, skillPoints: 100, achievementPoints: 50 }
            }
        ],

        DAILY_REWARDS: [
            { coins: 100, achievementPoints: 1 },
            { coins: 200, achievementPoints: 1 },
            { coins: 300, achievementPoints: 2 },
            { coins: 400, achievementPoints: 2 },
            { coins: 500, achievementPoints: 3 },
            { coins: 600, achievementPoints: 3 },
            { coins: 700, achievementPoints: 4 },
            { coins: 800, achievementPoints: 4 },
            { coins: 900, achievementPoints: 5 },
            { coins: 1000, achievementPoints: 5 },
            { coins: 1200, achievementPoints: 6 },
            { coins: 1400, achievementPoints: 6 },
            { coins: 1600, achievementPoints: 7 },
            { coins: 1800, achievementPoints: 7 },
            { coins: 2000, achievementPoints: 8 },
            { coins: 2200, achievementPoints: 8 },
            { coins: 2400, achievementPoints: 9 },
            { coins: 2600, achievementPoints: 9 },
            { coins: 2800, achievementPoints: 10 },
            { coins: 3000, achievementPoints: 10 },
            { coins: 3500, achievementPoints: 12 },
            { coins: 4000, achievementPoints: 12 },
            { coins: 4500, achievementPoints: 15 },
            { coins: 5000, achievementPoints: 15 },
            { coins: 6000, achievementPoints: 18 },
            { coins: 7000, achievementPoints: 18 },
            { coins: 8000, achievementPoints: 20 },
            { coins: 9000, achievementPoints: 20 },
            { coins: 10000, achievementPoints: 25 },
            { coins: 12000, achievementPoints: 25 }
        ],

        PRESTIGE_MILESTONES: [
            { requirement: 5, reward: { coins: 10000, achievementPoints: 10, skillPoints: 5 } },
            { requirement: 10, reward: { coins: 50000, achievementPoints: 25, skillPoints: 10 } },
            { requirement: 25, reward: { coins: 250000, achievementPoints: 50, skillPoints: 25 } },
            { requirement: 50, reward: { coins: 1000000, achievementPoints: 100, skillPoints: 50 } },
            { requirement: 75, reward: { coins: 5000000, achievementPoints: 150, skillPoints: 75 } },
            { requirement: 100, reward: { coins: 25000000, achievementPoints: 200, skillPoints: 100 } },
            { requirement: 150, reward: { coins: 100000000, achievementPoints: 300, skillPoints: 150 } },
            { requirement: 200, reward: { coins: 500000000, achievementPoints: 400, skillPoints: 200 } },
            { requirement: 250, reward: { coins: 1000000000, achievementPoints: 500, skillPoints: 250 } }
        ],

        FIGHTING_BOSSES: [
            {
                id: 'crude_ai',
                name: 'Crude AI',
                description: 'An unpolished, limited machine — slow and predictable',
                appearance: 'mech-raw',
                avatar: '🤖',
                health: 400,
                aggression: 0.2,
                attack: 30,
                defense: 5,
                reward: { coins: 250, skillPoints: 2, achievementPoints: 0 },
                progressionRewardPct: 0.10,
                progressionDefeatRequirement: 10,
                risk: 'low',
                specialMoves: [],
                behavior: [
                    { when: { always: true }, then: { weightedCategories: { light: 0.85, heavy: 0.15 } } }
                ],
                evilness: 0.15,
                unlockRequirement: 0,
                // By default Crude AI is not unlocked; it must be unlocked via random spawn defeats (2 defeats)
                initiallyUnlocked: false
            },
            {
                id: 'basic_ai',
                name: 'Basic AI',
                description: 'A simple automated intelligence',
                appearance: 'mech-light',
                avatar: '🤖',
                health: 1000,
                aggression: 0.35,
                attack: 50,
                defense: 10,
                reward: { coins: 1000, skillPoints: 5, achievementPoints: 1 },
                progressionRewardPct: 0.20,
                progressionDefeatRequirement: 10,
                risk: 'medium',
                specialMoves: [],
                evilness: 0.25,
                unlockRequirement: 0
            },
            {
                id: 'advanced_ai',
                name: 'Advanced AI',
                description: 'A sophisticated learning algorithm',
                appearance: 'mech-armored',
                avatar: '🦾',
                health: 5000,
                aggression: 0.55,
                attack: 150,
                defense: 50,
                reward: { coins: 5000, skillPoints: 15, achievementPoints: 3 },
                progressionRewardPct: 0.30,
                progressionDefeatRequirement: 10,
                risk: 'high',
                specialMoves: ['emp_burst'],
                // data-driven behavior rules for boss AI — evaluated top to bottom
                behavior: [
                    { when: { hpBelowPct: 0.4 }, then: { prefer: ['defend'], chance: 0.66 } },
                    { when: { hpBelowPct: 0.75 }, then: { prefer: ['emp_burst'], chance: 0.18 } },
                    { when: { always: true }, then: { weightedCategories: { heavy: 0.55, light: 0.35, ranged: 0.1 } } }
                ],
                evilness: 0.55,
                unlockRequirement: 0
            },
            {
                id: 'selfaware_ai',
                name: 'Selfaware AI',
                description: 'Emergent and adaptive intelligence — fast and dangerous',
                appearance: 'mech-advanced',
                avatar: '🧠',
                health: 20000,
                aggression: 0.75,
                attack: 400,
                defense: 120,
                reward: { coins: 15000, skillPoints: 30, achievementPoints: 8 },
                progressionRewardPct: 0.40,
                progressionDefeatRequirement: 10,
                risk: 'extreme',
                specialMoves: ['adaptive_protocol'],
                behavior: [
                    { when: { hpBelowPct: 0.5 }, then: { prefer: ['emp_burst','shield'], chance: 0.6 } },
                    { when: { always: true }, then: { weightedCategories: { heavy: 0.6, ranged: 0.25, light: 0.15 } } }
                ],
                evilness: 0.85,
                unlockRequirement: 0
            },
            {
                id: 'god_ai',
                name: 'GOD AI',
                description: 'A transcendent singularity — nearly invincible',
                appearance: 'mech-god',
                avatar: '👾',
                health: 60000,
                aggression: 0.95,
                attack: 1200,
                defense: 500,
                reward: { coins: 60000, skillPoints: 100, achievementPoints: 25 },
                progressionRewardPct: 0.60,
                progressionDefeatRequirement: 10,
                risk: 'legendary',
                specialMoves: ['apocalypse_protocol','mirror_shield'],
                behavior: [
                    { when: { hpBelowPct: 0.6 }, then: { prefer: ['mirror_shield'], chance: 0.5 } },
                    { when: { hpBelowPct: 0.2 }, then: { prefer: ['apocalypse_protocol'], chance: 0.4 } },
                    { when: { always: true }, then: { weightedCategories: { heavy: 0.5, ranged: 0.3, light: 0.2 } } }
                ],
                evilness: 0.99,
                unlockRequirement: 0
            },
            // duplicate 'selfaware_ai' removed
            // duplicate 'god_ai' removed
        ],

        FIGHTING_ATTACKS: [
            {
                id: 'basic_attack',
                name: 'Basic Attack',
                description: 'A quick sword strike — fast and reliable',
                damage: 100,
                accuracy: 0.92,
                cooldown: 900,
                staminaCost: 4,
                type: 'melee',
                actionCategory: 'light',
                speed: 400,
                stagger: 5,
                unlockSkill: 'basic_combat'
            },
            {
                id: 'power_attack',
                name: 'Power Attack',
                description: 'A slow heavy strike that deals large damage and can stagger',
                damage: 250,
                accuracy: 0.72,
                cooldown: 3000,
                staminaCost: 18,
                type: 'melee',
                actionCategory: 'heavy',
                speed: 1200,
                stagger: 30,
                unlockSkill: 'power_strike'
            },
            {
                id: 'arrow_volley',
                name: 'Arrow Volley',
                description: 'Fire multiple arrows at once (ranged)',
                damage: 150,
                accuracy: 0.8,
                cooldown: 2000,
                staminaCost: 10,
                type: 'ranged',
                actionCategory: 'ranged',
                speed: 700,
                stagger: 8,
                unlockSkill: 'archery'
            }
        ],
            // New core abilities / player gear (group under FIGHTING_GEAR for UI usage)
            FIGHTING_GEAR: {
                armor: [
                    { id: 'leather_armor', name: 'Leather Armor', defense: 10, cost: 1000, type: 'armor' },
                    { id: 'chainmail', name: 'Chainmail', defense: 25, cost: 5000, type: 'armor' },
                    { id: 'plate_armor', name: 'Plate Armor', defense: 50, cost: 25000, type: 'armor' },
                    { id: 'magic_armor', name: 'Magic Armor', defense: 100, cost: 100000, type: 'armor' }
                ],
                swords: [
                    { id: 'iron_sword', name: 'Iron Sword', attack: 20, cost: 1500, type: 'sword' },
                    { id: 'steel_sword', name: 'Steel Sword', attack: 50, cost: 7500, type: 'sword' },
                    { id: 'magic_sword', name: 'Magic Sword', attack: 100, cost: 37500, type: 'sword' },
                    { id: 'legendary_sword', name: 'Legendary Sword', attack: 200, cost: 150000, type: 'sword' }
                ],
                bows: [
                    { id: 'wooden_bow', name: 'Wooden Bow', attack: 15, cost: 1200, type: 'bow' },
                    { id: 'composite_bow', name: 'Composite Bow', attack: 40, cost: 6000, type: 'bow' },
                    { id: 'magic_bow', name: 'Magic Bow', attack: 80, cost: 30000, type: 'bow' },
                    { id: 'legendary_bow', name: 'Legendary Bow', attack: 160, cost: 120000, type: 'bow' }
                ]
            },

        // Recruitment system retired — single player gear/forge system replaces unit mechanics

        GUILD_ACHIEVEMENTS: [
            {
                id: 'guild_founder',
                name: 'Guild Founder',
                description: 'Create your first guild',
                icon: '🏰',
                category: 'guild',
                reward: { guildXP: 100, skillPoints: 5 },
                condition: (guild) => guild !== null
            },
            {
                id: 'guild_member_5',
                name: 'Growing Community',
                description: 'Reach 5 guild members',
                icon: '👥',
                category: 'guild',
                reward: { guildXP: 200, skillPoints: 10 },
                condition: (guild) => guild && guild.members.length >= 5
            },
            {
                id: 'guild_bank_10k',
                name: 'Treasure Hoarders',
                description: 'Collect 10,000 coins in guild bank',
                icon: '💰',
                category: 'guild',
                reward: { guildXP: 150, skillPoints: 8 },
                condition: (guild) => guild && guild.bank >= 10000
            },
            {
                id: 'guild_level_5',
                name: 'Elite Guild',
                description: 'Reach guild level 5',
                icon: '⭐',
                category: 'guild',
                reward: { guildXP: 300, skillPoints: 15 },
                condition: (guild) => guild && guild.level >= 5
            },
            {
                id: 'guild_click_challenge',
                name: 'Collective Clicking',
                description: 'Guild members click 10,000 times total',
                icon: '👆',
                category: 'guild',
                reward: { guildXP: 250, skillPoints: 12 },
                condition: (guild) => guild && (guild.totalClicks || 0) >= 10000
            },
            {
                id: 'guild_coin_contributors',
                name: 'Generous Contributors',
                description: '5 members contribute 1,000+ coins each',
                icon: '🎁',
                category: 'guild',
                reward: { guildXP: 400, skillPoints: 20 },
                condition: (guild) => guild && guild.members.filter(m => m.contribution >= 1000).length >= 5
            }
        ],

        // Daily Login Rewards - incentivize daily play
        DAILY_REWARDS: [
            { day: 1, reward: { coins: 1000, skillPoints: 1, achievementPoints: 1 }, bonus: "Welcome back!" },
            { day: 2, reward: { coins: 2000, skillPoints: 2, achievementPoints: 2 }, bonus: "Getting started!" },
            { day: 3, reward: { coins: 3000, skillPoints: 3, achievementPoints: 3 }, bonus: "Three in a row!" },
            { day: 4, reward: { coins: 5000, skillPoints: 4, achievementPoints: 4 }, bonus: "Building momentum!" },
            { day: 5, reward: { coins: 7500, skillPoints: 5, achievementPoints: 5 }, bonus: "Halfway there!" },
            { day: 6, reward: { coins: 10000, skillPoints: 6, achievementPoints: 6 }, bonus: "Almost there!" },
            { day: 7, reward: { coins: 15000, skillPoints: 8, achievementPoints: 8 }, bonus: "Week complete! 🎉" },
            { day: 8, reward: { coins: 20000, skillPoints: 10, achievementPoints: 10 }, bonus: "Bonus day!" },
            { day: 9, reward: { coins: 25000, skillPoints: 12, achievementPoints: 12 }, bonus: "Keeping it up!" },
            { day: 10, reward: { coins: 35000, skillPoints: 15, achievementPoints: 15 }, bonus: "Double digits! 🔥" },
            { day: 11, reward: { coins: 50000, skillPoints: 18, achievementPoints: 18 }, bonus: "Legendary streak!" },
            { day: 12, reward: { coins: 75000, skillPoints: 20, achievementPoints: 20 }, bonus: "Unstoppable!" },
            { day: 13, reward: { coins: 100000, skillPoints: 25, achievementPoints: 25 }, bonus: "Thirteenth heaven!" },
            { day: 14, reward: { coins: 125000, skillPoints: 30, achievementPoints: 30 }, bonus: "Two weeks! 🏆" },
            { day: 15, reward: { coins: 150000, skillPoints: 35, achievementPoints: 35 }, bonus: "Master player!" },
            { day: 16, reward: { coins: 200000, skillPoints: 40, achievementPoints: 40 }, bonus: "Beyond dedication!" },
            { day: 17, reward: { coins: 250000, skillPoints: 45, achievementPoints: 45 }, bonus: "Seventeen days!" },
            { day: 18, reward: { coins: 300000, skillPoints: 50, achievementPoints: 50 }, bonus: "Eighteen and thriving!" },
            { day: 19, reward: { coins: 400000, skillPoints: 55, achievementPoints: 55 }, bonus: "Nineteen days!" },
            { day: 20, reward: { coins: 500000, skillPoints: 60, achievementPoints: 60 }, bonus: "Twenty day champion! 👑" },
            { day: 21, reward: { coins: 750000, skillPoints: 70, achievementPoints: 70 }, bonus: "Three weeks! 🌟" },
            { day: 22, reward: { coins: 1000000, skillPoints: 80, achievementPoints: 80 }, bonus: "Millionaire streak!" },
            { day: 23, reward: { coins: 1250000, skillPoints: 90, achievementPoints: 90 }, bonus: "Twenty-three!" },
            { day: 24, reward: { coins: 1500000, skillPoints: 100, achievementPoints: 100 }, bonus: "Almost a month!" },
            { day: 25, reward: { coins: 2000000, skillPoints: 120, achievementPoints: 120 }, bonus: "Twenty-five days! 🎊" },
            { day: 26, reward: { coins: 2500000, skillPoints: 140, achievementPoints: 140 }, bonus: "Legendary!" },
            { day: 27, reward: { coins: 3000000, skillPoints: 160, achievementPoints: 160 }, bonus: "Twenty-seven!" },
            { day: 28, reward: { coins: 4000000, skillPoints: 180, achievementPoints: 180 }, bonus: "Twenty-eight!" },
            { day: 29, reward: { coins: 5000000, skillPoints: 200, achievementPoints: 200 }, bonus: "Twenty-nine!" },
            { day: 30, reward: { coins: 10000000, skillPoints: 250, achievementPoints: 250 }, bonus: "MONTH COMPLETE! 🏅" }
        ],

        // Prestige Milestones - special rewards at prestige levels
        PRESTIGE_MILESTONES: [
            { level: 1, reward: { achievementPoints: 5, skillPoints: 5 }, title: "First Prestige", desc: "You've transcended!" },
            { level: 5, reward: { achievementPoints: 15, skillPoints: 10 }, title: "Prestige Novice", desc: "Getting the hang of it!" },
            { level: 10, reward: { achievementPoints: 30, skillPoints: 20 }, title: "Prestige Adept", desc: "Double digits!" },
            { level: 25, reward: { achievementPoints: 50, skillPoints: 35 }, title: "Prestige Expert", desc: "Quarter century!" },
            { level: 50, reward: { achievementPoints: 100, skillPoints: 50 }, title: "Prestige Master", desc: "Halfway to legendary!" },
            { level: 100, reward: { achievementPoints: 200, skillPoints: 100 }, title: "Century Club", desc: "100 prestiges! 🏆" },
            { level: 250, reward: { achievementPoints: 500, skillPoints: 250 }, title: "Prestige Legend", desc: "Legendary status!" },
            { level: 500, reward: { achievementPoints: 1000, skillPoints: 500 }, title: "Prestige God", desc: "Divine transcendence!" },
            { level: 1000, reward: { achievementPoints: 2500, skillPoints: 1000 }, title: "Millennium Master", desc: "1000 prestiges! 👑" }
        ],

        // Daily Challenge templates - randomly selected each day
        DAILY_CHALLENGE_TEMPLATES: [
            // Clicking challenges (no scaling - fixed amounts)
            { id: 'click_50', icon: '👆', title: 'Clicker', desc: 'Click {target} times', target: 50, type: 'clicks', noScale: true, reward: { coins: 500, skillPoints: 1 } },
            { id: 'click_200', icon: '👆', title: 'Click Master', desc: 'Click {target} times', target: 200, type: 'clicks', noScale: true, reward: { coins: 2000, skillPoints: 2 } },
            { id: 'earn_10k', icon: '💰', title: 'Money Maker', desc: 'Earn {target} coins', target: 10000, type: 'coins_earned', reward: { coins: 5000, skillPoints: 2 } },
            { id: 'earn_100k', icon: '💰', title: 'Profit King', desc: 'Earn {target} coins', target: 100000, type: 'coins_earned', reward: { coins: 25000, skillPoints: 3 } },
            
            // Casino challenges
            { id: 'casino_5_games', icon: '🎰', title: 'Gambler', desc: 'Play {target} casino games', target: 5, type: 'casino_games', reward: { coins: 1000, skillPoints: 1 } },
            { id: 'casino_20_games', icon: '🎰', title: 'High Roller', desc: 'Play {target} casino games', target: 20, type: 'casino_games', reward: { coins: 5000, skillPoints: 2 } },
            { id: 'casino_win_5k', icon: '🏆', title: 'Winner', desc: 'Win {target} coins in casino', target: 5000, type: 'casino_won', reward: { coins: 3000, skillPoints: 2 } },
            { id: 'casino_wager_10k', icon: '💸', title: 'Big Spender', desc: 'Wager {target} coins', target: 10000, type: 'casino_wagered', reward: { coins: 2500, skillPoints: 1 } },
            
            // Server challenges
            { id: 'buy_server', icon: '🖥️', title: 'Server Admin', desc: 'Buy {target} servers', target: 1, type: 'servers_bought', reward: { coins: 1500, skillPoints: 1 } },
            { id: 'buy_5_servers', icon: '🖥️', title: 'Data Center', desc: 'Buy {target} servers', target: 5, type: 'servers_bought', reward: { coins: 5000, skillPoints: 2 } },
            
            // Power challenges
            { id: 'place_generator', icon: '⚡', title: 'Power Up', desc: 'Place {target} generators', target: 1, type: 'generators_placed', reward: { coins: 1000, skillPoints: 1 } },
            { id: 'upgrade_generator', icon: '⬆️', title: 'Supercharge', desc: 'Upgrade generators {target} times', target: 3, type: 'generators_upgraded', reward: { coins: 2000, skillPoints: 1 } },
            
            // Research challenges
            { id: 'research_1', icon: '🔬', title: 'Researcher', desc: 'Complete {target} research', target: 1, type: 'research_completed', reward: { coins: 3000, skillPoints: 2 } },
            
            // Special challenges
            { id: 'spend_coins', icon: '🛒', title: 'Shopper', desc: 'Spend {target} coins', target: 50000, type: 'coins_spent', reward: { coins: 15000, skillPoints: 2 } },
            { id: 'passive_earn', icon: '💤', title: 'Passive Income', desc: 'Earn {target} coins from servers', target: 5000, type: 'passive_earned', reward: { coins: 2500, skillPoints: 1 } }
        ],

        // Skill Tree Definitions
        SKILL_TREES: {
            // Clicking Tree
            click_power_1: { tree: 'clicking', tier: 1, cost: 10, requires: [], effect: { clickPower: 0.25 }, name: 'Strong Fingers', desc: '+25% click power' },
            click_speed_1: { tree: 'clicking', tier: 1, cost: 10, requires: [], effect: { clickSpeed: 0.10 }, name: 'Quick Clicks', desc: 'Clicks register 10% faster' },
            click_power_2: { tree: 'clicking', tier: 2, cost: 25, requires: ['click_power_1'], effect: { clickPower: 0.50 }, name: 'Iron Grip', desc: '+50% click power' },
            click_combo: { tree: 'clicking', tier: 2, cost: 25, requires: ['click_speed_1'], effect: { comboEnabled: true }, name: 'Combo Master', desc: 'Fast clicks build combo multiplier' },
            click_synergy_1: { tree: 'clicking', tier: 2, cost: 40, requires: ['click_power_1', 'click_speed_1'], effect: { clickPower: 0.20, clickSpeed: 0.20 }, synergy: true, name: 'Click Synergy', desc: 'SYNERGY: +20% to both paths' },
            click_power_3: { tree: 'clicking', tier: 3, cost: 60, requires: ['click_power_2'], effect: { clickPower: 1.00 }, name: 'Mechanical Arms', desc: '+100% click power' },
            auto_click: { tree: 'clicking', tier: 3, cost: 75, requires: ['click_combo'], effect: { autoClick: 1 }, name: 'Auto Clicker', desc: '1 automatic click per second' },
            click_ultimate: { tree: 'clicking', tier: 4, cost: 150, requires: ['click_power_3', 'auto_click', 'click_synergy_1'], effect: { clickPassive: 0.01 }, ultimate: true, name: 'Click Mastery', desc: 'Clicks also trigger 1% of passive income' },
            
            // Production Tree
            server_boost_1: { tree: 'production', tier: 1, cost: 10, requires: [], effect: { serverOutput: 0.20 }, name: 'Server Optimization', desc: '+20% server output' },
            power_efficiency_1: { tree: 'production', tier: 1, cost: 10, requires: [], effect: { powerEfficiency: 0.15 }, name: 'Power Efficiency', desc: '-15% power consumption' },
            server_boost_2: { tree: 'production', tier: 2, cost: 25, requires: ['server_boost_1'], effect: { serverOutput: 0.40 }, name: 'Data Center', desc: '+40% server output' },
            battery_boost: { tree: 'production', tier: 2, cost: 25, requires: ['power_efficiency_1'], effect: { batteryCapacity: 0.50 }, name: 'Battery Tech', desc: '+50% battery capacity' },
            prod_synergy_1: { tree: 'production', tier: 2, cost: 40, requires: ['server_boost_1', 'power_efficiency_1'], effect: { serverPerGenerator: 0.01 }, synergy: true, name: 'Efficient Servers', desc: 'SYNERGY: Servers gain +1% per generator' },
            server_boost_3: { tree: 'production', tier: 3, cost: 60, requires: ['server_boost_2'], effect: { serverOutput: 0.75 }, name: 'Global Network', desc: '+75% server output' },
            solar_power: { tree: 'production', tier: 3, cost: 60, requires: ['battery_boost'], effect: { powerGeneration: 0.25 }, name: 'Solar Arrays', desc: '+25% power generation' },
            prod_ultimate: { tree: 'production', tier: 4, cost: 150, requires: ['server_boost_3', 'solar_power', 'prod_synergy_1'], effect: { productionMultiplier: 2.0 }, ultimate: true, name: 'Quantum Computing', desc: 'Double all production' },
            
            // Fighting Tree
            combat_power_1: { tree: 'fighting', tier: 1, cost: 10, requires: [], effect: { combatDamage: 0.25 }, name: 'Combat Training', desc: '+25% boss damage' },
            defense_1: { tree: 'fighting', tier: 1, cost: 10, requires: [], effect: { damageReduction: 0.15 }, name: 'Armor Plating', desc: '-15% boss damage taken' },
            combat_power_2: { tree: 'fighting', tier: 2, cost: 25, requires: ['combat_power_1'], effect: { combatDamage: 0.50 }, name: 'Power Strike', desc: '+50% boss damage' },
            health_boost: { tree: 'fighting', tier: 2, cost: 25, requires: ['defense_1'], effect: { bossTimeBonus: 5 }, name: 'Extended Battle', desc: '+5 seconds per boss fight' },
            fighting_synergy_1: { tree: 'fighting', tier: 2, cost: 40, requires: ['combat_power_1', 'defense_1'], effect: { vampiric: 0.05 }, synergy: true, name: 'Vampiric Strike', desc: 'SYNERGY: 5% of damage heals the timer' },
            crit_chance: { tree: 'fighting', tier: 3, cost: 60, requires: ['combat_power_2'], effect: { critChance: 0.15 }, name: 'Critical Eye', desc: '15% chance for 2x damage' },
            boss_rewards: { tree: 'fighting', tier: 3, cost: 60, requires: ['health_boost'], effect: { bossRewardBonus: 0.50 }, name: 'Bounty Hunter', desc: '+50% boss rewards' },
            spartan: { tree: 'fighting', tier: 3, cost: 60, requires: ['combat_power_2', 'health_boost'], effect: { unlockFightingTab: true }, name: 'Spartan', desc: 'Unlocks the Fighting Tab' },
            fighting_ultimate: { tree: 'fighting', tier: 4, cost: 150, requires: ['crit_chance', 'boss_rewards', 'spartan', 'fighting_synergy_1'], effect: { bossSlayer: true }, ultimate: true, name: 'Boss Slayer', desc: 'Deal 2x damage and earn 2x rewards from bosses' },
            
            // Prestige Tree
            prestige_boost_1: { tree: 'prestige', tier: 1, cost: 10, requires: [], effect: { prestigePoints: 0.20 }, name: 'Prestige Power', desc: '+20% prestige points' },
            sp_boost_1: { tree: 'prestige', tier: 1, cost: 10, requires: [], effect: { skillPointGain: 0.15 }, name: 'Quick Learner', desc: '+15% skill point gain' },
            prestige_boost_2: { tree: 'prestige', tier: 2, cost: 25, requires: ['prestige_boost_1'], effect: { prestigePoints: 0.40 }, name: 'Stellar Rise', desc: '+40% prestige points' },
            ascension_prep: { tree: 'prestige', tier: 2, cost: 25, requires: ['sp_boost_1'], effect: { ascensionReduction: 0.10 }, name: 'Ascension Prep', desc: '-10% ascension requirements' },
            prestige_synergy_1: { tree: 'prestige', tier: 2, cost: 40, requires: ['prestige_boost_1', 'sp_boost_1'], effect: { keepCoinsPercent: 0.01 }, synergy: true, name: 'Reborn Stronger', desc: 'SYNERGY: Keep 1% of coins on prestige' },
            prestige_boost_3: { tree: 'prestige', tier: 3, cost: 60, requires: ['prestige_boost_2'], effect: { prestigePoints: 0.75 }, name: 'Cosmic Power', desc: '+75% prestige points' },
            transcend_prep: { tree: 'prestige', tier: 3, cost: 60, requires: ['ascension_prep'], effect: { transcendReduction: 0.10 }, name: 'Beyond Limits', desc: '-10% transcendence requirements' },
            prestige_ultimate: { tree: 'prestige', tier: 4, cost: 150, requires: ['prestige_boost_3', 'transcend_prep', 'prestige_synergy_1'], effect: { allProgressionBonus: 0.25 }, ultimate: true, name: 'Eternal Progress', desc: 'All progression bonuses +25%' }
        },

        PRESTIGE_UPGRADES: {
            'betterclicks': {
                name: '+1% Click Power per Prestige Point',
                baseCost: 75,
                costMultiplier: 1.6,
                effect: (game, level) => {
                    return { clickMultiplier: 1 + (game.state.prestigePoints * 0.01) }
                }
            },
            'bettermining': {
                name: '+2% Server Output per Prestige Point',
                baseCost: 150,
                costMultiplier: 1.6,
                effect: (game, level) => {
                    return { miningMultiplier: 1 + (game.state.prestigePoints * 0.02) }
                }
            },
            'powerboost': {
                name: '+1 Power per Generator',
                baseCost: 225,
                costMultiplier: 1.6,
                effect: (level) => {
                    return { powerBoost: level }
                }
            },
            'network_capacity': {
                name: 'Power Network Capacity',
                description: 'Increase reported network capacity by 10,000 W per level.',
                baseCost: 50,
                costMultiplier: 1.6,
                effect: (level) => {
                    return { networkCapacityPerLevel: 10000 * level };
                }
            },
            'coinmagnet': {
                name: 'Earn 1% of mined coins as bonus',
                baseCost: 350,
                costMultiplier: 1.6,
                effect: (level) => {
                    return { coinMagnet: level * 0.01 }
                }
            },
            'startingcoins': {
                name: 'Start with bonus coins after prestige',
                baseCost: 500,
                costMultiplier: 1.8,
                effect: (level) => {
                    return { startingCoins: level * 2500 }
                }
            },
            'luckybonus': {
                name: '+2% Skill Point gain',
                baseCost: 750,
                costMultiplier: 2.0,
                effect: (level) => {
                    return { skillPointBonus: level * 0.02 }
                }
            }
        },

        // Ascension Upgrades (require 10+ prestiges)
        ASCENSION_UPGRADES: {
            'ascendedpower': {
                name: 'Ascended Power',
                description: '+10% all earnings per Ascension level',
                baseCost: 8,
                costMultiplier: 2.2,
                maxLevel: 10,
                effect: (level, game) => ({ globalMultiplier: 1 + (game.state.ascensionLevel * 0.1 * level) })
            },
            'timewarped': {
                name: 'Time Warp',
                description: 'Offline earnings +25% per level',
                baseCost: 15,
                costMultiplier: 2.5,
                maxLevel: 5,
                effect: (level) => ({ offlineMultiplier: 1 + (level * 0.25) })
            },
            'autoclick': {
                name: 'Auto Clicker',
                description: 'Automatic clicks per second',
                baseCost: 25,
                costMultiplier: 3.0,
                maxLevel: 10,
                effect: (level) => ({ autoClicks: level })
            },
            'megapower': {
                name: 'Mega Power Grid',
                description: '+2 power grid slots per level',
                baseCost: 35,
                costMultiplier: 2.2,
                maxLevel: 5,
                effect: (level) => ({ bonusGridSlots: level * 2 })
            },
            'goldentouch': {
                name: 'Golden Touch',
                description: '+1% of lifetime coins per click',
                baseCost: 80,
                costMultiplier: 3.0,
                maxLevel: 5,
                effect: (level) => ({ goldenTouch: level * 0.01 })
            },
            'autorepair': {
                name: 'Auto-Repair Systems',
                description: 'Automatically repairs server corruption',
                baseCost: 50,
                costMultiplier: 2.0,
                maxLevel: 3,
                effect: (level) => ({ autoRepairRate: level * 2 }) // 2/4/6% repair per tick
            }
        },

        // Fighting upgrades (stamina, regen)
        FIGHTING_UPGRADES: {
            'stamina_capacity': {
                name: 'Stamina Capacity',
                description: 'Increase maximum stamina by +10 per level',
                baseCost: 100,
                costMultiplier: 1.8,
                effect: (level) => ({ staminaMax: 10 * level })
            },
            'stamina_regen': {
                name: 'Stamina Regeneration',
                description: 'Increase stamina regen by +1 per second per level',
                baseCost: 150,
                costMultiplier: 2.0,
                effect: (level) => ({ staminaRegen: 1 * level })
            },
                // recruitment_capacity removed — recruitment mechanics replaced by forge/gear
        },

        // Transcendence Upgrades (require 5+ ascensions)
        TRANSCENDENCE_UPGRADES: {
            'spacestation': {
                name: 'Orbital Space Station',
                description: 'Unlock a space station with 3 server racks and 50% efficiency bonus',
                baseCost: 50,
                costMultiplier: 1,
                maxLevel: 1,
                effect: (level, game) => {
                    if (level > 0) {
                        game.unlockSpaceStation();
                    }
                    return { spaceStationUnlocked: level > 0 };
                }
            },
            'infinitepower': {
                name: 'Infinite Power',
                description: 'All power costs reduced by 20% per level',
                baseCost: 5,
                costMultiplier: 3.5,
                maxLevel: 5,
                effect: (level) => ({ powerCostReduction: level * 0.2 })
            },
            'cosmicmultiplier': {
                name: 'Cosmic Multiplier',
                description: 'All multipliers are 50% more effective',
                baseCost: 10,
                costMultiplier: 4.5,
                maxLevel: 3,
                effect: (level) => ({ cosmicBoost: 1 + (level * 0.5) })
            },
            'eternalgrowth': {
                name: 'Eternal Growth',
                description: 'Prestige points earned +100% per level',
                baseCost: 20,
                costMultiplier: 5.0,
                maxLevel: 3,
                effect: (level) => ({ prestigeBoost: 1 + level })
            }
        },

        // Unlockable Content Milestones
        UNLOCKABLES: {
            'darkTheme': { name: 'Dark Theme', description: 'Unlock dark color theme', requirement: { type: 'prestigeLevel', value: 1 }, icon: '🌙' },
            'autoSave': { name: 'Auto Save+', description: 'Faster auto-save (2s)', requirement: { type: 'prestigeLevel', value: 2 }, icon: '💾' },
            'bulkBuy': { name: 'Bulk Buy x100', description: 'Buy 100 at once', requirement: { type: 'prestigeLevel', value: 3 }, icon: '📦' },
            'offlineBonus': { name: 'Offline Earnings', description: 'Earn while away', requirement: { type: 'prestigeLevel', value: 5 }, icon: '💤' },
            'luckyEvents': { name: 'Lucky Events', description: 'Random bonus events', requirement: { type: 'coins', value: 1000000 }, icon: '🍀' },
            'megaSlots': { name: 'Mega Slots', description: 'Play Mega Slots casino', requirement: { type: 'casinoGamesPlayed', value: 100 }, icon: '🎰' },
            'vipCasino': { name: 'VIP Casino', description: 'Higher stakes games', requirement: { type: 'casinoTotalWon', value: 100000 }, icon: '👑' },
            'serverFarm': { name: 'Server Farm', description: 'Bulk server management', requirement: { type: 'totalServers', value: 50 }, icon: '🏭' },
            'powerPlant': { name: 'Power Plant', description: 'Enhanced power grid', requirement: { type: 'totalGenerators', value: 20 }, icon: '⚡' },
            'researchLab': { name: 'Research Lab+', description: 'Faster research', requirement: { type: 'researchCompleted', value: 10 }, icon: '🔬' },
            'ascensionReady': { name: 'Ascension Ready', description: 'Unlock Ascension', requirement: { type: 'prestigeLevel', value: 10 }, icon: '🌟' },
            'transcendenceReady': { name: 'Transcendence Ready', description: 'Unlock Transcendence', requirement: { type: 'ascensionLevel', value: 5 }, icon: '✨' },
            'goldenAura': { name: 'Golden Aura', description: '+5% all earnings permanently', requirement: { type: 'totalCoinsEarned', value: 10000000 }, icon: '✨' },
            'diamondStatus': { name: 'Diamond Status', description: 'Exclusive rewards', requirement: { type: 'achievements', value: 50 }, icon: '💎' }
        }
    },

    /**
     * Initialize the game
     */
    init() {
        // Idempotent init: prevent double initialization from multiple DOMContentLoaded handlers
        if (this._initCalled) {
            console.log('GAME.init: already initialized — skipping');
            return;
        }
        this._initCalled = true;
        console.log('Initializing HOSTX Coin Game...');
        this.loadGame();
        this.initializeUpgrades();
        this.initializeServers();
        // Don't start game loop yet - wait for UI.init()
        this.startSaveLoop();
    },

    /**
     * Initialize click upgrades
     */
    initializeUpgrades() {
        for (const [key, config] of Object.entries(this.CONFIG.CLICK_UPGRADES)) {
            if (!this.state.clickUpgrades[key]) {
                this.state.clickUpgrades[key] = {
                    level: 0,
                    purchased: 0
                };
            }
        }

        // Ensure fighting upgrades storage exists and apply their effects
        if (!this.state.fightingUpgrades) this.state.fightingUpgrades = {};
        // Apply fighting upgrade effects now to ensure state values reflect upgrades
        this.applyFightingUpgrades();
    },

    /**
     * Initialize servers
     */
    initializeServers() {
        for (const [key, config] of Object.entries(this.CONFIG.SERVERS)) {
            if (!this.state.servers[key]) {
                this.state.servers[key] = {
                    count: 0,
                    level: 0
                };
            }
        }
    },

    /**
     * Handle coin click
     */
    clickCoin(multiplier = 1) {
        const skillEffects = this.getSkillEffects();
        const basePower = this.state.clickPower;
        const skillMultiplier = 1 + (skillEffects.clickPowerBonus || 0);
        const bonusMultiplier = 1 + (this.state.clickUpgrades.clickbonus?.level || 0) * 0.1;
        const prestigeMultiplier = 1 + (this.state.prestigePoints * 0.01);
        const darkModeMultiplier = this.getEarningsMultiplier();
        const totalPower = basePower * skillMultiplier * bonusMultiplier * prestigeMultiplier * darkModeMultiplier * multiplier;
        
        this.state.coins += totalPower;
        this.state.totalCoinsEarned += totalPower;
        
        // Apply click passive effect (clicks also trigger passive income)
        if (skillEffects.clickPassive > 0) {
            const passiveIncome = this.getTotalProduction() * skillEffects.clickPassive;
            this.state.coins += passiveIncome;
            this.state.totalCoinsEarned += passiveIncome;
            this.updateDailyProgress('coins_earned', passiveIncome);
        }
        
        // Stats tracking
        if (this.state.stats) {
            this.state.stats.totalClicks = (this.state.stats.totalClicks || 0) + 1;
        }
        
        // Guild click tracking
        if (this.state.guild) {
            this.state.guild.totalClicks = (this.state.guild.totalClicks || 0) + 1;
        }
        
        // Daily challenge tracking
        this.updateDailyProgress('clicks', 1);
        this.updateDailyProgress('coins_earned', totalPower);
        
        // Trigger effect
        UI.createCoinParticle(totalPower);
        UI.playSound('click');
    },

    /**
     * Calculate per-click earnings
     */
    getClickPower() {
        const basePower = this.state.clickPower;
        const skillEffects = this.getSkillEffects();
        const skillMultiplier = 1 + (skillEffects.clickPowerBonus || 0);
        const bonusMultiplier = 1 + (this.state.clickUpgrades.clickbonus?.level || 0) * 0.1;
        const prestigeMultiplier = 1 + (this.state.prestigePoints * 0.01);
        const darkModeMultiplier = this.getEarningsMultiplier();
        return basePower * skillMultiplier * bonusMultiplier * prestigeMultiplier * darkModeMultiplier;
    },

    /**
     * Buy a click upgrade
     */
    buyClickUpgrade(upgradeKey) {
        const config = this.CONFIG.CLICK_UPGRADES[upgradeKey];
        const current = this.state.clickUpgrades[upgradeKey];
        const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, current.level));

        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            current.level += 1;
            current.purchased += 1;

            // Apply effect
            const effect = config.effect(current.level);
            if (effect.clickPower) {
                this.state.clickPower += effect.clickPower;
            }

            UI.playSound('upgrade');
            this.checkAchievements();
            return true;
        }
        return false;
    },

    /**
     * Get the cost for a fighting upgrade
     */
    getFightingUpgradeCost(upgradeKey) {
        const config = this.CONFIG.FIGHTING_UPGRADES[upgradeKey];
        if (!config) return Infinity;
        const current = this.state.fightingUpgrades[upgradeKey] || { level: 0 };
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, current.level));
    },

    /**
    * Buy a fighting upgrade (stamina capacity / regen)
     */
    buyFightingUpgrade(upgradeKey) {
        const config = this.CONFIG.FIGHTING_UPGRADES[upgradeKey];
        if (!config) return false;

        if (!this.state.fightingUpgrades[upgradeKey]) this.state.fightingUpgrades[upgradeKey] = { level: 0 };
        const current = this.state.fightingUpgrades[upgradeKey];
        const cost = this.getFightingUpgradeCost(upgradeKey);

        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            current.level += 1;
            // Apply immediate effects
            this.applyFightingUpgrades();
            UI.playSound('upgrade');
            return true;
        }
        return false;
    },

    /**
     * Get the current level of a fighting upgrade
     */
    getFightingUpgradeLevel(upgradeKey) {
        return (this.state.fightingUpgrades && this.state.fightingUpgrades[upgradeKey]) ? this.state.fightingUpgrades[upgradeKey].level : 0;
    },

    /**
    * Apply fighting upgrade effects to state values (stamina max/regen)
     */
    applyFightingUpgrades() {
        // Base values
        const baseMax = 50;
        const baseRegen = 1;
        const baseCapacity = 50;

        // recruitment_capacity removed; only stamina levels affect fighting state now
        const staminaLevel = this.getFightingUpgradeLevel('stamina_capacity');
        const regenLevel = this.getFightingUpgradeLevel('stamina_regen');

        // Additive increases
        this.state.fightingStaminaMax = baseMax + (staminaLevel * 10);
        this.state.fightingStaminaRegen = baseRegen + (regenLevel * 1);
        // recruitmentCapacity removed (no-op)

        // Clamp current stamina to new max
        if (this.state.fightingStamina > this.state.fightingStaminaMax) {
            this.state.fightingStamina = this.state.fightingStaminaMax;
        }
    },

    /**
     * Get the cost of a click upgrade
     */
    getClickUpgradeCost(upgradeKey) {
        const config = this.CONFIG.CLICK_UPGRADES[upgradeKey];
        const current = this.state.clickUpgrades[upgradeKey];
        const baseCost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, current.level));
        return Math.floor(baseCost * this.getCostMultiplier());
    },

    /**
     * Get server production per second
     */
    getServerProduction(serverKey) {
        const serverData = this.state.servers[serverKey];
        const config = this.CONFIG.SERVERS[serverKey];
        const baseHashRate = config.baseHashRate * serverData.count;
        const miningMultiplier = 1 + (this.state.prestigePoints * 0.02);
        return baseHashRate * miningMultiplier;
    },

    /**
     * Get server hash rate per second
     */
    getServerHashRate(serverKey) {
        return this.getServerProduction(serverKey);
    },

    /**
     * Get total production per second from all servers
     */
    getTotalProduction() {
        let total = 0;
        
        // Get skill tree effects
        const skillEffects = this.getSkillEffects();
        const serverBonus = skillEffects.serverBonus || 0;
        const productionMultiplier = skillEffects.productionMultiplier || 1;
        const serverPerGenerator = skillEffects.serverPerGenerator || 0;
        const generatorCount = this.state.powerGenerators.length;
        
        // Calculate production from placed servers in all buildings (includes worker bonuses)
        for (const [buildingId, building] of Object.entries(this.state.buildings)) {
            // Skip production if rack is powered down or power is insufficient
            if (building.rackPoweredDown || this.isPowerCritical()) {
                continue;
            }
            
            // Get building efficiency bonus (Space Station has 50% bonus)
            const buildingEfficiency = building.isSpaceStation ? 1.5 : 1.0;
            
            // Get corruption penalty for this building
            const corruptionPenalty = this.getCorruptionPenalty(buildingId);
            const corruptionMultiplier = 1 - corruptionPenalty; // e.g., 0.9 at 20% corruption
            
            for (const server of building.placedServers) {
                const config = this.CONFIG.SERVERS[server.type];
                const workerMultiplier = server.hasWorker ? 1.5 : 1.0; // 50% boost with worker
                const skillMultiplier = 1 + serverBonus; // Apply server bonus from skill tree
                const generatorBonus = 1 + (serverPerGenerator * generatorCount); // Apply per-generator bonus
                total += config.baseHashRate * workerMultiplier * buildingEfficiency * corruptionMultiplier * skillMultiplier * generatorBonus;
            }
        }
        
        // Add prestige multiplier
        const miningMultiplier = 1 + (this.state.prestigePoints * 0.02);
        total *= miningMultiplier;
        
        // Add passive bonus from click upgrades
        const doubleClick = (this.state.clickUpgrades.doubleclick?.level || 0) * 0.05;
        if (doubleClick > 0) {
            total += total * doubleClick;
        }
        
        // Apply skill tree production multiplier (Quantum Computing)
        total *= productionMultiplier;
        
        // Apply dark mode earnings multiplier
        total *= this.getEarningsMultiplier();
        
        return total;
    },

    /**
     * VIP SYSTEM FUNCTIONS
     */
    
    // VIP tier definitions
    VIP_TIERS: {
        bronze: { name: 'Bronze', icon: '🥉', minLevel: 1, maxLevel: 4, winBonus: 0.1, cashback: 1, freeSpins: 1, jackpotBonus: 0 },
        silver: { name: 'Silver', icon: '🥈', minLevel: 5, maxLevel: 9, winBonus: 0.15, cashback: 2, freeSpins: 2, jackpotBonus: 0 },
        gold: { name: 'Gold', icon: '🥇', minLevel: 10, maxLevel: 14, winBonus: 0.2, cashback: 3, freeSpins: 3, jackpotBonus: 5 },
        platinum: { name: 'Platinum', icon: '💎', minLevel: 15, maxLevel: 19, winBonus: 0.25, cashback: 5, freeSpins: 5, jackpotBonus: 10 },
        diamond: { name: 'Diamond', icon: '👑', minLevel: 20, maxLevel: Infinity, winBonus: 0.35, cashback: 8, freeSpins: 10, jackpotBonus: 20 }
    },
    
    getVipTier() {
        const level = this.state.vipLevel || 1;
        for (const [tierId, tier] of Object.entries(this.VIP_TIERS)) {
            if (level >= tier.minLevel && level <= tier.maxLevel) {
                return { id: tierId, ...tier };
            }
        }
        return { id: 'bronze', ...this.VIP_TIERS.bronze };
    },
    
    getVipXpRequired(level) {
        // XP needed scales exponentially but capped to prevent overflow
        // Use a hybrid approach: exponential until level 50, then linear scaling
        if (level <= 50) {
            return Math.floor(1000 * Math.pow(1.5, level - 1));
        } else {
            // At level 50: ~1.5^49 * 1000 ≈ 2.18e+11
            const baseXpAt50 = Math.floor(1000 * Math.pow(1.5, 49));
            const additionalLevels = level - 50;
            // Much slower linear scaling to prevent overflow
            return Math.floor(baseXpAt50 + (additionalLevels * 1000000000)); // 1 billion per level
        }
    },
    
    addVipXp(amount) {
        this.state.vipXp += amount;
        
        // Check for level up
        let xpNeeded = this.getVipXpRequired(this.state.vipLevel);
        while (this.state.vipXp >= xpNeeded) {
            this.state.vipXp -= xpNeeded;
            this.state.vipLevel++;
            xpNeeded = this.getVipXpRequired(this.state.vipLevel);
            
            // Notify level up
            if (typeof UI !== 'undefined' && UI.showFloatingText) {
                UI.showFloatingText(`VIP Level Up! Level ${this.state.vipLevel}`, 'gold');
            }
        }
    },
    
    getVipWinBonus() {
        const tier = this.getVipTier();
        const level = this.state.vipLevel || 1;
        
        // Cap Diamond tier win bonus at 10% (0.10) instead of scaling infinitely
        if (tier.id === 'diamond') {
            return 0.10;
        }
        
        // Round to 1 decimal place
        return Math.round(tier.winBonus * level * 10) / 10;
    },
    
    getVipCashback() {
        const tier = this.getVipTier();
        return tier.cashback;
    },
    
    getVipFreeSpins() {
        const tier = this.getVipTier();
        return tier.freeSpins;
    },
    
    getVipJackpotBonus() {
        const tier = this.getVipTier();
        return tier.jackpotBonus;
    },
    
    getVipDailyReward() {
        const tier = this.getVipTier();
        const level = this.state.vipLevel || 1;
        // Base reward scales with level and tier
        const tierMultipliers = { bronze: 1, silver: 2, gold: 5, platinum: 10, diamond: 25 };
        const reward = 1000 * level * (tierMultipliers[tier.id] || 1);
        
        // Cap Diamond tier daily reward at 10 million to prevent overflow
        if (tier.id === 'diamond') {
            return Math.min(reward, 10000000);
        }
        
        return reward;
    },
    
    canClaimVipDaily() {
        if (!this.state.vipDailyClaimTime) return true;
        const lastClaim = new Date(this.state.vipDailyClaimTime);
        const now = new Date();
        // Reset at midnight
        return now.toDateString() !== lastClaim.toDateString();
    },
    
    claimVipDaily() {
        if (!this.canClaimVipDaily()) return 0;
        
        const reward = this.getVipDailyReward();
        this.state.coins += reward;
        this.state.vipDailyClaimTime = Date.now();
        this.saveGame();
        return reward;
    },
    
    /**
     * JACKPOT SYSTEM FUNCTIONS
     */
    
    JACKPOT_CONFIG: {
        spinCost: 100000,
        poolContribution: 0.25, // 25% of bets go to jackpot pool
        baseWinChance: 0.001, // 0.1% base chance per ticket
        maxTickets: 100 // Cap tickets for fairness
    },
    
    addToJackpotPool(amount) {
        this.state.jackpotPool += Math.floor(amount * this.JACKPOT_CONFIG.poolContribution);
    },
    
    buyJackpotTicket() {
        const cost = this.JACKPOT_CONFIG.spinCost;
        if (this.state.coins < cost) return false;
        
        this.state.coins -= cost;
        this.state.jackpotPool += Math.floor(cost * 0.8); // 80% goes to pool
        this.state.jackpotTickets = Math.min(
            (this.state.jackpotTickets || 0) + 1,
            this.JACKPOT_CONFIG.maxTickets
        );
        
        // Add VIP XP for jackpot spin
        this.addVipXp(50);
        
        return true;
    },
    
    getJackpotWinChance() {
        const tickets = this.state.jackpotTickets || 0;
        const vipBonus = 1 + (this.getVipJackpotBonus() / 100);
        return Math.min(tickets * this.JACKPOT_CONFIG.baseWinChance * vipBonus, 0.1); // Max 10% chance
    },
    
    spinJackpot() {
        if (this.state.jackpotTickets <= 0) return { won: false, amount: 0 };
        
        const winChance = this.getJackpotWinChance();
        const roll = Math.random();
        
        if (roll < winChance) {
            // JACKPOT WIN!
            const winAmount = this.state.jackpotPool;
            this.state.coins += winAmount;
            this.state.jackpotHistory.push({
                amount: winAmount,
                date: Date.now(),
                tickets: this.state.jackpotTickets
            });
            
            // Reset jackpot
            this.state.jackpotPool = 10000; // Starting pool
            this.state.jackpotTickets = 0;
            
            // Massive VIP XP for jackpot win
            this.addVipXp(winAmount / 10);
            
            this.saveGame();
            return { won: true, amount: winAmount };
        }
        
        // Lose one ticket per spin attempt
        this.state.jackpotTickets = Math.max(0, this.state.jackpotTickets - 1);
        this.saveGame();
        return { won: false, amount: 0 };
    },

    /**
     * Get hash rate production per second (in hashes/second)
     * Servers produce hashes directly
     */
    getHashRate() {
        // Return total hash rate production directly
        const production = this.getTotalProduction();
        return production; // Already in hashes per second
    },

    /**
     * Earn skill points (earned through achievements and milestones)
     */
    earnSkillPoints(amount) {
        // Calculate prestige skill point bonus
        let prestigeBonus = 0;
        for (const [upgradeKey, upgradeData] of Object.entries(this.state.prestigeUpgrades)) {
            if (upgradeData.level > 0) {
                const config = this.CONFIG.PRESTIGE_UPGRADES[upgradeKey];
                if (config && config.effect) {
                    const effect = config.effect(this, upgradeData.level);
                    if (effect.skillPointBonus) {
                        prestigeBonus += effect.skillPointBonus;
                    }
                }
            }
        }
        
        // Apply prestige bonus first
        if (prestigeBonus > 0) {
            amount = Math.floor(amount * (1 + prestigeBonus));
        }
        
        // Apply game mode skill point divisor
        const divisor = this.getSkillPointDivisor();
        if (divisor > 1) {
            amount = Math.max(1, Math.floor(amount / divisor));
        }
        this.state.skillPoints += amount;
        this.state.totalSkillPointsEarned += amount;
    },

    /**
     * Get skill level from skill tree
     */
    getSkillLevel(treeId, skillId) {
        const key = `${treeId}_${skillId}`;
        const val = (this.state.skillTreeLevels && this.state.skillTreeLevels[key]) ? this.state.skillTreeLevels[key] : 0;
        // return the level (no debug logging)
        return val;
    },

    /**
     * Check if a skill's prerequisites are met
     */
    canUnlockSkill(treeId, skillId) {
        const tree = this.CONFIG.SKILL_TREES[treeId];
        if (!tree) return false;
        
        const skill = tree.skills[skillId];
        if (!skill) return false;
        
        const currentLevel = this.getSkillLevel(treeId, skillId);
        
        // Check if already maxed
        if (currentLevel >= skill.maxLevel) return false;
        
        // Check prerequisites
        if (skill.requires) {
            for (const reqSkillId of skill.requires) {
                if (this.getSkillLevel(treeId, reqSkillId) === 0) {
                    return false;
                }
            }
        }
        
        // Check cost
        const cost = this.getSkillCost(treeId, skillId);
        if (this.state.skillPoints < cost) return false;
        
        return true;
    },

    /**
     * Get skill cost (increases with level)
     */
    getSkillCost(treeId, skillId) {
        const tree = this.CONFIG.SKILL_TREES[treeId];
        if (!tree) return Infinity;
        
        const skill = tree.skills[skillId];
        if (!skill) return Infinity;
        
        const currentLevel = this.getSkillLevel(treeId, skillId);
        return Math.floor(skill.cost * Math.pow(1.5, currentLevel));
    },

    /**
     * Purchase a skill upgrade
     */
    purchaseSkill(treeId, skillId) {
        if (!this.canUnlockSkill(treeId, skillId)) return false;
        
        const cost = this.getSkillCost(treeId, skillId);
        const key = `${treeId}_${skillId}`;
        
        this.state.skillPoints -= cost;
        this.state.skillTreeLevels[key] = (this.state.skillTreeLevels[key] || 0) + 1;
        
        // Recalculate skill effects
        this.calculateSkillEffects();
        
        UI.playSound('upgrade');
        this.checkAchievements();
        
        return true;
    },

    /**
     * Calculate all active skill effects
     */
    calculateSkillEffects() {
        const effects = {
            autoClicksPerSecond: 0,
            autoClickMultiplier: 1,
            passiveBonus: 0,
            offlineEarnings: 0,
            coinMultiplier: 1,
            prestigeMultiplier: 1,
            buildingDiscount: 0,
            upgradeDiscount: 0,
            clickPowerBonus: 0,
            clickSpeedBonus: 0,
            clickPassive: 0,
            serverBonus: 0,
            serverPerGenerator: 0,
            productionMultiplier: 1,
            keepCoinsPercent: 0,
            criticalChance: 0,
            criticalMultiplier: 1,
            clickComboBonus: 0,
            casinoLuckBonus: 0,
            jackpotBonus: 0,
            betDiscount: 0,
            winMultiplierBonus: 0,
            globalMultiplier: 1,
            synergyBonus: 0
        };
        
        // Automation tree effects
        const autoClick = this.getSkillLevel('automation', 'auto_click');
        if (autoClick > 0) effects.autoClicksPerSecond += autoClick;
        
        const turboClick = this.getSkillLevel('automation', 'turbo_click');
        if (turboClick > 0) effects.autoClickMultiplier += turboClick * 0.5;
        
        const passiveGen = this.getSkillLevel('automation', 'passive_generation');
        if (passiveGen > 0) effects.passiveBonus += passiveGen * 0.1;
        
        const offlineGen = this.getSkillLevel('automation', 'offline_generation');
        if (offlineGen > 0) effects.offlineEarnings += offlineGen * 0.1;
        
        const autoMastery = this.getSkillLevel('automation', 'auto_mastery');
        if (autoMastery > 0) {
            effects.autoClickMultiplier += autoMastery * 0.25;
            effects.passiveBonus += autoMastery * 0.05;
        }
        
        // Economy tree effects
        const coinBoost = this.getSkillLevel('economy', 'coin_boost');
        if (coinBoost > 0) effects.coinMultiplier += coinBoost * 0.1;
        
        const prestigeBoost = this.getSkillLevel('economy', 'prestige_boost');
        if (prestigeBoost > 0) effects.prestigeMultiplier += prestigeBoost * 0.15;
        
        const bulkDiscount = this.getSkillLevel('economy', 'bulk_discount');
        if (bulkDiscount > 0) effects.buildingDiscount += bulkDiscount * 0.05;
        
        const upgradeEfficiency = this.getSkillLevel('economy', 'upgrade_efficiency');
        if (upgradeEfficiency > 0) effects.upgradeDiscount += upgradeEfficiency * 0.05;
        
        const wealthMastery = this.getSkillLevel('economy', 'wealth_mastery');
        if (wealthMastery > 0) {
            effects.coinMultiplier += wealthMastery * 0.15;
            effects.prestigeMultiplier += wealthMastery * 0.1;
        }
        
        // Clicking tree effects
        const clickPower1 = this.getSkillLevel('clicking', 'click_power_1');
        if (clickPower1 > 0) effects.clickPowerBonus += clickPower1 * 0.25;
        
        const clickSpeed1 = this.getSkillLevel('clicking', 'click_speed_1');
        if (clickSpeed1 > 0) effects.clickSpeedBonus = (effects.clickSpeedBonus || 0) + clickSpeed1 * 0.10;
        
        const clickPower2 = this.getSkillLevel('clicking', 'click_power_2');
        if (clickPower2 > 0) effects.clickPowerBonus += clickPower2 * 0.50;
        
        const clickCombo = this.getSkillLevel('clicking', 'click_combo');
        if (clickCombo > 0) effects.comboEnabled = true;
        
        const clickSynergy = this.getSkillLevel('clicking', 'click_synergy_1');
        if (clickSynergy > 0) {
            effects.clickPowerBonus += clickSynergy * 0.20;
            effects.clickSpeedBonus = (effects.clickSpeedBonus || 0) + clickSynergy * 0.20;
        }
        
        const clickPower3 = this.getSkillLevel('clicking', 'click_power_3');
        if (clickPower3 > 0) effects.clickPowerBonus += clickPower3 * 1.00;
        
        const clickingAutoClick = this.getSkillLevel('clicking', 'auto_click');
        if (clickingAutoClick > 0) effects.autoClicksPerSecond += clickingAutoClick;
        
        const clickUltimate = this.getSkillLevel('clicking', 'click_ultimate');
        if (clickUltimate > 0) effects.clickPassive = (effects.clickPassive || 0) + clickUltimate * 0.01;
        
        // Power tree effects
        const clickPower = this.getSkillLevel('power', 'click_power');
        if (clickPower > 0) effects.clickPowerBonus += clickPower * 0.2;
        
        const criticalClicks = this.getSkillLevel('power', 'critical_clicks');
        if (criticalClicks > 0) {
            effects.criticalChance += criticalClicks * 0.05;
            effects.criticalMultiplier += criticalClicks * 0.5;
        }
        
        const powerClickCombo = this.getSkillLevel('power', 'click_combo');
        if (powerClickCombo > 0) effects.clickComboBonus += powerClickCombo * 0.02;
        
        const clickFrenzy = this.getSkillLevel('power', 'click_frenzy');
        if (clickFrenzy > 0) effects.clickPowerBonus += clickFrenzy * 0.1;
        
        const powerMastery = this.getSkillLevel('power', 'power_mastery');
        if (powerMastery > 0) {
            effects.criticalChance += powerMastery * 0.03;
            effects.criticalMultiplier += powerMastery * 0.25;
        }
        
        // Production tree effects
        const serverBoost1 = this.getSkillLevel('production', 'server_boost_1');
        if (serverBoost1 > 0) effects.serverBonus = (effects.serverBonus || 0) + serverBoost1 * 0.20;
        
        const serverBoost2 = this.getSkillLevel('production', 'server_boost_2');
        if (serverBoost2 > 0) effects.serverBonus = (effects.serverBonus || 0) + serverBoost2 * 0.40;
        
        const serverBoost3 = this.getSkillLevel('production', 'server_boost_3');
        if (serverBoost3 > 0) effects.serverBonus = (effects.serverBonus || 0) + serverBoost3 * 0.75;
        
        const prodUltimate = this.getSkillLevel('production', 'prod_ultimate');
        if (prodUltimate > 0) effects.productionMultiplier = (effects.productionMultiplier || 1) * Math.pow(2, prodUltimate);
        
        const prodSynergy = this.getSkillLevel('production', 'prod_synergy_1');
        if (prodSynergy > 0) effects.serverPerGenerator = (effects.serverPerGenerator || 0) + prodSynergy * 0.01;
        
        // Casino tree effects
        const luckyCharm = this.getSkillLevel('casino', 'lucky_charm');
        if (luckyCharm > 0) effects.casinoLuckBonus += luckyCharm * 0.02;
        
        const jackpotHunter = this.getSkillLevel('casino', 'jackpot_hunter');
        if (jackpotHunter > 0) effects.jackpotBonus += jackpotHunter * 0.1;
        
        // Fighting tree effects
        const combatPower1 = this.getSkillLevel('fighting', 'combat_power_1');
        if (combatPower1 > 0) effects.combatDamageBonus = (effects.combatDamageBonus || 0) + 0.25;
        
        const combatPower2 = this.getSkillLevel('fighting', 'combat_power_2');
        if (combatPower2 > 0) effects.combatDamageBonus = (effects.combatDamageBonus || 0) + 0.50;
        
        const defense1 = this.getSkillLevel('fighting', 'defense_1');
        if (defense1 > 0) effects.damageReduction = (effects.damageReduction || 0) + 0.15;
        
        const healthBoost = this.getSkillLevel('fighting', 'health_boost');
        if (healthBoost > 0) effects.bossTimeBonus = (effects.bossTimeBonus || 0) + 5;
        
        const fightingSynergy = this.getSkillLevel('fighting', 'fighting_synergy_1');
        if (fightingSynergy > 0) effects.vampiric = 0.05;
        
        const critChance = this.getSkillLevel('fighting', 'crit_chance');
        if (critChance > 0) effects.critChance = (effects.critChance || 0) + 0.15;
        
        const bossRewards = this.getSkillLevel('fighting', 'boss_rewards');
        if (bossRewards > 0) effects.bossRewardBonus = (effects.bossRewardBonus || 0) + 0.50;
        
        const fightingUltimate = this.getSkillLevel('fighting', 'fighting_ultimate');
        if (fightingUltimate > 0) effects.bossSlayer = true;
        
        // Prestige tree effects
        const prestigeSynergy = this.getSkillLevel('prestige', 'prestige_synergy_1');
        if (prestigeSynergy > 0) effects.keepCoinsPercent = (effects.keepCoinsPercent || 0) + prestigeSynergy * 0.01;
        
        // Synergy tree effects
        const dualSpec = this.getSkillLevel('synergy', 'dual_spec');
        if (dualSpec > 0) effects.synergyBonus += dualSpec * 0.05;
        
        const tripleSync = this.getSkillLevel('synergy', 'triple_sync');
        if (tripleSync > 0) effects.synergyBonus += tripleSync * 0.1;
        
        const masterSync = this.getSkillLevel('synergy', 'master_sync');
        if (masterSync > 0) effects.globalMultiplier += masterSync * 0.1;
        
        // Apply synergy bonuses
        this.applySynergyBonuses(effects);
        
        this.state.activeSkillEffects = effects;
        return effects;
    },

    /**
     * Apply synergy bonuses when related skills are both unlocked
     */
    applySynergyBonuses(effects) {
        // Initialize synergy bonus if not set
        if (!effects.synergyBonus) {
            effects.synergyBonus = 0;
        }

        // Cross-tree synergies are handled individually in the UI
        // This function is kept for future cross-tree synergy implementations
        // For now, synergies provide their effects directly when unlocked

        // Apply synergy multiplier to global effects
        if (effects.synergyBonus > 0) {
            effects.globalMultiplier = (effects.globalMultiplier || 1) * (1 + effects.synergyBonus);
        }
    },

    /**
     * Get current skill effects
     */
    getSkillEffects() {
        if (!this.state.activeSkillEffects || Object.keys(this.state.activeSkillEffects).length === 0) {
            this.calculateSkillEffects();
        }
        return this.state.activeSkillEffects;
    },

    /**
     * Unlock a research upgrade
     */
    unlockResearch(researchKey) {
        const research = this.CONFIG.RESEARCH_UPGRADES[researchKey];
        if (!this.state.unlockedResearch.has(researchKey) && this.state.skillPoints >= research.skillPointCost) {
            this.state.skillPoints -= research.skillPointCost;
            this.state.totalSkillPointsSpent = (this.state.totalSkillPointsSpent || 0) + research.skillPointCost;
            this.state.unlockedResearch.add(researchKey);
            UI.playSound('upgrade');
            this.checkAchievements();
            return true;
        }
        return false;
    },

    /**
     * Check if a research is unlocked
     */
    isResearchUnlocked(researchKey) {
        return this.state.unlockedResearch.has(researchKey);
    },

    /**
     * Check if a boss is unlocked
     */
    isBossUnlocked(bossId) {
        try {
            // Prefer authoritative implementation on BossBattle if available (includes progression checks)
            if (typeof BossBattle !== 'undefined' && BossBattle && typeof BossBattle.isBossUnlocked === 'function') {
                try {
                    // Ensure BossBattle checks operate on the shared GAME.state by binding GAME as `this`.
                    const res = BossBattle.isBossUnlocked.call(GAME, bossId);
                    if (this.CONFIG && this.CONFIG.DEBUG && bossId === 'crude_ai') console.log('GAME.isBossUnlocked delegating to BossBattle:', res);
                    if (res) return true;
                } catch (e) { /* continue to fallback checks */ }
            }
            if (!this.state.unlockedBosses) return false;
            if (typeof this.state.unlockedBosses.has === 'function') return this.state.unlockedBosses.has(bossId);
            if (Array.isArray(this.state.unlockedBosses)) return this.state.unlockedBosses.includes(bossId);
            return !!this.state.unlockedBosses[bossId];
        } catch (e) { return false; }
    },

    /**
     * Unlock a boss by id. Returns true if newly unlocked, false otherwise.
     */
    unlockBoss(bossId) {
        try {
            if (!this.state.unlockedBosses || typeof this.state.unlockedBosses.has !== 'function') {
                this.state.unlockedBosses = new Set(this.state.unlockedBosses || []);
            }
            if (this.state.unlockedBosses.has(bossId)) {
                if (this.CONFIG && this.CONFIG.DEBUG) console.log('unlockBoss: already unlocked', bossId);
                return false;
            }
            this.state.unlockedBosses.add(bossId);
            if (this.CONFIG && this.CONFIG.DEBUG) console.log('unlockBoss: unlocked', bossId, Array.from(this.state.unlockedBosses));
            try { if (typeof this.saveGame === 'function') this.saveGame(); } catch(e) {}
            try { if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab(); } catch(e) {}
            return true;
        } catch (e) {
            console.warn('unlockBoss: failed', e);
            return false;
        }
    },

    /**
     * Get power from a generator, accounting for upgrades
     */
    getGeneratorPower(generatorKeyOrId) {
        // Support both type (string key) and ID (for new per-instance upgrades)
        let config;
        let upgradeLevel = 0;
        
        // Check if it's a generator ID (from powerGenerators array)
        const generator = this.state.powerGenerators.find(g => g.id === generatorKeyOrId);
        if (generator) {
            config = this.CONFIG.GENERATORS[generator.type];
            if (config.upgradable) {
                upgradeLevel = this.state.generatorUpgrades[generatorKeyOrId] || 0;
            }
        } else {
            // It's a type key
            config = this.CONFIG.GENERATORS[generatorKeyOrId];
            if (config.upgradable) {
                upgradeLevel = this.state.generatorUpgrades[generatorKeyOrId] || 0;
            }
        }
        
        let power = config.power;
        
        // Apply upgrades if applicable
        if (config.upgradable && upgradeLevel > 0) {
            // Exponential scaling: each upgrade level multiplies power by 1.5
            power *= Math.pow(1.5, upgradeLevel);
        }
        
        return power;
    },

    /**
     * Upgrade a generator (for upgradable types like Solar Farm)
     * upgrades by generator ID to allow each instance to have its own level
     */
    upgradeGenerator(generatorId) {
        // Find the generator by ID
        const generator = this.state.powerGenerators.find(g => g.id === generatorId);
        if (!generator) return false;
        
        const config = this.CONFIG.GENERATORS[generator.type];
        if (!config.upgradable) return false;
        
        // Initialize upgrade storage for this generator if needed
        if (!this.state.generatorUpgrades) {
            this.state.generatorUpgrades = {};
        }
        
        const currentLevel = this.state.generatorUpgrades[generatorId] || 0;
        const cost = Math.floor(config.baseUpgradeCost * Math.pow(1.3, currentLevel) * this.getCostMultiplier());
        
        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            this.state.generatorUpgrades[generatorId] = currentLevel + 1;
            UI.playSound('upgrade');
            return true;
        }
        return false;
    },

    /**
     * Get upgrade cost for a generator
     */
    getGeneratorUpgradeCost(generatorId) {
        // Find the generator by ID
        const generator = this.state.powerGenerators.find(g => g.id === generatorId);
        if (!generator) return 0;
        
        const config = this.CONFIG.GENERATORS[generator.type];
        if (!config.upgradable) return 0;
        
        const currentLevel = this.state.generatorUpgrades[generatorId] || 0;
        return Math.floor(config.baseUpgradeCost * Math.pow(1.3, currentLevel) * this.getCostMultiplier());
    },

    /**
     * Get the maximum number of grid slots
     */
    getMaxGridSlots() {
        // Base slots: 1 default slot, plus purchased gridSlotUpgrades, plus any prestige bonus (megapower)
        try {
            const base = 1;
            const purchased = Number.isFinite(Number(this.state.gridSlotUpgrades)) ? Number(this.state.gridSlotUpgrades) : 0;
            const prestigeBonusLevels = this.state.prestigeUpgrades?.megapower?.level || 0;
            const prestigeBonus = (prestigeBonusLevels && Number.isFinite(Number(prestigeBonusLevels))) ? (prestigeBonusLevels * 2) : 0;
            return base + purchased + prestigeBonus;
        } catch (e) {
            return 1 + (this.state.gridSlotUpgrades || 0);
        }
    },

    /**
     * Get cost for next grid slot upgrade
     */
    getGridSlotUpgradeCost() {
        const config = this.CONFIG.GRID_SLOT_UPGRADES.gridslots;
        const currentSlots = this.getMaxGridSlots();
        if (currentSlots >= 25) return Infinity; // Max 25 slots
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, this.state.gridSlotUpgrades) * this.getCostMultiplier());
    },

    /**
     * Buy a grid slot upgrade
     */
    buyGridSlotUpgrade() {
        const maxSlots = this.getMaxGridSlots();
        if (maxSlots >= 25) return false; // Already at max
        
        const cost = this.getGridSlotUpgradeCost();
        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            this.state.gridSlotUpgrades += 1;
            
            // Expand the power grid array
            const newSize = this.getMaxGridSlots();
            while (this.state.powerGrid.length < newSize) {
                this.state.powerGrid.push(null);
            }
            
            UI.playSound('upgrade');
            return true;
        }
        return false;
    },

    /**
     * Get the maximum rack units available
     */
    /**
     * Get current building
     */
    getCurrentBuilding() {
        return this.state.buildings[this.state.currentBuildingId];
    },

    /**
     * Get all buildings
     */
    getBuildings() {
        return Object.values(this.state.buildings);
    },

    /**
     * Generate random street name
     */
    generateStreetName() {
        const prefixes = this.CONFIG.BUILDING_NAMES.prefixes;
        const suffixes = this.CONFIG.BUILDING_NAMES.suffixes;
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        return `${prefix} ${suffix}`;
    },

    /**
     * Get regular building count (excludes Space Station)
     */
    getRegularBuildingCount() {
        return Object.values(this.state.buildings).filter(b => !b.isSpaceStation).length;
    },

    /**
     * Buy a new building
     */
    buyBuilding() {
        const numBuildings = this.getRegularBuildingCount();
        if (numBuildings >= this.CONFIG.BUILDING_PURCHASE.maxBuildings) {
            console.log('Maximum buildings reached');
            return false;
        }

        const cost = this.getBuildingPurchaseCost();
        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            const buildingId = this.state.nextBuildingId.toString();
            this.state.buildings[buildingId] = {
                id: buildingId,
                name: `Building ${this.state.nextBuildingId}`,
                streetName: this.generateStreetName(),
                isDefault: false,
                maxRackUnits: 1,
                placedServers: [],
                workers: 0,
                workerCostMultiplier: 1.5
            };
            this.state.nextBuildingId += 1;
            this.state.currentBuildingId = buildingId;
            UI.playSound('upgrade');
            return true;
        }
        return false;
    },

    /**
     * Unlock and create the Space Station building
     */
    unlockSpaceStation() {
        // Check if already unlocked
        if (this.state.buildings['spacestation']) {
            return false;
        }
        
        this.state.buildings['spacestation'] = {
            id: 'spacestation',
            name: '🚀 Space Station',
            streetName: 'Orbital Platform Alpha',
            isDefault: false,
            isSpaceStation: true,
            maxRackUnits: 18, // 3 racks x 6U each = 18U total
            rackCount: 3,
            efficiencyBonus: 0.5, // 50% efficiency bonus
            placedServers: [],
            workers: 0,
            workerCostMultiplier: 1.5
        };
        
        return true;
    },

    /**
     * Check if space station is unlocked
     */
    isSpaceStationUnlocked() {
        const upgrade = this.state.transcendenceUpgrades['spacestation'];
        return upgrade && upgrade.level > 0;
    },

    /**
     * Get efficiency multiplier for a building
     */
    getBuildingEfficiency(buildingId) {
        const building = this.state.buildings[buildingId];
        if (!building) return 1;
        
        // Space Station has 50% bonus efficiency
        if (building.isSpaceStation) {
            return 1 + (building.efficiencyBonus || 0.5);
        }
        
        return 1;
    },

    /**
     * Switch to different building
     */
    switchBuilding(buildingId) {
        if (this.state.buildings[buildingId]) {
            this.state.currentBuildingId = buildingId;
            return true;
        }
        return false;
    },

    /**
     * Delete a building (sell it for refund)
     */
    deleteBuilding(buildingId) {
        if (!this.state.buildings[buildingId]) return false;
        const building = this.state.buildings[buildingId];
        
        // Can't delete the default headquarters
        if (building.isDefault) {
            console.log('Cannot delete default headquarters');
            return false;
        }
        
        // Can't delete Space Station (it's a prestige unlock)
        if (building.isSpaceStation) {
            console.log('Cannot delete Space Station');
            return false;
        }
        
        // Calculate refund (75% of original building cost)
        const numBuildings = this.getRegularBuildingCount();
        const buildingCost = Math.floor(this.CONFIG.BUILDING_PURCHASE.baseCost * Math.pow(this.CONFIG.BUILDING_PURCHASE.costMultiplier, numBuildings - 2));
        const refund = Math.floor(buildingCost * 0.75);
        
        // Give refund
        this.state.coins += refund;
        
        // Delete the building
        delete this.state.buildings[buildingId];
        
        // Switch to default building if we deleted the current one
        if (this.state.currentBuildingId === buildingId) {
            this.state.currentBuildingId = '0';
        }
        
        return true;
    },

    /**
     * Get building purchase cost
     */
    getBuildingPurchaseCost() {
        const numBuildings = this.getRegularBuildingCount();
        if (numBuildings >= this.CONFIG.BUILDING_PURCHASE.maxBuildings) return Infinity;
        return Math.floor(this.CONFIG.BUILDING_PURCHASE.baseCost * Math.pow(this.CONFIG.BUILDING_PURCHASE.costMultiplier, numBuildings - 1) * this.getCostMultiplier());
    },

    /**
     * Get max rack units for current building
     */
    getMaxRackUnits() {
        const building = this.getCurrentBuilding();
        return building ? building.maxRackUnits : 1;
    },

    /**
     * Get used rack units in current building
     */
    getUsedRackUnits() {
        const building = this.getCurrentBuilding();
        if (!building) return 0;
        return building.placedServers.reduce((total, server) => {
            return total + (this.CONFIG.SERVERS[server.type]?.rackUnits || 1);
        }, 0);
    },

    /**
     * Get available rack units in current building
     */
    getAvailableRackUnits() {
        return this.getMaxRackUnits() - this.getUsedRackUnits();
    },

    /**
     * Get cost for next rack upgrade in current building
     */
    getRackUpgradeCost() {
        const config = this.CONFIG.RACK_UPGRADES.rackunit;
        const currentRackUnits = this.getMaxRackUnits();
        if (currentRackUnits >= 6) return Infinity; // Max 6U
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentRackUnits - 1) * this.getCostMultiplier());
    },

    /**
     * Buy a rack unit upgrade for current building
     */
    buyRackUpgrade() {
        const building = this.getCurrentBuilding();
        if (!building || building.maxRackUnits >= 6) return false; // Already at max
        
        const cost = this.getRackUpgradeCost();
        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            building.maxRackUnits += 1;
            UI.playSound('upgrade');
            return true;
        }
        return false;
    },

    /**
     * Place a server in the current building's rack
     */
    placeServerInRack(serverType) {
        const config = this.CONFIG.SERVERS[serverType];
        const serverData = this.state.servers[serverType];
        const cost = this.getServerCost(serverType);
        const building = this.getCurrentBuilding();
        if (!building) return false;

        // Check if we have enough space in the rack
        const requiredUnits = config.rackUnits;
        const available = this.getAvailableRackUnits();
        
        if (available < requiredUnits) {
            console.log(`Not enough rack space. Need ${requiredUnits}U, have ${available}U`);
            return false;
        }
        
        // Check material requirements
        if (config.materialCost) {
            if (typeof UI !== 'undefined' && !UI.hasEnoughMaterials(serverType)) {
                if (typeof UI !== 'undefined' && UI.showNotification) {
                    UI.showNotification('Not enough materials! Check the Mines tab.', 'error');
                }
                return false;
            }
        }

        if (this.state.coins >= cost) {
            // Consume materials if required
            if (config.materialCost) {
                if (typeof UI !== 'undefined' && !UI.consumeMaterials(serverType)) {
                    return false;
                }
            }
            
            this.state.coins -= cost;
            serverData.count += 1;
            
            // Generate a lucky block for this server
            const luckyBlock = this.generateLuckyBlock();
            
            // Add to current building's rack
            building.placedServers.push({
                serverId: `${serverType}_${Date.now()}`,
                type: serverType,
                rackUnits: requiredUnits,
                placedAt: Date.now(),
                miningProgress: 0,
                currentBlock: luckyBlock,
                miningStartTime: Date.now(),
                hasWorker: false
            });
            
            UI.playSound('upgrade');
            this.checkAchievements();
            return true;
        }
        return false;
    },

    /**
     * Remove a server from the current building's rack
     */
    removeServerFromRack(serverId) {
        const building = this.getCurrentBuilding();
        if (!building) return false;
        
        const index = building.placedServers.findIndex(s => s.serverId === serverId);
        if (index !== -1) {
            const server = building.placedServers[index];
            this.state.servers[server.type].count -= 1;
            building.placedServers.splice(index, 1);
            return true;
        }
        return false;
    },


    buyServer(serverKey, count = 1) {
        const config = this.CONFIG.SERVERS[serverKey];
        const serverData = this.state.servers[serverKey];
        const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, serverData.count)) * count;

        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            serverData.count += count;
            UI.playSound('upgrade');
            this.checkAchievements();
            return true;
        }
        return false;
    },

    /**
     * Get the cost of a server
     */
    getServerCost(serverKey) {
        const config = this.CONFIG.SERVERS[serverKey];
        const serverData = this.state.servers[serverKey];
        const baseCost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, serverData.count));
        return Math.floor(baseCost * this.getCostMultiplier());
    },

    /**
     * Calculate power usage from all servers
     */
    getPowerUsage() {
        let usage = 0;
        const building = this.getCurrentBuilding();
        if (!building) return usage;
        
        for (const server of building.placedServers) {
            // Skip if rack is powered down
            if (building.rackPoweredDown) {
                continue;
            }
            const config = this.CONFIG.SERVERS[server.type];
            // Use the power draw from the server config
            usage += config.powerDraw || 0;
        }
        // Apply dark mode power multiplier
        return Math.floor(usage * this.getPowerMultiplier());
    },

    /**
     * Get total power usage across all buildings
     */
    getTotalPowerUsage() {
        let totalUsage = 0;
        
        for (const [buildingId, building] of Object.entries(this.state.buildings)) {
            for (const server of building.placedServers) {
                // Skip if rack is powered down
                if (building.rackPoweredDown) {
                    continue;
                }
                const config = this.CONFIG.SERVERS[server.type];
                // Use the power draw from the server config
                totalUsage += config.powerDraw || 0;
            }
        }
        // Include active mines continuous draw (per-second) so header shows their consumption
        try {
            const minesOn = !(this.state && this.state.minesEnabled === false);
            if (minesOn && this.CONFIG && this.CONFIG.MINES && this.state && this.state.mines) {
                for (const [mineId, mineCfg] of Object.entries(this.CONFIG.MINES)) {
                    try {
                        const mineState = this.state.mines && this.state.mines[mineId];
                        const isUnlocked = !mineCfg.requiresResearch || (typeof this.isResearchUnlocked === 'function' && this.isResearchUnlocked(mineCfg.requiresResearch));
                        if (mineState && mineState.level > 0 && isUnlocked) {
                            totalUsage += Number(mineCfg.powerDraw) || 0;
                        }
                    } catch (e) { /* ignore per-mine errors */ }
                }
            }
        } catch (e) { /* ignore */ }

        // Include any transient usage (e.g. smeltery) and apply power multiplier
        const transient = (this._transientPowerUsage && Number.isFinite(Number(this._transientPowerUsage))) ? Number(this._transientPowerUsage) : 0;
        return Math.floor((totalUsage + transient) * this.getPowerMultiplier());
    },

    /**
     * Get total wattage for the current building's rack
     */
    getRackWattage() {
        const building = this.getCurrentBuilding();
        if (!building) return 0;
        
        let wattage = 0;
        for (const server of building.placedServers) {
            const config = this.CONFIG.SERVERS[server.type];
            wattage += config.powerDraw || 0;
        }
        // Apply dark mode power multiplier
        return Math.floor(wattage * this.getPowerMultiplier());
    },

    /**
     * Toggle rack power down
     */
    toggleRackPower(buildingId) {
        if (!buildingId || !this.state.buildings[buildingId]) return;
        const building = this.state.buildings[buildingId];
        building.rackPoweredDown = !building.rackPoweredDown;
    },

    /**
     * Check if current rack is powered down
     */
    isRackPoweredDown() {
        const building = this.getCurrentBuilding();
        return building?.rackPoweredDown || false;
    },

    /**
     * Calculate base power generation without fluctuation
     */
    getBasePowerGeneration() {
        let total = 0;
        for (const gen of this.state.powerGenerators) {
            const power = this.getGeneratorPower(gen.id);
            const powerBoost = this.state.prestigeUpgrades.powerboost?.level || 0;
            total += power + powerBoost;
        }
        // Previously network capacity could cap generation; cap removed so generators are not limited here
        return total;
    },

    /**
     * Calculate total power generation with realistic fluctuation
     */
    getPowerGeneration() {
        const basePower = this.getBasePowerGeneration();
        
        // Create a more randomized fluctuation using slower sine wave + noise
        const timeVariation = Math.sin(Date.now() / 3000);
        const randomNoise = Math.sin(Date.now() / 1500 + Math.cos(Date.now() / 3500)) * 0.02;
        const fluctuation = 1 + ((timeVariation + randomNoise) * 0.05);
        const total = basePower * fluctuation;
        
        return total;
    },

    /**
     * Get the current power fluctuation percentage
     */
    getPowerFluctuation() {
        const timeVariation = Math.sin(Date.now() / 3000);
        const randomNoise = Math.sin(Date.now() / 1500 + Math.cos(Date.now() / 3500)) * 0.02;
        return (timeVariation + randomNoise) * 0.05 * 100; // Returns -5 to +5
    },

    /**
     * Check if power system is critical (insufficient power)
     */
    isPowerCritical() {
        return this.getPowerGeneration() < this.getTotalPowerUsage();
    },

    /**
     * Place a power generator
     */
    placeGenerator(type) {
        const config = this.CONFIG.GENERATORS[type];
        
        // Check if research is required and unlocked
        if (config.requiresResearch && !this.isResearchUnlocked(config.requiresResearch)) {
            return false;
        }
        
        const cost = Math.floor(config.cost * this.getCostMultiplier());
        const maxSlots = this.getMaxGridSlots();
        if (this.state.coins >= cost && this.state.powerGenerators.length < maxSlots) {
            this.state.coins -= cost;
            this.state.powerGenerators.push({
                type: type,
                id: Math.random().toString(36).substr(2, 9)
            });
            UI.playSound('upgrade');
            this.checkAchievements();
            return true;
        }
        return false;
    },

    /**
     * Remove a power generator
     */
    removeGenerator(id) {
        const index = this.state.powerGenerators.findIndex(g => g.id === id);
        if (index !== -1) {
            this.state.powerGenerators.splice(index, 1);
        }
    },

    /**
     * Check and unlock achievements
     */
    checkAchievements() {
        for (const achievement of this.CONFIG.ACHIEVEMENTS) {
            if (!this.state.unlockedAchievements.has(achievement.id)) {
                if (achievement.condition(this)) {
                    this.unlockAchievement(achievement.id, achievement);
                }
            }
        }
    },

    /**
     * Initialize or refresh daily challenges
     */
    initDailyChallenges() {
        const today = new Date().toDateString();
        
        // Check if we need new challenges
        if (this.state.dailyChallengeDate !== today) {
            // Check if yesterday's challenges were completed for streak
            if (this.state.dailyChallengeDate) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (this.state.dailyChallengeDate === yesterday.toDateString()) {
                    // Maintain streak if all 3 were completed
                    if (this.getDailyChallengesCompleted() >= 3) {
                        this.state.dailyStreak = (this.state.dailyStreak || 0) + 1;
                    } else {
                        this.state.dailyStreak = 0;
                    }
                } else {
                    // Broke streak
                    this.state.dailyStreak = 0;
                }
            }
            
            this.generateDailyChallenges();
            this.state.dailyChallengeDate = today;
            this.resetDailyProgress();
            this.saveGame();
        }
    },

    /**
     * Generate 3 random daily challenges
     */
    generateDailyChallenges() {
        let templates = [...this.CONFIG.DAILY_CHALLENGE_TEMPLATES];
        
        // Filter out research challenge if player has completed all research
        const totalResearch = this.CONFIG.RESEARCH_UPGRADES ? Object.keys(this.CONFIG.RESEARCH_UPGRADES).length : 0;
        const completedResearch = this.state.unlockedResearch ? this.state.unlockedResearch.size : 0;
        if (totalResearch > 0 && completedResearch >= totalResearch) {
            templates = templates.filter(t => t.type !== 'research_completed');
        }
        
        const selected = [];
        
        // Select 3 unique challenges
        for (let i = 0; i < 3 && templates.length > 0; i++) {
            const idx = Math.floor(Math.random() * templates.length);
            const template = templates.splice(idx, 1)[0];
            
            // Scale difficulty based on player progress (skip for noScale challenges)
            const scaleFactor = template.noScale ? 1 : Math.max(1, Math.log10((this.state.totalCoinsEarned || 1000) / 1000) + 1);
            const scaledTarget = Math.floor(template.target * scaleFactor);
            const scaledReward = {
                coins: Math.floor(template.reward.coins * scaleFactor),
                skillPoints: template.reward.skillPoints
            };
            
            selected.push({
                ...template,
                target: scaledTarget,
                reward: scaledReward,
                progress: 0,
                completed: false,
                claimed: false
            });
        }
        
        this.state.dailyChallenges = selected;
    },

    /**
     * Reset daily challenge progress tracking
     */
    resetDailyProgress() {
        this.state.dailyProgress = {
            clicks: 0,
            coins_earned: 0,
            casino_games: 0,
            casino_won: 0,
            casino_wagered: 0,
            servers_bought: 0,
            generators_placed: 0,
            generators_upgraded: 0,
            research_completed: 0,
            coins_spent: 0,
            passive_earned: 0
        };
    },

    /**
     * Update daily challenge progress
     */
    updateDailyProgress(type, amount = 1) {
        if (!this.state.dailyProgress) {
            this.resetDailyProgress();
        }
        
        this.state.dailyProgress[type] = (this.state.dailyProgress[type] || 0) + amount;
        
        // Check each challenge
        if (this.state.dailyChallenges) {
            this.state.dailyChallenges.forEach(challenge => {
                if (!challenge.completed && challenge.type === type) {
                    challenge.progress = Math.min(this.state.dailyProgress[type], challenge.target);
                    if (challenge.progress >= challenge.target) {
                        challenge.completed = true;
                        this.onDailyChallengeComplete(challenge);
                    }
                }
            });
        }
    },

    /**
     * Handle daily challenge completion
     */
    onDailyChallengeComplete(challenge) {
        if (!challenge.claimed) {
            challenge.claimed = true;
            
            // Give rewards
            this.state.coins += challenge.reward.coins;
            this.earnSkillPoints(challenge.reward.skillPoints);
            
            // Show notification
            UI.showAchievementUnlock({
                name: `Daily: ${challenge.title}`,
                icon: challenge.icon
            });
            
            this.state.dailyChallengesCompleted = (this.state.dailyChallengesCompleted || 0) + 1;
            
            // Bonus for completing all 3
            if (this.getDailyChallengesCompleted() === 3) {
                const streakBonus = Math.min(10, (this.state.dailyStreak || 0));
                const bonusCoins = 10000 * (1 + streakBonus * 0.1);
                this.state.coins += bonusCoins;
                UI.showAchievementUnlock({
                    name: `All Daily Challenges Complete! +${this.formatNumber(bonusCoins)} bonus!`,
                    icon: '🎉'
                });
            }
            
            UI.renderDailyChallenges();
            // Refresh research tab if skill points were earned
            if (challenge.reward.skillPoints > 0) {
                UI.setupResearchTab();
            }
            this.saveGame();
        }
    },

    /**
     * Get number of completed daily challenges today
     */
    getDailyChallengesCompleted() {
        if (!this.state.dailyChallenges) return 0;
        return this.state.dailyChallenges.filter(c => c.completed).length;
    },

    /**
     * Get time until daily reset (midnight)
     */
    getTimeUntilDailyReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow - now;
    },

    /**
     * Track casino win for achievements
     */
    trackCasinoWin(bet, winAmount) {
        if (winAmount > 0 && bet > 0) {
            const multiplier = winAmount / bet;
            if (multiplier > (this.state.casinoBiggestMultiplier || 0)) {
                this.state.casinoBiggestMultiplier = multiplier;
            }
            if (winAmount > (this.state.casinoBiggestWin || 0)) {
                this.state.casinoBiggestWin = winAmount;
            }
            this.updateDailyProgress('casino_won', winAmount);
        }
    },

    /**
     * Get battery capacity upgrade cost
     */
    getBatteryCapacityCost() {
        const config = this.CONFIG.BATTERY_UPGRADES['battery_capacity'];
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, this.state.batteryCapacityLevel));
    },

    /**
     * Upgrade battery capacity
     */
    upgradeBatteryCapacity() {
        const cost = this.getBatteryCapacityCost();
        const baseIncrease = this.CONFIG.BATTERY_UPGRADES['battery_capacity'].capacityIncrease;
        const increaseAmount = baseIncrease + (this.state.batteryCapacityLevel * 2);
        
        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            this.state.batteryCapacity += increaseAmount;
            this.state.batteryCapacityLevel += 1;
            UI.playSound('upgrade');
            this.checkAchievements();
            return true;
        }
        return false;
    },

    /**
     * Get battery charge rate upgrade cost
     */
    getBatteryChargeRateCost() {
        const config = this.CONFIG.BATTERY_UPGRADES['battery_charge_rate'];
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, this.state.batteryChargeRateLevel));
    },

    /**
     * Upgrade battery charge rate
     */
    upgradeBatteryChargeRate() {
        const cost = this.getBatteryChargeRateCost();
        const config = this.CONFIG.BATTERY_UPGRADES['battery_charge_rate'];
        
        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            this.state.batteryChargeRate += config.rateIncrease;
            this.state.batteryChargeRateLevel += 1;
            UI.playSound('upgrade');
            this.checkAchievements();
            return true;
        }
        return false;
    },

    /**
     * Get battery discharge rate upgrade cost
     */
    getBatteryDischargeRateCost() {
        const config = this.CONFIG.BATTERY_UPGRADES['battery_discharge_rate'];
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, this.state.batteryDischargeRateLevel));
    },

    /**
     * Upgrade battery discharge rate
     */
    upgradeBatteryDischargeRate() {
        const cost = this.getBatteryDischargeRateCost();
        const config = this.CONFIG.BATTERY_UPGRADES['battery_discharge_rate'];
        
        if (this.state.coins >= cost) {
            this.state.coins -= cost;
            this.state.batteryDischargeRate += config.rateIncrease;
            this.state.batteryDischargeRateLevel += 1;
            UI.playSound('upgrade');
            this.checkAchievements();
            return true;
        }
        return false;
    },

    /**
     * Charge battery with excess power
     */
    chargeBattery(excess) {
        const canCharge = this.state.batteryStored < this.state.batteryCapacity;
        if (canCharge && excess > 0) {
            const chargeAmount = Math.min(excess, this.state.batteryCapacity - this.state.batteryStored);
            this.state.batteryStored += chargeAmount;
            return chargeAmount;
        }
        return 0;
    },

    /**
     * Discharge battery for power
     */
    dischargeBattery(needed) {
        if (this.state.batteryStored >= needed) {
            this.state.batteryStored -= needed;
            return needed;
        } else {
            const available = this.state.batteryStored;
            this.state.batteryStored = 0;
            return available;
        }
    },

    /**
     * Unlock an achievement
     */
    unlockAchievement(id, achievement) {
        this.state.unlockedAchievements.add(id);
        if (achievement.reward?.skillPoints) {
            this.earnSkillPoints(achievement.reward.skillPoints);
        }
        if (achievement.reward?.achievementPoints) {
            this.state.achievementPoints += achievement.reward.achievementPoints;
            this.state.totalAchievementPointsEarned += achievement.reward.achievementPoints;
        }
        UI.showAchievementNotification(achievement.name);
        UI.playSound('upgrade');
        // Refresh research tab if skill points were earned
        if (achievement.reward?.skillPoints) {
            UI.setupResearchTab();
        }
        // Refresh achievements tab to show new achievement
        UI.setupAchievementsTab();
    },

    /**
     * Get prestige points that would be gained from a reset
     */
    calculatePrestigeGain() {
        const coinsRoot = Math.sqrt(this.state.coins);
        const prestigeBonus = 1 + Array.from(this.state.unlockedAchievements).reduce((sum, id) => {
            const ach = this.CONFIG.ACHIEVEMENTS.find(a => a.id === id);
            return sum + (ach?.reward?.prestigeBonus || 0);
        }, 0);
        return Math.floor(coinsRoot * prestigeBonus);
    },

    /**
     * Perform prestige reset
     */
    prestige() {
        const pointsGained = this.calculatePrestigeGain();
        if (pointsGained > 0) {
            this.state.prestigePoints += pointsGained;
            this.state.totalPrestigeEarned += pointsGained;
            this.state.prestigeLevel += 1;
            
            // Calculate coins to keep from skill effects
            const skillEffects = this.getSkillEffects();
            const keepCoinsPercent = skillEffects.keepCoinsPercent || 0;
            const coinsToKeep = Math.floor(this.state.coins * keepCoinsPercent);
            
            // Reset currency
            this.state.coins = coinsToKeep;
            this.state.totalCoinsEarned = coinsToKeep;
            
            // Apply starting coins bonus from skill tree
            if (this.state.activeSkillEffects && this.state.activeSkillEffects.startingCoinsBonus) {
                this.state.coins += this.state.activeSkillEffects.startingCoinsBonus;
                this.state.totalCoinsEarned += this.state.activeSkillEffects.startingCoinsBonus;
            }

            // Apply starting coins from purchased Prestige Upgrades (if any)
            try {
                const pcfg = this.CONFIG.PRESTIGE_UPGRADES && this.CONFIG.PRESTIGE_UPGRADES.startingcoins;
                const plevel = this.state.prestigeUpgrades && this.state.prestigeUpgrades.startingcoins ? this.state.prestigeUpgrades.startingcoins.level : 0;
                if (pcfg && plevel > 0 && typeof pcfg.effect === 'function') {
                    const eff = pcfg.effect(plevel);
                    if (eff && eff.startingCoins && Number.isFinite(Number(eff.startingCoins))) {
                        const amt = Number(eff.startingCoins);
                        this.state.coins += amt;
                        this.state.totalCoinsEarned += amt;
                    }
                }
            } catch (e) { /* ignore */ }
            
            // Reset click upgrades
            this.state.clickPower = 1;
            this.state.clickUpgrades = {};
            
            // Reset servers
            this.state.servers = {};
            
            // Reset buildings (keep only headquarters)
            this.state.buildings = {
                '0': {
                    id: '0',
                    name: 'Headquarters',
                    streetName: 'Main Street',
                    isDefault: true,
                    maxRackUnits: 1,
                    placedServers: [],
                    workers: 0,
                    workerCostMultiplier: 1.5
                }
            };
            this.state.currentBuildingId = '0';
            this.state.nextBuildingId = 1;
            
            // Reset power
            this.state.powerGenerators = [];
            this.state.powerGrid = Array(0).fill(null);
            this.state.generatorUpgrades = {};
            this.state.gridSlotUpgrades = 0;
            
            // Reset battery
            this.state.batteryCapacity = 10;
            this.state.batteryStored = 0;
            this.state.batteryCapacityLevel = 0;
            this.state.batteryChargeRate = 10;
            this.state.batteryDischargeRate = 10;
            this.state.batteryChargeRateLevel = 0;
            this.state.batteryDischargeRateLevel = 0;
            
            // Reset mines
            this.state.mines = {};
            
            // Reinitialize upgrades and servers
            this.initializeUpgrades();
            this.initializeServers();
            
            UI.playSound('upgrade');
            this.checkAchievements();
            this.checkPrestigeMilestones();
            return true;
        }
        return false;
    },

    /**
     * Buy a prestige upgrade
     */
    buyPrestigeUpgrade(upgradeKey) {
        const config = this.CONFIG.PRESTIGE_UPGRADES[upgradeKey];
        if (!this.state.prestigeUpgrades[upgradeKey]) {
            this.state.prestigeUpgrades[upgradeKey] = { level: 0 };
        }
        
        const current = this.state.prestigeUpgrades[upgradeKey];
        
        // Check max level for single-purchase upgrades
        if (config.maxLevel && current.level >= config.maxLevel) {
            return false;
        }
        
        const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, current.level));

        if (this.state.prestigePoints >= cost) {
            this.state.prestigePoints -= cost;
            current.level += 1;
            
            UI.playSound('upgrade');
            return true;
        }
        return false;
    },

    /**
     * Get prestige upgrade cost
     */
    getPrestigeUpgradeCost(upgradeKey) {
        const config = this.CONFIG.PRESTIGE_UPGRADES[upgradeKey];
        const current = this.state.prestigeUpgrades[upgradeKey];
        const level = current ? current.level : 0;
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
    },

    /**
     * Calculate ascension points from prestige level
     */
    calculateAscensionGain() {
        if (this.state.prestigeLevel < 10) return 0;
        return Math.floor(Math.sqrt(this.state.prestigeLevel - 9));
    },

    /**
     * Check if can ascend
     */
    canAscend() {
        return this.state.prestigeLevel >= 10 && this.calculateAscensionGain() > 0;
    },

    /**
     * Perform ascension (super-prestige)
     */
    ascend() {
        if (!this.canAscend()) return false;

        const pointsGained = this.calculateAscensionGain();
        this.state.ascensionPoints += pointsGained;
        this.state.totalAscensionEarned += pointsGained;
        this.state.ascensionLevel += 1;
        this.state.stats.totalResets += 1;

        // Reset prestige progress
        this.state.prestigePoints = 0;
        this.state.prestigeLevel = 0;
        this.state.prestigeUpgrades = {};
        this.state.totalPrestigeEarned = 0;

        // Full reset
        this.prestige();

        // Check for unlocks
        this.checkUnlockables();
        
        UI.showNotification('🌟 ASCENSION!', `You have ascended! Gained ${pointsGained} Ascension Points!`);
        return true;
    },

    /**
     * Buy an ascension upgrade
     */
    buyAscensionUpgrade(upgradeKey) {
        const config = this.CONFIG.ASCENSION_UPGRADES[upgradeKey];
        if (!config) return false;

        if (!this.state.ascensionUpgrades[upgradeKey]) {
            this.state.ascensionUpgrades[upgradeKey] = { level: 0 };
        }

        const current = this.state.ascensionUpgrades[upgradeKey];
        if (config.maxLevel && current.level >= config.maxLevel) return false;

        const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, current.level));

        if (this.state.ascensionPoints >= cost) {
            this.state.ascensionPoints -= cost;
            current.level += 1;
            UI.playSound('upgrade');
            return true;
        }
        return false;
    },

    /**
     * Get ascension upgrade cost
     */
    getAscensionUpgradeCost(upgradeKey) {
        const config = this.CONFIG.ASCENSION_UPGRADES[upgradeKey];
        const current = this.state.ascensionUpgrades[upgradeKey];
        const level = current ? current.level : 0;
        return Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
    },

    /**
     * Calculate transcendence points from ascension level
     */
    calculateTranscendenceGain() {
        if (this.state.ascensionLevel < 5) return 0;
        return Math.floor(Math.sqrt(this.state.ascensionLevel - 4));
    },

    /**
     * Check if can transcend
     */
    canTranscend() {
        return this.state.ascensionLevel >= 5 && this.calculateTranscendenceGain() > 0;
    },

    /**
     * Perform transcendence (ultra-prestige)
     */
    transcend() {
        if (!this.canTranscend()) return false;

        const pointsGained = this.calculateTranscendenceGain();
        this.state.transcendencePoints += pointsGained;
        this.state.transcendenceLevel += 1;
        this.state.stats.totalResets += 1;

        // Reset ascension progress
        this.state.ascensionPoints = 0;
        this.state.ascensionLevel = 0;
        this.state.ascensionUpgrades = {};
        this.state.totalAscensionEarned = 0;

        // Trigger full ascension reset
        this.ascend();

        UI.showNotification('✨ TRANSCENDENCE!', `You have transcended reality! Gained ${pointsGained} Transcendence Points!`);
        return true;
    },

    /**
     * Buy a transcendence upgrade
     */
    buyTranscendenceUpgrade(upgradeKey) {
        const config = this.CONFIG.TRANSCENDENCE_UPGRADES[upgradeKey];
        if (!config) return false;

        if (!this.state.transcendenceUpgrades[upgradeKey]) {
            this.state.transcendenceUpgrades[upgradeKey] = { level: 0 };
        }

        const current = this.state.transcendenceUpgrades[upgradeKey];
        if (config.maxLevel && current.level >= config.maxLevel) return false;

        const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, current.level));

        if (this.state.transcendencePoints >= cost) {
            this.state.transcendencePoints -= cost;
            current.level += 1;
            
            // Special handling for space station unlock
            if (upgradeKey === 'spacestation') {
                this.unlockSpaceStation();
            }
            
            UI.playSound('upgrade');
            return true;
        }
        return false;
    },

    /**
     * Check and unlock content based on milestones
     */
    checkUnlockables() {
        for (const [key, unlock] of Object.entries(this.CONFIG.UNLOCKABLES)) {
            if (this.state.unlockedContent.has(key)) continue;

            let unlocked = false;
            const req = unlock.requirement;

            switch (req.type) {
                case 'prestigeLevel':
                    unlocked = this.state.prestigeLevel >= req.value;
                    break;
                case 'ascensionLevel':
                    unlocked = this.state.ascensionLevel >= req.value;
                    break;
                case 'coins':
                    unlocked = this.state.coins >= req.value;
                    break;
                case 'totalCoinsEarned':
                    unlocked = this.state.totalCoinsEarned >= req.value;
                    break;
                case 'casinoGamesPlayed':
                    unlocked = this.state.casinoGamesPlayed >= req.value;
                    break;
                case 'casinoTotalWon':
                    unlocked = this.state.casinoTotalWon >= req.value;
                    break;
                case 'totalServers':
                    unlocked = Object.values(this.state.servers).reduce((sum, s) => sum + s.count, 0) >= req.value;
                    break;
                case 'totalGenerators':
                    unlocked = this.state.powerGenerators.length >= req.value;
                    break;
                case 'researchCompleted':
                    unlocked = this.state.unlockedResearch.size >= req.value;
                    break;
                case 'achievements':
                    unlocked = this.state.unlockedAchievements.size >= req.value;
                    break;
            }

            if (unlocked) {
                this.state.unlockedContent.add(key);
                UI.showNotification('🔓 Unlocked!', `${unlock.icon} ${unlock.name}: ${unlock.description}`);
            }
        }
    },

    /**
     * Update stats tracking
     */
    updateStats() {
        // Update peak coins
        if (this.state.coins > this.state.stats.peakCoins) {
            this.state.stats.peakCoins = this.state.coins;
        }
        // Update progression peak coins used for boss reward calculations
        if (this.state.coins > (this.state.progressionPeakCoins || 0)) {
            this.state.progressionPeakCoins = this.state.coins;
        }

        // Calculate current CPS
        const cps = this.getTotalProduction();
        if (cps > this.state.stats.peakCoinsPerSecond) {
            this.state.stats.peakCoinsPerSecond = cps;
        }

        // Update session time and total play time
        const tickSeconds = this.CONFIG.TICK_RATE / 1000; // Convert to seconds
        this.state.stats.totalPlayTime = (this.state.stats.totalPlayTime || 0) + (tickSeconds * 1000); // Add milliseconds
        
        const sessionTime = Date.now() - this.state.stats.sessionStartTime;
        if (sessionTime > this.state.stats.longestSession) {
            this.state.stats.longestSession = sessionTime;
        }
    },

    /**
     * Check if player has Dark Matter servers running
     */
    hasDarkMatterServersRunning() {
        // Check all buildings for dark matter servers
        for (const building of Object.values(this.state.buildings || {})) {
            for (const server of (building.placedServers || [])) {
                if (server && server.key === 'darkmatter_x9999') {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Update Dark Matter corruption level
     */
    updateDarkMatterCorruption() {
        const hasDarkMatter = this.hasDarkMatterServersRunning();
        const now = Date.now();
        
        // If dark matter is running
        if (hasDarkMatter) {
            if (!this.state.darkMatterActive) {
                this.state.darkMatterActive = true;
                this.state.darkMatterLastActivity = now;
            }
            
            // Check time since last user activity
            const timeSinceActivity = now - this.state.darkMatterLastActivity;
            const inactivityThreshold = 30000; // 30 seconds before corruption starts
            
            if (timeSinceActivity > inactivityThreshold) {
                // Increase corruption over time (1% every 3 seconds after threshold)
                const corruptionRate = 0.33; // % per second
                const tickSeconds = this.CONFIG.TICK_RATE / 1000;
                const corruptionIncrease = corruptionRate * tickSeconds;
                
                this.state.darkMatterCorruption = Math.min(100, 
                    (this.state.darkMatterCorruption || 0) + corruptionIncrease
                );
                
                // Update UI
                if (typeof DarkMatterCorruption !== 'undefined') {
                    DarkMatterCorruption.updateVisuals(this.state.darkMatterCorruption);
                }
                
                // Check for 100% corruption - spawn corruption boss
                if (this.state.darkMatterCorruption >= 100) {
                    this.triggerCorruptionBoss();
                }
            }
        } else {
            // No dark matter - slowly decrease corruption
            if (this.state.darkMatterCorruption > 0) {
                const decayRate = 1; // % per second decay
                const tickSeconds = this.CONFIG.TICK_RATE / 1000;
                this.state.darkMatterCorruption = Math.max(0, 
                    this.state.darkMatterCorruption - (decayRate * tickSeconds)
                );
                
                // Update UI
                if (typeof DarkMatterCorruption !== 'undefined') {
                    DarkMatterCorruption.updateVisuals(this.state.darkMatterCorruption);
                }
            }
            this.state.darkMatterActive = false;
        }
    },

    /**
     * Reset dark matter activity timer (called on user interaction)
     */
    resetDarkMatterActivity() {
        this.state.darkMatterLastActivity = Date.now();
        
        // Decrease corruption on activity
        if (this.state.darkMatterCorruption > 0) {
            this.state.darkMatterCorruption = Math.max(0, this.state.darkMatterCorruption - 5);
            if (typeof DarkMatterCorruption !== 'undefined') {
                DarkMatterCorruption.updateVisuals(this.state.darkMatterCorruption);
            }
        }
    },

    /**
     * Trigger a corruption boss when dark matter reaches 100%
     */
    triggerCorruptionBoss() {
        // Reset corruption
        this.state.darkMatterCorruption = 0;
        
        if (typeof DarkMatterCorruption !== 'undefined') {
            DarkMatterCorruption.updateVisuals(0);
        }
        
        // Trigger a special corruption boss via BossBattle system
        if (typeof BossBattle !== 'undefined') {
            BossBattle.triggerCorruptionBoss();
        }
    },

    /**
     * Update server corruption/decay for all buildings
     * Servers slowly decay and need repair to maintain efficiency
     */
    updateServerCorruption() {
        const now = Date.now();
        const tickSeconds = this.CONFIG.TICK_RATE / 1000;
        
        // Initialize corruption tracking if needed
        if (!this.state.serverCorruption) {
            this.state.serverCorruption = {};
        }
        
        // Get auto-repair rate from ascension upgrade
        const autoRepairLevel = this.state.ascensionUpgrades?.autorepair || 0;
        const autoRepairRate = autoRepairLevel * 2; // 2/4/6% per tick
        
        // Update each building's corruption
        for (const [buildingId, building] of Object.entries(this.state.buildings)) {
            // Only apply corruption if building has servers
            if (!building.placedServers || building.placedServers.length === 0) {
                this.state.serverCorruption[buildingId] = 0;
                continue;
            }
            
            // Initialize corruption for this building
            if (this.state.serverCorruption[buildingId] === undefined) {
                this.state.serverCorruption[buildingId] = 0;
            }
            
            // Calculate corruption rate based on server count
            // More servers = faster corruption (0.1% per server per second)
            const serverCount = building.placedServers.length;
            let baseCorruptionRate = 0.05 * serverCount; // % per second
            
            // Crusader mode doubles corruption rate
            if (this.state.gameMode === 'crusader') {
                baseCorruptionRate *= this.CRUSADER_MODE_MULTIPLIERS.corruptionMultiplier;
            }
            
            const corruptionIncrease = baseCorruptionRate * tickSeconds;
            
            // Apply auto-repair if available
            if (autoRepairRate > 0) {
                const repairAmount = autoRepairRate * tickSeconds;
                this.state.serverCorruption[buildingId] = Math.max(0, 
                    this.state.serverCorruption[buildingId] + corruptionIncrease - repairAmount
                );
            } else {
                // No auto-repair, corruption increases
                this.state.serverCorruption[buildingId] = Math.min(100, 
                    this.state.serverCorruption[buildingId] + corruptionIncrease
                );
            }
        }
    },

    /**
     * Get corruption level for a building (0-100)
     */
    getBuildingCorruption(buildingId) {
        return this.state.serverCorruption?.[buildingId] || 0;
    },

    /**
     * Get production penalty from corruption (0.0 - 1.0)
     * At 100% corruption, production is reduced by 50%
     */
    getCorruptionPenalty(buildingId) {
        const corruption = this.getBuildingCorruption(buildingId);
        return corruption * 0.005; // 0.5% production loss per 1% corruption
    },

    /**
     * Repair server corruption for a building
     * Costs coins based on corruption level
     */
    repairServerCorruption(buildingId) {
        const corruption = this.getBuildingCorruption(buildingId);
        if (corruption <= 0) return false;
        
        // Calculate repair cost based on total production and corruption level
        const totalProduction = this.getTotalProduction();
        const baseCost = totalProduction * 10; // 10 seconds of production
        const repairCost = Math.floor(baseCost * (corruption / 100) * this.getCostMultiplier());
        
        if (this.state.coins < repairCost) {
            if (typeof UI !== 'undefined') {
                UI.showNotification(`Not enough coins! Need ${this.formatNumber(repairCost)}`, 'error');
            }
            return false;
        }
        
        this.state.coins -= repairCost;
        this.state.serverCorruption[buildingId] = 0;
        
        if (typeof UI !== 'undefined') {
            UI.showNotification(`🔧 Servers repaired! Efficiency restored.`, 'success');
        }
        
        return true;
    },

    /**
     * Get repair cost for a building
     */
    getRepairCost(buildingId) {
        const corruption = this.getBuildingCorruption(buildingId);
        if (corruption <= 0) return 0;
        
        const totalProduction = this.getTotalProduction();
        const baseCost = totalProduction * 10;
        return Math.floor(baseCost * (corruption / 100) * this.getCostMultiplier());
    },

    /**
     * Game tick - called regularly to update passive income
     */
    tick() {
        // Check if power generation is sufficient
        const powerGen = this.getPowerGeneration();
        const powerUsage = this.getPowerUsage();
        const tickRate = this.CONFIG.TICK_RATE / 1000; // Convert to seconds
        
        // Update mining progress for servers
        this.updateMiningProgress();
        
        // Only add production if we have enough power
        if (powerGen >= powerUsage) {
            const production = this.getTotalProduction();
            const earned = production * tickRate;
            this.state.coins += earned;
            this.state.totalCoinsEarned += earned;
            
            // Track passive income for daily challenges
            if (earned > 0) {
                this.updateDailyProgress('passive_earned', earned);
                this.updateDailyProgress('coins_earned', earned);
            }
            
            // Charge battery with excess power
            const excessPower = powerGen - powerUsage;
            const chargeAmount = Math.min(excessPower * tickRate, this.state.batteryChargeRate * tickRate);
            this.chargeBattery(chargeAmount);
        } else {
            // Not enough power - try to discharge battery to make up the difference
            const powerShortfall = powerUsage - powerGen;
            const dischargeAmount = Math.min(powerShortfall * tickRate, this.state.batteryDischargeRate * tickRate);
            const discharged = this.dischargeBattery(dischargeAmount);
            
            // If battery helped, add production
            if (discharged > 0) {
                const production = this.getTotalProduction();
                const earned = production * tickRate;
                this.state.coins += earned;
                this.state.totalCoinsEarned += earned;
                
                // Track passive income for daily challenges
                if (earned > 0) {
                    this.updateDailyProgress('passive_earned', earned);
                    this.updateDailyProgress('coins_earned', earned);
                }
            }
        }
        
        this.checkAchievements();
        this.updateStats();
        this.checkUnlockables();
        
        // Process mining
        if (typeof UI !== 'undefined' && UI.processMiningTick) {
            UI.processMiningTick(this.CONFIG.TICK_RATE);
        }
        
        // Check Dark Matter corruption
        this.updateDarkMatterCorruption();
        
        // Update server corruption
        this.updateServerCorruption();

        // Fighting stamina regeneration - always regen a bit, scaled by tickRate (seconds)
        try {
            const regen = (this.state.fightingStaminaRegen || 0) * tickRate;
            if (this.state.fightingStamina < this.state.fightingStaminaMax && regen > 0) {
                this.state.fightingStamina = Math.min(this.state.fightingStaminaMax, this.state.fightingStamina + regen);
            }
        } catch (e) {
            // ignore if state not ready
        }
    },

    /**
     * Start the game loop
     */
    startGameLoop() {
        setInterval(() => {
            this.tick();
            UI.updateDisplay();
        }, this.CONFIG.TICK_RATE);
    },

    /**
     * Start the save loop
     */
    startSaveLoop() {
        setInterval(() => {
            this.saveGame();
        }, this.CONFIG.SAVE_INTERVAL);
    },

    /**
     * Save game to localStorage
     */
    saveGame() {
        // Check if player has accepted cookies. If declined, still persist to a
        // local-only key so progress isn't lost (user opted out of cookies but
        // may still expect local saves during development/testing).
        const cookieConsent = localStorage.getItem('cookieConsent');
        const saveKey = (cookieConsent === 'declined') ? 'hostxGameSave_localOnly' : 'hostxGameSave';
        
        // Defensive: ensure critical numeric values are sane before saving to disk
        if (!Number.isFinite(Number(this.state.coins))) {
            console.warn('GAME.saveGame: coins invalid, resetting to 0 before save', this.state.coins);
            this.state.coins = 0;
        }
        if (!Number.isFinite(Number(this.state.totalCoinsEarned))) this.state.totalCoinsEarned = Number(this.state.totalCoinsEarned) || 0;

        // Create a proper copy of state
        const stateCopy = {
            darkMode: this.state.darkMode,
            gameMode: this.state.gameMode, // <-- persist game mode
            coins: this.state.coins,
            totalCoinsEarned: this.state.totalCoinsEarned,
            clickPower: this.state.clickPower,
            clickUpgrades: JSON.parse(JSON.stringify(this.state.clickUpgrades)),
            servers: JSON.parse(JSON.stringify(this.state.servers)),
            serverCorruption: JSON.parse(JSON.stringify(this.state.serverCorruption || {})),
            buildings: JSON.parse(JSON.stringify(this.state.buildings)),
            currentBuildingId: this.state.currentBuildingId,
            nextBuildingId: this.state.nextBuildingId,
            powerGenerators: JSON.parse(JSON.stringify(this.state.powerGenerators)),
            powerGrid: JSON.parse(JSON.stringify(this.state.powerGrid)),
            generatorUpgrades: JSON.parse(JSON.stringify(this.state.generatorUpgrades)),
            gridSlotUpgrades: this.state.gridSlotUpgrades,
            batteryCapacity: this.state.batteryCapacity,
            batteryStored: this.state.batteryStored,
            batteryCapacityLevel: this.state.batteryCapacityLevel,
            batteryChargeRate: this.state.batteryChargeRate,
            batteryDischargeRate: this.state.batteryDischargeRate,
            batteryChargeRateLevel: this.state.batteryChargeRateLevel,
            batteryDischargeRateLevel: this.state.batteryDischargeRateLevel,
            skillPoints: this.state.skillPoints,
            totalSkillPointsEarned: this.state.totalSkillPointsEarned,
            totalSkillPointsSpent: this.state.totalSkillPointsSpent || 0,
            unlockedResearch: Array.from(this.state.unlockedResearch),
            unlockedAchievements: Array.from(this.state.unlockedAchievements),
            prestigePoints: this.state.prestigePoints,
            prestigeUpgrades: JSON.parse(JSON.stringify(this.state.prestigeUpgrades)),
            totalPrestigeEarned: this.state.totalPrestigeEarned,
            prestigeLevel: this.state.prestigeLevel,
            // Ascension
            ascensionLevel: this.state.ascensionLevel || 0,
            ascensionPoints: this.state.ascensionPoints || 0,
            totalAscensionEarned: this.state.totalAscensionEarned || 0,
            ascensionUpgrades: JSON.parse(JSON.stringify(this.state.ascensionUpgrades || {})),
            // Transcendence
            transcendenceLevel: this.state.transcendenceLevel || 0,
            transcendencePoints: this.state.transcendencePoints || 0,
            transcendenceUpgrades: JSON.parse(JSON.stringify(this.state.transcendenceUpgrades || {})),
            // Unlockables
            unlockedContent: Array.from(this.state.unlockedContent || new Set()),
            // Stats
            stats: JSON.parse(JSON.stringify(this.state.stats || {})),
            // Casino
            casinoTotalWagered: this.state.casinoTotalWagered,
            casinoTotalWon: this.state.casinoTotalWon,
            casinoGamesPlayed: this.state.casinoGamesPlayed,
            casinoBiggestMultiplier: this.state.casinoBiggestMultiplier,
            casinoBiggestWin: this.state.casinoBiggestWin,
            // Daily Challenges
            dailyChallenges: JSON.parse(JSON.stringify(this.state.dailyChallenges || [])),
            dailyChallengeDate: this.state.dailyChallengeDate,
            dailyProgress: JSON.parse(JSON.stringify(this.state.dailyProgress || {})),
            dailyStreak: this.state.dailyStreak || 0,
            dailyChallengesCompleted: this.state.dailyChallengesCompleted || 0,
            // Leaderboard
            playerName: this.state.playerName || '',
            personalBestCoins: this.state.personalBestCoins || 0,
            longestDailyStreak: this.state.longestDailyStreak || 0,
            // Mini-games
            minigameCooldowns: JSON.parse(JSON.stringify(this.state.minigameCooldowns || {})),
            minigameHistory: JSON.parse(JSON.stringify(this.state.minigameHistory || [])),
            minigameStats: JSON.parse(JSON.stringify(this.state.minigameStats || {})),
            nextWinMultiplier: this.state.nextWinMultiplier || 1,
            // Guild
            guild: this.state.guild ? JSON.parse(JSON.stringify(this.state.guild)) : null,
            // VIP System
            vipXp: this.state.vipXp || 0,
            vipLevel: this.state.vipLevel || 1,
            vipDailyClaimTime: this.state.vipDailyClaimTime,
            vipFreeSpinsUsed: this.state.vipFreeSpinsUsed || 0,
            vipFreeSpinsLastReset: this.state.vipFreeSpinsLastReset,
            // Jackpot System
            jackpotPool: this.state.jackpotPool || 10000,
            jackpotTickets: this.state.jackpotTickets || 0,
            jackpotHistory: JSON.parse(JSON.stringify(this.state.jackpotHistory || [])),
            // Skill Trees
            skillTreeLevels: JSON.parse(JSON.stringify(this.state.skillTreeLevels || {})),
            activeSkillEffects: JSON.parse(JSON.stringify(this.state.activeSkillEffects || {})),
            activeSynergies: JSON.parse(JSON.stringify(this.state.activeSynergies || [])),
            // Boss Battles
            fightingUnlocked: this.state.fightingUnlocked || false,
            unlockedAttacks: JSON.parse(JSON.stringify(this.state.unlockedAttacks || [])),
            fightingStamina: this.state.fightingStamina || 0,
            fightingStaminaMax: this.state.fightingStaminaMax || 0,
            fightingStaminaRegen: this.state.fightingStaminaRegen || 0,
            fightingUpgrades: JSON.parse(JSON.stringify(this.state.fightingUpgrades || {})),
            // Ensure we don't persist malformed currentBattle objects which can cause UI to get stuck on reload
            currentBattle: JSON.parse(JSON.stringify((this.state && this.state.currentBattle && this.state.currentBattle.boss && this.state.currentBattle.player && this.state.currentBattle.startTime) ? this.state.currentBattle : null)),
            // Player gear (recruitment system retired)
            gear: JSON.parse(JSON.stringify(this.state.gear || {})),
            // Player inventory and equipped items
            inventory: JSON.parse(JSON.stringify(this.state.inventory || [])),
            equipped: JSON.parse(JSON.stringify(this.state.equipped || {})),
            fightingStats: JSON.parse(JSON.stringify(this.state.fightingStats || {})),
            bossDefeated: this.state.bossDefeated || 0,
            bossesKilled: JSON.parse(JSON.stringify(this.state.bossesKilled || [])),
            // Progression save for fighting
            fightingProgressCounts: JSON.parse(JSON.stringify(this.state.fightingProgressCounts || {})),
            unlockedBosses: Array.from(this.state.unlockedBosses || new Set()),
            randomAIDefeats: this.state.randomAIDefeats || 0,
            progressionPeakCoins: this.state.progressionPeakCoins || 0,
            // Mining System
            mines: JSON.parse(JSON.stringify(this.state.mines || {})),
            // Materials (iron/steel/etc.) - persist materials so e.g. steel isn't lost
            materials: JSON.parse(JSON.stringify(this.state.materials || {})),
            // Smeltery queue jobs (queued smelting work)
            smelteryJobs: JSON.parse(JSON.stringify(this.state.smelteryJobs || [])),
            // Dark Matter Corruption (don't save corruption - resets on reload)
            darkMatterCorruption: 0,
            darkMatterLastActivity: Date.now(),
            // last save time + file integrity persisted
            fileIntegrityPercent: this.state && typeof this.state.fileIntegrityPercent === 'number' ? this.state.fileIntegrityPercent : 100,
            lastSaveTime: this.state.lastSaveTime
        };
        
        const saveData = {
            state: stateCopy,
            version: 1,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(saveKey, JSON.stringify(saveData));
            console.log('Game saved to', saveKey, 'at', new Date().toLocaleTimeString(), 'coins=', this.state.coins);
        } catch (e) {
            console.warn('GAME.saveGame: failed to write save to localStorage', e);
        }
    },

    /**
     * Load game from localStorage
     */
    loadGame() {
        // Try both primary and local-only save keys and pick the one with the best numeric `coins` value.
        const rawPrimary = localStorage.getItem('hostxGameSave');
        const rawLocal = localStorage.getItem('hostxGameSave_localOnly');
        let chosenRaw = rawPrimary || rawLocal || null;
        let chosenKey = rawPrimary ? 'hostxGameSave' : (rawLocal ? 'hostxGameSave_localOnly' : null);

        // If both saves exist, parse both and choose the one with larger finite coins value.
        if (rawPrimary && rawLocal) {
            try {
                const p1 = JSON.parse(rawPrimary);
                const p2 = JSON.parse(rawLocal);
                const c1 = (p1 && p1.state && Number.isFinite(Number(p1.state.coins))) ? Number(p1.state.coins) : -Infinity;
                const c2 = (p2 && p2.state && Number.isFinite(Number(p2.state.coins))) ? Number(p2.state.coins) : -Infinity;
                if (c2 > c1) {
                    chosenRaw = rawLocal;
                    chosenKey = 'hostxGameSave_localOnly';
                    console.log('GAME.loadGame: found both save keys; choosing local-only save (higher coins)');
                } else {
                    chosenRaw = rawPrimary;
                    chosenKey = 'hostxGameSave';
                    console.log('GAME.loadGame: found both save keys; choosing primary save (higher or equal coins)');
                }
            } catch (e) {
                // If parsing both fails, fall back to whichever raw string existed and log
                console.warn('GAME.loadGame: failed to parse both saves for comparison, using fallback pick', e);
            }
        } else if (rawLocal && !rawPrimary) {
            console.log('GAME.loadGame: using local-only fallback save');
        }

        this._loadCount = (this._loadCount || 0) + 1;
        console.log('GAME.loadGame: run #', this._loadCount, 'raw save present =', !!chosenRaw, 'usingKey=', chosenKey);
        if (!chosenRaw) return;

        try {
            const parsed = JSON.parse(chosenRaw);
            const s = parsed.state || {};
            console.log('GAME.loadGame: parsed save coins (raw) ->', (parsed && parsed.state) ? parsed.state.coins : '(no state)');
            console.log('GAME.loadGame: parsed save coins type ->', (parsed && parsed.state) ? typeof parsed.state.coins : '(no state)');
            // Defensive: remove malformed numeric fields so they don't overwrite current state
            const numericKeys = ['coins','totalCoinsEarned','skillPoints','prestigePoints','batteryStored','batteryCapacity','fightingStamina','fightingStaminaMax','fightingStaminaRegen','totalCoinsEarned'];
            numericKeys.forEach(k => {
                if (!Object.prototype.hasOwnProperty.call(s, k)) return;
                let v = s[k];
                // Attempt to coerce common non-numeric representations before dropping
                if (typeof v === 'string') {
                    const sv = v.trim().toLowerCase();
                    if (sv === 'none' || sv === 'null' || sv === 'undefined') {
                        console.warn(`GAME.loadGame: coercing numeric ${k} value "${v}" -> 0`);
                        s[k] = 0;
                        return;
                    }
                    // Remove thousands separators/spaces and try parse again
                    const cleaned = v.replace(/,/g, '').replace(/\s+/g, '');
                    if (Number.isFinite(Number(cleaned))) {
                        s[k] = Number(cleaned);
                        return;
                    }
                }

                if (!Number.isFinite(Number(v))) {
                    console.warn(`GAME.loadGame: dropping invalid numeric key ${k} from save (${v})`);
                    delete s[k];
                }
            });
            console.log('GAME.loadGame: post-cleanup save coins ->', s.coins, 'hasOwn=', Object.prototype.hasOwnProperty.call(s, 'coins'));

            // Merge state and normalize key fields
            this.state = { ...this.state, ...s };
            // Ensure materials from save are applied safely (migration safety)
            if (s.materials !== undefined) this.state.materials = s.materials || this.state.materials || {};
            // Restore smelteryJobs if present, ensure array shape and restart ticker
            if (s.smelteryJobs !== undefined) {
                this.state.smelteryJobs = Array.isArray(s.smelteryJobs) ? s.smelteryJobs : [];
            } else if (!Array.isArray(this.state.smelteryJobs)) {
                this.state.smelteryJobs = [];
            }
            try {
                if (Array.isArray(this.state.smelteryJobs) && this.state.smelteryJobs.length > 0) {
                    console.log('GAME.loadGame: smelteryJobs restored len=', this.state.smelteryJobs.length);
                    // Defer ticker start slightly to ensure GAME methods and UI are initialized
                    setTimeout(() => {
                        try {
                            console.log('GAME.loadGame: attempting to start smeltery ticker (deferred) - checking starters');
                            var startedTicker = false;
                            if (typeof GAME !== 'undefined' && typeof GAME._ensureSmelteryTicker === 'function') {
                                try { GAME._ensureSmelteryTicker(); startedTicker = true; } catch(e) { console.log('GAME._ensureSmelteryTicker call failed', e); }
                            }
                            if (!startedTicker && typeof GAME !== 'undefined' && typeof GAME.startSmelteryTickerIfNeeded === 'function') {
                                try { GAME.startSmelteryTickerIfNeeded(); startedTicker = true; } catch(e) { console.log('GAME.startSmelteryTickerIfNeeded call failed', e); }
                            }
                            if (!startedTicker && typeof this._ensureSmelteryTicker === 'function') {
                                try { this._ensureSmelteryTicker(); startedTicker = true; } catch(e) { console.log('this._ensureSmelteryTicker call failed', e); }
                            }
                            if (!startedTicker && typeof this.startSmelteryTickerIfNeeded === 'function') {
                                try { this.startSmelteryTickerIfNeeded(); startedTicker = true; } catch(e) { console.log('this.startSmelteryTickerIfNeeded call failed', e); }
                            }
                            if (!startedTicker) {
                                console.log('GAME.loadGame: no smelteryTicker starter found after checks — starting inline fallback');
                                try {
                                    // Inline fallback: start a simple ticker that processes jobs
                                    if (!GAME._smelteryTicker && !this._smelteryTicker) {
                                        const fallbackDoTick = () => {
                                            try {
                                                const jobs = (GAME.state && Array.isArray(GAME.state.smelteryJobs)) ? GAME.state.smelteryJobs.slice() : [];
                                                if (jobs.length === 0) return;
                                                for (const j of jobs) {
                                                    if (!j || j.remaining <= 0) continue;
                                                    const perUnitPower = 100;
                                                    let availGen = 0;
                                                    try {
                                                        const gen = (typeof GAME.getPowerGeneration === 'function') ? GAME.getPowerGeneration() : 0;
                                                        const usage = (typeof GAME.getTotalPowerUsage === 'function') ? GAME.getTotalPowerUsage() : 0;
                                                        availGen = Math.max(0, Math.floor(gen - usage));
                                                    } catch (e) { availGen = 0; }
                                                    let batteryNeeded = Math.max(0, perUnitPower - availGen);
                                                    if (batteryNeeded > 0) {
                                                        const provided = (typeof GAME.dischargeBattery === 'function') ? GAME.dischargeBattery(batteryNeeded) : 0;
                                                        if (provided < batteryNeeded) { continue; }
                                                    }
                                                    // register transient usage for this inline fallback tick
                                                    try { GAME._transientPowerUsage = (GAME._transientPowerUsage || 0) + perUnitPower; } catch(e) {}
                                                    const matIron = Math.floor(GAME.state.materials.iron || 0);
                                                    const mineIron = (GAME.state.mines && GAME.state.mines.iron && typeof GAME.state.mines.iron.stored !== 'undefined') ? Math.floor(GAME.state.mines.iron.stored) : 0;
                                                    const totalIron = matIron + mineIron;
                                                    if (totalIron <= 0) continue;
                                                    if (matIron > 0) GAME.state.materials.iron = Math.max(0, matIron - 1);
                                                    else if (GAME.state.mines && GAME.state.mines.iron) GAME.state.mines.iron.stored = Math.max(0, Math.floor(mineIron - 1));
                                                    GAME.state.materials.steel = (GAME.state.materials.steel || 0) + 1;
                                                    j.remaining = Math.max(0, j.remaining - 1);
                                                    try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e){}
                                                    try { /* per-unit notification removed (inline fallback) */ } catch(e){}
                                                    try { if (typeof UI !== 'undefined' && UI.updateFurnaceCounts) UI.updateFurnaceCounts(); } catch(e){}
                                                    GAME.saveGame && GAME.saveGame();
                                                    if (j.remaining <= 0) {
                                                        const idx = GAME.state.smelteryJobs.findIndex(x => x.id === j.id);
                                                        if (idx !== -1) GAME.state.smelteryJobs.splice(idx, 1);
                                                        try { /* completion notification removed (inline fallback) */ } catch(e){}
                                                    }
                                                    // clear transient usage after processing
                                                    try { GAME._transientPowerUsage = Math.max(0, (GAME._transientPowerUsage || 0) - perUnitPower); } catch(e) {}
                                                    break;
                                                }
                                            } catch (e) { console.log('smelteryTicker inline fallback error', e); }
                                        };
                                        try { fallbackDoTick(); } catch(e) { console.log('smelteryTicker inline initial tick error', e); }
                                        GAME._smelteryTicker = setInterval(fallbackDoTick, 1000);
                                    }
                                } catch (e) { console.log('GAME.loadGame: inline fallback failed', e); }
                            }
                            if (typeof UI !== 'undefined' && UI.updateFurnaceCounts) UI.updateFurnaceCounts();
                            // If a queue exists, open the Forge/Smeltery UI so player sees it's active
                            try { if (typeof UI !== 'undefined' && typeof UI.openForgeTab === 'function') UI.openForgeTab(); } catch(e) {}
                        } catch (e) { console.log('smelteryJobs deferred restore warning', e); }
                    }, 300);
                } else {
                    console.log('GAME.loadGame: no smelteryJobs to restore');
                }
            } catch(e) { console.log('smelteryJobs restore warning', e); }
            this.state.unlockedAchievements = new Set(s.unlockedAchievements || this.state.unlockedAchievements || []);
            this.state.unlockedResearch = new Set(s.unlockedResearch || this.state.unlockedResearch || []);
            this.state.unlockedContent = new Set(s.unlockedContent || this.state.unlockedContent || []);
            // Convert unlockedBosses to Set
            if (s.unlockedBosses !== undefined) {
                this.state.unlockedBosses = new Set(s.unlockedBosses || []);
            } else if (!this.state.unlockedBosses || typeof this.state.unlockedBosses.has !== 'function') {
                this.state.unlockedBosses = new Set(this.state.unlockedBosses || []);
            }
            // Fighting progression counts - ensure object
            this.state.fightingProgressCounts = s.fightingProgressCounts || this.state.fightingProgressCounts || {};
            // Random AI spawn defeats (migration safety)
            if (s.randomAIDefeats !== undefined) this.state.randomAIDefeats = Number(s.randomAIDefeats) || 0;
            // Progression peak coins
            if (s.progressionPeakCoins !== undefined) this.state.progressionPeakCoins = s.progressionPeakCoins || 0;

            // Ensure arrays are initialized
            this.state.unlockedAttacks = s.unlockedAttacks || this.state.unlockedAttacks || [];
            this.state.dailyChallenges = s.dailyChallenges || this.state.dailyChallenges || [];
            this.state.dailyChallengeDate = s.dailyChallengeDate || this.state.dailyChallengeDate;
            this.state.dailyProgress = s.dailyProgress || this.state.dailyProgress || {};
            if (s.dailyStreak !== undefined) this.state.dailyStreak = s.dailyStreak;

            // Minigame
            this.state.minigameCooldowns = s.minigameCooldowns || this.state.minigameCooldowns || {};
            this.state.minigameHistory = s.minigameHistory || this.state.minigameHistory || [];
            this.state.minigameStats = s.minigameStats || this.state.minigameStats || {};
            if (s.nextWinMultiplier !== undefined) this.state.nextWinMultiplier = s.nextWinMultiplier;

            // Ascension / Transcendence
            if (s.ascensionLevel !== undefined) {
                this.state.ascensionLevel = s.ascensionLevel;
                this.state.ascensionPoints = s.ascensionPoints || 0;
                this.state.totalAscensionEarned = s.totalAscensionEarned || 0;
                this.state.ascensionUpgrades = s.ascensionUpgrades || {};
            }
            if (s.transcendenceLevel !== undefined) {
                this.state.transcendenceLevel = s.transcendenceLevel;
                this.state.transcendencePoints = s.transcendencePoints || 0;
                this.state.transcendenceUpgrades = s.transcendenceUpgrades || {};
            }

            // Defaults and migration safety
            if (!this.state.generatorUpgrades) this.state.generatorUpgrades = {};
            if (!this.state.fightingUpgrades) this.state.fightingUpgrades = {};
            if (!this.state.unlockedAttacks) this.state.unlockedAttacks = [];
            if (!this.state.stats) this.state.stats = { sessionStartTime: Date.now(), totalSessions: 0 };

            // Auto-unlock tabs for players with progress
            const hasServers = Object.values(this.state.servers || {}).some(srv => srv.count > 0);
            const hasBuildings = Object.keys(this.state.buildings || {}).length > 1;
            if (hasServers || hasBuildings) this.state.unlockedResearch.add('servers_tab_unlock');
            if ((this.state.casinoGamesPlayed || 0) > 0) this.state.unlockedResearch.add('casino_unlock');

            // Validate current battle
            if (this.state.currentBattle) {
                try {
                    const cb = this.state.currentBattle;
                    const valid = cb && typeof cb === 'object' && cb.boss && cb.player && cb.startTime && cb.timeLimit;
                    if (!valid) {
                        console.warn('Saved currentBattle invalid - clearing to avoid stuck UI');
                        this.state.currentBattle = null;
                    } else {
                        if (cb.boss && (cb.boss.maxHp && (typeof cb.boss.currentHp !== 'number'))) cb.boss.currentHp = cb.boss.maxHp;
                        if (cb.player && (cb.player.maxHp && (typeof cb.player.currentHp !== 'number'))) cb.player.currentHp = cb.player.maxHp;
                        try { if (cb._resolving) delete cb._resolving; } catch(e) {}
                    }
                } catch (e) {
                    console.log('Error validating currentBattle after load', e);
                    this.state.currentBattle = null;
                }
            }

            // Final repairs and checks
            this.state.stats.sessionStartTime = Date.now();
            this.state.stats.totalSessions = (this.state.stats.totalSessions || 0) + 1;

            // Ensure unlockedResearch is a Set
            if (!this.state.unlockedResearch || typeof this.state.unlockedResearch.has !== 'function') {
                this.state.unlockedResearch = new Set(this.state.unlockedResearch || []);
            }

            // Apply fighting upgrades and other restorations
            try { this.applyFightingUpgrades(); } catch (e) { /* ignore */ }

            this.checkDailyLogin();
            this.checkPrestigeMilestones();

            // Sanitize numeric fields to avoid NaN causing UI problems - only set fallback if current state is invalid
            // Prefer values coming from the parsed save `s` when present, as merge/transform steps
            // earlier may change `this.state` unexpectedly. Using `s` ensures we preserve the
            // intended persisted numeric values when they are valid.
            const sanitizeIfNeeded = (path, fallback=0) => {
                // If the parsed save explicitly contained this key, prefer it
                let val = (s && Object.prototype.hasOwnProperty.call(s, path)) ? s[path] : this.state[path];
                if (typeof val === 'string') {
                    // Allow comma-formatted numbers saved by older code or user edits
                    const cleaned = val.replace(/,/g, '').trim();
                    if (Number.isFinite(Number(cleaned))) {
                        val = Number(cleaned);
                    }
                }
                if (val === undefined || val === null || !Number.isFinite(Number(val))) {
                    // Fall back to any existing runtime numeric value if valid, else the provided fallback
                    const existing = (this.state && Number.isFinite(Number(this.state[path]))) ? Number(this.state[path]) : fallback;
                    console.warn(`GAME.loadGame: Sanitized/initialized numeric ${path} -> ${existing}`);
                    this.state[path] = existing;
                } else {
                    this.state[path] = Number(val);
                }
            };
            sanitizeIfNeeded('coins', 0);
            sanitizeIfNeeded('totalCoinsEarned', 0);
            sanitizeIfNeeded('skillPoints', 0);
            sanitizeIfNeeded('prestigePoints', 0);
            sanitizeIfNeeded('batteryStored', 0);
            sanitizeIfNeeded('batteryCapacity', 0);
            // Add more fields as needed as issues are discovered

            // Clamp loaded materials and mine stored values to configured maximums
            try {
                const MAX_MATERIAL_STORED = 6400;
                if (this.state.materials) {
                    Object.keys(this.state.materials).forEach(k => {
                        const v = Math.max(0, Math.floor(this.state.materials[k] || 0));
                        this.state.materials[k] = Math.min(MAX_MATERIAL_STORED, v);
                    });
                }

                if (this.state.mines) {
                    Object.keys(this.state.mines).forEach(k => {
                        if (!this.state.mines[k]) this.state.mines[k] = { level: 0, mined: 0, stored: 0 };
                        const mined = Math.max(0, Math.floor(this.state.mines[k].mined || 0));
                        const stored = Math.max(0, Math.floor(this.state.mines[k].stored || 0));
                        this.state.mines[k].mined = Math.min(MAX_MATERIAL_STORED, mined);
                        this.state.mines[k].stored = Math.min(MAX_MATERIAL_STORED, stored);
                    });
                }
            } catch (e) {
                console.warn('GAME.loadGame: error clamping materials/mines after load', e);
            }

            // Restore inventory and equipped items safely; truncate inventory to max 20 items
            try {
                this.state.inventory = s.inventory || this.state.inventory || [];
                if (!Array.isArray(this.state.inventory)) this.state.inventory = [];
                // keep newest 20 items
                if (this.state.inventory.length > 20) this.state.inventory = this.state.inventory.slice(-20);

                this.state.equipped = s.equipped || this.state.equipped || {};
                if (!this.state.equipped || typeof this.state.equipped !== 'object') this.state.equipped = {};
                // Validate equipped IDs exist in inventory, else clear slot
                const invIds = new Set((this.state.inventory || []).map(i => i.id));
                Object.keys(this.state.equipped).forEach(slot => {
                    if (this.state.equipped[slot] && !invIds.has(this.state.equipped[slot])) this.state.equipped[slot] = null;
                });
            } catch (e) {
                console.warn('GAME.loadGame: error restoring inventory/equipped', e);
                this.state.inventory = this.state.inventory || [];
                this.state.equipped = this.state.equipped || {};
            }

            console.log('Game loaded successfully');
            console.log('GAME.state summary:', { coins: this.state.coins, unlockedResearchCount: this.state.unlockedResearch ? this.state.unlockedResearch.size : 0, serversCount: Object.keys(this.state.servers || {}).length});
        } catch (e) {
            console.error('Error loading game:', e);
            this.initializeUpgrades();
            this.initializeServers();
        }
    },

    /**
     * Check for daily login rewards
     */
    checkDailyLogin() {
        const today = new Date().toDateString();
        const lastLogin = this.state.lastLoginDate;
        
        if (lastLogin !== today) {
            // First login of the day
            if (lastLogin) {
                // Check if it's consecutive day
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayString = yesterday.toDateString();
                
                if (lastLogin === yesterdayString) {
                    // Consecutive login - increase streak
                    this.state.dailyStreak = (this.state.dailyStreak || 0) + 1;
                } else {
                    // Streak broken
                    this.state.dailyStreak = 1;
                }
            } else {
                // First ever login
                this.state.dailyStreak = 1;
            }
            
            // Update longest streak
            if (this.state.dailyStreak > (this.state.longestDailyStreak || 0)) {
                this.state.longestDailyStreak = this.state.dailyStreak;
            }
            
            // Update last login date
            this.state.lastLoginDate = today;
            
            // Award daily reward
            this.claimDailyReward();
            
            // Show notification if UI exists
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification(`🎁 Daily Login!`, `Day ${this.state.dailyStreak} - Keep the streak going!`);
            }
        }
    },

    /**
     * Claim daily reward for current streak
     */
    claimDailyReward() {
        const streak = Math.min(this.state.dailyStreak, 30); // Cap at 30 days
        const reward = this.CONFIG.DAILY_REWARDS[streak - 1];
        
        if (reward) {
            // Award coins
            this.state.coins += reward.coins;
            this.state.totalCoinsEarned += reward.coins;
            
            // Award achievement points
            if (reward.achievementPoints) {
                this.state.achievementPoints += reward.achievementPoints;
                this.state.totalAchievementPointsEarned += reward.achievementPoints;
            }
            
            // Mark as claimed
            this.state.dailyRewardsClaimed.add(streak);
            
            // Show reward notification
            let rewardText = `+${this.formatNumber(reward.coins)} coins`;
            if (reward.achievementPoints) {
                rewardText += ` and ${reward.achievementPoints} achievement points`;
            }
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('🎁 Daily Reward Claimed!', rewardText);
            }
        }
    },

    /**
     * Check for prestige milestone rewards
     */
    checkPrestigeMilestones() {
        for (const [key, milestone] of Object.entries(this.CONFIG.PRESTIGE_MILESTONES)) {
            if (!this.state.prestigeMilestones.has(key) && this.state.prestigeLevel >= milestone.requirement) {
                // Award milestone reward
                this.state.prestigeMilestones.add(key);
                
                if (milestone.reward.coins) {
                    this.state.coins += milestone.reward.coins;
                    this.state.totalCoinsEarned += milestone.reward.coins;
                }
                
                if (milestone.reward.achievementPoints) {
                    this.state.achievementPoints += milestone.reward.achievementPoints;
                    this.state.totalAchievementPointsEarned += milestone.reward.achievementPoints;
                }
                
                if (milestone.reward.skillPoints) {
                    this.earnSkillPoints(milestone.reward.skillPoints);
                }
                
                // Show notification
                UI.showNotification('🏆 Prestige Milestone!', `Reached Prestige ${milestone.requirement}!`);
            }
        }
    },

    /**
     * Format large numbers for display
     */
    /**
     * Generate a lucky block with random rarity
     */
    generateLuckyBlock() {
        const blockTypes = Object.entries(this.CONFIG.LUCKY_BLOCKS);
        const rand = Math.random();
        let cumulativeChance = 0;
        
        for (const [key, config] of blockTypes) {
            cumulativeChance += config.chance;
            if (rand <= cumulativeChance) {
                return {
                    type: key,
                    name: this.generateBlockName(),
                    rarity: config,
                    miningTimeMultiplier: config.miningTimeMultiplier,
                    coinBonus: config.coinBonus
                };
            }
        }
        
        // Fallback to common
        return {
            type: 'common',
            name: this.generateBlockName(),
            rarity: this.CONFIG.LUCKY_BLOCKS.common,
            miningTimeMultiplier: 1.0,
            coinBonus: 1.0
        };
    },

    /**
     * Generate a random block name
     */
    generateBlockName() {
        const prefixes = ['Block', 'Chunk', 'Sector', 'Hash', 'Chain'];
        const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Cyan', 'Orange', 'Pink', 'Gold', 'Silver'];
        const suffixes = ['Prime', 'Ultra', 'Mega', 'Giga', 'Tera', 'Nexus', 'Core', 'Gate', 'Link', 'Node'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const number = Math.floor(Math.random() * 9999) + 1;
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix} ${color}-${number} ${suffix}`;
    },

    /**
     * Get worker cost for a server (scales exponentially by tier)
     */
    getWorkerCost(serverId) {
        // Find the server to get its tier (rack units)
        for (const buildingId in this.state.buildings) {
            const building = this.state.buildings[buildingId];
            const server = building.placedServers.find(s => s.serverId === serverId);
            
            if (server) {
                const config = this.CONFIG.SERVERS[server.type];
                const baseCost = 5000;
                const tierMultiplier = Math.pow(5, config.rackUnits); // 1U = 5x, 2U = 25x, 3U = 125x, 4U = 625x
                return Math.floor(baseCost * tierMultiplier * this.getCostMultiplier());
            }
        }
        return Math.floor(5000 * this.getCostMultiplier()); // Fallback
    },

    /**
     * Buy a worker for a specific server (max 1 per server)
     */
    buyWorker(serverId) {
        // Find the server in any building
        for (const buildingId in this.state.buildings) {
            const building = this.state.buildings[buildingId];
            const server = building.placedServers.find(s => s.serverId === serverId);
            
            if (server) {
                if (server.hasWorker) return false; // Already has a worker
                
                const cost = this.getWorkerCost(serverId);
                if (this.state.coins >= cost) {
                    this.state.coins -= cost;
                    server.hasWorker = true;
                    UI.playSound('upgrade');
                    this.checkAchievements();
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Update mining progress for all servers in all buildings
     */
    updateMiningProgress() {
        const tickRate = this.CONFIG.TICK_RATE / 1000; // Convert to seconds
        const baseMiningSpeed = 0.4; // Base progress per second (takes 250 seconds without workers)
        
        for (const [buildingId, building] of Object.entries(this.state.buildings)) {
            // Skip mining if rack is powered down or power is insufficient
            const skipMining = building.rackPoweredDown || this.isPowerCritical();
            
            for (const server of building.placedServers) {
                // Initialize mining data if missing (for loaded saves)
                if (!server.miningProgress && server.miningProgress !== 0) {
                    server.miningProgress = 0;
                }
                if (!server.currentBlock) {
                    server.currentBlock = this.generateLuckyBlock();
                }
                if (!server.miningStartTime) {
                    server.miningStartTime = Date.now();
                }
                if (server.hasWorker === undefined) {
                    server.hasWorker = false;
                }
                
                // Don't update mining if rack is powered down or power is insufficient
                if (skipMining) {
                    continue;
                }
                
                // Mining always progresses (base rate × 1.5 if server has worker for 50% efficiency boost)
                const workerMultiplier = server.hasWorker ? 1.5 : 1.0;
                
                // Get mining time multiplier from lucky block
                const blockMultiplier = server.currentBlock?.miningTimeMultiplier || 1.0;
                
                const miningSpeed = (baseMiningSpeed * workerMultiplier) / blockMultiplier;
                server.miningProgress += miningSpeed * tickRate;
                
                // Reset mining if progress reaches 100
                if (server.miningProgress >= 100) {
                    // Double-check power is available before awarding
                    if (!skipMining) {
                        // Award coins from the lucky block bonus
                        const blockBonus = server.currentBlock?.coinBonus || 1.0;
                        const bonusCoins = Math.floor(Math.random() * 10 + 5) * blockBonus; // 5-15 coins per block × bonus
                        this.state.coins += bonusCoins;
                        this.state.totalCoinsEarned += bonusCoins;
                        
                        // Award skill points for better blocks
                        const blockRarity = server.currentBlock?.rarity;
                        let skillPointsAwarded = 0;
                        if (blockRarity?.name === 'Rare Block') {
                            skillPointsAwarded = 1;
                        } else if (blockRarity?.name === 'Epic Block') {
                            skillPointsAwarded = 3;
                        } else if (blockRarity?.name === 'Legendary Block') {
                            skillPointsAwarded = 10;
                        }
                        
                        if (skillPointsAwarded > 0) {
                            this.earnSkillPoints(skillPointsAwarded);
                            // Refresh research tab when skill points are earned
                            UI.setupResearchTab();
                        }
                        
                        // Show popup if block is better than common
                        if (blockRarity && blockRarity.name !== 'Common Block') {
                            UI.showBonusPopup(blockRarity.name.replace(' Block', ''), bonusCoins, skillPointsAwarded);
                        }
                    }
                    
                    // Generate next lucky block
                    server.miningProgress = 0;
                    server.currentBlock = this.generateLuckyBlock();
                    server.miningStartTime = Date.now();
                }
            }
        }
    },

    /**
     * Complete mining for a specific server (manual click)
     */
    completeMining(buildingId, serverId) {
        const building = this.state.buildings[buildingId];
        if (!building) return false;
        
        // Don't allow manual completion if power is down or insufficient
        if (this.isPowerCritical() || building.rackPoweredDown) {
            return false;
        }
        
        const server = building.placedServers.find(s => s.serverId === serverId);
        if (!server) return false;
        
        // Award coins from the lucky block bonus
        const blockBonus = server.currentBlock?.coinBonus || 1.0;
        const bonusCoins = Math.floor(Math.random() * 10 + 5) * blockBonus; // 5-15 coins per block × bonus
        this.state.coins += bonusCoins;
        this.state.totalCoinsEarned += bonusCoins;
        
        server.miningProgress = 0;
        server.currentBlock = this.generateLuckyBlock();
        server.miningStartTime = Date.now();
        return true;
    },

    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        
        // Extended number suffixes
        const suffixes = [
            { value: 1e306, suffix: 'MI' },      // Millillion
            { value: 1e303, suffix: 'Ce' },      // Centillion
            { value: 1e300, suffix: 'Dc' },      // Decicentillion
            { value: 1e297, suffix: 'Tc' },      // Trecentillion
            { value: 1e100, suffix: 'Gg' },      // Googol
            { value: 1e93, suffix: 'Tg' },       // Trigintillion
            { value: 1e63, suffix: 'Vg' },       // Vigintillion
            { value: 1e42, suffix: 'TDe' },      // Tredecillion
            { value: 1e39, suffix: 'DDe' },      // Duodecillion
            { value: 1e36, suffix: 'UDe' },      // Undecillion
            { value: 1e33, suffix: 'De' },       // Decillion
            { value: 1e30, suffix: 'No' },       // Nonillion
            { value: 1e27, suffix: 'Oc' },       // Octillion
            { value: 1e24, suffix: 'Sp' },       // Septillion
            { value: 1e21, suffix: 'Sx' },       // Sextillion
            { value: 1e18, suffix: 'Qn' },       // Quintillion
            { value: 1e15, suffix: 'Qd' },       // Quadrillion
            { value: 1e12, suffix: 'T' },        // Trillion
            { value: 1e9, suffix: 'B' },         // Billion
            { value: 1e6, suffix: 'M' },         // Million
            { value: 1e3, suffix: 'K' },         // Thousand
        ];
        
        for (const { value, suffix } of suffixes) {
            if (num >= value) {
                return (num / value).toFixed(2) + suffix;
            }
        }
        
        return num.toFixed(0);
    },

    /**
     * Format power values for display (Watts to Quettawatts)
     */
    formatPower(watts) {
        if (watts === null || watts === undefined || isNaN(watts)) return '0 W';
        
        // Extended power suffixes
        const suffixes = [
            { value: 1e30, suffix: 'QW' },      // Quettawatt
            { value: 1e27, suffix: 'RW' },      // Ronnawatt
            { value: 1e24, suffix: 'YW' },      // Yottawatt
            { value: 1e21, suffix: 'ZW' },      // Zettawatt
            { value: 1e18, suffix: 'EW' },      // Exawatt
            { value: 1e15, suffix: 'PW' },      // Petawatt
            { value: 1e12, suffix: 'TW' },      // Terawatt
            { value: 1e9, suffix: 'GW' },       // Gigawatt
            { value: 1e6, suffix: 'MW' },       // Megawatt
            { value: 1e3, suffix: 'kW' },       // Kilowatt
        ];
        
        for (const { value, suffix } of suffixes) {
            if (watts >= value) {
                return (watts / value).toFixed(2) + ' ' + suffix;
            }
        }
        
        return watts.toFixed(0) + ' W';
    },

    /**
     * Format hash rate for display (H/s, kH/s, MH/s, GH/s, TH/s, PH/s, EH/s)
     * 1 TH/s = 1 balance
     */
    formatHashRate(hashesPerSecond) {
        if (hashesPerSecond === null || hashesPerSecond === undefined || isNaN(hashesPerSecond)) return '0 H/s';
        if (hashesPerSecond >= 1e18) return (hashesPerSecond / 1e18).toFixed(2) + ' EH/s';
        if (hashesPerSecond >= 1e15) return (hashesPerSecond / 1e15).toFixed(2) + ' PH/s';
        if (hashesPerSecond >= 1e12) return (hashesPerSecond / 1e12).toFixed(2) + ' TH/s';
        if (hashesPerSecond >= 1e9) return (hashesPerSecond / 1e9).toFixed(2) + ' GH/s';
        if (hashesPerSecond >= 1e6) return (hashesPerSecond / 1e6).toFixed(2) + ' MH/s';
        if (hashesPerSecond >= 1e3) return (hashesPerSecond / 1e3).toFixed(2) + ' kH/s';
        return hashesPerSecond.toFixed(0) + ' H/s';
    }
};

 

// Provide a window alias for code that references window.GAME
try { if (typeof window !== 'undefined') window.GAME = GAME; } catch (e) {}

/**
 * Wallet utility for managing unique user wallet IDs
 */
const WALLET = {
    COOKIE_NAME: 'hostxWalletId',
    COOKIE_EXPIRY_DAYS: 365 * 10, // 10 years

    /**
     * Generate a random crypto-style wallet ID
     */
    generateWalletId() {
        const characters = '0123456789abcdef';
        let id = '0x';
        for (let i = 0; i < 40; i++) {
            id += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return id;
    },

    /**
     * Get wallet ID from cookies or generate a new one
     */
    getOrCreateWalletId() {
        let walletId = this.getCookie(this.COOKIE_NAME);
        
        if (!walletId) {
            walletId = this.generateWalletId();
            this.setCookie(this.COOKIE_NAME, walletId, this.COOKIE_EXPIRY_DAYS);
        }
        
        return walletId;
    },

    /**
     * Delete wallet ID and all cookies from current session
     */
    deleteWallet() {
        // Clear all localStorage items first
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear wallet cookie specifically
        this.deleteCookie(this.COOKIE_NAME);
        
        // Clear ALL cookies by iterating multiple times
        for (let i = 0; i < 3; i++) {
            const cookies = document.cookie.split(";");
            for (let cookie of cookies) {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                if (name) {
                    // Try multiple deletion methods
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${document.domain}`;
                    document.cookie = `${name}=;max-age=0;path=/`;
                    document.cookie = `${name}=;max-age=-1;path=/`;
                }
            }
        }
        
        console.log('All cookies and game save data have been deleted');
        console.log('Remaining cookies after deletion:', document.cookie);
        
        // Add a small delay to ensure deletion completes, then reload
        setTimeout(() => {
            // Force a hard reload to bypass cache
            window.location.href = window.location.pathname;
        }, 100);
    },

    /**
     * Set a cookie
     */
    setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${value};${expires};path=/`;
    },

    /**
     * Get a cookie by name
     */
    getCookie(name) {
        const nameEQ = `${name}=`;
        const cookies = document.cookie.split(';');
        
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length);
            }
        }
        
        return null;
    },

    /**
     * Delete a cookie by name
     */
    deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${document.domain}`;
        document.cookie = `${name}=;max-age=0;path=/`;
        document.cookie = `${name}=;max-age=0;path=/;domain=${document.domain}`;
    }
};

 


// Game initialization will be called from UI after everything loads

function setupDeleteWalletModal() {
    const deleteBtn = document.getElementById('deleteWalletBtn');
    const modal = document.getElementById('deleteWalletModal');
    const confirmInput = document.getElementById('confirmInput');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    
    if (!deleteBtn || !modal) {
        console.error('Delete wallet elements not found');
        return;
    }
    
    // Show modal when delete button is clicked
    deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Delete button clicked');
        modal.classList.remove('hidden');
        setTimeout(() => {
            confirmInput.focus();
        }, 100);
    });
    
    // Update confirm button state as user types
    confirmInput.addEventListener('input', (e) => {
        const matches = e.target.value === 'confirm';
        confirmDeleteBtn.disabled = !matches;
    });
    
    // Confirm delete
    confirmDeleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirmInput.value === 'confirm') {
            console.log('Deleting wallet');
            WALLET.deleteWallet();
            // deleteWallet() now handles the reload
        }
    });
    
    // Cancel
    cancelDeleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('hidden');
        confirmInput.value = '';
    });
    
    // Close when clicking outside modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            confirmInput.value = '';
        }
    });
    
    // Enter key support
    confirmInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && confirmInput.value === 'confirm') {
            confirmDeleteBtn.click();
        }
    });
    
    // Initially disable confirm button
    confirmDeleteBtn.disabled = true;
}

// ============================================
// BOSS BATTLE SYSTEM
// ============================================

const BossBattle = {
    // Boss name generator parts
    AI_PREFIXES: ['NEXUS', 'CIPHER', 'OMEGA', 'ZERO', 'ROGUE', 'CHAOS', 'VOID', 'DARK', 'CORE', 'PRIME', 'ULTRA', 'MEGA', 'HYPER', 'APEX', 'ZETA'],
    AI_SUFFIXES: ['MIND', 'NET', 'SYNC', 'CORE', 'BYTE', 'NODE', 'LINK', 'GRID', 'FLUX', 'PULSE', 'SPARK', 'STORM', 'FORGE', 'BLADE', 'FANG'],
    AI_NUMBERS: ['001', '007', '013', '042', '099', '101', '256', '404', '500', '666', '777', '911', '999', 'X', 'Z', 'Ω'],
    
    AI_TYPES: [
        'Malware Entity',
        'Ransomware Variant',
        'Trojan Sentinel',
        'Worm Collective',
        'Botnet Commander',
        'Cryptojacker Prime',
        'Rootkit Phantom',
        'Spyware Infiltrator',
        'Logic Bomb Construct',
        'Firmware Corruptor'
    ],
    
    AI_AVATARS: ['🤖', '👾', '🦠', '🕷️', '💀', '🔥', '⚡', '🌀', '🎭', '🐙'],
    
    // Battle state
    currentBattle: null,
    warningTimer: null,
    battleTimer: null,
    bossSpawnInterval: null,
    
    // Config
    BASE_SPAWN_INTERVAL: 360000, // 6 minutes base between boss spawns
    SPAWN_VARIANCE: 240000, // +/- 4 minutes variance (results in 2-10 min range)
    WARNING_DURATION: 3000, // 3 second warning
    BATTLE_DURATION: 30000, // 30 seconds to defeat boss
    BASE_BOSS_HP: 300,
    HP_SCALING_PER_KILL: 75, // HP increases per boss killed
    DARK_MODE_HP_MULTIPLIER: 2.5, // 2.5x HP in dark mode (but 2x rewards)
    SKILL_POINT_REWARD: 8,
    PENALTY_PERCENT: 0.25, // 25% coin penalty on failure
    
    /**
     * Initialize the boss battle system
     */
    init() {
        this.startSpawnTimer();
        // Ensure background ticker runs to complete overdue forge jobs (handles missed setTimeouts/reloads)
        try { this._ensureForgeTicker && this._ensureForgeTicker(); } catch(e) { console.log('ensureForgeTicker failed', e); }
    },
    
    /**
     * Start the random boss spawn timer
     */
    startSpawnTimer() {
        // Clear any existing timer
        if (this.bossSpawnInterval) {
            clearTimeout(this.bossSpawnInterval);
        }
        
        // Random delay before next boss
        const delay = this.BASE_SPAWN_INTERVAL + (Math.random() * this.SPAWN_VARIANCE * 2) - this.SPAWN_VARIANCE;
        
        this.bossSpawnInterval = setTimeout(() => {
            this.triggerBossWarning();
        }, delay);
    },
    
    /**
     * Generate a random boss name
     */
    generateBossName() {
        const prefix = this.AI_PREFIXES[Math.floor(Math.random() * this.AI_PREFIXES.length)];
        const suffix = this.AI_SUFFIXES[Math.floor(Math.random() * this.AI_SUFFIXES.length)];
        const number = this.AI_NUMBERS[Math.floor(Math.random() * this.AI_NUMBERS.length)];
        
        // Random name format
        const formats = [
            `${prefix}-${suffix}-${number}`,
            `${prefix}_${number}`,
            `${suffix}.${prefix}`,
            `${number}-${prefix}-${suffix}`,
            `[${prefix}]${suffix}`
        ];
        
        return formats[Math.floor(Math.random() * formats.length)];
    },
    
    /**
     * Generate boss stats
     */
    generateBoss() {
        const bossesDefeated = GAME.state.bossDefeated || 0;
        const isDarkMode = GAME.state.darkMode;
        const isCrusader = GAME.state.gameMode === 'crusader';
        
        // Calculate HP based on progression
        let baseHp = this.BASE_BOSS_HP + (bossesDefeated * this.HP_SCALING_PER_KILL);
        if (isDarkMode) {
            baseHp *= this.DARK_MODE_HP_MULTIPLIER;
        }
        if (isCrusader) {
            baseHp *= GAME.CRUSADER_MODE_MULTIPLIERS.bossHealthMultiplier;
        }
        
        return {
            name: this.generateBossName(),
            type: this.AI_TYPES[Math.floor(Math.random() * this.AI_TYPES.length)],
            avatar: this.AI_AVATARS[Math.floor(Math.random() * this.AI_AVATARS.length)],
            maxHp: Math.floor(baseHp),
            currentHp: Math.floor(baseHp),
            defeated: false
            ,
            // marker to indicate this boss came from a random spawn (not a configured Fighting boss)
            isRandomSpawn: true
        };
    },
    
    /**
     * Calculate player damage per click
     */
    getPlayerDamage() {
        // Base damage from click power
        let damage = Math.max(1, Math.floor(GAME.state.clickPower / 10));
        
        // Bonus from total coins (logarithmic scaling)
        if (GAME.state.totalCoinsEarned > 0) {
            damage += Math.floor(Math.log10(GAME.state.totalCoinsEarned + 1));
        }
        
        // Bonus from prestige level
        damage += (GAME.state.prestigeLevel || 0) * 2;
        
        // Bonus from ascension
        damage += (GAME.state.ascensionLevel || 0) * 5;
        
        // Bonus from bosses killed
        damage += Math.floor((GAME.state.bossDefeated || 0) / 5);
        
        // Fighting skill tree bonuses
        const effects = GAME.getSkillEffects ? GAME.getSkillEffects() : {};
        
        // Combat damage bonus from skill tree
        if (effects.combatDamageBonus) {
            damage = Math.floor(damage * (1 + effects.combatDamageBonus));
        }
        
        // Boss Slayer ultimate - 2x damage
        if (effects.bossSlayer) {
            damage = damage * 2;
        }
        
        return Math.max(1, damage);
    },
    
    /**
     * Check for critical hit
     */
    rollCritical() {
        const effects = GAME.getSkillEffects ? GAME.getSkillEffects() : {};
        const critChance = effects.critChance || 0;
        return Math.random() < critChance;
    },

    /* -----------------------------
     * Materials & Inventory Helpers
     * ----------------------------- */
    addMaterial(type, amount=1) {
        if (!GAME.state.materials) GAME.state.materials = {};
        if (!GAME.state.materials[type]) GAME.state.materials[type] = 0;
        GAME.state.materials[type] += amount;
        // Cap per-material inventory to 6400
        if (GAME.state.materials[type] > 6400) GAME.state.materials[type] = 6400;
        return GAME.state.materials[type];
    },

    hasMaterials(requirements = {}) {
        const s = GAME.state || {};
        for (const [k, v] of Object.entries(requirements)) {
            const mineStored = (s.mines && s.mines[k] && s.mines[k].stored) ? Math.floor(s.mines[k].stored) : 0;
            const inv = s.materials && s.materials[k] ? s.materials[k] : 0;
            if ((inv + mineStored) < v) return false;
        }
        return true;
    },

    consumeMaterials(requirements = {}) {
        if (!this.hasMaterials(requirements)) return false;
        const s = GAME.state || {};
        // consume from inventory first, then from stored mine material
        for (const [k, v] of Object.entries(requirements)) {
            let remaining = v;
            const invAvail = s.materials && s.materials[k] ? s.materials[k] : 0;
            if (invAvail >= remaining) {
                s.materials[k] -= remaining;
                remaining = 0;
            } else {
                remaining -= invAvail;
                if (s.materials && s.materials[k]) s.materials[k] = 0;
            }

            if (remaining > 0 && s.mines && s.mines[k]) {
                s.mines[k].stored = Math.max(0, Math.floor(s.mines[k].stored - remaining));
                remaining = 0;
            }
        }
        return true;
    },

    /**
     * Smelt iron into steel. Carbon is unlimited.
     * Consumes `count` iron and produces `count` steel. Returns actual smelted count or 0 on failure.
     */
    smeltSteel(count = 1) {
        try {
            count = Math.max(0, Math.floor(Number(count) || 0));
            console.log('smeltSteel: requested count=', count);
            if (count === 0) { console.log('smeltSteel: zero count requested'); return 0; }
            if (!GAME.state.materials) GAME.state.materials = {};

            // power cost: 100W per steel produced
            const perUnitPower = 100;
            const requiredPower = perUnitPower * count;

            // compute available instantaneous generation (generation - current usage)
            let availGen = 0;
            try {
                const gen = (typeof GAME.getPowerGeneration === 'function') ? GAME.getPowerGeneration() : 0;
                const usage = (typeof GAME.getTotalPowerUsage === 'function') ? GAME.getTotalPowerUsage() : 0;
                availGen = Math.max(0, Math.floor(gen - usage));
            } catch (e) { console.log('smeltSteel: power probe failed', e); availGen = 0; }

            // determine battery fallback need
            let batteryNeeded = 0;
            if (availGen >= requiredPower) {
                // generation covers it
                batteryNeeded = 0;
            } else {
                batteryNeeded = requiredPower - availGen;
            }

            // ensure battery exists
            if (batteryNeeded > 0 && (typeof GAME.state === 'undefined' || typeof GAME.state.batteryStored === 'undefined')) {
                console.log('smeltSteel: no battery state available to cover powerNeeded=', batteryNeeded);
                return 0;
            }

            // try to discharge battery for required amount
            if (batteryNeeded > 0) {
                const provided = (typeof GAME.dischargeBattery === 'function') ? GAME.dischargeBattery(batteryNeeded) : 0;
                if (provided < batteryNeeded) {
                    console.log('smeltSteel: insufficient power — availGen=', availGen, 'batteryProvided=', provided, 'required=', requiredPower);
                    return 0;
                }
                console.log('smeltSteel: used battery for', provided, 'W (availGen=', availGen, ')');
            } else {
                console.log('smeltSteel: generation covers power (availGen=', availGen, ', required=', requiredPower, ')');
            }

            // Expose transient power usage so UI and diagnostics include smeltery draw
            try {
                GAME._transientPowerUsage = (GAME._transientPowerUsage || 0) + requiredPower;
            } catch (e) { /* noop */ }


            // Calculate available iron from materials inventory and mines stored iron
            const matIron = Math.floor(GAME.state.materials.iron || 0);
            const mineIron = (GAME.state.mines && GAME.state.mines.iron && typeof GAME.state.mines.iron.stored !== 'undefined') ? Math.floor(GAME.state.mines.iron.stored) : 0;
            const totalIron = matIron + mineIron;
            let toSmelt = Math.min(count, totalIron);
            if (toSmelt <= 0) {
                console.log('smeltSteel: no iron available (matIron=', matIron, 'mineIron=', mineIron, ')');
                return 0;
            }

            // consume from materials first
            let remaining = toSmelt;
            const fromMaterials = Math.min(remaining, matIron);
            if (fromMaterials > 0) GAME.state.materials.iron = matIron - fromMaterials;
            remaining -= fromMaterials;
            // then consume from mine stored if needed
            if (remaining > 0 && GAME.state.mines && GAME.state.mines.iron) {
                GAME.state.mines.iron.stored = Math.max(0, Math.floor(mineIron - remaining));
                remaining = 0;
            }

            GAME.state.materials.steel = (GAME.state.materials.steel || 0) + toSmelt;
            // Carbon is unlimited — no state change needed
            try { GAME.saveGame && GAME.saveGame(); } catch(e){}
            try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e){}
            try { console.log('smeltSteel: smelted', toSmelt, 'steel — powerUsed=', requiredPower); } catch(e){}
            // clear transient usage immediately after the synchronous operation
            try { GAME._transientPowerUsage = Math.max(0, (GAME._transientPowerUsage || 0) - requiredPower); } catch(e){}
            return toSmelt;
        } catch (e) {
            console.warn('smeltSteel failed', e);
            return 0;
        }
    },

    /**
     * Queue smelting work: produces `count` steel at 1 unit/sec (100W per unit).
     * Returns the job object.
     */
    queueSmelt(count = 1) {
        try {
            count = Math.max(0, Math.floor(Number(count) || 0));
            if (count <= 0) return null;
            if (!GAME.state) GAME.state = {};
            GAME.state.smelteryJobs = GAME.state.smelteryJobs || [];
            const id = `sj_${Date.now().toString(36)}_${Math.floor(Math.random()*1000).toString(36)}`;
            const job = { id, total: count, remaining: count, status: 'queued', createdAt: Date.now() };
            GAME.state.smelteryJobs.push(job);
            try { console.log('queueSmelt: queued', count, 'units, jobId=', id); } catch(e){}
            // Ensure ticker running
            try { this._ensureSmelteryTicker && this._ensureSmelteryTicker(); } catch(e) { console.log('ensureSmelteryTicker failed', e); }
            GAME.saveGame && GAME.saveGame();
            if (typeof UI !== 'undefined' && UI.updateFurnaceCounts) UI.updateFurnaceCounts();
            return job;
        } catch (e) { console.warn('queueSmelt failed', e); return null; }
    },

    // Background ticker that processes queued smeltery jobs one unit per second
    _ensureSmelteryTicker() {
        if (this._smelteryTicker) {
            console.log('smelteryTicker: already running, skipping start');
            return;
        }
        console.log('smelteryTicker: starting ticker (immediate tick + interval)');
        const doTick = () => {
            try {
                const jobs = (GAME.state && Array.isArray(GAME.state.smelteryJobs)) ? GAME.state.smelteryJobs.slice() : [];
                if (jobs.length === 0) return;
                for (const j of jobs) {
                    if (!j || j.remaining <= 0) continue;
                    // Attempt to process one unit
                    const perUnitPower = 100;
                    let availGen = 0;
                    try {
                        const gen = (typeof GAME.getPowerGeneration === 'function') ? GAME.getPowerGeneration() : 0;
                        const usage = (typeof GAME.getTotalPowerUsage === 'function') ? GAME.getTotalPowerUsage() : 0;
                        availGen = Math.max(0, Math.floor(gen - usage));
                    } catch (e) { availGen = 0; }
                    let batteryNeeded = Math.max(0, perUnitPower - availGen);
                    // Check battery
                    if (batteryNeeded > 0) {
                        const provided = (typeof GAME.dischargeBattery === 'function') ? GAME.dischargeBattery(batteryNeeded) : 0;
                        if (provided < batteryNeeded) {
                            // can't process this tick due to insufficient power
                            try { console.log('smeltery: tick skipped - insufficient power for job', j.id, 'availGen=', availGen, 'batteryProvided=', provided); } catch(e){}
                            continue;
                        }
                    }
                    // Register transient usage so total power usage reflects smeltery draw during this tick
                    try {
                        GAME._transientPowerUsage = (GAME._transientPowerUsage || 0) + perUnitPower;
                    } catch (e) {}
                    // Check iron availability (materials + mines)
                    const matIron = Math.floor(GAME.state.materials.iron || 0);
                    const mineIron = (GAME.state.mines && GAME.state.mines.iron && typeof GAME.state.mines.iron.stored !== 'undefined') ? Math.floor(GAME.state.mines.iron.stored) : 0;
                    const totalIron = matIron + mineIron;
                    if (totalIron <= 0) {
                        try { console.log('smeltery: tick skipped - no iron available for job', j.id); } catch(e){}
                        continue;
                    }
                    // consume one iron (materials first)
                    if (matIron > 0) {
                        GAME.state.materials.iron = Math.max(0, matIron - 1);
                    } else if (GAME.state.mines && GAME.state.mines.iron) {
                        GAME.state.mines.iron.stored = Math.max(0, Math.floor(mineIron - 1));
                    }
                    // produce one steel
                    GAME.state.materials.steel = (GAME.state.materials.steel || 0) + 1;
                    j.remaining = Math.max(0, j.remaining - 1);
                    try { console.log('smeltery: processed 1 unit for job', j.id, 'remaining=', j.remaining); } catch(e){}
                    // notify UI per unit and notify player
                    try {
                        if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory();
                        if (typeof UI !== 'undefined' && UI.updateFurnaceCounts) UI.updateFurnaceCounts();
                    } catch(e){}
                    GAME.saveGame && GAME.saveGame();
                    if (j.remaining <= 0) {
                        // remove job from queue
                        const idx = GAME.state.smelteryJobs.findIndex(x => x.id === j.id);
                        if (idx !== -1) GAME.state.smelteryJobs.splice(idx, 1);
                        try { /* smeltery completion notification removed */ } catch(e){}
                    }
                    // Clear transient usage for this tick (processed 1 unit)
                    try { GAME._transientPowerUsage = Math.max(0, (GAME._transientPowerUsage || 0) - perUnitPower); } catch(e) {}
                    // process only one unit per tick across jobs to keep pacing
                    break;
                }
            } catch (e) { console.log('smelteryTicker error', e); }
        };

        // Run one tick immediately and then set interval
        try { doTick(); } catch(e) { console.log('smelteryTicker initial tick error', e); }
        this._smelteryTicker = setInterval(doTick, 1000);
    },

    /**
     * Start smeltery ticker if it's not already running. Fallback starter used when
     * the primary `_ensureSmelteryTicker` isn't available at load time.
     */
    startSmelteryTickerIfNeeded() {
        if (this._smelteryTicker) {
            console.log('startSmelteryTickerIfNeeded: ticker already running');
            return;
        }
        if (typeof this._ensureSmelteryTicker === 'function') {
            try { this._ensureSmelteryTicker(); return; } catch(e) { console.log('startSmelteryTickerIfNeeded: this._ensureSmelteryTicker call failed', e); }
        }
        console.log('startSmelteryTickerIfNeeded: starting fallback ticker');
        const doTick = () => {
            try {
                const jobs = (GAME.state && Array.isArray(GAME.state.smelteryJobs)) ? GAME.state.smelteryJobs.slice() : [];
                if (jobs.length === 0) return;
                for (const j of jobs) {
                    if (!j || j.remaining <= 0) continue;
                    const perUnitPower = 100;
                    let availGen = 0;
                    try {
                        const gen = (typeof GAME.getPowerGeneration === 'function') ? GAME.getPowerGeneration() : 0;
                        const usage = (typeof GAME.getTotalPowerUsage === 'function') ? GAME.getTotalPowerUsage() : 0;
                        availGen = Math.max(0, Math.floor(gen - usage));
                    } catch (e) { availGen = 0; }
                    let batteryNeeded = Math.max(0, perUnitPower - availGen);
                    if (batteryNeeded > 0) {
                        const provided = (typeof GAME.dischargeBattery === 'function') ? GAME.dischargeBattery(batteryNeeded) : 0;
                        if (provided < batteryNeeded) {
                            try { console.log('smeltery: fallback tick skipped - insufficient power for job', j.id); } catch(e){}
                            continue;
                        }
                    }
                    // Register transient usage for this fallback tick
                    try { GAME._transientPowerUsage = (GAME._transientPowerUsage || 0) + perUnitPower; } catch(e) {}
                    const matIron = Math.floor(GAME.state.materials.iron || 0);
                    const mineIron = (GAME.state.mines && GAME.state.mines.iron && typeof GAME.state.mines.iron.stored !== 'undefined') ? Math.floor(GAME.state.mines.iron.stored) : 0;
                    const totalIron = matIron + mineIron;
                    if (totalIron <= 0) { try { console.log('smeltery: fallback tick skipped - no iron for job', j.id); } catch(e){}; continue; }
                    if (matIron > 0) GAME.state.materials.iron = Math.max(0, matIron - 1);
                    else if (GAME.state.mines && GAME.state.mines.iron) GAME.state.mines.iron.stored = Math.max(0, Math.floor(mineIron - 1));
                    GAME.state.materials.steel = (GAME.state.materials.steel || 0) + 1;
                    j.remaining = Math.max(0, j.remaining - 1);
                    try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e){}
                    try { /* per-unit notification removed */ } catch(e){}
                    try { if (typeof UI !== 'undefined' && UI.updateFurnaceCounts) UI.updateFurnaceCounts(); } catch(e){}
                    GAME.saveGame && GAME.saveGame();
                    if (j.remaining <= 0) {
                        const idx = GAME.state.smelteryJobs.findIndex(x => x.id === j.id);
                        if (idx !== -1) GAME.state.smelteryJobs.splice(idx, 1);
                        try { /* completion notification removed */ } catch(e){}
                    }
                    // Clear transient usage after processing
                    try { GAME._transientPowerUsage = Math.max(0, (GAME._transientPowerUsage || 0) - perUnitPower); } catch(e) {}
                    break;
                }
            } catch (e) { console.log('smelteryTicker fallback error', e); }
        };
        try { doTick(); } catch(e) { console.log('smelteryTicker fallback initial tick error', e); }
        this._smelteryTicker = setInterval(doTick, 1000);
    },

    /**
     * Clear all queued smeltery jobs.
     * Returns number of removed jobs.
     */
    clearSmelteryQueue() {
        try {
            if (!this.state) this.state = {};
            if (!Array.isArray(this.state.smelteryJobs) || this.state.smelteryJobs.length === 0) return 0;
            const removed = this.state.smelteryJobs.length;
            this.state.smelteryJobs = [];
            try { if (typeof UI !== 'undefined' && UI.updateFurnaceCounts) UI.updateFurnaceCounts(); } catch(e){}
            this.saveGame && this.saveGame();
            try { console.log('clearSmelteryQueue: cleared', removed, 'jobs'); } catch(e){}
            return removed;
        } catch (e) { console.warn('clearSmelteryQueue failed', e); return 0; }
    },

    /* -----------------------------
     * Inventory / Items
     * ----------------------------- */
    _nextItemId: 1,

    _createItemId() {
        return `it_${Date.now().toString(36)}_${(this._nextItemId++).toString(36)}`;
    },

    // Rarity tiers and weights used for forging
    RARITY_TIERS: [
        { id: 'crude', label: 'Crude', weight: 40, multiplier: 1.0 },
        { id: 'basic', label: 'Basic', weight: 25, multiplier: 1.5 },
        { id: 'advanced', label: 'Advanced', weight: 15, multiplier: 2.0 },
        { id: 'master', label: 'Master', weight: 10, multiplier: 3.0 },
        { id: 'ai_improved', label: 'AI Improved', weight: 7, multiplier: 4.5 },
        { id: 'godlike', label: 'Godlike', weight: 3, multiplier: 7.0 }
    ],

    // Basic gear definitions for forging
    GEAR_TYPES: {
        sword: ['Broadsword', 'Dragon Slayer', 'Katana', 'Longsword'],
        axe: ['Broadaxe', 'Crusader Axe', 'Standard Axe'],
        bow: ['Compound Bow', 'Recurve Bow', 'Longbow', 'Crossbow'],
        armor: ['Helmet', 'Chestplate', 'Leggings', 'Boots']
    },

    // Basic material cost per rarity multiplier (base cost is adjusted by rarity)
    RARITY_COST_MULT: {
        crude: 0.6,
        basic: 1.0,
        advanced: 1.6,
        master: 2.6,
        ai_improved: 4.0,
        godlike: 7.0
    },

    // Damage multipliers used in combat for equipped items by rarity
    RARITY_DAMAGE_MULT: {
        crude: 1.0,
        basic: 1.5,
        advanced: 2.0,
        master: 3.0,
        ai_improved: 4.5,
        godlike: 7.0
    },

    // Estimated material sell values (used to compute a fair sell price)
    MATERIAL_VALUE: {
        iron: 5,
        copper: 7,
        gold: 50,
        platinium: 120,
        lerasium: 400,
        atium: 350,
        harmonium: 800,
        steel: 20,
        mythril: 1000,
        wood: 2
    },

    // Rarity multipliers for sell price
    RARITY_SELL_MULT: {
        crude: 1.0,
        basic: 1.8,
        advanced: 3.2,
        master: 5.5,
        ai_improved: 9.0,
        godlike: 15.0
    },

    // Forge an item of a given category (sword/axe/bow/armor). Will consume coins + materials.
    // Legacy immediate forge (keeps compat) - produces item synchronously.
    forgeItem(category) {
        category = String(category || '').toLowerCase();
        if (!this.GEAR_TYPES[category]) return null;

        // Determine material & coin base costs per category
        // Forge startup is expensive — use 1 trillion coins for all base forgeables
        const TRILLION = 1000000000000;
        const baseCoinCost = { sword: TRILLION, axe: TRILLION, bow: TRILLION, armor: TRILLION }[category] || TRILLION;
        const baseMaterialReq = {
            sword: { iron: 10, copper: 10, gold: 10 },
            axe: { iron: 10, copper: 10, platinium: 10, lerasium: 10 },
            bow: { iron: 10, copper: 10, platinium: 10, atium: 10 },
            armor: { iron: 10, copper: 10, platinium: 10, harmonium: 10 }
        }[category] || { iron: 2 };

        // Use the base material requirements (wood is now an explicit tracked resource)
        const normalizedReq = { ...baseMaterialReq };

        // Randomly roll rarity
        const rarity = this._rollRarity();
        const rarityMult = this.RARITY_COST_MULT[rarity] || 1.0;

        const totalCoinCost = Math.max(1, Math.floor(baseCoinCost * rarityMult));

        // Build material requirements per rarity — higher rarities may require rarer materials
        const rarityObj = this.RARITY_TIERS.find(r => r.id === rarity) || this.RARITY_TIERS[1];
        const materialReq = {};
        for (const [k, v] of Object.entries(normalizedReq)) {
            // Base scaled by rarity multiplier
            materialReq[k] = Math.max(1, Math.floor(v * (1 + (rarityObj.multiplier - 1))));
        }

        // Add speciality/rare material requirements for better rarities
        if (rarity === 'advanced') {
            // Advanced items start to require a little gold sometimes
            materialReq.gold = Math.max(0, (materialReq.gold || 0)) + 1;
        } else if (rarity === 'master') {
            // Master requires extra steel/gold
            materialReq.steel = Math.max(0, (materialReq.steel || 0)) + 2;
            materialReq.gold = Math.max(0, (materialReq.gold || 0)) + 2;
        } else if (rarity === 'ai_improved') {
            // AI improved requires mythril and gold
            materialReq.mythril = Math.max(0, (materialReq.mythril || 0)) + 1;
            materialReq.gold = Math.max(0, (materialReq.gold || 0)) + 2;
        } else if (rarity === 'godlike') {
            // Godlike is very expensive in rare resources
            materialReq.mythril = Math.max(0, (materialReq.mythril || 0)) + 3;
            materialReq.gold = Math.max(0, (materialReq.gold || 0)) + 3;
            // Also increase any iron demand
            materialReq.iron = Math.max(1, (materialReq.iron || 0) + 4);
        }

        // Check funds & materials
        // Defensive numeric coercion and clearer notification
        const haveCoinsImmediate = Number(GAME.state.coins) || 0;
        if (haveCoinsImmediate < Number(totalCoinCost)) return UI.showNotification(`Not enough coins — need ${GAME.formatNumber(totalCoinCost)} (you have ${GAME.formatNumber(haveCoinsImmediate)})`, 'error');
        if (!this.hasMaterials(materialReq)) return UI.showNotification('Not enough materials', 'Gather more materials from the Mines tab.');

        // Inventory space check: max 20 items
        if (Array.isArray(this.state.inventory) && this.state.inventory.length >= 20) return UI.showNotification('Inventory full', 'You have reached the item limit (20). Sell or remove items to free space.', 'warning');

        // consume
        this.state.coins -= totalCoinCost;
        this.consumeMaterials(materialReq);

        // Choose a type within category (random subtype only - user only gets one button per category)
        const types = this.GEAR_TYPES[category];
        let subtype = types[Math.floor(Math.random() * types.length)];

        // Create item stats (damage/defense) scaled by rarity
        const baseStat = { sword: 12, axe: 14, bow: 10, armor: 8 }[category] || 5;
        const stat = Math.max(1, Math.round(baseStat * rarityObj.multiplier * (1 + Math.random() * 0.25)));

        const item = {
            id: this._createItemId(),
            category,
            subtype,
            rarity: rarityObj.id,
            rarityLabel: rarityObj.label,
            stat,
            icon: this._iconFor(category, subtype),
            createdAt: Date.now()
        };

        this.state.inventory.push(item);

        // optional: show nice notification
        UI.showNotification('Forge Complete', `Forged ${item.rarityLabel} ${item.subtype}`);

        return item;
    },

    // Ensure a background ticker processes overdue forge jobs (covers reloads/missed timeouts)
    _ensureForgeTicker() {
        if (this._forgeTicker) return;
        this._forgeTicker = setInterval(() => {
            try {
                const jobs = (GAME.state && Array.isArray(GAME.state.forgeJobs)) ? GAME.state.forgeJobs.slice() : [];
                jobs.forEach(j => {
                    if (j && j.completeAt && Date.now() >= j.completeAt) {
                        try { GAME.completeForgeJob(j.id); } catch(e) { console.log('forgeTicker complete failed', e); }
                    }
                });
            } catch (e) { console.log('forgeTicker error', e); }
        }, 1000);
    },

    // Preview what a forge would cost (random rarity chosen) — returns an object with costs and duration
    previewForge(category) {
        category = String(category || '').toLowerCase();
        if (!this.GEAR_TYPES[category]) return null;
        // Choose rarity deterministically here for preview (simulate the roll)
        const rarity = this._rollRarity();
        const rarityObj = this.RARITY_TIERS.find(r => r.id === rarity) || this.RARITY_TIERS[1];

        // Determine base costs similar to forgeItem
        // Match engine: base cost 1 trillion coins for all forge categories
        const TRILLION = 1000000000000;
        const baseCoinCost = { sword: TRILLION, axe: TRILLION, bow: TRILLION, armor: TRILLION }[category] || TRILLION;
        const baseMaterialReq = { sword: { iron: 10, copper: 10, gold: 10 }, axe: { iron: 10, copper: 10, platinium: 10, lerasium: 10 }, bow: { iron: 10, copper: 10, platinium: 10, atium: 10 }, armor: { iron: 10, copper: 10, platinium: 10, harmonium: 10 } }[category] || { iron: 2 };

        const rarityMult = this.RARITY_COST_MULT[rarity] || 1.0;
        const totalCoinCost = Math.max(1, Math.floor(baseCoinCost * rarityMult));

        // Compose material requirements
        const materialReq = {};
        for (const [k, v] of Object.entries(baseMaterialReq)) {
            materialReq[k] = Math.max(1, Math.floor(v * (1 + (rarityObj.multiplier - 1))));
        }
        if (rarity === 'advanced') materialReq.gold = Math.max(0, (materialReq.gold || 0)) + 1;
        if (rarity === 'master') { materialReq.steel = Math.max(0, (materialReq.steel || 0)) + 2; materialReq.gold = Math.max(0, (materialReq.gold || 0)) + 2; }
        if (rarity === 'ai_improved') { materialReq.mythril = Math.max(0, (materialReq.mythril || 0)) + 1; materialReq.gold = Math.max(0, (materialReq.gold || 0)) + 2; }
        if (rarity === 'godlike') { materialReq.mythril = Math.max(0, (materialReq.mythril || 0)) + 3; materialReq.gold = Math.max(0, (materialReq.gold || 0)) + 3; materialReq.iron = Math.max(1, (materialReq.iron || 0) + 4); }

        // Duration mapping (ms) per rarity
        const durationBase = { crude: 3000, basic: 5000, advanced: 10000, master: 20000, ai_improved: 30000, godlike: 60000 };
        const durationMs = durationBase[rarity] || 5000;

        return { category, rarity, rarityLabel: rarityObj.label, coinCost: totalCoinCost, materialReq, durationMs };
    },

    // Start a timed forge job (consumes materials/coins immediately) and returns the job or null
    startForge(category, previewOverride) {
        const preview = previewOverride || this.previewForge(category);
        if (!preview) return UI.showNotification('Invalid forge category', 'Cannot forge that item.');

        // Check funds & materials
        // Defensive numeric coercion and clearer notification for timed forge
        const haveCoins = Number(GAME.state.coins) || 0;
        const needed = Number(preview.coinCost) || 0;
        if (haveCoins < needed) return UI.showNotification(`Not enough coins — need ${GAME.formatNumber(needed)} (you have ${GAME.formatNumber(haveCoins)})`, 'error');
        if (!this.hasMaterials(preview.materialReq)) return UI.showNotification('Not enough materials', 'Gather more materials from the Mines tab.');

        // Inventory space check: prevent starting timed forge if inventory maxed
        if (Array.isArray(GAME.state.inventory) && GAME.state.inventory.length >= 20) return UI.showNotification('Inventory full', 'You have reached the item limit (20). Sell or remove items to free space.', 'warning');

        // Deduct resources now
        GAME.state.coins -= preview.coinCost;
        // consumeMaterials operates on GAME.state already
        this.consumeMaterials(preview.materialReq);

        // Create job
        const id = `fj_${Date.now().toString(36)}_${Math.floor(Math.random()*1000).toString(36)}`;
        const job = {
            id,
            category: preview.category,
            rarity: preview.rarity,
            rarityLabel: preview.rarityLabel,
            coinCost: preview.coinCost,
            materialReq: preview.materialReq,
            startTime: Date.now(),
            durationMs: preview.durationMs,
            completeAt: Date.now() + preview.durationMs,
            status: 'queued'
        };

        GAME.state.forgeJobs = GAME.state.forgeJobs || [];
        GAME.state.forgeJobs.push(job);

        // Schedule completion (best-effort; on reload resume will complete based on timestamps)
        try {
            setTimeout(() => {
                try { GAME.completeForgeJob(id); } catch (e) { console.log('completeForgeJob err', e); }
            }, preview.durationMs);
        } catch (e) {}

        // Persist state if available
        GAME.saveGame && GAME.saveGame();

        return job;
    },

    // Complete a previously started forge job (create the item, move to inventory)
    completeForgeJob(jobId) {
        try { console.log('completeForgeJob called', jobId, 'forgeJobs=', (GAME.state && GAME.state.forgeJobs) ? GAME.state.forgeJobs.length : 0); } catch(e){}
        if (!GAME.state.forgeJobs || GAME.state.forgeJobs.length === 0) return null;
        const idx = GAME.state.forgeJobs.findIndex(j => j.id === jobId);
        if (idx === -1) {
            try { console.log('completeForgeJob: job not found', jobId); } catch(e){}
            return null;
        }
        const job = GAME.state.forgeJobs[idx];
        if (!job) {
            try { console.log('completeForgeJob: job entry missing for', jobId); } catch(e){}
            return null;
        }

        // Create an item from the job (similar to forgeItem logic but without re-consuming materials)
        const rarityObj = this.RARITY_TIERS.find(r => r.id === job.rarity) || this.RARITY_TIERS[1];
        const types = this.GEAR_TYPES[job.category] || [job.category];
        const subtype = types[Math.floor(Math.random() * types.length)];
        const baseStat = { sword: 12, axe: 14, bow: 10, armor: 8 }[job.category] || 5;
        const stat = Math.max(1, Math.round(baseStat * rarityObj.multiplier * (1 + Math.random() * 0.25)));
        const item = { id: this._createItemId(), category: job.category, subtype, rarity: job.rarity, rarityLabel: job.rarityLabel, stat, icon: this._iconFor(job.category, subtype), createdAt: Date.now() };

        GAME.state.inventory = GAME.state.inventory || [];
        // If inventory full at completion time, pause and retry completion later
        if (GAME.state.inventory.length >= 20) {
            try {
                job.status = 'paused';
                job.completeAt = Date.now() + 5000; // retry in 5s
                if (!GAME.state.forgeJobs) GAME.state.forgeJobs = [];
                // ensure job remains in list (it already is)
                GAME.saveGame && GAME.saveGame();
                // schedule retry
                setTimeout(() => { try { GAME.completeForgeJob(jobId); } catch(e) { console.log('retry completeForgeJob failed', e); } }, 5000);
                try { console.log('completeForgeJob: inventory full, paused job', jobId); } catch(e){}
            } catch (e) { console.log('completeForgeJob pause failed', e); }
            return null;
        }

        GAME.state.inventory.push(item);
        try { console.log('completeForgeJob: pushed item', item.id, 'to inventory'); } catch(e){}

        // remove job and notify
        GAME.state.forgeJobs.splice(idx, 1);
        try {
            if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Forge Complete', `Forged ${item.rarityLabel} ${item.subtype}`);
        } catch(e) { console.log('completeForgeJob: notification failed', e); }
        try { GAME.saveGame && GAME.saveGame(); } catch (e) { console.log('completeForgeJob: save failed', e); }
        // update UI if available
        try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e){ console.log('completeForgeJob: renderForgeInventory failed', e); }

        return item;
    },

    // Helper: base material requirements for a given category (used for estimating sell price)
    _baseMaterialsForCategory(category) {
        category = String(category || '').toLowerCase();
        const map = {
            sword: { iron: 10, copper: 10, gold: 10 },
            axe: { iron: 10, copper: 10, platinium: 10, lerasium: 10 },
            bow: { iron: 10, copper: 10, platinium: 10, atium: 10 },
            armor: { iron: 10, copper: 10, platinium: 10, harmonium: 10 }
        };
        return map[category] || { iron: 1 };
    },

    // Sell an item from inventory for coins. Returns coins gained or null if failed.
    sellItem(itemId) {
        if (!itemId) return null;
        const idx = (GAME.state.inventory || []).findIndex(i => i.id === itemId);
        if (idx === -1) return null;
        const item = GAME.state.inventory[idx];
        try {
            const baseMat = this._baseMaterialsForCategory(item.category);
            let matValue = 0;
            for (const [m,amt] of Object.entries(baseMat)) {
                const v = this.MATERIAL_VALUE[m] || 1;
                matValue += (v * (amt || 0));
            }
            const baseItemValue = (item.stat || 1) * 12;
            const rarityMult = this.RARITY_SELL_MULT[item.rarity] || 1.0;
            const sellPrice = Math.max(1, Math.floor((baseItemValue + matValue) * rarityMult));
            // remove item and award coins
            GAME.state.inventory.splice(idx, 1);
            GAME.state.coins = (GAME.state.coins || 0) + sellPrice;
            try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e) {}
            try { GAME.saveGame && GAME.saveGame(); } catch(e) {}
            UI.showNotification && UI.showNotification('Item Sold', `Sold ${item.rarityLabel} ${item.subtype} for ${GAME.formatNumber(sellPrice)} coins.`);
            return sellPrice;
        } catch (e) {
            console.warn('sellItem failed', e);
            return null;
        }
    },

    _rollRarity() {
        const total = this.RARITY_TIERS.reduce((s, r) => s + r.weight, 0);
        let rnd = Math.random() * total;
        for (const r of this.RARITY_TIERS) {
            if (rnd < r.weight) return r.id;
            rnd -= r.weight;
        }
        return this.RARITY_TIERS[this.RARITY_TIERS.length - 1].id;
    },

    _iconFor(category, subtype) {
        // Basic emoji/icon substitution. For 'Dragon Slayer' use a special text placeholder (we'll leave an ASCII fallback)
        if (subtype.toLowerCase().includes('dragon')) return '🗡️';
        if (category === 'sword') return '🗡️';
        if (category === 'axe') return '🪓';
        if (category === 'bow') return '🏹';
        if (category === 'armor') {
            const s = (subtype || '').toLowerCase();
            if (s.includes('helmet')) return '🪖';
            if (s.includes('chest') || s.includes('chestplate')) return '🦺';
            if (s.includes('legging')) return '👖';
            if (s.includes('boot')) return '👢';
            return '🛡️';
        }
        return '⚒️';
    },

    equipItem(itemId) {
        const s = GAME.state || {};
        const item = (s.inventory || []).find(i => i.id === itemId);
        try { console.log('equipItem called', itemId, 'found=', !!item); } catch(e){}
        if (!item) return false;
        if (!s.equipped) s.equipped = {};

        if (item.category === 'sword' || item.category === 'axe') {
            s.equipped.weapon = itemId;
        } else if (item.category === 'bow') {
            s.equipped.bow = itemId;
        } else if (item.category === 'armor') {
            const subtype = (item.subtype || '').toLowerCase();
            if (subtype.includes('helmet')) s.equipped.helmet = itemId;
            if (subtype.includes('chest') || subtype.includes('chestplate')) s.equipped.chestplate = itemId;
            if (subtype.includes('legging')) s.equipped.leggings = itemId;
            if (subtype.includes('boot')) s.equipped.boots = itemId;
        }

        try { GAME.saveGame && GAME.saveGame(); } catch(e){}
        try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e){}
        try { if (typeof UI !== 'undefined') { if (UI.updateFightingStats) UI.updateFightingStats(); else if (UI.setupFightingTab) UI.setupFightingTab(); } } catch(e){}
        try { console.log('equipItem: equipped state now', s.equipped); } catch(e){}
        return true;
    },

    unequipItem(slotName) {
        const s = GAME.state || {};
        if (!s.equipped || !s.equipped.hasOwnProperty(slotName)) return false;
        s.equipped[slotName] = null;
        try { GAME.saveGame && GAME.saveGame(); } catch(e){}
        try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e){}
        try { if (typeof UI !== 'undefined') { if (UI.updateFightingStats) UI.updateFightingStats(); else if (UI.setupFightingTab) UI.setupFightingTab(); } } catch(e){}
        try { console.log('unequipItem: cleared', slotName); } catch(e){}
        return true;
    },

    getEquippedItem(slotName) {
        const s = GAME.state || {};
        const id = (s.equipped && s.equipped[slotName]) ? s.equipped[slotName] : null;
        if (!id) return null;
        return (s.inventory || []).find(i => i.id === id) || null;
    },
    
    /**
     * Get bonus battle time from skills
     */
    getBattleTimeBonus() {
        const effects = GAME.getSkillEffects ? GAME.getSkillEffects() : {};
        return effects.bossTimeBonus || 0;
    },
    
    /**
     * Trigger the boss warning phase
     */
    triggerBossWarning() {
        // Don't trigger if already in a battle
        if (this.currentBattle) return;
        
        // Generate the boss
        const boss = this.generateBoss();
        GAME.state.currentBoss = boss;
        GAME.state.bossWarningActive = true;
        
        // Show warning overlay
        const warningOverlay = document.getElementById('bossWarningOverlay');
        const bossNameDisplay = document.getElementById('warningBossName');
        const countdownDisplay = document.getElementById('bossWarningCountdown');
        
        if (warningOverlay && bossNameDisplay && countdownDisplay) {
            bossNameDisplay.textContent = boss.name;
            countdownDisplay.textContent = '3';
            warningOverlay.classList.remove('hidden');
            
            // Play warning sound if available
            if (typeof UI !== 'undefined' && UI.playSound) {
                UI.playSound('warning');
            }
            
            // Countdown timer
            let countdown = 3;
            this.warningTimer = setInterval(() => {
                countdown--;
                countdownDisplay.textContent = countdown;
                
                if (countdown <= 0) {
                    clearInterval(this.warningTimer);
                    warningOverlay.classList.add('hidden');
                    this.startBattle(boss);
                }
            }, 1000);
        }
    },
    
    /**
     * Start the boss battle
     */
    startBattle(boss) {
        GAME.state.bossWarningActive = false;
        this.currentBattle = boss;
        
        // Update battle UI
        const battleOverlay = document.getElementById('bossBattleOverlay');
        const battleContainer = document.querySelector('.boss-battle-container');
        const bossAvatar = document.getElementById('bossAvatar');
        const bossName = document.getElementById('bossName');
        const bossType = document.getElementById('bossType');
        const currentHealth = document.getElementById('bossCurrentHealth');
        const maxHealth = document.getElementById('bossMaxHealth');
        const healthFill = document.getElementById('bossHealthFill');
        const timeRemaining = document.getElementById('bossTimeRemaining');
        const playerDamage = document.getElementById('playerDamageDisplay');
        
        if (battleOverlay) {
            // Add corruption boss styling if applicable
            if (battleContainer) {
                // maintain corruption boss class
                if (boss.isCorruptionBoss) {
                    battleContainer.classList.add('corruption-boss');
                } else {
                    battleContainer.classList.remove('corruption-boss');
                }

                // clear any previous mech/appearance classes and apply new appearance when present
                [...battleContainer.classList].forEach(c => { if (c.startsWith('appearance-') || c.startsWith('mech-')) battleContainer.classList.remove(c); });
                if (boss.appearance) {
                    battleContainer.classList.add('mech-boss');
                    battleContainer.classList.add(`appearance-${boss.appearance}`);
                    // visual tinting by evilness level
                    try { if (boss.evilness && battleContainer) battleContainer.classList.add('mechanic-tint'); } catch(e){}
                } else {
                    battleContainer.classList.remove('mech-boss');
                }
            }
            
            // Apply avatar + appearance classes
            try {
                if (boss.appearance && String(boss.appearance).startsWith('mech')) {
                    // render a richer mech face so CSS can style eye/mouth/plate parts
                    bossAvatar.innerHTML = `
                        <div class="mech-face" data-appearance="${boss.appearance}">
                            <div class="mech-face-plate"></div>
                            <div class="mech-eye-row">
                                <div class="mech-eye left"></div>
                                <div class="mech-eye right"></div>
                            </div>
                            <div class="mech-mouth"></div>
                            <div class="mech-data-lines"></div>
                        </div>`;
                } else if (boss.avatar) {
                    // Use innerHTML so the avatar can be richer markup in the future
                    bossAvatar.innerHTML = typeof boss.avatar === 'string' ? boss.avatar : (boss.avatarHtml || '🤖');
                } else {
                    bossAvatar.textContent = '🤖';
                }
            } catch (e) {
                // graceful degrade
                try { bossAvatar.textContent = boss.avatar || '🤖'; } catch (e) {}
            }
            // Apply appearance class to avatar element for mech styling
            try {
                [...bossAvatar.classList].forEach(c => { if (c.startsWith('appearance-') || c === 'mech-active' || c === 'mech-attack') bossAvatar.classList.remove(c); });
                if (boss.appearance) bossAvatar.classList.add(`appearance-${boss.appearance}`);
            } catch(e) { /* ignore DOM errors during headless tests */ }
            bossName.textContent = boss.name;
            bossType.textContent = boss.type;
            currentHealth.textContent = GAME.formatNumber(boss.currentHp);
            maxHealth.textContent = GAME.formatNumber(boss.maxHp);
            healthFill.style.width = '100%';
            timeRemaining.textContent = '30';
            playerDamage.textContent = this.getPlayerDamage();
            
            battleOverlay.classList.remove('hidden');
            
            // Play battle music if available
            if (typeof UI !== 'undefined' && UI.playSound) {
                UI.playSound('battle');
            }

            // If boss is a mech-style enemy, play a mech intro and start ambient hum
            try {
                if (boss && boss.appearance && String(boss.appearance).startsWith('mech') && typeof UI !== 'undefined' && UI.playSound) {
                    UI.playSound('mech_intro');
                    // keep a runtime timer (non-persisted) so we can clear later
                    if (this.mechAmbientTimer) clearInterval(this.mechAmbientTimer);
                    this.mechAmbientTimer = setInterval(() => {
                        try { UI.playSound('mech_ambient'); } catch (e) {}
                    }, 5000);
                }
            } catch (e) { /* ignore audio errors */ }

            // Add cinematic arrival entry to the battle log for mech bosses
            try {
                if (this.state.currentBattle && this.state.currentBattle.battleLog && boss.appearance && String(boss.appearance).startsWith('mech')) {
                    this.state.currentBattle.battleLog.push(`${boss.name} emerges — gears grinding, optics calibrating.`);
                }
            } catch (e) {}
            
            // Battle timer with skill bonuses
            // Set boss evilness css variable for visual intensity
            try { if (battleContainer && boss && typeof boss.evilness !== 'undefined') battleContainer.style.setProperty('--boss-evilness', String(boss.evilness)); } catch (e) {}

            // Populate player avatar in battle UI (cartoon human)
            try {
                const playerAvatarElem = document.getElementById('battlePlayerAvatar');
                const playerEmoji = (this.state && this.state.playerAvatar) ? this.state.playerAvatar : (document.getElementById('playerAvatar') ? document.getElementById('playerAvatar').innerHTML : '👤');
                if (playerAvatarElem) {
                    // Simple cartoon markup — CSS will style a friendly human look
                    playerAvatarElem.innerHTML = `
                        <div class="cartoon-human" data-skin="light">
                            <div class="human-head">
                                <div class="human-hair"></div>
                                <div class="human-eyes"><div class="eye left"></div><div class="eye right"></div></div>
                                <div class="human-mouth"></div>
                            </div>
                        </div>
                    `;
                }
            } catch (e) { /* ignore player avatar DOM failures */ }
            const timeBonus = this.getBattleTimeBonus();
            let timeLeft = 30 + timeBonus;
            timeRemaining.textContent = timeLeft;
            
            this.battleTimer = setInterval(() => {
                timeLeft--;
                timeRemaining.textContent = timeLeft;
                
                if (timeLeft <= 0) {
                    this.endBattle(false);
                }
            }, 1000);

            // (removed) emergency force-exit UI is no longer present — use in-battle Run Away flow
        }
    },
    
    /**
     * Attack the boss
     */
    attackBoss() {
        if (!this.currentBattle) return;
        
        let damage = this.getPlayerDamage();
        
        // Check for critical hit
        const isCrit = this.rollCritical();
        if (isCrit) {
            damage = damage * 2;
        }
        
        this.currentBattle.currentHp -= damage;
        
        // Update UI
        const currentHealth = document.getElementById('bossCurrentHealth');
        const healthFill = document.getElementById('bossHealthFill');
        const damageFlash = document.getElementById('bossDamageFlash');
        const timeRemaining = document.getElementById('bossTimeRemaining');
        
        if (currentHealth && healthFill) {
            currentHealth.textContent = GAME.formatNumber(Math.max(0, this.currentBattle.currentHp));
            const healthPercent = Math.max(0, (this.currentBattle.currentHp / this.currentBattle.maxHp) * 100);
            healthFill.style.width = healthPercent + '%';
            
            // Flash effect (bigger for crits)
            if (damageFlash) {
                damageFlash.classList.remove('flash', 'crit-flash');
                void damageFlash.offsetWidth; // Force reflow
                if (isCrit) {
                    damageFlash.classList.add('crit-flash');
                } else {
                    damageFlash.classList.add('flash');
                }
            }
            
            // Vampiric healing - add time back
            const effects = GAME.getSkillEffects ? GAME.getSkillEffects() : {};
            if (effects.vampiric && timeRemaining) {
                const healAmount = damage * effects.vampiric;
                if (healAmount >= 1) {
                    const currentTime = parseInt(timeRemaining.textContent) || 0;
                    const newTime = Math.min(currentTime + Math.floor(healAmount / 10), 60); // Cap at 60 seconds
                    timeRemaining.textContent = newTime;
                }
            }
            
            // Play hit sound
            if (typeof UI !== 'undefined' && UI.playSound) {
                UI.playSound('click');
            }
        }
        
        // Check if boss is defeated
        if (this.currentBattle.currentHp <= 0) {
            // Defensive: make sure victory overlay appears even in legacy BossBattle path
            try { const overlay = document.getElementById('bossVictoryOverlay'); if (overlay) overlay.classList.remove('hidden'); } catch(e) {}
            this.endBattle(true);
        }
    },

    /**
     * Player chooses to run away — counts as a defeat
     */
    runAway() {
        if (!this.currentBattle) return;
        // Provide a minimal notification that the player fled
        UI.showNotification('🏃 You ran away', 'You escaped the fight. This counts as a defeat.');
        // Try to delegate to engine loseBattle so penalties are applied consistently
        try {
            if (typeof GAME !== 'undefined' && typeof GAME.runAway === 'function') {
                // Prefer the engine-level runAway to centralize penalty behavior
                GAME.runAway();
                return;
            }
        } catch (e) { console.warn('BossBattle.runAway delegate failed', e); }
        // Fallback: mark as defeat via legacy end flow
        this.endBattle(false);
    },
    
    /**
     * End the battle
     */
    endBattle(victory, explicitBattle) {
        // If an explicit battle object is supplied (debug flows), ensure 'currentBattle' is set
        try {
            if (!this.currentBattle && explicitBattle) {
                console.log('BossBattle.endBattle: using explicitBattle argument as currentBattle', (explicitBattle && explicitBattle.name) ? explicitBattle.name : explicitBattle);
                this.currentBattle = explicitBattle;
            }
            // If the runtime save has a currentBattle, ensure we consider it as a fallback
            if (!this.currentBattle && GAME && GAME.state && GAME.state.currentBattle) {
                // legacy shape fallback: if state.currentBattle contains a boss property, use that
                const scb = GAME.state.currentBattle;
                this.currentBattle = scb.boss ? scb.boss : scb;
            }
        } catch (e) { console.warn('BossBattle.endBattle: failed to normalise currentBattle', e); }
        // Clear timers
        if (this.battleTimer) {
            clearInterval(this.battleTimer);
            this.battleTimer = null;
        }
        
        // Hide battle overlay
        const battleOverlay = document.getElementById('bossBattleOverlay');
        if (battleOverlay) {
            battleOverlay.classList.add('hidden');
        }
        
        if (victory) {
            this.handleVictory();
        } else {
            this.handleDefeat();
        }
        
        // Mark battle as ended and keep the object alive briefly so UI can render a summary
        try {
            if (this.currentBattle) {
                this.currentBattle._ended = true;
                this.currentBattle._endExpiresAt = Date.now() + 4000;
            }
            if (GAME && GAME.state && GAME.state.currentBattle) {
                GAME.state.currentBattle._ended = true;
                GAME.state.currentBattle._endExpiresAt = Date.now() + 4000;
            }
            try { if (this._battleEndCleaner) clearTimeout(this._battleEndCleaner); } catch(e) {}
            try {
                const _token = `end_${Date.now()}_${Math.floor(Math.random()*100000)}`;
                if (this.currentBattle) this.currentBattle._endToken = _token;
                if (GAME && GAME.state && GAME.state.currentBattle) GAME.state.currentBattle._endToken = _token;
                this._battleEndCleaner = setTimeout(() => {
                    try {
                        GAME.state.currentBoss = null;
                        if (GAME && GAME.state && GAME.state.currentBattle && GAME.state.currentBattle._endToken === _token && ((GAME.state.currentBattle._endExpiresAt || 0) <= Date.now())) GAME.state.currentBattle = null;
                        if (this.currentBattle && this.currentBattle._endToken === _token && ((this.currentBattle._endExpiresAt || 0) <= Date.now())) this.currentBattle = null;
                        this.updateBattleUI();
                    } catch (e) { /* ignore */ }
                }, 4000);
            } catch(e) {}
        // Ensure runtime-level battle state is cleared immediately when BossBattle ends.
        try {
            if (typeof GAME !== 'undefined' && GAME && GAME.state) {
                // Clear runtime persisted battle to avoid UI re-rendering an active fight
                if (GAME.state.currentBattle) {
                    console.log('BossBattle.endBattle: Marking runtime GAME.state.currentBattle as ended (deferred clear)');
                    GAME.state.currentBattle._ended = true;
                    GAME.state.currentBattle._endExpiresAt = Date.now() + 4000;
                }
                try { if (typeof GAME.updateBattleUI === 'function') GAME.updateBattleUI(); } catch(e) { /* ignore UI errors */ }
                try { if (typeof GAME.saveGame === 'function') GAME.saveGame(); } catch(e) { /* ignore */ }
            }
        } catch (e) { console.warn('BossBattle.endBattle: error clearing GAME.state.currentBattle', e); }
        } catch (e) { /* ignore */ }
        
        // (removed) emergency force-exit UI cleanup

        // Schedule next boss
        this.startSpawnTimer();
    },
    
    /**
     * Handle boss victory
     */
    handleVictory() {
        // Debug: log invocation for tracing
        try { if (typeof console !== 'undefined' && console.log) console.log('GAME.loseBattle called', { penaltyOverride: penaltyOverride, battleExists: !!battle }); } catch(e) {}
        // Prevent duplicate handling
        if (this._battleOutcomeHandled) return;
        this._battleOutcomeHandled = true;

        // Defensive: ensure battle/boss object present and normalize shape (legacy or wrapper)
        const battleObj = this.currentBattle || (GAME && GAME.state && GAME.state.currentBattle ? GAME.state.currentBattle : null);
        let boss = null;
        if (battleObj) boss = (battleObj.boss ? battleObj.boss : battleObj);
        if (!boss) {
            console.warn('BossBattle.handleVictory called but no current battle object present; aborting victory handler.');
            return;
        }
        console.log('BossBattle.handleVictory: processing boss', boss && boss.name ? boss.name : boss);
        
        // Record kill
        GAME.state.bossDefeated = (GAME.state.bossDefeated || 0) + 1;
        // Increment global fighting wins counter so unlocks based on battlesWon work reliably
        try { if (this.state && this.state.fightingStats) { this.state.fightingStats.battlesWon = (this.state.fightingStats.battlesWon || 0) + 1; try { if (this.CONFIG && this.CONFIG.DEBUG) console.log('handleVictory: incremented fightingStats.battlesWon ->', this.state.fightingStats.battlesWon); } catch(e) {} } } catch(e) {}
        // After updating wins, auto-unlock any bosses that use `unlockRequirement` based on total battles won
        try {
            const battlesWonNow = (this.state && this.state.fightingStats) ? (this.state.fightingStats.battlesWon || 0) : 0;
            const bossesCfg = (this && this.CONFIG && this.CONFIG.FIGHTING_BOSSES) ? this.CONFIG.FIGHTING_BOSSES : (GAME && GAME.CONFIG && GAME.CONFIG.FIGHTING_BOSSES) ? GAME.CONFIG.FIGHTING_BOSSES : [];
            bossesCfg.forEach(b => {
                if (typeof b.unlockRequirement === 'number' && b.unlockRequirement > 0 && battlesWonNow >= b.unlockRequirement) {
                    try {
                        if (!this.isBossUnlocked(b.id)) {
                            const did = (typeof GAME !== 'undefined' && typeof GAME.unlockBoss === 'function') ? GAME.unlockBoss(b.id) : (this.unlockBoss ? this.unlockBoss(b.id) : false);
                            if (did) {
                                try { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('🔓 Boss Unlocked!', `${b.name} unlocked by total wins.`); } catch(e) {}
                            }
                        }
                    } catch (e) { /* ignore per-boss errors */ }
                }
            });
        } catch(e) {}
        if (!GAME.state.bossesKilled) GAME.state.bossesKilled = [];
        GAME.state.bossesKilled.push({
            name: boss.name,
            type: boss.type,
            time: Date.now()
        });
        
        // Award rewards with skill tree bonuses
        const effects = GAME.getSkillEffects ? GAME.getSkillEffects() : {};
        let rewardMultiplier = 1;
        
        // Boss reward bonus from skill tree
        if (effects.bossRewardBonus) {
            rewardMultiplier += effects.bossRewardBonus;
        }
        
        // Boss Slayer ultimate - 2x rewards
        if (effects.bossSlayer) {
            rewardMultiplier *= 2;
        }
        
        // Crusader mode boss reward bonus
        if (GAME.state.gameMode === 'crusader') {
            rewardMultiplier *= GAME.CRUSADER_MODE_MULTIPLIERS.bossRewardMultiplier;
        }
        
        const baseSkillPoints = this.SKILL_POINT_REWARD + Math.floor((GAME.state.bossDefeated - 1) / 5);
        const baseCoinReward = Math.floor(boss.maxHp * 10);

        const skillPointReward = Math.floor(baseSkillPoints * rewardMultiplier);
        // Determine coin reward - if boss has a progression reward configured, compute it from progressionPeakCoins
        const progressionPeak = (GAME.state && (GAME.state.progressionPeakCoins || GAME.state.stats && GAME.state.stats.peakCoins)) ? (GAME.state.progressionPeakCoins || GAME.state.stats.peakCoins) : GAME.state.coins || 0;
        let coinReward;
        if (typeof boss.progressionRewardPct === 'number' && boss.progressionRewardPct > 0) {
            coinReward = Math.floor((progressionPeak || 0) * boss.progressionRewardPct * rewardMultiplier);
            // Fallback to minimum base reward if computed reward is tiny
            if (coinReward < baseCoinReward) coinReward = Math.floor(baseCoinReward * rewardMultiplier);
        } else {
            coinReward = Math.floor(baseCoinReward * rewardMultiplier);
        }
        try { console.log('handleVictory: coinReward=', coinReward, 'preCoins=', (GAME.state && GAME.state.coins ? GAME.state.coins - coinReward : null)); } catch(e) {}
        
        GAME.earnSkillPoints(skillPointReward);
        GAME.state.coins += coinReward;
        GAME.state.totalCoinsEarned += coinReward;
        
        // Chance to get jackpot ticket for defeating boss (10% base chance, increases with boss level)
        let ticketsEarned = 0;
        const ticketChance = 0.1 + (Math.min(GAME.state.bossDefeated, 20) * 0.02); // Up to 50% chance at boss 20+
        if (Math.random() < ticketChance) {
            ticketsEarned = 1;
            GAME.state.jackpotTickets = Math.min(
                (GAME.state.jackpotTickets || 0) + ticketsEarned,
                GAME.JACKPOT_CONFIG.maxTickets
            );
            // Show notification
            UI.showAchievementUnlock({
                name: `Boss Victory Bonus: ${ticketsEarned} Jackpot Ticket${ticketsEarned > 1 ? 's' : ''}!`,
                icon: '🎫'
            });
        }
        
        // Refresh research tab when skill points are earned
        UI.setupResearchTab();
        
        // Show victory overlay
        const victoryOverlay = document.getElementById('bossVictoryOverlay');
        const victoryBossName = document.getElementById('victoryBossName');
        const victorySkillPoints = document.getElementById('victorySkillPoints');
        const victoryCoins = document.getElementById('victoryCoins');
        const victoryTicketsItem = document.getElementById('victoryTicketsItem');
        const victoryTickets = document.getElementById('victoryTickets');
        const victoryTicketsPlural = document.getElementById('victoryTicketsPlural');
        
        if (victoryOverlay) {
            victoryBossName.textContent = boss.name;
            victorySkillPoints.textContent = skillPointReward;
            victoryCoins.textContent = GAME.formatNumber(coinReward);
            
            // Show jackpot tickets if earned
            if (ticketsEarned > 0) {
                victoryTickets.textContent = ticketsEarned;
                victoryTicketsPlural.textContent = ticketsEarned > 1 ? 's' : '';
                victoryTicketsItem.style.display = 'block';
            } else {
                victoryTicketsItem.style.display = 'none';
            }
            
            victoryOverlay.classList.remove('hidden');
            // Show unlock note in overlay if applicable
            try {
                const victoryUnlockNote = document.getElementById('victoryUnlockNote');
                if (victoryUnlockNote) {
                    if (GAME.state && GAME.state.lastBattleResult && GAME.state.lastBattleResult.specialUnlock) {
                        if (GAME.state.lastBattleResult.specialUnlock === 'crude_ai') victoryUnlockNote.textContent = '🔓 New Boss Unlocked: Crude AI';
                        else victoryUnlockNote.textContent = `🔓 New Unlock: ${GAME.state.lastBattleResult.specialUnlock}`;
                        victoryUnlockNote.classList.remove('hidden');
                    } else {
                        victoryUnlockNote.classList.add('hidden');
                        victoryUnlockNote.textContent = '';
                    }
                }
            } catch(e) {}
            
            // Play victory sound
            if (typeof UI !== 'undefined' && UI.playSound) {
                UI.playSound('win');
            }
        }
        
        // Check achievements
        GAME.checkAchievements();
        GAME.saveGame();
        // Capture a short-lived summary for the Fighting tab
        try {
            GAME.state.lastBattleResult = {
                outcome: 'victory',
                bossId: boss && boss.id ? boss.id : null,
                bossName: boss && boss.name ? boss.name : 'UNKNOWN',
                rewardCoins: coinReward,
                rewardSkillPoints: skillPointReward,
                time: Date.now()
            };
        } catch (e) {}

        // Progression: increment defeat counter for configured bosses and unlock next tier if threshold reached.
        try {
            const bosses = (this && this.CONFIG && this.CONFIG.FIGHTING_BOSSES) ? this.CONFIG.FIGHTING_BOSSES : (GAME && GAME.CONFIG && GAME.CONFIG.FIGHTING_BOSSES) ? GAME.CONFIG.FIGHTING_BOSSES : [];
            // Resolve a reliable id for configured bosses. Random spawns won't have an id and should not be
            // counted towards progression for configured boss unlocks.
            let id = (boss && boss.id) ? boss.id : null;
            if (!id && boss && boss.name) {
                const match = bosses.find(b => b.name === boss.name || b.id === boss.name);
                if (match) id = match.id;
            }
            if (!id) {
                // No configured id found — skip progression increment (likely a random spawn)
                try { if (this.CONFIG && this.CONFIG.DEBUG) console.log('handleVictory: skipping progression increment for non-configured boss', { boss }); } catch(e) {}
            } else {
                if (!GAME.state.fightingProgressCounts) GAME.state.fightingProgressCounts = {};
                try { console.log('handleVictory: about to increment progression for id=', id, 'currentCounts=', JSON.parse(JSON.stringify(GAME.state.fightingProgressCounts || {}))); } catch(e) {}
                GAME.state.fightingProgressCounts[id] = (GAME.state.fightingProgressCounts[id] || 0) + 1;
                // Save for UI display and persistence
                try { console.log('handleVictory: incremented', id, 'newCount=', GAME.state.fightingProgressCounts[id]); } catch(e) {}
                const count = GAME.state.fightingProgressCounts[id];
                const idx = bosses.findIndex(b => b.id === id);
                if (idx !== -1) {
                    const nextBoss = bosses[idx + 1];
                    if (nextBoss && typeof boss.progressionDefeatRequirement === 'number' && boss.progressionDefeatRequirement > 0 && count >= boss.progressionDefeatRequirement) {
                        // Unlock the next boss via helper so state is normalized and UI refreshed
                        let didUnlock = false;
                        try {
                            if (this.CONFIG && this.CONFIG.DEBUG) console.log('Progression: attempting unlock', { defeatedBoss: id, count, req: boss.progressionDefeatRequirement, nextBoss: nextBoss.id, unlockedBefore: Array.isArray(GAME.state.unlockedBosses) ? GAME.state.unlockedBosses : (GAME.state.unlockedBosses ? Array.from(GAME.state.unlockedBosses) : []) });
                            if (typeof GAME !== 'undefined' && typeof GAME.unlockBoss === 'function') {
                                didUnlock = GAME.unlockBoss(nextBoss.id);
                            } else if (typeof this.unlockBoss === 'function') {
                                didUnlock = this.unlockBoss(nextBoss.id);
                            } else {
                                didUnlock = false;
                            }
                        } catch (e) { console.warn('Progression: unlockBoss failed', e); }
                        try { if (this.CONFIG && this.CONFIG.DEBUG) console.log('Progression: unlock attempt result', { nextBoss: nextBoss.id, didUnlock, unlockedAfter: Array.isArray(GAME.state.unlockedBosses) ? GAME.state.unlockedBosses : (GAME.state.unlockedBosses ? Array.from(GAME.state.unlockedBosses) : []) }); } catch(e) {}
                        try { if (didUnlock) UI.showNotification('🔓 New Boss Unlocked!', `${nextBoss.name} has been unlocked by your progress.`); } catch (e) {}
                        // Reset progression counts for the next progression only if we unlocked
                        if (didUnlock) {
                            GAME.state.fightingProgressCounts = {};
                            // Reset progression peak to current coins for next cycle
                            GAME.state.progressionPeakCoins = GAME.state.coins || 0;
                            try { if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab(); } catch(e) {}
                        }
                        else {
                            try {
                                // If the unlock did not succeed and the boss still reports locked, warn (helps catch silent failures)
                                if (!this.isBossUnlocked(nextBoss.id)) console.warn('Progression: unlock attempt failed and boss remains locked', nextBoss.id, { didUnlock, unlockedBosses: Array.isArray(GAME.state.unlockedBosses) ? GAME.state.unlockedBosses : (GAME.state.unlockedBosses ? Array.from(GAME.state.unlockedBosses) : []) });
                                else if (this.CONFIG && this.CONFIG.DEBUG) console.warn('Progression: unlock attempt returned false but boss is already unlocked', nextBoss.id);
                            } catch(e) {}
                        }
                    }
                }
            }
        } catch (e) { console.warn('Progression update failed', e); }

        // If the defeated boss was a random spawn, increment counter to unlock Crude AI
        try {
            if (boss && boss.isRandomSpawn) {
                GAME.state.randomAIDefeats = (GAME.state.randomAIDefeats || 0) + 1;
                const needed = 2;
                // clamp so we don't exceed needed and show negative remaining values
                if (GAME.state.randomAIDefeats > needed) GAME.state.randomAIDefeats = needed;
                try { console.log('Random unlock: randomAIDefeats=', GAME.state.randomAIDefeats, 'needed=', needed); } catch(e) {}
                if ((GAME.state.randomAIDefeats || 0) >= needed) {
                    if (!GAME.state.unlockedBosses) GAME.state.unlockedBosses = new Set();
                    try { console.log('Random unlock: unlockedBosses before add=', Array.from(GAME.state.unlockedBosses || [])); } catch(e) {}
                    if (!GAME.isBossUnlocked('crude_ai')) {
                            let didUnlock = false;
                            try {
                                if (typeof GAME !== 'undefined' && typeof GAME.unlockBoss === 'function') {
                                    didUnlock = GAME.unlockBoss('crude_ai');
                                } else if (GAME && GAME.state && GAME.state.unlockedBosses) {
                                    GAME.state.unlockedBosses.add('crude_ai');
                                    didUnlock = true;
                                } else {
                                    didUnlock = false;
                                }
                            } catch(e) { console.warn('Random unlock: unlockBoss failed', e); }
                            try { console.log('Random unlock: crude unlock attempt result=', didUnlock); } catch(e) {}
                            if (didUnlock) {
                                // annotate lastBattleResult for UI
                                try { if (GAME.state.lastBattleResult) GAME.state.lastBattleResult.specialUnlock = 'crude_ai'; } catch(e) {}
                                try { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('🔓 Crude AI Unlocked!', 'You unlocked Crude AI by defeating hostile AI spawns.'); } catch(e){}
                            }
                    } else {
                        try { console.log('Random unlock: crude already unlocked according to isBossUnlocked'); } catch(e) {}
                    }
                }
            }
        } catch (e) { console.warn('Random spawn progression update failed', e); }
        // Ensure chain progression is evaluated (handles crude -> basic -> advanced -> ...)
        try { if (typeof GAME !== 'undefined' && typeof GAME.checkProgressionChain === 'function') GAME.checkProgressionChain(); } catch(e) {}
    },
    
    /**
     * Handle boss defeat (player loses)
     */
    handleDefeat() {
        // Prevent duplicate handling
        if (this._battleOutcomeHandled) return;
        this._battleOutcomeHandled = true;

        // Defensive: ensure boss object present for UI display and logging
        const boss = this.currentBattle || (GAME && GAME.state && GAME.state.currentBattle ? (GAME.state.currentBattle.boss || GAME.state.currentBattle) : null);
        if (!boss) {
            console.warn('BossBattle.handleDefeat called but no current battle object present; aborting defeat handler.');
            return;
        }
        console.log('BossBattle.handleDefeat: processing boss', boss && boss.name ? boss.name : boss);
        
        // Compute penalty percentage (random spawns harsher); prefer GAME.PENALTY_PERCENT when available
        try {
            const coins = (GAME && typeof GAME.state === 'object') ? (GAME.state.coins || 0) : 0;
            const penaltyPct = (boss && boss.isRandomSpawn) ? 0.40 : (GAME && typeof GAME.PENALTY_PERCENT === 'number' ? GAME.PENALTY_PERCENT : (this.PENALTY_PERCENT || 0.25));
            const penaltyAmount = Math.floor((coins || 0) * penaltyPct);
            let delegated = false;
            try {
                if (typeof GAME !== 'undefined' && typeof GAME.loseBattle === 'function') {
                    console.log('BossBattle.handleDefeat: delegating to GAME.loseBattle with', penaltyAmount);
                    GAME.loseBattle(penaltyAmount);
                    delegated = true;
                }
            } catch (e) { console.warn('BossBattle.handleDefeat: delegation to GAME.loseBattle threw', e); }
            // If delegation didn't set a lastBattleResult, apply fallback handling and ensure UI shows defeat
            try {
                const last = (typeof GAME !== 'undefined' && GAME.state) ? GAME.state.lastBattleResult : null;
                if (!delegated || !last) {
                    const toTake = Math.min(Math.max(0, coins), Math.max(0, penaltyAmount));
                    if (typeof GAME !== 'undefined' && GAME.state) GAME.state.coins = Math.max(0, (GAME.state.coins || 0) - toTake);
                    // If the battle carried a random-server-steal risk, apply it here too
                    let lostServerKey = null;
                    try {
                        const b = this.currentBattle || (typeof GAME !== 'undefined' && GAME.state && GAME.state.currentBattle ? GAME.state.currentBattle : null);
                        if (b && b.risk && b.risk.randomServerSteal) {
                            // Prefer stealing a placed server (visibly removed from racks) if any exist,
                            // otherwise fall back to decrementing inventory (`GAME.state.servers[count]`).
                            try {
                                let placedCandidates = [];
                                const buildings = (GAME.state && GAME.state.buildings) ? GAME.state.buildings : {};
                                for (const [buildingId, building] of Object.entries(buildings)) {
                                    const placed = (building && Array.isArray(building.placedServers)) ? building.placedServers : [];
                                    for (let i = 0; i < placed.length; i++) {
                                        const server = placed[i];
                                        if (server && server.type) {
                                            placedCandidates.push({ type: server.type, buildingId, index: i });
                                        }
                                    }
                                }

                                if (placedCandidates.length > 0) {
                                    const pick = placedCandidates[Math.floor(Math.random() * placedCandidates.length)];
                                    const building = GAME.state.buildings[pick.buildingId];
                                    // Remove the placed server from that building's placedServers array
                                    if (building && Array.isArray(building.placedServers) && typeof pick.index === 'number') {
                                        const removed = building.placedServers.splice(pick.index, 1);
                                        lostServerKey = pick.type;
                                        console.log('BossBattle.handleDefeat: stole placed server', lostServerKey, 'from building', pick.buildingId);
                                    }
                                } else {
                                    // No placed servers; fall back to inventory decrement as before
                                    const srvKeys = GAME.state.servers ? Object.keys(GAME.state.servers).filter(k => (GAME.state.servers[k] && (GAME.state.servers[k].count || 0) > 0)) : [];
                                    if (srvKeys.length > 0) {
                                        const randKey = srvKeys[Math.floor(Math.random() * srvKeys.length)];
                                        const srv = GAME.state.servers[randKey];
                                        if (srv) {
                                            if (typeof srv.count === 'number' && srv.count > 1) {
                                                GAME.state.servers[randKey].count = Math.max(0, srv.count - 1);
                                                lostServerKey = randKey;
                                                console.log('BossBattle.handleDefeat: decremented server', randKey, 'newCount=', GAME.state.servers[randKey].count);
                                            } else {
                                                try {
                                                    GAME.state.servers[randKey].count = 0;
                                                    GAME.state.servers[randKey]._removed = true;
                                                    lostServerKey = randKey;
                                                    console.log('BossBattle.handleDefeat: zeroed server count for', randKey);
                                                } catch (e) {
                                                    try { delete GAME.state.servers[randKey]; lostServerKey = randKey; console.log('BossBattle.handleDefeat: removed server entry', randKey); } catch(e2) { console.warn('BossBattle.handleDefeat: failed to remove server', e2); }
                                                }
                                            }
                                        }
                                    } else {
                                        console.log('BossBattle.handleDefeat: no owned servers to steal from');
                                    }
                                }
                            } catch (e) { console.warn('BossBattle.handleDefeat: failed applying randomServerSteal', e); }
                        }
                    } catch (e) { console.warn('BossBattle.handleDefeat: failed applying randomServerSteal', e); }
                    // ensure lastBattleResult exists so UI can show defeat overlay
                    try {
                        if (typeof GAME !== 'undefined' && GAME.state) {
                            GAME.state.lastBattleResult = {
                                outcome: 'defeat',
                                bossId: boss && boss.id ? boss.id : null,
                                bossName: boss && boss.name ? boss.name : 'UNKNOWN',
                                penalty: toTake,
                                lostServer: lostServerKey || null,
                                time: Date.now()
                            };
                            try { GAME._suppressAutoCloseUntil = Date.now() + 4000; } catch(e) {}
                            console.log('BossBattle.handleDefeat: fallback lastBattleResult set', GAME.state.lastBattleResult);
                            try { if (typeof GAME.saveGame === 'function') GAME.saveGame(); } catch(e) { console.warn('BossBattle.handleDefeat: saveGame failed', e); }
                            try { if (typeof UI !== 'undefined' && UI.updateServersDisplay) UI.updateServersDisplay(); } catch(e) { console.warn('BossBattle.handleDefeat: updateServersDisplay failed', e); }
                            try { if (typeof UI !== 'undefined' && UI.updateDisplay) UI.updateDisplay(); } catch(e) { console.warn('BossBattle.handleDefeat: updateDisplay failed', e); }
                            try {
                                // Debug: log runtime server state and DOM count for the stolen server
                                if (lostServerKey) {
                                    try { console.log('BossBattle.handleDefeat: post-steal GAME.state.servers[' + lostServerKey + ']=', JSON.parse(JSON.stringify(GAME.state.servers[lostServerKey]))); } catch(e) {}
                                    try {
                                        const el = document.querySelector('.server-count-' + lostServerKey);
                                        console.log('BossBattle.handleDefeat: post-steal DOM count for', lostServerKey, '->', el ? el.textContent : 'ELEMENT_NOT_FOUND');
                                    } catch(e) {}
                                }
                            } catch(e) {}
                        }
                    } catch (e) { console.warn('BossBattle.handleDefeat: failed to set fallback lastBattleResult', e); }

                    // Show defeat overlay directly as a last resort
                    try {
                        const defeatOverlay = document.getElementById('bossDefeatOverlay');
                        const defeatBossName = document.getElementById('defeatBossName');
                        const defeatPenalty = document.getElementById('defeatPenalty');
                        const defeatServerLostEl = document.getElementById('defeatServerLost');
                        const defeatServerNameEl = document.getElementById('defeatServerName');
                        if (defeatBossName) defeatBossName.textContent = (boss && boss.name) ? boss.name : 'UNKNOWN';
                        if (defeatPenalty) defeatPenalty.textContent = (typeof GAME !== 'undefined' && GAME.formatNumber) ? GAME.formatNumber((GAME && GAME.state && GAME.state.lastBattleResult) ? GAME.state.lastBattleResult.penalty : toTake) : String((GAME && GAME.state && GAME.state.lastBattleResult) ? GAME.state.lastBattleResult.penalty : toTake);
                        // Show lost server info if present in lastBattleResult
                        try {
                            const lostKey = (typeof GAME !== 'undefined' && GAME.state && GAME.state.lastBattleResult) ? GAME.state.lastBattleResult.lostServer : null;
                            if (lostKey && defeatServerLostEl && defeatServerNameEl) {
                                defeatServerNameEl.textContent = (GAME.CONFIG && GAME.CONFIG.SERVERS && GAME.CONFIG.SERVERS[lostKey] && GAME.CONFIG.SERVERS[lostKey].name) ? GAME.CONFIG.SERVERS[lostKey].name : lostKey;
                                defeatServerLostEl.classList.remove('hidden');
                            } else if (defeatServerLostEl) {
                                defeatServerLostEl.classList.add('hidden');
                            }
                        } catch(e) { if (defeatServerLostEl) defeatServerLostEl.classList.add('hidden'); }
                        if (defeatOverlay) {
                            // hide rematch
                            try { const rematchBtn = document.getElementById('rematchBossBtn'); if (rematchBtn) rematchBtn.style.display = 'none'; } catch (e) {}
                            defeatOverlay.classList.remove('hidden');
                        }
                    } catch (e) { console.warn('BossBattle.handleDefeat: failed to show defeat overlay fallback', e); }
                }
            } catch (e) { console.warn('BossBattle.handleDefeat: fallback application failed', e); }
        } catch (e) {
            console.warn('BossBattle.handleDefeat: fallback penalty application failed', e);
        }
    },
    
    /**
     * Close victory overlay
     */
    closeVictory() {
        console.log('GAME.closeVictory invoked');
        const victoryOverlay = document.getElementById('bossVictoryOverlay');
        if (victoryOverlay) {
            victoryOverlay.classList.add('hidden');
        }
        // Reset outcome guard and clear stored recent result (clear battle only if it already ended or matches recent result)
        try { this._battleOutcomeHandled = false; } catch (e) {}
        try {
            const last = (this.state && this.state.lastBattleResult) ? this.state.lastBattleResult : null;
            // Only clear currentBattle if it has been marked ended, or it matches the recent result's boss and outcome
            if (last && this.state && this.state.currentBattle) {
                try {
                    const cb = this.state.currentBattle;
                    if (cb._ended || (cb.boss && last.bossId && cb.boss.id === last.bossId && (last.outcome === 'victory' || last.outcome === 'defeat'))) {
                        this.state.currentBattle = null;
                        console.log('Cleared currentBattle via closeVictory due to matching lastBattleResult');
                    }
                } catch(e) {}
            }
            if (this.state && this.state.lastBattleResult) { delete this.state.lastBattleResult; console.log('Cleared lastBattleResult via closeVictory'); }
        } catch (e) {}
        try { if (typeof this.saveGame === 'function') this.saveGame(); } catch(e) {}
        // If the victory marked this.state.currentBattle as ended, clear it: user clicked OK to dismiss summary means they want the battle cleared
        try {
            if (this.state && this.state.currentBattle && this.state.currentBattle._ended) {
                this.state.currentBattle = null;
                if (typeof this.saveGame === 'function') this.saveGame();
                if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab();
            }
            // Also clear malformed battle objects which may have been persisted erroneously
            if (this.state && this.state.currentBattle && (!this.state.currentBattle.boss || !this.state.currentBattle.player)) {
                console.warn('Clearing malformed currentBattle in closeVictory');
                this.state.currentBattle = null;
                if (typeof this.saveGame === 'function') this.saveGame();
                if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab();
            }
        } catch(e) { /* ignore */ }
    },
    
    /**
     * Close defeat overlay
     */
    closeDefeat(force) {
        if (typeof force === 'undefined') force = false;
        console.log('GAME.closeDefeat invoked', { force, when: new Date().toISOString() });
        // Don't allow programmatic/automatic closures — require explicit force by user action.
        if (!force) {
            console.log('GAME.closeDefeat: ignored because not forced (will only close on explicit user action)');
            return;
        }
        const defeatOverlay = document.getElementById('bossDefeatOverlay');
        if (defeatOverlay) {
            defeatOverlay.classList.add('hidden');
        }
        try { this._battleOutcomeHandled = false; } catch (e) {}
        try {
            const last = (this.state && this.state.lastBattleResult) ? this.state.lastBattleResult : null;
            if (last && this.state && this.state.currentBattle) {
                try {
                    const cb = this.state.currentBattle;
                    if (cb._ended || (cb.boss && last.bossId && cb.boss.id === last.bossId && (last.outcome === 'victory' || last.outcome === 'defeat'))) {
                        this.state.currentBattle = null;
                        console.log('Cleared currentBattle via closeDefeat due to matching lastBattleResult');
                    }
                } catch(e) {}
            }
            if (this.state && this.state.lastBattleResult) { delete this.state.lastBattleResult; console.log('Cleared lastBattleResult via closeDefeat'); }
        } catch (e) {}
        try { if (typeof this.saveGame === 'function') this.saveGame(); } catch(e) {}
        // Clear ended battle if user dismisses defeat overlay
        try {
            if (this.state && this.state.currentBattle && this.state.currentBattle._ended) {
                this.state.currentBattle = null;
                if (typeof this.saveGame === 'function') this.saveGame();
                if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab();
            }
            // Also clear malformed battle objects which may have been persisted erroneously
            if (this.state && this.state.currentBattle && (!this.state.currentBattle.boss || !this.state.currentBattle.player)) {
                console.warn('Clearing malformed currentBattle in closeDefeat');
                this.state.currentBattle = null;
                if (typeof this.saveGame === 'function') this.saveGame();
                if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab();
            }
        } catch(e) { /* ignore */ }
    },
    
    /**
     * Generate a Corruption Boss (special dark matter boss)
     */
    generateCorruptionBoss() {
        const bossesDefeated = GAME.state.bossDefeated || 0;
        const isDarkMode = GAME.state.darkMode;
        
        // Corruption bosses are stronger
        let baseHp = (this.BASE_BOSS_HP * 2) + (bossesDefeated * this.HP_SCALING_PER_KILL * 1.5);
        if (isDarkMode) {
            baseHp *= this.DARK_MODE_HP_MULTIPLIER * 1.5; // Even harder in dark mode
        }
        
        const corruptionNames = [
            'VOID-CORRUPTION-PRIME',
            'DARK-MATTER-ANOMALY',
            'ENTROPY-COLLAPSE-X',
            'SINGULARITY-BREACH',
            'QUANTUM-DECAY-OMEGA',
            'ANTIMATTER-SURGE',
            'COSMIC-CORRUPTION',
            'DIMENSION-TEAR-ALPHA'
        ];
        
        return {
            name: corruptionNames[Math.floor(Math.random() * corruptionNames.length)],
            type: 'Dark Matter Corruption',
            avatar: '🌑',
            maxHp: Math.floor(baseHp),
            currentHp: Math.floor(baseHp),
            defeated: false,
            isCorruptionBoss: true
        };
    },
    
    /**
     * Trigger a corruption boss (from dark matter)
     */
    triggerCorruptionBoss() {
        // Don't trigger if already in a battle
        if (this.currentBattle) return;
        
        // Clear spawn timer
        if (this.bossSpawnInterval) {
            clearTimeout(this.bossSpawnInterval);
        }
        
        // Generate corruption boss
        const boss = this.generateCorruptionBoss();
        GAME.state.currentBoss = boss;
        GAME.state.bossWarningActive = true;
        
        // Show special corruption warning
        const warningOverlay = document.getElementById('bossWarningOverlay');
        const bossNameDisplay = document.getElementById('warningBossName');
        const countdownDisplay = document.getElementById('bossWarningCountdown');
        const warningTitle = warningOverlay?.querySelector('.warning-title');
        
        if (warningOverlay && bossNameDisplay && countdownDisplay) {
            bossNameDisplay.textContent = boss.name;
            countdownDisplay.textContent = '5'; // Shorter warning for corruption boss
            if (warningTitle) {
                warningTitle.textContent = 'DARK MATTER CORRUPTION CRITICAL';
            }
            warningOverlay.classList.remove('hidden');
            warningOverlay.classList.add('corruption-warning');
            
            // Play warning sound
            if (typeof UI !== 'undefined' && UI.playSound) {
                UI.playSound('warning');
            }
            
            // Shorter countdown for corruption boss
            let countdown = 5;
            this.warningTimer = setInterval(() => {
                countdown--;
                countdownDisplay.textContent = countdown;
                
                if (countdown <= 0) {
                    clearInterval(this.warningTimer);
                    warningOverlay.classList.add('hidden');
                    warningOverlay.classList.remove('corruption-warning');
                    if (warningTitle) {
                        warningTitle.textContent = 'ROGUE AI FOUND YOUR DATACENTER';
                    }
                    this.startBattle(boss);
                }
            }, 1000);
        }
    }
};

// Initialize boss battle system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup boss battle event listeners
    const attackBtn = document.getElementById('bossAttackBtn');
    if (attackBtn) {
        attackBtn.addEventListener('click', () => BossBattle.attackBoss());
    }
    const runBtn = document.getElementById('bossRunBtn');
    if (runBtn) {
        runBtn.addEventListener('click', () => {
            // Show confirmation overlay before fleeing
            const overlay = document.getElementById('bossRunConfirmOverlay');
            if (overlay) overlay.classList.remove('hidden');
        });
    }

    // Confirmation overlay buttons
    const runConfirmOk = document.getElementById('runConfirmOk');
    const runConfirmCancel = document.getElementById('runConfirmCancel');
    if (runConfirmCancel) {
        runConfirmCancel.addEventListener('click', () => {
            const overlay = document.getElementById('bossRunConfirmOverlay'); if (overlay) overlay.classList.add('hidden');
        });
    }
    if (runConfirmOk) {
        runConfirmOk.addEventListener('click', () => {
            console.log('runConfirmOk: clicked');
            const overlay = document.getElementById('bossRunConfirmOverlay'); if (overlay) overlay.classList.add('hidden');
            // Try to end any active fight - prefer engine-level, then BossBattle
            const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : (typeof GAME !== 'undefined' ? GAME : null);

            let acted = false;
            try {
                if (runtime) {
                    // Compute estimated reward to pass as penaltyOverride when fleeing
                    let estimated = 0;
                    try {
                        if (typeof runtime.estimateBattleWin === 'function') estimated = runtime.estimateBattleWin(runtime.state && runtime.state.currentBattle ? runtime.state.currentBattle : null) || 0;
                        else if (typeof GAME !== 'undefined' && typeof GAME.estimateBattleWin === 'function') estimated = GAME.estimateBattleWin(GAME.state && GAME.state.currentBattle ? GAME.state.currentBattle : null) || 0;
                        else if (typeof BossBattle !== 'undefined' && BossBattle.currentBattle && typeof GAME !== 'undefined' && typeof GAME.estimateBattleWin === 'function') estimated = GAME.estimateBattleWin(BossBattle.currentBattle) || 0;
                    } catch(e) { console.warn('runConfirmOk: estimateBattleWin failed', e); }

                    console.log('runConfirmOk: runtime present, estimated=', estimated, 'has runAway=', typeof runtime.runAway === 'function', 'has loseBattle=', typeof runtime.loseBattle === 'function');

                    if (typeof runtime.runAway === 'function') {
                        try { const res = runtime.runAway(); console.log('runConfirmOk: runtime.runAway returned', res); acted = !!res || acted; } catch(e) { console.warn('runConfirmOk: runtime.runAway threw', e); }
                    }
                    // Prefer calling loseBattle with an explicit penalty so fleeing always costs that amount
                    try {
                        if (!acted && typeof runtime.loseBattle === 'function') { try { runtime.loseBattle(estimated); console.log('runConfirmOk: called runtime.loseBattle with', estimated); } catch(e) { console.warn('runConfirmOk: runtime.loseBattle threw', e); } acted = true; }
                        else if (!acted && typeof runtime.endBattle === 'function') { runtime.endBattle(false); acted = true; }
                    } catch (e) {
                        console.log('Error calling runtime.loseBattle/endBattle', e);
                    }
                }
            } catch (e) {
                console.log('Error calling runtime.runAway/endBattle', e);
            }

            // Try BossBattle fallback if still active
            try {
                if (typeof BossBattle !== 'undefined' && BossBattle.currentBattle) {
                    try { console.log('runConfirmOk: calling BossBattle.runAway'); BossBattle.runAway(); acted = true; } catch(e) { console.warn('runConfirmOk: BossBattle.runAway threw', e); }
                }
            } catch (e) { console.log('BossBattle.runAway error', e); }

            // If nothing handled yet, make a best-effort forced cleanup: clear both places and show defeat
            if (!acted) {
                console.log('No battle runner acted, forcing a state cleanup');
                if (runtime && runtime.state && runtime.state.currentBattle) {
                    // mark as lost
                    try { if (typeof runtime.loseBattle === 'function') runtime.loseBattle(); else runtime.endBattle && runtime.endBattle(false); } catch(e){console.log(e);}                
                }
                if (typeof BossBattle !== 'undefined' && BossBattle.currentBattle) {
                    try { BossBattle.loseBattle ? BossBattle.loseBattle() : BossBattle.endBattle(false, BossBattle.currentBattle); } catch(e){console.log(e);}                
                }
                UI.showNotification('🏃 Run away', 'Attempted forced escape — battle terminated.');
            }

            // (removed) emergency force-exit UI cleanup

            // Final safety: if a battle object still exists in runtime or global BossBattle, clear it and refresh UI
            try {
                if (runtime && runtime.state && runtime.state.currentBattle) {
                    console.log('Forcing clear of runtime.currentBattle');
                    // try to call runtime.endBattle/loseBattle if available BEFORE clearing state so handlers see the battle
                    try { if (typeof runtime.loseBattle === 'function') runtime.loseBattle(); } catch(e) { console.log('runtime.loseBattle error', e); }
                    // clear the persisted battle object after handlers executed
                    runtime.state.currentBattle = null;
                }
            } catch (e) { console.log('Error clearing runtime currentBattle', e); }

            try {
                if (typeof BossBattle !== 'undefined' && BossBattle.currentBattle) {
                    console.log('Forcing clear of BossBattle.currentBattle');
                    try { if (typeof BossBattle.loseBattle === 'function') BossBattle.loseBattle(); else BossBattle.endBattle && BossBattle.endBattle(false, BossBattle.currentBattle); } catch (e) { console.log('BossBattle clear error', e); }
                    BossBattle.currentBattle = null;
                }
            } catch (e) { console.log('Error clearing BossBattle', e); }

            // Trigger UI refresh in case the battle UI is still showing
            try { if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab(); } catch (e) { console.log('UI refresh error', e); }
            try { if (typeof runtime !== 'undefined' && runtime.saveGame) runtime.saveGame(); } catch (e) { /* ignore */ }
            // Ensure defeat overlay is visible if a recent defeat was recorded
            try {
                const last = (typeof GAME !== 'undefined' && GAME.state && GAME.state.lastBattleResult) ? GAME.state.lastBattleResult : null;
                if (last && last.outcome === 'defeat') {
                    const defeatOverlay = document.getElementById('bossDefeatOverlay');
                    const defeatPenalty = document.getElementById('defeatPenalty');
                    const defeatBossName = document.getElementById('defeatBossName');
                    if (defeatBossName && last.bossName) defeatBossName.textContent = last.bossName;
                    if (defeatPenalty) defeatPenalty.textContent = (typeof GAME === 'object' && GAME.formatNumber) ? GAME.formatNumber(last.penalty || 0) : (last.penalty || 0);
                    if (defeatOverlay) defeatOverlay.classList.remove('hidden');
                }
            } catch (e) { console.warn('runConfirmOk: failed to force-show defeat overlay', e); }
        });
    }

    // (removed) emergency force-exit element and its event handler. Run Away is handled by in-battle controls.
    
    const closeVictoryBtn = document.getElementById('closeBossVictory');
    if (closeVictoryBtn) {
        closeVictoryBtn.addEventListener('click', () => {
            try { if (typeof BossBattle !== 'undefined' && BossBattle && typeof BossBattle.closeVictory === 'function') { BossBattle.closeVictory(); } } catch (e) { console.warn('BossBattle.closeVictory not available or threw', e); }
            try { if (typeof GAME !== 'undefined' && GAME && typeof GAME.closeVictory === 'function') GAME.closeVictory(); } catch(e) { console.warn('GAME.closeVictory not available or threw', e); }
        });
    }
    
    const closeDefeatBtn = document.getElementById('closeBossDefeat');
    if (closeDefeatBtn) {
        closeDefeatBtn.addEventListener('click', (e) => {
            if (e && e.isTrusted === false) {
                console.log('GAME: ignored synthetic click on closeBossDefeat');
                return;
            }
            try { if (typeof BossBattle !== 'undefined' && BossBattle && typeof BossBattle.closeDefeat === 'function') { BossBattle.closeDefeat(true); } } catch (e) { console.warn('BossBattle.closeDefeat not available or threw', e); }
            try { if (typeof GAME !== 'undefined' && GAME && typeof GAME.closeDefeat === 'function') GAME.closeDefeat(true); } catch(e) { console.warn('GAME.closeDefeat not available or threw', e); }
        });
    }
    const rematchBtn = document.getElementById('rematchBossBtn');
    if (rematchBtn) {
        rematchBtn.addEventListener('click', () => {
            const defeatOverlay = document.getElementById('bossDefeatOverlay'); if (defeatOverlay) defeatOverlay.classList.add('hidden');
            if (typeof GAME !== 'undefined' && GAME.rematchLastBattle) GAME.rematchLastBattle();
        });
    }
    
    // Start the boss spawn system after a short delay
    setTimeout(() => {
        BossBattle.init();
    }, 5000);
});

// ============================================
// DARK MATTER CORRUPTION VISUAL SYSTEM
// ============================================

const DarkMatterCorruption = {
    particles: [],
    maxParticles: 30,
    lastLevel: 0,
    
    /**
     * Initialize corruption system
     */
    init() {
        // Reset dark matter activity on any user interaction
        document.addEventListener('click', () => {
            if (typeof GAME !== 'undefined') {
                GAME.resetDarkMatterActivity();
            }
        });
        
        document.addEventListener('keydown', () => {
            if (typeof GAME !== 'undefined') {
                GAME.resetDarkMatterActivity();
            }
        });
        
        document.addEventListener('mousemove', this.throttle(() => {
            if (typeof GAME !== 'undefined') {
                GAME.resetDarkMatterActivity();
            }
        }, 5000)); // Only count mouse movement every 5 seconds
    },
    
    /**
     * Throttle function to limit frequency
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            if (!inThrottle) {
                func.apply(this, arguments);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * Update visuals based on corruption level
     */
    updateVisuals(corruptionPercent) {
        const overlay = document.getElementById('corruptionOverlay');
        const indicator = document.getElementById('corruptionIndicator');
        const fill = document.getElementById('corruptionFill');
        const percentDisplay = document.getElementById('corruptionPercent');
        const particlesContainer = document.getElementById('corruptionParticles');
        const veinsContainer = document.getElementById('corruptionVeins');
        const glitchOverlay = document.getElementById('corruptionGlitch');
        
        if (!overlay || !indicator) return;
        
        // Show/hide based on corruption
        if (corruptionPercent > 0) {
            overlay.classList.remove('hidden');
            indicator.classList.remove('hidden');
            
            // Update percentage display
            if (fill) fill.style.width = corruptionPercent + '%';
            if (percentDisplay) percentDisplay.textContent = Math.floor(corruptionPercent);
            
            // Update fill color
            if (fill) {
                if (corruptionPercent >= 75) {
                    fill.classList.add('high');
                } else {
                    fill.classList.remove('high');
                }
            }
            
            // Update indicator state
            if (corruptionPercent >= 75) {
                indicator.classList.add('critical');
            } else {
                indicator.classList.remove('critical');
            }
            
            // Update screen corruption level
            this.updateScreenCorruption(corruptionPercent);
            
            // Update particles
            this.updateParticles(corruptionPercent, particlesContainer);
            
            // Update veins
            this.updateVeins(corruptionPercent, veinsContainer);
            
            // Update glitch
            this.updateGlitch(corruptionPercent, glitchOverlay);
            
        } else {
            overlay.classList.add('hidden');
            indicator.classList.add('hidden');
            
            // Reset screen corruption
            document.body.classList.remove('corruption-level-low', 'corruption-level-medium', 'corruption-level-high', 'corruption-level-critical');
            
            // Clear particles
            if (particlesContainer) particlesContainer.innerHTML = '';
            if (veinsContainer) veinsContainer.innerHTML = '';
        }
        
        this.lastLevel = corruptionPercent;
    },
    
    /**
     * Update screen corruption effect
     */
    updateScreenCorruption(percent) {
        document.body.classList.remove('corruption-level-low', 'corruption-level-medium', 'corruption-level-high', 'corruption-level-critical');
        
        if (percent >= 75) {
            document.body.classList.add('corruption-level-critical');
        } else if (percent >= 50) {
            document.body.classList.add('corruption-level-high');
        } else if (percent >= 25) {
            document.body.classList.add('corruption-level-medium');
        } else if (percent > 0) {
            document.body.classList.add('corruption-level-low');
        }
    },
    
    /**
     * Update corruption particles
     */
    updateParticles(percent, container) {
        if (!container) return;
        
        const targetParticles = Math.floor((percent / 100) * this.maxParticles);
        const currentParticles = container.children.length;
        
        // Add particles if needed
        if (targetParticles > currentParticles) {
            for (let i = currentParticles; i < targetParticles; i++) {
                const particle = document.createElement('div');
                particle.className = 'corruption-particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 5 + 's';
                particle.style.animationDuration = (3 + Math.random() * 4) + 's';
                particle.style.width = (5 + Math.random() * 8) + 'px';
                particle.style.height = particle.style.width;
                container.appendChild(particle);
            }
        }
        // Remove particles if needed
        else if (targetParticles < currentParticles) {
            for (let i = currentParticles - 1; i >= targetParticles; i--) {
                if (container.children[i]) {
                    container.children[i].remove();
                }
            }
        }
    },
    
    /**
     * Update corruption veins on screen edges
     */
    updateVeins(percent, container) {
        if (!container) return;
        
        // Create veins if not present
        if (container.children.length === 0) {
            ['top', 'bottom', 'left', 'right'].forEach(pos => {
                const vein = document.createElement('div');
                vein.className = 'corruption-vein ' + pos;
                container.appendChild(vein);
            });
        }
        
        // Update vein sizes based on corruption
        const veinSize = (percent / 100) * 150; // Max 150px
        
        const topVein = container.querySelector('.corruption-vein.top');
        const bottomVein = container.querySelector('.corruption-vein.bottom');
        const leftVein = container.querySelector('.corruption-vein.left');
        const rightVein = container.querySelector('.corruption-vein.right');
        
        if (topVein) topVein.style.height = veinSize + 'px';
        if (bottomVein) bottomVein.style.height = veinSize + 'px';
        if (leftVein) leftVein.style.width = veinSize + 'px';
        if (rightVein) rightVein.style.width = veinSize + 'px';
    },

    // ===== FIGHTING SYSTEM =====

    /**
     * Check if fighting is unlocked
     */
    isFightingUnlocked() {
        if (this.state.fightingUnlocked) {
            console.log('Fighting unlocked via flag');
            return true;
        }
        if (this.getSkillLevel && typeof this.getSkillLevel === 'function') {
            const skillLevel = this.getSkillLevel('fighting', 'spartan');
            console.log('Spartan skill level:', skillLevel);
            if (skillLevel > 0) {
                console.log('Fighting unlocked via skill');
                this.state.fightingUnlocked = true; // Ensure flag is set
                return true;
            }
        }
        console.log('Fighting not unlocked');
        return false;
    },

    /**
     * Unlock fighting system
     */
    unlockFighting() {
        if (!this.state.fightingUnlocked) {
            this.state.fightingUnlocked = true;
            UI.showNotification('⚔️ Fighting Unlocked!', 'You can now battle AI bosses!');
        }
    },

    /**
     * Is a given boss unlocked for the player? Unlock now requires prior tier to be unlocked
     */
    isBossUnlocked(bossId) {
        const bosses = (this && this.CONFIG && this.CONFIG.FIGHTING_BOSSES) ? this.CONFIG.FIGHTING_BOSSES : (GAME && GAME.CONFIG && GAME.CONFIG.FIGHTING_BOSSES) ? GAME.CONFIG.FIGHTING_BOSSES : [];
        const idx = bosses.findIndex(b => b.id === bossId);
        if (idx === -1) return false;
        const boss = bosses[idx];
        // Normalize state source: prefer this.state but fall back to GAME.state so callers bound to different `this` still work.
        const state = (this && this.state) ? this.state : (typeof GAME !== 'undefined' ? GAME.state : {});
        // Special-case early return: Crude AI can be unlocked by random spawn defeats
        try {
            if (bossId === 'crude_ai') {
                const randCount = Number(state.randomAIDefeats || 0);
                const needed = 2;
                const unlockedViaSet = state.unlockedBosses && (typeof state.unlockedBosses.has === 'function' ? state.unlockedBosses.has('crude_ai') : Array.isArray(state.unlockedBosses) && state.unlockedBosses.includes('crude_ai'));
                const unlockedViaRandom = randCount >= needed;
                if (this.CONFIG && this.CONFIG.DEBUG) console.log('isBossUnlocked(crude_ai):', { randCount, needed, unlockedViaSet, unlockedViaRandom, unlockedBosses: state.unlockedBosses });
                if (unlockedViaSet || unlockedViaRandom) return true;
            }
        } catch(e) { if (this.CONFIG && this.CONFIG.DEBUG) console.warn('isBossUnlocked crude check failed', e); }
        // If unlocked explicitly via progression flag, allow access
        if (bossId === 'crude_ai') {
            try { console.log('isBossUnlocked: crude check, unlockedBosses type=', Object.prototype.toString.call(state.unlockedBosses), 'hasFn=', state.unlockedBosses && typeof state.unlockedBosses.has === 'function'); } catch(e) {}
        }
        if (state.unlockedBosses) {
            // support both Set and Array for unlockedBosses
            if (typeof state.unlockedBosses.has === 'function' && state.unlockedBosses.has(bossId)) return true;
            if (Array.isArray(state.unlockedBosses) && state.unlockedBosses.includes(bossId)) return true;
        }
        // honor explicit initiallyUnlocked flag on boss config
        if (typeof boss.initiallyUnlocked === 'boolean' && boss.initiallyUnlocked === true) return true;
        // base numeric requirement from configuration
        const battlesWon = (state.fightingStats && state.fightingStats.battlesWon) ? state.fightingStats.battlesWon : 0;
        const req = boss.unlockRequirement;
        if (typeof req === 'number' && req > 0 && battlesWon >= req) return true;
        // First boss is unlocked by default unless explicitly marked otherwise.
        if (idx === 0 && boss.initiallyUnlocked !== false) return true;
        // otherwise, only unlock if previous boss meets its progression defeat requirement
        const prevBoss = bosses[idx - 1];
        if (!prevBoss) return false;
        const pc = state.fightingProgressCounts || {};
        const prevCount = pc[prevBoss.id] || 0;
        if (prevBoss.progressionDefeatRequirement && prevCount >= prevBoss.progressionDefeatRequirement) return true;
        // Special-case: Crude AI can also be unlocked by defeating random AIs
        try {
            if (bossId === 'crude_ai') {
                const needed = 2;
                const randCount = Number(state.randomAIDefeats || 0);
                if (randCount >= needed) return true;
            }
        } catch (e) { /* ignore */ }
        return false;
    },

    /**
     * Get available bosses for current level
     */
    getAvailableBosses() {
        const bosses = this.CONFIG.FIGHTING_BOSSES || [];
        return bosses.filter(boss => this.isBossUnlocked(boss.id));
    },
    
    /**
     * Unlock a boss by id (normalizes state, persists, updates UI)
     */
    unlockBoss(bossId) {
        try {
            if (!this.state.unlockedBosses) this.state.unlockedBosses = new Set();
            // normalize array-case
            if (Array.isArray(this.state.unlockedBosses)) this.state.unlockedBosses = new Set(this.state.unlockedBosses);
            if (!this.state.unlockedBosses.has(bossId)) {
                this.state.unlockedBosses.add(bossId);
                console.log('GAME.unlockBoss: unlocked', bossId);
                try { if (this.CONFIG && this.CONFIG.DEBUG) console.log('GAME.unlockBoss: unlockedBosses now =', Array.isArray(this.state.unlockedBosses) ? this.state.unlockedBosses : Array.from(this.state.unlockedBosses || [])); } catch(e) {}
                try { if (typeof this.saveGame === 'function') this.saveGame(); } catch(e) {}
                try { if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab(); } catch(e) {}
                return true;
            }
            return false;
        } catch (e) { console.warn('unlockBoss failed', e); }
        return false;
    },

    /**
     * Start a boss battle
     */
    startBossBattle(bossId, options = {}) {
        // If a previous battle object remains but is already ended, clear it so a new battle can start immediately.
        try {
            if (this.state && this.state.currentBattle && this.state.currentBattle._ended) {
                console.log('startBossBattle: clearing recently-ended currentBattle to allow immediate restart');
                this.state.currentBattle = null;
                try { if (typeof BossBattle !== 'undefined' && BossBattle && BossBattle.currentBattle) BossBattle.currentBattle = null; } catch(e) {}
                try { this.currentBattle = null; } catch(e) {}
            }
        } catch(e) { /* ignore */ }
        if (this.state.currentBattle) {
            UI.showNotification('❌ Battle in Progress', 'Finish your current battle first!');
            return false;
        }

        const bossConfig = this.CONFIG.FIGHTING_BOSSES.find(b => b.id === bossId);
        if (!bossConfig) return false;

        // Check if boss is unlocked (either by numeric unlockRequirement or progression/unlockedBosses)
        if (!this.isBossUnlocked(bossId)) {
            UI.showNotification('🔒 Boss Locked', `This boss is locked — you need to meet its unlock requirements.`);
            return false;
        }

        // Clear any lingering end-cleaner timers from a previous battle so they don't clear this new battle
        try { if (this._battleEndCleaner) { clearTimeout(this._battleEndCleaner); this._battleEndCleaner = null; } } catch(e) {}
        try { if (typeof BossBattle !== 'undefined' && BossBattle && BossBattle._battleEndCleaner) { clearTimeout(BossBattle._battleEndCleaner); BossBattle._battleEndCleaner = null; } } catch(e) {}

        // Calculate player stats
        const playerStats = this.calculatePlayerCombatStats();

        // remember last attempt (for rematch) and any selected risk
        this.state.lastBossAttempt = bossId;
        if (options && options.riskServer) {
            this.state.lastBattleRisk = options.riskServer;
        }

        // Create battle
        this.state.currentBattle = {
            boss: {
                ...bossConfig,
                currentHp: bossConfig.health,
                maxHp: bossConfig.health
            },
            player: {
                ...playerStats,
                currentHp: playerStats.maxHp
            },
            battleLog: [],
            startTime: Date.now(),
            timeLimit: 30000 + (this.getSkillEffects().bossTimeBonus || 0) * 1000, // 30 seconds + bonuses
            // attach any risk info to the battle (optional)
            risk: options && options.riskServer ? { serverKey: options.riskServer } : null,
            attacksUsed: [],
            // enforce explicit turn order
            turn: 'player'
        };
        // Special: if challenging GOD AI, warn player that a random server will be stolen on defeat
        try {
            if (bossConfig && bossConfig.id === 'god_ai') {
                const proceed = (typeof window !== 'undefined' && typeof window.confirm === 'function') ? window.confirm('Warning: Challenging GOD AI is risky — if you lose, a random owned server will be stolen. Proceed?') : true;
                if (!proceed) {
                    // clear the tentative currentBattle we just created
                    this.state.currentBattle = null;
                    return false;
                }
                // mark the battle as carrying a random-server-steal risk
                try {
                    if (!this.state.currentBattle.risk) this.state.currentBattle.risk = {};
                    this.state.currentBattle.risk.randomServerSteal = true;
                } catch(e) { console.warn('startBossBattle: failed to mark randomServerSteal', e); }
            }
        } catch(e) { /* ignore */ }
        try { if (this.state && this.state.currentBattle) this.state.currentBattle._justStarted = Date.now(); } catch(e) {}

        UI.showNotification('⚔️ Battle Started!', `Fighting ${bossConfig.name}!`);
        this.updateBattleUI();
        // Ensure a live timer updates the UI and checks end conditions once per second
        try {
            if (this.battleTimer) { clearInterval(this.battleTimer); this.battleTimer = null; }
            this.battleTimer = setInterval(() => {
                try { this.updateBattleUI(); this.checkBattleEnd(); } catch (e) { console.log('battleTimer error', e); }
            }, 1000);
        } catch (e) { /* ignore in non-browser env */ }
        return true;
    },

    /**
     * Calculate player combat stats
     */
    calculatePlayerCombatStats() {
        // Recalculate player stats from equipped items and skill effects
        const effects = this.getSkillEffects();

        let baseAttack = 50;
        let baseDefense = 10;
        let baseHp = 800;

        // breakdowns for UI
        let weaponAttack = 0;
        let bowAttack = 0;
        let armorDefense = 0;

        // Equipment contributions
        const eq = this.state.equipped || {};
        const inv = this.state.inventory || [];

        const getItem = (id) => {
            if (!id) return null;
            // if already an item object, return as-is
            if (typeof id === 'object' && id.id) return id;
            // otherwise try to find by id in inventory
            return inv.find(i => i.id === id) || null;
        };

        const getItemStatVal = (it) => {
            if (!it) return 0;
            // if passed an id string, treat as minimal item object with id
            let itemObj = it;
            if (typeof it === 'string') itemObj = { id: it };

            // support multiple possible stat keys for legacy items
            const candidates = [itemObj.stat, itemObj.damage, itemObj.attack, itemObj.atk, itemObj.power, itemObj.value];
            for (const c of candidates) {
                if (c !== undefined && c !== null && !Number.isNaN(Number(c))) return Number(c);
            }

            // fallback: parse explicit atk/def tokens or numeric suffix from id
            if (itemObj.id && typeof itemObj.id === 'string') {
                // explicit patterns: ..._atk123 or ..._def45 (prefer explicit)
                const atkMatch = itemObj.id.match(/_atk(\d+)/i);
                if (atkMatch) return Number(atkMatch[1]);
                const defMatch = itemObj.id.match(/_def(\d+)/i);
                if (defMatch) return Number(defMatch[1]);

                // legacy numeric suffix patterns: ..._12  or ..._12-5 (we'll take the first number)
                const two = itemObj.id.match(/_(\d+)-(\d+)$/);
                if (two) return Number(two[1]);
                const one = itemObj.id.match(/_(\d+)$/);
                if (one) return Number(one[1]);
            }

            return 0;
        };

        // Weapon or Axe (apply rarity damage multiplier)
        if (eq.weapon) {
            const w = getItem(eq.weapon);
            if (w) {
                const mult = this.RARITY_DAMAGE_MULT && this.RARITY_DAMAGE_MULT[w.rarity] ? this.RARITY_DAMAGE_MULT[w.rarity] : 1;
                const statVal = getItemStatVal(w);
                const val = Math.floor(statVal * mult);
                baseAttack += val;
                weaponAttack += val;
            }
        }

        // Bow (apply rarity damage multiplier)
        if (eq.bow) {
            const b = getItem(eq.bow);
            if (b) {
                const mult = this.RARITY_DAMAGE_MULT && this.RARITY_DAMAGE_MULT[b.rarity] ? this.RARITY_DAMAGE_MULT[b.rarity] : 1;
                const statVal = getItemStatVal(b);
                const val = Math.floor(statVal * mult);
                baseAttack += val;
                bowAttack += val;
            }
        }

        // Armor pieces reduce incoming damage by adding to defense
        ['helmet','chestplate','leggings','boots'].forEach(slot => {
            const id = eq[slot];
            if (!id) return;
            const it = getItem(id);
            if (it) {
                const mult = this.RARITY_DAMAGE_MULT && this.RARITY_DAMAGE_MULT[it.rarity] ? this.RARITY_DAMAGE_MULT[it.rarity] : 1;
                const statVal = getItemStatVal(it);
                const val = Math.floor(statVal * mult);
                baseDefense += val;
                armorDefense += val;
            }
        });

        // Skill bonuses
        if (effects.combatDamage) baseAttack *= (1 + effects.combatDamage);
        if (effects.damageReduction) baseDefense *= (1 + effects.damageReduction);

        // HP scales with defense and rarities modestly
        baseHp += Math.floor(baseDefense * 8);

        return {
            attack: Math.floor(baseAttack),
            defense: Math.floor(baseDefense),
            maxHp: Math.floor(baseHp),
            critChance: effects.critChance || 0,
            // breakdowns for UI
            _breakdown: {
                baseAttack: 50,
                weaponAttack,
                bowAttack,
                baseDefense: 10,
                armorDefense
            }
        };
    },

    /**
     * Execute an attack
     */
    executeAttack(attackId) {
        if (!this.state.currentBattle) return false;

        const attack = this.CONFIG.FIGHTING_ATTACKS.find(a => a.id === attackId);
        if (!attack) return false;

        // Enforce strict turn order: player can only act on player's turn
        if (this.state.currentBattle && this.state.currentBattle.turn && this.state.currentBattle.turn !== 'player') {
            if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('⏳ Not your turn', 'Wait until it is your turn to act.');
            return false;
        }

        // Check if attack is unlocked
        if (!this.isAttackUnlocked(attackId)) {
            UI.showNotification('🔒 Attack Locked', 'Unlock this attack through the skill tree!');
            return false;
        }

        // Check stamina cost
        const cost = attack.staminaCost || 0;
        if (cost > 0 && (this.state.fightingStamina || 0) < cost) {
            UI.showNotification('🔋 Not enough stamina', 'You need more stamina to use this ability.');
            return false;
        }

        const battle = this.state.currentBattle;

        // Check cooldown
        const lastUsed = battle.attacksUsed.find(a => a.id === attackId);
        if (lastUsed && Date.now() - lastUsed.time < attack.cooldown) {
            UI.showNotification('⏰ Cooldown', 'This attack is on cooldown!');
            return false;
        }

        // Queue the player's selected action for the simultaneous round resolution.
        // We no longer execute immediate damage here; resolveRound handles action order by speed.
        battle.playerAction = { id: attackId, attack: attack };

        // Deduct stamina on queue so player can't spam beyond stamina window (visual feedback)
        if (cost > 0) {
            this.state.fightingStamina = Math.max(0, (this.state.fightingStamina || 0) - cost);
        }

        // Mark as queued (use this state for UI) and record attempted use for cooldown visualization
        battle.attacksQueued = battle.attacksQueued || [];
        battle.attacksQueued.push({ id: attackId, time: Date.now() });

        // If boss action not already selected for this round, select one
        if (!battle.bossAction) {
            const selected = this.selectBossAction(battle) || attack; // fallback
            battle.bossAction = { id: selected.id, attack: selected };
        }

        // mark the battle in resolving state and schedule the simultaneous round resolution
        battle.turn = 'resolving';
        this.updateBattleUI();
        setTimeout(() => {
            try { this.resolveRound(); } catch (e) { console.log('resolveRound error', e); }
        }, 700);

        return true;

        // Calculate damage (scale weapon/bow attacks with equipped gear when available)
        let damage = attack.damage;
        const weapon = this.getEquippedItem('weapon');
        const bow = this.getEquippedItem('bow');
        if (attack.type === 'weapon' && weapon) {
            damage += Math.floor((weapon.stat || 0) * 0.9);
        }
        if ((attack.type === 'ranged' || attack.id === 'shoot') && bow) {
            damage += Math.floor((bow.stat || 0) * 0.9);
        }
        const playerStats = battle.player;

        // Apply skill bonuses
        const effects = this.getSkillEffects();
        if (effects.combatDamage) damage *= (1 + effects.combatDamage);

        // Critical hit
        let isCrit = false;
        if (Math.random() < (playerStats.critChance || 0)) {
            damage *= 2;
            isCrit = true;
        }

        // Accuracy check
        if (Math.random() > attack.accuracy) {
            damage = 0;
        }

        damage = Math.floor(damage);

        // Deduct stamina
        if (cost > 0) {
            this.state.fightingStamina = Math.max(0, (this.state.fightingStamina || 0) - cost);
        }
        // Apply damage to boss, but honor boss defensive stances (blocking/dodging)
        let finalBossDamage = damage;
        if (battle.boss && battle.boss.blocking) {
            const reduce = (battle.boss._reduceDamagePct !== undefined) ? battle.boss._reduceDamagePct : 0.5;
            finalBossDamage = Math.floor(finalBossDamage * (1 - reduce));
        }
        if (battle.boss && battle.boss.dodging) {
            const dodgeChance = battle.boss._dodgeChance || 0.5;
            if (Math.random() < dodgeChance) {
                finalBossDamage = 0;
                battle.battleLog.push(`${battle.boss.name} dodges the incoming attack!`);
            }
        }

        battle.boss.currentHp = Math.max(0, battle.boss.currentHp - finalBossDamage);
        // Set next turn to boss — explicit turn-based flow
        battle.turn = 'boss';

        // Record attack
        battle.attacksUsed.push({ id: attackId, time: Date.now() });

        // Combo handling: count consecutive successful player hits to increase damage
        if (!battle.combo) battle.combo = { playerHits: 0, bossHits: 0 };
        if (finalBossDamage > 0) {
            battle.combo.playerHits = (battle.combo.playerHits || 0) + 1;
            // small damage boost per consecutive hit (max 50%)
            const comboBoost = Math.min(0.5, (battle.combo.playerHits - 1) * 0.08);
            if (comboBoost > 0) {
                const extra = Math.floor(damage * comboBoost);
                damage += extra;
            }
        } else {
            // reset player's combo on miss
            battle.combo.playerHits = 0;
        }

        // Clear boss defend states — block/dodge only last for one incoming player attack
        try { if (battle.boss) { delete battle.boss.blocking; delete battle.boss.dodging; delete battle.boss._reduceDamagePct; delete battle.boss._dodgeChance; } } catch(e) {}

        // Log the attack
        let logMessage = `${attack.name} deals ${damage} damage`;
        if (isCrit) logMessage += ' (CRITICAL!)';
        if (damage === 0) logMessage += ' (MISSED!)';
        battle.battleLog.push(logMessage);

        // Trigger player attack animation on the UI if available
        try {
            if (typeof UI !== 'undefined') {
                const battleSection = document.querySelector('.fighting-battle-section');
                if (battleSection) {
                    battleSection.classList.add('player-attack');
                    setTimeout(() => battleSection.classList.remove('player-attack'), 800);
                }
            }
        } catch (e) { console.log('Error triggering player UI animation', e); }

        // Play a matching player sound depending on attack type
        try {
            if (typeof UI !== 'undefined' && UI.playSound) {
                if (attack.type === 'ranged' || attack.id === 'shoot' || attack.id === 'arrow_volley') {
                    UI.playSound('player_shoot');
                } else if (attack.type === 'melee' || attack.id === 'power_attack' || attack.id === 'basic_attack') {
                    UI.playSound('player_strike');
                } else {
                    UI.playSound('player_unarmed');
                }
            }
        } catch(e) {}

        // Camera shake for heavy attacks (give a more cinematic feel)
        try {
            const battleSection = document.querySelector('.fighting-battle-section');
            const heavy = (attack.id === 'power_attack' || (damage > (playerStats.maxHp || 1) * 0.12));
            if (battleSection && heavy) {
                battleSection.classList.add('camera-shake');
                setTimeout(() => battleSection.classList.remove('camera-shake'), 700);
            }
        } catch (e) { }

        // Boss will act on its turn (turn-based). Schedule boss action shortly to allow UI animation.
        setTimeout(() => {
            if (this.state.currentBattle && this.state.currentBattle.turn === 'boss') {
                try { this.bossCounterAttack(); } catch(e) { console.log('bossCounterAttack error', e); }
                this.updateBattleUI();
            }
        }, 700);

        // Check battle end
        this.checkBattleEnd();

        this.updateBattleUI();
        return true;
    },

    /**
     * Check if attack is unlocked
     */
    isAttackUnlocked(attackId) {
        const attack = this.CONFIG.FIGHTING_ATTACKS.find(a => a.id === attackId);
        if (!attack || !attack.unlockSkill) return true; // Basic attacks are always unlocked

        // Equipment-driven gating only. No more unlocking through skill points.
        // Kick & Punch always available
        if (attack.id === 'kick' || attack.id === 'punch') return true;

        // Weapon attacks require a weapon (sword/axe) to be equipped
        if (attack.type === 'weapon' || ['light_swing','heavy_swing','basic_attack','power_attack'].includes(attack.id)) {
            return !!(this.state.equipped && this.state.equipped.weapon);
        }

        // Ranged attacks require a bow
        if (attack.type === 'ranged' || ['shoot','arrow_volley'].includes(attack.id)) {
            return !!(this.state.equipped && this.state.equipped.bow);
        }

        // Other attacks are always available by default
        return true;
    },

    /**
     * Get training cost for attack unlock (in skill points)
     */
    getAttackUnlockCost(attackId) {
        const attack = this.CONFIG.FIGHTING_ATTACKS.find(a => a.id === attackId);
        if (!attack) return Infinity;
        // Base costs by rarity/type, fallback to formula
        const base = {
            unarmed: 1,
            melee: 2,
            ranged: 3,
            magic: 5
        };
        const type = attack.type || 'melee';
        const cost = base[type] || 3;
        // Slightly scale by damage/cooldown
        const scale = Math.ceil((attack.damage || 0) / 100) + Math.floor((attack.cooldown || 0) / 2000);
        return Math.max(1, cost + scale);
    },

    /**
     * Unlock an attack by spending skill points in the Training tab
     */
    buyAttackTraining(attackId) {
        const attack = this.CONFIG.FIGHTING_ATTACKS.find(a => a.id === attackId);
        if (!attack) return false;

        // Already unlocked
        if (this.isAttackUnlocked(attackId)) return false;

        const cost = this.getAttackUnlockCost(attackId);
        if (this.state.skillPoints >= cost) {
            this.state.skillPoints -= cost;
            this.state.unlockedAttacks = this.state.unlockedAttacks || [];
            this.state.unlockedAttacks.push(attackId);
            UI.playSound('upgrade');
            return true;
        }
        return false;
    },

    /**
     * Boss counterattack
     */
    bossCounterAttack() {
        const battle = this.state.currentBattle;
        const boss = battle.boss;
        const player = battle.player;

        // If it's not boss's turn, skip
        if (battle.turn && battle.turn !== 'boss') return;

        // Select which action the boss will take (simple AI)
        const selected = this.selectBossAction(battle);

        // If the selected action is a defensive action, apply boss defend states and skip damage application
        if (selected && selected.actionCategory === 'defend') {
            // mark boss as blocking/dodging for next incoming player attack
            battle.boss.blocking = !!(selected.effect && selected.effect.reduceDamagePct);
            battle.boss.dodging = !!(selected.effect && selected.effect.dodgeChance);
            battle.boss._reduceDamagePct = (selected.effect && selected.effect.reduceDamagePct) || 0;
            battle.boss._dodgeChance = (selected.effect && selected.effect.dodgeChance) || 0;
            battle.battleLog.push(`${boss.name} braces and prepares.`);
            // Next turn is player
            battle.turn = 'player';
            // schedule UI update quickly
            this.updateBattleUI();
            return;
        }

        // Calculate boss damage (if this action deals damage)
        let damage = selected && selected.damage ? selected.damage : boss.attack;

        // Player defense reduction (reduce damage based on defense)
        damage -= player.defense * 0.1;
        // Enforce minimum damage threshold: player must take at least 40% of boss attack
        const minDamage = Math.ceil(boss.attack * 0.4);
        damage = Math.max(minDamage, Math.floor(damage));

        // Apply damage with respect to player's defensive stances
        let finalDamage = damage;
        // If player is blocking, reduce damage by block percentage
        if (player.blocking && selected && selected.type !== 'defend') {
            const reducePct = (selected && selected.effect && selected.effect.reduceDamagePct) || 0.5;
            // If attack has a stagger that ignores some blocking, apply minimal floor
            finalDamage = Math.floor(finalDamage * (1 - reducePct));
        }
        // If player is dodging, roll for dodge success
        if (player.dodging && selected && selected.type !== 'defend') {
            const dodgeChance = player._dodgeChance || 0.5;
            if (Math.random() < dodgeChance) {
                finalDamage = 0; // avoided
                battle.battleLog.push(`${player.name || 'You'} dodge and avoid damage!`);
            }
        }

        player.currentHp = Math.max(0, player.currentHp - finalDamage);

        // After boss acts, next is player turn
        battle.turn = 'player';

        // Combo handling for boss — reset player combo when boss hits
        if (!battle.combo) battle.combo = { playerHits: 0, bossHits: 0 };
        if (finalDamage > 0) {
            battle.combo.bossHits = (battle.combo.bossHits || 0) + 1;
            battle.combo.playerHits = 0; // reset player's streak
        } else {
            battle.combo.bossHits = 0;
        }

        // Log counterattack
        battle.battleLog.push(`${boss.name} counterattacks for ${finalDamage} damage!`);

        // Vampiric healing if applicable
        const effects = this.getSkillEffects();
        if (effects.vampiric) {
            const healAmount = Math.floor(damage * effects.vampiric);
            battle.timeLimit += healAmount * 100; // Convert to milliseconds
            battle.battleLog.push(`Vampiric healing extends battle by ${healAmount} seconds!`);
        }

        // Clear any player defensive stances (they last for one boss action)
        try { if (battle.player) { delete battle.player.blocking; delete battle.player.dodging; delete battle.player._dodgeChance; } } catch(e){}

        // Trigger boss attack animation in UI (if available) and update UI
        try {
            if (typeof UI !== 'undefined') {
                const battleSection = document.querySelector('.fighting-battle-section');
                if (battleSection) {
                    battleSection.classList.add('boss-attack');
                    setTimeout(() => battleSection.classList.remove('boss-attack'), 900);
                }
                try {
                    const bossAvatarElem = document.getElementById('bossAvatar');
                    if (bossAvatarElem && boss && boss.appearance && String(boss.appearance).startsWith('mech')) {
                        bossAvatarElem.classList.add('mech-attack');
                        setTimeout(() => bossAvatarElem.classList.remove('mech-attack'), 900);
                    }
                } catch (e) { /* ignore */ }

        // Play mech attack sound and show mech-hit visual
        try {
            if (typeof UI !== 'undefined' && UI.playSound) UI.playSound('mech_attack');
            const overlay = document.querySelector('.mech-hit-overlay');
            if (overlay) {
                overlay.classList.add('active');
                setTimeout(() => overlay.classList.remove('active'), 700);
            }
        } catch (e) {}
            }
        } catch (e) { console.log('Error triggering boss UI animation', e); }
    },

    /**
     * Choose an action for boss AI based on aggression, HP and simple heuristics
     */
    selectBossAction(battle) {
        if (!battle || !battle.boss) return null;
        // see if boss has a data-driven behavior tree defined in config
        try {
            const bossId = battle.boss.id;
            const bossConfig = this.CONFIG.FIGHTING_BOSSES && this.CONFIG.FIGHTING_BOSSES.find(b => b.id === bossId);
            const attacks = this.CONFIG.FIGHTING_ATTACKS || [];
            if (bossConfig && Array.isArray(bossConfig.behavior) && bossConfig.behavior.length > 0) {
                const fromBehavior = this.evaluateBossBehavior(battle, bossConfig, attacks);
                if (fromBehavior) return fromBehavior;
            }
        } catch (e) { /* fall through to heuristics */ }
        const boss = battle.boss;
        const attacks = this.CONFIG.FIGHTING_ATTACKS || [];
        const bossHpPct = Math.max(0, (boss.currentHp || 1) / (boss.maxHp || 1));

        // Defensive bias when low health
        const defensiveBias = bossHpPct < 0.25 ? 0.5 : 0.0;

        // aggression: how likely boss chooses heavy/offensive
        const aggression = Math.min(1, Math.max(0, boss.aggression || 0.5));

        // chance to choose heavy attack increases with aggression and decreases with HP
        const heavyChance = Math.min(0.95, aggression + (1 - bossHpPct) * 0.2 - defensiveBias);

        // if very low HP, small chance to defend/dodge
        if (Math.random() < (0.12 + defensiveBias)) {
            // choose a defend action
            const defend = attacks.find(a => a.actionCategory === 'defend');
            if (defend) return defend;
        }

        // Allow bosses to use special moves in certain conditions
        if (Array.isArray(boss.specialMoves) && boss.specialMoves.length > 0) {
            // Higher aggression and lower HP increase chance to use specials
                // incorporate boss 'evilness' factor (lower evil -> less likely to use specials)
                const evilFactor = Math.max(0, Math.min(1, (boss.evilness || 0.5)));
                const specialChance = Math.min(0.5, aggression * 0.45 + (1 - bossHpPct) * 0.2) * Math.max(0.2, evilFactor);
            if (Math.random() < specialChance) {
                const id = boss.specialMoves[Math.floor(Math.random() * boss.specialMoves.length)];
                const sp = attacks.find(a => a.id === id);
                if (sp) return sp;
            }
        }

        // pick by category
        const heavyPool = attacks.filter(a => a.actionCategory === 'heavy' && (a.type === 'melee' || a.type === 'weapon' || a.type === 'ranged'));
        const lightPool = attacks.filter(a => a.actionCategory === 'light' && (a.type === 'melee' || a.type === 'weapon' || a.type === 'ranged'));

        const roll = Math.random();
        if (roll < heavyChance && heavyPool.length > 0) {
            return heavyPool[Math.floor(Math.random() * heavyPool.length)];
        }
        // fallback to ranged if boss is a ranged-type (small chance if present)
        const rangedPool = attacks.filter(a => a.actionCategory === 'ranged');
        if (rangedPool.length > 0 && Math.random() < 0.25) return rangedPool[Math.floor(Math.random() * rangedPool.length)];

        // default to light pool
        if (lightPool.length > 0) return lightPool[Math.floor(Math.random() * lightPool.length)];

        // fallback to first melee-like attack
        return attacks.find(a => a.type === 'melee' || a.type === 'weapon') || attacks[0] || null;
    },

    /**
     * Evaluate a boss' data-driven behavior rules and return an attack object if a rule selects one.
     * @param {Object} battle - the current battle instance
     * @param {Object} bossConfig - the boss configuration from CONFIG
     * @param {Array} attacksList - available attacks
     */
    evaluateBossBehavior(battle, bossConfig, attacksList) {
        try {
            if (!bossConfig || !Array.isArray(bossConfig.behavior)) return null;
            const rules = bossConfig.behavior || [];
            const attacks = attacksList || this.CONFIG.FIGHTING_ATTACKS || [];
            const boss = battle.boss;
            const player = battle.player;
            const hpPct = boss && boss.maxHp ? Math.max(0, (boss.currentHp || 0) / boss.maxHp) : 1;
            const playerHpPct = player && player.maxHp ? Math.max(0, (player.currentHp || 0) / player.maxHp) : 1;

            for (let rule of rules) {
                const when = rule.when || {};
                let match = false;

                if (when.always) match = true;
                if (when.hpBelowPct !== undefined && hpPct <= when.hpBelowPct) match = true;
                if (when.playerHpBelowPct !== undefined && playerHpPct <= when.playerHpBelowPct) match = true;
                if (when.playerStaminaBelow !== undefined && (this.state && (this.state.fightingStamina || 0)) <= when.playerStaminaBelow) match = true;

                if (!match) continue;

                const then = rule.then || {};

                // prefer specific action ids
                if (then.prefer && Array.isArray(then.prefer) && then.prefer.length > 0) {
                    const chance = typeof then.chance === 'number' ? then.chance : 1.0;
                    if (Math.random() < chance) {
                        // pick a valid attack from prefer list
                        const pool = then.prefer.map(id => attacks.find(a => a.id === id)).filter(Boolean);
                        if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
                        // if none by id, try fallback to category names
                        const catPool = then.prefer.map(cat => attacks.filter(a => a.actionCategory === cat)).flat();
                        if (catPool.length > 0) return catPool[Math.floor(Math.random() * catPool.length)];
                    }
                }

                // weighted categories
                if (then.weightedCategories && typeof then.weightedCategories === 'object') {
                    const weights = then.weightedCategories;
                    const entries = Object.keys(weights).map(k => ({ cat: k, w: Math.max(0, Number(weights[k] || 0)) })).filter(e => e.w > 0);
                    if (entries.length === 0) continue;
                    const total = entries.reduce((s, e) => s + e.w, 0);
                    let pick = Math.random() * total;
                    let chosenCat = entries[0].cat;
                    for (let e of entries) {
                        if (pick <= e.w) { chosenCat = e.cat; break; }
                        pick -= e.w;
                    }
                    // pick a random attack from chosen category
                    const pool = attacks.filter(a => a.actionCategory === chosenCat);
                    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
                }
            }
        } catch (e) {
            console.log('Error running boss behavior', e);
        }
        return null;
    },

    /**
     * Resolve a simultaneous two-action round based on attack speeds (lower speed resolves first).
     * Handles damage, blocking/dodging, interrupts, specials and logs events.
     */
    resolveRound() {
        const battle = this.state.currentBattle;
        if (!battle) return false;

        // Get action objects (default to basic attack if player didn't pick)
        const attacks = this.CONFIG.FIGHTING_ATTACKS || [];
        const playerActObj = battle.playerAction ? attacks.find(a => a.id === battle.playerAction.id) : attacks.find(a => a.id === 'basic_attack');
        const bossActObj = battle.bossAction ? attacks.find(a => a.id === battle.bossAction.id) : this.selectBossAction(battle);

        if (!playerActObj || !bossActObj) return false;

        // Prepare the two participants
        const actions = [
            { actor: 'player', entity: battle.player, target: battle.boss, attack: playerActObj, speed: playerActObj.speed || 600, canceled: false, resolved: false },
            { actor: 'boss', entity: battle.boss, target: battle.player, attack: bossActObj, speed: bossActObj.speed || 600, canceled: false, resolved: false }
        ];

        // tie-breaker: if equal speed, shuffle the order (random)
        actions.sort((a, b) => {
            if ((a.speed || 0) === (b.speed || 0)) return Math.random() > 0.5 ? 1 : -1;
            return (a.speed || 0) - (b.speed || 0);
        });

        // gather events for UI animation/feedback
        const roundEvents = [];

        // Helper to execute an individual action
        const execute = (act) => {
            const who = act.entity;
            const target = act.target;
            const attack = act.attack;

            // If the action has been canceled by an earlier interrupt, skip
            if (act.canceled) {
                // record cancellation event for UI
                roundEvents.push({ actor: act.actor, canceled: true, attackId: act.attack && act.attack.id ? act.attack.id : null });
                return;
            }

            // Defensive actions take effect immediately when they resolve
            if (attack.actionCategory === 'defend') {
                if (attack.effect && attack.effect.reduceDamagePct) {
                    who.blocking = true;
                    who._reduceDamagePct = attack.effect.reduceDamagePct;
                }
                if (attack.effect && attack.effect.dodgeChance) {
                    who.dodging = true;
                    who._dodgeChance = attack.effect.dodgeChance;
                }
                // register as used
                battle.attacksUsed.push({ id: attack.id, time: Date.now() });
                battle.battleLog.push(`${who === battle.player ? 'You' : who.name} brace to ${attack.id}.`);
                act.resolved = true;
                return;
            }

            // Damage flow
            let damage = attack.damage || 0;

            // Player contribution: use full calculated player attack (includes equipped gear)
            if (act.actor === 'player') {
                const pStats = (typeof this.calculatePlayerCombatStats === 'function') ? this.calculatePlayerCombatStats() : { attack: 0 };
                damage = (attack.damage || 0) + (pStats.attack || 0);
            }

            // Skill bonuses
            const effects = this.getSkillEffects();
            if (effects.combatDamage) damage *= (1 + effects.combatDamage);

            // Debug: log computed damage components for player actions
            try {
                if (act.actor === 'player' && this.CONFIG && this.CONFIG.DEBUG) {
                    console.log('resolveRound: dmgDebug', { attackId: attack.id, base: attack.damage || 0, pAttack: (typeof this.calculatePlayerCombatStats === 'function' ? this.calculatePlayerCombatStats().attack : 0), preEffects: damage });
                }
            } catch(e) {}

            // Criticals: only player has critChance currently
            let isCrit = false;
            const cChance = (act.actor === 'player') ? (who.critChance || 0) : (who.critChance || 0);
            if (Math.random() < (cChance || 0)) { damage *= 2; isCrit = true; }

            // Accuracy check
            if (Math.random() > (attack.accuracy || 1)) {
                damage = 0; // miss
            }

            // Apply preliminary based on target defense
            let ignoreDef = (attack.effect && attack.effect.ignoreDefensePct) || 0;
            const defenseImpact = (target.defense || 0) * 0.1 * (1 - ignoreDef);
            let final = Math.floor(damage - defenseImpact);

            // Apply blocking/dodging only if the targeted party's defend resolved **before** this attack.
            // (If the defend hasn't resolved yet, it won't save them — resolves order picks that.)
            if (target.blocking && act.neutralizedByBlock !== true) {
                const reduce = target._reduceDamagePct || 0.5;
                final = Math.floor(final * (1 - reduce));
            }
            if (target.dodging) {
                const chance = target._dodgeChance || 0.5;
                if (Math.random() < chance) {
                    final = 0; // dodged
                }
            }

            // Enforce minimum damage if boss -> player (the 40% floor)
            if (act.actor === 'boss') {
                const minDamage = Math.ceil((attack.damage || who.attack || 0) * 0.4);
                final = Math.max(minDamage, final);
            }

            final = Math.max(0, final);

            // Apply special effects like draining stamina
            try {
                if (attack.effect && attack.effect.drainStamina && act.actor === 'boss') {
                    // apply to player
                    if (this.state.fightingStamina) this.state.fightingStamina = Math.max(0, this.state.fightingStamina - attack.effect.drainStamina);
                }
            } catch (e) {}

            // Apply to target
            if (final > 0) {
                target.currentHp = Math.max(0, (target.currentHp || 0) - final);
            }

            // Immediately end the battle if someone dropped to 0 in this action
            try {
                // prefer engine handlers
                if (target === battle.boss && (battle.boss.currentHp || 0) <= 0) {
                    // Ensure hp is not negative
                    battle.boss.currentHp = 0;
                    // Defensive: if the victory overlay isn't visible for any reason, ensure it appears
                    try {
                        const overlay = document.getElementById('bossVictoryOverlay');
                        if (overlay) overlay.classList.remove('hidden');
                    } catch(e) {}
                    if (typeof this.winBattle === 'function') return this.winBattle();
                }
                if (target === battle.player && (battle.player.currentHp || 0) <= 0) {
                    battle.player.currentHp = 0;
                    if (typeof this.loseBattle === 'function') return this.loseBattle();
                }
            } catch (e) { console.log('Immediate end check failed', e); }

            // If attack has interrupt chance or high stagger and the target has an unresolved action, cancel it
            if (attack.special || (attack.stagger && attack.stagger >= 20)) {
                const interruptChance = (attack.effect && attack.effect.interruptChance) || Math.min(0.85, (attack.stagger || 0) / 100);
                // find opponent action
                const opp = actions.find(a => a.actor !== act.actor);
                    if (opp && !opp.resolved && Math.random() < interruptChance) {
                        opp.canceled = true;
                        // UI event for interruption
                        roundEvents.push({ actor: opp.actor, canceled: true, attackId: opp.attack && opp.attack.id ? opp.attack.id : null, canceledBy: act.actor });
                        battle.battleLog.push(`${who === battle.player ? 'You' : who.name} interrupts ${opp.actor === 'player' ? 'player' : opp.entity.name}'s action!`);
                    }
            }

            // Record attack use
            battle.attacksUsed.push({ id: attack.id, time: Date.now() });

            // Log result
            let msg = `${who === battle.player ? 'You' : who.name} uses ${attack.name}`;
            msg += final > 0 ? ` — deals ${final} damage` : ' — missed';
            if (isCrit) msg += ' (CRITICAL!)';

            // push round event for this resolved action
            roundEvents.push({ actor: act.actor, attackId: attack.id, damage: final, isCrit: !!isCrit });

            battle.battleLog.push(msg);

            act.resolved = true;
            // If this attack killed the target, mark battle ended and signal engine handlers
            if (target.currentHp <= 0) {
                try {
                    // mark ended so outer resolver can stop
                    battle._ended = true;
                    if (target === battle.boss) {
                        if (typeof this.winBattle === 'function') this.winBattle();
                    } else if (target === battle.player) {
                        if (typeof this.loseBattle === 'function') this.loseBattle();
                    }
                } catch (e) { console.log('instant end handler failed', e); }
            }
        };

        // Reset any round-specific flags on participants
        try { delete battle.player.blocking; delete battle.player.dodging; delete battle.player._dodgeChance; delete battle.player._reduceDamagePct; } catch (e) {}
        try { delete battle.boss.blocking; delete battle.boss.dodging; delete battle.boss._dodgeChance; delete battle.boss._reduceDamagePct; } catch (e) {}

        // Execute the actions in sorted order
        for (let act of actions) {
            // if action was canceled (e.g., stunned before it resolved), skip
            if (act.canceled) {
                // ensure a round event was pushed earlier (but add if missing)
                if (!roundEvents.find(r => r.actor === act.actor && r.canceled)) {
                    roundEvents.push({ actor: act.actor, canceled: true, attackId: act.attack && act.attack.id ? act.attack.id : null });
                }
                battle.battleLog.push(`${act.actor === 'player' ? 'Your' : act.entity.name + "'s"} action was interrupted!`);
                act.resolved = true;
                continue;
            }
            execute(act);
            if (battle._ended) break;
        }

        // attach a summary of this round's events for the UI to animate
        try { battle.recentRoundEvents = roundEvents.slice(); } catch(e) {}

        // Clear queued actions and move to next selection phase
        try { delete battle.playerAction; delete battle.bossAction; delete battle.attacksQueued; } catch (e) {}
        battle.turn = 'player';

        // After resolving a round, if not already ended, check if battle ended / update UI
        if (!battle._ended) this.checkBattleEnd();
        this.updateBattleUI();

        return true;
    },

    /**
     * Check if battle has ended
     */
    checkBattleEnd() {
        // Support both runtime variants: state.currentBattle (new) and currentBattle (legacy)
        const battle = this.state.currentBattle || this.currentBattle;
        if (!battle) return;

        // compute elapsed using stored startTime if present
        const timeElapsed = Date.now() - (battle.startTime || Date.now());

        // immediate win condition (boss dead)
        try {
            if (!this._battleOutcomeHandled && battle.boss && (battle.boss.currentHp || 0) <= 0) {
                // use engine's win handler if available
                if (typeof this.winBattle === 'function') return this.winBattle();
            }
        } catch (e) { console.log('checkBattleEnd win check failed', e); }

        // immediate lose conditions: player dead OR timeout
        try {
            if (!this._battleOutcomeHandled && battle.player && (battle.player.currentHp || 0) <= 0) {
                if (typeof this.loseBattle === 'function') return this.loseBattle();
            }
        } catch (e) { console.log('checkBattleEnd player-dead check failed', e); }

        try {
            if (!this._battleOutcomeHandled && (battle.timeLimit || 0) > 0 && timeElapsed >= (battle.timeLimit || 0)) {
                if (typeof this.loseBattle === 'function') return this.loseBattle();
            }
        } catch (e) { console.log('checkBattleEnd timeout check failed', e); }
    },

    /**
     * Win the battle
     */
    winBattle() {
        // Normalise to either state.currentBattle or legacy currentBattle
        const legacyBattle = (typeof BossBattle !== 'undefined' && BossBattle.currentBattle) ? BossBattle.currentBattle : (typeof window !== 'undefined' && window.BossBattle && window.BossBattle.currentBattle) ? window.BossBattle.currentBattle : null;
        const battle = this.state.currentBattle || this.currentBattle || legacyBattle;
        const boss = battle.boss;

        // Award rewards
        const effects = this.getSkillEffects();
        let rewardMultiplier = 1;

        // Boss reward bonus from skill tree
        if (effects.bossRewardBonus) {
            rewardMultiplier += effects.bossRewardBonus;
        }

        // Boss Slayer ultimate - 2x rewards
        if (effects.bossSlayer) {
            rewardMultiplier *= 2;
        }

        // capture pre-fight coins for risk-based bonus calculations
        const preCoins = this.state.coins || 0;
        // Determine coin reward using progression peak when configured
        const progressionPeak = (this.state && (this.state.progressionPeakCoins || (this.state.stats && this.state.stats.peakCoins))) ? (this.state.progressionPeakCoins || (this.state.stats && this.state.stats.peakCoins)) : (this.state.coins || 0);
        let coinReward;
        if (boss && boss.isRandomSpawn) {
            coinReward = Math.floor((5000 + Math.floor((progressionPeak || 0) * 0.10)) * rewardMultiplier);
        } else if (typeof boss.progressionRewardPct === 'number' && boss.progressionRewardPct > 0) {
            coinReward = Math.floor((progressionPeak || 0) * boss.progressionRewardPct * rewardMultiplier);
            const fallbackReward = Math.floor(((boss.reward && boss.reward.coins) || Math.floor((boss.maxHp || 0) * 10)) * rewardMultiplier);
            if (coinReward < fallbackReward) coinReward = fallbackReward;
        } else {
            coinReward = Math.floor(((boss.reward && boss.reward.coins) || Math.floor((boss.maxHp || 0) * 10)) * rewardMultiplier);
        }
        const skillPointReward = Math.floor(((boss.reward && boss.reward.skillPoints) || 0) * rewardMultiplier);
        const achievementPoints = Math.floor(((boss.reward && boss.reward.achievementPoints) || 0) * rewardMultiplier);

        // Add main reward
        this.state.coins += coinReward;
        try { console.log('winBattle: coinReward=', coinReward, 'newCoins=', this.state.coins); } catch(e) {}
        // If this battle had a risk selected (server at-risk) then give a bonus based on current coins
        let riskBonus = 0;
        try {
            const serverRisk = (this.state.currentBattle && this.state.currentBattle.risk && this.state.currentBattle.risk.serverKey) || this.state.lastBattleRisk;
            if (serverRisk) {
                // scale bonus by how far beyond advanced_ai this boss is (2% per tier)
                const bosses = (this && this.CONFIG && this.CONFIG.FIGHTING_BOSSES) ? this.CONFIG.FIGHTING_BOSSES : (GAME && GAME.CONFIG && GAME.CONFIG.FIGHTING_BOSSES) ? GAME.CONFIG.FIGHTING_BOSSES : [];
                const advancedIdx = bosses.findIndex(b => b.id === 'advanced_ai');
                const bossIdx = bosses.findIndex(b => b.id === boss.id);
                const tier = Math.max(1, (bossIdx > advancedIdx) ? (bossIdx - advancedIdx) : 1);
                const bonusPercent = 0.02 * tier;
                riskBonus = Math.floor(preCoins * bonusPercent);
                if (riskBonus > 0) {
                    this.state.coins += riskBonus;
                    this.state.totalCoinsEarned += riskBonus;
                }
            }
        } catch (e) {
            console.log('Error computing risk bonus', e);
        }
        this.state.totalCoinsEarned += coinReward;
        this.earnSkillPoints(skillPointReward);

        if (achievementPoints > 0) {
            this.state.achievementPoints += achievementPoints;
            this.state.totalAchievementPointsEarned += achievementPoints;
        }

        // Prevent duplicate handling
        if (this._battleOutcomeHandled) return;
        this._battleOutcomeHandled = true;

        // Update stats
        this.state.fightingStats.battlesWon++;
        // Auto-unlock bosses based on total battles won
        try {
            const battlesWonNow = (this.state && this.state.fightingStats) ? (this.state.fightingStats.battlesWon || 0) : 0;
            const bossesCfg = this.CONFIG.FIGHTING_BOSSES || [];
            bossesCfg.forEach(b => {
                if (typeof b.unlockRequirement === 'number' && b.unlockRequirement > 0 && battlesWonNow >= b.unlockRequirement) {
                    try {
                        if (!this.isBossUnlocked(b.id)) {
                            const did = (typeof GAME !== 'undefined' && typeof GAME.unlockBoss === 'function') ? GAME.unlockBoss(b.id) : (this.unlockBoss ? this.unlockBoss(b.id) : false);
                            if (did) {
                                try { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('🔓 Boss Unlocked!', `${b.name} unlocked by total wins.`); } catch(e) {}
                            }
                        }
                    } catch (e) { /* ignore per-boss errors */ }
                }
            });
        } catch(e) {}
        this.state.fightingStats.totalDamageDealt += (boss.maxHp - battle.boss.currentHp);
        this.state.fightingStats.bossesDefeated++;

        // Record boss kill
        if (!this.state.bossesKilled) this.state.bossesKilled = [];
        this.state.bossesKilled.push({
            name: boss.name,
            type: 'AI Boss',
            time: Date.now()
        });

        // Capture a short-lived recent battle result so the UI can render a summary
        try {
            this.state.lastBattleResult = {
                outcome: 'victory',
                bossId: boss.id,
                bossName: boss.name,
                rewardCoins: coinReward + (riskBonus || 0),
                rewardSkillPoints: skillPointReward,
                time: Date.now()
            };
        } catch (e) { /* no-op */ }

        // Show victory overlay (rich display)
        const victoryOverlay = document.getElementById('bossVictoryOverlay');
        const victoryBossName = document.getElementById('victoryBossName');
        const victorySkillPoints = document.getElementById('victorySkillPoints');
        const victoryCoins = document.getElementById('victoryCoins');
        const victoryTicketsItem = document.getElementById('victoryTicketsItem');
        const victoryTickets = document.getElementById('victoryTickets');
        const victoryTicketsPlural = document.getElementById('victoryTicketsPlural');
        if (victoryOverlay) {
            victoryBossName.textContent = boss.name;
            victorySkillPoints.textContent = skillPointReward;
            victoryCoins.textContent = this.formatNumber(coinReward + (riskBonus || 0));
            if (victoryTicketsItem) victoryTicketsItem.style.display = 'none';
            victoryOverlay.classList.remove('hidden');
            if (typeof UI !== 'undefined' && UI.playSound) UI.playSound('win');
            // Show unlock note in overlay if applicable
            try {
                const victoryUnlockNote = document.getElementById('victoryUnlockNote');
                if (victoryUnlockNote) {
                    if (this.state && this.state.lastBattleResult && this.state.lastBattleResult.specialUnlock) {
                        if (this.state.lastBattleResult.specialUnlock === 'crude_ai') victoryUnlockNote.textContent = '🔓 New Boss Unlocked: Crude AI';
                        else victoryUnlockNote.textContent = `🔓 New Unlock: ${this.state.lastBattleResult.specialUnlock}`;
                        victoryUnlockNote.classList.remove('hidden');
                    } else {
                        victoryUnlockNote.classList.add('hidden');
                        victoryUnlockNote.textContent = '';
                    }
                }
            } catch(e) {}
        }

        // Stop mech ambient sound timer if present
        try { if (this.mechAmbientTimer) { clearInterval(this.mechAmbientTimer); this.mechAmbientTimer = null; } } catch (e) {}

        // Clear any live battle timer
        try { if (this.battleTimer) { clearInterval(this.battleTimer); this.battleTimer = null; } } catch(e) {}

        // Stop mech ambient sound timer if present
        try { if (this.mechAmbientTimer) { clearInterval(this.mechAmbientTimer); this.mechAmbientTimer = null; } } catch (e) {}

        // End battle state (leave victory overlay visible)
        try {
            // Mark the battle ended but keep the object alive for a short window
            if (battle) {
                battle._ended = true;
                battle._endExpiresAt = Date.now() + 4000; // keep for 4s for UI summary
            }

            // schedule a cleanup to remove the stored battle after a short delay
            try { if (this._battleEndCleaner) clearTimeout(this._battleEndCleaner); } catch(e) {}
            try {
                const _token = `end_${Date.now()}_${Math.floor(Math.random()*100000)}`;
                if (this.state && this.state.currentBattle) this.state.currentBattle._endToken = _token;
                if (this.currentBattle) this.currentBattle._endToken = _token;
                this._battleEndCleaner = setTimeout(() => {
                    try {
                        if (this.state && this.state.currentBattle && this.state.currentBattle._endToken === _token && ((this.state.currentBattle._endExpiresAt || 0) <= Date.now())) this.state.currentBattle = null;
                        if (this.currentBattle && this.currentBattle._endToken === _token && ((this.currentBattle._endExpiresAt || 0) <= Date.now())) this.currentBattle = null;
                        this.updateBattleUI();
                    } catch (e) { /* no-op */ }
                }, 4000);
            } catch(e) {}
        } catch (e) {}
        // Update UI immediately (show overlay and allow Fighting tab to render summary)
        this.updateBattleUI();
        // Save progress and update progression (counters/unlocks)
        try { this.saveGame(); } catch(e) {}
        try {
            const bosses = this.CONFIG.FIGHTING_BOSSES || [];
            // Resolve id robustly (skip random spawns / unknown bosses)
            let id = (boss && boss.id) ? boss.id : null;
            if (!id && boss && boss.name) {
                const match = bosses.find(b => b.name === boss.name || b.id === boss.name);
                if (match) id = match.id;
            }
            if (!id) {
                try { if (this.CONFIG && this.CONFIG.DEBUG) console.log('winBattle: skipping progression increment for non-configured boss', { boss }); } catch(e) {}
            } else {
                if (!this.state.fightingProgressCounts) this.state.fightingProgressCounts = {};
                this.state.fightingProgressCounts[id] = (this.state.fightingProgressCounts[id] || 0) + 1;
                try { console.log('winBattle: incremented progression for', id, 'newCount=', this.state.fightingProgressCounts[id]); } catch(e) {}
                const count = this.state.fightingProgressCounts[id];
                const idx = bosses.findIndex(b => b.id === id);
                if (idx !== -1) {
                    const nextBoss = bosses[idx + 1];
                    if (nextBoss && typeof boss.progressionDefeatRequirement === 'number' && boss.progressionDefeatRequirement > 0 && count >= boss.progressionDefeatRequirement) {
                        try { console.log('winBattle progression check: boss=', id, 'count=', count, 'req=', boss.progressionDefeatRequirement, 'nextBoss=', nextBoss.id); } catch(e) {}
                        // Use centralized unlock helper and only reset progression if unlock succeeded
                        let didUnlock = false;
                        try {
                            if (this.CONFIG && this.CONFIG.DEBUG) console.log('winBattle: attempting unlock', { defeatedBoss: id, count, req: boss.progressionDefeatRequirement, nextBoss: nextBoss.id, unlockedBefore: Array.isArray(this.state.unlockedBosses) ? this.state.unlockedBosses : (this.state.unlockedBosses ? Array.from(this.state.unlockedBosses) : []) });
                            if (typeof GAME !== 'undefined' && typeof GAME.unlockBoss === 'function') {
                                didUnlock = GAME.unlockBoss(nextBoss.id);
                            } else if (typeof this.unlockBoss === 'function') {
                                didUnlock = this.unlockBoss(nextBoss.id);
                            } else {
                                didUnlock = false;
                            }
                        } catch(e) { console.warn('winBattle: unlock helper failed', e); }
                        try { if (this.CONFIG && this.CONFIG.DEBUG) console.log('winBattle: unlock attempt result', { nextBoss: nextBoss.id, didUnlock, unlockedAfter: Array.isArray(this.state.unlockedBosses) ? this.state.unlockedBosses : (this.state.unlockedBosses ? Array.from(this.state.unlockedBosses) : []) }); } catch(e) {}
                        if (didUnlock) {
                            UI.showNotification('🔓 New Boss Unlocked!', `${nextBoss.name} has been unlocked!`);
                            this.state.fightingProgressCounts = {};
                            this.state.progressionPeakCoins = this.state.coins || 0;
                            try { console.log('winBattle progression: reset counts and set peak=', this.state.progressionPeakCoins); } catch(e) {}
                        } else {
                            try {
                                if (!this.isBossUnlocked(nextBoss.id)) console.warn('winBattle progression: unlock attempt failed and boss remains locked', nextBoss.id, { didUnlock, unlockedBosses: Array.isArray(this.state.unlockedBosses) ? this.state.unlockedBosses : (this.state.unlockedBosses ? Array.from(this.state.unlockedBosses) : []) });
                                else if (this.CONFIG && this.CONFIG.DEBUG) console.warn('winBattle progression: unlock attempt returned false but boss is already unlocked', nextBoss.id);
                            } catch(e) {}
                        }
                    }
                }
            }
        } catch (e) { console.warn('winBattle progression update failed', e); }
        // Allow subsequent battles to be processed quickly without requiring overlay dismissal
        try { setTimeout(() => { this._battleOutcomeHandled = false; }, 50); } catch(e) {}

        // Random spawn progression: count random boss defeats towards unlocking crude_ai
        try {
            if (battle && battle.boss && battle.boss.isRandomSpawn) {
                this.state.randomAIDefeats = (this.state.randomAIDefeats || 0) + 1;
                const needed = 2; // Number of random spawns required to unlock Crude AI
                // clamp the counter to avoid negative remaining display
                if (this.state.randomAIDefeats > needed) this.state.randomAIDefeats = needed;
                if ((this.state.randomAIDefeats || 0) >= needed) {
                    if (!this.state.unlockedBosses) this.state.unlockedBosses = new Set();
                    if (!this.isBossUnlocked('crude_ai')) {
                        let didUnlock = false;
                        try { didUnlock = (typeof GAME !== 'undefined' && typeof GAME.unlockBoss === 'function') ? GAME.unlockBoss('crude_ai') : (this.state.unlockedBosses.add('crude_ai'), true); } catch(e) { console.warn('Random unlock: unlockBoss failed', e); }
                        try { console.log('Random unlock (winBattle): crude unlock attempt result=', didUnlock); } catch(e) {}
                        if (didUnlock) {
                            // annotate lastBattleResult so the UI can show a special unlock message
                            try { if (this.state.lastBattleResult) { this.state.lastBattleResult.specialUnlock = 'crude_ai'; } } catch(e) {}
                            try { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('🔓 Crude AI Unlocked!', 'You unlocked Crude AI by defeating hostile AI spawns.'); } catch(e){}
                        }
                    }
                }
            }
        } catch (e) { console.warn('Random spawn progression update failed', e); }
        // Allow subsequent battles to be processed (do not require UI dismissal to accept next outcomes)
        try { setTimeout(() => { this._battleOutcomeHandled = false; }, 50); } catch(e) {}
    },

    /**
     * Lose the battle
     */
    loseBattle(penaltyOverride) {
        // Normalise to either state.currentBattle, this.currentBattle, or legacy BossBattle.currentBattle
        let battle = this.state.currentBattle || this.currentBattle;
        try { if (!battle && typeof BossBattle !== 'undefined' && BossBattle.currentBattle) battle = BossBattle.currentBattle; } catch(e) {}

        // Do not abort when no battle object exists - support legacy/edge flows by applying penalty and showing overlay
        // Prevent duplicate handling
        if (this._battleOutcomeHandled) return;
        this._battleOutcomeHandled = true;

        // Update stats (only when a battle/player exists)
        this.state.fightingStats.battlesLost++;
        try {
            if (battle && battle.player) this.state.fightingStats.totalDamageTaken += (battle.player.maxHp - (battle.player.currentHp || 0));
        } catch (e) { /* noop */ }

        // Compute penalty and server loss if risk was active
        // If caller provided a penaltyOverride, use that exact coin amount instead of percentage
        let penaltyAmount;
        if (typeof penaltyOverride === 'number') {
            penaltyAmount = Math.max(0, Math.floor(penaltyOverride));
        } else {
            // default percentage penalty (can be adjusted elsewhere for random spawns)
            const penaltyPct = (battle && battle.boss && battle.boss.isRandomSpawn) ? 0.40 : this.PENALTY_PERCENT;
            penaltyAmount = Math.floor((this.state.coins || 0) * penaltyPct);
        }
        // apply penalty (cap to available coins, never go negative)
        const available = Math.max(0, this.state.coins || 0);
        const toTake = Math.min(available, Math.max(0, penaltyAmount));
        this.state.coins = Math.max(0, available - toTake);

        // Debug: log penalty application when running in dev consoles
        try { if (typeof console !== 'undefined' && console.log && (this._debug || false)) console.log('loseBattle: penaltyOverride=', penaltyOverride, 'computed=', penaltyAmount, 'applied=', toTake, 'remaining=', this.state.coins); } catch(e) {}

        // If a server was at risk, remove one (or handle special random-server-steal risk)
        let lostServerKey = null;
        try {
            const serverRisk = (battle && battle.risk && battle.risk.serverKey) || this.state.lastBattleRisk;
            if (serverRisk && this.state.servers && this.state.servers[serverRisk] && this.state.servers[serverRisk].count > 0) {
                this.state.servers[serverRisk].count = Math.max(0, this.state.servers[serverRisk].count - 1);
                lostServerKey = serverRisk;
            } else if (battle && battle.risk && battle.risk.randomServerSteal) {
                // remove one unit of a random owned server (decrement count or delete entry)
                try {
                    const srvKeys = this.state.servers ? Object.keys(this.state.servers) : [];
                    console.log('loseBattle: randomServerSteal triggered, servers keys=', srvKeys);
                    if (srvKeys.length > 0) {
                        const randKey = srvKeys[Math.floor(Math.random() * srvKeys.length)];
                        const srv = this.state.servers[randKey];
                        if (srv) {
                            if (typeof srv.count === 'number' && srv.count > 1) {
                                this.state.servers[randKey].count = Math.max(0, srv.count - 1);
                                lostServerKey = randKey;
                                console.log('loseBattle: decremented server', randKey, 'newCount=', this.state.servers[randKey].count);
                                } else {
                                // zero the server count and flag as removed to keep object shape for UI
                                try {
                                    this.state.servers[randKey].count = 0;
                                    this.state.servers[randKey]._removed = true;
                                    lostServerKey = randKey;
                                    console.log('loseBattle: zeroed server count for', randKey);
                                } catch (e) {
                                    try { delete this.state.servers[randKey]; lostServerKey = randKey; console.log('loseBattle: removed server entry', randKey); } catch(e2) { console.warn('loseBattle: failed to remove server', e2); }
                                }
                            }
                        }
                    }
                } catch (e) { console.warn('loseBattle: failed to apply randomServerSteal', e); }
            }
        } catch (e) {
            console.log('Error applying server-risk on defeat', e);
        }

        // Capture recent battle result so UI can render a summary
        try {
            // Determine boss object/name from battle or fallbacks
            const bossObj = (battle && battle.boss) ? battle.boss : (battle && battle.name ? battle : null);
            const bossId = (bossObj && bossObj.id) ? bossObj.id : ((this.state && this.state.lastBattleResult && this.state.lastBattleResult.bossId) ? this.state.lastBattleResult.bossId : null);
            const bossName = (bossObj && bossObj.name) ? bossObj.name : ((this.state && this.state.lastBattleResult && this.state.lastBattleResult.bossName) ? this.state.lastBattleResult.bossName : 'UNKNOWN');
                // Debug logging to trace random-spawn detection when integrity doesn't change
                try {
                    console.log('DEBUG GAME.loseBattle: entering integrity check', {
                        gameMode: this.state && this.state.gameMode,
                        battleType: battle && battle.type,
                        battle_isRandomSpawn: !!(battle && (battle.isRandomSpawn || (battle.boss && battle.boss.isRandomSpawn))),
                        bossObj: bossObj,
                        BossBattle_current: (typeof BossBattle !== 'undefined') ? BossBattle.currentBattle : null,
                        state_currentBoss: this.state && this.state.currentBoss,
                        state_currentBattle: this.state && this.state.currentBattle,
                        fileIntegrityBefore: this.state && this.state.fileIntegrityPercent
                    });
                } catch (e) { /* ignore console errors */ }
            this.state.lastBattleResult = {
                outcome: 'defeat',
                bossId: bossId,
                bossName: bossName,
                penalty: toTake,
                lostServer: lostServerKey || null,
                time: Date.now()
            };

            // Crusader-mode: AI defeats damage file integrity. Also apply to random spawn defeats.
            try {
                const integrityTargetBoss = bossObj && bossObj.type ? bossObj.type : (battle && battle.type ? battle.type : null);
                // Robust detection for random-spawn bosses: check multiple possible locations where the flag may live
                let isRandomSpawn = false;
                try {
                    if (battle && ((battle.boss && battle.boss.isRandomSpawn) || battle.isRandomSpawn)) isRandomSpawn = true;
                    else if (typeof BossBattle !== 'undefined' && BossBattle.currentBattle && (BossBattle.currentBattle.isRandomSpawn || (BossBattle.currentBattle.boss && BossBattle.currentBattle.boss.isRandomSpawn))) isRandomSpawn = true;
                    else if (this.state && this.state.currentBoss && this.state.currentBoss.isRandomSpawn) isRandomSpawn = true;
                    else if (this.state && this.state.currentBattle && (this.state.currentBattle.isRandomSpawn || (this.state.currentBattle.boss && this.state.currentBattle.boss.isRandomSpawn))) isRandomSpawn = true;
                } catch (e) { /* ignore detection errors */ }
                if (this.state && this.state.gameMode === 'crusader' && (integrityTargetBoss === 'AI' || isRandomSpawn)) {
                    // If defeated by a random AI spawn, reduce by ~1/7 (round up). Otherwise use a small fixed penalty.
                    const lossPct = isRandomSpawn ? Math.ceil(100 / 7) : 8;
                    const prev = (typeof this.state.fileIntegrityPercent === 'number') ? this.state.fileIntegrityPercent : 100;
                    const next = Math.max(0, Math.floor(prev - lossPct));
                    this.state.fileIntegrityPercent = next;
                    try { if (typeof UI !== 'undefined' && UI.updateGameModeIndicator) UI.updateGameModeIndicator(); } catch(e) {}
                    try { if (typeof this.saveGame === 'function') this.saveGame(); } catch(e) {}
                    // annotate result so UI can show the change
                    this.state.lastBattleResult.fileIntegrityChange = { before: prev, after: next, lost: lossPct };
                    console.log('GAME.loseBattle: crusader AI defeat reduced file integrity', prev, '->', next, '(lost', lossPct + '%)');
                    // If integrity reaches zero, trigger catastrophic overlay and purge saves
                    if (next <= 0) {
                        try { if (typeof this.triggerFileIntegrityFailure === 'function') this.triggerFileIntegrityFailure(); } catch(e) { console.warn('triggerFileIntegrityFailure error', e); }
                    }
                }
            } catch(e) { console.warn('file integrity update failed', e); }
            try { this._suppressAutoCloseUntil = Date.now() + 4000; } catch(e) {}
            try { console.log('GAME.loseBattle: lastBattleResult set', this.state.lastBattleResult); } catch(e) {}
        } catch (e) { /* noop */ }

        // Show defeat overlay with details (safe when no battle present)
        const defeatOverlay = document.getElementById('bossDefeatOverlay');
        const defeatBossName = document.getElementById('defeatBossName');
        const defeatPenalty = document.getElementById('defeatPenalty');
        const defeatServerLostEl = document.getElementById('defeatServerLost');
        const defeatServerNameEl = document.getElementById('defeatServerName');
        if (defeatOverlay) {
            try { console.log('GAME.loseBattle: preparing defeat overlay (toTake=', toTake, ')'); } catch(e) {}
            const bossNameText = (this.state && this.state.lastBattleResult && this.state.lastBattleResult.bossName) ? this.state.lastBattleResult.bossName : 'UNKNOWN';
            if (defeatBossName) defeatBossName.textContent = bossNameText;
            if (defeatPenalty) defeatPenalty.textContent = this.formatNumber(toTake);
            if (lostServerKey && defeatServerLostEl && defeatServerNameEl) {
                defeatServerNameEl.textContent = (this.CONFIG.SERVERS && this.CONFIG.SERVERS[lostServerKey] && this.CONFIG.SERVERS[lostServerKey].name) ? this.CONFIG.SERVERS[lostServerKey].name : lostServerKey;
                defeatServerLostEl.classList.remove('hidden');
            } else if (defeatServerLostEl) {
                defeatServerLostEl.classList.add('hidden');
            }
            defeatOverlay.classList.remove('hidden');
            try { console.log('GAME.loseBattle: defeatOverlay.classList.remove(hidden) executed'); } catch(e) {}
            try {
                const rematchBtnEl = document.getElementById('rematchBossBtn');
                if (rematchBtnEl) rematchBtnEl.style.display = (this.state && this.state.lastBossAttempt) ? '' : 'none';
            } catch (e) { /* ignore */ }
            if (typeof UI !== 'undefined' && UI.playSound) UI.playSound('lose');
        }

        // Clear any live battle timer
        try { if (this.battleTimer) { clearInterval(this.battleTimer); this.battleTimer = null; } } catch(e) {}

        // persist the change
        this.saveGame && this.saveGame();

        // End battle state (leave defeat overlay visible)
        try {
            // Mark battle ended so UI can display summary, but keep the object for a short window
            if (battle) {
                battle._ended = true;
                battle._endExpiresAt = Date.now() + 4000;
            }
            try { if (this._battleEndCleaner) clearTimeout(this._battleEndCleaner); } catch(e) {}
            try {
                const _token = `end_${Date.now()}_${Math.floor(Math.random()*100000)}`;
                if (this.state && this.state.currentBattle) this.state.currentBattle._endToken = _token;
                if (this.currentBattle) this.currentBattle._endToken = _token;
                this._battleEndCleaner = setTimeout(() => {
                    try {
                        if (this.state && this.state.currentBattle && this.state.currentBattle._endToken === _token && ((this.state.currentBattle._endExpiresAt || 0) <= Date.now())) this.state.currentBattle = null;
                        if (this.currentBattle && this.currentBattle._endToken === _token && ((this.currentBattle._endExpiresAt || 0) <= Date.now())) this.currentBattle = null;
                        this.updateBattleUI();
                    } catch (e) { /* no-op */ }
                }, 4000);
            } catch(e) {}
        } catch (e) {}
        this.updateBattleUI();
    },

    /**
     * End the current battle
     */
    endBattle(victory) {
        // If caller passed a victory flag, invoke the appropriate handler if available
        try {
            if (typeof victory === 'boolean') {
                if (victory) {
                    if (typeof this.winBattle === 'function') this.winBattle();
                    else if (typeof this.handleVictory === 'function') this.handleVictory();
                } else {
                    if (typeof this.loseBattle === 'function') this.loseBattle();
                    else if (typeof this.handleDefeat === 'function') this.handleDefeat();
                }
            }
        } catch (e) { console.log('endBattle handler error', e); }

        // Clear any live battle timer when ending
        try { if (this.battleTimer) { clearInterval(this.battleTimer); this.battleTimer = null; } } catch(e) {}

        // Don't immediately wipe the battle object here; handlers (win/lose) will mark it ended and schedule cleanup.
        try {
            if (this.state && this.state.currentBattle && !this.state.currentBattle._ended) {
                this.state.currentBattle._ended = true;
                this.state.currentBattle._endExpiresAt = Date.now() + 4000;
            }
            if (!this._battleEndCleaner) {
                try { if (this._battleEndCleaner) clearTimeout(this._battleEndCleaner); } catch(e) {}
                this._battleEndCleaner = setTimeout(() => {
                    try {
                        if (this.state && this.state.currentBattle && ((this.state.currentBattle._endExpiresAt || 0) <= Date.now())) this.state.currentBattle = null;
                        if (this.currentBattle && ((this.currentBattle._endExpiresAt || 0) <= Date.now())) this.currentBattle = null;
                        this.updateBattleUI();
                    } catch (e) { /* no-op */ }
                }, 4000);
            } else {
                // ensure UI refresh
                this.updateBattleUI();
            }
        // Also ensure any legacy BossBattle state is cleared to avoid UI rendering a different global battle
        try {
            if (typeof BossBattle !== 'undefined' && BossBattle.currentBattle) {
                console.log('GAME.endBattle: Clearing legacy BossBattle.currentBattle');
                BossBattle.currentBattle = null;
                try { if (typeof BossBattle.updateBattleUI === 'function') BossBattle.updateBattleUI(); } catch(e) { /* ignore */ }
            }
        } catch (e) { console.warn('GAME.endBattle: error clearing BossBattle.currentBattle', e); }
        } catch (e) { /* ignore */ }
    },

    /**
     * Resume an in-progress battle stored in state.currentBattle (used after reload)
     */
    resumeCurrentBattle() {
        const stored = this.state.currentBattle;
        if (!stored) return false;
        // Clear ephemeral resolve marker if present (should not persist across loads)
        try { if (stored._resolving) delete stored._resolving; } catch(e) {}
        // If stored was already ended (overlay summary), avoid showing the full overlay — let the result persist briefly
        if (stored._ended) {
            // Update UI so recent result summary shows (or hide overlays if it's expired)
            try { this.updateBattleUI(); } catch (e) {}
            return false;
        }
        // Validate stored battle object
        if (!stored.boss || !stored.player || !stored.startTime || !stored.timeLimit) {
            console.warn('Invalid stored currentBattle detected; clearing and skipping resume.');
            this.state.currentBattle = null;
            this.currentBattle = null;
            try { if (typeof this.saveGame === 'function') this.saveGame(); } catch (e) {}
            if (typeof UI !== 'undefined' && UI.setupFightingTab) UI.setupFightingTab();
            return false;
        }

        // Use the stored battle object as the active battle
        this.currentBattle = stored;
        // Ensure numeric HP values exist
        try {
            if (this.currentBattle && this.currentBattle.boss && typeof this.currentBattle.boss.maxHp === 'number' && typeof this.currentBattle.boss.currentHp !== 'number') this.currentBattle.boss.currentHp = this.currentBattle.boss.maxHp;
            if (this.currentBattle && this.currentBattle.player && typeof this.currentBattle.player.maxHp === 'number' && typeof this.currentBattle.player.currentHp !== 'number') this.currentBattle.player.currentHp = this.currentBattle.player.maxHp;
        } catch (e) {}

        // Update UI elements like overlay and timers — reuse same IDs as startBattle
        const battleOverlay = document.getElementById('bossBattleOverlay');
        const battleContainer = document.querySelector('.boss-battle-container');
        const bossAvatar = document.getElementById('bossAvatar');
        const bossName = document.getElementById('bossName');
        const bossType = document.getElementById('bossType');
        const currentHealth = document.getElementById('bossCurrentHealth');
        const maxHealth = document.getElementById('bossMaxHealth');
        const healthFill = document.getElementById('bossHealthFill');
        const timeRemaining = document.getElementById('bossTimeRemaining');
        const playerDamage = document.getElementById('playerDamageDisplay');

        if (battleOverlay) {
            // Reapply UI values
            bossAvatar && (bossAvatar.textContent = (stored.boss && stored.boss.avatar) ? stored.boss.avatar : '🤖');
                        // Apply appearance classes when resuming
                        try {
                            if (stored.boss && stored.boss.appearance && battleContainer) {
                                battleContainer.classList.add('mech-boss');
                                battleContainer.classList.add(`appearance-${stored.boss.appearance}`);
                            }
                            if (stored.boss && stored.boss.appearance && bossAvatar) {
                                bossAvatar.classList.add(`appearance-${stored.boss.appearance}`);
                            }
                        } catch (e) { /* noop */ }
            bossName && (bossName.textContent = (stored.boss && stored.boss.name) ? stored.boss.name : 'UNKNOWN');
            bossType && (bossType.textContent = stored.boss.type || 'AI');
            currentHealth && (currentHealth.textContent = this.formatNumber((stored.boss && typeof stored.boss.currentHp === 'number') ? stored.boss.currentHp : 0));
            maxHealth && (maxHealth.textContent = this.formatNumber((stored.boss && typeof stored.boss.maxHp === 'number') ? stored.boss.maxHp : 0));
            if (healthFill && stored.boss.maxHp) {
                const pct = Math.max(0, (stored.boss.currentHp || 0) / (stored.boss.maxHp || 1) * 100);
                healthFill.style.width = pct + '%';
            }

            // calculate remaining time in seconds
            const elapsed = Date.now() - (stored.startTime || Date.now());
            let timeLeftMs = (stored.timeLimit || 30000) - elapsed;
            let timeLeft = Math.max(0, Math.ceil(timeLeftMs / 1000));
            if (timeRemaining) timeRemaining.textContent = timeLeft;

            // Show overlay
            battleOverlay.classList.remove('hidden');

            // Ensure the main Battle timer runs (clear any existing)
            if (this.battleTimer) { clearInterval(this.battleTimer); this.battleTimer = null; }
            this.battleTimer = setInterval(() => {
                timeLeft--;
                if (timeRemaining) timeRemaining.textContent = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(this.battleTimer);
                    this.battleTimer = null;
                    // Expire battle and treat as defeat
                    this.endBattle(false);
                }
            }, 1000);

            // Play battle music if available
            if (typeof UI !== 'undefined' && UI.playSound) UI.playSound('battle');
        }

        // Update any other UI and persist state
        this.updateBattleUI();
        this.saveGame && this.saveGame();
        return true;
    },

    /**
     * Rematch last attempted boss using the same risk settings (if any)
     */
    rematchLastBattle() {
        const last = this.state.lastBossAttempt;
        if (!last) return UI.showNotification('No rematch available', 'You have not attempted a boss yet.');
        const risk = this.state.lastBattleRisk || null;
        return this.startBossBattle(last, risk ? { riskServer: risk } : undefined);
    },

    /**
     * Run away from an active boss battle; counts as defeat
     */
    runAway() {
        if (!this.state.currentBattle) return UI.showNotification('No active battle', 'You are not in a boss fight.');
        UI.showNotification('🏃 You ran away', 'You escaped the fight. This counts as a defeat.');
        // Count as defeat
        // (removed) emergency force-exit UI cleanup
        // Compute expected win reward for current battle and pass as penalty override so fleeing costs that amount
        try {
            const legacyBattle = (typeof BossBattle !== 'undefined' && BossBattle.currentBattle) ? BossBattle.currentBattle : (typeof window !== 'undefined' && window.BossBattle && window.BossBattle.currentBattle) ? window.BossBattle.currentBattle : null;
            const battle = this.state.currentBattle || this.currentBattle || legacyBattle;
            let boss = battle && (battle.boss ? battle.boss : battle);
            if (!boss) boss = null;
            let expectedReward = 0;
            if (boss) {
                const effects = this.getSkillEffects ? this.getSkillEffects() : {};
                let rewardMultiplier = 1;
                if (effects.bossRewardBonus) rewardMultiplier += effects.bossRewardBonus;
                if (effects.bossSlayer) rewardMultiplier *= 2;
                if (this.state.gameMode === 'crusader') rewardMultiplier *= this.CRUSADER_MODE_MULTIPLIERS.bossRewardMultiplier;
                const baseCoinReward = Math.floor((boss.maxHp || 0) * 10);
                const progressionPeak = (this.state && (this.state.progressionPeakCoins || (this.state.stats && this.state.stats.peakCoins))) ? (this.state.progressionPeakCoins || (this.state.stats && this.state.stats.peakCoins)) : (this.state.coins || 0);
                if (boss.isRandomSpawn) {
                    expectedReward = Math.floor((5000 + Math.floor((progressionPeak || 0) * 0.10)) * rewardMultiplier);
                } else if (typeof boss.progressionRewardPct === 'number' && boss.progressionRewardPct > 0) {
                    expectedReward = Math.floor((progressionPeak || 0) * boss.progressionRewardPct * rewardMultiplier);
                    if (expectedReward < baseCoinReward) expectedReward = Math.floor(baseCoinReward * rewardMultiplier);
                } else {
                    expectedReward = Math.floor(baseCoinReward * rewardMultiplier);
                }
            }
            if (typeof this.loseBattle === 'function') {
                // Special-case: for random spawns, running away should cost half the player's coins
                if (boss && boss.isRandomSpawn) {
                    const coinsAvailable = Math.max(0, Math.floor(this.state.coins || 0));
                    const penaltyHalf = Math.floor(coinsAvailable * 0.5);
                    // Crusader mode extra: delete a random owned server
                    try {
                        if (this.state && this.state.gameMode === 'crusader' && this.state.servers && Object.keys(this.state.servers).length > 0) {
                            const keys = Object.keys(this.state.servers);
                            const randKey = keys[Math.floor(Math.random() * keys.length)];
                            delete this.state.servers[randKey];
                            console.log('GAME.runAway: crusader penalty removed server', randKey);
                        }
                    } catch (e) { console.warn('GAME.runAway: failed to delete crusader server', e); }
                    this.loseBattle(penaltyHalf);
                    return true;
                }
                this.loseBattle(expectedReward);
                return true;
            }
        } catch (e) {
            console.warn('runAway: failed to compute expected reward, falling back to normal lose flow', e);
        }
        // fallback to endBattle -> lose flow
        this.endBattle(false);
        return true;
    },

    /**
    * Purchase gear (recruitment system retired)
     */
    // purchaseUnit retired — player gear/inventory replaced recruitment

    /**
     * Purchase gear
     */
    purchaseGear(type, gearId) {
        const gear = this.CONFIG.FIGHTING_GEAR[type]?.find(g => g.id === gearId);
        if (!gear) return false;

        if (this.state.coins >= gear.cost) {
            this.state.coins -= gear.cost;

            // Initialize gear type if needed
            if (!this.state.gear[type]) this.state.gear[type] = {};

            // Add gear
            this.state.gear[type][gearId] = gear;

            UI.showNotification('🛡️ Gear Acquired!', `Purchased ${gear.name}!`);
            return true;
        }
        return false;
    },

    /**
     * Update battle UI
     */
    updateBattleUI() {
        // Lightweight UI refresh helper — prefer full UI.render from UI when available
        try {
            // Ensure any ended battles immediately surface overlays before regular UI redraw
            try {
                // Engine-style active battle
                const cb = this.state && this.state.currentBattle ? this.state.currentBattle : null;
                if (!this._battleOutcomeHandled && cb && cb.boss && (cb.boss.currentHp || 0) <= 0) {
                    if (typeof this.winBattle === 'function') { this.winBattle(); }
                }
                if (!this._battleOutcomeHandled && cb && cb.player && (cb.player.currentHp || 0) <= 0) {
                    if (typeof this.loseBattle === 'function') { this.loseBattle(); }
                }

                // BossBattle legacy active battle
                if (typeof BossBattle !== 'undefined' && BossBattle.currentBattle) {
                    const legacy = BossBattle.currentBattle;
                    if (!this._battleOutcomeHandled && legacy && (legacy.currentHp || 0) <= 0) {
                        try { if (typeof BossBattle.handleVictory === 'function') BossBattle.handleVictory(); } catch (e) {}
                    }
                }
            } catch (e) { console.log('updateBattleUI pre-check error', e); }

            if (typeof UI !== 'undefined' && UI.setupFightingTab) {
                UI.setupFightingTab();
                return;
            }
        } catch (e) { /* ignore */ }
        // fallback: no-op
    },

    /**
     * Update glitch effect
     */
    updateGlitch(percent, glitchOverlay) {
        if (!glitchOverlay) return;
        
        if (percent >= 50) {
            glitchOverlay.classList.add('active');
        } else {
            glitchOverlay.classList.remove('active');
        }
    }
};

// Initialize corruption system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    DarkMatterCorruption.init();
});

// Ensure global/window alias so inline handlers and external listeners can access GAME
try {
    if (typeof window !== 'undefined' && !window.GAME) {
        window.GAME = GAME;
        console.log('window.GAME alias created');
    }
} catch (e) {
    // ignore in non-browser environments
}

/**
 * Pay to restore file integrity percent. Very expensive.
 * percentToRestore: integer percent to restore (e.g. 10)
 */
GAME.payRestoreFileIntegrity = function(percentToRestore) {
    percentToRestore = Math.max(1, Math.floor(percentToRestore || 1));
    const current = (typeof this.state.fileIntegrityPercent === 'number') ? this.state.fileIntegrityPercent : 100;
    if (current >= 100) return false;
    // Cost: 5,000,000 coins per percent (VERY expensive)
    const costPerPercent = 5000000;
    const cost = Math.ceil(percentToRestore * costPerPercent);
    if ((this.state.coins || 0) < cost) {
        try { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Insufficient Coins', 'You do not have enough coins to repair the save.'); } catch(e) {}
        return false;
    }
    this.state.coins = Math.max(0, (this.state.coins || 0) - cost);
    this.state.fileIntegrityPercent = Math.min(100, current + percentToRestore);
    try { if (typeof UI !== 'undefined' && UI.updateGameModeIndicator) UI.updateGameModeIndicator(); } catch(e) {}
    try { if (typeof this.saveGame === 'function') this.saveGame(); } catch(e) {}
    try { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Save Repaired', `File integrity increased by ${percentToRestore}% for ${this.formatNumber(cost)} coins.`); } catch(e) {}
    return true;
};

/**
 * Trigger catastrophic file integrity failure: show overlay, delete saves and cookies.
 */
GAME.triggerFileIntegrityFailure = function() {
    try {
        console.warn('GAME.triggerFileIntegrityFailure: file integrity reached 0% - purging saves/cookies');
        // Show overlay if present
        const overlay = document.getElementById('fileIntegrityFailureOverlay');
        if (overlay) overlay.classList.remove('hidden');

        // Remove save keys
        try { localStorage.removeItem('hostxGameSave'); } catch(e) {}
        try { localStorage.removeItem('hostxGameSave_localOnly'); } catch(e) {}

        // Clear accessible cookies (best-effort). Try multiple path/domain combos.
        try {
            const cookies = (document.cookie || '').split(';').map(s => s.trim()).filter(Boolean);
            const host = location.hostname;
            const domainsToTry = [host];
            if (host && host.indexOf('.') !== -1) domainsToTry.push('.' + host);
            const pathsToTry = ['/', '/'];
            for (let cookie of cookies) {
                const name = cookie.split('=')[0];
                // Basic clear
                try { document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`; } catch(e) {}
                // Try combinations
                for (const d of domainsToTry) {
                    for (const p of pathsToTry) {
                        try {
                            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${p};domain=${d};`;
                        } catch(e) {}
                    }
                }
            }
        } catch(e) { console.warn('Failed to clear cookies', e); }

        // Optionally wipe in-memory state - make destructive action obvious
        try {
            this.state = Object.assign({}, this.state || {});
        } catch(e) {}

        // Offer a short delay then reload so the cleared save takes effect
        setTimeout(() => {
            try { window.location.reload(); } catch(e) { console.warn('reload failed', e); }
        }, 1400);
    } catch(e) { console.warn('triggerFileIntegrityFailure unexpected error', e); }
};

// Compatibility shim: expose BossBattle forge/material helpers on GAME and ensure BossBattle uses shared GAME.state.
try {
    if (typeof BossBattle !== 'undefined' && typeof GAME !== 'undefined') {
        // Ensure BossBattle operates on the main GAME.state reference
        BossBattle.state = GAME.state || {};
        BossBattle.saveGame = BossBattle.saveGame || (typeof GAME.saveGame === 'function' ? GAME.saveGame.bind(GAME) : function(){});

        // Expose commonly used forge/inventory helpers on GAME for UI compatibility
        GAME.previewForge = BossBattle.previewForge ? BossBattle.previewForge.bind(BossBattle) : GAME.previewForge;
        GAME.startForge = BossBattle.startForge ? BossBattle.startForge.bind(BossBattle) : GAME.startForge;
        GAME.forgeItem = BossBattle.forgeItem ? BossBattle.forgeItem.bind(BossBattle) : GAME.forgeItem;
        GAME.completeForgeJob = BossBattle.completeForgeJob ? BossBattle.completeForgeJob.bind(BossBattle) : GAME.completeForgeJob;
        GAME.sellItem = BossBattle.sellItem ? BossBattle.sellItem.bind(BossBattle) : GAME.sellItem;
        GAME.hasMaterials = BossBattle.hasMaterials ? BossBattle.hasMaterials.bind(BossBattle) : GAME.hasMaterials;
        GAME.consumeMaterials = BossBattle.consumeMaterials ? BossBattle.consumeMaterials.bind(BossBattle) : GAME.consumeMaterials;
        GAME.addMaterial = BossBattle.addMaterial ? BossBattle.addMaterial.bind(BossBattle) : GAME.addMaterial;
        GAME.equipItem = BossBattle.equipItem ? BossBattle.equipItem.bind(BossBattle) : GAME.equipItem;
        GAME.unequipItem = BossBattle.unequipItem ? BossBattle.unequipItem.bind(BossBattle) : GAME.unequipItem;
        GAME.getEquippedItem = BossBattle.getEquippedItem ? BossBattle.getEquippedItem.bind(BossBattle) : GAME.getEquippedItem;
        GAME._baseMaterialsForCategory = BossBattle._baseMaterialsForCategory ? BossBattle._baseMaterialsForCategory.bind(BossBattle) : GAME._baseMaterialsForCategory;

        // Also mirror static configs used by forge logic
        GAME.RARITY_TIERS = GAME.RARITY_TIERS || BossBattle.RARITY_TIERS;
        GAME.GEAR_TYPES = GAME.GEAR_TYPES || BossBattle.GEAR_TYPES;
        GAME.RARITY_COST_MULT = GAME.RARITY_COST_MULT || BossBattle.RARITY_COST_MULT;
        GAME.RARITY_DAMAGE_MULT = GAME.RARITY_DAMAGE_MULT || BossBattle.RARITY_DAMAGE_MULT;
        GAME.MATERIAL_VALUE = GAME.MATERIAL_VALUE || BossBattle.MATERIAL_VALUE;
        GAME.RARITY_SELL_MULT = GAME.RARITY_SELL_MULT || BossBattle.RARITY_SELL_MULT;
    }
} catch (e) { console.warn('BossBattle-GAME shim failed', e); }

// Defensive shim: ensure `calculatePlayerCombatStats` exists on GAME at runtime
try {
    if (typeof GAME !== 'undefined' && typeof GAME.calculatePlayerCombatStats !== 'function') {
        GAME.calculatePlayerCombatStats = function() {
            const effects = (this.getSkillEffects && this.getSkillEffects()) || {};
            let baseAttack = 50;
            let baseDefense = 10;
            let baseHp = 1000; // base HP adjusted to current desired default

            let weaponAttack = 0;
            let bowAttack = 0;
            let armorDefense = 0;

            const eq = (this.state && this.state.equipped) ? this.state.equipped : {};
            const inv = (this.state && this.state.inventory) ? this.state.inventory : [];

            const getItem = (id) => {
                if (!id) return null;
                if (typeof id === 'object' && id.id) return id;
                return inv.find(i => i.id === id) || null;
            };

            const getItemStatVal = (it) => {
                if (!it) return 0;
                let itemObj = it;
                if (typeof it === 'string') itemObj = { id: it };
                const candidates = [itemObj.stat, itemObj.damage, itemObj.attack, itemObj.atk, itemObj.power, itemObj.value];
                for (const c of candidates) {
                    if (c !== undefined && c !== null && !Number.isNaN(Number(c))) return Number(c);
                }
                if (itemObj.id && typeof itemObj.id === 'string') {
                    const atkMatch = itemObj.id.match(/_atk(\d+)/i);
                    if (atkMatch) return Number(atkMatch[1]);
                    const defMatch = itemObj.id.match(/_def(\d+)/i);
                    if (defMatch) return Number(defMatch[1]);
                    const two = itemObj.id.match(/_(\d+)-(\d+)$/);
                    if (two) return Number(two[1]);
                    const one = itemObj.id.match(/_(\d+)$/);
                    if (one) return Number(one[1]);
                }
                return 0;
            };

            // Weapon
            if (eq.weapon) {
                const w = getItem(eq.weapon);
                if (w) {
                    const mult = this.RARITY_DAMAGE_MULT && this.RARITY_DAMAGE_MULT[w.rarity] ? this.RARITY_DAMAGE_MULT[w.rarity] : 1;
                    const val = Math.floor(getItemStatVal(w) * mult);
                    baseAttack += val; weaponAttack += val;
                }
            }

            // Bow
            if (eq.bow) {
                const b = getItem(eq.bow);
                if (b) {
                    const mult = this.RARITY_DAMAGE_MULT && this.RARITY_DAMAGE_MULT[b.rarity] ? this.RARITY_DAMAGE_MULT[b.rarity] : 1;
                    const val = Math.floor(getItemStatVal(b) * mult);
                    baseAttack += val; bowAttack += val;
                }
            }

            ['helmet','chestplate','leggings','boots'].forEach(slot => {
                const id = eq[slot];
                if (!id) return;
                const it = getItem(id);
                if (it) {
                    const mult = this.RARITY_DAMAGE_MULT && this.RARITY_DAMAGE_MULT[it.rarity] ? this.RARITY_DAMAGE_MULT[it.rarity] : 1;
                    const val = Math.floor(getItemStatVal(it) * mult);
                    baseDefense += val; armorDefense += val;
                }
            });

            if (effects.combatDamage) baseAttack *= (1 + effects.combatDamage);
            if (effects.damageReduction) baseDefense *= (1 + effects.damageReduction);

            baseHp += Math.floor(baseDefense * 8);

            return {
                attack: Math.floor(baseAttack),
                defense: Math.floor(baseDefense),
                maxHp: Math.floor(baseHp),
                critChance: effects.critChance || 0,
                _breakdown: { baseAttack: 50, weaponAttack, bowAttack, baseDefense: 10, armorDefense }
            };
        };
        console.log('GAME.calculatePlayerCombatStats shim installed (persistent)');
    }
} catch (e) { console.warn('calculatePlayerCombatStats shim failed', e); }

